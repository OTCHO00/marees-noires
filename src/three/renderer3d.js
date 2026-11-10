// Rendu 3D isométrique du jeu. Même interface que l'ancien rendu 2D :
// highlight, visible(), busy(), centerOn(), pick(), panBy(), zoomAt().
// La scène est synchronisée avec l'état du jeu à chaque image ; les
// événements du moteur déclenchent les animations.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createStage } from './stage.js';
import * as M from './models.js';
import { createWater } from './water.js';
import * as B from './buildings.js';
import * as U from './units.js';

const STEP_MS = 170;
const LIGHT_POOL = 14; // nombre fixe de lumières : évite de recompiler les shaders
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ELEV = (35.264 * Math.PI) / 180;

export class Renderer3D {
  constructor(canvas, game, viewerId) {
    this.canvas = canvas;
    this.game = game;
    this.viewerId = viewerId;
    this.stage = createStage(canvas);
    this.scene = this.stage.scene;
    this.camera = this.stage.camera;
    this.highlight = { selected: null, moves: new Map(), attacks: [], hover: null, selectedCity: null };

    this.tileObjs = new Map(); // index de case -> { key, group }
    this.cityObjs = new Map(); // id -> { key, group, label }
    this.unitObjs = new Map(); // id -> { key, group, plate, facing }
    this.anims = new Map();
    this.shakes = new Map();
    this.ghosts = [];
    this.projectiles = [];
    this.floats = [];
    this.exploredSize = -1;
    this.dirty = { tiles: true, cities: true, borders: true, fog: true };
    this.glide = null;
    this.raycaster = new THREE.Raycaster();

    this.buildSea();
    this.buildLightPool();
    this.buildOverlay();
    this.hlGroup = new THREE.Group();
    this.borderGroup = new THREE.Group();
    this.fogGroup = new THREE.Group();
    this.scene.add(this.hlGroup, this.borderGroup, this.fogGroup);
    this.selectionRing = this.ring(0.37, 0.45, '#E8A33D', 0.9);
    this.hoverRing = this.ring(0.42, 0.45, '#CFE3DC', 0.35);
    this.scene.add(this.selectionRing, this.hoverRing);

    game.on((e) => this.onEvent(e));
    this.stage.onFrame((t, dt) => this.update(t, dt));
  }

  get w() {
    return this.canvas.clientWidth;
  }

  get h() {
    return this.canvas.clientHeight;
  }

  get accent() {
    return this.game.faction(this.viewerId)?.color ?? '#E8A33D';
  }

  // ---------- Requêtes ----------

  visible(x, y) {
    const f = this.game.faction(this.viewerId);
    return !f || !f.alive || this.game.isExplored(this.viewerId, x, y);
  }

  // Hauteur du sol réellement dessiné sur une case.
  groundTop(t) {
    if (!t || t.terrain !== 'land' || !this.visible(t.x, t.y)) return M.WATER_LEVEL;
    if (t.sink >= 3) return M.WATER_LEVEL;
    return M.LAND_TOP - 0.14 * (t.sink || 0);
  }

  busy() {
    const now = performance.now();
    for (const a of this.anims.values()) if (now - a.start < (a.path.length - 1) * STEP_MS) return true;
    return this.projectiles.length > 0;
  }

  // ---------- Caméra ----------

  centerOn(x, y, instant = false) {
    if (instant) {
      this.glide = null;
      this.stage.setView(x, y);
    } else {
      this.glide = new THREE.Vector3(x, 0, y);
    }
  }

  setZoom(z) {
    this.stage.view.zoom = z;
    this.stage.zoomBy(1);
  }

  panBy(dxPx, dyPx) {
    this.glide = null;
    const k = (2 * this.stage.view.zoom) / this.h;
    const dx = dxPx * k;
    const dy = (dyPx * k) / Math.sin(ELEV);
    this.stage.pan((-dx - dy) / Math.SQRT2, (dx - dy) / Math.SQRT2);
  }

  groundPoint(sx, sy, height = 0) {
    const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), p) ? p : null;
  }

  zoomAt(factor, sx, sy) {
    const before = this.groundPoint(sx, sy);
    this.stage.zoomBy(factor);
    this.stage.camera.updateMatrixWorld();
    const after = this.groundPoint(sx, sy);
    if (before && after) this.stage.pan(before.x - after.x, before.z - after.z);
    this.glide = null;
  }

  // Case sous le pointeur : on teste les hauteurs de sol de haut en bas.
  pick(sx, sy) {
    for (const hgt of [M.LAND_TOP, M.LAND_TOP - 0.14, M.LAND_TOP - 0.28, M.WATER_LEVEL]) {
      const p = this.groundPoint(sx, sy, hgt);
      if (!p) continue;
      const x = Math.round(p.x);
      const y = Math.round(p.z);
      const t = this.game.tile(x, y);
      if (t && Math.abs(this.groundTop(t) - hgt) < 0.01) return { x, y };
    }
    const p = this.groundPoint(sx, sy, M.WATER_LEVEL);
    const x = Math.round(p?.x ?? -1);
    const y = Math.round(p?.z ?? -1);
    return this.game.tile(x, y) ? { x, y } : null;
  }

  // ---------- Construction ----------

  buildSea() {
    this.sea = createWater(this.game.size);
    this.scene.add(this.sea);
    this.recolorSea();
  }

  recolorSea() {
    this.sea.userData.recolor((x, y) => {
      const t = this.game.tile(x, y);
      if (!this.visible(x, y) || t.terrain === 'deep') return 'deep';
      return t.terrain === 'land' && (t.sink || 0) < 3 ? 'land' : 'shallow';
    });
  }

  buildLightPool() {
    this.emitters = new Set();
    this.pool = Array.from({ length: LIGHT_POOL }, () => {
      const l = new THREE.PointLight('#ffffff', 0, 2, 1.8);
      this.scene.add(l);
      return l;
    });
  }

  buildOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.canvas.after(this.overlay);
  }

  ring(inner, outer, color, opacity) {
    const geo = new THREE.RingGeometry(inner, outer, 4, 1, Math.PI / 4);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
    m.renderOrder = 2;
    m.visible = false;
    return m;
  }

  // Vide un groupe d'objets à usage unique (géométries et matériaux propres).
  clear(group) {
    for (const o of [...group.children]) {
      o.geometry?.dispose();
      o.material?.dispose();
      o.removeFromParent();
    }
  }

  // Ajoute un modèle à la scène et enregistre ses lumières.
  adopt(group, { dim = 1 } = {}) {
    for (const e of group.userData.emitters ?? []) {
      e.obj = group;
      e.intensity *= dim;
      e.seed = Math.random() * 10;
      this.emitters.add(e);
    }
    this.scene.add(group);
    return group;
  }

  drop(group) {
    for (const e of group.userData.emitters ?? []) this.emitters.delete(e);
    M.disposeGroup(group);
  }

  tileKey(t) {
    if (!this.visible(t.x, t.y)) return 'fog';
    return `${t.terrain}|${t.feature}|${t.resource}|${t.sink}|${t.city != null}`;
  }

  buildTile(t, i) {
    const root = new THREE.Group();
    const seed = i * 7 + 3;
    if (t.terrain === 'land') {
      root.add(M.landBlock(seed, { sink: t.sink || 0 }));
      const top = -0.14 * (t.sink || 0);
      const deco = new THREE.Group();
      deco.position.y = top;
      if (t.city == null && t.feature === 'mangrove') deco.add(M.mangrove(seed));
      if (t.city == null && t.feature === 'falaise') deco.add(M.falaise(seed));
      if (t.resource === 'relique') deco.add(M.relique());
      if (t.resource === 'epave') deco.add(M.epave(seed));
      if (!t.feature && !t.resource && t.city == null && !t.sink) {
        const prop = B.landProp(seed);
        if (prop) deco.add(prop);
      }
      if (t.sink >= 2) {
        for (const [dx, dz, h] of [[-0.2, 0.1, 0.34], [0.18, -0.15, 0.22]]) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 6), M.mat('#3b403c'));
          col.position.set(dx, M.LAND_TOP + h / 2, dz);
          deco.add(col);
        }
      }
      root.add(deco);
    } else if (t.resource === 'nacre') {
      root.add(M.nacre(seed));
    } else {
      return null;
    }
    const baked = M.bake(root);
    baked.position.set(t.x, 0, t.y);
    return baked;
  }

  syncTiles() {
    this.game.tiles.forEach((t, i) => {
      const key = this.tileKey(t);
      const rec = this.tileObjs.get(i);
      if (rec?.key === key) return;
      if (rec?.group) this.drop(rec.group);
      const group = key === 'fog' ? null : this.buildTile(t, i);
      if (group) this.adopt(group);
      this.tileObjs.set(i, { key, group });
    });
  }

  syncCities() {
    for (const city of this.game.cities) {
      const vis = this.visible(city.x, city.y);
      const key = `${vis}|${city.owner}|${city.level}|${city.capital}`;
      let rec = this.cityObjs.get(city.id);
      if (rec?.key === key) continue;
      if (rec?.group) this.drop(rec.group);
      if (!rec) {
        rec = { label: document.createElement('div') };
        rec.label.className = 'clabel';
        this.overlay.appendChild(rec.label);
        this.cityObjs.set(city.id, rec);
      }
      rec.key = key;
      rec.group = null;
      rec.label.style.display = vis ? '' : 'none';
      if (!vis) continue;
      const f = city.owner != null ? this.game.faction(city.owner) : null;
      const model = f ? B.city({ level: city.level, capital: city.capital, color: f.color, light: f.light, seed: city.id }) : M.sanctuary();
      rec.group = this.adopt(M.bake(model));
      rec.group.position.set(city.x, 0, city.y);
      const pips = f ? Array.from({ length: city.level + 1 }, (_, i) => `<i class="${i < city.pop ? 'on' : ''}"></i>`).join('') : '';
      rec.label.style.setProperty('--c', f ? f.color : '#2C4A44');
      rec.label.innerHTML = f
        ? `<span class="lv">${city.level}</span><span class="nm">${city.name}</span><span class="pips">${pips}</span>`
        : '<span class="nm neutral">Sanctuaire</span>';
      rec.popKey = `${city.pop}`;
    }
  }

  unitKey(u) {
    const spent = this.game.current.id === u.owner && u.moved && u.attacked;
    return `${u.type}|${u.vessel}|${u.owner}|${spent}`;
  }

  buildUnit(u, spent) {
    const f = this.game.faction(u.owner);
    const color = spent ? M.mix(f.color, '#0B1416', 0.6) : f.color;
    const model = u.vessel ? U.vessel(u.vessel, color, u.id) : U.unit(u.type, color, u.id);
    model.position.set(0, 0, 0);
    return this.adopt(M.bake(model), { dim: spent ? 0.2 : 1 });
  }

  syncUnits(now, t) {
    const alive = new Set();
    for (const u of this.game.units) {
      alive.add(u.id);
      const key = this.unitKey(u);
      let rec = this.unitObjs.get(u.id);
      if (!rec) {
        rec = { facing: Math.PI / 4, plate: document.createElement('div') };
        rec.plate.className = 'plate';
        this.overlay.appendChild(rec.plate);
        this.unitObjs.set(u.id, rec);
      }
      if (rec.key !== key) {
        if (rec.group) this.drop(rec.group);
        rec.group = this.buildUnit(u, key.endsWith('true'));
        rec.key = key;
      }
      // Position (animée le long du chemin). Sur une cité, l'unité se tient
      // devant les bâtiments, côté caméra.
      const spot = (pt) => {
        const onCity = !u.vessel && this.game.tile(pt.x, pt.y)?.city != null;
        return { x: pt.x + (onCity ? 0.27 : 0), y: pt.y + (onCity ? 0.27 : 0) };
      };
      let { x: gx, y: gy } = spot(u);
      let hop = 0;
      const anim = this.anims.get(u.id);
      if (anim) {
        const p = (now - anim.start) / STEP_MS;
        if (p >= anim.path.length - 1) {
          this.anims.delete(u.id);
        } else {
          const i = Math.max(0, Math.floor(p));
          const k = p - i;
          const a = spot(anim.path[i]);
          const b = spot(anim.path[i + 1]);
          gx = a.x + (b.x - a.x) * k;
          gy = a.y + (b.y - a.y) * k;
          hop = Math.sin(k * Math.PI) * 0.08;
          if (b.x !== a.x || b.y !== a.y) rec.facing = u.vessel ? Math.atan2(-(b.y - a.y), b.x - a.x) : Math.atan2(b.x - a.x, b.y - a.y);
        }
      }
      const tile = this.game.tile(Math.round(gx), Math.round(gy));
      const g = rec.group;
      let y = u.vessel ? M.WATER_LEVEL - 0.02 + Math.sin(t * 1.4 + u.id) * 0.02 : this.groundTop(tile) + hop;
      if (!u.vessel && tile.terrain !== 'land') y = M.WATER_LEVEL + hop;
      let sx = 0;
      const shake = this.shakes.get(u.id);
      if (shake) {
        const k = (now - shake) / 320;
        if (k > 1) this.shakes.delete(u.id);
        else sx = Math.sin(k * 30) * 0.05 * (1 - k);
      }
      g.position.set(gx + sx, y, gy - sx);
      g.rotation.y = rec.facing;
      g.rotation.z = u.vessel ? Math.sin(t * 1.1 + u.id) * 0.04 : 0;
      U.animateParts(g, t, !!anim);
      const vis = this.visible(u.x, u.y);
      g.visible = vis;
      // Plaque de PV.
      const maxHp = this.game.stats(u).maxHp;
      const f = this.game.faction(u.owner);
      const plateKey = `${u.hp}|${key}`;
      if (rec.plateKey !== plateKey) {
        rec.plate.textContent = u.hp;
        rec.plate.style.setProperty('--c', f.color);
        rec.plate.classList.toggle('low', u.hp / maxHp <= 0.35);
        rec.plate.classList.toggle('spent', key.endsWith('true'));
        rec.plateKey = plateKey;
      }
      this.place(rec.plate, vis, gx, y + (u.vessel ? 0.95 : u.type === 'gardien' ? 0.62 : 0.58), gy);
    }
    for (const [id, rec] of this.unitObjs) {
      if (alive.has(id)) continue;
      if (rec.group) this.ghosts.push({ group: rec.group, start: now });
      rec.plate.remove();
      this.unitObjs.delete(id);
    }
  }

  // Bordures de territoire : tirets lumineux le long des frontières.
  syncBorders() {
    this.clear(this.borderGroup);
    const byFaction = new Map();
    for (const t of this.game.tiles) {
      if (t.owner == null || !this.visible(t.x, t.y)) continue;
      const y = this.groundTop(t) + 0.012;
      DIRS.forEach(([dx, dy]) => {
        const n = this.game.tile(t.x + dx, t.y + dy);
        if (n && n.owner === t.owner) return;
        const list = byFaction.get(t.owner) ?? [];
        for (let k = 0; k < 4; k++) {
          const along = -0.5 + 0.035 + k * 0.25 + 0.09;
          const g = new THREE.PlaneGeometry(dx ? 0.03 : 0.16, dx ? 0.16 : 0.03);
          g.rotateX(-Math.PI / 2);
          g.translate(t.x + dx * 0.47 + (dx ? 0 : along), y, t.y + dy * 0.47 + (dy ? 0 : along));
          list.push(g);
        }
        byFaction.set(t.owner, list);
      });
    }
    for (const [fid, geos] of byFaction) {
      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      const color = this.game.faction(fid).color;
      const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
      mesh.renderOrder = 1;
      this.borderGroup.add(mesh);
    }
  }

  // Brume : les cases inexplorées sont recouvertes de nuit, avec des
  // nappes qui dérivent sur la frontière.
  syncFog() {
    this.clear(this.fogGroup);
    const geos = [];
    this.mists = [];
    for (const t of this.game.tiles) {
      if (this.visible(t.x, t.y)) continue;
      const g = new THREE.PlaneGeometry(1.02, 1.02);
      g.rotateX(-Math.PI / 2);
      g.translate(t.x, 0.14, t.y);
      geos.push(g);
      const frontier = this.game.around(t.x, t.y).some((n) => this.visible(n.x, n.y));
      if (frontier && this.mists.length < 70) {
        const m = M.mist(1.8 + Math.random() * 1.4, 0.3);
        m.position.set(t.x, 0.45, t.y);
        m.userData.base = { x: t.x, z: t.y, s: Math.random() * 10 };
        this.fogGroup.add(m);
        this.mists.push(m);
      }
    }
    // Les bords de la carte restent noirs.
    const s = this.game.size;
    for (const [x, z, w, d] of [[(s - 1) / 2, -3.5, s + 12, 6], [(s - 1) / 2, s + 2.5, s + 12, 6], [-3.5, (s - 1) / 2, 6, s], [s + 2.5, (s - 1) / 2, 6, s]]) {
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.14, z);
      geos.push(g);
    }
    if (geos.length) {
      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      this.fogGroup.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: '#05090a', fog: false })));
    }
  }

  syncHighlights() {
    const h = this.highlight;
    if (this._moves !== h.moves || this._attacks !== h.attacks) {
      this._moves = h.moves;
      this._attacks = h.attacks;
      this.clear(this.hlGroup);
      const accent = this.accent;
      for (const step of h.moves.values()) {
        const t = this.game.tile(step.x, step.y);
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(step.x, this.groundTop(t) + 0.02, step.y);
        dot.renderOrder = 2;
        this.hlGroup.add(dot);
      }
      for (const u of h.attacks) {
        const r = this.ring(0.34, 0.45, '#D9604F', 0.9);
        r.visible = true;
        r.position.set(u.x, this.groundTop(this.game.tile(u.x, u.y)) + 0.02, u.y);
        this.hlGroup.add(r);
      }
    }
    const sel = h.selected;
    this.selectionRing.visible = !!sel;
    if (sel) {
      const rec = sel.type && this.anims.has(sel.id) ? this.unitObjs.get(sel.id) : null;
      const pos = rec?.group?.position;
      const x = pos ? pos.x : sel.x;
      const z = pos ? pos.z : sel.y;
      this.selectionRing.material.color.set(this.accent);
      this.selectionRing.position.set(x, this.groundTop(this.game.tile(Math.round(x), Math.round(z))) + 0.022, z);
    }
    this.hoverRing.visible = !!h.hover;
    if (h.hover) this.hoverRing.position.set(h.hover.x, this.groundTop(this.game.tile(h.hover.x, h.hover.y)) + 0.021, h.hover.y);
  }

  // ---------- Événements → animations ----------

  onEvent(e) {
    const now = performance.now();
    if (e.type === 'move') {
      this.anims.set(e.unit.id, { path: e.path, start: now });
    } else if (e.type === 'attack' || e.type === 'retaliate') {
      const { attacker: a, defender: d } = e;
      if (e.ranged || this.game.stats(a).range > 1) this.shoot(a, d);
      this.shakes.set(d.id, now);
      this.addFloat(d.x, d.y, `−${e.damage}`, '#F08A7C', e.ranged ? 360 : 0);
    } else if (e.type === 'heal') {
      this.addFloat(e.unit.x, e.unit.y, `+${e.amount}`, '#B8EADB');
    } else if (e.type === 'harvest') {
      this.addFloat(e.x, e.y, '+1 fidèle', '#F5C26B');
      this.dirty.tiles = true;
    } else if (e.type === 'levelup') {
      this.addFloat(e.city.x, e.city.y, `Niveau ${e.city.level}`, '#F5C26B');
      this.dirty.cities = this.dirty.borders = true;
    } else if (e.type === 'capture') {
      this.addFloat(e.city.x, e.city.y, 'Le feu est allumé', '#F1E9D8');
      this.dirty.cities = this.dirty.borders = true;
    } else if (e.type === 'train') {
      this.addFloat(e.city.x, e.city.y, 'Nouveau fidèle', '#F1E9D8');
    } else if (e.type === 'upgrade') {
      this.addFloat(e.unit.x, e.unit.y, 'Navire noir', '#F5C26B');
    } else if (e.type === 'tide') {
      for (const t of e.submerged) this.addFloat(t.x, t.y, 'Englouti', '#7FD1B9');
      this.dirty.tiles = this.dirty.borders = true;
      this.recolorSea();
    } else if (e.type === 'eliminated') {
      this.dirty.cities = this.dirty.borders = true;
    }
  }

  shoot(a, d) {
    const color = this.game.faction(a.owner).color;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.glowMat(color, 6));
    const emitter = { local: new THREE.Vector3(), color: new THREE.Color(color), intensity: 2.5, distance: 2.5, obj: ball, seed: 0 };
    ball.userData.emitters = [emitter];
    this.emitters.add(emitter);
    this.scene.add(ball);
    const from = new THREE.Vector3(a.x, this.groundTop(this.game.tile(a.x, a.y)) + 0.35, a.y);
    const to = new THREE.Vector3(d.x, this.groundTop(this.game.tile(d.x, d.y)) + 0.25, d.y);
    this.projectiles.push({ ball, emitter, from, to, start: performance.now(), dur: 420 });
  }

  addFloat(x, y, text, color, delay = 0) {
    if (!this.visible(x, y)) return;
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.color = color;
    el.style.display = 'none';
    this.overlay.appendChild(el);
    this.floats.push({ el, x, y, start: performance.now() + delay });
  }

  // ---------- Image par image ----------

  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h };
  }

  place(el, vis, x, y, z) {
    if (!vis) {
      el.style.display = 'none';
      return;
    }
    const p = this.project(x, y, z);
    el.style.display = '';
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
  }

  update(t) {
    const now = performance.now();
    if (this.glide) {
      const v = this.stage.view.target;
      v.lerp(this.glide, 0.12);
      this.stage.pan(0, 0);
      if (v.distanceTo(this.glide) < 0.01) this.glide = null;
    }
    const f = this.game.faction(this.viewerId);
    const explored = f ? f.explored.size : 0;
    if (explored !== this.exploredSize) {
      this.exploredSize = explored;
      this.dirty = { tiles: true, cities: true, borders: true, fog: true };
      this.recolorSea();
    }
    if (this.dirty.tiles) this.syncTiles();
    if (this.dirty.cities) this.syncCities();
    if (this.dirty.borders) this.syncBorders();
    if (this.dirty.fog) this.syncFog();
    this.dirty = { tiles: false, cities: false, borders: false, fog: false };

    this.sea.userData.update(t);
    this.syncUnits(now, t);
    this.syncHighlights();

    // Unités disparues : elles s'enfoncent et s'effacent.
    this.ghosts = this.ghosts.filter((g) => {
      const k = (now - g.start) / 700;
      if (k >= 1) {
        this.drop(g.group);
        return false;
      }
      g.group.position.y -= 0.004;
      g.group.scale.setScalar(1 - k * 0.6);
      return true;
    });
    // Projectiles en cloche.
    this.projectiles = this.projectiles.filter((p) => {
      const k = (now - p.start) / p.dur;
      if (k >= 1) {
        this.emitters.delete(p.emitter);
        M.disposeGroup(p.ball);
        return false;
      }
      p.ball.position.lerpVectors(p.from, p.to, k);
      p.ball.position.y += Math.sin(k * Math.PI) * 0.6;
      return true;
    });
    // Mise à jour de la brume.
    for (const m of this.mists ?? []) {
      const b = m.userData.base;
      m.position.x = b.x + Math.sin(t * 0.15 + b.s) * 0.35;
      m.position.z = b.z + Math.cos(t * 0.12 + b.s) * 0.25;
    }
    this.assignLights(t);
    this.updateOverlay(now);
  }

  // Les lumières les plus proches du centre de la vue reçoivent une
  // vraie source lumineuse ; les autres ne gardent que leur halo.
  assignLights(t) {
    const target = this.stage.view.target;
    const list = [];
    const p = new THREE.Vector3();
    for (const e of this.emitters) {
      if (!e.obj.parent || !e.obj.visible) continue;
      e.obj.localToWorld(p.copy(e.local));
      const d = (p.x - target.x) ** 2 + (p.z - target.z) ** 2;
      list.push({ e, d, x: p.x, y: p.y, z: p.z });
    }
    list.sort((a, b) => a.d - b.d);
    this.pool.forEach((light, i) => {
      const item = list[i];
      if (!item) {
        light.intensity = 0;
        return;
      }
      const { e } = item;
      light.position.set(item.x, item.y, item.z);
      light.color.copy(e.color);
      light.distance = e.distance;
      light.intensity = e.intensity * (0.88 + Math.sin(t * 9 + e.seed) * 0.06 + Math.sin(t * 23 + e.seed * 2) * 0.05);
    });
    this.sea.userData.setLights(this.pool);
  }

  updateOverlay(now) {
    for (const city of this.game.cities) {
      const rec = this.cityObjs.get(city.id);
      if (!rec) continue;
      const vis = this.visible(city.x, city.y);
      if (vis && rec.popKey !== `${city.pop}`) {
        rec.popKey = `${city.pop}`;
        rec.label.querySelectorAll('.pips i').forEach((el, i) => el.classList.toggle('on', i < city.pop));
      }
      rec.label.classList.toggle('sel', this.highlight.selectedCity === city.id);
      this.place(rec.label, vis, city.x, M.LAND_TOP, city.y + 0.42);
    }
    this.floats = this.floats.filter((f) => {
      const k = (now - f.start) / 1400;
      if (k >= 1) {
        f.el.remove();
        return false;
      }
      if (k < 0) return true;
      const tile = this.game.tile(f.x, f.y);
      this.place(f.el, true, f.x, this.groundTop(tile) + 0.75 + k * 0.35, f.y);
      f.el.style.opacity = String(1 - k * k);
      return true;
    });
  }
}
