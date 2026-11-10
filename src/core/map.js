// Génération procédurale d'un archipel : îles, récifs, forêts de palmiers,
// montagnes, ressources, capitales des factions et repaires neutres.
import { createRng } from './rng.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(size, cell, rng) {
  const g = Math.ceil(size / cell) + 2;
  const grid = Array.from({ length: g * g }, () => rng.next());
  const v = (i, j) => grid[j * g + i];
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const a = lerp(v(x0, y0), v(x0 + 1, y0), tx);
    const b = lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), tx);
    return lerp(a, b, ty);
  };
}

export const chebyshev = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function generateMap({ size = 16, factions = 2, seed = Date.now(), landRatio = 0.44 } = {}) {
  const rng = createRng(seed);
  const tiles = [];
  const at = (x, y) => tiles[y * size + x];
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
  const around = (x, y, r = 1) => {
    const out = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if ((dx || dy) && inBounds(x + dx, y + dy)) out.push(at(x + dx, y + dy));
      }
    }
    return out;
  };

  // 1. Relief : deux octaves de bruit, atténuées sur les bords de la carte.
  const big = valueNoise(size, 4.5, rng);
  const small = valueNoise(size, 2, rng);
  const heights = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      const h = 0.65 * big(x, y) + 0.35 * small(x, y) - Math.max(0, 2 - edge) * 0.18;
      heights.push(h);
      tiles.push({ x, y, terrain: 'deep', feature: null, resource: null, city: null, owner: null, region: null });
    }
  }
  const threshold = [...heights].sort((a, b) => b - a)[Math.floor(size * size * landRatio)];
  tiles.forEach((t, i) => {
    if (heights[i] > threshold) t.terrain = 'land';
  });

  // 2. Capitales réparties en cercle autour du centre.
  const capitals = [];
  const angle0 = rng.next() * Math.PI * 2;
  const c = (size - 1) / 2;
  for (let i = 0; i < factions; i++) {
    const ang = angle0 + (i / factions) * Math.PI * 2;
    const tx = c + Math.cos(ang) * size * 0.32;
    const ty = c + Math.sin(ang) * size * 0.32;
    let best = null;
    let bestD = Infinity;
    for (const t of tiles) {
      if (Math.min(t.x, t.y, size - 1 - t.x, size - 1 - t.y) < 2) continue;
      const d = Math.hypot(t.x - tx, t.y - ty) - (t.terrain === 'land' ? 1.5 : 0);
      if (d < bestD && capitals.every((cap) => chebyshev(cap, t) >= 4)) {
        bestD = d;
        best = t;
      }
    }
    capitals.push({ x: best.x, y: best.y });
    // Garantit une petite île de départ.
    best.terrain = 'land';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) at(best.x + dx, best.y + dy).terrain = 'land';
  }

  // 3. Hauts-fonds autour des côtes, abysses ailleurs.
  for (const t of tiles) {
    if (t.terrain !== 'land') t.terrain = around(t.x, t.y).some((n) => n.terrain === 'land') ? 'shallow' : 'deep';
  }

  // 4. Forêts et montagnes.
  for (const t of tiles) {
    if (t.terrain !== 'land') continue;
    const r = rng.next();
    if (r < 0.24) t.feature = 'forest';
    else if (r < 0.36) t.feature = 'mountain';
  }
  for (const cap of capitals) at(cap.x, cap.y).feature = null;

  // 5. Repaires neutres, espacés des autres villes.
  const villages = [];
  const cities = () => [...capitals, ...villages];
  const wanted = Math.round((size * size) / 22);
  const candidates = rng.shuffle(tiles.filter((t) => t.terrain === 'land'));
  for (const t of candidates) {
    if (villages.length >= wanted) break;
    if (Math.min(t.x, t.y, size - 1 - t.x, size - 1 - t.y) < 1) continue;
    if (cities().every((city) => chebyshev(city, t) >= 3)) {
      t.feature = null;
      villages.push({ x: t.x, y: t.y });
    }
  }

  // 6. Ressources.
  const isCity = (t) => cities().some((city) => city.x === t.x && city.y === t.y);
  for (const t of tiles) {
    if (isCity(t)) continue;
    if (t.terrain === 'shallow' && rng.chance(0.2)) t.resource = 'fish';
    else if (t.terrain === 'land' && t.feature === 'mountain' && rng.chance(0.35)) t.resource = 'gold';
    else if (t.terrain === 'land' && t.feature !== 'mountain' && rng.chance(0.18)) t.resource = 'fruit';
  }
  // Chaque capitale démarre avec au moins deux cocotiers et un banc de poissons.
  for (const cap of capitals) {
    const ns = rng.shuffle(around(cap.x, cap.y));
    let fruits = ns.filter((n) => n.resource === 'fruit').length;
    for (const n of ns) {
      if (fruits >= 2) break;
      if (n.terrain === 'land' && !n.resource && !isCity(n)) {
        n.feature = null;
        n.resource = 'fruit';
        fruits++;
      }
    }
    if (!ns.some((n) => n.resource === 'fish')) {
      const water = ns.find((n) => n.terrain === 'shallow' && !n.resource);
      if (water) water.resource = 'fish';
    }
  }

  return { size, seed, tiles, capitals, villages };
}
