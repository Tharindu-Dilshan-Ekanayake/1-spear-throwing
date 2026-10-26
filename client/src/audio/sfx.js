import { createMusic } from './music'

/**
 * Sound effects and the background music, synthesised with WebAudio: no audio files
 * to download.
 *
 * Everything goes through a compressor (so layered sounds hit hard without clipping)
 * and can send some of itself to a small room - two short, darkened feedback echoes,
 * much cheaper than a convolution reverb - which is what gives the chimes and impacts
 * their body.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created on
 * the first tap/click/key (which also starts the music) and every sound before that is
 * silently skipped.
 */

const MUTE_KEY = 'pp.muted'
const VOLUME = 0.55

let ctx = null
let master = null
let room = null
let noiseBuffer = null
let music = null
let muted = readMuted()
const lastPlayed = new Map()
const muteListeners = new Set()

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/** The room: two short echoes feeding back through a low-pass, into the master. */
function createRoom() {
  const input = ctx.createGain()
  const out = ctx.createGain()
  out.gain.value = 0.55
  out.connect(master)
  for (const [time, feedback] of [
    [0.067, 0.34],
    [0.113, 0.3],
  ]) {
    const delay = ctx.createDelay(0.5)
    delay.delayTime.value = time
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    const loop = ctx.createGain()
    loop.gain.value = feedback
    input.connect(delay)
    delay.connect(tone).connect(loop).connect(delay)
    tone.connect(out)
  }
  return input
}

function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : VOLUME
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -16
  compressor.knee.value = 12
  compressor.ratio.value = 4
  compressor.attack.value = 0.003
  compressor.release.value = 0.2
  master.connect(compressor).connect(ctx.destination)
  room = createRoom()
  // One second of white noise, reused by every whoosh and crack.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  music = createMusic(ctx, master, noiseBuffer)
  music.start()
}

/** Installs the first-gesture unlock. Call once at startup. */
export function installAudioUnlock() {
  const events = ['pointerdown', 'keydown', 'touchend']
  const handler = () => {
    unlock()
    for (const e of events) window.removeEventListener(e, handler, true)
  }
  for (const e of events) window.addEventListener(e, handler, true)
  // Mobile browsers suspend audio in the background; resume on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx?.state === 'suspended') ctx.resume()
  })
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // Not persisted; fine.
  }
  if (master) master.gain.value = muted ? 0 : VOLUME
  for (const listener of muteListeners) listener(muted)
}

/** Calls `listener(muted)` on every change; returns the unsubscribe. */
export function onMutedChange(listener) {
  muteListeners.add(listener)
  return () => muteListeners.delete(listener)
}

function ready(name, minGapMs = 0) {
  if (!ctx || muted || ctx.state !== 'running') return false
  const now = performance.now()
  if (minGapMs && now - (lastPlayed.get(name) || 0) < minGapMs) return false
  lastPlayed.set(name, now)
  return true
}

/** Sends `node` to the master, and `amount` of it into the room. */
function out(node, amount) {
  node.connect(master)
  if (amount > 0) {
    const send = ctx.createGain()
    send.gain.value = amount
    node.connect(send).connect(room)
  }
}

/** A short enveloped oscillator note. */
function tone(freq, { type = 'sine', at = 0, duration = 0.12, volume = 0.3, slideTo = null, attack = 0.01, room: wet = 0.15 } = {}) {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain)
  out(gain, wet)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

/** Filtered noise: whooshes, thuds and cracks. `type` is the filter's. */
function noise({ at = 0, duration = 0.3, volume = 0.25, from = 400, to = 2400, q = 1.2, type = 'bandpass', peak = 0.3, room: wet = 0.1 } = {}) {
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + duration * peak)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(filter).connect(gain)
  out(gain, wet)
  src.start(t, Math.random() * 0.5)
  src.stop(t + duration + 0.02)
}

/** A struck spear shaft humming: two close notes beating against each other. */
function twang(freq, { at = 0, volume = 0.05, duration = 0.6 } = {}) {
  tone(freq, { type: 'triangle', at, duration, volume })
  tone(freq * 1.045, { type: 'triangle', at, duration: duration * 0.9, volume: volume * 0.8 })
}

/** A bird's chirp: a quick rising whistle. */
function chirp(freq, at, volume = 0.035) {
  tone(freq, { at, duration: 0.07, volume, slideTo: freq * 1.45, room: 0.3 })
  tone(freq * 1.3, { at: at + 0.08, duration: 0.06, volume: volume * 0.8, slideTo: freq * 1.1, room: 0.3 })
}

const C5 = 523.25

// --- Wind: the rush of air while a spear flies -------------------------------------

let wind = null
let windSetAt = 0

/**
 * Filtered noise looping under the flight: a broad rush and a thin whistle on top.
 * `windSet(level)` (0..1, from the spear's speed) opens both up and brightens them;
 * the music ducks under it until `windStop`.
 */
function windStart() {
  if (!ctx || wind || ctx.state !== 'running') return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.7
  filter.frequency.value = 400
  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  const whistle = ctx.createBiquadFilter()
  whistle.type = 'bandpass'
  whistle.Q.value = 14
  whistle.frequency.value = 900
  const whistleGain = ctx.createGain()
  whistleGain.gain.value = 0.0001
  src.connect(filter).connect(gain).connect(master)
  src.connect(whistle).connect(whistleGain).connect(master)
  src.start()
  wind = { src, filter, gain, whistle, whistleGain }
  music?.duck(true)
}

function windSet(level) {
  if (!wind) return
  // Ten updates a second is plenty for a smooth swell.
  const now = performance.now()
  if (now - windSetAt < 100) return
  windSetAt = now
  const t = ctx.currentTime
  const l = Math.min(1, Math.max(0, level))
  wind.gain.gain.setTargetAtTime(0.03 + l * 0.2, t, 0.2)
  wind.filter.frequency.setTargetAtTime(320 + l * 2400, t, 0.25)
  wind.whistleGain.gain.setTargetAtTime(0.02 + l * 0.12, t, 0.2)
  wind.whistle.frequency.setTargetAtTime(700 + l * 1900, t, 0.3)
}

function windStop() {
  if (!wind) return
  const { src, gain, whistleGain } = wind
  wind = null
  gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3)
  whistleGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2)
  src.stop(ctx.currentTime + 1.5)
  music?.duck(false)
}

// --- The power meter's charge hum -------------------------------------------------

let hum = null
let humSetAt = 0

/**
 * A hum while the power meter is up whose pitch follows the bar - low and dull at the
 * bottom, high and bright at the top - with a shimmer added in the perfect zone.
 * `aimSet(level)` every frame; `aimStop()` when it comes down.
 */
function aimSet(level) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  if (!hum) {
    const body = ctx.createOscillator()
    body.type = 'sawtooth'
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 4
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 7
    const depth = ctx.createGain()
    depth.gain.value = 5
    vibrato.connect(depth).connect(body.frequency)
    const sparkle = ctx.createOscillator()
    sparkle.type = 'sine'
    sparkle.frequency.value = 2093
    const sparkleGain = ctx.createGain()
    sparkleGain.gain.value = 0.0001
    body.connect(filter).connect(gain)
    out(gain, 0.12)
    sparkle.connect(sparkleGain)
    out(sparkleGain, 0.3)
    body.start()
    vibrato.start()
    sparkle.start()
    gain.gain.setTargetAtTime(0.045, t, 0.05)
    hum = { body, filter, gain, vibrato, sparkle, sparkleGain }
  }
  const now = performance.now()
  if (now - humSetAt < 30) return
  humSetAt = now
  const l = Math.min(1, Math.max(0, level))
  hum.body.frequency.setTargetAtTime(110 + l * 330, t, 0.02)
  hum.filter.frequency.setTargetAtTime(400 + l * 2600, t, 0.02)
  hum.sparkleGain.gain.setTargetAtTime(l >= 0.95 ? 0.05 : 0.0001, t, 0.015)
  hum.sparkle.frequency.setTargetAtTime(2093 + Math.sin(now * 0.05) * 200, t, 0.01)
}

function aimStop() {
  if (!hum) return
  const { body, vibrato, sparkle, gain, sparkleGain } = hum
  hum = null
  const t = ctx.currentTime
  gain.gain.setTargetAtTime(0.0001, t, 0.04)
  sparkleGain.gain.setTargetAtTime(0.0001, t, 0.04)
  for (const osc of [body, vibrato, sparkle]) osc.stop(t + 0.3)
}

// --- Landing, by stage --------------------------------------------------------------

/** What the ground sounds like where the spear sticks, by zone id. */
const GROUND = {
  dirt: () => noise({ type: 'lowpass', duration: 0.35, volume: 0.22, from: 900, to: 180, q: 0.7, peak: 0.08 }),
  sand: () => noise({ duration: 0.45, volume: 0.16, from: 1600, to: 500, q: 0.5, peak: 0.1 }),
  snow: () => {
    for (let i = 0; i < 4; i += 1) noise({ type: 'highpass', at: i * 0.045, duration: 0.07, volume: 0.12, from: 2600, to: 1800, q: 0.8, peak: 0.2 })
  },
  lava: () => {
    noise({ type: 'lowpass', duration: 0.5, volume: 0.25, from: 500, to: 90, q: 0.7, peak: 0.08 })
    noise({ type: 'highpass', at: 0.05, duration: 1.1, volume: 0.07, from: 5000, to: 3500, q: 0.5, peak: 0.2 })
  },
  space: () => {
    tone(880, { duration: 0.45, volume: 0.08, slideTo: 110, room: 0.4 })
    tone(1760, { type: 'triangle', at: 0.05, duration: 0.6, volume: 0.03, slideTo: 2637, room: 0.5 })
  },
}
const ZONE_GROUND = { river: 'dirt', farm: 'dirt', jungle: 'dirt', desert: 'sand', snow: 'snow', volcano: 'lava', space: 'space' }

/** A short sound as the flight enters each stage. */
const ZONE_STINGS = {
  river: () => {
    chirp(2400, 0)
    chirp(2900, 0.18)
    noise({ at: 0.1, duration: 0.8, volume: 0.04, from: 1200, to: 1800, q: 3, peak: 0.4, room: 0.2 })
  },
  farm: () => {
    chirp(2000, 0)
    chirp(2600, 0.14)
    // A cowbell: two clanging square tones.
    tone(800, { type: 'square', at: 0.35, duration: 0.25, volume: 0.03, room: 0.25 })
    tone(540, { type: 'square', at: 0.35, duration: 0.25, volume: 0.03, room: 0.25 })
  },
  jungle: () => {
    // Exotic calls: a long swooping whistle and a quick double hoot.
    tone(1400, { duration: 0.35, volume: 0.04, slideTo: 3000, room: 0.4 })
    tone(3000, { at: 0.35, duration: 0.3, volume: 0.035, slideTo: 1500, room: 0.4 })
    tone(600, { at: 0.75, duration: 0.09, volume: 0.05, room: 0.3 })
    tone(600, { at: 0.9, duration: 0.09, volume: 0.05, room: 0.3 })
  },
  desert: () => {
    noise({ duration: 1.4, volume: 0.08, from: 300, to: 900, q: 1.5, peak: 0.5, room: 0.2 })
    tone(147, { type: 'sawtooth', duration: 1.2, volume: 0.025, attack: 0.3, room: 0.2 })
  },
  snow: () => {
    ;[2093, 2637, 3136, 3520, 2637].forEach((f, i) => tone(f, { at: i * 0.09, duration: 0.6, volume: 0.03, room: 0.5 }))
  },
  volcano: () => {
    noise({ type: 'lowpass', duration: 1.4, volume: 0.18, from: 260, to: 60, q: 0.8, peak: 0.3 })
    for (let i = 0; i < 3; i += 1) tone(180 + i * 60, { at: 0.3 + i * 0.18, duration: 0.08, volume: 0.06, slideTo: 420 + i * 80 })
  },
  space: () => {
    tone(200, { duration: 1.2, volume: 0.05, slideTo: 1600, attack: 0.2, room: 0.5 })
    tone(300, { type: 'triangle', at: 0.2, duration: 1.0, volume: 0.03, slideTo: 2400, room: 0.5 })
  },
}

export const sfx = {
  click() {
    if (!ready('click', 40)) return
    tone(900, { type: 'triangle', duration: 0.04, volume: 0.12, room: 0 })
    tone(1400, { type: 'triangle', at: 0.012, duration: 0.05, volume: 0.07, room: 0.05 })
  },
  power() {
    if (ready('power', 110)) tone(880 + Math.random() * 120, { type: 'triangle', duration: 0.07, volume: 0.07, slideTo: 1400 })
  },
  levelUp() {
    if (!ready('levelUp')) return
    ;[C5, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'square', at: i * 0.07, duration: 0.16, volume: 0.07, room: 0.3 }))
    tone(2093, { at: 0.3, duration: 0.4, volume: 0.04, room: 0.5 })
  },
  /** The stage throw leaving the hand: a big whoosh with a low thump and a whistle. */
  throw() {
    if (!ready('throw')) return
    noise({ duration: 0.55, volume: 0.36, from: 2600, to: 280, q: 1.1, peak: 0.15 })
    tone(130, { duration: 0.2, volume: 0.16, slideTo: 60, room: 0 })
    tone(1300, { at: 0.04, duration: 0.45, volume: 0.035, slideTo: 620 })
  },
  trophy() {
    if (!ready('trophy', 90)) return
    tone(1319, { type: 'square', duration: 0.06, volume: 0.06, room: 0.25 })
    tone(1976, { type: 'square', at: 0.05, duration: 0.14, volume: 0.06, room: 0.35 })
  },
  wins() {
    if (!ready('wins')) return
    ;[988, 1319, 1568, 1976].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.06, duration: 0.2, volume: 0.12, room: 0.3 }))
    noise({ type: 'highpass', at: 0.2, duration: 0.6, volume: 0.04, from: 7000, to: 9000, q: 0.5, peak: 0.1, room: 0.3 })
  },
  crack() {
    if (!ready('crack', 150)) return
    noise({ duration: 0.12, volume: 0.35, from: 1800, to: 600, q: 0.8 })
    tone(220, { type: 'square', duration: 0.08, volume: 0.08, slideTo: 90 })
  },
  reveal() {
    if (!ready('reveal')) return
    ;[392, C5, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.06, duration: 0.24, volume: 0.12, room: 0.35 }))
  },
  buy() {
    if (!ready('buy')) return
    tone(1047, { type: 'square', duration: 0.07, volume: 0.08 })
    tone(1568, { type: 'square', at: 0.08, duration: 0.18, volume: 0.08, room: 0.3 })
  },
  error() {
    if (ready('error', 200)) tone(160, { type: 'sawtooth', duration: 0.18, volume: 0.07, slideTo: 110 })
  },
  rebirth() {
    if (!ready('rebirth')) return
    noise({ duration: 0.8, volume: 0.15, from: 200, to: 4000, q: 0.6 })
    ;[262, 330, 392, C5, 659, 784].forEach((f, i) => tone(f, { type: 'sawtooth', at: 0.1 + i * 0.07, duration: 0.25, volume: 0.06, room: 0.3 }))
  },
  /** A spear leaving the hand on a training or click throw: a short swish. */
  swish() {
    if (!ready('swish', 90)) return
    noise({ duration: 0.24, volume: 0.14, from: 2200, to: 450, q: 1.4, peak: 0.2 })
    tone(900, { duration: 0.18, volume: 0.015, slideTo: 500, room: 0 })
  },
  /** A training throw hitting its target: a thwack, the shaft humming, a bright ding. */
  targetHit() {
    if (!ready('targetHit', 100)) return
    noise({ duration: 0.09, volume: 0.24, from: 2400, to: 700, q: 0.9 })
    tone(180, { duration: 0.12, volume: 0.1, slideTo: 90, room: 0 })
    twang(330 + Math.random() * 30, { volume: 0.035, duration: 0.45 })
    tone(988 + Math.random() * 80, { type: 'triangle', at: 0.05, duration: 0.14, volume: 0.07, slideTo: 1568, room: 0.25 })
  },
  /** Stepping onto an unlocked training lane: a soft rising chime. */
  laneEnter() {
    if (!ready('laneEnter', 400)) return
    ;[C5, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.05, duration: 0.3, volume: 0.07, room: 0.35 }))
  },
  /** A jump: a springy little boing. */
  jump() {
    if (ready('jump', 120)) tone(260, { type: 'triangle', duration: 0.18, volume: 0.1, slideTo: 620, room: 0.05 })
  },
  /** Landing from a jump: a soft thump. */
  jumpLand() {
    if (!ready('jumpLand', 150)) return
    tone(140, { duration: 0.12, volume: 0.12, slideTo: 70, room: 0 })
    noise({ duration: 0.08, volume: 0.06, from: 900, to: 300, q: 0.7 })
  },
  /**
   * The thrown spear sticking in the ground at the end of its flight: a deep thunk, the
   * ground cracking, the shaft humming, and the ground's own sound (grass, sand, snow,
   * lava, space) for `zoneId`.
   */
  land(zoneId) {
    if (!ready('land')) return
    tone(110, { duration: 0.32, volume: 0.24, slideTo: 48, room: 0.1 })
    noise({ at: 0.03, duration: 0.3, volume: 0.16, from: 1300, to: 260, q: 0.8, peak: 0.1 })
    twang(196, { at: 0.04, volume: 0.05, duration: 0.8 })
    GROUND[ZONE_GROUND[zoneId] || 'dirt']()
  },

  /** The power meter going up: a rising swoosh. */
  aimStart() {
    if (!ready('aimStart', 150)) return
    noise({ duration: 0.3, volume: 0.1, from: 300, to: 1800, q: 1.4, peak: 0.6 })
    tone(330, { type: 'triangle', duration: 0.22, volume: 0.06, slideTo: 660 })
  },
  aimSet,
  aimStop,
  /** Where the power meter was stopped: a better throw, a brighter sound. */
  grade(id) {
    if (!ready('grade', 100)) return
    if (id === 'weak') {
      tone(196, { type: 'triangle', duration: 0.2, volume: 0.1 })
      tone(147, { type: 'triangle', at: 0.12, duration: 0.3, volume: 0.1 })
    } else if (id === 'good') {
      ;[C5, 659].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.07, duration: 0.2, volume: 0.1, room: 0.25 }))
    } else if (id === 'great') {
      ;[C5, 659, 784].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.07, duration: 0.22, volume: 0.1, room: 0.3 }))
    } else if (id === 'excellent') {
      ;[C5, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'square', at: i * 0.06, duration: 0.22, volume: 0.06, room: 0.35 }))
      tone(2093, { at: 0.26, duration: 0.4, volume: 0.035, room: 0.5 })
    } else {
      // Perfect: a big bright chord, then sparkles tumbling up, over a crash.
      for (const f of [C5, 659, 784]) tone(f, { type: 'sawtooth', duration: 0.5, volume: 0.04, room: 0.4 })
      for (const f of [1047, 1319, 1568]) tone(f, { type: 'square', at: 0.1, duration: 0.6, volume: 0.035, room: 0.5 })
      ;[2093, 2637, 3136, 4186].forEach((f, i) => tone(f, { at: 0.18 + i * 0.05, duration: 0.35, volume: 0.03, room: 0.6 }))
      noise({ type: 'highpass', duration: 0.9, volume: 0.07, from: 6000, to: 8000, q: 0.5, peak: 0.05, room: 0.4 })
    }
  },
  /** A perfect throw letting go: a thunder crack and a rolling rumble. */
  thunder() {
    if (!ready('thunder', 300)) return
    noise({ duration: 0.18, volume: 0.42, from: 3600, to: 900, q: 0.7, peak: 0.05, room: 0.2 })
    noise({ type: 'lowpass', at: 0.08, duration: 1.6, volume: 0.32, from: 900, to: 90, q: 0.6, peak: 0.12, room: 0.3 })
    tone(70, { at: 0.05, duration: 1.2, volume: 0.14, slideTo: 38, room: 0 })
  },
  /** The flight crossing into a new stage. */
  zone(id) {
    if (!ready('zone', 600)) return
    ZONE_STINGS[id]?.()
  },
  windStart,
  windSet,
  windStop,
}
