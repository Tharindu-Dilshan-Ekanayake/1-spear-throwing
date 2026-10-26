import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import { mulberry32 } from '@shared/rng'
import { PORTAL, PORTAL_WEST } from '@shared/world'

import { useQuality } from '../../store/quality'
import { asToyInstance, BlockSet, disposeBlocks, PropBuilder } from '../blocks'
import { glowTime } from '../glow'
import { createToyMaterial, sharedMaterials, toyTime } from '../materials'
import { createGroundGeometry, createGroundMap } from './ground'
import { buildCastle, buildPlanters } from './castle'
import { buildEggStands } from './eggs'
import { jackOLantern } from '../halloween/props'
import { buildPortalFrame, HALLOWEEN_FRAME } from './portalFrame'
import { buildStage } from './stage'
import { buildLanes, buildShop } from './structures'
import { buildTargets } from './targets'
import { createPaintedSigns } from './throwArea'
import { buildWaterfall } from './waterfall'
import { buildTerrain } from './terrain'

/**
 * World 1's static lobby: ground plane, every box (hills, trees, lane floors, stages)
 * in one InstancedMesh, and every non-box prop (targets...) merged into one mesh. Three
 * draw calls for the whole environment. (World 3 has its own, in halloween/.)
 *
 * Built once. Quality only decides tree density at build time and whether the result
 * casts/receives realtime shadows.
 */
export function World() {
  const shadows = useQuality((s) => s.settings.shadows === 'realtime')
  const [signs, setSigns] = useState([])

  // Drives every animated toy-material style (water...).
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
    performance.mark('pp:world-start')
    const { decorDensity, maxTexture } = useQuality.getState().settings
    const set = new BlockSet()
    buildTerrain(set, { treeDensity: decorDensity })
    const detail = decorDensity >= 0.75
    buildLanes(set, { detail })
    const propBuilder = new PropBuilder()
    buildShop(set, { detail })
    buildStage(set, propBuilder, { detail })
    buildCastle(set, propBuilder, { detail })
    buildPlanters(set, mulberry32(21))
    buildPortalFrame(set, PORTAL)
    // World 3's portal, its Halloween colours and a jack-o'-lantern either side
    // advertising what's through it.
    buildPortalFrame(set, PORTAL_WEST, HALLOWEEN_FRAME)
    for (const side of [-1, 1]) jackOLantern(set, PORTAL_WEST.x + side * 5.4, 0, PORTAL_WEST.z + 0.6, 1.1)
    buildWaterfall(set)

    buildTargets(propBuilder)
    buildEggStands(set, propBuilder)

    const map = createGroundMap(maxTexture)
    const groundMaterial = createToyMaterial({ instanced: false, vertexColors: false, map, studScale: 2 })

    performance.mark('pp:world-end')
    return {
      blocks: set.build(sharedMaterials().blocks),
      props: asToyInstance(propBuilder.build(), sharedMaterials().toy),
      ground: { geometry: createGroundGeometry(), material: groundMaterial, map },
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
    </>
  )
}

export default World
