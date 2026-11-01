'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'

const BASE_Y = -1.85

export function ProjectorBase({ color }: { color: string }) {
  const ringRef = useRef<THREE.Group>(null)

  const beamMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float fade = pow(1.0 - vUv.y, 2.2);
            float rays = 0.65 + 0.35 * sin(vUv.x * 80.0 + uTime * 1.5);
            float a = fade * rays * 0.16;
            gl_FragColor = vec4(uColor * a, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame((state, delta) => {
    beamMaterial.uniforms.uTime.value = state.clock.elapsedTime
    beamMaterial.uniforms.uColor.value.set(color)
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.4
  })

  return (
    <group position={[0, BASE_Y, 0]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.7, 1.9, 0.24, 96]} />
        <meshStandardMaterial color="#0a111c" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.25, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>

      <group ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        {[0.55, 0.95, 1.4].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r, r + 0.025, 128, 1, 0, Math.PI * (1.4 + i * 0.25)]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 1.8, 0]} material={beamMaterial}>
        <cylinderGeometry args={[1.8, 1.25, 3.6, 96, 1, true]} />
      </mesh>

      <Sparkles
        count={70}
        scale={[2.6, 3.6, 2.6]}
        position={[0, 1.8, 0]}
        size={2.2}
        speed={0.35}
        color={color}
        opacity={0.7}
      />
    </group>
  )
}
