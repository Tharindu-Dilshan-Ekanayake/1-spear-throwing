import { create } from 'zustand'

import { getGame, useGame } from '../store/game'
import { GRASS_COLOR } from './materials'
import { runtime } from './runtime'
import { CLOUDS, FOG, GRASS, HALLOWEEN, LIGHTS, PALETTE, SKY } from './sceneStyle'
import { skyUniforms } from './skyState'

/**
 * Each world's sky, fog, clouds, lights and grass (see sceneStyle.js). Only colours, so
 * they all ship with the lobby; a world's scenery loads when you first go there.
 */
export const LOOKS = {
  1: { sky: SKY, fog: FOG, clouds: CLOUDS, lights: LIGHTS, grass: GRASS, palette: PALETTE },
  3: HALLOWEEN,
}

/** World 3's lobby and track, fetched the first time they're needed. */
export const loadHalloween = () => import('./halloween')

/**
 * The world on screen. It follows the profile's world, but only once the screen has
 * faded out (see watchWorld), so the swap itself is never seen. `fade` is the world
 * being faded to, or null.
 */
export const useWorld = create(() => ({ shown: 1, look: LOOKS[1], fade: null }))

/** Retints the sky dome and the hills' grass, which read module-level uniforms. */
function applyLook(look) {
  skyUniforms.topColor.value.set(look.sky.top)
  skyUniforms.horizonColor.value.set(look.sky.horizon)
  skyUniforms.exponent.value = look.sky.exponent
  GRASS_COLOR.set(look.grass)
}

const FADE_MS = 350
/** Time for the new lobby to build and draw before the screen fades back in. */
const SETTLE_MS = 250
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Keeps the world on screen in step with the profile's: fades out, fetches the new
 * world's scenery if it isn't loaded yet, swaps the look and the scenery, puts the
 * player where the portal sent them, and fades back in.
 *
 * @returns {() => void} stop
 */
export function watchWorld() {
  let busy = false
  let stopped = false
  async function sync() {
    if (busy) return
    busy = true
    while (!stopped && getGame().profile.world !== useWorld.getState().shown) {
      const to = getGame().profile.world
      useWorld.setState({ fade: to })
      runtime.player.frozen = true
      try {
        await Promise.all([wait(FADE_MS), to === 3 ? loadHalloween() : null])
      } catch (err) {
        // Offline with the chunk never fetched: stay where we are rather than hang.
        console.warn('[world] could not load world', to, err)
        break
      }
      const look = LOOKS[to] || LOOKS[1]
      applyLook(look)
      useWorld.setState({ shown: to, look })
      const spawn = runtime.pendingSpawn
      if (spawn) {
        runtime.player.position.set(spawn.x, 0, spawn.z)
        runtime.player.yaw = Math.PI
        runtime.camera.yaw = 0
        runtime.camera.snap = true
        runtime.pendingSpawn = null
      }
      await nextFrame()
      await nextFrame()
      await wait(SETTLE_MS)
    }
    runtime.player.frozen = false
    useWorld.setState({ fade: null })
    busy = false
  }
  sync()
  const unsubscribe = useGame.subscribe((state, prev) => {
    if (state.profile.world !== prev.profile.world) sync()
  })
  return () => {
    stopped = true
    unsubscribe()
  }
}
