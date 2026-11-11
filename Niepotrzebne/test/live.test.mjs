// Imperium Gzowianskie: talks to the real Gemini Live model through the local relay and checks setup, a spoken comment, a tool call and the family code gate.
import { SYSTEM, TOOLS } from '../../src/host/host.js'

const URL = process.env.RELAY || 'ws://localhost:8465/live'
const MODEL = 'models/gemini-3.1-flash-live-preview'

function session(code, manual) {
  return new Promise(resolve => {
    const ws = new WebSocket(`${URL}?code=${code}`)
    const out = { manual, ready: false, turns: [], tools: [], closed: null }
    let cur = { text: '', audio: 0 }, stage = 0
    const send = o => ws.send(JSON.stringify(o))
    const SILENCE = Buffer.alloc(9600).toString('base64')
    const event = text => { if (!manual) return send({ realtimeInput: { text } }); send({ realtimeInput: { activityStart: {} } }); send({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: SILENCE } } }); send({ realtimeInput: { text } }); send({ realtimeInput: { activityEnd: {} } }) }
    const timer = setTimeout(() => { out.timeout = true; ws.close() }, 45000)
    ws.onopen = () => {
      const setup = { model: MODEL, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, languageCode: 'pl-PL' } }, systemInstruction: { parts: [{ text: SYSTEM }] }, tools: [{ functionDeclarations: TOOLS }], outputAudioTranscription: {} }
      if (manual) setup.realtimeInputConfig = { automaticActivityDetection: { disabled: true } }
      send({ setup })
    }
    ws.onmessage = async ev => {
      const m = JSON.parse(ev.data instanceof Blob ? await ev.data.text() : String(ev.data))
      if (m.setupComplete) { out.ready = true; event('[GRA] Rysio rzuca 3 i 4, razem 7. Rysio staje na polu Ognisko. Rysio płaci 80 000 szyszek, zgarnia je Jurek. Ognisko. Rysio ma teraz 420 000 szyszek.'); return }
      if (m.toolCall) {
        for (const c of m.toolCall.functionCalls) out.tools.push({ name: c.name, args: c.args })
        send({ toolResponse: { functionResponses: m.toolCall.functionCalls.map(c => ({ id: c.id, name: c.name, response: { ok: true, co_sie_stalo: '5 i 2, razem 7. Rysio staje na polu Plaża. Pole jest wolne, kosztuje 140 000 szyszek.' } })) } })
        return
      }
      const sc = m.serverContent
      if (!sc) return
      for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data) cur.audio += Buffer.from(p.inlineData.data, 'base64').length
      if (sc.outputTranscription?.text) cur.text += sc.outputTranscription.text
      if (sc.turnComplete) {
        out.turns.push({ text: cur.text.trim(), audioSeconds: +(cur.audio / 2 / 24000).toFixed(1) })
        cur = { text: '', audio: 0 }
        stage++
        if (stage === 1) event('Gracz Rysio mówi do Ciebie: Ośmiornico, rzuć za mnie kostkami.')
        else if (stage >= 2 && (out.tools.length || stage >= 3)) { clearTimeout(timer); ws.close() }
      }
    }
    ws.onclose = e => { clearTimeout(timer); out.closed = `${e.code} ${e.reason || ''}`.trim(); resolve(out) }
    ws.onerror = () => {}
  })
}

const bad = await session('zly-kod', true)
console.log('wrong code ->', bad.closed, bad.ready ? 'FAIL: connected' : 'ok: refused')
const CODE = process.env.CODE || 'gzowo'
let r = await session(CODE, true)
if (!r.ready) { console.log('manual VAD setup refused:', r.closed, '-> retrying with automatic'); r = await session(CODE, false) }
console.log(JSON.stringify(r, null, 1))
const ok = r.ready && r.turns.length >= 2 && r.turns[0].audioSeconds > 0.5 && r.tools.some(t => t.name === 'rzuc_kostkami') && !bad.ready
console.log(ok ? 'ALL PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
