// Scène 3D du menu de départ : une île de basalte coiffée d'un phare dont le
// faisceau balaie l'horizon, une chapelle et un village éclairés, la lune,
// des nappes de brume et une barque qui passe. Caméra en perspective,
// cadrée pour que l'île reste à droite et laisse la place au menu.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as M from './models.js';
import * as B from './buildings.js';
import * as U from './units.js';
import { createWater } from './water.js';

const SIZE = 40;
const AMBER = '#E8A33D';
const LIGHT = '#F5C26B';
const HORIZON = '#0b191b';
const ZENITH = '#020507';

// Relief de l'île : hauteur (en blocs empilés) de chaque case.
const ISLAND = [
  '...1121...',
  '..123321..',
  '.12344321.',
  '1234443211',
  '.1233332..',
  '..12221...',
  '...111....',
];
const ORIGIN = { x: 11, z: 4 };
const BASE_CAMERA = new THREE.Vector3(1.5, 3.4, 24);

// ---------- Ciel ----------

function skyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uHorizon: { value: new THREE.Color(HORIZON) }, uZenith: { value: new THREE.Color(ZENITH) } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uHorizon; uniform vec3 uZenith; varying vec3 vDir;
      void main() { float k = smoothstep(-0.02, 0.45, vDir.y); gl_FragColor = vec4(mix(uHorizon, uZenith, k), 1.0);
      #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), material);
}

// La lune : disque peint (cratères, assombrissement du bord) et halo doux.
function moonSprites() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const disc = g.createRadialGradient(230, 220, 20, 256, 256, 200);
  disc.addColorStop(0, '#fbfcf8');
  disc.addColorStop(0.7, '#dfe7e3');
  disc.addColorStop(1, '#b9c7c3');
  g.fillStyle = disc;
  g.beginPath();
  g.arc(256, 256, 200, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  // Mers lunaires et cratères.
  for (const [x, y, r, a] of [[200, 190, 70, 0.16], [300, 280, 90, 0.13], [210, 320, 50, 0.12], [330, 170, 40, 0.1], [150, 270, 30, 0.1]]) {
    g.fillStyle = `rgba(110, 130, 128, ${a})`;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.8, 0.4, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = 90 + Math.random() * 330;
    const y = 90 + Math.random() * 330;
    const r = 4 + Math.random() * 14;
    g.strokeStyle = 'rgba(90, 110, 108, 0.25)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255, 255, 255, 0.12)';
    g.beginPath();
    g.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  const limb = g.createRadialGradient(256, 256, 120, 256, 256, 205);
  limb.addColorStop(0, 'rgba(20, 40, 45, 0)');
  limb.addColorStop(1, 'rgba(20, 40, 45, 0.45)');
  g.fillStyle = limb;
  g.fillRect(0, 0, 512, 512);
  g.restore();
  // Couleur légèrement voilée : la lune reste lisible sous le halo lumineux.
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: '#a9b8b4', fog: false, depthWrite: false, toneMapped: false }));
  moon.material.map.colorSpace = THREE.SRGBColorSpace;

  const h = document.createElement('canvas');
  h.width = h.height = 256;
  const hg = h.getContext('2d');
  const glow = hg.createRadialGradient(128, 128, 20, 128, 128, 128);
  glow.addColorStop(0, 'rgba(190, 215, 212, 0.35)');
  glow.addColorStop(0.3, 'rgba(150, 185, 182, 0.08)');
  glow.addColorStop(1, 'rgba(150, 185, 182, 0)');
  hg.fillStyle = glow;
  hg.fillRect(0, 0, 256, 256);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(h), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  }));
  return { moon, halo };
}

// ---------- Brume ----------
// Bruit partagé par les shaders de brume.
const FOG_NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
`;

// Rideau de brume vertical tourné vers la caméra : empilés à différentes
// profondeurs, ils forment des bancs qui roulent et se décalent en
// parallaxe quand la caméra dérive.
function fogSheet(width, height, opacity, seed, speed = 1) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: opacity }, uSeed: { value: seed }, uSpeed: { value: speed },
      uAspect: { value: width / height },
      uColor: { value: new THREE.Color('#1b2b2c') }, uTop: { value: new THREE.Color('#566c69') },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uOpacity; uniform float uSeed; uniform float uSpeed; uniform float uAspect; uniform vec3 uColor; uniform vec3 uTop;
      varying vec2 vUv; varying vec3 vWorld;
      ${FOG_NOISE}
      void main() {
        float t = uTime * uSpeed;
        vec2 p = vec2(vUv.x * uAspect * 0.9 + t * 0.05 + uSeed, vUv.y * 1.6 - t * 0.02);
        float n = fbm(p + vec2(fbm(p * 1.4 + t * 0.03), fbm(p * 1.1 - t * 0.02)) * 0.9);
        // Crête bouillonnante ; la brume s'épaissit vers l'eau.
        float crest = 0.25 + n * 0.85;
        float a = 1.0 - smoothstep(crest - 0.45, crest, vUv.y);
        a *= smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        // Le pied du rideau se fond dans l'eau : pas d'arête là où il la coupe.
        a *= smoothstep(0.0, 0.3, vUv.y);
        a *= (0.55 + 0.45 * n) * uOpacity;
        // Volutes éclairées par la lune, du côté droit.
        vec3 col = mix(uColor, uTop, smoothstep(0.45, 0.9, n) * (0.35 + 0.65 * vUv.y) * (0.5 + 0.5 * vUv.x));
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.renderOrder = 4;
  return mesh;
}

// Banc de brume sur l'horizon : un rideau cylindrique dont le bord
// supérieur bouillonne, plus dense au ras de l'eau.
function fogBank(radius, height, opacity, seed) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: opacity }, uSeed: { value: seed }, uHeight: { value: height },
      uColor: { value: new THREE.Color('#1a2a2b') }, uTop: { value: new THREE.Color('#40524f') },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uOpacity; uniform float uSeed; uniform float uHeight; uniform vec3 uColor; uniform vec3 uTop;
      varying vec2 vUv; varying vec3 vWorld;
      ${FOG_NOISE}
      void main() {
        float h = clamp(vWorld.y / uHeight, 0.0, 1.0);
        vec2 p = vec2(vUv.x * 46.0 + uTime * 0.04 + uSeed, h * 2.2 - uTime * 0.015);
        float n = fbm(p + vec2(fbm(p * 1.3 + uTime * 0.02), 0.0));
        // La crête du banc ondule ; dessous, la brume est presque pleine.
        float crest = 0.35 + n * 0.75;
        float a = (1.0 - smoothstep(crest - 0.35, crest, h)) * uOpacity;
        a *= 0.75 + 0.25 * n;
        a *= smoothstep(-0.4, 1.2, vWorld.y);
        vec3 col = mix(uColor, uTop, smoothstep(0.1, 0.9, h) * n);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 96, 1, true), material);
  mesh.position.set(14, height / 2 - 0.4, 6);
  mesh.renderOrder = 2;
  return mesh;
}

export function createMenuScene(canvas, { water } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HORIZON, 34, 95);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  scene.add(skyDome());

  // Étoiles, plus nombreuses vers le zénith.
  const starPos = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = 0.06 + Math.pow(Math.random(), 0.7) * 0.9;
    starPos.push(Math.cos(a) * Math.cos(up) * 170, Math.sin(up) * 170, Math.sin(a) * Math.cos(up) * 170);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starField = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#CFE3DC', size: 0.55, fog: false, transparent: true, opacity: 0.75, sizeAttenuation: true }));
  scene.add(starField);
  const { moon: moonDisc, halo } = moonSprites();
  scene.add(halo, moonDisc);

  scene.add(new THREE.HemisphereLight('#557a82', '#05090a', 0.95));
  const moonLight = new THREE.DirectionalLight('#b4d2d8', 2.4);
  moonLight.position.set(0, 14, 26);
  moonLight.target.position.set(15, 2, 8);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
  moonLight.shadow.bias = -0.0008;
  scene.add(moonLight, moonLight.target);

  // Relief de l'île.
  const heights = new Map();
  ISLAND.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') heights.set(`${ORIGIN.x + i},${ORIGIN.z + j}`, Number(ch));
  }));
  heights.set('5,5', 1);
  heights.set('6,5', 1);
  heights.set('5,6', 1);

  // La même mer stylisée que dans le jeu, jusqu'à l'horizon.
  const sea = createWater(SIZE, { planeSize: 600, style: water });
  sea.userData.recolor((x, y) => {
    if (heights.has(`${x},${y}`)) return 'land';
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (heights.has(`${x + dx},${y + dz}`)) return 'shallow';
    return 'deep';
  });
  scene.add(sea);

  // Falaise : des blocs de basalte empilés qui se rétrécissent en montant.
  const BLOCK = M.LAND_TOP + 0.5;
  const topOf = (x, z) => (heights.get(`${x},${z}`) - 1) * BLOCK + M.LAND_TOP;
  let summit = { h: 0 };
  for (const [key, h] of heights) {
    const [x, z] = key.split(',').map(Number);
    const centre = Math.abs(x - 15) + Math.abs(z - 7);
    if (h > summit.h || (h === summit.h && centre < summit.centre)) summit = { x, z, h, centre };
  }
  // Emplacements réservés aux bâtiments.
  const chapelAt = { x: 14, z: 5 };
  const keeperAt = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dz]) => ({ x: summit.x + dx, z: summit.z + dz }))
    .find((p) => heights.get(`${p.x},${p.z}`) === summit.h);
  const reserved = new Set([`${chapelAt.x},${chapelAt.z}`, `${summit.x},${summit.z}`, keeperAt && `${keeperAt.x},${keeperAt.z}`]);

  let seed = 11;
  for (const [key, h] of heights) {
    const [x, z] = key.split(',').map(Number);
    for (let k = 0; k < h; k++) {
      const block = M.landBlock(seed++);
      const shrink = 1.06 - k * 0.07;
      block.scale.set(shrink, 1, shrink);
      block.position.set(x + Math.sin(seed * 1.7) * 0.06, k * BLOCK, z + Math.cos(seed * 2.3) * 0.06);
      block.rotation.y = Math.sin(seed * 3.1) * 0.06;
      scene.add(block);
    }
    if (reserved.has(key)) continue;
    const top = (h - 1) * BLOCK;
    if (h >= 2 && h < 4 && seed % 2 === 0) {
      const f = M.falaise(seed);
      f.position.set(x, top, z);
      scene.add(f);
    } else if (h === 1 && seed % 3 === 1) {
      const m = M.mangrove(seed);
      m.position.set(x, top, z);
      scene.add(m);
    } else if (seed % 5 === 0) {
      const prop = B.landProp(seed);
      if (prop) {
        prop.position.set(x, top, z);
        scene.add(prop);
      }
    }
  }

  // Phare au sommet, chapelle sur la pente, maison du gardien à côté du phare.
  const lighthouse = M.tower(LIGHT);
  lighthouse.scale.setScalar(2.4);
  lighthouse.position.set(summit.x, topOf(summit.x, summit.z), summit.z);
  scene.add(lighthouse);
  const chapel = B.chapel(LIGHT, 5);
  chapel.scale.setScalar(1.6);
  chapel.rotation.y = Math.PI * 0.75;
  chapel.position.set(chapelAt.x, topOf(chapelAt.x, chapelAt.z), chapelAt.z);
  scene.add(chapel);
  if (keeperAt) {
    const keeper = B.tallHouse(AMBER, 9);
    keeper.scale.setScalar(1.7);
    keeper.position.set(keeperAt.x, topOf(keeperAt.x, keeperAt.z), keeperAt.z);
    scene.add(keeper);
    const lamp = B.lampPost(LIGHT);
    lamp.scale.setScalar(1.6);
    lamp.position.set((keeperAt.x + summit.x) / 2 + 0.3, topOf(keeperAt.x, keeperAt.z), (keeperAt.z + summit.z) / 2 + 0.3);
    scene.add(lamp);
  }
  const chapelLight = new THREE.PointLight(LIGHT, 2.5, 4, 1.8);
  chapelLight.position.set(chapelAt.x, topOf(chapelAt.x, chapelAt.z) + 0.5, chapelAt.z + 0.6);
  scene.add(chapelLight);

  scene.traverse((o) => {
    if (o.isMesh && !o.material.transparent) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // Faisceau du phare : il balaie l'horizon, jamais vers le spectateur.
  const lampY = topOf(summit.x, summit.z) + 0.77 * 2.4;
  const beamGeo = new THREE.ConeGeometry(4.5, 40, 32, 1, true);
  beamGeo.translate(0, -20, 0);
  beamGeo.rotateZ(Math.PI / 2);
  // Le faisceau s'estompe vers son extrémité et sur ses bords : vu de
  // face ou de dos, il ne forme pas de disque, seulement une lueur.
  const beamMat = (opacity) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(LIGHT) }, uOpacity: { value: opacity } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { float a = pow(vUv.y, 0.9) * uOpacity * pow(abs(dot(vN, vV)), 1.1); gl_FragColor = vec4(uColor * a, a);
      #include <colorspace_fragment>
      }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat(0.45));
  beam.position.set(summit.x, lampY, summit.z);
  scene.add(beam);
  const beamCore = new THREE.Mesh(beamGeo, beamMat(0.5));
  beamCore.scale.set(1, 0.35, 0.35);
  beam.add(beamCore);
  const away = Math.atan2(-(summit.z - BASE_CAMERA.z), summit.x - BASE_CAMERA.x);

  // Village au pied de la falaise et hameau sur l'îlot.
  const village = B.city({ level: 4, color: AMBER, light: LIGHT, seed: 3 });
  village.position.set(ORIGIN.x + 2, 0, ORIGIN.z + 6);
  scene.add(village);
  const hamlet = B.city({ level: 2, color: AMBER, light: LIGHT, seed: 8 });
  hamlet.position.set(5, 0, 5);
  scene.add(hamlet);

  // Une barque qui traverse la baie.
  const boat = M.bake(U.vessel('barque', AMBER, 4));
  for (const e of boat.userData.emitters) {
    const l = new THREE.PointLight(e.color, e.intensity * 1.4, e.distance * 1.5, 1.8);
    l.position.copy(e.local);
    boat.add(l);
  }
  boat.scale.setScalar(1.6);
  scene.add(boat);

  // Brume : deux bancs sur l'horizon, deux nappes au ras de l'eau.
  // Brume : un banc sur l'horizon et des rideaux à plusieurs profondeurs.
  const sheets = [
    // [x, z, largeur, hauteur, opacité, graine, vitesse]
    [10, -30, 140, 12, 0.8, 3.1, 0.6],
    [12, -8, 90, 6.5, 0.6, 8.4, 0.8],
    [16, 2.5, 60, 3.2, 0.5, 1.7, 1],
    [6, 13.5, 50, 1.8, 0.42, 5.2, 1.3],
  ].map(([x, z, w, h, o, seed, speed]) => {
    const m = fogSheet(w, h, o, seed, speed);
    m.position.set(x, h / 2 + M.WATER_LEVEL, z);
    m.lookAt(BASE_CAMERA.x, h / 2 + M.WATER_LEVEL, BASE_CAMERA.z);
    return m;
  });
  const mists = [fogBank(80, 16, 0.85, 0), ...sheets];
  scene.add(...mists);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Cadrage : on vise à gauche de l'île pour qu'elle se place dans le tiers
  // droit de l'écran ; sur un écran étroit, on la recentre et on recule.
  const centre = new THREE.Vector3(15, 2.6, 7.5);
  const view = { target: new THREE.Vector3(), back: 0, shift: 0 };
  function frameView(camPos) {
    const toCentre = centre.clone().sub(camPos).normalize();
    const right = new THREE.Vector3().crossVectors(toCentre, camera.up).normalize();
    const dist = centre.distanceTo(camPos);
    const halfW = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    view.target.copy(centre).addScaledVector(right, -halfW * view.shift);
    // En portrait, on vise sous l'île pour qu'elle remonte dans le cadre.
    if (view.lift) {
      const up = new THREE.Vector3().crossVectors(right, toCentre).normalize();
      view.target.addScaledVector(up, -dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * view.lift);
    }
    return { right };
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.back = camera.aspect < 1.2 ? 10 : 0;
    view.shift = camera.aspect < 1.2 ? 0 : 0.56; // laisse la place à la colonne de menu
    view.lift = camera.aspect < 0.8 ? 0.42 : 0;
    // La lune se place en haut à droite du cadre.
    const camPos = BASE_CAMERA.clone().add(new THREE.Vector3(0, view.back * 0.2, view.back));
    const { right } = frameView(camPos);
    const d = 150;
    const halfW = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const lookDir = view.target.clone().sub(camPos).normalize();
    const up = new THREE.Vector3().crossVectors(right, lookDir).normalize();
    const pos = camPos.clone().addScaledVector(lookDir, d).addScaledVector(right, halfW * 0.62).addScaledVector(up, halfH * 0.58);
    moonDisc.position.copy(pos);
    halo.position.copy(pos);
    sea.userData.setMoon(pos.clone().sub(centre));
    moonDisc.scale.setScalar(16);
    halo.scale.setScalar(48);
  }
  window.addEventListener('resize', resize);
  resize();

  let running = true;
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    camera.position.set(
      BASE_CAMERA.x + Math.sin(t * 0.05) * 1.2,
      BASE_CAMERA.y + Math.sin(t * 0.07) * 0.25 + view.back * 0.2,
      BASE_CAMERA.z + view.back + Math.cos(t * 0.04) * 0.8,
    );
    frameView(camera.position);
    camera.lookAt(view.target);
    sea.userData.update(t);
    beam.rotation.y = away + Math.sin(t * 0.28) * 1.35;
    const p = (t * 0.018) % 1;
    boat.position.set(-2 + p * 26, M.WATER_LEVEL - 0.02 + Math.sin(t * 1.3) * 0.03, 17.5 - Math.sin(p * Math.PI) * 2);
    boat.rotation.y = 0.12 * Math.sin(p * Math.PI * 2);
    boat.rotation.z = Math.sin(t * 1.1) * 0.05;
    U.animateParts(boat, t);
    for (const m of mists) m.material.uniforms.uTime.value = t;
    starField.material.opacity = 0.65 + Math.sin(t * 0.7) * 0.08;
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      scene.traverse((o) => o.geometry?.dispose());
      renderer.dispose();
    },
  };
}
