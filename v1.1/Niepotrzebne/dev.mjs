// Imperium Gzowianskie dev server: static files with no caching plus the local voice relay to Gemini Live (keys from GEMINI_API_KEYS).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acceptUpgrade } from './ws.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = +process.argv[2] || 8465
const KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').filter(Boolean)
const CODE = process.env.FAMILY_CODE || 'gzowo'
const UP = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
let next = 0

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p.endsWith('/')) p += 'index.html'
  const file = path.join(ROOT, p)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(res)
})

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname !== '/live') { socket.destroy(); return }
  let up = null, open = false, done = false
  const queue = []
  const conn = acceptUpgrade(req, socket, {
    onMessage: data => { const s = data.toString(); if (open) up.send(s); else queue.push(s) },
    onClose: () => { done = true; try { up && up.close(1000) } catch {} },
  })
  if (!conn) return
  if (url.searchParams.get('code') !== CODE) { conn.close(4401, 'zly kod'); return }
  if (!KEYS.length) { conn.close(4500, 'brak klucza'); return }
  const key = KEYS[next++ % KEYS.length]
  up = new WebSocket(`${UP}?key=${encodeURIComponent(key)}`)
  up.addEventListener('open', () => { open = true; for (const s of queue.splice(0)) up.send(s) })
  up.addEventListener('message', async ev => { if (conn.open) conn.sendText(ev.data instanceof Blob ? await ev.data.text() : String(ev.data)) })
  up.addEventListener('close', e => { console.log(`[live] upstream closed ${e.code} ${String(e.reason).slice(0, 120)}`); if (!done) conn.close(e.code >= 4000 ? e.code : 4502, String(e.reason || '').slice(0, 100)) })
  up.addEventListener('error', () => {})
})

server.listen(PORT, '127.0.0.1', () => console.log(`imperium: http://localhost:${PORT}  keys: ${KEYS.length}`))
