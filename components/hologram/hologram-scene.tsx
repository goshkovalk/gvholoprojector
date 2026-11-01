'use client'

import { type ComponentRef, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { UnsignedByteType } from 'three'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { HoloSettings, HoloSource } from '@/lib/hologram/types'
import { HologramObject } from './hologram-object'
import { ProjectorBase } from './projector-base'
import { PyramidRenderer } from './pyramid-renderer'

interface HologramSceneProps {
  source: HoloSource
  settings: HoloSettings
  onCanvas: (canvas: HTMLCanvasElement) => void
  resetKey: number
}

export default function HologramScene({ source, settings, onCanvas, resetKey }: HologramSceneProps) {
  const bg = settings.pyramid ? '#000000' : '#04060b'
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)

  useEffect(() => {
    controlsRef.current?.reset()
  }, [resetKey])

  return (
    <Canvas
      camera={{ position: [0, 0.6, 6.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => onCanvas(gl.domElement)}
      aria-label="3D hologram viewer. Drag to rotate, scroll to zoom."
    >
      <color key={bg} attach="background" args={[bg]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={30} color={settings.color} />

      <HologramObject source={source} settings={settings} resetKey={resetKey} />

      {settings.pyramid ? (
        <PyramidRenderer />
      ) : (
        <>
          <ProjectorBase color={settings.color} />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableDamping
            minDistance={2.5}
            maxDistance={11}
            maxPolarAngle={Math.PI * 0.85}
          />
          <Effects bloom={settings.bloom} />
        </>
      )}
    </Canvas>
  )
}

/**
 * Deferred a few frames because mounting with the canvas blanks the output.
 * 8-bit buffers clamp the dense additive blending that otherwise overflows half-float buffers.
 */
function Effects({ bloom }: { bloom: number }) {
  const [ready, setReady] = useState(false)
  const frames = useRef(0)

  useFrame(() => {
    if (!ready && ++frames.current > 2) setReady(true)
  })

  if (!ready) return null
  return (
    <EffectComposer frameBufferType={UnsignedByteType}>
      <Bloom intensity={bloom} luminanceThreshold={0.12} luminanceSmoothing={0.4} mipmapBlur />
      <Vignette darkness={0.7} offset={0.25} />
    </EffectComposer>
  )
}
