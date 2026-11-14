// Imperium Gzowianskie board game: plays thousands of bot games with the printed rules to check length, how much fees matter and that games always end. node sim.mjs [games=400] [rules='{"salary":3}'] [sec=50]
import { FIELDS, RULES as BASE, MODES, DECK, GROUPS, groupFields } from '../gra.mjs'

const args = Object.fromEntries(process.argv.slice(2).map(a => { const k = a.indexOf('='); return [a.slice(0, k), a.slice(k + 1)] }))
const R = { ...BASE, ...(args.rules ? JSON.parse(args.rules) : {}) }
const MODE = Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, { ...m, ...(args[k] ? JSON.parse(args[k]) : {}) }]))
const GAMES = +(args.games || 400), SEC = +(args.sec || 50), CAP = 900
const N = FIELDS.length, RES = ['drewno', 'piasek', 'ryby']
const PLACES = FIELDS.map((f, i) => i).filter(i => FIELDS[i].type === 'place')
const GID = Object.keys(GROUPS), GF = Object.fromEntries(GID.map(g => [g, groupFields(g)]))
const HOSTILE = new Set(['dron', 'grad', 'major', 'wojt', 'dropsik', 'zofia', 'osmiornica'])

function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const lvl = (s, i) => s.lvl[i] || 0
const owned = (s, pid) => PLACES.filter(i => s.owner[i] === pid)
const full = (s, g, pid) => GF[g].every(i => s.owner[i] === pid)
const fee = (s, i) => { const f = FIELDS[i], l = lvl(s, i); return l === 2 ? f.fee * R.feeHouse : l === 1 ? f.fee * R.feeCabin : full(s, f.group, s.owner[i]) ? f.fee * R.feeGroup : f.fee }
const alive = s => s.players.filter(p => !p.out)
const others = (s, p) => alive(s).filter(o => o.id !== p.id)
const built = (s, pid) => GID.filter(g => full(s, g, pid) && GF[g].every(i => lvl(s, i) >= 1))
const goalMet = (s, p) => { const b = built(s, p.id); return b.length >= s.mode.groups && b.filter(g => s.mode.all ? GF[g].every(i => lvl(s, i) === 2) : GF[g].some(i => lvl(s, i) === 2)).length >= s.mode.houses }
const progress = (s, p) => Math.max(0, ...GID.map(g => GF[g].reduce((a, i) => a + (s.owner[i] === p.id ? 1 + lvl(s, i) : 0), 0) / GF[g].length)) + p.money / 200

function newGame(n, mode, seed) {
  const r = rng(seed)
  const s = { r, mode, players: Array.from({ length: n }, (_, id) => ({ id, money: R.startMoney + id * (R.seatBonus || 0), pos: 0, res: { drewno: 0, piasek: 0, ryby: 0 }, cards: [], skip: 0, out: false, benny: false })), owner: {}, lvl: {}, trap: {}, deck: shuffle([...DECK], r), discard: [], turn: 0, turns: 0, over: false, winner: null, st: { salary: 0, rent: 0, bank: 0, cardMoney: 0, buyoutMoney: 0, bankrupt: 0, cabins: 0, houses: 0, buyouts: 0, swaps: 0, sales: 0, cards: 0, firstGroup: 0, landings: 0, dead: 0 } }
  if (mode.deal) { const pool = shuffle([...PLACES], r); for (const p of s.players) for (let k = 0; k < mode.deal; k++) { const at = pool.findIndex(i => !owned(s, p.id).some(j => FIELDS[j].group === FIELDS[i].group)); const [i] = pool.splice(at < 0 ? 0 : at, 1); s.owner[i] = p.id; p.res[FIELDS[i].res] += R.buyBonus } }
  return s
}

function draw(s, p) {
  if (!s.deck.length) { s.deck = shuffle(s.discard.splice(0), s.r); if (!s.deck.length) return }
  p.cards.push(s.deck.pop())
  s.st.cards++
  while (p.cards.length > R.handLimit) s.discard.push(p.cards.splice(Math.floor(s.r() * p.cards.length), 1)[0])
}
const use = (s, p, id) => { const k = p.cards.indexOf(id); if (k < 0) return false; p.cards.splice(k, 1); s.discard.push(id); return true }

function raise(s, p, need) {
  for (const r of RES) while (p.money < need && p.res[r] > 0) { p.res[r]--; p.money += R.sellRes }
  const mine = () => owned(s, p.id).sort((a, b) => FIELDS[a].price - FIELDS[b].price)
  for (const i of mine()) if (p.money < need && lvl(s, i) > 0) { p.money += lvl(s, i) === 2 ? R.sellHouse : R.sellCabin; delete s.lvl[i] }
  for (const i of mine()) if (p.money < need) { p.money += Math.ceil(FIELDS[i].price / 2); delete s.owner[i]; delete s.lvl[i] }
}

function pay(s, from, to, amount, kind) {
  if (amount <= 0 || from.out) return
  if (from.money < amount) raise(s, from, amount)
  const paid = Math.min(amount, from.money)
  from.money -= paid
  if (to && !to.out) to.money += paid
  s.st[kind] += paid
  if (paid < amount) {
    from.out = true
    s.st.bankrupt++
    for (const i of owned(s, from.id)) { delete s.owner[i]; delete s.lvl[i] }
    s.discard.push(...from.cards.splice(0))
    if (alive(s).length <= 1) { s.over = true; s.winner = alive(s)[0] || null; s.st.dead = 1 }
  }
}

function targets(s, p) {
  return GID.map(g => {
    const f = GF[g], mine = f.filter(i => s.owner[i] === p.id).length
    const theirs = f.filter(i => s.owner[i] != null && s.owner[i] !== p.id)
    const blocked = theirs.some(i => lvl(s, i) > 0)
    return { g, mine, v: mine / f.length - theirs.length * .1 - (blocked ? .6 : 0) - f.reduce((a, i) => a + FIELDS[i].price, 0) / 300 }
  }).filter(x => x.mine > 0).sort((a, b) => b.v - a.v).slice(0, s.mode.groups).map(x => x.g)
}
const wants = (s, p, i) => targets(s, p).includes(FIELDS[i].group)

function afford(p, cost, doIt) {
  let missing = 0, spare = 0
  for (const r of RES) { const d = (cost[r] || 0) - p.res[r]; if (d > 0) missing += d; else spare += Math.floor(-d / R.bankTrade) }
  if (spare < missing) return false
  if (doIt) {
    for (const r of RES) while (p.res[r] < (cost[r] || 0)) { const from = RES.find(x => p.res[x] - (cost[x] || 0) >= R.bankTrade); p.res[from] -= R.bankTrade; p.res[r]++ }
    for (const r of RES) p.res[r] -= cost[r] || 0
  }
  return true
}

function buildPhase(s, p) {
  for (let guard = 0; guard < 20; guard++) {
    const t = targets(s, p), mine = owned(s, p.id)
    const fullT = t.filter(g => full(s, g, p.id))
    let done = false
    for (const g of fullT) {
      const empty = GF[g].filter(i => lvl(s, i) === 0)
      if (empty.length) { if (afford(p, R.cabin, true)) { s.lvl[empty[0]] = 1; s.st.cabins++; done = true } break }
      const up = s.mode.all ? GF[g].filter(i => lvl(s, i) === 1) : GF[g].some(i => lvl(s, i) === 2) ? [] : [GF[g][GF[g].length - 1]]
      if (s.mode.houses && up.length) { if (afford(p, R.house, true)) { s.lvl[up[up.length - 1]] = 2; s.st.houses++; done = true } break }
    }
    if (!done && !fullT.length) {
      const guardable = mine.filter(i => lvl(s, i) === 0).sort((a, b) => (t.includes(FIELDS[b].group) - t.includes(FIELDS[a].group)) || FIELDS[b].price - FIELDS[a].price)
      if (guardable.length && afford(p, R.cabin, true)) { s.lvl[guardable[0]] = 1; s.st.cabins++; done = true }
    }
    if (!done && fullT.length === t.length) {
      const extra = mine.filter(i => lvl(s, i) === 0).sort((a, b) => FIELDS[b].price - FIELDS[a].price)
      const keep = s.mode.houses ? { drewno: R.cabin.drewno + R.house.drewno, piasek: R.cabin.piasek + R.house.piasek, ryby: 0 } : R.cabin
      if (extra.length && RES.every(r => p.res[r] >= (keep[r] || 0)) && goalMet(s, p) === false && afford(p, R.cabin, false) && built(s, p.id).length >= s.mode.groups) { afford(p, R.cabin, true); s.lvl[extra[0]] = 1; s.st.cabins++; done = true }
    }
    if (goalMet(s, p)) { s.over = true; s.winner = p; return }
    if (!done) return
  }
}

function tradePhase(s, p) {
  const t = targets(s, p)
  for (const g of t) for (const x of GF[g]) {
    const o = s.owner[x]
    if (o == null || o === p.id || lvl(s, x) > 0) continue
    const b = s.players[o], bt = targets(s, b)
    const y = owned(s, p.id).find(i => lvl(s, i) === 0 && !t.includes(FIELDS[i].group) && bt.includes(FIELDS[i].group))
    if (y != null && !bt.includes(g)) { s.owner[x] = p.id; s.owner[y] = b.id; s.st.swaps++; return }
    const price = FIELDS[x].price * R.buyout
    if (!bt.includes(g) && p.money >= price + 3 && s.r() < .2) { p.money -= price; b.money += price; s.owner[x] = p.id; s.st.sales++; s.st.buyoutMoney += price; return }
  }
}

function bestRes(s, p, n) {
  for (let k = 0; k < n; k++) {
    const need = s.mode.houses && targets(s, p).some(g => full(s, g, p.id) && GF[g].every(i => lvl(s, i) >= 1)) ? R.house : R.cabin
    const r = RES.slice().sort((a, b) => ((need[b] || 0) - p.res[b]) - ((need[a] || 0) - p.res[a]))[0]
    p.res[r]++
  }
}

function value(s, p, i) {
  const f = FIELDS[i]
  if (f.type === 'place') {
    const o = s.owner[i]
    if (o == null) return p.money >= f.price + 2 ? (wants(s, p, i) ? 8 : 3) : 0
    if (o === p.id) return R.ownLanding
    const want = wants(s, p, i) && lvl(s, i) === 0 && p.money >= f.price * R.buyout + fee(s, i) + 2
    return (want ? 7 : 0) - (p.benny ? 0 : fee(s, i))
  }
  return { start: R.startExact + 1, moya: 3, koparka: R.koparka, heli: 4, rakieta: 2.8, niewypal: -R.saperzy, wojt: -R.wojtPerPlace * Math.max(1, owned(s, p.id).length), grad: -owned(s, p.id).reduce((a, j) => a + (lvl(s, j) === 2 ? R.gradHouse : lvl(s, j) ? R.gradCabin : 0), 0) }[f.type] || 0
}

function land(s, p, depth = 0) {
  const i = p.pos, f = FIELDS[i]
  s.st.landings++
  if (s.trap[i] != null && s.trap[i] !== p.id) {
    const o = s.players[s.trap[i]]
    delete s.trap[i]
    pay(s, p, o.out ? null : o, R.saperzy, 'cardMoney')
    p.skip = 1
    return
  }
  if (f.type === 'place') {
    const o = s.owner[i]
    if (o == null) { if (p.money >= f.price + (wants(s, p, i) ? 0 : 2)) { p.money -= f.price; s.owner[i] = p.id; p.res[f.res] += R.buyBonus } }
    else if (o === p.id) p.res[f.res] += R.ownLanding
    else {
      let due = p.benny ? 0 : fee(s, i)
      if (due >= 4 && use(s, p, 'hamak')) due = 0
      else if (due >= 4 && use(s, p, 'obiad')) due = Math.ceil(due / 2)
      pay(s, p, s.players[o], due, 'rent')
      if (!p.out && R.buyout && lvl(s, i) === 0 && wants(s, p, i) && p.money >= f.price * R.buyout + 2) { const price = f.price * R.buyout; p.money -= price; s.players[o].money += price; s.owner[i] = p.id; s.st.buyouts++; s.st.buyoutMoney += price }
    }
  } else if (f.type === 'moya') draw(s, p)
  else if (f.type === 'niewypal') { if (p.money >= R.saperzy + 2) pay(s, p, null, R.saperzy, 'bank'); else p.skip = 1 }
  else if (f.type === 'koparka') bestRes(s, p, R.koparka)
  else if (f.type === 'heli' && depth < 1) { fly(s, p, depth + 1) }
  else if (f.type === 'wojt') pay(s, p, null, R.wojtPerPlace * Math.max(1, owned(s, p.id).length), 'bank')
  else if (f.type === 'rakieta') { const v = R.rakieta[Math.floor(s.r() * 6)]; if (v < 0) pay(s, p, null, -v, 'bank'); else { p.money += v; s.st.cardMoney += v } }
  else if (f.type === 'grad') pay(s, p, null, owned(s, p.id).reduce((a, j) => a + (lvl(s, j) === 2 ? R.gradHouse : lvl(s, j) ? R.gradCabin : 0), 0), 'bank')
}

function fly(s, p, depth) {
  let best = -1, bv = -1e9
  for (let i = 0; i < N; i++) { if (i === p.pos || FIELDS[i].type === 'heli') continue; const v = value(s, p, i) + s.r() * .1; if (v > bv) { bv = v; best = i } }
  p.pos = best
  land(s, p, depth)
}

function move(s, p, steps) {
  const from = p.pos
  p.pos = ((from + steps) % N + N) % N
  if (steps > 0 && p.pos < from) {
    const got = R.salary + (p.pos === 0 ? R.startExact : 0)
    p.money += got
    s.st.salary += got
    if (R.harvestOnLap) for (const i of owned(s, p.id)) p.res[FIELDS[i].res]++
  }
  land(s, p)
}

function playCard(s, p) {
  const leader = others(s, p).sort((a, b) => progress(s, b) - progress(s, a))[0]
  if (!leader) return null
  const hit = (id, fn) => { if (HOSTILE.has(id) && use(s, leader, 'beethoven')) return; fn() }
  const t = targets(s, p)
  for (const id of [...p.cards]) {
    let ok = true
    if (id === 'lody') { p.money += 2; s.st.cardMoney += 2 }
    else if (id === 'sniadanie') { p.money += 3; s.st.cardMoney += 3 }
    else if (id === 'kopanie') p.res.piasek += 2
    else if (id === 'motorowka') p.res.ryby += 2
    else if (id === 'taras') p.res.drewno += 2
    else if (id === 'dron') { const r = RES.filter(x => leader.res[x] > 0)[0]; if (!r) ok = false; else hit(id, () => { leader.res[r]--; p.res[r]++ }) }
    else if (id === 'ognisko') for (const o of others(s, p)) { if (o.res.drewno > 0) { o.res.drewno--; p.res.drewno++ } else pay(s, o, p, 1, 'cardMoney') }
    else if (id === 'ptaki') s.extra = true
    else if (id === 'grad') { const due = owned(s, leader.id).reduce((a, j) => a + (lvl(s, j) === 2 ? R.gradHouse : lvl(s, j) ? R.gradCabin : 0), 0); if (!due) ok = false; else hit(id, () => pay(s, leader, null, due, 'bank')) }
    else if (id === 'mapa') { const free = PLACES.filter(i => s.owner[i] == null && p.money >= FIELDS[i].price + 2).sort((a, b) => (t.includes(FIELDS[b].group) - t.includes(FIELDS[a].group)) || FIELDS[a].price - FIELDS[b].price)[0]; if (free == null) ok = false; else { p.money -= FIELDS[free].price; s.owner[free] = p.id; p.res[FIELDS[free].res] += R.buyBonus } }
    else if (id === 'waldek') { const i = owned(s, p.id).filter(j => lvl(s, j) === 0).sort((a, b) => (t.includes(FIELDS[b].group) - t.includes(FIELDS[a].group)) || FIELDS[b].price - FIELDS[a].price)[0]; if (i == null) ok = false; else { s.lvl[i] = 1; s.st.cabins++ } }
    else if (id === 'major') { const i = owned(s, leader.id).filter(j => lvl(s, j) === 1).sort((a, b) => FIELDS[b].fee - FIELDS[a].fee)[0]; if (i == null) ok = false; else hit(id, () => { delete s.lvl[i] }) }
    else if (id === 'wojt') { const n = owned(s, leader.id).length; if (!n) ok = false; else hit(id, () => pay(s, leader, null, n * R.wojtPerPlace, 'bank')) }
    else if (id === 'saperzy') { const opts = PLACES.filter(i => s.trap[i] == null); s.trap[opts[Math.floor(s.r() * opts.length)]] = p.id }
    else if (id === 'dropsik') { if (!leader.cards.length) ok = false; else hit(id, () => { p.cards.push(leader.cards.splice(Math.floor(s.r() * leader.cards.length), 1)[0]) }) }
    else if (id === 'koza') { if (!owned(s, p.id).length) ok = false; else for (const i of owned(s, p.id)) p.res[FIELDS[i].res]++ }
    else if (id === 'benny') p.benny = true
    else if (id === 'zofia') { if (RES.every(r => !leader.res[r])) ok = false; else hit(id, () => { for (let k = 0; k < 2; k++) { const r = RES.filter(x => leader.res[x] > 0).sort((a, b) => p.res[a] - p.res[b])[0]; if (r) { leader.res[r]--; p.res[r]++ } } }) }
    else if (id === 'osmiornica') {
      const pool = alive(s).filter(o => o.id !== p.id).flatMap(o => owned(s, o.id)).filter(i => lvl(s, i) === 0)
      const i = pool.sort((a, b) => (t.includes(FIELDS[b].group) - t.includes(FIELDS[a].group)) || FIELDS[b].price - FIELDS[a].price)[0]
      if (i == null) ok = false
      else { const v = s.players[s.owner[i]]; if (!use(s, v, 'beethoven')) s.owner[i] = p.id }
    }
    else if (id === 'tablica') { const free = PLACES.filter(i => s.owner[i] == null).sort((a, b) => FIELDS[a].price - FIELDS[b].price)[0]; if (free != null) { s.owner[free] = p.id; p.res[FIELDS[free].res] += R.buyBonus } else { p.money += 5; s.st.cardMoney += 5 } }
    else if (id === 'daje') bestRes(s, p, 4)
    else if (id === 'orange') for (const o of others(s, p)) pay(s, o, p, 2, 'cardMoney')
    else ok = false
    if (ok) { use(s, p, id); return id }
  }
  return null
}

function turn(s) {
  const p = s.players[s.turn]
  const next = () => { do { s.turn = (s.turn + 1) % s.players.length } while (s.players[s.turn].out) }
  if (p.skip) { p.skip--; return next() }
  p.benny = false
  s.turns++
  s.extra = false
  const fishKeep = s.mode.houses && targets(s, p).some(g => full(s, g, p.id)) ? R.house.ryby : 0
  if (p.res.ryby > fishKeep) { p.res.ryby--; draw(s, p) }
  tradePhase(s, p)
  buildPhase(s, p)
  if (s.over) return
  const played = playCard(s, p)
  if (s.over) return
  if (!s.st.firstGroup && GID.some(g => alive(s).some(o => full(s, g, o.id)))) s.st.firstGroup = s.turns
  for (let rolls = 1; rolls > 0 && !p.out && !s.over; rolls--) {
    if (!played && p.cards.includes('helikopter') && s.r() < .7) { use(s, p, 'helikopter'); fly(s, p, 1); break }
    let steps = 2 + Math.floor(s.r() * 6) + Math.floor(s.r() * 6)
    if (!played) {
      const base = value(s, p, (p.pos + steps) % N)
      for (const [id, dir] of [['kajak', 1], ['sup', -1]]) if (p.cards.includes(id)) {
        const opt = [1, 2, 3].map(k => [k, value(s, p, ((p.pos + steps + dir * k) % N + N) % N)]).sort((a, b) => b[1] - a[1])[0]
        if (opt[1] > base + 2) { use(s, p, id); steps += dir * opt[0]; break }
      }
    }
    move(s, p, steps)
    if (s.extra) { s.extra = false; rolls++ }
  }
  if (!p.out && !s.over) buildPhase(s, p)
  const tm = s.players.reduce((a, o) => a + o.money, 0)
  s.st.maxMoney = Math.max(s.st.maxMoney || 0, tm)
  s.st.maxOne = Math.max(s.st.maxOne || 0, ...s.players.map(o => o.money))
  for (const r of RES) s.st['max_' + r] = Math.max(s.st['max_' + r] || 0, s.players.reduce((a, o) => a + o.res[r], 0))
  s.st.maxCab = Math.max(s.st.maxCab || 0, PLACES.filter(i => lvl(s, i) === 1).length)
  s.st.maxDom = Math.max(s.st.maxDom || 0, PLACES.filter(i => lvl(s, i) === 2).length)
  if (!s.over) next()
}

function run(n, modeKey) {
  const agg = { turns: [], wins: Array(n).fill(0), stalled: 0, dead: 0, st: {} }
  for (let g = 0; g < GAMES; g++) {
    const s = newGame(n, MODE[modeKey], 1000 + g * 7919 + n * 31)
    while (!s.over && s.turns < CAP) turn(s)
    if (!s.over) agg.stalled++
    else if (s.winner) agg.wins[s.winner.id]++
    agg.turns.push(s.turns)
    agg.dead += s.st.dead
    for (const k of Object.keys(s.st).filter(k => k.startsWith('max'))) { (agg.mx = agg.mx || {})[k] = (agg.mx[k] || []).concat(s.st[k]) }
    for (const [k, v] of Object.entries(s.st)) agg.st[k] = (agg.st[k] || 0) + v
  }
  const t = agg.turns.slice().sort((a, b) => a - b), q = x => t[Math.floor(t.length * x)], a = k => +(agg.st[k] / GAMES).toFixed(1)
  const min = x => Math.round(x * SEC / 60)
  const money = agg.st.salary + agg.st.rent + agg.st.cardMoney
  if (args.max) { const o = {}; for (const [k, v] of Object.entries(agg.mx)) { v.sort((x, y) => x - y); o[k] = `${v[Math.floor(v.length * .5)]}/${v[Math.floor(v.length * .95)]}/${v[v.length - 1]}` } return { mode: modeKey, players: n, ...o } }
  return { mode: modeKey, players: n, minutes: `${min(q(.1))}/${min(q(.5))}/${min(q(.9))}`, turnsMedian: q(.5), turnsEach: +(q(.5) / n).toFixed(1), stalled: agg.stalled, lastStanding: agg.dead, bankrupt: a('bankrupt'), rentShare: Math.round(agg.st.rent / money * 100) + '%', salaryShare: Math.round(agg.st.salary / money * 100) + '%', rentPerLanding: +(agg.st.rent / agg.st.landings).toFixed(2), cabins: a('cabins'), houses: a('houses'), buyouts: a('buyouts'), swaps: a('swaps'), sales: a('sales'), cards: a('cards'), firstGroupTurn: a('firstGroup'), seatWin: agg.wins.map(w => Math.round(w / GAMES * 100)).join('/') }
}

const rows = []
for (const m of (args.modes || 'szybka,normalna,dluga').split(',')) for (const n of (args.players || '2,3,4,6').split(',').map(Number)) rows.push(run(n, m))
console.table(rows)
