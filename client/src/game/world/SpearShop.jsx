import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'

import { PLANES } from '@shared/balance'
import { PAD_SIZE, PLANE_PADS, SHOP_AISLE } from '@shared/world'

import { useGame } from '../../store/game'
import { getQuality } from '../../store/quality'
import { BlockSet, disposeBlocks } from '../blocks'
import { AURA_SLOTS, writeAura } from '../fx/aura'
import { createGlowInstances, disposeGlow } from '../glow'
import { padLabelSpec, padState } from '../labels/lobbyLabels'
import { updateWorldLabel } from '../labels/registry'
import { sharedMaterials, STYLE } from '../materials'
import { createSpearMesh, disposeSpearMesh, spearColor, spearGlow, spearOrientation } from '../spear'
import { ARENA } from './structures'

/** Pad colours by state, as in the reference: green owned, yellow equipped, red not. */
const PAD_COLORS = {
  equipped: new Color('#ffd21f'),
  owned: new Color('#3fdc4a'),
  buy: new Color('#ff3b3b'),
  locked: new Color('#b0262b'),
}

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _dir = new Vector3()
const _shopCentre = new Vector3((PLANE_PADS[0].x + PLANE_PADS[19].x) / 2, 2, (PLANE_PADS[0].z + PLANE_PADS[9].z) / 2)
const SPEAR_SCALE = 1.75
const _s = new Vector3(SPEAR_SCALE, SPEAR_SCALE, SPEAR_SCALE)

/** Height of a stand's glowing cap above its pad; the spear floats over it. */
const CAP_TOP = 0.95
const HOVER = CAP_TOP + 2.25
/** How far the spears lean from upright as they turn. */
const LEAN = 0.5
/** The spears' auras only move while the camera is this close to them. */
const AURA_DISTANCE = 60

/**
 * Display stands, all in one block set. The first PLANE_PADS.length blocks are the
 * glowing floor pads themselves (recoloured by state, so their instance index is the
 * pad index); the trimmings follow.
 */
function buildStands() {
  const set = new BlockSet()
  const slab = PAD_SIZE - 0.6
  for (const pad of PLANE_PADS) set.addOn(pad.x, pad.y + 0.06, pad.z, slab, 0.1, slab, '#ffffff', STYLE.GLOW)
  for (const pad of PLANE_PADS) {
    const id = PLANES[pad.index].id
    const { x, y, z } = pad
    // A marble frame round the glowing pad, sunk into the stage like a pit.
    const e = slab / 2 + 0.15
    set.addOn(x, y - 0.1, z, slab + 0.2, 0.16, slab + 0.2, '#2a2033', STYLE.SMOOTH)
    for (const side of [-1, 1]) {
      set.addOn(x, y - 0.1, z + side * e, slab + 0.6, 0.42, 0.3, ARENA.marble, STYLE.SMOOTH)
      set.addOn(x + side * e, y - 0.1, z, 0.3, 0.42, slab, ARENA.marble, STYLE.SMOOTH)
      // Gold studs on the corners.
      for (const end of [-1, 1]) set.addOn(x + side * e, y + 0.32, z + end * e, 0.38, 0.14, 0.38, ARENA.gold, STYLE.GLOW)
    }
    // A short fluted plinth with a glowing cap in the spear's own colours.
    set.addOn(x, y + 0.1, z, 0.95, 0.15, 0.95, ARENA.marbleShade, STYLE.SMOOTH)
    set.addOn(x, y + 0.25, z, 0.7, CAP_TOP - 0.45, 0.7, ARENA.marble, STYLE.STRIPES)
    set.addOn(x, y + CAP_TOP - 0.2, z, 1.0, 0.2, 1.0, spearColor(id), STYLE.SMOOTH)
    set.addOn(x, y + CAP_TOP, z, 0.62, 0.05, 0.62, spearGlow(id), STYLE.GLOW)
  }
  // A red carpet down the aisle between the two rows, edged in gold.
  const length = SHOP_AISLE.maxZ - SHOP_AISLE.minZ
  const midZ = (SHOP_AISLE.minZ + SHOP_AISLE.maxZ) / 2
  set.addOn(SHOP_AISLE.x, 0, midZ, 1.6, 0.06, length, ARENA.crimson, STYLE.SMOOTH)
  for (const side of [-1, 1]) set.addOn(SHOP_AISLE.x + side * 0.88, 0, midZ, 0.16, 0.1, length, ARENA.gold, STYLE.GLOW)
  return set.build(sharedMaterials().blocks)
}

/**
 * The spear shop: twenty display stands in two rows along the west wall, each a glowing pad in a
 * marble frame with its spear floating over a plinth, leaning and slowly turning in
 * its aura. Pads recolour and their labels rewrite as you buy and equip. Three draw
 * calls: stands, spears and auras.
 */
export function SpearShop() {
  const owned = useGame((s) => s.profile.ownedPlanes)
  const equipped = useGame((s) => s.profile.equippedPlane)
  const padsRef = useRef(null)
  const spearsRef = useRef(null)
  const aurasRef = useRef(null)
  /** Which spear each pad's aura slots are coloured for. */
  const auraStyled = useRef(null)
  auraStyled.current ??= PLANES.map(() => null)

  const assets = useMemo(() => {
    const pads = buildStands()
    // All twenty spears, each in its own look, in one draw call.
    const spears = createSpearMesh(PLANES.length)
    PLANES.forEach((spear, i) => spears.setStyle(i, spear.id))
    spears.count = PLANES.length
    // Every spear's aura, in one draw call.
    const auras = createGlowInstances(PLANES.length * AURA_SLOTS, 0.9)
    return { pads, spears, auras }
  }, [])

  useEffect(
    () => () => {
      disposeBlocks(assets.pads)
      disposeSpearMesh(assets.spears)
      disposeGlow(assets.auras)
    },
    [assets],
  )

  // Recolour pads and rewrite their labels whenever ownership changes.
  useEffect(() => {
    const pads = padsRef.current
    const profile = { ownedPlanes: owned, equippedPlane: equipped }
    for (const pad of PLANE_PADS) {
      const state = padState(profile, pad.index)
      pads?.setColorAt(pad.index, PAD_COLORS[state])
      updateWorldLabel(`pad-${pad.index}`, padLabelSpec(pad.index, state))
    }
    if (pads?.instanceColor) pads.instanceColor.needsUpdate = true
  }, [owned, equipped])

  useFrame((state) => {
    const spears = spearsRef.current
    const auras = aurasRef.current
    if (!spears || !auras) return
    const t = state.clock.elapsedTime
    const near = state.camera.position.distanceTo(_shopCentre) < AURA_DISTANCE
    const particles = getQuality().particles
    let slots = 0
    for (const pad of PLANE_PADS) {
      _p.set(pad.x, pad.y + HOVER + Math.sin(t * 1.6 + pad.index) * 0.15, pad.z)
      // Leaning out and slowly turning round, so every side of the head shows.
      const a = t * 0.6 + pad.index * 0.9
      _dir.set(Math.sin(a) * Math.sin(LEAN), Math.cos(LEAN), Math.cos(a) * Math.sin(LEAN))
      spearOrientation(_q, _dir, Math.PI / 2)
      spears.setMatrixAt(pad.index, _m.compose(_p, _q, _s))
      if (near) {
        const id = PLANES[pad.index].id
        const styled = auraStyled.current
        slots += writeAura({ glows: auras, first: slots, id, t, spearMatrix: _m, worldQuaternion: _q, scale: SPEAR_SCALE, particles, styled: styled[pad.index] })
        if (styled[pad.index] !== id) {
          styled[pad.index] = id
          auras.instanceColor.needsUpdate = true
        }
      }
    }
    spears.instanceMatrix.needsUpdate = true
    auras.count = slots
    if (near) auras.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive ref={padsRef} object={assets.pads} />
      <primitive ref={spearsRef} object={assets.spears} />
      <primitive ref={aurasRef} object={assets.auras} />
    </>
  )
}

export default SpearShop
