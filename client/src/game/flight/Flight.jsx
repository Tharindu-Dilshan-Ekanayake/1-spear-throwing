import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three'

import { TROPHY_FIRST, TROPHY_SPACING } from '@shared/balance'
import { formatNumber } from '@shared/format'
import { trophyValue, winsMultiplier, zoneIndexAt } from '@shared/logic'
import { mulberry32 } from '@shared/rng'
import { THROW_LINE_Z } from '@shared/world'

import { sfx } from '../../audio/sfx'
import { getGame } from '../../store/game'
import { getQuality, useQuality } from '../../store/quality'
import { iconUrl } from '../../ui/icons'
import { BlockSet, createToyInstances, disposeBlocks, PropBuilder } from '../blocks'
import { spearTrail } from '../fx/aura'
import { burst, perfectFlash } from '../fx/fxQueue'
import { spawnPopup } from '../fx/popups'
import { createTrail } from '../fx/trail'
import { LabelBatch } from '../labels/LabelBatch'
import { sharedMaterials, STYLE } from '../materials'
import { runtime } from '../runtime'
import { skyUniforms } from '../skyState'
import { useWorld } from '../worldLook'
import { createSpearModel, SPEAR_BUTT, spearOrientation } from '../spear'
import { flight } from './flightControl'
import { writeDistance } from './hudLink'
import { CHUNK, TRACK, zAt } from './track'

/**
 * Above this speed (m/s) the flight goes to "warp": no new scenery is built, a plain
 * zone-coloured floor rushes past under the speed lines, and only the chunks around the
 * landing point are prepared. Streaming real chunks at thousands of m/s would cost
 * more CPU than a phone has, for scenery nobody could see.
 */
const WARP_ON = 220
const WARP_OFF = 160
/** Length of the warp floor, centred a little ahead of the plane. */
const WARP_LENGTH = 1400
/** Builder passes between prefetch builds while in warp (~1 chunk per 120 ms). */
const PREFETCH_EVERY = 4

/** A track's warp-floor colours and styles, per zone. */
const warpThemes = (track) =>
  track.zones.map((z) => {
  const t = track.themes[z.id]
  return {
    ground: t.ground ? new Color(t.ground) : null,
    groundStyle: t.groundStyle ?? STYLE.STUDS,
    road: new Color(t.road),
    kerb: new Color(t.kerb),
    roadStyle: t.roadStyle,
    kerbStyle: t.kerbStyle ?? STYLE.STUDS,
    roadHalf: t.roadHalf,
    kerbHalf: t.kerbHalf,
  }
  })

/** Chunks kept behind the focus point, and how many may be built per builder pass. */
const BEHIND = 60
const MAX_BUILDS_PER_FRAME = 2
/** How often the chunk builder runs (between frames, not inside them). */
const BUILD_INTERVAL_MS = 30
/** Chunks never thrown away: the stretch visible from the lobby. */
const PINNED_CHUNKS = 3
const CACHE_LIMIT = 14
const CRUISE_HEIGHT = 5.5
const MAX_TROPHIES = 16
const STREAKS = 36
/** The flying spear's size: it's what the whole flight is about. */
const SPEAR_SCALE = 2.4
/** Grip height when it lands: low enough that the tip, angled down, is in the ground. */
const LANDED_HEIGHT = 1.75
/** How steeply it comes down at the end, radians below level. */
const LANDING_PITCH = 0.62
const TRAIL_WIDTH = 1.1

const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _v = new Vector3()
const _look = new Vector3()
const _prevPlane = new Vector3()
/** Stable vector for runtime.flightFocus (the scratch ones are reused mid-frame). */
const planeFocus = new Vector3()
const _skyTop = new Color()
const _skyHorizon = new Color()
const _heading = new Vector3()
const _butt = new Vector3()
/** The spear's last direction of travel; it keeps pointing that way once it lands. */
const spearDir = new Vector3(0, 0, -1)

/** At most one trophy popup this often; the trophies in between are summed into it. */
const TROPHY_POPUP_MS = 180
const TROPHY_ICON = iconUrl('trophy')

/** Built chunks by index. Module-level: one track exists at a time. */
const chunkCache = new Map()
/** The chunk window the frame loop wants; the builder makes it so. */
const trackWindow = { first: 0, last: 0, density: 1, shadows: false, warp: false, prefetchFirst: 0, prefetchLast: -1 }

/** Speed-line streaks, made once. */
const streakState = (() => {
  const r = mulberry32(5)
  return Array.from({ length: STREAKS }, () => ({ a: r() * Math.PI * 2, r: 1.6 + r() * 3.2, z: -r() * 30 }))
})()

/** A track's sky per zone: [top, horizon]. */
const zoneSkies = (track) => track.zones.map((z) => track.themes[z.id].sky.map((c) => new Color(c)))

/** Back to the world's own sky (and fog), as when nothing is flying. */
function restoreSky(scene) {
  const { sky, fog } = useWorld.getState().look
  skyUniforms.topColor.value.set(sky.top)
  skyUniforms.horizonColor.value.set(sky.horizon)
  if (scene?.fog) scene.fog.color.set(fog.color)
}

const ease = (t) => 1 - Math.pow(1 - t, 2.4)
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** The crack the spear's impact leaves in the ground: dark forked lines round a pit. */
function createCrackGeometry() {
  const p = new PropBuilder()
  const rand = mulberry32(17)
  const color = '#2e2219'
  p.add(new CylinderGeometry(0.45, 0.45, 0.04, 10), { position: [0, 0, 0], color })
  const branches = 8
  for (let i = 0; i < branches; i += 1) {
    let a = (i / branches) * Math.PI * 2 + rand() * 0.5
    let x = 0
    let z = 0
    let width = 0.22
    for (let j = 0; j < 4; j += 1) {
      const len = 0.9 + rand() * 0.9
      p.box(x + Math.cos(a) * len * 0.5, 0, z + Math.sin(a) * len * 0.5, len, 0.035, width, color, STYLE.SMOOTH, [0, -a, 0])
      x += Math.cos(a) * len
      z += Math.sin(a) * len
      // A fork off to one side now and then.
      if (j > 0 && rand() < 0.5) {
        const fa = a + (rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.4)
        const fl = 0.6 + rand() * 0.6
        p.box(x + Math.cos(fa) * fl * 0.5, 0, z + Math.sin(fa) * fl * 0.5, fl, 0.03, width * 0.6, color, STYLE.SMOOTH, [0, -fa, 0])
      }
      a += (rand() - 0.5) * 0.9
      width *= 0.72
    }
  }
  return p.build()
}

function createTrophyGeometry() {
  const p = new PropBuilder()
  const gold = '#ffcc1f'
  p.add(new CylinderGeometry(0.42, 0.24, 0.62, 12), { position: [0, 0.55, 0], color: gold, style: STYLE.GLOW })
  p.add(new TorusGeometry(0.2, 0.06, 6, 10, Math.PI), { position: [-0.42, 0.62, 0], rotation: [0, 0, Math.PI / 2], color: gold })
  p.add(new TorusGeometry(0.2, 0.06, 6, 10, Math.PI), { position: [0.42, 0.62, 0], rotation: [0, 0, -Math.PI / 2], color: gold })
  p.add(new CylinderGeometry(0.08, 0.08, 0.3, 6), { position: [0, 0.12, 0], color: gold })
  p.box(0, -0.05, 0, 0.5, 0.14, 0.5, '#ffb01e', STYLE.SMOOTH)
  return p.build()
}

let warpZone = -1

/** Moves the warp floor under the plane and restyles it when the zone changes. */
function updateWarpFloor(floor, meter, zones, themes) {
  const zi = zoneIndexAt(meter, zones)
  const theme = themes[zi]
  const centerZ = zAt(meter + WARP_LENGTH * 0.35)
  const parts = [
    // [width, height, top, colour, style]
    [theme.ground ? 340 : 0, 1, -0.06, theme.ground, theme.groundStyle],
    [theme.roadHalf * 2, 0.25, 0.0, theme.road, theme.roadStyle],
    [theme.kerbHalf - theme.roadHalf, 0.3, 0.08, theme.kerb, theme.kerbStyle],
    [theme.kerbHalf - theme.roadHalf, 0.3, 0.08, theme.kerb, theme.kerbStyle],
  ]
  const kerbX = (theme.roadHalf + theme.kerbHalf) / 2
  parts.forEach(([w, h, top, color, style], i) => {
    const x = i === 2 ? -kerbX : i === 3 ? kerbX : 0
    _p.set(x, top - h / 2, centerZ)
    _s.set(Math.max(w, 0.0001), h, WARP_LENGTH)
    _q.identity()
    floor.setMatrixAt(i, _m.compose(_p, _q, _s))
    if (zi !== warpZone && color) floor.setColorAt(i, color)
    if (zi !== warpZone) floor.geometry.getAttribute('aStyle').array[i] = style
  })
  floor.instanceMatrix.needsUpdate = true
  if (zi !== warpZone) {
    warpZone = zi
    if (floor.instanceColor) floor.instanceColor.needsUpdate = true
    floor.geometry.getAttribute('aStyle').needsUpdate = true
  }
  // Instance bounds changed; keep the whole floor in view.
  floor.frustumCulled = false
}

/** Where the plane is at normalised time `t` (0-1) of the current flight. */
function planePosition(t, start, out) {
  const end = zAt(flight.distance)
  const s = ease(t)
  const z = start.z + (end - start.z) * s
  const travelled = start.z - z
  const rise = 1 - Math.exp(-travelled / 9)
  const landing = smoothstep(0.86, 1, t)
  const cruise = start.y + (CRUISE_HEIGHT - start.y) * rise + Math.sin(t * 9) * 0.3 * (1 - landing)
  const y = cruise + (LANDED_HEIGHT - cruise) * landing
  const x = start.x * (1 - smoothstep(0, 0.25, t)) + Math.sin(travelled * 0.015) * 1.4 * (1 - landing)
  return out.set(x, y, z)
}

/**
 * Lazily loaded: the track, the flying spear with its trail, and the chase camera.
 * While nobody is flying it still streams the first stretch of track, which is the
 * field you see leading out of the lobby.
 *
 * `track` is the world's (see defineTrack); a world change remounts this with the new
 * one, which throws away every chunk of the old.
 *
 * @param {{ track?: ReturnType<typeof import('./track').defineTrack> }} props
 */
export default function Flight({ track = TRACK }) {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const rootRef = useRef(null)
  const groupRef = useRef(null)
  const warpRef = useRef(null)
  const planeRef = useRef(null)
  const trophyRef = useRef(null)
  const streakRef = useRef(null)
  const starsRef = useRef(null)
  const trailRef = useRef(null)
  const crackRef = useRef(null)
  const flightStart = useRef(null)
  // Allocated on the first render only.
  flightStart.current ??= new Vector3()
  const startedFor = useRef(0)
  /** Whether this flight's spear has left the hand yet. */
  const releasedFor = useRef(false)
  /** The last stage whose sound played this flight. */
  const zoneHeard = useRef(-1)
  /** Trophies popped so far this flight: index of the next, Wins not yet shown. */
  const trophyTally = useRef({ next: 0, pending: 0, shownAt: 0 })
  const wasActive = useRef(false)
  const gatesRef = useRef(null)
  const speedLines = useQuality((s) => s.settings.speedLines)
  const particles = useQuality((s) => s.settings.particles)
  const { zones, gates } = track
  const warp = useMemo(() => warpThemes(track), [track])
  const skies = useMemo(() => zoneSkies(track), [track])

  const assets = useMemo(() => {
    const trophies = createToyInstances(createTrophyGeometry(), sharedMaterials().toy, MAX_TROPHIES)

    const planeModel = createSpearModel()
    planeModel.scale.setScalar(SPEAR_SCALE)
    planeModel.visible = false
    const trail = createTrail(40)
    const crack = createToyInstances(createCrackGeometry(), sharedMaterials().toy, 1)

    const streakMaterial = new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
    const streakMesh = new InstancedMesh(new BoxGeometry(0.035, 0.035, 1), streakMaterial, STREAKS)
    streakMesh.frustumCulled = false
    streakMesh.count = 0

    const rand = mulberry32(99)
    const starPositions = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i += 1) {
      _v.set(rand() * 2 - 1, rand() * 1.2 - 0.2, rand() * 2 - 1).normalize().multiplyScalar(140)
      starPositions.set([_v.x, _v.y, _v.z], i * 3)
    }
    const starGeometry = new BufferGeometry()
    starGeometry.setAttribute('position', new BufferAttribute(starPositions, 3))
    const stars = new Points(starGeometry, new PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }))
    stars.frustumCulled = false
    stars.visible = false

    // Warp floor: ground, road and two kerbs, sitting a hair below real chunks so any
    // built chunk shows through on top of it.
    const warpSet = new BlockSet()
    for (let i = 0; i < 4; i += 1) warpSet.add(0, -0.5, 0, 1, 1, 1, '#ffffff', STYLE.STUDS)
    const warpFloor = warpSet.build(sharedMaterials().blocks)
    warpFloor.visible = false
    warpFloor.matrixAutoUpdate = false

    return { trophies, planeModel, trail, crack, streakMesh, streakMaterial, stars, warpFloor }
  }, [])

  // This module loads after the lobby is on screen; compile its shaders in the
  // background before showing it, so the first throw doesn't stall on them.
  useEffect(() => {
    const root = rootRef.current
    // Skipped in dev, where StrictMode's remount disposes materials mid-compile (see
    // ShaderWarmup).
    if (!root || import.meta.env.DEV) return undefined
    let cancelled = false
    root.visible = false
    gl.compileAsync(root, camera, scene)
      .catch(() => null)
      .finally(() => {
        if (!cancelled) root.visible = true
      })
    return () => {
      cancelled = true
    }
  }, [gl, camera, scene])

  // Zone names over the gate arches: their own small label batch.
  useEffect(() => {
    const batch = new LabelBatch({ pageSize: Math.min(512, getQuality().maxTexture) })
    for (const g of gates) {
      batch.add(`gate-${g.zone.id}`, [0, 16.4, zAt(g.meter)], { lines: [{ text: g.zone.name, size: 64, fill: '#ffffff' }], pxPerUnit: 26 }, { fade: 400 })
    }
    let cancelled = false
    batch.build().then((meshes) => {
      if (cancelled || !gatesRef.current) return
      for (const mesh of meshes) gatesRef.current.add(mesh)
    })
    return () => {
      cancelled = true
      batch.dispose()
    }
  }, [gates])

  // Streams track chunks in and out between frames: at most two builds per pass.
  useEffect(() => {
    const group = groupRef.current
    let pass = 0
    const build = (i, density) => {
      const mesh = track.buildChunk(i, { density }).build(sharedMaterials().blocks)
      mesh.receiveShadow = trackWindow.shadows
      chunkCache.set(i, mesh)
      group.add(mesh)
    }
    const id = setInterval(() => {
      if (!group) return
      const want = trackWindow
      pass += 1
      if (want.warp) {
        // Only get the landing site ready, one chunk at a time.
        if (pass % PREFETCH_EVERY === 0) {
          for (let i = want.prefetchFirst; i <= want.prefetchLast; i += 1) {
            if (chunkCache.has(i)) continue
            build(i, want.density)
            break
          }
        }
      } else {
        let built = 0
        for (let i = want.first; i <= want.last && built < MAX_BUILDS_PER_FRAME; i += 1) {
          if (chunkCache.has(i)) continue
          build(i, want.density)
          built += 1
        }
      }
      if (chunkCache.size <= CACHE_LIMIT) return
      for (const [i, mesh] of chunkCache) {
        const wanted = (i >= want.first && i <= want.last) || (i >= want.prefetchFirst && i <= want.prefetchLast)
        if (!wanted && i >= PINNED_CHUNKS) {
          group.remove(mesh)
          disposeBlocks(mesh)
          chunkCache.delete(i)
        }
      }
    }, BUILD_INTERVAL_MS)
    return () => {
      clearInterval(id)
      for (const mesh of chunkCache.values()) disposeBlocks(mesh)
      chunkCache.clear()
      assets.trophies.geometry.dispose()
      assets.trophies.dispose()
      assets.planeModel.dispose()
      assets.trail.dispose()
      assets.crack.geometry.dispose()
      assets.crack.dispose()
      assets.streakMesh.geometry.dispose()
      assets.streakMaterial.dispose()
      assets.streakMesh.dispose()
      assets.stars.geometry.dispose()
      assets.stars.material.dispose()
      disposeBlocks(assets.warpFloor)
      warpZone = -1
      restoreSky(null)
    }
  }, [assets, track])

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const group = groupRef.current
    if (!group) return
    const settings = getQuality()
    const now = performance.now()

    // --- Spear --------------------------------------------------------------------
    let focus = Math.max(0, THROW_LINE_Z - runtime.player.position.z)
    let speed = 0
    const plane = planeRef.current
    const trail = trailRef.current
    const crack = crackRef.current
    if (flight.active) {
      if (startedFor.current !== flight.startedAt) {
        startedFor.current = flight.startedAt
        releasedFor.current = false
        zoneHeard.current = -1
        flightStart.current.copy(runtime.player.spearAt)
        trophyTally.current = { next: 0, pending: 0, shownAt: 0 }
        _prevPlane.copy(flightStart.current)
        spearDir.set(0, 0.15, -1).normalize()
        trail?.reset()
      }
      // Rides in the hand through the wind-up and leaves it at the release.
      const elapsed = (now - flight.startedAt) / 1000
      const release = flight.releaseDelay
      if (elapsed < release) flightStart.current.copy(runtime.player.spearAt)
      const t = Math.min(1, Math.max(0, elapsed - release) / flight.duration)
      // A perfect throw lets go in a flash of light.
      if (elapsed >= release && !releasedFor.current) {
        releasedFor.current = true
        if (flight.grade === 'perfect') {
          const at = runtime.player.spearAt
          perfectFlash(at.x, at.y, at.z)
          burst({ x: at.x, y: at.y, z: at.z, count: 36, palette: 'gold', speed: 10 })
          sfx.thunder()
        }
      }
      planePosition(t, flightStart.current, _p)
      flight.meter = Math.max(0, Math.min(flight.distance, THROW_LINE_Z - _p.z))
      focus = flight.meter
      speed = _prevPlane.distanceTo(_p) / Math.max(delta, 1e-3)
      // Nose along its flight; at the end it tips down and drives into the ground.
      _heading.subVectors(_p, _prevPlane)
      if (_heading.lengthSq() > 1e-6) spearDir.copy(_heading.normalize())
      const landing = smoothstep(0.86, 1, t)
      const level = Math.hypot(spearDir.x, spearDir.z)
      const pitch = Math.atan2(spearDir.y, level)
      const wanted = Math.min(pitch, pitch + (-LANDING_PITCH - pitch) * landing)
      if (level > 1e-4) {
        const k = Math.cos(wanted) / level
        spearDir.set(spearDir.x * k, Math.sin(wanted), spearDir.z * k)
      }
      _prevPlane.copy(_p)
      const landedFor = elapsed - release - flight.duration
      if (plane) {
        // The one in the hand is shown until the release.
        plane.visible = elapsed >= release
        // The rush of air while it flies, swelling with its speed, gone as it lands.
        if (elapsed >= release && t < 1) {
          sfx.windStart()
          sfx.windSet(speed / 90)
        } else if (t >= 1) {
          sfx.windStop()
        }
        plane.position.copy(_p)
        // A slow roll in the air that stops as it lands, with a quiver.
        const quiver = landedFor > 0 ? Math.sin(landedFor * 55) * Math.max(0, 0.08 - landedFor * 0.12) : 0
        spearOrientation(plane.quaternion, spearDir, Math.min(elapsed, flight.duration + release) * 2.2 + quiver)
        plane.setSpear(getGame().profile.equippedPlane)
        if (plane.visible) plane.updateAura(now / 1000, settings.particles)
      }
      // The trail streams off the butt and pulls in after it lands.
      if (trail) {
        const fade = landedFor > 0 ? Math.max(0, 1 - landedFor / 0.35) : 1
        trail.visible = elapsed >= release && fade > 0
        if (trail.visible) {
          trail.push(_butt.copy(_p).addScaledVector(spearDir, SPEAR_BUTT * SPEAR_SCALE))
          trail.update(camera, spearTrail(getGame().profile.equippedPlane), TRAIL_WIDTH, settings.trailLength * fade, now / 1000)
        }
      }
      // The ground cracks where it hits.
      if (crack) {
        crack.count = landedFor > 0 ? 1 : 0
        if (landedFor > 0) {
          // Centred on where the tip went in, popping out to full size.
          _v.copy(_p).addScaledVector(spearDir, -_p.y / Math.min(-0.2, spearDir.y))
          _v.y = 0.08
          crack.setMatrixAt(0, _m.compose(_v, _q.identity(), _s.setScalar(Math.min(1, 0.4 + landedFor * 6))))
          crack.instanceMatrix.needsUpdate = true
        }
      }
      runtime.flightFocus = planeFocus.copy(_p)
      writeDistance(flight.meter)

      // Chase camera: behind and above, looking down the track. Locked to the plane
      // along the track (at warp speed any lag leaves it hundreds of metres behind);
      // eased sideways and vertically so the bobbing stays smooth.
      if (runtime.camera.mode === 'flight') {
        const k = 1 - Math.exp(-6 * delta)
        // Pulled back at first, framing the thrower (and a perfect throw's leap), then
        // closing in behind the spear once it's away.
        const framing = 1 - smoothstep(release * 0.5, release + 0.7, elapsed)
        camera.position.set(
          camera.position.x + (_p.x * 0.6 - camera.position.x) * k,
          camera.position.y + (_p.y + 2.3 + framing * 1.6 - camera.position.y) * k,
          _p.z + 7.5 + framing * 4.5,
        )
        _look.set(_p.x * 0.8, _p.y + 0.3, _p.z - 12)
        camera.lookAt(_look)
      }
    } else {
      if (plane) plane.visible = false
      if (trail) trail.visible = false
      if (crack) crack.count = 0
    }
    if (wasActive.current && !flight.active) {
      sfx.windStop()
      restoreSky(scene)
    }
    wasActive.current = flight.active

    // --- Track chunks -------------------------------------------------------------
    // Only decide what should exist; the builder below does the allocating, outside
    // the frame loop.
    const ahead = settings.viewDistance
    const want = trackWindow
    want.first = Math.max(0, Math.floor((focus - BEHIND) / CHUNK))
    want.last = Math.floor((focus + ahead) / CHUNK)
    // Fewer props when screaming past at hundreds of metres a second.
    want.density = settings.decorDensity * (speed > 300 ? 0.35 : speed > 120 ? 0.65 : 1)
    want.shadows = settings.shadows === 'realtime'
    for (const [i, mesh] of chunkCache) mesh.visible = i >= want.first && i <= want.last

    if (!flight.active) want.warp = false
    else if (!want.warp && speed > WARP_ON) want.warp = true
    else if (want.warp && speed < WARP_OFF) want.warp = false
    if (flight.active) {
      // The landing site, built ahead of time while warping towards it.
      want.prefetchFirst = Math.max(0, Math.floor((flight.distance - 150) / CHUNK))
      want.prefetchLast = Math.floor((flight.distance + Math.min(ahead, 240)) / CHUNK)
    } else {
      want.prefetchLast = -1
    }
    const floor = warpRef.current
    if (floor) {
      floor.visible = want.warp
      if (want.warp) updateWarpFloor(floor, focus, zones, warp)
    }

    // --- Trophies -----------------------------------------------------------------
    if (flight.active) {
      // Tally the ones just flown through. The Wins were granted with the throw; this
      // is the visual receipt. At speed the plane passes dozens a second, so they're
      // summed into one popup at most every TROPHY_POPUP_MS.
      const tally = trophyTally.current
      if (tally.next < 0) tally.next = 0
      const trophies = flight.trophies
      while (tally.next < trophies.length && trophies[tally.next] <= flight.meter) {
        tally.pending += trophyValue(trophies[tally.next], zones)
        tally.next += 1
      }
      if (tally.pending > 0 && now - tally.shownAt >= TROPHY_POPUP_MS) {
        const multiplier = winsMultiplier(getGame().profile, Date.now())
        spawnPopup(`+${formatNumber(Math.round(tally.pending * multiplier))}`, { x: _prevPlane.x, y: _prevPlane.y + 1, z: _prevPlane.z - 2 }, { iconUrl: TROPHY_ICON, scale: 1.2 })
        sfx.trophy()
        tally.pending = 0
        tally.shownAt = now
      }
    }
    const trophies = trophyRef.current
    if (trophies) {
      const spin = now * 0.003
      let count = 0
      const k0 = Math.max(0, Math.ceil((focus - 10 - TROPHY_FIRST) / TROPHY_SPACING))
      for (let m = TROPHY_FIRST + k0 * TROPHY_SPACING; m < focus + ahead * 0.8 && count < MAX_TROPHIES; m += TROPHY_SPACING) {
        if (flight.active && m <= flight.meter) continue
        const height = flight.active ? CRUISE_HEIGHT : 1.8
        _p.set(Math.sin(m * 0.5) * 2.5, height + Math.sin(spin + m) * 0.25, zAt(m))
        _q.setFromAxisAngle(_v.set(0, 1, 0), spin + m)
        _s.setScalar(1.5)
        trophies.setMatrixAt(count, _m.compose(_p, _q, _s))
        count += 1
      }
      trophies.count = count
      trophies.instanceMatrix.needsUpdate = true
    }

    // --- Sky tint by zone ---------------------------------------------------------
    if (flight.active) {
      const zi = zoneIndexAt(flight.meter, zones)
      // Each stage greets the spear with its own sound as it flies in.
      if (zi !== zoneHeard.current && releasedFor.current) {
        zoneHeard.current = zi
        sfx.zone(zones[zi].id)
      }
      const blend = smoothstep(zones[zi].start, zones[zi].start + 80, flight.meter)
      const prev = skies[Math.max(0, zi - 1)]
      const cur = skies[zi]
      _skyTop.copy(prev[0]).lerp(cur[0], zi === 0 ? 1 : blend)
      _skyHorizon.copy(prev[1]).lerp(cur[1], zi === 0 ? 1 : blend)
      skyUniforms.topColor.value.copy(_skyTop)
      skyUniforms.horizonColor.value.copy(_skyHorizon)
      if (scene.fog) scene.fog.color.copy(_skyHorizon)

      const stars = starsRef.current
      if (stars && particles) {
        const spaceBlend = zi === zones.length - 1 ? blend : 0
        stars.visible = spaceBlend > 0.01
        stars.material.opacity = spaceBlend
        stars.position.copy(camera.position)
      }
    } else if (starsRef.current) {
      starsRef.current.visible = false
    }

    // --- Speed lines --------------------------------------------------------------
    const lines = streakRef.current
    if (lines) {
      const active = flight.active && speedLines && speed > 25
      if (!active) {
        lines.count = 0
      } else {
        const travel = Math.min(speed, 400) * delta * 0.6
        lines.count = STREAKS
        for (let i = 0; i < STREAKS; i += 1) {
          const st = streakState[i]
          st.z += travel
          if (st.z > 4) st.z -= 34
          _v.set(Math.cos(st.a) * st.r, Math.sin(st.a) * st.r * 0.7, st.z - 4)
          _v.applyQuaternion(camera.quaternion).add(camera.position)
          _q.copy(camera.quaternion)
          _s.set(1, 1, 2 + Math.min(speed, 400) * 0.02)
          lines.setMatrixAt(i, _m.compose(_v, _q, _s))
        }
        lines.instanceMatrix.needsUpdate = true
      }
    }
  })

  return (
    <group ref={rootRef}>
      <group ref={groupRef} />
      <group ref={gatesRef} />
      <primitive ref={planeRef} object={assets.planeModel} />
      <primitive ref={trailRef} object={assets.trail} />
      <primitive ref={crackRef} object={assets.crack} />
      <primitive ref={warpRef} object={assets.warpFloor} />
      <primitive ref={trophyRef} object={assets.trophies} />
      <primitive ref={streakRef} object={assets.streakMesh} />
      <primitive ref={starsRef} object={assets.stars} />
    </group>
  )
}
