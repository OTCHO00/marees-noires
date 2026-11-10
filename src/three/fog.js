// Brume de guerre : deux voiles de brume animés (shader) posés sur la carte.
// Une petite texture de visibilité (une valeur par case) décide où la brume
// se lève ; ses bords sont déformés par du bruit pour rester organiques, et
// la lisière s'éclaire à l'approche des lanternes.
import * as THREE from 'three';

const PAD = 7; // cases de brume au-delà du bord de la carte
const MAX_LIGHTS = 14;

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uVis;
  uniform float uTime;
  uniform float uLayer;
  uniform float uGrid;
  uniform vec3 uLightPos[${MAX_LIGHTS}];
  uniform vec3 uLightCol[${MAX_LIGHTS}];
  varying vec2 vUv;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }

  void main() {
    float t = uTime;
    vec2 p = vWorld.xz;

    // Nappes de brume qui dérivent lentement, repliées sur elles-mêmes.
    vec2 drift = vec2(t * 0.035, t * 0.022) * (1.0 + uLayer * 1.6);
    vec2 q = vec2(fbm(p * 0.33 + drift), fbm(p * 0.33 - drift + 5.2));
    float n = fbm(p * 0.45 + q * 1.8 + drift);

    // Visibilité lue avec un décalage bruité : bords en volutes.
    vec2 warp = (vec2(fbm(p * 0.9 + t * 0.06), fbm(p * 0.9 + 9.3 - t * 0.05)) - 0.5) * (1.1 / uGrid);
    float hidden = 1.0 - texture2D(uVis, vUv + warp).r;

    vec3 deep = vec3(0.016, 0.034, 0.038);
    vec3 pale = vec3(0.21, 0.29, 0.285);

    // Lueur des lanternes voisines sur la brume.
    vec3 glow = vec3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      vec2 d = p - uLightPos[i].xz;
      glow += uLightCol[i] * exp(-dot(d, d) * 0.32);
    }

    vec3 col;
    float alpha;
    if (uLayer < 0.5) {
      // Voile bas : couvre tout l'inconnu, plus clair en lisière.
      float edge = smoothstep(0.12, 0.85, hidden + (n - 0.5) * 0.6);
      float rim = smoothstep(0.0, 0.6, edge) * (1.0 - smoothstep(0.45, 1.0, edge));
      float body = smoothstep(0.4, 0.95, n);
      col = mix(deep, pale, body * 0.45 + rim * 0.22);
      col += glow * (rim * 0.5 + body * 0.05) * 0.6;
      alpha = edge * mix(0.88, 1.0, body);
    } else {
      // Voile haut : quelques filaments qui flottent au-dessus de la lisière.
      float wisp = smoothstep(0.52, 0.86, n);
      float near = smoothstep(0.08, 0.55, hidden) * (1.0 - smoothstep(0.85, 1.0, hidden) * 0.55);
      col = pale * 0.9 + glow * 0.35;
      alpha = wisp * near * 0.3;
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createFog(size) {
  const N = size + PAD * 2;
  const data = new Uint8Array(N * N * 4);
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const current = new Float32Array(N * N);
  const target = new Float32Array(N * N);
  let first = true;

  const uniforms = {
    uVis: { value: tex },
    uTime: { value: 0 },
    uGrid: { value: N },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
    uLightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
  };

  const group = new THREE.Group();
  const center = (size - 1) / 2;
  [
    { layer: 0, y: 0.55 },
    { layer: 1, y: 1.05 },
  ].forEach(({ layer, y }) => {
    const geo = new THREE.PlaneGeometry(N, N);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uLayer: { value: layer } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(center, y, center);
    m.renderOrder = 10 + layer;
    group.add(m);
  });

  const write = () => {
    for (let i = 0; i < N * N; i++) {
      const v = Math.round(current[i] * 255);
      data[i * 4] = v;
      data[i * 4 + 3] = 255;
    }
    tex.needsUpdate = true;
  };

  // Le plan va de -PAD-0.5 à size+PAD-0.5 : chaque texel couvre une case.
  // La texture est retournée en V par rapport au monde (uv.y = 1 en z bas).
  group.userData.setVisibility = (isVisible) => {
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const x = gx - PAD;
        const z = gy - PAD;
        const inside = x >= 0 && z >= 0 && x < size && z < size;
        target[(N - 1 - gy) * N + gx] = inside && isVisible(x, z) ? 1 : 0;
      }
    }
    if (first) {
      current.set(target);
      first = false;
      write();
    }
  };

  // La brume se retire en douceur sur les cases découvertes.
  group.userData.update = (t, dt = 1 / 60) => {
    uniforms.uTime.value = t;
    const k = Math.min(1, dt * 1.8);
    let changed = false;
    for (let i = 0; i < N * N; i++) {
      const d = target[i] - current[i];
      if (Math.abs(d) > 0.002) {
        current[i] += d * k;
        changed = true;
      } else if (d !== 0) {
        current[i] = target[i];
        changed = true;
      }
    }
    if (changed) write();
  };

  group.userData.setLights = (lights) => {
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = lights[i];
      if (l && l.intensity > 0) {
        uniforms.uLightPos.value[i].copy(l.position);
        uniforms.uLightCol.value[i].copy(l.color).multiplyScalar(Math.min(1.2, l.intensity) * 0.5);
      } else {
        uniforms.uLightCol.value[i].setRGB(0, 0, 0);
      }
    }
  };

  group.userData.dispose = () => {
    tex.dispose();
    group.children.forEach((m) => {
      m.geometry.dispose();
      m.material.dispose();
    });
  };
  return group;
}
