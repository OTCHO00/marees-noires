// Scène de démonstration du rendu 3D : un morceau d'archipel avec une
// capitale, une cité ennemie, un sanctuaire, des fidèles, des navires,
// une île qui sombre et de la brume.
import * as THREE from 'three';
import { createStage } from './stage.js';
import * as M from './models.js';
import { createWater } from './water.js';

const AMBER = { color: '#E8A33D', light: '#F5C26B' };
const BLOOD = { color: '#D9604F', light: '#F08A7C' };

const stage = createStage(document.querySelector('#scene'));
const { scene } = stage;

const LAND = new Map([
  ['3,3', { sink: 1 }], ['4,3', {}], ['5,3', { res: 'relique' }],
  ['2,4', { feat: 'mangrove' }], ['3,4', {}], ['4,4', { city: 'capital' }], ['5,4', {}], ['6,4', { feat: 'falaise' }],
  ['3,5', { feat: 'mangrove' }], ['4,5', {}], ['5,5', {}],
  ['4,6', { sink: 2 }],
  ['7,7', { city: 'enemy' }], ['8,7', {}], ['7,8', { feat: 'mangrove' }], ['8,8', { feat: 'falaise' }],
  ['1,7', { city: 'sanctuary' }], ['1,8', {}],
]);
const isLand = (x, z) => LAND.has(`${x},${z}`);

// Mer, plus claire près des côtes.
const sea = createWater(11);
sea.userData.recolor((x, z) => (isLand(x, z) ? 'land' : [...LAND.keys()].some((k) => {
  const [lx, lz] = k.split(',').map(Number);
  return Math.max(Math.abs(x - lx), Math.abs(z - lz)) <= 1;
}) ? 'shallow' : 'deep'));
scene.add(sea);

// Terre et décor.
let seed = 1;
for (const [key, info] of LAND) {
  const [x, z] = key.split(',').map(Number);
  const block = M.landBlock(seed++, { sink: info.sink ?? 0 });
  block.position.x = x;
  block.position.z = z;
  scene.add(block);
  const top = block.position.y;
  let deco = null;
  if (info.feat === 'mangrove') deco = M.mangrove(seed);
  if (info.feat === 'falaise') deco = M.falaise(seed);
  if (info.res === 'relique') deco = M.relique();
  if (info.city === 'capital') deco = M.city({ level: 3, capital: true, ...AMBER, seed });
  if (info.city === 'enemy') deco = M.city({ level: 2, ...BLOOD, seed });
  if (info.city === 'sanctuary') deco = M.sanctuary();
  if (deco) {
    deco.position.set(x, top, z);
    scene.add(deco);
  }
  if (info.sink === 2) {
    // Colonnes brisées qui dépassent encore.
    for (const [dx, dz, h] of [[-0.2, 0.1, 0.32], [0.18, -0.15, 0.2]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 6), M.mat('#3b403c'));
      col.position.set(x + dx, top + M.LAND_TOP + h / 2, z + dz);
      col.castShadow = true;
      scene.add(col);
    }
  }
}

// Fidèles.
const units = [
  ['acolyte', 5, 4, AMBER, Math.PI * 0.25],
  ['harponneur', 3, 4, AMBER, Math.PI * 0.4],
  ['gardien', 5, 5, AMBER, Math.PI * 0.1],
  ['guetteur', 4, 3, AMBER, Math.PI * 0.6],
  ['acolyte', 8, 7, BLOOD, -Math.PI * 0.75],
];
const lights = [];
units.forEach(([type, x, z, f, rot], i) => {
  const u = M.unit(type, f.color, i + 3);
  u.position.x = x;
  u.position.z = z;
  u.rotation.y = rot;
  scene.add(u);
  u.traverse((o) => o.isPointLight && lights.push({ light: o, base: o.intensity, seed: i * 3.1 }));
});

// Navires.
const ships = [
  [M.vessel('barque', AMBER.color, 2), 6, 5.2, Math.PI * 1.2],
  [M.vessel('navire', BLOOD.color, 5), 5.8, 7.5, Math.PI / 4],
];
for (const [ship, x, z, rot] of ships) {
  ship.position.x = x;
  ship.position.z = z;
  ship.rotation.y = rot;
  scene.add(ship);
  ship.traverse((o) => o.isPointLight && lights.push({ light: o, base: o.intensity, seed: x }));
}
scene.traverse((o) => o.isPointLight && !lights.some((l) => l.light === o) && lights.push({ light: o, base: o.intensity, seed: o.id }));

// Brume aux confins de la zone explorée.
const mists = [];
for (const [x, z, s] of [[0, 2, 4], [10, 3, 5], [2, 10, 4.5], [9, 10, 5], [5, 0, 4], [-0.5, 5.5, 3.5], [10.5, 6.5, 3.5], [6, 10.5, 4]]) {
  const m = M.mist(s, 0.22);
  m.position.set(x, 0.5, z);
  scene.add(m);
  mists.push({ m, x, z, s: Math.random() * 10 });
}

stage.onFrame((t) => {
  sea.userData.update(t);
  sea.userData.setLights(lights.map(({ light }) => ({
    position: light.getWorldPosition(new THREE.Vector3()), color: light.color, intensity: light.intensity,
  })));
  for (const { light, base, seed: s } of lights) {
    light.intensity = base * (0.88 + Math.sin(t * 9 + s) * 0.06 + Math.sin(t * 23 + s * 2) * 0.05);
  }
  for (const [ship, , , rot] of ships) {
    const k = ship.userData.bob;
    ship.position.y = M.WATER_LEVEL - 0.02 + Math.sin(t * 1.4 + k) * 0.02;
    ship.rotation.z = Math.sin(t * 1.1 + k) * 0.04;
    ship.rotation.y = rot + Math.sin(t * 0.3 + k) * 0.03;
  }
  for (const m of mists) {
    m.m.position.x = m.x + Math.sin(t * 0.12 + m.s) * 0.6;
    m.m.position.z = m.z + Math.cos(t * 0.1 + m.s) * 0.4;
  }
});

stage.setView(4.8, 5.4, 3.4);

// Contrôles : glisser pour déplacer, molette pour zoomer.
const canvas = stage.renderer.domElement;
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const k = (2 * stage.view.zoom) / canvas.clientHeight;
  const dx = (e.clientX - drag.x) * k;
  const dy = ((e.clientY - drag.y) * k) / Math.sin((35.264 * Math.PI) / 180);
  // Axe écran → monde (vue isométrique tournée de 45°).
  stage.pan((-dx - dy) / Math.SQRT2, (dx - dy) / Math.SQRT2);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  stage.zoomBy(Math.exp(e.deltaY * 0.0012));
}, { passive: false });

window.stage = stage;
