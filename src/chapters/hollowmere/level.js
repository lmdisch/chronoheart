// Hollowmere: one valley built three times (Ancient / Medieval / Chrome future).
import { T, ZMIN, ZMAX } from '../../world/world.js';
import { makeRng, hash3, shade } from '../../core/util.js';
import { tagPalettes } from '../../render/materials.js';
import theme from './theme.js';

const W = theme.width; // level length (x)

const P = 0, M = 1, F = 2;

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
// Every palette color carries a surface tag (see render/materials.js) that picks its texture.
export const C = tagPalettes({
  sand: [0xd9b77a, 0xd2ad6e, 0xe0c088, 0xcfa868],
  sandstone: [0xc9935a, 0xbf8850, 0xd29e64, 0xb88048, 0xc48c56],
  sandDark: [0x9a6a3a, 0x8f6234, 0xa57444],
  grassA: [0x86a843, 0x92b34a, 0x7a9d3a, 0x9aae52],
  jungle: [0x3f7d3a, 0x4a8a3e, 0x5a9a42, 0x356d32, 0x2f6a34],
  palm: [0x5a9a3a, 0x6aaa42, 0x4a8a32],
  wood: [0x7a5232, 0x6b4428, 0x86603a],
  log: [0x8a6038, 0x7a5230, 0x6a4628],
  cobble: [0x8a8378, 0x9a9286, 0xa39a8c, 0x7c766c, 0x6e6a62, 0x948c80],
  curb: [0x6a665e, 0x5e5a52],
  grassM: [0x6f9e3c, 0x7aa843, 0x649036, 0x86b04a, 0x5e8a34],
  leaves: [0x4f8a32, 0x5f9a3a, 0x79a83f, 0x447a2c, 0x3e7028],
  autumn: [0xd9822b, 0xc8502a, 0xe0a03a, 0xb8662a, 0xe8b040],
  plaster: [0xe8dcc0, 0xe0d2b4, 0xf0e4c8, 0xdccfb0],
  timber: [0x6b4428, 0x5a3820, 0x704a2c],
  roof: [0xa8502f, 0x9a4628, 0xb85a34, 0x8e4024],
  roofB: [0x4a5a6a, 0x55667a, 0x3e4e5e],
  thatch: [0xc9a24a, 0xb8923e, 0xd8b058],
  stone: [0x8f8a80, 0x7f7a70, 0x9a958a, 0x6f6a62, 0x88837a],
  stoneMoss: [0x7f8a70, 0x6f7a60, 0x8f9a80, 0x7a7a6a],
  dirt: [0x6a4a32, 0x5e4230, 0x74523a],
  metal: [0x5b6472, 0x66707e, 0x525a66, 0x606a78],
  metalL: [0x7a8494, 0x8a94a4, 0x727c8c],
  panel: [0x22262f, 0x2a2f3a, 0x1c2028, 0x262b35],
  floorF: [0x3a404c, 0x343a46, 0x40464f],
  overgrowth: [0x3f8f5a, 0x2f7a4a, 0x4aa06a],
  rust: [0x8a4a2a, 0x7a3e22, 0x9a5a32],
  crate: [0xa8743e, 0x98683a, 0xb88048],
  skyline: [0x181a30, 0x1c1e36, 0x14162a],
  mudBrick: [0xa57444, 0x9a6a3a],
});
export const NEON = { cyan: 0x36f0ff, magenta: 0xff3fd2, amber: 0xffb03a, green: 0x7cff6a, warm: 0xffc870, fire: 0xff9a3a };

const jitter = (pal) => (x, y, z) => {
  const base = pal[Math.floor(hash3(x, y, z) * pal.length)];
  return shade(base, 0.94 + hash3(z, x, y) * 0.12);
};

// ---------------------------------------------------------------------------
// Layout constants (shared with game logic)
// ---------------------------------------------------------------------------
export const L = {
  start: { x: 5.5, y: 0, z: 3.5 },
  riverX0: 40, riverX1: 47,
  cliffX0: 66, cliffX1: 67,
  pitX0: 63, pitX1: 70,
  wallX0: 97, wallX1: 98,
  terraceX0: 146, terraceX1: 155,
  blockStart: { x: 143, z: 4 }, // two pushes from the foundation
  pillarTarget: { x: 145, z: 4 }, // bench (1 high) -> pillar (2) -> terrace (3)
  crateStart: { x: 140, z: 5 },
  benchCell: { x: 144, z: 4 },
  gateX: 165,
  rubbleX0: 168,
  vaultX0: 174, vaultX1: 181,
  // Millrace Hollow: a dry basin between a dam (Present/Future) and a 3-high cliff
  millX0: 182,
  rimX: 190, pondX0: 191, pondX1: 199, millCliffX0: 200, millCliffX1: 204,
  boulderStart: { x: 192, z: 3 },
  boulderTarget: { x: 195, z: 0 }, // the mouth of the gully the spring drains into
  // Tamsin's Crossing: a gorge; Past cliff, Present wall and Future rubble on the far bank
  crossingX0: 207,
  gorgeX0: 213, gorgeX1: 222,
  pastCliffX0: 223, pastCliffX1: 229,
  farWallX0: 225, farWallX1: 226,
  // The Echo Gallery (Present): buttons raise stone steps up a 4-high wall, while held
  echoX0: 230,
  gatesX0: 234, gatesX1: 238, // the gate section (solid wall in the Past and Future)
  galleryX0: 248, galleryX1: 252,
  // The Warden's Courtyard: the Clocktower key, in the Future, on a patrolled path
  yardX0: 254,
  keySpot: { x: 273.5, z: 2.5 },
  towerX0: 284,
  towerX1: 305, // the Tower's east wall
  gearX0: 306, // the Gearworks, inside the clock (opens with the third key)
  cameraBounds: [10, W - 8],
};
/** Tower details were laid out when the Clocktower started at x = 182; this shifts them. */
const TO = L.towerX0 - 182;

/**
 * The Echo Gallery: three stone steps up a 4-high wall. Each step is raised by a ring of buttons:
 * two on the ground (the lesson: a button you press yourself goes dark the moment you step off,
 * while one an echo presses glows on for a few seconds), then six on top of step 1 and six on top
 * of step 2. A button only lights if the one before it in the ring is lit, so a ring is walked from
 * its ringed button along the arrows, always clockwise. The step stands while its whole ring is
 * lit, so each ring needs an echo walking it, and the three echoes together hold up the climb.
 * (Clockwise as seen on screen: the back of the platform, low z, is "up".)
 */
export const ECHO_STEPS = [
  { x0: 242, x1: 243, z0: 1, z1: 5, h: 1 },
  { x0: 244, x1: 245, z0: 1, z1: 5, h: 2 },
  { x0: 246, x1: 247, z0: 1, z1: 5, h: 3 },
];
const ring = (step, y, cells) => cells.map(([x, z], order) => ({ x, z, y, step, order }));
export const ECHO_BUTTONS = [
  // on the ground: just two
  ...ring(0, 0, [[239, 3], [241, 3]]),
  // on top of step 1, clockwise
  ...ring(1, 1, [[242, 1], [243, 1], [243, 3], [243, 5], [242, 5], [242, 3]]),
  // on top of step 2, clockwise
  ...ring(2, 2, [[244, 1], [245, 1], [245, 3], [245, 5], [244, 5], [244, 3]]),
];

/**
 * Before the steps, two gate stages (Present). Gate buttons only count while something is on
 * them. The gold gate stands open while the gold button is held: leave an echo on it. The green
 * gates are an airlock: the first is open while the green button is held, the second only while
 * it isn't, so you need an echo whose loop stands on the button and then steps off.
 */
export const GATE_BUTTONS = [
  { id: 'gold', x: 232, z: 5, y: 0, color: 0xffc040 },
  { id: 'green', x: 232, z: 1, y: 0, color: 0x5cff8a },
];
export const ECHO_GATES = [
  { x: 234, button: 'gold' },
  { x: 236, button: 'green' },
  { x: 238, button: 'green', inverted: true },
];

/** Things the Stasis Seal can hold in their moment. */
export const SEALABLES = [
  {
    id: 'bridge', era: P, x0: L.gorgeX0 - 1, x1: L.gorgeX1 + 1, needs: 'bridgeBuilt', flag: 'bridgeSealed', name: "Tamsin's bridge",
    glint: { x0: L.gorgeX0, x1: L.gorgeX1 + 1, y: 0.1, z0: 2, z1: 5 }, // where the "this can be sealed" shimmer plays
    focus: [(L.gorgeX0 + L.gorgeX1 + 1) / 2, 0.5, 3.5], caption: 'Sealed in its moment, the bridge waits out the centuries...',
    after: 'The bridge stands in every age now.',
  },
  {
    id: 'belfry', era: M, x0: L.towerX0 + 8, x1: L.towerX0 + 13, yMin: 11.5, needs: 'towerUnlocked', flag: 'belfrySealed', name: 'the belfry floor',
    glint: { x0: L.towerX0 + 8, x1: L.towerX0 + 14, y: 12.1, z0: 0, z1: 3 },
    focus: [L.towerX0 + 11, 12.5, 1.5], caption: 'Sealed in its moment, the belfry floor outlasts the centuries...',
    after: 'The belfry floor stands in the Future now.',
  },
];

export const AREAS = [
  { x: 0, name: 'Hollowmere Square' },
  { x: 38, name: 'The Old Ford' },
  { x: 52, name: 'Sandstone Cliffs' },
  { x: 79, name: 'Rampart Row' },
  { x: 105, name: 'Smithy Lane' },
  { x: 130, name: 'The Sun Terrace' },
  { x: 157, name: 'The Gatehouse' },
  { x: L.millX0, name: 'Millrace Hollow' },
  { x: L.crossingX0, name: "Tamsin's Crossing" },
  { x: L.echoX0, name: 'The Echo Gallery' },
  { x: L.yardX0, name: "The Warden's Courtyard" },
  { x: L.towerX0, name: 'The Clocktower' },
  { x: L.gearX0, name: 'The Gearworks', subtitle: 'Inside the clock' },
];

// Shrine 6 used to be the Clocktower's; it now opens the new stretch, so old saves resume there.
export const CHECKPOINTS = [
  { id: 0, x: 3.5, z: 1.2 },
  { id: 1, x: 53.5, z: 1.2 },
  { id: 2, x: 80.5, z: 1.2 },
  { id: 3, x: 106.5, z: 1.2 },
  { id: 4, x: 131.5, z: 1.2 },
  { id: 5, x: 158.5, z: 1.2 },
  { id: 6, x: 184.5, z: 1.2 },
  { id: 7, x: 207.5, z: 1.2 },
  { id: 8, x: 231.5, z: 1.2 },
  { id: 9, x: L.towerX0 + 2.5, z: 1.2 },
  { id: 10, x: L.yardX0 + 1.5, z: 1.2 },
  { id: 11, x: L.gearX0 + 1.5, z: 1.2 },
];

/** Cells the spring wears away through the Present cliff (shared with the time-lapse). */
export function isEroded(x, y, z) {
  if (x < L.cliffX0 || x > L.cliffX1 || z < 2 || z > 6) return false;
  if (y <= 2) return true; // the walkable gully
  if (y === 3) return z >= 4 || hash3(x, 11, z) < 0.5; // ragged, water-worn roof
  if (y === 4) return z === 6 || (z === 5 && hash3(x, 13, z) < 0.6);
  return false;
}
export function erosionCells() {
  const out = [];
  for (let x = L.cliffX0; x <= L.cliffX1; x++) for (let y = 0; y <= 4; y++) for (let z = 2; z <= 6; z++) if (isEroded(x, y, z)) out.push([x, y, z]);
  return out;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
function groundColor(era, x, y, z) {
  const h = hash3(x, y, z);
  // inside the clock: iron deck plates, the same in every age
  if (x >= L.gearX0) return shade(((x + z) % 2 ? C.metal : C.metalL)[(h * 3) | 0], 0.75);
  if (y < -1) return era === F ? shade(C.metal[(h * 4) | 0], 0.7) : C.dirt[(h * 3) | 0];
  if (era === P) {
    if (z >= 1 && z <= 5) return h < 0.12 ? C.grassA[((h * 40) | 0) % 4] : C.sand[(h * 4) | 0];
    if (z === 0 || z === 6) return h < 0.5 ? C.sand[(h * 4) | 0] : C.grassA[(h * 4) | 0];
    if (z < 0) return h < 0.35 ? C.sand[(h * 4) | 0] : C.grassA[(h * 4) | 0];
    return C.grassA[(h * 4) | 0];
  }
  if (era === M) {
    if (z >= 1 && z <= 5) return shade(C.cobble[(h * 6) | 0], 0.95 + ((x + z) % 2) * 0.06);
    if (z === 0 || z === 6) return C.curb[(h * 2) | 0];
    return h < 0.08 ? C.dirt[0] : C.grassM[(h * 5) | 0];
  }
  // future
  if (z >= 1 && z <= 5) return x % 4 === 0 || z === 3 ? shade(C.floorF[(h * 3) | 0], 0.8) : C.floorF[(h * 3) | 0];
  if (z === 0 || z === 6) return C.panel[(h * 4) | 0];
  return h < 0.25 ? C.overgrowth[((h * 12) | 0) % 3] : C.metal[(h * 4) | 0];
}

function buildGround(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    for (let x = 0; x < W; x++) {
      if (x >= L.riverX0 && x <= L.riverX1) continue;
      if (x >= L.gorgeX0 && x <= L.gorgeX1) continue;
      if (era === F && x >= L.pitX0 && x <= L.pitX1) continue; // handled by feature
      for (let z = ZMIN; z < ZMAX; z++) {
        for (let y = -4; y <= -1; y++) b.setCell(x, y, z, T.SOLID, groundColor(era, x, y, z));
      }
    }
    // river bed
    b.solid(L.riverX0, -5, ZMIN, L.riverX1, -5, ZMAX - 1, era === F ? C.panel : C.dirt);
    b.solid(L.gorgeX0, -5, ZMIN, L.gorgeX1, -5, ZMAX - 1, era === F ? C.panel : C.dirt);
    if (era === F) {
      // neon edge strips along the walkway
      for (let x = 0; x < W; x += 1) {
        if (x >= L.riverX0 - 1 && x <= L.riverX1 + 1) continue;
        if (x >= L.gorgeX0 - 1 && x <= L.gorgeX1 + 1) continue;
        if (x >= L.pitX0 && x <= L.pitX1) continue;
        if (x % 2 === 0) b.glow(x + 0.1, 0.0, 6.88, 0.8, 0.04, 0.08, NEON.cyan);
        if (x % 3 === 0) b.glow(x + 0.1, 0.0, 0.02, 0.6, 0.04, 0.06, NEON.magenta);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
function blobTree(b, cx, cz, rng, era, scale = 1) {
  const trunkH = Math.round((3 + rng.int(0, 2)) * scale);
  const r = (2 + rng() * 1.2) * scale;
  const trunk = era === F ? C.metal : C.log;
  b.solid(cx, 0, cz, cx, trunkH, cz, trunk);
  let pal;
  if (era === P) pal = C.jungle;
  else if (era === M) pal = rng.chance(0.45) ? C.autumn : C.leaves;
  else pal = C.overgrowth;
  const cy = trunkH + r * 0.6;
  // a couple of branches reaching into the crown
  b.deco(cx + 0.4, trunkH - 1, cz + 0.3, 0.9 * scale, 0.22, 0.22, trunk[1]);
  b.deco(cx - 0.3 * scale, trunkH - 0.4, cz + 0.4, 0.8 * scale, 0.2, 0.2, trunk[2]);
  // leaf-card crown, kept out of the play strip
  b.canopy(cx + 0.5, cy + 0.5, cz + 0.5, r, pal.map((c) => c & 0xffffff), { maxZ: -0.5, seed: cx * 31 + cz });
}

function palmTree(b, cx, cz, rng) {
  const h = rng.int(5, 7);
  let ox = 0;
  for (let y = 0; y < h; y++) {
    if (y > 2 && rng.chance(0.3)) ox += rng.chance(0.5) ? 0.15 : -0.15;
    b.deco(cx + 0.3 + ox, y, cz + 0.3, 0.45, 1, 0.45, y % 2 ? C.log[0] : C.log[2]);
  }
  const tx = cx + 0.5 + ox, ty = h;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    for (let s = 0; s < 4; s++) {
      const d = 0.5 + s * 0.6;
      b.deco(tx + Math.cos(a) * d - 0.3, ty - s * s * 0.12, cz + 0.5 + Math.sin(a) * d - 0.3, 0.6, 0.18, 0.6, C.palm[(i + s) % 3]);
    }
  }
  b.deco(tx - 0.3, ty - 0.4, cz + 0.2, 0.6, 0.5, 0.6, 0x6a4a28);
}

function lampPost(b, x, z, era) {
  if (era === M) {
    b.deco(x + 0.42, 0, z + 0.42, 0.16, 2.4, 0.16, 0x2a2a30);
    b.deco(x + 0.3, 2.35, z + 0.3, 0.4, 0.08, 0.4, 0x2a2a30);
    b.glow(x + 0.34, 2.43, z + 0.34, 0.32, 0.36, 0.32, NEON.warm);
    b.deco(x + 0.28, 2.79, z + 0.28, 0.44, 0.1, 0.44, 0x2a2a30);
    b.light(x + 0.5, 2.6, z + 0.5, 0xffb060, 9, 9, 0.08);
  } else if (era === P) {
    b.deco(x + 0.4, 0, z + 0.4, 0.2, 1.8, 0.2, C.log[1]);
    b.deco(x + 0.28, 1.8, z + 0.28, 0.44, 0.2, 0.44, 0x4a3420);
    b.glow(x + 0.32, 2.0, z + 0.32, 0.36, 0.4, 0.36, NEON.fire);
    b.glow(x + 0.4, 2.35, z + 0.4, 0.2, 0.25, 0.2, 0xffe070);
    b.light(x + 0.5, 2.4, z + 0.5, 0xff8a3a, 10, 9, 0.35);
  } else {
    const col = (x | 0) % 16 < 8 ? NEON.cyan : NEON.magenta;
    b.deco(x + 0.42, 0, z + 0.42, 0.16, 3.0, 0.16, 0x3a404c);
    b.glow(x + 0.45, 0.4, z + 0.36, 0.1, 2.5, 0.06, col);
    b.deco(x + 0.1, 3.0, z + 0.3, 0.8, 0.12, 0.4, 0x3a404c);
    b.glow(x + 0.15, 2.92, z + 0.35, 0.7, 0.08, 0.3, col);
    b.light(x + 0.5, 2.8, z + 0.5, col, 9, 10, 0);
  }
}

function wallTorch(b, x, y, z) {
  b.deco(x + 0.42, y, z, 0.16, 0.6, 0.2, C.log[1]);
  b.glow(x + 0.36, y + 0.6, z - 0.02, 0.28, 0.32, 0.28, NEON.fire);
  b.glow(x + 0.43, y + 0.85, z + 0.05, 0.14, 0.2, 0.14, 0xffe070);
  b.light(x + 0.5, y + 0.9, z + 0.6, 0xff8a3a, 7, 8, 0.35);
}

function crate(b, x, y, z) {
  b.setCell(x, y, z, T.SOLID, jitter(C.crate)(x, y, z));
  b.deco(x - 0.02, y + 0.42, z + 0.98, 1.04, 0.16, 0.06, 0x6a4428);
  b.deco(x + 0.42, y - 0.0, z + 0.98, 0.16, 1.0, 0.06, 0x6a4428);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
function medHouse(b, x0, w, rng) {
  const h = rng.int(4, 7), x1 = x0 + w - 1;
  const stoneBase = rng.chance(0.55);
  const roofPal = rng.chance(0.7) ? C.roof : rng.chance(0.5) ? C.thatch : C.roofB;
  const mid = 2 + (h > 5 ? 1 : 0);
  b.solid(x0, 0, -4, x1, h - 1, -1, (x, y, z) => (stoneBase && y < 2 ? jitter(C.stone)(x, y, z) : jitter(C.plaster)(x, y, z)));
  // half-timbering: beams proud of the plaster
  const beam = C.timber[0];
  const yb = stoneBase ? 2 : 0;
  b.deco(x0, yb, 0, 0.28, h - yb, 0.1, beam);
  b.deco(x1 + 0.72, yb, 0, 0.28, h - yb, 0.1, beam);
  b.deco(x0, mid, 0, w, 0.26, 0.12, beam);
  b.deco(x0, h - 0.28, 0, w, 0.28, 0.12, beam);
  if (stoneBase) b.deco(x0, 2, 0, w, 0.2, 0.12, beam);
  for (let x = x0 + 3; x < x1; x += 3) b.deco(x - 0.12, mid, 0, 0.24, h - mid, 0.1, beam);
  for (const sx of [x0 - 0.04, x1 + 0.76]) b.deco(sx, yb, -4, 0.28, h - yb, 4.04, beam);
  // windows
  for (let wx = x0 + 1; wx < x1; wx += 2) {
    for (let wy = stoneBase ? 2 : 1; wy < h - 1; wy += 2) {
      if (wy === mid) continue;
      if (rng.chance(0.65)) b.glow(wx + 0.18, wy + 0.15, 0.0, 0.64, 0.7, 0.05, NEON.warm);
      else b.deco(wx + 0.18, wy + 0.15, 0.0, 0.64, 0.7, 0.05, 0x34404c);
      b.deco(wx + 0.12, wy + 0.08, 0.0, 0.76, 0.1, 0.16, C.timber[0]);
      if (rng.chance(0.35)) {
        b.deco(wx + 0.1, wy - 0.1, 0.02, 0.8, 0.18, 0.22, 0x5a3a22);
        for (let i = 0; i < 3; i++) b.deco(wx + 0.15 + i * 0.25, wy + 0.06, 0.08, 0.16, 0.16, 0.16, rng.pick([0xe84a5a, 0xf0d040, 0xe88ad0]));
      }
    }
  }
  // door
  const dx = x0 + 1 + rng.int(0, Math.max(0, w - 3));
  b.deco(dx + 0.1, 0, 0.0, 0.8, 1.7, 0.06, 0x4a2c18);
  b.deco(dx + 0.65, 0.8, 0.05, 0.08, 0.08, 0.04, 0xc9a44a);
  if (rng.chance(0.4)) {
    b.glow(dx + 1.05, 1.6, 0.05, 0.22, 0.28, 0.22, NEON.warm);
    b.light(dx + 1.1, 1.8, 0.6, 0xffb060, 4, 6, 0.06);
  }
  // pitched gable roof, ridge along x
  b.roof(x0 - 0.45, x1 + 1.45, h, -5.5, 0.4, h + 2.8, roofPal[0], C.plaster[0]);
  if (rng.chance(0.45)) b.solid(x1 - 1, h, -4, x1 - 1, h + 4, -4, jitter(C.stone));
  // banner
  if (rng.chance(0.3)) {
    const bx = x0 + Math.floor(w / 2);
    b.deco(bx + 0.15, h - 3.2, 0.02, 0.7, 2.4, 0.06, 0xb22a2a);
    b.deco(bx + 0.3, h - 2.2, 0.06, 0.4, 0.5, 0.04, 0xe0b040);
    b.deco(bx + 0.05, h - 0.85, 0.02, 0.9, 0.12, 0.1, 0x3a2614);
  }
  // ivy
  for (let i = 0; i < 6; i++) if (rng.chance(0.5)) b.deco(x0 + rng() * w, rng() * (h - 1), 0.0, 0.3, 0.3, 0.05, rng.pick(C.leaves));
  return w;
}

function medTower(b, x0, rng) {
  const w = 4, h = rng.int(10, 13), x1 = x0 + w - 1;
  b.solid(x0, 0, -5, x1, h - 1, -1, jitter(C.stone));
  for (let x = x0; x <= x1; x += 2) b.solid(x, h, -5, x, h, -1, jitter(C.stone));
  for (let y = 3; y < h - 1; y += 3) b.deco(x0 + 1.4, y, 0.0, 0.2, 0.9, 0.05, 0x1a1820);
  b.deco(x0 + 0.5, h - 6, 0.02, 1.0, 3.2, 0.06, 0xb22a2a);
  b.deco(x0 + 2.5, h - 6, 0.02, 1.0, 3.2, 0.06, 0xb22a2a);
  b.deco(x0 + 0.75, h - 5, 0.06, 0.5, 0.6, 0.04, 0xe0b040);
  b.deco(x0 + 2.75, h - 5, 0.06, 0.5, 0.6, 0.04, 0xe0b040);
  b.glow(x0 + 1.3, h - 3, 0.0, 0.4, 0.8, 0.05, NEON.warm);
  for (let i = 0; i < 10; i++) if (rng.chance(0.6)) b.deco(x0 + rng() * w, rng() * h * 0.7, 0.0, 0.35, 0.35, 0.05, rng.pick(C.leaves));
  wallTorch(b, x0 + 1.5, 1.2, 0.0);
  return w;
}

function ancHouse(b, x0, w, rng) {
  const h = rng.int(3, 5), x1 = x0 + w - 1;
  b.solid(x0, 0, -4, x1, h - 1, -1, (x, y, z) => (y === h - 1 ? jitter(C.sandDark)(x, y, z) : jitter(C.sandstone)(x, y, z)));
  for (let x = x0; x <= x1; x += 2) b.solid(x, h, -4, x, h, -4, jitter(C.sandstone));
  b.solid(x0, h, -1, x1, h, -1, jitter(C.sandstone));
  const dx = x0 + Math.floor(w / 2) - 1;
  b.deco(dx + 0.1, 0, 0.0, 1.0, 1.8, 0.06, 0x2a1810);
  b.deco(dx - 0.1, 1.8, 0.0, 1.4, 0.2, 0.1, C.sandDark[0]);
  if (rng.chance(0.6)) for (let x = x0; x <= x1; x++) if ((x + h) % 2 === 0) b.glow(x + 0.3, h - 0.7, 0.0, 0.4, 0.3, 0.04, 0x3ad0c0);
  if (rng.chance(0.5)) wallTorch(b, x0 + 0.3, 1.0, 0.0);
  if (rng.chance(0.4)) {
    // hanging cloth
    b.deco(x1 - 1.2, h - 2.4, 0.02, 0.8, 1.8, 0.05, rng.pick([0xc8642a, 0x3ab0a0, 0xc8402a]));
  }
  for (let i = 0; i < 4; i++) if (rng.chance(0.5)) b.deco(x0 + rng() * w, rng() * h, 0.0, 0.35, 0.4, 0.05, rng.pick(C.jungle));
  return w;
}

function ziggurat(b, x0, w, rng) {
  const tiers = Math.floor(w / 2);
  for (let t = 0; t < tiers; t++) b.solid(x0 + t, t * 2, -7 + t, x0 + w - 1 - t, t * 2 + 1, -2 - 0, jitter(t % 2 ? C.sandDark : C.sandstone));
  const top = tiers * 2;
  b.glow(x0 + w / 2 - 0.5, top, -4.5, 1, 0.6, 1, NEON.fire);
  b.light(x0 + w / 2, top + 1, -4, 0xff8a3a, 8, 12, 0.3);
  return w;
}

function futTower(b, x0, w, rng) {
  const h = rng.int(11, 20), x1 = x0 + w - 1;
  const pal = rng.chance(0.5) ? C.metal : C.metalL;
  b.solid(x0, 0, -5, x1, h - 1, -1, jitter(pal));
  const winCol = rng.pick([0xa0e8ff, 0xffe0a0, NEON.cyan, 0xd0d8ff]);
  for (let y = 3; y < h - 1; y += 2)
    for (let x = x0; x <= x1; x++) {
      if (rng.chance(0.55)) b.glow(x + 0.15, y + 0.2, 0.0, 0.7, 0.9, 0.04, winCol);
      else b.deco(x + 0.15, y + 0.2, 0.0, 0.7, 0.9, 0.04, 0x141820);
    }
  // street level shopfront
  b.deco(x0 + 0.1, 0, 0.0, w - 0.2, 2.4, 0.04, 0x1a1e28);
  b.glow(x0 + 0.1, 2.5, 0.0, w - 0.2, 0.12, 0.08, rng.pick([NEON.magenta, NEON.cyan, NEON.amber]));
  if (rng.chance(0.6)) {
    const sc = rng.pick([NEON.magenta, NEON.cyan, NEON.amber, NEON.green]);
    b.glow(x0 + 0.5, rng.int(4, h - 3), 0.1, Math.min(w - 1, 2.5), 1.0, 0.12, sc);
    b.light(x0 + 1.5, 5, 1.2, sc, 5, 8, 0);
  }
  b.glow(x0 - 0.02, 0, 0.0, 0.08, h, 0.06, rng.pick([NEON.cyan, NEON.magenta]));
  // antenna
  if (rng.chance(0.5)) {
    b.deco(x0 + 1.4, h, -3, 0.15, 3, 0.15, 0x3a404c);
    b.glow(x0 + 1.35, h + 3, -3.05, 0.25, 0.25, 0.25, 0xff3040);
  }
  // overgrowth
  for (let i = 0; i < 8; i++) if (rng.chance(0.55)) b.deco(x0 + rng() * w, rng() * 4, 0.0, 0.4, 0.6 + rng(), 0.06, rng.pick(C.overgrowth));
  return w;
}

/** Procedural street-side buildings between x0..x1 (back of street, z<0). */
function filler(b, era, x0, x1, seed) {
  const rng = makeRng(seed);
  let x = x0;
  while (x < x1 - 3) {
    const roll = rng();
    let w;
    if (era === M) {
      if (roll < 0.15 && x + 4 <= x1) w = medTower(b, x, rng);
      else w = medHouse(b, x, Math.min(rng.int(4, 7), x1 - x), rng);
    } else if (era === P) {
      if (roll < 0.18 && x + 8 <= x1) w = ziggurat(b, x, 8, rng);
      else w = ancHouse(b, x, Math.min(rng.int(4, 6), x1 - x), rng);
    } else {
      w = futTower(b, x, Math.min(rng.int(4, 7), x1 - x), rng);
    }
    x += w;
    const gap = rng.int(0, 2);
    if (gap > 0 && era === P && rng.chance(0.7)) palmTree(b, x, -2, rng);
    x += gap;
  }
}

/**
 * The west end of the valley. The grid (and the road) stops at x = 0, and with nothing beyond it
 * the left of the screen was empty sky at the very start of the game. Each age closes the valley
 * off there instead: a jungle bluff, the old town wall, a containment wall. Scenery only; x < 0
 * is already solid to walk into.
 */
function valleyEnd(world) {
  const z0 = ZMIN, d = ZMAX - ZMIN, far = 44;
  // PAST: a sandstone bluff under jungle, stepping up toward the west
  let b = world.staticBuilder(P);
  b.deco(-far, -4, z0, far, 14, d, C.sandDark[0]);
  b.deco(-far, 10, z0, far, 1, d, C.jungle[1]);
  b.deco(-far, 11, z0, far - 5, 5, d, C.sandDark[1]);
  b.deco(-far, 16, z0, far - 5, 1, d, C.jungle[0]);
  for (let i = 0; i < 9; i++) b.deco(-4.4 + hash3(i, 1, 4) * 3.2, 11, z0 + 1 + i * 3.2, 1.4 + hash3(i, 2, 4), 1 + hash3(i, 3, 4) * 1.6, 1.6, C.jungle[i % 5]);
  for (let i = 0; i < 6; i++) b.deco(-0.5, 2 + hash3(i, 5, 4) * 7, z0 + 2 + i * 4.6, 0.5, 0.5, 1.4 + hash3(i, 6, 4), C.sandDark[2]); // weathered ledges
  // PRESENT: Hollowmere's west wall, with a walk along the top
  b = world.staticBuilder(M);
  b.deco(-far, -4, z0, far, 13, d, C.stone[0]);
  b.deco(-far, 9, z0, far - 1.2, 0.3, d, C.stone[3]);
  for (let z = z0; z < ZMAX; z += 2) b.deco(-1.2, 9, z, 1.2, 1.1, 1, C.stone[1]); // battlements
  b.deco(-0.12, 5.2, z0, 0.14, 0.4, d, C.stone[3]); // a string course along its face
  b.deco(-far, 9.3, z0, far - 7, 5, d, C.stoneMoss[0]);
  // FUTURE: a containment wall, banded in light
  b = world.staticBuilder(F);
  b.deco(-far, -4, z0, far, 22, d, C.metal[0]);
  b.deco(-far, 18, z0, far - 3, 6, d, C.panel[0]);
  for (const y of [3.5, 8.5, 13.5]) b.glow(0, y, z0, 0.05, 0.12, d, y === 8.5 ? NEON.magenta : NEON.cyan);
}

function backdrop(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const rng = makeRng(500 + era);
    // trees / structures between buildings and backdrop
    for (let x = 2; x < W - 2; x += rng.int(3, 6)) {
      const z = -rng.int(7, 11);
      if (x >= L.gorgeX0 - 2 && x <= L.gorgeX1) continue; // nothing growing in the gorge's river
      if (era === F) {
        if (rng.chance(0.4)) blobTree(b, x, z, rng, era, 0.8);
        else {
          const h = rng.int(14, 26);
          b.solid(x, 0, z - 1, x + 2, h, z, jitter(C.panel));
          for (let y = 2; y < h; y += 2) if (rng.chance(0.4)) b.glow(x + rng.int(0, 2) + 0.2, y, z + 1.0, 0.6, 0.8, 0.04, rng.pick([0xa0e8ff, NEON.magenta, 0xffe0a0]));
        }
      } else blobTree(b, x, z, rng, era, 1 + rng() * 0.5);
    }
    // distant hills / skyline
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.08 + era) * 3 + Math.sin(x * 0.21 + era * 2) * 1.5;
      if (era === F) {
        const hh = 8 + Math.floor((hash3(Math.floor(x / 3), 7, 1) * 22));
        b.solid(x, 0, -16, x, hh, -15, jitter(C.skyline));
        if (hash3(x, 3, 3) < 0.3) b.glow(x + 0.3, hh * hash3(x, 9, 9), -14.0, 0.4, 0.4, 0.04, rng.pick([0xa0e8ff, NEON.magenta]));
      } else {
        const hh = Math.max(1, Math.round(5 + n));
        const pal = era === P ? (x % 40 < 14 ? C.sandstone : C.jungle) : x % 30 < 12 ? C.autumn : C.leaves;
        b.solid(x, 0, -16, x, hh, -14, jitter(pal));
      }
    }
    // foreground props (the valley's; the Gearworks has its own railing)
    for (let x = 1; x < L.gearX0 - 1; x++) {
      if (x >= L.riverX0 - 1 && x <= L.riverX1 + 1) continue;
      if (x >= L.gorgeX0 - 1 && x <= L.gorgeX1 + 1) continue;
      if (x >= L.pitX0 && x <= L.pitX1 && era === F) continue;
      const r = hash3(x, era, 77);
      if (era === M) {
        if (x % 11 === 4) lampPost(b, x, 7, era);
        else if (r < 0.3) {
          // fence
          b.deco(x, 0.55, 8.4, 1, 0.1, 0.08, C.wood[0]);
          b.deco(x, 0.25, 8.4, 1, 0.1, 0.08, C.wood[1]);
          b.deco(x + 0.1, 0, 8.37, 0.12, 0.8, 0.14, C.wood[2]);
        } else if (r > 0.85) b.deco(x + 0.1, 0, 9.5 + r, 0.8, 0.6, 0.8, rng.pick(C.leaves));
      } else if (era === P) {
        if (x % 9 === 2) lampPost(b, x, 7, era);
        else if (r < 0.25) b.deco(x + 0.2, 0, 8.6 + r * 3, 0.5, 0.35, 0.5, rng.pick(C.sandstone));
        else if (r > 0.75) for (let i = 0; i < 3; i++) b.deco(x + i * 0.3, 0, 8.6 + r, 0.12, 0.5 + i * 0.15, 0.12, C.grassA[i]);
      } else {
        if (x % 8 === 3) lampPost(b, x, 7, era);
        else if (r < 0.35) {
          b.deco(x, 0, 8.3, 1, 0.5, 0.15, 0x3a404c);
          b.glow(x, 0.5, 8.3, 1, 0.05, 0.15, r < 0.17 ? NEON.cyan : NEON.magenta);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Special areas
// ---------------------------------------------------------------------------
function hub(world) {
  // PRESENT: Donald Eugene's workshop
  let b = world.staticBuilder(M);
  b.solid(1, 0, -5, 12, 2, -1, jitter(C.stone));
  b.solid(1, 3, -5, 12, 7, -1, jitter(C.plaster));
  for (const bx of [1, 6.5, 12.72]) b.deco(bx, 3, 0, 0.28, 5, 0.1, C.timber[0]);
  for (const by of [3, 7.72]) b.deco(1, by, 0, 12, 0.28, 0.12, C.timber[0]);
  b.roof(0.4, 13.6, 8, -6.5, 0.45, 11.4, C.roofB[0], C.plaster[0]);
  // giant clock face
  b.deco(5.0, 3.6, 0.0, 4.0, 4.0, 0.06, 0x8a6a2a);
  b.deco(5.2, 3.8, 0.04, 3.6, 3.6, 0.04, 0xeadfc0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.deco(7 + Math.cos(a) * 1.5 - 0.08, 5.6 + Math.sin(a) * 1.5 - 0.08, 0.1, 0.16, 0.16, 0.04, 0x2a2014);
  }
  b.deco(6.94, 5.6, 0.12, 0.12, 1.2, 0.04, 0x2a2014);
  b.deco(6.94, 5.54, 0.12, 0.9, 0.12, 0.04, 0x2a2014);
  // shop window with gears
  b.glow(2.2, 0.8, 0.0, 2.6, 1.6, 0.05, NEON.warm);
  b.deco(2.6, 1.1, 0.06, 0.7, 0.7, 0.05, 0xc9a44a);
  b.deco(3.6, 1.3, 0.06, 0.5, 0.5, 0.05, 0xa8843a);
  b.deco(9.1, 0, 0.0, 1.1, 2.0, 0.06, 0x4a2c18);
  // Star-iron Astral Door on the east side of the workshop (opens with the Master's Key)
  b.deco(11.35, 0, 0.0, 1.05, 2.0, 0.06, 0x2c3444);
  b.deco(11.28, 2.0, 0.0, 1.2, 0.16, 0.1, C.stone[3]);
  for (let i = 0; i < 4; i++) {
    b.glow(11.58 + (i % 2) * 0.22, 1.18 + Math.floor(i / 2) * 0.22, 0.07, 0.18, 0.18, 0.02, i < 2 ? 0xffd070 : NEON.cyan);
  }
  b.deco(8.6, 2.3, 0.04, 2.6, 0.5, 0.08, 0x3a2614); // sign
  b.glow(8.75, 2.42, 0.12, 2.3, 0.26, 0.02, 0xe0b040);
  b.light(7, 5.6, 1.5, 0xffd8a0, 6, 9, 0);
  b.light(3.5, 1.4, 1.2, 0xffb060, 5, 7, 0.05);
  // workbench (amulet sits here) -- solid 1 high
  b.solid(8, 0, 0, 9, 0, 0, jitter(C.wood));
  b.deco(7.95, 0.95, -0.05, 2.1, 0.1, 1.1, 0x5a3a22);
  // crates for cog
  crate(b, 28, 0, 1); crate(b, 29, 0, 1); crate(b, 29, 1, 1); crate(b, 30, 0, 1); crate(b, 30, 1, 1); crate(b, 30, 2, 1);
  filler(b, M, 14, 37, 11);

  // PAST: sacred grove
  b = world.staticBuilder(P);
  ziggurat(b, 2, 10, makeRng(3));
  b.deco(13.6, 0, 3.4, 0.4, 0.2, 1.2, C.log[0]);
  b.deco(13.2, 0, 3.8, 1.2, 0.2, 0.4, C.log[1]);
  b.glow(13.5, 0.2, 3.6, 0.6, 0.5, 0.6, NEON.fire);
  b.glow(13.65, 0.6, 3.75, 0.3, 0.4, 0.3, 0xffe070);
  b.light(13.8, 1.2, 4, 0xff8a3a, 12, 10, 0.4);
  // totems
  for (const tx of [10, 17, 26]) {
    b.solid(tx, 0, -1, tx, 3, -1, (x, y, z) => [0xc8642a, 0x3ab0a0, 0xe8d070, 0xc8402a][y]);
    b.deco(tx + 0.2, 2.4, 0.0, 0.2, 0.2, 0.05, 0x1a1a1a);
    b.deco(tx + 0.6, 2.4, 0.0, 0.2, 0.2, 0.05, 0x1a1a1a);
  }
  // stone columns for cog
  b.solid(22, 0, 1, 22, 0, 1, jitter(C.sandstone));
  b.solid(23, 0, 1, 23, 1, 1, jitter(C.sandstone));
  b.solid(24, 0, 1, 24, 2, 1, jitter(C.sandstone));
  filler(b, P, 13, 37, 21);

  // FUTURE: memorial plaza
  b = world.staticBuilder(F);
  b.solid(1, 0, -5, 12, 14, -1, jitter(C.metalL));
  b.glow(4.5, 5, 0.0, 5, 5, 0.04, 0x0e1a2a);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    b.glow(7 + Math.cos(a) * 2.2 - 0.1, 7.5 + Math.sin(a) * 2.2 - 0.1, 0.06, 0.2, 0.2, 0.04, NEON.cyan);
  }
  b.glow(6.95, 7.5, 0.08, 0.1, 1.6, 0.03, NEON.amber);
  b.glow(6.95, 7.45, 0.08, 1.2, 0.1, 0.03, NEON.amber);
  b.glow(1.5, 12, 0.02, 10, 0.3, 0.06, NEON.magenta);
  b.light(7, 7, 1.5, NEON.cyan, 8, 10, 0);
  // holo statue pedestal
  b.solid(16, 0, 0, 17, 0, 0, jitter(C.metalL));
  b.glow(15.9, 1.0, -0.02, 2.2, 0.06, 1.04, NEON.cyan);
  b.light(17, 2, 1, NEON.cyan, 6, 8, 0);
  // hover platforms
  b.solid(25, 0, 2, 25, 0, 2, jitter(C.metalL));
  b.solid(27, 1, 2, 27, 1, 2, jitter(C.metalL));
  b.solid(29, 2, 2, 29, 2, 2, jitter(C.metalL));
  for (const [hx, hy] of [[25, 0], [27, 1], [29, 2]]) b.glow(hx + 0.1, hy - 0.05, 2.1, 0.8, 0.06, 0.8, NEON.cyan);
  filler(b, F, 13, 29, 31);
}

// Sun-lilies: golden flowers that grew in the square in the oldest days (Karen Louise's favor).
function lilyCluster(b, x, z, n, glow = false) {
  for (let i = 0; i < n; i++) {
    const ox = x + hash3(i, 3, z * 7) * 0.8, oz = z + hash3(i, 5, x * 3) * 0.8;
    const h = 0.35 + hash3(i, 7, 1) * 0.35;
    b.deco(ox, 0, oz, 0.06, h, 0.06, C.grassM[2]);
    b.deco(ox - 0.06, h * 0.45, oz, 0.18, 0.05, 0.08, C.grassM[0]); // leaf
    if (glow) b.glow(ox - 0.07, h, oz - 0.07, 0.2, 0.14, 0.2, 0xffd34a);
    else b.deco(ox - 0.08, h, oz - 0.08, 0.22, 0.14, 0.22, 0xf2c040);
    b.deco(ox - 0.03, h + 0.12, oz - 0.03, 0.12, 0.05, 0.12, 0xffe9a0);
  }
}
const LILY_BED = { x0: 22, x1: 25, z: 5 }; // in the square, by the road

// What Vivienne does for people in one age is remembered in the ages after it.
export const STATUE = { x: 13.7, z: 1.0, xF: 19.6 };
// carved stone: plain colors (not the wall palettes, which would texture it like masonry)
const CARVED = [0xcfc9ba, 0xaaa496, 0xe0dbcf], CARVED_DARK = 0x5f5a50; // "the Stranger", in the square (Present) and the plaza (Future)
const BRIDGE_STONE = { x: 212.3, z: 1.3 };

/** A small statue of a girl with her hair in a bun, goggles on, holding out a star chart. */
function strangerFigure(b, x, z, y0, pal, dark, k = 1.5) {
  const d = (px, py, pz, sx, sy, sz, c) => b.deco(x + px * k, y0 + py * k, z + pz * k, sx * k, sy * k, sz * k, c);
  d(-0.17, 0, -0.08, 0.14, 0.42, 0.16, pal[1]); // legs
  d(0.03, 0, -0.08, 0.14, 0.42, 0.16, pal[1]);
  d(-0.22, 0.4, -0.13, 0.44, 0.5, 0.26, pal[0]); // dress
  d(-0.17, 0.42, 0.13, 0.34, 0.4, 0.04, pal[2]); // apron
  d(-0.32, 0.55, -0.02, 0.1, 0.3, 0.3, pal[1]); // arms, held out
  d(0.22, 0.55, -0.02, 0.1, 0.3, 0.3, pal[1]);
  d(-0.26, 0.62, 0.26, 0.52, 0.3, 0.05, pal[2]); // the star chart
  d(-0.17, 0.9, -0.15, 0.34, 0.32, 0.3, pal[0]); // head
  d(-0.19, 1.02, 0.14, 0.38, 0.09, 0.04, dark); // goggles
  d(-0.19, 1.18, -0.17, 0.38, 0.08, 0.34, pal[1]); // hair
  d(-0.09, 1.24, -0.2, 0.18, 0.16, 0.18, pal[1]); // bun
}

function legacies(world) {
  // Samaria's star chart, returned in the Past: Callie carves the stranger, and the valley keeps her
  world.addFeature({
    id: 'strangerStatue', eras: [M, F], key: (s) => String(!!s.flags.chartReturned),
    build: (b, era, s) => {
      if (!s.flags.chartReturned) return;
      if (era === M) {
        const { x, z } = STATUE;
        b.deco(x - 0.7, 0, z - 0.6, 1.4, 0.18, 1.2, C.stone[3]);
        b.deco(x - 0.55, 0.18, z - 0.48, 1.1, 0.55, 0.96, C.stone[0]);
        b.deco(x - 0.36, 0.3, z + 0.48, 0.72, 0.28, 0.03, 0xc9a44a); // the worn plaque
        b.deco(x - 0.55, 0.55, z - 0.48, 0.4, 0.2, 0.3, C.stoneMoss[0]); // six centuries of moss
        strangerFigure(b, x, z, 0.73, CARVED, CARVED_DARK);
      } else {
        const x = STATUE.xF, z = STATUE.z;
        b.deco(x - 0.7, 0, z - 0.6, 1.4, 0.5, 1.2, C.metalL[0]);
        for (const oz of [-0.6, 0.56]) b.glow(x - 0.7, 0.5, z + oz, 1.4, 0.04, 0.05, NEON.amber);
        strangerFigure(b, x, z, 0.5, CARVED, CARVED_DARK);
        b.glow(x + 0.95, 0.55, z + 0.1, 0.05, 0.5, 0.6, NEON.amber); // its label
        b.deco(x + 0.92, 0, z + 0.3, 0.1, 0.55, 0.2, 0x3a404c);
        b.light(x, 2.2, z + 1, NEON.amber, 3, 5, 0);
      }
    },
  });
  // Tamsin's bridge, sealed in the Past: a waymarker tells whose rope it was
  world.addFeature({
    id: 'bridgeStone', eras: [M, F], key: (s) => String(!!s.flags.bridgeSealed),
    build: (b, era, s) => {
      if (!s.flags.bridgeSealed) return;
      const { x, z } = BRIDGE_STONE;
      if (era === M) {
        b.deco(x - 0.3, 0, z - 0.2, 0.6, 1.25, 0.4, CARVED[1]);
        b.deco(x - 0.36, 1.25, z - 0.24, 0.72, 0.14, 0.48, CARVED_DARK);
        b.deco(x - 0.2, 0.5, z + 0.2, 0.4, 0.5, 0.03, CARVED[2]); // the carved panel
        b.deco(x - 0.3, 0, z - 0.2, 0.25, 0.3, 0.42, C.stoneMoss[1]);
      } else {
        b.deco(x - 0.08, 0, z, 0.16, 1.2, 0.16, 0x3a404c);
        b.glow(x - 0.35, 0.75, z + 0.05, 0.7, 0.45, 0.05, NEON.cyan);
      }
    },
  });
}

function lilies(world) {
  // PAST: wild sun-lilies, on the very spot the square's flower bed will be
  const bp = world.staticBuilder(P);
  for (let x = LILY_BED.x0; x <= LILY_BED.x1; x++) lilyCluster(bp, x + 0.1, LILY_BED.z + 0.1, 4);
  // PRESENT: Karen Louise's flower bed, empty until the seeds come back
  world.addFeature({
    id: 'lilyBed', eras: [M], key: (s) => String(!!s.flags.liliesPlanted),
    build: (b, era, s) => {
      const { x0, x1, z } = LILY_BED;
      b.deco(x0, 0, z + 0.05, x1 - x0 + 1, 0.3, 0.9, C.stone[1]);
      b.deco(x0 + 0.1, 0.3, z + 0.15, x1 - x0 + 0.8, 0.03, 0.7, 0x3a2414);
      if (s.flags.liliesPlanted) for (let x = x0; x <= x1; x++) lilyCluster(b, x + 0.12, z + 0.15, 3);
    },
  });
  // FUTURE: three hundred years on, the lilies have become a memorial garden
  world.addFeature({
    id: 'lilyGarden', eras: [F], key: (s) => String(!!s.flags.liliesPlanted),
    build: (b, era, s) => {
      if (!s.flags.liliesPlanted) return;
      const { x0, x1, z } = LILY_BED;
      b.deco(x0 - 1, 0, z - 0.2, x1 - x0 + 3, 0.35, 1.3, C.metalL[0]);
      b.glow(x0 - 1, 0.35, z - 0.2, x1 - x0 + 3, 0.03, 0.06, 0xffd34a);
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        const lb = { ...b, deco: (px, py, pz, sx, sy, sz, c) => b.deco(px, py + 0.35, pz, sx, sy, sz, c), glow: (px, py, pz, sx, sy, sz, c) => b.glow(px, py + 0.35, pz, sx, sy, sz, c) };
        lilyCluster(lb, x + 0.1, z, 4, true);
      }
      // memorial plaque
      b.deco(x1 + 2.3, 0, z + 0.2, 0.12, 1.1, 0.7, 0x3a404c);
      b.glow(x1 + 2.22, 0.5, z + 0.3, 0.06, 0.4, 0.5, 0xffd34a);
      b.light(23.5, 1.2, z + 0.5, 0xffd070, 4, 6, 0.05);
    },
  });
}

function river(world) {
  // PAST: ford with stepping stones
  let b = world.staticBuilder(P);
  b.hazard(L.riverX0, -4, ZMIN, L.riverX1, -2, ZMAX - 1, 0x3fa7c9, false, 0.5);
  for (let sx = L.riverX0; sx <= L.riverX1; sx++) {
    const big = sx % 3 !== 0;
    b.solid(sx, -4, 2, sx, -1, 4, jitter(big ? C.stone : C.stoneMoss));
    if (big) b.deco(sx + 0.1, 0, 2.2, 0.3, 0.05, 0.4, C.stoneMoss[0]);
    else b.deco(sx, 0, 2, 1, 0.04, 3, 0x5fb8d8); // shallow water film over the low stones
  }
  palmTree(b, 37, -2, makeRng(9));
  palmTree(b, 50, -3, makeRng(10));
  // PRESENT: deep river + broken bridge + boulder
  b = world.staticBuilder(M);
  b.hazard(L.riverX0, -4, ZMIN, L.riverX1, -2, ZMAX - 1, 0x3e8fb8, false, 0.3);
  b.solid(40, -1, 2, 40, -1, 4, jitter(C.wood));
  b.solid(47, -1, 2, 47, -1, 4, jitter(C.wood));
  b.deco(40.2, -1, 1.6, 0.25, 2.2, 0.25, C.wood[1]);
  b.deco(40.2, -1, 4.9, 0.25, 2.2, 0.25, C.wood[1]);
  b.deco(46.6, -1, 1.6, 0.25, 2.2, 0.25, C.wood[1]);
  b.deco(46.6, -1, 4.9, 0.25, 2.2, 0.25, C.wood[1]);
  b.deco(41, -0.4, 2.4, 0.9, 0.12, 1.5, C.wood[2]); // dangling planks
  b.deco(45.4, -0.7, 2.6, 0.7, 0.12, 1.2, C.wood[0]);
  b.solid(48, 0, 1, 49, 1, 3, jitter(C.stoneMoss));
  b.deco(48.2, 2, 1.4, 1.4, 0.2, 1.2, C.leaves[0]);
  lampPost(b, 38, 1, M);
  // FUTURE: toxic canal with flickering holo-bridge remnants
  b = world.staticBuilder(F);
  b.hazard(L.riverX0, -4, ZMIN, L.riverX1, -2, ZMAX - 1, 0x5aff4a, true, 0.6);
  b.glow(40, -0.1, 2, 1.4, 0.06, 3, NEON.cyan);
  b.glow(46.2, -0.1, 2, 1.8, 0.06, 3, NEON.cyan);
  b.light(44, 0.5, 3, 0x7cff6a, 10, 12, 0.2);
  b.solid(38, 0, 0, 39, 1, 0, jitter(C.metal));
  b.glow(38.1, 2, 0.1, 1.8, 0.2, 0.2, 0xff3040);
}

function cliffs(world) {
  // PAST: temple + sandstone cliff (static)
  let b = world.staticBuilder(P);
  b.solid(54, 0, -6, 65, 5, -1, jitter(C.sandstone));
  b.solid(56, 6, -6, 63, 8, -2, jitter(C.sandDark));
  b.solid(58, 9, -5, 61, 10, -3, jitter(C.sandstone));
  b.deco(58.6, 0, 0.0, 2.8, 3.2, 0.06, 0x1a100a);
  b.deco(58.2, 3.2, 0.02, 3.6, 0.4, 0.12, C.sandDark[1]);
  for (let x = 54; x <= 65; x++) if (x % 2 === 0) b.glow(x + 0.3, 4.4, 0.0, 0.4, 0.4, 0.04, 0x3ad0c0);
  wallTorch(b, 56.5, 1.3, 0.0);
  wallTorch(b, 61.8, 1.3, 0.0);
  // temple steps (cog route)
  b.solid(55, 0, 0, 55, 0, 1, jitter(C.sandstone));
  b.solid(56, 0, 0, 56, 1, 1, jitter(C.sandstone));
  b.solid(57, 0, 0, 57, 2, 0, jitter(C.sandstone));
  // the cliff
  b.solid(L.cliffX0, 0, ZMIN, L.cliffX1, 9, 6, (x, y, z) => jitter(y % 3 === 0 ? C.sandDark : C.sandstone)(x, y, z));
  b.solid(L.cliffX1 + 1, 0, ZMIN, L.cliffX1 + 3, 6, -1, jitter(C.sandstone));
  filler(b, P, 68, 78, 41);

  // PRESENT: houses before the cliff
  b = world.staticBuilder(M);
  filler(b, M, 52, 65, 42);
  b.solid(L.cliffX1 + 1, 0, ZMIN, L.cliffX1 + 3, 6, -1, jitter(C.stoneMoss));
  filler(b, M, 70, 78, 43);
  // FUTURE
  b = world.staticBuilder(F);
  filler(b, F, 52, 62, 44);
  filler(b, F, 72, 78, 45);
  b.solid(L.cliffX1 + 1, 0, ZMIN, L.cliffX1 + 3, 6, -1, jitter(C.metal));

  // FEATURE: spring water (Past)
  world.addFeature({
    id: 'spring', eras: [P], key: (s) => String(!!s.flags.springOpen),
    build: (b) => {
      // channel on top of the cliff
      b.deco(L.cliffX0 - 0.1, 10, 2.2, 2.2, 0.3, 1.6, C.sandDark[0]);
      if (world.__state?.flags.springOpen) {
        b.water(L.cliffX0, 10, 2, L.cliffX1, 10, 4, 0x4ab8e0, 0.7);
        // the spring spills over the lip and pours down the cliff into a pool
        b.waterfall(L.cliffX0 - 0.55, L.cliffX0 - 0.02, 0, 10.35, 2.35, 3.65, 0x5ab8e8);
        b.stream(L.cliffX0 - 2.6, 1.8, L.cliffX0 - 0.02, 4.4, 0x3e9fd0);
        b.light(L.cliffX0 - 1, 2, 3.2, 0x7fd8ff, 3, 6, 0);
      } else {
        b.deco(L.cliffX0 - 0.6, 9.8, 2.6, 0.5, 0.5, 0.8, C.stone[0]); // plug stone
      }
    },
  });
  // FEATURE: present cliff. Once the spring runs, six centuries of water wear a gully
  // right through it: open toward the camera, with ragged edges, moss and a stream.
  world.addFeature({
    id: 'cliffP', eras: [M], key: (s) => String(!!s.flags.springOpen),
    build: (b, era, s) => {
      const open = !!s.flags.springOpen;
      for (let x = L.cliffX0; x <= L.cliffX1; x++)
        for (let y = 0; y <= 9; y++)
          for (let z = ZMIN; z <= 6; z++) {
            if (open && isEroded(x, y, z)) continue;
            // wet, mossy stone around the worn channel; dry strata elsewhere
            const nearWater = open && z >= 4 && y >= 3 && y <= 5 && hash3(x, y, z) < 0.8; // mossy rim of the worn mouth
            const moss = nearWater || hash3(x, y, z) < 0.12;
            b.setCell(x, y, z, T.SOLID, jitter(moss ? C.stoneMoss : y % 3 === 0 ? C.sandDark : C.sandstone)(x, y, z));
          }
      if (open) {
        // a trickle still runs down the face, then along the gully floor
        b.waterfall(L.cliffX1 + 0.6, L.cliffX1 + 0.92, 0, 9.98, 6.95, 7.2, 0x5ab8e8); // down the edge, clear of the gully
        b.stream(L.cliffX0 - 1.6, 3.6, L.cliffX1 + 2.2, 6.95, 0x3e9fd0);
        // the worn mouth: moss hanging from the lip, water dripping, smooth stones on the floor
        for (let i = 0; i < 9; i++) {
          const x = L.cliffX0 + 0.1 + (i % 5) * 0.38, z = 6.75 - Math.floor(i / 5) * 1.6;
          const top = isEroded(Math.floor(x), 3, Math.floor(z)) ? (isEroded(Math.floor(x), 4, Math.floor(z)) ? 5 : 4) : 3;
          b.deco(x, top - 0.45 - (i % 3) * 0.15, z, 0.18, 0.45 + (i % 3) * 0.15, 0.1, C.leaves[i % 4]);
          b.glow(x + 0.2, top - 0.25 - (i % 2) * 0.4, z + 0.05, 0.05, 0.12, 0.05, 0x9fe6ff);
        }
        for (let i = 0; i < 5; i++) b.deco(L.cliffX0 + hash3(i, 1, 4) * 1.5, 0, 2.4 + i * 0.9, 0.45, 0.22, 0.35, C.stoneMoss[i % 4]);
        b.light(L.cliffX0 + 1, 2.2, 4.5, 0xbfe8ff, 4, 6, 0);
        b.deco(L.cliffX1 + 0.45, 0.2, 6.98, 0.6, 9.6, 0.03, 0x4a3a2a); // wet streak behind the trickle
        b.light(L.cliffX0 + 1, 1.6, 6, 0x7fd8ff, 3, 6, 0);
      } else {
        // water-stain hints
        b.deco(L.cliffX0 - 0.03, 0.2, 2.6, 0.06, 8.5, 0.8, 0x8a6a4a);
      }
    },
  });
  // FEATURE: future cliff bulkhead + flooded aqueduct
  world.addFeature({
    id: 'cliffF', eras: [F], key: (s) => `${!!s.flags.springOpen},${!!s.flags.hasSnorkel}`,
    build: (b, era, s) => {
      const open = !!s.flags.springOpen;
      for (let x = L.cliffX0; x <= L.cliffX1; x++)
        for (let y = 0; y <= 11; y++)
          for (let z = ZMIN; z <= 6; z++) {
            if (open && z >= 2 && z <= 4 && y <= 2) continue;
            b.setCell(x, y, z, T.SOLID, jitter(y > 8 ? C.metalL : z > 4 || y % 4 === 0 ? C.metal : C.sandDark)(x, y, z));
          }
      b.glow(L.cliffX0 - 0.03, 3.2, 1, 0.05, 0.12, 5, NEON.amber);
      // ground around (pit if open)
      for (let x = L.pitX0; x <= L.pitX1; x++)
        for (let z = ZMIN; z < ZMAX; z++) {
          const inPit = open && z >= 1 && z <= 5;
          for (let y = -4; y <= -1; y++) {
            if (inPit && y >= -3) continue;
            b.setCell(x, y, z, T.SOLID, groundColor(F, x, y, z));
          }
        }
      if (open) {
        b.water(L.pitX0, -3, 1, L.pitX1, -1, 5, 0x2aa0c8, 0.2);
        b.glow(L.pitX0 + 0.5, -2.99, 2.6, L.pitX1 - L.pitX0, 0.04, 0.2, NEON.cyan);
        b.light(66.5, 0, 3, 0x36c0ff, 7, 9, 0);
        b.glow(L.cliffX0 + 0.2, 2.6, 2, 1.6, 0.1, 0.1, NEON.cyan);
        // the pool's sign, on the road just before it: the one stretch of water here that's safe
        // to swim in (everywhere else in this age it's green and deadly). A snorkel hangs from it.
        const sx = L.pitX0 - 1.1;
        b.deco(sx, 0, 0.35, 0.12, 2.1, 0.12, 0x3a404c);
        b.deco(sx - 0.55, 1.2, 0.32, 1.2, 0.9, 0.06, 0x14202c);
        b.glow(sx - 0.5, 1.25, 0.39, 1.1, 0.8, 0.03, 0x2aa0c8);
        for (const [oy, w] of [[1.42, 0.8], [1.58, 0.6]]) b.glow(sx - 0.35, oy, 0.43, w, 0.06, 0.02, 0xe8fbff); // waves
        b.glow(sx - 0.08, 1.74, 0.43, 0.16, 0.16, 0.02, 0xe8fbff); // a swimmer's head above them
        b.light(sx, 1.8, 1.2, 0x36c0ff, 3, 4, 0);
        if (!s.flags.hasSnorkel) {
          b.deco(sx + 0.2, 0.75, 0.42, 0.34, 0.2, 0.08, 0x2a6a8a);
          b.glow(sx + 0.24, 0.79, 0.5, 0.26, 0.12, 0.02, 0x9fe8ff);
          b.deco(sx + 0.56, 0.75, 0.42, 0.07, 0.5, 0.07, 0xff8a3a);
        }
      }
    },
  });
}

function rampart(world) {
  // PAST: palisade
  let b = world.staticBuilder(P);
  b.solid(L.wallX0, 0, ZMIN, L.wallX1, 7, 6, (x, y, z) => jitter(z % 2 ? C.log : C.wood)(x, y, z));
  for (let z = ZMIN; z <= 6; z += 1) b.deco(L.wallX0 + 0.25, 8, z + 0.25, 0.5 + 1, 0.6, 0.5, C.log[z & 1 ? 0 : 2]);
  filler(b, P, 79, STUDY.x0 - 1, 51);
  filler(b, P, STUDY.x1 + 1, L.wallX0, 57);
  filler(b, P, 100, 104, 52);
  // PRESENT: town wall + crates
  b = world.staticBuilder(M);
  b.solid(L.wallX0, 0, ZMIN, L.wallX1, 7, 6, jitter(C.stone));
  for (let z = ZMIN; z <= -1; z += 2) b.solid(L.wallX0, 8, z, L.wallX1, 8, z, jitter(C.stone));
  b.deco(L.wallX0 - 0.02, 4, 1, 0.06, 2.6, 1, 0xb22a2a);
  b.deco(L.wallX0 - 0.06, 4.8, 1.25, 0.04, 0.6, 0.5, 0xe0b040);
  crate(b, 84, 0, 1); crate(b, 85, 0, 1); crate(b, 85, 1, 1); crate(b, 86, 0, 1); crate(b, 86, 1, 1);
  // stone stairs down the inner side of the wall, so climbing over never ends in a long drop
  for (let i = 0; i < 7; i++) {
    const x = L.wallX1 + 1 + i;
    b.solid(x, 0, 0, x, 6 - i, 6, jitter(C.stone));
    b.deco(x, 6 - i + 0.98, 6.02, 1, 0.1, 0.1, C.stone[3]); // worn step nosing
  }
  filler(b, M, 79, 96, 53);
  filler(b, M, 100, 104, 54);
  // FUTURE: energy rampart
  b = world.staticBuilder(F);
  b.solid(L.wallX0, 0, ZMIN, L.wallX1, 7, 6, jitter(C.metal));
  for (let y = 1; y < 8; y += 3) b.glow(L.wallX0 - 0.03, y, 0, 0.05, 0.12, 7, NEON.magenta);
  for (let z = ZMIN; z <= -1; z += 2) b.solid(L.wallX0, 8, z, L.wallX1, 9, z, jitter(C.metal)); // emitter fins behind the walkway
  for (let z = ZMIN; z <= -1; z += 2) b.glow(L.wallX0 + 0.3, 10, z + 0.3, 1.4, 0.12, 0.4, NEON.magenta);
  // maintenance stairs down the far side of the rampart
  for (let i = 0; i < 7; i++) {
    const x = L.wallX1 + 1 + i, top = 7 - i;
    b.solid(x, 0, 0, x, top - 1, 6, jitter(C.metalL));
    b.glow(x + 0.05, top - 0.07, 6.98, 0.9, 0.06, 0.04, NEON.cyan);
  }
  filler(b, F, 79, 96, 55);
  filler(b, F, 100, 104, 56);

  world.addFeature({
    id: 'sapling', eras: [P], key: (s) => String(!!s.flags.acornPlanted),
    build: (b) => {
      b.deco(92.1, 0, 3.1, 0.9, 0.05, 0.9, 0x4a2e1a);
      if (world.__state?.flags.acornPlanted) {
        b.deco(92.48, 0, 3.48, 0.08, 0.7, 0.08, C.log[0]);
        b.deco(92.3, 0.55, 3.35, 0.4, 0.25, 0.3, C.leaves[2]);
      }
    },
  });
  world.addFeature({
    id: 'oak', eras: [M], key: (s) => String(!!s.flags.acornPlanted),
    build: (b, era, s) => {
      if (!s.flags.acornPlanted) return;
      b.solid(92, 0, 2, 93, 8, 3, jitter(C.log));
      b.ladder(92, 0, 4, 93, 8, 4);
      for (let y = 0; y < 9; y++) for (let x = 92; x <= 93; x++) if (hash3(x, y, 4) < 0.8) b.deco(x + 0.1 + hash3(y, x, 1) * 0.4, y, 3.98, 0.35, 1, 0.08, C.leaves[(x + y) % 5]);
      b.solid(94, 7, 2, 96, 7, 4, jitter(C.log));
      b.solid(91, 6, 2, 91, 6, 2, jitter(C.log));
      // canopy (visual only, kept behind/above the walking path)
      const cols = [...C.leaves, ...C.autumn].map((c) => c & 0xffffff);
      b.canopy(93, 11.6, -0.5, 4.2, cols, { maxZ: 1.8, seed: 77, squash: 0.62 });
      b.canopy(90, 10.4, -1.5, 2.4, cols, { maxZ: 1.2, seed: 78 });
      b.canopy(96.5, 10.2, -1.2, 2.6, cols, { maxZ: 1.2, seed: 79 });
    },
  });
  // Present-day planter: plant the acorn here instead and it has 300 years to grow by the Future
  world.addFeature({
    id: 'planter', eras: [M], key: (s) => `${!!s.flags.acornPlanted},${!!s.flags.acornPlantedM}`,
    build: (b, era, s) => {
      if (s.flags.acornPlanted) return; // the old oak's roots have long since taken this spot
      b.deco(91.9, 0, 2.9, 1.2, 0.42, 1.2, C.wood[0]);
      b.deco(92.0, 0.42, 3.0, 1.0, 0.03, 1.0, 0x3a2414);
      if (s.flags.acornPlantedM) {
        b.deco(92.46, 0.45, 3.46, 0.08, 0.6, 0.08, C.log[0]);
        b.deco(92.3, 0.9, 3.35, 0.4, 0.25, 0.3, C.leaves[2]);
        b.deco(92.42, 0.75, 3.3, 0.3, 0.16, 0.24, C.leaves[0]);
      }
    },
  });
  world.addFeature({
    id: 'petrified', eras: [F], key: (s) => `${!!s.flags.acornPlanted},${!!s.flags.acornPlantedM}`,
    build: (b, era, s) => {
      if (s.flags.acornPlantedM && !s.flags.acornPlanted) {
        // planted in the Present: a living giant, tall enough to reach the top of the rampart
        b.solid(92, 0, 2, 93, 9, 3, jitter(C.log));
        b.ladder(92, 0, 4, 93, 8, 4);
        for (let y = 0; y < 10; y++)
          for (let x = 92; x <= 93; x++) if (hash3(x, y, 9) < 0.8) b.deco(x + 0.1 + hash3(y, x, 2) * 0.4, y, 3.98, 0.35, 1, 0.08, (x + y) % 3 ? C.overgrowth[(x + y) % 3] : C.leaves[(x + y) % 5]);
        for (let y = 1; y < 10; y += 3) b.glow(92.2 + hash3(y, 1, 1) * 1.4, y + 0.4, 4.06, 0.12, 0.12, 0.04, 0x9affd0);
        b.solid(94, 7, 2, 96, 7, 4, jitter(C.log)); // branch onto the rampart
        b.solid(90, 6, 2, 91, 6, 2, jitter(C.log));
        b.deco(91.9, 0, 3.98, 2.2, 0.05, 0.9, 0x2a4a2a);
        const cols = [...C.leaves, ...C.overgrowth].map((c) => c & 0xffffff);
        b.canopy(93, 12, -0.5, 4.4, cols, { maxZ: 1.8, seed: 81, squash: 0.62 });
        b.canopy(89.8, 10.6, -1.5, 2.5, cols, { maxZ: 1.2, seed: 82 });
        b.canopy(96.4, 10.6, -1.2, 2.6, cols, { maxZ: 1.2, seed: 83 });
        b.light(93, 3, 5, 0x7affc8, 5, 8, 0.05);
        return;
      }
      if (!s.flags.acornPlanted) return;
      b.solid(92, 0, 2, 93, 9, 3, jitter([0x7a7672, 0x6a6662, 0x8a8682]));
      b.solid(94, 6, 2, 94, 6, 3, jitter([0x7a7672]));
      b.solid(90, 7, 2, 91, 7, 2, jitter([0x6a6662]));
      b.deco(92.2, 0, 3.98, 1.6, 1.4, 0.06, 0x1a1620);
      b.glow(91.8, 0.0, 4.0, 2.4, 0.05, 0.8, NEON.cyan);
      b.light(92.9, 1, 4.6, NEON.cyan, 4, 6, 0);
    },
  });
}

// Donald Eugene's hideaway: a secret. In the Past, one plain house in Rampart Row has a tiny
// brass gear pressed into its door. Knock, and it opens onto the room he rested in while he
// hopped between the ages. The Everspring waits on his workbench: the Chronoheart never runs
// down again. (Lyra the Wise mentions it, very quietly.)
// While the player is inside, the front wall is cut away and the room joins the playable strip.
export const STUDY = { x0: 87, x1: 92, h: 4, door: 89, pocket: { id: 'study', era: P, x0: 87, x1: 92, z0: -4 } };
export const GARDEN = { x0: 30, x1: 36, h: 5, door: 11.9, entryX: 33, pocket: { id: 'garden', era: F, x0: 30, x1: 36, z0: -4 } };
function hideaway(world) {
  // bare earth under the house, so no grass grows through the floor
  world.staticBuilder(P).solid(STUDY.x0, -1, -4, STUDY.x1, -1, -1, jitter(C.sandDark));
  world.addFeature({
    id: 'hideaway', eras: [P], key: () => String(world.pocket?.id === 'study'),
    build: (b) => {
      const { x0, x1, h, door } = STUDY;
      const wall = (x, y, z) => (y === h - 1 ? jitter(C.sandDark)(x, y, z) : jitter(C.sandstone)(x, y, z));
      if (world.pocket?.id !== 'study') {
        // outside: an ordinary old house, just like its neighbors
        b.solid(x0, 0, -4, x1, h - 1, -1, wall);
        for (let x = x0; x <= x1; x += 2) b.solid(x, h, -4, x, h, -4, jitter(C.sandstone));
        b.solid(x0, h, -1, x1, h, -1, jitter(C.sandstone));
        b.deco(door - 0.9, 0, 0.0, 1.0, 1.8, 0.06, 0x2a1810);
        b.deco(door - 1.1, 1.8, 0.0, 1.4, 0.2, 0.1, C.sandDark[0]);
        // the only clue: a little brass gear above the latch
        b.deco(door - 0.52, 1.28, 0.06, 0.24, 0.24, 0.03, 0xc9a44a);
        b.deco(door - 0.44, 1.36, 0.09, 0.08, 0.08, 0.02, 0x2a1810);
        for (let i = 0; i < 3; i++) b.deco(x0 + 0.4 + i * 1.9, 0.6 + (i % 2) * 1.6, 0.0, 0.35, 0.4, 0.05, C.jungle[i]);
        return;
      }
      // inside: back and side walls only, so the camera looks straight in
      b.solid(x0, 0, -4, x1, h - 1, -4, wall);
      b.solid(x0, 0, -3, x0, h - 1, -1, wall);
      b.solid(x1, 0, -3, x1, h - 1, -1, wall);
      b.deco(x0 + 1, 0.0, -3, x1 - x0 - 1, 0.03, 2.9, 0x5a3a22); // plank floor
      b.deco(x0 + 1.6, 0.03, -2.6, 2.2, 0.02, 1.4, 0x8a2a2a); // a worn rug
      // the cot, against the west wall
      b.deco(x0 + 1.05, 0, -3, 0.9, 0.45, 2.0, C.wood[1]);
      b.deco(x0 + 1.1, 0.45, -2.95, 0.8, 0.12, 1.9, 0xd8cca8);
      b.deco(x0 + 1.15, 0.57, -2.9, 0.7, 0.14, 0.45, 0xf0e8d0);
      // shelves of jars, gears and bent springs
      for (const y of [1.2, 2.2]) {
        b.deco(x0 + 2.0, y, -3.0, 2.6, 0.1, 0.45, C.wood[0]);
        for (let i = 0; i < 5; i++) b.deco(x0 + 2.15 + i * 0.5, y + 0.1, -2.9, 0.26, 0.2 + hash3(i, y * 3, 7) * 0.2, 0.26, [0xc9a44a, 0x3ab0a0, 0x8a6a3a, 0xa8843a, 0x4a4a52][(i + y * 2) % 5]);
      }
      // the Clocktower, chalked on the back wall and covered in notes
      const cx = x0 + 3.4;
      b.glow(cx - 0.4, 2.7, -2.96, 0.06, 1.2, 0.02, 0xe8e4d8);
      b.glow(cx + 0.4, 2.7, -2.96, 0.06, 1.2, 0.02, 0xe8e4d8);
      b.glow(cx - 0.4, 3.85, -2.96, 0.86, 0.06, 0.02, 0xe8e4d8);
      b.glow(cx - 0.12, 3.25, -2.96, 0.3, 0.3, 0.02, 0xe8e4d8);
      for (let i = 0; i < 4; i++) b.deco(cx + 0.8 + (i % 2) * 0.5, 2.8 + Math.floor(i / 2) * 0.55, -2.97, 0.4, 0.4, 0.02, 0xe8dcb0);
      // three maps: one valley in three ages
      [0xd9b77a, 0x86a843, 0x3a404c].forEach((col, i) => b.deco(x0 + 1.1 + i * 0.75, 2.6, -2.97, 0.6, 0.5, 0.02, col));
      // a clock with its hands stopped
      b.deco(x1 - 1.8, 2.9, -2.97, 0.6, 0.6, 0.02, 0x8a6a2a);
      b.deco(x1 - 1.72, 2.98, -2.95, 0.44, 0.44, 0.02, 0xeadfc0);
      b.deco(x1 - 1.52, 3.2, -2.93, 0.04, 0.18, 0.02, 0x2a2014);
      // the workbench, where the Everspring waits
      b.solid(x1 - 2, 0, -3, x1 - 1, 0, -3, jitter(C.wood));
      b.deco(x1 - 2.05, 0.95, -3.05, 2.1, 0.1, 1.1, 0x5a3a22);
      b.deco(x1 - 1.3, 1.05, -2.6, 0.4, 0.05, 0.3, 0xe8dcb0); // his letter
      // a lantern, and a crate by the door
      b.glow(x0 + 1.3, 1.6, -3.0, 0.2, 0.3, 0.2, NEON.warm);
      b.light(x0 + 2.8, 2.2, -1.6, 0xffc070, 6, 7, 0.08);
      crate(b, x1 - 1, 0, -1);
    },
  });
}

// The Starlit Garden (10,000 Years On): a secret fourth-era sanctuary behind the Astral Clock-Door,
// unlocked once all 10 Lost Cogs in Chapter 3 grant the Master's Key.
function starlitGarden(world) {
  world.staticBuilder(F).solid(GARDEN.x0, -1, -4, GARDEN.x1, -1, -1, jitter(C.overgrowth));
  world.addFeature({
    id: 'starlitGarden', eras: [F], key: () => String(world.pocket?.id === 'garden'),
    build: (b) => {
      const { x0, x1, h } = GARDEN;
      if (world.pocket?.id !== 'garden') {
        filler(b, F, x0, x1, 32);
        return;
      }
      // Sanctuary walls reclaimed by mossy stone, bioluminescent vines, and starlight
      const wall = jitter(C.stoneMoss);
      b.solid(x0, 0, -4, x1, h - 1, -4, wall);
      b.solid(x0, 0, -3, x0, h - 1, -1, wall);
      b.solid(x1, 0, -3, x1, h - 1, -1, wall);
      b.deco(x0 + 1, 0.0, -3, x1 - x0 - 1, 0.04, 2.9, 0x224a38); // soft moss carpet
      // Starlight pools and glowing sun-lilies
      b.glow(x0 + 1.3, 0.05, -2.7, 1.4, 0.03, 1.1, NEON.cyan);
      b.glow(x1 - 2.3, 0.05, -2.7, 1.4, 0.03, 1.1, NEON.cyan);
      lilyCluster(b, x0 + 1.4, -2.5, 4, true);
      lilyCluster(b, x1 - 2.2, -2.5, 4, true);
      // Living tree-observatory at the center-back, encircled by four brass astrolabe rings
      const cx = (x0 + x1 + 1) / 2;
      b.deco(cx - 0.35, 0, -3.4, 0.7, 3.6, 0.6, C.log[0]);
      for (let i = 0; i < 4; i++) {
        const ry = 1.3 + i * 0.45;
        b.glow(cx - 1.1 + i * 0.12, ry, -3.45, 2.2 - i * 0.24, 0.06, 0.08, i % 2 ? 0xffd070 : NEON.cyan);
      }
      b.canopy(cx, 4.4, -3.0, 2.4, [0x36f0ff, 0x7affc8, 0xffd070, 0x4aa06a], { maxZ: -1.2, seed: 99, squash: 0.7 });
      // Memorial Plinth of the Four Clockmakers
      b.deco(cx - 0.55, 0, -2.4, 1.1, 0.85, 0.7, CARVED[0]);
      b.deco(cx - 0.62, 0.85, -2.45, 1.24, 0.1, 0.8, CARVED[2]);
      b.glow(cx - 0.4, 0.4, -1.68, 0.8, 0.32, 0.03, 0xffd070);
      b.light(cx, 2.6, -2.0, 0x9ff4ff, 8, 9, 0.05);
      b.light(cx, 1.4, -2.2, 0xffd890, 5, 6, 0.05);
    },
  });
}

function smithy(world) {
  // PRESENT: Aria's forge
  let b = world.staticBuilder(M);
  b.solid(107, 0, -6, 115, 5, -1, jitter(C.stone));
  b.air(108, 0, -3, 112, 2, -1);
  b.deco(108, 0, -3, 5, 0.02, 2.0, 0x2a2420);
  b.glow(108.5, 0, -2.9, 1.6, 1.2, 0.8, NEON.fire);
  b.glow(108.8, 0.3, -2.4, 1, 0.6, 0.5, 0xffe070);
  b.light(109.5, 1.2, -0.8, 0xff7a2a, 14, 10, 0.25);
  b.solid(109, 6, -5, 110, 9, -4, jitter(C.stone));
  b.deco(111.2, 0, -0.9, 1.2, 0.5, 0.5, 0x3a3a40); // anvil
  b.deco(111.0, 0.5, -0.95, 1.6, 0.25, 0.6, 0x4a4a52);
  b.deco(107.6, 3.6, 0.0, 6, 0.9, 0.1, 0x3a2614);
  b.glow(107.8, 3.75, 0.08, 5.6, 0.6, 0.02, 0xd8a040);
  // rod rack
  b.deco(113.9, 0, 0.0, 1.2, 1.4, 0.2, C.wood[1]);
  // quench vault
  b.solid(112, 0, 0, 112, 0, 0, jitter([0x4a4a52, 0x55555e]));
  b.deco(111.9, 0.95, -0.05, 1.2, 0.12, 1.1, 0x2a2a30);
  filler(b, M, 116, 129, 61);
  // PAST: carver's yard
  b = world.staticBuilder(P);
  filler(b, P, 105, 129, 62);
  for (let i = 0; i < 4; i++) b.deco(107 + i * 1.3, 0, -0.8, 0.9, 0.6 + i * 0.3, 0.7, C.sandstone[i % 4]);
  // FUTURE: Lillian's repair shop
  b = world.staticBuilder(F);
  filler(b, F, 105, 116, 63);
  b.solid(117, 0, -6, 125, 9, -1, jitter(C.metalL));
  b.glow(117.5, 0.2, 0.0, 8, 2.6, 0.04, 0x1a2a3a);
  b.glow(118, 3.2, 0.06, 7, 1.1, 0.1, NEON.magenta);
  b.glow(118.2, 3.35, 0.16, 6.6, 0.8, 0.02, 0x2a0a2a);
  for (let i = 0; i < 6; i++) b.glow(118.6 + i * 1.05, 3.5, 0.18, 0.7, 0.5, 0.02, i % 2 ? NEON.cyan : NEON.amber);
  b.light(121, 3, 1.4, NEON.magenta, 8, 10, 0);
  b.deco(118, 0, 0.1, 1.4, 1.0, 0.8, 0x4a5468);
  b.deco(118.1, 1.0, 0.15, 1.2, 0.05, 0.7, 0x1a1e28); // display case where the hammer rests
  for (const oz of [0.15, 0.79]) b.glow(118.1, 1.02, oz, 1.2, 0.04, 0.06, NEON.amber);
  filler(b, F, 126, 129, 64);
}

function terrace(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const pal = era === P ? C.sandstone : era === M ? C.stoneMoss : C.metal;
    b.solid(L.terraceX0, 0, ZMIN, L.terraceX1, 2, 6, jitter(pal));
    // steps down the east side, so the terrace can always be climbed back over from the Gatehouse
    b.solid(L.terraceX1 + 1, 0, 0, L.terraceX1 + 1, 1, 6, jitter(pal));
    b.solid(L.terraceX1 + 2, 0, 0, L.terraceX1 + 2, 0, 6, jitter(pal));
    if (era === F) b.glow(L.terraceX0 - 0.03, 2.8, 0, 0.05, 0.1, 7, NEON.cyan);
    if (era === M) for (let i = 0; i < 12; i++) b.deco(L.terraceX0 + hash3(i, 1, 1) * 9, 3, hash3(i, 2, 2) * 7, 0.3, 0.2, 0.3, C.leaves[i % 5]);
  }
  // PAST: altar, totems, reset glyph
  let b = world.staticBuilder(P);
  // carved foundation: push the block onto this glowing outline
  {
    const { x: tx, z: tz } = L.pillarTarget;
    for (const [ox, oz, sx, sz] of [[0.05, 0.05, 0.9, 0.08], [0.05, 0.87, 0.9, 0.08], [0.05, 0.05, 0.08, 0.9], [0.87, 0.05, 0.08, 0.9]]) b.glow(tx + ox, 0.0, tz + oz, sx, 0.03, sz, 0x3ad0c0);
    b.glow(tx + 0.4, 0.0, tz + 0.4, 0.2, 0.03, 0.2, 0x3ad0c0);
    b.light(tx + 0.5, 0.6, tz + 0.5, 0x3ad0c0, 3, 4, 0.1);
  }
  // the Sun Disc's dais: dark stone with a thin glowing rim, so the gold disc stands out
  b.solid(150, 3, 0, 152, 3, 1, jitter(C.sandDark));
  b.deco(150.15, 4.0, 0.15, 2.7, 0.05, 1.7, 0x2a1c12);
  for (const [ox, oz, sx, sz] of [[0.15, 0.15, 2.7, 0.06], [0.15, 1.79, 2.7, 0.06]]) b.glow(150 + ox, 4.02, oz, sx, 0.04, sz, 0xffcf5a);
  b.light(151.5, 6.2, 2.2, 0xffd070, 3.5, 7, 0.1);
  b.solid(146, 3, -3, 155, 8, -1, jitter(C.sandstone));
  // carved sun mural behind it: dark relief with a thin gold outline (it used to glow,
  // which hid the disc against it)
  b.deco(149, 5, 0, 5, 2.6, 0.04, 0x5a3a1a);
  b.deco(149.6, 5.3, 0.06, 3.8, 2.0, 0.04, 0x3a2410);
  for (const [ox, oy, sx, sy] of [[0, 0, 5, 0.08], [0, 2.52, 5, 0.08], [0, 0, 0.08, 2.6], [4.92, 0, 0.08, 2.6]]) b.glow(149 + ox, 5 + oy, 0.07, sx, sy, 0.03, 0xe8b040);
  wallTorch(b, 147, 4.3, 0.0);
  wallTorch(b, 154, 4.3, 0.0);
  b.deco(136.1, 0, 0.0, 0.8, 0.06, 0.8, 0x2a1a10);
  b.glow(136.25, 0.06, 0.15, 0.5, 0.03, 0.5, 0x3ad0c0);
  filler(b, P, 130, 145, 71);
  filler(b, P, 156, 159, 72);
  // PRESENT
  b = world.staticBuilder(M);
  filler(b, M, 130, 145, 73);
  b.solid(147, 3, -4, 154, 6, -1, jitter(C.stoneMoss));
  b.deco(150, 3, -0.6, 1.2, 1.6, 0.5, C.stone[3]); // weathered altar remains
  filler(b, M, 156, 159, 74);
  // FUTURE
  b = world.staticBuilder(F);
  filler(b, F, 130, 145, 75);
  b.solid(147, 3, -4, 154, 12, -1, jitter(C.metalL));
  b.glow(149, 5, 0.0, 4, 4, 0.04, 0x10202a);
  b.glow(150.5, 6.5, 0.06, 1, 1, 0.04, 0xffcf5a);
  b.deco(136.1, 0, 0.0, 0.8, 0.06, 0.8, 0x1a1e28);
  b.glow(136.25, 0.06, 0.15, 0.5, 0.03, 0.5, NEON.cyan);
  filler(b, F, 156, 159, 76);

  // pillar raised on the ancient block's final position + medieval bench
  world.addFeature({
    id: 'pillar', eras: [M, F], key: (s) => `${s.blockPos.x},${s.blockPos.z}`,
    build: (b, era, s) => {
      const { x, z } = s.blockPos;
      const t = L.pillarTarget;
      // the pillar only rises on the foundation: anywhere else the ancient block is long gone,
      // so the terrace can't be climbed until the block is set in place in the Past
      if (x === t.x && z === t.z) {
        b.solid(x, 0, z, x, 1, z, jitter(era === M ? C.stone : [0x7a7672, 0x6a6662]));
        b.deco(x - 0.05, 1.9, z - 0.05, 1.1, 0.12, 1.1, era === M ? C.stone[3] : 0x5a5652);
      } else {
        // the old foundation, waiting for a pillar
        b.deco(t.x + 0.04, 0, t.z + 0.04, 0.92, 0.12, 0.92, era === M ? C.sandstone[0] : 0x4a4652);
        b.deco(t.x + 0.3, 0.12, t.z + 0.3, 0.4, 0.02, 0.4, era === M ? 0x2a8a80 : 0x1a2a3a); // worn glyph, same as the block's
        if (era === F) b.glow(t.x + 0.1, 0.12, t.z + 0.1, 0.8, 0.02, 0.8, 0x3ad0c0);
      }
      if (era === M) {
        b.solid(L.benchCell.x, 0, L.benchCell.z, L.benchCell.x, 0, L.benchCell.z, jitter(C.wood));
        b.deco(L.benchCell.x - 0.1, 0.95, L.benchCell.z - 0.05, 1.2, 0.1, 1.1, C.wood[2]);
      }
    },
  });
}

function gatehouse(world) {
  // PAST: jungle cliff (end of the ancient road)
  let b = world.staticBuilder(P);
  b.solid(160, 0, ZMIN, 181, 12, 7, (x, y, z) => jitter(hash3(x, y, z) < 0.25 ? C.jungle : C.sandDark)(x, y, z));
  // PRESENT: gatehouse, rubble, rock
  b = world.staticBuilder(M);
  b.solid(163, 0, 0, L.gateX, 5, 1, jitter(C.stone));
  b.solid(163, 0, 5, L.gateX, 5, 6, jitter(C.stone));
  b.solid(163, 4, 2, L.gateX, 5, 4, jitter(C.stone));
  b.solid(163, 0, ZMIN, L.gateX, 8, -1, jitter(C.stone));
  for (let z = ZMIN; z <= 6; z += 2) b.solid(163, 6, z, L.gateX, 6, z, jitter(C.stone));
  b.deco(163.4, 2, 6.98, 1.2, 2.4, 0.06, 0xb22a2a);
  b.solid(174, 0, ZMIN, 181, 12, -1, jitter(C.stone));
  b.solid(L.rubbleX0, 0, ZMIN, 173, 8, -1, jitter(C.stone));
  filler(b, M, 157, 162, 81);
  // FUTURE: security corridor + vault
  b = world.staticBuilder(F);
  b.solid(160, 0, 0, 173, 4, 1, jitter(C.metal));
  // the front (camera-side) wall is kept low so the corridor, its drones and the
  // vault stay visible; at 2 high it still can't be jumped
  b.solid(160, 0, 5, 173, 1, 6, jitter(C.metal));
  b.solid(160, 0, ZMIN, 173, 9, -1, jitter(C.metalL));
  for (let x = 160; x <= 173; x += 2) {
    b.glow(x + 0.2, 4.0, 1.9, 0.6, 0.06, 0.1, 0xff3040);
    b.glow(x + 0.2, 2.0, 5.3, 0.6, 0.04, 0.12, 0xff3040);
  }
  b.light(163, 3, 3.5, 0xff3040, 6, 8, 0.1);
  b.light(170, 3, 3.5, 0xff3040, 6, 8, 0.1);
  b.solid(174, 0, 0, 181, 5, 0, jitter(C.metalL));
  b.solid(174, 0, 6, 181, 1, 6, jitter(C.metalL));
  b.solid(174, 0, ZMIN, 181, 10, -1, jitter(C.metalL));
  b.solid(177, 0, 3, 179, 0, 3, jitter(C.panel));
  b.deco(177.05, 1.0, 3.05, 2.9, 0.05, 0.9, 0x141a24);
  for (const oz of [3.05, 3.89]) b.glow(177.05, 1.02, oz, 2.9, 0.04, 0.06, NEON.cyan);
  b.light(178.5, 3.2, 4.2, NEON.cyan, 4, 7, 0);
  b.glow(174.05, 1, 0.98, 7.9, 0.08, 0.04, NEON.cyan);
  filler(b, F, 157, 159, 82);

  // Future: a security shutter seals the corridor before the vault. Its lock housing has rusted
  // through, and three hits of the wrench break it (see Strikeable 'shutterLock').
  world.addFeature({
    id: 'shutter', eras: [F], key: (s) => String(!!s.flags.shutterBroken),
    build: (b, era, s) => {
      if (s.flags.shutterBroken) {
        // dropped into its slot in the floor; the broken housing lies where it fell
        b.deco(173.05, 0, 2.05, 0.9, 0.08, 2.9, 0x2a3040);
        b.deco(172.2, 0, 3.2, 0.3, 0.2, 0.7, 0x8a4a2a);
        b.deco(171.7, 0, 4.1, 0.25, 0.12, 0.3, 0x6a3a22);
        return;
      }
      // hazard-striped, so it reads as a barrier from the road
      for (let y = 0; y <= 3; y++)
        for (let z = 2; z <= 4; z++) b.setCell(173, y, z, T.SOLID, (y + z) % 2 ? 0xc8a020 : 0x2a2f3a);
      for (const y of [0.95, 1.95, 2.95]) {
        b.glow(172.96, y, 2.05, 0.05, 0.08, 2.9, 0xffb020);
        b.glow(173.05, y, 4.98, 0.9, 0.08, 0.05, 0xffb020);
      }
      b.light(172.3, 2.2, 3.5, 0xffb020, 3, 5, 0.15);
    },
  });

  // Present: rubble and the rock behind it. The Clocktower's old postern lever opens a passage
  // back to the gatehouse, so you can always return west for anything you missed.
  world.addFeature({
    id: 'postern', eras: [M], key: (s) => String(!!s.flags.posternOpen),
    build: (b, era, s) => {
      const open = !!s.flags.posternOpen;
      const cut = (y, z) => open && z >= 2 && y <= 3;
      for (let x = L.rubbleX0; x <= 181; x++) {
        const top = x <= 173 ? 3 : 12;
        for (let y = 0; y <= top; y++)
          for (let z = 0; z <= 6; z++) {
            if (cut(y, z)) continue;
            const pal = x <= 173 ? (hash3(x, y, z) < 0.3 ? C.stoneMoss : C.stone) : C.stone;
            b.setCell(x, y, z, T.SOLID, jitter(pal)(x, y, z));
          }
      }
      for (let i = 0; i < 12; i++) {
        const z = hash3(i, 6, 6) * 7;
        if (!open || z < 2) b.deco(L.rubbleX0 + hash3(i, 5, 5) * 5, 4, z, 0.6, 0.5, 0.6, C.stone[i % 5]);
      }
      if (open) {
        // timber props hold the old passage up
        for (let x = 174; x <= 181; x += 3) {
          b.deco(x + 0.1, 0, 2.05, 0.2, 4, 0.2, C.wood[1]);
          b.deco(x + 0.1, 3.8, 2.05, 0.2, 0.2, 4.9, C.wood[0]);
        }
        for (let i = 0; i < 6; i++) b.deco(L.rubbleX0 + hash3(i, 2, 9) * 5, 0, 2.2 + hash3(i, 4, 1) * 4.5, 0.4, 0.3, 0.4, C.stone[i % 5]);
        b.light(177.5, 2.5, 4, 0xffb060, 4, 8, 0.1);
      } else {
        // the barred door, seen from the Clocktower side
        b.deco(181.92, 0, 2.2, 0.1, 3.4, 2.6, C.wood[0]);
        b.deco(181.88, 1.5, 2.0, 0.12, 0.3, 3.0, 0x3a3a42);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Millrace Hollow
// ---------------------------------------------------------------------------
// Past: a spring falls off the cliff into a stone trough and drains away down a gully. The trough
// has three plugged outlets (MILL_PLUGS); knock out the right one and the water runs down the old
// millrace into the hollow instead. (It used to be: push the boulder into the
// gully's mouth and, over the centuries, the hollow fills. Present: the millpond drains out
// through an open sluice whose wheel is long gone. Future: the mill is a pumping station and
// its little museum has the wheel. Close the sluice and the pond rises high enough to swim to
// the top of the cliff (or hop the log boom). In the Future it's a treated reservoir: hop it.
const MILL_WATER = [0x4a9ad8, 0x4a90c8, 0x5aff4a];
// The trough's three outlets, north to south. Each feeds a carved channel that the Past's scrub
// soon hides. The Present's dry pond bed still shows where each one led: two into sinkholes, and
// the south one all the way to the dam's sluice. That one is the old millrace.
const TROUGH_X = 198.5;
export const MILL_PLUGS = [
  { id: 'plugN', z: 0.9, name: 'north' },
  { id: 'plugMid', z: 3.5, name: 'middle' },
  { id: 'plugS', z: 6.0, name: 'south', good: true },
];

function millCliff(b, era) {
  const pal = era === P ? C.sandstone : era === M ? C.stoneMoss : C.metal;
  b.solid(L.millCliffX0, 0, ZMIN, L.millCliffX1, 2, 6, jitter(pal));
  // two steps back down to the road on the far side
  b.solid(L.millCliffX1 + 1, 0, 0, L.millCliffX1 + 1, 1, 6, jitter(pal));
  b.solid(L.millCliffX1 + 2, 0, 0, L.millCliffX1 + 2, 0, 6, jitter(pal));
}

/** Present/Future: stairs up to the dam rim, and a retaining wall behind the pond. */
function millDam(b, pal) {
  for (let i = 0; i < 3; i++) b.solid(L.rimX - 3 + i, 0, 0, L.rimX - 3 + i, i, 6, jitter(pal));
  b.solid(L.rimX, 0, ZMIN, L.rimX, 2, 6, jitter(pal));
  b.solid(L.pondX0, 0, -2, L.pondX1, 2, -1, jitter(pal));
}

/** The ladder up the inside of the dam, so a dry or shallow pond is never a trap. */
function millLadder(b, era) {
  b.ladder(L.pondX0, 0, 0, L.pondX0, 2, 0);
  const wood = era === F ? 0x5a6470 : C.wood[0];
  for (let y = 0; y < 3; y++) b.deco(L.pondX0 + 0.1, y + 0.4, 0.05, 0.8, 0.1, 0.12, wood);
  b.deco(L.pondX0 + 0.1, 0, 0.05, 0.1, 3, 0.12, wood);
  b.deco(L.pondX0 + 0.8, 0, 0.05, 0.1, 3, 0.12, wood);
}

function millHollow(world) {
  const t = L.boulderTarget;
  // PAST: the spring and its gully
  let b = world.staticBuilder(P);
  millCliff(b, P);
  b.waterfall(L.millCliffX0 - 0.5, L.millCliffX0 - 0.02, 0, 3.0, 3.2, 4.4, MILL_WATER[0]);
  // the trough along the cliff foot, brim-full, and the gully its overflow runs away down
  b.deco(TROUGH_X, 0, 0.3, 0.22, 0.55, 6.4, C.sandDark[0]);
  b.deco(TROUGH_X, 0, 0.3, 1.5, 0.55, 0.2, C.sandDark[0]);
  b.deco(TROUGH_X, 0, 6.5, 1.5, 0.55, 0.2, C.sandDark[0]);
  b.stream(TROUGH_X + 0.22, 0.5, L.millCliffX0 - 0.02, 6.5, MILL_WATER[0], 0.38);
  b.deco(TROUGH_X + 0.2, 0, -3.5, 1.2, 0.03, 3.8, 0x3a2a1a);
  for (const pl of MILL_PLUGS) {
    // each outlet's carved channel heads west, and is lost in the scrub
    b.deco(TROUGH_X - 1.3, 0, pl.z - 0.25, 1.3, 0.03, 0.5, 0x3a2a1a);
    for (let i = 0; i < 4; i++) b.deco(TROUGH_X - 2.6 + hash3(i, pl.z * 10, 3) * 1.3, 0, pl.z - 0.7 + hash3(i, 7, pl.z * 10) * 1.0, 0.7, 0.45 + hash3(i, 9, 2) * 0.5, 0.6, C.jungle[i % 5]);
  }
  b.solid(197, 0, ZMIN, 197, 3, -2, jitter(C.sandstone));
  filler(b, P, 183, t.x - 1, 91);
  wallTorch(b, L.millCliffX0 - 0.1, 1.2, 1.0);

  // PRESENT: the dam and the mill on the cliff top
  b = world.staticBuilder(M);
  millCliff(b, M);
  millDam(b, C.stone);
  b.solid(L.millCliffX0, 3, -5, L.millCliffX1, 7, -2, (x, y, z) => jitter(y < 5 ? C.stone : C.plaster)(x, y, z));
  b.roof(L.millCliffX0 - 0.45, L.millCliffX1 + 1.45, 8, -6.5, -0.6, 10.5, C.thatch[0], C.plaster[0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.deco(L.millCliffX0 - 0.3, 5 + Math.sin(a) * 1.8 - 0.2, -3.5 + Math.cos(a) * 1.8 - 0.2, 0.25, 0.4, 0.4, C.wood[i % 3]);
  }
  b.deco(L.millCliffX0 - 0.35, 4.8, -3.7, 0.3, 0.4, 0.4, 0x3a2614); // wheel hub
  b.glow(L.millCliffX0 + 1.5, 4.0, -1.95, 0.7, 0.8, 0.05, NEON.warm);
  b.light(L.millCliffX0 + 2, 4.5, 0.5, 0xffb060, 5, 8, 0.05);
  filler(b, M, 183, L.rimX - 3, 93);
  // the three old channels, still scored across the pond bed (see MILL_PLUGS): the north and
  // middle ones end in sinkholes; the south one, stone-lined, runs all the way to the sluice
  const groove = 0x40362c, pit = 0x0c0a08;
  b.deco(196.3, 0, 0.65, 2.2, 0.04, 0.5, groove);
  b.deco(195.2, 0, 0.35, 1.2, 0.05, 1.1, pit);
  for (const [ox, oz] of [[-0.3, 0.1], [1.1, 0.9], [0.2, 1.15]]) b.deco(195.2 + ox, 0, 0.35 + oz, 0.35, 0.22, 0.3, C.stoneMoss[1]);
  b.deco(196.05, 0, 2.55, 0.9, 0.05, 1.9, pit);
  for (const [ox, oz] of [[-0.25, 0.2], [0.75, 1.5]]) b.deco(196.05 + ox, 0, 2.55 + oz, 0.35, 0.22, 0.3, C.stoneMoss[1]);
  b.deco(L.pondX0, 0, 5.75, TROUGH_X - L.pondX0, 0.04, 0.5, groove);
  for (const oz of [5.62, 6.25]) b.deco(L.pondX0, 0, oz, TROUGH_X - L.pondX0, 0.09, 0.13, C.stone[2]);

  // FUTURE: the pumping station and its museum
  b = world.staticBuilder(F);
  millCliff(b, F);
  millDam(b, C.metalL);
  b.solid(L.millCliffX0, 3, -6, L.millCliffX1, 10, -2, jitter(C.metalL));
  for (let y = 4; y < 10; y += 2) b.glow(L.millCliffX0 + 0.3, y, -1.95, 4.4, 0.12, 0.05, NEON.cyan);
  b.glow(L.millCliffX0 + 0.4, 8.6, -1.9, 3.2, 0.8, 0.04, NEON.amber); // "PUMP STATION 7"
  // museum display case for the old sluice wheel
  b.deco(184.6, 0, 3.6, 0.9, 0.8, 0.9, 0x3a404c);
  b.glow(184.6, 0.8, 3.6, 0.9, 0.04, 0.9, NEON.cyan);
  for (const [ox, oz] of [[0, 0], [0.85, 0], [0, 0.85], [0.85, 0.85]]) b.deco(184.6 + ox, 0.8, 3.6 + oz, 0.05, 1.3, 0.05, 0x8a94a4);
  b.light(185, 2, 4, NEON.cyan, 4, 5, 0);
  filler(b, F, 183, L.rimX - 3, 95);

  world.addFeature({
    id: 'millP', eras: [P], key: (s) => String(!!s.flags.millDammed),
    build: (b, era, s) => {
      const x1 = L.millCliffX0 - 0.02;
      if (!s.flags.millDammed) {
        // the trough's overflow runs away north, down the gully
        b.stream(TROUGH_X + 0.3, -3.5, TROUGH_X + 1.3, 0.4, MILL_WATER[0]);
      } else {
        // out through the south outlet and down the old millrace: it spreads across the hollow floor
        b.stream(L.pondX0 + 0.2, 1.2, TROUGH_X, 6.8, MILL_WATER[0]);
      }
    },
  });
  world.addFeature({
    // the water, on its own so a time-lapse can raise just the water (see Game.timelapse)
    id: 'millWaterM', eras: [M], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => {
      const level = millLevel(s);
      if (level >= 0) b.water(L.pondX0, 0, 0, L.pondX1, level, 6, MILL_WATER[1], level ? 0.25 : 0.45); // clean spring water: swim it
    },
  });
  world.addFeature({
    // the log boom, on its own so it can float up with the water
    id: 'millBoomM', eras: [M], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => logBoom(b, M, Math.max(0, millLevel(s))),
  });
  world.addFeature({
    id: 'millM', eras: [M], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => {
      const { sluiceClosed: closed } = s.flags;
      const level = millLevel(s);
      if (level < 0) for (let i = 0; i < 14; i++) b.deco(L.pondX0 + hash3(i, 1, 3) * 8.5, 0, hash3(i, 2, 3) * 6.5, 0.6, 0.03, 0.08, 0x5a4a3a); // cracked mud
      millLadder(b, M);
      // the sluice on the rim: an open slot, or a shut gate with its brass wheel
      b.deco(L.rimX + 0.05, 3, 4.6, 0.12, 1.4, 0.12, C.wood[1]);
      b.deco(L.rimX + 0.05, 3, 6.6, 0.12, 1.4, 0.12, C.wood[1]);
      b.deco(L.rimX + 0.05, 4.3, 4.6, 0.12, 0.12, 2.1, C.wood[0]);
      b.deco(L.rimX + 0.2, closed ? 3.0 : 3.9, 4.75, 0.08, 0.5, 1.8, C.wood[2]);
      if (closed) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          b.deco(L.rimX + 0.4, 4.6 + Math.sin(a) * 0.35, 5.6 + Math.cos(a) * 0.35, 0.08, 0.12, 0.12, 0xd8a840);
        }
      }
    },
  });
  world.addFeature({
    id: 'millWaterF', eras: [F], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => {
      if (millLevel(s) !== 2) return;
      b.hazard(L.pondX0, 0, 0, L.pondX1, 2, 6, MILL_WATER[2], true, 0.25); // a treated reservoir, green like every other waterway in this age
      b.glow(L.pondX0, 2.77, 6.9, L.pondX1 - L.pondX0 + 1, 0.04, 0.08, NEON.cyan);
      b.light((L.pondX0 + L.pondX1) / 2, 3.5, 3.5, NEON.cyan, 5, 8, 0);
    },
  });
  world.addFeature({
    id: 'millBoomF', eras: [F], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => {
      const full = millLevel(s) === 2;
      logBoom(b, F, full ? 2 : 0);
      if (full) {
        // a lone pontoon off the walkway, with something shiny on it
        b.solid(195, 2, 6, 195, 2, 6, jitter(C.metalL));
        b.glow(195.05, 3.0, 6.05, 0.9, 0.04, 0.9, NEON.amber);
      }
    },
  });
  world.addFeature({
    id: 'millF', eras: [F], key: (s) => `${!!s.flags.millDammed},${!!s.flags.sluiceClosed}`,
    build: (b, era, s) => {
      if (millLevel(s) !== 2) for (let x = L.pondX0; x <= L.pondX1; x += 2) b.deco(x + 0.1, 0, 0.2, 0.06, 0.02, 6.6, 0x2a2f3a); // dry spillway
      millLadder(b, F);
    },
  });
}

/** Pond water: -1 dry, 0 shallow (sluice open), 2 brim-full (top cell; the cliffs are 3 high). */
function millLevel(s) {
  if (!s.flags.millDammed) return -1;
  return s.flags.sluiceClosed ? 2 : 0;
}

// The mill's log boom: three floating sections with hop-able gaps between them. They rest on
// the pond bed until the water is deep enough to lift them level with the dam and the cliff.
const BOOM = [[191, 192], [194, 195], [197, 199]];
function logBoom(b, era, y) {
  const pal = era === F ? C.metalL : C.log;
  for (const [x0, x1] of BOOM) {
    b.solid(x0, y, 2, x1, y, 4, jitter(pal));
    if (era === F) b.glow(x0 + 0.05, y + 1.0, 1.98, x1 - x0 + 0.9, 0.03, 0.05, NEON.cyan);
    else for (const z of [2.05, 4.85]) b.deco(x0, y + 0.95, z, x1 - x0 + 1, 0.08, 0.1, 0xc8a060); // rope lashings
  }
}

// ---------------------------------------------------------------------------
// Tamsin's Crossing
// ---------------------------------------------------------------------------
// Past: Tamsin will bridge the gorge if you bring rope that never rots (steel cable from the
// Future). The bridge rots away within a century, unless you hold it in its moment with the
// Stasis Seal. The far bank is a jungle cliff in the Past and a city wall in the Present, but
// only rubble in the Future, so the way on is to cross in the Future.
function bridgeDeck(b, era, glow = false) {
  const x0 = L.gorgeX0, x1 = L.gorgeX1;
  b.solid(x0, -1, 2, x1, -1, 4, jitter(C.wood));
  for (let x = x0; x <= x1 + 1; x += 3) {
    for (const z of [1.85, 4.95]) b.deco(x - 0.1, -0.2, z, 0.2, 1.3, 0.2, C.log[1]);
  }
  for (const z of [1.92, 5.02]) b.deco(x0, 0.95, z, x1 - x0 + 1, 0.06, 0.06, era === P ? 0xc8a060 : 0xa0a8b4);
  if (glow) {
    // a faint shimmer: this bridge is outside time
    b.glow(x0, 0.0, 1.98, x1 - x0 + 1, 0.03, 0.04, 0xbff6ff);
    b.glow(x0, 0.0, 4.98, x1 - x0 + 1, 0.03, 0.04, 0xbff6ff);
  }
}

function crossing(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const col = [0x3f8fc9, 0x3e8ab8, 0x5aff4a][era];
    b.hazard(L.gorgeX0, -4, ZMIN, L.gorgeX1, -2, ZMAX - 1, col, era === F, 0.5);
  }
  // PAST: the bridgewright's yard, and a sheer jungle cliff on the far bank
  let b = world.staticBuilder(P);
  b.solid(L.pastCliffX0, 0, ZMIN, L.pastCliffX1, 12, 7, (x, y, z) => jitter(hash3(x, y, z) < 0.3 ? C.jungle : C.sandDark)(x, y, z));
  for (let i = 0; i < 4; i++) b.deco(208.2 + i * 0.9, 0, 0.2, 0.7, 0.35, 0.7, C.thatch[i % 3]); // rope coils
  b.deco(L.gorgeX0 - 0.9, 0, 1.9, 0.25, 1.4, 0.25, C.log[0]);
  b.deco(L.gorgeX0 - 0.9, 0, 4.9, 0.25, 1.4, 0.25, C.log[0]);
  filler(b, P, L.crossingX0, L.gorgeX0 - 1, 101);

  // PRESENT: the city wall on the far bank
  b = world.staticBuilder(M);
  b.solid(L.farWallX0, 0, ZMIN, L.farWallX1, 8, 6, jitter(C.stone));
  for (let z = ZMIN; z <= 6; z += 2) b.solid(L.farWallX0, 9, z, L.farWallX1, 9, z, jitter(C.stone));
  b.deco(L.farWallX0 - 0.06, 0, 2.1, 0.08, 2.8, 2.8, 0x4a3420); // barred gate
  for (let z = 2.3; z < 4.9; z += 0.45) b.deco(L.farWallX0 - 0.12, 0, z, 0.06, 2.8, 0.08, 0x3a3a42);
  b.deco(L.farWallX0 - 0.04, 4.5, 3.0, 0.06, 1.8, 1.0, 0xb22a2a); // city banner
  for (let i = 0; i < 6; i++) b.deco(208 + hash3(i, 4, 4) * 3, 0, 0.1 + hash3(i, 5, 5) * 0.6, 0.06, 0.6 + hash3(i, 6, 6) * 0.5, 0.06, C.grassM[i % 5]); // reeds
  filler(b, M, L.crossingX0, L.gorgeX0 - 1, 103);

  // FUTURE: a scrapyard on this bank; the wall is rubble now
  b = world.staticBuilder(F);
  b.solid(L.farWallX0, 0, 0, L.farWallX0, 0, 6, jitter(C.stone));
  b.solid(L.farWallX0, 1, 0, L.farWallX1, 3, 0, jitter(C.stone));
  b.solid(L.farWallX0, 1, 6, L.farWallX0, 2, 6, jitter(C.stone));
  b.solid(L.farWallX0, 0, ZMIN, L.farWallX1, 4, -1, jitter(C.stoneMoss));
  for (let i = 0; i < 5; i++) b.deco(208.6 + i * 0.7, 0, 4.3 + hash3(i, 1, 9) * 1.5, 0.6, 0.4 + hash3(i, 2, 9) * 0.7, 0.6, rng5(i));
  b.glow(L.gorgeX0 - 1, 0.02, 1.9, 0.9, 0.04, 3.2, 0xff3040); // "bridge out" floor marking
  filler(b, F, L.crossingX0, L.gorgeX0 - 1, 105);
  filler(b, F, L.farWallX1 + 1, L.echoX0 + 1, 106);

  world.addFeature({
    id: 'bridgeP', eras: [P], key: (s) => `${!!s.flags.bridgeBuilt},${!!s.flags.bridgeSealed}`,
    build: (b, era, s) => {
      if (s.flags.bridgeBuilt) bridgeDeck(b, P, !!s.flags.bridgeSealed);
      else for (const z of [2.1, 4.1]) b.deco(L.gorgeX0 - 0.6, 0, z, 0.2, 0.7, 0.2, C.log[2]); // stakes, waiting for rope
    },
  });
  world.addFeature({
    id: 'bridgeM', eras: [M], key: (s) => String(!!s.flags.bridgeSealed),
    build: (b, era, s) => {
      if (s.flags.bridgeSealed) bridgeDeck(b, M, true);
      else for (const x of [L.gorgeX0, L.gorgeX1]) for (const z of [1.85, 4.95]) b.deco(x - 0.1, -0.6, z, 0.2, 0.7, 0.2, 0x4a3a2a); // rotted stumps
    },
  });
  world.addFeature({
    id: 'bridgeF', eras: [F], key: (s) => String(!!s.flags.bridgeSealed),
    build: (b, era, s) => {
      if (s.flags.bridgeSealed) bridgeDeck(b, F, true);
    },
  });
}
const rng5 = (i) => [0x5b6472, 0x8a4a2a, 0x3a404c, 0x7a8494, 0x9a5a32][i % 5];

// ---------------------------------------------------------------------------
// The Echo Gallery
// ---------------------------------------------------------------------------
// A 4-high gallery wall. In the Present, three buttons each raise a stone step while something
// stands on them, and echoes (which only form in the Present) can stand there for you. In the
// Past and the Future the wall is simply there. Once you've climbed it, you kick down a rope
// ladder so the way back west never needs echoes again.
function echoGallery(world) {
  const pals = [C.sandstone, C.stone, C.metalL];
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    b.solid(L.galleryX0, 0, ZMIN, L.galleryX1, 3, 6, jitter(pals[era]));
    b.solid(L.galleryX0, 4, ZMIN, L.galleryX1, 9, -1, jitter(pals[era])); // the gallery's back wall
    if (era === F) b.glow(L.galleryX0 - 0.03, 3.8, 0, 0.05, 0.12, 7, NEON.cyan);
  }
  // PAST / FUTURE: the gate section is a solid wall, so the gates can't be skipped by changing era
  for (const era of [P, F]) world.staticBuilder(era).solid(L.gatesX0, 0, 0, L.gatesX1, 4, 6, jitter(pals[era]));
  let b = world.staticBuilder(P);
  filler(b, P, L.pastCliffX1 + 1, L.galleryX0 - 1, 111);
  wallTorch(b, L.galleryX0 - 0.1, 1.5, 3.0);
  b = world.staticBuilder(F);
  filler(b, F, L.echoX0 + 2, L.galleryX0 - 1, 115);
  // PRESENT: Donald Eugene's lectern by the entrance, and the sockets the steps rise out of
  b = world.staticBuilder(M);
  b.deco(230.15, 0, 0.1, 0.7, 1.0, 0.6, C.wood[1]);
  b.deco(230.05, 1.0, 0.05, 0.9, 0.08, 0.7, C.wood[2]);
  for (const g of ECHO_GATES) b.deco(g.x + 0.3, 0, 0, 0.4, 0.03, 7, 0x1a1a20); // slots the gates rise out of
  for (const s of ECHO_STEPS) b.deco(s.x0 + 0.05, 0, s.z0 + 0.05, s.x1 - s.x0 + 0.9, 0.04, s.z1 - s.z0 + 0.9, 0x3a3a42);
  wallTorch(b, L.galleryX0 - 0.1, 1.5, 0.4);
  wallTorch(b, L.galleryX0 - 0.1, 1.5, 6.2);
  filler(b, M, L.farWallX1 + 1, L.galleryX0 - 1, 113);

  world.addFeature({
    id: 'galleryLadder', eras: [P, M, F], key: (s) => String(!!s.flags.galleryClimbed),
    build: (b, era, s) => {
      if (!s.flags.galleryClimbed) return;
      // one rope ladder up the front, and one down the far side so you can always come back
      const rope = era === F ? 0x8a94a4 : 0xc8a060;
      for (const lx of [L.galleryX0 - 1, L.yardX0 - 1]) {
        b.ladder(lx, 0, 0, lx, 3, 0);
        for (let y = 0; y < 4; y++) b.deco(lx + 0.1, y + 0.4, 0.1, 0.8, 0.08, 0.12, rope);
        b.deco(lx + 0.1, 0, 0.1, 0.06, 4, 0.1, rope);
        b.deco(lx + 0.84, 0, 0.1, 0.06, 4, 0.1, rope);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// The Warden's Courtyard
// ---------------------------------------------------------------------------
// The Clocktower's lock only turns in the Present, but its key lies in the Future courtyard,
// where the Warden patrols around it. In the Present that spot is inside a fountain, so you
// can't just pop into the Future on top of the key: you have to get there in the Future,
// out of the Warden's sight, behind its pillars.
export const WARDEN_PATH = [[267.5, 0.9], [279.5, 0.9], [279.5, 6.1], [267.5, 6.1]];
// Future cover, 2 high: a trail of pillars from the gate, and a ring of them around the key
const YARD_PILLARS = [[258, 3], [260, 1], [260, 5], [262, 3], [264, 1], [264, 5], [266, 3], [270, 2], [270, 5], [272, 4], [275, 4], [276, 2], [277, 5]];

function wardenYard(world) {
  const k = L.keySpot;
  // PAST: a jungle clearing
  let b = world.staticBuilder(P);
  filler(b, P, L.yardX0 + 1, L.towerX0 - 1, 121);
  for (let i = 0; i < 10; i++) b.deco(L.yardX0 + 2 + hash3(i, 3, 7) * 26, 0, 6.2 + hash3(i, 4, 7) * 0.6, 0.5, 0.4 + hash3(i, 5, 7) * 0.5, 0.5, C.jungle[i % 5]);
  // Oren's building site, at the foot of the tower-to-be: cut stone, and the stranger's cart of iron wheels
  {
    const sx = L.towerX0 - 3.4;
    for (const [ox, oy, oz] of [[0, 0, 0], [0.75, 0, 0.05], [1.5, 0, 0], [0.35, 0.5, 0.05], [1.1, 0.5, 0], [0.7, 1.0, 0.03]]) b.deco(sx + ox, oy, 0.3 + oz, 0.7, 0.5, 0.6, C.sandstone[((ox * 4 + oy * 2) | 0) % 3]);
    const cx = L.towerX0 - 6.6;
    b.deco(cx, 0.3, 0.35, 1.3, 0.12, 0.7, C.log[0]); // the cart's bed
    b.deco(cx, 0.42, 0.35, 1.3, 0.3, 0.06, C.log[1]);
    b.deco(cx, 0.42, 0.99, 1.3, 0.3, 0.06, C.log[1]);
    for (const ox of [0.15, 0.95]) b.deco(cx + ox, 0, 1.06, 0.36, 0.36, 0.06, C.log[1]); // its wheels
    b.deco(cx + 0.15, 0.46, 0.5, 0.42, 0.42, 0.07, 0x6a6a74); // gear wheels, stacked in it
    b.deco(cx + 0.55, 0.5, 0.62, 0.5, 0.5, 0.07, 0x8a8a94);
    b.deco(cx + 0.3, 0.52, 0.76, 0.34, 0.34, 0.07, 0xb8892e);
  }
  // PRESENT: a courtyard with a fountain over the key's spot
  b = world.staticBuilder(M);
  b.solid(272, 0, 1, 275, 1, 4, jitter(C.stone));
  b.deco(272.3, 2.0, 1.3, 3.4, 0.04, 3.4, 0x4a90c8); // water in the basin
  b.solid(273, 2, 2, 274, 2, 3, jitter(C.stone));
  b.glow(273.4, 3.0, 2.4, 1.2, 0.05, 1.2, 0x9fe0ff);
  for (const x of [259, 266, 280]) lampPost(b, x, 0, M);
  // Donald Eugene's toolbox, just inside the gate (the escape wheel that teaches Tempo)
  b.deco(L.yardX0 + 3.2, 0, 0.3, 0.9, 0.4, 0.5, 0x7a5232);
  b.deco(L.yardX0 + 3.2, 0.4, 0.3, 0.9, 0.06, 0.5, 0x5a3a22);
  b.deco(L.yardX0 + 3.55, 0.2, 0.8, 0.2, 0.14, 0.03, 0xc9a44a);
  filler(b, M, L.yardX0 + 1, L.towerX0 - 1, 123);
  // FUTURE: the patrolled yard, its cover pillars, and the key's pedestal
  b = world.staticBuilder(F);
  for (const [x, z] of YARD_PILLARS) {
    b.solid(x, 0, z, x, 1, z, jitter(C.metalL));
    b.glow(x + 0.1, 2.0, z + 0.1, 0.8, 0.04, 0.8, NEON.magenta);
  }
  for (const [x, z] of WARDEN_PATH) b.glow(x - 0.2, 0.0, z - 0.2, 0.4, 0.03, 0.4, 0xff3040); // patrol markers
  b.deco(k.x - 0.35, 0, k.z - 0.35, 0.7, 0.75, 0.7, 0x3a404c);
  b.deco(k.x - 0.33, 0.75, k.z - 0.33, 0.66, 0.05, 0.66, 0x141a24);
  for (const oz of [-0.33, 0.27]) b.glow(k.x - 0.33, 0.77, k.z + oz, 0.66, 0.04, 0.06, NEON.amber);
  b.light(k.x, 2.6, k.z + 0.8, NEON.amber, 3, 6, 0);
  filler(b, F, L.yardX0 + 1, L.towerX0 - 1, 125);

  // The Clocktower door. Only the Present one has a lock that still turns.
  world.addFeature({
    id: 'towerDoor', eras: [P, M, F], key: (s) => String(!!s.flags.towerUnlocked),
    build: (b, era, s) => {
      const x = L.towerX0;
      if (era === M && s.flags.towerUnlocked) {
        // swung open
        b.deco(x + 0.1, 0, 0.1, 0.9, 3.9, 0.15, C.wood[0]);
        b.deco(x + 0.1, 0, 6.75, 0.9, 3.9, 0.15, C.wood[0]);
        b.light(x + 1, 2, 3.5, 0xffd8a0, 5, 8, 0);
        return;
      }
      const pal = era === P ? C.sandDark : era === M ? C.wood : C.rust;
      b.solid(x, 0, 0, x, 3, 6, jitter(pal));
      if (era === M) {
        // the great lock: brass plate and keyhole
        b.deco(x - 0.08, 1.2, 3.0, 0.1, 1.0, 1.0, 0xc9a44a);
        b.deco(x - 0.12, 1.45, 3.4, 0.06, 0.45, 0.2, 0x1a1208);
        b.glow(x - 0.1, 2.3, 3.1, 0.04, 0.06, 0.8, 0xffd070);
      } else if (era === F) {
        b.deco(x - 0.08, 1.2, 3.0, 0.1, 1.0, 1.0, 0x5a3a2a); // rusted solid
      }
    },
  });
}

// ---------------------------------------------------------------------------
// The Clocktower: the finale climb
// ---------------------------------------------------------------------------
// Three keys, three heights, three powers. The Sun pedestal stands on a high west ledge that
// only the Past's ancient stair still reaches. Placing it wakes the Tower, and its great piston
// (Present) rises while its button is held: an echo rides you up to the belfry and the bell.
// The reactor deck is above that, in the Future, where the belfry floor has long rotted away:
// seal it in the Present, then climb the Future gantry.
export const TOWER = {
  ledge: { x0: L.towerX0 + 1, x1: L.towerX0 + 4, z1: 2, top: 6 }, // the Sun pedestal's ledge
  stairX0: L.towerX0 + 5, // Past stair: 5 steps climbing west to the ledge
  belfry: { x0: L.towerX0 + 8, x1: L.towerX0 + 13, z1: 2, top: 12 },
  piston: { x0: L.towerX0 + 14, x1: L.towerX0 + 15, z0: 2, z1: 4, h: 12 },
  pistonButton: { x: L.towerX0 + 6, z: 5, y: 0 },
  deck: { x0: L.towerX0 + 17, x1: L.towerX0 + 19, z1: 3, top: 16 }, // Future reactor deck
};

function tower(world) {
  const X = (x) => x + TO;
  const T = TOWER;
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const pal = era === P ? C.sandstone : era === M ? C.stone : C.metalL;
    b.solid(L.towerX0, 0, ZMIN, L.towerX1, 22, -1, jitter(pal));
    b.solid(L.towerX0, 4, 0, L.towerX0, 12, 6, jitter(pal));
    b.solid(L.towerX1 - 1, 0, 0, L.towerX1, 22, 6, jitter(pal));
    // the high west ledge stands in every age; only the Past has a way up
    b.solid(T.ledge.x0, 0, 0, T.ledge.x1, T.ledge.top - 1, T.ledge.z1, jitter(pal));
    if (era === P) {
      b.glow(X(189), 5, 0.0, 6, 6, 0.04, 0xe8b040);
      b.deco(X(189.6), 5.6, 0.04, 4.8, 4.8, 0.04, 0x8a5a1a);
      b.glow(X(191.2), 7.2, 0.08, 1.6, 1.6, 0.04, 0xffe070);
      for (const cx of [184, 195, 200]) b.solid(X(cx), 0, -1, X(cx), 10, -1, jitter(C.sandDark));
      wallTorch(b, X(185), 2, 0.0);
      wallTorch(b, X(199), 2, 0.0);
      // the ancient stair, climbing west to the ledge
      for (let i = 0; i < 5; i++) b.solid(T.stairX0 + 4 - i, 0, 0, T.stairX0 + 4 - i, i, 1, jitter(C.sandDark));
      // the Sun pedestal on the ledge
      b.solid(T.ledge.x0 + 1, T.ledge.top, 1, T.ledge.x0 + 1, T.ledge.top, 1, jitter(C.sandDark));
      b.glow(T.ledge.x0 + 1.1, T.ledge.top + 1.0, 1.1, 0.8, 0.05, 0.8, 0xffcf5a);
    } else if (era === M) {
      b.deco(X(186), 6, 0.0, 9, 9, 0.06, 0x6a4a1a);
      b.glow(X(186.3), 6.3, 0.04, 8.4, 8.4, 0.04, 0x8a7a58); // the clock face: lit, but not blinding
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.deco(X(190.5) + Math.cos(a) * 3.5 - 0.2, 10.5 + Math.sin(a) * 3.5 - 0.2, 0.1, 0.4, 0.4, 0.04, 0x2a2014);
      }
      b.deco(X(190.4), 10.5, 0.12, 0.2, 3, 0.04, 0x2a2014);
      b.deco(X(190.4), 10.4, 0.12, 2.2, 0.2, 0.04, 0x2a2014);
      // the stair that collapsed long ago
      for (let i = 0; i < 6; i++) b.deco(T.stairX0 + hash3(i, 3, 3) * 4, 0, 0.1 + hash3(i, 4, 3) * 1.6, 0.6, 0.3, 0.5, C.stone[i % 5]);
      // the belfry: a timber floor high up, the great bell hanging over it
      b.solid(T.belfry.x0, T.belfry.top - 1, 0, T.belfry.x1, T.belfry.top - 1, T.belfry.z1, jitter(C.wood));
      for (const x of [T.belfry.x0, T.belfry.x1]) b.deco(x + 0.4, T.belfry.top, 0.1, 0.2, 3.2, 0.2, C.wood[1]);
      b.deco(T.belfry.x0 + 0.4, T.belfry.top + 3.0, 0.1, T.belfry.x1 - T.belfry.x0 + 0.2, 0.25, 0.25, C.wood[0]);
      const bx = T.belfry.x0 + 2.5;
      b.deco(bx - 0.1, T.belfry.top + 2.6, 0.6, 0.2, 0.45, 0.2, 0x3a2614);
      b.deco(bx - 0.75, T.belfry.top + 1.3, 0.35, 1.5, 1.3, 1.0, 0xc9a44a);
      b.deco(bx - 0.95, T.belfry.top + 1.1, 0.15, 1.9, 0.3, 1.4, 0xb8933a);
      b.light(bx, T.belfry.top + 2, 2, 0xffd8a0, 7, 12, 0);
      b.light(X(185), 2.5, 2, 0xffb060, 5, 8, 0.05);
      // the piston's shaft in the floor
      b.deco(T.piston.x0 + 0.05, 0, T.piston.z0 + 0.05, 1.9, 0.04, 2.9, 0x1a1a20);
    } else {
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        b.glow(X(192) + Math.cos(a) * 4, 9 + Math.sin(a) * 4, 0.04, 0.4, 0.4, 0.04, NEON.cyan);
      }
      b.glow(X(191.4), 8.4, 0.06, 1.2, 1.2, 0.04, 0xc8fcff);
      for (let y = 1; y < 20; y += 4) b.glow(L.towerX0 + 0.5, y, 0.0, 19, 0.08, 0.04, NEON.magenta);
      // the gantry up from the belfry's height to the reactor deck
      const d = T.deck, top = T.belfry.top;
      for (let i = 0; i < 3; i++) b.solid(T.belfry.x1 + 1 + i, top - 1, 0, T.belfry.x1 + 1 + i, top + i, 1, jitter(C.metalL));
      b.solid(d.x0, top - 1, 0, d.x1, d.top - 1, d.z1, jitter(C.metal));
      b.glow(d.x0, d.top + 0.01, d.z1 + 0.9, d.x1 - d.x0 + 1, 0.04, 0.08, NEON.cyan);
      // the reactor socket on the deck
      b.solid(d.x0 + 1, d.top, 1, d.x0 + 1, d.top, 1, jitter(C.panel));
      b.glow(d.x0 + 1.1, d.top + 1.0, 1.1, 0.8, 0.05, 0.8, NEON.cyan);
      b.light(d.x0 + 1.5, d.top + 1.5, 1.5, NEON.cyan, 6, 8, 0);
      // a broken stub where the belfry floor used to be
      b.deco(T.belfry.x1 - 0.5, top - 1, 0.1, 1.4, 0.3, 1.8, C.rust[0]);
    }
  }
  // the belfry floor survives into the Future only if it was sealed in its moment
  world.addFeature({
    id: 'belfryF', eras: [F], key: (s) => String(!!s.flags.belfrySealed),
    build: (b, era, s) => {
      if (!s.flags.belfrySealed) return;
      const bf = TOWER.belfry;
      b.solid(bf.x0, bf.top - 1, 0, bf.x1, bf.top - 1, bf.z1, jitter(C.wood));
      b.glow(bf.x0, bf.top - 0.02, bf.z1 + 0.96, bf.x1 - bf.x0 + 1, 0.03, 0.04, 0xbff6ff);
    },
  });
}

// ---------------------------------------------------------------------------
// The Gearworks: inside the clock (opens when the third key goes in)
// ---------------------------------------------------------------------------
// Four rooms climbing east and up, each taught by one use of Tempo (see gearworks.js):
//   hammers that slam too fast to slip under (slow them), a spring plate that only kicks hard
//   enough when it runs fast, the two together, and a lift the Tower's stutter keeps throwing
//   back down (hurry it up, then hold it at the top). The great mainspring waits at the summit.
export const GEAR = {
  x0: L.gearX0, x1: W - 1,
  ledgeA: { x0: 321, x1: 330, top: 4 },
  floorB: { x0: 331, x1: W - 1, top: 8 },
  summit: { x0: 336, x1: W - 1, top: 14 },
  hammers: [{ x: 312, y: 0 }, { x: 315, y: 0 }, { x: 325, y: 4 }, { x: 328, y: 4 }],
  springs: [{ x: 320, y: 0, z0: 2, z1: 4 }, { x: 330, y: 4, z0: 2, z1: 4 }],
  lift: { x0: 334, x1: 335, z0: 2, z1: 4, y: 8, h: 6 },
  mainspring: { x: 341.5, y: 14, z: 3.5 },
  pins: [
    { id: 'escapePin0', x: 337.5, y: 14, z: 1.8, flag: 'pin0Locked', name: 'west escapement pin', speed: 4.4 },
    { id: 'escapePin1', x: 339.6, y: 14, z: 5.1, flag: 'pin1Locked', name: 'south escapement pin', speed: -5.2 },
    { id: 'escapePin2', x: 343.2, y: 14, z: 2.0, flag: 'pin2Locked', name: 'east escapement pin', speed: 5.8 },
  ],
};

function gearworks(world) {
  world.addFeature({
    id: 'gearworks', eras: [P, M, F], key: (s) => String(!!s.flags.gearworksOpen),
    build: (b, era, s) => {
      if (!s.flags.gearworksOpen) return;
      const G = GEAR;
      const iron = [0x3a3a44, 0x44444f, 0x34343c, 0x4a4a55];
      const brass = [0xb8862a, 0xa8782a, 0xc9963a];
      const wall = jitter(era === F ? C.metal : era === P ? C.sandDark : iron);
      // the back of the clock case, and its east wall
      b.solid(G.x0, 0, -3, G.x1, 24, -1, wall);
      b.solid(G.x1, 0, 0, G.x1, 24, 6, wall);
      // a brass-plated floor, and the three rising levels
      b.solid(G.x0, -1, 0, G.x1, -1, 6, jitter(brass));
      b.solid(G.ledgeA.x0, 0, 0, G.ledgeA.x1, G.ledgeA.top - 1, 6, wall);
      b.solid(G.floorB.x0, 0, 0, G.floorB.x1, G.floorB.top - 1, 6, wall);
      b.solid(G.summit.x0, G.floorB.top, 0, G.summit.x1, G.summit.top - 1, 6, wall);
      // brass trim along every edge you can stand on
      for (const [x0, x1, top] of [[G.ledgeA.x0, G.ledgeA.x1, G.ledgeA.top], [G.floorB.x0, G.floorB.x1, G.floorB.top], [G.summit.x0, G.summit.x1, G.summit.top]])
        b.glow(x0, top - 0.06, 6.98, x1 - x0 + 1, 0.06, 0.04, 0xffc860);
      // rivets and panel seams on the back wall
      for (let x = G.x0; x <= G.x1; x += 3) b.deco(x + 0.1, 0, -0.02, 0.08, 24, 0.04, 0x22222a);
      for (let y = 3; y < 24; y += 4) b.deco(G.x0, y, -0.02, G.x1 - G.x0 + 1, 0.08, 0.04, 0x22222a);
      // the great mainspring at the summit: a coil of bright star-iron on the back wall
      const ms = G.mainspring;
      for (let i = 0; i < 40; i++) {
        const a = i * 0.45, r = 0.3 + i * 0.07;
        b.glow(ms.x + Math.cos(a) * r - 0.12, ms.y + 3.2 + Math.sin(a) * r - 0.12, -0.04, 0.24, 0.24, 0.05, i % 3 ? 0xffd070 : 0xfff2c0);
      }
      b.solid(ms.x - 0.5, ms.y, 1, ms.x - 0.5, ms.y, 1, jitter(brass)); // its winding post
      b.light(ms.x, ms.y + 3, 1.5, 0xffd070, 8, 10, 0);
      b.light(G.x0 + 3, 3, 2, 0xffb060, 6, 9, 0.1);
      b.light(326, 7, 2, 0xffb060, 6, 9, 0.1);
      // the way back down, beside the shrine
      b.glow(G.x0 + 0.02, 0, 4, 0.04, 2.2, 1.0, 0xffd8a0);
      // an iron railing along the front, and lamps to see the machines by
      b.deco(G.x0, 0.9, 7.3, G.x1 - G.x0 + 1, 0.12, 0.12, 0x55555f);
      b.deco(G.x0, 0.45, 7.3, G.x1 - G.x0 + 1, 0.08, 0.1, 0x44444f);
      for (let x = G.x0; x <= G.x1; x += 2) b.deco(x + 0.45, 0, 7.28, 0.1, 1.0, 0.14, 0x3a3a44);
      for (const [lx, ly] of [[311, 4], [316, 4], [320, 6], [326, 8], [331, 11], [335, 14], [340, 18]]) {
        b.glow(lx + 0.35, ly, -0.06, 0.3, 0.4, 0.08, 0xffd890);
        b.light(lx + 0.5, ly, 1.2, 0xffc070, 7, 9, 0.12);
      }
    },
  });
  // the doorway up into the clock, on the Tower's east wall
  world.addFeature({
    id: 'gearDoor', eras: [M], key: (s) => String(!!s.flags.gearworksOpen),
    build: (b, era, s) => {
      if (!s.flags.gearworksOpen) return;
      b.glow(L.towerX1 - 1 - 0.04, 0, 4, 0.04, 2.2, 1.0, 0xffd8a0);
      b.light(L.towerX1 - 2, 1.5, 4.5, 0xffd070, 5, 7, 0);
    },
  });
}

// ---------------------------------------------------------------------------
// Entity spawns
// ---------------------------------------------------------------------------
export const SPAWNS = [
  // NPCs
  { type: 'npc', id: 'louise', era: M, x: 20.5, z: 1.8, sheet: 'louise', name: 'Elder Karen Louise' },
  { type: 'npc', id: 'samaria', era: P, x: 18.5, z: 2.0, sheet: 'samaria', name: 'Samaria the Sun-Keeper' },
  { type: 'npc', id: 'tick', era: F, x: 12.5, z: 2.0, sheet: 'tick', name: 'TICK (Archivist Unit)', hover: true },
  { type: 'npc', id: 'holo', era: F, x: 16.9, y: 1, z: 0.5, sheet: 'eugene', name: 'Memorial Hologram', holo: true },
  { type: 'npc', id: 'michelle', era: M, x: 35.5, z: 2.2, sheet: 'michelle', name: 'Lyra the Wise' },
  { type: 'npc', id: 'zach', era: M, x: 84.5, y: 1, z: 1.5, sheet: 'zach', name: 'Zach Tiberious', small: true },
  { type: 'npc', id: 'megan', era: M, x: 86.5, y: 2, z: 1.5, sheet: 'megan', name: 'Megan the Squirrel', small: true },
  { type: 'npc', id: 'aria', era: M, x: 110.2, z: 1.0, sheet: 'aria', name: 'Aria the Smith' },
  { type: 'npc', id: 'callie', era: P, x: 110.5, z: 1.2, sheet: 'callie', name: 'Callie the Carver' },
  { type: 'npc', id: 'lillian', era: F, x: 120.5, z: 1.2, sheet: 'lillian', name: 'Lillian' },
  { type: 'npc', id: 'brn', era: F, x: 122.6, z: 1.0, sheet: 'brn', name: 'BR-4N' },
  { type: 'npc', id: 'sheng', era: M, x: 160.5, z: 1.2, sheet: 'sheng', name: 'Sheng the Gatekeeper' },
  { type: 'npc', id: 'hobb', era: M, x: 186.2, z: 2.6, sheet: 'hobb', name: 'Hobb the Miller' },
  { type: 'npc', id: 'tamsin', era: P, x: 210.5, z: 1.4, sheet: 'tamsin', name: 'Tamsin the Ropewright' },
  { type: 'npc', id: 'oren', era: P, x: L.towerX0 - 4.5, z: 1.7, sheet: 'oren', name: 'Oren the Mason' },
  // home again, once the story is told
  { type: 'npc', id: 'eugene', era: M, x: 10.9, z: 1.5, sheet: 'eugene', name: 'Donald Eugene', needs: 'finished' },

  // Interactables
  { type: 'interact', id: 'workbench', era: M, x: 9.0, y: 1, z: 0.5, prompt: 'Examine workbench' },
  { type: 'interact', id: 'astralDoor', era: M, x: GARDEN.door, y: 0, z: 0.15, prompt: 'Star-iron door', reach: 1.05 },
  { type: 'interact', id: 'gardenPlinth', era: F, x: (GARDEN.x0 + GARDEN.x1 + 1) / 2, y: 0, z: -2.0, prompt: 'Memorial of the Four Clockmakers', reach: 1.3 },
  { type: 'interact', id: 'wildLilies', era: P, x: 23.5, y: 0, z: 5.5, prompt: 'Wild flowers' },
  { type: 'interact', id: 'lilyBed', era: M, x: 23.5, y: 0, z: 5.5, prompt: 'Flower bed' },
  { type: 'interact', id: 'lever', era: P, x: 63.4, y: 0, z: 0.35, prompt: 'Spring lever', needs: 'springOpen' },
  // things only the wrench will shift: three good hits each
  { type: 'strike', id: 'leverJam', era: P, x: 63.4, y: 0, z: 0.35, flag: 'springOpen', prompt: 'Strike the seized lever', hz: 1.7 },
  ...MILL_PLUGS.map((pl) => ({ type: 'strike', id: pl.id, era: P, x: TROUGH_X - 0.15, y: 0, z: pl.z, flag: 'millDammed', prompt: `Strike the ${pl.name} plug`, hx: 0.95, hz: 0.9, keep: !pl.good })),
  { type: 'strike', id: 'shutterLock', era: F, x: 172.6, y: 0, z: 3.5, flag: 'shutterBroken', prompt: 'Strike the rusted lock', hx: 1.1, hz: 1.9 },
  ...GEAR.pins.map((pin) => ({ type: 'strike', id: pin.id, era: M, x: pin.x, y: pin.y, z: pin.z, flag: pin.flag, prompt: `Strike the ${pin.name}`, hx: 1.15, hz: 1.35 })),
  { type: 'interact', id: 'swimSign', era: F, x: L.pitX0 - 1.1, y: 0, z: 0.9, prompt: 'Pool sign', needs: 'springOpen' },
  { type: 'interact', id: 'cliffSign', era: M, x: 64.5, y: 0, z: 0.5, prompt: 'Inspect cliff' },
  { type: 'interact', id: 'soil', era: P, x: 92.5, y: 0, z: 3.5, prompt: 'Fertile soil' },
  { type: 'interact', id: 'soilM', era: M, x: 92.5, y: 0, z: 3.5, prompt: 'Planter box', hideIf: 'acornPlanted' },
  { type: 'interact', id: 'vault', era: M, x: 112.5, y: 1, z: 0.5, prompt: 'Quench vault' },
  { type: 'interact', id: 'glyphP', era: P, x: 136.5, y: 0, z: 0.5, prompt: 'Reset glyph', resets: 'block' },
  { type: 'interact', id: 'glyphF', era: F, x: 136.5, y: 0, z: 0.5, prompt: 'Reset beacon', resets: 'crate' },
  { type: 'interact', id: 'sluice', era: M, x: L.rimX + 0.5, y: 3, z: 5.6, prompt: 'Sluice gate' },
  { type: 'interact', id: 'satchel', era: M, x: 208.5, y: 0, z: 0.6, prompt: "Donald Eugene's satchel", icon: 'satchel', goneFlag: 'hasSeal' },
  { type: 'interact', id: 'studyDoor', era: P, x: STUDY.door - 0.4, y: 0, z: 0.1, prompt: 'Knock', reach: 0.95 },
  { type: 'interact', id: 'everspring', era: P, x: STUDY.x1 - 1.5, y: 1, z: -2.4, prompt: "Donald Eugene's workbench", icon: 'everspring', goneFlag: 'steadyHeart' },
  { type: 'interact', id: 'echoLens', era: M, x: 230.5, y: 1, z: 0.5, prompt: "Donald Eugene's lectern", icon: 'lens', goneFlag: 'hasEcho' },
  { type: 'interact', id: 'tempoGift', era: M, x: L.yardX0 + 3.6, y: 0, z: 0.7, prompt: "Donald Eugene's toolbox", icon: 'escapement', goneFlag: 'hasTempo' },
  // what the valley remembers of her (see legacies())
  { type: 'interact', id: 'statueM', era: M, x: STATUE.x, y: 0, z: STATUE.z + 0.7, prompt: 'Old statue', needs: 'chartReturned' },
  { type: 'interact', id: 'statueF', era: F, x: STATUE.xF, y: 0, z: STATUE.z + 0.7, prompt: 'Museum exhibit', needs: 'chartReturned' },
  { type: 'interact', id: 'bridgeStoneM', era: M, x: BRIDGE_STONE.x, y: 0, z: BRIDGE_STONE.z + 0.3, prompt: 'Waymarker', needs: 'bridgeSealed' },
  { type: 'interact', id: 'bridgeStoneF', era: F, x: BRIDGE_STONE.x, y: 0, z: BRIDGE_STONE.z + 0.3, prompt: 'Heritage marker', needs: 'bridgeSealed' },
  { type: 'interact', id: 'lockM', era: M, x: L.towerX0 - 0.6, y: 0, z: 3.5, prompt: 'Clocktower door' },
  { type: 'interact', id: 'lockP', era: P, x: L.towerX0 - 0.6, y: 0, z: 3.5, prompt: 'Stone door' },
  { type: 'interact', id: 'lockF', era: F, x: L.towerX0 - 0.6, y: 0, z: 3.5, prompt: 'Rusted door' },
  { type: 'interact', id: 'postern', era: M, x: 182.7, y: 0, z: 5.4, prompt: 'Old postern lever' },
  { type: 'interact', id: 'socketSun', era: P, x: L.towerX0 + 2.5, y: 7, z: 1.5, prompt: 'Sun pedestal' },
  { type: 'interact', id: 'socketBell', era: M, x: L.towerX0 + 10.5, y: 12, z: 1.5, prompt: 'Great bell' },
  { type: 'interact', id: 'gearworksDoor', era: M, x: L.towerX1 - 2.4, y: 0, z: 4.5, prompt: 'Climb into the clockwork', needs: 'gearworksOpen' },
  { type: 'interact', id: 'gearworksExit', era: M, x: L.gearX0 + 0.7, y: 0, z: 4.5, prompt: 'Back down to the Tower', needs: 'gearworksOpen' },
  { type: 'interact', id: 'mainspring', era: M, x: GEAR.mainspring.x, y: GEAR.mainspring.y, z: GEAR.mainspring.z, prompt: 'The great mainspring', needs: 'gearworksOpen' },
  { type: 'interact', id: 'socketCore', era: F, x: L.towerX0 + 18.5, y: 17, z: 1.5, prompt: 'Reactor socket' },

  // Pickups (items)
  { type: 'pickup', id: 'acorn', era: M, x: 85.5, y: 2.4, z: 1.5, item: 'acorn' },
  { type: 'pickup', id: 'disc', era: P, x: 151.5, y: 4.7, z: 1.0, item: 'disc' },
  { type: 'pickup', id: 'core', era: F, x: 178.5, y: 1.8, z: 3.5, item: 'core' },
  // the Bell Hammer, tempered for three centuries, waits on Lillian's display case
  { type: 'pickup', id: 'hammerGift', era: F, x: 118.7, y: 1.8, z: 0.5, item: 'hammer', needs: 'hammerLeft' },
  { type: 'pickup', id: 'wheel', era: F, x: 185.05, y: 1.5, z: 4.05, item: 'wheel' },
  { type: 'pickup', id: 'cable', era: F, x: 210.5, y: 1.3, z: 5.2, item: 'cable' },
  { type: 'pickup', id: 'clockKey', era: F, x: L.keySpot.x, y: 1.3, z: L.keySpot.z, item: 'clockKey' },

  // Lost cogs
  { type: 'cog', id: 'cogP1', era: P, x: 24.5, y: 3.7, z: 1.5 },
  { type: 'cog', id: 'cogP2', era: P, x: 57.5, y: 3.7, z: 0.5 },
  { type: 'cog', id: 'cogP3', era: P, x: 154.5, y: 3.7, z: 5.0 },
  { type: 'cog', id: 'cogM1', era: M, x: 30.5, y: 3.7, z: 1.5 },
  // on the oak's branch: in the Present if the acorn went in the Past soil, or on the same
  // branch of the petrified tree in the Future if it went in the Present planter (one cog)
  { type: 'cog', id: 'cogM2', era: M, x: 95.5, y: 8.7, z: 3.5, needs: 'acornPlanted' },
  { type: 'cog', id: 'cogM2', era: F, x: 95.5, y: 8.7, z: 3.5, needs: 'acornPlantedM', unless: 'acornPlanted' },
  { type: 'cog', id: 'cogM3', era: M, x: L.towerX0 + 12.5, y: 12.7, z: 0.6 }, // up in the belfry
  { type: 'cog', id: 'cogF1', era: F, x: 29.5, y: 3.7, z: 2.5 },
  { type: 'cog', id: 'cogF2', era: F, x: 65.5, y: -2.4, z: 3.5, needs: 'springOpen' },
  { type: 'cog', id: 'cogF3', era: F, x: 92.9, y: 0.6, z: 4.6, needs: ['acornPlanted', 'acornPlantedM'] },
  { type: 'cog', id: 'cogF4', era: F, x: 195.5, y: 3.7, z: 6.5, needs: 'sluiceClosed' }, // on a pontoon off the boom

  // Pushables
  { type: 'pushable', id: 'block', era: P, x: L.blockStart.x, z: L.blockStart.z, kind: 'stone', posKey: 'blockPos' },
  { type: 'pushable', id: 'crate', era: F, x: L.crateStart.x, z: L.crateStart.z, kind: 'crate', posKey: 'cratePos' },

  // Enemies
  { type: 'enemy', kind: 'thornback', era: P, x: 57, z: 3.5, range: [53, 60] }, // clear of the seized lever
  { type: 'enemy', kind: 'thornback', era: P, x: 72, z: 2.5, range: [69, 77] },
  { type: 'enemy', kind: 'thornback', era: P, x: 150, y: 3, z: 4, range: [147, 155] },
  { type: 'enemy', kind: 'thornback', era: P, x: 122, z: 4, range: [117, 128] },
  { type: 'enemy', kind: 'rat', era: M, x: 89, z: 4, range: [87, 95] },
  { type: 'enemy', kind: 'rat', era: M, x: 101, z: 2, range: [99, 104] },
  { type: 'enemy', kind: 'rat', era: M, x: 119, z: 3, range: [116, 127] },
  { type: 'enemy', kind: 'rat', era: M, x: 125, z: 5, range: [117, 128] },
  { type: 'enemy', kind: 'drone', era: F, x: 58, z: 4, range: [53, 62] },
  { type: 'enemy', kind: 'drone', era: F, x: 113, z: 3, range: [108, 116] },
  { type: 'enemy', kind: 'drone', era: F, x: 127, z: 4, range: [124, 129] },
  { type: 'enemy', kind: 'drone', era: F, x: 135, z: 2, range: [132, 141] },
  { type: 'enemy', kind: 'drone', era: F, x: 186, z: 2.5, range: [183, 188] },
  { type: 'enemy', kind: 'drone', era: F, x: 210, z: 3, range: [207, 212] },
  // (once the Tower ticks again, its Warden has nothing left to guard, and stands down)
  { type: 'warden', era: F, path: WARDEN_PATH, until: 'finished' },
  // searchlights in the Warden's yard: one across the way in, one along the far side of the key
  { type: 'searchlight', era: F, x: 261, z: 3.5, a: [261, 0.9], b: [261, 6.1], period: 5, until: 'finished' },
  { type: 'searchlight', era: F, x: 274, z: 5.2, a: [268.5, 5.2], b: [278.5, 5.2], period: 7, phase: 0.3, until: 'finished' },
  { type: 'enemy', kind: 'drone', era: F, x: 163, z: 3, range: [161, 167] },
  { type: 'enemy', kind: 'drone', era: F, x: 170, z: 3.5, range: [167, 171.5] },
];

// ---------------------------------------------------------------------------
export const COG_TOTAL = new Set(SPAWNS.filter((s) => s.type === 'cog').map((s) => s.id)).size;

export function buildLevel(world, state) {
  world.__state = state;
  buildGround(world);
  backdrop(world);
  valleyEnd(world);
  hub(world);
  lilies(world);
  legacies(world);
  river(world);
  cliffs(world);
  rampart(world);
  smithy(world);
  hideaway(world);
  starlitGarden(world);
  terrace(world);
  gatehouse(world);
  millHollow(world);
  crossing(world);
  echoGallery(world);
  wardenYard(world);
  tower(world);
  gearworks(world);
  world.finalizeStatic();
  world.refreshFeatures(state);
}
