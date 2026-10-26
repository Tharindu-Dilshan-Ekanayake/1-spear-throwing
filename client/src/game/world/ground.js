import {
  BufferAttribute,
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'

import {
  CASTLE,
  EGG_STANDS,
  FREE_REWARD,
  LANE_DECK,
  LEADERBOARDS,
  PLAZA,
  PORTALS,
  SHOP,
  SHOP_STAGES,
  STAGE,
  THROW_LINE_Z,
  WATERFALL,
} from '@shared/world'

import { PALETTE } from '../sceneStyle'

/**
 * The plaza floor: one big plane whose colours come from a tiny "ground map" texture
 * painted at one texel per world unit. Paths, aprons and pads are rectangles painted
 * into it, so their edges always fall on the stud-tile seams, and the whole floor is a
 * single draw call regardless of how many painted regions it has.
 */

const MAP = { minX: -64, maxX: 64, minZ: -44, maxZ: 48 }
const MAP_W = MAP.maxX - MAP.minX
const MAP_H = MAP.maxZ - MAP.minZ

/** Where the ground plane ends to the north: the track's own floor takes over there. */
export const GROUND_NORTH_EDGE = THROW_LINE_Z

function painter(ctx) {
  const rect = (r, color) => {
    ctx.fillStyle = color
    ctx.fillRect(
      Math.round(r.minX - MAP.minX),
      Math.round(r.minZ - MAP.minZ),
      Math.round(r.maxX - r.minX),
      Math.round(r.maxZ - r.minZ),
    )
  }
  const bordered = (r, fill, edge) => {
    rect(r, edge)
    rect({ minX: r.minX + 1, maxX: r.maxX - 1, minZ: r.minZ + 1, maxZ: r.maxZ - 1 }, fill)
  }
  const disc = (x, z, radius, color) => {
    ctx.fillStyle = color
    for (let dz = -radius; dz < radius; dz += 1) {
      for (let dx = -radius; dx < radius; dx += 1) {
        if ((dx + 0.5) ** 2 + (dz + 0.5) ** 2 <= radius * radius) {
          ctx.fillRect(Math.floor(x + dx - MAP.minX), Math.floor(z + dz - MAP.minZ), 1, 1)
        }
      }
    }
  }
  return { rect, bordered, disc }
}

/** `palette` is the world's floor colours (see PALETTE in sceneStyle.js). */
export function createGroundMap(maxTexture, palette = PALETTE) {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')
  const { rect, bordered, disc } = painter(ctx)

  rect(MAP, palette.plaza)

  // Yellow sand round the throw area.
  bordered({ minX: STAGE.minX - 3, maxX: STAGE.maxX + 3, minZ: THROW_LINE_Z, maxZ: STAGE.maxZ + 2.5 }, palette.sand, palette.sandEdge)

  // Paths from the spawn square to everything: north to the throw area, west to the
  // shop and along its front, south to the lanes' deck and along it, east to the
  // leaderboards and along them, and along the row of eggs.
  const front = SHOP_STAGES[0].maxX
  const board = LEADERBOARDS[0].x
  const paths = [
    { minX: -4, maxX: 4, minZ: STAGE.maxZ + 2.5, maxZ: 12 },
    { minX: front, maxX: -4, minZ: 3, maxZ: 9 },
    { minX: front, maxX: front + 4, minZ: SHOP.minZ, maxZ: SHOP.maxZ },
    { minX: -4, maxX: 4, minZ: 12, maxZ: LANE_DECK.minZ - 4 },
    { minX: LANE_DECK.minX, maxX: 4, minZ: LANE_DECK.minZ - 5, maxZ: LANE_DECK.minZ - 1 },
    { minX: 4, maxX: board - 1, minZ: 3, maxZ: 9 },
    { minX: board - 5, maxX: board - 1, minZ: -27, maxZ: 25 },
    { minX: 4, maxX: PLAZA.maxX - 2, minZ: 21, maxZ: 25 },
  ]
  for (const p of paths) bordered(p, palette.path, palette.pathEdge)
  // Paths overlap; repaint the interiors so crossings don't show edges.
  for (const p of paths) {
    rect({ minX: p.minX + 1, maxX: p.maxX - 1, minZ: p.minZ + 1, maxZ: p.maxZ - 1 }, palette.path)
  }
  // The spawn square.
  bordered({ minX: -8, maxX: 8, minZ: 0, maxZ: 12 }, palette.path, palette.pathEdge)

  // The red carpet from the eggs' walk up to the castle gate, edged in gold.
  bordered({ minX: CASTLE.gateX - 2, maxX: CASTLE.gateX + 2, minZ: 21, maxZ: CASTLE.minZ + 2 }, palette.carpet, palette.gold)

  // Glowing rings under the portals, and under the reward chest and the Shadow Egg
  // either side of the spawn square.
  for (const p of PORTALS) {
    disc(p.x, p.z, 6, palette.sandEdge)
    disc(p.x, p.z, 5, palette.sand)
  }
  const bigEgg = EGG_STANDS.find((s) => s.big)
  for (const { x, z } of [FREE_REWARD, bigEgg]) {
    disc(x, z, 5, palette.sandEdge)
    disc(x, z, 4, palette.sand)
  }

  // Waterfall pool at the foot of the north cliff.
  rect({ minX: WATERFALL.x - 6, maxX: WATERFALL.x + 6, minZ: WATERFALL.z, maxZ: WATERFALL.z + 5 }, palette.water)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = maxTexture > 512 ? 4 : 1
  return texture
}

/**
 * The ground plane, with UVs computed from world position so the map lands exactly
 * on the world grid. Outside the map, clamp-to-edge repeats the plaza colour.
 */
export function createGroundGeometry() {
  const minX = -280
  const maxX = 280
  const minZ = GROUND_NORTH_EDGE
  const maxZ = 280
  const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)

  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    uv.setXY(i, (x - MAP.minX) / MAP_W, 1 - (z - MAP.minZ) / MAP_H)
  }
  uv.needsUpdate = true
  geometry.setAttribute('aStyle', new BufferAttribute(new Float32Array(position.count), 1))
  return geometry
}
