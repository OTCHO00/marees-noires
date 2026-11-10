// Bâtiments des cités et décors des terres. Chaque cité compose ses
// bâtiments selon son niveau (maisons, chapelle, fumoir, hangar à barques,
// puits, réverbères) ; les terres nues reçoivent parfois des ruines, des
// menhirs, un calvaire, une cabane abandonnée ou un cairn.
import * as THREE from 'three';
import { C, LAND_TOP, mat, glowMat, jitter, mesh, tube, gableRoof, house, tower, hull, rng } from './models.js';

// ---------- Bâtiments ----------

function tallHouse(light, seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const w = 0.17;
  const d = 0.16;
  g.add(mesh(jitter(new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), 0.005, seed), mat(C.stoneDark), 0, 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(w, 0.16, d), mat(C.stone), 0, 0.12, 0));
  // L'étage déborde, à colombages.
  g.add(mesh(new THREE.BoxGeometry(w + 0.03, 0.13, d + 0.03), mat(C.plaster), 0, 0.265, 0));
  for (const sx of [-1, 0, 1]) g.add(mesh(new THREE.BoxGeometry(0.014, 0.13, 0.014), mat(C.woodDark), (sx * (w + 0.03)) / 2, 0.265, (d + 0.03) / 2));
  const roof = gableRoof(w + 0.03, d + 0.03, 0.17, C.slate);
  roof.position.y = 0.33;
  g.add(roof);
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), mat(C.stone), -w * 0.25, 0.44, -d * 0.1));
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.06, 0.01), glowMat(light, 2.2), 0.03, 0.27, (d + 0.03) / 2 + 0.005));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.09, 0.01), mat(C.wood), -0.03, 0.085, d / 2 + 0.004));
  g.rotation.y = (Math.floor(r() * 4) * Math.PI) / 2;
  return g;
}

function chapel(light, seed) {
  const g = new THREE.Group();
  const w = 0.2;
  const d = 0.34;
  g.add(mesh(jitter(new THREE.BoxGeometry(w + 0.03, 0.04, d + 0.03), 0.006, seed), mat(C.stoneDark), 0, 0.02, 0));
  g.add(mesh(jitter(new THREE.BoxGeometry(w, 0.2, d, 1, 2, 2), 0.006, seed + 1), mat(C.stone), 0, 0.14, 0));
  const roof = gableRoof(w, d, 0.16, C.slate);
  roof.position.y = 0.24;
  g.add(roof);
  // Contreforts.
  for (const z of [-0.1, 0.04]) {
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.03, 0.14, 0.04), mat(C.stoneDark), (sx * (w + 0.02)) / 2, 0.09, z));
  }
  // Clocher en façade.
  g.add(mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), mat(C.stone), 0, 0.23, d / 2 + 0.02));
  const spire = new THREE.ConeGeometry(0.09, 0.26, 4);
  spire.rotateY(Math.PI / 4);
  g.add(mesh(spire, mat(C.slate), 0, 0.57, d / 2 + 0.02));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), mat('#0a0e0e'), 0, 0.38, d / 2 + 0.02));
  g.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), mat(C.iron, { metalness: 0.5, roughness: 0.4 }), 0, 0.37, d / 2 + 0.02));
  // Rosace et vitraux allumés.
  const rose = mesh(new THREE.CircleGeometry(0.03, 10), glowMat(light, 2.6), 0, 0.26, d / 2 + 0.077);
  g.add(rose);
  for (const z of [-0.09, 0.05]) g.add(mesh(new THREE.BoxGeometry(0.01, 0.07, 0.03), glowMat(light, 2), w / 2 + 0.003, 0.15, z));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.08, 0.01), mat(C.wood), 0, 0.06, d / 2 + 0.077));
  return g;
}

function smokehouse(light, seed) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.BoxGeometry(0.14, 0.12, 0.13), 0.008, seed), mat(C.wood), 0, 0.06, 0));
  const roof = gableRoof(0.14, 0.13, 0.08, C.woodDark);
  roof.position.y = 0.12;
  g.add(roof);
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.1, 6), mat(C.stone), 0.04, 0.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.012, 5, 4), glowMat('#ff8a3d', 3), 0.04, 0.25, 0));
  // Séchoir à poissons.
  for (const x of [0.12, 0.26]) g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), mat(C.woodDark), x, 0.08, 0.04));
  const bar = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 4), mat(C.woodDark), 0.19, 0.155, 0.04);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const x of [0.15, 0.19, 0.23]) {
    const fish = new THREE.ConeGeometry(0.012, 0.06, 4);
    fish.rotateX(Math.PI);
    g.add(mesh(fish, mat('#5a5f58'), x, 0.12, 0.04));
  }
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.04, 0.01), glowMat(light, 1.8), -0.03, 0.07, 0.07));
  return g;
}

function boathouse(light, seed) {
  const g = new THREE.Group();
  const w = 0.34;
  const d = 0.2;
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w, 0.12, 0.015), mat(C.wood), 0, 0.06, (sx * d) / 2));
  g.add(mesh(new THREE.BoxGeometry(0.015, 0.12, d), mat(C.wood), -w / 2, 0.06, 0));
  const roof = gableRoof(d, w, 0.08, C.slate);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 0.12;
  g.add(roof);
  const boat = hull(0.24, 0.1, 0.05);
  boat.position.set(0.02, 0.0, 0);
  g.add(boat);
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.035, 0.01), glowMat(light, 2), -0.08, 0.08, d / 2 + 0.008));
  g.add(mesh(jitter(new THREE.BoxGeometry(0.07, 0.04, 0.09), 0.01, seed), mat(C.woodDark), w / 2 - 0.02, 0.02, -0.12));
  return g;
}

function well(seed) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.05, 0.055, 0.06, 8), 0.006, seed), mat(C.stone), 0, 0.03, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.01, 8), mat('#020404'), 0, 0.062, 0));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.012, 0.12, 0.012), mat(C.woodDark), sx * 0.045, 0.1, 0));
  const roof = gableRoof(0.12, 0.08, 0.05, C.woodDark);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 0.16;
  g.add(roof);
  return g;
}

function lampPost(light) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.26, 5), mat(C.iron), 0, 0.13, 0));
  g.add(mesh(new THREE.BoxGeometry(0.035, 0.045, 0.035), glowMat(light, 3.5), 0, 0.28, 0));
  g.add(mesh(new THREE.ConeGeometry(0.03, 0.03, 4), mat(C.iron), 0, 0.315, 0));
  return g;
}

// Emplacements (x, z) autour du centre ; les grands bâtiments vont au fond
// (côté opposé à la caméra) pour ne pas masquer le reste.
const BACK = [[-0.27, -0.27], [0.29, -0.25]];
const FRONT = [[-0.29, 0.22], [0.26, 0.26], [0.02, 0.35], [-0.36, -0.02], [0.36, 0.02]];

export function city({ level = 1, capital = false, color = '#E8A33D', light = '#F5C26B', seed = 1 } = {}) {
  const r = rng(seed * 31 + 7);
  const g = new THREE.Group();
  const place = (obj, [x, z], rot = 0, scale = 1) => {
    obj.position.set(x, LAND_TOP, z);
    obj.scale.multiplyScalar(scale);
    obj.rotation.y += rot;
    g.add(obj);
  };
  // Grands bâtiments selon le niveau.
  const big = [];
  if (level >= 3) big.push((s) => chapel(light, s));
  if (level >= 4) big.push(r() > 0.5 ? (s) => boathouse(light, s) : (s) => smokehouse(color, s));
  if (level >= 6) big.push((s) => chapel(color, s));
  big.slice(0, BACK.length).forEach((make, i) => place(make(seed + i * 5), BACK[i], i === 1 ? Math.PI / 2 : 0, capital ? 0.8 : 0.9));
  // Maisons et petits bâtiments sur les emplacements restants.
  const free = [...BACK.slice(big.length), ...FRONT];
  const count = Math.min(free.length, level + 1);
  for (let i = 0; i < count; i++) {
    const kind = r();
    const s = seed + i * 11;
    const lit = i % 3 === 2 ? light : color;
    let b;
    if (level >= 2 && kind < 0.3) b = tallHouse(lit, s);
    else if (level >= 3 && kind > 0.85) b = smokehouse(lit, s);
    else b = house(lit, s, { w: 0.2 + r() * 0.06, d: 0.18 + r() * 0.04, h: 0.15 + r() * 0.06 });
    place(b, free[i], 0, capital ? 0.82 : 0.92);
  }
  if (level >= 2) place(well(seed), [0.13, 0.12]);
  for (let i = 0; i < Math.min(3, level - 1); i++) place(lampPost(light), [[-0.12, 0.18], [0.18, -0.1], [-0.18, -0.08]][i]);
  if (capital) {
    place(tower(light), [0, -0.02]);
  } else {
    // Fanal sur un mât.
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.5, 5), mat(C.wood), 0.02, LAND_TOP + 0.25, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), glowMat(light, 4), 0.02, LAND_TOP + 0.52, 0));
    const lamp = new THREE.PointLight(color, 2, 2.6, 1.8);
    lamp.position.set(0.02, LAND_TOP + 0.55, 0);
    g.add(lamp);
  }
  const plaza = jitter(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 7), 0.01, seed);
  g.add(mesh(plaza, mat(C.stoneDark), 0, LAND_TOP + 0.005, 0));
  return g;
}

// ---------- Décors des terres nues ----------

function ruins(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const walls = [[-0.15, -0.1, 0.3, 0.16, 0], [0.05, 0.12, 0.22, 0.1, Math.PI / 2]];
  for (const [x, z, w, h, rot] of walls) {
    const wall = mesh(jitter(new THREE.BoxGeometry(w, h, 0.05, 3, 2, 1), 0.02, seed + x * 10), mat(C.stone), x, LAND_TOP + h / 2, z);
    wall.rotation.y = rot;
    g.add(wall);
    // Arche brisée.
    const arch = mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 6, Math.PI * 0.7), mat(C.stone), x, LAND_TOP + h, z);
    arch.rotation.y = rot;
    g.add(arch);
  }
  for (let i = 0; i < 5; i++) {
    const s = 0.02 + r() * 0.03;
    g.add(mesh(jitter(new THREE.BoxGeometry(s * 2, s, s * 1.5), s * 0.3, seed + i), mat(C.stoneDark), (r() - 0.5) * 0.6, LAND_TOP + s / 2, (r() - 0.5) * 0.6));
  }
  return g;
}

function menhirs(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const h = 0.22 + r() * 0.2;
    const stone = mesh(jitter(new THREE.BoxGeometry(0.07, h, 0.05, 1, 3, 1), 0.015, seed + i), mat(i % 2 ? C.stone : C.stoneDark), (r() - 0.5) * 0.5, LAND_TOP + h / 2 - 0.02, (r() - 0.5) * 0.5);
    stone.rotation.set((r() - 0.5) * 0.2, r() * Math.PI, (r() - 0.5) * 0.25);
    g.add(stone);
  }
  // Une rune pâle sur la plus grande pierre.
  g.add(mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), glowMat('#7FD1B9', 1.6), g.children[0].position.x, LAND_TOP + 0.14, g.children[0].position.z + 0.03));
  return g;
}

function calvary(seed) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.BoxGeometry(0.12, 0.05, 0.12), 0.01, seed), mat(C.stoneDark), 0.1, LAND_TOP + 0.025, -0.05));
  g.add(mesh(new THREE.BoxGeometry(0.025, 0.36, 0.025), mat(C.woodDark), 0.1, LAND_TOP + 0.22, -0.05));
  g.add(mesh(new THREE.BoxGeometry(0.15, 0.022, 0.022), mat(C.woodDark), 0.1, LAND_TOP + 0.31, -0.05));
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 5), mat('#8f9a94'), 0.14, LAND_TOP + 0.065, 0.0));
  g.add(mesh(new THREE.SphereGeometry(0.007, 4, 3), glowMat('#F5C26B', 4), 0.14, LAND_TOP + 0.085, 0.0));
  return g;
}

function shack(seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.BoxGeometry(0.16, 0.1, 0.13), 0.012, seed), mat(C.wood), 0, LAND_TOP + 0.05, 0));
  const roof = gableRoof(0.16, 0.13, 0.07, C.woodDark);
  roof.position.y = LAND_TOP + 0.1;
  roof.rotation.z = 0.25; // effondré d'un côté
  g.add(roof);
  for (let i = 0; i < 3; i++) {
    const plank = mesh(new THREE.BoxGeometry(0.12, 0.01, 0.025), mat(C.wood), 0.14 + r() * 0.1, LAND_TOP + 0.01, (r() - 0.5) * 0.3);
    plank.rotation.y = r() * Math.PI;
    g.add(plank);
  }
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

function cairn(seed) {
  const g = new THREE.Group();
  let y = LAND_TOP;
  for (let i = 0; i < 4; i++) {
    const s = 0.06 - i * 0.012;
    g.add(mesh(jitter(new THREE.DodecahedronGeometry(s, 0), s * 0.25, seed + i), mat(i % 2 ? C.stone : C.stoneDark), 0.12 + (i % 2) * 0.01, y + s * 0.7, -0.1));
    y += s * 1.2;
  }
  return g;
}

const PROPS = [ruins, menhirs, calvary, shack, cairn];

// Un décor (ou rien) pour une case de terre nue, de façon stable.
export function landProp(seed) {
  const r = rng(seed * 13 + 5);
  if (r() > 0.32) return null;
  return PROPS[Math.floor(r() * PROPS.length)](seed);
}
