// IA des factions adverses. C'est un générateur : chaque `yield` correspond à
// une action, ce qui permet au rendu d'animer le tour de l'IA pas à pas.
import { chebyshev } from './map.js';
import { UNITS } from './data.js';

const RESEARCH_ORDER = [
  'cueillette', 'peche', 'navigation', 'mousquets', 'escrime', 'hautemer',
  'prospection', 'cartographie', 'galions', 'artillerie',
];

export function* aiTurn(game) {
  const f = game.current;

  // 1. Croissance : récolter tout ce qui est récoltable.
  for (const t of game.tiles) {
    if (t.owner === f.id && t.resource && !game.harvestError(t.x, t.y)) {
      game.harvest(t.x, t.y);
      yield { type: 'harvest', x: t.x, y: t.y };
    }
  }

  // 2. Unités : capturer, attaquer, avancer, attaquer.
  for (const u of [...game.unitsOf(f.id)]) {
    if (!game.units.includes(u) || game.result) continue;
    if (game.canCapture(u)) {
      game.capture(u);
      yield { type: 'capture', unit: u };
      continue;
    }
    if (tryAttack(game, u)) {
      yield { type: 'attack', unit: u };
      continue;
    }
    const s = game.stats(u);
    const threatened = game.units.some((o) => o.owner !== f.id && chebyshev(o, u) <= 2);
    if (u.hp <= s.maxHp * 0.4 && !threatened && game.canHeal(u)) {
      game.heal(u);
      yield { type: 'heal', unit: u };
      continue;
    }
    const dest = chooseDestination(game, u);
    if (dest) {
      game.moveUnit(u, dest.x, dest.y);
      yield { type: 'move', unit: u };
    }
    if (game.units.includes(u) && tryAttack(game, u)) yield { type: 'attack', unit: u };
  }

  // 3. Navires : passer aux galions quand c'est possible.
  for (const u of game.unitsOf(f.id)) {
    if (!game.upgradeError(u)) {
      game.upgradeShip(u);
      yield { type: 'upgrade', unit: u };
    }
  }

  // 4. Recrutement et recherche, en alternance selon la taille de l'armée.
  const armySmall = () => game.unitsOf(f.id).length < game.citiesOf(f.id).length * 2;
  if (armySmall()) yield* trainUnits(game, f);
  const tech = RESEARCH_ORDER.find((t) => !game.researchError(f.id, t));
  if (tech && f.stars - game.techCost(f.id, tech) >= 0) {
    game.research(tech);
    yield { type: 'research', tech };
  }
  yield* trainUnits(game, f);
}

function* trainUnits(game, f) {
  for (const city of game.rng.shuffle(game.citiesOf(f.id))) {
    const options = Object.keys(UNITS).filter((type) => !game.trainError(city, type));
    if (!options.length) continue;
    const scouts = game.unitsOf(f.id).filter((u) => u.type === 'eclaireur').length;
    const weights = options.map((type) => {
      if (type === 'eclaireur') return scouts < 1 ? 3 : 0.3;
      if (type === 'canonnier') return 1.2;
      return UNITS[type].cost;
    });
    let r = game.rng.next() * weights.reduce((a, b) => a + b, 0);
    const type = options.find((_, i) => (r -= weights[i]) <= 0) ?? options[0];
    game.train(city, type);
    yield { type: 'train', city };
  }
}

function tryAttack(game, u) {
  let best = null;
  let bestScore = 0;
  for (const target of game.attackTargets(u)) {
    const { damage, retaliation } = game.previewCombat(u, target);
    const kills = damage >= target.hp;
    const score = damage - retaliation + (kills ? 8 : 0) + (u.hp - retaliation <= 0 ? -20 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }
  if (best) game.attack(u, best);
  return !!best;
}

// Choisit la case atteignable qui rapproche le plus l'unité d'un objectif :
// villes à prendre, ennemis proches, sinon les zones inexplorées.
function chooseDestination(game, u) {
  const reach = game.reachable(u);
  if (!reach.size) return null;
  const fid = u.owner;
  const explored = (t) => game.isExplored(fid, t.x, t.y);

  let targets = game.cities.filter((c) => c.owner !== fid && explored(c));
  const enemies = game.units.filter((o) => o.owner !== fid && explored(o));
  const ownCities = game.citiesOf(fid);
  const raiders = enemies.filter((e) => ownCities.some((c) => chebyshev(c, e) <= 2));
  targets = [...targets, ...raiders];
  if (!targets.length) targets = enemies;
  let field = distanceField(game, u, targets);
  const here = field[u.y * game.size + u.x];
  if (!targets.length || here === Infinity) {
    const frontier = game.tiles.filter((t) => explored(t) && game.around(t.x, t.y).some((n) => !explored(n)));
    field = distanceField(game, u, frontier);
  }

  let best = null;
  let bestD = field[u.y * game.size + u.x];
  for (const step of reach.values()) {
    const d = field[step.y * game.size + step.x] + game.rng.next() * 0.5;
    if (d < bestD) {
      bestD = d;
      best = step;
    }
  }
  return best;
}

// Distance (en coups) de chaque case vers l'objectif le plus proche, en
// respectant les règles d'embarquement : on ne prend la mer que depuis un port.
function distanceField(game, u, targets) {
  const n = game.size * game.size;
  const dist = new Array(n).fill(Infinity);
  const sail = game.hasTech(u.owner, 'navigation') || !!u.vessel;
  const deep = game.hasTech(u.owner, 'hautemer') || u.vessel === 'galion';
  const passable = (t) => t.terrain === 'land' || (sail && (t.terrain === 'shallow' || deep));
  const isPort = (t) => t.city != null && game.city(t.city).owner === u.owner;
  const allowed = (a, b) => {
    if (!passable(a) || !passable(b)) return false;
    if (a.terrain === 'land' && b.terrain !== 'land') return isPort(a);
    return true;
  };
  const queue = [];
  for (const t of targets) {
    const k = t.y * game.size + t.x;
    if (dist[k] === Infinity) {
      dist[k] = 0;
      queue.push(game.tile(t.x, t.y));
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const b = queue[i];
    const db = dist[b.y * game.size + b.x];
    for (const a of game.around(b.x, b.y)) {
      const k = a.y * game.size + a.x;
      if (dist[k] !== Infinity || !allowed(a, b)) continue;
      dist[k] = db + (a.feature ? 1.5 : 1);
      queue.push(a);
    }
  }
  return dist;
}
