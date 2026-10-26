import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshLambertMaterial,
  OctahedronGeometry,
  Quaternion,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { AURA_SLOTS, writeAura } from './fx/aura'
import { createGlowInstances, disposeGlow, glowTime } from './glow'

/**
 * Spears: the thing every player throws.
 *
 * One merged spear geometry holds every head shape and every trimming (bindings,
 * feathers, rings, ribs...). Each vertex is tagged with the "kit" it belongs to, and
 * the vertex shader collapses the kits a spear doesn't use, so every spear in the
 * game - wooden stake to cosmic trident - shares one geometry, one material and one
 * compiled shader program, and a rack of twenty different spears is a single draw
 * call. Colours, the shaft pattern and the head's finish are per instance too.
 *
 * Local frame: the spear lies along +Z, tip forwards, with the grip (where the hand
 * holds it) at the origin. About 2.6 long at scale 1, butt at z = -1.2.
 */

/** Which colour a vertex takes. */
const PART = { SHAFT: 0, HEAD: 1, ACCENT: 2, GLOW: 3, FEATHER: 4 }

/** Kit bits: the nine head shapes first (exactly one is shown), then the trimmings. */
const K = {
  STAKE: 0,
  LEAF: 1,
  BARBED: 2,
  PIKE: 3,
  BIDENT: 4,
  WINGED: 5,
  FANG: 6,
  TRIDENT: 7,
  CRYSTAL: 8,
  BINDING: 9,
  FEATHERS: 10,
  RING: 11,
  RIBS: 12,
  GEMS: 13,
  POMMEL: 14,
  TASSEL: 15,
}

/** Shaft patterns (see DESIGN_GLSL). */
const P = { WOOD: 0, SPIRAL: 1, RINGS: 2, METAL: 3, BONE: 4, LAVA: 5, FROST: 6, LIGHTNING: 7, GALAXY: 8, SCALES: 9, RAINBOW: 10, DIAMOND: 11, COSMIC: 12 }
/** Head finishes. */
const F = { WOOD: 0, STONE: 1, METAL: 2, BONE: 3, CRYSTAL: 4, LAVA: 5, RAINBOW: 6, GOLD: 7 }

/**
 * Looks by spear id (stats and names live in shared/balance.js; the ids are the
 * original plane ids so existing saves keep working). `shaft`, `head`, `accent`
 * (wraps, bindings, tassels) and `glow` (gems, rings, feathers, the flight trail) are
 * colours; `kits` lists the trimmings on top of the head shape.
 */
export const SPEAR_STYLES = {
  paper: { shaft: '#a8703f', head: '#e2bd84', accent: '#6b3e1f', glow: '#ffe9a8', headShape: K.STAKE, pattern: P.WOOD, finish: F.WOOD, kits: [] },
  sky: { shaft: '#9a6a3e', head: '#596370', accent: '#d8b47a', glow: '#cfe9ff', headShape: K.LEAF, pattern: P.WOOD, finish: F.STONE, kits: [K.BINDING] },
  newspaper: { shaft: '#6e4a2c', head: '#b9c4ce', accent: '#efe2c2', glow: '#8fe6ff', headShape: K.BARBED, pattern: P.SPIRAL, finish: F.METAL, kits: [K.BINDING] },
  cardboard: { shaft: '#7a4a26', head: '#e0923c', accent: '#d62f2f', glow: '#ffbe5c', headShape: K.LEAF, pattern: P.RINGS, finish: F.METAL, kits: [K.TASSEL] },
  racer: { shaft: '#55301c', head: '#ec7f4c', accent: '#2fc9a6', glow: '#ff9a6a', headShape: K.LEAF, pattern: P.SPIRAL, finish: F.METAL, kits: [K.BINDING, K.POMMEL] },
  ocean: { shaft: '#3a3d4a', head: '#a7b3bf', accent: '#626d7a', glow: '#bcd6ff', headShape: K.PIKE, pattern: P.RINGS, finish: F.METAL, kits: [K.POMMEL] },
  jungle: { shaft: '#2f3d2b', head: '#b4bec8', accent: '#79a63a', glow: '#a6ff6e', headShape: K.BIDENT, pattern: P.SPIRAL, finish: F.METAL, kits: [K.BINDING, K.POMMEL] },
  royal: { shaft: '#24317e', head: '#eef3f8', accent: '#ffd21f', glow: '#8fc8ff', headShape: K.LEAF, pattern: P.RINGS, finish: F.METAL, kits: [K.TASSEL, K.POMMEL, K.GEMS] },
  crystal: { shaft: '#e9eef5', head: '#e3ebf4', accent: '#3f7fe6', glow: '#9fe8ff', headShape: K.WINGED, pattern: P.METAL, finish: F.METAL, kits: [K.POMMEL, K.RING] },
  golden: { shaft: '#ebe0c3', head: '#f8f0dc', accent: '#7a4a26', glow: '#f2d7a0', headShape: K.FANG, pattern: P.BONE, finish: F.BONE, kits: [K.BINDING, K.FEATHERS] },
  candy: { shaft: '#dccaa0', head: '#f5ecd3', accent: '#b8382c', glow: '#ff7a4a', headShape: K.BARBED, pattern: P.BONE, finish: F.BONE, kits: [K.FEATHERS, K.TASSEL] },
  ice: { shaft: '#efe6cf', head: '#f6efdc', accent: '#5a4030', glow: '#c8ff9a', headShape: K.FANG, pattern: P.BONE, finish: F.BONE, kits: [K.RIBS, K.POMMEL] },
  lava: { shaft: '#2a1210', head: '#ff7a1e', accent: '#3a1a14', glow: '#ff5a1c', headShape: K.WINGED, pattern: P.LAVA, finish: F.LAVA, kits: [K.RING, K.POMMEL] },
  thunder: { shaft: '#2b2f8f', head: '#ffe14a', accent: '#7fd2ff', glow: '#ffe14a', headShape: K.PIKE, pattern: P.LIGHTNING, finish: F.GOLD, kits: [K.RING, K.GEMS, K.POMMEL] },
  neon: { shaft: '#c2ecff', head: '#9ff0ff', accent: '#3f9cff', glow: '#7fe2ff', headShape: K.CRYSTAL, pattern: P.FROST, finish: F.CRYSTAL, kits: [K.RING, K.GEMS] },
  galaxy: { shaft: '#1d1240', head: '#c9a8ff', accent: '#7a5cff', glow: '#a46bff', headShape: K.WINGED, pattern: P.GALAXY, finish: F.CRYSTAL, kits: [K.RING, K.POMMEL, K.GEMS] },
  dragon: { shaft: '#1f6a3a', head: '#ffd21f', accent: '#2fbf5a', glow: '#5cff7a', headShape: K.TRIDENT, pattern: P.SCALES, finish: F.GOLD, kits: [K.GEMS, K.POMMEL, K.FEATHERS] },
  rainbow: { shaft: '#ffffff', head: '#ffffff', accent: '#ffffff', glow: '#ff7ad9', headShape: K.LEAF, pattern: P.RAINBOW, finish: F.RAINBOW, kits: [K.RING, K.TASSEL, K.POMMEL] },
  diamond: { shaft: '#d9f7ff', head: '#bff4ff', accent: '#5fc8ff', glow: '#bff4ff', headShape: K.CRYSTAL, pattern: P.DIAMOND, finish: F.CRYSTAL, kits: [K.RING, K.GEMS, K.POMMEL] },
  cosmic: { shaft: '#140b2e', head: '#ff8ae8', accent: '#ff5bd8', glow: '#ff5bd8', headShape: K.TRIDENT, pattern: P.COSMIC, finish: F.CRYSTAL, kits: [K.RING, K.GEMS, K.POMMEL] },
}

// Parsed once, so frame code can look colours up without allocating.
const parse = (key) => Object.fromEntries(Object.entries(SPEAR_STYLES).map(([id, s]) => [id, new Color(s[key])]))
const SHAFTS = parse('shaft')
const HEADS = parse('head')
const ACCENTS = parse('accent')
const GLOWS = parse('glow')
const kitMask = (s) => [s.headShape, ...s.kits].reduce((mask, bit) => mask | (1 << bit), 0)
const MASKS = Object.fromEntries(Object.entries(SPEAR_STYLES).map(([id, s]) => [id, kitMask(s)]))

const styleOf = (id) => SPEAR_STYLES[id] || SPEAR_STYLES.paper
export const spearColor = (id) => HEADS[id] || HEADS.paper
export const spearGlow = (id) => GLOWS[id] || GLOWS.paper

// --- Geometry ------------------------------------------------------------------------

const SHAFT_R = 0.034
const HEAD_Z = 1.02
/** Everything is widened by this much once built (see buildSpearGeometry). */
const THICKNESS = 1.6
/** Butt and tip of the longest head, for whoever needs the spear's extent. */
export const SPEAR_BUTT = -1.2
export const SPEAR_TIP = 1.55

/** A tapered cylinder along Z from z0 (radius r0) to z1 (radius r1). */
function cylZ(r0, r1, z0, z1, segments = 8, open = false) {
  const g = new CylinderGeometry(r1, r0, z1 - z0, segments, 1, open)
  g.rotateX(Math.PI / 2)
  g.translate(0, 0, (z0 + z1) / 2)
  return g
}

/**
 * A lathed solid along Z from `profile` ([radius, length] pairs, base to point). With
 * four sides and `flatten` it is a blade: a rhombus section, wide in X, ridged in Y.
 */
function latheZ(profile, { segments = 4, flatten = 1, bend = 0 } = {}) {
  const g = new LatheGeometry(profile.map(([r, h]) => new Vector2(r, h)), segments)
  g.rotateX(Math.PI / 2)
  g.scale(1, flatten, 1)
  if (bend) {
    // Curls the point over towards +X, harder towards the tip (fangs).
    const length = profile[profile.length - 1][1]
    const position = g.getAttribute('position')
    for (let i = 0; i < position.count; i += 1) {
      const t = position.getZ(i) / length
      position.setX(i, position.getX(i) + bend * t * t)
    }
    g.computeVertexNormals()
  }
  return g
}

const _place = new Matrix4()
const _pq = new Quaternion()
const _pe = new Euler()
const _pp = new Vector3()
const _ps = new Vector3()
/** Moves a geometry: position, Euler XYZ rotation, scale. */
function placed(g, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  _pq.setFromEuler(_pe.set(rotation[0], rotation[1], rotation[2]))
  return g.applyMatrix4(_place.compose(_pp.fromArray(position), _pq, _ps.fromArray(scale)))
}

function buildSpearGeometry() {
  const parts = []
  /** `flat`: faceted shading (blades, stone); otherwise the geometry's own normals. */
  const add = (geometry, part, kit = -1, flat = false) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    }
    if (flat) g.computeVertexNormals()
    const n = g.getAttribute('position').count
    const tags = new Float32Array(n * 2)
    for (let i = 0; i < n; i += 1) {
      tags[i * 2] = part
      tags[i * 2 + 1] = kit
    }
    g.setAttribute('aSpear', new BufferAttribute(tags, 2))
    parts.push(g)
  }

  // Always there: the shaft, the leather grip, the butt cap and the socket the head
  // sits in.
  add(cylZ(SHAFT_R, SHAFT_R, -1.06, HEAD_Z - 0.05, 8, true), PART.SHAFT)
  add(cylZ(0.041, 0.041, -0.3, 0.16, 8, true), PART.ACCENT)
  add(cylZ(0.044, 0.042, -1.1, -1.02, 8), PART.ACCENT)
  add(cylZ(0.04, 0.05, HEAD_Z - 0.1, HEAD_Z + 0.01, 8), PART.HEAD)

  // --- Heads ---
  add(cylZ(0.045, 0, HEAD_Z, HEAD_Z + 0.34, 6, true), PART.HEAD, K.STAKE, true)

  const leaf = [[0.03, 0], [0.075, 0.05], [0.11, 0.15], [0.1, 0.26], [0.065, 0.37], [0.025, 0.46], [0, 0.53]]
  add(placed(latheZ(leaf, { flatten: 0.3 }), [0, 0, HEAD_Z]), PART.HEAD, K.LEAF, true)

  add(placed(latheZ([[0.03, 0], [0.052, 0.06], [0.046, 0.2], [0.02, 0.34], [0, 0.42]], { flatten: 0.5 }), [0, 0, HEAD_Z]), PART.HEAD, K.BARBED, true)
  for (const side of [-1, 1]) {
    add(placed(new BoxGeometry(0.022, 0.026, 0.2), [side * 0.068, 0, HEAD_Z + 0.09], [0, -side * 0.62, 0]), PART.HEAD, K.BARBED, true)
    add(placed(new BoxGeometry(0.018, 0.022, 0.13), [side * 0.05, 0, HEAD_Z + 0.24], [0, -side * 0.6, 0]), PART.HEAD, K.BARBED, true)
  }

  add(placed(latheZ([[0.048, 0], [0.058, 0.05], [0.04, 0.12], [0.024, 0.42], [0, 0.64]]), [0, 0, HEAD_Z], [0, 0, Math.PI / 4]), PART.HEAD, K.PIKE, true)

  add(placed(new BoxGeometry(0.24, 0.05, 0.06), [0, 0, HEAD_Z + 0.02]), PART.HEAD, K.BIDENT, true)
  for (const side of [-1, 1]) {
    add(placed(latheZ([[0.032, 0], [0.032, 0.12], [0.018, 0.34], [0, 0.46]]), [side * 0.09, 0, HEAD_Z + 0.03], [0, side * 0.08, 0]), PART.HEAD, K.BIDENT, true)
  }

  add(placed(latheZ(leaf, { flatten: 0.28 }), [0, 0, HEAD_Z + 0.02], [0, 0, 0], [1.2, 1.2, 1.12]), PART.HEAD, K.WINGED, true)
  for (const side of [-1, 1]) {
    const wing = latheZ([[0.018, 0], [0.04, 0.05], [0.032, 0.12], [0, 0.19]], { flatten: 0.3 })
    add(placed(wing, [side * 0.035, 0, HEAD_Z + 0.02], [0, side * 1.15, 0]), PART.HEAD, K.WINGED, true)
  }

  const fang = latheZ([[0.052, 0], [0.06, 0.06], [0.052, 0.17], [0.037, 0.29], [0.019, 0.39], [0, 0.48]], { segments: 6, bend: 0.13 })
  add(placed(fang, [0, 0, HEAD_Z]), PART.HEAD, K.FANG)

  add(placed(latheZ([[0.036, 0], [0.042, 0.08], [0.03, 0.3], [0, 0.48]], { flatten: 0.5 }), [0, 0, HEAD_Z + 0.04]), PART.HEAD, K.TRIDENT, true)
  add(placed(new BoxGeometry(0.32, 0.05, 0.06), [0, 0, HEAD_Z + 0.03]), PART.HEAD, K.TRIDENT, true)
  for (const side of [-1, 1]) {
    add(placed(latheZ([[0.026, 0], [0.026, 0.08], [0.015, 0.25], [0, 0.34]]), [side * 0.14, 0, HEAD_Z + 0.04]), PART.HEAD, K.TRIDENT, true)
    add(placed(new BoxGeometry(0.016, 0.02, 0.09), [side * 0.165, 0, HEAD_Z + 0.27], [0, side * 0.6, 0]), PART.HEAD, K.TRIDENT, true)
  }

  add(placed(new OctahedronGeometry(1, 0), [0, 0, HEAD_Z + 0.26], [0, 0, 0], [0.075, 0.075, 0.32]), PART.HEAD, K.CRYSTAL)
  for (const side of [-1, 1]) {
    add(placed(new OctahedronGeometry(1, 0), [side * 0.07, 0, HEAD_Z + 0.08], [0, side * 0.55, 0], [0.035, 0.035, 0.14]), PART.HEAD, K.CRYSTAL)
  }

  // --- Trimmings ---
  for (const z of [0.76, 0.81, 0.86]) add(cylZ(0.045, 0.045, z, z + 0.035, 8, true), PART.ACCENT, K.BINDING)

  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2
    const fin = placed(new BoxGeometry(0.006, 0.09, 0.27), [0, 0.075, -0.86])
    add(fin.rotateZ(a), PART.FEATHER, K.FEATHERS, true)
  }

  add(placed(new TorusGeometry(0.072, 0.013, 4, 12), [0, 0, 0.7]), PART.GLOW, K.RING)

  ;[0.34, 0.46, 0.58, 0.7].forEach((z, i) => {
    const arc = Math.PI * 0.8
    const rib = new TorusGeometry(0.105 - i * 0.012, 0.014, 3, 6, arc)
    add(placed(rib, [0, 0, z], [0.45, 0, -Math.PI / 2 - arc / 2]), PART.HEAD, K.RIBS)
  })

  for (const side of [-1, 1]) {
    add(placed(new OctahedronGeometry(1, 0), [side * 0.05, 0, HEAD_Z - 0.045], [0, 0, 0], [0.028, 0.028, 0.045]), PART.GLOW, K.GEMS)
  }

  add(cylZ(0, 0.044, -1.26, -1.1, 6), PART.HEAD, K.POMMEL, true)

  add(cylZ(0.05, 0.05, 0.78, 0.83, 8), PART.ACCENT, K.TASSEL)
  for (const [dx, tilt] of [[-0.022, 0.18], [0, 0.04], [0.022, -0.14]]) {
    add(placed(new BoxGeometry(0.022, 0.24, 0.022), [dx, -0.15, 0.79], [0.25, 0, tilt]), PART.ACCENT, K.TASSEL)
  }

  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  // Chunkier than life, as toys are: thicker shafts and broader heads read from across
  // the lobby. Lengths stay as modelled.
  merged.scale(THICKNESS, THICKNESS, 1)
  merged.computeBoundingSphere()
  return merged
}

let baseGeometry = null
function spearBaseGeometry() {
  baseGeometry ||= buildSpearGeometry()
  return baseGeometry
}

// --- Material ------------------------------------------------------------------------

const vertexHead = /* glsl */ `
  attribute vec2 aSpear;
  attribute vec3 aHead;
  attribute vec3 aAccent;
  attribute vec3 aGlowCol;
  attribute vec3 aLook;
  varying vec3 vSLocal;
  varying vec3 vSHead;
  varying vec3 vSAccent;
  varying vec3 vSGlow;
  varying vec2 vSLook;
  varying float vSPart;
`

// Kits this spear doesn't use collapse to a point: zero-area triangles draw nothing.
const vertexBody = /* glsl */ `
  vSLocal = position;
  vSPart = aSpear.x;
  vSHead = aHead;
  vSAccent = aAccent;
  vSGlow = aGlowCol;
  vSLook = aLook.xy;
  if (aSpear.y > -0.5) {
    int sBit = int(aSpear.y + 0.5);
    int sMask = int(aLook.z + 0.5);
    if (((sMask >> sBit) & 1) == 0) transformed = vec3(0.0);
  }
`

const fragmentHead = /* glsl */ `
  varying vec3 vSLocal;
  varying vec3 vSHead;
  varying vec3 vSAccent;
  varying vec3 vSGlow;
  varying vec2 vSLook;
  varying float vSPart;
  uniform float uSTime;

  const float STAU = 6.2831853;
  // How glossy this fragment is; set by the design block, read by the shine pass.
  float sShine = 0.25;
  // How much the silhouette glows in the spear's own colour: more the better the spear.
  float sAura = 0.0;

  float sHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  vec3 sHue(float h) {
    return 0.55 + 0.45 * cos(STAU * (h + vec3(0.0, 0.33, 0.67)));
  }
`

/** Shaft patterns along the spear (z) and round it (u), and the head's finish. */
const DESIGN_GLSL = /* glsl */ `
  {
    float z = vSLocal.z;
    float u = atan(vSLocal.y, vSLocal.x) / STAU + 0.5;
    float pat = vSLook.x + 0.5;
    float fin = vSLook.y + 0.5;
    sAura = clamp((pat - 1.5) / 7.0, 0.0, 1.0);
    float part = vSPart + 0.5;
    // A fake reflection from the view-space normal: bright from above, dark below.
    float env = 0.5 + 0.5 * normalize(vNormal).y;
    float sweep = 1.0 - smoothstep(0.0, 0.07, abs(fract(z * 0.32 - uSTime * 0.45) - 0.5));
    vec3 col = diffuseColor.rgb;
    float glow = 0.0;

    if (part < 1.0) {
      // --- Shaft ---
      float grain = 0.5 + 0.5 * sin(z * 34.0 + sin(u * STAU * 2.0 + z * 5.0) * 2.2);
      if (pat < 1.0) {
        col *= 0.86 + 0.16 * grain;
      } else if (pat < 2.0) {
        col *= 0.88 + 0.12 * grain;
        col = mix(col, vSAccent * 0.92, step(0.74, fract(z * 6.0 + u)) * 0.9);
      } else if (pat < 3.0) {
        col *= 0.88 + 0.12 * grain;
        col = mix(col, vSAccent, step(fract(z * 2.6 + 0.3), 0.09));
      } else if (pat < 4.0) {
        col *= 0.72 + 0.42 * env;
        sShine = 0.9;
      } else if (pat < 5.0) {
        float seg = fract(z * 3.1);
        col *= (0.9 + 0.1 * sin(seg * 3.1416)) * (1.0 - 0.3 * step(0.92, seg));
        sShine = 0.35;
      } else if (pat < 6.0) {
        float n = sin(z * 21.0 + sin(u * STAU * 3.0) * 2.0) * sin(u * STAU * 5.0 + z * 7.0);
        float crack = 1.0 - smoothstep(0.0, 0.2, abs(n));
        col = mix(col, vSGlow, crack);
        glow = crack * (0.75 + 0.25 * sin(uSTime * 3.0 + z * 4.0));
      } else if (pat < 7.0) {
        float glint = step(0.82, sHash(floor(vec2(z * 26.0, u * 5.0))));
        col = mix(col, vec3(1.0), 0.18 + glint * 0.5);
        col = mix(col, vSAccent, smoothstep(0.6, 1.0, sin(z * 9.0 + uSTime) * 0.5 + 0.5) * 0.35);
        glow = 0.12 + glint * 0.3;
        sShine = 0.8;
      } else if (pat < 8.0) {
        float zig = abs(fract(z * 3.0) - 0.5) * 4.0 - 1.0;
        float bolt = 1.0 - smoothstep(0.035, 0.07, abs(fract(u + 0.1 * zig) - 0.5));
        bolt = max(bolt, 1.0 - smoothstep(0.035, 0.07, abs(fract(u - 0.1 * zig + 0.5) - 0.5)));
        col = mix(col, vSGlow, bolt);
        glow = bolt * (0.7 + 0.3 * sin(uSTime * 8.0 + z * 3.0));
      } else if (pat < 9.0) {
        float stars = step(0.9, sHash(floor(vec2(z * 55.0, u * 8.0))));
        col = mix(col, vSAccent, 0.35 + 0.35 * sin(z * 6.0 + u * STAU + uSTime * 0.6));
        col = mix(col, vec3(1.0), stars);
        glow = 0.2 + stars * 0.8;
      } else if (pat < 10.0) {
        vec2 c = vec2(u * 8.0, z * 15.0);
        c.x += step(1.0, mod(floor(c.y), 2.0)) * 0.5;
        float scale = smoothstep(0.3, 0.5, length((fract(c) - 0.5) * vec2(1.0, 1.4)));
        col = mix(col * 1.15, vSAccent * 0.6, scale * 0.65);
        sShine = 0.55;
      } else if (pat < 11.0) {
        col = sHue(z * 0.6 - uSTime * 0.3);
        glow = 0.3;
      } else if (pat < 12.0) {
        col = mix(col, vec3(1.0), 0.35 * step(0.5, fract(u * 6.0 + z * 2.0)));
        col += 0.18 * sHue(z * 0.8 + u + uSTime * 0.2);
        glow = 0.15;
        sShine = 1.0;
      } else {
        vec3 hue = sHue(z * 0.5 + uSTime * 0.15);
        float spiral = step(0.6, fract(z * 5.0 + u * 2.0));
        float stars = step(0.92, sHash(floor(vec2(z * 55.0, u * 8.0))));
        col = mix(mix(col, hue, spiral * 0.85), vec3(1.0), stars);
        glow = spiral * 0.5 + stars * 0.8;
      }
      // The best spears catch a sweeping shine.
      if (pat > 7.0) col += vec3(0.4) * sweep;
    } else if (part < 2.0) {
      // --- Head (and socket, pommel, ribs) ---
      col = vSHead;
      if (fin < 1.0) {
        col *= 0.9 + 0.1 * sin(z * 40.0);
        sShine = 0.15;
      } else if (fin < 2.0) {
        col *= 0.8 + 0.32 * sHash(floor(vSLocal.xz * 90.0 + vSLocal.y * 40.0));
        sShine = 0.2;
      } else if (fin < 3.0) {
        col *= 0.62 + 0.55 * env;
        sShine = 1.0;
      } else if (fin < 4.0) {
        col *= 0.88 + 0.14 * env;
        sShine = 0.35;
      } else if (fin < 5.0) {
        col = mix(col, vec3(1.0), 0.35 * env) + 0.2 * sHue(z * 1.5 + uSTime * 0.25) * 0.5;
        glow = 0.45;
        sShine = 1.0;
      } else if (fin < 6.0) {
        float n = sin(vSLocal.x * 60.0 + z * 25.0) * sin(z * 31.0 - vSLocal.x * 20.0);
        float crack = 1.0 - smoothstep(0.0, 0.3, abs(n));
        col = mix(col * 0.3, vSGlow, crack);
        glow = crack * (0.8 + 0.2 * sin(uSTime * 4.0));
        sShine = 0.4;
      } else if (fin < 7.0) {
        col = sHue(z * 1.6 - uSTime * 0.35);
        glow = 0.35;
        sShine = 0.8;
      } else {
        col *= 0.7 + 0.5 * env;
        col += vec3(0.6) * sweep;
        sShine = 1.0;
      }
    } else if (part < 3.0) {
      col = vSAccent;
      if (pat > 9.5 && pat < 11.0) col = sHue(z * 1.2 + uSTime * 0.4);
      sShine = 0.2;
    } else if (part < 4.0) {
      col = vSGlow;
      glow = 0.9;
      sShine = 0.9;
    } else {
      col = vSGlow * (0.85 + 0.15 * step(0.5, fract(vSLocal.y * 40.0)));
      glow = 0.12;
    }

    diffuseColor.rgb = col;
    totalEmissiveRadiance += (part > 2.5 && part < 4.0 ? vSGlow : col) * glow;
  }
`

/** Gloss after lighting: a highlight from up and to the side of the view, and a rim. */
const SHINE_GLSL = /* glsl */ `
  {
    vec3 sV = normalize(vViewPosition);
    vec3 sN = normalize(normal);
    vec3 sH = normalize(normalize(vec3(0.45, 0.85, 0.35)) + sV);
    float sSpec = pow(max(dot(sN, sH), 0.0), 36.0);
    float sRim = pow(1.0 - max(dot(sN, sV), 0.0), 3.0);
    vec3 sRimColor = mix(vec3(0.2), vSGlow * 1.1, sAura);
    outgoingLight += vec3(0.75) * sSpec * sShine + sRimColor * sRim * (1.0 + sAura);
  }
`

let sharedMaterial = null

/** The one material every spear uses. */
export function spearMaterial() {
  if (!sharedMaterial) {
    sharedMaterial = new MeshLambertMaterial({ color: 0xffffff })
    sharedMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertexHead}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexBody}`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${fragmentHead}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${DESIGN_GLSL}`)
        .replace('#include <opaque_fragment>', `${SHINE_GLSL}\n#include <opaque_fragment>`)
      // The lobby's clock, which already ticks every frame.
      shader.uniforms.uSTime = glowTime
    }
    sharedMaterial.customProgramCacheKey = () => 'spear-v2'
  }
  return sharedMaterial
}

/**
 * Up to `max` spears in one draw call. Place them with setMatrixAt and style them with
 * `setStyle(index, spearId)`; set `.count` to how many to draw.
 *
 * Spears cast no shadow: they're too thin for one to read, and skipping it saves a
 * depth pass (which would also need the kit collapse).
 */
export function createSpearMesh(max) {
  const base = spearBaseGeometry()
  // Own geometry object (it needs its own per-instance attributes), sharing the
  // spear's vertex buffers.
  const geometry = new BufferGeometry()
  for (const name of ['position', 'normal', 'aSpear']) geometry.setAttribute(name, base.getAttribute(name))
  geometry.boundingSphere = base.boundingSphere
  const attr = (size) => new InstancedBufferAttribute(new Float32Array(max * size), size)
  const head = attr(3)
  const accent = attr(3)
  const glow = attr(3)
  const look = attr(3)
  geometry.setAttribute('aHead', head)
  geometry.setAttribute('aAccent', accent)
  geometry.setAttribute('aGlowCol', glow)
  geometry.setAttribute('aLook', look)

  const mesh = new InstancedMesh(geometry, spearMaterial(), max)
  mesh.setColorAt(0, SHAFTS.paper)
  mesh.count = 0
  mesh.frustumCulled = false
  const styled = new Array(max).fill(null)
  const setRGB = (attribute, i, c) => attribute.setXYZ(i, c.r, c.g, c.b)

  /** Styles instance `i` as spear `id`; cheap to call every frame. */
  mesh.setStyle = (i, id) => {
    if (styled[i] === id) return
    styled[i] = id
    const key = SPEAR_STYLES[id] ? id : 'paper'
    const s = styleOf(key)
    mesh.setColorAt(i, SHAFTS[key])
    setRGB(head, i, HEADS[key])
    setRGB(accent, i, ACCENTS[key])
    setRGB(glow, i, GLOWS[key])
    look.setXYZ(i, s.pattern, s.finish, MASKS[key])
    mesh.instanceColor.needsUpdate = true
    head.needsUpdate = true
    accent.needsUpdate = true
    glow.needsUpdate = true
    look.needsUpdate = true
  }
  return mesh
}

/** Frees a mesh made by createSpearMesh (the shared spear and material stay). */
export function disposeSpearMesh(mesh) {
  mesh.geometry.dispose()
  mesh.dispose()
}

const IDENTITY = new Matrix4()
const _look = new Matrix4()
const _origin = new Vector3()
const _worldUp = new Vector3(0, 1, 0)
const _axis = new Vector3(0, 0, 1)
const _roll = new Quaternion()

/**
 * The orientation that points a spear along `dir` (unit length), rolled `roll` radians
 * about its own length. The blade stays level about the world's up, so it never flips
 * over as the direction changes. Writes into `out`; allocates nothing.
 */
export function spearOrientation(out, dir, roll = 0) {
  _look.lookAt(dir, _origin, _worldUp)
  out.setFromRotationMatrix(_look)
  if (roll) out.multiply(_roll.setFromAxisAngle(_axis, roll))
  return out
}

const _worldQuaternion = new Quaternion()

/**
 * A single spear with its aura, for the one in your hand and the one in the air.
 * `setSpear(id)` restyles it; `updateAura(t, particles)` moves the aura (call it each
 * frame after placing the spear); `dispose()` frees what it owns.
 */
export function createSpearModel() {
  const mesh = createSpearMesh(1)
  mesh.setMatrixAt(0, IDENTITY)
  mesh.count = 1
  // The aura: glow quads in the spear's own frame, so it goes wherever the spear does.
  const aura = createGlowInstances(AURA_SLOTS, 0.9)
  const group = new Group()
  group.add(aura, mesh)
  let current = null
  let auraStyled = null
  group.setSpear = (id) => {
    if (id === current) return
    current = id
    mesh.setStyle(0, id)
  }
  group.updateAura = (t, particles) => {
    group.getWorldQuaternion(_worldQuaternion)
    aura.count = writeAura({ glows: aura, first: 0, id: current, t, spearMatrix: IDENTITY, worldQuaternion: _worldQuaternion, particles, styled: auraStyled })
    if (auraStyled !== current) {
      auraStyled = current
      aura.instanceColor.needsUpdate = true
    }
    aura.instanceMatrix.needsUpdate = true
  }
  group.dispose = () => {
    disposeSpearMesh(mesh)
    disposeGlow(aura)
  }
  group.setSpear('paper')
  return group
}
