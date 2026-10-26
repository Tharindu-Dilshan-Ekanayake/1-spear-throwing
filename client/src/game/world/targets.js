import { Matrix4, OctahedronGeometry, SphereGeometry, TorusGeometry } from 'three'

import { LANE_COUNT, LANE_DECK_HEIGHT, LANE_TARGET_Z, laneCenterX } from '@shared/world'

import { disc, star } from '../geometry'
import { STYLE } from '../materials'

/**
 * The archery target at the end of each training lane: a thick round boss with painted
 * rings, propped on an easel, a couple of spears already stuck in it. Every lane's
 * target is its own design, richer the better the lane: straw and wood, a meadow
 * target, stone, amethyst, gold with sun rays, a lava target crowned with flames, a
 * red crystal one ringed with shards, rainbow and galaxy.
 *
 * All nine are merged into the props mesh, so they cost nothing extra to draw.
 */

/**
 * Height of the target's centre above the deck it stands on; its plinth top is 0.8 up.
 */
export const TARGET_Y = 3
/** Where training shots aim: the target's face, which looks north up its lane. */
export const targetPoint = (lane) => [laneCenterX(lane), LANE_DECK_HEIGHT + TARGET_Y, LANE_TARGET_Z - 0.35]

/**
 * Designs are written facing +Z at the origin (z = 0 is the boss's middle, y = 0 the
 * deck) and turned to face north (-Z) at their lane's end by buildTargets.
 */
const BOSS_DEPTH = 0.45
const FACE = BOSS_DEPTH / 2
const RADII = [1.45, 1.16, 0.87, 0.58, 0.29]

/**
 * The easel: two front legs splayed and leaning back, a back leg, and the shelf the
 * boss sits on. Legs stand on the plinth top (0.8).
 */
function easel(p, wood, style = STYLE.SMOOTH) {
  for (const side of [-1, 1]) p.box(side * 0.85, 2.6, -0.45, 0.2, 3.7, 0.2, wood, style, [-0.12, 0, side * 0.16])
  p.box(0, 2.4, -1.1, 0.2, 3.4, 0.2, wood, style, [0.42, 0, 0])
  p.box(0, 1.42, -0.12, 2.6, 0.2, 0.5, wood, style)
}

/** The boss and its rings, outermost first: [colour, style?] per ring. */
function face(p, boss, rings, bossStyle = STYLE.STUDS) {
  p.add(disc(1.55, BOSS_DEPTH, 32), { position: [0, TARGET_Y, 0], color: boss, style: bossStyle })
  rings.forEach(([color, style = STYLE.SMOOTH], i) => {
    p.add(disc(RADII[i], 0.06, 32), { position: [0, TARGET_Y, FACE + 0.035 + i * 0.022], color, style })
  })
}

/**
 * A spear stuck in the face at (x, y), its butt towards the thrower, angled up by `up`
 * and sideways by `side` (radians).
 */
function stuckSpear(p, x, y, up, side, shaft, accent) {
  const len = 1.9
  const dx = Math.sin(side)
  const dy = Math.cos(side) * Math.sin(up)
  const dz = Math.cos(side) * Math.cos(up)
  const at = (t) => [x + dx * t, TARGET_Y + y + dy * t, FACE + 0.1 + dz * t]
  const rotation = [-up, side, 0]
  p.box(...at(len / 2 - 0.15), 0.07, 0.07, len, shaft, STYLE.SMOOTH, rotation)
  p.box(...at(len * 0.62), 0.095, 0.095, 0.4, accent, STYLE.SMOOTH, rotation)
  p.box(...at(len - 0.1), 0.1, 0.1, 0.1, accent, STYLE.SMOOTH, rotation)
}

const FITA = [['#ffffff'], ['#1d1f26'], ['#2f8fe6'], ['#e8232f'], ['#ffd21f']]

const DESIGNS = [
  // 0: classic straw target on a wooden easel.
  (p) => {
    easel(p, '#7a4a26')
    face(p, '#e3c27a', FITA)
    stuckSpear(p, -0.62, 0.42, 0.18, -0.2, '#a8703f', '#6b3e1f')
    stuckSpear(p, 0.5, -0.55, -0.1, 0.25, '#a8703f', '#6b3e1f')
  },
  // 1: meadow target, leaves tucked round its rim.
  (p) => {
    easel(p, '#6b3e1f')
    face(p, '#7fd45a', [['#ffffff'], ['#1d6b2a'], ['#57c443'], ['#a7f06a'], ['#ffe45c', STYLE.GLOW]])
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2
      p.box(Math.cos(a) * 1.55, TARGET_Y + Math.sin(a) * 1.55, 0, 0.5, 0.26, 0.5, i % 2 ? '#2fae3a' : '#3fd44a', STYLE.STUDS, [0, 0, a + 0.6])
    }
    stuckSpear(p, 0.55, 0.5, 0.2, 0.2, '#9a6a3e', '#d8b47a')
  },
  // 2: blue target in a stone frame.
  (p) => {
    easel(p, '#d9e3f0', STYLE.STONE)
    face(p, '#d9e3f0', [['#ffffff'], ['#1f3c96'], ['#3f8fff'], ['#8fd8ff'], ['#ffffff', STYLE.GLOW]], STYLE.STONE)
    p.add(new TorusGeometry(1.58, 0.12, 6, 32), { position: [0, TARGET_Y, 0.1], color: '#5fd6ff', style: STYLE.GLOW })
    stuckSpear(p, -0.45, -0.5, -0.05, -0.25, '#6e4a2c', '#efe2c2')
    stuckSpear(p, 0.6, 0.3, 0.15, 0.15, '#6e4a2c', '#efe2c2')
  },
  // 3: amethyst target with a gem in the gold.
  (p) => {
    easel(p, '#3a1d6e')
    face(p, '#5b28c4', [['#ead6ff'], ['#3a1d6e'], ['#8a4dff'], ['#c69bff'], ['#ffffff']])
    p.add(new OctahedronGeometry(1, 0), { position: [0, TARGET_Y, FACE + 0.3], scale: [0.32, 0.42, 0.2], color: '#b47cff', style: STYLE.GLOW })
    for (const side of [-1, 1]) {
      p.add(new OctahedronGeometry(1, 0), { position: [side * 1.75, TARGET_Y + 0.9, 0], scale: [0.22, 0.5, 0.22], color: '#ead6ff', style: STYLE.GLOW })
    }
    stuckSpear(p, -0.55, 0.5, 0.15, -0.15, '#55301c', '#2fc9a6')
  },
  // 4: golden sun target.
  (p) => {
    easel(p, '#c48a12', STYLE.STRIPES)
    p.add(star(16, 2.25, 1.55, 0.2), { position: [0, TARGET_Y, -0.18], color: '#ffd02a', style: STYLE.GLOW })
    face(p, '#c48a12', [['#fff3b0'], ['#c48a12'], ['#ffd21f'], ['#fff16c'], ['#ffffff', STYLE.GLOW]])
    stuckSpear(p, 0.5, 0.55, 0.2, 0.2, '#3a3d4a', '#626d7a')
    stuckSpear(p, -0.62, -0.35, 0.0, -0.22, '#3a3d4a', '#626d7a')
  },
  // 5: lava target, crowned with flames.
  (p) => {
    easel(p, '#241414', STYLE.STUDS)
    face(p, '#2b1609', [['#3a2420'], ['#ff7a14', STYLE.GLOW], ['#241414'], ['#ffb347', STYLE.GLOW], ['#ff3b1e', STYLE.GLOW]], STYLE.LAVA)
    for (let i = -2; i <= 2; i += 1) {
      const a = Math.PI / 2 + i * 0.32
      const h = 0.7 + (2 - Math.abs(i)) * 0.25
      p.box(Math.cos(a) * 1.6, TARGET_Y + Math.sin(a) * 1.6 + h / 2, 0, 0.3, h, 0.3, i % 2 ? '#ff5a1c' : '#ffb347', STYLE.GLOW, [0, 0.785, 0])
    }
    stuckSpear(p, -0.5, 0.4, 0.12, -0.2, '#2f3d2b', '#79a63a')
  },
  // 6: red crystal target ringed with shards.
  (p) => {
    easel(p, '#3a0810')
    face(p, '#3a0810', [['#ffd6d6'], ['#3a0810'], ['#ff2a3a', STYLE.GLOW], ['#ffb3b3'], ['#ff2a3a', STYLE.GLOW]])
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.2
      p.add(new OctahedronGeometry(1, 0), { position: [Math.cos(a) * 1.85, TARGET_Y + Math.sin(a) * 1.85, -0.05], rotation: [0, 0, a - Math.PI / 2], scale: [0.18, 0.5, 0.18], color: i % 2 ? '#ff2a3a' : '#ffb3b3', style: STYLE.GLOW })
    }
    stuckSpear(p, 0.45, -0.45, -0.05, 0.22, '#24317e', '#ffd21f')
    stuckSpear(p, -0.5, 0.5, 0.18, -0.12, '#24317e', '#ffd21f')
  },
  // 7: rainbow target, VERY OP!
  (p) => {
    easel(p, '#ffffff', STYLE.RAINBOW)
    face(p, '#ffffff', [['#ffffff'], ['#ff4fd8', STYLE.GLOW], ['#2fc6ff', STYLE.GLOW], ['#ffe53b', STYLE.GLOW], ['#ff3b5c', STYLE.GLOW]])
    const hues = ['#ff3b5c', '#ff8a1f', '#ffe53b', '#4ef05a', '#2fc6ff', '#5a6cff', '#c35cff', '#ff4fd8']
    hues.forEach((color, i) => {
      const g = new TorusGeometry(1.8, 0.22, 6, 6, (Math.PI * 2) / hues.length + 0.02)
      p.add(g, { position: [0, TARGET_Y, -0.05], rotation: [0, 0, (i / hues.length) * Math.PI * 2], color, style: STYLE.GLOW })
    })
    stuckSpear(p, -0.5, -0.45, 0.0, -0.2, '#e9eef5', '#3f7fe6')
  },
  // 8: galaxy target, BEST OVERALL!
  (p) => {
    easel(p, '#0f1340', STYLE.GALAXY)
    face(p, '#101650', [['#7a5cff', STYLE.GLOW], ['#101650', STYLE.GALAXY], ['#66e3ff', STYLE.GLOW], ['#1b2266', STYLE.GALAXY], ['#ffffff', STYLE.GLOW]], STYLE.GALAXY)
    p.add(new SphereGeometry(0.42, 16, 10), { position: [0, TARGET_Y, FACE + 0.35], color: '#9a5cff', style: STYLE.GLOW })
    p.add(new TorusGeometry(2.0, 0.08, 6, 40), { position: [0, TARGET_Y, 0], rotation: [1.2, 0.35, 0], color: '#66e3ff', style: STYLE.GLOW })
    p.add(new TorusGeometry(2.2, 0.06, 6, 40), { position: [0, TARGET_Y, 0], rotation: [-0.9, -0.5, 0.4], color: '#ff7ad9', style: STYLE.GLOW })
    stuckSpear(p, 0.55, 0.45, 0.18, 0.2, '#1d1240', '#7a5cff')
  },
]

export function buildTargets(props) {
  const turn = new Matrix4()
  for (let i = 0; i < LANE_COUNT; i += 1) {
    props.transform = turn.makeRotationY(Math.PI).setPosition(laneCenterX(i), LANE_DECK_HEIGHT, LANE_TARGET_Z)
    DESIGNS[i](props)
  }
  props.transform = null
}
