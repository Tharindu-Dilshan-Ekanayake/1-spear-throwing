import { runtime } from './game/runtime'
import { actions } from './net/actions'
import { remotePlayers } from './net/remotePlayers'
import { useGame } from './store/game'
import { useQuality } from './store/quality'

/**
 * `?debug` in the URL exposes game internals on `window.__pp` for the automated
 * perf/screenshot checks and console poking. Off by default; changes nothing else.
 */
export function installDebugHooks() {
  if (typeof window === 'undefined') return
  if (!new URLSearchParams(window.location.search).has('debug')) return
  window.__pp = { runtime, useGame, useQuality, actions, remotePlayers }
}

/** With `?debug`, the renderer and scene too, for draw call, triangle and texture counts. */
export function exposeRenderer(gl, scene) {
  if (typeof window === 'undefined' || !window.__pp) return
  window.__pp.gl = gl
  window.__pp.scene = scene
}
