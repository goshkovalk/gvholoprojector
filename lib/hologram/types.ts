import type * as THREE from 'three'

export type RenderMode = 'hologram' | 'points' | 'wireframe'

export type HoloSource =
  | {
      kind: 'image'
      name: string
      texture: THREE.Texture
      image: HTMLImageElement
    }
  | { kind: 'model'; name: string; object: THREE.Object3D }

export interface HoloSettings {
  mode: RenderMode
  color: string
  autoRotate: boolean
  rotateSpeed: number
  scanlines: number
  glitch: number
  depth: number
  cutoff: number
  trueColor: number
  pointSize: number
  bloom: number
  pyramid: boolean
}

export const DEFAULT_SETTINGS: HoloSettings = {
  mode: 'hologram',
  color: '#3be8ff',
  autoRotate: true,
  rotateSpeed: 0.5,
  scanlines: 0.6,
  glitch: 0.35,
  depth: 0.45,
  cutoff: 0.08,
  trueColor: 0.35,
  pointSize: 1,
  bloom: 0.75,
  pyramid: false,
}

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']
export const MODEL_EXTENSIONS = ['glb', 'gltf', 'obj', 'stl', 'ply', 'fbx']
