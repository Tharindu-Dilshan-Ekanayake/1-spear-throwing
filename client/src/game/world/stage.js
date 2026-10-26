import { CylinderGeometry } from 'three'

import { STAGE, STAGE_STEP_DEPTH, STAGE_STEPS, THROW_AREA } from '@shared/world'

import { star } from '../geometry'
import { STYLE } from '../materials'
import { ARENA } from './structures'

const { marble: MARBLE, marbleShade: SHADE, crimson: CRIMSON, gold: GOLD } = ARENA
const SAND = '#f2c94c'

const BOWL = new CylinderGeometry(1, 0.6, 1, 12)
const STAR = star(5, 0.5, 0.22, 0.08)

/** A brazier: a bronze bowl on a short foot, full of fire. */
function brazier(blocks, props, x, y, z, size = 1) {
  blocks.addOn(x, y, z, 0.45 * size, 0.2 * size, 0.45 * size, ARENA.bronze, STYLE.SMOOTH)
  props.add(BOWL, { position: [x, y + 0.45 * size, z], scale: [0.9 * size, 0.55 * size, 0.9 * size], color: ARENA.bronze })
  blocks.add(x, y + 0.85 * size, z, 0.9 * size, 0.7 * size, 0.9 * size, ARENA.fire, STYLE.GLOW, 0.785)
  blocks.add(x, y + 1.3 * size, z, 0.5 * size, 0.6 * size, 0.5 * size, ARENA.flame, STYLE.GLOW, 0.3)
}

/**
 * The throw area, as in the reference: a low, wide platform of yellow sand at the north
 * edge of the plaza, open to the River field ahead so you can see where you're
 * throwing. On it, the painted throw pad (a red running track with lane lines and a foul
 * line); a gold rail along its front edge; a marble pillar at each front corner topped
 * with fire and hung with a crimson banner; and a step along its south side.
 *
 * Boxes go into the world's block set and the round parts into its props, so the whole
 * thing rides in those two draw calls. `detail` (off on LOW) adds the small trimmings.
 *
 * No two faces here share a plane: every layer stands a clear step proud of what it
 * sits on (flush faces flicker, worst on phones' coarser depth buffers).
 */
export function buildStage(blocks, props, { detail = true } = {}) {
  const { minX, maxX, minZ, maxZ, height } = STAGE
  const width = maxX - minX
  const depth = maxZ - minZ
  const midZ = (minZ + maxZ) / 2

  // Body in sand, with a crimson band around its sides and a gold edge on top. The band
  // stays under the step's tread, which it runs beneath.
  blocks.addOn(0, -0.1, midZ, width, height + 0.1, depth, SAND, STYLE.STUDS)
  blocks.addOn(0, 0, midZ, width + 0.3, height * 0.4, depth + 0.3, CRIMSON)
  for (const side of [-1, 1]) blocks.addOn(side * (width / 2 - 0.25), height, midZ, 0.35, 0.06, depth - 0.6, GOLD, STYLE.GLOW)

  // The throw pad: a white border with the red track raised on it, lane lines and a
  // glowing foul line where the spear is released.
  const padX = (THROW_AREA.minX + THROW_AREA.maxX) / 2
  const padZ = (THROW_AREA.minZ + THROW_AREA.maxZ) / 2
  const padW = THROW_AREA.maxX - THROW_AREA.minX
  const padD = THROW_AREA.maxZ - THROW_AREA.minZ
  blocks.addOn(padX, height, padZ, padW + 0.8, 0.06, padD + 0.8, '#ffffff', STYLE.SMOOTH)
  blocks.addOn(padX, height + 0.06, padZ, padW, 0.06, padD, ARENA.track, STYLE.STUDS)
  // The lane lines stop short of the foul line rather than run under it.
  for (const x of [-padW / 4, padW / 4]) blocks.addOn(padX + x, height + 0.12, padZ + 0.25, 0.14, 0.02, padD - 0.9, '#ffffff', STYLE.SMOOTH)
  blocks.addOn(padX, height + 0.12, THROW_AREA.minZ + 0.35, padW - 0.2, 0.03, 0.3, '#ffffff', STYLE.GLOW)
  // Glowing corner marks around the pad.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = padX + sx * (padW / 2 + 0.75)
      const z = padZ + sz * (padD / 2 + 0.75)
      blocks.addOn(x - sx * 0.35, height, z, 0.9, 0.1, 0.2, GOLD, STYLE.GLOW)
      blocks.addOn(x, height, z - sz * 0.35, 0.2, 0.1, 0.9, GOLD, STYLE.GLOW)
    }
  }

  // The step up its south side. Each block covers only its own tread, so neighbouring
  // steps never overlap and their sides can't fight.
  for (let i = 0; i < STAGE_STEPS; i += 1) {
    const front = (STAGE_STEPS - i) * STAGE_STEP_DEPTH
    const back = (STAGE_STEPS - i - 1) * STAGE_STEP_DEPTH
    const stepHeight = (height * (i + 1)) / (STAGE_STEPS + 1)
    blocks.addOn(0, -0.1, maxZ + (front + back) / 2, width - 4, stepHeight + 0.1, front - back, i % 2 ? SHADE : MARBLE, STYLE.STONE)
  }

  // Front railing between the corner pillars: marble posts and a gold rail, its ends
  // buried in the pillars. The rail is a touch deeper than the posts and the posts stay
  // clear of the pillars' bases, so no two faces line up. The spear flies over it.
  const railZ = minZ + 0.25
  const railSpan = width - 2.7
  for (let x = -9; x <= 9; x += 2) blocks.addOn(x, height, railZ, 0.3, 1, 0.3, MARBLE, STYLE.SMOOTH)
  blocks.addOn(0, height + 0.9, railZ, railSpan, 0.22, 0.36, GOLD, STYLE.GLOW)
  blocks.addOn(0, height + 0.4, railZ, railSpan, 0.12, 0.2, MARBLE)

  // Pillars on the front corners: fluted marble on a stone base, a gold capital, fire on
  // top, and a crimson banner with a gold star hanging on the side facing the plaza.
  const pillarTop = height + 7
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 1)
    const z = minZ + 1
    blocks.addOn(x, height, z, 1.8, 0.5, 1.8, SHADE, STYLE.STONE)
    blocks.addOn(x, height + 0.5, z, 1.3, pillarTop - height - 1.1, 1.3, MARBLE, STYLE.STRIPES)
    blocks.addOn(x, pillarTop - 0.6, z, 1.7, 0.6, 1.7, GOLD, STYLE.SMOOTH)
    brazier(blocks, props, x, pillarTop, z, 1.1)
    blocks.addOn(x, pillarTop - 4.6, z + 0.72, 1.1, 3.6, 0.08, CRIMSON, STYLE.SMOOTH)
    props.add(STAR, { position: [x, pillarTop - 2.4, z + 0.8], color: GOLD, style: STYLE.GLOW })
    if (detail) {
      // Thicker than the banner, so they stand proud of both its faces.
      for (const dx of [-0.58, 0.58]) blocks.addOn(x + dx, pillarTop - 4.6, z + 0.72, 0.08, 3.6, 0.12, GOLD, STYLE.GLOW)
    }
  }
}
