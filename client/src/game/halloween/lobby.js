import { mulberry32 } from '@shared/rng'
import { CASTLE, PLANTER_HEIGHT, PLANTERS, PORTAL, PORTAL_WEST, STAGE } from '@shared/world'

import { BlockSet, PropBuilder } from '../blocks'
import { STYLE } from '../materials'
import { HALLOWEEN } from '../sceneStyle'
import { buildCastle } from '../world/castle'
import { buildEggStands } from '../world/eggs'
import { buildPortalFrame, GOLDEN_FRAME, HOME_FRAME } from '../world/portalFrame'
import { buildStage } from '../world/stage'
import { buildLanes, buildShop } from '../world/structures'
import { buildTargets } from '../world/targets'
import { buildTerrain } from '../world/terrain'
import { buildWaterfall } from '../world/waterfall'
import { candles, cauldron, gravestone, jackOLantern, lampPost, spookyTree } from './props'

const { palette } = HALLOWEEN

/**
 * World 1's colours that change in World 3: mauve stone a shade darker, crimson to
 * purple, gold to pumpkin orange, the braziers' fire to witch-green, the waterfall to
 * slime, and the castle's dark gateway and window slits lit from within. A style, where
 * given, changes too.
 */
const SWAPS = [
  ['#8b7fa3', '#5c5070'],
  ['#6d6286', '#463c5c'],
  ['#3a3042', '#231b2e'],
  ['#8f879c', '#5a5068'],
  ['#241e2e', '#c2470f', STYLE.GLOW],
  ['#c8323c', '#7b2fbe'],
  ['#7e1d27', '#3d1460'],
  ['#ffd21f', '#ff8c1a'],
  ['#f2c94c', '#ff9a3c'],
  ['#d9573b', '#5b2a86'],
  ['#ff9a2e', '#7dff4a'],
  ['#ffe066', '#d9ff8f'],
  ['#59c8ff', '#7dff4a'],
  ['#a8e4ff', '#c4ff9a'],
]

/** A spooky tree in World 3's autumn leaves, for the hills. */
const hillTree = (b, x, base, z, s, rand) => spookyTree(b, x, base, z, s, rand, palette.leaves, palette.trunk)

/**
 * The grass beds, as graves: dark soil in the stone border. Where World 1 has trees,
 * spooky trees stand on the same spots (their trunks are solid there), with a
 * gravestone and candles; the flower beds are pumpkin patches in tidy rows.
 */
function buildGraveBeds(blocks, rand) {
  const h = PLANTER_HEIGHT
  for (const p of PLANTERS) {
    blocks.addOn(p.x, -0.1, p.z, p.w, h + 0.1 - 0.3, p.d, '#5c5070', STYLE.STONE)
    blocks.addOn(p.x, h - 0.3, p.z, p.w + 0.2, 0.32, p.d + 0.2, '#3a2a2e', STYLE.STUDS)
    if (!p.trees.length) {
      for (let ix = -1; ix <= 1; ix += 1) {
        for (const iz of [-1, 1]) jackOLantern(blocks, p.x + ix * 2.6, h, p.z + iz * 1.3, 0.85, iz > 0 ? 0 : Math.PI)
      }
      continue
    }
    for (const [dx, dz] of p.trees) spookyTree(blocks, p.x + dx, h, p.z + dz, 0.85, rand, palette.leaves, palette.trunk)
    // Facing the path to the throw area, which runs past the beds' inner ends.
    const inward = p.x < 0 ? Math.PI / 2 : -Math.PI / 2
    gravestone(blocks, p.x + Math.sign(-p.x) * 0.2, h, p.z + p.d / 2 - 0.9, 0.8, inward, rand)
    candles(blocks, p.x - Math.sign(p.x) * 3.4, h, p.z + p.d / 2 - 0.8, 1, rand)
  }
}

/**
 * Mirrored decorations: jack-o'-lanterns lining the way from spawn to the throw area,
 * lamp posts where it meets the spawn square, a little graveyard in each north corner,
 * and a witch's cauldron either side of the castle gate.
 */
function decorate(blocks, rand, detail) {
  for (const side of [-1, 1]) {
    for (const z of [-21, -15, -9]) jackOLantern(blocks, side * 4.8, 0, z, 0.8, -side * (Math.PI / 2))
    lampPost(blocks, side * 4.8, 0, -3)
    // The graveyards: two rows of three, facing the plaza, east of the waterfall's pool
    // and west of it in mirror.
    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < 3; i += 1) gravestone(blocks, side * (47.5 + i * 2.5), 0, -37 + row * 4, 1, 0, rand)
    }
    if (detail) candles(blocks, side * 49, 0, -30.5, 1.2, rand)
    cauldron(blocks, CASTLE.gateX + side * 5, 0, 33.5, 1)
  }
  // Two jack-o'-lanterns on the throw stage's front step, either side of the way up.
  for (const side of [-1, 1]) jackOLantern(blocks, side * (STAGE.maxX - 3), 0.2, STAGE.maxZ + 0.6, 0.7)
}

/**
 * World 3's lobby: World 1's layout and builders in Halloween colours, hills of spooky
 * trees, grave beds, and the decorations above. Same shape as World.jsx's build, so the
 * same three draw calls.
 */
export function buildHalloweenLobby({ decorDensity }) {
  const set = new BlockSet()
  const props = new PropBuilder()
  const detail = decorDensity >= 0.75
  buildTerrain(set, { treeDensity: decorDensity, dirt: palette.dirt, tree: hillTree })
  buildLanes(set, { detail })
  buildShop(set, { detail })
  buildStage(set, props, { detail })
  buildCastle(set, props, { detail })
  buildWaterfall(set)
  buildTargets(props)
  buildEggStands(set, props)
  set.recolor(SWAPS)
  props.recolor(SWAPS)

  // Painted after the swap, in their own colours: the way to World 2 stays golden, and
  // the way home is sky blue.
  buildPortalFrame(set, PORTAL, GOLDEN_FRAME)
  buildPortalFrame(set, PORTAL_WEST, HOME_FRAME)
  const rand = mulberry32(31)
  buildGraveBeds(set, rand)
  decorate(set, rand, detail)
  return { set, props }
}
