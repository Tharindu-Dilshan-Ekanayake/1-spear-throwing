import { CLICK_INTERVAL } from '@shared/balance'

import { actions } from '../net/actions'
import { getGame } from '../store/game'
import { aim, releaseAim, startAim } from './aim'
import { runtime } from './runtime'

let lastClickAt = -Infinity

/**
 * Throws the spear in your hand, if you can right now: a click throw (a x1 training
 * throw, at most one per CLICK_INTERVAL - the authority enforces it too) anywhere
 * outside the throw area. In the throw area it's the real throw off the stage: the
 * THROW button (`stage`) puts the power meter up, and then any press - the button, a
 * key, a click or a tap on the world - throws as hard as the meter reads. Returns
 * whether it did anything.
 *
 * @param {{ stage?: boolean }} [options]
 */
export function throwFromHand({ stage = false } = {}) {
  const game = getGame()
  if (game.panel || game.flight || game.throwResult || runtime.camera.mode !== 'follow') return false
  if (game.zone.throwArea) {
    if (aim.active) {
      releaseAim()
      return true
    }
    if (!stage) return false
    startAim()
    return true
  }
  const now = performance.now()
  if (now - lastClickAt < CLICK_INTERVAL * 1000) return false
  lastClickAt = now
  actions.click()
  return true
}
