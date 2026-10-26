import { PORTAL } from '@shared/world'

import { STYLE } from '../materials'

/** Height of a portal ring's centre. */
export const PORTAL_CENTER_Y = PORTAL.radius + 0.6

/** The World 2 portal's colours: a golden ring on a mauve stone base. */
export const GOLDEN_FRAME = { ring: ['#ffb21e', '#ffe066'], base: '#8b7fa3' }
/** The World 3 portal's: Halloween orange and purple on dark stone. */
export const HALLOWEEN_FRAME = { ring: ['#ff7a1c', '#8a3cc7'], base: '#3a3042' }
/** The way home from World 3: sky blue and white. */
export const HOME_FRAME = { ring: ['#3fa0ff', '#d8f4ff'], base: '#5c5070' }

/**
 * A portal's frame: a ring of blocks in two alternating colours standing upright,
 * facing the plaza. Neighbouring blocks overlap, so every other one is a little deeper:
 * all at one depth, their faces shared a plane and flickered.
 */
export function buildPortalFrame(blocks, portal = PORTAL, { ring, base } = GOLDEN_FRAME) {
  const segments = 20
  const r = portal.radius
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2
    const x = portal.x + Math.cos(a) * r
    const y = PORTAL_CENTER_Y + Math.sin(a) * r
    blocks.add(x, y, portal.z, 1.2, 1.2, i % 2 ? 1.4 : 1.56, ring[i % 2], STYLE.GLOW, 0, 0, a)
  }
  blocks.addOn(portal.x, 0, portal.z, r * 2 + 1.5, 0.5, 2.4, base, STYLE.STONE)
}
