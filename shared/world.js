/**
 * Lobby layout: every gameplay-relevant position and trigger area.
 *
 * Shared by the client (which renders it) and the server (which validates positions
 * against it), so the two can never disagree about where a lane or the throw area is.
 *
 * Units are roughly metres - the avatar is 1.8 tall. +X is east, -Z is north, which is
 * "forward" from spawn and the direction spears are thrown.
 *
 * Seen from spawn, as in the reference: the throw area straight ahead (north), opening
 * onto the River field, with the reward chest on its left and the World 2 portal on its
 * right; the spear shop in two rows along the west wall; the training lanes side by
 * side on a raised deck to the south-west; the castle to the south-east with the eggs
 * lined up in front of it; the leaderboards and the Shadow Egg along the east side.
 *
 * Rects are `{ minX, maxX, minZ, maxZ }` on the ground plane.
 */

export const SPAWN = { x: 0, z: 6 }

/** The flat, walkable plaza. Hills surround it on every side but the throw track. */
export const PLAZA = { minX: -54, maxX: 54, minZ: -40, maxZ: 44 }

// --- Throw area ---------------------------------------------------------------------

/**
 * The low platform players throw from, at the north edge of the plaza. Its north edge
 * is the end of the lobby: a railing stops players there, and the track starts on the
 * other side.
 */
export const STAGE = { minX: -12, maxX: 12, minZ: -40, maxZ: -26, height: 0.4 }
/** One low step along its south edge. */
export const STAGE_STEPS = 1
export const STAGE_STEP_DEPTH = 1.2

/** Track metre `m` is at world z = THROW_LINE_Z - m. */
export const THROW_LINE_Z = STAGE.minZ
export const TRACK_HALF_WIDTH = 10

/** Painted "THROW AREA" on the platform: standing in it shows the THROW button. */
export const THROW_AREA = { minX: -8, maxX: 8, minZ: -37.5, maxZ: -28.5 }

/** Walkable ground; the controller clamps the player into it. Nothing past the stage. */
export const WALKABLE = [PLAZA]

// --- Training lanes -----------------------------------------------------------------

/**
 * Lanes stand side by side along the south-west of the plaza on a raised deck, all
 * facing north: you walk in from the plaza at the front (north) and throw at the target
 * at the back (south). Lane 0, the free one, is the easternmost, nearest spawn.
 */
export const LANE_COUNT = 9
export const LANE_WIDTH = 4.8
export const LANE_PITCH = 5.6
/** Entrance edge (north) and far edge (south) of every lane floor. */
export const LANE_FRONT_Z = 27
export const LANE_BACK_Z = 38
/** Where the target stands, just past the far edge. */
export const LANE_TARGET_Z = 39.8
/** The deck the lanes stand on, and the lane floors on it. */
export const LANE_DECK_HEIGHT = 0.5
export const LANE_FLOOR_HEIGHT = 0.6
const LANE0_X = -4

export const laneCenterX = (index) => LANE0_X - index * LANE_PITCH

export function laneRect(index) {
  const cx = laneCenterX(index)
  return {
    minX: cx - LANE_WIDTH / 2,
    maxX: cx + LANE_WIDTH / 2,
    minZ: LANE_FRONT_Z,
    maxZ: LANE_BACK_Z,
  }
}

/** The deck under every lane, with one low step across its front. */
export const LANE_DECK = {
  minX: laneCenterX(LANE_COUNT - 1) - LANE_PITCH / 2 - 0.8,
  maxX: laneCenterX(0) + LANE_PITCH / 2 + 0.8,
  minZ: LANE_FRONT_Z - 1.6,
  maxZ: 44,
  height: LANE_DECK_HEIGHT,
}

// --- Spear shop ---------------------------------------------------------------------

/**
 * The spear shop along the west wall: twenty pads in two rows of ten running
 * north-south, the first ten at ground level in a dark strip at the front, the next ten
 * on a raised step behind, and a big SPEARS board on the wall facing the plaza. The
 * step is low enough to walk straight onto.
 */
export const SHOP = { minX: -51, maxX: -32, minZ: -27, maxZ: 20 }
export const PAD_SIZE = 4
const PAD_PITCH = 4.6
const PAD_FIRST_Z = -24
/** Front strip and back step, in that order. */
export const SHOP_STAGES = [
  { minX: -38.4, maxX: -33.2, minZ: -26.6, maxZ: 19.8, height: 0.15 },
  { minX: -47.6, maxX: -40.6, minZ: -26.6, maxZ: 19.8, height: 1 },
]
/** The red carpet between the two rows. */
export const SHOP_AISLE = { x: -39.5, minZ: -26, maxZ: 19 }
/** The board along the back (west) wall, facing the plaza (east). */
export const SHOP_BOARD = { x: -50.6, minZ: -24, maxZ: 16, top: 17.5 }

const PAD_ROWS_X = [-35.8, -44.1]

/**
 * Twenty stands, ten to a row. `row` (0 front, 1 back) lets the labels above them step
 * up so the nearer ones don't hide the farther ones.
 */
export const PLANE_PADS = Array.from({ length: 20 }, (_, i) => {
  const row = Math.floor(i / 10)
  return {
    index: i,
    row,
    x: PAD_ROWS_X[row],
    z: PAD_FIRST_Z + (i % 10) * PAD_PITCH,
    y: SHOP_STAGES[row].height,
  }
})

export const padRect = (pad) => ({
  minX: pad.x - PAD_SIZE / 2,
  maxX: pad.x + PAD_SIZE / 2,
  minZ: pad.z - PAD_SIZE / 2,
  maxZ: pad.z + PAD_SIZE / 2,
})

// --- Castle, eggs, showcases, boards ------------------------------------------------

/** The castle filling the south-east corner; its gate faces the plaza at `gateX`. */
export const CASTLE = { minX: 4, maxX: 52, minZ: 37, maxZ: 44, gateX: 28 }

/** Eggs lined up in front of the castle, and the big Shadow Egg on the east side. */
export const EGG_STANDS = [
  { eggId: 'basic', x: 11, z: 28 },
  { eggId: 'meadow', x: 18, z: 28 },
  { eggId: 'sunset', x: 38, z: 28 },
  { eggId: 'unicorn', x: 45, z: 28 },
  { eggId: 'demon', x: 46, z: 12, big: true },
]
export const EGG_TRIGGER_RADIUS = 4.2

/** Limited premium pet on display (King Doggy), on the carpet before the gate. */
export const SPHINX_STAND = { x: 28, z: 29 }

/** Along the east side, facing west into the plaza. */
export const LEADERBOARDS = [
  { id: 'rebirths', x: 50.5, z: -22 },
  { id: 'playtime', x: 50.5, z: -10.5 },
  { id: 'power', x: 50.5, z: 1 },
]

/** The World 2 portal, right of the throw area. */
export const PORTAL = { x: 22, z: -32, radius: 3.4 }
/** The reward chest, left of the throw area. */
export const FREE_REWARD = { x: -22, z: -32, radius: 3 }
export const WATERFALL = { x: 40, z: -40 }

/**
 * Raised grass beds round the plaza, each with a tree or two: `trees` are offsets from
 * the bed's centre. Walkable (they're low), but the trunks are solid.
 */
export const PLANTERS = [
  { x: -18, z: -13, w: 9, d: 6, trees: [[-2, 0], [2.4, 0.6]] },
  { x: 18, z: -13, w: 9, d: 6, trees: [[2, 0], [-2.4, -0.6]] },
  { x: -18, z: 13, w: 8, d: 6, trees: [[0, 0]] },
  { x: 20, z: 13, w: 8, d: 6, trees: [[0, 0]] },
]
export const PLANTER_HEIGHT = 0.8

// --- Collision ----------------------------------------------------------------------

const box = (x, z, halfX, halfZ) => ({
  minX: x - halfX,
  maxX: x + halfX,
  minZ: z - halfZ,
  maxZ: z + halfZ,
})

/** Solid, never-changing obstacles. Locked lanes add their own walls at runtime. */
export const STATIC_COLLIDERS = [
  // The shop's board.
  { minX: SHOP_BOARD.x - 0.6, maxX: SHOP_BOARD.x + 0.6, minZ: SHOP_BOARD.minZ - 0.5, maxZ: SHOP_BOARD.maxZ + 0.5 },
  // The castle.
  { minX: CASTLE.minX, maxX: CASTLE.maxX, minZ: CASTLE.minZ, maxZ: CASTLE.maxZ },
  // Egg pedestals.
  ...EGG_STANDS.map((s) => box(s.x, s.z, s.big ? 2.1 : 1.6, s.big ? 2.1 : 1.6)),
  box(SPHINX_STAND.x, SPHINX_STAND.z, 3, 3),
  ...LEADERBOARDS.map((b) => box(b.x, b.z, 0.6, 4.7)),
  box(FREE_REWARD.x, FREE_REWARD.z, 1.7, 1.3),
  // The portal ring's base; the swirl itself is walk-through.
  box(PORTAL.x - PORTAL.radius, PORTAL.z, 0.6, 0.8),
  box(PORTAL.x + PORTAL.radius, PORTAL.z, 0.6, 0.8),
  // Pillars at the throw area's front corners, and the railing along its north edge.
  box(STAGE.minX + 1, STAGE.minZ + 1, 0.9, 0.9),
  box(STAGE.maxX - 1, STAGE.minZ + 1, 0.9, 0.9),
  { minX: STAGE.minX, maxX: STAGE.maxX, minZ: STAGE.minZ - 1, maxZ: STAGE.minZ + 0.4 },
  // Target stands at the back of each lane.
  ...Array.from({ length: LANE_COUNT }, (_, i) => box(laneCenterX(i), LANE_TARGET_Z, 1.6, 0.9)),
  // Tree trunks in the grass beds.
  ...PLANTERS.flatMap((p) => p.trees.map(([dx, dz]) => box(p.x + dx, p.z + dz, 0.5, 0.5))),
]

/** Raised floors the player stands on, as rects with a height. */
export const PLATFORMS = [
  ...SHOP_STAGES.map((s) => ({ ...s })),
  { ...STAGE },
  // The step up the throw area's south side.
  ...Array.from({ length: STAGE_STEPS }, (_, i) => ({
    minX: STAGE.minX + 2,
    maxX: STAGE.maxX - 2,
    minZ: STAGE.maxZ,
    maxZ: STAGE.maxZ + (STAGE_STEPS - i) * STAGE_STEP_DEPTH,
    height: (STAGE.height * (i + 1)) / (STAGE_STEPS + 1),
  })),
  { ...LANE_DECK },
  ...Array.from({ length: LANE_COUNT }, (_, i) => ({ ...laneRect(i), height: LANE_FLOOR_HEIGHT })),
  ...PLANTERS.map((p) => ({ minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2, height: PLANTER_HEIGHT })),
]

// --- Helpers ------------------------------------------------------------------------

export const inRect = (r, x, z, margin = 0) =>
  x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin

/** Index of the lane whose floor contains (x, z), or -1. */
export function laneAt(x, z, margin = 0) {
  for (let i = 0; i < LANE_COUNT; i += 1) {
    if (inRect(laneRect(i), x, z, margin)) return i
  }
  return -1
}

export const inThrowArea = (x, z, margin = 0) => inRect(THROW_AREA, x, z, margin)

/** Index of the spear pad under (x, z), or -1. */
export function padAt(x, z) {
  for (const pad of PLANE_PADS) {
    if (inRect(padRect(pad), x, z)) return pad.index
  }
  return -1
}

/** The egg stand within reach of (x, z), or null. */
export function eggStandNear(x, z) {
  for (const stand of EGG_STANDS) {
    const reach = EGG_TRIGGER_RADIUS + (stand.big ? 1 : 0)
    if (Math.hypot(stand.x - x, stand.z - z) <= reach) return stand
  }
  return null
}

/** Height of the floor at (x, z): raised platforms, else the ground at 0. */
export function groundHeightAt(x, z) {
  let h = 0
  for (const p of PLATFORMS) {
    if (p.height > h && inRect(p, x, z)) h = p.height
  }
  return h
}

/** Clamps (x, z) into the walkable union, returning the nearest walkable point. */
export function clampToWalkable(x, z, out = { x: 0, z: 0 }) {
  let best = Infinity
  for (const r of WALKABLE) {
    const cx = Math.min(r.maxX, Math.max(r.minX, x))
    const cz = Math.min(r.maxZ, Math.max(r.minZ, z))
    const d = (cx - x) ** 2 + (cz - z) ** 2
    if (d < best) {
      best = d
      out.x = cx
      out.z = cz
      if (d === 0) break
    }
  }
  return out
}

/** Fastest a player can legitimately move, for the server's anti-teleport check. */
export const MAX_MOVE_SPEED = 14
