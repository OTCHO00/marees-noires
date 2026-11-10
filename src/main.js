// Point d'entrée : écran titre, création de la partie, entrées souris/tactile
// et enchaînement des tours (joueur puis IA).
import './style.css';
import { Game } from './core/game.js';
import { aiTurn } from './core/ai.js';
import { FACTIONS } from './core/data.js';
import { Renderer } from './render/renderer.js';
import { Hud } from './ui/hud.js';
import { sigil } from './ui/sigil.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZES = [
  { label: 'Petit', size: 14 },
  { label: 'Moyen', size: 18 },
  { label: 'Grand', size: 22 },
];

const setup = { faction: 0, rivals: 2, size: 18 };

// ---------- Écran titre ----------

function picker(el, items, isActive, onPick) {
  const render = () => {
    el.innerHTML = '';
    items.forEach((item) => {
      const b = document.createElement('button');
      b.innerHTML = item.html;
      if (item.color) b.style.setProperty('--pick', item.color);
      b.classList.toggle('active', isActive(item));
      b.onclick = () => {
        onPick(item);
        render();
      };
      el.appendChild(b);
    });
  };
  render();
}

picker(
  $('#factionPicker'),
  FACTIONS.map((f) => ({ id: f.id, color: f.color, html: `${sigil(f, 44)}${f.name}` })),
  (i) => i.id === setup.faction,
  (i) => (setup.faction = i.id),
);
picker(
  $('#rivalPicker'),
  [1, 2, 3].map((n) => ({ n, html: `${n} culte${n > 1 ? 's' : ''}` })),
  (i) => i.n === setup.rivals,
  (i) => (setup.rivals = i.n),
);
picker(
  $('#sizePicker'),
  SIZES.map((s) => ({ ...s, html: s.label })),
  (i) => i.size === setup.size,
  (i) => (setup.size = i.size),
);

$('#startBtn').onclick = () => {
  $('#startScreen').classList.add('hidden');
  startGame();
};
$('#restartBtn').onclick = () => location.reload();

// ---------- Partie ----------

function startGame() {
  const others = FACTIONS.filter((f) => f.id !== setup.faction).slice(0, setup.rivals);
  const players = [{ faction: setup.faction, human: true }, ...others.map((f) => ({ faction: f.id }))];
  const game = new Game({ size: setup.size, players });
  const me = setup.faction;
  const renderer = new Renderer($('#board'), game, me);
  const hud = new Hud(game, renderer, me);
  window.marees = { game, renderer, hud }; // pratique pour déboguer dans la console

  const capital = game.citiesOf(me)[0];
  renderer.centerOn(capital.x, capital.y, true);
  renderer.camera.zoom = window.innerWidth < 720 ? 0.7 : 1;
  hud.toast('Ta lanterne est allumée. Explore la brume et rallume les sanctuaires.');

  game.on((e) => {
    if (e.type === 'gameover') setTimeout(() => showEnd(game, me), 900);
  });

  hud.onEndTurn = async () => {
    if (!hud.myTurn) return;
    game.endTurn();
    await runAI(game, renderer, hud);
  };

  bindInput(renderer, hud);
}

async function runAI(game, renderer, hud) {
  hud.lock(true);
  while (!game.result && !game.current.human) {
    const f = game.current;
    hud.banner(f);
    for (const step of aiTurn(game)) {
      const pos = step.unit ?? step.city ?? (step.x != null ? step : null);
      if (pos && renderer.visible(pos.x, pos.y)) {
        await sleep(260);
        while (renderer.busy()) await sleep(30);
      }
    }
    await sleep(150);
    game.endTurn();
  }
  hud.banner(null);
  hud.lock(false);
  if (!game.result) hud.toast(`Tour ${game.turn} : les feux se rallument.`);
}

function showEnd(game, me) {
  const r = game.result;
  const won = r.winner === me;
  $('#endTitle').textContent = won ? 'Ta flamme demeure' : 'Ta flamme s’éteint';
  const winner = r.winner != null ? game.faction(r.winner) : null;
  $('#endReason').textContent = r.reason === 'conquest'
    ? (won ? 'Tous les autres feux se sont éteints. L’archipel n’obéit plus qu’à toi.' : `${winner.name} règnent seuls sur l’archipel.`)
    : r.reason === 'score'
      ? (won ? 'Après trente marées, ton culte brille plus fort que tous les autres.' : `Après trente marées, ${winner.name} l’emportent.`)
      : 'Ta dernière cité est tombée. La brume a tout recouvert.';
  $('#scoreTable').innerHTML = [...game.factions]
    .sort((a, b) => game.score(b.id) - game.score(a.id))
    .map((f) => `<tr><td>${sigil(f, 26)}${f.name}${f.alive ? '' : ' · éteint'}</td><td>${game.score(f.id)}</td></tr>`)
    .join('');
  $('#endScreen').classList.remove('hidden');
}

// ---------- Souris, tactile et clavier ----------

function bindInput(renderer, hud) {
  const canvas = $('#board');
  const pointers = new Map();
  let drag = null;
  let pinch = null;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, camX: renderer.camera.x, camY: renderer.camera.y, moved: false };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: renderer.camera.zoom };
      drag = null;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = (pinch.zoom * (d / pinch.dist)) / renderer.camera.zoom;
      renderer.camera.zoomAt(factor, (a.x + b.x) / 2, (a.y + b.y) / 2, renderer.w, renderer.h);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) {
        drag.moved = true;
        canvas.classList.add('dragging');
      }
      if (drag.moved) {
        renderer.camera.target = null;
        renderer.camera.x = drag.camX - dx / renderer.camera.zoom;
        renderer.camera.y = drag.camY - dy / renderer.camera.zoom;
      }
      return;
    }
    const t = renderer.pick(e.clientX, e.clientY);
    hud.handleHover(t?.x, t?.y, e.clientX, e.clientY);
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    canvas.classList.remove('dragging');
    if (pointers.size < 2) pinch = null;
    if (drag && !drag.moved && e.type === 'pointerup') {
      const t = renderer.pick(e.clientX, e.clientY);
      if (t) hud.handleClick(t.x, t.y);
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    renderer.camera.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, renderer.w, renderer.h);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hud.closeTech();
      hud.select(null);
    } else if (e.key === 'Enter') {
      hud.onEndTurn?.();
    } else if (e.key.toLowerCase() === 't') {
      if ($('#techModal').classList.contains('hidden')) hud.openTech();
      else hud.closeTech();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      hud.cycleUnits();
    }
  });
}
