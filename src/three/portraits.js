// Portraits 3D pour l'interface : les vrais modèles du jeu, rendus hors
// écran par un seul contexte WebGL. Deux usages :
//   - `portrait()` : une image fixe mise en cache (vignettes de recrutement,
//     fiche des savoirs) ;
//   - `Vitrine` : un petit plateau vivant où le modèle choisi respire et
//     pivote doucement (en tête du panneau de sélection).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as M from './models.js';
import * as B from './buildings.js';
import * as U from './units.js';
import { tileModel } from './renderer3d.js';

// Vue de trois quarts, un peu plus basse que la caméra du plateau.
const VIEW_DIR = new THREE.Vector3(0.75, 0.62, 1.25).normalize();
const FOV = 26;

// ---------- Ce qu'on peut montrer ----------

// Un sujet décrit un modèle : { kind: 'unit' | 'vessel' | 'city' | 'sanctuary' | 'tile', ... }.
export function subjectKey(s) {
  return JSON.stringify(s);
}

// `floor` : sous cette hauteur, le socle de roche sort du cadre (le dessus
// de la case compte, pas ses fondations).
const ROCK_FLOOR = M.LAND_TOP - 0.12;

function build(s) {
  if (s.kind === 'unit') return U.unit(s.type, s.color, s.seed ?? 3);
  if (s.kind === 'vessel') {
    const g = new THREE.Group();
    const v = U.vessel(s.type, s.color, s.seed ?? 3);
    v.rotation.y = -0.5; // la proue vers le spectateur
    g.add(v, waterSlab(1.3));
    return focus(g, v);
  }
  if (s.kind === 'city' || s.kind === 'sanctuary') {
    const g = new THREE.Group();
    g.add(M.landBlock(s.seed ?? 5));
    g.add(s.kind === 'city'
      ? B.city({ level: s.level, capital: s.capital, color: s.color, light: s.light, seed: s.seed ?? 5 })
      : M.sanctuary());
    g.userData.floor = ROCK_FLOOR;
    return g;
  }
  if (s.kind === 'tile') {
    const g = tileModel(s.tile, s.seed ?? 11);
    if (!g) return null;
    if (s.tile.terrain === 'land') {
      g.userData.floor = ROCK_FLOOR;
      return g;
    }
    // En mer, on cadre la ressource plutôt que l'eau autour.
    const res = g.children[0];
    g.add(waterSlab(1));
    return focus(g, res);
  }
  return null;
}

// Cadre le modèle sur une de ses parties (le navire, pas l'eau autour).
function focus(group, part) {
  group.updateMatrixWorld(true);
  group.userData.box = new THREE.Box3().setFromObject(part).expandByScalar(0.08);
  return group;
}

// Un pavé d'eau sombre sous les navires et la nacre.
function waterSlab(size) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), M.mat('#10292a', { roughness: 0.35 }));
  m.position.y = M.WATER_LEVEL - 0.15;
  return m;
}

// Fusionne comme le plateau, puis rallume les lanternes du modèle.
function prepare(model) {
  const b = M.bake(model);
  for (const e of b.userData.emitters) {
    const l = new THREE.PointLight(e.color, e.intensity * 0.55, e.distance * 1.2, 1.8);
    l.position.copy(e.local);
    b.add(l);
  }
  b.userData.floor = model.userData.floor;
  b.userData.box = model.userData.box;
  return b;
}

// ---------- Contexte de rendu partagé ----------

let ctx = null;

function context() {
  if (ctx) return ctx;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.background = backdrop();
  scene.add(new THREE.HemisphereLight('#4a6d75', '#05090a', 1.1));
  const moon = new THREE.DirectionalLight('#a9cbd1', 1.7);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 30 });
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  // Une lueur froide côté spectateur pour que les silhouettes se lisent.
  const fill = new THREE.DirectionalLight('#9fc3c9', 0.85);
  scene.add(moon, moon.target, fill, fill.target);

  // Sol invisible qui ne garde que l'ombre portée.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  ctx = { canvas, renderer, scene, camera, moon, fill, ground, composers: new Map(), size: '' };
  return ctx;
}

// Fond : un halo de brume au centre, la nuit sur les bords.
function backdrop() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 150, 10, 128, 140, 190);
  grad.addColorStop(0, '#1a2c2e');
  grad.addColorStop(0.55, '#0d191b');
  grad.addColorStop(1, '#060c0d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function composerFor(w, h) {
  const { renderer, scene, camera, composers } = ctx;
  const key = `${w}x${h}`;
  if (!composers.has(key)) {
    const composer = new EffectComposer(renderer);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.35, 0.9));
    composer.addPass(new OutputPass());
    composers.set(key, composer);
  }
  if (ctx.size !== key) {
    renderer.setSize(w, h, false);
    ctx.size = key;
  }
  return composers.get(key);
}

// Cadre la caméra sur le modèle (posé dans la scène) et place les lumières.
function frame(model, aspect, zoom = 1) {
  const { camera, moon, fill, ground } = ctx;
  const full = new THREE.Box3().setFromObject(model);
  const bottom = full.min.y;
  const box = model.userData.box?.clone() ?? full;
  if (model.userData.floor != null) box.min.y = Math.max(box.min.y, model.userData.floor);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  // Les modèles hauts et fins remplissent mieux le cadre en se fiant à leur boîte.
  const size = box.getSize(new THREE.Vector3());
  const half = Math.max(size.y * 0.7, (Math.hypot(size.x, size.z) * 0.56) / aspect, sphere.radius * 0.6);
  const dist = (half / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / zoom;
  camera.aspect = aspect;
  camera.position.copy(center).addScaledVector(VIEW_DIR, dist);
  camera.near = Math.max(0.01, dist - sphere.radius * 3);
  camera.far = dist + sphere.radius * 4;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  ground.position.y = bottom + 0.001;
  moon.target.position.copy(center);
  moon.position.copy(center).add(new THREE.Vector3(-4, 7, -2.5));
  fill.target.position.copy(center);
  fill.position.copy(center).add(new THREE.Vector3(3, 2, 6));
}

// ---------- Images fixes ----------

const cache = new Map();

// Rend un sujet en image (data URL), une seule fois par taille. `w`/`h` en
// pixels CSS ; le rendu suit la densité de l'écran.
export function portrait(subject, w = 56, h = w) {
  const key = `${subjectKey(subject)}|${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const model = build(subject);
  if (!model) return null;
  context();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  const root = prepare(model);
  ctx.scene.add(root);
  root.updateMatrixWorld(true);
  frame(root, w / h, subject.zoom ?? 1);
  U.animateParts(root, 1.3);
  composerFor(pw, ph).render();
  const url = ctx.canvas.toDataURL('image/png');
  M.disposeGroup(root);
  cache.set(key, url);
  return url;
}

// Prépare des images pendant que le navigateur est inoccupé.
export function warm(subjects, w, h) {
  const queue = [...subjects];
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 60));
  const step = () => {
    const s = queue.shift();
    if (!s) return;
    portrait(s, w, h);
    idle(step);
  };
  idle(step);
}

// ---------- Vitrine vivante ----------

export class Vitrine {
  constructor() {
    this.el = document.createElement('canvas');
    this.el.className = 'vitrine-canvas';
    this.g2d = this.el.getContext('2d');
    this.key = null;
    this.root = null;
    this.running = false;
    this.last = 0;
    this.t0 = performance.now();
    this.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Montre un sujet ; garde le modèle courant s'il n'a pas changé.
  show(subject) {
    const key = subject ? subjectKey(subject) : null;
    if (key !== this.key) {
      this.clear();
      this.key = key;
      const model = subject && build(subject);
      if (model) {
        context();
        this.root = prepare(model);
        this.zoom = subject.zoom ?? 1;
      }
    }
    if (this.root && !this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.tick(t));
    }
    return Boolean(this.root);
  }

  clear() {
    if (this.root) M.disposeGroup(this.root);
    this.root = null;
    this.key = null;
  }

  stop() {
    this.running = false;
  }

  tick(now) {
    if (!this.running || !this.root) {
      this.running = false;
      return;
    }
    if (!this.el.isConnected) {
      this.running = false;
      return;
    }
    requestAnimationFrame((t) => this.tick(t));
    // 30 images par seconde suffisent pour une vignette.
    if (now - this.last < 33) return;
    this.last = now;
    this.draw((now - this.t0) / 1000);
  }

  draw(t) {
    const rect = this.el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(rect.width * dpr);
    const ph = Math.round(rect.height * dpr);
    if (this.el.width !== pw || this.el.height !== ph) {
      this.el.width = pw;
      this.el.height = ph;
    }
    const root = this.root;
    ctx.scene.add(root);
    // Cadrage au repos (sinon la caméra suivrait la rotation), puis le modèle
    // se balance lentement de trois quarts, sans jamais tourner le dos.
    root.rotation.y = 0;
    root.updateMatrixWorld(true);
    frame(root, rect.width / rect.height, this.zoom);
    root.rotation.y = this.still ? 0 : Math.sin(t * 0.35) * 0.55;
    U.animateParts(root, this.still ? 1.3 : t);
    composerFor(pw, ph).render();
    this.g2d.clearRect(0, 0, pw, ph);
    this.g2d.drawImage(ctx.canvas, 0, 0, pw, ph);
    ctx.scene.remove(root);
  }
}
