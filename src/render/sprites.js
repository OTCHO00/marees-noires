// Tous les visuels sont dessinés au canvas (aucune image à charger) :
// mer, îles, palmiers, montagnes, ports, pirates et navires.
import { TW, TH, ELEV, tileRand } from './iso.js';

export const PALETTE = {
  deep: '#15527a',
  deepLight: '#1d6591',
  shallow: '#2fa7b8',
  shallowLight: '#4cc3cc',
  sand: '#efd595',
  sandSide: '#c8984f',
  sandSideDark: '#a6773a',
  grass: '#86c24f',
  grassDark: '#6aa83d',
  forest: '#5d9b3c',
  rock: '#9c8f7b',
  rockDark: '#776b5a',
  skin: '#f1c27d',
  wood: '#7a4a24',
  woodDark: '#4f2d14',
  cloud: '#eef3f5',
  cloudShade: '#cdd8de',
};

export function diamond(ctx, cx, cy, s = 1) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - (TH / 2) * s);
  ctx.lineTo(cx + (TW / 2) * s, cy);
  ctx.lineTo(cx, cy + (TH / 2) * s);
  ctx.lineTo(cx - (TW / 2) * s, cy);
  ctx.closePath();
}

// ---------- Terrain ----------

export function drawWater(ctx, tile, cx, cy, time) {
  const deep = tile.terrain === 'deep';
  const r = tileRand(tile.x, tile.y);
  diamond(ctx, cx, cy, 1.02);
  ctx.fillStyle = deep ? (r > 0.5 ? PALETTE.deep : PALETTE.deepLight) : r > 0.5 ? PALETTE.shallow : PALETTE.shallowLight;
  ctx.fill();
  // Petites vagues animées.
  ctx.strokeStyle = deep ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const ox = (tileRand(tile.x, tile.y, i + 1) - 0.5) * 40;
    const oy = (tileRand(tile.x, tile.y, i + 5) - 0.5) * 16;
    const phase = Math.sin(time * 1.4 + r * 10 + i * 2);
    ctx.beginPath();
    ctx.moveTo(cx + ox - 8, cy + oy + phase);
    ctx.quadraticCurveTo(cx + ox - 4, cy + oy - 3 + phase, cx + ox, cy + oy + phase);
    ctx.quadraticCurveTo(cx + ox + 4, cy + oy - 3 + phase, cx + ox + 8, cy + oy + phase);
    ctx.stroke();
  }
}

export function drawLand(ctx, tile, cx, cy, coastal) {
  const top = cy - ELEV;
  // Flancs du bloc.
  ctx.beginPath();
  ctx.moveTo(cx - TW / 2, top);
  ctx.lineTo(cx, top + TH / 2);
  ctx.lineTo(cx, cy + TH / 2);
  ctx.lineTo(cx - TW / 2, cy);
  ctx.closePath();
  ctx.fillStyle = PALETTE.sandSide;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + TW / 2, top);
  ctx.lineTo(cx, top + TH / 2);
  ctx.lineTo(cx, cy + TH / 2);
  ctx.lineTo(cx + TW / 2, cy);
  ctx.closePath();
  ctx.fillStyle = PALETTE.sandSideDark;
  ctx.fill();
  // Écume au pied des falaises.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - TW / 2, cy + 1);
  ctx.lineTo(cx, cy + TH / 2 + 1);
  ctx.lineTo(cx + TW / 2, cy + 1);
  ctx.stroke();

  // Dessus : plage en bordure, herbe au centre.
  const r = tileRand(tile.x, tile.y, 9);
  const inner = tile.feature === 'mountain' ? PALETTE.rock : tile.feature === 'forest' ? PALETTE.forest : r > 0.5 ? PALETTE.grass : PALETTE.grassDark;
  if (coastal) {
    diamond(ctx, cx, top, 1.01);
    ctx.fillStyle = PALETTE.sand;
    ctx.fill();
    diamond(ctx, cx, top, 0.78);
  } else {
    diamond(ctx, cx, top, 1.01);
  }
  ctx.fillStyle = inner;
  ctx.fill();
  // Touffes d'herbe.
  if (!tile.feature) {
    ctx.strokeStyle = 'rgba(40,90,20,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const gx = cx + (tileRand(tile.x, tile.y, i + 20) - 0.5) * 40;
      const gy = top + (tileRand(tile.x, tile.y, i + 30) - 0.5) * 16;
      ctx.beginPath();
      ctx.moveTo(gx - 2, gy);
      ctx.lineTo(gx - 3, gy - 4);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - 5);
      ctx.moveTo(gx + 2, gy);
      ctx.lineTo(gx + 3, gy - 4);
      ctx.stroke();
    }
  }
}

export function drawPalm(ctx, x, y, s, time, seed) {
  const sway = Math.sin(time * 1.2 + seed * 6) * 1.5 * s;
  const tx = x + 5 * s + sway;
  const ty = y - 30 * s;
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.wood;
  ctx.lineWidth = 3.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 2 * s, y - 16 * s, tx, ty);
  ctx.stroke();
  const leaves = [-2.6, -1.9, -1.2, -0.4, 0.3];
  leaves.forEach((a, i) => {
    const ang = a + Math.sin(time + seed * 3 + i) * 0.05;
    const lx = tx + Math.cos(ang) * 16 * s;
    const ly = ty + Math.sin(ang) * 10 * s + 6 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + lx) / 2, ty - 8 * s, lx, ly);
    ctx.quadraticCurveTo((tx + lx) / 2, ty - 1 * s, tx, ty);
    ctx.fillStyle = i % 2 ? '#2f8a35' : '#3fa645';
    ctx.fill();
  });
  ctx.fillStyle = '#6b3d1a';
  ctx.beginPath();
  ctx.arc(tx - 1.5 * s, ty + 2 * s, 1.8 * s, 0, Math.PI * 2);
  ctx.arc(tx + 2 * s, ty + 2.5 * s, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();
}

export function drawForest(ctx, tile, cx, cy, time) {
  const top = cy - ELEV;
  const spots = [[-18, 2], [14, -4], [2, 8]];
  spots.forEach(([dx, dy], i) => {
    const s = 0.85 + tileRand(tile.x, tile.y, i + 40) * 0.35;
    drawPalm(ctx, cx + dx, top + dy, s, time, tileRand(tile.x, tile.y, i));
  });
}

export function drawMountain(ctx, tile, cx, cy) {
  const top = cy - ELEV;
  const peak = (x, y, w, h, light, dark) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fillStyle = light;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.1, y);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    // Sommet verdoyant (île tropicale).
    ctx.beginPath();
    ctx.moveTo(x - w * 0.28, y - h * 0.72);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w * 0.28, y - h * 0.72);
    ctx.lineTo(x + w * 0.1, y - h * 0.66);
    ctx.lineTo(x - w * 0.08, y - h * 0.74);
    ctx.closePath();
    ctx.fillStyle = '#e9e4d6';
    ctx.fill();
  };
  const h = 34 + tileRand(tile.x, tile.y, 3) * 10;
  peak(cx + 14, top + 6, 18, h * 0.65, '#a59680', PALETTE.rockDark);
  peak(cx - 6, top + 8, 26, h, '#b3a48c', '#857761');
}

// ---------- Ressources ----------

export function drawResource(ctx, tile, cx, cy, time) {
  const top = tile.terrain === 'land' ? cy - ELEV : cy;
  if (tile.resource === 'fish') {
    for (let i = 0; i < 2; i++) {
      const t = time * 1.3 + i * 2.4 + tileRand(tile.x, tile.y) * 6;
      const fx = cx + Math.cos(t) * 14;
      const fy = top + Math.sin(t) * 6 + (i ? 4 : -2);
      const dir = -Math.sin(t) >= 0 ? 1 : -1;
      ctx.fillStyle = i ? '#f7b955' : '#f39c4a';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - dir * 5, fy);
      ctx.lineTo(fx - dir * 10, fy - 3.5);
      ctx.lineTo(fx - dir * 10, fy + 3.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const b = (time * 0.8 + tileRand(tile.x, tile.y, 2)) % 1;
    ctx.beginPath();
    ctx.arc(cx + 10, top - 4 - b * 10, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.resource === 'fruit') {
    const x = cx + 16;
    const y = top + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f8a35';
    for (const [dx, dy, r] of [[-6, -4, 7], [5, -5, 7], [0, -10, 7]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8b5a2b';
    for (const [dx, dy] of [[-4, -2], [3, -3], [0, -8], [6, -9]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tile.resource === 'gold') {
    const x = cx - 18;
    const y = top + 10;
    ctx.fillStyle = '#c98d12';
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x - 3, y - 7);
    ctx.lineTo(x + 5, y - 6);
    ctx.lineTo(x + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 1);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x + 3, y - 5);
    ctx.closePath();
    ctx.fill();
    sparkle(ctx, x + 4, y - 10, 3 + Math.sin(time * 4 + tile.x) * 1.5);
  }
}

function sparkle(ctx, x, y, r) {
  ctx.fillStyle = '#fff6c2';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.3, y - r * 0.3);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.3, y + r * 0.3);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.3, y + r * 0.3);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.3, y - r * 0.3);
  ctx.closePath();
  ctx.fill();
}

// ---------- Ports ----------

export function drawFlag(ctx, x, y, color, time, size = 1, skull = true) {
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2 * size;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 30 * size);
  ctx.stroke();
  const w = 18 * size;
  const h = 12 * size;
  const fy = y - 30 * size;
  ctx.beginPath();
  ctx.moveTo(x, fy);
  for (let i = 0; i <= 6; i++) {
    const px = x + (w * i) / 6;
    ctx.lineTo(px, fy + Math.sin(time * 5 + i * 0.9) * 1.6 * size * (i / 6));
  }
  for (let i = 6; i >= 0; i--) {
    const px = x + (w * i) / 6;
    ctx.lineTo(px, fy + h + Math.sin(time * 5 + i * 0.9) * 1.6 * size * (i / 6));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (skull) {
    const sx = x + w * 0.5;
    const sy = fy + h * 0.45 + Math.sin(time * 5 + 3) * 0.8 * size;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.6 * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 1.5 * size, sy + 1.5 * size, 3 * size, 2 * size);
    ctx.fillStyle = color;
    ctx.fillRect(sx - 1.4 * size, sy - 0.6 * size, 1 * size, 1 * size);
    ctx.fillRect(sx + 0.4 * size, sy - 0.6 * size, 1 * size, 1 * size);
  }
}

function house(ctx, x, y, s, roof, wall = '#efe2c4') {
  const w = 11 * s;
  const h = 10 * s;
  // Mur gauche et droit (petit cube isométrique).
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.moveTo(x - w, y - h);
  ctx.lineTo(x, y - h + w / 2);
  ctx.lineTo(x, y + w / 2);
  ctx.lineTo(x - w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cdbb98';
  ctx.beginPath();
  ctx.moveTo(x + w, y - h);
  ctx.lineTo(x, y - h + w / 2);
  ctx.lineTo(x, y + w / 2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  // Porte.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x - w * 0.55, y - h * 0.55 + w * 0.2, 3.5 * s, 6 * s);
  // Toit.
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - w - 2, y - h + 1);
  ctx.lineTo(x, y - h - 9 * s);
  ctx.lineTo(x + w + 2, y - h + 1);
  ctx.lineTo(x, y - h + w / 2 + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(x, y - h - 9 * s);
  ctx.lineTo(x + w + 2, y - h + 1);
  ctx.lineTo(x, y - h + w / 2 + 2);
  ctx.closePath();
  ctx.fill();
}

function tower(ctx, x, y, color) {
  ctx.fillStyle = '#b9ad98';
  ctx.fillRect(x - 10, y - 34, 20, 34);
  ctx.fillStyle = '#9d907a';
  ctx.fillRect(x, y - 34, 10, 34);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 2 ? '#9d907a' : '#b9ad98';
    ctx.fillRect(x - 10 + i * 7.5, y - 39, 5, 5);
  }
  ctx.fillStyle = PALETTE.woodDark;
  ctx.beginPath();
  ctx.arc(x - 3, y - 6, 4, Math.PI, 0);
  ctx.fillRect(x - 7, y - 6, 8, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 10, y - 26, 20, 3);
}

const HOUSE_SPOTS = [[-18, 6], [18, 6], [0, 14], [-24, -4], [24, -4], [0, -8]];

export function drawCity(ctx, city, faction, cx, cy, time) {
  const top = cy - ELEV;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  diamond(ctx, cx, top, 0.8);
  ctx.fill();
  if (!faction) {
    // Repaire neutre : huttes de paille et drapeau délavé.
    house(ctx, cx - 12, top + 8, 1, '#d8b45a', '#a9825a');
    house(ctx, cx + 14, top + 4, 0.9, '#cfa94c', '#a9825a');
    drawFlag(ctx, cx + 2, top - 4, '#5d5a55', time, 0.9);
    return;
  }
  const n = Math.min(HOUSE_SPOTS.length, city.level + 1);
  const spots = HOUSE_SPOTS.slice(0, n).sort((a, b) => a[1] - b[1]);
  for (const [dx, dy] of spots) house(ctx, cx + dx, top + dy, 1, faction.color);
  if (city.capital) {
    tower(ctx, cx, top + 2, faction.color);
    drawFlag(ctx, cx, top - 37, faction.color, time, 1.1);
  } else {
    drawFlag(ctx, cx + 2, top - 2, faction.color, time, 1);
  }
}

export function drawCityLabel(ctx, city, faction, cx, cy, highlight) {
  const y = cy + 22;
  ctx.font = '600 13px "IM Fell English", Georgia, serif';
  const name = faction ? city.name : 'Repaire';
  const w = ctx.measureText(name).width + (faction ? 30 : 16);
  ctx.fillStyle = highlight ? 'rgba(40,24,10,0.92)' : 'rgba(30,20,10,0.72)';
  roundRect(ctx, cx - w / 2, y - 9, w, 18, 9);
  ctx.fill();
  if (faction) {
    ctx.fillStyle = faction.color;
    ctx.beginPath();
    ctx.arc(cx - w / 2 + 10, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(city.level), cx - w / 2 + 10, y + 0.5);
  }
  ctx.font = '600 13px "IM Fell English", Georgia, serif';
  ctx.fillStyle = '#f7ead0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, cx + (faction ? 8 : 0), y + 1);
  if (faction) {
    // Jauge de population.
    const slots = city.level + 1;
    const pw = 7;
    const total = slots * pw + (slots - 1) * 2;
    for (let i = 0; i < slots; i++) {
      ctx.fillStyle = i < city.pop ? '#f2c14e' : 'rgba(255,255,255,0.25)';
      roundRect(ctx, cx - total / 2 + i * (pw + 2), y + 11, pw, 4, 2);
      ctx.fill();
    }
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- Unités ----------

function pirate(ctx, x, y, faction, type, time) {
  const bob = Math.sin(time * 3 + x * 0.1) * 0.8;
  const big = type === 'bretteur' ? 1.15 : 1;
  y += bob;
  // Jambes.
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x - 5 * big, y - 8, 4 * big, 8);
  ctx.fillRect(x + 1 * big, y - 8, 4 * big, 8);
  // Manteau.
  ctx.fillStyle = faction.color;
  ctx.beginPath();
  ctx.moveTo(x - 8 * big, y - 7);
  ctx.lineTo(x - 6 * big, y - 24 * big);
  ctx.lineTo(x + 6 * big, y - 24 * big);
  ctx.lineTo(x + 8 * big, y - 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = faction.dark;
  ctx.fillRect(x - 7 * big, y - 13, 14 * big, 2.5);
  ctx.fillStyle = '#f0d9a8';
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 24 * big);
  ctx.lineTo(x, y - 16 * big);
  ctx.lineTo(x + 2, y - 24 * big);
  ctx.fill();
  // Tête.
  const hy = y - 29 * big;
  ctx.fillStyle = PALETTE.skin;
  ctx.beginPath();
  ctx.arc(x, hy, 5.2 * big, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 1, hy - 1.5, 3, 2); // bandeau sur l'œil
  // Tricorne.
  ctx.fillStyle = '#1d1a17';
  ctx.beginPath();
  ctx.moveTo(x - 9 * big, hy - 2);
  ctx.quadraticCurveTo(x, hy - 14 * big, x + 9 * big, hy - 2);
  ctx.quadraticCurveTo(x, hy - 5, x - 9 * big, hy - 2);
  ctx.fill();
  ctx.fillStyle = '#d9b44a';
  ctx.fillRect(x - 6 * big, hy - 4.5, 12 * big, 1.3);

  // Arme selon le type.
  ctx.lineCap = 'round';
  if (type === 'boucanier') {
    ctx.strokeStyle = PALETTE.wood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 12);
    ctx.lineTo(x + 18, y - 26);
    ctx.stroke();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 22);
    ctx.lineTo(x + 22, y - 30);
    ctx.stroke();
  } else if (type === 'eclaireur') {
    ctx.strokeStyle = '#c9a046';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 26);
    ctx.lineTo(x + 16, y - 31);
    ctx.stroke();
    ctx.strokeStyle = '#7a5a1c';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 30);
    ctx.lineTo(x + 17, y - 31.5);
    ctx.stroke();
  } else {
    const blades = type === 'bretteur' ? [[1, 0], [-1, 0.3]] : [[1, 0]];
    for (const [side, off] of blades) {
      ctx.strokeStyle = '#dfe6ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + side * 8, y - 12 - off * 4);
      ctx.quadraticCurveTo(x + side * 18, y - 20, x + side * 16, y - 32);
      ctx.stroke();
      ctx.strokeStyle = '#d9b44a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + side * 5, y - 12);
      ctx.lineTo(x + side * 11, y - 12);
      ctx.stroke();
    }
  }
}

function cannon(ctx, x, y, faction, time) {
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(x - 12, y - 10, 22, 6);
  ctx.fillStyle = '#2b2b2b';
  ctx.save();
  ctx.translate(x - 2, y - 13);
  ctx.rotate(-0.35);
  roundRect(ctx, -6, -4.5, 26, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#444';
  ctx.fillRect(16, -5.5, 4, 11);
  ctx.restore();
  for (const wx of [-8, 6]) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.beginPath();
    ctx.arc(x + wx, y - 3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b48a4f';
    ctx.beginPath();
    ctx.arc(x + wx, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  drawFlag(ctx, x - 12, y - 8, faction.color, time, 0.55, false);
}

function ship(ctx, x, y, faction, galleon, time) {
  const bob = Math.sin(time * 2 + x * 0.05) * 1.6;
  const tilt = Math.sin(time * 1.6 + y * 0.05) * 0.04;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(tilt);
  const s = galleon ? 1.3 : 1;
  // Sillage.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 2, 22 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Coque.
  ctx.fillStyle = PALETTE.wood;
  ctx.beginPath();
  ctx.moveTo(-20 * s, -6 * s);
  ctx.lineTo(20 * s, -6 * s);
  ctx.quadraticCurveTo(16 * s, 4 * s, 10 * s, 4 * s);
  ctx.lineTo(-12 * s, 4 * s);
  ctx.quadraticCurveTo(-18 * s, 2 * s, -20 * s, -6 * s);
  ctx.fill();
  ctx.fillStyle = faction.dark;
  ctx.fillRect(-18 * s, -6 * s, 37 * s, 2.5 * s);
  if (galleon) {
    ctx.fillStyle = '#222';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 7 * s - 1.5, -1 * s, 3, 2.5);
  }
  // Mâts et voiles.
  const masts = galleon ? [-7, 8] : [0];
  masts.forEach((mx, i) => {
    const h = (galleon && i === 1 ? 34 : 30) * s;
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx * s, -6 * s);
    ctx.lineTo(mx * s, -6 * s - h);
    ctx.stroke();
    const billow = Math.sin(time * 2.5 + i) * 1.5;
    ctx.fillStyle = galleon ? '#f4ead2' : '#fbf5e6';
    ctx.beginPath();
    ctx.moveTo(mx * s - 10 * s, -10 * s - h * 0.8);
    ctx.quadraticCurveTo(mx * s + billow + 2, -6 * s - h * 0.5, mx * s - 10 * s, -9 * s);
    ctx.lineTo(mx * s + 10 * s, -9 * s);
    ctx.quadraticCurveTo(mx * s + 12 * s + billow, -6 * s - h * 0.5, mx * s + 10 * s, -10 * s - h * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = faction.color;
    ctx.fillRect(mx * s - 9 * s, -6 * s - h * 0.5, 18 * s, 3 * s);
    if (i === masts.length - 1) drawFlag(ctx, mx * s, -6 * s - h + 30 * 0.6, faction.color, time, 0.6, false);
  });
  ctx.restore();
}

export function drawUnit(ctx, unit, faction, x, y, time, opts = {}) {
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  if (!unit.vessel) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Socle aux couleurs de la faction.
    ctx.strokeStyle = faction.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (unit.vessel) ship(ctx, x, y, faction, unit.vessel === 'galion', time);
  else if (unit.type === 'canonnier') cannon(ctx, x, y, faction, time);
  else pirate(ctx, x, y, faction, unit.type, time);

  // Pastille de points de vie.
  const bx = x + 15;
  const by = y - 6;
  const ratio = unit.hp / opts.maxHp;
  ctx.fillStyle = 'rgba(20,14,8,0.85)';
  ctx.beginPath();
  ctx.arc(bx, by, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = faction.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = ratio > 0.6 ? '#ffffff' : ratio > 0.3 ? '#ffd166' : '#ff6b5a';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(unit.hp), bx, by + 0.5);
  ctx.restore();
}

// ---------- Brouillard ----------

export function drawCloud(ctx, x, y, cx, cy, time) {
  diamond(ctx, cx, cy - 6, 1.06);
  ctx.fillStyle = PALETTE.cloudShade;
  ctx.fill();
  const drift = Math.sin(time * 0.4 + x + y * 0.7) * 3;
  const puffs = [[-22, -8, 18], [4, -14, 22], [24, -6, 16], [-4, 2, 18]];
  puffs.forEach(([dx, dy, r], i) => {
    const rr = r * (0.85 + tileRand(x, y, i + 60) * 0.3);
    ctx.fillStyle = PALETTE.cloudShade;
    ctx.beginPath();
    ctx.arc(cx + dx + drift, cy + dy + 3, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.cloud;
    ctx.beginPath();
    ctx.arc(cx + dx + drift - 2, cy + dy - 1, rr * 0.92, 0, Math.PI * 2);
    ctx.fill();
  });
}
