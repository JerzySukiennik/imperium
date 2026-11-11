// Imperium Gzowianskie voice relay (Cloudflare Worker): checks the family code and pipes the browser WebSocket to Gemini Live so the API key never reaches the page.
const UP = 'https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/live' || request.headers.get('Upgrade') !== 'websocket') return new Response('Imperium relay', { status: 200 })
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    server.accept()
    if (url.searchParams.get('code') !== env.FAMILY_CODE) { server.close(4401, 'zly kod'); return new Response(null, { status: 101, webSocket: client }) }
    const keys = String(env.GEMINI_API_KEYS || '').split(',').filter(Boolean)
    if (!keys.length) { server.close(4500, 'brak klucza'); return new Response(null, { status: 101, webSocket: client }) }
    const key = keys[Math.floor(Math.random() * keys.length)]
    const res = await fetch(`${UP}?key=${encodeURIComponent(key)}`, { headers: { Upgrade: 'websocket' } })
    const up = res.webSocket
    if (!up) { server.close(4502, 'gemini ' + res.status); return new Response(null, { status: 101, webSocket: client }) }
    up.accept()
    server.addEventListener('message', e => { try { up.send(e.data) } catch {} })
    up.addEventListener('message', e => { try { server.send(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data)) } catch {} })
    server.addEventListener('close', () => { try { up.close(1000) } catch {} })
    up.addEventListener('close', e => { try { server.close(e.code >= 4000 ? e.code : 4502, String(e.reason || '').slice(0, 100)) } catch {} })
    return new Response(null, { status: 101, webSocket: client })
  },
}
