// Small shared helpers.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

/** Deterministic PRNG (mulberry32) so procedural art is identical every load. */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (a, b) => a + rng() * (b - a);
  rng.int = (a, b) => Math.floor(a + rng() * (b - a + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

/** Hash of integer coordinates -> [0,1). Used for stable per-voxel color noise. */
export function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Hex color int -> [r,g,b] in 0..1 */
export function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

/** Material-family tag stored above the 24 RGB bits (see render/materials.js). */
export const tagOf = (hex) => hex - (hex & 0xffffff);

/** Multiply brightness of a hex color, return hex (keeps the material tag). */
export function shade(hex, f) {
  const r = clamp(Math.round(((hex >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((hex >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((hex & 255) * f), 0, 255);
  return ((r << 16) | (g << 8) | b) + tagOf(hex);
}

export function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (
    ((Math.round(lerp(ar, br, t)) << 16) |
      (Math.round(lerp(ag, bg, t)) << 8) |
      Math.round(lerp(ab, bb, t))) + tagOf(a)
  );
}

export const ERA = { PAST: 0, PRESENT: 1, FUTURE: 2 };
export const ERA_NAMES = ['Ancient Age', 'Medieval Age', 'Age of Chrome'];
export const ERA_SHORT = ['Past', 'Present', 'Future'];
