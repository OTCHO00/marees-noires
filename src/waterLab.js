// Page d'essai des styles de mer : une vraie partie, carte révélée, sur
// laquelle on change de mer en direct.
import { Game } from './core/game.js';
import { Renderer3D } from './three/renderer3d.js';
import { WATER_STYLES } from './three/water.js';

const $ = (s) => document.querySelector(s);
const players = [0, 1, 2].map((faction, i) => ({ faction, human: i === 0 }));
const game = new Game({ size: 16, players, seed: 7, reveal: true });
// Quelques marées pour avoir des côtes englouties à montrer.
for (let i = 0; i < 6; i++) game.tide();

const renderer = new Renderer3D($('#board'), game, 0);
const cap = game.citiesOf(0)[0];
renderer.centerOn(cap.x, cap.y, true);

const ids = Object.keys(WATER_STYLES);
let current = new URLSearchParams(location.search).get('eau') ?? ids[0];

function select(id) {
  current = id;
  renderer.sea.userData.setStyle(id);
  document.querySelectorAll('#styles button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  $('#menuLink').href = `/?eau=${id}`;
  history.replaceState(null, '', `?eau=${id}`);
}

$('#styles').innerHTML = ids.map((id, i) => `<button data-id="${id}"><b>${i + 1}. ${WATER_STYLES[id].name}</b><span>${WATER_STYLES[id].desc}</span></button>`).join('');
document.querySelectorAll('#styles button').forEach((b) => { b.onclick = () => select(b.dataset.id); });
window.addEventListener('keydown', (e) => {
  const i = Number(e.key) - 1;
  if (ids[i]) select(ids[i]);
});
select(current);

// Déplacement et zoom.
const canvas = $('#board');
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  renderer.panBy(e.clientX - drag.x, e.clientY - drag.y);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  renderer.zoomAt(e.deltaY > 0 ? 1.1 : 0.9, e.clientX, e.clientY);
}, { passive: false });
window.marees = { game, renderer };
