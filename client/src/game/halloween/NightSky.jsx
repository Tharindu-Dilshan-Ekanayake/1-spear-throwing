import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from 'three'

import { mulberry32 } from '@shared/rng'
import { CASTLE } from '@shared/world'

import { useQuality } from '../../store/quality'
import { createBoxInstances, disposeBlocks } from '../blocks'
import { sharedMaterials, STYLE } from '../materials'

/**
 * Where the moon hangs: low over the throw track, a little to the right - just inside
 * the top of the lobby camera's view, and high in the chase camera's.
 */
const MOON_DIRECTION = new Vector3(0.28, 0.21, -1).normalize()

const moonVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const moonFragment = /* glsl */ `
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    // A pale gold disc with a few soft craters, inside a faint halo.
    float disc = 1.0 - smoothstep(0.46, 0.48, d);
    vec2 cell = floor(p * 7.0);
    vec2 f = fract(p * 7.0) - 0.5;
    float crater = step(0.6, hash(cell)) * (1.0 - smoothstep(0.18, 0.34, length(f)));
    vec3 moon = vec3(1.0, 0.92, 0.7) * (1.0 - crater * 0.12) * (1.0 - d * 0.18);
    float halo = (1.0 - smoothstep(0.46, 1.0, d)) * 0.28;
    gl_FragColor = vec4(moon * disc + vec3(1.0, 0.75, 0.45) * halo * (1.0 - disc), max(disc, halo));
    #include <colorspace_fragment>
  }
`

/**
 * A big harvest moon: one quad with its own little shader, kept just inside the far
 * plane in a fixed direction from the camera, so it hangs in the sky like the dome.
 */
function Moon() {
  const ref = useRef(null)
  const camera = useThree((s) => s.camera)
  const distance = useQuality((s) => s.settings.viewDistance) * 0.8
  const { geometry, material } = useMemo(
    () => ({
      geometry: new PlaneGeometry(1, 1),
      material: new ShaderMaterial({ vertexShader: moonVertex, fragmentShader: moonFragment, transparent: true, depthWrite: false, fog: false }),
    }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  useFrame(() => {
    const moon = ref.current
    if (!moon) return
    moon.position.copy(camera.position).addScaledVector(MOON_DIRECTION, distance)
    moon.quaternion.copy(camera.quaternion)
  })
  return <mesh ref={ref} geometry={geometry} material={material} scale={distance * 0.22} renderOrder={-1} frustumCulled={false} />
}

const BATS = 12
const BAT_BODY = new Color('#1a1024')
const BAT_WING = new Color('#2a1a38')
const _m = new Matrix4()
const _q = new Quaternion()
const _wing = new Quaternion()
const _p = new Vector3()
const _s = new Vector3()
const _o = new Vector3()
const _up = new Vector3(0, 1, 0)
const _fwd = new Vector3(0, 0, 1)

/**
 * Bats circling the castle's towers: a body and two flapping wings each, all twelve as
 * instances of one box mesh, so one draw call. Their flight paths are fixed at build;
 * nothing is allocated per frame. Off on presets without particles.
 */
function Bats() {
  const ref = useRef(null)
  const { mesh, flock } = useMemo(() => {
    const rand = mulberry32(13)
    const flock = Array.from({ length: BATS }, (_, i) => ({
      cx: CASTLE.minX + 6 + rand() * (CASTLE.maxX - CASTLE.minX - 12),
      cz: CASTLE.minZ + 2 + rand() * 4,
      radius: 5 + rand() * 9,
      height: 15 + rand() * 9,
      speed: (0.35 + rand() * 0.35) * (i % 2 ? 1 : -1),
      phase: rand() * Math.PI * 2,
      flap: 9 + rand() * 4,
    }))
    const m = createBoxInstances(BATS * 3, sharedMaterials().toy, STYLE.SMOOTH)
    m.count = BATS * 3
    for (let i = 0; i < BATS * 3; i += 1) m.setColorAt(i, i % 3 === 0 ? BAT_BODY : BAT_WING)
    m.instanceColor.needsUpdate = true
    return { mesh: m, flock }
  }, [])
  useEffect(() => () => disposeBlocks(mesh), [mesh])

  useFrame((state) => {
    const bats = ref.current
    if (!bats) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < BATS; i += 1) {
      const b = flock[i]
      const a = b.phase + t * b.speed
      _p.set(b.cx + Math.cos(a) * b.radius, b.height + Math.sin(t * 1.3 + b.phase) * 1.2, b.cz + Math.sin(a) * b.radius)
      // Facing along the circle it flies.
      _q.setFromAxisAngle(_up, -a + (b.speed > 0 ? 0 : Math.PI))
      bats.setMatrixAt(i * 3, _m.compose(_p, _q, _s.set(0.5, 0.4, 0.8)))
      const beat = Math.sin(t * b.flap + b.phase) * 0.7
      for (const side of [-1, 1]) {
        _wing.setFromAxisAngle(_fwd, side * beat).premultiply(_q)
        _o.set(side * 0.78, 0.05, 0).applyQuaternion(_wing)
        bats.setMatrixAt(i * 3 + (side < 0 ? 1 : 2), _m.compose(_o.add(_p), _wing, _s.set(1.3, 0.07, 0.6)))
      }
    }
    bats.instanceMatrix.needsUpdate = true
  })

  return <primitive ref={ref} object={mesh} />
}

/** World 3's sky extras: the moon, and bats if the preset has particles. */
export function NightSky() {
  const particles = useQuality((s) => s.settings.particles)
  return (
    <>
      <Moon />
      {particles && <Bats />}
    </>
  )
}

export default NightSky
