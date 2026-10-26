import {
  LANE_BACK_Z,
  LANE_COUNT,
  LANE_DECK,
  LANE_FLOOR_HEIGHT,
  LANE_FRONT_Z,
  LANE_TARGET_Z,
  LANE_WIDTH,
  laneCenterX,
  SHOP_BOARD,
  SHOP_STAGES,
} from '@shared/world'

import { STYLE } from '../materials'

/**
 * Static lobby structures, added as plain boxes to the world's shared BlockSet so they
 * render in the same single draw call as the hills.
 */

/** The arena look shared by the throw area and the spear shop: marble, crimson, gold. */
export const ARENA = {
  marble: '#f2ece0',
  marbleShade: '#d9cfbd',
  crimson: '#c8323c',
  deepRed: '#7e1d27',
  gold: '#ffd21f',
  bronze: '#d08a3c',
  wood: '#8a5a32',
  woodDark: '#5e3a1e',
  track: '#d9573b',
  fire: '#ff9a2e',
  flame: '#ffe066',
}

/** The lobby's stone, as in the reference: mauve-grey, with a darker trim. */
export const LOBBY_STONE = { stone: '#8b7fa3', dark: '#3a3042', trim: '#6d6286' }

/**
 * Per-lane look, in lane order (matches LANES in shared/balance.js): the floor and its
 * pattern, the rim, the trim (posts, target frame), the pennant colour, the label tint
 * and which decoration stands either side of the target.
 */
export const LANE_THEMES = [
  { floor: '#c88d55', style: STYLE.PLANKS, edge: '#7a4a26', trim: '#6b3e1f', banner: '#ffb347', text: '#ffffff', decor: 'hay' },
  { floor: '#57c443', style: STYLE.STUDS, edge: '#a7f06a', trim: '#7a4a26', banner: '#5cff6a', text: '#8dff4f', decor: 'bush' },
  { floor: '#3f6fd8', style: STYLE.STONE, edge: '#8fd8ff', trim: '#d9e3f0', banner: '#3fa0ff', text: '#5fd6ff', decor: 'urn' },
  { floor: '#6b31d8', style: STYLE.PLATE, edge: '#b17cff', trim: '#3a1d6e', banner: '#b47cff', text: '#c69bff', decor: 'crystal' },
  { floor: '#e5bf18', style: STYLE.PLATE, edge: '#fff16c', trim: '#c48a12', banner: '#ffd21f', text: '#ffe45c', decor: 'pillar' },
  { floor: '#ff7a1c', style: STYLE.LAVA, edge: '#3a2420', trim: '#241414', banner: '#ff7a1c', text: '#ff9a3c', decor: 'brazier' },
  { floor: '#ff2b2b', style: STYLE.LAVA, edge: '#ff5c5c', trim: '#3a0810', banner: '#ff3b3b', text: '#ff5a5a', decor: 'redCrystal' },
  { floor: '#ffffff', style: STYLE.RAINBOW, edge: '#ffffff', trim: '#ffffff', banner: '#ff7ad9', text: '#ffffff', decor: 'rainbow', rimStyle: STYLE.RAINBOW },
  { floor: '#1b2266', style: STYLE.GALAXY, edge: '#8a63ff', trim: '#0f1340', banner: '#8a63ff', text: '#a98bff', decor: 'orb', rimStyle: STYLE.GALAXY },
]

const EDGE = 0.5

/** Things standing either side of a lane's target, on its far corners, on `y`. */
const DECOR = {
  hay(b, x, y, z) {
    b.addOn(x, y, z, 1.0, 0.8, 1.2, '#e8c872', STYLE.STUDS)
    b.addOn(x, y + 0.8, z + 0.1, 0.9, 0.7, 1.0, '#f0d68a', STYLE.STUDS)
    b.addOn(x, y + 0.38, z, 1.04, 0.08, 1.24, '#b0742e', STYLE.SMOOTH)
  },
  bush(b, x, y, z) {
    b.addOn(x, y, z, 1.2, 1.1, 1.4, '#2fae3a')
    b.addOn(x, y + 1.1, z, 0.8, 0.5, 1.0, '#3fd44a')
    for (const [dx, c] of [[-0.3, '#ff6fb8'], [0.25, '#ffe45c']]) b.addOn(x + dx, y + 0.6, z - 0.71, 0.22, 0.22, 0.08, c, STYLE.GLOW)
  },
  urn(b, x, y, z) {
    b.addOn(x, y, z, 1.0, 0.3, 1.0, '#d9e3f0', STYLE.STONE)
    b.addOn(x, y + 0.3, z, 0.7, 1.6, 0.7, '#d9e3f0', STYLE.STRIPES)
    b.addOn(x, y + 1.9, z, 1.0, 0.25, 1.0, '#d9e3f0', STYLE.SMOOTH)
    b.addOn(x, y + 2.15, z, 0.5, 0.5, 0.5, '#5fd6ff', STYLE.GLOW)
  },
  crystal(b, x, y, z) {
    b.add(x, y + 1.0, z, 0.6, 2.2, 0.6, '#b47cff', STYLE.GLOW, 0.4, 0, 0.18)
    b.add(x + 0.35, y + 0.6, z + 0.2, 0.4, 1.4, 0.4, '#ead6ff', STYLE.GLOW, 1.1, 0, -0.35)
  },
  pillar(b, x, y, z) {
    b.addOn(x, y, z, 1.0, 0.3, 1.0, '#c48a12', STYLE.SMOOTH)
    b.addOn(x, y + 0.3, z, 0.6, 2.2, 0.6, '#ffe25a', STYLE.STRIPES)
    b.addOn(x, y + 2.5, z, 0.9, 0.2, 0.9, '#c48a12', STYLE.SMOOTH)
    b.add(x, y + 3.0, z, 0.55, 0.55, 0.55, '#fff3b0', STYLE.GLOW, 0.785, 0.6, 0)
  },
  brazier(b, x, y, z) {
    b.addOn(x, y, z, 1.1, 0.7, 1.1, '#241414', STYLE.STUDS)
    b.addOn(x, y + 0.7, z, 0.9, 0.25, 0.9, '#ff6a14', STYLE.LAVA)
    b.add(x, y + 1.25, z, 0.55, 0.8, 0.55, '#ffb347', STYLE.GLOW, 0.785, 0, 0)
  },
  redCrystal(b, x, y, z) {
    b.add(x, y + 1.1, z, 0.7, 2.4, 0.7, '#ff2a3a', STYLE.GLOW, 0.5, 0, -0.15)
    b.add(x + 0.4, y + 0.55, z - 0.2, 0.42, 1.3, 0.42, '#ffb3b3', STYLE.GLOW, 1.4, 0, 0.4)
  },
  rainbow(b, x, y, z) {
    b.addOn(x, y, z, 0.8, 3.0, 0.8, '#ffffff', STYLE.RAINBOW)
    b.add(x, y + 3.4, z, 0.7, 0.7, 0.7, '#ffffff', STYLE.GLOW, 0.785, 0.6, 0)
  },
  orb(b, x, y, z) {
    b.addOn(x, y, z, 1.0, 0.4, 1.0, '#0f1340', STYLE.SMOOTH)
    b.addOn(x, y + 0.4, z, 0.5, 1.8, 0.5, '#1b2266', STYLE.GALAXY)
    b.add(x, y + 2.7, z, 0.75, 0.75, 0.75, '#9a5cff', STYLE.GLOW, 0.785, 0.6, 0)
  },
}

/**
 * The lanes' deck, as in the reference: a raised mauve stone platform along the south
 * west with a step across its front, and on it each lane - a floor with raised rims,
 * a glowing throw line and aim marks down the middle, a lantern post with a pennant at
 * each corner of the entrance, the target's stand at the back and the lane's own
 * decoration beside it. `detail` (off on LOW) adds the aim marks and pennant trim.
 */
export function buildLanes(blocks, { detail = true } = {}) {
  const deck = LANE_DECK
  const deckW = deck.maxX - deck.minX
  const deckX = (deck.minX + deck.maxX) / 2
  blocks.addOn(deckX, -0.1, (deck.minZ + deck.maxZ) / 2, deckW, deck.height + 0.1, deck.maxZ - deck.minZ, LOBBY_STONE.stone, STYLE.STONE)
  // The step up, and a gold strip along the deck's front edge.
  blocks.addOn(deckX, -0.1, deck.minZ - 0.45, deckW - 1.2, 0.35, 0.9, LOBBY_STONE.trim, STYLE.STONE)
  blocks.addOn(deckX, deck.height, deck.minZ + 0.2, deckW - 0.6, 0.04, 0.24, ARENA.gold, STYLE.GLOW)

  const length = LANE_BACK_Z - LANE_FRONT_Z
  const midZ = (LANE_FRONT_Z + LANE_BACK_Z) / 2
  const inner = LANE_WIDTH - EDGE * 2
  const base = deck.height - 0.05
  const h = LANE_FLOOR_HEIGHT

  for (let i = 0; i < LANE_COUNT; i += 1) {
    const theme = LANE_THEMES[i]
    const cx = laneCenterX(i)
    const rimStyle = theme.rimStyle ?? STYLE.STUDS

    blocks.addOn(cx, base, midZ, inner, h - base, length - EDGE * 2, theme.floor, theme.style)

    // Raised rim on all four sides.
    const rimH = h + 0.15 - base
    blocks.addOn(cx - LANE_WIDTH / 2 + EDGE / 2, base, midZ, EDGE, rimH, length, theme.edge, rimStyle)
    blocks.addOn(cx + LANE_WIDTH / 2 - EDGE / 2, base, midZ, EDGE, rimH, length, theme.edge, rimStyle)
    blocks.addOn(cx, base, LANE_FRONT_Z + EDGE / 2, inner, rimH, EDGE, theme.edge, rimStyle)
    blocks.addOn(cx, base, LANE_BACK_Z - EDGE / 2, inner, rimH, EDGE, theme.edge, rimStyle)

    // Throw line near the entrance, and aim marks running to the target.
    blocks.addOn(cx, h, LANE_FRONT_Z + 2.4, inner - 0.3, 0.04, 0.3, '#ffffff', STYLE.GLOW)
    if (detail) {
      for (let z = LANE_FRONT_Z + 4.2; z < LANE_BACK_Z - 1.5; z += 1.8) blocks.addOn(cx, h, z, 0.16, 0.03, 0.9, theme.edge, STYLE.SMOOTH)
    }

    // The target's stand: a stepped plinth; the target itself is a prop.
    blocks.addOn(cx, base, LANE_TARGET_Z, 3.2, 0.5, 1.8, theme.trim, rimStyle === STYLE.STUDS ? STYLE.STONE : rimStyle)
    blocks.addOn(cx, base + 0.5, LANE_TARGET_Z, 2.6, 0.3, 1.4, theme.edge, rimStyle)

    // Lantern posts with a pennant at the entrance corners, standing on the rim; the
    // pennants hang off the plaza side.
    for (const side of [-1, 1]) {
      const px = cx + side * (LANE_WIDTH / 2 - EDGE / 2)
      const pz = LANE_FRONT_Z + EDGE / 2
      const top = h + 0.15
      blocks.addOn(px, top, pz, 0.22, 2.4, 0.22, theme.trim, STYLE.SMOOTH)
      blocks.addOn(px, top + 2.4, pz, 0.38, 0.1, 0.38, theme.trim, STYLE.SMOOTH)
      blocks.addOn(px, top + 2.5, pz, 0.26, 0.32, 0.26, theme.banner, STYLE.GLOW)
      blocks.addOn(px, top + 2.82, pz, 0.38, 0.1, 0.38, theme.trim, STYLE.SMOOTH)
      blocks.addOn(px, top + 1.4, pz - 0.14, 0.4, 0.8, 0.05, theme.banner, theme.style === STYLE.RAINBOW ? STYLE.RAINBOW : STYLE.SMOOTH)
      if (detail) blocks.addOn(px, top + 1.32, pz - 0.15, 0.44, 0.08, 0.06, ARENA.gold, STYLE.GLOW)
    }

    // The lane's decoration either side, near the back.
    for (const side of [-1, 1]) DECOR[theme.decor](blocks, cx + side * (LANE_WIDTH / 2 - 0.95), h, LANE_BACK_Z - 1.3)
  }
}

/**
 * The spear shop along the west wall, as in the reference: the front row of pads in a
 * dark strip at ground level, the back row on a raised stone step, and the big board on
 * the wall behind - a crimson panel in a stone frame with crossed spears at each end.
 * The pads and their spears are SpearShop's. `detail` (off on LOW) adds the board's
 * bulbs.
 *
 * No two faces here share a plane: every layer stands a clear step proud of what it
 * sits on.
 */
export function buildShop(blocks, { detail = true } = {}) {
  const [strip, step] = SHOP_STAGES
  const span = (s) => ({ w: s.maxX - s.minX, d: s.maxZ - s.minZ, x: (s.minX + s.maxX) / 2, z: (s.minZ + s.maxZ) / 2 })

  // The front strip: dark, edged with glowing gold.
  const f = span(strip)
  blocks.addOn(f.x, -0.1, f.z, f.w, strip.height + 0.1, f.d, LOBBY_STONE.dark, STYLE.SMOOTH)
  for (const side of [-1, 1]) blocks.addOn(f.x + side * (f.w / 2 - 0.15), strip.height, f.z, 0.2, 0.05, f.d - 0.4, ARENA.gold, STYLE.GLOW)

  // The raised step: stone with a dark top and gold edging, and fire bowls at its ends.
  const s = span(step)
  blocks.addOn(s.x, -0.1, s.z, s.w, step.height + 0.1, s.d, LOBBY_STONE.stone, STYLE.STONE)
  blocks.addOn(s.x, step.height, s.z, s.w - 0.8, 0.04, s.d - 0.6, LOBBY_STONE.dark, STYLE.SMOOTH)
  blocks.addOn(s.x + s.w / 2 - 0.2, step.height, s.z, 0.25, 0.06, s.d - 0.4, ARENA.gold, STYLE.GLOW)
  for (const end of [-1, 1]) {
    const z = s.z + end * (s.d / 2 - 0.5)
    blocks.addOn(s.x + s.w / 2 - 0.5, step.height, z, 0.6, 0.7, 0.6, LOBBY_STONE.trim, STYLE.STONE)
    blocks.addOn(s.x + s.w / 2 - 0.5, step.height + 0.7, z, 0.4, 0.4, 0.4, ARENA.fire, STYLE.GLOW)
  }

  // The board: two striped legs, a crimson panel in a stone frame, a gold cap; its face
  // looks east, over the shop to the plaza.
  const { x, minZ, maxZ, top } = SHOP_BOARD
  const length = maxZ - minZ
  const midZ = (minZ + maxZ) / 2
  const bottom = top - 8.2
  for (const z of [minZ + 1.5, maxZ - 1.5]) blocks.addOn(x - 0.1, 0, z, 1.1, bottom + 0.3, 1.1, LOBBY_STONE.stone, STYLE.STRIPES)
  blocks.addOn(x, bottom, midZ, 0.6, top - bottom, length, LOBBY_STONE.stone, STYLE.STONE)
  blocks.addOn(x + 0.1, bottom + 0.5, midZ, 0.6, top - bottom - 1, length - 1, ARENA.deepRed, STYLE.SMOOTH)
  blocks.addOn(x, top, midZ, 0.9, 0.4, length + 0.4, ARENA.gold, STYLE.GLOW)
  // Crossed spears mounted at each end of the panel.
  for (const z of [minZ + 2.4, maxZ - 2.4]) {
    for (const lean of [-0.6, 0.6]) {
      blocks.add(x + 0.5, bottom + 4, z, 0.12, 6.2, 0.12, ARENA.wood, STYLE.SMOOTH, 0, lean, 0)
      blocks.add(x + 0.5, bottom + 4 + Math.cos(lean) * 3.3, z + Math.sin(lean) * 3.3, 0.14, 0.7, 0.34, '#dfe7ef', STYLE.SMOOTH, 0, lean, 0)
    }
    blocks.add(x + 0.55, bottom + 4, z, 0.1, 1.4, 1.4, ARENA.gold, STYLE.GLOW, 0, 0.785, 0)
  }
  if (detail) {
    for (let z = minZ + 1; z <= maxZ - 0.99; z += 1.5) {
      blocks.add(x + 0.42, bottom + 0.25, z, 0.16, 0.3, 0.3, Math.round(z) % 2 ? '#ffffff' : ARENA.gold, STYLE.GLOW)
      blocks.add(x + 0.42, top - 0.25, z + 0.75, 0.16, 0.3, 0.3, Math.round(z) % 2 ? ARENA.gold : '#ffffff', STYLE.GLOW)
    }
  }
}
