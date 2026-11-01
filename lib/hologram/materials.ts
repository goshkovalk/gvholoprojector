import * as THREE from 'three'

export interface SharedUniforms {
  uTime: { value: number }
  uColor: { value: THREE.Color }
  uScan: { value: number }
  uGlitch: { value: number }
  uZScale: { value: number }
  uCutoff: { value: number }
  uTrueColor: { value: number }
  uPointSize: { value: number }
  uPixelRatio: { value: number }
}

export function createSharedUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#3be8ff') },
    uScan: { value: 0.6 },
    uGlitch: { value: 0.35 },
    uZScale: { value: 1 },
    uCutoff: { value: 0 },
    uTrueColor: { value: 0 },
    uPointSize: { value: 1 },
    uPixelRatio: { value: 1 },
  }
}

const noise = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
`

const glitchOffset = /* glsl */ `
  float band = floor(worldPos.y * 18.0);
  float tick = floor(uTime * 9.0);
  float g = step(0.965, hash(vec2(tick, band))) * uGlitch;
  worldPos.x += g * 0.12 * sin(uTime * 70.0 + band);
  worldPos.z += g * 0.05;
`

const meshVertex = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;
  uniform float uZScale;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  ${noise}
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z *= uZScale;
    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    ${glitchOffset}
    vWorldPos = worldPos.xyz;
    vNormal = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const meshFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uScan;
  uniform float uCutoff;
  uniform float uTrueColor;
  uniform sampler2D uMap;
  uniform float uUseMap;
  uniform vec3 uBaseColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  ${noise}
  void main() {
    vec3 n = normalize(vNormal + vec3(0.0, 0.0, 1e-5));
    if (!gl_FrontFacing) n = -n;
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(abs(dot(n, viewDir)), 0.0, 1.0), 2.2);

    vec3 srcColor = uBaseColor;
    float srcAlpha = 1.0;
    if (uUseMap > 0.5) {
      vec4 tex = texture2D(uMap, vUv);
      srcColor *= tex.rgb;
      srcAlpha = tex.a;
    }
    float lum = dot(srcColor, vec3(0.299, 0.587, 0.114));
    if (srcAlpha < 0.1 || lum < uCutoff) discard;

    float stripes = fract((vWorldPos.y - uTime * 0.25) * 26.0);
    stripes = pow(stripes, 4.0);
    float sweep = smoothstep(0.0, 0.04, abs(fract(vWorldPos.y * 0.35 - uTime * 0.18) - 0.5));
    float flicker = 0.92 + 0.08 * hash(vec2(floor(uTime * 24.0), 1.0));

    float detail = uUseMap > 0.5 ? (0.25 + lum * 1.3) : (0.55 + lum * 0.5);
    vec3 holo = uColor * detail;
    vec3 col = mix(holo, srcColor * 1.15, uTrueColor);
    col += uColor * fresnel * 1.4;
    col += uColor * (1.0 - sweep) * 0.5;

    float alpha = 0.18 + fresnel * 0.9 + lum * 0.35;
    alpha *= mix(1.0, 0.45 + stripes * 1.1, uScan);
    alpha *= flicker * srcAlpha;

    gl_FragColor = vec4(col * alpha, alpha);
  }
`

export function createHologramMaterial(
  shared: SharedUniforms,
  options: { map?: THREE.Texture | null; baseColor?: THREE.Color } = {},
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uMap: { value: options.map ?? null },
      uUseMap: { value: options.map ? 1 : 0 },
      uBaseColor: { value: options.baseColor ?? new THREE.Color(1, 1, 1) },
    },
    vertexShader: meshVertex,
    fragmentShader: meshFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

const pointsVertex = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;
  uniform float uZScale;
  uniform float uPointSize;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vY;
  ${noise}
  void main() {
    vColor = color;
    vec3 p = position;
    p.z *= uZScale;
    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    ${glitchOffset}
    vY = worldPos.y;
    vec4 mv = viewMatrix * worldPos;
    gl_PointSize = uPointSize * uPixelRatio * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const pointsFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uScan;
  uniform float uCutoff;
  uniform float uTrueColor;
  varying vec3 vColor;
  varying float vY;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float lum = dot(vColor, vec3(0.299, 0.587, 0.114));
    if (lum < uCutoff) discard;
    float soft = 1.0 - smoothstep(0.0, 0.5, d);
    float stripes = pow(fract((vY - uTime * 0.25) * 26.0), 4.0);
    vec3 col = mix(uColor * (0.4 + lum * 1.2), vColor * 1.2, uTrueColor);
    float alpha = soft * (0.55 + lum * 0.6) * mix(1.0, 0.5 + stripes, uScan);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`

export function createPointsMaterial(shared: SharedUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
