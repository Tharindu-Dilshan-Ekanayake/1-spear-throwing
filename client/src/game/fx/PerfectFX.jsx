import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'

import { mulberry32 } from '@shared/rng'

import { useQuality } from '../../store/quality'
import { createBoxInstances, disposeBlocks } from '../blocks'
import { sharedMaterials, STYLE } from '../materials'
import { runtime } from '../runtime'
import { flash } from './fxQueue'

const BOLTS = 7
const SEGMENTS = 5
const RING = 18
const COUNT = BOLTS * SEGMENTS + RING
/** Seconds the flash lasts. */
const LIFE = 0.55
/** How often the bolts re-jag, for the flicker. */
const FLICKER = 0.06

const YELLOW = new Color('#fff3a0')
const CYAN = new Color('#a8f0ff')
const GOLD = new Color('#ffd21f')

/** Each bolt's points, relative to the spear, re-jagged every FLICKER seconds. */
const points = Array.from({ length: BOLTS }, () => Array.from({ length: SEGMENTS + 1 }, () => new Vector3()))

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _d = new Vector3()
const _up = new Vector3(0, 1, 0)
const _forward = new Vector3(0, 0, 1)

/**
 * Re-jags every bolt: a zigzag out from the spear, all round it across the line of
 * flight (so none comes back at the chase camera).
 */
function jag(rand) {
  for (let b = 0; b < BOLTS; b += 1) {
    const a = (b / BOLTS) * Math.PI * 2 + rand() * 0.6
    const pts = points[b]
    pts[0].set(0, 0, 0)
    for (let i = 1; i <= SEGMENTS; i += 1) {
      const reach = i * (0.32 + rand() * 0.16)
      pts[i].set(Math.cos(a) * reach + (rand() - 0.5) * 0.4, Math.sin(a) * reach + (rand() - 0.5) * 0.4, -reach * 0.4 + (rand() - 0.5) * 0.4)
    }
  }
}

/**
 * The perfect throw's lightning, as in the reference: jagged bolts crackling round the
 * spear as it's let go, flickering, and a shockwave ring spreading out from it - all
 * riding along with the spear, so the chase camera sees it. One
 * InstancedMesh of glowing boxes through the shared toy material, a fixed pool, and
 * nothing allocated per frame. Off on presets without particles.
 */
export function PerfectFX() {
  const enabled = useQuality((s) => s.settings.particles)
  const ref = useRef(null)
  const mesh = useMemo(() => {
    const m = createBoxInstances(COUNT, sharedMaterials().toy, STYLE.GLOW)
    for (let i = 0; i < COUNT; i += 1) m.setColorAt(i, i < BOLTS * SEGMENTS ? (i % 3 ? YELLOW : CYAN) : GOLD)
    m.instanceColor.needsUpdate = true
    m.visible = false
    return m
  }, [])

  useEffect(() => () => disposeBlocks(mesh), [mesh])

  useFrame((state) => {
    const instanced = ref.current
    if (!instanced) return
    const now = state.clock.elapsedTime
    if (flash.start === -2) {
      flash.start = now
      flash.jagged = -1
    }
    const age = now - flash.start
    if (!enabled || flash.start < 0 || age > LIFE) {
      instanced.visible = false
      return
    }
    instanced.visible = true
    const fade = 1 - age / LIFE
    // A new jag every FLICKER seconds.
    const step = Math.floor(age / FLICKER)
    if (step !== flash.jagged) {
      flash.jagged = step
      jag(mulberry32(flash.seed * 101 + step))
    }

    // Rides with the spear while it flies.
    const origin = runtime.flightFocus || flash.origin
    let n = 0
    const thick = 0.09 * fade + 0.03
    for (let b = 0; b < BOLTS; b += 1) {
      const pts = points[b]
      for (let i = 0; i < SEGMENTS; i += 1) {
        _d.subVectors(pts[i + 1], pts[i])
        const len = _d.length()
        _p.addVectors(pts[i], pts[i + 1]).multiplyScalar(0.5)
        _p.x += origin.x
        _p.y += origin.y
        _p.z += origin.z
        _q.setFromUnitVectors(_up, _d.divideScalar(Math.max(len, 1e-4)))
        // Bolts thin out towards their tips.
        _s.set(thick * (1 - i * 0.12), len, thick * (1 - i * 0.12))
        instanced.setMatrixAt(n, _m.compose(_p, _q, _s))
        n += 1
      }
    }
    // The shockwave: a ring of blocks across the line of flight, spreading out.
    const radius = 0.5 + age * 7
    for (let i = 0; i < RING; i += 1) {
      const a = (i / RING) * Math.PI * 2
      _p.set(origin.x + Math.cos(a) * radius, origin.y + Math.sin(a) * radius, origin.z + 0.6)
      _q.setFromAxisAngle(_forward, a)
      _s.set(0.18 * fade, radius * 0.36, 0.18 * fade)
      instanced.setMatrixAt(n, _m.compose(_p, _q, _s))
      n += 1
    }
    instanced.count = n
    instanced.instanceMatrix.needsUpdate = true
  })

  return <primitive ref={ref} object={mesh} />
}

export default PerfectFX
