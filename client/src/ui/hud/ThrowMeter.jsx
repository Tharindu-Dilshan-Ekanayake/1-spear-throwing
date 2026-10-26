import { useEffect, useRef } from 'react'

import { THROW_GRADES } from '@shared/balance'
import { throwGrade } from '@shared/logic'

import { sfx } from '../../audio/sfx'
import { aimReading } from '../../game/aim'
import { useGame } from '../../store/game'
import { useQuality } from '../../store/quality'
import StrokeText from '../StrokeText'
import { GRADIENTS, u } from './style'

/** Bar size, in reference pixels. */
const BAR_W = 92
const BAR_H = 470

/** Fill colour by grade, weakest first: red, orange, yellow, green, then the rainbow. */
const FILLS = {
  weak: 'linear-gradient(180deg, #ff6a5a 0%, #e8232f 100%)',
  good: 'linear-gradient(180deg, #ffb347 0%, #ff7a14 100%)',
  great: 'linear-gradient(180deg, #fff27a 0%, #ffc61a 100%)',
  excellent: 'linear-gradient(180deg, #9dff6a 0%, #2fd12f 100%)',
  perfect: 'linear-gradient(180deg, #ff3b5c 0%, #ff9a1f 18%, #ffe53b 34%, #4ef05a 52%, #2fc6ff 68%, #6a5cff 84%, #ff4fd8 100%)',
}

/** Grade names as they pop up, styled by how good they are. */
const LABELS = {
  weak: { gradient: 'linear-gradient(180deg, #ffd0c8 0%, #ff6a5a 100%)', size: 46, tilt: -4 },
  good: { gradient: 'linear-gradient(180deg, #ffe2b0 0%, #ff9a1f 100%)', size: 50, tilt: -5 },
  great: { gradient: GRADIENTS.gold, size: 56, tilt: -6 },
  excellent: { gradient: 'linear-gradient(180deg, #e6ffb0 0%, #8dff4f 45%, #2fd12f 100%)', size: 60, tilt: -7 },
  perfect: { gradient: GRADIENTS.rainbow, size: 78, tilt: -8 },
}

/**
 * The throw power meter, right of centre as in the reference: "Click to Throw!" over a
 * tall bar that fills and drains while you aim. Its sections are the throw grades, the
 * thin rainbow cap at the top being a perfect throw. Stopped, it holds where it was
 * stopped and the grade's name pops out beside it.
 *
 * The moving fill is driven by its own animation-frame loop writing the element's
 * style, so React only re-renders when the meter goes up or comes down.
 */
export function ThrowMeter() {
  const aiming = useGame((s) => s.aiming)
  const result = useGame((s) => s.aimResult)
  const touch = useQuality((s) => s.isMobile)
  const fillRef = useRef(null)

  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return undefined
    let raf = 0
    let shown = ''
    const paint = (value) => {
      fill.style.height = `${value * 100}%`
      const id = throwGrade(value).id
      if (id !== shown) {
        shown = id
        fill.style.backgroundImage = FILLS[id]
      }
    }
    if (!aiming) {
      if (result) paint(result.aim)
      return undefined
    }
    const loop = () => {
      const value = aimReading()
      paint(value)
      // The charge hum follows the bar.
      sfx.aimSet(value)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [aiming, result])

  if (!aiming && !result) return null
  const label = result && LABELS[result.grade.id]

  return (
    <div className="pointer-events-none absolute flex flex-col items-center" style={{ left: `calc(50% + ${u(440)})`, top: u(190), gap: u(10) }}>
      <div className="whitespace-nowrap" style={{ fontSize: u(48), visibility: aiming ? 'visible' : 'hidden' }}>
        <StrokeText stroke={u(10)}>{touch ? 'Tap to Throw!' : 'Click to Throw!'}</StrokeText>
      </div>
      <div
        className="relative overflow-hidden"
        style={{
          width: u(BAR_W),
          height: u(BAR_H),
          borderRadius: u(BAR_W / 2),
          border: `${u(7)} solid #111`,
          background: '#f4f6fa',
          boxShadow: `0 ${u(6)} 0 rgba(0,0,0,0.35)`,
        }}
      >
        {/* The fill, rising from the bottom. */}
        <div ref={fillRef} className="absolute inset-x-0 bottom-0" style={{ height: 0 }} />
        {/* Dividers where each grade starts, and the perfect zone marked at the top. */}
        {THROW_GRADES.slice(1).map((g) => (
          <div key={g.id} className="absolute inset-x-0" style={{ bottom: `${g.min * 100}%`, height: u(5), background: '#111', opacity: 0.85 }} />
        ))}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: `${(1 - THROW_GRADES[THROW_GRADES.length - 1].min) * 100}%`, backgroundImage: FILLS.perfect, opacity: 0.55 }}
        />
        {/* Gloss down the left side. */}
        <div className="absolute" style={{ left: u(10), top: u(18), bottom: u(18), width: u(12), borderRadius: u(6), background: 'rgba(255,255,255,0.45)' }} />
      </div>
      {label && (
        <div
          key={result.id}
          className="absolute whitespace-nowrap"
          style={{ top: u(-30), right: u(BAR_W * 0.6), fontSize: u(label.size), transform: `rotate(${label.tilt}deg)`, transformOrigin: 'right center' }}
        >
          <div className="pp-grade">
            <StrokeText stroke={u(result.grade.id === 'perfect' ? 14 : 10)} gradient={label.gradient}>
              {result.grade.label}
            </StrokeText>
          </div>
        </div>
      )}
      {result?.grade.id === 'perfect' && <div key={`flash-${result.id}`} className="pp-perfect-flash fixed inset-0" />}
    </div>
  )
}

export default ThrowMeter
