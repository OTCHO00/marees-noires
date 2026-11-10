// Mer nocturne : un plan lisse dont les vagues sont calculées par pixel
// dans le shader. Les reflets de la lune et des lanternes ondulent, les
// hauts-fonds s'éclaircissent et l'écume bat le pied des îles.
// On part du matériau standard de Three.js (lumières, ombres, brouillard)
// et on remplace la normale, la couleur et l'émission.
import * as THREE from 'three';
import { WATER_LEVEL } from './models.js';

const RES = 6; // texels du champ côtier par unité de carte

const COMMON = /* glsl */ `
uniform float uTime;
uniform sampler2D uField;
uniform vec4 uRect;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
varying vec3 vWPos;

float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float wHeight(vec2 p, float t) {
  float h = sin(dot(p, vec2(0.8, 0.6)) * 2.6 + t * 0.9) * 0.45;
  h += sin(dot(p, vec2(-0.55, 0.85)) * 3.9 + t * 1.25) * 0.3;
  h += sin(dot(p, vec2(0.95, -0.3)) * 6.1 - t * 1.6) * 0.15;
  h += (wNoise(p * 1.8 + vec2(t * 0.22, t * 0.15)) - 0.5) * 0.9;
  h += (wNoise(p * 4.6 - vec2(t * 0.35, -t * 0.28)) - 0.5) * 0.4;
  return h;
}
`;

export function createWater(size) {
  const width = size + 12;
  const center = (size - 1) / 2;
  const x0 = center - width / 2;
  const n = width * RES;
  const data = new Uint8Array(n * n * 4);
  const field = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  field.magFilter = THREE.LinearFilter;
  field.minFilter = THREE.LinearFilter;
  field.wrapS = field.wrapT = THREE.ClampToEdgeWrapping;
  field.needsUpdate = true;

  const uniforms = {
    uTime: { value: 0 },
    uField: { value: field },
    uRect: { value: new THREE.Vector4(x0, x0, width, width) },
    uDeep: { value: new THREE.Color('#040b0d') },
    uShallow: { value: new THREE.Color('#1a3d3a') },
    uFoam: { value: new THREE.Color('#8fb7b0') },
  };

  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        vec4 wField = texture2D(uField, (vWPos.xz - uRect.xy) / uRect.zw);
        float wShallow = wField.r;
        float wCoast = wField.g;
        vec3 wBase = mix(uDeep, uShallow, wShallow);
        wBase *= 0.75 + 0.5 * wNoise(vWPos.xz * 0.9 + uTime * 0.04);
        diffuseColor.rgb = wBase;
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */ `
        #include <normal_fragment_maps>
        {
          vec2 p = vWPos.xz;
          float e = 0.035;
          float dx = (wHeight(p + vec2(e, 0.0), uTime) - wHeight(p - vec2(e, 0.0), uTime)) / (2.0 * e);
          float dz = (wHeight(p + vec2(0.0, e), uTime) - wHeight(p - vec2(0.0, e), uTime)) / (2.0 * e);
          float calm = 1.0 - 0.6 * wCoast; // l'eau se calme contre la roche
          vec3 nW = normalize(vec3(-dx * 0.045 * calm, 1.0, -dz * 0.045 * calm));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `
        #include <emissivemap_fragment>
        {
          float wobble = wNoise(vWPos.xz * 3.0 + uTime * 0.3) * 3.5;
          float band = 0.5 + 0.5 * sin(wCoast * 16.0 - uTime * 1.4 + wobble);
          float foam = smoothstep(0.45, 1.0, wCoast) * smoothstep(0.6, 0.95, band);
          foam += smoothstep(0.88, 1.0, wCoast) * 0.7;
          foam *= 0.65 + 0.35 * wNoise(vWPos.xz * 9.0 - uTime * 0.5);
          totalEmissiveRadiance += uFoam * foam * 0.32;
        }
      `);
  };

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(width, width).rotateX(-Math.PI / 2), material);
  sea.position.set(center, WATER_LEVEL, center);
  // Pas d'ombres portées sur l'eau : la limite de la carte d'ombre de la
  // lune y dessinerait des bandes.
  sea.receiveShadow = false;

  // Champ côtier : R = hauts-fonds, G = proximité d'une falaise (écume).
  // `kind(x, y)` renvoie 'land', 'shallow' ou 'deep' pour une case visible.
  sea.userData.recolor = (kind) => {
    const kinds = new Map();
    const at = (x, y) => {
      const k = `${x},${y}`;
      if (!kinds.has(k)) kinds.set(k, x >= 0 && y >= 0 && x < size && y < size ? kind(x, y) : 'deep');
      return kinds.get(k);
    };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const wx = x0 + (i + 0.5) / RES;
        const wz = x0 + (j + 0.5) / RES;
        const cx = Math.round(wx);
        const cz = Math.round(wz);
        let dLand = 9;
        let dShallow = 9;
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const k = at(cx + dx, cz + dz);
            if (k === 'deep') continue;
            const d = Math.max(Math.abs(wx - (cx + dx)), Math.abs(wz - (cz + dz))) - 0.5;
            if (k === 'land') dLand = Math.min(dLand, d);
            dShallow = Math.min(dShallow, d);
          }
        }
        const o = (j * n + i) * 4;
        data[o] = 255 * Math.max(0, Math.min(1, 1 - dShallow / 0.9));
        data[o + 1] = 255 * Math.max(0, Math.min(1, 1 - dLand / 0.55));
        data[o + 2] = 0;
        data[o + 3] = 255;
      }
    }
    field.needsUpdate = true;
  };
  sea.userData.update = (t) => {
    uniforms.uTime.value = t;
  };
  return sea;
}
