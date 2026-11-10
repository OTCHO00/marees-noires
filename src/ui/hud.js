// Interface : sélection, panneau contextuel, arbre technologique, messages.
import { UNITS, TECHS, RESOURCES, VESSELS } from '../core/data.js';

const $ = (sel) => document.querySelector(sel);
const coin = '<span class="coin"></span>';

const TERRAIN_NAMES = {
  deep: ['Haute mer', 'Des eaux sombres et profondes.'],
  shallow: ['Lagon', 'Des eaux turquoise, peu profondes.'],
  land: ['Plage', 'Sable chaud et herbes folles.'],
  forest: ['Palmeraie', 'Les palmiers offrent un bonus de défense.'],
  mountain: ['Morne', 'Une montagne : défense accrue et vue dégagée.'],
};

export class Hud {
  constructor(game, renderer, humanId) {
    this.game = game;
    this.renderer = renderer;
    this.me = humanId;
    this.sel = null;
    this.locked = false;
    this.panel = $('#panel');
    this.tooltip = $('#tooltip');

    $('#topbar').classList.remove('hidden');
    $('#techBtn').onclick = () => this.openTech();
    $('#endTurnBtn').onclick = () => this.onEndTurn?.();
    $('#techModal').addEventListener('click', (e) => {
      if (e.target.id === 'techModal' || e.target.hasAttribute('data-close')) this.closeTech();
    });

    game.on((e) => this.onGameEvent(e));
    this.refresh();
  }

  get myTurn() {
    return !this.locked && this.game.current.id === this.me && !this.game.result;
  }

  lock(value) {
    this.locked = value;
    $('#endTurnBtn').disabled = value;
    if (value) this.select(null);
    this.refresh();
  }

  // ---------- Entrées ----------

  handleClick(x, y) {
    const g = this.game;
    if (!g.isExplored(this.me, x, y)) {
      this.select(null);
      return;
    }
    const sel = this.sel;
    if (this.myTurn && sel?.kind === 'unit' && sel.unit.owner === this.me && g.units.includes(sel.unit)) {
      const target = g.attackTargets(sel.unit).find((o) => o.x === x && o.y === y);
      if (target) {
        g.attack(sel.unit, target);
        this.select(g.units.includes(sel.unit) ? sel : null);
        return;
      }
      if (g.reachable(sel.unit).has(y * g.size + x)) {
        g.moveUnit(sel.unit, x, y);
        this.select(sel);
        return;
      }
    }
    const unit = g.unitAt(x, y);
    const city = g.cityAt(x, y);
    if (unit && !(sel?.kind === 'unit' && sel.unit === unit)) this.select({ kind: 'unit', unit });
    else if (city && !(sel?.kind === 'city' && sel.city === city)) this.select({ kind: 'city', city });
    else if (sel?.kind === 'tile' && sel.x === x && sel.y === y) this.select(null);
    else this.select({ kind: 'tile', x, y });
  }

  handleHover(x, y, sx, sy) {
    const h = this.renderer.highlight;
    h.hover = x == null ? null : { x, y };
    const target = h.attacks.find((u) => u.x === x && u.y === y);
    if (target && this.sel?.kind === 'unit') {
      const { damage, retaliation } = this.game.previewCombat(this.sel.unit, target);
      const kill = damage >= target.hp;
      this.tooltip.innerHTML = `⚔ Inflige <b>${damage}</b>${kill ? ' — <b>coulé !</b>' : ''}<br>🛡 Riposte <b>${kill ? 0 : retaliation}</b>`;
      this.tooltip.style.left = `${sx}px`;
      this.tooltip.style.top = `${sy}px`;
      this.tooltip.classList.remove('hidden');
    } else {
      this.tooltip.classList.add('hidden');
    }
  }

  // Sélectionne la prochaine unité qui peut encore agir.
  cycleUnits() {
    const ready = this.game.unitsOf(this.me).filter((u) => !u.moved || !u.attacked);
    if (!ready.length) return;
    const i = this.sel?.kind === 'unit' ? ready.indexOf(this.sel.unit) : -1;
    const u = ready[(i + 1) % ready.length];
    this.select({ kind: 'unit', unit: u });
    this.renderer.centerOn(u.x, u.y);
  }

  select(sel) {
    this.sel = sel;
    const h = this.renderer.highlight;
    h.moves = new Map();
    h.attacks = [];
    h.selected = null;
    h.selectedCity = null;
    if (sel?.kind === 'unit') {
      h.selected = sel.unit;
      if (this.myTurn && sel.unit.owner === this.me) {
        h.moves = this.game.reachable(sel.unit);
        h.attacks = this.game.attackTargets(sel.unit);
      }
    } else if (sel?.kind === 'city') {
      h.selected = sel.city;
      h.selectedCity = sel.city.id;
    } else if (sel?.kind === 'tile') {
      h.selected = { x: sel.x, y: sel.y };
    }
    this.tooltip.classList.add('hidden');
    this.refresh();
  }

  // ---------- Rendu de l'interface ----------

  refresh() {
    const g = this.game;
    const f = g.faction(this.me);
    $('#factionChip .flag').style.background = f.color;
    $('#factionName').textContent = f.name;
    $('#stars').textContent = f.stars;
    $('#income').textContent = `+${g.income(this.me)}`;
    $('#turn').textContent = g.turn;
    $('#maxTurns').textContent = '/30';
    $('#score').textContent = g.score(this.me);
    const anyReady = g.unitsOf(this.me).some((u) => !u.moved && (g.reachable(u).size || g.attackTargets(u).length || g.canCapture(u)));
    $('#endTurnBtn').classList.toggle('pulse', this.myTurn && !anyReady);
    this.renderPanel();
    if (!$('#techModal').classList.contains('hidden')) this.renderTech();
  }

  renderPanel() {
    const sel = this.sel;
    const p = this.panel;
    if (!sel) {
      p.classList.add('hidden');
      return;
    }
    p.classList.remove('hidden');
    if (sel.kind === 'unit') p.innerHTML = this.unitHtml(sel.unit);
    else if (sel.kind === 'city') p.innerHTML = this.cityHtml(sel.city);
    else p.innerHTML = this.tileHtml(sel.x, sel.y);
    p.querySelectorAll('[data-action]').forEach((btn) => {
      btn.onclick = () => this.act(btn.dataset.action, btn.dataset.arg);
    });
  }

  ownerLine(fid) {
    if (fid == null) return '<div class="owner">Sans pavillon</div>';
    const f = this.game.faction(fid);
    return `<div class="owner"><span class="flag" style="background:${f.color}"></span>${f.name}</div>`;
  }

  unitHtml(u) {
    const g = this.game;
    const s = g.stats(u);
    const base = UNITS[u.type];
    const mine = u.owner === this.me;
    const title = u.vessel ? `${s.name} <small style="font-size:16px">(${base.name})</small>` : s.name;
    let actions = '';
    if (mine && this.myTurn) {
      if (g.canCapture(u)) {
        const city = g.cityAt(u.x, u.y);
        actions += `<button class="btn btn-gold" data-action="capture">🏴‍☠️ Capturer ${city.owner == null ? 'le repaire' : city.name}</button>`;
      }
      if (g.canHeal(u)) actions += '<button class="btn" data-action="heal">✚ Soigner</button>';
      if (u.vessel === 'chaloupe') {
        const err = g.upgradeError(u);
        actions += `<button class="btn" data-action="upgrade" ${err ? `disabled title="${err}"` : ''}>⛵ Galion (${VESSELS.galion.cost} ${coin})</button>`;
      }
    }
    let status = '';
    if (mine && this.myTurn) {
      if (u.moved && u.attacked) status = '<p class="note">Cette unité a terminé son tour.</p>';
      else if (u.moved) status = '<p class="note">Déplacée — peut encore attaquer.</p>';
    }
    const capHint = mine && g.cityAt(u.x, u.y)?.owner !== this.me && g.cityAt(u.x, u.y) && u.moved && !u.vessel
      ? '<p class="note">Reste ici jusqu\'au prochain tour pour capturer.</p>' : '';
    return `
      <h2>${title}</h2>
      ${this.ownerLine(u.owner)}
      <div class="hpbar"><div style="width:${(u.hp / s.maxHp) * 100}%"></div></div>
      <div class="stats">
        <div><b>${u.hp}/${s.maxHp}</b>PV</div>
        <div><b>${s.atk}</b>Attaque</div>
        <div><b>${s.def}</b>Défense</div>
        <div><b>${s.move}·${s.range}</b>Mvt·Portée</div>
      </div>
      <p>${u.vessel ? 'Un navire de la flotte : sa portée lui permet de bombarder les côtes.' : base.desc}</p>
      ${status}${capHint}
      <div class="actions">${actions}</div>`;
  }

  cityHtml(city) {
    const g = this.game;
    if (city.owner == null) {
      return `<h2>Repaire</h2>${this.ownerLine(null)}
        <p>Un repaire de forbans indépendants. Amène une unité dessus et reste-y un tour pour le capturer.</p>`;
    }
    const mine = city.owner === this.me;
    const pops = Array.from({ length: city.level + 1 }, (_, i) => `<span class="${i < city.pop ? 'on' : ''}"></span>`).join('');
    let recruits = '';
    if (mine) {
      recruits = '<h3 style="font-family:var(--title);font-weight:400;margin:12px 0 0;font-size:22px">Recruter</h3><div class="recruits">';
      for (const [type, def] of Object.entries(UNITS)) {
        const err = this.myTurn ? g.trainError(city, type) : 'Attends ton tour.';
        const locked = def.tech && !g.hasTech(this.me, def.tech);
        recruits += `<button class="recruit" data-action="train" data-arg="${type}" ${err ? `disabled title="${err}"` : ''}>
          <div class="name">${locked ? '🔒 ' : ''}${def.name}<span class="cost">${def.cost}${coin}</span></div>
          <div class="mini">${locked ? `Nécessite ${TECHS[def.tech].name}` : `⚔${def.atk} 🛡${def.def} 👣${def.move} 🎯${def.range} ❤${def.hp}`}</div>
        </button>`;
      }
      recruits += `</div><p class="note">Équipage : ${g.unitCount(city)}/${city.level + 1}</p>`;
    }
    return `
      <h2>${city.capital ? '👑 ' : ''}${city.name}</h2>
      ${this.ownerLine(city.owner)}
      <p>Niveau <b>${city.level}</b> · rapporte <b>${city.level + (city.capital ? 1 : 0)}</b> ${coin} par tour</p>
      <div class="pop">${pops}</div>
      <p class="note">Récolte des ressources dans le territoire pour faire grandir ce port.</p>
      ${recruits}`;
  }

  tileHtml(x, y) {
    const g = this.game;
    const t = g.tile(x, y);
    const [name, desc] = TERRAIN_NAMES[t.feature ?? t.terrain];
    let res = '';
    if (t.resource) {
      const r = RESOURCES[t.resource];
      const err = this.myTurn ? g.harvestError(x, y) : 'Attends ton tour.';
      res = `<p><b>${r.name}</b> — +${r.pop} population</p>
        <div class="actions"><button class="btn btn-gold" data-action="harvest" ${err ? `disabled title="${err}"` : ''}>Récolter (${r.cost} ${coin})</button></div>
        ${err ? `<p class="note">${err}</p>` : ''}`;
    }
    return `<h2>${name}</h2>${t.owner != null ? this.ownerLine(t.owner) : ''}<p>${desc}</p>${res}`;
  }

  act(action, arg) {
    const g = this.game;
    const sel = this.sel;
    if (!this.myTurn) return;
    if (action === 'capture') g.capture(sel.unit);
    else if (action === 'heal') g.heal(sel.unit);
    else if (action === 'upgrade') g.upgradeShip(sel.unit);
    else if (action === 'harvest') g.harvest(sel.x, sel.y);
    else if (action === 'train') {
      const unit = g.train(sel.city, arg);
      if (unit) this.toast(`${UNITS[arg].name} recruté à ${sel.city.name}.`);
    }
    this.select(this.sel);
  }

  // ---------- Technologies ----------

  openTech() {
    $('#techModal').classList.remove('hidden');
    this.renderTech();
  }

  closeTech() {
    $('#techModal').classList.add('hidden');
  }

  renderTech() {
    const g = this.game;
    const tree = $('#techTree');
    tree.innerHTML = '';
    for (const [id, tech] of Object.entries(TECHS)) {
      const owned = g.hasTech(this.me, id);
      const locked = tech.req && !g.hasTech(this.me, tech.req);
      const cost = g.techCost(this.me, id);
      const poor = !owned && !locked && g.faction(this.me).stars < cost;
      const state = owned ? 'owned' : locked ? 'locked' : poor ? 'poor' : 'available';
      const el = document.createElement('button');
      el.className = `tech ${state} ${tech.tier === 1 ? 'root' : ''}`;
      el.style.setProperty('--col', tech.branch + 1);
      el.style.setProperty('--row', tech.tier);
      el.innerHTML = `<h4>${tech.name}</h4><p>${tech.desc}</p>
        <span class="cost">${owned ? '✔ Acquise' : locked ? `🔒 ${TECHS[tech.req].name}` : `${cost} ${coin}`}</span>`;
      el.onclick = () => {
        if (!this.myTurn || state !== 'available') return;
        if (g.research(id)) {
          this.toast(`Nouvelle technique : ${tech.name} !`);
          this.select(this.sel);
        }
      };
      tree.appendChild(el);
    }
  }

  // ---------- Messages ----------

  toast(text, color) {
    const el = document.createElement('div');
    el.className = 'toast';
    if (color) el.style.borderLeftColor = color;
    el.textContent = text;
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  banner(text, color) {
    const b = $('#banner');
    if (!text) {
      b.classList.add('hidden');
      return;
    }
    b.innerHTML = `<span class="flag" style="background:${color}"></span>${text}`;
    b.classList.remove('hidden');
  }

  onGameEvent(e) {
    const g = this.game;
    const seen = (x, y) => g.isExplored(this.me, x, y);
    if (e.type === 'capture') {
      const who = g.faction(e.unit.owner);
      if (e.unit.owner === this.me) this.toast(`${e.city.name} rejoint ta flotte !`, who.color);
      else if (e.previous === this.me) this.toast(`${who.name} ont pris ${e.city.name} !`, who.color);
      else if (seen(e.city.x, e.city.y)) this.toast(`${who.name} capturent ${e.city.name}.`, who.color);
    } else if (e.type === 'levelup' && e.city.owner === this.me) {
      const bonus = e.city.level === 2 ? ' (+4 doublons)' : e.city.level === 3 ? ' — territoire agrandi' : '';
      this.toast(`${e.city.name} passe au niveau ${e.city.level}${bonus} !`);
    } else if (e.type === 'eliminated') {
      this.toast(`${e.faction.name} ont été anéantis !`, e.faction.color);
    } else if (e.type === 'death' && e.unit.owner === this.me) {
      if (this.sel?.unit === e.unit) this.select(null);
    }
  }
}
