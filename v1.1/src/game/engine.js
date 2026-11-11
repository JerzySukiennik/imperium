// Imperium Gzowianskie: rules engine. Holds the whole game state, no DOM and no rendering; every action returns a list of events.
import { FIELDS, RULES, baseFee, cabinCost, groupFields, round10k } from '../data/board.js'
import { CARDS, RARITY, cardById } from '../data/cards.js'

const N = FIELDS.length
const HOSTILE = new Set(['grad', 'wojt', 'dron', 'dropsik', 'noc', 'zofia', 'major', 'osmiornica'])

function rnd(s) {
  s.seed = (s.seed + 0x6d2b79f5) | 0
  let t = s.seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function createGame({ players, rounds = RULES.lengths.normalna, seed = Date.now() }) {
  return {
    seed: seed | 0,
    players: players.map((p, i) => ({ id: i, name: p.name, pawn: p.pawn, color: p.color, money: RULES.startMoney, pos: 0, cards: [], gzm: 0, skip: 0, half: false, shield: false, immuneTurn: false, immuneBenny: false, out: false })),
    owner: {}, level: {}, traps: {},
    turn: 0, round: 1, rounds, rolled: false, packBought: false, gzmRate: RULES.gzmStart, dice: [0, 0], pending: null, over: false, started: false,
  }
}

export const cur = s => s.players[s.turn]
export const alive = s => s.players.filter(p => !p.out)
export const ownedBy = (s, pid) => FIELDS.map((f, i) => i).filter(i => s.owner[i] === pid)
export const lvl = (s, i) => s.level[i] || 0
export const fullGroup = (s, i) => { const o = s.owner[i]; return o != null && groupFields(FIELDS[i].group).every(j => s.owner[j] === o) }
export const feeFor = (s, i) => { const b = baseFee(FIELDS[i]), l = lvl(s, i); return l > 0 ? b * RULES.levelMult[l] : fullGroup(s, i) ? b * 2 : b }
export const canBuild = (s, pid, i, free = false) => FIELDS[i].type === 'place' && s.owner[i] === pid && lvl(s, i) < 4 && (free || (fullGroup(s, i) && s.players[pid].money >= cabinCost(FIELDS[i])))
export const wealth = (s, p) => p.out ? 0 : p.money + ownedBy(s, p.id).reduce((a, i) => a + FIELDS[i].price + cabinCost(FIELDS[i]) * lvl(s, i), 0) + p.gzm * s.gzmRate
export const ranking = s => [...s.players].sort((a, b) => wealth(s, b) - wealth(s, a)).map(p => ({ id: p.id, name: p.name, wealth: wealth(s, p), out: p.out }))

function setRate(s, ev, mult, why) {
  const before = s.gzmRate
  s.gzmRate = Math.max(1000, Math.round(s.gzmRate * mult / 100) * 100)
  ev.push({ t: 'rate', before, rate: s.gzmRate, why })
}

function liquidate(s, ev, p) {
  const sold = []
  const mine = () => ownedBy(s, p.id)
  while (p.money < 0) {
    const built = mine().filter(i => lvl(s, i) > 0).sort((a, b) => lvl(s, b) - lvl(s, a))[0]
    if (built == null) break
    s.level[built]--
    p.money += cabinCost(FIELDS[built]) / 2
    sold.push({ what: 'domek', field: built })
  }
  if (p.money < 0 && p.gzm > 0) {
    const n = Math.min(p.gzm, Math.ceil(-p.money / s.gzmRate))
    p.gzm -= n
    p.money += n * s.gzmRate
    sold.push({ what: 'gzm', n })
  }
  while (p.money < 0) {
    const cheap = mine().sort((a, b) => FIELDS[a].price - FIELDS[b].price)[0]
    if (cheap == null) break
    delete s.owner[cheap]
    delete s.level[cheap]
    p.money += FIELDS[cheap].price / 2
    sold.push({ what: 'miejsce', field: cheap })
  }
  if (sold.length) ev.push({ t: 'liquidate', player: p.id, sold })
}

function pay(s, ev, from, to, amount, why, fee = false) {
  if (amount <= 0 || from.out) return 0
  if (fee && (from.immuneTurn || from.immuneBenny)) { ev.push({ t: 'immune', player: from.id, why }); return 0 }
  if (fee && from.half) { amount = Math.max(5000, Math.round(amount / 2 / 5000) * 5000); from.half = false; ev.push({ t: 'half', player: from.id }) }
  from.money -= amount
  if (to) to.money += amount
  ev.push({ t: 'pay', from: from.id, to: to ? to.id : null, amount, why })
  if (from.money < 0) {
    liquidate(s, ev, from)
    if (from.money < 0) {
      if (to) to.money += from.money
      from.money = 0
      from.out = true
      from.cards = []
      from.gzm = 0
      ev.push({ t: 'bankrupt', player: from.id })
    }
  }
  return amount
}

function drawPack(s) {
  const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0)
  const out = []
  for (let k = 0; k < 3; k++) {
    let x = rnd(s) * total, rar = 'zwykla'
    for (const [id, r] of Object.entries(RARITY)) { if (x < r.weight) { rar = id; break } x -= r.weight }
    const pool = CARDS.filter(c => c.rarity === rar)
    out.push(pool[Math.floor(rnd(s) * pool.length)].id)
  }
  return out
}

function give(s, ev, p, ids) {
  p.cards.push(...ids)
  if (p.cards.length > RULES.handLimit) s.pending = { type: 'discard', player: p.id }
}

function land(s, ev, p) {
  const i = p.pos, f = FIELDS[i]
  ev.push({ t: 'land', player: p.id, field: i })
  if (s.traps[i] != null && s.traps[i] !== p.id) {
    const o = s.players[s.traps[i]]
    delete s.traps[i]
    ev.push({ t: 'trap', player: p.id, owner: o.id, field: i })
    if (!o.out) pay(s, ev, p, o, RULES.saperzyFee, 'niewypał')
    p.skip = 1
    return
  }
  if (f.type === 'place') {
    const o = s.owner[i]
    if (o == null) {
      if (p.money >= f.price) s.pending = { type: 'buy', player: p.id, field: i }
      else ev.push({ t: 'cantBuy', player: p.id, field: i })
    } else if (o === p.id) ev.push({ t: 'home', player: p.id, field: i })
    else pay(s, ev, p, s.players[o], feeFor(s, i), FIELDS[i].name, true)
  } else if (f.type === 'moya') {
    s.pending = { type: 'pack', player: p.id, cards: drawPack(s), free: true }
    ev.push({ t: 'freePack', player: p.id })
  } else if (f.type === 'niewypal') {
    s.pending = { type: 'niewypal', player: p.id }
  } else if (f.type === 'koparka') {
    const options = ownedBy(s, p.id).filter(j => canBuild(s, p.id, j, true))
    if (options.length) s.pending = { type: 'koparka', player: p.id, options }
    else { p.money += RULES.koparkaCash; ev.push({ t: 'gain', player: p.id, amount: RULES.koparkaCash, why: 'koparka' }) }
  } else if (f.type === 'heli') {
    s.pending = { type: 'heli', player: p.id }
  } else if (f.type === 'wojt') {
    pay(s, ev, p, null, Math.max(RULES.wojtMin, round10k(p.money * RULES.wojtRate)), 'podatek Wójta')
  } else if (f.type === 'rakieta') {
    s.pending = { type: 'rakieta', player: p.id, maxBet: Math.max(0, Math.min(200000, Math.floor(p.money / 50000) * 50000)) }
  } else if (f.type === 'grad') {
    const amount = ownedBy(s, p.id).reduce((a, j) => a + (lvl(s, j) === 4 ? RULES.gradDom : lvl(s, j) * RULES.gradCabin), 0)
    ev.push({ t: 'hail', player: p.id, amount })
    pay(s, ev, p, null, amount, 'grad')
    setRate(s, ev, 0.88, 'grad')
  }
}

function move(s, ev, p, steps) {
  const from = p.pos, to = ((from + steps) % N + N) % N
  p.pos = to
  ev.push({ t: 'move', player: p.id, from, to, steps })
  if (steps > 0 && to < from) {
    const bonus = to === 0 ? RULES.startBonus : RULES.lapBonus
    p.money += bonus
    ev.push({ t: 'lap', player: p.id, amount: bonus, exact: to === 0 })
  }
  land(s, ev, p)
}

function advance(s, ev) {
  const order = s.players.map((p, i) => i)
  let next = -1
  for (let k = 1; k <= order.length; k++) {
    const i = (s.turn + k) % order.length
    if (!s.players[i].out) { next = i; break }
  }
  const wrapped = next <= s.turn
  if (alive(s).length <= 1 || next < 0) { s.over = true; ev.push({ t: 'over', ranking: ranking(s) }); return }
  if (wrapped) {
    s.round++
    if (s.round > s.rounds) { s.over = true; ev.push({ t: 'over', ranking: ranking(s) }); return }
    setRate(s, ev, 0.9 + rnd(s) * 0.24, 'runda')
    ev.push({ t: 'round', round: s.round, rounds: s.rounds })
  }
  s.turn = next
  begin(s, ev)
}

function begin(s, ev) {
  const p = cur(s)
  s.rolled = false
  s.packBought = false
  s.pending = null
  p.immuneBenny = false
  if (p.skip > 0) {
    p.skip--
    ev.push({ t: 'skipped', player: p.id })
    advance(s, ev)
    return
  }
  ev.push({ t: 'turn', player: p.id, money: p.money, round: s.round })
}

function settle(s, ev) {
  if (!s.over && cur(s).out) { s.pending = null; advance(s, ev) }
  return ev
}

const fail = why => [{ t: 'error', why }]

export function start(s) {
  if (s.started) return fail('Gra już trwa.')
  s.started = true
  const ev = [{ t: 'begin', players: s.players.map(p => p.name), rounds: s.rounds }]
  begin(s, ev)
  return ev
}

export function roll(s, forced) {
  if (s.over) return fail('Gra jest skończona.')
  if (s.pending) return fail('Najpierw dokończ to, co na ekranie.')
  if (s.rolled) return fail('Kostki już rzucone w tej turze.')
  const ev = [], p = cur(s)
  s.dice = forced || [1 + Math.floor(rnd(s) * 6), 1 + Math.floor(rnd(s) * 6)]
  s.rolled = true
  ev.push({ t: 'roll', player: p.id, dice: s.dice })
  move(s, ev, p, s.dice[0] + s.dice[1])
  return settle(s, ev)
}

export function decide(s, d = {}) {
  const pend = s.pending
  if (!pend) return fail('Nie ma nic do rozstrzygnięcia.')
  const ev = [], p = s.players[pend.player]
  if (pend.type === 'buy') {
    s.pending = null
    const f = FIELDS[pend.field]
    if (d.yes && p.money >= f.price) { p.money -= f.price; s.owner[pend.field] = p.id; ev.push({ t: 'bought', player: p.id, field: pend.field, price: f.price }) }
    else ev.push({ t: 'skipBuy', player: p.id, field: pend.field })
  } else if (pend.type === 'niewypal') {
    s.pending = null
    if (d.pay && p.money >= RULES.saperzyFee) { ev.push({ t: 'saperzy', player: p.id, paid: true }); pay(s, ev, p, null, RULES.saperzyFee, 'saperzy') }
    else { p.skip = 1; ev.push({ t: 'saperzy', player: p.id, paid: false }) }
  } else if (pend.type === 'koparka') {
    if (!pend.options.includes(d.field)) return fail('Wybierz jedno ze swoich miejsc.')
    s.pending = null
    s.level[d.field] = lvl(s, d.field) + 1
    ev.push({ t: 'built', player: p.id, field: d.field, level: s.level[d.field], free: true })
  } else if (pend.type === 'heli') {
    if (!(d.field >= 0 && d.field < N) || d.field === p.pos) return fail('Wybierz inne pole.')
    s.pending = null
    const from = p.pos
    p.pos = d.field
    ev.push({ t: 'fly', player: p.id, from, to: d.field })
    land(s, ev, p)
  } else if (pend.type === 'rakieta') {
    s.pending = null
    const bet = Math.max(0, Math.min(pend.maxBet, d.bet | 0))
    ev.push({ t: 'launch', player: p.id, bet, success: !!d.success })
    if (d.success) { p.money += bet; setRate(s, ev, 1.15, 'udany start rakiety') }
    else { if (bet) pay(s, ev, p, null, bet, 'nieudany start'); setRate(s, ev, 0.9, 'nieudany start rakiety') }
  } else if (pend.type === 'pack') {
    s.pending = null
    ev.push({ t: 'packTaken', player: p.id, cards: pend.cards })
    give(s, ev, p, pend.cards)
  } else if (pend.type === 'discard') {
    if (!(d.index >= 0 && d.index < p.cards.length)) return fail('Wybierz kartę do wyrzucenia.')
    const [gone] = p.cards.splice(d.index, 1)
    ev.push({ t: 'discard', player: p.id, card: gone })
    if (p.cards.length <= RULES.handLimit) s.pending = null
  }
  return settle(s, ev)
}

export function buyPack(s) {
  const p = cur(s)
  if (s.over || s.pending) return fail('Najpierw dokończ to, co na ekranie.')
  if (s.packBought) return fail('W tej turze pak już kupiony.')
  if (p.money < RULES.packPrice) return fail('Za mało szyszek na pak.')
  p.money -= RULES.packPrice
  s.packBought = true
  s.pending = { type: 'pack', player: p.id, cards: drawPack(s), free: false }
  return [{ t: 'packBought', player: p.id, price: RULES.packPrice }]
}

export function targetsFor(s, cardId) {
  const p = cur(s), c = cardById[cardId], others = alive(s).filter(o => o.id !== p.id)
  const places = FIELDS.map((f, i) => i).filter(i => FIELDS[i].type === 'place')
  if (c.target === 'player') return others.map(o => o.id)
  if (c.target === 'steps') return [1, 2, 3]
  if (c.target === 'freePlace') return places.filter(i => s.owner[i] == null && p.money >= FIELDS[i].price)
  if (c.target === 'myPlace') return places.filter(i => canBuild(s, p.id, i, true))
  if (c.target === 'theirBuilt') return places.filter(i => s.owner[i] != null && s.owner[i] !== p.id && lvl(s, i) > 0)
  if (c.target === 'theirPlace') return places.filter(i => s.owner[i] != null && s.owner[i] !== p.id && lvl(s, i) < 4)
  if (c.target === 'anyPlace') return places.filter(i => s.traps[i] == null)
  if (c.target === 'anyField') return FIELDS.map((f, i) => i).filter(i => i !== p.pos)
  return null
}

export function playCard(s, index, target) {
  const p = cur(s)
  if (s.over || s.pending) return fail('Najpierw dokończ to, co na ekranie.')
  const id = p.cards[index], c = cardById[id]
  if (!c) return fail('Nie masz takiej karty.')
  const allowed = targetsFor(s, id)
  if (allowed && !allowed.includes(target)) return fail(allowed.length ? 'Ta karta potrzebuje poprawnego celu.' : 'Tej karty nie da się teraz zagrać.')
  p.cards.splice(index, 1)
  const ev = [{ t: 'card', player: p.id, card: id, target }]
  const victim = c.target === 'player' ? s.players[target] : (c.target === 'theirPlace' || c.target === 'theirBuilt') ? s.players[s.owner[target]] : null
  if (victim && HOSTILE.has(id) && victim.shield) { victim.shield = false; ev.push({ t: 'blocked', player: victim.id, card: id }); return settle(s, ev) }
  const gain = (n, why) => { p.money += n; ev.push({ t: 'gain', player: p.id, amount: n, why }) }
  if (id === 'lody') gain(30000, 'lody')
  else if (id === 'sniadanie') gain(50000, 'śniadanie')
  else if (id === 'kopanie') gain(40000, 'kopanie w piasku')
  else if (id === 'obiad') p.half = true
  else if (id === 'hamak') p.immuneTurn = true
  else if (id === 'kajak') move(s, ev, p, target)
  else if (id === 'sup') move(s, ev, p, -target)
  else if (id === 'dron') ev.push({ t: 'peek', player: p.id, target, cards: [...victim.cards] })
  else if (id === 'ognisko') for (const o of alive(s)) { if (o.id !== p.id) pay(s, ev, o, p, 20000, 'ognisko') }
  else if (id === 'ptaki') { s.rolled = false; ev.push({ t: 'extraRoll', player: p.id }) }
  else if (id === 'grad') pay(s, ev, victim, null, ownedBy(s, victim.id).reduce((a, j) => a + lvl(s, j), 0) * 20000, 'grad')
  else if (id === 'hossa') setRate(s, ev, 1.25, 'hossa')
  else if (id === 'krach') setRate(s, ev, 0.75, 'krach')
  else if (id === 'mapa') { p.money -= FIELDS[target].price; s.owner[target] = p.id; ev.push({ t: 'bought', player: p.id, field: target, price: FIELDS[target].price }) }
  else if (id === 'waldek') { s.level[target] = lvl(s, target) + 1; ev.push({ t: 'built', player: p.id, field: target, level: s.level[target], free: true }) }
  else if (id === 'major') { s.level[target]--; ev.push({ t: 'cut', player: p.id, victim: victim.id, field: target, level: s.level[target] }) }
  else if (id === 'wojt') pay(s, ev, victim, null, Math.max(RULES.wojtMin, round10k(victim.money * RULES.wojtRate)), 'podatek Wójta')
  else if (id === 'saperzy') { s.traps[target] = p.id; ev.push({ t: 'trapSet', player: p.id, field: target }) }
  else if (id === 'beethoven') p.shield = true
  else if (id === 'dropsik') {
    if (victim.cards.length) { const [stolen] = victim.cards.splice(Math.floor(rnd(s) * victim.cards.length), 1); ev.push({ t: 'stolenCard', player: p.id, victim: victim.id, card: stolen }); give(s, ev, p, [stolen]) }
    else ev.push({ t: 'stolenCard', player: p.id, victim: victim.id, card: null })
  }
  else if (id === 'koza') gain(ownedBy(s, p.id).length * 20000, 'koza')
  else if (id === 'benny') p.immuneBenny = true
  else if (id === 'noc') { const a = p.pos; p.pos = victim.pos; victim.pos = a; ev.push({ t: 'swap', player: p.id, victim: victim.id }) }
  else if (id === 'zofia') pay(s, ev, victim, p, 100000, 'Mama w czerwieni')
  else if (id === 'helikopter') { const from = p.pos; p.pos = target; ev.push({ t: 'fly', player: p.id, from, to: target }); land(s, ev, p) }
  else if (id === 'osmiornica') { s.owner[target] = p.id; ev.push({ t: 'stolenPlace', player: p.id, victim: victim.id, field: target }) }
  else if (id === 'tablica') {
    const free = FIELDS.map((f, i) => i).filter(i => FIELDS[i].type === 'place' && s.owner[i] == null).sort((a, b) => FIELDS[a].price - FIELDS[b].price)[0]
    if (free != null) { s.owner[free] = p.id; ev.push({ t: 'bought', player: p.id, field: free, price: 0 }) } else gain(150000, 'tablica FSO')
  }
  else if (id === 'daje') gain(200000, 'Ośrodek daje')
  else if (id === 'orange') { gain(100000, 'The Orange Beauty'); setRate(s, ev, 1.2, 'The Orange Beauty') }
  return settle(s, ev)
}

export function build(s, i) {
  const p = cur(s)
  if (s.over || s.pending) return fail('Najpierw dokończ to, co na ekranie.')
  if (!canBuild(s, p.id, i)) return fail('Tu nie możesz teraz budować. Potrzebna cała grupa i szyszki.')
  p.money -= cabinCost(FIELDS[i])
  s.level[i] = lvl(s, i) + 1
  return [{ t: 'built', player: p.id, field: i, level: s.level[i], free: false, cost: cabinCost(FIELDS[i]) }]
}

export function market(s, kind, n) {
  const p = cur(s)
  n = Math.floor(n)
  if (s.over || s.pending || !(n > 0)) return fail('Nie teraz.')
  if (kind === 'buy') {
    if (p.money < n * s.gzmRate) return fail('Za mało szyszek.')
    p.money -= n * s.gzmRate
    p.gzm += n
  } else {
    if (p.gzm < n) return fail('Nie masz tyle Gzowium.')
    p.gzm -= n
    p.money += n * s.gzmRate
  }
  return [{ t: 'market', player: p.id, kind, n, rate: s.gzmRate }]
}

export function tradeValid(s, o) {
  const a = s.players[o.from], b = s.players[o.to]
  if (!a || !b || a.out || b.out || a.id === b.id) return false
  if ((o.giveFields || []).some(i => s.owner[i] !== a.id) || (o.getFields || []).some(i => s.owner[i] !== b.id)) return false
  return (o.giveMoney || 0) >= 0 && (o.getMoney || 0) >= 0 && a.money >= (o.giveMoney || 0) && b.money >= (o.getMoney || 0)
}

export function trade(s, o) {
  if (s.over || s.pending) return fail('Nie teraz.')
  if (!tradeValid(s, o)) return fail('Ta wymiana nie jest możliwa.')
  const a = s.players[o.from], b = s.players[o.to]
  for (const i of o.giveFields || []) s.owner[i] = b.id
  for (const i of o.getFields || []) s.owner[i] = a.id
  a.money += (o.getMoney || 0) - (o.giveMoney || 0)
  b.money += (o.giveMoney || 0) - (o.getMoney || 0)
  return [{ t: 'trade', from: a.id, to: b.id, giveFields: o.giveFields || [], getFields: o.getFields || [], giveMoney: o.giveMoney || 0, getMoney: o.getMoney || 0 }]
}

export function endTurn(s) {
  if (s.over) return fail('Gra jest skończona.')
  if (s.pending) return fail('Najpierw dokończ to, co na ekranie.')
  if (!s.rolled) return fail('Najpierw rzuć kostkami.')
  const ev = [{ t: 'endTurn', player: cur(s).id }]
  cur(s).immuneTurn = false
  advance(s, ev)
  return ev
}

export function summary(s) {
  return {
    runda: `${Math.min(s.round, s.rounds)} z ${s.rounds}`,
    kursGzowium: s.gzmRate,
    tura: cur(s).name,
    gracze: s.players.map(p => ({ imie: p.name, szyszki: p.money, gzowium: p.gzm, pole: FIELDS[p.pos].name, karty: p.cards.length, majatek: wealth(s, p), odpadl: p.out, miejsca: ownedBy(s, p.id).map(i => FIELDS[i].name + (lvl(s, i) === 4 ? ' (Dom)' : lvl(s, i) ? ` (${lvl(s, i)} domki)` : '')) })),
  }
}
