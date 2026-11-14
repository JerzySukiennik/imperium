// Imperium Gzowianskie board game: small low-poly models rendered as icons for the board, cards and rulebook (resources, special fields, buildings).
import * as THREE from 'three'

const C = { wood: '#c98a4b', bark: '#7a4a2a', cut: '#eec98d', sand: '#f2d27a', sand2: '#e0b755', fish: '#2f9fe0', fish2: '#1d6fb5', cone: '#8a5a2b', cone2: '#a8703a', white: '#ffffff', dark: '#2a1a12', red: '#e23b2e', yellow: '#ffc21a', lime: '#b6e22e', teal: '#19c2b0', glass: '#7fd3ea', pink: '#ff8fb3', cream: '#fff1cf', waffle: '#d9a15a', olive: '#55662c', grass: '#57ab3d', heli: '#1d3fae', cloud: '#5b6274', ice: '#e8f6ff', woodDark: '#4a2f22', roof: '#3a2620', concrete: '#b9b2a6', stone: '#8d8a86', fire: '#ff8a1e', paper: '#fdf8ec', gold: '#ffb21a' }
const mats = {}
const mat = key => mats[key] || (mats[key] = new THREE.MeshLambertMaterial({ color: C[key] || key, flatShading: true }))

function kit(g) {
  const add = (geo, key, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat(key)); m.position.set(x, y, z); if (o.rot) m.rotation.set(...o.rot); if (o.scale) m.scale.set(...o.scale); m.castShadow = m.receiveShadow = true; (o.parent || g).add(m); return m }
  return {
    box: (w, h, d, key, x, y, z, o) => add(new THREE.BoxGeometry(w, h, d), key, x, y, z, o),
    cyl: (r1, r2, h, key, x, y, z, o = {}) => add(new THREE.CylinderGeometry(r1, r2, h, o.seg || 8), key, x, y, z, o),
    cone: (r, h, key, x, y, z, o = {}) => add(new THREE.ConeGeometry(r, h, o.seg || 7), key, x, y, z, o),
    ball: (r, key, x, y, z, o = {}) => add(new THREE.SphereGeometry(r, o.seg || 8, o.rows || 6), key, x, y, z, o),
    sub: (x, y, z, rot) => { const s = new THREE.Group(); s.position.set(x, y, z); if (rot) s.rotation.set(...rot); g.add(s); return s },
  }
}

export const ICONS = {
  drewno(g) {
    const k = kit(g)
    for (const [y, z] of [[.5, -.52], [.5, .52], [1.38, 0]]) { k.cyl(.5, .5, 2.6, 'bark', 0, y, z, { rot: [0, 0, Math.PI / 2], seg: 8 }); for (const s of [-1, 1]) k.cyl(.4, .4, .06, 'cut', s * 1.31, y, z, { rot: [0, 0, Math.PI / 2], seg: 8 }) }
  },
  piasek(g) {
    const k = kit(g)
    k.cone(1.5, 1.25, 'sand', 0, .62, 0, { seg: 8 })
    k.cone(.8, .7, 'sand2', 1.25, .35, .6, { seg: 6 })
    k.cyl(.5, .38, .8, 'red', -1.1, .4, 1.0, { seg: 8 })
    k.cyl(.44, .44, .08, 'sand2', -1.1, .82, 1.0, { seg: 8 })
    k.box(.12, 1.3, .12, 'teal', .5, 1.5, .1, { rot: [0, 0, -.5] })
    k.box(.4, .46, .1, 'teal', .15, .95, .1, { rot: [0, 0, -.5] })
  },
  ryby(g) {
    const k = kit(g)
    const fish = (x, y, z, s, ry, a, b) => {
      const f = k.sub(x, y, z, [0, ry, 0])
      f.scale.setScalar(s)
      const P = { parent: f }
      k.ball(1, a, 0, 0, 0, { scale: [1.5, .78, .42], seg: 8, rows: 6, ...P })
      k.cone(.62, .9, b, -1.7, 0, 0, { rot: [0, 0, -Math.PI / 2], seg: 4, scale: [1, 1, .3], ...P })
      k.cone(.4, .6, b, .1, .78, 0, { seg: 4, scale: [1.6, 1, .25], ...P })
      for (const s2 of [-1, 1]) { k.ball(.16, 'white', .92, .16, s2 * .3, P); k.ball(.08, 'dark', 1.0, .16, s2 * .37, P) }
    }
    fish(0, .9, 0, 1, .25, 'fish', 'fish2')
  },
  szyszka(g) {
    const k = kit(g)
    const prof = [.42, .72, .9, .95, .86, .7, .5, .3]
    prof.forEach((r, i) => k.cyl(r * 1.08, r * .62, .36, i % 2 ? 'cone2' : 'cone', 0, .2 + i * .3, 0, { seg: 7, rot: [0, i * .45, 0] }))
    k.cyl(.07, .09, .3, 'bark', 0, 2.72, 0, { seg: 5 })
  },
  start(g) {
    const k = kit(g)
    k.box(3.4, .16, 1.7, 'wood', 0, 1.1, 0)
    for (const sx of [-1.25, 1.25]) for (const t of [-.14, .14]) k.box(.14, 1.1, 1.5, 'lime', sx + t * 1.6, .55, 0, { rot: [0, 0, t] })
    k.cyl(.46, .46, .06, 'white', -.6, 1.22, .1, { seg: 12 })
    k.ball(.2, 'yellow', -.6, 1.27, .1, { scale: [1, .6, 1] })
    k.cyl(.46, .46, .06, 'white', .7, 1.22, -.2, { seg: 12 })
    k.ball(.2, 'yellow', .7, 1.27, -.2, { scale: [1, .6, 1] })
    k.cyl(.17, .15, .3, 'red', 1.35, 1.33, .45, { seg: 8 })
    k.cyl(.17, .15, .3, 'teal', -1.3, 1.33, -.45, { seg: 8 })
  },
  moya(g) {
    const k = kit(g)
    k.cone(.62, 1.7, 'waffle', 0, .85, 0, { rot: [Math.PI, 0, 0], seg: 8 })
    k.ball(.68, 'pink', 0, 1.95, 0)
    k.ball(.56, 'cream', 0, 2.75, 0)
    k.ball(.14, 'red', 0, 3.34, 0)
  },
  niewypal(g) {
    const k = kit(g)
    k.cone(1.7, .7, 'sand2', 0, .35, 0, { seg: 8 })
    const s = k.sub(.1, .55, 0, [0, 0, -.55])
    k.cyl(.42, .42, 1.5, 'olive', 0, .75, 0, { seg: 9, parent: s })
    k.cone(.42, .7, 'olive', 0, 1.85, 0, { seg: 9, parent: s })
    k.cyl(.44, .44, .14, 'yellow', 0, 1.2, 0, { seg: 9, parent: s })
    for (const a of [0, 1.57, 3.14, 4.71]) k.box(.06, .5, .34, 'dark', Math.cos(a) * .5, .25, Math.sin(a) * .5, { rot: [0, -a, 0], parent: s })
  },
  koparka(g) {
    const k = kit(g)
    k.box(1.2, .42, .8, 'yellow', 0, .55, 0)
    k.box(.5, .5, .66, 'glass', -.25, 1.0, 0)
    k.box(1.0, .16, .16, 'yellow', .75, 1.12, 0, { rot: [0, 0, .6] })
    k.box(.7, .14, .14, 'yellow', 1.3, 1.0, 0, { rot: [0, 0, -.9] })
    k.box(.3, .26, .36, 'dark', 1.55, .58, 0)
    k.box(.5, .3, .8, 'yellow', -.82, .34, 0)
    for (const x of [-.4, .4]) for (const z of [-.42, .42]) k.cyl(.25, .25, .16, 'dark', x, .25, z, { rot: [Math.PI / 2, 0, 0], seg: 10 })
  },
  heli(g) {
    const k = kit(g)
    k.ball(1.15, 'heli', 0, 1.4, 0, { scale: [1.35, 1, 1] })
    k.box(.9, .7, 1.5, 'glass', -1.0, 1.5, 0)
    k.box(2.4, .3, .3, 'heli', 2.2, 1.6, 0)
    k.box(.18, .8, .45, 'heli', 3.3, 1.9, 0)
    k.box(5.2, .07, .28, 'dark', 0, 2.65, 0)
    k.box(.28, .07, 5.2, 'dark', 0, 2.65, 0)
    for (const sz of [-.75, .75]) k.box(2.4, .1, .12, 'dark', 0, .12, sz)
  },
  wojt(g) {
    const k = kit(g)
    k.box(2.6, .08, 3.2, 'paper', 0, .04, 0, { rot: [0, .25, 0] })
    for (let i = 0; i < 4; i++) k.box(1.5, .03, .12, 'stone', -.15, .1, -.9 + i * .38, { rot: [0, .25, 0] })
    k.cyl(.5, .5, .05, 'red', .55, .11, .95, { seg: 12 })
    k.cyl(.62, .62, .34, 'woodDark', -1.9, .17, 1.3, { seg: 12 })
    k.cyl(.26, .34, .9, 'wood', -1.9, .8, 1.3, { seg: 10 })
    k.ball(.36, 'wood', -1.9, 1.35, 1.3)
  },
  rakieta(g) {
    const k = kit(g)
    k.cyl(1.2, 1.2, .12, 'concrete', 0, .06, 0, { seg: 12 })
    k.cyl(.05, .05, 3.6, 'dark', .62, 1.9, 0)
    k.cyl(.34, .34, 2.2, 'white', 0, 1.7, 0, { seg: 10 })
    k.cyl(.345, .345, .3, 'fire', 0, 2.1, 0, { seg: 10 })
    k.cone(.34, .85, 'red', 0, 3.22, 0, { seg: 10 })
    for (const a of [0, 2.1, 4.2]) k.box(.08, .7, .6, 'red', Math.cos(a) * .44, .92, Math.sin(a) * .44, { rot: [0, -a, 0] })
  },
  grad(g) {
    const k = kit(g)
    for (const [x, y, z, r] of [[0, 2.6, 0, 1.2], [1.2, 2.45, .25, .9], [-1.15, 2.5, -.15, 1], [.2, 3.05, -.35, .85]]) k.ball(r, 'cloud', x, y, z)
    for (const [x, y, z] of [[-1.1, 1.1, .2], [-.3, .5, -.2], [.5, 1.2, .3], [1.2, .6, -.1], [0, 1.5, 0], [-.7, .15, .4], [.9, .1, .5]]) k.box(.3, .3, .3, 'ice', x, y, z, { rot: [.5, x, .4] })
  },
  domek(g) {
    const k = kit(g)
    k.box(1.5, .95, 1.25, 'woodDark', 0, .55, 0)
    k.box(1.75, .16, 1.5, 'roof', 0, 1.1, 0, { rot: [0, 0, .1] })
    k.box(.3, .6, .06, 'red', -.25, .42, .64)
    k.box(.34, .3, .06, 'glass', .32, .62, .64)
    k.box(.9, .08, .5, 'wood', 0, .1, .84)
  },
  dom(g) {
    const k = kit(g)
    k.box(2.6, .9, 1.9, 'concrete', 0, .45, 0)
    k.box(.9, .62, .08, 'dark', -.6, .36, .96)
    k.box(2.2, .85, 1.4, 'glass', 0, 1.3, -.2)
    k.box(2.4, .12, 1.6, 'dark', 0, 1.78, -.2)
    k.box(2.6, .1, .6, 'wood', 0, .93, .7)
  },
  karta(g) {
    const k = kit(g)
    k.box(1.7, .05, 2.4, 'dark', .25, .03, .1, { rot: [0, .35, 0] })
    k.box(1.7, .05, 2.4, 'paper', 0, .1, 0, { rot: [0, .1, 0] })
    k.box(1.4, .03, 1.1, 'fish', 0, .14, -.42, { rot: [0, .1, 0] })
    k.box(1.1, .03, .14, 'stone', 0, .14, .45, { rot: [0, .1, 0] })
    k.box(1.3, .03, .1, 'stone', 0, .14, .72, { rot: [0, .1, 0] })
  },
}

export function buildIcon(name) {
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 1.3))
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.2)
  sun.position.set(-30, 40, 22)
  scene.add(sun)
  const g = new THREE.Group()
  ICONS[name](g)
  scene.add(g)
  const e = THREE.MathUtils.degToRad(32), a = Math.PI / 4.6, d = 60
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3())
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 200)
  camera.position.set(c.x + Math.sin(a) * Math.cos(e) * d, c.y + Math.sin(e) * d, c.z + Math.cos(a) * Math.cos(e) * d)
  camera.lookAt(c)
  camera.updateMatrixWorld()
  let r = 0, u = 0
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const v = new THREE.Vector3(x, y, z).sub(c); r = Math.max(r, Math.abs(v.dot(right))); u = Math.max(u, Math.abs(v.dot(up))) }
  const s = Math.max(r, u) * 1.06
  Object.assign(camera, { left: -s, right: s, top: s, bottom: -s })
  camera.updateProjectionMatrix()
  return { scene, camera }
}
