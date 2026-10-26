import { Color, Matrix4, Quaternion, Vector3 } from 'three'

/**
 * Every spear's aura: a soft glow along it, and particles of its own kind round it -
 * sparkles, embers, leaves, frost, lightning, stars - in its own colours.
 *
 * The aura is drawn with glow quads (see glow.js): AURA_SLOTS of them per spear, the
 * first HALO_SLOTS being the soft glow (kept on every preset), the rest the particles
 * (only where the preset has particles). Particle motion is worked out from time and
 * slot number alone - no per-particle state - in the spear's own frame: along +Z, butt
 * at -1.2, tip at 1.55, grip at the origin.
 */

export const HALO_SLOTS = 2
export const AURA_SLOTS = 16

/**
 * Looks by spear id. `aura` is the particle kind, `colors` its palette (the first is
 * also the glow's), `trail` the flight trail's [head, tail] colours, `rainbow` a trail
 * cycling through every hue instead.
 */
export const SPEAR_FX = {
  paper: { aura: 'glint', colors: ['#ffe9a8', '#fff6d8'], trail: ['#fff3d0', '#c98a4b'] },
  sky: { aura: 'dust', colors: ['#cfe9ff', '#9fb2c6', '#ffffff'], trail: ['#e8f4ff', '#7f93a8'] },
  newspaper: { aura: 'bubbles', colors: ['#8fe6ff', '#ffffff', '#5fc8ff'], trail: ['#bff4ff', '#2f8fe6'] },
  cardboard: { aura: 'sparkle', colors: ['#ffbe5c', '#ffe066', '#ffffff'], trail: ['#ffe2a0', '#d62f2f'] },
  racer: { aura: 'embers', colors: ['#ff9a6a', '#ffd84a', '#ff5a1c'], trail: ['#ffd0a0', '#ff4a1c'] },
  ocean: { aura: 'sparkle', colors: ['#bcd6ff', '#ffffff', '#8fb2ff'], trail: ['#e0ecff', '#5f7fd8'] },
  jungle: { aura: 'leaves', colors: ['#a6ff6e', '#4fcf3a', '#2f9f3a'], trail: ['#d8ffb0', '#2f9f3a'] },
  royal: { aura: 'sparkle', colors: ['#ffd21f', '#8fc8ff', '#ffffff'], trail: ['#fff3b0', '#3f6fe0'] },
  crystal: { aura: 'frost', colors: ['#9fe8ff', '#ffffff', '#c2ecff'], trail: ['#e0faff', '#3f9cff'] },
  golden: { aura: 'souls', colors: ['#f2d7a0', '#fff8e0', '#ffe2b0'], trail: ['#fff3d0', '#b08a5a'] },
  candy: { aura: 'embers', colors: ['#ff7a4a', '#ffb347', '#ff3b1e'], trail: ['#ffd0b0', '#b8382c'] },
  ice: { aura: 'souls', colors: ['#c8ff9a', '#7fff8a', '#ffffff'], trail: ['#e8ffd0', '#3fbf4a'] },
  lava: { aura: 'embers', colors: ['#ff5a1c', '#ffb347', '#ffe066'], trail: ['#ffe066', '#ff3b1e'] },
  thunder: { aura: 'bolts', colors: ['#ffe14a', '#ffffff', '#7fd2ff'], trail: ['#fffbd0', '#ffd21f'] },
  neon: { aura: 'frost', colors: ['#7fe2ff', '#ffffff', '#c2ecff'], trail: ['#ffffff', '#3fb6ff'] },
  galaxy: { aura: 'stars', colors: ['#a46bff', '#ffffff', '#66e3ff'], trail: ['#e0c8ff', '#5a2bd8'] },
  dragon: { aura: 'flames', colors: ['#5cff7a', '#ffd21f', '#2fbf5a'], trail: ['#e0ffb0', '#1f8a4a'] },
  rainbow: { aura: 'rainbow', colors: ['#ff3b5c', '#ff9a1f', '#ffe53b', '#4ef05a', '#2fc6ff', '#b15cff'], trail: ['#ffffff', '#ffffff'], rainbow: true },
  diamond: { aura: 'prism', colors: ['#ffffff', '#bff4ff', '#ffd1f0', '#d0ffe8'], trail: ['#ffffff', '#5fc8ff'] },
  cosmic: { aura: 'stars', colors: ['#ff5bd8', '#ffffff', '#7a5cff', '#66e3ff'], trail: ['#ffd1f0', '#7a5cff'], rainbow: true },
}

const fxOf = (id) => SPEAR_FX[id] || SPEAR_FX.paper

/** Parsed palettes and trail colours, so frame code never parses. */
const PALETTES = Object.fromEntries(Object.entries(SPEAR_FX).map(([id, fx]) => [id, fx.colors.map((c) => new Color(c))]))
const TRAILS = Object.fromEntries(
  Object.entries(SPEAR_FX).map(([id, fx]) => [id, { head: new Color(fx.trail[0]), tail: new Color(fx.trail[1]), rainbow: Boolean(fx.rainbow) }]),
)
export const spearTrail = (id) => TRAILS[id] || TRAILS.paper

/** The colour of aura slot `slot` for spear `id`; the glow is dimmer. */
export function auraColor(id, slot, out) {
  const palette = PALETTES[id] || PALETTES.paper
  if (slot < HALO_SLOTS) return out.copy(palette[0]).multiplyScalar(0.55)
  return out.copy(palette[(slot - HALO_SLOTS) % palette.length])
}

const hash = (n) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453
  return x - Math.floor(x)
}
const fract = (x) => x - Math.floor(x)
/** A sharp twinkle, 0-1. */
const twinkle = (t, i) => Math.max(0, Math.sin(t * (5 + hash(i) * 4) + i * 2.1)) ** 2

/**
 * Where aura slot `slot` of an aura `kind` is at time `t`, in the spear's frame, written
 * into `out`; returns the quad's size (0 hides it). `up` is the world's up in that
 * frame, for things that rise or fall.
 */
function slotAt(kind, slot, t, up, out) {
  // The glow: one big soft quad on the head, a smaller one down the shaft.
  if (slot === 0) {
    out.set(0, 0, 1.2)
    return 1.5
  }
  if (slot === 1) {
    out.set(0, 0, 0.1)
    return kind === 'glint' || kind === 'dust' ? 0 : 1.1
  }
  const i = slot - HALO_SLOTS
  const n = AURA_SLOTS - HALO_SLOTS
  const h = hash(i)
  switch (kind) {
    case 'glint': {
      if (i > 2) return 0
      out.set((h - 0.5) * 0.25, (hash(i + 7) - 0.5) * 0.25, 1.15 + i * 0.15)
      return 0.32 * twinkle(t * 0.6, i)
    }
    case 'dust': {
      if (i > 7) return 0
      const a = t * 0.4 + h * 6.3
      out.set(Math.cos(a) * 0.35, Math.sin(a * 1.3) * 0.35, -0.9 + h * 2.4)
      out.addScaledVector(up, Math.sin(t + i) * 0.15)
      return 0.12 + 0.06 * twinkle(t, i)
    }
    case 'bubbles':
    case 'embers':
    case 'flames':
    case 'souls': {
      // Rising from along the spear and fading as they go.
      const speed = kind === 'embers' ? 0.9 : kind === 'flames' ? 1.3 : kind === 'souls' ? 0.45 : 0.6
      const life = fract(t * speed + h)
      const along = kind === 'flames' ? 0.6 + hash(i + 3) * 0.9 : -0.9 + hash(i + 3) * 2.4
      const a = h * 6.3 + t * (kind === 'souls' ? 1.5 : 0.5)
      const r = kind === 'souls' ? 0.25 + life * 0.25 : 0.12 + life * 0.15
      out.set(Math.cos(a) * r, Math.sin(a) * r, along)
      out.addScaledVector(up, life * (kind === 'souls' ? 1.4 : kind === 'bubbles' ? 1.1 : 0.9))
      if (kind === 'bubbles') return (0.06 + life * 0.1) * (life < 0.85 ? 1 : (1 - life) / 0.15)
      if (kind === 'souls') return 0.3 * Math.sin(life * Math.PI)
      return (kind === 'flames' ? 0.32 : 0.22) * (1 - life)
    }
    case 'sparkle':
    case 'prism': {
      // Orbiting the spear in a spiral, twinkling.
      const a = t * (kind === 'prism' ? 3 : 2) + (i / n) * Math.PI * 2
      const r = kind === 'prism' ? 0.3 : 0.26
      out.set(Math.cos(a) * r, Math.sin(a) * r, -0.9 + fract(h + t * 0.12) * 2.5)
      return (kind === 'prism' ? 0.26 : 0.2) * (0.25 + 0.75 * twinkle(t, i))
    }
    case 'leaves': {
      // Spiralling up the shaft from butt to tip.
      const p = fract(t * 0.35 + i / n)
      const a = t * 3 + i * 0.8
      out.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, -1.1 + p * 2.7)
      return 0.17 * Math.sin(p * Math.PI)
    }
    case 'frost': {
      // Flakes drifting down round the head.
      const life = fract(t * 0.35 + h)
      const a = h * 6.3 + t * 0.6
      const r = 0.25 + hash(i + 9) * 0.3
      out.set(Math.cos(a) * r, Math.sin(a) * r, 0.5 + hash(i + 5) * 1.1)
      out.addScaledVector(up, 0.5 - life * 1.0)
      return 0.13 * Math.sin(life * Math.PI) * (0.6 + 0.4 * twinkle(t, i))
    }
    case 'bolts': {
      // Sparks jumping about the head, a new spot every 70 ms; about half lit at once.
      const step = Math.floor(t / 0.07)
      const k = hash(i * 31 + step)
      if (k < 0.45) return 0
      const a = hash(i * 17 + step) * 6.3
      const r = 0.15 + hash(i * 13 + step) * 0.3
      out.set(Math.cos(a) * r, Math.sin(a) * r, 0.4 + hash(i * 7 + step) * 1.2)
      return 0.12 + k * 0.14
    }
    case 'stars': {
      // A slowly turning cloud of stars round the whole spear.
      const a = t * 0.6 + h * 6.3
      const r = 0.3 + hash(i + 11) * 0.4
      out.set(Math.cos(a) * r, Math.sin(a) * r, -1 + hash(i + 2) * 2.6)
      return 0.08 + 0.16 * twinkle(t * 0.8, i)
    }
    case 'rainbow': {
      const a = t * 2.2 + (i / n) * Math.PI * 2
      out.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, -0.8 + fract(i / n + t * 0.2) * 2.4)
      return 0.2
    }
    default:
      return 0
  }
}

const _p = new Vector3()
const _q = new Quaternion()
const _s = new Vector3()
const _m = new Matrix4()
const _base = new Matrix4()
const _localUp = new Vector3()
const _color = new Color()

/**
 * Writes spear `id`'s aura into `glows` (an instanced glow mesh) at instances
 * [first, first + AURA_SLOTS): positioned by `spearMatrix` (the spear's own matrix, or
 * identity when the glows are the spear's children), `scale` sizing the quads with the
 * spear. Particles only when `particles` is set. Returns how many slots it used, and
 * restyles the slots only when the spear changes (pass the last id in `styled`).
 *
 * @param {{ glows: import('three').InstancedMesh, first: number, id: string, t: number,
 *   spearMatrix: Matrix4, worldQuaternion: Quaternion, scale?: number, particles: boolean,
 *   styled?: string | null }} options
 */
export function writeAura({ glows, first, id, t, spearMatrix, worldQuaternion, scale = 1, particles, styled }) {
  const kind = fxOf(id).aura
  // The world's up in the spear's frame.
  _localUp.set(0, 1, 0).applyQuaternion(_q.copy(worldQuaternion).invert())
  _base.copy(spearMatrix)
  const slots = particles ? AURA_SLOTS : HALO_SLOTS
  for (let slot = 0; slot < slots; slot += 1) {
    const size = slotAt(kind, slot, t, _localUp, _p)
    const i = first + slot
    _p.applyMatrix4(_base)
    _m.compose(_p, _q.identity(), _s.setScalar(Math.max(size, 0.0001) * scale))
    glows.setMatrixAt(i, _m)
    if (styled !== id) glows.setColorAt(i, auraColor(id, slot, _color))
  }
  return slots
}
