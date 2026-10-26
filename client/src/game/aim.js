import { aimAt, throwGrade } from '@shared/logic'

import { sfx } from '../audio/sfx'
import { actions } from '../net/actions'
import { getGame } from '../store/game'
import { runtime } from './runtime'

/** How long the stopped meter and its grade stay up after the throw. */
const RESULT_MS = 1800

/**
 * The throw power meter: the first press of THROW starts it sweeping up and down, the
 * second throws as hard as it reads at that moment.
 *
 * Frame-rate state lives here, outside React - the meter's bar reads `aimReading()`
 * from its own animation loop - and only the slow-changing parts (is it up? what was
 * the result?) go into the store.
 */
export const aim = { active: false, startedAt: 0 }

let resultTimer = null

/** Where the meter stands right now, 0-1. */
export const aimReading = (now = performance.now()) => aimAt((now - aim.startedAt) / 1000)

/** Puts the meter up. The player stands still, facing the field, spear raised. */
export function startAim() {
  if (aim.active) return
  clearTimeout(resultTimer)
  aim.active = true
  aim.startedAt = performance.now()
  runtime.player.aiming = true
  runtime.player.yaw = Math.PI
  const game = getGame()
  game.setAimResult(null)
  game.setAiming(true)
  sfx.aimStart()
}

/** Takes the meter down without throwing (walked off, opened a menu). */
export function cancelAim() {
  if (!aim.active) return
  aim.active = false
  runtime.player.aiming = false
  getGame().setAiming(false)
  sfx.aimStop()
}

/** Stops the meter where it is and throws that hard. */
export function releaseAim() {
  if (!aim.active) return
  const reading = aimReading()
  aim.active = false
  runtime.player.aiming = false
  // Stay wound up while the throw goes to the server and back.
  runtime.player.aimHoldUntil = performance.now() + 600
  const grade = throwGrade(reading)
  sfx.aimStop()
  sfx.grade(grade.id)
  const game = getGame()
  game.setAiming(false)
  game.setAimResult({ aim: reading, grade, id: performance.now() })
  clearTimeout(resultTimer)
  resultTimer = setTimeout(() => getGame().setAimResult(null), RESULT_MS)
  actions.throwPlane(reading)
}
