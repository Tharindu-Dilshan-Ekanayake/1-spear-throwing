import { ZONES } from '@shared/balance'
import { zoneIndexAt } from '@shared/logic'
import { hash2, mulberry32 } from '@shared/rng'
import { THROW_LINE_Z } from '@shared/world'

import { BlockSet } from '../blocks'
import { STYLE } from '../materials'
import { HILLS_NORTH_Z } from '../world/terrain'
import {
  barrelCactus,
  bigBush,
  cactus,
  crystalTree,
  deadTree,
  fern,
  flowers,
  jungleTree,
  oakTree,
  palmTree,
  roundTree,
  snowPine,
} from './trees'

/**
 * The throw track, generated in 60 m chunks on demand. Each chunk is a BlockSet (one
 * draw call); content is seeded by chunk index, so every client builds an identical
 * track and a chunk can be thrown away and rebuilt at will.
 *
 * Metre `m` sits at world z = THROW_LINE_Z - m: the front edge of the throw area,
 * where the lobby's ground ends and the track's begins.
 *
 * Every stage is laid out as in the reference: a checkered field down the middle with
 * the stage's own things scattered across it - low islands, rocks, ice, small trees -
 * the same lining it right beside the spear's path, then blocky plateaus - low islands
 * along the field's edge and a stepped rock wall close behind them, towering over the
 * flight - with more trees growing on and between them.
 */

export const CHUNK = 60
/** Where the lobby's own ground plane stops and track ground takes over. */
const LOBBY_GROUND_END = 0
/** No side scenery this close to the lobby. */
export const DECOR_START = 20
/** The walls are built in cells this long; zone starts and chunks fall on cell edges. */
const CELL = 6

export const zAt = (m) => THROW_LINE_Z - m
/** The metre where the lobby's hills stop lining the track. */
const HILLS_END = THROW_LINE_Z - HILLS_NORTH_Z

/**
 * Plateau heights come in steps, all at a quarter metre off the whole metre so no
 * plateau top can share a plane with the lobby's hills (whose tops are whole metres).
 */
export const stepHeight = (k) => 1.75 + 1.5 * k

/**
 * Per-zone look: the field (ground and the landing strip down the middle, checkered,
 * edged with a thin kerb), the plateaus' rock and grass cap, where the plateaus stand
 * (`walls`, see buildWalls), the gate's colour and pattern, and the sky.
 */
export const ZONE_THEMES = {
  river: {
    ground: '#7ad35a',
    groundStyle: STYLE.CHECKER,
    road: '#7ad35a',
    roadStyle: STYLE.CHECKER,
    kerb: '#5fbf47',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#80769c',
    rockStyle: STYLE.STUDS,
    cap: '#5fca4c',
    walls: { islands: [13, 21, 0, 2], tiers: [[21, 32, 2, 4], [32, 56, 5, 8]] },
    gate: '#a8743f',
    gateStyle: STYLE.PLANKS,
    sky: ['#2f8ff2', '#a6d6fb'],
  },
  farm: {
    ground: '#a6dc58',
    groundStyle: STYLE.CHECKER,
    road: '#a6dc58',
    roadStyle: STYLE.CHECKER,
    kerb: '#8cc944',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#8a7fa0',
    rockStyle: STYLE.STUDS,
    cap: '#a3d84a',
    walls: { islands: [13, 21, 0, 1], tiers: [[33, 56, 3, 6]] },
    gate: '#d8402e',
    gateStyle: STYLE.PLANKS,
    sky: ['#3796f0', '#bfe3f7'],
  },
  jungle: {
    ground: '#4cbf4c',
    groundStyle: STYLE.CHECKER,
    road: '#4cbf4c',
    roadStyle: STYLE.CHECKER,
    kerb: '#3aa63e',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#80484e',
    rockStyle: STYLE.STUDS,
    cap: '#3fae46',
    walls: { islands: [13, 20, 1, 3], tiers: [[20, 30, 3, 5], [30, 54, 6, 9]] },
    gate: '#8a9a7a',
    gateStyle: STYLE.STONE,
    sky: ['#3f9ae6', '#bfe6c9'],
  },
  desert: {
    ground: '#efcfb8',
    groundStyle: STYLE.CHECKER,
    road: '#efcfb8',
    roadStyle: STYLE.CHECKER,
    kerb: '#ddb79c',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#e2b49a',
    rockAlt: '#9a5a4e',
    rockStyle: STYLE.STONE,
    cap: null,
    walls: { islands: [13, 20, 0, 2], tiers: [[20, 30, 3, 5], [30, 54, 6, 9]] },
    gate: '#e0a43a',
    gateStyle: STYLE.STONE,
    sky: ['#4aa6ee', '#f6dcaa'],
  },
  snow: {
    ground: '#eef5ff',
    groundStyle: STYLE.CHECKER,
    road: '#eef5ff',
    roadStyle: STYLE.CHECKER,
    kerb: '#cfe3f5',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#a8b9cc',
    rockStyle: STYLE.STONE,
    cap: '#ffffff',
    walls: { islands: [13, 21, 0, 2], tiers: [[21, 32, 2, 4], [32, 56, 5, 8]] },
    gate: '#5cc8ff',
    sky: ['#7ab7ec', '#e8f3ff'],
  },
  volcano: {
    ground: '#4a3e40',
    groundStyle: STYLE.CHECKER,
    road: '#4a3e40',
    roadStyle: STYLE.CHECKER,
    kerb: '#ff6a14',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#3a2f33',
    rockStyle: STYLE.STUDS,
    cap: '#5a4a48',
    walls: { islands: [13, 21, 0, 2], tiers: [[21, 31, 3, 5], [31, 55, 6, 9]] },
    gate: '#ff4a1c',
    sky: ['#5a2a3a', '#d27a52'],
  },
  space: {
    ground: null,
    road: '#1b1f5c',
    roadStyle: STYLE.GALAXY,
    kerb: '#7a5cff',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    walls: null,
    gate: '#8a63ff',
    sky: ['#05051a', '#241544'],
  },
}

export const pick = (rand, list) => list[Math.floor(rand() * list.length)]

// --- Places to keep clear --------------------------------------------------------

/** River crossings in the first zone: [metre, width]. The first is in view of the lobby. */
export const RIVERS = [
  [96, 14],
  [128, 9],
]

/** The track whose chunk is being built, for the helpers below (building is synchronous). */
let building = null

/**
 * If [a, b) runs into one of the track's crossings (with its banks) or a gate, the
 * metre past it; else -1. Plateaus and side scenery skip those stretches.
 */
function blockedUntil(a, b) {
  for (const [at, width] of building.crossings) {
    const from = at - width / 2 - 3
    const to = at + width / 2 + 3
    if (a < to && b > from) return to
  }
  for (const g of building.gates) {
    if (a < g.meter + 3 && b > g.meter - 3) return g.meter + 3
  }
  return -1
}

// --- Plateaus --------------------------------------------------------------------

/**
 * A plateau: a body of the stage's rock topped with its grass cap. The cap stands a
 * little proud of the body all round, so the two never share a face, and its top is
 * 2 cm over `h`. Caps of neighbouring plateaus at the same height overlap, but they
 * are the same colour and pattern, so the overlap can't flicker.
 */
export function plateau(b, x, z, w, d, h, theme, rand, cap = theme.cap, capStyle = STYLE.STUDS) {
  const rock = theme.rockAlt && rand() < 0.3 ? theme.rockAlt : theme.rock
  b.addOn(x, -0.5, z, w, h + 0.5, d, rock, theme.rockStyle)
  if (cap) b.addOn(x, h - 0.5, z, w + 0.24, 0.52, d + 0.24, cap, capStyle)
  return cap ? h + 0.02 : h
}

/**
 * The stepped walls either side of the field, for [m0, m1). Each tier's height is
 * looked up per cell from a hash of the cell's index, so it is the same whichever
 * chunk builds it, and runs of equal height merge into one plateau. Each tier is at
 * least one step taller than the one in front of it. `grow(x, top, z)` plants on top.
 */
export function buildWalls(b, m0, m1, rand, density, theme, grow) {
  const { tiers } = theme.walls
  for (const side of [-1, 1]) {
    let below = null
    tiers.forEach(([x0, x1, kMin, kMax], t) => {
      const seed = 31 + t * 17 + (side > 0 ? 5 : 0)
      const heights = []
      for (let m = m0; m < m1; m += CELL) {
        const c = Math.floor(m / CELL)
        let k = kMin + Math.floor(hash2(c, t, seed) * (kMax - kMin + 1))
        if (below) k = Math.max(k, below[heights.length] + 1)
        heights.push(k)
      }
      // Merge runs of equal height, skipping blocked cells.
      let i = 0
      while (i < heights.length) {
        const a = m0 + i * CELL
        if (a < DECOR_START || blockedUntil(a, a + CELL) >= 0) {
          i += 1
          continue
        }
        let j = i + 1
        while (j < heights.length && heights[j] === heights[i] && blockedUntil(m0 + j * CELL, m0 + (j + 1) * CELL) < 0) j += 1
        const from = a
        const to = m0 + j * CELL
        // Beside the lobby's hills a run's ends can fall on the hills' 4 m grid and share
        // a face with one. Overlapping its neighbours a little keeps them off it; the
        // overlap is hidden as long as the neighbours are the same rock, so no rockAlt.
        const overlap = from < HILLS_END ? 0.25 : 0
        const rockTheme = overlap ? { ...theme, rockAlt: null } : theme
        const top = plateau(b, side * (x0 + x1) / 2, zAt((from + to) / 2), x1 - x0, to - from + overlap * 2, stepHeight(heights[i]), rockTheme, rand)
        // Trees along the top, about one every other cell.
        for (let m = from + CELL / 2; m < to; m += CELL) {
          if (rand() < 0.55 * density) grow(side * (x0 + 2 + rand() * (x1 - x0 - 4)), top, zAt(m + (rand() - 0.5) * 3))
        }
        i = j
      }
      below = heights
    })
  }
}

/**
 * Low islands scattered along the field's edge, with gaps between. `island(x, top, z,
 * w, d)` decorates each one; `gap(x, z)` fills the ground in the gaps.
 */
export function buildIslands(b, m0, m1, rand, density, theme, island, gap) {
  const [x0, x1, kMin, kMax] = theme.walls.islands
  for (const side of [-1, 1]) {
    let m = Math.max(m0, DECOR_START) + rand() * 3
    while (m < m1) {
      const len = 6 + rand() * 8
      const end = Math.min(m + len, m1)
      const blocked = blockedUntil(m, end)
      if (blocked >= 0) {
        m = blocked
        continue
      }
      if (end - m > 4 && rand() < 0.62) {
        const w = 5 + rand() * (x1 - x0 - 5)
        const x = side * (x0 + w / 2 + rand() * (x1 - x0 - w))
        const z = zAt((m + end) / 2)
        const k = kMin + Math.floor(rand() * (kMax - kMin + 1))
        const top = plateau(b, x, z, w, end - m, stepHeight(k), theme, rand)
        island(x, top, z, w, end - m)
      } else if (rand() < density) {
        gap(side * (x0 + 1.5 + rand() * (x1 - x0 - 3)), zAt((m + end) / 2))
      }
      m = end + 1 + rand() * 4
    }
  }
}

/**
 * Calls `place(x, z, side)` right beside the spear's path, about every `spacing`
 * metres on each side: what the flight passes close by.
 */
export function pathSide(m0, m1, spacing, rand, density, theme, place) {
  edgeItems(m0, m1, spacing, rand, density, (m, side) => place(side * (theme.kerbHalf + 1.3 + rand() * 1.4), zAt(m + (rand() - 0.5) * 2), side))
}

/**
 * Within this of the field's centre line nothing stands taller than a tuft of grass:
 * that's where the spear flies (it wanders about a metre and a half either way) and
 * lands, and where the trophies float.
 */
export const CLEAR_HALF = 3
/** Nothing in the middle of the field stands taller than this, under the flight. */
const MID_MAX_HEIGHT = 4.5
/** Nor anything in the centre band taller than this. */
const FLAT_MAX_HEIGHT = 0.7

/** Runs `add`, then takes back whatever it built if any of it stands above `limit`. */
function underHeight(b, limit, add) {
  const before = b.count
  add()
  if (b.topSince(before) > limit) b.truncate(before)
}

/**
 * The middle of the field, as in the reference: the stage's things scattered across it
 * under the spear's flight - now and then a low island with something on it, otherwise
 * `prop(x, y, z)` standing on the ground - kept off the centre line, where `flat(x, z)`
 * adds only things that lie flat. Anything that turns out taller than MID_MAX_HEIGHT
 * (FLAT_MAX_HEIGHT for the flat ones) is left out.
 */
export function midField(b, m0, m1, rand, density, theme, { prop, flat }) {
  const room = theme.roadHalf - CLEAR_HALF
  for (let m = Math.max(m0, DECOR_START) + rand() * 4; m < m1; m += 4 + rand() * 4) {
    if (blockedUntil(m - 3, m + 3) >= 0 || rand() > density) continue
    const side = rand() < 0.5 ? -1 : 1
    const z = zAt(m)
    if (rand() < 0.25) {
      // A low island, its near edge clear of the centre band.
      const w = 2.6 + rand() * (room - 3)
      const x = side * (CLEAR_HALF + 0.3 + w / 2 + rand() * Math.max(0, room - w - 0.8))
      const top = plateau(b, x, z, w, 3 + rand() * 4, rand() < 0.5 ? 0.75 : 1.25, theme, rand)
      underHeight(b, MID_MAX_HEIGHT, () => prop(x, top, z))
    } else {
      const x = side * (CLEAR_HALF + 1 + rand() * (room - 1.6))
      underHeight(b, MID_MAX_HEIGHT, () => prop(x, 0, z + (rand() - 0.5) * 2))
    }
    if (rand() < 0.5) {
      const x = (rand() - 0.5) * CLEAR_HALF * 1.6
      underHeight(b, FLAT_MAX_HEIGHT, () => flat(x, zAt(m + 2 + rand() * 2)))
    }
  }
}

/** A few pebbles lying in the grass. */
export function pebbles(b, x, z, rand, color = '#a9b0b8') {
  for (let i = 0; i < 4; i += 1) b.addOn(x + (rand() - 0.5) * 1.6, -0.05, z + (rand() - 0.5) * 1.6, 0.3 + rand() * 0.3, 0.22, 0.3 + rand() * 0.25, color, STYLE.STUDS, rand() * 3)
}

/** A tuft of tall grass blades. */
export function grassTuft(b, x, z, rand, color = '#4fbf3a') {
  for (let i = 0; i < 4; i += 1) b.add(x + (rand() - 0.5) * 0.6, 0.25, z + (rand() - 0.5) * 0.6, 0.08, 0.5, 0.08, color, STYLE.SMOOTH, rand() * 3, 0, (rand() - 0.5) * 0.6)
}

/**
 * A flat patch lying on the ground: a puddle, snow, sand, cooled lava. Its top is
 * halfway between the road's (0.05) and the kerb's (0.12): a centimetre over the road,
 * as it was, flickered against it all down the track.
 */
export function patch(b, x, z, w, d, color, style = STYLE.SMOOTH) {
  b.addOn(x, -0.04, z, w, 0.125, d, color, style)
}

/** A chunk of ice: tilted glassy blocks in two blues. */
function iceChunk(b, x, y, z, s, rand) {
  b.add(x, y + 0.8 * s, z, 1.4 * s, 1.8 * s, 1.2 * s, '#bfe9ff', STYLE.GLOW, rand() * 3, 0.15, 0.2)
  b.add(x + 0.7 * s, y + 0.5 * s, z + 0.3 * s, 0.9 * s, 1.1 * s, 0.9 * s, '#8fd3ff', STYLE.GLOW, rand() * 3, -0.2, -0.25)
  // A fixed thickness: scaled, its top could land level with the kerb's.
  b.addOn(x, y - 0.1, z, 2.2 * s, 0.3, 1.9 * s, '#e8f6ff', STYLE.SMOOTH)
}

/** A fallen log, mossy on top. */
function fallenLog(b, x, y, z, rand) {
  const yaw = rand() * Math.PI
  b.add(x, y + 0.4, z, 3.6, 0.8, 0.8, '#6b4a2a', STYLE.STUDS, yaw)
  b.add(x, y + 0.82, z, 2.4, 0.08, 0.6, '#4fae3a', STYLE.STUDS, yaw)
  b.add(x + Math.cos(yaw) * 1.85, y + 0.4, z - Math.sin(yaw) * 1.85, 0.12, 0.7, 0.7, '#c99a5f', STYLE.SMOOTH, yaw)
}

/** A block of ruined temple stone, moss on top, sometimes with a glowing rune. */
function ruinBlock(b, x, y, z, rand) {
  const yaw = rand() * 0.6
  b.add(x, y + 0.75, z, 1.6, 1.5, 1.6, '#8a9a7a', STYLE.STONE, yaw)
  b.add(x, y + 1.54, z, 1.4, 0.1, 1.4, '#4f9a3a', STYLE.STUDS, yaw)
  // On the block's turned face, standing just proud of it.
  if (rand() < 0.4) b.add(x + Math.sin(yaw) * 0.82, y + 0.8, z + Math.cos(yaw) * 0.82, 0.5, 0.5, 0.05, '#5cff8a', STYLE.GLOW, yaw)
}

/** Volcano: a jagged ember crystal, glowing from inside. */
function emberCrystal(b, x, y, z, s, rand) {
  b.add(x, y + 1.1 * s, z, 0.7 * s, 2.2 * s, 0.7 * s, '#ff6a14', STYLE.GLOW, rand() * 3, 0, 0.2)
  b.add(x + 0.5 * s, y + 0.6 * s, z, 0.45 * s, 1.2 * s, 0.45 * s, '#ffb347', STYLE.GLOW, rand() * 3, 0, -0.4)
  b.addOn(x, y - 0.1, z, 1.6 * s, 0.4 * s, 1.4 * s, '#2a2427')
}

/** Calls `place(m, side)` along the field's edge, about every `spacing` metres. */
export function edgeItems(m0, m1, spacing, rand, density, place) {
  for (let m = m0 + spacing * rand(); m < m1; m += spacing * (0.8 + rand() * 0.6)) {
    if (m < DECOR_START || rand() > density || blockedUntil(m - 1, m + 1) >= 0) continue
    for (const side of [-1, 1]) if (rand() < 0.75) place(m, side)
  }
}

/** One or two of `grow`'s plants on an island's top, kept off its edges. */
export function plantIsland(rand, density, x, top, z, w, d, grow) {
  const count = 1 + (d > 9 && rand() < density ? 1 : 0)
  for (let i = 0; i < count; i += 1) {
    const dz = count === 1 ? 0 : (i - 0.5) * d * 0.5
    grow(x + (rand() - 0.5) * Math.max(0, w - 3), top, z + dz)
  }
}

// --- Props -----------------------------------------------------------------------

/** The River's crossings: sandy banks, blue water, lily pads in flower, a wooden bridge. */
const RIVER = { bank: '#f0dca0', water: '#3fb6ff', pad: '#3fbf4a', flower: '#ff8ac8', deck: '#b07a46', rail: '#7a4a26', post: '#6b3e1f', reed: '#4f9a2a', head: '#7a4a26' }

/**
 * A river right across the track: banks, water, lily pads and a plank bridge, with
 * reeds on the banks as dense as the scenery `density` allows. `look` colours it.
 */
export function riverCrossing(b, meter, width, rand, density, theme, look = RIVER) {
  const z = zAt(meter)
  const edge = theme.kerbHalf
  // A little narrower than the ground, so their ends don't share its faces.
  for (const side of [-1, 1]) b.addOn(0, -0.04, z + side * (width / 2 + 1.2), 339.5, 0.1, 2.4, look.bank, STYLE.STUDS)
  b.addOn(0, -0.02, z, 339.5, 0.1, width, look.water, STYLE.WATER)
  for (let i = 0; i < 10; i += 1) {
    const x = (rand() < 0.5 ? -1 : 1) * (edge + 2 + rand() * 28)
    b.addOn(x, 0.08, z + (rand() - 0.5) * (width - 2), 1.1 + rand() * 0.6, 0.03, 1.0, look.pad, STYLE.SMOOTH)
    if (rand() < 0.3) b.addOn(x + 0.2, 0.11, z, 0.25, 0.12, 0.25, look.flower, STYLE.GLOW)
  }
  // The bridge carries the field over, kerb to kerb, with railings.
  const span = width + 5
  b.addOn(0, 0.05, z, edge * 2 + 2, 0.3, span, look.deck, STYLE.PLANKS)
  for (const side of [-1, 1]) {
    const x = side * (edge + 0.7)
    b.addOn(x, 0.35, z, 0.25, 0.25, span, look.rail, STYLE.SMOOTH)
    b.addOn(x, 1.05, z, 0.25, 0.25, span, look.rail, STYLE.SMOOTH)
    for (let dz = -span / 2 + 0.4; dz <= span / 2; dz += 2.6) b.addOn(x, 0.35, z + dz, 0.4, 1.2, 0.4, look.post, STYLE.SMOOTH)
  }
  // Reeds along both banks.
  for (const bank of [-1, 1]) {
    for (let i = 0; i < Math.round(8 * density); i += 1) {
      const x = (rand() < 0.5 ? -1 : 1) * (edge + 1.5 + rand() * 22)
      const rz = z + bank * (width / 2 + 0.4)
      for (let k = 0; k < 3; k += 1) b.addOn(x + k * 0.3, 0, rz + (rand() - 0.5) * 0.6, 0.12, 1.2 + rand() * 0.8, 0.12, look.reed, STYLE.SMOOTH)
      b.addOn(x + 0.3, 1.5, rz, 0.18, 0.4, 0.18, look.head, STYLE.SMOOTH)
    }
  }
}

/** A wooden fence along z from z0 to z1 standing on `y`: posts every 3 m and two rails. */
export function fence(b, x, y, z0, z1, color = '#5e4a5a') {
  const len = Math.abs(z1 - z0)
  const zc = (z0 + z1) / 2
  b.addOn(x, y + 0.45, zc, 0.15, 0.18, len, color, STYLE.SMOOTH)
  b.addOn(x, y + 0.95, zc, 0.15, 0.18, len, color, STYLE.SMOOTH)
  for (let z = Math.min(z0, z1) + 0.2; z <= Math.max(z0, z1); z += 3) b.addOn(x, y - 0.1, z, 0.3, 1.4, 0.3, color, STYLE.SMOOTH)
}

/** A tied grain sack, as stacked round the reference's farm. */
function grainSack(b, x, y, z, rand) {
  const yaw = rand() * Math.PI
  b.add(x, y + 0.5, z, 1.0, 1.0, 0.85, '#e8cfa0', STYLE.STUDS, yaw)
  b.add(x, y + 1.08, z, 0.55, 0.16, 0.5, '#5a3a2a', STYLE.SMOOTH, yaw)
  b.add(x, y + 1.25, z, 0.45, 0.3, 0.4, '#e8cfa0', STYLE.STUDS, yaw)
}

/** A clump of corn: tall stalks with long leaves and a yellow cob. */
function corn(b, x, z, rand) {
  for (let i = 0; i < 3; i += 1) {
    const cx = x + (rand() - 0.5) * 1.2
    const cz = z + (rand() - 0.5) * 1.2
    const h = 2.2 + rand() * 0.8
    b.addOn(cx, 0, cz, 0.16, h, 0.16, '#5fae32', STYLE.SMOOTH)
    b.add(cx + 0.35, h * 0.55, cz, 0.8, 0.1, 0.24, '#6fcf3a', STYLE.SMOOTH, rand() * Math.PI, 0, 0.5)
    b.add(cx - 0.3, h * 0.75, cz, 0.7, 0.1, 0.22, '#7fd84a', STYLE.SMOOTH, rand() * Math.PI, 0, -0.5)
    b.addOn(cx + 0.12, h * 0.6, cz, 0.22, 0.45, 0.22, '#ffd84a', STYLE.STUDS)
  }
}

function barn(b, x, z, facing) {
  const w = 9
  const d = 11
  const h = 5.5
  b.addOn(x, 0, z, w, h, d, '#c8322c', STYLE.PLANKS)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.addOn(x + sx * (w / 2), 0, z + sz * (d / 2), 0.4, h, 0.4, '#ffffff', STYLE.SMOOTH)
  // The big door on the side facing the track, white-framed with a cross brace.
  const fx = x + facing * (w / 2 + 0.05)
  b.addOn(fx, 0, z, 0.2, 3.8, 4.4, '#ffffff', STYLE.SMOOTH)
  b.addOn(fx + facing * 0.05, 0.1, z, 0.2, 3.4, 3.8, '#a8261f', STYLE.PLANKS)
  // The brace lies on the door's face, not a centimetre into it.
  for (const lean of [-0.72, 0.72]) b.add(fx + facing * 0.19, 1.85, z, 0.08, 0.26, 4.8, '#ffffff', STYLE.SMOOTH, 0, lean, 0)
  b.addOn(fx, h + 0.4, z, 0.2, 1.3, 1.3, '#ffffff', STYLE.SMOOTH)
  // A stepped gable roof.
  for (let i = 0; i < 4; i += 1) b.addOn(x, h + i * 0.8, z, w + 0.8 - i * (w / 4), 0.8, d + 0.8, '#5a3a2a', STYLE.PLANKS)
}

function silo(b, x, z) {
  b.addOn(x, 0, z, 3.4, 9, 3.4, '#d9dde3', STYLE.STRIPES)
  b.addOn(x, 9, z, 2.8, 0.8, 2.8, '#c8322c')
  b.addOn(x, 9.8, z, 1.6, 0.6, 1.6, '#c8322c')
}

function windmill(b, x, z, rand) {
  b.addOn(x, 0, z, 4, 4, 4, '#f2ece0', STYLE.STONE)
  b.addOn(x, 4, z, 3.2, 4, 3.2, '#f2ece0', STYLE.STONE)
  b.addOn(x, 8, z, 2.4, 3, 2.4, '#f2ece0', STYLE.STONE)
  b.addOn(x, 11, z, 2.8, 1.4, 2.8, '#7a4a26', STYLE.PLANKS)
  b.addOn(x, 0, z + 2.05, 1.2, 2.2, 0.1, '#6b3e1f', STYLE.PLANKS)
  // Four sails on a hub, facing the track.
  const hubY = 11.7
  const hubZ = z + 1.6
  const turn = rand() * Math.PI
  b.add(x, hubY, hubZ, 0.6, 0.6, 0.6, '#5a3a2a', STYLE.SMOOTH)
  for (let i = 0; i < 4; i += 1) {
    const a = turn + (i * Math.PI) / 2
    b.add(x - Math.sin(a) * 3.4, hubY + Math.cos(a) * 3.4, hubZ + 0.1, 1.3, 6, 0.12, '#f4efe4', STYLE.PLANKS, 0, 0, a)
  }
}

export function hayBale(b, x, z) {
  b.addOn(x, 0, z, 1.7, 1.2, 1.4, '#e8c872', STYLE.STUDS)
  b.addOn(x, 0.55, z, 1.74, 0.1, 1.44, '#b0742e', STYLE.SMOOTH)
}

function pumpkin(b, x, z) {
  b.addOn(x, 0, z, 0.9, 0.7, 0.9, '#ff8a1e', STYLE.STUDS)
  b.addOn(x, 0.7, z, 0.12, 0.25, 0.12, '#3a7a2a', STYLE.SMOOTH)
}

/** A tilled patch of crop rows running alongside the track. */
function cropField(b, x, z, w, d, crop) {
  b.addOn(x, -0.02, z, w, 0.12, d, '#7a5230', STYLE.STUDS)
  const rows = Math.floor(w / 1.6)
  for (let i = 0; i < rows; i += 1) {
    const rx = x - w / 2 + 0.8 + i * 1.6
    if (crop === 'wheat') b.addOn(rx, 0.1, z, 1.0, 1.1, d - 1, '#f0c94a', STYLE.STUDS)
    else if (crop === 'corn') b.addOn(rx, 0.1, z, 0.6, 2.0, d - 1, '#6fcf3a', STYLE.STUDS)
    else b.addOn(rx, 0.1, z, 0.9, 0.5, d - 1, '#4fbf3a', STYLE.STUDS)
  }
}

/** Overgrown temple ruins: a stepped pyramid with moss, a dark doorway and a shrine. */
function temple(b, x, z, size, facing) {
  const tier = size * 0.14
  for (let i = 0; i < 5; i += 1) {
    const w = size * (1 - i * 0.17)
    b.addOn(x, i * tier, z, w, tier, w, i % 2 ? '#8a9a7a' : '#7d8c6e', STYLE.STONE)
    b.addOn(x, (i + 1) * tier, z, w - 0.6, 0.12, w - 0.6, '#4f9a3a', STYLE.STUDS)
  }
  b.addOn(x + facing * (size / 2 + 0.05), 0, z, 0.2, 3.2, 2.6, '#1d2418', STYLE.SMOOTH)
  b.addOn(x, 5 * tier + 0.12, z, size * 0.22, size * 0.18, size * 0.22, '#8a9a7a', STYLE.STONE)
  b.addOn(x + facing * size * 0.11, 5 * tier + 0.3, z, 0.1, size * 0.1, 0.8, '#5cff8a', STYLE.GLOW)
}

export function rock(b, x, y, z, s, color) {
  b.addOn(x, y - 0.2, z, 2.4 * s, 1.6 * s, 2 * s, color, STYLE.STUDS, s * 0.7)
  b.addOn(x + 0.5 * s, y + 0.9 * s, z, 1.3 * s, 0.9 * s, 1.2 * s, color, STYLE.STUDS, s * 1.3)
}

/** Bleached bones of something huge: a spine and a ribcage arching over it. */
export function ribcage(b, x, z, s, rand) {
  const bone = '#efe6d0'
  const yaw = rand() * Math.PI
  const ax = Math.sin(yaw)
  const az = Math.cos(yaw)
  b.add(x, 0.4 * s, z, 0.4 * s, 0.4 * s, 6 * s, bone, STYLE.SMOOTH, yaw)
  b.add(x + ax * 3.4 * s, 0.6 * s, z + az * 3.4 * s, 1.3 * s, 1 * s, 1.5 * s, bone, STYLE.SMOOTH, yaw)
  for (let i = 0; i < 4; i += 1) {
    const t = (i - 1.5) * 1.2 * s
    const h = (2.6 - Math.abs(i - 1.5) * 0.5) * s
    for (const side of [-1, 1]) {
      // Each rib: out and up from the spine, then curving back in over it.
      const px = x + ax * t + side * az * 0.2 * s
      const pz = z + az * t - side * ax * 0.2 * s
      b.add(px + side * az * 0.8 * s, h * 0.45, pz - side * ax * 0.8 * s, 0.25 * s, h, 0.25 * s, bone, STYLE.SMOOTH, yaw, 0, side * 0.45)
      b.add(px + side * az * 0.7 * s, h * 0.95, pz - side * ax * 0.7 * s, 0.22 * s, h * 0.45, 0.22 * s, bone, STYLE.SMOOTH, yaw, 0, -side * 0.7)
    }
  }
}

function pyramid(b, x, z, size) {
  for (let i = 0; i < 6; i += 1) {
    const w = size * (1 - i / 6)
    b.addOn(x, i * size * 0.14, z, w, size * 0.14, w, i % 2 ? '#e6be72' : '#dcb162', STYLE.STONE)
  }
}

function snowman(b, x, z) {
  b.addOn(x, 0, z, 2.2, 2, 2.2, '#ffffff')
  b.addOn(x, 2, z, 1.6, 1.5, 1.6, '#ffffff')
  b.addOn(x, 3.5, z, 1.1, 1.1, 1.1, '#ffffff')
  b.addOn(x, 3.95, z + 0.75, 0.25, 0.25, 0.6, '#ff8a1e', STYLE.SMOOTH)
  b.addOn(x, 4.6, z, 1.3, 0.2, 1.3, '#1d1f24', STYLE.SMOOTH)
  b.addOn(x, 4.8, z, 0.8, 0.8, 0.8, '#1d1f24', STYLE.SMOOTH)
}

function iceCrystal(b, x, y, z, s) {
  b.add(x, y + 1.4 * s, z, 1 * s, 3.4 * s, 1 * s, '#9fdcff', STYLE.GLOW, 0.4, 0, 0.25)
  b.add(x + 0.8 * s, y + 0.9 * s, z, 0.7 * s, 2.2 * s, 0.7 * s, '#c9eeff', STYLE.GLOW, 1.1, 0, -0.35)
}

function volcanoMountain(b, x, z, size) {
  for (let i = 0; i < 6; i += 1) {
    const w = size * (1 - i / 7.5)
    b.addOn(x, i * size * 0.12, z, w, size * 0.12, w, i % 2 ? '#2f2a2d' : '#3a3337')
  }
  b.addOn(x, size * 0.72, z, size * 0.22, 0.4, size * 0.22, '#ff6a14', STYLE.LAVA)
}

export function asteroid(b, x, y, z, s, rand) {
  b.add(x, y, z, 2.4 * s, 2 * s, 2.2 * s, pick(rand, ['#8a8a99', '#6f6f80', '#9a8f86']), STYLE.STUDS, rand() * 3, rand() * 3, rand() * 3)
}

export function planet(b, x, y, z, r, color, ring) {
  b.add(x, y, z, r * 2, r * 1.4, r * 1.4, color, STYLE.GLOW)
  b.add(x, y, z, r * 1.4, r * 2, r * 1.4, color, STYLE.GLOW)
  b.add(x, y, z, r * 1.4, r * 1.4, r * 2, color, STYLE.GLOW)
  if (ring) b.add(x, y, z, r * 3.6, 0.3, r * 3.6, ring, STYLE.GLOW, 0.3, 0.2, 0)
}

// --- Gate --------------------------------------------------------------------------

export function gate(b, meter, theme) {
  const z = zAt(meter)
  const style = theme.gateStyle ?? STYLE.STRIPES
  const half = theme.kerbHalf + 1.6
  for (const x of [-half, half]) {
    b.addOn(x, 0, z, 2, 1, 2, '#e9eef5', STYLE.STONE)
    b.addOn(x, 1, z, 1.6, 13, 1.6, theme.gate, style)
    b.addOn(x, 14.6, z, 1.2, 1.2, 1.2, '#ffd21f', STYLE.GLOW)
  }
  b.addOn(0, 13.5, z, half * 2 + 1.6, 1.6, 1.6, theme.gate, style)
  b.addOn(0, 11.6, z, half * 2, 0.4, 0.5, '#ffffff', STYLE.GLOW)
}

// --- Stages ------------------------------------------------------------------------

/**
 * What grows where, per zone: `tree` plants the stage's tree on the walls' tops; the
 * rest of each entry lays out the islands, the gaps between them and the field's edge.
 */
const DECOR = {
  river(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => oakTree(b, x, y, z, 0.85 + rand() * 0.4, rand)
    for (const [meter, width] of RIVERS) if (meter >= m0 && meter < m1) riverCrossing(b, meter, width, rand, density, theme)
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.75 ? tree(tx, ty, tz) : bigBush(b, tx, ty, tz, 0.8 + rand() * 0.3, rand)))
      },
      (x, z) => (rand() < 0.5 ? bigBush(b, x, 0, z, 0.7 + rand() * 0.4, rand) : tree(x, 0, z)),
    )
    pathSide(m0, m1, 7, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.55) tree(x + Math.sign(x) * 0.8, 0, z)
      else if (r < 0.8) bigBush(b, x, 0, z, 0.7 + rand() * 0.3, rand)
      else rock(b, x, 0, z, 0.6 + rand() * 0.4, '#9aa3ad')
    })
    edgeItems(m0, m1, 8, rand, density, (m, side) => flowers(b, side * (theme.kerbHalf + 0.9), 0, zAt(m), rand))
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.35) oakTree(b, x, y, z, 0.48, rand)
        else if (r < 0.6) bigBush(b, x, y, z, 0.55 + rand() * 0.2, rand)
        else if (r < 0.85) rock(b, x, y, z, 0.5 + rand() * 0.4, '#9aa3ad')
        else flowers(b, x, y, z, rand)
      },
      flat: (x, z) => (rand() < 0.5 ? flowers(b, x, 0, z, rand) : grassTuft(b, x, z, rand)),
    })
  },
  farm(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => roundTree(b, x, y, z, 0.85 + rand() * 0.35, rand)
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        // A fence along the field side of each island, and a tree or a pile of sacks.
        const inner = x - Math.sign(x) * (w / 2 - 0.4)
        fence(b, inner, top, z - d / 2 + 0.6, z + d / 2 - 0.6)
        if (rand() < 0.6) plantIsland(rand, density, x + Math.sign(x) * 0.8, top, z, w - 1.6, d, tree)
        else for (let i = 0; i < 3; i += 1) grainSack(b, x + (rand() - 0.5) * 2, top, z + (i - 1) * 1.2, rand)
      },
      (x, z) => {
        const r = rand()
        if (r < 0.4) hayBale(b, x, z)
        else if (r < 0.7) grainSack(b, x, 0, z, rand)
        else pumpkin(b, x, z)
      },
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.3) tree(x + Math.sign(x) * 0.8, 0, z)
      else if (r < 0.6) corn(b, x, z, rand)
      else if (r < 0.8) for (let i = 0; i < 2; i += 1) grainSack(b, x + (rand() - 0.5) * 1.6, 0, z + (i - 0.5) * 1.2, rand)
      else hayBale(b, x, z)
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.3) roundTree(b, x, y, z, 0.42, rand)
        else if (r < 0.6 || y > 0) for (let i = 0; i < 3; i += 1) grainSack(b, x + (rand() - 0.5) * 1.6, y, z + (i - 1) * 1.1, rand)
        else if (r < 0.75) corn(b, x, z, rand)
        else if (r < 0.9) hayBale(b, x, z)
        else pumpkin(b, x, z)
      },
      flat: (x, z) => (rand() < 0.5 ? grassTuft(b, x, z, rand, '#8cc944') : patch(b, x, z, 2 + rand(), 1.4 + rand(), '#a0764a', STYLE.STUDS)),
    })
    // Between the islands and the wall: crop fields, barns, silos and windmills.
    for (let m = Math.max(m0, DECOR_START) + rand() * 6; m < m1; m += 18 + rand() * 8) {
      if (blockedUntil(m - 9, m + 9) >= 0) continue
      for (const side of [-1, 1]) {
        if (rand() > Math.max(0.5, density)) continue
        const r = rand()
        if (r < 0.45) cropField(b, side * (26.5 + rand() * 1.5), zAt(m), 8 + rand() * 2, 14 + rand() * 3, pick(rand, ['wheat', 'corn', 'cabbage']))
        else if (r < 0.7) barn(b, side * 27, zAt(m), -side)
        else if (r < 0.85) silo(b, side * (25 + rand() * 4), zAt(m))
        else windmill(b, side * 27, zAt(m), rand)
      }
    }
  },
  jungle(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => (rand() < 0.75 ? jungleTree(b, x, y, z, 0.8 + rand() * 0.4, rand) : palmTree(b, x, y, z, 0.9 + rand() * 0.3, rand))
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, tree),
      (x, z) => {
        if (rand() < 0.15) temple(b, x + Math.sign(x) * 3, z, 9 + rand() * 2, -Math.sign(x))
        else tree(x, 0, z)
      },
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.35) jungleTree(b, x + Math.sign(x) * 1.2, 0, z, 0.7 + rand() * 0.25, rand)
      else if (r < 0.6) palmTree(b, x, 0, z, 0.85 + rand() * 0.25, rand)
      else if (r < 0.85) fern(b, x, 0, z, rand)
      else rock(b, x, 0, z, 0.6 + rand() * 0.4, '#7d8c6e')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.25) palmTree(b, x, y, z, 0.5, rand)
        else if (r < 0.45) fern(b, x, y, z, rand)
        else if (r < 0.6) ruinBlock(b, x, y, z, rand)
        else if (r < 0.75) fallenLog(b, x, y, z, rand)
        else if (r < 0.9) rock(b, x, y, z, 0.5 + rand() * 0.4, '#7d8c6e')
        else bigBush(b, x, y, z, 0.55, rand, ['#2f8f58', '#3a9f62'])
      },
      flat: (x, z) => (rand() < 0.6 ? grassTuft(b, x, z, rand, '#3a9f3a') : patch(b, x, z, 1.6 + rand(), 1.2 + rand(), '#3fb6ff', STYLE.WATER)),
    })
  },
  desert(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => (rand() < 0.65 ? palmTree(b, x, y, z, 0.9 + rand() * 0.3, rand) : cactus(b, x, y, z, 0.9 + rand() * 0.3, rand))
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, tree),
      (x, z) => {
        if (rand() < 0.25) ribcage(b, x, z, 0.8 + rand() * 0.3, rand)
        else cactus(b, x, 0, z, 0.9 + rand() * 0.3, rand)
      },
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.35) palmTree(b, x, 0, z, 0.85 + rand() * 0.25, rand)
      else if (r < 0.6) cactus(b, x, 0, z, 0.8 + rand() * 0.3, rand)
      else if (r < 0.8) barrelCactus(b, x, 0, z, 0.8 + rand() * 0.3, rand)
      else rock(b, x, 0, z, 0.6 + rand() * 0.5, '#c98d6a')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.3) cactus(b, x, y, z, 0.7, rand)
        else if (r < 0.5) barrelCactus(b, x, y, z, 0.8 + rand() * 0.3, rand)
        else if (r < 0.75) rock(b, x, y, z, 0.5 + rand() * 0.5, '#c98d6a')
        else if (r < 0.88 && y === 0) ribcage(b, x, z, 0.5, rand)
        else palmTree(b, x, y, z, 0.5, rand)
      },
      flat: (x, z) => (rand() < 0.5 ? pebbles(b, x, z, rand, '#d9a882') : patch(b, x, z, 2 + rand(), 1.4 + rand(), '#e6c2a6', STYLE.STUDS)),
    })
    edgeItems(m0, m1, 70, rand, density, (m, side) => pyramid(b, side * (80 + rand() * 25), zAt(m), 30 + rand() * 12))
  },
  snow(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => snowPine(b, x, y, z, 0.8 + rand() * 0.5, rand)
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.75 ? tree(tx, ty, tz) : iceCrystal(b, tx, ty, tz, 0.8 + rand() * 0.5))),
      (x, z) => (rand() < 0.4 ? snowman(b, x, z) : tree(x, 0, z)),
    )
    pathSide(m0, m1, 7, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.6) snowPine(b, x + Math.sign(x) * 0.8, 0, z, 0.7 + rand() * 0.3, rand)
      else if (r < 0.8) iceCrystal(b, x, 0, z, 0.6 + rand() * 0.4)
      else rock(b, x, 0, z, 0.6 + rand() * 0.4, '#a8b9cc')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.3) iceChunk(b, x, y, z, 0.7 + rand() * 0.4, rand)
        else if (r < 0.5) snowPine(b, x, y, z, 0.5, rand)
        else if (r < 0.7) rock(b, x, y, z, 0.5 + rand() * 0.4, '#a8b9cc')
        else iceCrystal(b, x, y, z, 0.6 + rand() * 0.3)
      },
      flat: (x, z) => (rand() < 0.5 ? patch(b, x, z, 2 + rand() * 1.5, 1.5 + rand(), '#cfeeff', STYLE.GLOW) : pebbles(b, x, z, rand, '#c9d6e3')),
    })
  },
  volcano(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => deadTree(b, x, y, z, 0.9 + rand() * 0.4, rand)
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        // Some islands are pools of lava, the rest grow burnt trees.
        if (rand() < 0.3) b.addOn(x, top - 0.1, z, w - 1.2, 0.14, d - 1.2, '#ff6a14', STYLE.LAVA)
        else plantIsland(rand, density, x, top, z, w, d, tree)
      },
      (x, z) => rock(b, x, 0, z, 0.8 + rand() * 0.6, '#2a2427'),
    )
    pathSide(m0, m1, 7, rand, density, theme, (x, z) => {
      if (rand() < 0.5) deadTree(b, x, 0, z, 0.8 + rand() * 0.3, rand)
      else rock(b, x, 0, z, 0.7 + rand() * 0.5, '#2a2427')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.35) rock(b, x, y, z, 0.5 + rand() * 0.5, '#2a2427')
        else if (r < 0.6) emberCrystal(b, x, y, z, 0.7 + rand() * 0.4, rand)
        else if (r < 0.8 || y > 0) deadTree(b, x, y, z, 0.6, rand)
        else patch(b, x, z, 2.4 + rand() * 1.5, 1.8 + rand(), '#ff6a14', STYLE.LAVA)
      },
      flat: (x, z) => (rand() < 0.6 ? patch(b, x, z, 1.6 + rand(), 1.2 + rand(), '#ff6a14', STYLE.LAVA) : pebbles(b, x, z, rand, '#3a3033')),
    })
    edgeItems(m0, m1, 80, rand, density, (m, side) => volcanoMountain(b, side * (85 + rand() * 25), zAt(m), 30 + rand() * 12))
  },
  space(b, m0, m1, rand, density, theme) {
    // On the road itself: small glowing crystals and moon rocks; across the middle,
    // little stars set into it.
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        if (rand() < 0.5) b.add(x, 0.7, z, 0.6, 1.4, 0.6, pick(rand, ['#9a5cff', '#66e3ff', '#ff7ad9']), STYLE.GLOW, rand() * 3, 0, 0.3)
        else rock(b, x, 0, z, 0.4 + rand() * 0.3, '#8a8aa0')
      },
      flat: (x, z) => b.add(x, 0.07, z, 0.4, 0.06, 0.4, '#fff3a0', STYLE.GLOW, 0.785),
    })
    // Floating islands with crystal trees, either side of the road.
    for (let m = m0 + rand() * 8; m < m1; m += 10 + rand() * 8) {
      if (rand() > density) continue
      for (const side of [-1, 1]) if (rand() < 0.7) crystalTree(b, side * (18 + rand() * 24), -2 + rand() * 12, zAt(m), 0.9 + rand() * 0.5, rand)
    }
    edgeItems(m0, m1, 9, rand, density, (m, side) => asteroid(b, side * (25 + rand() * 40), -6 + rand() * 24, zAt(m), 0.6 + rand() * 1.2, rand))
    if (rand() < 0.5 * density) {
      planet(b, (rand() < 0.5 ? -1 : 1) * (60 + rand() * 40), 20 + rand() * 30, zAt(m0 + rand() * CHUNK), 6 + rand() * 6, pick(rand, ['#ff7ad9', '#7fe2ff', '#ffb14a', '#9b6bff']), rand() < 0.5 ? '#ffe45c' : null)
    }
  },
}

// --- Chunk builder -----------------------------------------------------------------

/**
 * A throw track: its stages (`zones`, as in balance.js), each stage's look (`themes`)
 * and scenery (`decor`, both by zone id), and the crossings the scenery keeps clear of
 * (`crossings`, [metre, width]). Gates stand at each stage's start, plus a welcome arch
 * into the first. World 1's is TRACK below; other worlds bring their own.
 */
export function defineTrack({ zones, themes, decor, crossings = [] }) {
  const gates = zones.map((zone, i) => ({ zone, meter: i === 0 ? 60 : zone.start }))
  const track = { zones, themes, decor, crossings, gates }
  track.buildChunk = (index, options) => buildTrackChunk(track, index, options)
  return track
}

/**
 * Builds chunk `index` (metres [index*CHUNK, (index+1)*CHUNK)) of `track`.
 * @param {{ density?: number }} options 0-1 scenery density (quality and speed)
 */
function buildTrackChunk(track, index, { density = 1 } = {}) {
  const { zones, themes } = track
  building = track
  const b = new BlockSet()
  const rand = mulberry32(index * 7919 + 13)
  const m0 = index * CHUNK
  const m1 = m0 + CHUNK

  // Split the chunk at zone boundaries so each part gets its own floor and scenery.
  // Zones start on wall-cell edges, so every part is whole cells.
  const cuts = [m0]
  for (const zone of zones) if (zone.start > m0 && zone.start < m1) cuts.push(zone.start)
  cuts.push(m1)

  for (let i = 0; i < cuts.length - 1; i += 1) {
    const a = cuts[i]
    const c = cuts[i + 1]
    const zone = zones[zoneIndexAt(a, zones)]
    const theme = themes[zone.id]
    const groundFrom = Math.max(a, LOBBY_GROUND_END)
    const mid = (groundFrom + c) / 2
    const len = c - groundFrom
    if (len > 0) {
      if (theme.ground) b.addOn(0, -1, zAt(mid), 340, 1, len, theme.ground, theme.groundStyle ?? STYLE.STUDS)
      // The landing strip, with a thin kerb either side of it.
      b.addOn(0, -0.2, zAt(mid), theme.roadHalf * 2, 0.25, len, theme.road, theme.roadStyle)
      const kerbWidth = theme.kerbHalf - theme.roadHalf
      for (const side of [-1, 1]) {
        const x = side * (theme.roadHalf + kerbWidth / 2)
        b.addOn(x, -0.2, zAt(mid), kerbWidth, 0.32, len, theme.kerb, theme.kerbStyle ?? STYLE.STUDS)
      }
      // No ground (space), so give the road a visible underside.
      if (!theme.ground) b.addOn(0, -3, zAt(mid), theme.kerbHalf * 2, 2.8, len, theme.underside ?? '#2a2f6a')
    }
    track.decor[zone.id](b, a, c, rand, density, theme)
  }

  for (const g of track.gates) {
    if (g.meter >= m0 && g.meter < m1) gate(b, g.meter, themes[g.zone.id])
  }
  building = null
  return b
}

/** World 1's track: River, Farm, Jungle, Desert, Snow, Volcano and Space. */
export const TRACK = defineTrack({ zones: ZONES, themes: ZONE_THEMES, decor: DECOR, crossings: RIVERS })
export const buildChunk = TRACK.buildChunk
