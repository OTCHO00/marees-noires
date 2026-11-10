// Interface : sélection, panneau contextuel, savoirs interdits, messages.
import { UNITS, TECHS, RESOURCES, VESSELS } from '../core/data.js';
import { sigil, oil } from './sigil.js';

const $ = (sel) => document.querySelector(sel);

const TERRAIN_NAMES = {
  deep: ['Abysses', 'Des eaux noires et sans fond.'],
  shallow: ['Hauts-fonds', 'Récifs noirs et eaux peu profondes.'],
  land: ['Basalte', 'Une roche froide, battue par la marée.'],
  mangrove: ['Mangrove morte', 'Ses racines arrêtent la marche mais protègent ceux qui s’y cachent.'],
  falaise: ['Falaise', 'Défense accrue et vue dégagée sur la brume.'],
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

    const f = game.faction(humanId);
    document.documentElement.style.setProperty('--accent', f.color);
    document.documentElement.style.setProperty('--accent-light', f.light);
    $('#factionSigil').innerHTML = sigil(f, 34);
    $('#factionName').textContent = f.name;
    $('#topbar').classList.remove('hidden');
    $('#techBtn').onclick = () => this.openTech();
    $('#endTurnBtn').onclick = () => this.onEndTurn?.();
    $('#techModal').addEventListener('click', (e) => {
      if (e.target.id === 'techModal' || e.target.closest('[data-close]')) this.closeTech();
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
      const g = this.game;
      const { damage, retaliation } = g.previewCombat(this.sel.unit, target);
      const kill = damage >= target.hp;
      this.tooltip.innerHTML = `<small>${g.stats(this.sel.unit).name} → ${g.stats(target).name}</small>
        <span>Inflige <b class="hit">${damage}</b>${kill ? ' · <b class="hit">fatal</b>' : ` · Riposte <b>${retaliation}</b>`}</span>`;
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
    $('#stars').textContent = g.isFree(f) ? '∞' : f.stars;
    $('#income').textContent = `+${g.income(this.me)} / tour`;
    $('#turn').textContent = g.turn;
    const n = g.tidesIn();
    $('#tide').innerHTML = n <= 0 ? 'La marée <b>monte</b>' : `La marée monte dans <b>${n} tour${n > 1 ? 's' : ''}</b>`;
    $('#tideChip').classList.toggle('soon', n <= 1);
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
    const owner = sel.unit?.owner ?? sel.city?.owner ?? this.game.tile(sel.x, sel.y)?.owner;
    p.style.setProperty('--panel-accent', owner != null ? this.game.faction(owner).color : '#2C4A44');
    p.querySelectorAll('[data-action]').forEach((btn) => {
      btn.onclick = () => this.act(btn.dataset.action, btn.dataset.arg);
    });
  }

  ownerLine(fid) {
    if (fid == null) return '<p class="owner">Sans culte</p>';
    return `<p class="owner">${this.game.faction(fid).name}</p>`;
  }

  unitHtml(u) {
    const g = this.game;
    const s = g.stats(u);
    const base = UNITS[u.type];
    const mine = u.owner === this.me;
    const title = u.vessel ? `${s.name}<small>${base.name} à bord</small>` : s.name;
    let actions = '';
    if (mine && this.myTurn) {
      if (g.canCapture(u)) {
        const city = g.cityAt(u.x, u.y);
        actions += `<button class="btn btn-accent" data-action="capture">Allumer le feu de ${city.owner == null ? 'ce sanctuaire' : city.name}</button>`;
      }
      if (g.canHeal(u)) actions += '<button class="btn" data-action="heal">Veiller</button>';
      if (u.vessel === 'barque') {
        const err = g.upgradeError(u);
        actions += `<button class="btn" data-action="upgrade" ${err ? `disabled title="${err}"` : ''}>Navire noir · ${VESSELS.navire.cost} ${oil}</button>`;
      }
    }
    let status = '';
    if (mine && this.myTurn) {
      if (u.moved && u.attacked) status = '<p class="note">Sa lanterne faiblit : il a agi ce tour.</p>';
      else if (u.moved) status = '<p class="note">Déplacé — peut encore attaquer.</p>';
    }
    const city = g.cityAt(u.x, u.y);
    const capHint = mine && city && city.owner !== this.me && u.moved && !u.vessel
      ? '<p class="note">Reste ici jusqu’au prochain tour pour allumer le feu du culte.</p>' : '';
    const sinking = g.tile(u.x, u.y).sink ? '<p class="note warn">Cette terre s’enfonce dans la mer.</p>' : '';
    return `
      <h2>${title}</h2>
      ${this.ownerLine(u.owner)}
      <div class="hpbar"><div style="width:${(u.hp / s.maxHp) * 100}%"></div></div>
      <div class="stats">
        <div><b>${u.hp}</b>PV</div>
        <div><b>${s.atk}</b>Attaque</div>
        <div><b>${s.def}</b>Défense</div>
        <div><b>${s.move}·${s.range}</b>Mvt·Portée</div>
      </div>
      <p class="flavor">${u.vessel ? 'Une coque noire sur l’eau noire. Sa portée lui permet de frapper les côtes.' : base.desc}</p>
      ${status}${capHint}${sinking}
      <div class="actions">${actions}</div>`;
  }

  cityHtml(city) {
    const g = this.game;
    if (city.owner == null) {
      return `<h2>Sanctuaire</h2>${this.ownerLine(null)}
        <p class="flavor">Un cierge éteint sous une voûte de pierre. Amène un fidèle ici et reste un tour pour y allumer le feu de ton culte.</p>`;
    }
    const mine = city.owner === this.me;
    const pops = Array.from({ length: city.level + 1 }, (_, i) => `<span class="${i < city.pop ? 'on' : ''}"></span>`).join('');
    let recruits = '';
    if (mine) {
      recruits = '<h3>Appeler un fidèle</h3><div class="recruits">';
      for (const [type, def] of Object.entries(UNITS)) {
        const err = this.myTurn ? g.trainError(city, type) : 'Attends ton tour.';
        const locked = def.tech && !g.hasTech(this.me, def.tech);
        recruits += `<button class="recruit" data-action="train" data-arg="${type}" ${err ? `disabled title="${err}"` : ''}>
          <span class="name">${def.name}<span class="cost">${def.cost}${oil}</span></span>
          <span class="mini">${locked ? `Nécessite ${TECHS[def.tech].name}` : `Att ${def.atk} · Déf ${def.def} · Mvt ${def.move} · Portée ${def.range}`}</span>
        </button>`;
      }
      recruits += `</div><p class="note">Fidèles rattachés : ${g.unitCount(city)} / ${city.level + 1}</p>`;
    }
    return `
      <h2>${city.name}${city.capital ? '<small>Capitale</small>' : ''}</h2>
      ${this.ownerLine(city.owner)}
      <p>Niveau <b>${city.level}</b> · produit <b>${city.level + (city.capital ? 1 : 0)}</b> ${oil} par tour</p>
      <div class="pop">${pops}</div>
      <p class="note">Récolte les ressources du territoire pour faire grandir la cité.</p>
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
      res = `<p><b>${r.name}</b> — +${r.pop} fidèle${r.pop > 1 ? 's' : ''}</p>
        <div class="actions"><button class="btn btn-accent" data-action="harvest" ${err ? `disabled title="${err}"` : ''}>Récolter · ${r.cost} ${oil}</button></div>
        ${err ? `<p class="note">${err}</p>` : ''}`;
    }
    const sink = t.sink ? `<p class="note warn">Condamnée par la marée (stade ${t.sink} sur 3).</p>` : '';
    return `<h2>${name}</h2>${t.owner != null ? this.ownerLine(t.owner) : ''}<p class="flavor">${desc}</p>${sink}${res}`;
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
      if (unit) this.toast(`${UNITS[arg].name} rejoint ${sel.city.name}.`);
    }
    this.select(this.sel);
  }

  // ---------- Savoirs interdits ----------

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
      el.innerHTML = `<span class="tname">${tech.name}</span><span class="tdesc">${tech.desc}</span>
        <span class="cost">${owned ? 'Acquis' : locked ? `Après ${TECHS[tech.req].name}` : `${cost} ${oil}`}</span>`;
      el.onclick = () => {
        if (!this.myTurn || state !== 'available') return;
        if (g.research(id)) {
          this.toast(`Savoir acquis : ${tech.name}.`);
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
    el.style.borderLeftColor = color ?? 'var(--accent)';
    el.textContent = text;
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4100);
  }

  banner(faction) {
    const b = $('#banner');
    if (!faction) {
      b.classList.add('hidden');
      return;
    }
    b.innerHTML = `${sigil(faction, 26)}<span>${faction.name} agissent dans la brume…</span>`;
    b.classList.remove('hidden');
  }

  onGameEvent(e) {
    const g = this.game;
    const seen = (x, y) => g.isExplored(this.me, x, y);
    if (e.type === 'capture') {
      const who = g.faction(e.unit.owner);
      if (e.unit.owner === this.me) this.toast(`${e.city.name} brûle désormais de ta flamme.`, who.color);
      else if (e.previous === this.me) this.toast(`${who.name} ont pris ${e.city.name}.`, who.color);
      else if (seen(e.city.x, e.city.y)) this.toast(`${who.name} s’emparent de ${e.city.name}.`, who.color);
    } else if (e.type === 'levelup' && e.city.owner === this.me) {
      const bonus = e.city.level === 2 ? ' (+4 huile)' : e.city.level === 3 ? ' — sa lumière porte plus loin' : '';
      this.toast(`${e.city.name} atteint le niveau ${e.city.level}${bonus}.`);
    } else if (e.type === 'eliminated') {
      this.toast(`${e.faction.name} ont disparu dans les flots.`, e.faction.color);
    } else if (e.type === 'tide') {
      const lost = e.submerged.filter((t) => seen(t.x, t.y)).length;
      this.toast(lost ? `La marée monte : ${lost} terre${lost > 1 ? 's' : ''} englouties.` : 'La marée monte. De nouvelles côtes s’enfoncent.', '#7FD1B9');
    } else if (e.type === 'death' && e.unit.owner === this.me) {
      if (this.sel?.unit === e.unit) this.select(null);
    }
  }
}
