// Mise en scène 3D vue en isométrique : caméra orthographique, lune,
// brouillard, ombres et halo (bloom) pour faire rayonner les lanternes.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Angle isométrique classique : 45° autour de l'axe vertical, ~35° d'élévation.
const ISO_DIR = new THREE.Vector3(1, Math.SQRT2 * Math.tan((35.264 * Math.PI) / 180), 1).normalize();

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060c0d');
  // La caméra est à 30 unités de la cible : le brouillard n'avale que le lointain.
  scene.fog = new THREE.Fog('#071113', 31, 44);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const view = { target: new THREE.Vector3(), zoom: 7 }; // zoom = demi-hauteur visible en unités

  // Lumière froide de la lune et ciel nocturne.
  scene.add(new THREE.HemisphereLight('#4a6d75', '#05090a', 0.8));
  const moon = new THREE.DirectionalLight('#a9cbd1', 1.9);
  moon.position.set(-8, 14, -5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -12;
  moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 12;
  moon.shadow.camera.bottom = -12;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    const aspect = w / h;
    camera.left = -view.zoom * aspect;
    camera.right = view.zoom * aspect;
    camera.top = view.zoom;
    camera.bottom = -view.zoom;
    camera.updateProjectionMatrix();
  }

  function placeCamera() {
    camera.position.copy(view.target).addScaledVector(ISO_DIR, 30);
    camera.lookAt(view.target);
    moon.target.position.copy(view.target);
    moon.position.copy(view.target).add(new THREE.Vector3(-8, 14, -5));
  }

  window.addEventListener('resize', resize);
  resize();
  placeCamera();

  const updaters = new Set();
  const clock = new THREE.Clock();
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const fn of updaters) fn(t, dt);
    composer.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    THREE, renderer, scene, camera, view, composer,
    onFrame: (fn) => updaters.add(fn),
    setView(x, z, zoom = view.zoom) {
      view.target.set(x, 0, z);
      view.zoom = zoom;
      resize();
      placeCamera();
    },
    pan(dx, dz) {
      view.target.x += dx;
      view.target.z += dz;
      placeCamera();
    },
    zoomBy(f) {
      view.zoom = Math.min(14, Math.max(2.5, view.zoom * f));
      resize();
    },
    render: () => composer.render(),
  };
}
