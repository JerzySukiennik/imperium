// Imperium Gzowianskie voice relay (Cloudflare Worker): checks the family code and pipes the browser WebSocket to Gemini Live so the API key never reaches the page.
const ALLOWED = ['https://imperium.gzowo.fun', 'http://localhost:8465']
const UP = 'https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const asText = d => typeof d === 'string' ? d : d instanceof ArrayBuffer ? new TextDecoder().decode(d) : ArrayBuffer.isView(d) ? new TextDecoder().decode(d) : d.text()

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/live' || request.headers.get('Upgrade') !== 'websocket') return new Response('Imperium relay', { status: 200 })
    const origin = request.headers.get('Origin')
    if (origin && !ALLOWED.includes(origin)) return new Response('forbidden', { status: 403 })
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    server.accept()
    const refuse = (code, why) => { try { server.close(code, String(why).slice(0, 100)) } catch {} return new Response(null, { status: 101, webSocket: client }) }
    if (url.searchParams.get('code') !== env.FAMILY_CODE) return refuse(4401, 'zly kod')
    const keys = String(env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
    if (!keys.length) return refuse(4500, 'brak klucza')
    const queue = []
    let up = null
    server.addEventListener('message', e => { if (up) { try { up.send(e.data) } catch {} } else queue.push(e.data) })
    server.addEventListener('close', () => { try { up && up.close(1000, 'client closed') } catch {} })
    const start = Math.floor(Math.random() * keys.length)
    let last = 'no attempt'
    for (let k = 0; k < keys.length && !up; k++) {
      try {
        const res = await fetch(`${UP}?key=${encodeURIComponent(keys[(start + k) % keys.length])}`, { headers: { Upgrade: 'websocket' } })
        if (res.webSocket) { up = res.webSocket; break }
        last = `gemini ${res.status}`
      } catch (err) { last = 'gemini unreachable' }
    }
    if (!up) return refuse(4502, last)
    up.accept()
    let chain = Promise.resolve()
    const down = fn => { chain = chain.then(fn).catch(() => {}) }
    up.addEventListener('message', e => down(async () => server.send(await asText(e.data))))
    up.addEventListener('close', e => down(() => server.close(e.code >= 4000 ? e.code : 4502, `gemini ${e.code} ${String(e.reason || '').replace(/[^\x20-\x7e]/g, '')}`.slice(0, 100))))
    up.addEventListener('error', () => down(() => server.close(4502, 'gemini error')))
    for (const m of queue.splice(0)) { try { up.send(m) } catch {} }
    return new Response(null, { status: 101, webSocket: client })
  },
}
