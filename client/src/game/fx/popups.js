import { Vector3 } from 'three'

/**
 * Floating "+12 POWER" text: a fixed pool of DOM elements (max 10 alive), positioned
 * by projecting a world point each frame. When the pool is full the oldest popup is
 * recycled, so a fast training lane can never pile up elements.
 */

export const POPUP_POOL_SIZE = 10
const LIFE_MS = 1150
const RISE = 1.4
const DEFAULT_GRADIENT = 'linear-gradient(180deg, #fffaa8 0%, #ffd52a 45%, #ff9c00 100%)'

/** @type {Array<{ el: HTMLElement, texts: HTMLElement[], icon: HTMLImageElement, active: boolean, born: number, life: number, pos: Vector3, scale: number, dx: number, dy: number }>} */
const pool = []
const _v = new Vector3()

/**
 * Spots beside the player for a run of popups, as [side, row]: left and right in turn,
 * a row lower each time round, then back to the top. Every popup rises as it fades, so
 * the older ones climb away from the newer ones below them and none land on another or
 * on the player.
 */
const SIDE_SPOTS = [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [1, 2]]
/** Columns' distance from the player, and the rows' spacing, in HUD px (--px). */
const SIDE_X = 235
const ROW_Y = 64
let nextSpot = 0
const _spot = [0, 0]

/**
 * The next spot beside the player, as a screen offset in HUD px, with a little jitter.
 * One array, reused: spawnPopup copies it straight out.
 */
export function sideSpot() {
  const [side, row] = SIDE_SPOTS[nextSpot]
  nextSpot = (nextSpot + 1) % SIDE_SPOTS.length
  _spot[0] = side * (SIDE_X + Math.random() * 30)
  _spot[1] = (row - 1) * ROW_Y + (Math.random() - 0.5) * 16
  return _spot
}

/** The HUD's pixel unit for a viewport, as index.css works out --px. */
const hudPx = (width, height) => Math.min(1.4, Math.max(0.42, Math.min(width / 1920, height / 1080)))

/** Called by PopupLayer once its elements exist. */
export function registerPopupElements(elements) {
  pool.length = 0
  for (const el of elements) {
    if (!el) continue
    pool.push({
      el,
      texts: [...el.querySelectorAll('[data-popup-text]')],
      icon: el.querySelector('img'),
      // What the DOM currently shows, so spawning only writes what changed: setting an
      // img src (even to the same data URL) or a gradient restyles and re-decodes.
      shown: { text: null, gradient: null, iconUrl: undefined },
      active: false,
      born: 0,
      life: LIFE_MS,
      pos: new Vector3(),
      scale: 1,
      dx: 0,
      dy: 0,
    })
  }
}

/**
 * @param {string} text
 * @param {{ x: number, y: number, z: number }} position world point to rise from
 * @param {{ iconUrl?: string, scale?: number, gradient?: string, life?: number, offset?: number[] }} [style]
 *   no `iconUrl` = text only; `offset` moves it [x, y] HUD px off that point on screen
 *   (see sideSpot)
 */
export function spawnPopup(text, position, style = {}) {
  if (pool.length === 0) return
  let slot = pool.find((p) => !p.active)
  if (!slot) slot = pool.reduce((oldest, p) => (p.born < oldest.born ? p : oldest), pool[0])
  slot.active = true
  slot.born = performance.now()
  slot.life = style.life || LIFE_MS
  slot.scale = style.scale || 1
  slot.pos.set(position.x, position.y, position.z)
  slot.dx = style.offset?.[0] || 0
  slot.dy = style.offset?.[1] || 0
  const shown = slot.shown
  if (shown.text !== text) {
    shown.text = text
    for (const t of slot.texts) t.textContent = text
  }
  const gradient = style.gradient || DEFAULT_GRADIENT
  if (slot.texts[1] && shown.gradient !== gradient) {
    shown.gradient = gradient
    slot.texts[1].style.backgroundImage = gradient
  }
  const iconUrl = style.iconUrl || null
  if (slot.icon && shown.iconUrl !== iconUrl) {
    shown.iconUrl = iconUrl
    slot.icon.style.display = iconUrl ? '' : 'none'
    if (iconUrl) slot.icon.src = iconUrl
  }
  slot.el.style.display = 'flex'
}

/** Positions every live popup. Runs inside the frame loop; touches only DOM styles. */
export function updatePopups(camera, width, height) {
  const now = performance.now()
  const px = hudPx(width, height)
  for (const p of pool) {
    if (!p.active) continue
    const t = (now - p.born) / p.life
    if (t >= 1) {
      p.active = false
      p.el.style.display = 'none'
      continue
    }
    _v.copy(p.pos)
    _v.y += t * RISE
    _v.project(camera)
    if (_v.z > 1) {
      p.el.style.opacity = '0'
      continue
    }
    const x = (_v.x * 0.5 + 0.5) * width + p.dx * px
    const y = (-_v.y * 0.5 + 0.5) * height + p.dy * px
    // Pop in, hold, fade out.
    const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : t < 0.22 ? 1.15 - ((t - 0.12) / 0.1) * 0.15 : 1
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
    p.el.style.opacity = String(fade)
    p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${pop * p.scale})`
  }
}
