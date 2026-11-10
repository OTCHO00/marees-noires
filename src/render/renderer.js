// Rendu canvas : boucle d'animation, ordre de profondeur, surbrillances,
// animations de déplacement, projectiles, textes flottants et ambiance nocturne.
import { TW, TH, ELEV, tileCenter, worldToGrid, Camera } from './iso.js';
import * as S from './sprites.js';

const STEP_MS = 150;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Renderer {
  constructor(canvas, game, viewerId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.viewerId = viewerId;
    this.camera = new Camera();
    this.anims = new Map(); // unitId -> { path, start }
    this.ghosts = []; // unités mortes qui s'effacent
    this.floats = [];
    this.projectiles = [];
    this.shakes = new Map();
    this.highlight = { selected: null, moves: new Map(), attacks: [], hover: null };
    this.time = 0;
    this.last = performance.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    game.on((e) => this.onEvent(e));
    requestAnimationFrame((t) => this.frame(t));
  }

  get accent() {
    return this.game.faction(this.viewerId)?.color ?? '#E8A33D';
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.dpr = dpr;
    const ctx = this.ctx;
    const r = Math.max(this.w, this.h);
    this.sea = ctx.createRadialGradient(this.w / 2, this.h * 0.48, 40, this.w / 2, this.h * 0.48, r * 0.75);
    this.sea.addColorStop(0, '#14272A');
    this.sea.addColorStop(1, '#050A0B');
    this.vignette = ctx.createRadialGradient(this.w / 2, this.h / 2, r * 0.32, this.w / 2, this.h / 2, r * 0.72);
    this.vignette.addColorStop(0, 'rgba(0,0,0,0)');
    this.vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
  }

  // ---------- Événements du jeu → animations ----------

  visible(x, y) {
    return this.viewerId == null || !this.game.faction(this.viewerId).alive || this.game.isExplored(this.viewerId, x, y);
  }

  onEvent(e) {
    const now = performance.now();
    if (e.type === 'move') {
      this.anims.set(e.unit.id, { path: e.path, start: now });
    } else if (e.type === 'attack' || e.type === 'retaliate') {
      const { attacker: a, defender: d } = e;
      if (e.ranged || this.game.stats(a).range > 1) {
        const color = this.game.faction(a.owner).color;
        this.projectiles.push({ from: { x: a.x, y: a.y }, to: { x: d.x, y: d.y }, start: now, dur: 420, color });
      }
      this.shakes.set(d.id, now);
      this.addFloat(d.x, d.y, `−${e.damage}`, '#F08A7C', e.ranged ? 340 : 0);
    } else if (e.type === 'death') {
      this.ghosts.push({ unit: { ...e.unit }, start: now });
    } else if (e.type === 'heal') {
      this.addFloat(e.unit.x, e.unit.y, `+${e.amount}`, '#B8EADB');
    } else if (e.type === 'harvest') {
      this.addFloat(e.x, e.y, '+1 fidèle', '#F5C26B');
    } else if (e.type === 'levelup') {
      this.addFloat(e.city.x, e.city.y, `Niveau ${e.city.level}`, '#F5C26B');
    } else if (e.type === 'capture') {
      this.addFloat(e.city.x, e.city.y, 'Le feu est allumé', '#F1E9D8');
    } else if (e.type === 'train') {
      this.addFloat(e.city.x, e.city.y, 'Nouveau fidèle', '#F1E9D8');
    } else if (e.type === 'upgrade') {
      this.addFloat(e.unit.x, e.unit.y, 'Navire noir', '#F5C26B');
    } else if (e.type === 'tide') {
      for (const t of e.submerged) this.addFloat(t.x, t.y, 'Englouti', '#7FD1B9');
    }
  }

  addFloat(x, y, text, color, delay = 0) {
    if (!this.visible(x, y)) return;
    this.floats.push({ x, y, text, color, start: performance.now() + delay });
  }

  busy() {
    const now = performance.now();
    for (const a of this.anims.values()) if (now - a.start < (a.path.length - 1) * STEP_MS) return true;
    return this.projectiles.some((p) => now - p.start < p.dur);
  }

  // ---------- Caméra et sélection ----------

  centerOn(x, y, instant = false) {
    const c = tileCenter(x, y);
    if (instant) {
      this.camera.x = c.x;
      this.camera.y = c.y;
    } else {
      this.camera.glideTo(c.x, c.y);
    }
  }

  pick(sx, sy) {
    const wpt = this.camera.toWorld(sx, sy, this.w, this.h);
    // Les blocs de basalte sont surélevés : on teste d'abord la case "haute".
    const high = worldToGrid(wpt.x, wpt.y + ELEV);
    const ht = this.game.tile(high.x, high.y);
    if (ht && ht.terrain === 'land' && (ht.sink || 0) < 3) return high;
    const low = worldToGrid(wpt.x, wpt.y);
    return this.game.tile(low.x, low.y) ? low : null;
  }

  // ---------- Boucle ----------

  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.time += dt;
    this.camera.update(dt);
    this.draw(t);
    requestAnimationFrame((n) => this.frame(n));
  }

  groundY(t) {
    if (t.terrain !== 'land' || t.sink >= 3) return 0;
    return t.sink === 2 ? ELEV - 16 : ELEV;
  }

  unitPos(u, now) {
    const anim = this.anims.get(u.id);
    let gx = u.x;
    let gy = u.y;
    if (anim) {
      const p = (now - anim.start) / STEP_MS;
      if (p >= anim.path.length - 1) {
        this.anims.delete(u.id);
      } else {
        const i = Math.max(0, Math.floor(p));
        const f = p - i;
        const a = anim.path[i];
        const b = anim.path[i + 1];
        gx = a.x + (b.x - a.x) * f;
        gy = a.y + (b.y - a.y) * f;
      }
    }
    const c = tileCenter(gx, gy);
    let lift = this.groundY(this.game.tile(Math.round(gx), Math.round(gy)));
    const shake = this.shakes.get(u.id);
    let sx = 0;
    if (shake) {
      const k = (now - shake) / 320;
      if (k > 1) this.shakes.delete(u.id);
      else sx = Math.sin(k * 30) * 4 * (1 - k);
    }
    if (anim) lift += Math.abs(Math.sin(((now - anim.start) / STEP_MS) * Math.PI)) * 5;
    return { x: c.x + sx, y: c.y - lift + 4, depth: gx + gy };
  }

  draw(now) {
    const { ctx, game, camera, time, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.sea;
    ctx.fillRect(0, 0, this.w, this.h);

    const z = camera.zoom;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.w / 2 - camera.x * z), dpr * (this.h / 2 - camera.y * z));

    const size = game.size;
    const order = [];
    for (let d = 0; d <= 2 * (size - 1); d++) {
      for (let x = Math.max(0, d - size + 1); x <= Math.min(size - 1, d); x++) order.push(game.tile(x, d - x));
    }

    // Passe 1 : eaux.
    for (const t of order) {
      if (!this.visible(t.x, t.y) || t.terrain === 'land') continue;
      const c = tileCenter(t.x, t.y);
      S.drawWater(ctx, t, c.x, c.y, time);
    }
    // Passe 2 : basalte, territoire et surbrillances.
    for (const t of order) {
      if (!this.visible(t.x, t.y)) continue;
      const c = tileCenter(t.x, t.y);
      if (t.terrain === 'land') S.drawLand(ctx, t, c.x, c.y);
      this.drawTerritory(t, c);
      this.drawHighlight(t, c, now);
    }

    // Passe 3 : décor, cités et unités triés par profondeur.
    const items = [];
    for (const t of order) {
      if (!this.visible(t.x, t.y)) continue;
      const c = tileCenter(t.x, t.y);
      const depth = t.x + t.y;
      if (t.feature === 'mangrove') items.push({ depth: depth - 0.1, draw: () => S.drawMangrove(ctx, t, c.x, c.y, time) });
      if (t.feature === 'falaise') items.push({ depth: depth - 0.1, draw: () => S.drawFalaise(ctx, t, c.x, c.y) });
      if (t.sink) items.push({ depth: depth - 0.15, draw: () => S.drawSinking(ctx, t, c.x, c.y, time) });
      if (t.resource) items.push({ depth: depth - 0.05, draw: () => S.drawResource(ctx, t, c.x, c.y, time) });
      if (t.city != null) {
        const city = game.city(t.city);
        const f = city.owner != null ? game.faction(city.owner) : null;
        items.push({ depth: depth - 0.2, draw: () => S.drawCity(ctx, city, f, c.x, c.y, time) });
      }
    }
    for (const u of game.units) {
      if (!this.visible(u.x, u.y)) continue;
      const p = this.unitPos(u, now);
      const f = game.faction(u.owner);
      const spent = game.current.id === u.owner && u.moved && u.attacked;
      items.push({
        depth: p.depth + 0.3,
        draw: () => S.drawUnit(ctx, u, f, p.x, p.y, time, { maxHp: game.stats(u).maxHp, spent }),
      });
    }
    this.ghosts = this.ghosts.filter((g) => now - g.start < 700);
    for (const g of this.ghosts) {
      if (!this.visible(g.unit.x, g.unit.y)) continue;
      const c = tileCenter(g.unit.x, g.unit.y);
      const lift = this.groundY(game.tile(g.unit.x, g.unit.y));
      const k = (now - g.start) / 700;
      items.push({
        depth: g.unit.x + g.unit.y + 0.3,
        draw: () => S.drawUnit(ctx, g.unit, game.faction(g.unit.owner), c.x, c.y - lift + 4 + k * 10, time, {
          maxHp: 10, alpha: 1 - k, spent: true,
        }),
      });
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    // Étiquettes des cités (toujours au-dessus).
    for (const city of game.cities) {
      if (!this.visible(city.x, city.y)) continue;
      const c = tileCenter(city.x, city.y);
      const f = city.owner != null ? game.faction(city.owner) : null;
      S.drawCityLabel(ctx, city, f, c.x, c.y - ELEV, this.highlight.selectedCity === city.id);
    }

    // Passe 4 : brume sur les zones inexplorées.
    for (const t of order) {
      if (this.visible(t.x, t.y)) continue;
      const c = tileCenter(t.x, t.y);
      S.drawFog(ctx, t.x, t.y, c.x, c.y, time);
    }

    this.drawProjectiles(now);
    this.drawFloats(now);

    // Ambiance : lune et vignettage, en coordonnées écran.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.glow(ctx, this.w - 140, 110, 260, '#9FB6B1', 0.45);
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  drawTerritory(t, c) {
    if (t.owner == null) return;
    const f = this.game.faction(t.owner);
    const cy = c.y - this.groundY(t);
    const ctx = this.ctx;
    S.diamond(ctx, c.x, cy, 1);
    ctx.fillStyle = S.rgba(f.color, 0.05);
    ctx.fill();
    const top = { x: c.x, y: cy - TH / 2 };
    const right = { x: c.x + TW / 2, y: cy };
    const bottom = { x: c.x, y: cy + TH / 2 };
    const left = { x: c.x - TW / 2, y: cy };
    const edges = [[right, bottom], [left, top], [bottom, left], [top, right]];
    ctx.strokeStyle = S.rgba(f.color, 0.6);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    DIRS.forEach(([dx, dy], i) => {
      const n = this.game.tile(t.x + dx, t.y + dy);
      if (n && n.owner === t.owner) return;
      const [a, b] = edges[i];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  drawHighlight(t, c, now) {
    const h = this.highlight;
    const ctx = this.ctx;
    const cy = c.y - this.groundY(t);
    const k = t.y * this.game.size + t.x;
    const pulse = 0.5 + Math.sin(now / 220) * 0.5;
    const accent = this.accent;
    if (h.moves.has(k)) {
      ctx.fillStyle = S.rgba(accent, 0.55 + pulse * 0.25);
      ctx.beginPath();
      ctx.ellipse(c.x, cy, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (h.attacks.some((u) => u.x === t.x && u.y === t.y)) {
      S.diamond(ctx, c.x, cy, 0.92);
      ctx.fillStyle = S.rgba('#D9604F', 0.12 + pulse * 0.1);
      ctx.fill();
      ctx.strokeStyle = '#D9604F';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    if (h.selected && h.selected.x === t.x && h.selected.y === t.y) {
      S.diamond(ctx, c.x, cy, 0.84);
      ctx.fillStyle = S.rgba(accent, 0.12);
      ctx.fill();
      ctx.strokeStyle = S.rgba(accent, 0.7 + pulse * 0.3);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    if (h.hover && h.hover.x === t.x && h.hover.y === t.y) {
      S.diamond(ctx, c.x, cy, 0.95);
      ctx.strokeStyle = 'rgba(207,227,220,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawProjectiles(now) {
    const ctx = this.ctx;
    this.projectiles = this.projectiles.filter((p) => now - p.start < p.dur + 300);
    for (const p of this.projectiles) {
      const k = (now - p.start) / p.dur;
      const a = tileCenter(p.from.x, p.from.y);
      const b = tileCenter(p.to.x, p.to.y);
      if (k <= 1) {
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 60 - 34;
        S.glow(ctx, x, y, 22, p.color);
        ctx.fillStyle = '#F1E9D8';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const e = (k - 1) * (p.dur / 300);
        S.glow(ctx, b.x, b.y - 26, 20 + e * 40, p.color, 1 - e);
      }
    }
  }

  drawFloats(now) {
    const ctx = this.ctx;
    this.floats = this.floats.filter((f) => now - f.start < 1400);
    for (const f of this.floats) {
      const k = (now - f.start) / 1400;
      if (k < 0) continue;
      const c = tileCenter(f.x, f.y);
      ctx.globalAlpha = 1 - k * k;
      ctx.font = '600 20px "Cormorant SC", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(5,9,9,0.9)';
      ctx.strokeText(f.text, c.x, c.y - 70 - k * 26);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, c.x, c.y - 70 - k * 26);
      ctx.globalAlpha = 1;
    }
  }
}
