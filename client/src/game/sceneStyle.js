/**
 * The scene's whole look in one place: a bright toy-brick world with a saturated blue
 * sky, pale lime studded plaza, tan paths and terraced dirt hills with grass caps.
 *
 * Colours are sRGB hex, exactly as you would pick them in an image editor.
 *
 * Light intensities are three.js physical units: a light of intensity PI (~3.14)
 * lights a surface facing it to its full texture colour. The hemisphere fill plus the
 * sun add up to just over that on the ground, which is what keeps the greens vivid;
 * shadowed ground only gets the fill, so shadows read as a softer, darker green.
 */

export const SKY = {
  /** Straight up. */
  top: '#2f8ff2',
  /** At eye level. Fog uses the same colour so distant ground melts into the sky. */
  horizon: '#a6d6fb',
  /** Lower = the deep blue reaches further down towards the horizon. */
  exponent: 0.35,
}

export const FOG = {
  color: SKY.horizon,
}

export const CLOUDS = {
  /** Sunlit tops. */
  top: '#ffffff',
  /** Undersides, a cool blue-grey. */
  bottom: '#d6e5f5',
}

/**
 * Every surface colour in the lobby, as in the reference: mauve stone tiles underfoot,
 * lighter paths, yellow sand at the throw area, and mauve-grey hills with lime grass
 * and lime trees on purple trunks.
 */
export const PALETTE = {
  plaza: '#a796b3',
  path: '#c6b8d0',
  pathEdge: '#8d7c9b',
  sand: '#f2c94c',
  sandEdge: '#d9a92a',
  carpet: '#c8323c',
  gold: '#ffd21f',
  dirt: '#8b7fa3',
  trunk: '#776891',
  leaves: ['#a9d94e', '#b8e05a', '#9acd45'],
  white: '#f4f7fb',
  water: '#4cc3ff',
}

export const LIGHTS = {
  /** Fill from above (sky) and below (bounce off the grass). */
  hemiSky: '#ffffff',
  hemiGround: '#b9cba6',
  hemiIntensity: 2.1,

  sunColor: '#fff6e8',
  sunIntensity: 1.65,
  /**
   * Direction *towards* the sun: high and a little to the left, behind the default
   * camera, so the side of the character you look at is lit and its shadow falls
   * beside it where you can see it, not hidden behind its back.
   */
  sunDirection: [-0.35, 0.9, 0.25],
  /** 1 = shadows get no sunlight at all; lower = lighter shadows. */
  shadowIntensity: 0.7,
  /** Blur radius of shadow edges, in shadow-map texels. */
  shadowSoftness: 3,
}
