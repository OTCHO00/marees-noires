// La mer : un plan unique dont le shader dépend du style choisi. Tous les
// styles lisent le même champ côtier (hauts-fonds, distance à la terre,
// cases englouties) et les mêmes lanternes ; seul le dessin change.
//   huile   — encre visqueuse, reflets irisés, traînées de lanternes
//   gravure — taille-douce de carte marine, lignes d'eau autour des côtes
//   abysse  — eau translucide : fond, ruines englouties, lueurs vivantes
//   aplats  — l'ancienne mer en aplats avec contours d'écume
import * as THREE from 'three';
import { WATER_LEVEL } from './models.js';

const RES = 8; // texels du champ côtier par unité de carte
const MAX_LIGHTS = 14;
const FAR = 3; // distance à la côte encodée dans le champ (en cases)

export const WATER_STYLES = {
  huile: { name: 'Huile noire', desc: 'Une encre lourde et lente. La lune y glisse en reflets irisés, les lanternes s’y étirent en traînées tremblantes.' },
  gravure: { name: 'Gravure', desc: 'La mer d’une carte marine ancienne : des lignes d’eau cernent les côtes et s’en éloignent, la houle est hachurée.' },
  abysse: { name: 'Abysse', desc: 'Une eau translucide : on devine le fond, les cases englouties, et des lueurs vivantes qui dérivent.' },
  aplats: { name: 'Aplats (actuelle)', desc: 'L’ancienne mer : aplats de couleur, écume et vaguelettes.' },
};
export const DEFAULT_WATER = 'aplats';

const vertexShader = /* glsl */ `
varying vec2 vXZ;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = world.xz;
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

// Déclarations et fonctions communes à tous les styles.
const common = /* glsl */ `
uniform float uTime;
uniform sampler2D uField;
uniform vec4 uRect;
uniform vec3 uMoon;
uniform vec3 uLightPos[${MAX_LIGHTS}];
uniform vec3 uLightCol[${MAX_LIGHTS}];
uniform vec3 uFade;
uniform vec2 uFadeRange;
varying vec2 vXZ;
varying vec3 vWorld;
varying float vDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
// Trait net et anticrénelé autour de la valeur 0.
float stroke(float d, float w) {
  float aa = fwidth(d) * 1.2;
  return 1.0 - smoothstep(w, w + aa, abs(d));
}
// Champ côtier : r = hauts-fonds, g = case engloutie, b = distance à la terre.
vec4 fieldAt(vec2 xz) { return texture2D(uField, (xz - uRect.xy) / uRect.zw); }
// Direction de la caméra (vue isométrique orthographique ou perspective).
vec3 viewDir() {
  if (isOrthographic) return normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  return normalize(cameraPosition - vWorld);
}
// Somme des lanternes autour d'un point, avec une portée donnée.
vec3 lanterns(vec2 p, float reach) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    vec2 d = p - uLightPos[i].xz;
    c += uLightCol[i] * exp(-dot(d, d) / reach);
  }
  return c;
}
vec4 finish(vec3 col) {
  col = mix(col, uFade, smoothstep(uFadeRange.x, uFadeRange.y, vDepth));
  return vec4(col, 1.0);
}
`;

// ---------- Huile noire ----------
const huile = /* glsl */ `
float swell(vec2 p) {
  return fbm(p * 0.32 + vec2(uTime * 0.025, uTime * 0.018)) + 0.45 * fbm(p * 0.85 - vec2(uTime * 0.04, -uTime * 0.03));
}
void main() {
  vec4 f = fieldAt(vXZ);
  float dist = f.b * ${FAR.toFixed(1)};
  vec3 V = viewDir();

  // Houle lente et visqueuse : la normale suit le relief du bruit.
  float e = 0.08;
  float h = swell(vXZ);
  vec3 N = normalize(vec3(-(swell(vXZ + vec2(e, 0.0)) - h) / e * 0.35, 1.0, -(swell(vXZ + vec2(0.0, e)) - h) / e * 0.35));

  // Encre presque noire, verdâtre et trouble près des côtes.
  vec3 ink = vec3(0.002, 0.005, 0.006);
  vec3 murk = vec3(0.008, 0.016, 0.012);
  vec3 col = mix(ink, murk, f.r * 0.8 + (1.0 - smoothstep(0.0, 1.2, dist)) * 0.4);

  // Ciel nocturne en reflet, plus présent en incidence rasante.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, vec3(0.006, 0.012, 0.014), fres);

  // Lune : un lustre large et doux qui glisse sur les bosses de la houle.
  vec3 R = reflect(-V, N);
  // Le lustre ne naît que sur les crêtes de houle : de longues nappes isolées.
  float crest = smoothstep(0.62, 0.9, h);
  float sheen = pow(max(dot(R, normalize(uMoon)), 0.0), 6.0) * crest;
  float spark = pow(max(dot(R, normalize(uMoon)), 0.0), 300.0);
  // Irisation de nappe d'huile : un arc-en-ciel sale dans le lustre.
  float hue = h * 2.6 + fres * 1.5 + uTime * 0.03;
  vec3 irid = 0.5 + 0.5 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));
  col += mix(vec3(0.05, 0.07, 0.07), irid * 0.09, 0.6) * sheen;
  col += vec3(0.4, 0.5, 0.48) * spark * crest;

  // Lanternes : halo bas et longues traînées brisées vers la caméra.
  vec2 toward = normalize(V.xz + vec2(1e-4));
  vec2 side = vec2(-toward.y, toward.x);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    vec2 d = vXZ - uLightPos[i].xz;
    float along = dot(d, toward);
    float across = dot(d, side) + (noise(vec2(along * 3.0, uTime * 0.8)) - 0.5) * 0.12;
    float streak = exp(-across * across / (0.004 + max(along, 0.0) * 0.012)) * smoothstep(-0.15, 0.1, along) * exp(-max(along, 0.0) * 0.9);
    streak *= step(0.42, noise(vec2(across * 9.0, along * 16.0 - uTime * 2.2)));
    col += uLightCol[i] * (streak * 0.5 + exp(-dot(d, d) * 2.2) * 0.12);
  }

  // Lisière : un film clair au contact de la pierre, puis une auréole mouillée.
  float wob = (noise(vXZ * 4.0 + uTime * 0.3) - 0.5) * 0.03;
  col += vec3(0.1, 0.14, 0.12) * stroke(dist - 0.035 - wob, 0.014);
  float ring = stroke(fract(dist * 1.6 - uTime * 0.05) - 0.5, 0.02) * (1.0 - smoothstep(0.2, 1.4, dist)) * step(0.06, dist);
  col += vec3(0.02, 0.03, 0.028) * ring;
  gl_FragColor = finish(col);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------- Gravure ----------
const gravure = /* glsl */ `
void main() {
  vec4 f = fieldAt(vXZ);
  float dist = f.b * ${FAR.toFixed(1)};
  vec3 paper = vec3(0.004, 0.009, 0.011);
  vec3 ink = vec3(0.07, 0.11, 0.1);
  vec3 col = paper + vec3(0.004, 0.008, 0.007) * f.r;

  vec3 lamp = lanterns(vXZ, 1.6);
  float lit = clamp(dot(lamp, vec3(0.33)), 0.0, 1.0);

  // Lignes d'eau de carte marine : elles naissent à la côte et s'en éloignent
  // en s'espaçant, de plus en plus fines.
  float u = pow(dist / ${FAR.toFixed(1)}, 0.6) * 5.0 - uTime * 0.1;
  u += (noise(vXZ * 1.3) - 0.5) * 0.25;
  float k = fract(u) - 0.5;
  float fade = 1.0 - smoothstep(0.35, 1.0, dist / ${FAR.toFixed(1)});
  float lines = stroke(k, mix(0.015, 0.045, fade)) * fade * step(0.03, dist);
  // Trait continu qui serre la côte.
  lines = max(lines, stroke(dist - 0.05, 0.012));

  // Houle au large : hachures parallèles qui ondulent, plus épaisses sous
  // la lune et près des lanternes.
  vec2 dir = normalize(vec2(1.0, -0.55));
  vec2 per = vec2(-dir.y, dir.x);
  float swell = fbm(vXZ * 0.35 + vec2(uTime * 0.03, 0.0));
  float y = dot(vXZ, per) * 6.0 + sin(dot(vXZ, dir) * 2.2 + uTime * 0.7) * 0.6 + swell * 3.0;
  float tone = smoothstep(0.45, 0.8, swell) * 0.7 + lit * 1.4;
  float hatch = stroke(fract(y) - 0.5, 0.02 + 0.12 * tone);
  // Les hachures se coupent en tirets, comme un burin qui se lève.
  hatch *= step(0.55 - tone * 0.4, noise(vec2(dot(vXZ, dir) * 2.5, floor(y) * 3.1)));
  // Au loin (perspective), on fond les traits en un ton moyen.
  float far = smoothstep(0.25, 0.6, fwidth(y));
  hatch = mix(hatch, 0.05 + tone * 0.15, far);
  hatch *= 1.0 - fade * 0.85;

  float inked = max(lines, hatch * 0.75);
  vec3 lineCol = mix(ink, lamp * 0.6 + ink * 0.3, clamp(lit * 1.8, 0.0, 1.0));
  col = mix(col, lineCol, inked);
  col += lamp * 0.02;
  gl_FragColor = finish(col);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------- Abysse ----------
const abysse = /* glsl */ `
float caustic(vec2 p) {
  vec2 w = p + vec2(fbm(p * 0.8 + uTime * 0.12), fbm(p * 0.8 - uTime * 0.1)) * 1.4;
  float n = fbm(w * 1.6);
  return pow(1.0 - abs(sin(n * 18.0)), 10.0);
}
void main() {
  vec4 f = fieldAt(vXZ);
  float dist = f.b * ${FAR.toFixed(1)};
  vec3 V = viewDir();

  // Profondeur devinée : faible sur les hauts-fonds et les cases englouties.
  float depth = mix(3.5, 0.3 + dist * 0.7, f.r);
  depth = mix(depth, 0.25, f.g);
  // Le fond est vu à travers l'eau : décalé selon l'angle de vue.
  vec2 bed = vXZ - V.xz / max(V.y, 0.25) * depth * 0.6;
  vec4 fb = fieldAt(bed);
  float rock = fbm(bed * 1.4);
  vec3 bedCol = mix(vec3(0.008, 0.022, 0.02), vec3(0.03, 0.06, 0.05), rock);
  // Ruines englouties : dalles de pierre aux joints visibles.
  vec2 cell = fract(bed + 0.5) - 0.5;
  float joint = stroke(max(abs(cell.x), abs(cell.y)) - 0.46, 0.03) + stroke(abs(cell.x) - 0.15, 0.012) * step(abs(cell.y), 0.46) * 0.6;
  vec3 stone = mix(vec3(0.07, 0.1, 0.09), vec3(0.012, 0.02, 0.02), clamp(joint, 0.0, 1.0));
  bedCol = mix(bedCol, stone, fb.g);
  bedCol += vec3(0.07, 0.16, 0.14) * caustic(bed) * (0.5 + f.g * 0.5);
  bedCol += lanterns(bed, 1.2) * 0.12;

  // L'eau absorbe : turquoise sur les hauts-fonds, nuit noire au large.
  float absorb = exp(-depth * 1.1);
  vec3 deep = vec3(0.001, 0.003, 0.005);
  vec3 col = mix(deep, bedCol, absorb);
  col = mix(col, vec3(0.004, 0.016, 0.018), (1.0 - absorb) * f.r * 0.5);

  // Surface : reflet du ciel en incidence rasante et étincelles de lune.
  vec2 g = vec2(fbm(vXZ * 2.5 + uTime * 0.2), fbm(vXZ * 2.5 - uTime * 0.17 + 3.0)) - 0.5;
  vec3 N = normalize(vec3(g.x * 0.5, 1.0, g.y * 0.5));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col = mix(col, vec3(0.01, 0.02, 0.024), fres * 0.7);
  col += vec3(0.5, 0.65, 0.62) * pow(max(dot(reflect(-V, N), normalize(uMoon)), 0.0), 400.0) * 0.25;
  col += lanterns(vXZ, 0.9) * 0.08;

  // Lueurs vivantes : du plancton qui dérive et palpite.
  vec2 q = vXZ * 2.2 + vec2(uTime * 0.04, -uTime * 0.03);
  vec2 c = floor(q);
  vec2 o = vec2(hash(c), hash(c + 5.3));
  float d = length(fract(q) - o);
  float pulse = pow(0.5 + 0.5 * sin(uTime * (0.6 + hash(c + 2.0)) + hash(c) * 30.0), 6.0);
  float alive = step(0.82, hash(c + 9.1)) * smoothstep(0.07, 0.0, d) * pulse;
  col += vec3(0.25, 0.8, 0.65) * alive * (0.5 + (1.0 - smoothstep(0.0, 2.0, dist)) * 1.0);

  // Ressac lumineux au pied des falaises.
  float surf = stroke(dist - 0.05 - (noise(vXZ * 5.0 + uTime) - 0.5) * 0.04, 0.02);
  float pulseOut = stroke(fract(dist * 0.9 - uTime * 0.15) - 0.5, 0.015) * (1.0 - smoothstep(0.1, 1.0, dist));
  col += vec3(0.08, 0.2, 0.17) * (surf * 0.6 + pulseOut * 0.3);
  gl_FragColor = finish(col);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------- Aplats (l'ancienne mer) ----------
const aplats = /* glsl */ `
void main() {
  vec4 field = fieldAt(vXZ);
  float shallow = field.r;
  float dist = field.b * ${FAR.toFixed(1)};
  // Palette d'origine, donnée en sRGB.
  vec3 uDeep = pow(vec3(0.0196, 0.0353, 0.0431), vec3(2.2));
  vec3 uMid = pow(vec3(0.0431, 0.0941, 0.1059), vec3(2.2));
  vec3 uShallow = pow(vec3(0.0745, 0.1647, 0.1647), vec3(2.2));
  vec3 uFoam = pow(vec3(0.49, 0.62, 0.596), vec3(2.2));
  vec3 uRipple = pow(vec3(0.157, 0.278, 0.267), vec3(2.2));

  float aa = fwidth(shallow) * 1.5;
  vec3 col = mix(uDeep, uMid, smoothstep(0.3 - aa, 0.3 + aa, shallow));
  col = mix(col, uShallow, smoothstep(0.68 - aa, 0.68 + aa, shallow));
  col *= 0.94 + 0.06 * noise(vXZ * 0.4 + uTime * 0.02);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    float d = length(vXZ - uLightPos[i].xz);
    float k = smoothstep(1.1, 0.0, d);
    col += uLightCol[i] * k * k * 0.16;
  }
  float nearLand = 1.0 - step(1.45, dist);
  float wob = (noise(vXZ * 5.0 + uTime * 0.4) - 0.5) * 0.03;
  float hug = (1.0 - smoothstep(0.045, 0.045 + fwidth(dist) * 1.5, dist + wob)) * nearLand;
  float r1 = 0.2 + 0.06 * sin(uTime * 0.9 + noise(vXZ * 0.7) * 2.5);
  float line1 = stroke(dist - r1, 0.012) * step(0.32, noise(vXZ * 2.4 + uTime * 0.12)) * nearLand;
  float r2 = 0.46 + 0.07 * sin(uTime * 0.9 + 1.8 + noise(vXZ * 0.6) * 2.0);
  float line2 = stroke(dist - r2, 0.009) * step(0.5, noise(vXZ * 1.8 - uTime * 0.1)) * nearLand * 0.55;
  vec2 g = vXZ * 1.1;
  vec2 cell = floor(g);
  float h = hash(cell);
  vec2 c = (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.45;
  vec2 q = fract(g) - 0.5 - c;
  float along = dot(q, vec2(0.7071, -0.7071));
  float across = dot(q, vec2(0.7071, 0.7071)) + along * along * 1.6;
  float ripple = stroke(across, 0.012) * (1.0 - smoothstep(0.11, 0.15, abs(along)));
  ripple *= smoothstep(0.25, 0.85, sin(uTime * 0.6 + h * 6.2832)) * step(0.4, h);
  ripple *= smoothstep(0.35, 0.9, dist / 1.5) + (1.0 - nearLand);
  col = mix(col, uRipple, ripple * 0.7);
  col = mix(col, uFoam, max(hug, max(line1 * 0.75, line2)));
  gl_FragColor = finish(col);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SHADERS = { huile, gravure, abysse, aplats };

// `planeSize` étend la mer au-delà du champ côtier (jusqu'à l'horizon) ;
// `fade` la fait disparaître dans la nuit entre deux distances.
export function createWater(size, { planeSize, fade = null, style = DEFAULT_WATER } = {}) {
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
    uMoon: { value: new THREE.Vector3(-8, 14, -5).normalize() },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    uLightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
    uFade: { value: new THREE.Color(fade?.color ?? '#000000') },
    uFadeRange: { value: new THREE.Vector2(fade?.near ?? 1e5, fade?.far ?? 2e5) },
  };
  // Couleurs exactes de la palette : pas de compression des tons.
  const makeMaterial = (s) => new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: common + (SHADERS[s] ?? SHADERS[DEFAULT_WATER]),
    toneMapped: false,
  });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(planeSize ?? width, planeSize ?? width, 1, 1).rotateX(-Math.PI / 2), makeMaterial(style));
  sea.position.set(center, WATER_LEVEL, center);
  sea.userData.style = SHADERS[style] ? style : DEFAULT_WATER;

  sea.userData.setStyle = (s) => {
    if (!SHADERS[s] || s === sea.userData.style) return;
    sea.material.dispose();
    sea.material = makeMaterial(s);
    sea.userData.style = s;
  };

  // Direction de la lune (vers le ciel), pour les reflets.
  sea.userData.setMoon = (dir) => uniforms.uMoon.value.copy(dir).normalize();

  // Champ côtier : R = hauts-fonds, G = case engloutie, B = distance à la
  // terre. `kind(x, y)` renvoie 'land', 'sunken', 'shallow' ou 'deep'.
  sea.userData.recolor = (kind) => {
    const kinds = new Map();
    const at = (x, y) => {
      const k = `${x},${y}`;
      if (!kinds.has(k)) kinds.set(k, x >= 0 && y >= 0 && x < size && y < size ? kind(x, y) : 'deep');
      return kinds.get(k);
    };
    const reach = Math.ceil(FAR) + 1;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const wx = x0 + (i + 0.5) / RES;
        const wz = x0 + (j + 0.5) / RES;
        const cx = Math.round(wx);
        const cz = Math.round(wz);
        let dLand = FAR;
        let dShallow = 9;
        let dSunken = 9;
        for (let dz = -reach; dz <= reach; dz++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const k = at(cx + dx, cz + dz);
            if (k === 'deep') continue;
            // Distance à un carré d'une case, coins arrondis.
            const ex = Math.max(0, Math.abs(wx - (cx + dx)) - 0.5);
            const ez = Math.max(0, Math.abs(wz - (cz + dz)) - 0.5);
            const d = Math.hypot(ex, ez);
            if (k === 'land') dLand = Math.min(dLand, d);
            if (k === 'sunken') dSunken = Math.min(dSunken, d);
            dShallow = Math.min(dShallow, d);
          }
        }
        const o = (j * n + i) * 4;
        data[o] = 255 * Math.max(0, Math.min(1, 1 - dShallow / 1.1));
        data[o + 1] = 255 * Math.max(0, 1 - dSunken / 0.12);
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
