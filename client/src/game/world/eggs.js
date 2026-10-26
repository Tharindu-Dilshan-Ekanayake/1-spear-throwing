import { CylinderGeometry } from 'three'

import { EGG_STANDS, FREE_REWARD, SPHINX_STAND } from '@shared/world'

import { STYLE } from '../materials'

const DISC = new CylinderGeometry(1, 1, 1, 28)
const GOLD = '#ffd21f'

/**
 * Egg stands: a wood-and-marble pedestal ringed in light, plus the big Shadow Egg's dark
 * plinth (with its spikes and wings), the reward chest and King Doggy's dais. Blocks and merged props,
 * riding along in the world's existing draw calls; the eggs themselves float above in
 * EggDisplays.
 */

/** Each stand's light ring, in its egg's colour. */
const RING = { basic: '#ff9cc0', meadow: '#5cff6a', sunset: '#3fdc4a', unicorn: '#ff7ad9' }

/** Height of an egg's centre above the ground. */
export const eggHeight = (stand) => (stand.big ? 3.4 : 2.6)

export function buildEggStands(blocks, props) {
  for (const stand of EGG_STANDS) {
    if (stand.big) {
      // Shadow Egg: dark stepped plinth with a glowing purple rim, a spiked crown and
      // bat wings.
      blocks.addOn(stand.x, 0, stand.z, 4.2, 0.7, 4.2, '#1a1030', STYLE.STONE)
      blocks.addOn(stand.x, 0.7, stand.z, 3.6, 0.35, 3.6, '#9a5cff', STYLE.LAVA)
      blocks.addOn(stand.x, 1.05, stand.z, 3.2, 0.3, 3.2, '#2e1d52')
      const y = eggHeight(stand)
      for (const side of [-1, 1]) {
        props.box(stand.x + side * 0.7, y + 1.95, stand.z, 0.35, 1.1, 0.35, '#c08bff', STYLE.GLOW, [0, 0, side * -0.45])
        props.box(stand.x + side * 1.85, y + 0.5, stand.z - 0.3, 1.6, 0.9, 0.12, '#4a2a8a', STYLE.STUDS, [0, side * 0.3, side * 0.45])
        props.box(stand.x + side * 2.45, y + 1.05, stand.z - 0.45, 1.0, 0.6, 0.12, '#2e1d52', STYLE.STUDS, [0, side * 0.3, side * 0.8])
      }
      props.box(stand.x, y + 2.25, stand.z, 0.35, 1.2, 0.35, '#c08bff', STYLE.GLOW)
      continue
    }
    blocks.addOn(stand.x, 0, stand.z, 3.2, 0.55, 3.2, '#7a4a26', STYLE.PLANKS)
    blocks.addOn(stand.x, 0.55, stand.z, 2.8, 0.35, 2.8, '#f2ece0', STYLE.STONE)
    // A ring of light on the top, in the egg's colour, and gold studs at its corners.
    const ring = RING[stand.eggId] || RING.basic
    for (const side of [-1, 1]) {
      blocks.addOn(stand.x, 0.9, stand.z + side * 1.05, 2.1, 0.06, 0.2, ring, STYLE.GLOW)
      blocks.addOn(stand.x + side * 1.05, 0.9, stand.z, 0.2, 0.06, 1.9, ring, STYLE.GLOW)
      for (const end of [-1, 1]) blocks.addOn(stand.x + side * 1.25, 0.9, stand.z + end * 1.25, 0.3, 0.16, 0.3, '#ffd21f', STYLE.GLOW)
    }
  }

  rewardChest(blocks, props)

  // King Doggy's dais on the carpet before the castle gate: crimson and gold, taller;
  // the pet itself is added by its showcase, the golden ring behind it by the castle.
  const { x, z } = SPHINX_STAND
  blocks.addOn(x, 0, z, 5.6, 0.8, 5.6, '#c8323c', STYLE.STONE)
  blocks.addOn(x, 0.8, z, 5, 0.5, 5, '#ffcf3a', STYLE.GLOW)
  blocks.addOn(x, 1.3, z, 4.4, 0.4, 4.4, '#f2ece0', STYLE.STONE)
}

/**
 * The reward chest, as in the reference: a red treasure chest bound in gold on a
 * glowing yellow ring, its lock facing the plaza (south).
 */
function rewardChest(blocks, props) {
  const { x, z } = FREE_REWARD
  props.add(DISC, { position: [x, 0.04, z], scale: [3.2, 0.08, 3.2], color: '#ffc61a', style: STYLE.GLOW })
  props.add(DISC, { position: [x, 0.06, z], scale: [2.5, 0.08, 2.5], color: '#ffe066', style: STYLE.GLOW })
  // Chest and lid in red planks, the lid a little wider with a rounded top.
  blocks.addOn(x, 0.1, z, 3.0, 1.4, 2.0, '#d8402e', STYLE.PLANKS)
  blocks.addOn(x, 1.5, z, 3.1, 0.6, 2.1, '#e8503a', STYLE.PLANKS)
  blocks.addOn(x, 2.1, z, 2.8, 0.3, 1.7, '#e8503a', STYLE.PLANKS)
  // Gold bands over the lid and down the sides, gold corners, and the lock.
  for (const dx of [-1.05, 1.05]) {
    blocks.addOn(x + dx, 0.1, z, 0.3, 2.04, 2.16, GOLD, STYLE.SMOOTH)
    blocks.addOn(x + dx, 2.1, z, 0.3, 0.34, 1.76, GOLD, STYLE.SMOOTH)
  }
  blocks.addOn(x, 1.42, z, 3.16, 0.16, 2.16, GOLD, STYLE.SMOOTH)
  blocks.addOn(x, 0.9, z + 1.05, 0.6, 0.8, 0.16, GOLD, STYLE.GLOW)
  blocks.addOn(x, 1.05, z + 1.14, 0.2, 0.3, 0.04, '#5a3a1a', STYLE.SMOOTH)
  // A spill of gold coins at its foot.
  for (const [dx, dz] of [[-1.9, 0.6], [1.8, -0.4], [-1.4, 1.3], [1.5, 1.2]]) blocks.addOn(x + dx, 0.08, z + dz, 0.5, 0.12, 0.5, GOLD, STYLE.GLOW)
}
