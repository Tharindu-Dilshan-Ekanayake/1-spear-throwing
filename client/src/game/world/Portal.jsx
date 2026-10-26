import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Color, DoubleSide, ShaderMaterial } from 'three'

import { PORTAL, PORTAL_WEST } from '@shared/world'

import { useGame } from '../../store/game'
import { westPortalLabelSpec } from '../labels/lobbyLabels'
import { updateWorldLabel } from '../labels/registry'
import { PORTAL_CENTER_Y } from './portalFrame'

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uIce;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    // A spiral that winds inwards over time.
    float swirl = sin(a * 3.0 + r * 9.0 - uTime * 3.0);
    vec3 col = mix(uDeep, uIce, smoothstep(-0.2, 0.9, swirl) * (1.0 - r * 0.6));
    col += (1.0 - smoothstep(0.0, 0.45, r)) * 0.9;
    float edge = 1.0 - smoothstep(0.92, 1.0, r);
    gl_FragColor = vec4(col, edge * 0.92);
    #include <colorspace_fragment>
  }
`

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Swirl radius; the frames around them are part of the static blocks (see portalFrame.js). */
const RADIUS = PORTAL.radius - 0.4

/**
 * Swirl colours ([deep, light], linear) by where a portal leads: World 2's little
 * golden sun, World 3's Halloween purple and orange, and World 1's sky blue.
 */
const SWIRLS = {
  2: [new Color(1, 0.55, 0.08), new Color(1, 0.95, 0.6)],
  3: [new Color(0.42, 0.08, 0.72), new Color(1, 0.55, 0.1)],
  1: [new Color(0.12, 0.42, 1), new Color(0.75, 1, 1)],
}

/** One portal's animated swirl: one quad, one cheap shader. */
function Swirl({ portal, leadsTo }) {
  const ref = useRef(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uDeep: { value: new Color() }, uIce: { value: new Color() } },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  )
  const geometry = useMemo(() => new CircleGeometry(RADIUS, 40), [])

  useEffect(() => {
    const [deep, ice] = SWIRLS[leadsTo]
    material.uniforms.uDeep.value.copy(deep)
    material.uniforms.uIce.value.copy(ice)
  }, [material, leadsTo])

  useEffect(
    () => () => {
      material.dispose()
      geometry.dispose()
    },
    [material, geometry],
  )

  useFrame((state) => {
    if (ref.current) ref.current.material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return <mesh ref={ref} geometry={geometry} material={material} position={[portal.x, PORTAL_CENTER_Y, portal.z]} />
}

/**
 * The two portals' swirls either side of the throw area: World 2 on the right, and on
 * the left World 3 (from World 3, home to World 1). Keeps the left one's sign current.
 */
export function Portal() {
  const world = useGame((s) => s.profile.world)
  const halloweenOpen = useGame((s) => s.profile.worlds.includes(3))

  useEffect(() => {
    updateWorldLabel('portal-west', westPortalLabelSpec({ world, worlds: halloweenOpen ? [1, 3] : [1] }))
  }, [world, halloweenOpen])

  return (
    <>
      <Swirl portal={PORTAL} leadsTo={2} />
      <Swirl portal={PORTAL_WEST} leadsTo={world === 3 ? 1 : 3} />
    </>
  )
}

export default Portal
