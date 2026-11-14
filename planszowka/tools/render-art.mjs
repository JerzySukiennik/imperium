// Imperium Gzowianskie board game: renders planszowka/art/render.html in headless Chrome and saves the plot diorama PNG. node render-art.mjs [size=4096] [out]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jurek/openclaw/node_modules/')
const { chromium } = require('playwright-core')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const size = +(process.argv[2] || 4096), out = process.argv[3] || path.join(root, 'art', 'dzialka.png')
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css' }
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(res)
}).listen(0)
const port = server.address().port
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 600, height: 600 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()) })
await page.goto(`http://localhost:${port}/art/render.html`, { waitUntil: 'load' })
await page.waitForFunction('window.ready === true', null, { timeout: 30000 })
const data = await page.evaluate(s => window.renderPNG(s), size)
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'))
const icons = path.join(path.dirname(out), 'ikony')
fs.mkdirSync(icons, { recursive: true })
for (const name of await page.evaluate('window.iconNames')) fs.writeFileSync(path.join(icons, name + '.png'), Buffer.from((await page.evaluate(n => window.renderIcon(n, 640), name)).split(',')[1], 'base64'))
if (fs.existsSync(path.join(root, 'art', 'zetony.json'))) fs.writeFileSync(path.join(path.dirname(out), 'zetony.png'), Buffer.from((await page.evaluate(w => window.renderTokens(w), 2400)).split(',')[1], 'base64'))
await browser.close()
server.close()
console.log(JSON.stringify({ out, size, bytes: fs.statSync(out).size, errors }))
process.exit(errors.length ? 1 : 0)
