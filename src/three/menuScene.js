// Scène 3D du menu de départ : une falaise de basalte coiffée d'un phare
// dont le faisceau balaie la baie, un village éclairé à ses pieds, la lune,
// la brume et une barque qui passe. Caméra en perspective, légèrement mobile.
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

// Relief de l'île principale : hauteur (en blocs empilés) de chaque case.
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

export function createMenuScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050a0b');
  scene.fog = new THREE.Fog('#050b0c', 30, 80);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  // On regarde à gauche de l'île : elle se place à droite, le menu à gauche.
  const lookAt = new THREE.Vector3(10.5, 2.4, 10.5);

  // Ciel : lune, halo et étoiles.
  scene.add(new THREE.HemisphereLight('#557a82', '#05090a', 0.95));
  const moon = new THREE.DirectionalLight('#b4d2d8', 2.4);
  moon.position.set(0, 14, 26);
  moon.target.position.copy(lookAt);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
  moon.shadow.bias = -0.0008;
  scene.add(moon, moon.target);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshBasicMaterial({ color: '#e4eeea', fog: false }));
  moonDisc.position.set(44, 13, -8);
  moonDisc.lookAt(0, 4, 20);
  scene.add(moonDisc);
  const halo = M.mist(14, 0.28);
  halo.material.color.set('#9FB6B1');
  halo.position.copy(moonDisc.position);
  halo.scale.set(12, 12, 1);
  scene.add(halo);
  const starGeo = new THREE.BufferGeometry();
  const stars = [];
  for (let i = 0; i < 260; i++) stars.push((Math.random() - 0.3) * 120, 8 + Math.random() * 40, -40 - Math.random() * 30);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#CFE3DC', size: 0.12, fog: false, transparent: true, opacity: 0.7 })));

  // Mer : l'eau stylisée près des côtes, une nappe sombre jusqu'à l'horizon.
  const heights = new Map();
  ISLAND.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') heights.set(`${ORIGIN.x + i},${ORIGIN.z + j}`, Number(ch));
  }));
  heights.set('5,5', 1);
  heights.set('6,5', 1);
  heights.set('5,6', 1);
  const sea = createWater(SIZE);
  sea.userData.recolor((x, y) => {
    if (heights.has(`${x},${y}`)) return 'land';
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (heights.has(`${x + dx},${y + dz}`)) return 'shallow';
    return 'deep';
  });
  scene.add(sea);
  const horizon = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#040a0b', fog: false }));
  horizon.position.set(12, M.WATER_LEVEL - 0.02, 0);
  scene.add(horizon);

  // Falaise : des blocs de basalte empilés, plus hauts au centre.
  const BLOCK = M.LAND_TOP + 0.5;
  let seed = 11;
  let summit = { x: 0, z: 0, h: 0 };
  for (const [key, h] of heights) {
    const [x, z] = key.split(',').map(Number);
    // Chaque étage se rétrécit et se décale un peu : la falaise s'effrite.
    for (let k = 0; k < h; k++) {
      const block = M.landBlock(seed++);
      const shrink = 1.06 - k * 0.07;
      block.scale.set(shrink, 1, shrink);
      block.position.set(x + Math.sin(seed * 1.7) * 0.06, k * BLOCK, z + Math.cos(seed * 2.3) * 0.06);
      block.rotation.y = Math.sin(seed * 3.1) * 0.06;
      scene.add(block);
    }
    const top = (h - 1) * BLOCK;
    const centre = Math.abs(x - 15) + Math.abs(z - 7);
    if (h > summit.h || (h === summit.h && centre < summit.centre)) summit = { x, z, h, top, centre };
    if (h >= 2 && h < 4 && seed % 2 === 0) {
      const f = M.falaise(seed);
      f.position.set(x, top, z);
      scene.add(f);
    }
    if (h === 1 && seed % 3 === 1) {
      const m = M.mangrove(seed);
      m.position.set(x, top, z);
      scene.add(m);
    }
  }
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // Phare au sommet.
  const lighthouse = M.tower(LIGHT);
  lighthouse.scale.setScalar(2.4);
  lighthouse.position.set(summit.x, summit.top + M.LAND_TOP, summit.z);
  scene.add(lighthouse);
  const lampY = summit.top + M.LAND_TOP + 0.77 * 2.4;
  const beamGeo = new THREE.ConeGeometry(4, 34, 32, 1, true);
  beamGeo.translate(0, -17, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: LIGHT, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(summit.x, lampY, summit.z);
  scene.add(beam);
  const beamCore = new THREE.Mesh(beamGeo, beamMat.clone());
  beamCore.material.opacity = 0.12;
  beamCore.scale.set(1, 0.4, 0.4);
  beam.add(beamCore);

  // Village éclairé au pied de la falaise.
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

  // Nappes de brume.
  const mists = [];
  for (let i = 0; i < 9; i++) {
    const m = M.mist(10 + Math.random() * 8, 0.12);
    m.position.set(2 + i * 3.4, 0.6 + Math.random() * 0.6, 4 + Math.random() * 12);
    m.userData.base = m.position.clone();
    m.userData.s = Math.random() * 10;
    scene.add(m);
    mists.push(m);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Sur un écran étroit, on recule pour garder le phare dans le cadre.
    camera.userData.back = w / h < 1.2 ? 8 : 0;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let running = true;
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const back = camera.userData.back;
    camera.position.set(1.5 + Math.sin(t * 0.05) * 1.2 - back * 0.4, 3.4 + Math.sin(t * 0.07) * 0.25 + back * 0.2, 24 + back + Math.cos(t * 0.04) * 0.8);
    camera.lookAt(lookAt);
    sea.userData.update(t);
    beam.rotation.y = t * 0.45;
    const k = 0.5 + 0.5 * Math.cos(beam.rotation.y - 2.6); // plus vif quand il vient vers nous
    beam.material.opacity = 0.05 + k * 0.1;
    beamCore.material.opacity = 0.06 + k * 0.14;
    const p = (t * 0.018) % 1;
    boat.position.set(-2 + p * 26, M.WATER_LEVEL - 0.02 + Math.sin(t * 1.3) * 0.03, 17.5 - Math.sin(p * Math.PI) * 2);
    boat.rotation.y = 0.12 * Math.sin(p * Math.PI * 2);
    boat.rotation.z = Math.sin(t * 1.1) * 0.05;
    U.animateParts(boat, t);
    for (const m of mists) {
      m.position.x = m.userData.base.x + Math.sin(t * 0.08 + m.userData.s) * 1.5;
      m.position.z = m.userData.base.z + Math.cos(t * 0.06 + m.userData.s) * 0.8;
    }
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      scene.traverse((o) => {
        o.geometry?.dispose();
      });
      composer.dispose?.();
      renderer.dispose();
    },
  };
}
