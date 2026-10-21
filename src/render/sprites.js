// Procedural pixel-art: every sprite, creature, item icon and portrait is drawn in code.
import * as THREE from 'three';
import { theme } from '../chapter.js';

const OUTLINE = '#1b1424';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

const px = (ctx, x, y, col) => {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
};
const rect = (ctx, x, y, w, h, col) => {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};
/** Thick line made of square brush dabs. */
function line(ctx, x0, y0, x1, y1, col, brush = 2) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t - brush / 2 + 0.5), Math.round(y0 + (y1 - y0) * t - brush / 2 + 0.5), brush, brush);
  }
}
function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
}

/** Adds a 1px dark outline around opaque pixels inside a frame region. */
function outlineRegion(ctx, ox, oy, w, h, col = OUTLINE) {
  const img = ctx.getImageData(ox, oy, w, h);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const pts = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) pts.push([x, y]);
    }
  ctx.fillStyle = col;
  for (const [x, y] of pts) ctx.fillRect(ox + x, oy + y, 1, 1);
}

// ---------------------------------------------------------------------------
// Humanoid drawing (facing right). Frame is 32x32, feet on row 30.
// ---------------------------------------------------------------------------
function drawHumanoid(ctx, ox, oy, o, pose = {}) {
  const P = (x, y, c) => px(ctx, ox + x, oy + y, c);
  const R = (x, y, w, h, c) => rect(ctx, ox + x, oy + y, w, h, c);
  const L = (x0, y0, x1, y1, c, b) => line(ctx, ox + x0, oy + y0, ox + x1, oy + y1, c, b);
  const bob = pose.bob || 0;
  const wide = o.wide ? 1 : 0;
  const lean = pose.lean || 0;

  // legs (back leg first)
  const hipY = 23 + bob * 0.5;
  const legLen = 5;
  const legs = [
    { x: 13, a: pose.legB ?? 0, col: o.legsDark || shadeCss(o.legs, 0.75), boot: shadeCss(o.boots, 0.75) },
    { x: 16 + wide, a: pose.legF ?? 0, col: o.legs, boot: o.boots },
  ];
  for (const lg of legs) {
    const ex = lg.x + Math.sin(lg.a) * legLen;
    const ey = hipY + Math.cos(lg.a) * legLen;
    L(lg.x, hipY, ex, ey, lg.col, 3);
    R(ex - 1, ey + 1, 4, 2, lg.boot);
    if (o.bootTrim) R(ex - 1, ey, 4, 1, lg === legs[0] ? shadeCss(o.bootTrim, 0.8) : o.bootTrim); // fur at the top of the boot
  }

  if (o.robe) {
    // ankle-length robe over the legs, flaring slightly
    R(12 - wide + lean, hipY - 1, 7 + wide * 2, 6, o.legs);
    R(11 - wide + lean, hipY + 4, 9 + wide * 2, 2, o.legs);
    R(11 - wide + lean, hipY + 5, 9 + wide * 2, 1, shadeCss(o.legs, 0.8));
  }
  if (o.longCoat) {
    R(12 - wide + lean, hipY - 1, 7 + wide * 2, 4, o.longCoat);
    R(11 - wide + lean, hipY + 2, 9 + wide * 2, 1, o.trim || shadeCss(o.longCoat, 0.8));
  }
  const by = bob + (pose.crouch || 0);
  if (o.pack) {
    // a big expedition pack on her back, a rolled mat on top
    R(9 - wide + lean, 14 + by, 4, 9, o.pack);
    R(9 - wide + lean, 14 + by, 4, 1, shadeCss(o.pack, 1.2));
    R(10 - wide + lean, 18 + by, 3, 1, shadeCss(o.pack, 0.7));
    if (o.packTop) R(8 - wide + lean, 12 + by, 6, 2, o.packTop);
  }
  // back arm
  drawArm(L, R, 13 + lean, 17 + by, pose.armB ?? -0.2, shadeCss(o.top, 0.7), o.mittens ? shadeCss(o.mittens, 0.8) : shadeCss(o.skin, 0.8), null, o.sleeves);

  // torso
  R(12 - wide + lean, 16 + by, 7 + wide * 2, 7, o.top);
  R(12 - wide + lean, 16 + by, 7 + wide * 2, 1, shadeCss(o.top, 1.15));
  if (o.apron) R(15 + lean, 18 + by, 4 + wide, 5, o.apron);
  if (o.belt) {
    R(12 - wide + lean, 21 + by, 7 + wide * 2, 1, o.belt);
    P(16 + lean, 21 + by, '#e8c25a');
  }
  if (o.chest) o.chest(P, lean, by);
  if (o.sunPendant) {
    P(15 + lean, 17 + by, '#c9a44a');
    R(15 + lean, 18 + by, 2, 2, '#f2cf5a');
  }
  if (o.amulet) {
    P(17 + lean, 17 + by, o.amuletColor || '#7ff6ff');
    P(16 + lean, 16 + by, '#c9a44a');
  }

  // head
  const hx = 11 + lean, hy = 7 + by;
  R(hx, hy + 1, 9, 7, o.skin);
  R(hx + 1, hy, 7, 1, o.skin);
  R(hx, hy + 7, 9, 1, shadeCss(o.skin, 0.85)); // chin shade
  // eye + cheek
  P(hx + 6, hy + 4, '#ffffff');
  P(hx + 7, hy + 4, o.eye || '#20243a');
  P(hx + 7, hy + 3, shadeCss(o.hair || '#3a2a20', 0.9));
  P(hx + 6, hy + 6, shadeCss(o.skin, 0.88));
  if (pose.hurt) {
    P(hx + 6, hy + 4, '#20243a');
    P(hx + 7, hy + 6, '#7a2a2a');
  }
  // ear
  P(hx + 3, hy + 4, shadeCss(o.skin, 0.8));
  drawHair(P, R, hx, hy, o);
  if (o.hoodTrim) {
    // fur round the hood's opening
    R(hx + 3, hy - 1, 6, 1, o.hoodTrim);
    R(hx + 8, hy, 1, 4, o.hoodTrim);
  }
  if (o.hat) {
    // a knit hat, pulled down over the ears, with a bobble
    R(hx - 1, hy - 2, 10, 3, o.hat);
    R(hx - 1, hy + 1, 10, 1, shadeCss(o.hat, 0.75));
    for (let k = 0; k < 10; k += 2) P(hx - 1 + k, hy - 1, shadeCss(o.hat, 1.15));
    if (o.pom) R(hx + 1, hy - 4, 3, 2, o.pom);
  }
  if (o.earmuffs) {
    R(hx + 2, hy + 3, 3, 3, o.earmuffs);
    P(hx + 3, hy + 4, shadeCss(o.earmuffs, 1.25));
    P(hx + 4, hy + 2, '#3a3a44');
    P(hx + 4, hy + 1, '#3a3a44');
  }
  if (o.scarf) {
    // wound twice round the neck, one end hanging down the front
    R(hx + 2, hy + 8, 7, 2, o.scarf);
    P(hx + 3, hy + 8, shadeCss(o.scarf, 1.2));
    R(hx + 6 + (lean > 0 ? 1 : 0), hy + 10, 2, 3, shadeCss(o.scarf, 0.85));
    P(hx + 6 + (lean > 0 ? 1 : 0), hy + 13, o.scarfTip || shadeCss(o.scarf, 0.7));
  }
  if (o.beard) {
    R(hx + 4, hy + 6, 5, 3, o.beard);
    R(hx + 5, hy + 9, 3, 1, o.beard);
    P(hx + 7, hy + 6, shadeCss(o.skin, 0.7));
  }
  if (o.goggles) {
    R(hx, hy + 2, 9, 1, '#6a4a28');
    R(hx + 4, hy + 1, 3, 2, '#c9a44a');
    P(hx + 5, hy + 1, '#9ff4ff');
  }
  if (o.visor) {
    R(hx + 4, hy + 3, 5, 2, o.visor);
    P(hx + 8, hy + 3, '#ffffff');
  }

  // front arm
  drawArm(L, R, 16 + lean, 17 + by, pose.armF ?? 0.2, o.top, o.mittens || o.skin, pose.tool ? o.tool || 'wrench' : null, o.sleeves, o.wrenchHead);
}

/** long: sleeves to the wrist, so only the hand (or a mitten) shows. */
function drawArm(L, R, sx, sy, a, sleeve, skin, tool, long = false, head = null) {
  const len = 5;
  const mx = sx + Math.sin(a) * 3, my = sy + Math.cos(a) * 3;
  const ex = sx + Math.sin(a) * len, ey = sy + Math.cos(a) * len;
  L(sx, sy, mx, my, sleeve, 2);
  if (long) {
    const wx = sx + Math.sin(a) * 4.2, wy = sy + Math.cos(a) * 4.2;
    L(mx, my, wx, wy, sleeve, 2);
    L(wx, wy, ex, ey, skin, 2);
  } else L(mx, my, ex, ey, skin, 2);
  if (tool === 'wrench') {
    const tx = ex + Math.sin(a) * 7, ty = ey + Math.cos(a) * 7;
    L(ex, ey, tx, ty, '#b88a3a', 2);
    L(tx - 1, ty - 1, tx + 1, ty + 1, head || '#e2bf62', 3);
  } else if (tool === 'hammer') {
    const tx = ex + Math.sin(a) * 6, ty = ey + Math.cos(a) * 6;
    L(ex, ey, tx, ty, '#6b4428', 2);
    L(tx - 2 * Math.cos(a), ty + 2 * Math.sin(a), tx + 2 * Math.cos(a), ty - 2 * Math.sin(a), '#7a7f8a', 3);
  }
}

function drawHair(P, R, hx, hy, o) {
  const c = o.hair;
  const d = shadeCss(c || '#000', 0.75);
  switch (o.hairStyle) {
    case 'bun':
      R(hx, hy - 1, 8, 3, c);
      R(hx, hy + 2, 4, 4, c);
      R(hx - 2, hy - 2, 4, 4, c);
      P(hx - 1, hy - 1, shadeCss(c, 1.2));
      R(hx + 7, hy + 1, 2, 2, c);
      P(hx + 2, hy, shadeCss(c, 1.25));
      R(hx, hy + 5, 2, 2, d);
      break;
    case 'short':
      R(hx, hy - 1, 9, 3, c);
      R(hx, hy + 2, 4, 3, c);
      P(hx + 8, hy + 2, c);
      P(hx + 3, hy - 1, shadeCss(c, 1.25));
      break;
    case 'spiky':
      R(hx, hy - 1, 9, 3, c);
      R(hx, hy + 2, 3, 4, c);
      P(hx + 1, hy - 2, c); P(hx + 4, hy - 2, c); P(hx + 7, hy - 2, c); P(hx + 9, hy, c);
      P(hx + 5, hy - 1, shadeCss(c, 1.3));
      break;
    case 'long':
      R(hx, hy - 1, 9, 3, c);
      R(hx - 1, hy + 1, 5, 9, c);
      R(hx - 1, hy + 9, 4, 2, d);
      P(hx + 4, hy - 1, shadeCss(c, 1.25));
      break;
    case 'baldRing':
      // a bare dome, with a ring of hair round the back and sides
      P(hx + 4, hy, shadeCss(o.skin, 1.18));
      P(hx + 5, hy + 1, shadeCss(o.skin, 1.18));
      R(hx, hy + 3, 2, 4, c); // the back of the head
      R(hx + 2, hy + 3, 2, 1, c); // over the ear
      P(hx + 2, hy + 5, c); // and behind it
      P(hx + 4, hy + 4, c); // sideburn
      R(hx, hy + 6, 2, 1, d);
      break;
    case 'bald':
      P(hx + 5, hy + 1, shadeCss(o.skin, 1.2));
      R(hx, hy + 3, 2, 3, c || '#5a3a2a');
      break;
    case 'braid':
      // hair pulled back into a long braid down the back
      R(hx, hy - 1, 9, 3, c);
      R(hx, hy + 2, 3, 4, c);
      P(hx + 4, hy - 1, shadeCss(c, 1.25));
      for (let k = 0; k < 5; k++) R(hx - 2 + (k === 0 ? 1 : 0), hy + 4 + k * 2, 2, 2, k % 2 ? d : c);
      R(hx - 2, hy + 14, 2, 1, '#c8642a'); // leather tie
      P(hx - 2, hy + 15, c);
      break;
    case 'circletLong':
      // long hair falling down the back, under the gold sun circlet
      R(hx, hy - 1, 9, 3, c);
      R(hx - 1, hy + 1, 5, 9, c);
      R(hx - 1, hy + 9, 4, 2, d);
      P(hx + 4, hy - 1, shadeCss(c, 1.3));
      R(hx, hy + 1, 9, 1, '#c9a44a');
      R(hx + 6, hy, 2, 2, '#f2cf5a');
      P(hx + 6, hy, '#fff0a0');
      break;
    case 'circlet':
      // close-cropped hair under a thin gold band with a sun disc on the brow
      R(hx, hy - 1, 9, 2, c);
      R(hx, hy + 1, 3, 4, c);
      R(hx, hy + 1, 9, 1, '#c9a44a');
      R(hx + 6, hy, 2, 2, '#f2cf5a');
      P(hx + 6, hy, '#fff0a0');
      break;
    case 'hood':
      R(hx - 1, hy - 1, 10, 3, c);
      R(hx - 1, hy + 2, 5, 7, c);
      R(hx + 8, hy + 1, 1, 3, c);
      P(hx + 3, hy - 1, shadeCss(c, 1.2));
      break;
    default:
      break;
  }
}

function shadeCss(col, f) {
  const n = parseInt(col.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------------------------------------------------------------------------
// Sheet construction
// ---------------------------------------------------------------------------
// Sprites are authored at base resolution, then upscaled with Scale2x (keeps hard pixel
// edges but rounds diagonals), then get 1px hue-shifted rim light / core shadow and a
// selective (color-aware) outline at the doubled resolution: twice the pixels per unit.
export const SCALE = 2;

/** EPX / Scale2x of an RGBA image (w x h) -> (2w x 2h). */
function scale2x(src, w, h) {
  const out = new Uint32Array(w * 2 * h * 2);
  const at = (x, y) => src[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      const o = y * 2 * w * 2 + x * 2;
      out[o] = e0;
      out[o + 1] = e1;
      out[o + w * 2] = e2;
      out[o + w * 2 + 1] = e3;
    }
  return out;
}

const unpack = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, v >>> 24];
const pack = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const OUTLINE_RGB = [0x1b, 0x14, 0x24];

/** Light from the top-left: warm 1px highlight on lit edges, cool shadow on the far side, sel-out outline. */
function polish(px32, w, h) {
  const alpha = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px32[y * w + x] >>> 24 > 0;
  const out = px32.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!alpha(x, y)) continue;
      let [r, g, b, a] = unpack(px32[y * w + x]);
      const lit = !alpha(x, y - 1) || !alpha(x - 1, y);
      const shadow = !alpha(x + 1, y + 1) || !alpha(x + 2, y + 1) || !alpha(x + 1, y + 2);
      if (lit) {
        r = Math.min(255, r * 1.16 + 14);
        g = Math.min(255, g * 1.13 + 10);
        b = Math.min(255, b * 1.04 + 2);
      } else if (shadow) {
        r *= 0.8;
        g *= 0.8;
        b = Math.min(255, b * 0.88 + 6);
      }
      out[y * w + x] = pack(r | 0, g | 0, b | 0, a);
    }
  // selective outline: dark version of the neighboring color (bottom edges darkest)
  const res = out.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (alpha(x, y)) continue;
      let n = null, below = false;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        if (alpha(x + dx, y + dy)) {
          n = out[(y + dy) * w + x + dx];
          if (dy === -1) below = true;
        }
      }
      if (n === null) continue;
      const [r, g, b] = unpack(n);
      const k = below ? 0.18 : 0.32;
      res[y * w + x] = pack(
        Math.round(r * k + OUTLINE_RGB[0] * (1 - k)),
        Math.round(g * k + OUTLINE_RGB[1] * (1 - k)),
        Math.round(b * k + OUTLINE_RGB[2] * (1 - k)),
        255,
      );
    }
  return res;
}

/** css hex -> packed RGBA (matches the ImageData Uint32 view). */
function packCss(col) {
  const n = parseInt(col.slice(1), 16);
  return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, 255);
}
function scaleRgb(v, f) {
  const [r, g, b, a] = unpack(v);
  return pack(Math.min(255, Math.round(r * f)), Math.min(255, Math.round(g * f)), Math.min(255, Math.round(b * f)), a);
}

// Surface patterns, applied at 2x to pixels of a given base color: hair strands, cloth folds...
const PATTERNS = {
  hair: (x, y) => ((x + 2 * y) % 7 === 0 && y % 2 === 0 ? 0.8 : (x * 3 + y) % 13 === 0 ? 1.22 : 1),
  cloth: (x, y) => (x % 7 === 3 && y % 4 !== 0 ? 0.9 : 1),
  weave: (x, y) => ((x + y) % 6 === 0 && y % 2 === 0 ? 0.9 : 1),
  crease: (x, y) => (x % 6 === 2 && y % 3 !== 0 ? 0.88 : 1),
  leather: (x, y) => (y % 5 === 1 && x % 2 === 0 ? 1.2 : 1),
  scales: (x, y) => ((x + (Math.floor(y / 3) % 2) * 3) % 6 === 0 && y % 3 === 0 ? 0.8 : 1),
  fur: (x, y) => ((x * 2 + y) % 7 === 0 && y % 2 === 0 ? 0.86 : 1),
  plate: (x, y) => (x % 10 === 0 || y % 10 === 0 ? 0.86 : (x % 10 === 5 && y % 10 === 5) ? 1.3 : 1),
};

/** rules: { cssColor: patternName } (shaded variants of each color are included automatically). */
function compileRules(rules) {
  const map = new Map();
  for (const [col, name] of Object.entries(rules || {})) {
    if (!col || col[0] !== '#') continue;
    for (const f of [1, 0.7, 0.75, 0.8, 0.85, 1.15]) map.set(packCss(f === 1 ? col : shadeCss(col, f)), PATTERNS[name]);
  }
  return map;
}

function texturize(px, w, h, rules) {
  if (!rules.size) return px;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const fn = rules.get(px[i]);
      if (!fn) continue;
      const f = fn(x, y);
      if (f !== 1) px[i] = scaleRgb(px[i], f);
    }
  return px;
}

class Sheet {
  constructor(fw, fh, count, cols = 8, rules = null) {
    this.fw = fw;
    this.fh = fh;
    this.cols = Math.min(cols, count);
    this.rows = Math.ceil(count / this.cols);
    const { c, ctx } = makeCanvas(this.cols * fw * SCALE, this.rows * fh * SCALE);
    this.canvas = c;
    this.ctx = ctx;
    this.scratch = makeCanvas(fw, fh);
    this.detailCanvas = makeCanvas(fw * SCALE, fh * SCALE);
    this.rules = compileRules(rules);
    this.count = 0;
    this.anims = {};
  }
  /** drawFn paints at base resolution; detailFn (optional) paints fine 1px details at 2x afterward. */
  frame(drawFn, detailFn = null) {
    const i = this.count++;
    const { fw, fh } = this;
    const sc = this.scratch.ctx;
    sc.clearRect(0, 0, fw, fh);
    drawFn(sc, 0, 0);
    const src = new Uint32Array(sc.getImageData(0, 0, fw, fh).data.buffer.slice(0));
    const W2 = fw * SCALE, H2 = fh * SCALE;
    const big = polish(texturize(scale2x(src, fw, fh), W2, H2, this.rules), W2, H2);
    const img = new ImageData(new Uint8ClampedArray(big.buffer), W2, H2);
    const ox = (i % this.cols) * W2, oy = Math.floor(i / this.cols) * H2;
    if (detailFn) {
      const dc = this.detailCanvas.ctx;
      dc.clearRect(0, 0, W2, H2);
      dc.putImageData(img, 0, 0);
      detailFn(dc);
      this.ctx.drawImage(this.detailCanvas.c, ox, oy);
    } else this.ctx.putImageData(img, ox, oy);
    return i;
  }
  anim(name, frames, fps = 8, loop = true) {
    this.anims[name] = { frames, fps, loop };
  }
  build() {
    const tex = new THREE.CanvasTexture(this.canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.texture = tex;
    return this;
  }
}

/** Fine 2x face / costume details: eyes with catchlights, brows, mouth, blush, buckle glint. */
function humanoidDetail(ctx, o, pose) {
  const P = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const lean = pose.lean || 0;
  const by = (pose.bob || 0) + (pose.crouch || 0);
  const hx = 11 + lean, hy = 7 + by;
  const X = (hx + 6) * 2, Y = (hy + 4) * 2;
  const dark = o.eye || '#20243a';
  if (!o.visor) {
    if (pose.hurt) {
      for (let k = 0; k < 4; k++) P(X + k, Y + 1 - (k % 2), dark);
    } else {
      P(X + 1, Y, '#ffffff');
      P(X + 1, Y + 1, '#e8e4f0');
      for (let yy = -1; yy <= 1; yy++) {
        P(X + 2, Y + yy, dark);
        P(X + 3, Y + yy, dark);
      }
      P(X + 2, Y - 1, '#ffffff'); // catchlight
      P(X + 3, Y + 1, shadeCss(o.skin, 0.75));
    }
    // brow
    const brow = shadeCss(o.beard || o.hair || '#3a2a20', 0.8);
    for (let k = 1; k <= 3; k++) P(X + k, Y - 3 + (k === 1 ? 1 : 0), brow);
  }
  if (!o.beard) {
    // mouth + blush
    const my = (hy + 6) * 2 + 1;
    P(X + 1, my, shadeCss(o.skin, 0.62));
    P(X + 2, my, shadeCss(o.skin, 0.7));
    P(X - 2, Y + 3, '#f0a08c');
    P(X - 1, Y + 3, '#f0a890');
  }
  // nose shading
  P((hx + 8) * 2 + 1, Y + 2, shadeCss(o.skin, 0.82));
  if (o.belt) P((16 + lean) * 2 + 1, (21 + by) * 2, '#fff2b0');
  if (o.amulet) P((17 + lean) * 2, (17 + by) * 2, '#ffffff');
  if (o.sunPendant) {
    P((15 + lean) * 2 + 1, (18 + by) * 2 + 1, '#fff6c8');
    P((15 + lean) * 2 + 2, (18 + by) * 2 + 2, '#fff6c8');
  }
}

function humanoidSheet(o, opts = {}) {
  const rules = { [o.hair]: 'hair', [o.top]: 'cloth', [o.legs]: o.robe ? 'cloth' : 'crease', [o.boots]: 'leather' };
  if (o.apron) rules[o.apron] = 'weave';
  if (o.beard) rules[o.beard] = 'hair';
  const s = new Sheet(32, 32, 24, 8, rules);
  const f = (pose) => s.frame((ctx, ox, oy) => drawHumanoid(ctx, ox, oy, o, pose), (ctx) => humanoidDetail(ctx, o, pose));
  const idle = [f({ bob: 0 }), f({ bob: 1, armF: 0.15, armB: -0.15 })];
  s.anim('idle', idle, 2.5);
  if (opts.npcOnly) {
    const talk = [f({ bob: 0, armF: 1.2 }), f({ bob: 1, armF: 0.9 })];
    s.anim('talk', talk, 4);
    return s.build();
  }
  const walk = [];
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2;
    walk.push(f({ bob: Math.abs(Math.sin(t)) > 0.7 ? 1 : 0, legF: Math.sin(t) * 0.7, legB: -Math.sin(t) * 0.7, armF: -Math.sin(t) * 0.8, armB: Math.sin(t) * 0.8 }));
  }
  s.anim('walk', walk, 10);
  s.anim('run', walk, 15);
  s.anim('jump', [f({ legF: 0.9, legB: -0.3, armF: 2.6, armB: -2.4, crouch: -1 })], 1);
  s.anim('fall', [f({ legF: 0.3, legB: -0.5, armF: 2.0, armB: -2.0 })], 1);
  s.anim('climb', [f({ armF: 3.0, armB: 2.6, legF: 0.4, legB: -0.1 }), f({ armF: 2.6, armB: 3.0, legF: -0.1, legB: 0.4, bob: 1 })], 6);
  s.anim('attack', [
    f({ armF: 3.0, tool: true, lean: -1 }),
    f({ armF: 1.6, tool: true, lean: 1, legF: 0.4 }),
    f({ armF: 0.6, tool: true, lean: 1, legF: 0.4 }),
  ], 16, false);
  s.anim('push', [f({ lean: 1, armF: 1.5, armB: 1.3, legF: 0.4, legB: -0.6 }), f({ lean: 1, armF: 1.4, armB: 1.5, legF: -0.2, legB: -0.3, bob: 1 })], 5);
  s.anim('hurt', [f({ hurt: true, lean: -1, armF: -1.0, armB: -1.4 })], 1);
  s.anim('swim', [f({ armF: 1.8, armB: -1.2, legF: 0.9, legB: -0.9 }), f({ armF: 0.8, armB: -2.2, legF: -0.6, legB: 0.6, bob: 1 })], 4);
  // roll: curled ball
  const roll = [];
  for (let i = 0; i < 4; i++) {
    roll.push(
      s.frame((ctx, ox, oy) => {
        const cx = ox + 16, cy = oy + 24;
        disc(ctx, cx, cy, 6, o.top);
        const a = (i / 4) * Math.PI * 2;
        disc(ctx, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 3, o.hair);
        disc(ctx, cx + Math.cos(a + 2.2) * 3.5, cy + Math.sin(a + 2.2) * 3.5, 2, o.boots);
        disc(ctx, cx + Math.cos(a - 2.2) * 3.5, cy + Math.sin(a - 2.2) * 3.5, 1, o.skin);
      }),
    );
  }
  s.anim('roll', roll, 14);
  return s.build();
}

// ---------------------------------------------------------------------------
// Creatures
// ---------------------------------------------------------------------------
function thornbackSheet() {
  const s = new Sheet(32, 32, 4, 8, { '#6f8a3a': 'scales', '#4f6a2a': 'scales', '#d8c27a': 'weave' });
  const draw = (ctx, ox, oy, t, hurt) => {
    const B = hurt ? '#f0e0d0' : '#6f8a3a', Bd = hurt ? '#d0b0a0' : '#4f6a2a', belly = '#d8c27a';
    const y = 22 + (t ? 1 : 0);
    rect(ctx, ox + 6, oy + y, 16, 5, B); // body
    rect(ctx, ox + 8, oy + y + 4, 12, 2, belly);
    rect(ctx, ox + 20, oy + y - 2, 8, 5, B); // head
    px(ctx, ox + 25, oy + y - 1, '#ffd23a');
    px(ctx, ox + 26, oy + y - 1, '#1a1a1a');
    rect(ctx, ox + 26, oy + y + 2, 3, 1, '#c84a3a');
    line(ctx, ox + 6, oy + y + 2, ox + 0, oy + y + 4 + (t ? -1 : 1), B, 2); // tail
    for (let i = 0; i < 5; i++) {
      // spikes
      const sx = ox + 8 + i * 3;
      rect(ctx, sx, oy + y - 2 - (i % 2), 2, 2 + (i % 2), '#c8642a');
    }
    // legs
    const l = t ? 1 : -1;
    rect(ctx, ox + 8 + l, oy + y + 5, 2, 3, Bd);
    rect(ctx, ox + 18 - l, oy + y + 5, 2, 3, Bd);
    rect(ctx, ox + 11 - l, oy + y + 5, 2, 3, B);
    rect(ctx, ox + 21 + l, oy + y + 5, 2, 3, B);
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0, false));
  const b = s.frame((c, x, y) => draw(c, x, y, 1, false));
  const h = s.frame((c, x, y) => draw(c, x, y, 0, true));
  s.anim('walk', [a, b], 6);
  s.anim('hurt', [h], 1);
  return s.build();
}

function crabSheet() {
  const s = new Sheet(32, 32, 3, 8, { '#d8604a': 'scales', '#a8402e': 'scales' });
  const draw = (ctx, ox, oy, t, hurt) => {
    const B = hurt ? '#f6e4dc' : '#d8604a', Bd = hurt ? '#d8b8a8' : '#a8402e';
    const y = 22 + (t ? 1 : 0);
    rect(ctx, ox + 9, oy + y, 14, 6, B); // shell
    rect(ctx, ox + 10, oy + y - 1, 12, 1, B);
    rect(ctx, ox + 11, oy + y + 1, 10, 1, '#f08a6a');
    rect(ctx, ox + 10, oy + y + 5, 12, 1, Bd);
    // eyes on stalks
    rect(ctx, ox + 13, oy + y - 4, 1, 3, Bd);
    rect(ctx, ox + 18, oy + y - 4, 1, 3, Bd);
    px(ctx, ox + 13, oy + y - 5, '#1a1a1a');
    px(ctx, ox + 18, oy + y - 5, '#1a1a1a');
    // claws, snapping
    line(ctx, ox + 9, oy + y + 2, ox + 5, oy + y - 1 - (t ? 1 : 0), Bd, 2);
    line(ctx, ox + 22, oy + y + 2, ox + 26, oy + y - 1 - (t ? 0 : 1), Bd, 2);
    rect(ctx, ox + 3, oy + y - 4 - (t ? 1 : 0), 4, 3, B);
    rect(ctx, ox + 25, oy + y - 4 - (t ? 0 : 1), 4, 3, B);
    px(ctx, ox + 4, oy + y - 3 - (t ? 1 : 0), '#1a1a1a');
    px(ctx, ox + 27, oy + y - 3 - (t ? 0 : 1), '#1a1a1a');
    // legs
    const l = t ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      rect(ctx, ox + 10 + i * 2 + l, oy + y + 6, 1, 2, Bd);
      rect(ctx, ox + 17 + i * 2 - l, oy + y + 6, 1, 2, Bd);
    }
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0, false));
  const b = s.frame((c, x, y) => draw(c, x, y, 1, false));
  const h = s.frame((c, x, y) => draw(c, x, y, 0, true));
  s.anim('walk', [a, b], 7);
  s.anim('hurt', [h], 1);
  return s.build();
}

function ratSheet() {
  const s = new Sheet(32, 32, 3, 8, { '#6a6070': 'fur', '#8a8090': 'fur' });
  const draw = (ctx, ox, oy, t, hurt) => {
    const B = hurt ? '#f0e0e0' : '#6a6070', Bl = '#8a8090';
    const y = 25;
    rect(ctx, ox + 9, oy + y, 11, 5, B);
    rect(ctx, ox + 10, oy + y - 1, 8, 1, Bl);
    rect(ctx, ox + 19, oy + y + 1, 5, 3, B);
    px(ctx, ox + 24, oy + y + 2, '#e89aa0');
    px(ctx, ox + 21, oy + y + 1, '#ff3030');
    rect(ctx, ox + 18, oy + y - 2, 2, 2, '#e89aa0');
    line(ctx, ox + 9, oy + y + 3, ox + 2, oy + y + (t ? 0 : 3), '#c87a8a', 1);
    rect(ctx, ox + 11 + (t ? 1 : 0), oy + y + 5, 2, 1, '#e89aa0');
    rect(ctx, ox + 17 - (t ? 1 : 0), oy + y + 5, 2, 1, '#e89aa0');
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0));
  const b = s.frame((c, x, y) => draw(c, x, y, 1));
  const h = s.frame((c, x, y) => draw(c, x, y, 0, true));
  s.anim('walk', [a, b], 10);
  s.anim('hurt', [h], 1);
  return s.build();
}

function droneSheet() {
  const s = new Sheet(32, 32, 3, 8, { '#4a5468': 'plate', '#6a7690': 'plate' });
  const draw = (ctx, ox, oy, t, hurt) => {
    const cx = ox + 16, cy = oy + 16;
    disc(ctx, cx, cy, 7, hurt ? '#ffffff' : '#4a5468');
    disc(ctx, cx, cy - 2, 5, hurt ? '#ffffff' : '#6a7690');
    disc(ctx, cx + 2, cy, 3, '#0a0e18');
    disc(ctx, cx + 2, cy, 2, '#ff3fd2');
    px(ctx, cx + 3, cy - 1, '#ffffff');
    // rotor
    rect(ctx, cx - 1, cy - 10, 2, 3, '#2a3040');
    rect(ctx, cx - (t ? 8 : 3), cy - 11, t ? 16 : 6, 1, '#a0e8ff');
    // thrusters
    rect(ctx, cx - 6, cy + 6, 3, 2, '#36f0ff');
    rect(ctx, cx + 3, cy + 6, 3, 2, '#36f0ff');
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0));
  const b = s.frame((c, x, y) => draw(c, x, y, 1));
  const h = s.frame((c, x, y) => draw(c, x, y, 0, true));
  s.anim('walk', [a, b], 14);
  s.anim('hurt', [h], 1);
  return s.build();
}

function sentinelSheet() {
  const s = new Sheet(48, 48, 4, 4, { '#7a8494': 'plate', '#4a5260': 'plate' });
  const draw = (ctx, ox, oy, t, mode) => {
    const body = mode === 'dead' ? '#3a3230' : '#7a8494', dark = mode === 'dead' ? '#2a2220' : '#4a5260';
    // treads
    rect(ctx, ox + 6, oy + 38, 36, 8, '#2a2e36');
    for (let i = 0; i < 9; i++) rect(ctx, ox + 7 + i * 4 + (t ? 2 : 0), oy + 40, 2, 4, '#5a606c');
    // body
    rect(ctx, ox + 10, oy + 18, 28, 20, body);
    rect(ctx, ox + 10, oy + 18, 28, 2, '#a6b0c0');
    rect(ctx, ox + 12, oy + 30, 24, 6, dark);
    // head
    rect(ctx, ox + 14, oy + 6, 22, 12, body);
    rect(ctx, ox + 22, oy + 9, 14, 4, mode === 'dead' ? '#201010' : '#ff2a3a');
    if (mode !== 'dead') rect(ctx, ox + 30 + (t ? 2 : 0), oy + 10, 3, 2, '#ffd0d0');
    // antenna
    rect(ctx, ox + 18, oy + 1, 1, 5, dark);
    px(ctx, ox + 18, oy + 0, mode === 'dead' ? '#402020' : '#ff3fd2');
    // arm cannon
    rect(ctx, ox + 34, oy + 22, 10, 5, dark);
    rect(ctx, ox + 42, oy + 23, 3, 3, mode === 'dead' ? '#201010' : '#ffb03a');
    // warning stripes
    for (let i = 0; i < 4; i++) rect(ctx, ox + 13 + i * 6, oy + 32, 3, 3, '#ffb03a');
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0, 'live'));
  const b = s.frame((c, x, y) => draw(c, x, y, 1, 'live'));
  const d = s.frame((c, x, y) => draw(c, x, y, 0, 'dead'));
  s.anim('walk', [a, b], 8);
  s.anim('hurt', [a], 1);
  s.anim('dead', [d], 1);
  return s.build();
}

function robotSheet(kind) {
  const s = new Sheet(32, 32, 2, 8, { '#c87a2a': 'plate', '#8a94a4': 'plate', '#b8683a': 'plate', '#d8b040': 'plate' });
  const draw = (ctx, ox, oy, t) => {
    if (kind === 'digby') {
      // DIGBY: a salvage unit on one fat wheel, with a scoop arm and a single amber eye
      rect(ctx, ox + 9, oy + 12 + t, 14, 11, '#b8683a');
      rect(ctx, ox + 9, oy + 12 + t, 14, 2, '#d88a5a');
      rect(ctx, ox + 10, oy + 19 + t, 12, 2, '#d8b040');
      for (let i = 0; i < 3; i++) rect(ctx, ox + 11 + i * 4, oy + 19 + t, 2, 2, '#2a2420');
      rect(ctx, ox + 12, oy + 4 + t, 9, 7, '#8a94a4');
      disc(ctx, ox + 17, oy + 7 + t, 2, '#1a1410');
      px(ctx, ox + 17, oy + 7 + t, '#ffb03a');
      px(ctx, ox + 18, oy + 6 + t, '#fff2c0');
      rect(ctx, ox + 14, oy + 1 + t, 1, 3, '#4a5260');
      px(ctx, ox + 14, oy + 0 + t, '#ff5a3a');
      rect(ctx, ox + 23, oy + 14 + t, 4, 2, '#8a94a4'); // scoop arm
      rect(ctx, ox + 26, oy + 12 + t, 2, 6, '#5a606c');
      rect(ctx, ox + 6, oy + 14 + t, 3, 6, '#8a94a4');
      disc(ctx, ox + 16, oy + 26, 4, '#2a2e36');
      disc(ctx, ox + 16, oy + 26, 2, '#5a606c');
    } else if (kind === 'brn') {
      // stocky repair bot
      rect(ctx, ox + 9, oy + 14 + t, 14, 12, '#c87a2a');
      rect(ctx, ox + 9, oy + 14 + t, 14, 2, '#e8a050');
      rect(ctx, ox + 11, oy + 5 + t, 10, 8, '#8a94a4');
      rect(ctx, ox + 13, oy + 8 + t, 7, 2, '#36f0ff');
      rect(ctx, ox + 15, oy + 2 + t, 1, 3, '#4a5260');
      px(ctx, ox + 15, oy + 1 + t, '#ffb03a');
      rect(ctx, ox + 6, oy + 16 + t, 3, 7, '#8a94a4');
      rect(ctx, ox + 23, oy + 16 + t, 3, 7, '#8a94a4');
      rect(ctx, ox + 10, oy + 26, 5, 4, '#4a5260');
      rect(ctx, ox + 17, oy + 26, 5, 4, '#4a5260');
      rect(ctx, ox + 13, oy + 18 + t, 6, 4, '#3a2a1a');
      px(ctx, ox + 14, oy + 19 + t, '#7cff6a');
    } else {
      // floating archivist "Tick"
      const y = 10 + t;
      disc(ctx, ox + 16, oy + y + 4, 7, '#d8dce6');
      rect(ctx, ox + 11, oy + y + 2, 10, 4, '#1a2030');
      rect(ctx, ox + 13, oy + y + 3, 2, 2, '#36f0ff');
      rect(ctx, ox + 18, oy + y + 3, 2, 2, '#36f0ff');
      disc(ctx, ox + 16, oy + y - 4, 2, '#ffb03a');
      rect(ctx, ox + 15, oy + y - 2, 2, 2, '#8a94a4');
      // clock ring
      rect(ctx, ox + 12, oy + y + 12, 8, 1, '#ff3fd2');
      rect(ctx, ox + 14, oy + y + 14, 4, 1, '#ff3fd2');
    }
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0));
  const b = s.frame((c, x, y) => draw(c, x, y, 1));
  s.anim('idle', [a, b], 2.5);
  s.anim('talk', [a, b], 5);
  return s.build();
}

function squirrelSheet({ B = '#c8642a', L = '#e8a060', acorn = true, spectacles = false, scarf = null } = {}) {
  const s = new Sheet(32, 32, 2, 8, { [B]: 'fur', [L]: 'fur' });
  const draw = (ctx, ox, oy, t) => {
    // big tail
    disc(ctx, ox + 10, oy + 20 - t, 5, B);
    disc(ctx, ox + 9, oy + 16 - t, 4, B);
    disc(ctx, ox + 9, oy + 15 - t, 2, L);
    // body
    disc(ctx, ox + 16, oy + 25, 4, B);
    disc(ctx, ox + 17, oy + 26, 2, L);
    disc(ctx, ox + 19, oy + 20, 3, B);
    px(ctx, ox + 20, oy + 19, '#1a1a1a');
    rect(ctx, ox + 18, oy + 16, 1, 2, B);
    px(ctx, ox + 22, oy + 21, '#3a2020');
    if (acorn) {
      // acorn in paws
      rect(ctx, ox + 20, oy + 24, 2, 2, '#8a5a2a');
      px(ctx, ox + 20, oy + 23, '#5a3a1a');
    } else {
      // one paw raised, mid-lecture
      rect(ctx, ox + 21, oy + 22 - t, 1, 2, L);
    }
    if (scarf) {
      rect(ctx, ox + 17, oy + 22, 5, 1, scarf);
      rect(ctx, ox + 17, oy + 23, 1, 2, scarf);
    }
    if (spectacles) {
      px(ctx, ox + 19, oy + 19, '#e2bf62');
      px(ctx, ox + 21, oy + 19, '#e2bf62');
      px(ctx, ox + 20, oy + 18, '#e2bf62');
      px(ctx, ox + 20, oy + 20, '#e2bf62');
    }
  };
  const a = s.frame((c, x, y) => draw(c, x, y, 0));
  const b = s.frame((c, x, y) => draw(c, x, y, 1));
  s.anim('idle', [a, b], 3);
  s.anim('talk', [a, b], 6);
  return s.build();
}

// ---------------------------------------------------------------------------
// Character definitions
// ---------------------------------------------------------------------------
export const CHAR = {
  vivienne: { skin: '#f2c49a', hair: '#2e2236', hairStyle: 'bun', top: '#2f8a8a', apron: '#7a5232', legs: '#4a3a5a', boots: '#5a3a22', belt: '#3a2614', goggles: true, amulet: true },
  louise: { skin: '#e8b890', hair: '#d8d8e0', hairStyle: 'long', top: '#6a3a8a', apron: '#9a6ab0', legs: '#3a2a4a', boots: '#3a2a20' },
  // Sun-Keeper: astronomer-priest of the sandstone observatory. Linen robe, saffron stole, gold sun circlet.
  samaria: { skin: '#b07a50', hair: '#2a1a14', hairStyle: 'circletLong', top: '#eadfc4', apron: '#d8922a', legs: '#d6c8a6', boots: '#8a5a32', belt: '#c9a44a', robe: true, sunPendant: true },
  aria: { skin: '#e0a882', hair: '#e2bc5a', hairStyle: 'long', top: '#8a4a3a', apron: '#4a3020', legs: '#3a3030', boots: '#2a2020', belt: '#2a1a10', wide: true },
  // Michelle the Wise: a star-robed sage waiting by the old ford
  michelle: { skin: '#d9a27c', hair: '#e6e2ea', hairStyle: 'long', top: '#33416e', apron: '#c9a44a', legs: '#2c3760', boots: '#3a2a20', belt: '#c9a44a', robe: true, sunPendant: true },
  // Sheng keeps the old gray-bearded gatekeeper look
  sheng: { skin: '#c08860', hair: '#8e8c94', hairStyle: 'short', beard: '#9a98a0', top: '#8a8e9a', apron: '#5a5e6a', legs: '#5a5a62', boots: '#3a3a40', belt: '#8a6a3a', wide: true },
  callie: { skin: '#c08860', hair: '#b8925a', hairStyle: 'braid', top: '#d8b880', apron: '#8a6a3a', legs: '#7a5a3a', boots: '#5a3a22', belt: '#c8642a', wide: true },
  lillian: { skin: '#e8b088', hair: '#36d0e0', hairStyle: 'spiky', top: '#e07a2a', apron: '#3a404c', legs: '#3a404c', boots: '#22262f', belt: '#ffb03a', goggles: true },
  eugene: { skin: '#f2cdb4', hair: '#f0f0f6', hairStyle: 'baldRing', top: '#3a4a8a', apron: '#c9a44a', legs: '#2a2a3a', boots: '#3a2a20', belt: '#c9a44a' },
  hobb: { skin: '#e0b088', hair: '#8a5a32', hairStyle: 'bald', beard: '#a87a4a', top: '#c8c0a8', apron: '#e8e0d0', legs: '#5a4a3a', boots: '#3a2a20', belt: '#6a4a2a', wide: true },
  tamsin: { skin: '#9a6a48', hair: '#1e1612', hairStyle: 'braid', top: '#7a8a3a', apron: '#c9a24a', legs: '#6a5232', boots: '#4a3220', belt: '#c8642a' },
  // Oren the Mason: laying the first stones of a tower he doesn't understand
  oren: { skin: '#a8744e', hair: '#3a2a1e', hairStyle: 'short', beard: '#3a2a1e', top: '#c9b48a', apron: '#8a7a66', legs: '#7a6248', boots: '#4a3220', belt: '#c8642a', wide: true },
  // Chapter Two: three weeks on, dressed for the shore. A navy sea-coat, a red neckerchief,
  // sailcloth trousers and yellow sea-boots. The goggles and the amulet go wherever she does.
  vivienneCoast: {
    skin: '#f2c49a', hair: '#2e2236', hairStyle: 'bun', top: '#27477a', apron: '#1d3660', legs: '#d9ccaa', boots: '#e2b83a', belt: '#8a5a32', goggles: true, amulet: true,
    chest: (P, lean, by) => {
      for (const x of [13, 14, 15]) P(x + lean, 16 + by, '#e0483a');
      P(14 + lean, 17 + by, '#c23a2e');
    },
  },
  // Chapter Three, up the mountain in winter: her teal wool coat to the knee with a fur hem, a
  // mustard scarf, red earmuffs and mittens, fur-topped boots. The goggles and the amulet, as ever.
  vivienneWinter: {
    skin: '#f2c49a', hair: '#2e2236', hairStyle: 'bun', top: '#2a7a7c', legs: '#4a3a5a', boots: '#5a3a22', belt: '#3a2614', goggles: true, amulet: true,
    longCoat: '#246c6e', trim: '#f0ece4', sleeves: true, scarf: '#e0a030', earmuffs: '#c83a4a', mittens: '#c83a4a', bootTrim: '#e8e0d0',
  },
  // ---- Chapter Three: the mountain, in winter ----
  // Michelle the Wise, her star robe under a fur-trimmed shawl, and a knit hat at last
  michelleWinter: { skin: '#d9a27c', hair: '#e6e2ea', hairStyle: 'long', top: '#33416e', apron: '#c9a44a', legs: '#2c3760', boots: '#3a2a20', belt: '#c9a44a', robe: true, sunPendant: true, hat: '#5a3a8a', pom: '#e6e2ea', scarf: '#f0ece4', mittens: '#33416e', sleeves: true },
  // Ingrid lights the lamps on the Lantern Road, every night, all winter
  ingrid: { skin: '#f0c0a0', hair: '#e8c870', hairStyle: 'braid', top: '#8a3a2a', legs: '#4a4038', boots: '#3a2a20', belt: '#3a2614', longCoat: '#7a2e22', trim: '#f0ece4', sleeves: true, hat: '#3a7a4a', pom: '#f0ece4', scarf: '#e8d8a0', mittens: '#3a7a4a', bootTrim: '#e8e0d0' },
  // Tobin keeps the observatory's star-books: an indigo hood lined with fur, a long gray beard
  tobin: { skin: '#c89070', hair: '#3a4a7a', hairStyle: 'hood', hoodTrim: '#f0ece4', beard: '#c8c8d0', top: '#3a4a7a', apron: '#c9a44a', legs: '#2c3458', boots: '#2a2420', belt: '#c9a44a', robe: true, wide: true, sleeves: true, mittens: '#5a4a3a' },
  // the statue of the first Clockmaker on the Sundial Terrace: Vivienne, in stone (goggles and all)
  statue: { skin: '#b8b2a4', hair: '#8f8a80', hairStyle: 'bun', top: '#a8a296', apron: '#9a958a', legs: '#8f8a80', boots: '#7f7a70', belt: '#8a857a', goggles: true, eye: '#6f6a62', amuletColor: '#d8d2c4' },
  // Sela cuts the first stones of the observatory, in the First Age: furs and hide
  sela: { skin: '#9a6a48', hair: '#1e1612', hairStyle: 'braid', top: '#8a6a4a', apron: '#5a4030', legs: '#6a5232', boots: '#4a3220', belt: '#c8642a', longCoat: '#7a5a3a', trim: '#d8c8a8', sleeves: true, mittens: '#5a4030', bootTrim: '#d8c8a8' },
  // Sir Christopher: plum velvet and gold, white gloves, a watch chain. He has borrowed enough
  // hours to look no older than the day he left: dark hair, not a gray one in it
  christopher: { skin: '#e8c0a4', hair: '#2a1e2a', hairStyle: 'short', top: '#6a2a4a', legs: '#2a1e2a', boots: '#1e161c', belt: '#e8c25a', longCoat: '#5a1f3e', trim: '#e8c25a', sleeves: true, mittens: '#f0ece4', scarf: '#e8c25a', sunPendant: true },
  // the two of them on the midwinter night he kept (seen only as a memory under the orrery)
  christopherYoung: { skin: '#e8c0a4', hair: '#2a1e2a', hairStyle: 'short', top: '#4a6aa0', apron: '#7a5232', legs: '#3a3a4a', boots: '#3a2a20', belt: '#3a2614', scarf: '#c83a4a', sleeves: true },
  lyraYoung: { skin: '#d9a27c', hair: '#e6e2ea', hairStyle: 'circletLong', top: '#33416e', apron: '#c9a44a', legs: '#2c3760', boots: '#3a2a20', belt: '#c9a44a', robe: true, scarf: '#e8c25a', sleeves: true, sunPendant: true },
  eugeneYoung: { skin: '#f2cdb4', hair: '#5a4030', hairStyle: 'short', top: '#3a4a8a', apron: '#c9a44a', legs: '#2a2a3a', boots: '#3a2a20', belt: '#c9a44a', scarf: '#3a7a4a', sleeves: true },
  // Orin, fifty years after: an old man in the same plum coat, gone shabby, keeping the observatory
  orinOld: { skin: '#e8c0a4', hair: '#d8d4dc', hairStyle: 'short', beard: '#d8d4dc', top: '#6a2a4a', legs: '#2a1e2a', boots: '#1e161c', belt: '#8a7a5a', longCoat: '#4a2238', trim: '#c8b89a', sleeves: true, mittens: '#5a4a3a', scarf: '#8a6a4a' },
  // the Founder's statue on the Sundial Terrace: Donald Eugene, six hundred years ago, in stone
  statueDon: { skin: '#b8b2a4', hair: '#a8a296', hairStyle: 'baldRing', top: '#a8a296', legs: '#8f8a80', boots: '#7f7a70', belt: '#8a857a', longCoat: '#9a958a', trim: '#b8b2a4', sleeves: true, eye: '#6f6a62' },
  // Donald Eugene, who climbed a mountain on knees that are not what they were
  eugeneWinter: { skin: '#f2cdb4', hair: '#f0f0f6', hairStyle: 'baldRing', top: '#3a4a8a', legs: '#2a2a3a', boots: '#3a2a20', belt: '#c9a44a', longCoat: '#2a3a6a', trim: '#f0ece4', sleeves: true, hat: '#7a2e22', pom: '#f0ece4', scarf: '#3a7a4a', mittens: '#7a2e22', bootTrim: '#e8e0d0' },
  // the guides and porters of Highcrest: down coats, knit hats, and the biggest packs on the mountain
  anwen: { skin: '#c8906a', hair: '#2a1a14', hairStyle: 'braid', top: '#e0482a', legs: '#3a3a4a', boots: '#3a2a20', belt: '#2a2a30', longCoat: '#c83a22', trim: '#f0ece4', sleeves: true, hat: '#f0c83a', pom: '#3a6ad8', mittens: '#3a6ad8', bootTrim: '#e8e0d0', goggles: true },
  porterKit: { skin: '#a8744e', hair: '#1e1612', hairStyle: 'short', top: '#2a8ad8', legs: '#4a4038', boots: '#3a2a20', belt: '#3a2614', sleeves: true, hat: '#d83a3a', pom: '#f0f0f0', scarf: '#f0c83a', mittens: '#5a4030', bootTrim: '#e8e0d0', pack: '#e0782a', packTop: '#3ab05a' },
  porterBram: { skin: '#b07a50', hair: '#3a2a1e', hairStyle: 'short', beard: '#3a2a1e', top: '#3ab05a', legs: '#5a4a3a', boots: '#3a2a20', belt: '#3a2614', sleeves: true, hat: '#3a6ad8', pom: '#f0c83a', mittens: '#7a2e22', bootTrim: '#e8e0d0', pack: '#c84a3a', packTop: '#f0c83a', wide: true },
  // ---- Chapter Two: the people of Saltwick ----
  // Brannoch, harbormaster of a harbor with no sea in it
  brannoch: { skin: '#c89070', hair: '#5a5a66', hairStyle: 'short', beard: '#6a6a76', top: '#27405e', apron: '#1c2e44', legs: '#3a3a44', boots: '#2a2420', belt: '#c9a44a', wide: true },
  // Odalys keeps the light: yellow oilskin, hood up against the wind
  odalys: { skin: '#a8704e', hair: '#e2b83a', hairStyle: 'hood', top: '#e2b83a', apron: '#c89a2a', legs: '#3a4a5a', boots: '#2a2a30', belt: '#5a3a22' },
  // Old Fenwick, who is still fishing
  fenwick: { skin: '#e0b090', hair: '#e8e8ee', hairStyle: 'bald', beard: '#e8e8ee', top: '#8a3a3a', apron: '#6a2a2a', legs: '#5a5a4a', boots: '#3a2a20', belt: '#3a2614' },
  // the tide folk of the first age: sea-green cloth, shell and coral
  isha: { skin: '#9a6a48', hair: '#1e1612', hairStyle: 'circletLong', top: '#2f9a8a', apron: '#e8dcc0', legs: '#237a70', boots: '#8a5a32', belt: '#e0786a', robe: true, sunPendant: true },
  pim: { skin: '#a8744e', hair: '#2a1a14', hairStyle: 'short', top: '#e0786a', apron: '#e8dcc0', legs: '#2f9a8a', boots: '#8a5a32' },
  maren: { skin: '#8a5a3c', hair: '#3a2a22', hairStyle: 'braid', top: '#e8dcc0', apron: '#2f9a8a', legs: '#8a7a5a', boots: '#5a3a22', belt: '#e0786a', wide: true },
  // Dr. Pell, who meant to sail fifty years ago: a bottle-green coat and a doctor's white collar
  pell: { skin: '#e8b890', hair: '#ececf2', hairStyle: 'bun', top: '#2a5a4a', apron: '#e8e4d8', legs: '#34343e', boots: '#2a2420', belt: '#6a4a2a', robe: true },
};
CHAR.lyra = CHAR.michelle;
CHAR.lyraWinter = CHAR.michelleWinter;
CHAR.orin = CHAR.christopher;
CHAR.orinYoung = CHAR.christopherYoung;

// Every sheet in the game, by name. Each is drawn the first time it's asked for, so a chapter
// only ever pays for its own cast.
const npc = (name) => () => humanoidSheet(CHAR[name], { npcOnly: true });
const SHEETS = {
  // Vivienne wears what the chapter says she wears (see playerSheet in each chapter's theme.js)
  vivienne: () => humanoidSheet({ ...(CHAR[outfit || theme.playerSheet] || CHAR.vivienne), wrenchHead }),
  megan: () => squirrelSheet(),
  zach: () => squirrelSheet({ B: '#86848e', L: '#cfccd6', acorn: false, spectacles: true }),
  eugene: npc('eugene'), michelle: npc('michelle'), lyra: npc('michelle'),
  // Chapter One: Hollowmere
  louise: npc('louise'), samaria: npc('samaria'), aria: npc('aria'), callie: npc('callie'), sheng: npc('sheng'), lillian: npc('lillian'),
  hobb: npc('hobb'), tamsin: npc('tamsin'), oren: npc('oren'),
  brn: () => robotSheet('brn'),
  tick: () => robotSheet('tick'),
  thornback: () => thornbackSheet(),
  // Chapter Two: Saltwick
  brannoch: npc('brannoch'), odalys: npc('odalys'), pell: npc('pell'), fenwick: npc('fenwick'), isha: npc('isha'), pim: npc('pim'), maren: npc('maren'),
  digby: () => robotSheet('digby'),
  crab: () => crabSheet(),
  // Chapter Three: the mountain
  michelleWinter: npc('michelleWinter'), lyraWinter: npc('michelleWinter'), ingrid: npc('ingrid'), tobin: npc('tobin'), sela: npc('sela'),
  anwen: npc('anwen'), porterKit: npc('porterKit'), porterBram: npc('porterBram'),
  christopher: npc('christopher'), orin: npc('christopher'),
  christopherYoung: npc('christopherYoung'), orinYoung: npc('christopherYoung'),
  lyraYoung: npc('lyraYoung'),
  eugeneYoung: npc('eugeneYoung'), eugeneWinter: npc('eugeneWinter'),
  statue: () => humanoidSheet(CHAR.statue, { npcOnly: true }), // (Vivienne in stone: no longer used)
  statueDon: () => humanoidSheet(CHAR.statueDon, { npcOnly: true }), // the Founder, in stone
  orinOld: npc('orinOld'),
  meganWinter: () => squirrelSheet({ scarf: '#e04a4a' }),
  zachWinter: () => squirrelSheet({ B: '#86848e', L: '#cfccd6', acorn: false, spectacles: true, scarf: '#4a6ad8' }),
  // both
  rat: () => ratSheet(),
  drone: () => droneSheet(),
  sentinel: () => sentinelSheet(),
};
const cache = {};
let outfit = null;
/** Dress Vivienne in another chapter's clothes (see src/kit.js): every 'vivienne' actor made after this wears them. */
export function setOutfit(name) {
  if (name === outfit) return;
  outfit = name;
  delete cache.vivienne;
}
/** The glow of the part on her wrench's head (see src/kit.js PARTS). */
let wrenchHead = null;
export function setWrenchHead(css) {
  if (css === wrenchHead) return;
  wrenchHead = css;
  delete cache.vivienne;
}
const sheets = new Proxy(cache, {
  get: (c, name) => (name in c ? c[name] : SHEETS[name] ? (c[name] = SHEETS[name]()) : undefined),
});
export function getSheets() {
  return sheets;
}

// ---------------------------------------------------------------------------
// Characters are drawn from these sheets in 3D (see actors.js). Their cards were stretched a little
// upright to undo the diorama camera's pitch foreshortening, and the 3D looks keep those proportions.
export const SPRITE_STRETCH = 1.1;

// ---------------------------------------------------------------------------
// Item icons & portraits (for HTML UI)
// ---------------------------------------------------------------------------
const ICONS = {
  starChart: (c) => {
    rect(c, 2, 3, 12, 10, '#e8dcb0');
    rect(c, 2, 3, 12, 1, '#c8b880');
    rect(c, 2, 12, 12, 1, '#b8a870');
    rect(c, 1, 3, 1, 10, '#8a6a3a');
    rect(c, 14, 3, 1, 10, '#8a6a3a');
    for (const [x, y] of [[4, 5], [7, 7], [11, 5], [9, 10], [5, 10]]) px(c, x, y, '#2a3a7a');
    line(c, 4, 5, 7, 7, '#6a7ab8', 1);
    line(c, 7, 7, 11, 5, '#6a7ab8', 1);
    line(c, 7, 7, 9, 10, '#6a7ab8', 1);
    disc(c, 11, 10, 1, '#e8a030');
  },
  lilySeeds: (c) => {
    disc(c, 8, 9, 5, '#c8a060');
    rect(c, 6, 3, 4, 3, '#a8804a');
    rect(c, 7, 2, 2, 1, '#8a6a3a');
    for (const [x, y] of [[6, 8], [9, 9], [7, 11], [10, 7]]) px(c, x, y, '#ffd34a');
    px(c, 8, 4, '#5a8a3a');
  },
  medallion: (c) => {
    rect(c, 7, 1, 2, 4, '#8a3a2a');
    disc(c, 8, 9, 5, '#c9a44a');
    disc(c, 8, 9, 3, '#e8c86a');
    rect(c, 7, 7, 2, 4, '#8a6a2a');
    rect(c, 6, 8, 4, 1, '#8a6a2a');
    px(c, 6, 6, '#fff2b0');
  },
  acorn: (c) => {
    disc(c, 8, 10, 4, '#a8682a');
    px(c, 7, 9, '#d8984a');
    rect(c, 3, 5, 10, 3, '#6a4220');
    rect(c, 4, 4, 8, 1, '#8a5a2a');
    rect(c, 8, 2, 1, 2, '#4a2a10');
  },
  hammerBroken: (c) => {
    line(c, 3, 13, 9, 7, '#6b4428', 2);
    rect(c, 7, 2, 7, 4, '#7a7f8a');
    rect(c, 9, 3, 1, 3, '#2a2a30');
    px(c, 10, 2, '#2a2a30');
  },
  hammer: (c) => {
    line(c, 3, 13, 9, 7, '#8a5a30', 2);
    rect(c, 7, 2, 7, 4, '#ffcf5a');
    rect(c, 7, 2, 7, 1, '#fff2b0');
    px(c, 13, 5, '#ff9a3a');
  },
  rod: (c) => {
    line(c, 2, 14, 13, 2, '#8a929e', 2);
    px(c, 12, 2, '#d8dce6');
    rect(c, 2, 12, 3, 3, '#5a3a22');
  },
  disc: (c) => {
    disc(c, 8, 8, 6, '#e8b040');
    disc(c, 8, 8, 4, '#ffd870');
    disc(c, 8, 8, 2, '#fff6c0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      px(c, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#ffcf5a');
    }
  },
  core: (c) => {
    rect(c, 5, 2, 6, 12, '#4a5468');
    rect(c, 6, 4, 4, 8, '#36f0ff');
    rect(c, 7, 5, 2, 6, '#c8fcff');
    rect(c, 4, 1, 8, 2, '#8a94a4');
    rect(c, 4, 13, 8, 2, '#8a94a4');
  },
  cog: (c) => {
    disc(c, 8, 8, 5, '#c9a44a');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rect(c, 7 + Math.cos(a) * 6, 7 + Math.sin(a) * 6, 2, 2, '#c9a44a');
    }
    disc(c, 8, 8, 2, '#3a2a14');
    px(c, 6, 5, '#ffe9a0');
  },
  heart: (c) => {
    disc(c, 5, 6, 3, '#ff4a6a');
    disc(c, 11, 6, 3, '#ff4a6a');
    for (let y = 0; y < 6; y++) rect(c, 2 + y, 7 + y, 13 - y * 2, 1, '#ff4a6a');
    px(c, 4, 5, '#ffc0d0');
    px(c, 5, 4, '#ffc0d0');
  },
  wheel: (c) => {
    disc(c, 8, 8, 6, '#b8862a');
    disc(c, 8, 8, 5, '#3a2a14');
    line(c, 3, 8, 13, 8, '#e8b84a', 1);
    line(c, 8, 3, 8, 13, '#e8b84a', 1);
    line(c, 4, 4, 12, 12, '#d8a840', 1);
    line(c, 12, 4, 4, 12, '#d8a840', 1);
    disc(c, 8, 8, 1, '#ffe08a');
    px(c, 5, 3, '#fff2b0');
  },
  snorkel: (c) => {
    // a diving mask and its breathing tube
    rect(c, 3, 7, 9, 5, '#2a6a8a');
    rect(c, 4, 8, 7, 3, '#9fe8ff');
    px(c, 5, 8, '#ffffff');
    rect(c, 2, 9, 1, 2, '#1c2028');
    rect(c, 12, 9, 1, 2, '#1c2028');
    line(c, 13, 11, 13, 3, '#ff8a3a', 2);
    rect(c, 11, 2, 3, 2, '#ff8a3a');
  },
  cable: (c) => {
    disc(c, 8, 9, 6, '#5b6472');
    disc(c, 8, 9, 4, '#8a94a4');
    disc(c, 8, 9, 2, '#3a404c');
    line(c, 13, 6, 15, 2, '#a0a8b4', 1);
    px(c, 6, 5, '#d8dce6');
    px(c, 10, 13, '#d8dce6');
  },
  clockKey: (c) => {
    disc(c, 5, 5, 4, '#36f0ff');
    disc(c, 5, 5, 2, '#0a2a30');
    line(c, 8, 8, 14, 14, '#c9a44a', 2);
    rect(c, 11, 13, 2, 2, '#c9a44a');
    rect(c, 13, 11, 2, 2, '#c9a44a');
    px(c, 3, 3, '#e0ffff');
  },
    satchel: (c) => {
    rect(c, 2, 6, 12, 8, '#7a5232');
    rect(c, 2, 6, 12, 3, '#8a6038');
    rect(c, 7, 8, 2, 2, '#c9a44a');
    line(c, 4, 6, 6, 2, '#5a3a22', 1);
    line(c, 12, 6, 10, 2, '#5a3a22', 1);
    rect(c, 6, 2, 5, 1, '#5a3a22');
  },
  stasisRing: (c) => {
    // a brass ring, etched with an hourglass, glowing pale
    disc(c, 8, 8, 6, '#c9a44a');
    disc(c, 8, 8, 4, '#2a2030');
    rect(c, 6, 5, 4, 1, '#bff6ff');
    rect(c, 6, 10, 4, 1, '#bff6ff');
    px(c, 7, 7, '#bff6ff');
    px(c, 8, 8, '#bff6ff');
    px(c, 7, 9, '#ffffff');
    px(c, 4, 4, '#fff2c0');
  },
  hairspring: (c) => {
    // a fine coil of blued steel, wound backward
    for (let k = 0; k < 40; k++) {
      const a = -k * 0.42, r = 1 + k * 0.15;
      px(c, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), k % 5 ? '#6a8ad8' : '#ffb84a');
    }
  },
  lockpick: (c) => {
    // a bent hairpin and a sliver of watch-spring
    line(c, 2, 13, 11, 4, '#c9c4d0', 1);
    line(c, 11, 4, 13, 4, '#c9c4d0', 1);
    px(c, 13, 3, '#c9c4d0');
    line(c, 4, 14, 13, 6, '#c9a44a', 1);
    rect(c, 2, 12, 3, 3, '#7a5232');
  },
  lens: (c) => {
    disc(c, 8, 8, 6, '#c9a44a');
    disc(c, 8, 8, 4, '#ff4fd8');
    disc(c, 8, 8, 2, '#ffc8f4');
    px(c, 6, 6, '#ffffff');
    rect(c, 7, 14, 2, 2, '#8a6a3a');
  },
  escapement: (c) => {
    // an escape wheel: a brass ring of hooked teeth
    disc(c, 8, 8, 5, '#c9a44a');
    disc(c, 8, 8, 3, '#2a2014');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      px(c, Math.round(8 + Math.cos(a) * 6.4), Math.round(8 + Math.sin(a) * 6.4), '#ffe08a');
    }
    disc(c, 8, 8, 1, '#ffe08a');
  },
  everspring: (c) => {
    // a coiled mainspring of bright star-iron
    const pts = [];
    for (let a = 0; a < Math.PI * 7; a += 0.12) {
      const r = 0.8 + a * 0.28;
      pts.push([Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r)]);
    }
    for (const [x, y] of pts) px(c, x, y, '#ffd070');
    for (const [x, y] of pts.slice(-12)) px(c, x, y, '#fff2c0');
    rect(c, 13, 7, 2, 2, '#c9a44a');
  },
  amulet: (c) => {
    disc(c, 8, 9, 5, '#c9a44a');
    disc(c, 8, 9, 3, '#36f0ff');
    px(c, 7, 8, '#ffffff');
    line(c, 3, 1, 8, 4, '#8a6a3a', 1);
    line(c, 13, 1, 8, 4, '#8a6a3a', 1);
  },
  // the Cog Finder: ten little cogs meshed round the Chronoheart's rim (Chapter One's reward, kept in Chapter Two)
  finder: (c) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      disc(c, 8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, 1.5, i % 2 ? '#c9a44a' : '#e0b85a');
    }
    disc(c, 8, 8, 4, '#a8843a');
    disc(c, 8, 8, 2.6, '#36f0ff');
    px(c, 7, 7, '#ffffff');
  },
  // ---- Chapter Three: Highcrest ----
  hourLantern: (c) => {
    // Ingrid's gran's lantern: a brass cage round a glass that holds an hour's light
    rect(c, 6, 0, 4, 1, '#a8843a');
    rect(c, 7, 1, 2, 2, '#a8843a');
    rect(c, 4, 3, 8, 2, '#c9a44a');
    rect(c, 4, 5, 8, 7, '#a8843a');
    rect(c, 5, 5, 6, 7, '#9ff4ff');
    rect(c, 6, 6, 4, 5, '#e8fcff');
    rect(c, 7, 5, 2, 7, '#c9a44a');
    rect(c, 4, 12, 8, 2, '#c9a44a');
    rect(c, 5, 14, 6, 1, '#7a5a2a');
  },
  ember: (c) => {
    // a coal from the First Age's fire, that has never gone out
    disc(c, 8, 9, 5, '#5a2a1a');
    disc(c, 8, 9, 3.6, '#ff6a2a');
    disc(c, 7, 8, 2, '#ffc870');
    px(c, 6, 7, '#fff2c0');
    px(c, 11, 5, '#ff9a3a');
    px(c, 5, 4, '#ffc870');
  },
  page: (c) => {
    // a page from Tobin's star-books
    rect(c, 3, 2, 10, 12, '#e8dcb0');
    rect(c, 3, 2, 10, 1, '#c9b88a');
    for (const [x, y] of [[5, 5], [9, 4], [11, 8], [7, 9], [5, 12], [10, 11]]) px(c, x, y, '#2a3a6a');
    line(c, 5, 5, 9, 4, '#7a8ab8', 1);
    line(c, 9, 4, 11, 8, '#7a8ab8', 1);
    line(c, 7, 9, 10, 11, '#7a8ab8', 1);
  },
  summitFlag: (c) => {
    // Zach's flag: an acorn on a blue field
    rect(c, 3, 1, 1, 14, '#6a4428');
    rect(c, 4, 2, 10, 7, '#4a6ad8');
    rect(c, 4, 8, 10, 1, '#3a52b0');
    disc(c, 9, 5.5, 2, '#c87a2a');
    rect(c, 7, 3, 4, 1, '#6a4428');
  },
  masterDrawings: (c) => {
    // Rolled blueprint parchment tied with a brass ring, showing the dome & sundial
    rect(c, 2, 3, 12, 10, '#2a4a7a');
    rect(c, 2, 3, 12, 1, '#3a6aa8');
    rect(c, 2, 12, 12, 1, '#1c3258');
    rect(c, 1, 2, 2, 12, '#e8dcb0');
    rect(c, 13, 2, 2, 12, '#e8dcb0');
    line(c, 5, 10, 8, 5, '#9fe8ff', 1);
    line(c, 8, 5, 11, 10, '#9fe8ff', 1);
    line(c, 4, 10, 12, 10, '#9fe8ff', 1);
    px(c, 8, 4, '#ffd070');
  },
  masterKey: (c) => {
    // The Master's Key: a star-iron and gold astronomical clock-key with four rings
    disc(c, 6, 6, 5, '#c9a44a');
    disc(c, 6, 6, 3, '#1c2440');
    disc(c, 6, 6, 1.5, '#7ff6ff');
    px(c, 6, 6, '#ffffff');
    line(c, 9, 9, 14, 14, '#ffe08a', 2);
    rect(c, 11, 13, 2, 2, '#c9a44a');
    rect(c, 13, 11, 2, 2, '#c9a44a');
    px(c, 4, 3, '#fff2b0');
  },
  // ---- Chapter Two: Saltwick ----
  watch: (c) => {
    // Donald Eugene's pocketwatch, its hands at ten to two
    rect(c, 7, 0, 2, 2, '#c9a44a');
    disc(c, 8, 9, 6, '#c9a44a');
    disc(c, 8, 9, 4, '#f4ecd8');
    line(c, 8, 9, 6, 7, '#2a2014', 1);
    line(c, 8, 9, 10, 6, '#2a2014', 1);
    px(c, 8, 9, '#a8362a');
    px(c, 4, 5, '#fff2b0');
  },
  myWatch: (c) => {
    // Vivienne's own: twelve lost cogs in a case the color of the sea
    rect(c, 7, 0, 2, 2, '#8fd8cc');
    disc(c, 8, 9, 6, '#5fbfb0');
    disc(c, 8, 9, 4, '#f4ecd8');
    line(c, 8, 9, 6, 7, '#2a2014', 1);
    line(c, 8, 9, 10, 6, '#2a2014', 1);
    px(c, 8, 9, '#c9a44a');
    px(c, 4, 5, '#e8fff8');
    px(c, 12, 12, '#c9a44a');
  },
  nets: (c) => {
    rect(c, 2, 4, 12, 9, '#8a7a5a');
    for (let i = 0; i < 4; i++) {
      line(c, 2 + i * 4, 4, 2 + i * 4, 12, '#5a4a32', 1);
      line(c, 2, 4 + i * 3, 13, 4 + i * 3, '#5a4a32', 1);
    }
    disc(c, 3, 3, 1, '#e0786a');
    disc(c, 13, 3, 1, '#e0786a');
  },
  clapper: (c) => {
    rect(c, 7, 1, 2, 9, '#7a7f8a');
    rect(c, 6, 1, 4, 2, '#5a606c');
    disc(c, 8, 12, 3, '#8a929e');
    px(c, 7, 11, '#e8ecf4');
    rect(c, 6, 5, 4, 1, '#a8562a');
  },
  pearlChip: (c) => {
    line(c, 5, 11, 9, 5, '#e8e4f0', 3);
    px(c, 9, 4, '#ffffff');
    px(c, 6, 11, '#b8b0d0');
    px(c, 10, 7, '#ffd8f0');
  },
  pearl: (c) => {
    disc(c, 8, 8, 6, '#e8e4f4');
    disc(c, 9, 9, 4, '#cfc8e6');
    disc(c, 6, 6, 2, '#ffffff');
    px(c, 11, 11, '#ffd8f0');
    px(c, 10, 5, '#d8f4ff');
  },
  loupe: (c) => {
    disc(c, 7, 7, 5, '#c9a44a');
    disc(c, 7, 7, 3, '#9fe8ff');
    px(c, 6, 6, '#ffffff');
    line(c, 11, 11, 14, 14, '#6a4a28', 2);
  },
  lumen: (c) => {
    rect(c, 5, 2, 6, 2, '#8a94a4');
    rect(c, 4, 4, 8, 8, '#fff2a8');
    rect(c, 6, 6, 4, 4, '#ffffff');
    rect(c, 5, 12, 6, 2, '#8a94a4');
    px(c, 3, 8, '#ffd070');
    px(c, 12, 8, '#ffd070');
  },
  whistle: (c) => {
    disc(c, 6, 9, 4, '#f0d8c8');
    disc(c, 6, 9, 2, '#e0a890');
    rect(c, 9, 7, 5, 3, '#f0d8c8');
    px(c, 13, 8, '#8a5a4a');
    line(c, 4, 4, 2, 1, '#e0786a', 1);
  },
  crank: (c) => {
    rect(c, 2, 11, 6, 3, '#8a6a3a');
    line(c, 7, 12, 11, 5, '#8a929e', 2);
    rect(c, 10, 3, 4, 3, '#c9a44a');
    px(c, 11, 4, '#fff2b0');
  },
  noteDawn: (c) => {
    rect(c, 7, 1, 2, 2, '#6a4a28');
    rect(c, 5, 3, 6, 2, '#ffb88a');
    rect(c, 4, 5, 8, 6, '#ffb88a');
    rect(c, 3, 11, 10, 2, '#e88a6a');
    rect(c, 5, 4, 1, 6, '#ffffff');
    disc(c, 8, 14, 1, '#3a2a14');
  },
  noteNoon: (c) => {
    rect(c, 7, 1, 2, 2, '#6a4a28');
    rect(c, 5, 3, 6, 2, '#ffd870');
    rect(c, 4, 5, 8, 6, '#ffd870');
    rect(c, 3, 11, 10, 2, '#c9a44a');
    rect(c, 5, 4, 1, 6, '#ffffff');
    disc(c, 8, 14, 1, '#3a2a14');
  },
  noteDusk: (c) => {
    rect(c, 7, 1, 2, 2, '#6a4a28');
    rect(c, 5, 3, 6, 2, '#b8a0ff');
    rect(c, 4, 5, 8, 6, '#b8a0ff');
    rect(c, 3, 11, 10, 2, '#7a68c8');
    rect(c, 5, 4, 1, 6, '#ffffff');
    disc(c, 8, 14, 1, '#3a2a14');
  },
};

const iconCache = {};
export function iconURL(name, size = 16) {
  if (iconCache[name]) return iconCache[name];
  const { c, ctx } = makeCanvas(size, size);
  ICONS[name](ctx);
  outlineRegion(ctx, 0, 0, size, size);
  iconCache[name] = c.toDataURL();
  return iconCache[name];
}

/** Canvas texture for a world-space item (floating pickup). */
export function iconTexture(name) {
  const { c, ctx } = makeCanvas(16, 16);
  ICONS[name](ctx);
  outlineRegion(ctx, 0, 0, 16, 16);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Portrait: crop the head/torso of the idle frame and scale it up. */
const portraitCache = {};
export function portraitURL(name) {
  if (portraitCache[name]) return portraitCache[name];
  const sheets = getSheets();
  const s = sheets[name];
  if (!s) return '';
  const { c, ctx } = makeCanvas(96, 96);
  const big = s.fw > 32;
  // humanoids get a head-and-shoulders bust; robots and creatures keep a wider frame
  const [bx, by, bw] = CHAR[name] ? [7, 2, 18] : [4, 0, big ? 40 : 24];
  ctx.drawImage(s.canvas, bx * SCALE, by * SCALE, bw * SCALE, bw * SCALE, 0, 0, 96, 96);
  portraitCache[name] = c.toDataURL();
  return portraitCache[name];
}
