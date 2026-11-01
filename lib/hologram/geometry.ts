import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

const HOLO_SIZE = 2.6

function readPixels(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(image, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height).data
}

function imageDimensions(image: HTMLImageElement) {
  const aspect = image.naturalWidth / image.naturalHeight
  const w = aspect >= 1 ? HOLO_SIZE : HOLO_SIZE * aspect
  const h = aspect >= 1 ? HOLO_SIZE / aspect : HOLO_SIZE
  return { w, h, aspect }
}

/** Two-sided relief mesh: luminance pushes the surface out on front and back. */
export function buildImageRelief(image: HTMLImageElement, resolution = 220) {
  const { w, h, aspect } = imageDimensions(image)
  const segX = aspect >= 1 ? resolution : Math.round(resolution * aspect)
  const segY = aspect >= 1 ? Math.round(resolution / aspect) : resolution
  const pixels = readPixels(image, segX + 1, segY + 1)

  const front = new THREE.PlaneGeometry(w, h, segX, segY)
  const pos = front.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const o = i * 4
    const a = pixels[o + 3] / 255
    const lum = ((pixels[o] * 0.299 + pixels[o + 1] * 0.587 + pixels[o + 2] * 0.114) / 255) * a
    pos.setZ(i, 0.04 + lum)
  }
  front.computeVertexNormals()

  const back = front.clone()
  back.scale(1, 1, -1)
  const index = back.index!
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1)
    index.setX(i + 1, index.getX(i + 2))
    index.setX(i + 2, b)
  }
  back.computeVertexNormals()

  const merged = mergeGeometries([front, back])
  front.dispose()
  back.dispose()
  return merged
}

/** Point cloud from pixels, mirrored on both sides so it has volume from every angle. */
export function buildImagePoints(image: HTMLImageElement) {
  const { w, h, aspect } = imageDimensions(image)
  const cols = aspect >= 1 ? 260 : Math.round(260 * aspect)
  const rows = aspect >= 1 ? Math.round(260 / aspect) : 260
  const pixels = readPixels(image, cols, rows)

  const positions: number[] = []
  const colors: number[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const o = (y * cols + x) * 4
      const a = pixels[o + 3] / 255
      if (a < 0.1) continue
      const r = pixels[o] / 255
      const g = pixels[o + 1] / 255
      const b = pixels[o + 2] / 255
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) * a
      const px = (x / (cols - 1) - 0.5) * w
      const py = (0.5 - y / (rows - 1)) * h
      for (const side of [1, -1]) {
        positions.push(px, py, side * (0.04 + lum))
        colors.push(r, g, b)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

/** Center a model and scale it to fit the hologram volume. */
export function normalizeObject(object: THREE.Object3D) {
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = HOLO_SIZE / maxDim

  const wrapper = new THREE.Group()
  object.position.sub(center)
  wrapper.add(object)
  wrapper.scale.setScalar(scale)
  wrapper.updateMatrixWorld(true)
  return wrapper
}

export function collectMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && mesh.geometry) {
      if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals()
      meshes.push(mesh)
    }
  })
  return meshes
}

/** Scatter points across the surface of every mesh in a model. */
export function sampleModelPoints(root: THREE.Object3D, total = 60000) {
  root.updateMatrixWorld(true)
  const meshes = collectMeshes(root)
  const counts = meshes.map((m) => m.geometry.attributes.position.count)
  const sum = counts.reduce((a, b) => a + b, 0) || 1

  const positions: number[] = []
  const colors: number[] = []
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  const c = new THREE.Color()

  meshes.forEach((mesh, i) => {
    const amount = Math.max(200, Math.round((counts[i] / sum) * total))
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geometry))
    sampler.build()
    const hasVertexColor = Boolean(geometry.attributes.color)
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined
    const base = material?.color ? material.color.clone() : new THREE.Color(1, 1, 1)

    for (let k = 0; k < amount; k++) {
      if (hasVertexColor) sampler.sample(p, n, c)
      else {
        sampler.sample(p, n)
        c.copy(base)
      }
      p.applyMatrix4(mesh.matrixWorld)
      positions.push(p.x, p.y, p.z)
      colors.push(c.r, c.g, c.b)
    }
    if (geometry !== mesh.geometry) geometry.dispose()
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export function createDemoObject() {
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, 0.26, 260, 36, 2, 3),
    new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  )
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({ color: '#bfefff' }),
  )
  const group = new THREE.Group()
  group.add(knot, core)
  return normalizeObject(group)
}
