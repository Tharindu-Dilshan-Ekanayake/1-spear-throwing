import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

import { formatNumber } from '@shared/format'

import { sfx } from '../../audio/sfx'
import { getGame } from '../../store/game'
import { iconUrl } from '../../ui/icons'
import { HELD_SCALE, RELEASE_AT, RELEASE_DELAY, THROW_TIME } from '../playerPose'
import { runtime } from '../runtime'
import { createSpearMesh, disposeSpearMesh, SPEAR_TIP, spearOrientation } from '../spear'
import { targetPoint } from '../world/targets'
import { drainTrainFx } from './fxQueue'
import { sideSpot, spawnPopup, updatePopups } from './popups'

const MAX_SHOTS = 10
const FLIGHT_TIME = 0.42
/** How long a spear stays stuck in the target (or the ground) before it vanishes. */
const STICK_TIME = 0.5
/** How far ahead a click throw lands. */
const CLICK_RANGE = 9
const LANE_ARC = 0.9
const CLICK_ARC = 1.6
/** How deep the tip sinks into what it hits. */
const EMBED = 0.28
const TIP = SPEAR_TIP * HELD_SCALE

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _prev = new Vector3()
const _dir = new Vector3()
const _s = new Vector3(HELD_SCALE, HELD_SCALE, HELD_SCALE)
const _popupAt = new Vector3()

const LEVEL_GRADIENT = 'linear-gradient(180deg, #e0faff 0%, #7fe2ff 45%, #2fa8ff 100%)'

/** Where a shot's grip is at `f` (0..1) along its arc. */
function arcPoint(shot, f, out) {
  out.lerpVectors(shot.from, shot.to, f)
  out.y += Math.sin(f * Math.PI) * shot.arc
  return out
}

/**
 * Training feedback: the character's throw, the spear arcing into the lane's target
 * (or, for a click throw, into the ground ahead) and sticking there for a moment, and
 * the "+N POWER" popup when it hits. Shots come from a fixed pool in one InstancedMesh.
 */
export function TrainingFX() {
  const size = useThree((s) => s.size)
  const meshRef = useRef(null)
  const shotsRef = useRef(null)
  // The shot pool, allocated on the first render only.
  shotsRef.current ??= Array.from({ length: MAX_SHOTS }, () => ({
    active: false,
    released: false,
    stuck: false,
    lane: -1,
    t: 0,
    arc: LANE_ARC,
    gain: 0,
    leveledUp: false,
    /** Where the tip should end up. */
    aim: new Vector3(),
    from: new Vector3(),
    to: new Vector3(),
    dir: new Vector3(0, 0, 1),
  }))

  const mesh = useMemo(() => createSpearMesh(MAX_SHOTS), [])

  useEffect(() => () => disposeSpearMesh(mesh), [mesh])

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const instanced = meshRef.current
    if (!instanced) return
    const player = runtime.player

    drainTrainFx((event) => {
      // A new swing once the last one has let go; quick clicks before that ride along
      // on the swing already under way.
      if (player.throwTimer <= THROW_TIME * (1 - RELEASE_AT)) {
        player.throwTimer = THROW_TIME
        player.throwSeq += 1
      }
      // Reuse a free shot, else the one that has been around longest.
      let shot = shotsRef.current[0]
      for (const s of shotsRef.current) {
        if (!s.active) {
          shot = s
          break
        }
        if (s.t > shot.t) shot = s
      }
      if (event.lane >= 0) {
        shot.aim.fromArray(targetPoint(event.lane))
        shot.arc = LANE_ARC
        // Face the target while training, unless walking somewhere.
        if (player.speed < 0.5) player.yaw = Math.atan2(shot.aim.x - player.position.x, shot.aim.z - player.position.z)
      } else {
        // A click throw lands in the ground ahead, wherever you're facing.
        shot.aim.set(
          player.position.x + Math.sin(player.yaw) * CLICK_RANGE,
          player.position.y,
          player.position.z + Math.cos(player.yaw) * CLICK_RANGE,
        )
        shot.arc = CLICK_ARC
      }
      shot.active = true
      shot.released = false
      shot.stuck = false
      shot.lane = event.lane
      shot.t = 0
      shot.gain = event.gain
      shot.leveledUp = event.leveledUp
    })

    const spearId = getGame().profile.equippedPlane
    let count = 0
    for (const shot of shotsRef.current) {
      if (!shot.active) continue
      shot.t += delta
      const flight = (shot.t - RELEASE_DELAY) / FLIGHT_TIME
      if (flight < 0) continue
      // Leaves from wherever the hand has swung the spear to at the release, aimed so
      // the tip, not the grip, ends up in the target.
      if (!shot.released) {
        shot.released = true
        shot.from.copy(player.spearAt)
        // The arc's direction where it comes down.
        _dir.subVectors(shot.aim, shot.from)
        _dir.y -= shot.arc * Math.PI
        _dir.normalize()
        shot.to.copy(shot.aim).addScaledVector(_dir, EMBED - TIP)
        sfx.swish()
      }
      if (flight >= 1 && !shot.stuck) {
        shot.stuck = true
        // Beside the player, left and right in turn (see sideSpot), level with the chest.
        _popupAt.set(player.position.x, player.position.y + 1.2, player.position.z)
        spawnPopup(`+${formatNumber(shot.gain)} POWER`, _popupAt, { iconUrl: iconUrl('muscle'), offset: sideSpot() })
        // A lane's target takes a thwack; a click throw thuds into the ground.
        if (shot.lane >= 0) sfx.targetHit()
        else sfx.power()
        if (shot.leveledUp) {
          // Its own spot over the head, clear of the Power columns either side.
          _popupAt.set(player.position.x, player.position.y + 2.6, player.position.z)
          spawnPopup('LEVEL UP!', _popupAt, { gradient: LEVEL_GRADIENT, scale: 1.5, life: 1600, offset: [0, -60] })
        }
      }
      if (shot.stuck) {
        if (shot.t - RELEASE_DELAY - FLIGHT_TIME > STICK_TIME) {
          shot.active = false
          continue
        }
        // Quivers as it sinks in.
        const wobble = Math.sin(shot.t * 60) * Math.max(0, 0.06 - (shot.t - RELEASE_DELAY - FLIGHT_TIME) * 0.2)
        spearOrientation(_q, shot.dir, wobble)
        _p.copy(shot.to)
      } else {
        // Nose along the arc.
        arcPoint(shot, flight, _p)
        arcPoint(shot, Math.max(0, flight - 0.04), _prev)
        _dir.subVectors(_p, _prev)
        if (_dir.lengthSq() > 1e-8) shot.dir.copy(_dir.normalize())
        spearOrientation(_q, shot.dir, flight * 2)
      }
      instanced.setMatrixAt(count, _m.compose(_p, _q, _s))
      instanced.setStyle(count, spearId)
      count += 1
    }
    instanced.count = count
    instanced.instanceMatrix.needsUpdate = true

    updatePopups(state.camera, size.width, size.height)
  })

  return <primitive ref={meshRef} object={mesh} />
}

export default TrainingFX
