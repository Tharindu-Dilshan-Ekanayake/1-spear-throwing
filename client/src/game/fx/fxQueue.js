/**
 * Hand-off from network events to the frame loop. Events arrive on timers and sockets;
 * the effects they trigger need the renderer's clock and camera, so they are queued
 * here and drained by the effect systems inside useFrame. Plain arrays, never state.
 */

const MAX_QUEUED = 12
const trainQueue = []

export function queueTrainFx(event) {
  trainQueue.push(event)
  if (trainQueue.length > MAX_QUEUED) trainQueue.shift()
}

export function drainTrainFx(handle) {
  while (trainQueue.length) handle(trainQueue.shift())
}

const MAX_BURSTS = 8
const bursts = []

/**
 * Queues a confetti burst at (x, y, z). Dropped by the particle system on presets
 * without particles.
 *
 * @param {{ x: number, y: number, z: number, count?: number, speed?: number,
 *           palette?: 'confetti' | 'gold' | 'power' }} burst
 */
export function burst({ x, y, z, count = 30, speed = 7, palette = 'confetti' }) {
  bursts.push({ x, y, z, count, speed, palette })
  if (bursts.length > MAX_BURSTS) bursts.shift()
}

export function drainBursts(handle) {
  while (bursts.length) handle(bursts.shift())
}

/** The perfect throw's lightning flash (see PerfectFX). One at a time. */
export const flash = { start: -1, origin: { x: 0, y: 0, z: 0 }, seed: 1, jagged: -1 }

/** A lightning flash at (x, y, z): bolts crackling out of it and a ring of light. */
export function perfectFlash(x, y, z) {
  // Starts on the next frame, on the renderer's clock.
  flash.start = -2
  flash.origin.x = x
  flash.origin.y = y
  flash.origin.z = z
  flash.seed += 1
}
