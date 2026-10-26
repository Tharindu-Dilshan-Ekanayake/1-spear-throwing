import { TorusGeometry } from 'three'

import { CASTLE, PLANTER_HEIGHT, PLANTERS, SPHINX_STAND } from '@shared/world'

import { star } from '../geometry'
import { GRASS_COLOR, STYLE } from '../materials'
import { ARENA, LOBBY_STONE } from './structures'
import { addTree } from './terrain'

const STONE = '#8f879c'
const IRON = '#4a4456'
const DARK = '#241e2e'
const STAR = star(5, 1, 0.42, 0.1)
const RING = new TorusGeometry(3, 0.22, 8, 40)

/** Battlements along the top of a wall running along x, its front face at `z`. */
function crenellate(blocks, x0, x1, y, z, depth) {
  for (let x = x0 + 0.6; x <= x1 - 0.5; x += 2.2) blocks.addOn(x, y, z, 1.2, 1.2, depth, STONE, STYLE.STONE)
}

/**
 * A square tower centred on (x, z) with battlements, two window slits on the front and a
 * crimson flag on top.
 */
function tower(blocks, x, z, size, height) {
  const front = z - size / 2
  blocks.addOn(x, 0, z, size, height, size, STONE, STYLE.STONE)
  // A ledge round the top, then the battlements on it.
  blocks.addOn(x, height - 0.5, z, size + 0.5, 0.5, size + 0.5, LOBBY_STONE.trim, STYLE.STONE)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    blocks.addOn(x + dx * (size / 2 - 0.45), height, z + dz * (size / 2 - 0.45), 1, 1.2, 1, STONE, STYLE.STONE)
  }
  for (const y of [height * 0.45, height * 0.72]) blocks.addOn(x, y, front - 0.03, 0.5, 1.4, 0.1, DARK, STYLE.SMOOTH)
  blocks.addOn(x, height, z, 0.15, 3.4, 0.15, IRON, STYLE.SMOOTH)
  blocks.addOn(x + 0.75, height + 2.5, z, 1.4, 0.8, 0.06, ARENA.crimson, STYLE.SMOOTH)
}

/**
 * The castle in the south-east corner, as in the reference: a stone curtain wall with
 * battlements, a tower at each end, two gate towers flanking a dark arched gateway with
 * an iron portcullis, and a crimson banner with a white star either side of the gate.
 * Its front faces north, over the eggs to the plaza. In the world's block set and
 * props, so it adds no draw calls. `detail` (off on LOW) adds the battlements and bars.
 */
export function buildCastle(blocks, props, { detail = true } = {}) {
  const { minX, maxX, minZ, maxZ, gateX } = CASTLE
  const wallFront = minZ + 1.5
  const wallHeight = 11

  // Curtain wall, with a trim band under the walkway and battlements along its front.
  blocks.addOn((minX + maxX) / 2, 0, (wallFront + maxZ) / 2, maxX - minX - 6, wallHeight, maxZ - wallFront, STONE, STYLE.STONE)
  blocks.addOn((minX + maxX) / 2, wallHeight - 0.9, wallFront - 0.1, maxX - minX - 6, 0.5, 0.5, LOBBY_STONE.trim, STYLE.STONE)
  if (detail) crenellate(blocks, minX + 3, maxX - 3, wallHeight, wallFront + 0.4, 0.8)

  // Corner towers and gate towers.
  const corner = 7
  tower(blocks, minX + corner / 2, (minZ + maxZ) / 2, corner, 15)
  tower(blocks, maxX - corner / 2, (minZ + maxZ) / 2, corner, 15)
  for (const side of [-1, 1]) tower(blocks, gateX + side * 6, minZ + 2.6, 5, 13.5)

  // The gateway: a dark opening framed in trim, its arch stepped in, and the portcullis.
  const gateZ = wallFront - 0.15
  blocks.addOn(gateX, 0, gateZ, 5.4, 7, 0.3, DARK, STYLE.SMOOTH)
  blocks.addOn(gateX, 7, gateZ, 4.2, 0.6, 0.3, DARK, STYLE.SMOOTH)
  blocks.addOn(gateX, 7.6, gateZ, 2.8, 0.5, 0.3, DARK, STYLE.SMOOTH)
  for (const side of [-1, 1]) blocks.addOn(gateX + side * 3.1, 0, gateZ - 0.05, 0.8, 7.6, 0.4, LOBBY_STONE.trim, STYLE.STONE)
  blocks.addOn(gateX, 8.1, gateZ - 0.05, 6.2, 0.8, 0.4, LOBBY_STONE.trim, STYLE.STONE)
  if (detail) {
    for (let x = gateX - 2.2; x <= gateX + 2.21; x += 0.88) blocks.addOn(x, 0, gateZ - 0.2, 0.18, 6.6, 0.1, IRON, STYLE.SMOOTH)
    for (const y of [2, 4, 6]) blocks.add(gateX, y, gateZ - 0.27, 4.8, 0.18, 0.08, IRON, STYLE.SMOOTH)
  }

  // Banners either side of the gate: crimson on a gold rod, a white star in the middle.
  for (const side of [-1, 1]) {
    const x = gateX + side * 13
    const z = wallFront - 0.08
    blocks.addOn(x, 9.6, z - 0.05, 3.8, 0.25, 0.25, ARENA.gold, STYLE.GLOW)
    blocks.addOn(x, 3.4, z, 3.2, 6.2, 0.1, ARENA.crimson, STYLE.SMOOTH)
    // A swallowtail notch at the foot.
    for (const dx of [-1, 1]) blocks.addOn(x + dx * 1.05, 2.6, z, 1.1, 0.8, 0.1, ARENA.crimson, STYLE.SMOOTH)
    props.add(STAR, { position: [x, 7.4, z - 0.12], rotation: [0, Math.PI, 0], scale: 1.1, color: '#ffffff', style: STYLE.GLOW })
  }

  // King Doggy's golden ring, standing up behind him on his dais.
  props.add(RING, { position: [SPHINX_STAND.x, 4.6, SPHINX_STAND.z + 2.2], color: ARENA.gold, style: STYLE.GLOW })
}

/** The raised grass beds round the plaza, each with its trees and a few flowers. */
export function buildPlanters(blocks, rand) {
  const h = PLANTER_HEIGHT
  for (const p of PLANTERS) {
    blocks.addOn(p.x, -0.1, p.z, p.w, h + 0.1 - 0.3, p.d, LOBBY_STONE.stone, STYLE.STONE)
    blocks.addOn(p.x, h - 0.3, p.z, p.w + 0.2, 0.32, p.d + 0.2, GRASS_COLOR, STYLE.STUDS)
    for (const [dx, dz] of p.trees) addTree(blocks, p.x + dx, h, p.z + dz, 0.9, rand)
    for (let i = 0; i < 3; i += 1) {
      const fx = p.x + (rand() - 0.5) * (p.w - 1.5)
      const fz = p.z + (rand() - 0.5) * (p.d - 1.5)
      blocks.addOn(fx, h, fz, 0.3, 0.3, 0.3, ['#ff6fb8', '#ffe45c', '#ffffff'][i], STYLE.SMOOTH)
    }
  }
}
