// Visuels « Lanterne & Brume » dessinés au canvas : basalte, eaux noires,
// silhouettes, et une seule source de couleur chaude par culte, sa lumière.
// Les tracés reprennent ceux de la planche de direction artistique (SVG).
import { TW, TH, ELEV, tileRand } from './iso.js';

export const INK = '#050909';
export const C = {
  deep: '#0A1517',
  deepLine: '#1E3632',
  deepEdge: '#14262A',
  shallow: '#15302C',
  shallowLine: '#2C4A44',
  top: '#1F2E2B',
  topAlt: '#22332F',
  left: '#121C1B',
  right: '#0C1413',
  rim: '#5E7C76',
  edge: '#2C4A44',
  crag: '#16211F',
  dark: '#070D0E',
  sail: '#3B4D49',
  mast: '#1B2A27',
  steel: '#8FA3A0',
  sigil: '#7FD1B9',
  pale: '#CFE3DC',
  mist: '#8FA3A0',
  neutral: '#8FA3A0',
};

// ---------- Outils ----------

const paths = new Map();
const P = (d) => {
  if (!paths.has(d)) paths.set(d, new Path2D(d));
  return paths.get(d);
};
const fill = (ctx, d, color) => {
  ctx.fillStyle = color;
  ctx.fill(P(d));
};
const stroke = (ctx, d, color, width = 1, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(P(d));
  ctx.restore();
};
const circle = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};
const ellipse = (ctx, x, y, rx, ry, color, strokeColor, width = 1, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();
};

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Mélange deux couleurs hexadécimales (t = part de b).
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export function diamond(ctx, cx, cy, s = 1) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - (TH / 2) * s);
  ctx.lineTo(cx + (TW / 2) * s, cy);
  ctx.lineTo(cx, cy + (TH / 2) * s);
  ctx.lineTo(cx - (TW / 2) * s, cy);
  ctx.closePath();
}

// Halo lumineux : un dégradé radial pré-calculé par couleur.
const glows = new Map();
export function glow(ctx, x, y, r, color, alpha = 1) {
  if (!glows.has(color)) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, rgba(color, 0.6));
    grad.addColorStop(0.4, rgba(color, 0.16));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glows.set(color, c);
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(glows.get(color), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Nappe de brume floutée, rendue une seule fois puis réutilisée.
let mistSprite = null;
function getMist() {
  if (mistSprite) return mistSprite;
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 150;
  const g = c.getContext('2d');
  g.filter = 'blur(9px)';
  g.fillStyle = C.mist;
  for (const [x, y, rx, ry, a] of [[100, 72, 48, 18, 0.42], [140, 82, 44, 16, 0.34], [120, 58, 36, 14, 0.26]]) {
    g.globalAlpha = a;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }
  mistSprite = c;
  return c;
}

// ---------- Terrain ----------

const TOP = 'M0 -30 L60 0 L0 30 L-60 0Z';
const LEFT = 'M-60 0 L0 30 L0 54 L-60 24Z';
const RIGHT = 'M60 0 L0 30 L0 54 L60 24Z';

export function drawWater(ctx, tile, cx, cy, time) {
  const deep = tile.terrain === 'deep';
  ctx.save();
  ctx.translate(cx, cy);
  fill(ctx, 'M0 -30.5 L61 0 L0 30.5 L-61 0Z', deep ? C.deep : C.shallow);
  const r = tileRand(tile.x, tile.y);
  ctx.strokeStyle = deep ? C.deepLine : C.shallowLine;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const ox = (tileRand(tile.x, tile.y, i + 1) - 0.5) * 50;
    const oy = (tileRand(tile.x, tile.y, i + 5) - 0.5) * 20;
    const ph = Math.sin(time * 1.1 + r * 10 + i * 2) * 1.2;
    ctx.beginPath();
    ctx.moveTo(ox - 14, oy + ph);
    ctx.quadraticCurveTo(ox - 10.5, oy - 4 + ph, ox - 7, oy + ph);
    ctx.quadraticCurveTo(ox - 3.5, oy - 4 + ph, ox, oy + ph);
    ctx.quadraticCurveTo(ox + 3.5, oy - 4 + ph, ox + 7, oy + ph);
    ctx.stroke();
  }
  if (!deep && r > 0.55) {
    ellipse(ctx, 24, -6, 5, 2.5, C.right);
    ellipse(ctx, -22, 12, 4, 2, C.right);
  }
  ctx.restore();
}

// Bloc de basalte. `sink` (0-3) décrit l'avancée de la marée sur l'île.
export function drawLand(ctx, tile, cx, cy) {
  const sink = tile.sink || 0;
  ctx.save();
  if (sink >= 3) {
    // Il ne reste qu'un éclat de roche au-dessus de l'eau.
    ctx.translate(cx, cy);
    fill(ctx, TOP, C.deep);
    fill(ctx, 'M0 -2 L22 9 L0 20 L-22 9Z', '#1A2826');
    ctx.restore();
    return;
  }
  const drop = sink === 2 ? 16 : 0;
  ctx.translate(cx, cy - ELEV + drop);
  fill(ctx, LEFT, C.left);
  fill(ctx, RIGHT, C.right);
  fill(ctx, TOP, tileRand(tile.x, tile.y, 9) > 0.5 ? C.top : C.topAlt);
  stroke(ctx, 'M-60 0 L0 -30 L60 0', C.rim, 1, 0.55);
  stroke(ctx, 'M-60 24 L0 54 L60 24', C.edge, 1.2);
  if (sink === 2) {
    // L'eau recouvre les flancs.
    fill(ctx, 'M0 6 L66 39 L0 72 L-66 39Z', rgba(C.deep, 0.88));
  }
  ctx.restore();
}

// Ondes autour des îles condamnées, dessinées au-dessus du terrain.
export function drawSinking(ctx, tile, cx, cy, time) {
  const sink = tile.sink || 0;
  if (!sink) return;
  const pulse = 0.5 + Math.sin(time * 2 + tile.x) * 0.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.setLineDash([2, 5]);
  if (sink === 1) ellipse(ctx, 0, 16, 72, 16, null, C.rim, 1, pulse);
  if (sink === 2) {
    ctx.setLineDash([]);
    stroke(ctx, 'M-44 12 q8 -4 16 0 t16 0 t16 0 t16 0', C.rim, 1, 0.7);
    stroke(ctx, 'M-24 22 q8 -4 16 0 t16 0', C.rim, 1, 0.6);
  }
  if (sink === 3) {
    ctx.setLineDash([]);
    ellipse(ctx, 0, 12, 34, 9, null, C.rim, 1, 0.6);
    const b = (time * 0.6 + tile.y * 0.3) % 1;
    ellipse(ctx, 16, -6 - b * 14, 2, 2, null, C.rim, 1, 1 - b);
  }
  ctx.setLineDash([]);
  // Ruines qui dépassent encore.
  const lift = sink === 1 ? -ELEV : sink === 2 ? -ELEV + 16 : 0;
  ctx.translate(0, lift);
  if (sink < 3) {
    fill(ctx, 'M-12 8 L-12 -22 L-6 -26 L-2 -20 L-2 8Z', C.dark);
    stroke(ctx, 'M-12 8 L-12 -22 L-6 -26 L-2 -20 L-2 8Z', C.edge, 1);
  } else {
    fill(ctx, 'M-8 12 L-8 -4 L-3 -8 L0 -2 L0 12Z', C.dark);
  }
  ctx.restore();
}

export function drawMangrove(ctx, tile, cx, cy, time) {
  ctx.save();
  ctx.translate(cx, cy - ELEV);
  const sway = Math.sin(time * 0.8 + tile.x) * 0.6;
  ctx.translate(sway, 0);
  stroke(ctx, 'M-22 8 C-24 -14 -14 -24 -24 -44 M-23 -18 C-32 -24 -36 -30 -40 -38 M-20 -26 C-12 -32 -8 -38 -4 -48', INK, 2.6);
  stroke(ctx, 'M14 14 C16 -6 10 -16 18 -32 M15 -4 L28 -14 M17 -16 L10 -24', INK, 2.6);
  stroke(ctx, 'M-30 10 Q-22 2 -14 10 M6 16 Q14 8 22 16', INK, 1.6);
  stroke(ctx, 'M-36 -34 L-36 -20 M-8 -42 L-8 -26 M25 -12 L25 0', C.edge, 1);
  ctx.restore();
}

export function drawFalaise(ctx, tile, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy - ELEV);
  const h = 0.85 + tileRand(tile.x, tile.y, 3) * 0.3;
  ctx.scale(1, h);
  fill(ctx, 'M-34 10 L-16 -50 L-2 -20 L10 -44 L32 10Z', C.crag);
  fill(ctx, 'M10 -44 L32 10 L14 10 L4 -18Z', C.right);
  stroke(ctx, 'M-34 10 L-16 -50 M-2 -20 L10 -44', C.rim, 1.2, 0.7);
  ctx.restore();
}

// ---------- Ressources ----------

export function drawResource(ctx, tile, cx, cy, time) {
  const land = tile.terrain === 'land';
  ctx.save();
  ctx.translate(cx, land ? cy - ELEV : cy);
  const breathe = 0.85 + Math.sin(time * 1.6 + tile.x * 2) * 0.15;
  if (tile.resource === 'nacre') {
    glow(ctx, 0, 0, 34, C.sigil, breathe);
    for (const d of ['M-18 4 a8 6 0 0 1 16 0Z', 'M4 -6 a7 5 0 0 1 14 0Z', 'M-4 12 a6 4 0 0 1 12 0Z']) {
      fill(ctx, d, C.pale);
      stroke(ctx, d, C.rim, 0.8);
    }
    circle(ctx, -10, 1, 1.6, '#E9F5F0');
    circle(ctx, 11, -8, 1.4, '#E9F5F0');
  } else if (tile.resource === 'epave') {
    ctx.translate(14, 4);
    ctx.scale(0.7, 0.7);
    glow(ctx, 8, -12, 40, '#E8A33D', 0.6 * breathe);
    fill(ctx, 'M-30 8 Q-12 20 24 4 L20 -6 L-26 -2Z', C.dark);
    stroke(ctx, 'M-30 8 Q-12 20 24 4 L20 -6 L-26 -2Z', C.mast, 1);
    stroke(ctx, 'M-4 -2 L8 -40 M8 -40 L20 -32', C.mast, 2.4);
    fill(ctx, 'M6 -16 h5 v6 h-5Z', '#F5C26B');
  } else if (tile.resource === 'relique') {
    ctx.translate(-20, 8);
    ctx.scale(0.75, 0.75);
    glow(ctx, 0, -22, 36, C.sigil, breathe);
    fill(ctx, 'M-11 8 L-13 -16 Q-13 -38 0 -40 Q13 -38 13 -16 L11 8Z', INK);
    stroke(ctx, 'M-6 -12 Q-8 0 -4 8 M0 -12 L0 8 M6 -12 Q8 0 4 8', INK, 2);
    circle(ctx, -4.5, -24, 1.8, C.sigil);
    circle(ctx, 4.5, -24, 1.8, C.sigil);
  }
  ctx.restore();
}

// ---------- Cités ----------

const HOUSES = [[-46, -16, 22, 18], [24, -10, 20, 16], [-30, 4, 18, 14], [8, 10, 18, 14], [36, -26, 16, 14], [-52, -2, 16, 12]];

function house(ctx, x, y, w, h, light, lit) {
  fill(ctx, `M${x} ${y} h${w} v${h} h${-w}Z`, C.dark);
  stroke(ctx, `M${x} ${y} h${w} v${h} h${-w}Z`, C.mast, 1);
  fill(ctx, `M${x - 3} ${y + 1} L${x + w / 2} ${y - h * 0.8} L${x + w + 3} ${y + 1}Z`, C.dark);
  stroke(ctx, `M${x - 3} ${y + 1} L${x + w / 2} ${y - h * 0.8} L${x + w + 3} ${y + 1}`, C.mast, 1);
  if (lit) fill(ctx, `M${x + w / 2 - 2.5} ${y + h * 0.35} h5 v6 h-5Z`, light);
}

export function drawCity(ctx, city, faction, cx, cy, time) {
  ctx.save();
  ctx.translate(cx, cy - ELEV);
  if (!faction) {
    // Sanctuaire sans maître : cierge éteint.
    fill(ctx, 'M-18 10 L-18 -18 Q0 -38 18 -18 L18 10Z', C.dark);
    stroke(ctx, 'M-18 10 L-18 -18 Q0 -38 18 -18 L18 10Z', C.edge, 1);
    fill(ctx, 'M-8 10 L-8 -10 Q0 -20 8 -10 L8 10Z', '#030606');
    fill(ctx, 'M-1.5 -4 h3 v7 h-3Z', C.neutral);
    const s = (time * 0.4) % 1;
    stroke(ctx, `M0 -6 Q3 ${-12 - s * 6} -1 ${-20 - s * 8}`, C.neutral, 1, 0.5 * (1 - s));
    ctx.restore();
    return;
  }
  const flicker = 0.9 + Math.sin(time * 7 + city.id) * 0.05 + Math.sin(time * 13 + city.id * 3) * 0.05;
  glow(ctx, 0, -30, 50 + city.level * 8, faction.color, flicker);
  const n = Math.min(HOUSES.length, city.level + 1);
  const list = HOUSES.slice(0, n).sort((a, b) => a[1] - b[1]);
  list.forEach(([x, y, w, h], i) => house(ctx, x, y, w, h, i % 3 === 2 ? faction.light : faction.color, i < city.level + 1));
  if (city.capital) {
    fill(ctx, 'M-12 -50 h24 v52 h-24Z', C.dark);
    stroke(ctx, 'M-12 -50 h24 v52 h-24Z', C.mast, 1);
    fill(ctx, 'M-16 -48 L0 -86 L16 -48Z', C.dark);
    stroke(ctx, 'M-16 -48 L0 -86 L16 -48 M0 -86 L0 -96', C.mast, 1);
    ctx.globalAlpha = flicker;
    fill(ctx, 'M-4 -38 h8 v12 h-8Z', faction.light);
    ctx.globalAlpha = 1;
  } else {
    // Un fanal sur un mât.
    stroke(ctx, 'M2 6 L2 -40', C.mast, 2);
    fill(ctx, 'M-2 -46 h8 v9 h-8Z', faction.light);
  }
  ctx.restore();
}

export function drawCityLabel(ctx, city, faction, cx, cy, highlight) {
  const y = cy + 30;
  ctx.font = '600 15px "Cormorant SC", Georgia, serif';
  const name = faction ? city.name : 'Sanctuaire';
  const w = ctx.measureText(name).width + (faction ? 34 : 20);
  ctx.fillStyle = 'rgba(6,11,12,0.86)';
  roundRect(ctx, cx - w / 2, y - 11, w, 22, 4);
  ctx.fill();
  ctx.strokeStyle = highlight && faction ? faction.color : '#2C4A44';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (faction) {
    ctx.strokeStyle = faction.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx - w / 2 + 12, y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = faction.light;
    ctx.font = '600 11px Spectral, Georgia, serif';
    ctx.fillText(String(city.level), cx - w / 2 + 12, y + 0.5);
  }
  ctx.font = '600 15px "Cormorant SC", Georgia, serif';
  ctx.fillStyle = faction ? '#F1E9D8' : '#A9B3AE';
  ctx.fillText(name, cx + (faction ? 9 : 0), y + 1);
  if (faction) {
    const slots = city.level + 1;
    const pw = 8;
    const total = slots * pw + (slots - 1) * 3;
    for (let i = 0; i < slots; i++) {
      ctx.fillStyle = i < city.pop ? faction.color : 'rgba(143,163,160,0.25)';
      roundRect(ctx, cx - total / 2 + i * (pw + 3), y + 14, pw, 3, 1.5);
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
// Silhouettes noires ; `col` est la lumière du culte, éteinte si l'unité a agi.

const ROBE = 'M-11 0 L-6 -40 Q0 -62 6 -40 L11 0Z';
const FACE = 'M-3.6 -44 a3.6 4.6 0 1 0 7.2 0 a3.6 4.6 0 1 0 -7.2 0Z';

const UNIT_DRAW = {
  acolyte(ctx, col) {
    fill(ctx, ROBE, INK);
    stroke(ctx, 'M6 -40 L11 0', col, 1.2, 0.5);
    fill(ctx, FACE, '#000');
    circle(ctx, -1.4, -44, 0.9, col);
    circle(ctx, 1.6, -44, 0.9, col);
    stroke(ctx, 'M8 -26 L15 -20', INK, 2);
    fill(ctx, 'M10 -19 h8 v11 h-8Z', col);
    stroke(ctx, 'M10 -19 h8 v11 h-8Z', INK, 1);
  },
  guetteur(ctx, col) {
    fill(ctx, 'M-8 0 L-5 -48 Q0 -68 5 -48 L8 0Z', INK);
    stroke(ctx, 'M5 -48 L8 0', col, 1.2, 0.5);
    stroke(ctx, 'M-14 4 L-14 -74 L-24 -74', C.mast, 2);
    fill(ctx, 'M-27 -70 h7 v10 h-7Z', col);
    stroke(ctx, 'M3 -50 L16 -55', C.edge, 3);
    fill(ctx, 'M-3.2 -52 a3.2 4.2 0 1 0 6.4 0 a3.2 4.2 0 1 0 -6.4 0Z', '#000');
  },
  harponneur(ctx, col) {
    fill(ctx, ROBE, INK);
    stroke(ctx, 'M6 -40 L11 0', col, 1.2, 0.5);
    stroke(ctx, 'M-16 8 L22 -70', C.mast, 2.2);
    stroke(ctx, 'M22 -70 L16 -60 M22 -70 L27 -61 M19 -64 L25 -62', C.steel, 1.6);
    stroke(ctx, 'M-12 4 q-10 -6 -4 -14 q8 -6 2 -14', C.edge, 1.2);
    fill(ctx, FACE, '#000');
    circle(ctx, 0, -28, 2.4, col);
  },
  gardien(ctx, col) {
    fill(ctx, 'M-20 0 L-22 -30 Q-24 -50 -6 -54 Q12 -58 20 -40 L22 0Z', INK);
    stroke(ctx, 'M20 -40 L22 0', col, 1.2, 0.5);
    ellipse(ctx, 6, -60, 14, 11, C.dark);
    stroke(ctx, 'M-4 -54 q4 2 8 0 M-2 -50 q4 2 8 0', C.mast, 1);
    circle(ctx, 1, -61, 2.4, col);
    circle(ctx, 12, -60, 2.4, col);
    stroke(ctx, 'M20 -30 Q40 -38 34 -12 L30 -16', C.edge, 3);
  },
  mortier(ctx, col) {
    fill(ctx, 'M-22 0 L-18 -14 L18 -14 L22 0Z', C.left);
    stroke(ctx, 'M-22 0 L-18 -14 L18 -14 L22 0Z', C.edge, 1);
    fill(ctx, 'M-10 -14 L-15 -42 L8 -48 L11 -14Z', C.dark);
    stroke(ctx, 'M-10 -14 L-15 -42 L8 -48 L11 -14Z', C.mast, 1);
    ellipse(ctx, -3.5, -45, 12, 4.2, '#000', C.edge);
    stroke(ctx, 'M-14 -6 L-10 -10 L-6 -6 M10 -9 L14 -5', col, 1.4);
    ellipse(ctx, 2, -7, 2.6, 2.6, null, col, 1.4);
  },
};

function drawBarque(ctx, col) {
  fill(ctx, 'M-30 -4 Q-26 8 -10 10 L18 10 Q30 6 32 -4Z', C.dark);
  stroke(ctx, 'M-30 -4 Q-26 8 -10 10 L18 10 Q30 6 32 -4Z', C.mast, 1);
  fill(ctx, 'M-4 -4 L-2 -26 Q2 -34 6 -26 L8 -4Z', INK);
  stroke(ctx, 'M-8 -12 L-30 8', C.mast, 2);
  stroke(ctx, 'M24 -4 L26 -38', C.mast, 1.8);
  fill(ctx, 'M22 -36 h7 v9 h-7Z', col);
}

function drawNavire(ctx, col) {
  fill(ctx, 'M-38 -6 L38 -6 Q30 14 14 16 L-22 16 Q-32 12 -38 -6Z', C.dark);
  stroke(ctx, 'M-38 -6 L38 -6 Q30 14 14 16 L-22 16 Q-32 12 -38 -6Z', C.mast, 1);
  stroke(ctx, 'M-2 -6 L-2 -88', C.mast, 2);
  fill(ctx, 'M-20 -78 L16 -78 L14 -50 L8 -55 L1 -45 L-7 -53 L-18 -48Z', C.sail);
  fill(ctx, 'M-18 -42 L14 -42 L12 -18 L4 -24 L-3 -15 L-10 -22 L-16 -18Z', C.sail);
  for (const x of [-24, -8, 8]) fill(ctx, `M${x} 0 h4 v4 h-4Z`, col);
  fill(ctx, 'M-5 -94 h6 v7 h-6Z', col);
}

export function drawUnit(ctx, unit, faction, x, y, time, opts = {}) {
  const spent = opts.spent;
  const col = spent ? mix(faction.color, '#0B1416', 0.55) : faction.color;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(x, y);
  if (unit.vessel) {
    const bob = Math.sin(time * 2 + x * 0.05) * 1.6;
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(time * 1.6 + y * 0.05) * 0.035);
    const navire = unit.vessel === 'navire';
    ellipse(ctx, 0, navire ? 16 : 10, navire ? 46 : 40, 8, null, C.rim, 1, 0.5);
    const lightAt = navire ? [-2, -40] : [25, -30];
    if (!spent) glow(ctx, lightAt[0], lightAt[1], navire ? 46 : 28, faction.color, navire ? 0.6 : 1);
    if (navire) drawNavire(ctx, col);
    else drawBarque(ctx, col);
  } else {
    ellipse(ctx, 0, 2, 26, 9, '#14201F');
    ellipse(ctx, 0, 2, 26, 9, null, col, 1.6, 0.75);
    const draw = UNIT_DRAW[unit.type];
    if (!spent) {
      // Halo de la lanterne, derrière la silhouette.
      const at = { acolyte: [14, -14], guetteur: [-23, -64], harponneur: [0, -28], gardien: [6, -60], mortier: [0, -8] }[unit.type];
      const flick = 0.92 + Math.sin(time * 9 + unit.id) * 0.08;
      glow(ctx, at[0], at[1], 30, faction.color, flick);
    }
    draw(ctx, col);
  }
  ctx.restore();

  // Plaque de PV.
  const ratio = unit.hp / opts.maxHp;
  const px = x - 30;
  const py = y - 58;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.fillStyle = INK;
  roundRect(ctx, px, py, 22, 15, 3);
  ctx.fill();
  ctx.strokeStyle = ratio <= 0.35 ? '#D9604F' : col;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = ratio <= 0.35 ? '#F08A7C' : spent ? '#8A938F' : faction.light;
  ctx.font = '600 11px Spectral, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(unit.hp), px + 11, py + 8);
  ctx.restore();
}

// ---------- Brume ----------

export function drawFog(ctx, x, y, cx, cy, time) {
  ctx.save();
  ctx.translate(cx, cy);
  fill(ctx, 'M0 -32 L63 0 L0 32 L-63 0Z', '#05090A');
  const drift = Math.sin(time * 0.35 + x * 0.9 + y * 0.6) * 8;
  ctx.globalAlpha = 0.16 + tileRand(x, y, 7) * 0.16;
  ctx.drawImage(getMist(), -120 + drift, -82, 240, 150);
  ctx.restore();
}
