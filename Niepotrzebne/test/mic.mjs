// Imperium Gzowianskie: holds the talk button in headless Chrome while a fake microphone plays a spoken Polish command, and checks that the Octopus hears it and rolls the dice. node mic.mjs <code> <command.wav>
import { createRequire } from 'node:module'
const require = createRequire('/Users/jurek/openclaw/node_modules/')
const { chromium } = require('playwright-core')
const [code = 'gzowo', wav] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('pageerror ' + e.message))
await page.goto(process.env.URL || 'http://localhost:8465/', { waitUntil: 'load' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'load' })
await page.fill('#code', code)
await page.click('#start')
await page.waitForSelector('#go', { timeout: 30000 })
await page.evaluate(() => { window.__talk = 0; new MutationObserver(() => { if (document.querySelector('#octo').classList.contains('talk')) window.__talk++ }).observe(document.querySelector('#octo'), { attributes: true }) })
await page.click('#go')
const quiet = async max => { for (let i = 0; i < max * 4; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => window.__talk > 0 && !document.querySelector('#octo').classList.contains('talk'))) return true } return false }
const intro = await quiet(25)
const first = await page.evaluate(() => ({ line: document.querySelector('#line').textContent, talk: window.__talk, audio: window.__game.voice() }))
const box = await page.locator('#mic').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(150)
await page.mouse.up()
await page.waitForTimeout(1500)
await page.mouse.down()
await page.waitForTimeout(6500)
await page.mouse.up()
let rolled = false
for (let i = 0; i < 80 && !rolled; i++) { await page.waitForTimeout(250); rolled = await page.evaluate(() => window.__game.state().rolled) }
const talkBefore = first.talk
let reply = false
for (let i = 0; i < 80 && !reply; i++) { await page.waitForTimeout(250); reply = await page.evaluate(n => window.__talk > n && document.querySelector('#line').textContent !== '', talkBefore) && (await page.evaluate(() => document.querySelector('#line').textContent)) !== first.line }
const after = await page.evaluate(() => ({ rolled: window.__game.state().rolled, pos: window.__game.state().players[0].pos, line: document.querySelector('#line').textContent, talk: window.__talk, paused: !!document.querySelector('#pause'), audio: window.__game.voice() }))
console.log(JSON.stringify({ introSpoken: intro, first, after, errors }, null, 1))
await browser.close()
console.log(reply ? 'SPOKEN REPLY AFTER COMMAND' : 'NO SPOKEN REPLY')
process.exit(errors.length || !intro || !after.rolled || after.paused || !reply ? 1 : 0)
