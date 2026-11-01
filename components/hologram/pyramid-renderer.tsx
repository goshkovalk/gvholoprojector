'use client'

import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const DISTANCE = 7.5

/**
 * Renders four views (front, right, back, left) arranged in a cross with each
 * object's top pointing outward, for use with a Pepper's-ghost pyramid on a screen.
 */
export function PyramidRenderer() {
  const gl = useThree((s) => s.gl)

  const views = useMemo(
    () =>
      [
        { angle: 0, roll: 0, slot: [0, 1] },
        { angle: Math.PI / 2, roll: Math.PI / 2, slot: [1, 0] },
        { angle: Math.PI, roll: Math.PI, slot: [0, -1] },
        { angle: -Math.PI / 2, roll: -Math.PI / 2, slot: [-1, 0] },
      ].map((v) => {
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
        camera.position.set(Math.sin(v.angle) * DISTANCE, 0, Math.cos(v.angle) * DISTANCE)
        camera.lookAt(0, 0, 0)
        camera.rotateZ(v.roll)
        camera.updateMatrixWorld()
        return { camera, slot: v.slot }
      }),
    [],
  )

  useEffect(() => {
    return () => {
      gl.autoClear = true
      gl.setScissorTest(false)
    }
  }, [gl])

  useFrame(({ scene, size }) => {
    const s = Math.floor(Math.min(size.width, size.height) / 3)
    const cx = size.width / 2
    const cy = size.height / 2

    gl.autoClear = false
    gl.setScissorTest(false)
    gl.setClearColor('#000000', 1)
    gl.clear()
    gl.setScissorTest(true)

    for (const { camera, slot } of views) {
      const x = cx - s / 2 + slot[0] * s
      const y = cy - s / 2 + slot[1] * s
      gl.setViewport(x, y, s, s)
      gl.setScissor(x, y, s, s)
      gl.render(scene, camera)
    }

    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
  }, 1)

  return null
}
