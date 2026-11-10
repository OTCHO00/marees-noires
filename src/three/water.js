// Mer stylisée : aplats de couleur par paliers (abysses, large, hauts-fonds),
// contours d'écume dessinés autour des îles, vaguelettes graphiques au large
// et halos chauds sous les lanternes. Pas de reflets réalistes : on vise une
// lecture nette, comme une illustration.
import * as THREE from 'three';
import { WATER_LEVEL } from './models.js';

const RES = 8; // texels du champ côtier par unité de carte
const MAX_LIGHTS = 14;
const FAR = 1.5; // distance à la côte encodée dans le champ (en cases)

const vertexShader = /* glsl */ `
varying vec2 vXZ;
varying float vDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = world.xz;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform sampler2D uField;
uniform vec4 uRect;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uRipple;
uniform vec3 uLightPos[${MAX_LIGHTS}];
uniform vec3 uLightCol[${MAX_LIGHTS}];
uniform vec3 uFade;
uniform vec2 uFadeRange;
varying vec2 vXZ;
varying float vDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Trait net et anticrénelé autour de la valeur 0.
float stroke(float d, float w) {
  float aa = fwidth(d) * 1.2;
  return 1.0 - smoothstep(w, w + aa, abs(d));
}

void main() {
  vec4 field = texture2D(uField, (vXZ - uRect.xy) / uRect.zw);
  float shallow = field.r;
  float dist = field.b * ${FAR.toFixed(1)}; // distance à la falaise la plus proche

  // Aplats : abysses → large → hauts-fonds.
  float aa = fwidth(shallow) * 1.5;
  vec3 col = mix(uDeep, uMid, smoothstep(0.3 - aa, 0.3 + aa, shallow));
  col = mix(col, uShallow, smoothstep(0.68 - aa, 0.68 + aa, shallow));
  col *= 0.94 + 0.06 * noise(vXZ * 0.4 + uTime * 0.02);

  // Halos chauds des lanternes sur l'eau.
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    float d = length(vXZ - uLightPos[i].xz);
    float k = smoothstep(1.1, 0.0, d);
    col += uLightCol[i] * k * k * 0.16;
  }

  float nearLand = 1.0 - step(${(FAR - 0.05).toFixed(2)}, dist);
  // Écume qui épouse le pied des falaises.
  float wob = (noise(vXZ * 5.0 + uTime * 0.4) - 0.5) * 0.03;
  float hug = (1.0 - smoothstep(0.045, 0.045 + fwidth(dist) * 1.5, dist + wob)) * nearLand;
  // Ligne de ressac qui avance et recule.
  float r1 = 0.2 + 0.06 * sin(uTime * 0.9 + noise(vXZ * 0.7) * 2.5);
  float line1 = stroke(dist - r1, 0.012) * step(0.32, noise(vXZ * 2.4 + uTime * 0.12)) * nearLand;
  float r2 = 0.46 + 0.07 * sin(uTime * 0.9 + 1.8 + noise(vXZ * 0.6) * 2.0);
  float line2 = stroke(dist - r2, 0.009) * step(0.5, noise(vXZ * 1.8 - uTime * 0.1)) * nearLand * 0.55;

  // Vaguelettes : de petits traits incurvés qui naissent et disparaissent.
  vec2 g = vXZ * 1.1;
  vec2 cell = floor(g);
  float h = hash(cell);
  vec2 c = (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.45;
  vec2 q = fract(g) - 0.5 - c;
  float along = dot(q, vec2(0.7071, -0.7071));
  float across = dot(q, vec2(0.7071, 0.7071)) + along * along * 1.6;
  float ripple = stroke(across, 0.012) * (1.0 - smoothstep(0.11, 0.15, abs(along)));
  ripple *= smoothstep(0.25, 0.85, sin(uTime * 0.6 + h * 6.2832)) * step(0.4, h);
  ripple *= smoothstep(0.35, 0.9, dist / ${FAR.toFixed(1)}) + (1.0 - nearLand);

  col = mix(col, uRipple, ripple * 0.7);
  col = mix(col, uFoam, max(hug, max(line1 * 0.75, line2)));
  // Au loin, la mer se fond dans la nuit (utile en vue perspective).
  col = mix(col, uFade, smoothstep(uFadeRange.x, uFadeRange.y, vDepth));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// `planeSize` étend la mer au-delà du champ côtier (jusqu'à l'horizon) ;
// `fade` la fait disparaître dans la nuit entre deux distances.
export function createWater(size, { planeSize, fade = null } = {}) {
  const width = size + 12;
  const center = (size - 1) / 2;
  const x0 = center - width / 2;
  const n = width * RES;
  const data = new Uint8Array(n * n * 4);
  const field = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  field.magFilter = THREE.LinearFilter;
  field.minFilter = THREE.LinearFilter;
  field.needsUpdate = true;

  const uniforms = {
    uTime: { value: 0 },
    uField: { value: field },
    uRect: { value: new THREE.Vector4(x0, x0, width, width) },
    uDeep: { value: new THREE.Color('#05090b') },
    uMid: { value: new THREE.Color('#0b181b') },
    uShallow: { value: new THREE.Color('#132a2a') },
    uFoam: { value: new THREE.Color('#7d9e98') },
    uRipple: { value: new THREE.Color('#284744') },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    uLightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
    uFade: { value: new THREE.Color(fade?.color ?? '#000000') },
    uFadeRange: { value: new THREE.Vector2(fade?.near ?? 1e5, fade?.far ?? 2e5) },
  };
  // Couleurs exactes de la palette : pas de compression des tons.
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, toneMapped: false });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(planeSize ?? width, planeSize ?? width, 1, 1).rotateX(-Math.PI / 2), material);
  sea.position.set(center, WATER_LEVEL, center);

  // Champ côtier : R = hauts-fonds, B = distance au bloc de terre le plus proche.
  // `kind(x, y)` renvoie 'land', 'shallow' ou 'deep'.
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
        let dLand = FAR;
        let dShallow = 9;
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const k = at(cx + dx, cz + dz);
            if (k === 'deep') continue;
            // Distance à un carré d'une case, coins arrondis.
            const ex = Math.max(0, Math.abs(wx - (cx + dx)) - 0.5);
            const ez = Math.max(0, Math.abs(wz - (cz + dz)) - 0.5);
            const d = Math.hypot(ex, ez);
            if (k === 'land') dLand = Math.min(dLand, d);
            dShallow = Math.min(dShallow, d);
          }
        }
        const o = (j * n + i) * 4;
        data[o] = 255 * Math.max(0, Math.min(1, 1 - dShallow / 1.1));
        data[o + 1] = 0;
        data[o + 2] = 255 * Math.min(1, dLand / FAR);
        data[o + 3] = 255;
      }
    }
    field.needsUpdate = true;
  };

  sea.userData.update = (t) => {
    uniforms.uTime.value = t;
  };

  // Halos des lanternes : les lumières actives du rendu.
  sea.userData.setLights = (lights) => {
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = lights[i];
      if (l && l.intensity > 0) {
        uniforms.uLightPos.value[i].copy(l.position);
        uniforms.uLightCol.value[i].copy(l.color).multiplyScalar(Math.min(1.5, l.intensity));
      } else {
        uniforms.uLightCol.value[i].setRGB(0, 0, 0);
      }
    }
  };
  return sea;
}
