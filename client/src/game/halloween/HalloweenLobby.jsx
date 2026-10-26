import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import { useQuality } from '../../store/quality'
import { asToyInstance, disposeBlocks } from '../blocks'
import { glowTime } from '../glow'
import { createToyMaterial, sharedMaterials, toyTime } from '../materials'
import { HALLOWEEN } from '../sceneStyle'
import { createGroundGeometry, createGroundMap } from '../world/ground'
import { createPaintedSigns } from '../world/throwArea'
import { buildHalloweenLobby } from './lobby'
import NightSky from './NightSky'

/**
 * World 3's lobby, the Halloween twin of World.jsx: the same ground plane, block mesh
 * and prop mesh (three draw calls) and painted signs, plus the moon and the bats.
 * Built when you arrive and disposed when you leave.
 */
export function HalloweenLobby() {
  const shadows = useQuality((s) => s.settings.shadows === 'realtime')
  const [signs, setSigns] = useState([])

  useFrame((state) => {
    toyTime.value = state.clock.elapsedTime
    glowTime.value = state.clock.elapsedTime
  })

  useEffect(() => {
    let made = []
    let cancelled = false
    const dispose = (list) => {
      for (const sign of list) {
        sign.geometry.dispose()
        sign.material.dispose()
        sign.texture.dispose()
      }
    }
    createPaintedSigns(useQuality.getState().settings.maxTexture).then((list) => {
      if (cancelled) {
        dispose(list)
        return
      }
      made = list
      setSigns(list)
    })
    return () => {
      cancelled = true
      dispose(made)
    }
  }, [])

  const { blocks, ground, props } = useMemo(() => {
    const { decorDensity, maxTexture } = useQuality.getState().settings
    const { set, props: propBuilder } = buildHalloweenLobby({ decorDensity })
    const map = createGroundMap(maxTexture, HALLOWEEN.palette)
    return {
      blocks: set.build(sharedMaterials().blocks),
      props: asToyInstance(propBuilder.build(), sharedMaterials().toy),
      ground: { geometry: createGroundGeometry(), material: createToyMaterial({ instanced: false, vertexColors: false, map, studScale: 2 }), map },
    }
  }, [])

  useEffect(
    () => () => {
      disposeBlocks(blocks)
      props.geometry.dispose()
      props.dispose()
      ground.geometry.dispose()
      ground.material.dispose()
      ground.map.dispose()
    },
    [blocks, ground, props],
  )

  return (
    <>
      <mesh geometry={ground.geometry} material={ground.material} receiveShadow={shadows} />
      <primitive object={blocks} castShadow={shadows} receiveShadow={shadows} />
      <primitive object={props} castShadow={shadows} receiveShadow={shadows} />
      {signs.map((sign) => (
        <mesh key={sign.texture.uuid} geometry={sign.geometry} material={sign.material} position={sign.position} rotation={sign.rotation} renderOrder={1} />
      ))}
      <NightSky />
    </>
  )
}

export default HalloweenLobby
