import { PropBuilder } from '../blocks'
import { STYLE } from '../materials'

/**
 * Voxel pets in the reference's style: a big blocky head with large glossy eyes on a
 * small body with stubby legs, plus a few blocks of species detail (ears, horns,
 * wings, tails, crowns).
 *
 * Every model sits on y = 0, faces +Z and is about one unit across and at most 1.5
 * tall. Each species is merged into one vertex-coloured geometry, built on first use
 * and shared by every copy of that pet in the game.
 */

const EYE_WHITE = '#ffffff'
const PUPIL = '#16161c'
const BLUSH = '#ff9fb5'

/** Head layout for four-legged pets: [centre y, centre z, front z, top y]. */
const HEAD = { y: 0.89, z: 0.2, front: 0.53, top: 1.22 }

/** Two big eyes with highlights on a front face at `z`, at height `y`. */
function eyes(p, { y = HEAD.y + 0.06, z = HEAD.front, spread = 0.19, size = 0.23, color = PUPIL, style = STYLE.SMOOTH } = {}) {
  for (const x of [-spread, spread]) {
    p.box(x, y, z + 0.01, size, size * 1.15, 0.04, EYE_WHITE, STYLE.SMOOTH)
    p.box(x, y - size * 0.07, z + 0.03, size * 0.66, size * 0.84, 0.04, color, style)
    p.box(x - size * 0.17, y + size * 0.2, z + 0.05, size * 0.26, size * 0.26, 0.03, EYE_WHITE, STYLE.SMOOTH)
  }
}

/** Pink cheeks under the eyes. */
const blush = (p, { y = HEAD.y - 0.12, z = HEAD.front, spread = 0.3 } = {}) => {
  for (const x of [-spread, spread]) p.box(x, y, z + 0.015, 0.12, 0.06, 0.03, BLUSH, STYLE.SMOOTH)
}

/**
 * A four-legged pet: legs, body and head, with an optional lighter muzzle and a nose.
 * `long` stretches the body backwards (camels, tigers).
 */
function quad(p, { fur, head = fur, legs = fur, muzzle = null, nose = '#2a1d1a', style = STYLE.STUDS, bodyW = 0.62, long = 0, eye = PUPIL, eyeStyle } = {}) {
  const bodyZ = -0.13 - long / 2
  const depth = 0.74 + long
  for (const x of [-0.21, 0.21]) {
    for (const z of [bodyZ + depth / 2 - 0.16, bodyZ - depth / 2 + 0.16]) p.box(x * (bodyW / 0.62), 0.11, z, 0.18, 0.22, 0.18, legs, STYLE.SMOOTH)
  }
  p.box(0, 0.45, bodyZ, bodyW, 0.5, depth, fur, style)
  p.box(0, HEAD.y, HEAD.z, 0.8, 0.66, 0.66, head, style)
  if (muzzle) p.box(0, HEAD.y - 0.18, HEAD.front + 0.04, 0.38, 0.22, 0.1, muzzle, STYLE.SMOOTH)
  eyes(p, { color: eye, style: eyeStyle })
  if (nose) p.box(0, HEAD.y - 0.1, HEAD.front + 0.1, 0.12, 0.07, 0.04, nose, STYLE.SMOOTH)
}

/** Pointed ears: a wide base and a narrow tip, with an inner colour. */
function pointyEars(p, color, inner = '#ffc2c9', { x = 0.27, h = 0.24, w = 0.22, tip = null } = {}) {
  for (const side of [-1, 1]) {
    p.box(side * x, HEAD.top + h * 0.3, HEAD.z - 0.05, w, h * 0.6, 0.16, color)
    p.box(side * x, HEAD.top + h * 0.8, HEAD.z - 0.05, w * 0.5, h * 0.4, 0.14, tip || color)
    if (inner) p.box(side * x, HEAD.top + h * 0.3, HEAD.z + 0.035, w * 0.5, h * 0.45, 0.02, inner, STYLE.SMOOTH)
  }
}

const roundEars = (p, color, inner) => {
  for (const side of [-1, 1]) {
    p.box(side * 0.32, HEAD.top + 0.08, HEAD.z - 0.05, 0.24, 0.2, 0.16, color)
    if (inner) p.box(side * 0.32, HEAD.top + 0.07, HEAD.z + 0.035, 0.12, 0.11, 0.02, inner, STYLE.SMOOTH)
  }
}

/** A tail off the back of the body, rising by `rise` towards its `tip`. */
function tail(p, color, { y = 0.6, len = 0.36, rise = 0.25, tip = null, thick = 0.13, back = -0.5 } = {}) {
  p.box(0, y, back - len / 2, thick, thick, len, color, STYLE.STUDS, [-rise, 0, 0])
  if (tip) p.box(0, y + Math.sin(rise) * len, back - len + 0.02, thick * 1.4, thick * 1.4, 0.16, tip)
}

/** Wings on the sides of the body: an inner panel and a raised outer tip. */
function wings(p, color, { span = 0.5, y = 0.62, x = 0.32, z = -0.15, glow = false, tip = null } = {}) {
  const style = glow ? STYLE.GLOW : STYLE.STUDS
  for (const side of [-1, 1]) {
    p.box(side * (x + span / 2), y, z, span, 0.3, 0.08, color, style, [0, 0, side * 0.35])
    p.box(side * (x + span * 0.9), y + 0.2, z, span * 0.55, 0.22, 0.08, tip || color, style, [0, 0, side * 0.65])
  }
}

/** Horns on the head top, leaning out. */
const horns = (p, color, { x = 0.26, h = 0.3, tilt = 0.3, style = STYLE.SMOOTH } = {}) => {
  for (const side of [-1, 1]) p.box(side * x, HEAD.top + h / 2 - 0.04, HEAD.z - 0.1, 0.11, h, 0.11, color, style, [0, 0, -side * tilt])
}

/**
 * A bird: round body, smaller head with a beak, wings on the sides and little feet.
 * Its face is at z = 0.37.
 */
function bird(p, { body, head = body, belly = null, beak = '#ffb01e', feet = '#ff9a1e', wing = body, eye = PUPIL, beakSize = 1, style = STYLE.STUDS } = {}) {
  for (const x of [-0.16, 0.16]) p.box(x, 0.06, 0.08, 0.16, 0.12, 0.24, feet, STYLE.SMOOTH)
  p.box(0, 0.45, -0.05, 0.74, 0.62, 0.72, body, style)
  if (belly) p.box(0, 0.4, 0.315, 0.46, 0.4, 0.02, belly, STYLE.SMOOTH)
  p.box(0, 0.95, 0.06, 0.62, 0.5, 0.56, head, style)
  eyes(p, { y: 1.0, z: 0.34, spread: 0.16, size: 0.19, color: eye })
  if (beak) p.box(0, 0.86, 0.42, 0.2 * beakSize, 0.12 * beakSize, 0.18 * beakSize, beak, STYLE.SMOOTH)
  wings(p, wing, { span: 0.26, y: 0.5, x: 0.37, z: -0.05 })
  p.box(0, 0.5, -0.46, 0.4, 0.1, 0.22, wing, STYLE.STUDS, [0.4, 0, 0])
}

const MODELS = {
  // --- Basic Egg ---
  cat: (p) => {
    quad(p, { fur: '#9aa3b2', muzzle: '#eef1f5', nose: '#ff7a9a' })
    pointyEars(p, '#9aa3b2')
    for (const x of [-0.14, 0, 0.14]) p.box(x, HEAD.top + 0.005, HEAD.z, 0.06, 0.02, 0.4, '#6d7584', STYLE.SMOOTH)
    for (const side of [-1, 1]) for (const dy of [-0.02, 0.05]) p.box(side * 0.43, HEAD.y - 0.12 + dy, HEAD.front - 0.02, 0.18, 0.02, 0.02, '#ffffff', STYLE.SMOOTH)
    tail(p, '#9aa3b2', { rise: 0.9, len: 0.5, tip: '#6d7584' })
    blush(p)
  },
  dog: (p) => {
    quad(p, { fur: '#c7884f', muzzle: '#f4dcb8', nose: '#1d1d24' })
    for (const side of [-1, 1]) p.box(side * 0.45, HEAD.y + 0.05, HEAD.z, 0.12, 0.42, 0.3, '#7a4a26', STYLE.STUDS, [0, 0, side * 0.12])
    p.box(0, HEAD.y - 0.31, HEAD.front + 0.08, 0.12, 0.1, 0.03, '#ff6f8f', STYLE.SMOOTH)
    p.box(0, HEAD.top + 0.02, HEAD.z + 0.05, 0.3, 0.05, 0.3, '#e0a46a', STYLE.SMOOTH)
    tail(p, '#c7884f', { rise: 0.7, len: 0.32 })
  },
  piggy: (p) => {
    quad(p, { fur: '#ffb3c6', nose: null })
    p.box(0, HEAD.y - 0.12, HEAD.front + 0.06, 0.32, 0.22, 0.14, '#ff8fae', STYLE.SMOOTH)
    for (const x of [-0.07, 0.07]) p.box(x, HEAD.y - 0.12, HEAD.front + 0.14, 0.06, 0.08, 0.02, '#b8456a', STYLE.SMOOTH)
    for (const side of [-1, 1]) p.box(side * 0.28, HEAD.top + 0.06, HEAD.z, 0.2, 0.14, 0.12, '#ff9ab5', STYLE.STUDS, [0, 0, -side * 0.3])
    p.box(0, 0.62, -0.53, 0.1, 0.1, 0.1, '#ff9ab5')
    p.box(0.06, 0.7, -0.57, 0.1, 0.1, 0.1, '#ff9ab5')
    blush(p)
  },
  bear: (p) => {
    quad(p, { fur: '#8a5a3a', muzzle: '#d8b48a', nose: '#2a1a10' })
    roundEars(p, '#8a5a3a', '#d8b48a')
    p.box(0, 0.45, 0.25, 0.4, 0.3, 0.02, '#d8b48a', STYLE.SMOOTH)
  },

  // --- Forest Egg ---
  fox: (p) => {
    quad(p, { fur: '#ff7a1e', muzzle: '#ffffff', legs: '#3a2210', nose: '#1d1d24' })
    pointyEars(p, '#ff7a1e', '#ffe0c2', { tip: '#3a2210', h: 0.28 })
    for (const side of [-1, 1]) p.box(side * 0.25, HEAD.y - 0.12, HEAD.front + 0.005, 0.28, 0.2, 0.02, '#ffffff', STYLE.SMOOTH)
    p.box(0, 0.62, -0.72, 0.3, 0.3, 0.5, '#ff7a1e', STYLE.STUDS, [-0.5, 0, 0])
    p.box(0, 0.8, -0.94, 0.26, 0.26, 0.18, '#ffffff', STYLE.STUDS, [-0.5, 0, 0])
  },
  deer: (p) => {
    quad(p, { fur: '#b9773e', muzzle: '#f4dcb8', nose: '#2a1a10', legs: '#8a5530' })
    for (const side of [-1, 1]) {
      p.box(side * 0.46, HEAD.y + 0.12, HEAD.z - 0.02, 0.2, 0.1, 0.12, '#b9773e', STYLE.STUDS, [0, 0, side * 0.3])
      // Antlers: a beam with two tines.
      p.box(side * 0.2, HEAD.top + 0.17, HEAD.z - 0.05, 0.07, 0.34, 0.07, '#e8d2a8', STYLE.SMOOTH, [0, 0, -side * 0.25])
      p.box(side * 0.33, HEAD.top + 0.25, HEAD.z - 0.05, 0.2, 0.06, 0.06, '#e8d2a8', STYLE.SMOOTH, [0, 0, side * 0.5])
      p.box(side * 0.26, HEAD.top + 0.34, HEAD.z - 0.05, 0.06, 0.16, 0.06, '#e8d2a8', STYLE.SMOOTH)
      for (const [y, z] of [[0.55, -0.05], [0.42, -0.3], [0.58, -0.36]]) p.box(side * 0.315, y, z, 0.02, 0.07, 0.07, '#ffffff', STYLE.SMOOTH)
    }
    p.box(0, 0.62, -0.52, 0.14, 0.14, 0.08, '#ffffff')
  },
  owl: (p) => {
    bird(p, { body: '#9b6b3a', head: '#9b6b3a', belly: '#e8d0a8', beak: '#ffb01e', wing: '#7a4f28', eye: '#ff8a00' })
    p.box(0, 0.98, 0.35, 0.52, 0.36, 0.02, '#f5e6c8', STYLE.SMOOTH)
    for (const side of [-1, 1]) p.box(side * 0.22, 1.25, 0.05, 0.12, 0.2, 0.1, '#7a4f28', STYLE.STUDS, [0, 0, -side * 0.35])
  },
  wolf: (p) => {
    quad(p, { fur: '#8d96a6', muzzle: '#eef1f5', legs: '#6d7584', nose: '#1d1d24', eye: '#2f8fe6', eyeStyle: STYLE.GLOW })
    pointyEars(p, '#8d96a6', '#c9d1dc', { h: 0.28 })
    p.box(0, HEAD.top + 0.01, HEAD.z - 0.1, 0.5, 0.03, 0.3, '#6d7584', STYLE.SMOOTH)
    p.box(0, 0.62, -0.7, 0.24, 0.24, 0.46, '#8d96a6', STYLE.STUDS, [-0.35, 0, 0])
    p.box(0, 0.72, -0.92, 0.2, 0.2, 0.14, '#eef1f5', STYLE.STUDS, [-0.35, 0, 0])
  },

  // --- Jungle Egg ---
  monkey: (p) => {
    quad(p, { fur: '#8a5a32', nose: null })
    p.box(0, HEAD.y - 0.04, HEAD.front + 0.005, 0.62, 0.5, 0.02, '#f1cfa0', STYLE.SMOOTH)
    p.box(0, HEAD.y - 0.18, HEAD.front + 0.04, 0.36, 0.18, 0.08, '#f1cfa0', STYLE.SMOOTH)
    p.box(0, HEAD.y - 0.2, HEAD.front + 0.085, 0.16, 0.03, 0.02, '#5a3418', STYLE.SMOOTH)
    for (const side of [-1, 1]) {
      p.box(side * 0.46, HEAD.y + 0.04, HEAD.z, 0.14, 0.24, 0.2, '#8a5a32')
      p.box(side * 0.535, HEAD.y + 0.04, HEAD.z, 0.02, 0.14, 0.12, '#f1cfa0', STYLE.SMOOTH)
    }
    p.box(0, 0.55, -0.62, 0.1, 0.1, 0.3, '#8a5a32')
    p.box(0, 0.75, -0.78, 0.1, 0.36, 0.1, '#8a5a32')
    p.box(0, 0.95, -0.7, 0.1, 0.1, 0.22, '#8a5a32')
  },
  toucan: (p) => {
    bird(p, { body: '#1d1d24', head: '#1d1d24', belly: '#ffffff', beak: '#ff9a1e', wing: '#2a2a33', beakSize: 1.4 })
    p.box(0, 0.98, 0.35, 0.52, 0.3, 0.02, '#ffffff', STYLE.SMOOTH)
    p.box(0, 0.96, 0.62, 0.22, 0.2, 0.3, '#ffd21f', STYLE.SMOOTH)
    p.box(0, 0.94, 0.8, 0.14, 0.14, 0.08, '#1d1d24', STYLE.SMOOTH)
    for (const side of [-1, 1]) p.box(side * 0.16, 1.0, 0.345, 0.26, 0.26, 0.01, '#3fb6ff', STYLE.SMOOTH)
  },
  frog: (p) => {
    for (const side of [-1, 1]) {
      p.box(side * 0.36, 0.08, 0.12, 0.26, 0.16, 0.34, '#3fae3a', STYLE.SMOOTH)
      p.box(side * 0.36, 0.1, -0.3, 0.3, 0.2, 0.36, '#3fae3a', STYLE.SMOOTH)
    }
    p.box(0, 0.4, -0.05, 0.86, 0.6, 0.84, '#5cd44a', STYLE.STUDS)
    p.box(0, 0.33, 0.375, 0.6, 0.34, 0.02, '#d8f5b0', STYLE.SMOOTH)
    for (const side of [-1, 1]) {
      p.box(side * 0.24, 0.8, 0.18, 0.3, 0.3, 0.3, '#5cd44a', STYLE.STUDS)
    }
    eyes(p, { y: 0.82, z: 0.33, spread: 0.24, size: 0.22 })
    p.box(0, 0.5, 0.39, 0.4, 0.04, 0.02, '#2a6a20', STYLE.SMOOTH)
    blush(p, { y: 0.56, z: 0.37, spread: 0.32 })
    for (const [x, z] of [[-0.2, -0.3], [0.15, -0.15], [0.05, -0.4]]) p.box(x, 0.71, z, 0.12, 0.02, 0.12, '#2f8f2a', STYLE.SMOOTH)
  },
  tiger: (p) => {
    quad(p, { fur: '#ff8a1e', muzzle: '#ffffff', nose: '#ff6f8f', long: 0.08 })
    pointyEars(p, '#ff8a1e', '#ffffff', { h: 0.2, tip: '#1d1d24' })
    for (const z of [-0.05, -0.25, -0.45]) for (const side of [-1, 1]) p.box(side * 0.315, 0.5, z, 0.02, 0.32, 0.07, '#1d1d24', STYLE.SMOOTH)
    for (const x of [-0.18, 0, 0.18]) p.box(x, HEAD.top + 0.005, HEAD.z - 0.02, 0.06, 0.02, 0.36, '#1d1d24', STYLE.SMOOTH)
    for (const side of [-1, 1]) p.box(side * 0.405, HEAD.y, HEAD.z + 0.1, 0.02, 0.06, 0.3, '#1d1d24', STYLE.SMOOTH)
    tail(p, '#ff8a1e', { rise: 0.6, len: 0.46, tip: '#1d1d24', back: -0.54 })
  },

  // --- Cactus Egg ---
  scorpion: (p) => {
    for (const side of [-1, 1]) {
      for (const z of [0.1, -0.1, -0.3]) p.box(side * 0.4, 0.12, z, 0.28, 0.06, 0.06, '#7a2a1a', STYLE.SMOOTH, [0, 0, side * -0.3])
      // Claws: an arm forward and a pincer.
      p.box(side * 0.3, 0.3, 0.42, 0.12, 0.12, 0.34, '#b8452a')
      p.box(side * 0.34, 0.32, 0.66, 0.26, 0.2, 0.2, '#d8603a')
      p.box(side * 0.26, 0.32, 0.8, 0.07, 0.12, 0.16, '#d8603a')
    }
    p.box(0, 0.3, 0.0, 0.6, 0.36, 0.72, '#b8452a', STYLE.STUDS)
    eyes(p, { y: 0.4, z: 0.36, spread: 0.13, size: 0.16 })
    // The tail arches up and over the back to a glowing sting.
    const segs = [[0.38, -0.42, 0.3], [0.62, -0.5, 0.9], [0.9, -0.42, 1.5], [1.1, -0.22, 2.1]]
    for (const [y, z, a] of segs) p.box(0, y, z, 0.2, 0.2, 0.24, '#b8452a', STYLE.STUDS, [-a, 0, 0])
    p.box(0, 1.12, -0.02, 0.14, 0.14, 0.2, '#ff3b1e', STYLE.GLOW, [2.5, 0, 0])
  },
  camel: (p) => {
    quad(p, { fur: '#d9a35a', muzzle: '#f2cf96', nose: '#5a3418', long: 0.1 })
    roundEars(p, '#d9a35a', '#b8803e')
    p.box(0, 0.82, -0.3, 0.42, 0.24, 0.36, '#c98f48', STYLE.STUDS)
    p.box(0, 0.98, -0.3, 0.26, 0.12, 0.22, '#c98f48', STYLE.STUDS)
    p.box(0, 0.72, -0.13, 0.66, 0.06, 0.3, '#d8263a', STYLE.SMOOTH)
    p.box(0, HEAD.y + 0.15, HEAD.front + 0.004, 0.62, 0.05, 0.02, '#7a4a26', STYLE.SMOOTH)
  },
  cobra: (p) => {
    const coils = [[0.12, 0.88], [0.32, 0.72], [0.5, 0.56]]
    coils.forEach(([y, w], i) => p.box(0, y, -0.1, w, 0.2, w, i % 2 ? '#3fa34d' : '#2f8a3c', STYLE.STUDS, [0, i * 0.4, 0]))
    p.box(0, 0.74, 0.05, 0.3, 0.36, 0.3, '#3fa34d', STYLE.STUDS)
    // The hood, flared behind the head, with a gold mark on its back.
    p.box(0, 1.06, -0.02, 0.86, 0.5, 0.12, '#2f8a3c', STYLE.STUDS)
    p.box(0, 1.08, -0.085, 0.3, 0.22, 0.02, '#ffd21f', STYLE.GLOW)
    p.box(0, 1.06, 0.12, 0.5, 0.42, 0.34, '#3fa34d', STYLE.STUDS)
    p.box(0, 0.98, 0.295, 0.3, 0.2, 0.02, '#f2e6a0', STYLE.SMOOTH)
    eyes(p, { y: 1.12, z: 0.29, spread: 0.12, size: 0.16, color: '#ffd21f' })
    p.box(0, 0.94, 0.36, 0.04, 0.12, 0.04, '#ff3b5c', STYLE.SMOOTH)
  },
  fennec: (p) => {
    quad(p, { fur: '#f2c58a', muzzle: '#ffffff', nose: '#1d1d24' })
    for (const side of [-1, 1]) {
      p.box(side * 0.3, HEAD.top + 0.18, HEAD.z - 0.06, 0.28, 0.44, 0.12, '#f2c58a', STYLE.STUDS, [0, 0, -side * 0.28])
      p.box(side * 0.3, HEAD.top + 0.18, HEAD.z + 0.005, 0.16, 0.32, 0.02, '#ffd9df', STYLE.SMOOTH, [0, 0, -side * 0.28])
    }
    p.box(0, 0.6, -0.72, 0.28, 0.28, 0.48, '#f2c58a', STYLE.STUDS, [-0.45, 0, 0])
    p.box(0, 0.78, -0.92, 0.24, 0.24, 0.14, '#3a2210', STYLE.STUDS, [-0.45, 0, 0])
  },

  // --- Shadow Egg ---
  bat: (p) => {
    bird(p, { body: '#4a2a6a', head: '#4a2a6a', belly: '#7a5a9a', beak: null, feet: '#2a1840', wing: '#2a1840', eye: '#ff3b6b' })
    pointyEarsBird(p, '#4a2a6a')
    for (const x of [-0.07, 0.07]) p.box(x, 0.84, 0.345, 0.05, 0.08, 0.02, '#ffffff', STYLE.SMOOTH)
    wings(p, '#2a1840', { span: 0.6, y: 0.66, x: 0.37, z: -0.05, tip: '#5a3a8a' })
  },
  shadowWolf: (p) => {
    quad(p, { fur: '#2a2140', muzzle: '#4a3a6e', legs: '#1a142a', nose: '#9a6bff', eye: '#c08bff', eyeStyle: STYLE.GLOW })
    pointyEars(p, '#2a2140', '#9a6bff', { h: 0.3 })
    for (const side of [-1, 1]) for (const z of [-0.05, -0.3]) p.box(side * 0.315, 0.55, z, 0.02, 0.06, 0.18, '#b47cff', STYLE.GLOW)
    p.box(0, 0.72, -0.13, 0.08, 0.06, 0.7, '#b47cff', STYLE.GLOW)
    p.box(0, 0.62, -0.7, 0.24, 0.24, 0.46, '#2a2140', STYLE.STUDS, [-0.35, 0, 0])
    p.box(0, 0.72, -0.92, 0.2, 0.2, 0.14, '#9a6bff', STYLE.GLOW, [-0.35, 0, 0])
  },
  demon: (p) => {
    quad(p, { fur: '#ff3b1e', head: '#e8321a', legs: '#1d0a0a', nose: null, style: STYLE.LAVA, eye: '#ffd23a', eyeStyle: STYLE.GLOW })
    horns(p, '#2a1a1a', { h: 0.34, tilt: 0.35 })
    p.box(0, HEAD.y - 0.2, HEAD.front + 0.01, 0.34, 0.05, 0.02, '#1d0a0a', STYLE.SMOOTH)
    for (const x of [-0.1, 0.1]) p.box(x, HEAD.y - 0.25, HEAD.front + 0.01, 0.05, 0.08, 0.02, '#ffffff', STYLE.SMOOTH)
    wings(p, '#a8162a', { span: 0.55, y: 0.7, z: -0.2 })
    tail(p, '#1d0a0a', { rise: 0.4, len: 0.5, tip: '#ff3b1e' })
  },
  shadowDragon: (p) => {
    quad(p, { fur: '#2e1d52', head: '#3a2466', muzzle: '#4a3a7e', legs: '#1a1030', nose: '#c08bff', eye: '#5cf0ff', eyeStyle: STYLE.GLOW, long: 0.06 })
    horns(p, '#c08bff', { h: 0.36, tilt: 0.42, style: STYLE.GLOW })
    for (let i = 0; i < 4; i += 1) p.box(0, 0.74, 0.08 - i * 0.2, 0.08, 0.14, 0.1, '#c08bff', STYLE.GLOW)
    p.box(0, 0.42, 0.2, 0.4, 0.26, 0.02, '#8a5cff', STYLE.GLOW)
    wings(p, '#4a2a8a', { span: 0.62, y: 0.78, z: -0.2, tip: '#8a5cff' })
    tail(p, '#2e1d52', { rise: 0.3, len: 0.5, tip: '#c08bff', back: -0.52 })
  },

  // --- Rewards and the shop ---
  duck: (p) => {
    bird(p, { body: '#ffe14a', head: '#ffe14a', belly: '#fff3a8', beak: '#ff9a1e', feet: '#ff8a1e', wing: '#ffd21f', beakSize: 1.2 })
    p.box(0, 0.84, 0.47, 0.28, 0.06, 0.2, '#ff9a1e', STYLE.SMOOTH)
    p.box(0.06, 1.24, 0.02, 0.06, 0.12, 0.06, '#ffd21f')
    blush(p, { y: 0.9, z: 0.33, spread: 0.24 })
  },
  crab: (p) => {
    for (const side of [-1, 1]) {
      for (const z of [0.05, -0.15]) p.box(side * 0.5, 0.12, z, 0.3, 0.06, 0.06, '#d8352a', STYLE.SMOOTH, [0, 0, side * -0.4])
      p.box(side * 0.24, 0.85, 0.2, 0.07, 0.3, 0.07, '#ff4a3a')
      p.box(side * 0.24, 1.04, 0.2, 0.22, 0.22, 0.22, '#ffffff', STYLE.SMOOTH)
      p.box(side * 0.24, 1.03, 0.315, 0.12, 0.14, 0.02, PUPIL, STYLE.SMOOTH)
      p.box(side * 0.6, 0.5, 0.26, 0.3, 0.3, 0.3, '#ff4a3a')
      p.box(side * 0.68, 0.72, 0.32, 0.24, 0.16, 0.2, '#ff6a5a')
    }
    p.box(0, 0.42, 0, 0.92, 0.5, 0.74, '#ff4a3a', STYLE.STUDS)
    p.box(0, 0.36, 0.375, 0.5, 0.22, 0.02, '#ffb0a0', STYLE.SMOOTH)
    p.box(0, 0.5, 0.375, 0.24, 0.04, 0.02, '#8a1a12', STYLE.SMOOTH)
  },
  kingDoggy: (p) => {
    quad(p, { fur: '#ffad42', muzzle: '#fff1d6', nose: '#1d1d24' })
    pointyEars(p, '#ffad42', '#fff1d6', { h: 0.2 })
    // Cool shades over the eyes.
    p.box(0, HEAD.y + 0.06, HEAD.front + 0.07, 0.66, 0.2, 0.04, '#16161c', STYLE.SMOOTH)
    for (const x of [-0.24, 0.12]) p.box(x, HEAD.y + 0.1, HEAD.front + 0.1, 0.08, 0.04, 0.02, '#ffffff', STYLE.SMOOTH)
    // A gold crown set with gems.
    p.box(0, HEAD.top + 0.06, HEAD.z, 0.66, 0.14, 0.5, '#ffd21f', STYLE.GLOW)
    for (const x of [-0.24, 0, 0.24]) p.box(x, HEAD.top + 0.2, HEAD.z + 0.2, 0.1, 0.16, 0.08, '#ffd21f', STYLE.GLOW)
    for (const [x, c] of [[-0.18, '#ff3b5c'], [0, '#3fb6ff'], [0.18, '#3fdc4a']]) p.box(x, HEAD.top + 0.06, HEAD.z + 0.255, 0.08, 0.08, 0.02, c, STYLE.GLOW)
    // A royal red cape, gold-trimmed.
    p.box(0, 0.48, -0.53, 0.7, 0.52, 0.06, '#d8263a', STYLE.SMOOTH, [0.2, 0, 0])
    p.box(0, 0.24, -0.58, 0.72, 0.06, 0.07, '#ffd21f', STYLE.GLOW, [0.2, 0, 0])
    tail(p, '#ffad42', { rise: 1.0, len: 0.3, back: -0.56 })
  },
}

/** Bat ears on a bird-shaped head. */
function pointyEarsBird(p, color) {
  for (const side of [-1, 1]) {
    p.box(side * 0.2, 1.3, 0.04, 0.16, 0.24, 0.1, color, STYLE.STUDS, [0, 0, -side * 0.2])
    p.box(side * 0.2, 1.28, 0.095, 0.08, 0.14, 0.02, '#ff9ab5', STYLE.SMOOTH, [0, 0, -side * 0.2])
  }
}

const cache = new Map()

/** Shared geometry for a pet species. */
export function petGeometry(id) {
  if (!cache.has(id)) {
    const p = new PropBuilder()
    ;(MODELS[id] || MODELS.cat)(p)
    cache.set(id, p.build())
  }
  return cache.get(id)
}

export const PET_IDS = Object.keys(MODELS)
