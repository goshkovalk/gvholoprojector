import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { IMAGE_EXTENSIONS, MODEL_EXTENSIONS, type HoloSource } from './types'
import { normalizeObject } from './geometry'

export function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function isSupported(name: string) {
  const ext = getExtension(name)
  return IMAGE_EXTENSIONS.includes(ext) || MODEL_EXTENSIONS.includes(ext)
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = url
  })
}

export async function loadImageSource(url: string, name: string): Promise<HoloSource> {
  const image = await loadImage(url)
  const texture = new THREE.Texture(image)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return { kind: 'image', name, image, texture }
}

async function loadModel(url: string, ext: string): Promise<THREE.Object3D> {
  const solid = (geometry: THREE.BufferGeometry) => {
    if (!geometry.attributes.normal) geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({
      vertexColors: Boolean(geometry.attributes.color),
    })
    return new THREE.Mesh(geometry, material)
  }

  switch (ext) {
    case 'glb':
    case 'gltf':
      return (await new GLTFLoader().loadAsync(url)).scene
    case 'obj':
      return await new OBJLoader().loadAsync(url)
    case 'fbx':
      return await new FBXLoader().loadAsync(url)
    case 'stl':
      return solid(await new STLLoader().loadAsync(url))
    case 'ply':
      return solid(await new PLYLoader().loadAsync(url))
    default:
      throw new Error(`Unsupported format: .${ext}`)
  }
}

export async function loadFile(file: File): Promise<HoloSource> {
  const ext = getExtension(file.name)
  const url = URL.createObjectURL(file)
  try {
    if (IMAGE_EXTENSIONS.includes(ext)) return await loadImageSource(url, file.name)
    if (MODEL_EXTENSIONS.includes(ext)) {
      const object = await loadModel(url, ext)
      return { kind: 'model', name: file.name, object: normalizeObject(object) }
    }
    throw new Error(`Unsupported format: .${ext}`)
  } finally {
    URL.revokeObjectURL(url)
  }
}
