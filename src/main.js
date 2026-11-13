// Point d'entrée : écran titre, création de la partie, entrées souris/tactile
// et enchaînement des tours (joueur puis IA).
import './style.css';
import './ui/menu.css';
import { Game } from './core/game.js';
import { aiTurn } from './core/ai.js';
import { FACTIONS } from './core/data.js';
import { Renderer3D } from './three/renderer3d.js';
import { Hud } from './ui/hud.js';
import { sigil } from './ui/sigil.js';
import { createMenuScene } from './three/menuScene.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZES = [
  { label: 'Petit', size: 14 },
  { label: 'Moyen', size: 18 },
  { label: 'Grand', size: 22 },
];

const setup = { faction: 0, rivals: 2, size: 18 };

const MOTTOS = [
  '«\u00a0Tant qu’une flamme brûle, la mer n’a pas gagné.\u00a0»',
  '«\u00a0Nous sommes nés de l’eau, nous y retournerons.\u00a0»',
  '«\u00a0Ce qui dort sous les flots a soif.\u00a0»',
  '«\u00a0Nous avons vu ce qui vient. Nous attendons.\u00a0»',
];

// ---------- Écran titre ----------

function picker(el, items, isActive, onPick) {
  const render = () => {
    el.innerHTML = '';
    items.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = item.html;
      if (item.color) b.style.setProperty('--pick', item.color);
      b.classList.toggle('on', isActive(item));
      b.setAttribute('aria-pressed', isActive(item));
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
  FACTIONS.map((f) => ({ id: f.id, color: f.color, html: `${sigil(f, 40, { line: true })}<span class="nm">${f.name}</span><span class="mt">${MOTTOS[f.id]}</span>` })),
  (i) => i.id === setup.faction,
  (i) => (setup.faction = i.id),
);
picker(
  $('#rivalPicker'),
  [1, 2, 3].map((n) => ({ n, html: String(n) })),
  (i) => i.n === setup.rivals,
  (i) => (setup.rivals = i.n),
);
picker(
  $('#sizePicker'),
  SIZES.map((s) => ({ ...s, html: s.label })),
  (i) => i.size === setup.size,
  (i) => (setup.size = i.size),
);

// Le menu : une scène 3D vivante, puis le choix de l'expédition.
// Mer « abysse » dans le menu, « aplats » en partie. La page d'essai
// (eau.html) peut imposer un autre style : ?eau=huile, etc.
const WATER = new URLSearchParams(location.search).get('eau') ?? undefined;
const menu = createMenuScene($('#menuScene'), { water: WATER ?? 'abysse' });
// Trois vues dans la même colonne ; la navigation latérale suit la vue
// active, et son point glisse vers l'entrée survolée.
const VIEWS = { home: '#menuMain', setup: '#menuSetup', rules: '#menuRulesPanel' };
const navFor = { home: 'home', setup: null, rules: 'rules' };
const dot = $('.mn-dot');
const moveDot = (btn) => {
  if (btn) dot.style.transform = `translateY(${btn.offsetTop + btn.offsetHeight / 2 - 3}px)`;
};
const navOn = () => $('.mn-nav button.on');
function showMenu(view, nav = navFor[view]) {
  Object.entries(VIEWS).forEach(([v, sel]) => $(sel).classList.toggle('hidden', v !== view));
  $('#startScreen').dataset.view = view;
  document.querySelectorAll('.mn-nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === nav));
  moveDot(navOn());
}
function openSetup(sandbox) {
  $('#sandbox').checked = sandbox;
  $('#reveal').checked = false;
  showMenu('setup', sandbox ? 'sandbox' : 'new');
}
$('#menuNew').onclick = () => openSetup(false);
$('#menuSandbox').onclick = () => openSetup(true);
document.querySelectorAll('.mn-nav button').forEach((b) => {
  b.onclick = () => ({ home: () => showMenu('home'), new: () => openSetup(false), sandbox: () => openSetup(true), rules: () => showMenu('rules') })[b.dataset.go]();
  b.onmouseenter = () => moveDot(b);
  b.onfocus = () => moveDot(b);
});
$('.mn-nav').onmouseleave = () => moveDot(navOn());
$('[data-rules]').onclick = () => showMenu('rules');
document.querySelectorAll('[data-back]').forEach((b) => {
  b.onclick = () => showMenu('home');
});
document.fonts.ready.then(() => moveDot(navOn()));
const menuKeys = (e) => {
  if (e.target.closest?.('button') && e.key === 'Enter') return; // le bouton focalisé agit seul
  if (e.key === 'Enter') {
    if (!$('#menuSetup').classList.contains('hidden')) $('#startBtn').click();
    else openSetup(false);
  } else if (e.key === 'Escape') {
    showMenu('home');
  }
};
window.addEventListener('keydown', menuKeys);

$('#startBtn').onclick = () => {
  window.removeEventListener('keydown', menuKeys);
  menu.dispose();
  $('#startScreen').classList.add('hidden');
  startGame();
};
$('#restartBtn').onclick = () => location.reload();

// ---------- Partie ----------

function startGame() {
  const others = FACTIONS.filter((f) => f.id !== setup.faction).slice(0, setup.rivals);
  const players = [{ faction: setup.faction, human: true }, ...others.map((f) => ({ faction: f.id }))];
  const game = new Game({ size: setup.size, players, sandbox: $('#sandbox').checked, reveal: $('#reveal').checked });
  const me = setup.faction;
  const renderer = new Renderer3D($('#board'), game, me, { water: WATER });
  const hud = new Hud(game, renderer, me);
  window.marees = { game, renderer, hud }; // pratique pour déboguer dans la console

  const capital = game.citiesOf(me)[0];
  renderer.centerOn(capital.x, capital.y, true);
  renderer.setZoom(window.innerWidth < 720 ? 4.2 : 3.6);
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
    : r.reason === 'awakening'
      ? (won ? 'Ce qui dormait sous l’archipel s’est éveillé à ton appel. Plus rien ne peut s’opposer à ton culte.' : `${winner.name} ont réveillé le Dormeur. L’archipel leur appartient.`)
      : r.reason === 'score'
      ? (won ? 'Après trente marées, ton culte brille plus fort que tous les autres.' : `Après trente marées, ${winner.name} l’emportent.`)
      : 'Ta dernière cité est tombée. La brume a tout recouvert.';
  $('#scoreTable').innerHTML = [...game.factions]
    .sort((a, b) => game.score(b.id) - game.score(a.id))
    .map((f) => `<tr><td>${sigil(f, 28, { line: true })}<span>${f.name}${f.alive ? '' : ' · éteint'}</span></td><td>${game.score(f.id)}</td></tr>`)
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
      drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      renderer.zoomAt(pinch / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d;
      return;
    }
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag.moved = true;
        canvas.classList.add('dragging');
      }
      if (drag.moved) renderer.panBy(e.clientX - drag.lastX, e.clientY - drag.lastY);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
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
  canvas.addEventListener('pointerleave', () => hud.handleHover(null, null, 0, 0));

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    renderer.zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY);
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
