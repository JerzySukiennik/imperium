// Imperium Gzowianskie: where the voice relay lives and which Gemini Live model and voice the Octopus uses.
const local = ['localhost', '127.0.0.1'].includes(location.hostname)
const q = new URLSearchParams(location.search)
export const CONFIG = {
  relay: local ? `ws://${location.host}/live` : 'wss://imperium-relay.kalakasanyt.workers.dev/live',
  model: 'models/gemini-3.1-flash-live-preview',
  voice: q.get('glos') || 'Puck',
}
