// Projection isométrique et caméra.
export const TW = 96; // largeur d'une case
export const TH = 48; // hauteur d'une case
export const ELEV = 12; // épaisseur des blocs de terre

export const tileCenter = (x, y) => ({ x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 });

export function worldToGrid(wx, wy) {
  const fx = wx / (TW / 2);
  const fy = wy / (TH / 2);
  return { x: Math.round((fx + fy) / 2), y: Math.round((fy - fx) / 2) };
}

// Pseudo-aléa stable par case, pour varier le décor sans le faire clignoter.
export function tileRand(x, y, i = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.target = null;
  }

  toWorld(sx, sy, w, h) {
    return { x: (sx - w / 2) / this.zoom + this.x, y: (sy - h / 2) / this.zoom + this.y };
  }

  zoomAt(factor, sx, sy, w, h) {
    const before = this.toWorld(sx, sy, w, h);
    this.zoom = Math.min(2.2, Math.max(0.35, this.zoom * factor));
    const after = this.toWorld(sx, sy, w, h);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.target = null;
  }

  glideTo(wx, wy) {
    this.target = { x: wx, y: wy };
  }

  update(dt) {
    if (!this.target) return;
    const k = 1 - Math.exp(-dt * 6);
    this.x += (this.target.x - this.x) * k;
    this.y += (this.target.y - this.y) * k;
    if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 0.5) this.target = null;
  }
}
