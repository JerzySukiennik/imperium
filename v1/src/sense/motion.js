// Imperium Gzowianskie: tablet motion. Detects a shake, a tilt for minigames and the screen being laid face down and picked up again.
export function createMotion({ onShake = () => {}, onFaceDown = () => {}, onFaceUp = () => {} } = {}) {
  let tilt = 0, lastShake = 0, hits = 0, firstHit = 0, down = false, downSince = 0, upSince = 0, active = false, seen = false

  function handle(e) {
    const g = e.accelerationIncludingGravity, a = e.acceleration
    if (!g || g.x == null) return
    seen = true
    const now = performance.now()
    const angle = (screen.orientation && screen.orientation.angle) || 0
    const side = angle === 90 ? -g.y : angle === 270 ? g.y : angle === 180 ? -g.x : g.x
    tilt = Math.max(-1, Math.min(1, side / 6))
    const force = a && a.x != null ? Math.hypot(a.x, a.y, a.z) : Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81)
    if (force > 13) {
      if (now - firstHit > 700) { hits = 0; firstHit = now }
      hits++
      if (hits >= 3 && now - lastShake > 1500) { lastShake = now; hits = 0; onShake() }
    }
    if (g.z < -7) {
      upSince = 0
      if (!downSince) downSince = now
      if (!down && now - downSince > 600) { down = true; onFaceDown() }
    } else if (g.z > 4) {
      downSince = 0
      if (!upSince) upSince = now
      if (down && now - upSince > 350) { down = false; onFaceUp() }
    }
  }

  async function enable() {
    if (active || typeof DeviceMotionEvent === 'undefined') return false
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function' && (await DeviceMotionEvent.requestPermission()) !== 'granted') return false
    } catch { return false }
    addEventListener('devicemotion', handle)
    active = true
    return true
  }

  return { enable, tilt: () => tilt, available: () => seen }
}
