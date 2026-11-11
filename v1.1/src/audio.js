// Imperium Gzowianskie: sound. Real recordings from assets/audio, loaded on the first touch; music and river ambience duck while the Octopus speaks.
const SFX = ['dice', 'hop', 'coins', 'register', 'flip', 'tear', 'chime', 'heli', 'rocket', 'fail', 'hail', 'boom', 'hammer', 'saw', 'bell', 'fanfare', 'click', 'digger', 'dog', 'cat', 'goat']
const LOOPS = { narew: .1, muzyka: .2 }

export function createAudio() {
  let ctx = null, out = null, bed = null
  const buffers = {}

  async function fetchBuffer(name) {
    try {
      const r = await fetch(`assets/audio/${name}.mp3`)
      if (!r.ok) return
      buffers[name] = await ctx.decodeAudioData(await r.arrayBuffer())
    } catch {}
  }

  async function load() {
    await Promise.all(SFX.map(fetchBuffer))
    const listed = await fetch('assets/audio/manifest.json').then(r => r.json()).catch(() => ({}))
    for (const [name, volume] of Object.entries(LOOPS)) {
      const trial = name === 'muzyka' && new URLSearchParams(location.search).get('muzyka')
      if (trial && /^\d+$/.test(trial)) { try { buffers[name] = await ctx.decodeAudioData(await (await fetch(`Niepotrzebne/muzyka-src/${trial}.mp3`)).arrayBuffer()) } catch {} }
      else if (!(name in listed)) continue
      else await fetchBuffer(name)
      if (!buffers[name]) continue
      const s = ctx.createBufferSource(), g = ctx.createGain()
      s.buffer = buffers[name]
      s.loop = true
      s.loopStart = .03
      s.loopEnd = Math.max(.1, buffers[name].duration - .03)
      g.gain.value = volume
      s.connect(g).connect(bed)
      s.start()
    }
  }

  function unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      out = ctx.createGain()
      out.gain.value = .85
      out.connect(ctx.destination)
      bed = ctx.createGain()
      bed.connect(ctx.destination)
      load()
    }
    if (ctx.state === 'suspended') ctx.resume()
  }

  function play(name, { volume = 1, rate = 1, delay = 0 } = {}) {
    const b = buffers[name]
    if (!ctx || !b) return
    const s = ctx.createBufferSource(), g = ctx.createGain()
    s.buffer = b
    s.playbackRate.value = rate
    g.gain.value = volume
    s.connect(g).connect(out)
    s.start(ctx.currentTime + delay)
  }

  const duck = on => { if (ctx) bed.gain.setTargetAtTime(on ? .22 : 1, ctx.currentTime, .18) }
  return { unlock, play, duck }
}
