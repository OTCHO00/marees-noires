import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { generateMap } from '../src/core/map.js';
import { aiTurn } from '../src/core/ai.js';

const players = [{ faction: 0, human: true }, { faction: 1 }, { faction: 2 }];

test('la génération est déterministe pour une même graine', () => {
  const a = generateMap({ size: 16, factions: 3, seed: 42 });
  const b = generateMap({ size: 16, factions: 3, seed: 42 });
  assert.deepEqual(a.tiles, b.tiles);
  assert.equal(a.capitals.length, 3);
});

test('chaque faction démarre avec une capitale et un acolyte', () => {
  const g = new Game({ size: 16, players, seed: 7 });
  for (const f of g.factions) {
    assert.equal(g.citiesOf(f.id).length, 1);
    assert.ok(g.citiesOf(f.id)[0].capital);
    assert.equal(g.unitsOf(f.id).length, 1);
  }
});

test('un acolyte ne se déplace que d’une case', () => {
  const g = new Game({ size: 16, players, seed: 3 });
  const u = g.unitsOf(0)[0];
  for (const step of g.reachable(u).values()) assert.ok(Math.max(Math.abs(step.x - u.x), Math.abs(step.y - u.y)) <= 1);
});

test('le combat inflige des dégâts et la riposte', () => {
  const g = new Game({ size: 16, players, seed: 5 });
  const a = g.unitsOf(0)[0];
  const d = g.unitsOf(1)[0];
  d.x = a.x + 1; d.y = a.y; // placement artificiel côte à côte
  g.tile(d.x, d.y).terrain = 'land'; g.tile(d.x, d.y).feature = null; g.tile(d.x, d.y).city = null;
  g.reveal(0, a.x, a.y, 2);
  const { damage, retaliation } = g.attack(a, d);
  assert.equal(damage, 5);
  assert.equal(d.hp, 5);
  assert.ok(retaliation > 0);
});

test('récolter fait grandir la ville', () => {
  const g = new Game({ size: 16, players, seed: 11 });
  const f = g.current;
  f.techs.add('pillage');
  f.stars = 20;
  const cap = g.citiesOf(f.id)[0];
  const epave = g.around(cap.x, cap.y).find((t) => t.resource === 'epave');
  assert.ok(epave, 'la capitale a des cocotiers');
  assert.ok(g.harvest(epave.x, epave.y));
  assert.equal(cap.pop, 1);
});

test('des parties IA contre IA se terminent sans erreur', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = new Game({ size: 16, players: [{ faction: 0 }, { faction: 1 }, { faction: 2 }, { faction: 3 }], seed });
    while (!g.result) {
      for (const _ of aiTurn(g)) { /* exécute le tour */ }
      g.endTurn();
    }
    assert.ok(g.result.winner != null);
  }
});

test('la marée fait sombrer puis engloutit des côtes', () => {
  const g = new Game({ size: 16, players, seed: 9 });
  g.tide();
  const doomed = g.tiles.filter((t) => t.sink === 1);
  assert.ok(doomed.length >= 1);
  assert.ok(doomed.every((t) => t.terrain === 'land' && t.city == null));
  const t = doomed[0];
  for (let i = 0; i < 3; i++) g.tide();
  assert.equal(t.terrain, 'shallow');
  assert.equal(t.sink, 0);
});

test('une unité sur une île engloutie embarque en barque', () => {
  const g = new Game({ size: 16, players, seed: 9 });
  const u = g.unitsOf(0)[0];
  const t = g.around(u.x, u.y).find((n) => n.terrain === 'land' && n.city == null);
  u.x = t.x; u.y = t.y;
  g.submerge(t);
  assert.equal(u.vessel, 'barque');
});

test('le bac à sable révèle la carte et rend tout gratuit', () => {
  const g = new Game({ size: 16, players, seed: 4, sandbox: true });
  const me = g.current;
  assert.equal(me.explored.size, 16 * 16);
  const cap = g.citiesOf(me.id)[0];
  g.unitAt(cap.x, cap.y).x += 1; // libère la cité
  assert.ok(g.research('harpons'));
  assert.ok(g.train(cap, 'harponneur'));
  assert.equal(me.stars, 9999);
});

test('les savoirs de la Foi et de la Lumière ont un effet', () => {
  const g = new Game({ size: 16, players, seed: 12 });
  const f = g.current;
  f.stars = 200;
  const before = g.income(f.id);
  assert.ok(g.research('liturgie'));
  assert.equal(g.income(f.id), before + 1);
  for (const t of ['guet', 'phares', 'sourdes', 'oeil']) assert.ok(g.research(t), t);
  assert.equal(f.explored.size, 16 * 16);
});

test('le sacrifice rapporte de l’huile et l’Éveil fait gagner', () => {
  const g = new Game({ size: 16, players, seed: 13 });
  const f = g.current;
  f.stars = 500;
  for (const t of ['liturgie', 'processions', 'sacrifice']) assert.ok(g.research(t), t);
  const u = g.unitsOf(f.id)[0];
  u.moved = false;
  u.attacked = false;
  const stars = f.stars;
  assert.ok(g.sacrifice(u));
  assert.equal(f.stars, stars + 5);
  assert.ok(g.research('eveil'));
  assert.deepEqual(g.result, { winner: f.id, reason: 'awakening' });
});

test('les digues protègent le territoire de la marée', () => {
  const g = new Game({ size: 16, players, seed: 9 });
  for (const f of g.factions) f.techs.add('digues');
  for (let i = 0; i < 4; i++) g.tide();
  assert.ok(g.tiles.every((t) => !(t.sink && t.owner != null)));
});
