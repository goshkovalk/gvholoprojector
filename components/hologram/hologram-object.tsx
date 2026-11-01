'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { HoloSettings, HoloSource, RenderMode } from '@/lib/hologram/types'
import {
  createHologramMaterial,
  createPointsMaterial,
  createSharedUniforms,
  type SharedUniforms,
} from '@/lib/hologram/materials'
import {
  buildImagePoints,
  buildImageRelief,
  collectMeshes,
  sampleModelPoints,
} from '@/lib/hologram/geometry'

interface BuiltContent {
  object: THREE.Object3D
  dispose: () => void
}

function buildContent(source: HoloSource, mode: RenderMode, shared: SharedUniforms): BuiltContent {
  if (mode === 'points') {
    const geometry =
      source.kind === 'image' ? buildImagePoints(source.image) : sampleModelPoints(source.object)
    const material = createPointsMaterial(shared)
    return {
      object: new THREE.Points(geometry, material),
      dispose: () => {
        geometry.dispose()
        material.dispose()
      },
    }
  }

  const wireframe = mode === 'wireframe'

  if (source.kind === 'image') {
    const geometry = buildImageRelief(source.image, wireframe ? 80 : 220)
    const material = createHologramMaterial(shared, { map: source.texture })
    material.wireframe = wireframe
    return {
      object: new THREE.Mesh(geometry, material),
      dispose: () => {
        geometry.dispose()
        material.dispose()
      },
    }
  }

  const clone = source.object.clone(true)
  const materials: THREE.Material[] = []
  for (const mesh of collectMeshes(clone)) {
    const original = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined
    const material = createHologramMaterial(shared, {
      map: original?.map ?? null,
      baseColor: original?.color?.clone(),
    })
    material.wireframe = wireframe
    mesh.material = material
    mesh.frustumCulled = false
    materials.push(material)
  }
  return {
    object: clone,
    dispose: () => materials.forEach((m) => m.dispose()),
  }
}

export function HologramObject({
  source,
  settings,
  resetKey,
}: {
  source: HoloSource
  settings: HoloSettings
  resetKey: number
}) {
  const shared = useMemo(createSharedUniforms, [])
  const groupRef = useRef<THREE.Group>(null)
  const settingsRef = useRef(settings)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const content = useMemo(
    () => buildContent(source, settings.mode, shared),
    [source, settings.mode, shared],
  )
  useEffect(() => () => content.dispose(), [content])

  useEffect(() => {
    groupRef.current?.rotation.set(0, 0, 0)
  }, [resetKey])

  useFrame((state, delta) => {
    const s = settingsRef.current
    const isImage = source.kind === 'image'
    shared.uTime.value = state.clock.elapsedTime
    shared.uColor.value.set(s.color)
    shared.uScan.value = s.scanlines
    shared.uGlitch.value = s.glitch
    shared.uZScale.value = isImage ? s.depth : 1
    shared.uCutoff.value = isImage ? s.cutoff : 0
    shared.uTrueColor.value = s.trueColor
    shared.uPointSize.value = s.pointSize * (isImage ? 1.7 : 1.3)
    shared.uPixelRatio.value = gl.getPixelRatio()

    const group = groupRef.current
    if (!group) return
    if (s.autoRotate) group.rotation.y += delta * s.rotateSpeed
    group.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.06
  })

  return (
    <group ref={groupRef}>
      <primitive object={content.object} />
    </group>
  )
}
