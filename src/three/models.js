// Modèles 3D low-poly générés en code : blocs de basalte, mangroves,
// falaises, maisons, tours, sanctuaires, fidèles et navires.
// Une case mesure 1 × 1 ; le dessus d'un bloc de terre est à LAND_TOP.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LAND_TOP = 0.42;
export const WATER_LEVEL = 0.06;

// ---------- Outils ----------

// Mélange deux couleurs (t = part de b).
export function mix(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true, ...opts }));
  }
  return mats.get(key);
}

export function glowMat(color, intensity = 3) {
  return mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
}

// Déforme une géométrie de façon stable : deux sommets à la même position
// bougent ensemble, donc les faces restent soudées.
function jitter(geo, amount, seed = 1, axes = [1, 1, 1]) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.3) * 43758.5453;
    const n = (k) => (Math.sin(h * (k + 1)) * 0.5) * amount;
    pos.setXYZ(i, x + n(1) * axes[0], y + n(2) * axes[1], z + n(3) * axes[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function tube(points, radius, color, segments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, segments, radius, 5, false), mat(color));
}

const C = {
  basalt: '#232c2a',
  basaltDark: '#161d1c',
  basaltLedge: '#2c3734',
  top: '#2c3a35',
  moss: '#33463c',
  pebble: '#3a4643',
  wood: '#2a1d14',
  woodDark: '#1a120c',
  stone: '#3b403c',
  stoneDark: '#2a2e2b',
  slate: '#1c2426',
  plaster: '#4a4a42',
  dead: '#161b19',
  sail: '#56645f',
  iron: '#2b2f31',
  robe: '#0d1110',
};

// ---------- Terrain ----------

// Bloc de basalte : noyau, corniches de roche, éclats sur les flancs,
// dessus irrégulier avec mousse et cailloux.
export function landBlock(seed, { sink = 0 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const depth = LAND_TOP + 0.5;
  const core = jitter(new THREE.BoxGeometry(0.98, depth, 0.98, 2, 3, 2), 0.035, seed);
  g.add(mesh(core, mat(C.basalt), 0, LAND_TOP - depth / 2 - 0.01, 0));
  // Strates : des corniches qui débordent légèrement.
  for (let i = 0; i < 2; i++) {
    const h = 0.05 + r() * 0.04;
    const y = 0.06 + i * 0.16 + r() * 0.05;
    const ledge = jitter(new THREE.BoxGeometry(1.0 + r() * 0.03, h, 1.0 + r() * 0.03, 3, 1, 3), 0.03, seed + i * 7);
    g.add(mesh(ledge, mat(i % 2 ? C.basaltLedge : C.basaltDark), (r() - 0.5) * 0.02, y, (r() - 0.5) * 0.02));
  }
  // Éclats de roche collés aux flancs.
  for (let i = 0; i < 5; i++) {
    const side = Math.floor(r() * 4);
    const along = (r() - 0.5) * 0.8;
    const y = 0.04 + r() * (LAND_TOP - 0.1);
    const s = 0.05 + r() * 0.06;
    const chip = jitter(new THREE.DodecahedronGeometry(s, 0), s * 0.4, seed + i);
    const px = side === 0 ? 0.5 : side === 1 ? -0.5 : along;
    const pz = side === 2 ? 0.5 : side === 3 ? -0.5 : along;
    g.add(mesh(chip, mat(r() > 0.5 ? C.basaltLedge : C.basalt), px, y, pz));
  }
  // Dessus : une dalle irrégulière, tachée de mousse.
  const top = new THREE.PlaneGeometry(0.97, 0.97, 5, 5);
  top.rotateX(-Math.PI / 2);
  jitter(top, 0.05, seed + 3, [0.3, 0.6, 0.3]);
  const colors = [];
  const moss = new THREE.Color(C.moss);
  const rock = new THREE.Color(C.top);
  for (let i = 0; i < top.attributes.position.count; i++) {
    const c = rock.clone().lerp(moss, Math.max(0, Math.sin(i * 1.7 + seed) * 0.8));
    colors.push(c.r, c.g, c.b);
  }
  top.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.add(mesh(top, mat('#ffffff', { vertexColors: true }), 0, LAND_TOP, 0));
  // Cailloux et touffes d'herbe rase.
  for (let i = 0; i < 3; i++) {
    const s = 0.025 + r() * 0.03;
    g.add(mesh(jitter(new THREE.DodecahedronGeometry(s, 0), s * 0.3, seed + 20 + i), mat(C.pebble), (r() - 0.5) * 0.8, LAND_TOP + s * 0.4, (r() - 0.5) * 0.8));
  }
  for (let i = 0; i < 4; i++) {
    const tuft = new THREE.ConeGeometry(0.015, 0.07 + r() * 0.05, 3);
    g.add(mesh(tuft, mat('#3d4f42'), (r() - 0.5) * 0.8, LAND_TOP + 0.03, (r() - 0.5) * 0.8));
  }
  if (sink) g.position.y = -0.14 * sink;
  return g;
}

// Mer : un plan facetté animé, plus clair sur les hauts-fonds.
export function createSea(width, depth, shallowAt) {
  const geo = new THREE.PlaneGeometry(width, depth, width * 2, depth * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3));
  const deep = new THREE.Color('#0b1d21');
  const shallow = new THREE.Color('#1d4440');
  const recolor = (fn) => {
    const col = geo.attributes.color;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(deep).lerp(shallow, fn(base[i * 3], base[i * 3 + 2]));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  };
  recolor(shallowAt);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.28, metalness: 0.25, flatShading: true,
  });
  const sea = new THREE.Mesh(geo, material);
  sea.receiveShadow = true;
  sea.position.y = WATER_LEVEL;
  sea.userData.recolor = recolor;
  sea.userData.update = (t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 1.7 + t * 0.9) * 0.018 + Math.sin(z * 2.3 - t * 0.7) * 0.016 + Math.sin((x + z) * 4.1 + t * 1.6) * 0.006);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return sea;
}

export function mangrove(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const ox = (k ? 0.18 : -0.15) + (r() - 0.5) * 0.1;
    const oz = (k ? -0.12 : 0.14) + (r() - 0.5) * 0.1;
    const h = 0.45 + r() * 0.25;
    const lean = (r() - 0.5) * 0.15;
    g.add(tube([[ox, LAND_TOP, oz], [ox + lean * 0.3, LAND_TOP + h * 0.4, oz], [ox + lean, LAND_TOP + h, oz + lean * 0.5]], 0.032, C.dead));
    // Branches tordues.
    for (let b = 0; b < 5; b++) {
      const a = r() * Math.PI * 2;
      const by = LAND_TOP + h * (0.5 + r() * 0.4);
      const len = 0.12 + r() * 0.12;
      const sx = ox + lean * (by - LAND_TOP) / h;
      g.add(tube([[sx, by, oz], [sx + Math.cos(a) * len * 0.6, by + len * 0.3, oz + Math.sin(a) * len * 0.6], [sx + Math.cos(a) * len, by + len * 0.2 + r() * 0.08, oz + Math.sin(a) * len]], 0.013, C.dead, 6));
    }
    // Racines aériennes.
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + r();
      g.add(tube([[ox, LAND_TOP + 0.12, oz], [ox + Math.cos(a) * 0.08, LAND_TOP + 0.08, oz + Math.sin(a) * 0.08], [ox + Math.cos(a) * 0.13, LAND_TOP - 0.01, oz + Math.sin(a) * 0.13]], 0.008, C.dead, 5));
    }
    // Mousse pendante.
    for (let b = 0; b < 3; b++) {
      const strand = new THREE.CylinderGeometry(0.004, 0.002, 0.08 + r() * 0.08, 3);
      g.add(mesh(strand, mat('#4c5c55'), ox + (r() - 0.5) * 0.2, LAND_TOP + h * 0.7, oz + (r() - 0.5) * 0.2));
    }
  }
  return g;
}

export function falaise(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  // Orgues basaltiques : colonnes hexagonales de hauteurs variées.
  const cols = [[-0.1, 0.06, 0.62], [0.08, 0.1, 0.5], [0.0, -0.1, 0.72], [0.16, -0.12, 0.38], [-0.2, -0.12, 0.42], [-0.14, 0.24, 0.26], [0.22, 0.2, 0.22]];
  for (const [x, z, h] of cols) {
    const hh = h * (0.85 + r() * 0.3);
    const geo = jitter(new THREE.CylinderGeometry(0.075, 0.085, hh, 6, 2), 0.012, seed + x * 10);
    const col = mesh(geo, mat(r() > 0.5 ? C.basaltLedge : C.basalt), x, LAND_TOP + hh / 2 - 0.02, z);
    col.rotation.y = r();
    g.add(col);
  }
  for (let i = 0; i < 4; i++) {
    const s = 0.05 + r() * 0.05;
    g.add(mesh(jitter(new THREE.DodecahedronGeometry(s, 0), s * 0.3, seed + i), mat(C.basaltDark), (r() - 0.5) * 0.7, LAND_TOP + s * 0.5, (r() - 0.5) * 0.7));
  }
  return g;
}

// ---------- Ressources ----------

export function relique(color = '#7FD1B9') {
  const g = new THREE.Group();
  const body = jitter(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 6, 2), 0.01, 4);
  g.add(mesh(body, mat('#0f1413'), 0, LAND_TOP + 0.1, 0));
  const head = jitter(new THREE.SphereGeometry(0.07, 7, 5), 0.012, 5);
  g.add(mesh(head, mat('#0f1413'), 0, LAND_TOP + 0.24, 0));
  for (const dx of [-0.025, 0.025]) g.add(mesh(new THREE.SphereGeometry(0.01, 5, 4), glowMat(color, 4), dx, LAND_TOP + 0.25, 0.062));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI - Math.PI / 2;
    g.add(tube([[Math.sin(a) * 0.04, LAND_TOP + 0.2, Math.cos(a) * 0.05], [Math.sin(a) * 0.05, LAND_TOP + 0.12, Math.cos(a) * 0.07], [Math.sin(a) * 0.04, LAND_TOP + 0.02, Math.cos(a) * 0.08]], 0.008, '#0f1413', 5));
  }
  const light = new THREE.PointLight(color, 0.6, 1.2, 2);
  light.position.set(0, LAND_TOP + 0.3, 0.1);
  g.add(light);
  return g;
}

// ---------- Bâtiments ----------

function gableRoof(w, d, h, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.02, 0);
  shape.lineTo(0, h);
  shape.lineTo(w / 2 + 0.02, 0);
  shape.lineTo(-w / 2 - 0.02, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.04, bevelEnabled: false });
  geo.translate(0, 0, -(d + 0.04) / 2);
  return mesh(geo, mat(color));
}

export function house(light, seed, { w = 0.26, d = 0.22, h = 0.2, lit = true } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  // Soubassement de pierre et murs à colombages sombres.
  g.add(mesh(jitter(new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02), 0.006, seed), mat(C.stoneDark), 0, 0.025, 0));
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(C.plaster), 0, 0.05 + h / 2, 0));
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.018, h, 0.018), mat(C.woodDark), (sx * w) / 2, 0.05 + h / 2, d / 2));
    g.add(mesh(new THREE.BoxGeometry(0.018, h, 0.018), mat(C.woodDark), (sx * w) / 2, 0.05 + h / 2, -d / 2));
  }
  g.add(mesh(new THREE.BoxGeometry(w + 0.01, 0.016, d + 0.01), mat(C.woodDark), 0, 0.05 + h * 0.55, 0));
  const roof = gableRoof(w, d, h * 0.75, C.slate);
  roof.position.y = 0.05 + h;
  g.add(roof);
  // Cheminée.
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.12, 0.045), mat(C.stone), w * 0.25, 0.05 + h + 0.1, d * 0.15));
  // Porte et fenêtres (la lumière du culte).
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.1, 0.01), mat(C.wood), -w * 0.2, 0.1, d / 2 + 0.004));
  const win = lit ? glowMat(light, 2.2) : mat('#0b0f0f');
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.01), win, w * 0.22, 0.05 + h * 0.6, d / 2 + 0.005));
  g.add(mesh(new THREE.BoxGeometry(0.01, 0.05, 0.05), win, w / 2 + 0.005, 0.05 + h * 0.6, 0));
  g.rotation.y = (Math.floor(r() * 4) * Math.PI) / 2;
  return g;
}

export function tower(light) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.16, 0.19, 0.08, 8), 0.01, 3), mat(C.stoneDark), 0, 0.04, 0));
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.11, 0.14, 0.62, 8, 4), 0.008, 2), mat(C.stone), 0, 0.39, 0));
  // Bandeaux de pierre.
  for (const y of [0.25, 0.5]) g.add(mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.025, 8), mat(C.stoneDark), 0, y, 0));
  // Chambre de la lanterne, ouverte.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), mat(C.iron), Math.cos(a) * 0.1, 0.77, Math.sin(a) * 0.1));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 8), mat(C.stoneDark), 0, 0.7, 0));
  g.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), glowMat(light, 4.5), 0, 0.77, 0));
  g.add(mesh(new THREE.ConeGeometry(0.16, 0.34, 8), mat(C.slate), 0, 1.01, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 4), mat(C.iron), 0, 1.24, 0));
  // Fenêtres étroites.
  for (const [y, a] of [[0.36, 0.6], [0.58, 2.4]]) {
    const w = mesh(new THREE.BoxGeometry(0.03, 0.07, 0.02), glowMat(light, 2.5), Math.cos(a) * 0.125, y, Math.sin(a) * 0.125);
    w.rotation.y = -a + Math.PI / 2;
    g.add(w);
  }
  const lamp = new THREE.PointLight(light, 3.2, 3.6, 1.6);
  lamp.position.set(0, 0.8, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.bias = -0.002;
  g.add(lamp);
  return g;
}

const HOUSE_SPOTS = [[-0.24, 0.2], [0.24, 0.22], [0.26, -0.2], [-0.22, -0.22], [0.02, 0.32], [-0.33, 0.0]];

export function city({ level = 1, capital = false, color = '#E8A33D', light = '#F5C26B', seed = 1 } = {}) {
  const g = new THREE.Group();
  const n = Math.min(HOUSE_SPOTS.length, level + 1);
  for (let i = 0; i < n; i++) {
    const [x, z] = HOUSE_SPOTS[i];
    const h = house(i % 3 === 2 ? light : color, seed + i * 11, { w: 0.22 + (i % 2) * 0.05, d: 0.2, h: 0.17 + (i % 3) * 0.03 });
    h.position.set(x, LAND_TOP, z);
    g.add(h);
  }
  if (capital) {
    const t = tower(light);
    t.position.set(0, LAND_TOP, -0.02);
    g.add(t);
  } else {
    // Fanal sur un mât.
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.5, 5), mat(C.wood), 0.02, LAND_TOP + 0.25, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), glowMat(light, 4), 0.02, LAND_TOP + 0.52, 0));
    const lamp = new THREE.PointLight(color, 2, 2.6, 1.8);
    lamp.position.set(0.02, LAND_TOP + 0.55, 0);
    g.add(lamp);
  }
  // Pavés au centre.
  const plaza = jitter(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 7), 0.01, seed);
  g.add(mesh(plaza, mat(C.stoneDark), 0, LAND_TOP + 0.005, 0));
  return g;
}

export function sanctuary() {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.BoxGeometry(0.42, 0.05, 0.3), 0.01, 8), mat(C.stoneDark), 0, LAND_TOP + 0.025, 0));
  for (const x of [-0.14, 0.14]) g.add(mesh(jitter(new THREE.BoxGeometry(0.07, 0.3, 0.09), 0.01, x * 10), mat(C.stone), x, LAND_TOP + 0.2, 0));
  const arch = new THREE.TorusGeometry(0.14, 0.04, 4, 8, Math.PI);
  g.add(mesh(arch, mat(C.stone), 0, LAND_TOP + 0.35, 0));
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), mat(C.stoneDark), 0, LAND_TOP + 0.09, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), mat('#8f9a94'), 0, LAND_TOP + 0.16, 0));
  return g;
}

// ---------- Unités ----------

function lantern(color, intensity = 1.6) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.06, 0.045), mat(C.iron), 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.035, 0.045, 0.05), glowMat(color, 5), 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.035, 0.035), glowMat(color, 5), 0, 0, 0));
  g.add(mesh(new THREE.ConeGeometry(0.035, 0.03, 4), mat(C.iron), 0, 0.045, 0));
  const light = new THREE.PointLight(color, intensity, 2.2, 1.8);
  g.add(light);
  g.userData.light = light;
  return g;
}

function hoodedFigure(color, { height = 0.34, width = 0.1 } = {}) {
  const g = new THREE.Group();
  const robe = jitter(new THREE.ConeGeometry(width, height, 8, 3), 0.008, 11);
  g.add(mesh(robe, mat(C.robe), 0, height / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(width * 0.62, 8, 6), mat(C.robe), 0, height * 0.82, 0));
  // Capuche pointue et visage dans l'ombre.
  g.add(mesh(new THREE.ConeGeometry(width * 0.55, height * 0.42, 7), mat(C.robe), 0, height * 1.02, -0.01));
  g.add(mesh(new THREE.SphereGeometry(width * 0.32, 6, 5), mat('#020303'), 0, height * 0.93, width * 0.28));
  for (const dx of [-0.012, 0.012]) g.add(mesh(new THREE.SphereGeometry(0.006, 4, 3), glowMat(color, 6), dx, height * 0.94, width * 0.52));
  return g;
}

function baseRing(color) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.19, 0.22, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  return ring;
}

export function unit(type, color, seed = 1) {
  const g = new THREE.Group();
  g.add(baseRing(color));
  if (type === 'gardien') {
    const body = jitter(new THREE.SphereGeometry(0.15, 9, 7), 0.02, seed);
    body.scale(1, 1.3, 0.9);
    g.add(mesh(body, mat('#0c1210'), 0, 0.2, 0));
    const head = jitter(new THREE.SphereGeometry(0.1, 9, 7), 0.015, seed + 1);
    head.scale(1.1, 0.9, 1.2);
    g.add(mesh(head, mat('#101816'), 0.02, 0.42, 0.06));
    for (const dx of [-0.045, 0.06]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), glowMat(color, 6), dx, 0.44, 0.165));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.06, 0.006, 0.01), mat('#050808'), -0.13, 0.4 - i * 0.03, 0.05));
    g.add(tube([[0.14, 0.26, 0.05], [0.26, 0.22, 0.08], [0.24, 0.08, 0.12], [0.18, 0.12, 0.14]], 0.016, C.iron, 10));
    const light = new THREE.PointLight(color, 0.9, 1.4, 2);
    light.position.set(0, 0.45, 0.3);
    g.add(light);
  } else if (type === 'mortier') {
    g.add(mesh(jitter(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 7), 0.01, seed), mat(C.stoneDark), 0, 0.05, 0));
    const barrel = new THREE.CylinderGeometry(0.075, 0.09, 0.22, 10, 1, true);
    const b = mesh(barrel, mat(C.iron, { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), 0, 0.2, 0.02);
    b.rotation.x = -0.45;
    g.add(b);
    g.add(mesh(new THREE.TorusGeometry(0.16, 0.01, 4, 16), glowMat(color, 3), 0, 0.1, 0).rotateX(Math.PI / 2));
    const light = new THREE.PointLight(color, 0.8, 1.2, 2);
    light.position.set(0, 0.15, 0.2);
    g.add(light);
  } else {
    const tall = type === 'guetteur';
    const fig = hoodedFigure(color, { height: tall ? 0.4 : 0.34, width: tall ? 0.085 : 0.1 });
    g.add(fig);
    if (type === 'guetteur') {
      g.add(tube([[-0.12, 0, 0.02], [-0.12, 0.62, 0.02], [-0.04, 0.64, 0.02]], 0.008, C.wood, 6));
      const l = lantern(color, 1.8);
      l.position.set(-0.04, 0.57, 0.02);
      g.add(l);
    } else {
      // Bras tendu et lanterne.
      g.add(tube([[0.06, 0.25, 0.02], [0.12, 0.2, 0.06], [0.14, 0.17, 0.08]], 0.018, C.robe, 6));
      const l = lantern(color, 1.6);
      l.position.set(0.15, 0.12, 0.09);
      g.add(l);
      if (type === 'harponneur') {
        const shaft = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5), mat(C.wood), -0.08, 0.32, 0.04);
        shaft.rotation.z = 0.35;
        g.add(shaft);
        const tip = mesh(new THREE.ConeGeometry(0.02, 0.07, 4), mat('#8f9a94', { metalness: 0.6, roughness: 0.35 }), -0.19, 0.62, 0.04);
        tip.rotation.z = 0.35;
        g.add(tip);
      }
    }
  }
  g.position.y = LAND_TOP;
  return g;
}

function hull(len, width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, height);
  shape.quadraticCurveTo(-len / 2 + 0.02, 0, -len / 4, 0);
  shape.lineTo(len / 4, 0);
  shape.quadraticCurveTo(len / 2, 0.01, len / 2 + 0.06, height + 0.03);
  shape.lineTo(-len / 2, height);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1 });
  geo.translate(0, 0, -width / 2);
  return mesh(geo, mat(C.wood));
}

function tatteredSail(w, h, seed) {
  const geo = new THREE.PlaneGeometry(w, h, 4, 4);
  const pos = geo.attributes.position;
  const r = rng(seed);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, Math.sin((y / h + 0.5) * Math.PI) * 0.035);
    if (y < -h / 2 + 0.01) pos.setY(i, y + r() * h * 0.25);
  }
  geo.computeVertexNormals();
  return mesh(geo, mat(C.sail, { side: THREE.DoubleSide }));
}

export function vessel(kind, color, seed = 1) {
  const g = new THREE.Group();
  if (kind === 'navire') {
    g.add(hull(0.78, 0.26, 0.14));
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.24), mat(C.woodDark), -0.26, 0.18, 0));
    for (const [x, h] of [[-0.08, 0.78], [0.18, 0.62]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.015, h, 5), mat(C.woodDark), x, 0.14 + h / 2, 0));
      const big = tatteredSail(0.24, h * 0.5, seed + x * 7);
      big.rotation.y = Math.PI / 2;
      big.position.set(x + 0.02, 0.14 + h * 0.55, 0);
      g.add(big);
    }
    for (const x of [-0.22, 0, 0.22]) g.add(mesh(new THREE.BoxGeometry(0.03, 0.025, 0.01), glowMat(color, 4), x, 0.1, 0.145));
    const l = lantern(color, 2.2);
    l.position.set(0.36, 0.3, 0);
    g.add(l);
  } else {
    g.add(hull(0.46, 0.18, 0.08));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.012, 0.18), mat(C.woodDark), 0, 0.085, 0));
    const fig = hoodedFigure(color, { height: 0.22, width: 0.07 });
    fig.position.set(-0.04, 0.06, 0);
    fig.rotation.y = Math.PI / 2;
    g.add(fig);
    g.add(tube([[0.03, 0.12, 0.08], [0.1, 0.05, 0.16], [0.16, -0.02, 0.2]], 0.006, C.wood, 4));
    g.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 4), mat(C.wood), 0.2, 0.22, 0));
    const l = lantern(color, 1.6);
    l.position.set(0.2, 0.36, 0);
    g.add(l);
  }
  g.position.y = WATER_LEVEL - 0.02;
  g.userData.bob = seed;
  return g;
}

// Brume : sprite doux généré une fois.
let mistTexture = null;
export function mist(scale = 3, opacity = 0.35) {
  if (!mistTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(95,120,116,0.8)');
    grad.addColorStop(0.5, 'rgba(85,110,106,0.3)');
    grad.addColorStop(1, 'rgba(85,110,106,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    mistTexture = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, transparent: true, opacity, depthWrite: false, fog: false }));
  s.scale.set(scale, scale * 0.45, 1);
  return s;
}

// ---------- Ressources supplémentaires ----------

export function nacre(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.DodecahedronGeometry(0.16, 0), 0.04, seed), mat(C.basaltDark), 0, WATER_LEVEL - 0.08, 0));
  for (let i = 0; i < 5; i++) {
    const shell = new THREE.SphereGeometry(0.045, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    shell.scale(1, 0.45, 0.8);
    const m = mesh(shell, mat('#c9ddd6', { roughness: 0.35, metalness: 0.3 }), (r() - 0.5) * 0.3, WATER_LEVEL + 0.04, (r() - 0.5) * 0.3);
    m.rotation.y = r() * Math.PI;
    g.add(m);
  }
  g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), glowMat('#e9f5f0', 4), 0.02, WATER_LEVEL + 0.06, 0.02));
  const light = new THREE.PointLight('#7FD1B9', 0.6, 1.2, 2);
  light.position.set(0, 0.3, 0);
  g.add(light);
  return g;
}

export function epave(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const h = hull(0.5, 0.2, 0.1);
  h.rotation.set(0.35, r() * Math.PI, 0.25);
  h.position.set(0.12, LAND_TOP - 0.02, 0.1);
  g.add(h);
  for (let i = 0; i < 3; i++) {
    const plank = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.04), mat(C.wood), (r() - 0.5) * 0.6, LAND_TOP + 0.01, (r() - 0.5) * 0.6);
    plank.rotation.y = r() * Math.PI;
    g.add(plank);
  }
  const mast = mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.4, 5), mat(C.woodDark), -0.12, LAND_TOP + 0.15, -0.1);
  mast.rotation.z = 0.6;
  g.add(mast);
  const l = lantern('#E8A33D', 0.9);
  l.position.set(-0.22, LAND_TOP + 0.05, -0.1);
  g.add(l);
  return g;
}

// ---------- Fusion ----------
// Fusionne toutes les pièces opaques d'un modèle en un seul maillage à
// couleurs de sommets (un seul appel de dessin). Les pièces lumineuses,
// transparentes, métalliques ou double-face restent séparées, et les
// lumières ponctuelles deviennent des « émetteurs » gérés par le rendu.
const bakedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });

export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const geos = [];
  const keep = [];
  const lights = [];
  root.traverse((o) => {
    if (o.isPointLight) {
      lights.push(o);
      return;
    }
    if (!o.isMesh) return;
    const m = o.material;
    const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const special = !m.isMeshStandardMaterial || m.transparent || m.side === THREE.DoubleSide
      || m.metalness > 0 || (m.emissiveIntensity > 0 && m.emissive.getHex() !== 0);
    if (special) {
      keep.push([o, local]);
      return;
    }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.clearGroups();
    g.applyMatrix4(local);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!m.vertexColors || !g.attributes.color) {
      const arr = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) arr.set([m.color.r, m.color.g, m.color.b], i);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    geos.push(g);
  });
  const out = new THREE.Group();
  if (geos.length) {
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    const baked = new THREE.Mesh(merged, bakedMaterial);
    baked.castShadow = true;
    baked.receiveShadow = true;
    out.add(baked);
  }
  for (const [o, local] of keep) {
    local.decompose(o.position, o.quaternion, o.scale);
    out.add(o);
  }
  out.userData.emitters = lights.map((l) => {
    const p = new THREE.Vector3();
    l.getWorldPosition(p).applyMatrix4(inv);
    return { local: p, color: l.color.clone(), intensity: l.intensity, distance: l.distance };
  });
  return out;
}

export function disposeGroup(group) {
  group.traverse((o) => o.isMesh && o.geometry.dispose());
  group.removeFromParent();
}
