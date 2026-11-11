// Imperium Gzowianskie: the low-poly isometric plot with the 24-field loop, pawns, cabins and dice. Renders only when something changes.
import * as THREE from 'three'
import { FIELDS, GROUPS, szyszki } from '../data/board.js'

const C = { grass: '#6cc24a', grass2: '#57ab3d', sand: '#f2d27a', water: '#2f9fe0', tile: '#fff1cf', wood: '#c98a4b', woodDark: '#4a2f22', roof: '#3a2620', door: '#e23b2e', concrete: '#b9b2a6', glass: '#7fd3ea', pine: '#1f7a43', trunk: '#7a4a2a', stone: '#8d8a86', fire: '#ff8a1e', heli: '#1d3fae', white: '#ffffff', red: '#e23b2e', yellow: '#ffc21a', dark: '#2a1a12', panel: '#27408b', kayak: '#ff7a1a', teal: '#19c2b0', skin: '#f0c39a', hair: '#7a4a2a', blond: '#f3d36b', green: '#3fae4a', fur: '#f4efe6', tan: '#c98a4b', cloud: '#5b6274' }
const T = 5.2, H = T * 3, SCARP = 2.4
const mats = {}
const mat = key => mats[key] || (mats[key] = new THREE.MeshLambertMaterial({ color: C[key] || key, flatShading: true }))

export function tileXZ(i) {
  const k = i % 6, side = Math.floor(i / 6)
  if (side === 0) return [H - k * T, H]
  if (side === 1) return [-H, H - k * T]
  if (side === 2) return [-H + k * T, -H]
  return [H, -H + k * T]
}
export const groundY = (x, z) => (x > 2.6 && z < -2.6 ? SCARP : 0)

function mesh(geo, key, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || mat(key))
  m.position.set(x, y, z)
  if (o.rot) m.rotation.set(...o.rot)
  if (o.scale) m.scale.set(...o.scale)
  m.castShadow = !o.flat
  m.receiveShadow = true
  ;(o.parent).add(m)
  return m
}
const box = (p, w, h, d, key, x, y, z, o = {}) => mesh(new THREE.BoxGeometry(w, h, d), key, x, y, z, { ...o, parent: p })
const cyl = (p, r1, r2, h, key, x, y, z, o = {}) => mesh(new THREE.CylinderGeometry(r1, r2, h, o.seg || 8), key, x, y, z, { ...o, parent: p })
const cone = (p, r, h, key, x, y, z, o = {}) => mesh(new THREE.ConeGeometry(r, h, o.seg || 7), key, x, y, z, { ...o, parent: p })
const ball = (p, r, key, x, y, z, o = {}) => mesh(new THREE.SphereGeometry(r, 8, 6), key, x, y, z, { ...o, parent: p })

function cabinModel(p, s = 1) {
  const g = new THREE.Group()
  box(g, 1.5 * s, .95 * s, 1.25 * s, 'woodDark', 0, .55 * s, 0)
  box(g, 1.75 * s, .16 * s, 1.5 * s, 'roof', 0, 1.1 * s, 0, { rot: [0, 0, .1] })
  box(g, .3 * s, .6 * s, .06, 'door', -.25 * s, .42 * s, .64 * s)
  p.add(g)
  return g
}
function houseModel(p) {
  const g = new THREE.Group()
  box(g, 2.6, .9, 1.9, 'concrete', 0, .45, 0)
  box(g, 2.2, .85, 1.4, 'glass', 0, 1.3, -.2)
  box(g, 2.4, .12, 1.6, 'dark', 0, 1.78, -.2)
  box(g, 2.6, .1, .6, 'wood', 0, .93, .7)
  p.add(g)
  return g
}

const PAWNS = {
  jurek: { name: 'Jurek', make: g => person(g, 'dark', 'hair', 'green') },
  rysio: { name: 'Rysio', make: g => person(g, 'red', 'blond', 'panel') },
  tata: { name: 'Tata', make: g => { person(g, 'fur', 'tan', 'dark', 1.25); box(g, .5, .1, .1, 'dark', 0, 1.62, .27) } },
  mama: { name: 'Mama', make: g => { cone(g, .55, 1.5, 'red', 0, .75, 0, { seg: 8 }); ball(g, .3, 'skin', 0, 1.62, 0); box(g, .5, .22, .5, 'blond', 0, 1.86, 0) } },
  waldek: { name: 'Waldek', make: g => { person(g, 'teal', 'yellow', 'stone'); box(g, .5, .08, .3, 'yellow', 0, 1.9, .3) } },
  dropsik: { name: 'Dropsik', make: g => { box(g, .5, .5, 1.1, 'dark', 0, .6, 0); box(g, .42, .42, .42, 'dark', 0, .95, .6); box(g, .24, .2, .26, 'tan', 0, .86, .86); cone(g, .1, .3, 'dark', -.14, 1.3, .55, { seg: 4 }); cone(g, .1, .3, 'tan', .14, 1.22, .55, { seg: 4, rot: [0, 0, -.6] }); for (const x of [-.18, .18]) for (const z of [-.4, .4]) box(g, .14, .36, .14, 'tan', x, .18, z) } },
  koza: { name: 'Koza', make: g => { box(g, .55, .55, 1.15, 'tan', 0, .72, 0); box(g, .5, .2, .5, 'white', 0, .72, -.3); box(g, .4, .44, .44, 'white', 0, 1.12, .62); for (const x of [-.12, .12]) cone(g, .06, .34, 'stone', x, 1.5, .55, { seg: 4, rot: [-.5, 0, 0] }); box(g, .46, .1, .2, 'red', 0, .95, .42); for (const x of [-.2, .2]) for (const z of [-.42, .42]) box(g, .13, .46, .13, 'white', x, .23, z) } },
  koparka: { name: 'Koparka', make: g => { box(g, 1.2, .42, .8, 'yellow', 0, .55, 0); box(g, .5, .5, .66, 'glass', -.25, 1.0, 0); box(g, 1.0, .16, .16, 'yellow', .75, 1.12, 0, { rot: [0, 0, .6] }); box(g, .7, .14, .14, 'yellow', 1.3, 1.0, 0, { rot: [0, 0, -.9] }); box(g, .3, .26, .36, 'dark', 1.55, .58, 0); for (const x of [-.4, .4]) for (const z of [-.42, .42]) cyl(g, .25, .25, .16, 'dark', x, .25, z, { rot: [Math.PI / 2, 0, 0], seg: 10 }) } },
  tesla: { name: 'Tesla', make: g => { box(g, 1.7, .36, .82, 'white', 0, .42, 0); box(g, .95, .32, .74, 'glass', -.05, .76, 0); for (const x of [-.55, .55]) for (const z of [-.42, .42]) cyl(g, .22, .22, .14, 'dark', x, .22, z, { rot: [Math.PI / 2, 0, 0], seg: 10 }) } },
  rakieta: { name: 'Rakieta', make: g => { cyl(g, .26, .26, 1.3, 'white', 0, .95, 0, { seg: 10 }); cone(g, .26, .5, 'red', 0, 1.85, 0, { seg: 10 }); for (const a of [0, 2.1, 4.2]) box(g, .06, .46, .4, 'red', Math.cos(a) * .32, .5, Math.sin(a) * .32, { rot: [0, -a, 0] }) } },
  kajak: { name: 'Kajak', make: g => { box(g, 1.8, .26, .5, 'kayak', 0, .3, 0); box(g, .5, .08, .34, 'dark', 0, .44, 0); box(g, 1.5, .06, .06, 'wood', 0, .62, 0, { rot: [0, .5, .15] }) } },
}
function person(g, body, hair, feet, wide = 1) {
  box(g, .62 * wide, .9, .44 * wide, body, 0, .82, 0)
  ball(g, .3, 'skin', 0, 1.6, 0)
  box(g, .5, .2, .5, hair, 0, 1.84, 0)
  for (const x of [-.16, .16]) box(g, .22, .36, .26, feet, x, .18, .02)
}
export const PAWN_LIST = Object.entries(PAWNS).map(([id, p]) => ({ id, name: p.name }))

function label(f) {
  const c = document.createElement('canvas')
  c.width = 384
  c.height = 192
  const x = c.getContext('2d')
  x.textAlign = 'center'
  x.fillStyle = '#2a1a12'
  const words = f.name.split(' '), lines = []
  let line = ''
  x.font = '800 58px ui-rounded,"SF Pro Rounded",-apple-system,"Helvetica Neue",Arial,sans-serif'
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > 366 && line) { lines.push(line); line = w } else line = t }
  lines.push(line)
  const top = f.price ? (lines.length > 1 ? 54 : 82) : (lines.length > 1 ? 76 : 112)
  lines.forEach((l, i) => x.fillText(l, 192, top + i * 58))
  if (f.price) { x.font = '700 42px ui-rounded,"SF Pro Rounded",-apple-system,Arial,sans-serif'; x.fillStyle = 'rgba(42,26,18,.6)'; x.fillText(szyszki(f.price), 192, lines.length > 1 ? 168 : 146) }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function pips(n) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')
  x.fillStyle = '#fff'
  x.fillRect(0, 0, 128, 128)
  x.fillStyle = '#2a1a12'
  const P = { 1: [[64, 64]], 2: [[34, 34], [94, 94]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[34, 34], [94, 34], [34, 94], [94, 94]], 5: [[34, 34], [94, 34], [64, 64], [34, 94], [94, 94]], 6: [[34, 30], [94, 30], [34, 64], [94, 64], [34, 98], [94, 98]] }
  for (const [a, b] of P[n]) { x.beginPath(); x.arc(a, b, 12, 0, 7); x.fill() }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const FACE_UP = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] }

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f5a, 1.25))
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.3)
  sun.position.set(-30, 40, 22)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 1, far: 140 })
  sun.shadow.bias = -.0006
  sun.shadow.normalBias = .04
  scene.add(sun)

  box(scene, 39, 1.6, 39, 'grass', 0, -.8, 0, { flat: true })
  box(scene, 17, SCARP, 17, 'grass2', 11, SCARP / 2, -11, {})
  box(scene, 5, 1.5, 39, 'sand', -22, -.85, 0, { flat: true })
  box(scene, 12, 1.2, 51, 'water', -30.5, -1.1, -6, { flat: true })
  box(scene, 33.5, 1.2, 12, 'water', -7.75, -1.1, -25.5, { flat: true })
  box(scene, 26, 1.5, 3.4, 'sand', -6.5, -.86, -21.1, { flat: true })

  box(scene, 6.4, 2.2, 5, 'concrete', 8.6, 1.1, 6.2)
  box(scene, 2.4, 1.5, .3, 'dark', 7.2, .8, 8.72)
  box(scene, 5.6, 2.1, 3.2, 'glass', 8.6, 3.25, 5.4)
  box(scene, 6, .26, 3.7, 'dark', 8.6, 4.42, 5.4)
  box(scene, 6.4, .2, 1.9, 'wood', 8.6, 2.3, 7.9)
  for (const [x, z, r] of [[-8.4, 8.2, .2], [-4.4, 9.6, -.15], [-9.6, 3.8, .5]]) { const g = cabinModel(scene, 1.9); g.position.set(x, 0, z); g.rotation.y = r }
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.3, 1.3]) box(scene, .24, 2.3, .24, 'woodDark', 8.4 + sx, 1.15, -.2 + sz)
  box(scene, 4.8, .24, 3.4, 'roof', 8.4, 2.42, -.2)
  box(scene, 1.3, .7, 1.1, 'red', 8.1, .45, -.2)
  box(scene, 2.2, 1.7, .3, 'dark', 4.6, .95, -2.5)
  const pine = (x, z, s = 1) => { const y = groundY(x, z); cyl(scene, .2 * s, .28 * s, 3 * s, 'trunk', x, y + 1.5 * s, z, { seg: 6 }); cone(scene, 1.6 * s, 2.3 * s, 'pine', x, y + 3.4 * s, z); cone(scene, 1.2 * s, 2 * s, 'pine', x, y + 4.6 * s, z); cone(scene, .85 * s, 1.6 * s, 'pine', x, y + 5.6 * s, z) }
  for (const p of [[-1.5, 1.5, 1.15], [1.6, 3.8, 1], [-3.4, 4.6, .9], [0, -1.2, 1.1], [-5, -.4, .95], [2.4, 9.4, .9], [-1, 7.4, 1], [6, -9, .9], [10.2, -6.4, .85], [-10, -9.6, .9]]) pine(...p)
  box(scene, 2.5, .1, .8, 'kayak', -2.3, 2.1, 3.1, { rot: [0, .6, .1] })
  for (let i = 0; i < 7; i++) box(scene, .5, .36, .5, 'stone', -8.6 + Math.cos(i * .9) * 1.05, .18, -1.4 + Math.sin(i * .9) * 1.05, { rot: [0, i, 0] })
  cone(scene, .56, 1.2, 'fire', -8.6, .7, -1.4, { seg: 5 })
  cone(scene, .3, .7, 'yellow', -8.6, .55, -1.4, { seg: 5 })
  const dig = new THREE.Group()
  PAWNS.koparka.make(dig)
  dig.scale.setScalar(2.1)
  dig.position.set(-8.4, 0, -6.2)
  dig.rotation.y = .9
  scene.add(dig)
  const heli = new THREE.Group()
  heli.position.set(-9.2, 0, -10.2)
  heli.rotation.y = .7
  scene.add(heli)
  ball(heli, 1.15, 'heli', 0, 1.4, 0, { scale: [1.35, 1, 1] })
  box(heli, 2.4, .3, .3, 'heli', 2.2, 1.6, 0)
  box(heli, .18, .8, .45, 'heli', 3.3, 1.9, 0)
  box(heli, 5.2, .07, .28, 'dark', 0, 2.65, 0)
  box(heli, .28, .07, 5.2, 'dark', 0, 2.65, 0)
  for (const sz of [-.75, .75]) box(heli, 2.4, .1, .12, 'dark', 0, .12, sz)
  cyl(scene, .05, .05, 3.4, 'dark', 10.4, SCARP + 1.7, -10.6)
  cyl(scene, .32, .32, 2, 'white', 9.8, SCARP + 1.6, -10.6, { seg: 10 })
  cone(scene, .32, .75, 'red', 9.8, SCARP + 3, -10.6, { seg: 10 })
  for (const a of [0, 2.1, 4.2]) box(scene, .08, .65, .55, 'red', 9.8 + Math.cos(a) * .4, SCARP + .9, -10.6 + Math.sin(a) * .4, { rot: [0, -a, 0] })
  for (let i = 0; i < 3; i++) box(scene, 2, .1, 1.2, 'panel', 4 + i * 2.3, SCARP + .8, -6.4, { rot: [-.5, 0, 0] })
  box(scene, 2.6, .46, 1, 'white', -21.6, .1, 4, { rot: [0, .4, 0] })
  box(scene, 3.2, .3, .66, 'kayak', -21.8, .05, -3, { rot: [0, 1.3, 0] })
  box(scene, 3.2, .3, .66, 'teal', -22.6, .05, -6.4, { rot: [0, 1.5, 0] })
  cyl(scene, 3.4, 3.8, 1.6, 'grass2', -25, -.9, -27, { seg: 9, flat: true })
  cone(scene, 1.1, 1.8, 'pine', -25.6, 1, -27.6)
  box(scene, .34, .34, .6, 'white', -24.2, .16, -26.2)
  box(scene, 4.2, .2, 3, 'white', -2.6, 2.6, 22.6)
  for (const sx of [-1.8, 1.8]) box(scene, .22, 2.6, .22, 'stone', -2.6 + sx, 1.3, 22.6)
  box(scene, .7, 1.2, .5, 'red', -2.6, .6, 22.6)
  box(scene, 39, 1.6, 6.5, 'grass2', 0, -.8, 22.7, { flat: true })
  const cloud = new THREE.Group()
  cloud.position.set(tileXZ(20)[0] + 3.4, SCARP + 3.6, tileXZ(20)[1] - 1)
  cloud.scale.setScalar(.6)
  for (const [x, y, z, r] of [[0, 0, 0, 1.5], [1.4, -.2, .3, 1.1], [-1.3, -.1, -.2, 1.2], [.2, .5, -.4, 1]]) ball(cloud, r, 'cloud', x, y, z).castShadow = false
  scene.add(cloud)

  const tiles = [], labels = [], flags = [], builds = []
  const ring = new THREE.Group()
  scene.add(ring)
  FIELDS.forEach((f, i) => {
    const [x, z] = tileXZ(i), y = groundY(x, z)
    const special = f.type !== 'place'
    const t = box(ring, 4.84, .36, 4.84, 'tile', x, y + .18, z, { mat: new THREE.MeshLambertMaterial({ color: special ? (f.type === 'start' ? C.yellow : '#ffffff') : C.tile, flatShading: true }) })
    t.userData.i = i
    tiles.push(t)
    if (!special) {
      const side = Math.floor(i / 6), along = side % 2 === 0
      const inward = [[0, -1], [1, 0], [0, 1], [-1, 0]][side]
      box(ring, along ? 4.84 : 1, .38, along ? 1 : 4.84, GROUPS[f.group].color, x + inward[0] * 1.92, y + .2, z + inward[1] * 1.92)
    }
    const l = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.35), new THREE.MeshBasicMaterial({ map: label(f), transparent: true, depthWrite: false }))
    l.rotation.order = 'YXZ'
    l.rotation.set(-Math.PI / 2, Math.PI / 4, 0)
    l.position.set(x, y + .375, z)
    ring.add(l)
    labels.push(l)
    const flag = new THREE.Group()
    cyl(flag, .06, .06, 2.2, 'dark', 0, 1.1, 0, { seg: 5 })
    const cloth = box(flag, .9, .6, .06, 'white', .48, 1.85, 0, { mat: new THREE.MeshLambertMaterial({ color: '#fff', flatShading: true }) })
    flag.userData.cloth = cloth
    flag.position.set(x + 1.9, y + .36, z - 1.9)
    flag.visible = false
    ring.add(flag)
    flags.push(flag)
    const b = new THREE.Group()
    b.position.set(x, y + .36, z)
    ring.add(b)
    builds.push(b)
  })

  const pawns = new Map()
  const dice = [0, 1].map(k => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), [2, 5, 1, 6, 3, 4].map(n => new THREE.MeshLambertMaterial({ map: pips(n) })))
    d.castShadow = true
    d.visible = false
    scene.add(d)
    return d
  })

  let state = null, tweens = [], raf = 0, last = 0, picker = null
  const need = () => { if (!raf) raf = requestAnimationFrame(tick) }
  function tick(now) {
    raf = 0
    const dt = Math.min(.05, (now - last) / 1000 || .016)
    last = now
    tweens = tweens.filter(t => { t.t += dt / t.dur; const k = Math.min(1, t.t); t.step(k); if (k >= 1) { t.done && t.done(); return false } return true })
    renderer.render(scene, camera)
    if (tweens.length) need()
  }
  const tween = (dur, step, done) => { tweens.push({ t: 0, dur, step, done }); last = performance.now(); need() }

  function resize() {
    const r = canvas.getBoundingClientRect()
    if (r.width < 2) return
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
    renderer.setSize(r.width, r.height, false)
    const aspect = r.width / r.height, span = Math.max(21.5, 39 / aspect)
    camera.left = -span * aspect
    camera.right = span * aspect
    camera.top = span
    camera.bottom = -span
    const e = THREE.MathUtils.degToRad(35), d = 130, a = Math.PI / 4
    camera.position.set(Math.sin(a) * Math.cos(e) * d - 5, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d - 4)
    camera.lookAt(-5, 0, -4)
    camera.updateProjectionMatrix()
    need()
  }
  new ResizeObserver(resize).observe(canvas)

  function pawnSpot(i, slot, n) {
    const [x, z] = tileXZ(i), y = groundY(x, z) + .36
    if (n <= 1) return [x, y, z + .5]
    const a = slot / n * Math.PI * 2 + .6, r = n > 3 ? 1.55 : 1.25
    return [x + Math.cos(a) * r, y, z + Math.sin(a) * r + .3]
  }
  function layout(skip) {
    if (!state) return
    const by = {}
    for (const p of state.players) if (!p.out) (by[p.pos] = by[p.pos] || []).push(p.id)
    for (const [i, ids] of Object.entries(by)) ids.forEach((id, k) => { if (id !== skip) { const g = pawns.get(id); if (g) g.position.set(...pawnSpot(+i, k, ids.length)) } })
  }

  function sync(s) {
    state = s
    for (const p of s.players) {
      if (!pawns.has(p.id)) {
        const g = new THREE.Group()
        cyl(g, .82, .82, .1, 'white', 0, .05, 0, { seg: 14, mat: new THREE.MeshLambertMaterial({ color: p.color, flatShading: true }) })
        const body = new THREE.Group()
        ;(PAWNS[p.pawn] || PAWNS.jurek).make(body)
        body.position.y = .1
        body.rotation.y = Math.PI / 4
        g.add(body)
        g.scale.setScalar(1.15)
        scene.add(g)
        pawns.set(p.id, g)
      }
      pawns.get(p.id).visible = !p.out
    }
    FIELDS.forEach((f, i) => {
      const o = s.owner[i], flag = flags[i]
      flag.visible = o != null
      if (o != null) flag.userData.cloth.material.color.set(s.players[o].color)
      const want = `${o}-${s.level[i] || 0}`, b = builds[i]
      if (b.userData.key !== want) {
        b.userData.key = want
        b.clear()
        const l = s.level[i] || 0, side = Math.floor(i / 6), inward = [[0, -1], [1, 0], [0, 1], [-1, 0]][side], along = side % 2 === 0
        if (l === 4) { const h = houseModel(b); h.position.set(inward[0] * 1.2, 0, inward[1] * 1.2); h.scale.setScalar(.9); h.rotation.y = Math.PI / 4 }
        else for (let k = 0; k < l; k++) { const c = cabinModel(b, .85); const off = (k - (l - 1) / 2) * 1.5; c.position.set(inward[0] * 1.7 + (along ? off : 0), 0, inward[1] * 1.7 + (along ? 0 : off)); c.rotation.y = Math.PI / 4 }
      }
    })
    layout()
    need()
  }

  function movePawn(id, path, done) {
    const g = pawns.get(id)
    if (!g || !path.length) { layout(); need(); done && done(); return }
    let k = 0
    const hop = () => {
      if (k >= path.length) { layout(); need(); done && done(); return }
      const from = g.position.clone(), to = new THREE.Vector3(...pawnSpot(path[k], 0, 1))
      k++
      tween(.17, t => { g.position.lerpVectors(from, to, t); g.position.y += Math.sin(t * Math.PI) * 1.5 }, hop)
    }
    hop()
  }

  function flyPawn(id, to, done) {
    const g = pawns.get(id)
    if (!g) { done && done(); return }
    const from = g.position.clone(), end = new THREE.Vector3(...pawnSpot(to, 0, 1))
    tween(1.1, t => { const e = t * t * (3 - 2 * t); g.position.lerpVectors(from, end, e); g.position.y += Math.sin(t * Math.PI) * 11; g.rotation.y = t * Math.PI * 4 }, () => { g.rotation.y = 0; layout(); need(); done && done() })
  }

  function rollDice(values, done) {
    dice.forEach((d, k) => {
      d.visible = true
      const end = new THREE.Vector3(-3 + k * 2.4, .76, 11.5 + k * .9), start = new THREE.Vector3(end.x + 7, 12, end.z + 7)
      const target = FACE_UP[values[k]], spin = [6 + k * 2, 4, 5 + k]
      tween(.95, t => {
        const e = 1 - Math.pow(1 - t, 3)
        d.position.lerpVectors(start, end, e)
        d.position.y = end.y + (1 - e) * 11 + Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 2.4
        d.rotation.set(target[0] + (1 - e) * spin[0], (1 - e) * spin[1] + Math.PI / 4, target[2] + (1 - e) * spin[2])
      }, k === 1 ? done : null)
    })
  }
  const hideDice = () => { dice.forEach(d => (d.visible = false)); need() }

  function highlight(list, onPick) {
    picker = list ? { set: new Set(list), onPick } : null
    tiles.forEach((t, i) => { t.material.emissive = new THREE.Color(picker && picker.set.has(i) ? '#ff7a1a' : '#000000'); t.material.emissiveIntensity = .55; t.position.y = groundY(...tileXZ(i)) + (picker && picker.set.has(i) ? .42 : .18) })
    need()
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  canvas.addEventListener('pointerup', e => {
    if (!picker) return
    const r = canvas.getBoundingClientRect()
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(tiles)[0]
    if (hit && picker.set.has(hit.object.userData.i)) { const p = picker; highlight(null); p.onPick(hit.object.userData.i) }
  })

  function fieldAt(i) {
    const [x, z] = tileXZ(i), v = new THREE.Vector3(x, groundY(x, z) + 1, z).project(camera), r = canvas.getBoundingClientRect()
    return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]
  }

  resize()
  return { sync, movePawn, flyPawn, rollDice, hideDice, highlight, resize, fieldAt, render: need, busy: () => tweens.length > 0 }
}
