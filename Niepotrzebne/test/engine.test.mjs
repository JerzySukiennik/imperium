// Imperium Gzowianskie: plays hundreds of full bot games through the rules engine and checks invariants.
import * as E from '../../src/game/engine.js'
import { FIELDS, RULES } from '../../src/data/board.js'
import { CARDS, cardById } from '../../src/data/cards.js'

let seed = 12345
const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const stats = { games: 0, turns: 0, bought: 0, built: 0, bankrupt: 0, cards: {}, errors: 0, packs: 0, trades: 0, wealth: [], full: 0, events: {} }
const count = ev => { for (const e of ev) { stats.events[e.t] = (stats.events[e.t] || 0) + 1; if (e.t === 'error') { stats.errors++; throw new Error('engine error: ' + e.why) } } return ev }

function check(s) {
  for (const p of s.players) {
    if (!Number.isFinite(p.money) || p.money < 0) throw new Error(`bad money ${p.name} ${p.money}`)
    if (p.cards.length > RULES.handLimit && !(s.pending && s.pending.type === 'discard')) throw new Error('hand over limit')
    if (p.gzm < 0) throw new Error('negative gzm')
    if (p.pos < 0 || p.pos >= FIELDS.length) throw new Error('bad pos')
  }
  for (const [i, o] of Object.entries(s.owner)) {
    if (FIELDS[i].type !== 'place') throw new Error('non-place owned')
    if (s.players[o].out) throw new Error('bankrupt owns ' + FIELDS[i].name)
  }
  for (const [i, l] of Object.entries(s.level)) if (l < 0 || l > 4 || (l > 0 && s.owner[i] == null)) throw new Error('bad level')
  if (!(s.gzmRate >= 1000)) throw new Error('bad rate')
}

function resolve(s) {
  let guard = 0
  while (s.pending && !s.over) {
    if (++guard > 50) throw new Error('pending loop ' + s.pending.type)
    const pd = s.pending, p = s.players[pd.player]
    if (pd.type === 'buy') count(E.decide(s, { yes: p.money - FIELDS[pd.field].price > 60000 }))
    else if (pd.type === 'niewypal') count(E.decide(s, { pay: r() < .5 }))
    else if (pd.type === 'koparka') count(E.decide(s, { field: pd.options[Math.floor(r() * pd.options.length)] }))
    else if (pd.type === 'heli') { let f; do { f = Math.floor(r() * FIELDS.length) } while (f === p.pos); count(E.decide(s, { field: f })) }
    else if (pd.type === 'rakieta') count(E.decide(s, { bet: [0, 50000, 100000, 200000][Math.floor(r() * 4)], success: r() < .55 }))
    else if (pd.type === 'pack') { stats.packs++; count(E.decide(s, {})) }
    else if (pd.type === 'discard') count(E.decide(s, { index: Math.floor(r() * p.cards.length) }))
    check(s)
  }
}

function tryCard(s) {
  const p = E.cur(s)
  if (!p.cards.length || s.pending) return
  const i = Math.floor(r() * p.cards.length), id = p.cards[i], allowed = E.targetsFor(s, id)
  if (allowed && !allowed.length) return
  const target = allowed ? allowed[Math.floor(r() * allowed.length)] : undefined
  const who = p.id
  count(E.playCard(s, i, target))
  stats.cards[id] = (stats.cards[id] || 0) + 1
  check(s)
  if (!s.over && E.cur(s).id === who) resolve(s)
}

function game(n, rounds) {
  const s = E.createGame({ players: Array.from({ length: n }, (_, i) => ({ name: 'G' + i, pawn: 'x', color: '#000' })), rounds, seed: Math.floor(r() * 1e9) })
  count(E.start(s))
  let guard = 0
  while (!s.over) {
    if (++guard > 5000) throw new Error('game does not end')
    const p = E.cur(s), who = p.id
    stats.turns++
    if (r() < .5) tryCard(s)
    if (s.over || E.cur(s).id !== who) continue
    if (!s.pending && !s.packBought && p.money > 250000 && r() < .5) { count(E.buyPack(s)); resolve(s) }
    if (!s.pending && r() < .15) { const n2 = 1 + Math.floor(r() * 5); if (p.money > n2 * s.gzmRate + 100000) count(E.market(s, 'buy', n2)) }
    if (!s.pending && p.gzm > 0 && r() < .1) count(E.market(s, 'sell', 1))
    while (!s.over && E.cur(s).id === who && !s.rolled) { count(E.roll(s)); check(s); if (!s.over && E.cur(s).id === who) resolve(s); if (!s.over && E.cur(s).id === who && r() < .4) tryCard(s) }
    if (s.over || E.cur(s).id !== who) continue
    for (const i of E.ownedBy(s, who)) if (E.canBuild(s, who, i) && p.money > 300000 && r() < .7) { count(E.build(s, i)); stats.built++ }
    if (r() < .08) {
      const others = E.alive(s).filter(o => o.id !== who), o = others[Math.floor(r() * others.length)]
      const mine = E.ownedBy(s, who), theirs = E.ownedBy(s, o.id)
      const offer = { from: who, to: o.id, giveFields: mine.slice(0, 1), getFields: theirs.slice(0, 1), giveMoney: Math.min(p.money, 20000), getMoney: 0 }
      if (E.tradeValid(s, offer)) { count(E.trade(s, offer)); stats.trades++ }
    }
    check(s)
    if (!s.over && E.cur(s).id === who && !s.pending) count(E.endTurn(s))
  }
  stats.games++
  const rk = E.ranking(s)
  stats.wealth.push(rk[0].wealth)
  stats.bankrupt += s.players.filter(p => p.out).length
  stats.bought += Object.keys(s.owner).length
  if (FIELDS.some((f, i) => f.type === 'place' && E.fullGroup(s, i))) stats.full++
  return s
}

for (const n of [2, 3, 4, 5, 6]) for (const rounds of [8, 12, 18]) for (let k = 0; k < 40; k++) game(n, rounds)
const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length)
const unused = CARDS.filter(c => !stats.cards[c.id]).map(c => c.id)
console.log(JSON.stringify({ games: stats.games, turnsPerGame: Math.round(stats.turns / stats.games), placesOwnedAtEnd: +(stats.bought / stats.games).toFixed(1), builtPerGame: +(stats.built / stats.games).toFixed(1), bankruptPerGame: +(stats.bankrupt / stats.games).toFixed(2), gamesWithFullGroup: stats.full, packsPerGame: +(stats.packs / stats.games).toFixed(1), trades: stats.trades, winnerWealthAvg: avg(stats.wealth), unusedCards: unused, errors: stats.errors }, null, 1))
console.log('events:', Object.entries(stats.events).sort((a, b) => b[1] - a[1]).map(e => e.join(':')).join(' '))
if (unused.length) { console.error('FAIL: cards never played'); process.exit(1) }
console.log('ALL PASS')
