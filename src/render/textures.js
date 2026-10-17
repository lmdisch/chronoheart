// Procedural pixel-art texture library: 16x16 seamless tiles with hue-shifted ramps.
// Every tile produces a color map (alpha = roughness), and a normal map derived
// from its height field (alpha = emissive mask). Tiles live in two texture arrays
// so the whole voxel world can be drawn with a single material.
import * as THREE from 'three';
import { makeRng } from '../core/util.js';

export const TILE = 16;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
function hexToRgb255(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255].map(Math.round);
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
}

/** Move hue a toward b along the shortest path by fraction t. */
function hueToward(a, b, t) {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return (a + d * t + 1) % 1;
}

/**
 * Hue-shifted color ramp, dark -> light. Shadows drift toward cool purple,
 * highlights toward warm yellow, the way pixel artists build palettes.
 */
export function ramp(hex, steps = 6, spread = 0.36, shift = 0.07) {
  const [h, s, l] = rgbToHsl(hexToRgb255(hex));
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : (i / (steps - 1)) * 2 - 1; // -1..1
    const hh = t < 0 ? hueToward(h, 0.7, -t * shift * 1.4) : hueToward(h, 0.13, t * shift);
    const ss = Math.min(1, s * (1 + 0.18 * (1 - Math.abs(t))) * (t < 0 ? 1.08 : 0.92));
    const ll = Math.min(0.97, Math.max(0.03, l + t * spread * (t < 0 ? l : 1 - l) * 1.25));
    out.push(hslToRgb([hh, ss, ll]));
  }
  return out;
}

/** Ramp as CSS colors (for sprite drawing). */
export function rampCss(hex, steps, spread, shift) {
  return ramp(hex, steps, spread, shift).map(([r, g, b]) => `rgb(${r},${g},${b})`);
}

// ---------------------------------------------------------------------------
// Seamless noise on a 16-pixel torus
// ---------------------------------------------------------------------------
function latticeHash(seed) {
  const rng = makeRng(seed);
  const tbl = new Float32Array(256);
  for (let i = 0; i < 256; i++) tbl[i] = rng();
  return (x, y) => tbl[(((x & 15) * 16 + (y & 15)) * 7 + 3) & 255];
}

/** Tileable value noise with period `per` (must divide 16). */
function valueNoise(seed, per) {
  const h = latticeHash(seed);
  const scale = per / TILE;
  return (x, y) => {
    const fx = x * scale, fy = y * scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const w = (v) => ((v % per) + per) % per;
    const a = h(w(x0), w(y0)), b = h(w(x0 + 1), w(y0));
    const c = h(w(x0), w(y0 + 1)), d = h(w(x0 + 1), w(y0 + 1));
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

export function fbm(seed, octaves = 3, base = 2) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(valueNoise(seed + o * 101, Math.min(16, base << o)));
  return (x, y) => {
    let v = 0, amp = 0.5, norm = 0;
    for (const n of layers) {
      v += n(x, y) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return v / norm;
  };
}

/** Tileable Voronoi: returns {d1, d2, id} for pixel center. */
function voronoi(seed, points) {
  const rng = makeRng(seed);
  const pts = [];
  for (let i = 0; i < points; i++) pts.push([rng() * TILE, rng() * TILE, rng()]);
  return (x, y, sx = 1, sy = 1) => {
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (const [px, py, r] of pts)
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const dx = (px + ox * TILE - x - 0.5) * sx, dy = (py + oy * TILE - y - 0.5) * sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = r;
          } else if (d < d2) d2 = d;
        }
    return { d1, d2, id };
  };
}

// ---------------------------------------------------------------------------
// Pixel canvas
// ---------------------------------------------------------------------------
export class PixelCanvas {
  constructor(seed = 1) {
    this.n = TILE;
    this.col = new Array(TILE * TILE).fill(null).map(() => [255, 0, 255]);
    this.h = new Float32Array(TILE * TILE);
    this.e = new Float32Array(TILE * TILE);
    this.r = new Float32Array(TILE * TILE).fill(0.9);
    this.rng = makeRng(seed);
  }
  i(x, y) {
    return (((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE);
  }
  set(x, y, c, h, e, r) {
    const i = this.i(x, y);
    if (c) this.col[i] = c;
    if (h !== undefined && h !== null) this.h[i] = h;
    if (e !== undefined && e !== null) this.e[i] = e;
    if (r !== undefined && r !== null) this.r[i] = r;
  }
  getH(x, y) {
    return this.h[this.i(x, y)];
  }
  each(fn) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) fn(x, y);
  }
  /** Pick from ramp by a 0..1 value. */
  static pick(r, v) {
    return r[Math.max(0, Math.min(r.length - 1, Math.floor(v * r.length)))];
  }
}
const pick = PixelCanvas.pick;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Shade every pixel from its height: top-left lit, bottom-right shadowed (bakes form into color). */
function bakeRelief(pc, rampArr, base, amount = 1) {
  const out = [];
  pc.each((x, y) => {
    const dh = pc.getH(x - 1, y - 1) - pc.getH(x + 1, y + 1);
    out.push(dh);
  });
  pc.each((x, y) => {
    const i = pc.i(x, y);
    const v = base[i] + out[i] * -0.9 * amount;
    pc.col[i] = pick(rampArr, clamp01(v));
  });
}

// ---------------------------------------------------------------------------
// Tile painters. Each receives a PixelCanvas and paints color/height/etc.
// ---------------------------------------------------------------------------
function paintGrassTop(pc, baseHex, seed, opts = {}) {
  const R = ramp(baseHex, 7, 0.42, 0.09);
  const n = fbm(seed, 3, 2);
  const n2 = valueNoise(seed + 7, 8);
  const base = [];
  pc.each((x, y) => {
    const v = n(x, y) * 0.75 + n2(x, y) * 0.35 - 0.05;
    base.push(v);
    pc.set(x, y, null, v * 0.35, 0, 0.95);
  });
  // blades: short vertical strokes with bright tips
  const rng = pc.rng;
  for (let k = 0; k < 26; k++) {
    const x = rng.int(0, 15), y = rng.int(0, 15);
    const i = pc.i(x, y), j = pc.i(x, y + 1);
    base[i] = Math.max(base[i], 0.78 + rng() * 0.2);
    base[j] = Math.min(base[j], 0.3);
    pc.h[i] = 0.75;
  }
  if (opts.flowers) {
    for (let k = 0; k < opts.flowers; k++) {
      const x = rng.int(0, 15), y = rng.int(0, 15);
      pc.set(x, y, hexToRgb255(rng.pick(opts.flowerCols)), 0.9);
      base[pc.i(x, y)] = -1;
    }
  }
  pc.each((x, y) => {
    const i = pc.i(x, y);
    if (base[i] >= 0) pc.col[i] = pick(R, clamp01(base[i]));
  });
}

function paintDirt(pc, baseHex, seed, pebbles = 7) {
  const R = ramp(baseHex, 6, 0.4, 0.06);
  const n = fbm(seed, 3, 4);
  const base = [];
  pc.each((x, y) => {
    const v = n(x, y);
    base.push(v * 0.9);
    pc.set(x, y, null, v * 0.3, 0, 1);
  });
  const rng = pc.rng;
  for (let k = 0; k < pebbles; k++) {
    const x = rng.int(0, 15), y = rng.int(0, 15);
    const big = rng.chance(0.4);
    for (let dx = 0; dx <= (big ? 1 : 0); dx++) {
      pc.h[pc.i(x + dx, y)] = 0.8;
      base[pc.i(x + dx, y)] = 0.85;
    }
    base[pc.i(x, y + 1)] = 0.05;
  }
  bakeRelief(pc, R, base, 0.6);
}

/** Grass-side tile: grass lip (jagged, hanging) over a dirt body. */
function paintGrassSide(pc, grassHex, dirtHex, seed, lipDepth = 4) {
  paintDirt(pc, dirtHex, seed + 3, 5);
  const G = ramp(grassHex, 6, 0.4, 0.09);
  const rng = pc.rng;
  const n = valueNoise(seed, 8);
  for (let x = 0; x < TILE; x++) {
    const depth = lipDepth + Math.round(n(x, 0) * 3) + (rng.chance(0.25) ? 2 : 0);
    for (let y = 0; y < depth; y++) {
      const v = 1 - y / depth;
      pc.set(x, y, pick(G, clamp01(0.25 + v * 0.7 + (rng() - 0.5) * 0.2)), 0.6 + v * 0.3, 0, 0.95);
    }
    // dark undercut beneath the lip
    pc.set(x, depth, pick(ramp(dirtHex, 6, 0.4), 0.0), 0.1);
  }
}

/** Generic running-bond bricks. */
function paintBricks(pc, baseHex, seed, o = {}) {
  const { rowH = 4, brickW = 8, mortar = null, rough = 0.9, jitterAmt = 0.25, chip = 0.15, offsets = null } = o;
  const R = ramp(baseHex, 7, o.spread ?? 0.4, 0.07);
  const M = mortar ? ramp(mortar, 4, 0.3) : null;
  const n = fbm(seed, 3, 4);
  const rng = pc.rng;
  const rows = TILE / rowH;
  const base = new Float32Array(TILE * TILE);
  const brickTone = {};
  for (let r = 0; r < rows; r++) {
    const off = offsets ? offsets[r % offsets.length] : (r % 2) * (brickW / 2);
    for (let x = 0; x < TILE; x++) {
      const bx = Math.floor((x + off) / brickW);
      const key = r * 100 + (((bx % (TILE / brickW)) + TILE / brickW) % (TILE / brickW));
      if (brickTone[key] === undefined) brickTone[key] = (rng() - 0.5) * jitterAmt;
      for (let yy = 0; yy < rowH; yy++) {
        const y = r * rowH + yy;
        const lx = (((x + off) % brickW) + brickW) % brickW;
        const isMortar = yy === rowH - 1 || lx === brickW - 1;
        const i = pc.i(x, y);
        if (isMortar) {
          pc.h[i] = 0.0;
          base[i] = -1;
          pc.col[i] = M ? pick(M, n(x, y) * 0.8) : pick(R, 0.02);
          pc.r[i] = 1;
        } else {
          // rounded brick: higher in the middle
          const ex = Math.min(lx, brickW - 2 - lx) / (brickW / 2);
          const ey = Math.min(yy, rowH - 2 - yy) / (rowH / 2);
          const dome = Math.min(1, Math.min(ex, ey) * 3);
          pc.h[i] = 0.5 + dome * 0.25 + n(x, y) * 0.2;
          base[i] = 0.5 + brickTone[key] + (n(x, y) - 0.5) * 0.45;
          pc.r[i] = rough;
          if (rng() < chip * 0.25) {
            base[i] -= 0.3;
            pc.h[i] -= 0.3;
          }
        }
      }
    }
  }
  // relief shading on bricks only
  pc.each((x, y) => {
    const i = pc.i(x, y);
    if (base[i] < 0) return;
    const dh = pc.getH(x - 1, y - 1) - pc.getH(x + 1, y + 1);
    pc.col[i] = pick(R, clamp01(base[i] - dh * 0.45));
  });
}

function paintCobble(pc, baseHex, seed, gapHex) {
  const R = ramp(baseHex, 7, 0.3, 0.07);
  const G = ramp(gapHex, 4, 0.3);
  const v = voronoi(seed, 6);
  const n = fbm(seed + 5, 2, 4);
  const base = new Float32Array(TILE * TILE);
  pc.each((x, y) => {
    const { d1, d2, id } = v(x, y);
    const edge = d2 - d1;
    const i = pc.i(x, y);
    if (edge < 0.9) {
      pc.set(x, y, pick(G, n(x, y) * 0.9), 0, 0, 1);
      base[i] = -1;
    } else {
      const dome = Math.min(1, (edge - 0.9) / 2.5);
      pc.h[i] = 0.3 + dome * 0.35;
      base[i] = 0.42 + id * 0.22 + (n(x, y) - 0.5) * 0.15;
      pc.r[i] = 0.75;
    }
  });
  pc.each((x, y) => {
    const i = pc.i(x, y);
    if (base[i] < 0) return;
    const dh = pc.getH(x - 1, y - 1) - pc.getH(x + 1, y + 1);
    pc.col[i] = pick(R, clamp01(base[i] - dh * 0.5));
  });
}

function paintSand(pc, baseHex, seed) {
  const R = ramp(baseHex, 6, 0.3, 0.06);
  const n = fbm(seed, 3, 4);
  const rng = pc.rng;
  const base = [];
  pc.each((x, y) => {
    const rip = Math.sin((x * 0.9 + y * 0.45 + n(x, y) * 3) * (Math.PI / 4)) * 0.5 + 0.5;
    const v = 0.42 + rip * 0.12 + (n(x, y) - 0.5) * 0.35;
    base.push(v);
    pc.set(x, y, null, rip * 0.15 + n(x, y) * 0.2, 0, 1);
  });
  for (let k = 0; k < 14; k++) {
    const i = pc.i(rng.int(0, 15), rng.int(0, 15));
    base[i] = rng.chance(0.5) ? 0.95 : 0.08;
  }
  bakeRelief(pc, R, base, 0.5);
}

function paintPlaster(pc, baseHex, seed) {
  const R = ramp(baseHex, 6, 0.22, 0.05);
  const n = fbm(seed, 3, 2);
  const base = [];
  pc.each((x, y) => {
    const v = 0.55 + (n(x, y) - 0.5) * 0.5;
    base.push(v);
    pc.set(x, y, null, n(x, y) * 0.3, 0, 0.95);
  });
  // a few pits
  const rng = pc.rng;
  for (let k = 0; k < 5; k++) {
    const i = pc.i(rng.int(0, 15), rng.int(0, 15));
    base[i] = 0.25;
  }
  bakeRelief(pc, R, base, 0.6);
}

/** Packed snow: soft drifts, cool blue in the hollows, a few glints. */
function paintSnow(pc, baseHex, seed) {
  const R = ramp(baseHex, 6, 0.2, 0.1);
  const n = fbm(seed, 3, 2);
  const base = [];
  pc.each((x, y) => {
    const v = 0.6 + (n(x, y) - 0.5) * 0.55;
    base.push(v);
    pc.set(x, y, null, n(x, y) * 0.4, 0, 0.7);
  });
  bakeRelief(pc, R, base, 0.5);
}

/** A rock face with a lip of snow along its top edge. */
function paintSnowSide(pc, snowHex, rockHex, seed, lipDepth = 3) {
  paintCrag(pc, rockHex, seed + 3);
  const S = ramp(snowHex, 6, 0.2, 0.1);
  const n = valueNoise(seed, 8);
  const rng = pc.rng;
  for (let x = 0; x < TILE; x++) {
    const depth = lipDepth + Math.round(n(x, 0) * 2) + (rng.chance(0.2) ? 2 : 0);
    for (let y = 0; y < depth; y++) {
      const v = 1 - y / depth;
      pc.set(x, y, pick(S, clamp01(0.35 + v * 0.6)), 0.6 + v * 0.3, 0, 0.7);
    }
    pc.set(x, depth, pick(ramp(rockHex, 6, 0.4), 0.05), 0.1);
  }
}

/**
 * Mountain rock: broken into angular facets, each catching the light its own way, with dark
 * cracks between them. No courses or bands, so a cliff of it reads as crag, not masonry.
 */
function paintCrag(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.36, 0.08);
  const n = fbm(seed, 3, 2);
  const rng = pc.rng;
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push({ x: rng() * TILE, y: rng() * TILE, tone: 0.3 + rng() * 0.5, gx: rng() - 0.5, gy: rng() - 0.5 });
  const base = [];
  pc.each((x, y) => {
    // nearest two facet centers, on the torus (so the tile wraps)
    let d1 = 1e9, d2 = 1e9, f = pts[0];
    for (const p of pts) {
      const dx = Math.min(Math.abs(x - p.x), TILE - Math.abs(x - p.x)), dy = Math.min(Math.abs(y - p.y), TILE - Math.abs(y - p.y));
      const d = Math.hypot(dx * 1.15, dy);
      if (d < d1) [d2, d1, f] = [d1, d, p];
      else if (d < d2) d2 = d;
    }
    const crack = d2 - d1 < 0.6;
    // each facet tilts a little: lighter on one edge than the other
    const tilt = ((x - f.x) * f.gx + (y - f.y) * f.gy) * 0.05;
    const v = crack ? 0.18 : f.tone + tilt + (n(x, y) - 0.5) * 0.18;
    base.push(v);
    pc.set(x, y, null, crack ? 0.05 : 0.45 + tilt * 2 + (n(x, y) - 0.5) * 0.3, 0, 0.9);
  });
  bakeRelief(pc, R, base, 0.6);
}

/** Clear ice: pale, glassy, with long cracks and a cold shine. */
function paintIce(pc, baseHex, seed) {
  const R = ramp(baseHex, 6, 0.3, 0.12);
  const n = fbm(seed, 2, 2);
  const base = [];
  pc.each((x, y) => {
    const v = 0.55 + (n(x, y) - 0.5) * 0.4 + ((x + y) % 7 === 0 ? 0.15 : 0);
    base.push(v);
    pc.set(x, y, null, 0.4, 0.05, 0.15);
  });
  const rng = pc.rng;
  let cx = rng.int(2, 13);
  for (let y = 0; y < TILE; y++) {
    if (rng.chance(0.4)) cx += rng.chance(0.5) ? 1 : -1;
    base[pc.i(cx, y)] = 0.95;
  }
  bakeRelief(pc, R, base, 0.3);
}

/** Polished marble with a few dark veins. */
function paintMarble(pc, baseHex, seed) {
  const R = ramp(baseHex, 6, 0.22, 0.04);
  const n = fbm(seed, 3, 2);
  const base = [];
  pc.each((x, y) => {
    const vein = Math.abs(Math.sin((x * 0.6 + y * 0.35 + n(x, y) * 6) * 1.2));
    const v = 0.62 + (n(x, y) - 0.5) * 0.3 - (vein < 0.12 ? 0.35 : 0);
    base.push(v);
    pc.set(x, y, null, 0.5, 0, 0.35);
  });
  bakeRelief(pc, R, base, 0.2);
}

function paintWoodGrain(pc, baseHex, seed, o = {}) {
  const { vertical = true, plankW = 4, nails = false } = o;
  const R = ramp(baseHex, 7, 0.42, 0.07);
  const n = valueNoise(seed, 4);
  const n2 = valueNoise(seed + 9, 16);
  const rng = pc.rng;
  const tones = [];
  for (let p = 0; p < TILE / plankW; p++) tones.push((rng() - 0.5) * 0.25);
  const base = [];
  pc.each((x, y) => {
    const a = vertical ? x : y, b = vertical ? y : x;
    const plank = Math.floor(a / plankW);
    const la = a % plankW;
    const seam = la === plankW - 1;
    const grain = Math.sin((b * 0.35 + n(vertical ? x * 0.3 : x, vertical ? y : y * 0.3) * 4 + la * 1.7) * 2.2) * 0.5 + 0.5;
    let v = 0.45 + tones[plank] + (grain - 0.5) * 0.28 + (n2(x, y) - 0.5) * 0.15;
    let h = 0.6 + grain * 0.15;
    if (seam) {
      v = 0.04;
      h = 0.1;
    }
    base.push(v);
    pc.set(x, y, null, h, 0, 0.92);
  });
  // knots
  for (let k = 0; k < 2; k++) {
    const x = rng.int(0, 15), y = rng.int(0, 15);
    base[pc.i(x, y)] = 0.08;
    base[pc.i(x + 1, y)] = 0.2;
  }
  if (nails)
    for (let p = 0; p < TILE / plankW; p++)
      for (const yy of [1, 9]) {
        const x = vertical ? p * plankW + 1 : yy, y = vertical ? yy : p * plankW + 1;
        const i = pc.i(x, y);
        base[i] = 0.9;
        pc.h[i] = 1;
        pc.r[i] = 0.4;
      }
  bakeRelief(pc, R, base, 0.5);
}

function paintRoofTiles(pc, baseHex, seed, o = {}) {
  const { rowH = 4, tileW = 4, round = true } = o;
  const R = ramp(baseHex, 7, 0.45, 0.08);
  const n = fbm(seed, 2, 4);
  const rng = pc.rng;
  const tone = {};
  const base = [];
  pc.each((x, y) => {
    const row = Math.floor(y / rowH);
    const off = (row % 2) * (tileW / 2);
    const lx = (x + off) % tileW;
    const ly = y % rowH;
    const key = row * 50 + Math.floor((x + off) / tileW);
    if (tone[key] === undefined) tone[key] = (rng() - 0.5) * 0.3;
    let v, h;
    if (round) {
      // rounded tile: bright center, dark sides and dark lower lip
      const c = 1 - Math.abs(lx - (tileW - 1) / 2) / (tileW / 2);
      v = 0.3 + c * 0.45 + tone[key] - (ly === rowH - 1 ? 0.35 : 0) + (ly === 0 ? 0.12 : 0);
      h = 0.3 + c * 0.6 - ly * 0.08;
    } else {
      v = 0.45 + tone[key] + (lx === tileW - 1 ? -0.3 : 0) - (ly === rowH - 1 ? 0.35 : 0) + (ly === 0 ? 0.1 : 0);
      h = 0.7 - ly * 0.12 - (lx === tileW - 1 ? 0.3 : 0);
    }
    v += (n(x, y) - 0.5) * 0.2;
    base.push(v);
    pc.set(x, y, null, h, 0, round ? 0.7 : 0.6);
  });
  pc.each((x, y) => (pc.col[pc.i(x, y)] = pick(R, clamp01(base[pc.i(x, y)]))));
}

function paintThatch(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.45, 0.08);
  const rng = pc.rng;
  const base = new Float32Array(TILE * TILE).fill(0.35);
  pc.each((x, y) => (pc.h[pc.i(x, y)] = 0.3));
  for (let k = 0; k < 60; k++) {
    let x = rng.int(0, 15), y = rng.int(0, 15);
    const len = rng.int(3, 6), tone = 0.4 + rng() * 0.55;
    for (let s = 0; s < len; s++) {
      const i = pc.i(x, y);
      base[i] = tone - s * 0.04;
      pc.h[i] = 0.5 + tone * 0.4;
      y += 1;
      if (rng.chance(0.3)) x += 1;
    }
  }
  pc.each((x, y) => {
    if (y % 5 === 4) base[pc.i(x, y)] *= 0.5;
  });
  bakeRelief(pc, R, Array.from(base), 0.4);
}

function paintLeaves(pc, baseHex, seed, o = {}) {
  const R = ramp(baseHex, 7, 0.5, 0.1);
  const v = voronoi(seed, 11);
  const n = fbm(seed + 3, 2, 4);
  const base = [];
  pc.each((x, y) => {
    const { d1, d2, id } = v(x, y);
    const edge = d2 - d1;
    let val, h;
    if (edge < 0.7) {
      val = 0.05;
      h = 0.0;
    } else {
      // leaf: lit top-left within each cell
      const c = clamp01(1 - d1 / 3.2);
      val = 0.25 + c * 0.45 + id * 0.25 + (n(x, y) - 0.5) * 0.15;
      h = 0.3 + c * 0.7;
    }
    base.push(val);
    pc.set(x, y, null, h, 0, 0.85);
  });
  if (o.berries) {
    const rng = pc.rng;
    for (let k = 0; k < o.berries; k++) pc.set(rng.int(0, 15), rng.int(0, 15), hexToRgb255(o.berryCol), 0.9);
  }
  pc.each((x, y) => {
    const i = pc.i(x, y);
    if (o.berries && pc.h[i] === 0.9 && pc.col[i][0] === ((o.berryCol >> 16) & 255)) return;
    const dh = pc.getH(x - 1, y - 1) - pc.getH(x + 1, y + 1);
    pc.col[i] = pick(R, clamp01(base[i] - dh * 0.5));
  });
}

function paintBark(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.45, 0.07);
  const n = valueNoise(seed, 4);
  const n2 = valueNoise(seed + 3, 16);
  const base = [];
  pc.each((x, y) => {
    const f = Math.sin((x + n(x, y * 0.25) * 3) * (Math.PI / 2)) * 0.5 + 0.5; // furrows
    base.push(0.2 + f * 0.6 + (n2(x, y) - 0.5) * 0.2);
    pc.set(x, y, null, f, 0, 1);
  });
  bakeRelief(pc, R, base, 0.6);
}

function paintPalmBark(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.45, 0.07);
  const n = fbm(seed, 2, 4);
  const base = [];
  pc.each((x, y) => {
    const ring = (y + Math.abs(x - 7.5) * 0.5) % 4; // chevron rings
    const v = 0.25 + (ring / 4) * 0.55 + (n(x, y) - 0.5) * 0.2;
    base.push(ring < 0.8 ? 0.05 : v);
    pc.set(x, y, null, ring / 4, 0, 1);
  });
  bakeRelief(pc, R, base, 0.4);
}

function paintLogEnd(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.4, 0.07);
  const n = valueNoise(seed, 8);
  pc.each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5) + n(x, y) * 1.4;
    const ring = Math.sin(d * 1.6) * 0.5 + 0.5;
    const edge = d > 7.2;
    pc.set(x, y, pick(R, edge ? 0.08 : 0.4 + ring * 0.45), edge ? 0.2 : 0.5 + ring * 0.2, 0, 0.9);
  });
}

function paintStrata(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.45, 0.08);
  const n = fbm(seed, 3, 2);
  const rng = pc.rng;
  const bands = [];
  for (let y = 0, k = 0; y < TILE; k++) {
    const hgt = rng.int(2, 5);
    bands.push({ y0: y, y1: Math.min(TILE, y + hgt), tone: 0.25 + rng() * 0.55 });
    y += hgt;
  }
  const base = [];
  pc.each((x, y) => {
    const wob = Math.round((n(x, 0) - 0.5) * 2);
    const yy = (y + wob + TILE) % TILE;
    const b = bands.find((bb) => yy >= bb.y0 && yy < bb.y1) || bands[0];
    const top = yy === b.y0;
    let v = b.tone + (n(x, y) - 0.5) * 0.3 + (top ? 0.18 : 0) - (yy === b.y1 - 1 ? 0.12 : 0);
    base.push(v);
    pc.set(x, y, null, top ? 0.8 : 0.5 + (n(x, y) - 0.5) * 0.4, 0, 1);
  });
  // a vertical crack
  let cx = rng.int(0, 15);
  for (let y = 0; y < TILE; y++) {
    if (rng.chance(0.3)) cx += rng.chance(0.5) ? 1 : -1;
    if (y > 3 && y < 12) {
      base[pc.i(cx, y)] = 0.02;
      pc.h[pc.i(cx, y)] = 0;
    }
  }
  bakeRelief(pc, R, base, 0.5);
}

function paintGlyph(pc, baseHex, seed) {
  paintBricks(pc, baseHex, seed, { rowH: 8, brickW: 16, offsets: [0, 0], jitterAmt: 0.1 });
  const D = ramp(baseHex, 7, 0.45)[0];
  const glyph = [
    '................',
    '................',
    '....########....',
    '...#........#...',
    '...#.##..##.#...',
    '...#.##..##.#...',
    '...#........#...',
    '...#..####..#...',
    '...#........#...',
    '....###..###....',
    '.......##.......',
    '...#..#..#..#...',
    '...##########...',
    '................',
    '................',
    '................',
  ];
  pc.each((x, y) => {
    if (glyph[y][x] === '#') pc.set(x, y, D, 0.05, 0, 1);
  });
}

function paintMetal(pc, baseHex, seed, o = {}) {
  const { panel = 8, rivets = true, brushed = true, rough = 0.45 } = o;
  const R = ramp(baseHex, 7, 0.4, 0.05);
  const n = fbm(seed, 2, 4);
  const rng = pc.rng;
  const tones = {};
  const base = [];
  pc.each((x, y) => {
    const px = Math.floor(x / panel), py = Math.floor(y / panel);
    const key = px * 10 + py;
    if (tones[key] === undefined) tones[key] = (rng() - 0.5) * 0.18;
    const lx = x % panel, ly = y % panel;
    const seam = lx === panel - 1 || ly === panel - 1;
    let v = 0.5 + tones[key] + (brushed ? Math.sin(y * 2.3 + n(x, y) * 4) * 0.05 : 0) + (n(x, y) - 0.5) * 0.15;
    let h = 0.6;
    if (seam) {
      v = 0.06;
      h = 0.1;
    } else if (lx === 0 || ly === 0) v += 0.15;
    if (rivets && ((lx === 1 && ly === 1) || (lx === panel - 3 && ly === 1) || (lx === 1 && ly === panel - 3) || (lx === panel - 3 && ly === panel - 3))) {
      v = 0.9;
      h = 1;
    }
    base.push(v);
    pc.set(x, y, null, h, 0, seam ? 0.9 : rough);
  });
  bakeRelief(pc, R, base, 0.6);
}

function paintRust(pc, metalHex, rustHex, seed) {
  paintMetal(pc, metalHex, seed, { panel: 8, rough: 0.7 });
  const R = ramp(rustHex, 6, 0.4, 0.08);
  const n = fbm(seed + 11, 3, 2);
  const rng = pc.rng;
  pc.each((x, y) => {
    const v = n(x, y);
    if (v > 0.52) pc.set(x, y, pick(R, clamp01((v - 0.52) * 3 + (rng() - 0.5) * 0.3)), null, 0, 0.95);
  });
  // drip streaks
  for (let k = 0; k < 4; k++) {
    const x = rng.int(0, 15);
    const y0 = rng.int(0, 8);
    for (let y = y0; y < y0 + rng.int(3, 7); y++) pc.set(x, y, pick(R, 0.25), null, 0, 0.95);
  }
}

function paintHexFloor(pc, baseHex, seed) {
  const R = ramp(baseHex, 7, 0.4, 0.05);
  const n = fbm(seed, 2, 4);
  // hex grid with period 16 horizontally (2 hexes) and 16 vertically
  const centers = [
    [4, 4], [12, 4], [0, 12], [8, 12], [16, 12], [4, 20], [12, 20], [4, -4], [12, -4], [-4, 4], [20, 4],
  ];
  const base = [];
  pc.each((x, y) => {
    let d1 = 1e9, d2 = 1e9, ci = 0;
    centers.forEach(([cx, cy], k) => {
      const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * 1.0;
      const d = Math.max(Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5, Math.abs(dy));
      if (d < d1) {
        d2 = d1;
        d1 = d;
        ci = k;
      } else if (d < d2) d2 = d;
    });
    const edge = d2 - d1;
    let v, h;
    if (edge < 0.9) {
      v = 0.05;
      h = 0.0;
    } else {
      v = 0.42 + ((ci * 37) % 5) * 0.04 + (n(x, y) - 0.5) * 0.15 + (d1 < 1.3 ? 0.2 : 0);
      h = 0.6;
    }
    base.push(v);
    pc.set(x, y, null, h, 0, edge < 0.9 ? 0.8 : 0.35);
  });
  bakeRelief(pc, R, base, 0.7);
}

function paintWindows(pc, frameHex, seed) {
  paintMetal(pc, frameHex, seed, { panel: 16, rivets: false });
  const rng = pc.rng;
  const lit = [[255, 214, 150], [170, 232, 255], [255, 240, 210], [140, 200, 255]];
  for (const [wx, wy] of [[2, 2], [9, 2], [2, 9], [9, 9]]) {
    const on = rng.chance(0.6);
    const c = rng.pick(lit);
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        if (on) {
          const shade = y === 0 || x === 0 ? 1 : 0.82 + rng() * 0.1;
          pc.set(wx + x, wy + y, c.map((v) => Math.round(v * shade)), 0.2, 0.9, 0.1);
        } else pc.set(wx + x, wy + y, [24, 30, 44], 0.2, 0, 0.1);
      }
    // reflection glint
    pc.set(wx + 1, wy + 1, [255, 255, 255], 0.2, on ? 1 : 0.3, 0.05);
    pc.set(wx + 2, wy + 1, on ? [255, 255, 255] : [60, 70, 90], 0.2, on ? 1 : 0, 0.05);
  }
}

function paintNeonStrip(pc, panelHex, seed, neon) {
  paintMetal(pc, panelHex, seed, { panel: 16, rivets: true });
  const c = hexToRgb255(neon);
  for (let x = 0; x < TILE; x++) {
    pc.set(x, 7, c, 0.8, 1, 0.2);
    pc.set(x, 8, c.map((v) => Math.min(255, v + 60)), 0.8, 1, 0.2);
    pc.set(x, 6, c.map((v) => v * 0.35), 0.5, 0.3);
    pc.set(x, 9, c.map((v) => v * 0.35), 0.5, 0.3);
  }
}

function paintDarkPanel(pc, baseHex, seed) {
  paintMetal(pc, baseHex, seed, { panel: 16, rivets: true });
  const R = ramp(baseHex, 6, 0.4);
  // vent slats
  for (let y = 4; y < 12; y += 2)
    for (let x = 4; x < 12; x++) {
      pc.set(x, y, R[0], 0.0);
      pc.set(x, y + 1, R[4], 0.6);
    }
}

function paintOvergrowth(pc, mossHex, metalHex, seed) {
  paintMetal(pc, metalHex, seed, { panel: 8 });
  const R = ramp(mossHex, 6, 0.45, 0.1);
  const n = fbm(seed + 4, 3, 2);
  pc.each((x, y) => {
    const v = n(x, y);
    if (v > 0.42) pc.set(x, y, pick(R, clamp01((v - 0.42) * 2.4)), 0.4 + v * 0.4, 0, 0.95);
  });
  const rng = pc.rng;
  for (let k = 0; k < 4; k++) pc.set(rng.int(0, 15), rng.int(0, 15), [150, 255, 190], 0.9, 0.7);
}

function paintCrate(pc, baseHex, seed) {
  paintWoodGrain(pc, baseHex, seed, { vertical: false, plankW: 4 });
  const R = ramp(baseHex, 7, 0.45);
  const f = (x, y) => pc.set(x, y, pick(R, x === 0 || y === 0 ? 0.6 : 0.4), 0.9, 0, 0.9);
  for (let i = 0; i < TILE; i++) {
    f(i, 0); f(i, 1); f(i, 14); f(0, i); f(1, i); f(14, i);
    pc.set(i, 15, R[0], 0.1);
    pc.set(15, i, R[0], 0.1);
    // diagonal brace
    if (i > 1 && i < 14) {
      pc.set(i, i, R[5], 0.95);
      pc.set(i + 1, i, R[3], 0.85);
    }
  }
}

function paintPlain(pc, seed) {
  const n = fbm(seed, 3, 4);
  const R = [[178, 176, 188], [198, 196, 204], [214, 212, 216], [228, 226, 226], [240, 238, 234], [250, 248, 240]];
  pc.each((x, y) => pc.set(x, y, pick(R, clamp01(0.55 + (n(x, y) - 0.5) * 0.9)), n(x, y) * 0.25, 0, 0.85));
  const rng = pc.rng;
  for (let k = 0; k < 8; k++) pc.set(rng.int(0, 15), rng.int(0, 15), R[1]);
}

function paintMossyStone(pc, stoneHex, mossHex, seed) {
  paintBricks(pc, stoneHex, seed, { rowH: 8, brickW: 8, offsets: [0, 4], spread: 0.45 });
  const R = ramp(mossHex, 6, 0.4, 0.1);
  const n = fbm(seed + 2, 3, 2);
  pc.each((x, y) => {
    const v = n(x, y) + (1 - y / 16) * 0.25; // moss collects on top
    if (v > 0.62) pc.set(x, y, pick(R, clamp01((v - 0.62) * 2.5 + 0.1)), 0.7, 0, 0.95);
  });
}

// ---------------------------------------------------------------------------
// Tile registry
// ---------------------------------------------------------------------------
const P = (fn) => fn;
export const TILE_DEFS = {
  plain: P((pc) => paintPlain(pc, 1)),
  // Past
  sand: P((pc) => paintSand(pc, 0xd9b77a, 11)),
  sandstone: P((pc) => paintBricks(pc, 0xc9935a, 12, { rowH: 8, brickW: 8, offsets: [0, 4] })),
  sandstoneDark: P((pc) => paintStrata(pc, 0x9a6a3a, 13)),
  glyph: P((pc) => paintGlyph(pc, 0xc9935a, 14)),
  jungleTop: P((pc) => paintGrassTop(pc, 0x86a843, 15)),
  jungleSide: P((pc) => paintGrassSide(pc, 0x86a843, 0x7a5a3a, 16, 4)),
  jungleLeaves: P((pc) => paintLeaves(pc, 0x3f7d3a, 17)),
  mudBrick: P((pc) => paintBricks(pc, 0xa57444, 18, { rowH: 4, brickW: 8, mortar: 0xd2ad6e })),
  palmBark: P((pc) => paintPalmBark(pc, 0x8a6038, 19)),
  // Present
  meadowTop: P((pc) => paintGrassTop(pc, 0x6f9e3c, 20, { flowers: 2, flowerCols: [0xf0d040, 0xf0f0f0] })),
  meadowSide: P((pc) => paintGrassSide(pc, 0x6f9e3c, 0x6a4a32, 21, 4)),
  cobble: P((pc) => paintCobble(pc, 0xaaa294, 22, 0x6a6254)),
  dirt: P((pc) => paintDirt(pc, 0x6a4a32, 23)),
  plaster: P((pc) => paintPlaster(pc, 0xe8dcc0, 24)),
  timber: P((pc) => paintWoodGrain(pc, 0x6b4428, 25, { vertical: true, plankW: 8 })),
  clayRoof: P((pc) => paintRoofTiles(pc, 0xa8502f, 26, { rowH: 4, tileW: 4, round: true })),
  slateRoof: P((pc) => paintRoofTiles(pc, 0x4a5a6a, 27, { rowH: 4, tileW: 8, round: false })),
  thatch: P((pc) => paintThatch(pc, 0xc9a24a, 28)),
  planks: P((pc) => paintWoodGrain(pc, 0x7a5232, 29, { vertical: false, plankW: 4, nails: true })),
  stoneBrick: P((pc) => paintBricks(pc, 0x8f8a80, 30, { rowH: 8, brickW: 8, offsets: [0, 4], spread: 0.45 })),
  mossyStone: P((pc) => paintMossyStone(pc, 0x7f8a70, 0x5f8a32, 31)),
  curb: P((pc) => paintBricks(pc, 0x6a665e, 32, { rowH: 16, brickW: 8, offsets: [0] })),
  leaves: P((pc) => paintLeaves(pc, 0x4f8a32, 33)),
  autumn: P((pc) => paintLeaves(pc, 0xd9822b, 34)),
  bark: P((pc) => paintBark(pc, 0x7a5230, 35)),
  logEnd: P((pc) => paintLogEnd(pc, 0x9a7048, 36)),
  // Future
  hexFloor: P((pc) => paintHexFloor(pc, 0x3a404c, 40)),
  metal: P((pc) => paintMetal(pc, 0x6b7482, 41, { panel: 16 })),
  metalLight: P((pc) => paintMetal(pc, 0x7a8494, 42, { panel: 16, rough: 0.35 })),
  rust: P((pc) => paintRust(pc, 0x5b6472, 0x8a4a2a, 43)),
  windows: P((pc) => paintWindows(pc, 0x2a2f3a, 44)),
  overgrowth: P((pc) => paintOvergrowth(pc, 0x3f8f5a, 0x3a404c, 45)),
  neonStrip: P((pc) => paintNeonStrip(pc, 0x22262f, 46, 0x36f0ff)),
  darkPanel: P((pc) => paintDarkPanel(pc, 0x22262f, 47)),
  crate: P((pc) => paintCrate(pc, 0xa8743e, 48)),
  skyline: P((pc) => paintWindows(pc, 0x181a30, 49)),
  // The shore (Chronoheart II)
  mud: P((pc) => paintDirt(pc, 0x5e5247, 51, 3)),
  mudTop: P((pc) => paintSand(pc, 0x6a5d50, 52)),
  salt: P((pc) => paintSand(pc, 0xd8d2c4, 53)),
  saltTop: P((pc) => paintSand(pc, 0xe4dfd2, 54)),
  shingle: P((pc) => paintCobble(pc, 0x9a968c, 55, 0x5a564e)),
  seaRock: P((pc) => paintStrata(pc, 0x4f5866, 56)),
  seaRockTop: P((pc) => paintMossyStone(pc, 0x5a6470, 0x3f7a5a, 57)),
  drift: P((pc) => paintWoodGrain(pc, 0x9a917e, 58, { vertical: false, plankW: 4, nails: true })),
  reed: P((pc) => paintThatch(pc, 0xa8a45a, 59)),
  coral: P((pc) => paintSand(pc, 0xe89484, 60)),
  whitewash: P((pc) => paintPlaster(pc, 0xf0eee6, 61)),
  seaRoof: P((pc) => paintRoofTiles(pc, 0x3d6f88, 62, { rowH: 4, tileW: 4, round: true })),
  hull: P((pc) => paintWoodGrain(pc, 0x3a2e28, 63, { vertical: false, plankW: 4, nails: true })),
  rustHull: P((pc) => paintMetal(pc, 0x7c5f4e, 64, { panel: 16, rough: 0.9 })),
  brass: P((pc) => paintMetal(pc, 0xb8862a, 65, { panel: 16, rough: 0.3 })),
  wellStone: P((pc) => paintBricks(pc, 0x3f5a62, 66, { rowH: 8, brickW: 8, offsets: [0, 4], spread: 0.4 })),
  glyphSea: P((pc) => paintGlyph(pc, 0x3f5a62, 67)),
  // Chapter Three: the mountain
  snowTop: P((pc) => paintSnow(pc, 0xeef4fa, 68)),
  snowSide: P((pc) => paintSnowSide(pc, 0xeef4fa, 0x6e7584, 69)),
  granite: P((pc) => paintCrag(pc, 0x6e7584, 70)),
  ice: P((pc) => paintIce(pc, 0xa8d8ee, 71)),
  copper: P((pc) => paintRoofTiles(pc, 0x4f9a8a, 72, { rowH: 4, tileW: 8, round: false })),
  marble: P((pc) => paintMarble(pc, 0xe8e4dc, 73)),
};

export const TILE_NAMES = Object.keys(TILE_DEFS);
export const TILE_INDEX = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i]));

/** Height field -> tangent-space normal (wrapping Sobel). */
function heightToNormal(pc, strength) {
  const out = [];
  pc.each((x, y) => {
    const h = (dx, dy) => pc.getH(x + dx, y + dy);
    const gx = (h(1, -1) + 2 * h(1, 0) + h(1, 1)) - (h(-1, -1) + 2 * h(-1, 0) + h(-1, 1));
    // canvas y runs downward, texture v runs upward
    const gy = (h(-1, -1) + 2 * h(0, -1) + h(1, -1)) - (h(-1, 1) + 2 * h(0, 1) + h(1, 1));
    const nx = -gx * strength, ny = -gy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    out.push([nx / l, ny / l, nz / l]);
  });
  return out;
}

let built = null;
/** Build (once) the albedo + normal texture arrays. */
export function getTileTextures() {
  if (built) return built;
  const n = TILE_NAMES.length;
  const albedo = new Uint8Array(TILE * TILE * 4 * n);
  const normal = new Uint8Array(TILE * TILE * 4 * n);
  const previews = {};
  TILE_NAMES.forEach((name, layer) => {
    const pc = new PixelCanvas(1000 + layer * 17);
    TILE_DEFS[name](pc);
    const nrm = heightToNormal(pc, 1.6);
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const src = y * TILE + x;
        // store rows bottom-up so v grows upward in world space
        const dst = (layer * TILE * TILE + (TILE - 1 - y) * TILE + x) * 4;
        const c = pc.col[src];
        albedo[dst] = c[0];
        albedo[dst + 1] = c[1];
        albedo[dst + 2] = c[2];
        albedo[dst + 3] = Math.round(clamp01(pc.r[src]) * 255);
        const nn = nrm[src];
        normal[dst] = Math.round((nn[0] * 0.5 + 0.5) * 255);
        normal[dst + 1] = Math.round((nn[1] * 0.5 + 0.5) * 255);
        normal[dst + 2] = Math.round((nn[2] * 0.5 + 0.5) * 255);
        normal[dst + 3] = Math.round(clamp01(pc.e[src]) * 255);
      }
    previews[name] = pc;
  });
  const mk = (data, srgb) => {
    const t = new THREE.DataArrayTexture(data, TILE, TILE, n);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  built = { albedo: mk(albedo, true), normal: mk(normal, false), previews, count: n };
  return built;
}

/** Debug: render every tile to a data URL contact sheet. */
export function tileContactSheet(scale = 4) {
  const { previews } = getTileTextures();
  const names = TILE_NAMES;
  const cols = 8;
  const c = document.createElement('canvas');
  c.width = cols * TILE * scale;
  c.height = Math.ceil(names.length / cols) * TILE * scale;
  const g = c.getContext('2d');
  names.forEach((name, i) => {
    const pc = previews[name];
    const ox = (i % cols) * TILE * scale, oy = Math.floor(i / cols) * TILE * scale;
    pc.each((x, y) => {
      const [r, gg, b] = pc.col[y * TILE + x];
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    });
  });
  return c.toDataURL();
}
