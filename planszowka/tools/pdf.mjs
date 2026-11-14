// Imperium Gzowianskie board game: prints the pages in planszowka/druk to PDF in planszowka/gotowe and saves PNG previews. node pdf.mjs [plansza|karty|instrukcja ...] [--preview dir]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jurek/openclaw/node_modules/')
const { chromium } = require('playwright-core')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2), pv = argv.indexOf('--preview')
const preview = pv >= 0 ? argv.splice(pv, 2)[1] : null
const JOBS = {
  plansza: { page: 'druk/plansza.html', out: 'Plansza 70x70 cm.pdf', pdf: { width: '700mm', height: '700mm' }, view: [2646, 2646] },
  karty: { page: 'druk/karty.html', out: 'Karty A4.pdf', pdf: { format: 'A4' }, view: [794, 1123] },
  instrukcja: { page: 'druk/instrukcja.html', out: 'Instrukcja.pdf', pdf: { format: 'A4' }, view: [794, 1123] },
}
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css' }
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(res)
}).listen(0)
const port = server.address().port
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let failed = 0
for (const name of argv.length ? argv : Object.keys(JOBS)) {
  const job = JOBS[name], errors = []
  const page = await browser.newPage({ viewport: { width: job.view[0], height: job.view[1] }, deviceScaleFactor: 1 })
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()) })
  page.on('requestfailed', r => errors.push('failed ' + r.url()))
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errors.push(r.status() + ' ' + r.url()) })
  await page.goto(`http://localhost:${port}/${job.page}`, { waitUntil: 'load' })
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 })
  const out = path.join(root, 'gotowe', job.out)
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, ...job.pdf })
  const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-fit]')].filter(el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1).map(el => el.dataset.fit))
  if (preview) await page.screenshot({ path: path.join(preview, name + '.png'), fullPage: true })
  const real = errors.filter(e => !/favicon/.test(e))
  if (real.length || overflow.length) failed++
  console.log(JSON.stringify({ name, out, bytes: fs.statSync(out).size, overflow, errors: real }))
  await page.close()
}
await browser.close()
server.close()
process.exit(failed ? 1 : 0)
