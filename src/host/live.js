// Imperium Gzowianskie: Gemini Live client. Talks to the relay over WebSocket, plays the Octopus voice and streams the microphone while the talk button is held.
const WORKLET = `class Mic extends AudioWorkletProcessor{constructor(){super();this.step=sampleRate/16000;this.pos=0;this.buf=new Int16Array(1600);this.n=0}process(i){const c=i[0][0];if(!c)return true;for(;this.pos<c.length;this.pos+=this.step){const v=Math.max(-1,Math.min(1,c[Math.floor(this.pos)]));this.buf[this.n++]=v*32767;if(this.n===this.buf.length){this.port.postMessage(this.buf.slice().buffer);this.n=0}}this.pos-=c.length;return true}}registerProcessor('mic',Mic)`

const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) }
const unb64 = str => { const s = atob(str), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer }

export function createLive({ url, model, voice, system, tools, onState = () => {}, onTranscript = () => {}, onTool = async () => ({}), onSpeaking = () => {} }) {
  let ws = null, ready = false, closed = false, ctx = null, head = 0, playing = [], speakTimer = 0, said = ''
  let micCtx = null, micNode = null, micStream = null, talking = false, manual = true

  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)) }

  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function stopPlayback() {
    for (const s of playing) { try { s.stop() } catch {} }
    playing = []
    head = 0
    clearTimeout(speakTimer)
    onSpeaking(false)
  }

  function play(buf) {
    const c = audio(), i16 = new Int16Array(buf), ab = c.createBuffer(1, i16.length, 24000), ch = ab.getChannelData(0)
    for (let i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768
    const src = c.createBufferSource()
    src.buffer = ab
    src.connect(c.destination)
    const at = Math.max(c.currentTime + .03, head)
    src.start(at)
    head = at + ab.duration
    playing.push(src)
    src.onended = () => { playing = playing.filter(x => x !== src) }
    onSpeaking(true)
    clearTimeout(speakTimer)
    speakTimer = setTimeout(() => onSpeaking(false), (head - c.currentTime) * 1000 + 120)
  }

  async function handle(m) {
    if (m.setupComplete) { ready = true; onState('ready'); return }
    if (m.toolCall) {
      const responses = []
      for (const call of m.toolCall.functionCalls || []) responses.push({ id: call.id, name: call.name, response: await onTool(call.name, call.args || {}) })
      send({ toolResponse: { functionResponses: responses } })
      return
    }
    const sc = m.serverContent
    if (!sc) return
    if (sc.interrupted) stopPlayback()
    for (const part of sc.modelTurn?.parts || []) if (part.inlineData?.data) play(unb64(part.inlineData.data))
    if (sc.outputTranscription?.text) { said += sc.outputTranscription.text; onTranscript('host', said) }
    if (sc.inputTranscription?.text) onTranscript('user', sc.inputTranscription.text)
    if (sc.turnComplete) said = ''
  }

  function connect() {
    closed = false
    ready = false
    onState('connecting')
    ws = new WebSocket(url)
    ws.onopen = () => {
      const setup = { model, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }, languageCode: 'pl-PL' } }, systemInstruction: { parts: [{ text: system }] }, tools: [{ functionDeclarations: tools }], inputAudioTranscription: { languageCodes: ['pl-PL'] }, outputAudioTranscription: {} }
      if (manual) setup.realtimeInputConfig = { automaticActivityDetection: { disabled: true } }
      send({ setup })
    }
    ws.onmessage = async ev => {
      let m
      try { m = JSON.parse(ev.data instanceof Blob ? await ev.data.text() : String(ev.data)) } catch { return }
      handle(m)
    }
    ws.onclose = e => {
      const wasReady = ready
      ready = false
      stopPlayback()
      if (closed) return
      if (!wasReady && manual && e.code !== 4401) { manual = false; connect(); return }
      onState(e.code === 4401 ? 'denied' : 'closed', e.reason || String(e.code))
    }
  }

  async function talkStart() {
    if (!ready || talking) return
    talking = true
    stopPlayback()
    try {
      if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
      if (!micCtx) {
        micCtx = new (window.AudioContext || window.webkitAudioContext)()
        await micCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })))
        micNode = new AudioWorkletNode(micCtx, 'mic')
        micNode.port.onmessage = e => { if (talking && ready) send({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: b64(e.data) } } }) }
        micCtx.createMediaStreamSource(micStream).connect(micNode)
      }
      if (micCtx.state === 'suspended') await micCtx.resume()
      if (manual) send({ realtimeInput: { activityStart: {} } })
    } catch (err) {
      talking = false
      onState('mic-error', String(err && err.message || err))
    }
  }

  function talkEnd() {
    if (!talking) return
    talking = false
    if (manual) send({ realtimeInput: { activityEnd: {} } })
    else send({ realtimeInput: { audioStreamEnd: true } })
    if (micCtx) micCtx.suspend()
  }

  return {
    connect,
    ready: () => ready,
    sendText: text => { if (ready) send({ realtimeInput: { text } }) },
    talkStart, talkEnd,
    unlock: audio,
    close: () => { closed = true; ready = false; stopPlayback(); try { ws && ws.close(1000) } catch {} },
  }
}
