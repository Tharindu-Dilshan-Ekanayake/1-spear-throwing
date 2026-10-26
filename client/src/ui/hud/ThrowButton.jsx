import { useEffect } from 'react'

import { cancelAim } from '../../game/aim'
import { throwFromHand } from '../../game/throwFromHand'
import { useGame } from '../../store/game'
import Icon from '../Icon'
import StrokeText from '../StrokeText'
import { ChunkyButton } from './parts'
import { GRADIENTS, u } from './style'

/**
 * The big green THROW button, shown while standing in the throw area. It puts the
 * power meter up; then a click, a tap or the key again throws. E or Enter work as the
 * button, Escape takes the meter down.
 */
export function ThrowButton() {
  const ready = useGame((s) => s.zone.throwArea && !s.flight && !s.throwResult)
  const aiming = useGame((s) => s.aiming)

  useEffect(() => {
    if (!ready) return undefined
    const onKey = (e) => {
      if (e.repeat) return
      if (e.code === 'KeyE' || e.code === 'Enter') throwFromHand({ stage: true })
      else if (e.code === 'Escape') cancelAim()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready])

  if (!ready || aiming) return null
  return (
    <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center" style={{ bottom: u(236) }}>
      <Icon name="arrowDown" size={u(76)} className="pp-bounce" style={{ marginBottom: u(6) }} />
      <ChunkyButton gradient={GRADIENTS.greenButton} onClick={() => throwFromHand({ stage: true })} style={{ width: u(270), height: u(86) }} radius={22} border={5}>
        <span style={{ fontSize: u(62) }}>
          <StrokeText stroke={u(11)}>THROW</StrokeText>
        </span>
      </ChunkyButton>
    </div>
  )
}

export default ThrowButton
