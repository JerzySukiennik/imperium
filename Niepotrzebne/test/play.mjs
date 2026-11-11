// Imperium Gzowianskie: plays the real game in headless Chrome like a player would (clicks only) and saves screenshots. node play.mjs <outDir> [turns]
import { createRequire } from 'node:module'
const require = createRequire('/Users/jurek/openclaw/node_modules/')
const { chromium } = require('playwright-core')

const [out = '.', turns = '12'] = process.argv.slice(2)
const URL = process.env.URL || 'http://localhost:8465/'
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
const errors = [], shots = new Set()
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', e => errors.push('[pageerror] ' + e.message))
const shot = async name => { if (shots.has(name)) return; shots.add(name); await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 80 }) }

await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'load' })
await page.waitForSelector('#start')
await shot('01-start')
await page.click('[data-l="krotka"]')
await page.click('#start')

const step = () => page.evaluate(() => {
  const g = window.__game, S = g.state(), q = s => document.querySelector(s), p = g.E.cur(S)
  const tap = i => { const [x, y] = g.world.fieldAt(i); q('#gl').dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true })) }
  if (q('#again')) return 'over'
  if (q('#go')) { q('#go').click(); return 'go' }
  if (q('#ok')) { q('#ok').click(); return 'peek-ok' }
  if (q('#pk') && !q('#pk').hidden) { q('#pk').click(); return 'pack-open' }
  if (q('#take') && !q('#rw').hidden) { q('#take').click(); return 'pack-take' }
  if (q('#pk')) return 'pack-wait'
  if (q('#y')) { (q('#y').disabled ? q('#n') : q('#y')).click(); return 'decide' }
  if (q('[data-b]')) { q('[data-b]').click(); return 'bet' }
  if (q('#rocket')) return 'rocket'
  if (q('[data-v]')) { q('[data-v]').click(); return 'target' }
  if (q('#buy')) { (q('#buy').disabled ? q('#x') : q('#buy')).click(); return 'market' }
  if (q('.veil.clear')) { for (let i = 0; i < 24 && q('.veil.clear'); i++) tap(i); return 'pick' }
  if (q('.sheet [data-i]')) { q('.sheet [data-i]').click(); return 'card' }
  if (q('#main').disabled) return 'wait'
  window.__n = (window.__n || 0) + 1
  if (!S.rolled && p.cards.length && window.__n % 2 === 1 && !q('#bCards').disabled) { q('#bCards').click(); return 'cards' }
  if (!S.rolled && !q('#bPack').disabled && window.__n % 2 === 0) { q('#bPack').click(); return 'pack-buy' }
  if (S.rolled && !q('#bBuild').disabled) { q('#bBuild').click(); return 'build' }
  if (S.rolled && window.__n % 7 === 0 && !q('#bMarket').disabled) { q('#bMarket').click(); return 'market-open' }
  const t = q('#main').textContent
  q('#main').click()
  return t
})

const log = []
let ended = 0, last = ''
for (let i = 0; i < 900 && ended < +turns; i++) {
  const r = await step()
  if (r !== 'wait' && r !== 'rocket' && r !== 'pack-wait') log.push(r)
  if (r === 'Koniec tury') ended++
  if (r === 'over') break
  if (r === 'go' && last !== 'go') { await page.waitForTimeout(500); await shot('02-board') }
  if (r === 'pack-open') { await page.waitForTimeout(2300); await shot('03-pack') }
  if (r === 'cards') { await page.waitForTimeout(300); await shot('04-cards') }
  if (r === 'market-open') { await page.waitForTimeout(300); await shot('05-market') }
  if (r === 'decide') await shot('06-decide')
  if (r === 'rocket') await shot('07-rocket')
  last = r
  await page.waitForTimeout(r === 'wait' || r === 'rocket' || r === 'pack-wait' ? 250 : 420)
}
await page.waitForTimeout(1500)
await shot('08-mid')
const state = await page.evaluate(() => { const S = window.__game.state(); return { round: S.round, money: S.players.map(p => p.money), owned: Object.keys(S.owner).length, levels: S.level, cards: S.players.map(p => p.cards.length), gzm: S.players.map(p => p.gzm), rate: S.gzmRate, pending: S.pending && S.pending.type, line: document.getElementById('line').textContent } })
await page.evaluate(() => { const g = window.__game, S = g.state(); S.rounds = S.round })
for (let i = 0; i < 200; i++) { const r = await step(); if (r === 'over') break; await page.waitForTimeout(300) }
await page.waitForTimeout(600)
await shot('09-end')
const over = await page.evaluate(() => !!document.querySelector('#again'))
console.log(JSON.stringify({ turnsPlayed: ended, state, endScreen: over, actions: [...new Set(log)], errors }, null, 1))
await browser.close()
process.exit(errors.length || !over ? 1 : 0)
