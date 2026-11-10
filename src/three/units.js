// Fidèles et navires, d'après la planche « Personnages » retenue :
// chaque classe a sa propre forme, sa taille et sa matière ; la couleur du
// culte n'est portée que par la lumière.
//   Acolyte    — tête-méduse          Guetteur — vigie sur échasses
//   Harponneur — masque de baleine    Gardien  — masse aux mille yeux
//   Mortier    — gueule-canon         Barque   — esquif de roseaux
//   Navire noir — vaisseau-squelette
// Les unités regardent vers +z (vers la caméra) ; les navires avancent vers +x.
import * as THREE from 'three';
import {
  C, WATER_LEVEL, mat, glowMat, jitter, mesh, tube, lantern, hull, hoodedFigure, baseRing, tatteredSail, rng, mix,
} from './models.js';

const BONE = '#d8cfb6';
const BONE_DARK = '#b8ae94';
const FLESH = '#1e2a28';
const FLESH_DARK = '#121a19';
const ROBE = '#1a2321';

function light(color, intensity, distance, x, y, z) {
  const l = new THREE.PointLight(color, intensity, distance, 1.8);
  l.position.set(x, y, z);
  return l;
}

// Matériau lumineux et translucide (cloche de méduse).
function jellyMat(color) {
  return mat(color, {
    emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 0.7, roughness: 0.25, side: THREE.DoubleSide,
  });
}

// ---------- Acolyte : tête-méduse ----------

function acolyte(color, glow) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.ConeGeometry(0.1, 0.32, 8, 3), 0.008, 3), mat(ROBE), 0, 0.16, 0));
  g.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(ROBE), 0, 0.29, 0));
  g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), mat('#2a3532'), -0.025, 0.19, 0.075));
  g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), mat('#222c2a'), 0.025, 0.19, 0.078));
  // Cloche de méduse à la place de la tête.
  const bell = new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  g.add(mesh(bell, jellyMat(color), 0, 0.34, 0));
  g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat(glow, 2.6), 0, 0.37, 0));
  for (const dx of [-0.035, 0.035]) g.add(mesh(new THREE.SphereGeometry(0.012, 6, 4), mat('#050909'), dx, 0.38, 0.105));
  // Filaments qui retombent sur la robe.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.105;
    const z = Math.sin(a) * 0.105;
    g.add(tube([[x, 0.35, z], [x * 1.1, 0.28, z * 1.1], [x * 0.95, 0.2, z * 0.95], [x * 1.15, 0.1, z * 1.15]], 0.005, color, 8));
  }
  g.traverse((o) => {
    if (o.isMesh && o.geometry.type === 'TubeGeometry') o.material = glowMat(color, 1.1);
  });
  g.add(light(color, 1.7, 2.2, 0, 0.38, 0.05));
  return g;
}

// ---------- Guetteur : vigie sur échasses ----------

function guetteur(color, glow) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const stilt = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.46, 5), mat(sx < 0 ? '#3a2a1c' : C.wood), sx * 0.045, 0.23, 0);
    stilt.rotation.z = sx * 0.05;
    g.add(stilt);
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.015, 0.06), mat(C.woodDark), sx * 0.05, 0.008, 0.01));
    g.add(mesh(new THREE.BoxGeometry(0.035, 0.12, 0.035), mat(ROBE), sx * 0.035, 0.44, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(0.11, 0.015, 0.015), mat(C.woodDark), 0, 0.22, 0));
  // Manteau court et écharpe qui flotte.
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.065, 0.09, 0.22, 7, 2), 0.006, 5), mat('#26302e'), 0, 0.6, 0));
  g.add(tube([[0, 0.7, -0.03], [-0.08, 0.7, -0.1], [-0.16, 0.64, -0.12], [-0.22, 0.6, -0.08]], 0.014, '#6e3329', 10));
  g.add(tube([[0.06, 0.68, 0], [0.12, 0.6, 0.06], [0.13, 0.52, 0.1]], 0.016, ROBE, 6));
  g.add(tube([[-0.06, 0.68, 0], [-0.1, 0.6, 0.04]], 0.016, '#26302e', 4));
  const spyglass = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 6), mat('#8f9a94', { metalness: 0.5, roughness: 0.4 }), 0.14, 0.52, 0.14);
  spyglass.rotation.x = Math.PI / 2.4;
  g.add(spyglass);
  // Tête enfermée dans une cage-lanterne.
  g.add(mesh(new THREE.BoxGeometry(0.075, 0.09, 0.075), glowMat(glow, 4), 0, 0.78, 0));
  for (const [x, z] of [[-0.045, -0.045], [0.045, -0.045], [-0.045, 0.045], [0.045, 0.045]]) {
    g.add(mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), mat(C.iron), x, 0.78, z));
  }
  for (const y of [0.73, 0.83]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.01, 0.1), mat(C.iron), 0, y, 0));
  const roof = new THREE.ConeGeometry(0.075, 0.06, 4);
  roof.rotateY(Math.PI / 4);
  g.add(mesh(roof, mat(C.iron), 0, 0.865, 0));
  for (const dx of [-0.016, 0.018]) g.add(mesh(new THREE.BoxGeometry(0.014, 0.014, 0.005), mat('#050909'), dx, 0.79, 0.039));
  g.add(light(color, 2, 2.6, 0, 0.8, 0.05));
  return g;
}

// ---------- Harponneur : masque de baleine ----------

function harponneur(color, glow) {
  const g = new THREE.Group();
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.095, 0.13, 0.3, 7, 2), 0.008, 7), mat('#2c3a2e'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.035, 0.13), mat('#6b5a3a'), 0, 0.3, 0));
  const chain = mesh(new THREE.TorusGeometry(0.045, 0.01, 4, 12), mat('#8f9a94', { metalness: 0.5, roughness: 0.45 }), -0.12, 0.16, 0.02);
  chain.rotation.y = Math.PI / 2;
  g.add(chain);
  // Crâne de baleine en guise de masque.
  const skull = new THREE.SphereGeometry(0.075, 10, 8);
  skull.scale(1, 1, 1.25);
  g.add(mesh(skull, mat(BONE), 0, 0.37, 0.01));
  const snout = new THREE.ConeGeometry(0.045, 0.16, 6);
  snout.rotateX(Math.PI / 2);
  g.add(mesh(snout, mat(BONE_DARK), 0, 0.34, 0.15));
  for (const dx of [-0.04, 0.04]) g.add(mesh(new THREE.SphereGeometry(0.016, 6, 4), glowMat(glow, 2), dx, 0.38, 0.075));
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.ConeGeometry(0.006, 0.02, 3);
    tooth.rotateX(Math.PI);
    g.add(mesh(tooth, mat(BONE), -0.024 + i * 0.016, 0.31, 0.12 + i * 0.01));
  }
  // Harpon géant en travers.
  const shaft = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.78, 5), mat('#3a2a1c'), 0.04, 0.38, 0.06);
  shaft.rotation.z = -0.6;
  g.add(shaft);
  const head = new THREE.Group();
  head.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 4), mat('#8f9a94', { metalness: 0.6, roughness: 0.35 }), 0, 0.05, 0));
  for (const sx of [-1, 1]) {
    const barb = mesh(new THREE.ConeGeometry(0.012, 0.05, 3), mat('#8f9a94', { metalness: 0.6, roughness: 0.35 }), sx * 0.025, 0.0, 0);
    barb.rotation.z = Math.PI + sx * 0.5;
    head.add(barb);
  }
  head.position.set(0.04 + Math.sin(0.6) * 0.39, 0.38 + Math.cos(0.6) * 0.39, 0.06);
  head.rotation.z = -0.6;
  g.add(head);
  g.add(light(color, 1, 1.5, 0, 0.4, 0.15));
  return g;
}

// ---------- Gardien : masse aux mille yeux ----------

function gardien(color, glow, seed) {
  const r = rng(seed * 7 + 1);
  const g = new THREE.Group();
  const center = new THREE.Vector3(0, 0.15, 0);
  const radii = new THREE.Vector3(0.24, 0.17, 0.2);
  const body = jitter(new THREE.SphereGeometry(1, 14, 10), 0.12, seed);
  body.scale(radii.x, radii.y, radii.z);
  g.add(mesh(body, mat(FLESH), center.x, center.y, center.z));
  for (const [x, y, z, s] of [[-0.18, 0.08, 0.06, 0.1], [0.17, 0.07, -0.04, 0.11], [0.06, 0.27, -0.08, 0.1], [-0.1, 0.24, 0.02, 0.08]]) {
    g.add(mesh(jitter(new THREE.SphereGeometry(s, 9, 7), s * 0.2, seed + x * 10), mat(r() > 0.5 ? FLESH : FLESH_DARK), x, y, z));
  }
  // Pseudopodes et débris pris dans la masse.
  g.add(tube([[-0.2, 0.18, 0.02], [-0.32, 0.26, 0.04], [-0.36, 0.36, 0.0], [-0.33, 0.42, -0.04]], 0.022, FLESH, 10));
  g.add(tube([[0.18, 0.2, -0.05], [0.28, 0.3, -0.1], [0.3, 0.38, -0.18]], 0.02, FLESH_DARK, 8));
  const mast = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 5), mat(C.woodDark), -0.06, 0.34, -0.1);
  mast.rotation.set(-0.4, 0, 0.5);
  g.add(mast);
  g.add(tube([[0.12, 0.05, 0.16], [0.17, 0.06, 0.22], [0.2, 0.02, 0.26]], 0.012, BONE, 5));
  // Les yeux, posés à la surface, surtout vers l'avant.
  const pupil = mat('#050909');
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3(r() * 2 - 1, r() * 1.4 - 0.2, r() * 1.2 - 0.1).normalize();
    const p = center.clone().add(dir.clone().multiply(radii).multiplyScalar(0.98));
    const size = 0.012 + r() * 0.028;
    const pale = r() > 0.75;
    const eye = mesh(new THREE.SphereGeometry(size, 8, 6), glowMat(pale ? '#7FD1B9' : color, pale ? 1.4 : 1.8), p.x, p.y, p.z);
    g.add(eye);
    const q = p.clone().add(dir.clone().multiplyScalar(size * 0.75));
    g.add(mesh(new THREE.SphereGeometry(size * 0.45, 6, 4), pupil, q.x, q.y, q.z));
  }
  g.add(light(color, 1.4, 1.8, 0, 0.3, 0.3));
  return g;
}

// ---------- Mortier : gueule-canon ----------

function mortier(color, glow) {
  const g = new THREE.Group();
  // Traîneau.
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.035, 0.5), mat('#2a1d14'), 0, 0.05, 0));
  for (const sx of [-1, 1]) g.add(tube([[sx * 0.13, 0.02, -0.26], [sx * 0.13, 0.015, 0.2], [sx * 0.13, 0.05, 0.3]], 0.012, C.woodDark, 6));
  // Bête des grands fonds, gueule béante vers l'avant.
  const head = jitter(new THREE.SphereGeometry(1, 14, 10), 0.08, 9);
  head.scale(0.17, 0.15, 0.22);
  g.add(mesh(head, mat(FLESH), 0, 0.22, -0.02));
  const jaw = jitter(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0.05, 10);
  jaw.scale(0.16, 0.08, 0.2);
  g.add(mesh(jaw, mat(FLESH_DARK), 0, 0.13, 0.04));
  const maw = new THREE.SphereGeometry(1, 12, 8);
  maw.scale(0.11, 0.07, 0.04);
  g.add(mesh(maw, mat('#050909'), 0, 0.17, 0.19));
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + (i / 6) * 1.8;
    const up = new THREE.ConeGeometry(0.008, 0.04, 3);
    g.add(mesh(up, mat(BONE), Math.sin(a) * 0.1, 0.13, 0.17 + Math.cos(a) * 0.03));
    const down = new THREE.ConeGeometry(0.009, 0.045, 3);
    down.rotateX(Math.PI);
    g.add(mesh(down, mat(BONE), Math.sin(a) * 0.1, 0.21, 0.18 + Math.cos(a) * 0.03));
  }
  for (const sx of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), glowMat(glow, 3), sx * 0.12, 0.26, 0.09));
  // Leurre lumineux au bout d'une tige.
  g.add(tube([[0, 0.34, -0.06], [0, 0.48, 0.0], [0, 0.5, 0.14], [0, 0.44, 0.24]], 0.01, FLESH, 10));
  g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), glowMat(glow, 5), 0, 0.42, 0.25));
  // Chaînes et dompteur.
  for (const sx of [-1, 1]) g.add(tube([[sx * 0.14, 0.06, -0.2], [sx * 0.16, 0.2, -0.08], [sx * 0.12, 0.3, 0.02]], 0.007, '#8f9a94', 6));
  const handler = hoodedFigure(color, { height: 0.26, width: 0.075 });
  handler.position.set(-0.24, 0, -0.2);
  handler.rotation.y = 0.5;
  g.add(handler);
  g.add(tube([[-0.2, 0.15, -0.16], [-0.12, 0.25, -0.02], [-0.08, 0.3, 0.06]], 0.006, C.wood, 4));
  g.add(light(color, 1.8, 2.2, 0, 0.45, 0.28));
  return g;
}

// ---------- Barque : esquif de roseaux ----------

function barque(color, glow) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.16, 0), new THREE.Vector3(-0.2, 0.06, 0), new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0.2, 0.06, 0), new THREE.Vector3(0.3, 0.17, 0),
  ]);
  const reeds = new THREE.TubeGeometry(curve, 20, 0.07, 8, false);
  reeds.scale(1, 0.75, 1);
  g.add(mesh(reeds, mat('#8a7a4a')));
  for (const z of [-0.04, 0.04]) {
    const bundle = new THREE.TubeGeometry(curve, 20, 0.03, 6, false);
    bundle.translate(0, 0.03, z);
    g.add(mesh(bundle, mat('#6e6038')));
  }
  for (const x of [-0.18, -0.06, 0.06, 0.18]) {
    const tie = mesh(new THREE.TorusGeometry(0.068, 0.008, 4, 10), mat('#3a3220'), x, 0.05 + Math.abs(x) * 0.25, 0);
    tie.rotation.y = Math.PI / 2;
    tie.scale.set(1, 0.75, 1);
    g.add(tie);
  }
  // Figure de proue en crâne de poisson et lanterne.
  const skull = new THREE.ConeGeometry(0.035, 0.1, 5);
  skull.rotateZ(-Math.PI / 2);
  g.add(mesh(skull, mat(BONE), 0.35, 0.18, 0));
  g.add(mesh(new THREE.SphereGeometry(0.008, 4, 3), mat('#050909'), 0.33, 0.195, 0.024));
  const l = lantern(glow, 1.6);
  l.position.set(0.36, 0.09, 0);
  g.add(l);
  // Passeur à la perche.
  const punter = hoodedFigure(color, { height: 0.24, width: 0.07 });
  punter.position.set(-0.15, 0.06, 0);
  g.add(punter);
  const pole = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 4), mat(C.wood), -0.24, 0.12, 0.05);
  pole.rotation.set(0.25, 0, 0.4);
  g.add(pole);
  return g;
}

// ---------- Navire noir : vaisseau-squelette ----------

function navire(color, glow, seed) {
  const g = new THREE.Group();
  const dark = hull(0.74, 0.22, 0.1);
  dark.material = mat('#141010');
  g.add(dark);
  // Côtes de baleine en guise de coque.
  for (let i = 0; i < 7; i++) {
    const x = -0.3 + i * 0.1;
    const rib = new THREE.TorusGeometry(0.15, 0.011, 4, 10, Math.PI);
    rib.rotateX(Math.PI);
    rib.rotateY(Math.PI / 2);
    g.add(mesh(rib, mat(BONE), x, 0.2, 0));
  }
  for (const z of [-0.15, 0.15]) {
    g.add(tube([[-0.36, 0.22, z * 0.9], [0, 0.21, z], [0.34, 0.22, z * 0.9]], 0.013, BONE_DARK, 10));
  }
  // Mâchoire en proue.
  const jaw = new THREE.ConeGeometry(0.06, 0.24, 5);
  jaw.rotateZ(-Math.PI / 2);
  g.add(mesh(jaw, mat(BONE), 0.48, 0.18, 0));
  const lower = new THREE.ConeGeometry(0.04, 0.18, 5);
  lower.rotateZ(-Math.PI / 2 + 0.25);
  g.add(mesh(lower, mat(BONE_DARK), 0.44, 0.1, 0));
  // Mâts d'os et voiles de peau.
  for (const [x, h] of [[-0.1, 0.72], [0.16, 0.58]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.011, 0.015, h, 5), mat(BONE_DARK), x, 0.14 + h / 2, 0));
    const sail = tatteredSail(0.24, h * 0.5, seed + x * 7);
    sail.material = mat('#6b5a4a', { side: THREE.DoubleSide });
    sail.rotation.y = Math.PI / 2;
    sail.position.set(x + 0.02, 0.16 + h * 0.55, 0);
    g.add(sail);
  }
  // Lanternes dans la cage thoracique.
  for (const x of [-0.22, 0, 0.22]) g.add(mesh(new THREE.BoxGeometry(0.035, 0.04, 0.035), glowMat(glow, 4), x, 0.1, 0));
  g.add(light(color, 2.2, 2.6, 0, 0.15, 0));
  g.add(light(color, 1.2, 1.8, 0.4, 0.2, 0));
  return g;
}

const LAND = { acolyte, guetteur, harponneur, gardien, mortier };

export function unit(type, color, seed = 1) {
  const glow = mix(color, '#ffffff', 0.3);
  const g = new THREE.Group();
  g.add(baseRing(color));
  g.add((LAND[type] ?? acolyte)(color, glow, seed));
  return g;
}

export function vessel(kind, color, seed = 1) {
  const glow = mix(color, '#ffffff', 0.3);
  const g = new THREE.Group();
  g.add(kind === 'navire' ? navire(color, glow, seed) : barque(color, glow));
  g.position.y = WATER_LEVEL - 0.02;
  g.userData.bob = seed;
  return g;
}
