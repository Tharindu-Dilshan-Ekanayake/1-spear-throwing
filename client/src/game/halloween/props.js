import { STYLE } from '../materials'

/**
 * Halloween props, as plain boxes for a BlockSet like everything else in the world, so
 * a whole graveyard still rides in one draw call. Each stands its thing on `y`, the
 * height of whatever it stands on; `s` scales it and `yaw` (radians) turns it, its
 * face looking down +Z at yaw 0.
 *
 * As in the rest of the world, no two faces share a plane: every face, eye and band
 * stands a clear step proud of what it's on.
 */

export const HALLOWEEN_COLORS = {
  pumpkin: '#ff7a1c',
  pumpkinRib: '#e8600f',
  stem: '#3d5a1e',
  candle: '#efe6d0',
  flame: '#ffb347',
  eyes: '#ffd23a',
  stone: '#8a8798',
  stoneDark: '#5d5a6b',
  bone: '#efe6d0',
  dark: '#1d1a24',
  iron: '#2a2630',
  wood: '#5a3a22',
  slime: '#7dff4a',
  witch: '#2a2236',
  witchBand: '#8a3cc7',
  ghost: '#f4f0ff',
}
const C = HALLOWEEN_COLORS

/**
 * A box at (dx, dy, dz) from (x, y, z) in a frame turned `yaw` about Y, turned with it.
 * dy is the box's bottom, as in BlockSet.addOn.
 */
function part(b, x, y, z, yaw, dx, dy, dz, sx, sy, sz, color, style = STYLE.STUDS) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  b.add(x + dx * c + dz * s, y + dy + sy / 2, z - dx * s + dz * c, sx, sy, sz, color, style, yaw)
}

/** A jack-o'-lantern: a ribbed pumpkin with a glowing face and a stem. */
export function jackOLantern(b, x, y, z, s = 1, yaw = 0, lit = true) {
  part(b, x, y, z, yaw, 0, 0, 0, 1 * s, 0.8 * s, 0.9 * s, C.pumpkin)
  for (const side of [-1, 1]) part(b, x, y, z, yaw, side * 0.55 * s, 0.05 * s, 0, 0.35 * s, 0.7 * s, 0.8 * s, C.pumpkinRib)
  part(b, x, y, z, yaw, 0, 0.8 * s, 0, 0.6 * s, 0.12 * s, 0.6 * s, C.pumpkinRib)
  part(b, x, y, z, yaw, 0, 0.92 * s, 0, 0.12 * s, 0.25 * s, 0.12 * s, C.stem, STYLE.SMOOTH)
  if (!lit) return
  // Eyes and a grin, standing 4 cm (at s = 1) proud of the front.
  const face = 0.46 * s
  for (const side of [-1, 1]) part(b, x, y, z, yaw, side * 0.22 * s, 0.42 * s, face, 0.18 * s, 0.16 * s, 0.06 * s, C.eyes, STYLE.GLOW)
  part(b, x, y, z, yaw, 0, 0.18 * s, face, 0.5 * s, 0.1 * s, 0.06 * s, C.eyes, STYLE.GLOW)
  part(b, x, y, z, yaw, 0, 0.28 * s, face, 0.12 * s, 0.1 * s, 0.06 * s, C.eyes, STYLE.GLOW)
}

/** A gravestone with a rounded top and a dark plaque, or now and then a stone cross. */
export function gravestone(b, x, y, z, s = 1, yaw = 0, rand = Math.random, color = C.stone) {
  part(b, x, y, z, yaw, 0, -0.05, 0, 1.1 * s, 0.23 * s, 0.6 * s, C.stoneDark, STYLE.STONE)
  if (rand() < 0.3) {
    part(b, x, y, z, yaw, 0, 0.1 * s, 0, 0.24 * s, 1.5 * s, 0.24 * s, color, STYLE.STONE)
    part(b, x, y, z, yaw, 0, 0.95 * s, 0, 0.85 * s, 0.22 * s, 0.18 * s, color, STYLE.STONE)
    return
  }
  part(b, x, y, z, yaw, 0, 0.1 * s, 0, 0.8 * s, 1.1 * s, 0.24 * s, color, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 1.2 * s, 0, 0.56 * s, 0.16 * s, 0.18 * s, color, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 0.55 * s, 0.12 * s, 0.4 * s, 0.32 * s, 0.06 * s, C.stoneDark, STYLE.SMOOTH)
}

/** A cluster of three candles of different heights, flames lit. */
export function candles(b, x, y, z, s = 1, rand = Math.random) {
  for (let i = 0; i < 3; i += 1) {
    const h = (0.3 + i * 0.13) * s
    const a = (i / 3) * Math.PI * 2 + rand()
    const cx = x + Math.cos(a) * 0.2 * s
    const cz = z + Math.sin(a) * 0.2 * s
    b.addOn(cx, y, cz, 0.12 * s, h, 0.12 * s, C.candle, STYLE.SMOOTH)
    b.addOn(cx, y + h, cz, 0.07 * s, 0.14 * s, 0.07 * s, C.flame, STYLE.GLOW)
  }
}

/** A skull: cranium, jaw, dark sockets and nose. */
export function skull(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, 0.16 * s, 0, 0.6 * s, 0.5 * s, 0.55 * s, C.bone, STYLE.SMOOTH)
  part(b, x, y, z, yaw, 0, 0, 0.05 * s, 0.4 * s, 0.2 * s, 0.4 * s, C.bone, STYLE.SMOOTH)
  for (const side of [-1, 1]) part(b, x, y, z, yaw, side * 0.14 * s, 0.34 * s, 0.28 * s, 0.15 * s, 0.14 * s, 0.06 * s, C.dark, STYLE.SMOOTH)
  part(b, x, y, z, yaw, 0, 0.22 * s, 0.28 * s, 0.08 * s, 0.08 * s, 0.06 * s, C.dark, STYLE.SMOOTH)
}

/** A bone lying on the ground: a shaft with a knob at each end. */
export function bone(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, 0.05 * s, 0, 1.2 * s, 0.14 * s, 0.14 * s, C.bone, STYLE.SMOOTH)
  for (const end of [-1, 1]) part(b, x, y, z, yaw, end * 0.65 * s, 0, 0, 0.26 * s, 0.24 * s, 0.3 * s, C.bone, STYLE.SMOOTH)
}

/** A coffin, its lid inlaid with a gold cross. */
export function coffin(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, 0, 0, 1 * s, 0.5 * s, 2.2 * s, '#4a2a2a', STYLE.PLANKS)
  part(b, x, y, z, yaw, 0, 0.5 * s, 0, 0.9 * s, 0.08 * s, 2 * s, '#5e3636', STYLE.PLANKS)
  part(b, x, y, z, yaw, 0, 0.58 * s, 0.1 * s, 0.12 * s, 0.03 * s, 0.9 * s, '#e0b030', STYLE.GLOW)
  part(b, x, y, z, yaw, 0, 0.58 * s, 0.3 * s, 0.5 * s, 0.03 * s, 0.12 * s, '#e0b030', STYLE.GLOW)
}

/** A witch's cauldron on three legs, bubbling green. */
export function cauldron(b, x, y, z, s = 1) {
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2
    b.addOn(x + Math.cos(a) * 0.5 * s, y, z + Math.sin(a) * 0.5 * s, 0.16 * s, 0.3 * s, 0.16 * s, C.iron, STYLE.SMOOTH)
  }
  b.addOn(x, y + 0.2 * s, z, 1.4 * s, 0.9 * s, 1.4 * s, '#22202a')
  // The brew stands a little proud of the pot; the rim round it a little prouder.
  b.addOn(x, y + 1.1 * s, z, 1.2 * s, 0.05 * s, 1.2 * s, C.slime, STYLE.GLOW)
  for (const side of [-1, 1]) {
    b.addOn(x, y + 1.05 * s, z + side * 0.7 * s, 1.56 * s, 0.16 * s, 0.18 * s, '#2e2a38', STYLE.SMOOTH)
    b.addOn(x + side * 0.7 * s, y + 1.05 * s, z, 0.18 * s, 0.16 * s, 1.22 * s, '#2e2a38', STYLE.SMOOTH)
  }
  b.addOn(x + 0.25 * s, y + 1.3 * s, z - 0.1 * s, 0.2 * s, 0.2 * s, 0.2 * s, C.slime, STYLE.GLOW)
  b.addOn(x - 0.2 * s, y + 1.55 * s, z + 0.15 * s, 0.13 * s, 0.13 * s, 0.13 * s, C.slime, STYLE.GLOW)
}

/** A pointed witch's hat with a purple band, lying where it fell. */
export function witchHat(b, x, y, z, s = 1) {
  b.addOn(x, y, z, 1.4 * s, 0.08 * s, 1.4 * s, C.witch, STYLE.SMOOTH)
  b.addOn(x, y + 0.08 * s, z, 0.84 * s, 0.14 * s, 0.84 * s, C.witchBand, STYLE.GLOW)
  let ty = y + 0.08 * s
  for (const w of [0.8, 0.58, 0.38, 0.2]) {
    b.addOn(x, ty, z, w * s, 0.42 * s, w * s, C.witch, STYLE.SMOOTH)
    ty += 0.38 * s
  }
}

/** A glowing toadstool with pale spots. */
export function mushroom(b, x, y, z, s = 1, color = '#b45cff') {
  b.addOn(x, y, z, 0.3 * s, 0.9 * s, 0.3 * s, '#e8e0d0', STYLE.SMOOTH)
  b.addOn(x, y + 0.85 * s, z, 1.2 * s, 0.35 * s, 1.2 * s, color, STYLE.GLOW)
  for (const [dx, dz] of [[-0.25, 0.2], [0.3, -0.15]]) b.addOn(x + dx * s, y + 1.16 * s, z + dz * s, 0.18 * s, 0.12 * s, 0.18 * s, '#ffffff', STYLE.SMOOTH)
}

/** A little ghost, floating with `y` under its hem: a pale body, a ragged hem, dark eyes. */
export function ghost(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, 0.3 * s, 0, 1 * s, 1 * s, 0.9 * s, C.ghost, STYLE.GLOW)
  part(b, x, y, z, yaw, 0, 1.25 * s, 0, 0.8 * s, 0.55 * s, 0.72 * s, C.ghost, STYLE.GLOW)
  for (const [dx, h] of [[-0.32, 0.36], [0, 0.22], [0.32, 0.3]]) part(b, x, y, z, yaw, dx * s, (0.34 - h) * s, 0, 0.3 * s, h * s, 0.7 * s, C.ghost, STYLE.GLOW)
  for (const side of [-1, 1]) part(b, x, y, z, yaw, side * 0.18 * s, 1.42 * s, 0.36 * s, 0.14 * s, 0.2 * s, 0.06 * s, C.dark, STYLE.SMOOTH)
  part(b, x, y, z, yaw, 0, 0.95 * s, 0.45 * s, 0.24 * s, 0.18 * s, 0.06 * s, C.dark, STYLE.SMOOTH)
}

/**
 * A scarecrow on its post: straw arms, a plaid shirt and a jack-o'-lantern for a head.
 * The post stops under the head and the crossbar inside the hands, so neither ends
 * flush with what's round it.
 */
export function scarecrow(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, -0.1, -0.2 * s, 0.16 * s, 2.15 * s, 0.16 * s, C.wood, STYLE.SMOOTH)
  part(b, x, y, z, yaw, 0, 1.75 * s, -0.2 * s, 1.9 * s, 0.14 * s, 0.14 * s, C.wood, STYLE.SMOOTH)
  part(b, x, y, z, yaw, 0, 1.05 * s, 0, 0.9 * s, 0.95 * s, 0.4 * s, '#b0402a', STYLE.PLANKS)
  for (const side of [-1, 1]) {
    part(b, x, y, z, yaw, side * 0.72 * s, 1.68 * s, 0, 0.56 * s, 0.28 * s, 0.32 * s, '#b0402a', STYLE.PLANKS)
    part(b, x, y, z, yaw, side * 1.08 * s, 1.62 * s, 0, 0.2 * s, 0.36 * s, 0.2 * s, '#e8c872', STYLE.STUDS)
  }
  part(b, x, y, z, yaw, 0, 0.3 * s, 0, 0.7 * s, 0.75 * s, 0.34 * s, '#3a4a6e', STYLE.PLANKS)
  jackOLantern(b, x, y + 2.05 * s, z, 0.6 * s, yaw)
}

/** An iron lamp post with a glowing lantern. */
export function lampPost(b, x, y, z, s = 1) {
  b.addOn(x, y, z, 0.5 * s, 0.3 * s, 0.5 * s, C.iron, STYLE.SMOOTH)
  b.addOn(x, y + 0.3 * s, z, 0.18 * s, 2.8 * s, 0.18 * s, C.iron, STYLE.SMOOTH)
  b.addOn(x, y + 3.1 * s, z, 0.5 * s, 0.08 * s, 0.5 * s, C.iron, STYLE.SMOOTH)
  b.addOn(x, y + 3.18 * s, z, 0.36 * s, 0.46 * s, 0.36 * s, C.flame, STYLE.GLOW)
  b.addOn(x, y + 3.64 * s, z, 0.52 * s, 0.1 * s, 0.52 * s, C.iron, STYLE.SMOOTH)
}

/** An iron fence from z0 to z1 along x: spiked posts every 1.2 m and two rails. */
export function ironFence(b, x, y, z0, z1, s = 1) {
  const len = Math.abs(z1 - z0)
  const zc = (z0 + z1) / 2
  b.addOn(x, y + 0.35 * s, zc, 0.1 * s, 0.1 * s, len, C.iron, STYLE.SMOOTH)
  b.addOn(x, y + 1.1 * s, zc, 0.1 * s, 0.1 * s, len, C.iron, STYLE.SMOOTH)
  for (let z = Math.min(z0, z1) + 0.1; z <= Math.max(z0, z1); z += 1.2) {
    b.addOn(x, y - 0.1, z, 0.14 * s, 1.5 * s, 0.14 * s, C.iron, STYLE.SMOOTH)
    b.add(x, y + 1.5 * s, z, 0.12 * s, 0.12 * s, 0.12 * s, C.iron, STYLE.SMOOTH, 0, 0.785, 0.785)
  }
}

/** A stone crypt: a stepped roof, pillars by a dark door facing `yaw`, a cross on top. */
export function crypt(b, x, y, z, s = 1, yaw = 0) {
  part(b, x, y, z, yaw, 0, -0.1, 0, 4.2 * s, 0.5 * s, 5 * s, C.stoneDark, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 0.4 * s, 0, 3.4 * s, 3 * s, 4.2 * s, '#6a6578', STYLE.STONE)
  part(b, x, y, z, yaw, 0, 3.4 * s, 0, 3.9 * s, 0.4 * s, 4.7 * s, C.stoneDark, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 3.8 * s, 0, 2.7 * s, 0.4 * s, 3.5 * s, C.stoneDark, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 4.2 * s, 0, 1.4 * s, 0.4 * s, 2.3 * s, C.stoneDark, STYLE.STONE)
  part(b, x, y, z, yaw, 0, 4.6 * s, 0, 0.22 * s, 1.1 * s, 0.22 * s, '#c9c2d6', STYLE.STONE)
  part(b, x, y, z, yaw, 0, 5.2 * s, 0, 0.7 * s, 0.2 * s, 0.18 * s, '#c9c2d6', STYLE.STONE)
  const front = 2.1 * s
  part(b, x, y, z, yaw, 0, 0.4 * s, front + 0.06 * s, 1.3 * s, 2.1 * s, 0.12 * s, C.dark, STYLE.SMOOTH)
  for (const side of [-1, 1]) part(b, x, y, z, yaw, side * 1.1 * s, 0.4 * s, front + 0.15 * s, 0.4 * s, 3 * s, 0.4 * s, '#7c768a', STYLE.STRIPES)
  part(b, x, y, z, yaw, 0, 1.6 * s, front + 0.14 * s, 0.24 * s, 0.24 * s, 0.06 * s, C.slime, STYLE.GLOW)
}

/** A cattail: three reeds topped with brown heads. */
export function cattails(b, x, y, z, rand = Math.random) {
  for (let k = 0; k < 3; k += 1) {
    const h = 1.2 + rand() * 0.9
    const cx = x + (k - 1) * 0.3
    const cz = z + (rand() - 0.5) * 0.4
    b.addOn(cx, y, cz, 0.1, h, 0.1, '#4f7a2a', STYLE.SMOOTH)
    b.addOn(cx, y + h, cz, 0.18, 0.42, 0.18, '#5a3a22', STYLE.STUDS)
  }
}

/**
 * A spooky tree for hilltops, the same footprint as the lobby's tiered trees: a dark
 * trunk forking into bare crooked branches, a few autumn leaves clinging to their ends.
 * Same arguments as terrain.js's addTree, so it can stand in for it.
 */
export function spookyTree(b, x, base, z, s = 1, rand = Math.random, leaves = ['#ff7a1c', '#e0560f', '#8a3cc7'], trunk = '#2b2233') {
  const h = (3.4 + rand() * 1.4) * s
  b.addOn(x, base - 0.2, z, 0.8 * s, h + 0.2, 0.8 * s, trunk)
  const turn = rand() * Math.PI * 2
  for (let i = 0; i < 3; i += 1) {
    const heading = turn + (i / 3) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const tilt = 0.7 + rand() * 0.35
    const len = (1.8 + rand() * 0.8) * s
    const fromY = base + h * (0.6 + i * 0.13)
    const dx = Math.sin(tilt) * Math.cos(heading)
    const dy = Math.cos(tilt)
    const dz = Math.sin(tilt) * Math.sin(heading)
    b.add(x + (dx * len) / 2, fromY + (dy * len) / 2, z + (dz * len) / 2, 0.36 * s, len, 0.36 * s, trunk, STYLE.STUDS, Math.PI - heading, 0, tilt)
    const ex = x + dx * len
    const ey = fromY + dy * len
    const ez = z + dz * len
    // A crooked twig up from the branch's end, and leaves on it.
    b.add(ex, ey + 0.45 * s, ez, 0.2 * s, 0.9 * s, 0.2 * s, trunk, STYLE.STUDS, heading, 0, 0.35)
    if (rand() < 0.75) b.add(ex, ey + 0.95 * s, ez, (0.75 + i * 0.08) * s, (0.6 + i * 0.05) * s, (0.75 + i * 0.08) * s, leaves[Math.floor(rand() * leaves.length)], STYLE.STUDS, rand() * 3)
  }
}

/** A tall haunted tower, pointed roof and glowing slit windows facing `yaw`. */
export function hauntedTower(b, x, z, w, h, yaw = 0, { wall = '#2e2436', roof = '#5a1020', glow = '#ff3b4a' } = {}) {
  part(b, x, 0, z, yaw, 0, -0.2, 0, w, h + 0.2, w, wall, STYLE.STONE)
  part(b, x, 0, z, yaw, 0, h, 0, w + 0.6, 0.5, w + 0.6, wall, STYLE.STONE)
  let ry = h + 0.5
  for (let k = 0; k < 5; k += 1) {
    const rw = (w + 0.2) * (1 - k * 0.19)
    part(b, x, 0, z, yaw, 0, ry, 0, rw, h * 0.09, rw, roof, STYLE.PLANKS)
    ry += h * 0.09
  }
  for (let k = 0; k < 3; k += 1) part(b, x, 0, z, yaw, 0, h * (0.3 + k * 0.22), w / 2 + 0.04, 0.5, 1.2, 0.12, glow, STYLE.GLOW)
}
