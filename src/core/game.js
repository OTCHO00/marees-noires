// Moteur de règles. Aucune dépendance au DOM : tout est testable sous Node.
import { generateMap, chebyshev } from './map.js';
import { FACTIONS, UNITS, VESSELS, RESOURCES, TECHS, CITY_NAMES, RULES } from './data.js';
import { createRng } from './rng.js';

const TECH_BASE_COST = [0, 4, 6, 9, 14];

export class Game {
  constructor({ size = 16, players = [{ faction: 0, human: true }, { faction: 1 }], seed, sandbox = false } = {}) {
    this.seed = seed ?? Math.floor(Math.random() * 1e9);
    // Bac à sable : le joueur humain voit toute la carte, ne paie rien et
    // n'a pas de limite de fidèles par cité. Pratique pour tester.
    this.sandbox = sandbox;
    this.rng = createRng(this.seed ^ 0x9e3779b9);
    const map = generateMap({ size, factions: players.length, seed: this.seed });
    this.size = size;
    this.tiles = map.tiles;
    this.cities = [];
    this.units = [];
    this.nextId = 1;
    this.turn = 1;
    this.currentIndex = 0;
    this.result = null;
    this.nextTide = RULES.firstTide;
    this.listeners = new Set();
    this.names = this.rng.shuffle([...CITY_NAMES]);
    for (const t of this.tiles) t.sink = 0;
    this.factions = players.map((p) => ({
      ...FACTIONS[p.faction],
      human: !!p.human,
      stars: RULES.startStars,
      techs: new Set(),
      explored: new Set(),
      alive: true,
      kills: 0,
    }));

    map.capitals.forEach((pos, i) => {
      const f = this.factions[i];
      const city = this.createCity(pos.x, pos.y, f.id, true);
      this.spawnUnit('acolyte', city);
      this.reveal(f.id, pos.x, pos.y, 2);
    });
    map.villages.forEach((pos) => this.createCity(pos.x, pos.y, null, false));
    if (sandbox) {
      for (const f of this.factions.filter((x) => x.human)) {
        f.stars = 9999;
        this.tiles.forEach((_, i) => f.explored.add(i));
      }
    }
    this.beginTurn(this.current, { income: false });
  }

  // ---------- Accès ----------

  get current() {
    return this.factions[this.currentIndex];
  }

  faction(id) {
    return this.factions.find((f) => f.id === id);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  tile(x, y) {
    return this.inBounds(x, y) ? this.tiles[y * this.size + x] : null;
  }

  around(x, y, r = 1) {
    const out = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if ((dx || dy) && this.inBounds(x + dx, y + dy)) out.push(this.tile(x + dx, y + dy));
      }
    }
    return out;
  }

  unitAt(x, y) {
    return this.units.find((u) => u.x === x && u.y === y) ?? null;
  }

  cityAt(x, y) {
    const t = this.tile(x, y);
    return t && t.city != null ? this.city(t.city) : null;
  }

  city(id) {
    return this.cities.find((c) => c.id === id) ?? null;
  }

  citiesOf(fid) {
    return this.cities.filter((c) => c.owner === fid);
  }

  unitsOf(fid) {
    return this.units.filter((u) => u.owner === fid);
  }

  hasTech(fid, tech) {
    return this.faction(fid).techs.has(tech);
  }

  isExplored(fid, x, y) {
    return this.faction(fid).explored.has(y * this.size + x);
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event) {
    for (const fn of this.listeners) fn(event);
  }

  // ---------- Villes et territoire ----------

  createCity(x, y, owner, capital) {
    const city = { id: this.nextId++, x, y, owner, capital, level: 1, pop: 0, name: this.names.pop() ?? 'Crique' };
    this.cities.push(city);
    const t = this.tile(x, y);
    t.city = city.id;
    t.feature = null;
    t.resource = null;
    if (owner != null) this.claimTerritory(city, 1);
    return city;
  }

  claimTerritory(city, radius) {
    const own = this.tile(city.x, city.y);
    for (const t of [own, ...this.around(city.x, city.y, radius)]) {
      if (t.city != null && t.city !== city.id) continue;
      if (t.region == null || t.region === city.id) {
        t.region = city.id;
        t.owner = city.owner;
      }
    }
  }

  income(fid) {
    const liturgy = this.hasTech(fid, 'liturgie') ? 1 : 0;
    return this.citiesOf(fid).reduce((sum, c) => sum + c.level + (c.capital ? 1 + liturgy : 0), 0);
  }

  addPop(city, amount) {
    city.pop += amount;
    while (city.pop >= city.level + 1) {
      city.pop -= city.level + 1;
      city.level++;
      if (city.level === 2 && city.owner != null) this.faction(city.owner).stars += RULES.levelTwoBonus;
      if (city.level === 3) this.claimTerritory(city, 2);
      this.emit({ type: 'levelup', city });
    }
  }

  // ---------- Unités ----------

  spawnUnit(type, city) {
    const unit = {
      id: this.nextId++, type, owner: city.owner, x: city.x, y: city.y,
      hp: UNITS[type].hp, vessel: null, home: city.id, moved: true, attacked: true,
    };
    this.units.push(unit);
    return unit;
  }

  stats(u) {
    const base = UNITS[u.type];
    if (u.vessel) {
      const v = VESSELS[u.vessel];
      return { name: v.name, atk: v.atk, def: v.def, move: v.move, range: v.range, maxHp: base.hp, deep: v.deep };
    }
    return { name: base.name, atk: base.atk, def: base.def, move: base.move, range: base.range, maxHp: base.hp, deep: false };
  }

  visionRadius(u) {
    const t = this.tile(u.x, u.y);
    return t.feature === 'falaise' || u.vessel || u.type === 'guetteur' ? 2 : 1;
  }

  reveal(fid, x, y, r) {
    const f = this.faction(fid);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (this.inBounds(x + dx, y + dy)) f.explored.add((y + dy) * this.size + x + dx);
      }
    }
  }

  canEnterWater(u, tile, isBoat) {
    if (tile.terrain === 'deep' && !(isBoat && this.stats(u).deep) && !this.hasTech(u.owner, 'abysses')) return false;
    return true;
  }

  // Cases atteignables ce tour-ci (parcours en largeur). Les forêts et
  // montagnes stoppent le déplacement, tout comme embarquer/débarquer et
  // la zone de contrôle des ennemis.
  reachable(u) {
    const result = new Map();
    if (u.moved) return result;
    const s = this.stats(u);
    const key = (x, y) => y * this.size + x;
    const nearEnemy = (x, y) => this.around(x, y).some((t) => {
      const o = this.unitAt(t.x, t.y);
      return o && o.owner !== u.owner;
    });
    const queue = [{ x: u.x, y: u.y, cost: 0, boat: !!u.vessel, stop: false }];
    const seen = new Set([key(u.x, u.y)]);
    while (queue.length) {
      const cur = queue.shift();
      if (cur.stop || cur.cost >= s.move) continue;
      if (cur.cost > 0 && nearEnemy(cur.x, cur.y)) continue;
      const from = this.tile(cur.x, cur.y);
      for (const n of this.around(cur.x, cur.y)) {
        const k = key(n.x, n.y);
        if (seen.has(k) || this.unitAt(n.x, n.y)) continue;
        let stop = false;
        let boat = cur.boat;
        if (n.terrain === 'land') {
          if (cur.boat) stop = true;
          if (n.feature) stop = true;
          boat = false;
        } else if (!cur.boat) {
          const port = from.city != null && this.city(from.city).owner === u.owner;
          if (!port || !this.hasTech(u.owner, 'navigation') || !this.canEnterWater(u, n, false)) continue;
          stop = true;
          boat = true;
        } else if (!this.canEnterWater(u, n, true)) {
          continue;
        }
        seen.add(k);
        result.set(k, { x: n.x, y: n.y, prev: key(cur.x, cur.y), cost: cur.cost + 1 });
        queue.push({ x: n.x, y: n.y, cost: cur.cost + 1, boat, stop });
      }
    }
    return result;
  }

  moveUnit(u, x, y) {
    if (u.owner !== this.current.id || this.result) return null;
    const reach = this.reachable(u);
    let k = y * this.size + x;
    if (!reach.has(k)) return null;
    const path = [];
    while (reach.has(k)) {
      const step = reach.get(k);
      path.unshift({ x: step.x, y: step.y });
      k = step.prev;
    }
    path.unshift({ x: u.x, y: u.y });
    u.x = x;
    u.y = y;
    const t = this.tile(x, y);
    if (t.terrain === 'land') u.vessel = null;
    else if (!u.vessel) u.vessel = 'barque';
    u.moved = true;
    this.reveal(u.owner, x, y, this.visionRadius(u));
    this.emit({ type: 'move', unit: u, path });
    return path;
  }

  defenseBonus(u) {
    if (u.vessel) return 1;
    const t = this.tile(u.x, u.y);
    if (t.city != null && this.city(t.city).owner === u.owner) return RULES.cityDefenseBonus;
    if (t.feature) return RULES.defenseBonus;
    return 1;
  }

  // Une unité ennemie se voit si sa case est explorée, sauf si son culte
  // maîtrise les Lanternes sourdes : il faut alors être à son contact.
  unitVisibleTo(fid, u) {
    if (u.owner === fid) return true;
    if (!this.isExplored(fid, u.x, u.y)) return false;
    if (!this.hasTech(u.owner, 'sourdes')) return true;
    return this.unitsOf(fid).some((o) => chebyshev(o, u) <= 1) || this.citiesOf(fid).some((c) => chebyshev(c, u) <= 1);
  }

  attackTargets(u) {
    if (u.attacked) return [];
    const { range } = this.stats(u);
    return this.units.filter((o) =>
      o.owner !== u.owner && chebyshev(u, o) <= range && this.unitVisibleTo(u.owner, o));
  }

  // Formule inspirée de Polytopia : la force dépend des PV restants.
  previewCombat(att, def) {
    const as = this.stats(att);
    const ds = this.stats(def);
    // Chant de la Masse : +1 attaque à côté d'un Gardien allié.
    const chant = this.hasTech(att.owner, 'chant')
      && this.units.some((o) => o !== att && o.owner === att.owner && o.type === 'gardien' && !o.vessel && chebyshev(o, att) <= 1);
    const atk = as.atk + (chant ? 1 : 0);
    const aForce = atk * (att.hp / as.maxHp);
    const dForce = ds.def * (def.hp / ds.maxHp) * this.defenseBonus(def);
    const total = aForce + dForce || 1;
    const damage = Math.round((aForce / total) * atk * RULES.combatScale);
    let retaliation = 0;
    if (def.hp - damage > 0 && chebyshev(att, def) <= ds.range) {
      retaliation = Math.round((dForce / total) * ds.def * RULES.combatScale);
    }
    return { damage, retaliation };
  }

  attack(att, def) {
    if (att.owner !== this.current.id || this.result) return null;
    if (!this.attackTargets(att).includes(def)) return null;
    const { damage, retaliation } = this.previewCombat(att, def);
    const ranged = chebyshev(att, def) > 1;
    def.hp -= damage;
    att.attacked = true;
    att.moved = true;
    this.emit({ type: 'attack', attacker: att, defender: def, damage, ranged });
    if (def.hp <= 0) {
      this.kill(def, att);
      const t = this.tile(def.x, def.y);
      const canFollow = !ranged && this.stats(att).range === 1 && (t.terrain === 'land') === !att.vessel;
      if (canFollow) {
        const from = { x: att.x, y: att.y };
        att.x = def.x;
        att.y = def.y;
        this.reveal(att.owner, att.x, att.y, this.visionRadius(att));
        this.emit({ type: 'move', unit: att, path: [from, { x: att.x, y: att.y }] });
      }
    } else if (retaliation > 0) {
      att.hp -= retaliation;
      this.emit({ type: 'retaliate', attacker: def, defender: att, damage: retaliation });
      if (att.hp <= 0) this.kill(att, def);
    }
    return { damage, retaliation };
  }

  kill(u, by) {
    this.units = this.units.filter((o) => o !== u);
    if (by) this.faction(by.owner).kills++;
    this.emit({ type: 'death', unit: u });
  }

  canCapture(u) {
    const city = this.cityAt(u.x, u.y);
    return !!city && city.owner !== u.owner && !u.moved && !u.attacked && !u.vessel;
  }

  capture(u) {
    if (u.owner !== this.current.id || !this.canCapture(u)) return null;
    const city = this.cityAt(u.x, u.y);
    const previous = city.owner;
    city.owner = u.owner;
    for (const t of this.tiles) if (t.region === city.id) t.owner = u.owner;
    this.claimTerritory(city, city.level >= 3 ? 2 : 1);
    for (const o of this.units) if (o.home === city.id && o.owner !== u.owner) o.home = null;
    u.moved = true;
    u.attacked = true;
    this.reveal(u.owner, city.x, city.y, 2);
    this.emit({ type: 'capture', city, unit: u, previous });
    if (previous != null) this.checkElimination(previous);
    return city;
  }

  checkElimination(fid) {
    const f = this.faction(fid);
    if (!f.alive || this.citiesOf(fid).length > 0) return;
    f.alive = false;
    this.units = this.units.filter((u) => u.owner !== fid);
    this.emit({ type: 'eliminated', faction: f });
    this.checkVictory();
  }

  checkVictory() {
    const alive = this.factions.filter((f) => f.alive);
    const human = this.factions.find((f) => f.human);
    if (alive.length === 1) {
      this.result = { winner: alive[0].id, reason: 'conquest' };
    } else if (human && !human.alive) {
      this.result = { winner: null, reason: 'defeat' };
    }
    if (this.result) this.emit({ type: 'gameover', result: this.result });
  }

  // ---------- Économie ----------

  isFree(f) {
    return this.sandbox && f.human;
  }

  spend(f, cost) {
    if (!this.isFree(f)) f.stars -= cost;
  }

  unitCount(city) {
    return this.units.filter((u) => u.home === city.id).length;
  }

  trainError(city, type) {
    const def = UNITS[type];
    const f = this.faction(city.owner);
    if (!f || f !== this.current) return "Cette cité ne t'appartient pas.";
    if (def.tech && !f.techs.has(def.tech)) return `Nécessite ${TECHS[def.tech].name}.`;
    if (this.unitAt(city.x, city.y)) return 'La cité est occupée.';
    if (!this.isFree(f) && this.unitCount(city) >= city.level + 1) return 'Plus de fidèles disponibles : fais grandir la cité.';
    if (f.stars < def.cost) return 'Pas assez d’huile.';
    return null;
  }

  train(city, type) {
    if (this.result || this.trainError(city, type)) return null;
    this.spend(this.current, UNITS[type].cost);
    const unit = this.spawnUnit(type, city);
    this.emit({ type: 'train', unit, city });
    return unit;
  }

  techCost(fid, tech) {
    const tier = TECHS[tech].tier;
    const base = TECHS[tech].cost ?? TECH_BASE_COST[tier];
    return base + Math.max(0, this.citiesOf(fid).length - 1) * tier;
  }

  researchError(fid, tech) {
    const f = this.faction(fid);
    const def = TECHS[tech];
    if (f.techs.has(tech)) return 'Déjà maîtrisée.';
    if (def.req && !f.techs.has(def.req)) return `Nécessite ${TECHS[def.req].name}.`;
    if (f.stars < this.techCost(fid, tech)) return 'Pas assez d’huile.';
    return null;
  }

  research(tech) {
    const f = this.current;
    if (this.result || this.researchError(f.id, tech)) return false;
    this.spend(f, this.techCost(f.id, tech));
    f.techs.add(tech);
    this.emit({ type: 'research', faction: f, tech });
    this.applyTech(f, tech);
    return true;
  }

  // Effets immédiats de certains savoirs.
  applyTech(f, tech) {
    if (tech === 'oeil') {
      this.tiles.forEach((_, i) => f.explored.add(i));
    } else if (tech === 'phares') {
      for (const c of this.citiesOf(f.id)) this.reveal(f.id, c.x, c.y, 3);
    } else if (tech === 'leviathan') {
      const home = this.citiesOf(f.id).find((c) => c.capital) ?? this.citiesOf(f.id)[0];
      const spot = home && this.around(home.x, home.y, 2).find((t) => t.terrain !== 'land' && !this.unitAt(t.x, t.y));
      if (spot) {
        const u = this.spawnUnit('gardien', home);
        u.x = spot.x;
        u.y = spot.y;
        u.vessel = 'navire';
        this.reveal(f.id, spot.x, spot.y, 2);
        this.emit({ type: 'train', unit: u, city: { x: spot.x, y: spot.y } });
      }
    } else if (tech === 'eveil') {
      this.result = { winner: f.id, reason: 'awakening' };
      this.emit({ type: 'gameover', result: this.result });
    }
  }

  canSacrifice(u) {
    return this.hasTech(u.owner, 'sacrifice') && !u.moved && !u.attacked;
  }

  // Sacrifice : le fidèle disparaît, son culte gagne 5 huile.
  sacrifice(u) {
    if (u.owner !== this.current.id || !this.canSacrifice(u)) return false;
    this.faction(u.owner).stars += 5;
    this.kill(u);
    return true;
  }

  harvestError(x, y) {
    const t = this.tile(x, y);
    const f = this.current;
    if (!t?.resource) return 'Rien à récolter.';
    const res = RESOURCES[t.resource];
    if (t.owner !== f.id) return 'Hors de ton territoire.';
    if (!f.techs.has(res.tech)) return `Nécessite ${TECHS[res.tech].name}.`;
    if (f.stars < res.cost) return 'Pas assez d’huile.';
    return null;
  }

  harvest(x, y) {
    if (this.result || this.harvestError(x, y)) return false;
    const t = this.tile(x, y);
    const res = RESOURCES[t.resource];
    this.spend(this.current, res.cost);
    t.resource = null;
    const city = this.city(t.region);
    this.emit({ type: 'harvest', x, y, city });
    this.addPop(city, res.pop);
    return true;
  }

  upgradeError(u) {
    const f = this.faction(u.owner);
    if (u.vessel !== 'barque') return 'Seules les barques deviennent des navires noirs.';
    if (!f.techs.has('navires')) return 'Nécessite Navires noirs.';
    if (this.tile(u.x, u.y).owner !== u.owner) return 'Doit être dans tes eaux.';
    if (f.stars < VESSELS.navire.cost) return 'Pas assez d’huile.';
    return null;
  }

  upgradeShip(u) {
    if (u.owner !== this.current.id || this.upgradeError(u)) return false;
    this.spend(this.current, VESSELS.navire.cost);
    u.vessel = 'navire';
    this.emit({ type: 'upgrade', unit: u });
    return true;
  }

  canHeal(u) {
    return !u.moved && !u.attacked && u.hp < this.stats(u).maxHp;
  }

  heal(u) {
    if (u.owner !== this.current.id || !this.canHeal(u)) return false;
    const amount = (this.tile(u.x, u.y).owner === u.owner ? RULES.healOwn : RULES.healAway)
      + (this.hasTech(u.owner, 'processions') ? 2 : 0);
    const before = u.hp;
    u.hp = Math.min(this.stats(u).maxHp, u.hp + amount);
    u.moved = true;
    u.attacked = true;
    this.emit({ type: 'heal', unit: u, amount: u.hp - before });
    return true;
  }

  // ---------- Tours ----------

  beginTurn(f, { income = true } = {}) {
    if (income) f.stars += this.income(f.id);
    if (this.hasTech(f.id, 'phares')) for (const c of this.citiesOf(f.id)) this.reveal(f.id, c.x, c.y, 3);
    for (const u of this.unitsOf(f.id)) {
      u.moved = false;
      u.attacked = false;
      this.reveal(f.id, u.x, u.y, this.visionRadius(u));
    }
    this.emit({ type: 'turnStart', faction: f, turn: this.turn });
  }

  endTurn() {
    if (this.result) return;
    let i = this.currentIndex;
    do {
      i = (i + 1) % this.factions.length;
      if (i === 0) this.turn++;
    } while (!this.factions[i].alive);
    const newRound = i <= this.currentIndex;
    this.currentIndex = i;
    if (newRound && this.turn === this.nextTide) {
      this.tide();
      this.nextTide += RULES.tideEvery;
    }
    if (this.turn > RULES.maxTurns) {
      const best = [...this.factions].filter((f) => f.alive).sort((a, b) => this.score(b.id) - this.score(a.id))[0];
      this.result = { winner: best.id, reason: 'score' };
      this.emit({ type: 'gameover', result: this.result });
      return;
    }
    this.beginTurn(this.current);
  }

  // ---------- Marée ----------

  tidesIn() {
    return this.nextTide - this.turn;
  }

  // La mer monte : les îles condamnées s'enfoncent d'un stade, celles qui
  // dépassent le dernier stade sont englouties, et de nouvelles côtes
  // commencent à sombrer.
  tide() {
    const submerged = [];
    for (const t of this.tiles) {
      if (t.sink > 0 && ++t.sink > RULES.sinkStages) {
        this.submerge(t);
        submerged.push(t);
      }
    }
    const candidates = this.rng.shuffle(this.tiles.filter((t) =>
      t.terrain === 'land' && !t.sink && t.city == null && !(t.owner != null && this.hasTech(t.owner, 'digues'))
      && this.around(t.x, t.y).some((n) => n.terrain !== 'land')));
    const started = candidates.slice(0, Math.max(1, Math.round(this.size / 8)));
    for (const t of started) t.sink = 1;
    this.emit({ type: 'tide', started, submerged });
  }

  submerge(t) {
    t.terrain = 'shallow';
    t.feature = null;
    t.resource = null;
    t.sink = 0;
    const u = this.unitAt(t.x, t.y);
    if (u && !u.vessel) u.vessel = 'barque'; // les fidèles se sauvent en barque
  }

  score(fid) {
    const f = this.faction(fid);
    const cities = this.citiesOf(fid).reduce((s, c) => s + 20 + c.level * 40, 0);
    return cities + f.techs.size * 25 + this.unitsOf(fid).length * 5 + f.explored.size + f.kills * 10;
  }
}
