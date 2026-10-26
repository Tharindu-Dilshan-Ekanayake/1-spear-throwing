import { EGGS, LANES, PETS, PLANES, SHOP, WORLD2_POWER, WORLD3_POWER } from '@shared/balance'
import { formatNumber } from '@shared/format'
import {
  EGG_STANDS,
  FREE_REWARD,
  LANE_DECK_HEIGHT,
  LANE_TARGET_Z,
  laneCenterX,
  PLANE_PADS,
  PORTAL,
  PORTAL_WEST,
  SPHINX_STAND,
} from '@shared/world'

import { eggHeight } from '../world/eggs'
import { LANE_THEMES } from '../world/structures'

/**
 * Text styles, as gradients top-to-bottom, matching the reference signage.
 */
export const TEXT = {
  gold: ['#fffaa8', '#ffd52a', '#ff9c00'],
  green: ['#e6ffb0', '#8dff4f', '#2fd12f'],
  price: ['#d9ff9a', '#7dff4a', '#2fd12f'],
  white: ['#ffffff', '#ffffff', '#dfe7f0'],
  red: ['#ffb0a8', '#ff4a3b', '#d4142a'],
  blue: ['#e0faff', '#7fe2ff', '#2fa8ff'],
  purple: ['#f3e0ff', '#c58bff', '#8a3be0'],
  orange: ['#fff0c2', '#ffae3c', '#ff6a00'],
}

const tint = (hex) => ['#ffffff', hex, hex]

/** "FREE / x1 Power", "1 Rebirth / x2 Power", "VERY OP! / 45 / x30 Power"... */
export function laneLabelSpec(index) {
  const lane = LANES[index]
  const theme = LANE_THEMES[index]
  const lines = []
  if (lane.product) {
    lines.push({ text: lane.tag, size: 50, rainbow: true })
    lines.push({ text: `${formatNumber(SHOP[lane.product].price)} Wins`, size: 44, icon: 'trophy', gradient: TEXT.gold })
  } else if (lane.rebirths === 0) {
    lines.push({ text: 'FREE', size: 50, gradient: TEXT.green })
  } else {
    const word = lane.rebirths === 1 ? 'Rebirth' : 'Rebirths'
    lines.push({ text: `${lane.rebirths} ${word}`, size: 46, icon: 'rebirth', gradient: tint(theme.text) })
  }
  lines.push({ text: `x${lane.mult} Power`, size: 50, icon: 'muscle', gradient: TEXT.gold })
  return { lines, pxPerUnit: 68 }
}

export function laneLabels() {
  return LANES.map((lane, i) => ({
    id: `lane-${i}`,
    // Above each target; every other one higher, as the lanes stand close together.
    position: [laneCenterX(i), LANE_DECK_HEIGHT + (lane.product ? 6.9 : 6.2) + (i % 2) * 2.2, LANE_TARGET_Z],
    spec: laneLabelSpec(i),
    fade: 150,
  }))
}

/** Ownership state of each shop pad: 'equipped' | 'owned' | 'buy' | 'locked'. */
export function padState(profile, index) {
  const plane = PLANES[index]
  if (profile.equippedPlane === plane.id) return 'equipped'
  if (profile.ownedPlanes.includes(plane.id)) return 'owned'
  const previous = PLANES[index - 1]
  return !previous || profile.ownedPlanes.includes(previous.id) ? 'buy' : 'locked'
}

/** "+5 / Power" over "28 Wins", "OWNED" or "EQUIPPED". */
export function padLabelSpec(index, state) {
  const plane = PLANES[index]
  const status =
    state === 'equipped'
      ? { text: 'EQUIPPED', size: 40, gradient: TEXT.gold }
      : state === 'owned'
        ? { text: 'OWNED', size: 40, gradient: TEXT.green }
        : { text: `${formatNumber(plane.cost)} Wins`, size: 40, icon: 'trophy', gradient: state === 'locked' ? TEXT.red : TEXT.gold }
  return {
    lines: [{ text: `+${formatNumber(plane.power)} / Power`, size: 38, icon: 'spear', fill: '#ffffff' }, status],
    pxPerUnit: 82,
  }
}

/** Largest a pad label can get, so its atlas slot fits every state. */
const padReserve = (index) => ({
  lines: [
    { text: `+${formatNumber(PLANES[index].power)} / Power`, size: 38, icon: 'spear' },
    { text: `${formatNumber(PLANES[index].cost)} Wins`, size: 40, icon: 'trophy' },
  ],
})

export function padLabels(profile) {
  return PLANE_PADS.map((pad) => ({
    id: `pad-${pad.index}`,
    // The back row rides higher, so it clears the front row seen from the plaza.
    position: [pad.x, pad.y + 6.6 + pad.row * 1.6, pad.z],
    spec: padLabelSpec(pad.index, padState(profile, pad.index)),
    reserve: padReserve(pad.index),
    fade: 70,
  }))
}

export function eggLabels() {
  return EGG_STANDS.map((stand) => {
    const egg = EGGS[stand.eggId]
    const lines = stand.big
      ? [
          { text: `${egg.name} Egg`, size: 54, gradient: TEXT.purple },
          { text: `${formatNumber(egg.cost.wins)} Wins`, size: 46, icon: 'trophy', gradient: TEXT.gold },
        ]
      : [
          { text: `${egg.name} Egg`, size: 50, fill: '#ffffff' },
          { text: `${formatNumber(egg.cost.wins)} Wins`, size: 44, icon: 'trophy', gradient: TEXT.gold },
        ]
    return {
      id: `egg-${stand.eggId}`,
      position: [stand.x, eggHeight(stand) + (stand.big ? 4 : 2.5), stand.z],
      spec: { lines, pxPerUnit: 62 },
      fade: 100,
    }
  })
}

/** The limited King Doggy showcase: price, hype, and live stock. */
export function sphinxLabelSpec(stock) {
  const mult = PETS[SHOP.sphinx.grant.pet].mult
  return {
    lines: [
      { text: `${formatNumber(SHOP.sphinx.price)} Wins`, size: 46, icon: 'trophy', gradient: TEXT.gold },
      { text: 'BEST IN GAME', size: 56, gradient: TEXT.red },
      { text: PETS[SHOP.sphinx.grant.pet].name, size: 76, fill: '#ffffff' },
      { text: `${formatNumber(mult * 100 - 100)}% BETTER`, size: 54, rainbow: true },
      { text: `${formatNumber(stock)} Left`, size: 50, gradient: TEXT.green },
    ],
    pxPerUnit: 48,
  }
}

export function sphinxLabel(stock) {
  return {
    id: 'sphinx',
    position: [SPHINX_STAND.x, 11.5, SPHINX_STAND.z],
    spec: sphinxLabelSpec(stock),
    reserve: sphinxLabelSpec(88888),
    fade: 140,
  }
}

const freeRewardLabel = () => ({
  id: 'free-reward',
  position: [FREE_REWARD.x, 4.6, FREE_REWARD.z],
  spec: { lines: [{ text: 'FREE REWARD', size: 50, gradient: ['#fff2b0', '#ffb347', '#ff6a1e'] }], pxPerUnit: 60 },
  fade: 90,
})

const portalLabel = () => ({
  id: 'portal',
  position: [PORTAL.x, PORTAL.radius * 2 + 2.8, PORTAL.z],
  spec: {
    lines: [
      { text: 'World 2', size: 58, gradient: TEXT.blue },
      { text: `Needs ${formatNumber(WORLD2_POWER)} Power`, size: 42, icon: 'muscle', gradient: TEXT.gold },
    ],
    pxPerUnit: 56,
  },
  fade: 140,
})

/**
 * Over the west portal: the way to World 3 (what it needs, or that it's open), or in
 * World 3 the way home.
 */
export function westPortalLabelSpec(profile) {
  const lines =
    profile.world === 3
      ? [
          { text: 'World 1', size: 58, gradient: TEXT.blue },
          { text: 'Back Home', size: 42, gradient: TEXT.white },
        ]
      : [
          { text: 'World 3', size: 58, gradient: TEXT.orange },
          { text: 'HALLOWEEN', size: 46, gradient: TEXT.purple },
          profile.worlds.includes(3)
            ? { text: 'OPEN!', size: 42, gradient: TEXT.green }
            : { text: `Needs ${formatNumber(WORLD3_POWER)} Power`, size: 42, icon: 'muscle', gradient: TEXT.gold },
        ]
  return { lines, pxPerUnit: 56 }
}

const westPortalLabel = (profile) => ({
  id: 'portal-west',
  position: [PORTAL_WEST.x, PORTAL_WEST.radius * 2 + 3.4, PORTAL_WEST.z],
  spec: westPortalLabelSpec(profile),
  // Room for the biggest it gets.
  reserve: {
    lines: [
      { text: 'World 3', size: 58 },
      { text: 'HALLOWEEN', size: 46 },
      { text: `Needs ${formatNumber(WORLD3_POWER)} Power`, size: 42, icon: 'muscle' },
    ],
  },
  fade: 140,
})

/** Every label in the lobby. */
export function lobbyLabels(profile, { sphinxStock = 0 } = {}) {
  return [...laneLabels(), ...padLabels(profile), ...eggLabels(), sphinxLabel(sphinxStock), freeRewardLabel(), portalLabel(), westPortalLabel(profile)]
}
