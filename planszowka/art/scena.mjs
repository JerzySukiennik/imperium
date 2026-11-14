// Imperium Gzowianskie board game: the low-poly Gzowo plot as a diorama for the centre of the printed board. Same palette and models as the tablet game, with more detail for large print.
import * as THREE from 'three'

const C = { grass: '#6cc24a', grass2: '#57ab3d', grass3: '#7fd257', sand: '#f2d27a', sand2: '#e6c062', water: '#2f9fe0', water2: '#55b6ec', wood: '#c98a4b', woodDark: '#4a2f22', roof: '#3a2620', door: '#e23b2e', concrete: '#b9b2a6', glass: '#7fd3ea', pine: '#1f7a43', pine2: '#2a9153', trunk: '#7a4a2a', stone: '#8d8a86', fire: '#ff8a1e', heli: '#1d3fae', white: '#ffffff', red: '#e23b2e', yellow: '#ffc21a', dark: '#2a1a12', panel: '#27408b', kayak: '#ff7a1a', teal: '#19c2b0', lime: '#b6e22e', black: '#1b1b1f', path: '#e9d9a8', road: '#8f8a84', fur: '#f4efe6' }
const SCARP = 2.4
const mats = {}
const mat = key => mats[key] || (mats[key] = new THREE.MeshLambertMaterial({ color: C[key] || key, flatShading: true }))
const groundY = (x, z) => (x > 2.6 && z < -2.6 ? SCARP : 0)

export function buildScene() {
  const scene = new THREE.Scene()
  const add = (geo, key, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat(key))
    m.position.set(x, y, z)
    if (o.rot) m.rotation.set(...o.rot)
    if (o.scale) m.scale.set(...o.scale)
    m.castShadow = !o.flat
    m.receiveShadow = true
    ;(o.parent || scene).add(m)
    return m
  }
  const box = (w, h, d, key, x, y, z, o) => add(new THREE.BoxGeometry(w, h, d), key, x, y, z, o)
  const cyl = (r1, r2, h, key, x, y, z, o = {}) => add(new THREE.CylinderGeometry(r1, r2, h, o.seg || 8), key, x, y, z, o)
  const cone = (r, h, key, x, y, z, o = {}) => add(new THREE.ConeGeometry(r, h, o.seg || 7), key, x, y, z, o)
  const ball = (r, key, x, y, z, o = {}) => add(new THREE.SphereGeometry(r, 8, 6), key, x, y, z, o)
  const group = (x, y, z, ry = 0, s = 1) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g); return g }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f5a, 1.25))
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.3)
  sun.position.set(-30, 40, 22)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 52, bottom: -52, near: 1, far: 160 })
  sun.shadow.bias = -.0006
  sun.shadow.normalBias = .04
  scene.add(sun)

  box(39, 1.6, 39, 'grass', 0, -.8, 0, { flat: true })
  box(17, SCARP, 17, 'grass2', 11, SCARP / 2, -11)
  box(5, 1.5, 39, 'sand', -22, -.85, 0, { flat: true })
  box(12, 1.2, 51, 'water', -30.5, -1.1, -6, { flat: true })
  box(33.5, 1.2, 12, 'water', -7.75, -1.1, -25.5, { flat: true })
  box(26, 1.5, 3.4, 'sand', -6.5, -.86, -21.1, { flat: true })
  box(39, 1.6, 6.5, 'grass2', 0, -.8, 22.7, { flat: true })
  box(39, .1, 2.2, 'road', 0, .02, 21.4, { flat: true })
  for (let i = 0; i < 9; i++) box(1.6, .02, .18, 'white', -16 + i * 4, .08, 21.4, { flat: true })
  for (const [x, z, w, d] of [[-33, 6, 3.2, .5], [-29, -2, 2.6, .5], [-32, -14, 3.6, .5], [-12, -27, 3, .5], [-2, -24.6, 2.4, .5], [-28, -22, 2.8, .5], [-33.5, -27.5, 2, .5]]) box(w, .04, d, 'water2', x, -.47, z, { flat: true })
  for (const [x, z, r, s] of [[-13, 13, .4, 1.4], [3, 14.5, .2, 1.1], [-14, -13, 1, 1.2], [14, 13, .7, 1.3], [-2, -14.5, .3, 1], [15.5, 2, .2, .9], [8, -14, .5, 1.1], [-15.5, 0, .9, .8]]) box(3.2 * s, .06, 2 * s, 'grass3', x, groundY(x, z) + .02, z, { rot: [0, r, 0], flat: true })
  for (const [x, z, w, d] of [[2.6, 14.6, 1.5, 11.6], [5.6, 9.6, 6, 1.5], [-3.6, 6.6, 12, 1.2], [-9.4, 1, 1.2, 10]]) box(w, .05, d, 'path', x, .03, z, { flat: true })

  box(6.4, 2.2, 5, 'concrete', 8.6, 1.1, 6.2)
  box(2.4, 1.5, .3, 'dark', 7.2, .8, 8.72)
  box(5.6, 2.1, 3.2, 'glass', 8.6, 3.25, 5.4)
  box(6, .26, 3.7, 'dark', 8.6, 4.42, 5.4)
  box(6.4, .2, 1.9, 'wood', 8.6, 2.3, 7.9)
  box(8.6, .22, 3.2, 'wood', 8.6, .11, 10.6)
  for (let i = 0; i < 8; i++) box(.06, .23, 3.2, 'woodDark', 4.8 + i * 1.08, .12, 10.6, { flat: true })
  box(4.6, .14, 1.3, 'wood', 12.4, 1.02, 12.6)
  for (const sx of [-1.7, 1.7]) { box(.16, 1, 1.5, 'lime', 12.4 + sx, .5, 12.6, { rot: [0, 0, .12] }); box(.16, 1, 1.5, 'lime', 12.4 + sx * .82, .5, 12.6, { rot: [0, 0, -.12] }) }
  for (const sx of [-1.2, 0, 1.2]) for (const sz of [-1.05, 1.05]) box(.6, .5, .5, 'woodDark', 12.4 + sx, .25, 12.6 + sz)

  const cabin = (x, z, r, s = 1.9) => {
    const g = group(x, 0, z, r)
    box(1.5 * s, .95 * s, 1.25 * s, 'woodDark', 0, .55 * s, 0, { parent: g })
    box(1.75 * s, .16 * s, 1.5 * s, 'roof', 0, 1.1 * s, 0, { rot: [0, 0, .1], parent: g })
    box(.3 * s, .6 * s, .06, 'door', -.25 * s, .42 * s, .64 * s, { parent: g })
    box(.34 * s, .3 * s, .06, 'glass', .32 * s, .62 * s, .64 * s, { parent: g })
    box(.9 * s, .08, .5 * s, 'wood', 0, .1, .84 * s, { parent: g })
  }
  cabin(-8.4, 8.2, .2)
  cabin(-4.4, 10.4, -.15)
  cabin(-11.6, 4.2, .5)
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.3, 1.3]) box(.24, 2.3, .24, 'woodDark', 8.4 + sx, 1.15, -.2 + sz)
  box(4.8, .24, 3.4, 'roof', 8.4, 2.42, -.2)
  box(1.3, .7, 1.1, 'red', 8.1, .45, -.2)
  for (let i = 0; i < 4; i++) cyl(.2, .2, 1.2, 'wood', 9.5, .2 + (i % 2) * .38, -.9 + Math.floor(i / 2) * .42 + (i % 2) * .2, { rot: [0, 0, Math.PI / 2], seg: 6 })
  box(2.2, 1.7, .3, 'dark', 4.6, .95, -2.5)
  box(2.6, .2, .5, 'concrete', 4.6, 1.9, -2.5)

  const pine = (x, z, s = 1, k = 'pine') => { const y = groundY(x, z); cyl(.2 * s, .28 * s, 3 * s, 'trunk', x, y + 1.5 * s, z, { seg: 6 }); cone(1.6 * s, 2.3 * s, k, x, y + 3.4 * s, z); cone(1.2 * s, 2 * s, k, x, y + 4.6 * s, z); cone(.85 * s, 1.6 * s, k, x, y + 5.6 * s, z) }
  for (const p of [[-1.5, 1.5, 1.15], [1.6, 3.8, 1], [-3.4, 4.6, .9], [0, -1.2, 1.1], [-5, -.4, .95], [-1, 7.4, 1], [6, -9, .9], [10.2, -6.4, .85], [-10, -9.6, .9], [-1.6, -4.6, 1.05, 'pine2'], [2.2, 1, .8, 'pine2'], [-4, 1.6, .85, 'pine2'], [-15.5, 14.5, 1.1], [-12.5, 16.4, .9, 'pine2'], [-17, 10.6, .85], [17.6, 4.6, 1], [-10.4, 17.2, .85, 'pine2'], [17.4, 17.2, .8], [-16.6, -15.6, 1], [-13.4, -17, .85, 'pine2'], [16.6, -16.4, 1], [14, -13.4, .8, 'pine2'], [17.2, -4.4, .9], [-6.6, -15.6, .9], [1.4, -16.6, .85, 'pine2'], [-17.2, -3.4, .8], [-17.6, 17.4, .8], [-7, 15.6, .95, 'pine2']]) pine(...p)
  box(.16, 1.5, .16, 'woodDark', -2.5, .75, 2.9)
  box(2.3, .12, .9, 'red', -2.4, 1.1, 3.1, { rot: [0, 1.02, 0] })
  box(2.3, .12, .2, 'white', -2.4, 1.17, 3.1, { rot: [0, 1.02, 0] })

  for (let i = 0; i < 7; i++) box(.5, .36, .5, 'stone', -8.6 + Math.cos(i * .9) * 1.05, .18, -1.4 + Math.sin(i * .9) * 1.05, { rot: [0, i, 0] })
  cone(.56, 1.2, 'fire', -8.6, .7, -1.4, { seg: 5 })
  cone(.3, .7, 'yellow', -8.6, .55, -1.4, { seg: 5 })
  for (const a of [.4, 2.3, 4.2]) cyl(.22, .22, 1.5, 'wood', -8.6 + Math.cos(a) * 2.3, .22, -1.4 + Math.sin(a) * 2.3, { rot: [Math.PI / 2, 0, a], seg: 6 })

  const dig = group(-8.4, 0, -6.2, .9, 2.1)
  const P = { parent: dig }
  box(1.2, .42, .8, 'yellow', 0, .55, 0, P)
  box(.5, .5, .66, 'glass', -.25, 1.0, 0, P)
  box(1.0, .16, .16, 'yellow', .75, 1.12, 0, { rot: [0, 0, .6], ...P })
  box(.7, .14, .14, 'yellow', 1.3, 1.0, 0, { rot: [0, 0, -.9], ...P })
  box(.3, .26, .36, 'dark', 1.55, .58, 0, P)
  box(.5, .3, .8, 'yellow', -.82, .34, 0, P)
  for (const x of [-.4, .4]) for (const z of [-.42, .42]) cyl(.25, .25, .16, 'dark', x, .25, z, { rot: [Math.PI / 2, 0, 0], seg: 10, ...P })
  cone(1.5, 1.1, 'sand2', -4.6, .5, -8.6, { seg: 7 })
  cone(.9, .7, 'sand2', -3.2, .3, -7.2, { seg: 6 })

  const heli = group(-9.2, 0, -12.2, .7)
  const Hh = { parent: heli }
  cyl(2.6, 2.6, .08, 'concrete', 0, .04, 0, { seg: 14, flat: true, ...Hh })
  ball(1.15, 'heli', 0, 1.4, 0, { scale: [1.35, 1, 1], ...Hh })
  box(.9, .7, 1.5, 'glass', -1.0, 1.5, 0, Hh)
  box(2.4, .3, .3, 'heli', 2.2, 1.6, 0, Hh)
  box(.18, .8, .45, 'heli', 3.3, 1.9, 0, Hh)
  box(5.2, .07, .28, 'dark', 0, 2.65, 0, Hh)
  box(.28, .07, 5.2, 'dark', 0, 2.65, 0, Hh)
  for (const sz of [-.75, .75]) box(2.4, .1, .12, 'dark', 0, .12, sz, Hh)

  cyl(1.5, 1.5, .1, 'concrete', 9.8, SCARP + .05, -10.6, { seg: 12, flat: true })
  cyl(.05, .05, 3.4, 'dark', 10.4, SCARP + 1.7, -10.6)
  cyl(.32, .32, 2, 'white', 9.8, SCARP + 1.6, -10.6, { seg: 10 })
  cone(.32, .75, 'red', 9.8, SCARP + 3, -10.6, { seg: 10 })
  for (const a of [0, 2.1, 4.2]) box(.08, .65, .55, 'red', 9.8 + Math.cos(a) * .4, SCARP + .9, -10.6 + Math.sin(a) * .4, { rot: [0, -a, 0] })
  for (let i = 0; i < 4; i++) { box(2, .1, 1.2, 'panel', 4.4 + i * 2.3, SCARP + .8, -6.4, { rot: [-.5, 0, 0] }); box(.1, .7, .1, 'stone', 4.4 + i * 2.3, SCARP + .35, -6.1) }

  box(2.6, .46, 1, 'white', -21.6, .1, 4, { rot: [0, .4, 0] })
  box(.7, .5, .7, 'glass', -21.4, .5, 4, { rot: [0, .4, 0] })
  box(3.2, .3, .66, 'kayak', -21.8, .05, -3, { rot: [0, 1.3, 0] })
  box(3.2, .3, .66, 'teal', -22.6, .05, -6.4, { rot: [0, 1.5, 0] })
  box(2.6, .12, .8, 'red', -22, .02, 9.4, { rot: [0, 1.1, 0] })
  box(7.5, .2, 1.4, 'wood', -26.6, -.3, 11.6)
  for (const dx of [-3.2, 0, 3.2]) for (const dz of [-.6, .6]) cyl(.12, .12, 1.4, 'woodDark', -26.6 + dx, -.7, 11.6 + dz, { seg: 5 })
  for (let i = 0; i < 6; i++) box(.5, .34, .5, 'stone', -19.4 + Math.cos(i * 1.05) * .9, .17, -17.2 + Math.sin(i * 1.05) * .9, { rot: [0, i, 0] })
  cone(.42, .9, 'fire', -19.4, .55, -17.2, { seg: 5 })

  cyl(3.4, 3.8, 1.6, 'grass2', -25, -.9, -27, { seg: 9, flat: true })
  cone(1.1, 1.8, 'pine', -25.6, 1, -27.6)
  cone(.8, 1.4, 'pine2', -23.6, .8, -28.2)
  box(.34, .34, .6, 'white', -24.2, .16, -26.2)
  box(.3, .3, .5, 'dark', -25.8, .15, -25.6, { rot: [0, .8, 0] })
  box(.28, .28, .48, 'kayak', -23.4, .14, -26.9, { rot: [0, -.5, 0] })

  box(4.2, .2, 3, 'white', -2.6, 2.6, 24)
  for (const sx of [-1.8, 1.8]) box(.22, 2.6, .22, 'stone', -2.6 + sx, 1.3, 24)
  box(.7, 1.2, .5, 'red', -2.6, .6, 24)
  box(3, 1.5, 1.6, 'white', 3.4, .75, 24.6)
  box(3.2, .16, 1.8, 'red', 3.4, 1.58, 24.6)
  box(.6, .9, .06, 'glass', 3.4, .55, 23.78)

  for (let i = 0; i < 13; i++) if (i < 5 || i > 7) box(.14, 1, .14, 'woodDark', -18 + i * 3, .5, 19.3)
  box(14.5, .1, .1, 'woodDark', -11.9, .8, 19.3)
  box(14.5, .1, .1, 'woodDark', 11.9, .8, 19.3)
  box(.3, 1.5, .3, 'concrete', -3.4, .75, 19.3)
  box(.3, 1.5, .3, 'concrete', 3.4, .75, 19.3)
  const tesla = group(6.6, 0, 16.6, 1.2, 1.7)
  const Tt = { parent: tesla }
  box(1.7, .36, .82, 'black', 0, .42, 0, Tt)
  box(.95, .32, .74, 'glass', -.05, .76, 0, Tt)
  for (const x of [-.55, .55]) for (const z of [-.42, .42]) cyl(.22, .22, .14, 'dark', x, .22, z, { rot: [Math.PI / 2, 0, 0], seg: 10, ...Tt })
  for (const [x, z] of [[1.2, 18.6], [-20.4, 8.6], [-19.2, -19.6], [-1.4, -19.6]]) { cyl(.08, .1, 2.6, 'dark', x, 1.3, z, { seg: 6 }); ball(.26, 'yellow', x, 2.7, z) }
  return scene
}

export function isoCamera(aspect = 1) {
  const span = 37
  const camera = new THREE.OrthographicCamera(-span, span, span / aspect, -span / aspect, .1, 400)
  const e = THREE.MathUtils.degToRad(35), d = 130, a = Math.PI / 4
  camera.position.set(Math.sin(a) * Math.cos(e) * d - 8.9, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d - 1.1)
  camera.lookAt(-8.9, 1.2, -1.1)
  camera.updateProjectionMatrix()
  return camera
}
