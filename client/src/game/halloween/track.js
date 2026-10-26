import { HALLOWEEN_ZONES } from '@shared/balance'

import { STYLE } from '../materials'
import {
  CHUNK,
  defineTrack,
  buildIslands,
  buildWalls,
  edgeItems,
  grassTuft,
  hayBale,
  midField,
  patch,
  pathSide,
  pebbles,
  pick,
  planet,
  plantIsland,
  ribcage,
  RIVERS,
  riverCrossing,
  rock,
  zAt,
} from '../flight/track'
import {
  bone,
  candles,
  cattails,
  cauldron,
  coffin,
  crypt,
  ghost,
  gravestone,
  hauntedTower,
  ironFence,
  jackOLantern,
  lampPost,
  mushroom,
  scarecrow,
  skull,
  spookyTree,
  witchHat,
} from './props'

/**
 * World 3's throw track: seven Halloween stages laid out like World 1's (see
 * flight/track.js) - a checkered field, stepped walls, islands along its edge and the
 * stage's things lining and dotting it - from the Pumpkin Patch by the lobby to the
 * Spirit Realm beyond the Vampire Castle.
 */

/** Walls, as in World 1's stages: [x0, x1, kMin, kMax] for islands, then each tier. */
const LOW_WALLS = { islands: [13, 21, 0, 2], tiers: [[21, 32, 2, 4], [32, 56, 5, 8]] }
const HIGH_WALLS = { islands: [13, 20, 1, 3], tiers: [[20, 30, 3, 5], [30, 54, 6, 9]] }

/** Per-stage look, as World 1's ZONE_THEMES. The first has no rockAlt: see buildWalls. */
export const HALLOWEEN_THEMES = {
  pumpkin: {
    ground: '#7a8a3a',
    groundStyle: STYLE.CHECKER,
    road: '#7a8a3a',
    roadStyle: STYLE.CHECKER,
    kerb: '#5e6e2a',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#5c4a6e',
    rockStyle: STYLE.STUDS,
    cap: '#6f7f34',
    walls: LOW_WALLS,
    gate: '#ff7a1c',
    gateStyle: STYLE.PLANKS,
    sky: ['#1a0f3a', '#8a4a7a'],
  },
  graveyard: {
    ground: '#55645a',
    groundStyle: STYLE.CHECKER,
    road: '#55645a',
    roadStyle: STYLE.CHECKER,
    kerb: '#3d4c41',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#5d5a6b',
    rockStyle: STYLE.STONE,
    cap: '#4f6450',
    walls: LOW_WALLS,
    gate: '#8a85a0',
    gateStyle: STYLE.STONE,
    sky: ['#0f1028', '#4a5a7a'],
  },
  haunted: {
    ground: '#46385f',
    groundStyle: STYLE.CHECKER,
    road: '#46385f',
    roadStyle: STYLE.CHECKER,
    kerb: '#b45cff',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#3a2a4a',
    rockStyle: STYLE.STUDS,
    cap: '#4a3a66',
    walls: HIGH_WALLS,
    gate: '#2e2436',
    gateStyle: STYLE.STONE,
    sky: ['#0a0618', '#3f2458'],
  },
  swamp: {
    ground: '#435e2e',
    groundStyle: STYLE.CHECKER,
    road: '#435e2e',
    roadStyle: STYLE.CHECKER,
    kerb: '#7dff4a',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#33402a',
    rockStyle: STYLE.STUDS,
    cap: '#4a6a2e',
    walls: LOW_WALLS,
    gate: '#5a2a7a',
    gateStyle: STYLE.PLANKS,
    sky: ['#0c1a10', '#3f6a3a'],
  },
  bones: {
    ground: '#d8ccb0',
    groundStyle: STYLE.CHECKER,
    road: '#d8ccb0',
    roadStyle: STYLE.CHECKER,
    kerb: '#b8a888',
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#a89a80',
    rockAlt: '#7a6e5c',
    rockStyle: STYLE.STONE,
    cap: null,
    walls: HIGH_WALLS,
    gate: '#efe6d0',
    gateStyle: STYLE.STONE,
    sky: ['#1a1020', '#8a6a5a'],
  },
  vampire: {
    ground: '#3e1c25',
    groundStyle: STYLE.CHECKER,
    road: '#3e1c25',
    roadStyle: STYLE.CHECKER,
    kerb: '#ff2a3a',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    rock: '#2a1a22',
    rockStyle: STYLE.STUDS,
    cap: '#4a1a2a',
    walls: { islands: [13, 21, 0, 2], tiers: [[21, 31, 3, 5], [31, 55, 6, 9]] },
    gate: '#8a1020',
    sky: ['#1a0208', '#7a1a2a'],
  },
  spirit: {
    ground: null,
    road: '#1a1050',
    roadStyle: STYLE.GALAXY,
    kerb: '#66ffd9',
    kerbStyle: STYLE.GLOW,
    roadHalf: 9.5,
    kerbHalf: 10,
    walls: null,
    gate: '#66ffd9',
    sky: ['#02010a', '#1a0a3a'],
    underside: '#140c3a',
  },
}

/** The Pumpkin Patch's streams, where World 1 has rivers: glowing slime under a dark bridge. */
const SLIME = { bank: '#4a3a2a', water: '#59e04a', pad: '#2f5a2a', flower: '#ff7a1c', deck: '#4a3428', rail: '#2a1e18', post: '#1d1612', reed: '#3d5a1e', head: '#5a3a22' }

const AUTUMN = ['#ff7a1c', '#e0560f', '#c9a227']
/** Things beside the field turn to face it. */
const faceIn = (x) => (x > 0 ? -Math.PI / 2 : Math.PI / 2)

const DECOR = {
  pumpkin(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => spookyTree(b, x, y, z, 0.85 + rand() * 0.4, rand, AUTUMN, '#3a2a30')
    for (const [meter, width] of RIVERS) if (meter >= m0 && meter < m1) riverCrossing(b, meter, width, rand, density, theme, SLIME)
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.6 ? tree(tx, ty, tz) : jackOLantern(b, tx, ty, tz, 1.2 + rand() * 0.6, faceIn(tx)))),
      (x, z) => (rand() < 0.4 ? scarecrow(b, x, 0, z, 1, faceIn(x)) : jackOLantern(b, x, 0, z, 1.3, faceIn(x))),
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.45) jackOLantern(b, x, 0, z, 0.9 + rand() * 0.5, faceIn(x))
      else if (r < 0.7) hayBale(b, x, z)
      else if (r < 0.85) scarecrow(b, x, 0, z, 0.9, faceIn(x))
      else tree(x + Math.sign(x) * 0.8, 0, z)
    })
    edgeItems(m0, m1, 9, rand, density, (m, side) => candles(b, side * (theme.kerbHalf + 0.9), 0, zAt(m), 1, rand))
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.45) jackOLantern(b, x, y, z, 0.7 + rand() * 0.4, faceIn(x))
        else if (r < 0.6 && y === 0) hayBale(b, x, z)
        else if (r < 0.8) rock(b, x, y, z, 0.5 + rand() * 0.4, '#6c5e80')
        else candles(b, x, y, z, 1.2, rand)
      },
      flat: (x, z) => (rand() < 0.5 ? patch(b, x, z, 1.6 + rand(), 1.2 + rand(), '#e0560f', STYLE.STUDS) : grassTuft(b, x, z, rand, '#6f7f34')),
    })
  },
  graveyard(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => spookyTree(b, x, y, z, 0.9 + rand() * 0.4, rand, ['#4a3a5a', '#3a4a3a'], '#2a2430')
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        // An iron fence along each island's field side, a row of graves behind it.
        const inner = x - Math.sign(x) * (w / 2 - 0.4)
        ironFence(b, inner, top, z - d / 2 + 0.6, z + d / 2 - 0.6)
        for (let gz = z - d / 2 + 1.5; gz < z + d / 2 - 1; gz += 2.2) gravestone(b, inner + Math.sign(x) * 1.6, top, gz, 0.9, faceIn(x), rand)
        if (w > 7 && rand() < density) tree(x + Math.sign(x) * 1.5, top, z)
      },
      (x, z) => (rand() < 0.3 ? crypt(b, x + Math.sign(x) * 2, 0, z, 0.9, faceIn(x)) : gravestone(b, x, 0, z, 1.2, faceIn(x), rand)),
    )
    pathSide(m0, m1, 5, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.55) gravestone(b, x, 0, z, 1, faceIn(x), rand)
      else if (r < 0.72) lampPost(b, x, 0, z)
      else if (r < 0.88) candles(b, x, 0, z, 1.2, rand)
      else tree(x + Math.sign(x) * 0.8, 0, z)
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.45) gravestone(b, x, y, z, 0.85, faceIn(x), rand)
        else if (r < 0.65) skull(b, x, y, z, 1.1, rand() * 6)
        else if (r < 0.8 && y === 0) coffin(b, x, 0, z, 1, rand() * Math.PI)
        else candles(b, x, y, z, 1.1, rand)
      },
      flat: (x, z) => (rand() < 0.6 ? bone(b, x, 0, z, 0.9, rand() * Math.PI) : pebbles(b, x, z, rand, '#8a8798')),
    })
  },
  haunted(b, m0, m1, rand, density, theme) {
    const glow = ['#b45cff', '#7dff4a', '#ff7ad9']
    const tree = (x, y, z) => spookyTree(b, x, y, z, 1 + rand() * 0.5, rand, ['#5a2a7a', '#3a1f55', '#2f4a3a'], '#1d1624')
    buildWalls(b, m0, m1, rand, density, theme, (x, y, z) => (rand() < 0.8 ? tree(x, y, z) : mushroom(b, x, y, z, 2.2 + rand(), pick(rand, glow))))
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.5 ? tree(tx, ty, tz) : mushroom(b, tx, ty, tz, 1.8 + rand(), pick(rand, glow)))),
      (x, z) => (rand() < 0.5 ? mushroom(b, x, 0, z, 2.4 + rand(), pick(rand, glow)) : tree(x, 0, z)),
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.4) tree(x + Math.sign(x) * 1, 0, z)
      else if (r < 0.7) mushroom(b, x, 0, z, 1.1 + rand() * 0.6, pick(rand, glow))
      else if (r < 0.85) ghost(b, x, 1.2 + rand() * 1.5, z, 1, faceIn(x))
      else rock(b, x, 0, z, 0.6 + rand() * 0.4, '#3a2a4a')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.35) mushroom(b, x, y, z, 0.8 + rand() * 0.5, pick(rand, glow))
        else if (r < 0.55) ghost(b, x, y + 0.8, z, 0.8, faceIn(x))
        else if (r < 0.75) rock(b, x, y, z, 0.5 + rand() * 0.4, '#3a2a4a')
        else spookyTree(b, x, y, z, 0.5, rand, ['#5a2a7a', '#2f4a3a'], '#1d1624')
      },
      flat: (x, z) => (rand() < 0.5 ? mushroom(b, x, 0, z, 0.4, pick(rand, glow)) : grassTuft(b, x, z, rand, '#5a4a7a')),
    })
  },
  swamp(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => spookyTree(b, x, y, z, 0.9 + rand() * 0.5, rand, ['#4f6a2e', '#3d5a1e', '#5a6a3a'], '#2a2a22')
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        // Some islands are pools of bubbling slime, the rest grow mossy trees.
        if (rand() < 0.3) b.addOn(x, top - 0.1, z, w - 1.2, 0.14, d - 1.2, '#59e04a', STYLE.GLOW)
        else plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.7 ? tree(tx, ty, tz) : cauldron(b, tx, ty, tz, 1.3)))
      },
      (x, z) => (rand() < 0.5 ? cattails(b, x, 0, z, rand) : cauldron(b, x, 0, z, 1.2)),
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.35) cattails(b, x, 0, z, rand)
      else if (r < 0.55) cauldron(b, x, 0, z, 1)
      else if (r < 0.7) witchHat(b, x, 0, z, 1.2)
      else tree(x + Math.sign(x) * 0.8, 0, z)
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.3) cauldron(b, x, y, z, 0.9)
        else if (r < 0.5) witchHat(b, x, y, z, 1)
        else if (r < 0.7) cattails(b, x, y, z, rand)
        else if (r < 0.85) rock(b, x, y, z, 0.5 + rand() * 0.4, '#33402a')
        else mushroom(b, x, y, z, 0.8, '#7dff4a')
      },
      flat: (x, z) => (rand() < 0.6 ? patch(b, x, z, 1.6 + rand(), 1.2 + rand(), '#59e04a', STYLE.GLOW) : grassTuft(b, x, z, rand, '#4f6a2e')),
    })
  },
  bones(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => spookyTree(b, x, y, z, 0.9 + rand() * 0.4, rand, ['#efe6d0'], '#8a7e6a')
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => plantIsland(rand, density, x, top, z, w, d, (tx, ty, tz) => (rand() < 0.5 ? skull(b, tx, ty, tz, 2 + rand(), faceIn(tx)) : tree(tx, ty, tz))),
      (x, z) => (rand() < 0.5 ? ribcage(b, x, z, 0.9 + rand() * 0.3, rand) : skull(b, x, 0, z, 2.4, faceIn(x))),
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.4) skull(b, x, 0, z, 1 + rand() * 0.6, faceIn(x))
      else if (r < 0.7) for (let i = 0; i < 3; i += 1) bone(b, x + (rand() - 0.5) * 1.6, 0, z + (i - 1) * 0.8, 1, rand() * Math.PI)
      else if (r < 0.85) ribcage(b, x, z, 0.5, rand)
      else rock(b, x, 0, z, 0.6 + rand() * 0.5, '#a89a80')
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.35) skull(b, x, y, z, 1, faceIn(x))
        else if (r < 0.6 && y === 0) ribcage(b, x, z, 0.5, rand)
        else if (r < 0.8) rock(b, x, y, z, 0.5 + rand() * 0.5, '#a89a80')
        else candles(b, x, y, z, 1.2, rand)
      },
      flat: (x, z) => (rand() < 0.6 ? bone(b, x, 0, z, 1, rand() * Math.PI) : pebbles(b, x, z, rand, '#c9bc9e')),
    })
    // Giant skulls on the horizon, where World 1 has pyramids.
    edgeItems(m0, m1, 70, rand, density, (m, side) => skull(b, side * (80 + rand() * 25), 0, zAt(m), 18 + rand() * 8, faceIn(side)))
  },
  vampire(b, m0, m1, rand, density, theme) {
    const tree = (x, y, z) => spookyTree(b, x, y, z, 0.9 + rand() * 0.4, rand, ['#8a1020', '#5a1020'], '#140c10')
    buildWalls(b, m0, m1, rand, density, theme, tree)
    buildIslands(
      b,
      m0,
      m1,
      rand,
      density,
      theme,
      (x, top, z, w, d) => {
        // Some islands are pools of blood, the rest a coffin with candles at its head.
        if (rand() < 0.3) b.addOn(x, top - 0.1, z, w - 1.2, 0.14, d - 1.2, '#c81e2e', STYLE.LAVA)
        else {
          coffin(b, x, top, z, 1.1, 0)
          candles(b, x, top, z - 1.8, 1.2, rand)
        }
      },
      (x, z) => (rand() < 0.4 ? hauntedTower(b, x + Math.sign(x) * 2, z, 4, 9 + rand() * 4, faceIn(x)) : tree(x, 0, z)),
    )
    pathSide(m0, m1, 6, rand, density, theme, (x, z) => {
      const r = rand()
      if (r < 0.4) lampPost(b, x, 0, z, 1.1)
      else if (r < 0.65) candles(b, x, 0, z, 1.4, rand)
      else if (r < 0.85) coffin(b, x, 0, z, 1, Math.PI / 2 + (rand() - 0.5) * 0.6)
      else tree(x + Math.sign(x) * 0.8, 0, z)
    })
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        const r = rand()
        if (r < 0.3 && y === 0) coffin(b, x, 0, z, 1, rand() * Math.PI)
        else if (r < 0.55) candles(b, x, y, z, 1.3, rand)
        else if (r < 0.8) rock(b, x, y, z, 0.5 + rand() * 0.5, '#2a1a22')
        else b.add(x, y + 1, z, 0.6, 2, 0.6, '#ff2a3a', STYLE.GLOW, rand() * 3, 0, 0.2)
      },
      flat: (x, z) => (rand() < 0.6 ? patch(b, x, z, 1.6 + rand(), 1.2 + rand(), '#c81e2e', STYLE.LAVA) : pebbles(b, x, z, rand, '#3a2a30')),
    })
    // The vampire's castle on the skyline, where World 1 has volcanoes.
    edgeItems(m0, m1, 60, rand, density, (m, side) => hauntedTower(b, side * (70 + rand() * 30), zAt(m), 8 + rand() * 4, 30 + rand() * 15, faceIn(side)))
  },
  spirit(b, m0, m1, rand, density, theme) {
    const glow = ['#66ffd9', '#b45cff', '#9fe8ff']
    midField(b, m0, m1, rand, density, theme, {
      prop: (x, y, z) => {
        if (rand() < 0.5) ghost(b, x, 1 + rand() * 1.5, z, 0.8, faceIn(x))
        else b.add(x, 0.7, z, 0.6, 1.4, 0.6, pick(rand, glow), STYLE.GLOW, rand() * 3, 0, 0.3)
      },
      flat: (x, z) => b.add(x, 0.07, z, 0.4, 0.06, 0.4, '#bffff0', STYLE.GLOW, 0.785),
    })
    // Floating islands either side of the road, each with a glowing grave.
    for (let m = m0 + rand() * 8; m < m1; m += 10 + rand() * 8) {
      if (rand() > density) continue
      for (const side of [-1, 1]) {
        if (rand() > 0.7) continue
        const x = side * (18 + rand() * 24)
        const y = -2 + rand() * 12
        const z = zAt(m)
        b.add(x, y - 1, z, 4, 2, 3.6, '#2e2650', STYLE.STUDS, rand() * 3)
        b.add(x, y - 2.4, z, 2.2, 1.4, 2, '#2e2650', STYLE.STUDS, rand() * 3)
        gravestone(b, x, y, z, 1.2, faceIn(x), rand, '#66ffd9')
      }
    }
    edgeItems(m0, m1, 9, rand, density, (m, side) => ghost(b, side * (25 + rand() * 40), -4 + rand() * 20, zAt(m), 1.5 + rand() * 1.5, faceIn(side)))
    if (rand() < 0.5 * density) {
      planet(b, (rand() < 0.5 ? -1 : 1) * (60 + rand() * 40), 20 + rand() * 30, zAt(m0 + rand() * CHUNK), 6 + rand() * 6, pick(rand, ['#ffe9b0', '#b45cff', '#66ffd9']), rand() < 0.5 ? '#ff7a1c' : null)
    }
  },
}

export const HALLOWEEN_TRACK = defineTrack({ zones: HALLOWEEN_ZONES, themes: HALLOWEEN_THEMES, decor: DECOR, crossings: RIVERS })
