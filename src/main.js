// Imperium Gzowianskie: the game itself. Wires the rules engine to the 3D plot, the screens, the Octopus host, voice and tablet motion.
import * as E from './game/engine.js'
import { FIELDS, GROUPS, RULES, szyszki, cabinCost } from './data/board.js'
import { cardById, photoOf, RARITY } from './data/cards.js'
import { createWorld, PAWN_LIST } from './view/world.js'
import { createHost, SYSTEM, TOOLS } from './host/host.js'
import { createLive } from './host/live.js'
import { createMotion } from './sense/motion.js'
import { CONFIG } from './config.js'

const $ = s => document.querySelector(s)
const layer = $('#layer'), hud = $('#hud')
const COLORS = ['#e23b2e', '#2f6fd6', '#2fbf71', '#ffb21a', '#8a52d6', '#19c2b0']
const SAVE = 'imperium.save.v1', PREFS = 'imperium.prefs.v1'
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const wait = ms => new Promise(r => setTimeout(r, ms))
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').trim()

let S = null, busy = false, live = null, voiceOn = false, paused = false, lastRate = RULES.gzmStart, handoverDone = null, picking = false
const world = createWorld($('#gl'))
const host = createHost({ lineEl: $('#line'), octoEl: $('#octo'), state: () => S })
const motion = createMotion({
  onShake: () => { if (ready() && !S.rolled) actions.roll() },
  onFaceDown: () => { if (ready() && S.rolled) actions.endTurn() },
  onFaceUp: () => { if (handoverDone) handoverDone() },
})
const ready = () => S && !S.over && !busy && !paused && !S.pending && !layer.firstChild && !picking

function sheet(html, { solid = false, clear = false, wide = false } = {}) {
  layer.innerHTML = `<div class="veil${solid ? ' solid' : ''}${clear ? ' clear' : ''}"><div class="sheet${wide ? ' wide' : ''}">${html}</div></div>`
  return layer.firstChild
}
const closeSheet = () => { layer.innerHTML = '' }
function toast(text) {
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = text
  document.body.append(t)
  setTimeout(() => t.remove(), 2600)
}
const cardHTML = (id, tag = 'div', extra = '') => { const c = cardById[id]; return `<${tag} class="card ${c.rarity}" ${extra}><img src="${photoOf(id)}" alt=""><b>${esc(c.name)}</b><u>${RARITY[c.rarity].name}</u><span>${esc(c.text)}</span></${tag}>` }
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(S)) } catch {} }

function refresh() {
  if (!S) return
  const p = E.cur(S), dir = S.gzmRate > lastRate ? '<em>▲</em>' : S.gzmRate < lastRate ? '<em class="down">▼</em>' : ''
  $('#who').innerHTML = `<i style="background:${p.color}"></i><b>Tura: ${esc(p.name)}</b><span>${szyszki(p.money)} szyszek${p.gzm ? ` · ${p.gzm} GZM` : ''}</span>`
  $('#rate').innerHTML = `GZOWIUM ${szyszki(S.gzmRate)}${dir}<span>runda ${Math.min(S.round, S.rounds)}/${S.rounds}</span>`
  $('#others').innerHTML = S.players.filter(o => o.id !== p.id).map(o => `<div class="${o.out ? 'out' : ''}"><i style="background:${o.color}"></i>${esc(o.name)}<span>${szyszki(o.money)}</span></div>`).join('')
  const free = !busy && !paused && !S.pending && !S.over && !picking
  const main = $('#main')
  main.textContent = S.rolled ? 'Koniec tury' : 'Rzuć kostkami'
  main.disabled = !free
  $('#bCards').innerHTML = `Karty<b>${p.cards.length}</b>`
  $('#bCards').disabled = !free || !p.cards.length
  $('#bPack').innerHTML = `Pak<b>${szyszki(RULES.packPrice / 1000)}k</b>`
  $('#bPack').disabled = !free || S.packBought || p.money < RULES.packPrice
  $('#bBuild').disabled = !free || !E.ownedBy(S, p.id).some(i => E.canBuild(S, p.id, i))
  $('#bMarket').disabled = !free
  $('#bTrade').disabled = !free || E.alive(S).length < 2
}

function animate(e) {
  const run = fn => Promise.race([new Promise(fn), wait(2600)])
  if (e.t === 'roll') return run(r => world.rollDice(e.dice, r)).then(() => wait(350))
  if (e.t === 'move') {
    const path = [], n = FIELDS.length, dir = e.steps > 0 ? 1 : -1
    for (let i = e.from; i !== e.to;) { i = ((i + dir) % n + n) % n; path.push(i) }
    return run(r => world.movePawn(e.player, path, r))
  }
  if (e.t === 'fly' || e.t === 'swap') return run(r => e.t === 'fly' ? world.flyPawn(e.player, e.to, r) : (world.sync(S), r()))
  return null
}

function handover(p) {
  return new Promise(resolve => {
    const v = sheet(`<p class="k" style="margin:0 0 6px;letter-spacing:.09em;text-transform:uppercase;font-size:14px;font-weight:700;color:var(--mute)">Podaj tablet</p><h2 class="title" style="display:flex;align-items:center;gap:18px"><i style="width:.7em;height:.7em;border-radius:50%;background:${p.color};display:inline-block"></i>${esc(p.name)}</h2><p class="sub">Runda ${Math.min(S.round, S.rounds)} z ${S.rounds}. Na koncie ${szyszki(p.money)} szyszek.</p><div class="row"><button class="btn go" id="go">Zaczynam turę</button></div>`, { solid: true })
    handoverDone = () => { handoverDone = null; closeSheet(); resolve() }
    $('#go').onclick = handoverDone
    v.dataset.kind = 'handover'
  })
}

async function play(events, { quiet = false } = {}) {
  if (!events.length) return ''
  if (events[0].t === 'error') { toast(events[0].why); return '' }
  busy = true
  closeSheet()
  refresh()
  const at = events.findIndex(e => e.t === 'turn')
  const first = at < 0 ? events : events.slice(0, at), rest = at < 0 ? [] : events.slice(at)
  for (const e of first) { const a = animate(e); if (a) await a }
  world.sync(S)
  const said = host.narrate(first, { quiet })
  refresh()
  save()
  lastRate = events.filter(e => e.t === 'rate').length ? events.filter(e => e.t === 'rate')[0].before : lastRate
  const peek = first.find(e => e.t === 'peek')
  if (peek) await new Promise(r => { sheet(`<h2>Karty: ${esc(S.players[peek.target].name)}</h2><div class="cards">${peek.cards.length ? peek.cards.map(c => cardHTML(c)).join('') : '<p>Pusto. Nie ma ani jednej karty.</p>'}</div><div class="row"><button class="btn go" id="ok">Zapamiętane</button></div>`, { wide: true }); $('#ok').onclick = () => { closeSheet(); r() } })
  if (S.over) { busy = false; refresh(); endScreen(); return said }
  if (rest.length) {
    if (first.some(e => e.t === 'endTurn' || e.t === 'bankrupt' || e.t === 'begin')) await wait(quiet ? 200 : 900)
    await handover(S.players[rest[0].player])
    world.hideDice()
    host.narrate(rest)
  }
  busy = false
  refresh()
  if (S.pending) openPending()
  return said
}
const act = (events, o) => play(events, o)

function pickField(list, hint) {
  return new Promise(resolve => {
    picking = true
    sheet(`<p style="margin:0;font-weight:800">${esc(hint)}</p>`, { clear: true })
    refresh()
    world.highlight(list, i => { picking = false; closeSheet(); resolve(i) })
  })
}

function rocketGame() {
  return new Promise(resolve => {
    sheet(`<h2>Start rakiety</h2><p>Trzymaj rakietę między liniami. Przechylaj tablet albo przesuwaj palcem.</p><canvas id="rocket" width="620" height="420"></canvas>`, { wide: true })
    const c = $('#rocket'), x = c.getContext('2d'), W = c.width, Hh = c.height
    let pos = 0, vel = 0, t = 0, last = performance.now(), ptr = null, gust = 0, gustT = 0, done = false
    c.onpointermove = e => { const r = c.getBoundingClientRect(); ptr = ((e.clientX - r.left) / r.width - .5) * 2 }
    c.onpointerdown = c.onpointermove
    const end = ok => { if (done) return; done = true; setTimeout(() => { closeSheet(); resolve(ok) }, 900) }
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000)
      last = now
      if (!done) {
        t += dt
        gustT -= dt
        if (gustT <= 0) { gust = (Math.random() - .5) * 2.6; gustT = .5 + Math.random() * .7 }
        const control = motion.available() && ptr == null ? motion.tilt() : (ptr == null ? 0 : Math.max(-1, Math.min(1, (ptr - pos) * 2.2)))
        vel += (gust * (.6 + t * .16) + Math.sin(t * 2.3) * .7 + control * 3.1) * dt
        vel *= .985
        pos += vel * dt
        if (Math.abs(pos) > 1) end(false)
        else if (t >= 6) end(true)
      }
      x.clearRect(0, 0, W, Hh)
      x.strokeStyle = 'rgba(42,26,18,.35)'
      x.setLineDash([10, 10])
      x.lineWidth = 3
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(W / 2 + s * W * .36, 0); x.lineTo(W / 2 + s * W * .36, Hh); x.stroke() }
      x.setLineDash([])
      x.fillStyle = 'rgba(255,255,255,.75)'
      for (let i = 0; i < 6; i++) { const y = ((i * 90 + t * 260) % (Hh + 60)) - 30; x.beginPath(); x.ellipse(60 + (i * 137) % (W - 120), y, 46, 16, 0, 0, 7); x.fill() }
      const rx = W / 2 + pos * W * .36, ry = Hh * .6, tiltA = vel * .25
      x.save()
      x.translate(rx, ry)
      x.rotate(tiltA)
      x.fillStyle = '#ff8a1e'
      x.beginPath(); x.moveTo(-10, 46); x.lineTo(0, 46 + 34 + Math.random() * 16); x.lineTo(10, 46); x.fill()
      x.fillStyle = '#fff'
      x.fillRect(-13, -40, 26, 86)
      x.fillStyle = '#e23b2e'
      x.beginPath(); x.moveTo(-13, -40); x.lineTo(0, -74); x.lineTo(13, -40); x.fill()
      x.fillRect(-25, 22, 12, 26); x.fillRect(13, 22, 12, 26)
      x.restore()
      x.fillStyle = '#2a1a12'
      x.fillRect(20, Hh - 22, (W - 40) * Math.min(1, t / 6), 8)
      x.font = '800 30px ui-rounded,-apple-system,sans-serif'
      x.textAlign = 'center'
      if (done) x.fillText(Math.abs(pos) > 1 ? 'Spadochron się nie otworzył' : 'Udany start!', W / 2, 60)
      if (c.isConnected) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

async function openPending() {
  const pd = S.pending, p = S.players[pd.player]
  if (pd.type === 'buy') {
    const f = FIELDS[pd.field], g = GROUPS[f.group]
    sheet(`<p style="margin:0 0 4px;font-weight:800;color:${g.color};letter-spacing:.08em;text-transform:uppercase;font-size:14px">${esc(g.name)}</p><h2>${esc(f.name)}</h2><p>${esc(f.lore)}</p><p class="big">${szyszki(f.price)}</p><p>Opłata za wejście: ${szyszki(E.feeFor({ ...S, owner: { ...S.owner, [pd.field]: p.id } }, pd.field))}. Zostanie Ci ${szyszki(p.money - f.price)} szyszek.</p><div class="row"><button class="btn go" id="y">Kupuję</button><button class="btn" id="n">Nie kupuję</button></div>`)
    $('#y').onclick = () => act(E.decide(S, { yes: true }))
    $('#n').onclick = () => act(E.decide(S, { yes: false }))
  } else if (pd.type === 'niewypal') {
    sheet(`<h2>Niewypał!</h2><p>${esc(FIELDS[p.pos].lore)} Możesz zapłacić saperom ${szyszki(RULES.saperzyFee)} szyszek albo poczekać i stracić następną kolejkę.</p><div class="row"><button class="btn go" id="y" ${p.money < RULES.saperzyFee ? 'disabled' : ''}>Płacę saperom</button><button class="btn" id="n">Czekam</button></div>`)
    $('#y').onclick = () => act(E.decide(S, { pay: true }))
    $('#n').onclick = () => act(E.decide(S, { pay: false }))
  } else if (pd.type === 'koparka') {
    act(E.decide(S, { field: await pickField(pd.options, 'Waldek stawia darmowy domek. Dotknij swojego miejsca.') }))
  } else if (pd.type === 'heli') {
    act(E.decide(S, { field: await pickField(FIELDS.map((f, i) => i).filter(i => i !== p.pos), 'Helikopter Szamborskiego. Dotknij pola, na które lecisz.') }))
  } else if (pd.type === 'rakieta') {
    const bets = [0, 50000, 100000, 200000].filter(b => b <= pd.maxBet)
    sheet(`<h2>GL Launch Site</h2><p>Rakieta stoi na wyrzutni. Ile stawiasz na udany start? Wygrana podwaja stawkę, a kurs Gzowium idzie w górę.</p><div class="row">${bets.map(b => `<button class="btn${b ? '' : ' go'}" data-b="${b}">${b ? szyszki(b) : 'Bez zakładu'}</button>`).join('')}</div>`)
    for (const b of layer.querySelectorAll('[data-b]')) b.onclick = async () => { const bet = +b.dataset.b; const success = await rocketGame(); act(E.decide(S, { bet, success })) }
  } else if (pd.type === 'pack') {
    sheet(`<h2>${pd.free ? 'Darmowy pak ze Stacji Moya' : 'Pak kart'}</h2><p>Dotknij, żeby rozerwać.</p><div class="pack" id="pk">Imperium</div><div class="cards" id="cs" hidden></div><div class="row" id="rw" hidden><button class="btn go" id="take">Biorę karty</button></div>`, { wide: true })
    let opened = false
    $('#pk').onclick = async () => {
      if (opened) return
      opened = true
      const pk = $('#pk'), cs = $('#cs'), rw = $('#rw'), take = $('#take')
      pk.classList.add('shake')
      await wait(520)
      pk.hidden = true
      cs.hidden = false
      const tip = layer.querySelector('.sheet p')
      if (tip) tip.textContent = 'W środku:'
      for (const id of pd.cards) { cs.insertAdjacentHTML('beforeend', cardHTML(id).replace('class="card', 'class="card flip')); await wait(480) }
      rw.hidden = false
      take.onclick = () => act(E.decide(S, {}))
    }
  } else if (pd.type === 'discard') {
    sheet(`<h2>Za dużo kart</h2><p>W ręku mieści się ${RULES.handLimit}. Dotknij kartę, którą wyrzucasz.</p><div class="cards">${p.cards.map((c, i) => cardHTML(c, 'button', `data-i="${i}"`)).join('')}</div>`, { wide: true })
    for (const b of layer.querySelectorAll('[data-i]')) b.onclick = () => act(E.decide(S, { index: +b.dataset.i }))
  }
}

async function chooseTarget(id) {
  const c = cardById[id], list = E.targetsFor(S, id)
  if (!list) return undefined
  if (!list.length) { toast('Tej karty nie da się teraz zagrać.'); return null }
  if (c.target === 'player' || c.target === 'steps') {
    return new Promise(resolve => {
      sheet(`<h2>${esc(c.name)}</h2><p>${esc(c.text)}</p><div class="list">${list.map(v => c.target === 'player' ? `<button data-v="${v}"><i style="background:${S.players[v].color}"></i>${esc(S.players[v].name)}<span>${szyszki(S.players[v].money)} szyszek</span></button>` : `<button data-v="${v}">${v} ${v === 1 ? 'pole' : 'pola'}</button>`).join('')}</div><div class="row"><button class="btn" id="x">Anuluj</button></div>`)
      for (const b of layer.querySelectorAll('[data-v]')) b.onclick = () => { closeSheet(); resolve(+b.dataset.v) }
      $('#x').onclick = () => { closeSheet(); resolve(null) }
    })
  }
  return pickField(list, `${c.name}. Dotknij pola.`)
}

const actions = {
  roll: () => { if (ready() && !S.rolled) act(E.roll(S)) },
  endTurn: () => { if (ready() && S.rolled) act(E.endTurn(S)) },
  main: () => (S.rolled ? actions.endTurn() : actions.roll()),
  pack: () => { if (ready()) act(E.buyPack(S)) },
  cards: () => {
    if (!ready()) return
    const p = E.cur(S)
    sheet(`<h2>Twoje karty</h2><p>Dotknij kartę, żeby ją zagrać.</p><div class="cards">${p.cards.map((c, i) => cardHTML(c, 'button', `data-i="${i}"`)).join('')}</div><div class="row"><button class="btn" id="x">Zamknij</button></div>`, { wide: true })
    $('#x').onclick = closeSheet
    for (const b of layer.querySelectorAll('[data-i]')) b.onclick = async () => {
      const i = +b.dataset.i, id = p.cards[i]
      closeSheet()
      const target = await chooseTarget(id)
      if (target === null) return
      act(E.playCard(S, i, target))
    }
  },
  build: async () => {
    if (!ready()) return
    const p = E.cur(S), list = E.ownedBy(S, p.id).filter(i => E.canBuild(S, p.id, i))
    if (!list.length) { toast('Domki stawiasz, gdy masz całą grupę i dość szyszek.'); return }
    const i = await pickField(list, 'Dotknij swojego miejsca. Domek kosztuje połowę ceny miejsca.')
    act(E.build(S, i))
  },
  market: () => {
    if (!ready()) return
    const p = E.cur(S)
    let n = 1
    const draw = () => {
      sheet(`<h2>Giełda Gzowium</h2><p>Kurs: <b>${szyszki(S.gzmRate)}</b> szyszek za sztukę. Masz ${p.gzm} GZM i ${szyszki(p.money)} szyszek.</p><div class="stepper"><button class="btn small" id="m5">−5</button><button class="btn small" id="m1">−1</button><output>${n} GZM</output><button class="btn small" id="p1">+1</button><button class="btn small" id="p5">+5</button></div><p>Razem ${szyszki(n * S.gzmRate)} szyszek.</p><div class="row"><button class="btn go" id="buy" ${p.money < n * S.gzmRate ? 'disabled' : ''}>Kupuję</button><button class="btn" id="sell" ${p.gzm < n ? 'disabled' : ''}>Sprzedaję</button><button class="btn" id="x">Zamknij</button></div>`)
      for (const [id, d] of [['m5', -5], ['m1', -1], ['p1', 1], ['p5', 5]]) $('#' + id).onclick = () => { n = Math.max(1, n + d); draw() }
      $('#buy').onclick = () => act(E.market(S, 'buy', n))
      $('#sell').onclick = () => act(E.market(S, 'sell', n))
      $('#x').onclick = closeSheet
    }
    draw()
  },
  trade: () => {
    if (!ready()) return
    const me = E.cur(S), others = E.alive(S).filter(o => o.id !== me.id)
    sheet(`<h2>Handel</h2><p>Z kim chcesz się wymienić?</p><div class="list">${others.map(o => `<button data-v="${o.id}"><i style="background:${o.color}"></i>${esc(o.name)}<span>${E.ownedBy(S, o.id).length} miejsc</span></button>`).join('')}</div><div class="row"><button class="btn" id="x">Anuluj</button></div>`)
    $('#x').onclick = closeSheet
    for (const b of layer.querySelectorAll('[data-v]')) b.onclick = () => compose(S.players[+b.dataset.v])
    function compose(them) {
      const o = { from: me.id, to: them.id, giveFields: [], getFields: [], giveMoney: 0, getMoney: 0 }
      const col = (who, key, moneyKey, title) => `<div><h3>${title}</h3><div class="list">${E.ownedBy(S, who.id).map(i => `<button data-k="${key}" data-i="${i}" class="${o[key].includes(i) ? 'on' : ''}"><i style="background:${GROUPS[FIELDS[i].group].color}"></i>${esc(FIELDS[i].name)}<span>${szyszki(FIELDS[i].price)}</span></button>`).join('') || '<p>Brak miejsc.</p>'}</div><div class="stepper"><button class="btn small" data-m="${moneyKey}" data-d="-50000">−50k</button><output>${szyszki(o[moneyKey])}</output><button class="btn small" data-m="${moneyKey}" data-d="50000">+50k</button></div></div>`
      const draw = () => {
        sheet(`<h2>Wymiana: ${esc(me.name)} i ${esc(them.name)}</h2><div class="cols">${col(me, 'giveFields', 'giveMoney', 'Daję')}${col(them, 'getFields', 'getMoney', 'Chcę')}</div><div class="row"><button class="btn go" id="ok" ${E.tradeValid(S, o) && (o.giveFields.length || o.getFields.length || o.giveMoney || o.getMoney) ? '' : 'disabled'}>Proponuję</button><button class="btn" id="x">Anuluj</button></div>`, { wide: true })
        for (const b of layer.querySelectorAll('[data-k]')) b.onclick = () => { const a = o[b.dataset.k], i = +b.dataset.i; a.includes(i) ? a.splice(a.indexOf(i), 1) : a.push(i); draw() }
        for (const b of layer.querySelectorAll('[data-m]')) b.onclick = () => { const k = b.dataset.m, max = (k === 'giveMoney' ? me : them).money; o[k] = Math.max(0, Math.min(Math.floor(max / 10000) * 10000, o[k] + +b.dataset.d)); draw() }
        $('#x').onclick = closeSheet
        $('#ok').onclick = offer
      }
      const names = a => a.map(i => FIELDS[i].name).join(', ')
      const side = (fields, money) => [names(fields), money ? `${szyszki(money)} szyszek` : ''].filter(Boolean).join(' i ') || 'nic'
      function offer() {
        sheet(`<p style="margin:0 0 6px;letter-spacing:.09em;text-transform:uppercase;font-size:14px;font-weight:700;color:var(--mute)">Podaj tablet</p><h2 class="title">${esc(them.name)}</h2><p class="sub">${esc(me.name)} proponuje wymianę.</p><p><b>Dostajesz:</b> ${esc(side(o.giveFields, o.giveMoney))}</p><p><b>Oddajesz:</b> ${esc(side(o.getFields, o.getMoney))}</p><div class="row"><button class="btn go" id="y">Zgoda</button><button class="btn" id="n">Nie</button></div>`, { solid: true })
        const back = async events => { busy = true; await handover(me); busy = false; if (events) act(events); else { host.show(`${them.name} odmawia. Targ nie doszedł do skutku.`); refresh() } }
        $('#y').onclick = () => back(E.trade(S, o))
        $('#n').onclick = () => back(null)
      }
      draw()
    }
  },
}

async function tool(name, a) {
  if (!S || S.over) return { ok: false, powod: 'Gra nie trwa.' }
  if (name === 'stan_gry') return E.summary(S)
  if (busy || paused) return { ok: false, powod: 'Chwila, coś się jeszcze dzieje na planszy.' }
  const p = E.cur(S)
  const run = async ev => { if (ev[0] && ev[0].t === 'error') return { ok: false, powod: ev[0].why }; closeSheet(); picking = false; world.highlight(null); return { ok: true, co_sie_stalo: await play(ev, { quiet: true }) } }
  const field = t => FIELDS.findIndex(f => norm(f.name) === norm(t) || norm(f.name).includes(norm(t)) && norm(t).length > 2)
  const player = t => { const o = S.players.find(o => norm(o.name) === norm(t)); return o ? o.id : -1 }
  if (name === 'rzuc_kostkami') return run(E.roll(S))
  if (name === 'koniec_tury') return run(E.endTurn(S))
  if (name === 'kup_pak') return run(E.buyPack(S))
  if (name === 'gielda') return run(E.market(S, norm(a.akcja).startsWith('kup') ? 'buy' : 'sell', a.ile))
  if (name === 'postaw_domek') { const i = field(a.miejsce); return i < 0 ? { ok: false, powod: 'Nie znam takiego miejsca.' } : run(E.build(S, i)) }
  if (name === 'decyzja') {
    if (!S.pending || !['buy', 'niewypal'].includes(S.pending.type)) return { ok: false, powod: 'Nie ma teraz takiej decyzji na ekranie.' }
    return run(E.decide(S, S.pending.type === 'buy' ? { yes: !!a.tak } : { pay: !!a.tak }))
  }
  if (name === 'zagraj_karte') {
    const i = p.cards.findIndex(c => norm(cardById[c].name) === norm(a.karta) || norm(cardById[c].name).includes(norm(a.karta)))
    if (i < 0) return { ok: false, powod: 'Gracz nie ma takiej karty w ręku.' }
    const c = cardById[p.cards[i]], list = E.targetsFor(S, c.id)
    let target
    if (list) {
      target = c.target === 'player' ? player(a.cel) : c.target === 'steps' ? parseInt(a.cel, 10) : field(a.cel)
      if (!list.includes(target)) return { ok: false, powod: c.target === 'player' ? 'Podaj imię gracza, na którego ma zadziałać karta.' : c.target === 'steps' ? 'Podaj liczbę pól: 1, 2 albo 3.' : 'Podaj nazwę pola, na które ma zadziałać karta.' }
    }
    return run(E.playCard(S, i, target))
  }
  return { ok: false, powod: 'Nie znam takiej akcji.' }
}

function setPaused(on, text) {
  paused = on
  let el = $('#pause')
  if (on) {
    if (!el) { el = document.createElement('div'); el.id = 'pause'; el.className = 'veil solid'; el.style.cssText = 'position:fixed;inset:0;z-index:9'; document.body.append(el) }
    el.innerHTML = `<div class="sheet"><h2>Ośmiornica zaraz wróci</h2><p>${esc(text || 'Łączę się z prowadzącym. Bez niego nie gramy.')}</p><div class="row"><button class="btn" id="mute">Graj po cichu</button></div></div>`
    $('#mute').onclick = () => { voiceOn = false; if (live) live.close(); $('#mic').hidden = true; host.online(false); setPaused(false) }
  } else if (el) el.remove()
  refresh()
}

function connectVoice(code) {
  voiceOn = true
  setPaused(true)
  live = createLive({
    url: `${CONFIG.relay}?code=${encodeURIComponent(code)}`, model: CONFIG.model, voice: CONFIG.voice, system: SYSTEM, tools: TOOLS,
    onTool: tool,
    onSpeaking: on => host.speaking(on),
    onTranscript: (who, text) => { if (who === 'host' && text.trim()) host.show(text.trim()) },
    onState: (st, why) => {
      if (st === 'ready') { host.online(true); $('#mic').hidden = false; setPaused(false); if (S && S.started) live.sendText(`[GRA] Połączenie wróciło. Teraz tura: ${E.cur(S).name}. Powiedz jedno krótkie zdanie na powitanie.`) }
      else if (st === 'denied') { voiceOn = false; setPaused(false); host.online(false); toast('Zły kod rodzinny. Ośmiornica prowadzi po cichu.') }
      else if (st === 'closed' && voiceOn) { host.online(false); setPaused(true, `Połączenie z prowadzącym przerwane (${why}). Próbuję ponownie.`); setTimeout(() => voiceOn && live.connect(), 2500) }
      else if (st === 'mic-error') toast('Mikrofon nie działa: ' + why)
    },
  })
  host.setLive(live)
  live.connect()
}

function endScreen() {
  const rk = E.ranking(S)
  try { localStorage.removeItem(SAVE) } catch {}
  sheet(`<p style="margin:0 0 6px;letter-spacing:.09em;text-transform:uppercase;font-size:14px;font-weight:700;color:var(--mute)">Koniec gry</p><h2 class="title">${esc(rk[0].name)} wygrywa</h2><p class="sub">Imperium Gzowiańskie ma nowego władcę.</p>${rk.map((r, i) => `<div class="rank">${i + 1}.<i style="background:${S.players[r.id].color}"></i>${esc(r.name)}${r.out ? ' (bankrut)' : ''}<span>${szyszki(r.wealth)}</span></div>`).join('')}<div class="row"><button class="btn go" id="again">Nowa gra</button></div>`, { solid: true })
  $('#again').onclick = () => { S = null; hud.hidden = true; setup() }
}

function begin(prefs, resume) {
  hud.hidden = false
  closeSheet()
  motion.enable()
  if (prefs.code) connectVoice(prefs.code)
  else { host.online(false); $('#mic').hidden = true }
  if (resume) { world.sync(S); refresh(); host.show(`Wracamy do gry. Tura: ${E.cur(S).name}.`); if (S.pending) openPending(); return }
  S = E.createGame({ players: prefs.players.map((p, i) => ({ ...p, color: COLORS[i] })), rounds: RULES.lengths[prefs.length] })
  lastRate = S.gzmRate
  world.sync(S)
  const go = () => act(E.start(S))
  if (voiceOn) { const t = setInterval(() => { if (!paused) { clearInterval(t); go() } }, 200) } else go()
}

function setup() {
  let prefs = { players: [{ name: 'Jurek', pawn: 'jurek' }, { name: 'Rysio', pawn: 'rysio' }, { name: 'Tata', pawn: 'tata' }], length: 'normalna', code: '' }
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS) || '{}') } } catch {}
  let saved = null
  try { saved = JSON.parse(localStorage.getItem(SAVE) || 'null') } catch {}
  const draw = () => {
    sheet(`<h1 class="title">Imperium Gzowiańskie</h1><p class="sub">Kupuj miejsca w Gzowie, otwieraj paki kart i nie daj się Ośmiornicy.</p>
<label class="f">Gracze</label><div class="players">${prefs.players.map((p, i) => `<div class="pl"><i style="background:${COLORS[i]}"></i><input data-n="${i}" value="${esc(p.name)}" maxlength="14" autocomplete="off"><select data-p="${i}">${PAWN_LIST.map(o => `<option value="${o.id}"${o.id === p.pawn ? ' selected' : ''}>${o.name}</option>`).join('')}</select></div>`).join('')}</div>
<div class="row" style="margin-top:10px"><button class="btn small" id="add" ${prefs.players.length >= 6 ? 'disabled' : ''}>Dodaj gracza</button><button class="btn small" id="del" ${prefs.players.length <= 2 ? 'disabled' : ''}>Usuń ostatniego</button></div>
<label class="f">Długość gry</label><div class="seg">${[['krotka', 'Krótka'], ['normalna', 'Normalna'], ['dluga', 'Długa']].map(([k, l]) => `<button data-l="${k}" class="${prefs.length === k ? 'on' : ''}">${l} · ${RULES.lengths[k]} rund</button>`).join('')}</div>
<label class="f">Kod rodzinny (głos Ośmiornicy)</label><input class="code" id="code" value="${esc(prefs.code)}" placeholder="bez kodu gra jest cicha" autocomplete="off" autocapitalize="off">
<div class="row"><button class="btn go" id="start">Gramy</button>${saved && saved.started && !saved.over ? '<button class="btn" id="resume">Wróć do przerwanej gry</button>' : ''}</div>`, { solid: true })
    const keep = () => { for (const el of layer.querySelectorAll('[data-n]')) prefs.players[+el.dataset.n].name = el.value.trim() || `Gracz ${+el.dataset.n + 1}`; for (const el of layer.querySelectorAll('[data-p]')) prefs.players[+el.dataset.p].pawn = el.value; prefs.code = $('#code').value.trim() }
    $('#add').onclick = () => { keep(); const used = prefs.players.map(p => p.pawn), free = PAWN_LIST.find(o => !used.includes(o.id)) || PAWN_LIST[0]; prefs.players.push({ name: free.name, pawn: free.id }); draw() }
    $('#del').onclick = () => { keep(); prefs.players.pop(); draw() }
    for (const b of layer.querySelectorAll('[data-l]')) b.onclick = () => { keep(); prefs.length = b.dataset.l; draw() }
    const store = () => { keep(); try { localStorage.setItem(PREFS, JSON.stringify(prefs)) } catch {} }
    $('#start').onclick = () => { store(); begin(prefs, false) }
    if ($('#resume')) $('#resume').onclick = () => { store(); S = saved; begin(prefs, true) }
  }
  draw()
}

$('#main').onclick = actions.main
$('#bCards').onclick = actions.cards
$('#bPack').onclick = actions.pack
$('#bBuild').onclick = actions.build
$('#bMarket').onclick = actions.market
$('#bTrade').onclick = actions.trade
const mic = $('#mic')
mic.onpointerdown = e => { e.preventDefault(); mic.setPointerCapture(e.pointerId); mic.classList.add('on'); mic.textContent = 'Słucham'; live && live.talkStart() }
mic.onpointerup = mic.onpointercancel = () => { mic.classList.remove('on'); mic.textContent = 'Mów'; live && live.talkEnd() }
addEventListener('pointerdown', () => live && live.unlock(), { passive: true })
window.__game = { state: () => S, E, act, tool, actions, world }
setup()
