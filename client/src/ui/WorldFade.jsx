import { useWorld } from '../game/worldLook'
import StrokeText from './StrokeText'
import { u } from './hud/style'

const TITLES = {
  1: { text: 'World 1', gradient: 'linear-gradient(180deg, #e0faff 0%, #7fe2ff 45%, #2fa8ff 100%)', backdrop: '#123a6e' },
  3: { text: 'Halloween World', gradient: 'linear-gradient(180deg, #fff0c2 0%, #ffae3c 45%, #ff6a00 100%)', backdrop: '#1a0b2e' },
}

/**
 * The curtain while a portal swaps worlds: fades in over the scene, names where you're
 * going, and fades out once the new world is up (see watchWorld).
 */
export function WorldFade() {
  const to = useWorld((s) => s.fade)
  const shown = useWorld((s) => s.shown)
  const title = TITLES[to ?? shown] || TITLES[1]
  return (
    <div
      className="pp-font pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: title.backdrop, opacity: to === null ? 0 : 1, transition: 'opacity 0.35s ease' }}
    >
      <StrokeText stroke={u(12)} gradient={title.gradient} style={{ fontSize: u(110) }}>
        {title.text}
      </StrokeText>
    </div>
  )
}

export default WorldFade
