import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three'

const _side = new Vector3()
const _along = new Vector3()
const _toCamera = new Vector3()
const _clip = new Vector3()
const _base = new Color()
const _core = new Color()
const WHITE = new Color('#ffffff')

/**
 * A glowing ribbon streaming behind a flying spear: the last few positions of its butt
 * joined into a camera-facing strip that tapers and fades towards the tail. Three
 * vertices across - a white-hot core between two coloured edges - and coloured from
 * the spear's head colour to its tail colour along its length (or through every hue,
 * for the rainbow spears). Additive, so the fade is just the colour going to black.
 *
 * One mesh with fixed-size buffers, rewritten in place each frame: no allocation and
 * one draw call. `push(point)` records where the spear is, `update(...)` rebuilds the
 * strip, `reset()` empties it between throws.
 *
 * @param {number} maxPoints history length
 */
export function createTrail(maxPoints = 40) {
  const positions = new BufferAttribute(new Float32Array(maxPoints * 3 * 3), 3)
  const colors = new BufferAttribute(new Float32Array(maxPoints * 3 * 3), 3)
  positions.setUsage(DynamicDrawUsage)
  colors.setUsage(DynamicDrawUsage)
  const index = []
  for (let i = 0; i < maxPoints - 1; i += 1) {
    const a = i * 3
    const b = a + 3
    // Left half (edge to core), then right half (core to edge).
    index.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setIndex(index)
  geometry.setAttribute('position', positions)
  geometry.setAttribute('color', colors)
  geometry.setDrawRange(0, 0)

  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 4

  /** Ring buffer of recorded points, newest at `head`. */
  const history = Array.from({ length: maxPoints }, () => new Vector3())
  let head = -1
  let size = 0

  mesh.reset = () => {
    size = 0
    head = -1
    geometry.setDrawRange(0, 0)
  }

  mesh.push = (point) => {
    if (size > 0 && history[head].distanceToSquared(point) < 0.0025) return
    head = (head + 1) % maxPoints
    history[head].copy(point)
    size = Math.min(size + 1, maxPoints)
  }

  const at = (k) => history[(head - k + maxPoints * 2) % maxPoints]

  /**
   * Rebuilds the strip from the history, at most `maxLength` long.
   * @param {import('three').Camera} camera
   * @param {{ head: Color, tail: Color, rainbow: boolean }} style colours along it
   * @param {number} width full width at the spear
   * @param {number} maxLength world units
   * @param {number} time seconds, for the rainbow's drift
   */
  mesh.update = (camera, style, width, maxLength, time = 0) => {
    let count = 0
    let travelled = 0
    const pa = positions.array
    const ca = colors.array
    const emit = (point, k, along) => {
      const f = Math.min(1, along / maxLength)
      // Width tapers and the colour fades towards the tail.
      const half = width * 0.5 * (1 - f * 0.85)
      const fade = (1 - f) * (1 - f)
      if (style.rainbow) _base.setHSL(((f * 1.3 - time * 0.6) % 1 + 1) % 1, 1, 0.6)
      else _base.copy(style.head).lerp(style.tail, Math.min(1, f * 1.4))
      _core.copy(_base).lerp(WHITE, 0.6 * (1 - f))
      // Across the strip: perpendicular to its run and to the line of sight.
      const prev = at(Math.max(0, k - 1))
      const next = at(Math.min(size - 1, k + 1))
      _along.subVectors(prev, next)
      _toCamera.subVectors(camera.position, point)
      _side.crossVectors(_along, _toCamera)
      const len = _side.length()
      if (len > 1e-6) _side.multiplyScalar(half / len)
      else _side.set(0, half, 0)
      const o = count * 9
      pa[o] = point.x + _side.x
      pa[o + 1] = point.y + _side.y
      pa[o + 2] = point.z + _side.z
      pa[o + 3] = point.x
      pa[o + 4] = point.y
      pa[o + 5] = point.z
      pa[o + 6] = point.x - _side.x
      pa[o + 7] = point.y - _side.y
      pa[o + 8] = point.z - _side.z
      const edge = fade * 0.45
      ca[o] = ca[o + 6] = _base.r * edge
      ca[o + 1] = ca[o + 7] = _base.g * edge
      ca[o + 2] = ca[o + 8] = _base.b * edge
      ca[o + 3] = _core.r * fade
      ca[o + 4] = _core.g * fade
      ca[o + 5] = _core.b * fade
      count += 1
    }

    for (let k = 0; k < size; k += 1) {
      const point = at(k)
      if (k === 0) {
        emit(point, 0, 0)
        continue
      }
      const step = point.distanceTo(at(k - 1))
      if (travelled + step >= maxLength) {
        // Cut the last stretch exactly at the full length.
        _clip.lerpVectors(at(k - 1), point, (maxLength - travelled) / Math.max(step, 1e-6))
        emit(_clip, k, maxLength)
        break
      }
      travelled += step
      emit(point, k, travelled)
    }

    geometry.setDrawRange(0, Math.max(0, count - 1) * 12)
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  mesh.dispose = () => {
    geometry.dispose()
    material.dispose()
  }
  return mesh
}
