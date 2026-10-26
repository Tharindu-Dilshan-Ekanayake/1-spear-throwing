import { STYLE } from '../materials'

/**
 * The trees and plants of the throw track, one kind per stage as in the reference:
 * branching oaks by the River, round lime trees on the Farm, umbrella-crowned giants
 * and palms in the Jungle, palms and cacti in the Desert, snowy pines, burnt trees by
 * the Volcano and glowing crystal trees in Space.
 *
 * Every builder adds plain boxes to a BlockSet, so a whole chunk of forest is still one
 * draw call, and stands its plant on `y`, the height of whatever it grows on. `s`
 * scales the whole plant; `rand` is the chunk's seeded random, so every client grows
 * the same forest.
 */

const pick = (rand, list) => list[Math.floor(rand() * list.length)]

export const TREE_COLORS = {
  oak: { trunk: '#6f6390', leaves: ['#6ccf55', '#5bbd48', '#86de68'] },
  round: { trunk: '#776891', leaves: ['#c3e358', '#b0d84a', '#d4ee6e'] },
  jungle: { trunk: '#5e4250', leaves: ['#2f8f58', '#3a9f62', '#25804c', '#46aa6a'], vine: '#4c9e3a' },
  palm: { trunk: '#a88458', ring: '#8f6c44', fronds: ['#3fae4a', '#4fbf55', '#37a043'] },
  cactus: { body: '#4fae4a', flower: '#ff7ad9' },
  pine: { trunk: '#6b3f22', leaves: ['#2d7a45', '#24683a'] },
  dead: { trunk: '#2a2224', ember: '#ff6a14' },
  crystal: { rock: '#4a4466', glow: ['#9a5cff', '#66e3ff', '#ff7ad9'] },
}

/** Where the last limb ended. Shared scratch: read it before the next call. */
const _end = { x: 0, y: 0, z: 0 }

/**
 * A box `len` long leaning `tilt` radians from upright towards `heading` (radians in
 * the ground plane, 0 = +X, PI/2 = +Z), its foot at (x, y, z): a branch, a root, a
 * palm frond. `width` is its breadth across the lean, `thick` its depth.
 */
function limb(b, x, y, z, len, thick, tilt, heading, color, style = STYLE.STUDS, width = thick) {
  const dx = Math.sin(tilt) * Math.cos(heading)
  const dy = Math.cos(tilt)
  const dz = Math.sin(tilt) * Math.sin(heading)
  // Turned so the box's length runs along (dx, dy, dz); see BlockSet.add.
  b.add(x + (dx * len) / 2, y + (dy * len) / 2, z + (dz * len) / 2, thick, len, width, color, style, Math.PI - heading, 0, tilt)
  _end.x = x + dx * len
  _end.y = y + dy * len
  _end.z = z + dz * len
  return _end
}

/** A clump of leaves: a big cube with two smaller ones bulging out of it. */
function clump(b, x, y, z, size, leaves, rand) {
  b.add(x, y, z, size, size * 0.8, size, pick(rand, leaves), STYLE.STUDS)
  for (let i = 0; i < 2; i += 1) {
    const a = rand() * Math.PI * 2
    const k = size * (0.55 + rand() * 0.15)
    b.add(x + Math.cos(a) * size * 0.42, y + (rand() - 0.3) * size * 0.35, z + Math.sin(a) * size * 0.42, k, k * 0.8, k, pick(rand, leaves), STYLE.STUDS)
  }
}

/** River: a thick purple-grey trunk that forks into two or three branches, each ending in a clump of leaves. */
export function oakTree(b, x, y, z, s, rand) {
  const { trunk, leaves } = TREE_COLORS.oak
  const h = (4.5 + rand() * 2) * s
  b.addOn(x, y - 0.2, z, 1.0 * s, h + 0.2, 1.0 * s, trunk)
  const top = y + h
  const arms = 2 + Math.floor(rand() * 2)
  const turn = rand() * Math.PI * 2
  for (let i = 0; i < arms; i += 1) {
    const heading = turn + (i / arms) * Math.PI * 2 + (rand() - 0.5) * 0.6
    const end = limb(b, x, top - 0.8 * s, z, (2.4 + rand()) * s, 0.6 * s, 0.6 + rand() * 0.25, heading, trunk)
    clump(b, end.x, end.y + 0.6 * s, end.z, (2.6 + rand() * 0.8) * s, leaves, rand)
  }
  clump(b, x, top + 1.2 * s, z, 3 * s, leaves, rand)
}

/** Farm: a short trunk under a round, tiered lime crown, widest in the middle. */
export function roundTree(b, x, y, z, s, rand) {
  const { trunk, leaves } = TREE_COLORS.round
  const h = (3 + rand() * 1.5) * s
  b.addOn(x, y - 0.2, z, 0.8 * s, h + 0.2, 0.8 * s, trunk)
  const leaf = pick(rand, leaves)
  let ly = y + h - 0.6 * s
  for (const [w, t] of [[3.2, 1.2], [4.6, 1.6], [3.8, 1.3], [2.2, 0.9]]) {
    b.addOn(x, ly, z, w * s, t * s, w * s, leaf)
    ly += t * s
  }
  // A couple of bulges so it isn't a perfect stack, at different heights: level with
  // each other, two that overlapped flickered.
  for (let i = 0; i < 2; i += 1) {
    const a = rand() * Math.PI * 2
    b.add(x + Math.cos(a) * 2.2 * s, y + h + (0.9 + i * 0.5) * s, z + Math.sin(a) * 2.2 * s, 1.6 * s, 1.4 * s, 1.6 * s, pick(rand, leaves))
  }
}

/**
 * Jungle: a tall trunk on buttress roots, crowned with flat umbrella layers of leaves on
 * its top and on two side branches, vines hanging from each.
 */
export function jungleTree(b, x, y, z, s, rand) {
  const { trunk, leaves, vine } = TREE_COLORS.jungle
  const h = (8 + rand() * 4) * s
  b.addOn(x, y - 0.2, z, 1.1 * s, h + 0.2, 1.1 * s, trunk)
  // Buttress roots, leaning out and down from low on the trunk.
  for (let i = 0; i < 3; i += 1) limb(b, x, y + 1.6 * s, z, 2 * s, 0.5 * s, 2.4, (i / 3) * Math.PI * 2 + rand(), trunk)
  const crowns = [[x, y + h, z, 6.5]]
  for (let i = 0; i < 2; i += 1) {
    const end = limb(b, x, y + h * (0.55 + i * 0.15), z, (3 + rand()) * s, 0.55 * s, 0.85, rand() * Math.PI * 2, trunk)
    crowns.push([end.x, end.y, end.z, 4.6])
  }
  for (const [cx, cy, cz, w] of crowns) {
    const yaw = rand() * Math.PI
    b.add(cx, cy + 0.4 * s, cz, w * s, 0.8 * s, w * 0.8 * s, pick(rand, leaves), STYLE.STUDS, yaw)
    b.add(cx, cy + 1.1 * s, cz, w * 0.6 * s, 0.6 * s, w * 0.5 * s, pick(rand, leaves), STYLE.STUDS, yaw + 0.5)
    const length = (1.5 + rand() * 2.5) * s
    b.add(cx + Math.cos(yaw) * w * 0.35 * s, cy - length / 2, cz + Math.sin(yaw) * w * 0.3 * s, 0.14, length, 0.14, vine, STYLE.SMOOTH)
  }
}

/** Jungle and Desert: a curving ringed trunk topped with drooping fronds and coconuts. */
export function palmTree(b, x, y, z, s, rand) {
  const { trunk, ring, fronds } = TREE_COLORS.palm
  const heading = rand() * Math.PI * 2
  const bend = 0.07 + rand() * 0.07
  let px = x
  let py = y - 0.2
  let pz = z
  for (let i = 0; i < 5; i += 1) {
    const end = limb(b, px, py, pz, 1.5 * s, (0.62 - i * 0.05) * s, bend * (i + 1), heading, i % 2 ? trunk : ring)
    px = end.x
    py = end.y
    pz = end.z
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + rand() * 0.4
    const leaf = pick(rand, fronds)
    // Out nearly flat, then the tip droops.
    const mid = limb(b, px, py, pz, 2.2 * s, 0.14 * s, 1.3, a, leaf, STYLE.STUDS, 0.9 * s)
    limb(b, mid.x, mid.y, mid.z, 1.7 * s, 0.12 * s, 2.05, a, leaf, STYLE.STUDS, 0.7 * s)
  }
  for (const a of [0.5, 2.6]) b.add(px + Math.cos(a) * 0.4 * s, py - 0.35 * s, pz + Math.sin(a) * 0.4 * s, 0.42 * s, 0.42 * s, 0.42 * s, '#6b4a26')
}

/** Desert: a saguaro with one or two arms and, now and then, a pink flower on top. */
export function cactus(b, x, y, z, s, rand) {
  const { body, flower } = TREE_COLORS.cactus
  const h = (3 + rand() * 2.5) * s
  const w = 0.9 * s
  b.addOn(x, y - 0.2, z, w, h + 0.2, w, body)
  const armY = y + h * (0.35 + rand() * 0.2)
  for (const side of rand() < 0.6 ? [-1, 1] : [1]) {
    const ay = armY + (side < 0 ? 0.7 * s : 0)
    b.addOn(x + side * 0.85 * s, ay, z, 1 * s, 0.6 * s, 0.6 * s, body)
    b.addOn(x + side * 1.15 * s, ay, z, 0.6 * s, 1.8 * s, 0.6 * s, body)
  }
  if (rand() < 0.4) b.addOn(x, y + h, z, 0.5 * s, 0.3 * s, 0.5 * s, flower, STYLE.SMOOTH)
}

/** Desert: a squat barrel cactus with a flower. */
export function barrelCactus(b, x, y, z, s, rand) {
  const { body, flower } = TREE_COLORS.cactus
  b.addOn(x, y - 0.1, z, 1.2 * s, 1.0 * s, 1.2 * s, body)
  if (rand() < 0.7) b.addOn(x, y + 0.9 * s, z, 0.5 * s, 0.25 * s, 0.5 * s, flower, STYLE.SMOOTH)
}

/** Snow: a tiered pine with snow on every tier. */
export function snowPine(b, x, y, z, s, rand) {
  const { trunk, leaves } = TREE_COLORS.pine
  b.addOn(x, y - 0.2, z, 0.8 * s, 2.6 * s, 0.8 * s, trunk)
  const green = pick(rand, leaves)
  let ly = y + 1.8 * s
  for (const w of [5, 4, 3, 2]) {
    b.addOn(x, ly, z, w * s, 1.5 * s, w * s, green)
    b.addOn(x, ly + 1.5 * s, z, (w - 0.6) * s, 0.25 * s, (w - 0.6) * s, '#ffffff')
    ly += 1.4 * s
  }
}

/** Volcano: a burnt, leafless tree, its broken branches still glowing at the tips. */
export function deadTree(b, x, y, z, s, rand) {
  const { trunk, ember } = TREE_COLORS.dead
  const h = (4 + rand() * 2) * s
  b.addOn(x, y - 0.2, z, 0.7 * s, h + 0.2, 0.7 * s, trunk)
  for (let i = 0; i < 3; i += 1) {
    const end = limb(b, x, y + h * (0.5 + i * 0.2), z, (1.6 + rand()) * s, 0.35 * s, 0.7 + rand() * 0.4, rand() * Math.PI * 2, trunk)
    b.add(end.x, end.y, end.z, 0.3 * s, 0.3 * s, 0.3 * s, ember, STYLE.GLOW)
  }
}

/** Space: a floating rock island with a glowing crystal tree on it. */
export function crystalTree(b, x, y, z, s, rand) {
  const { rock, glow } = TREE_COLORS.crystal
  b.add(x, y - 1.2 * s, z, 4 * s, 2 * s, 3.6 * s, rock, STYLE.STUDS, rand() * 3)
  b.add(x, y - 2.6 * s, z, 2.2 * s, 1.4 * s, 2 * s, rock, STYLE.STUDS, rand() * 3)
  const color = pick(rand, glow)
  b.addOn(x, y - 0.2, z, 0.5 * s, 3 * s, 0.5 * s, color, STYLE.GLOW)
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + rand()
    b.add(x + Math.cos(a) * 0.9 * s, y + (3 + rand()) * s, z + Math.sin(a) * 0.9 * s, 1.2 * s, 1.8 * s, 1.2 * s, pick(rand, glow), STYLE.GLOW, a, 0.6, 0.4)
  }
}

/** A big cube of leaves (with a smaller one on it), for the River and Farm. */
export function bigBush(b, x, y, z, s, rand, leaves = TREE_COLORS.oak.leaves) {
  b.addOn(x, y - 0.1, z, 3 * s, 2.2 * s, 2.8 * s, pick(rand, leaves))
  b.addOn(x + 0.5 * s, y + 2.1 * s, z - 0.3 * s, 1.8 * s, 1.1 * s, 1.7 * s, pick(rand, leaves))
}

/** Jungle: big fern leaves fanning out from a clump. */
export function fern(b, x, y, z, rand) {
  for (let i = 0; i < 5; i += 1) {
    limb(b, x, y + 0.1, z, 1.9, 0.1, 1.15, (i / 5) * Math.PI * 2 + rand(), pick(rand, TREE_COLORS.palm.fronds), STYLE.STUDS, 0.55)
  }
}

/** A small patch of flowers on short stems. */
export function flowers(b, x, y, z, rand) {
  const colors = ['#ff6fb8', '#ffe45c', '#ffffff', '#ff8a3c', '#b47cff']
  for (let i = 0; i < 4; i += 1) {
    const fx = x + (rand() - 0.5) * 2.4
    const fz = z + (rand() - 0.5) * 2.4
    // Stems of different lengths, so two heads that touch don't share a top.
    const stem = 0.34 + i * 0.06
    b.addOn(fx, y, fz, 0.08, stem, 0.08, '#3a9a2a', STYLE.SMOOTH)
    b.addOn(fx, y + stem, fz, 0.3, 0.2, 0.3, pick(rand, colors), STYLE.SMOOTH)
  }
}
