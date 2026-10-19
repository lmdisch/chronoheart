// Highcrest: one mountain built three times (the First Age / Golden Hour / the Stopped Age).
//
// The road climbs the mountain's face in switchbacks, the way real mountain roads do: each leg
// slopes up across the face (you walk up it), and at its end the road turns back on itself and
// climbs into the mountain (W) to the next leg, a little higher and a little further back. Six
// legs: Base Camp east, the Lantern Road west, the Icefall and the Sundial Terrace east, the
// Clockworks west, the Crevasses east, and the summit, with the observatory and nothing above you
// but sky. The camera follows the road back up the slope, so the leg you're on is below the next
// one, and the one after, all the way up the face.
//
// The mountain goes on past the road: its shoulders fall away on both sides, its north face drops
// behind the summit into the sea of clouds, and the same height function (natural) carries on
// past the voxels as a terrain mesh, out to the great ranges on the horizon. Far below, through
// openings in the clouds behind the mountain: Hollowmere, and Saltwick by the sea.
//
// Frost: where Sir Christopher's Stopped Age has seeped into the mountain (FROST_ZONES), the ages
// are frozen together and the Chronoheart can't shift. The Lantern works there: light it, and Q / E
// swing its light back and forth between the ages, and inside its light that age is real.
import * as THREE from 'three';
import { ZMIN, ZMAX, YMIN, YMAX } from '../../world/world.js';
import { makeRng, hash3, shade } from '../../core/util.js';
import { tagPalettes } from '../../render/materials.js';
import { ridged, fbm, terrainMeshes } from '../../render/mountains.js';
import theme from './theme.js';

const W = theme.width;
const P = 0, M = 1, F = 2;

export const C = tagPalettes({
  snow: [0xeef4fa, 0xe6eef8, 0xf4f8fc],
  snowRock: [0x7a8292, 0x727a8a, 0x828a9a],
  granite: [0x7c8494, 0x868e9e, 0x747c8c, 0x6c7484],
  ice: [0xa8d8ee, 0x9ccfe8, 0xb4e0f2],
  copper: [0x4f9a8a, 0x5aa494, 0x468a7c],
  marble: [0xe8e4dc, 0xf0ece4, 0xdedad2],
  brass: [0xb8862a, 0xa8782a, 0xc9963a],
  cobble: [0x8a8378, 0x9a9286, 0xa39a8c, 0x7c766c],
  stone: [0x8f8a80, 0x7f7a70, 0x9a958a, 0x6f6a62],
  plaster: [0xe8dcc0, 0xe0d2b4, 0xf0e4c8],
  timber: [0x5a3820, 0x6b4428, 0x4e3018],
  wood: [0x7a5232, 0x6b4428, 0x86603a],
  log: [0x5a4030, 0x4e3828, 0x664834],
  leaves: [0x2f5a3a, 0x355f40, 0x2a5236, 0x3a6a44],
  metal: [0x5b6472, 0x66707e, 0x525a66],
});
const FROST = [0x9ab8c8, 0xa8c4d4, 0x8eaebe]; // pine needles in the Stopped Age (untagged: tinted plain)
const LAMP = [0xff9a3a, 0xffc870, 0xbfd8ff]; // torch, lantern, frozen lantern
const ICE_GLOW = 0xcfeaff;
const FLAG_COLS = [0x3a6ad8, 0xf0f0f0, 0xd83a3a, 0x3ab05a, 0xf0c83a];
const FLAG_DIM = [0x9aa8c8, 0xd0d8e8, 0xa898c0, 0x98b8b0, 0xc8c0a0];
const TENT_COLS = [0xf0a020, 0xe0482a, 0x2a8ad8, 0xf0c83a, 0x3ab05a];

const jitter = (pal) => (x, y, z) => shade(pal[Math.floor(hash3(x, y, z) * pal.length)], 0.94 + hash3(z, x, y) * 0.12);
const between = (x, a, b) => x >= a && x <= b;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// The road
// ---------------------------------------------------------------------------
/** Where the road begins in x: everything west of it, and east of OX + 100, is the mountain's shoulders. */
export const OX = 20;
const U = (u) => OX + u;
const BAND = 7; // how deep the road is (z)
const GAP = 9; // the slope between one leg and the next: rock and snow, and the turn climbing it
const TURN_RISE = 5; // how much higher each leg starts than the last one ended
const SEP = BAND + GAP;
/** The front of each leg's road (its z runs from zb(k) to zb(k) + 6). */
export const zb = (k) => -SEP * k;

/**
 * Each leg, in local u (0..99 along the road): which way you walk it, and where it climbs. A ramp
 * [u0, u1, rise] climbs `rise` blocks between u0 and u1, rising the way you walk. Between ramps
 * the road is level (that's where the camps, puzzles and people are).
 */
const LEGS = [
  { dir: 1, ramps: [[42, 50, 3], [58, 70, 4], [76, 88, 3]] }, // Base Camp, and the Cloudline
  { dir: -1, ramps: [[62, 68, 2], [36, 50, 4], [8, 22, 4]] }, // the Lantern Road
  { dir: 1, ramps: [[6, 20, 5], [44, 56, 4]] }, // the Icefall, and the Sundial Terrace
  { dir: -1, ramps: [[52, 64, 4], [14, 30, 5]] }, // the Clockworks
  { dir: 1, ramps: [[2, 12, 3], [34, 50, 5], [78, 90, 3]] }, // the Crevasses
  { dir: -1, ramps: [[36, 54, 3]] }, // the Summit
];
const rise = (k) => LEGS[k].ramps.reduce((s, r) => s + r[2], 0);
/** Height at the start of each leg. */
export const LEG_H = [0];
for (let k = 0; k < LEGS.length - 1; k++) LEG_H.push(LEG_H[k] + rise(k) + TURN_RISE);

/** Standing height on leg k at road column u. */
export function legH(k, u) {
  u = clamp(Math.floor(u), 0, 99);
  const { dir, ramps } = LEGS[k];
  let h = LEG_H[k];
  for (const [a, b, r] of ramps) {
    const f = dir > 0 ? (u + 0.5 - a) / (b - a) : (b - u - 0.5) / (b - a);
    h += Math.floor(r * clamp(f, 0, 1) + 1e-6);
  }
  return h;
}
/** Standing height on leg k at world x. */
export const gy = (k, x) => legH(k, x - OX);
/** The columns where leg k turns back up the slope to the next one. */
const TURN = (k) => (LEGS[k].dir > 0 ? [95, 98] : [1, 4]);
const inTurn = (k, u) => k < 5 && u >= TURN(k)[0] && u <= TURN(k)[1];
const endH = (k) => legH(k, LEGS[k].dir > 0 ? 99 : 0);

/** Which leg of the road you're on (from how far back up the mountain you are). */
export const tierAt = (z) => clamp(Math.round((3 - z) / SEP), 0, 5);

/** Places the slope behind the road is cut back level, to make room: for tents, houses, the statue. */
const ALCOVES = [
  { k: 0, u0: 6, u1: 40, depth: 4 },
  { k: 1, u0: 72, u1: 94, depth: 5 },
  { k: 2, u0: 62, u1: 70, depth: 4 },
  { k: 2, u0: 76, u1: 80, depth: 4 },
];
const alcoveAt = (k, u) => ALCOVES.find((a) => a.k === k && between(u, a.u0, a.u1));

/** The slope between leg k and the next, row c (1 just behind the road .. GAP just in front of the next). */
function gapTop(k, u, c) {
  const a = legH(k, u);
  if (inTurn(k, u)) return endH(k) + Math.round((c * TURN_RISE) / GAP);
  const al = alcoveAt(k, u);
  if (al && c <= al.depth) return a;
  const b = legH(k + 1, u), c0 = al ? al.depth : 0; // (behind an alcove the slope starts further back)
  let h = a + Math.round(((b - a) * (c - c0 + 0.5)) / (GAP - c0 + 1) + fbm(u * 0.07 + k * 7, c * 0.2, 3) * 3);
  return Math.min(Math.max(h, a + 3), b + 1);
}

// The summit: the road (leg 5), the level ground behind it where the observatory stands, and at
// its west end the overlook, where you can walk out to the north edge and see the world.
const ZS = zb(5);
const PLATEAU = ZS - 12; // where the north face begins
const OVERLOOK_U = 44; // the overlook: u 0..44, out to ZS - 10

/** The mountain where there's no road: the same everywhere, voxels or terrain mesh. */
export function natural(x, z) {
  const u = x - OX, uc = clamp(Math.floor(u), 0, 99);
  const s = Math.max(0, -u, u - 99);
  let h;
  if (z > 7) h = 0.3 - (z - 7) * 1.4; // below Base Camp, down to the clouds
  else if (z >= ZS) h = Math.min(legH(5, uc), 5 + ((3 - z) * (LEG_H[5] - 5)) / (3 - ZS - 3)); // the face
  else if (z >= PLATEAU) h = legH(5, uc); // the summit
  else h = legH(5, uc) - (PLATEAU - z) * 2.3; // the north face
  // the shoulders fall away to either side
  h -= s * 0.8 + s * s * 0.0035;
  // rock, crests and gullies: more of it the further from the road
  const wild = 1.5 + s * 0.12 + Math.max(0, PLATEAU - z) * 0.07 + Math.max(0, z - 10) * 0.1;
  h += (ridged(x * 0.045, z * 0.045, 4) - 0.45) * wild * 2 + fbm(x * 0.012, z * 0.012, 2) * Math.min(1, s / 25) * 10;
  // in front of Base Camp's road the ground always falls away below it, so nothing hides the road
  // from the camera (eased back in toward the shoulders)
  if (z > 6.5 && s < 8) h = Math.min(h, legH(0, uc) - 1.5 - (z - 7) * 0.9 + s * 1.2);
  return Math.max(h, -36);
}

/** A single great peak: a pyramid of ridges and faces, h high at (px, pz), r across its base. */
function peak(x, z, px, pz, h, r) {
  const d = Math.hypot(x - px, z - pz) / r;
  if (d >= 1) return -36;
  // four ridges running down from the top, faces between them
  const a = Math.atan2(z - pz, x - px);
  const ridge = 0.82 + 0.18 * Math.abs(Math.cos(a * 2 + px));
  const fall = Math.pow(1 - d, 1.35) * ridge;
  // crags all over it, sharper toward the top
  const crag = ridged(x * 0.022 + px, z * 0.022, 5);
  return -36 + (h + 36) * fall + (crag - 0.45) * 46 * Math.sqrt(fall) * (0.4 + fall);
}

/** The great ranges all round, rising out of the clouds; kept low in the valley north of the mountain. */
function ranges(x, z) {
  const vx = (x - 70) / 300, vz = (z + 300) / 165;
  const valley = Math.hypot(vx, vz);
  const dx = Math.max(0, -40 - x, x - 180), dz = Math.max(0, -150 - z, z - 40);
  const away = Math.hypot(dx, dz);
  const m = smooth(0.85, 1.25, valley) * smooth(30, 120, away);
  let h = -36;
  if (m > 0) {
    // ridged crests, warped a little so the ranges wander, sharpened toward their tops
    const wx = x + fbm(x * 0.004, z * 0.004, 2) * 60, wz = z + fbm(z * 0.004 + 9, x * 0.004, 2) * 60;
    const r = ridged(wx * 0.0075, wz * 0.0075, 6);
    const big = 0.6 + 0.4 * fbm(x * 0.0016 + 3, z * 0.0016, 2);
    h = -36 + m * (Math.pow(r, 2.2) * 240 * big + r * 40);
  }
  // Highcrest's neighbors, close at hand on either side (lower than Highcrest itself)
  h = Math.max(h, peak(x, z, -95, -70, 62, 110), peak(x, z, 245, -95, 70, 120), peak(x, z, -60, -190, 50, 80));
  return h;
}

/** The land everywhere: the mountain, and the ranges round it. */
export const landAt = (x, z) => Math.max(natural(x, z), ranges(x, z));

/**
 * The top of every column of the voxel world (the height you'd stand at), and what it is:
 * 'road' (leg k), 'gap' (the slope behind leg k), 'summit', or 'rock'.
 */
function column(x, z) {
  const u = x - OX;
  if (u < 0 || u > 99) {
    // a shoulder: a buttress of rock just past each end of the road, falling away from there
    const edge = column(u < 0 ? OX : OX + 99, z).top, s = u < 0 ? -u : u - 99;
    return { top: Math.max(Math.round(natural(x, z)), Math.round(edge + 4 - (s - 1) * 1.3)), kind: 'rock' };
  }
  if (z >= 7) return { top: Math.round(natural(x, z)), kind: 'rock' };
  if (z < PLATEAU) return { top: Math.round(natural(x, z)), kind: 'rock' };
  if (z < ZS) return { top: legH(5, u), kind: 'summit', k: 5 };
  for (let k = 0; k <= 5; k++) {
    if (z >= zb(k) && z <= zb(k) + 6) return { top: legH(k, u), kind: 'road', k };
    if (k < 5 && z < zb(k) && z >= zb(k) - GAP) return { top: gapTop(k, u, zb(k) - z), kind: 'gap', k, c: zb(k) - z };
  }
  return { top: Math.round(natural(x, z)), kind: 'rock' };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const Z1 = zb(1), Z2 = zb(2), Z3 = zb(3), Z4 = zb(4);
const RY = gy(1, U(80)); // the town
const OY = legH(5, 70); // the observatory floor

export const L = {
  start: { x: U(4.5), y: 0, z: 3.5 },
  OX, zb, gy, legH, LEG_H, ZS, PLATEAU,
  // Base Camp
  campX0: U(8), campX1: U(34), guideX: U(14.5), pineX: U(52),
  // the Lantern Road (walked westward)
  ingridX: U(86.5), campPastX: U(70), michelleX: U(58.5), lampX: U(54), ravineX0: U(30), ravineX1: U(34), pageX: U(22.5),
  // the Icefall and the Sundial Terrace
  fallsX0: U(30), fallsX1: U(35), statueX: U(66), gnomonX: U(78), metX: U(58),
  // the Clockworks (westward)
  michelle2X: U(90.5), plates3: [{ x: U(84), z: 1 }, { x: U(80), z: 5 }, { x: U(76), z: 1 }], doorX: U(70), plateDX: U(47), gateDX: U(41),
  // the Crevasses
  crev1X0: U(20), crev1X1: U(25), iceStairX0: U(58), iceStairX1: U(62), downX0: U(67),
  // the Summit (westward)
  frostWallX: U(86), dome: { x: U(70), y: OY - 1, z: ZS - 1, r: 9 }, orrery: { x: U(70.5), y: OY + 5, z: ZS + 3.4 }, tobinX: U(77.5),
  needle: { x: U(18), z: ZS - 4 }, christopherX: U(21.5), flagSpot: { x: U(9), z: ZS - 7 }, overlookX1: U(OVERLOOK_U),
  /** Where each leg's road turns back up the slope (its first column), and which way. */
  turns: LEGS.slice(0, 5).map((l, k) => ({ k, x: U(TURN(k)[0]), x1: U(TURN(k)[1]), end: l.dir > 0 ? 'east' : 'west', y: endH(k) })),
  cameraBounds: [U(8), U(92)],
  // at the overlook, the camera rises and looks down past the edge, to the towns far below
  vistas: [{ x0: U(-2), x1: U(OVERLOOK_U - 6), z0: ZS - 12, z1: ZS + 7, pitch: 33, dist: 56, lift: 2, fov: 52 }],
};

/**
 * The End of Time: where Sir Orin takes the fight. A ruined throne room of black marble, its
 * cracks filled with gold, floating high over Base Camp where no camera on the climb ever looks.
 * Standing height `y`; its floor runs x0..x1, z0..z1. His throne is against the east wall, so
 * there is no getting behind him. The same in every age (the Lantern still works in here).
 */
export const ARENA = { x0: 34, x1: 66, y: 86, z0: -3, z1: 3, startX: 37.5, daisX: 61, throneX: 65, orinX: 63.5, anchorX: 51.5, platesX: 44.5, shieldX: 59 };
export const inArena = (x, y, z) => x >= ARENA.x0 - 1 && x <= ARENA.x1 + 2 && y > ARENA.y - 6 && z >= ARENA.z0 - 1 && z <= ARENA.z1 + 1;

/** Where Christopher's frost holds the ages still: no shifting inside, only the Lantern. */
export const FROST_ZONES = [
  { k: 1, x0: U(24), x1: U(41) }, // the ravine
  { k: 2, x0: U(24), x1: U(42) }, // the Icefall
  { k: 4, x0: U(14), x1: U(31) }, // the first crevasse
  { k: 4, x0: U(53), x1: U(74) }, // the rockfall
  { k: 5, x0: U(81), x1: U(91) }, // the observatory doors
];
export const inFrost = (x, y, z) => {
  const k = tierAt(z);
  return z <= zb(k) + 7 && z >= zb(k) - 1 && FROST_ZONES.some((zn) => zn.k === k && x >= zn.x0 && x <= zn.x1);
};

export const AREAS = [
  { x: 0, name: 'Base Camp', subtitle: 'The Cloudline' },
  { x: 0, zMax: Z1 + 6.5, name: 'The Lantern Road' },
  { x: 0, zMax: Z2 + 6.5, name: 'The Icefall' },
  { x: U(48), zMax: Z2 + 6.5, name: 'The Sundial Terrace' },
  { x: 0, zMax: Z3 + 6.5, name: 'The Clockworks' },
  { x: 0, zMax: Z4 + 6.5, name: 'The Crevasses' },
  { x: 0, zMax: ZS + 6.5, name: 'The Summit' },
];

/** A shrine at the top of each turn (and at Base Camp). */
export const CHECKPOINTS = [
  { id: 0, x: U(2.5), y: 0, z: 1.2 },
  ...[1, 2, 3, 4, 5].map((k) => {
    const u = LEGS[k].dir < 0 ? 92 : 6;
    return { id: k, x: U(u), y: legH(k, u), z: zb(k) + 1.2, pz: zb(k) + 3.5, dx: LEGS[k].dir < 0 ? -1.2 : 1.2 };
  }),
  // at the End of Time: fall here, and you get up here (see ARENA, defined below)
  { id: 6, x: 35.5, y: 86, z: -2.6, pz: 0.5, dx: 1.5 },
];

/**
 * Pressure plates (pressed by you, or an echo), and the gates they work. A plate counts for a
 * moment after a foot leaves it (`hold`), so an echo walking a loop still holds it.
 * The clockworks door wants all three held at once, and then opens for good; the gold gate stays
 * open only while its plate is held, and for good once you're through it.
 */
export const PLATES = [
  ...L.plates3.map((p, i) => ({
    id: 'plate' + i,
    x: p.x,
    y: gy(3, p.x),
    z: Z3 + p.z,
    gate: 'clockworks',
    color: 0x7affc8,
    ...(i === 2 ? { requiresAge: P } : {}),
  })),
  { id: 'plateD', x: L.plateDX, y: gy(3, L.plateDX), z: Z3 + 1, gate: 'gateD', color: 0xffd08a },
  { id: 'orinPlate0', x: ARENA.platesX, y: ARENA.y, z: ARENA.z0 + 0, gate: 'orinShield', color: 0x6ce2ff, needs: 'orinPhase1' },
  { id: 'orinPlate1', x: ARENA.platesX, y: ARENA.y, z: ARENA.z1 - 1, gate: 'orinShield', color: 0x6ce2ff, needs: 'orinPhase1' },
];
export const GATES = [
  { id: 'clockworks', x: L.doorX, y: gy(3, L.doorX), z0: Z3, z1: Z3 + 6, eras: [P, M, F], openFlag: 'clockworksOpen', color: 0x7affc8, dir: -1 },
  { id: 'gateD', x: L.gateDX, y: gy(3, L.gateDX), z0: Z3, z1: Z3 + 6, eras: [P, M, F], passFlag: 'gateDPassed', color: 0xffd08a, dir: -1 },
  { id: 'orinShield', x: ARENA.shieldX, y: ARENA.y, z0: ARENA.z0, z1: ARENA.z1, eras: [P, M, F], openFlag: 'orinPhase2', color: 0x6ce2ff, dir: -1 },
];

/** Things that turn: the orrery's rings, the lighthouse beam far below. Spun each frame by the game. */
export const SPINNERS = [];

// ---------------------------------------------------------------------------
// Building the mountain
// ---------------------------------------------------------------------------
/** A hole in the road (a ravine, the falls, a crevasse): in which ages. */
function holeAt(era, k, x) {
  if (k === 1 && between(x, L.ravineX0, L.ravineX1)) return era !== P; // the ravine: only the First Age has a bridge
  if (k === 2 && between(x, L.fallsX0, L.fallsX1)) return era !== F; // the falls cut the road: frozen over only in the Stopped Age
  if (k === 4 && between(x, L.crev1X0, L.crev1X1)) return era !== P; // the first crevasse: the First Age's bridge
  return false;
}

function roadColor(era, k, x, y, z) {
  const u = x - OX, r = hash3(x, z, y), zz = z - zb(k);
  if (k === 5 && era === M && Math.hypot(x + 0.5 - L.orrery.x, (z + 0.5 - L.orrery.z) * 1.4) < 5) return jitter(C.marble)(x, y, z); // swept clear under the orrery
  if (k === 2 && era === F && between(x, L.fallsX0, L.fallsX1)) return jitter(C.ice)(x, y, z);
  if (era === P && ((k === 1 && between(x, L.ravineX0, L.ravineX1)) || (k === 4 && between(x, L.crev1X0, L.crev1X1)))) return jitter(C.log)(x, y, z);
  const frosty = FROST_ZONES.some((zn) => zn.k === k && between(x, zn.x0, zn.x1));
  if (era === F || (era === M && frosty)) {
    if (r < 0.3) return jitter(C.ice)(x, y, z);
  }
  if (era === M && k === 1 && u > 66 && r < 0.6) return jitter(C.cobble)(x, y, z); // the town's street
  // a trodden path down the middle of the road, snow at its edges
  if (between(zz, 2, 4) && r < 0.55 && era !== P) return jitter(C.snowRock)(x, y, z);
  return jitter(C.snow)(x, y, z);
}

function buildGround(world) {
  // the shape of the land is the same in every age; holes and colors differ
  const tops = new Map();
  const topAt = (x, z) => {
    const key = x * 1000 + z;
    let c = tops.get(key);
    if (!c) tops.set(key, (c = x < 0 || x >= W || z < ZMIN || z >= ZMAX ? { top: Math.round(landAt(x + 0.5, z + 0.5)), kind: 'rock' } : column(x, z)));
    return c;
  };
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    for (let x = 0; x < W; x++)
      for (let z = ZMIN; z < ZMAX; z++) {
        const col = topAt(x, z);
        let top = col.top;
        const hole = col.kind === 'road' && holeAt(era, col.k, x);
        if (hole) top -= 4;
        // a shell, not a solid mountain: deep enough to meet the lowest neighbor
        let low = top;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) low = Math.min(low, topAt(x + dx, z + dz).top - (col.kind === 'road' ? 4 : 0));
        const y0 = Math.max(YMIN, low - 3);
        // steepness, for snow or rock on top
        let steep = 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) steep = Math.max(steep, Math.abs(topAt(x + dx, z + dz).top - col.top));
        // snow lies on the slope wherever it's gentle enough to hold it, a block or two deep; the
        // steep steps between are bare rock, in bands (a cliff's worth of crag, then snow again)
        const band = fbm(x * 0.05, z * 0.09, 2) > 0.12;
        for (let y = y0; y < Math.min(top, YMAX); y++) {
          let color;
          if (y === top - 1) {
            if (col.kind === 'road' && !hole) color = roadColor(era, col.k, x, y, z);
            else if (col.kind === 'summit') color = era === M && hash3(x, y, z) < 0.2 ? jitter(C.snowRock)(x, y, z) : jitter(C.snow)(x, y, z);
            else if (steep <= 2 || !band) color = jitter(C.snow)(x, y, z);
            else color = jitter(C.snowRock)(x, y, z);
          } else if (y >= top - 2 && steep <= 2 && col.kind !== 'road') color = jitter(C.snow)(x, y, z);
          else color = hash3(x, y, z) < 0.12 ? jitter(C.snowRock)(x, y, z) : jitter(C.granite)(x, y, z);
          b.setCell(x, y, z, 1, color);
        }
        // a ledge of snow hanging on the steep rock here and there
        if (col.kind !== 'road' && steep >= 3 && hash3(x, z, era + 9) < 0.06) b.deco(x - 0.1, top - 0.2, z - 0.1, 1.2, 0.3, 1.2, C.snow[1]);
      }
    // what's in the holes: the falls' plunge pool, or a cold mist (a fall costs a heart, and puts you back)
    for (const [k, x0, x1] of [[1, L.ravineX0, L.ravineX1], [2, L.fallsX0, L.fallsX1], [4, L.crev1X0, L.crev1X1]]) {
      if (!holeAt(era, k, x0)) continue;
      const y = legH(k, x0 - OX) - 4;
      if (k === 2) b.hazard(x0, y, zb(k), x1, y + 1, zb(k) + 6, 0x5ab8e8, false, 0.2);
      else b.hazard(x0, y, zb(k), x1, y + 1, zb(k) + 6, era === F ? 0xdff0ff : 0xe8f4ff, true, 0.2);
    }
    barriers(b, topAt);
  }
}

/** Invisible walls: the rope along the road's edge, the rock behind it, the ends of each turn, the summit's rail. */
function barriers(b, topAt) {
  const wall = (x, z, from, to) => {
    for (let y = Math.max(from, topAt(x, z).top); y <= to; y++) b.setCell(x, y, z, 1, 0);
  };
  for (let k = 0; k <= 5; k++) {
    const arrive = k > 0 ? TURN(k - 1) : null;
    for (let u = 0; u <= 99; u++) {
      const x = U(u), h = legH(k, u);
      // the front edge (with a rope along it), except where the road arrives up the turn
      if (!arrive || u < arrive[0] || u > arrive[1]) wall(x, zb(k) + 7, h, h + 5);
      // the back: rock, mostly; a rail where it isn't
      if (k < 5 && !inTurn(k, u)) {
        const al = alcoveAt(k, u);
        wall(x, zb(k) - 1 - (al ? al.depth : 0), h, h + 5);
      }
    }
    // the ends of the road
    for (let z = zb(k); z <= zb(k) + 6; z++) {
      wall(U(-1), z, legH(k, 0), legH(k, 0) + 5);
      wall(U(100), z, legH(k, 99), legH(k, 99) + 5);
    }
    // the sides of each turn
    if (k < 5) {
      const [t0, t1] = TURN(k), e = endH(k);
      for (let c = 1; c <= GAP; c++) for (const u of [t0 - 1, t1 + 1]) wall(U(u), zb(k) - c, gapTop(k, t0, c), gapTop(k, t0, c) + 5);
    }
    // alcove sides
    for (const al of ALCOVES.filter((a) => a.k === k))
      for (let c = 1; c <= al.depth; c++) {
        wall(U(al.u0 - 1), zb(k) - c, legH(k, al.u0), legH(k, al.u0) + 5);
        wall(U(al.u1 + 1), zb(k) - c, legH(k, al.u1), legH(k, al.u1) + 5);
      }
  }
  // the summit: the overlook's rail at the north edge, and the observatory's back wall
  for (let u = 0; u <= 99; u++) {
    const h = legH(5, u);
    wall(U(u), u <= OVERLOOK_U ? ZS - 11 : ZS - 1, h, h + 5);
  }
  for (let z = ZS - 10; z < ZS; z++) wall(U(OVERLOOK_U + 1), z, legH(5, OVERLOOK_U + 1), legH(5, OVERLOOK_U + 1) + 5);
  for (let z = ZS - 11; z < ZS; z++) wall(U(-1), z, legH(5, 0), legH(5, 0) + 5);
}

// ---------------------------------------------------------------------------
// Set pieces, leg by leg
// ---------------------------------------------------------------------------
/** Base Camp: bright expedition tents, a mess tent, crates and ropes, a stone cairn hung with flags. */
function baseCamp(b, era) {
  if (era === P) {
    // the First Age: only a ring of stones and a fire, where someone camped long before anyone else
    const x = U(20);
    for (let i = 0; i < 6; i++) b.deco(x - 0.9 + Math.cos(i) * 0.7, 0, 4 + Math.sin(i) * 0.7, 0.35, 0.3, 0.35, C.stone[i % 4]);
    b.glow(x - 0.5, 0, 3.7, 0.7, 0.4, 0.7, 0xff8a3a);
    b.light(x - 0.1, 1, 4.2, 0xff8a3a, 7, 9, 0.3);
    return;
  }
  const frozen = era === F;
  for (let i = 0; i < 5; i++) {
    const x = L.campX0 + 1 + i * 5, z = -3.4 - (i % 2) * 0.6, col = frozen ? 0xb8c4dc : TENT_COLS[i];
    // a dome tent: three stacked boxes, a darker door
    b.deco(x, 0, z, 3, 0.9, 2.4, col);
    b.deco(x + 0.3, 0.9, z + 0.25, 2.4, 0.6, 1.9, shade(col, 0.92));
    b.deco(x + 0.7, 1.5, z + 0.5, 1.6, 0.35, 1.4, shade(col, 0.85));
    b.deco(x + 1.1, 0, z + 2.38, 0.8, 0.9, 0.04, shade(col, 0.55));
    b.deco(x + 0.2, 1.85, z + 0.4, 2.6, 0.08, 1.6, C.snow[0]); // snow on the fly
    // guy lines
    b.deco(x - 0.6, 0, z + 1.1, 0.6, 0.03, 0.03, 0xd0c8b0);
    b.deco(x + 3, 0, z + 1.1, 0.6, 0.03, 0.03, 0xd0c8b0);
    if (!frozen) b.glow(x + 1.2, 0.3, z + 2.42, 0.6, 0.4, 0.02, 0xffc870);
  }
  // crates, rope coils, oxygen bottles... the stuff of an expedition
  for (let i = 0; i < 6; i++) b.deco(L.campX1 - 6 + i * 0.9, 0, 0.3 + (i % 2) * 0.9, 0.8, 0.6 + (i % 3) * 0.2, 0.8, frozen ? 0x9aa8b8 : [0xa8743e, 0x98683a, 0xc84a3a][i % 3]);
  for (let i = 0; i < 4; i++) b.deco(L.campX1 - 5 + i * 0.35, 0, 1.9, 0.22, 0.7, 0.22, frozen ? 0xa8b4c8 : [0xe8a020, 0xd84a2a][i % 2]);
  // the puja cairn: a tall pole, and flag lines strung from it in every direction
  const cx = U(26.5);
  for (let i = 0; i < 4; i++) b.deco(cx - 0.8 + i * 0.1, i * 0.4, -2.6 + i * 0.1, 1.6 - i * 0.3, 0.4, 1.6 - i * 0.3, C.stone[i % 4]);
  b.deco(cx - 0.08, 1.6, -1.88, 0.16, 7.5, 0.16, 0x4a3020);
  for (const [x1, y1, z1] of [[L.campX0, 1.2, -3.8], [L.campX1 + 6, 1.2, -3.8], [L.campX0 + 4, 1.2, 6.5], [L.campX1 + 2, 1.2, 6.5]]) flagLine(b, era, cx, 9, x1, y1, z1, -1.8);
  if (!frozen) b.light(U(20), 2.5, 2, 0xffb060, 5, 10, 0.05);
}

/** The Cloudline: a great pine down across the road. In the First Age it's a sapling you can step past. */
function fallenPine(b, era) {
  const x = L.pineX, y = gy(0, x);
  if (era === P) {
    b.solid(x, y, -0, x, y + 1, 0, jitter(C.log));
    b.solid(x - 1, y + 2, -1, x + 1, y + 2, 1, jitter(C.leaves));
    b.solid(x, y + 3, 0, x, y + 3, 0, jitter(C.snow));
    return;
  }
  const bark = era === F ? (px, py, pz) => (hash3(px, py, pz) < 0.4 ? jitter(C.ice)(px, py, pz) : jitter(C.log)(px, py, pz)) : jitter(C.log);
  b.solid(x, y, -1, x + 1, y + 1, 6, bark);
  b.solid(x, y + 2, 0, x + 1, y + 2, 6, jitter(C.snow));
  // its branches, snapped off, in the snow
  for (let i = 0; i < 4; i++) b.deco(x + 2.2 + i * 0.7, y, 1 + i * 1.3, 1.4, 0.25, 0.25, C.log[i % 3]);
  // in the Stopped Age, drifts frozen hard against its west side make a stair up onto the trunk:
  // from the road at the front, one block up, one more (stepping back), then onto the trunk
  if (era === F) {
    b.solid(x - 1, gy(0, x - 1), 6, x - 1, y, 6, jitter(C.ice));
    b.solid(x - 1, gy(0, x - 1), 5, x - 1, y + 1, 5, jitter(C.ice));
  }
}

/** The Lantern Road: the town in its alcove, its lamps and flags; in the First Age, the stonecutters' camp. */
function town(b, era, rng) {
  const z0 = Z1;
  for (const [u0, u1] of [[74, 79], [82, 87], [88, 93]]) house(b, era, U(u0), U(u1), rng);
  for (let x = L.ravineX1 + 4; x < U(96); x += 6) lantern(b, era, x, gy(1, x), z0 + 6.4);
  flagLine(b, era, U(68), RY + 6, U(96), RY + 6, z0 + 0.4);
  if (era === P) {
    const x = L.campPastX, y = gy(1, x);
    for (let i = 0; i < 6; i++) b.deco(x - 0.9 + Math.cos(i) * 0.7, y, z0 + 4.2 + Math.sin(i) * 0.7, 0.35, 0.3, 0.35, C.stone[i % 4]);
    b.glow(x - 0.5, y, z0 + 3.9, 0.7, 0.5, 0.7, 0xff8a3a);
    b.light(x - 0.1, y + 1, z0 + 4.4, 0xff8a3a, 8, 10, 0.3);
    for (let i = 0; i < 4; i++) b.deco(x + 2 + i * 1.2, y, z0 + 1, 1, 0.6, 0.8, C.stone[i % 4]); // building stone, waiting
  }
  // the ravine: posts at its edges, the town's broken ladder-bridge down in it; in the First Age, logs across
  const y = gy(1, L.ravineX0);
  if (era !== P) {
    for (const x of [L.ravineX0 - 0.2, L.ravineX1 + 1]) for (const z of [1.6, 5.4]) b.deco(x, y, z0 + z, 0.2, 1.2, 0.2, 0x3a2c22);
    // an expedition ladder laid across it, snapped in two
    b.deco(L.ravineX1 - 0.6, y - 2.4, z0 + 2.8, 2.4, 0.12, 1.2, era === F ? 0xb8c8dc : 0xc0c4cc);
    b.deco(L.ravineX0 - 0.2, y - 3.4, z0 + 2.2, 1.6, 0.12, 1.2, era === F ? 0xb8c8dc : 0xc0c4cc);
  } else for (const z of [1.7, 5.9]) b.deco(L.ravineX0, y, z0 + z, L.ravineX1 - L.ravineX0 + 1, 0.2, 0.2, C.log[1]);
}

/** A house on the Lantern Road, in the alcove behind it. In the First Age only its stones are piled, and a hide tent stands there. */
function house(b, era, x0, x1, rng) {
  const y = gy(1, x0), zb1 = Z1 - 5, zf = Z1 - 2, h = 3 + 0 * rng();
  if (era === P) {
    const cx = Math.floor((x0 + x1) / 2);
    for (let i = 0; i < 3; i++) b.deco(cx - 1.5 + i * 0.1, y + i * 0.9, zb1 + 0.5 + i * 0.4, 3 - i * 0.2, 0.9, 3 - i * 0.8, [0x8a6a4a, 0x7a5a3a, 0x9a7a5a][i]);
    b.solid(x0, y, zf, x0 + 1, y, zf, jitter(C.stone));
    b.solid(x0, y + 1, zf, x0, y + 1, zf, jitter(C.stone));
    b.glow(cx - 0.2, y, zf + 0.8, 0.5, 0.3, 0.5, LAMP[0]);
    b.light(cx, y + 0.8, zf + 1.2, 0xff8a3a, 5, 8, 0.25);
    return;
  }
  const wall = era === F ? (px, py, pz) => (hash3(px, py, pz) < 0.5 ? jitter(C.ice)(px, py, pz) : jitter(C.plaster)(px, py, pz)) : jitter(C.plaster);
  b.solid(x0, y, zb1, x1, y, zf, jitter(C.stone));
  b.solid(x0, y + 1, zb1, x1, y + h, zf, wall);
  for (const cx of [x0, x1]) b.solid(cx, y + 1, zf, cx, y + h, zf, jitter(C.timber));
  // windows: warm in Golden Hour, a cold blue glow in the Stopped Age
  for (let wx = x0 + 1; wx < x1; wx += 2)
    for (let wy = y + 1; wy < y + h; wy += 2) {
      if (era === M) b.glow(wx + 0.18, wy + 0.2, zf + 1, 0.64, 0.7, 0.05, 0xffc870);
      else b.glow(wx + 0.18, wy + 0.2, zf + 1, 0.64, 0.7, 0.05, 0x8ab8ff);
      b.deco(wx + 0.12, wy + 0.12, zf + 1, 0.76, 0.1, 0.16, C.timber[0]);
    }
  b.deco(x0 + 1.1, y + 1, zf + 1, 0.8, 1.7, 0.06, 0x4a2c18);
  b.roof(x0 - 0.45, x1 + 1.45, y + h + 1, zb1 - 0.5, zf + 1.45, y + h + 3.6, C.snow[0], C.plaster[0]);
  if (era === M) b.light(x0 + 1.5, y + 2, zf + 1.6, 0xffb060, 4, 7, 0.05);
  if (era === F) for (let ix = x0; ix <= x1 + 1; ix += 1) b.glow(ix + 0.3, y + h + 0.4 - (ix % 3) * 0.2, zf + 1.5, 0.12, 0.5 + (ix % 3) * 0.25, 0.12, 0xcfeaff); // icicles
}

/** The lookout lamp: dark until someone brings it a flame that never goes out (the ember favor). */
function lookoutLamp(world) {
  world.addFeature({
    id: 'lookoutLamp', eras: [M, F], key: (s) => String(!!s.flags.lampLit),
    build: (b, era, s) => {
      const x = L.lampX, y = gy(1, x), z = Z1 + 6.2, lit = s.flags.lampLit;
      b.deco(x + 0.4, y, z, 0.2, 3, 0.2, 0x23262c);
      b.deco(x + 0.2, y + 3, z - 0.2, 0.6, 0.1, 0.6, 0x23262c);
      if (lit) {
        b.glow(x + 0.25, y + 3.1, z - 0.15, 0.5, 0.55, 0.5, 0xffb84a);
        b.light(x + 0.5, y + 3.4, z - 0.6, 0xffb060, 8, 12, era === M ? 0.08 : 0);
      } else b.deco(x + 0.25, y + 3.1, z - 0.15, 0.5, 0.55, 0.5, era === F ? 0x8aa0c0 : 0x3a3a44);
      b.deco(x + 0.2, y + 3.65, z - 0.2, 0.6, 0.12, 0.6, C.snow[0]);
    },
  });
}

/**
 * A stream coming down the slope behind leg k, from the road above, in steps: a fall down each
 * rock step, a run of water across each ledge. In the Stopped Age it's all ice, a frozen cascade.
 */
function cascade(b, era, k, x0, x1, bottom) {
  let prev = bottom;
  for (let c = 0; c <= GAP; c++) {
    const z = zb(k) - c, top = c === 0 ? prev : Math.max(...[x0, x1].map((x) => gapTop(k, x - OX, c)));
    if (era === F) {
      for (let x = x0; x <= x1; x++) b.solid(x, prev, z, x, top, z, jitter(C.ice));
      if (top > prev) b.glow(x0 + 0.3, prev + 0.2, z + 1.01, 0.3, top - prev, 0.04, ICE_GLOW);
    } else if (era === M && top > prev) b.waterfall(x0, x1 + 1, prev - 0.4, top + 0.2, z + 1.02, z + 1.4, 0x8ad0f0);
    else if (era === M) b.deco(x0, top - 0.04, z, x1 - x0 + 1, 0.12, 1, 0x7ac4ec);
    prev = Math.max(prev, top);
  }
  // and the last step, down from the road above
  if (era === M) b.waterfall(x0, x1 + 1, prev - 0.4, legH(k + 1, x0 - OX) + 0.2, zb(k) - GAP + 0.02, zb(k) - GAP + 0.4, 0x8ad0f0);
}

/** The Icefall: the falls pour down the slope and through the road in the Golden Hour, and stand frozen in the Stopped Age. */
function icefall(b, era) {
  const y = gy(2, L.fallsX0), z0 = Z2, w = L.fallsX1 - L.fallsX0 + 1;
  if (era !== P) cascade(b, era, 2, L.fallsX0, L.fallsX1, y);
  if (era === M) {
    b.waterfall(L.fallsX0, L.fallsX1 + 1, y - 4, y + 0.6, z0 + 0.02, z0 + 0.5, 0x8ad0f0);
    b.glow(L.fallsX0, y - 2.5, z0 + 0.6, w, 0.1, 0.3, 0xffffff);
  }
  if (era === P) b.deco(L.fallsX0, y - 3.4, z0, w, 0.2, 7, 0x2a5a7a); // a stream, not yet a fall
}

/** The Sundial Terrace: hour stones in an arc, the brass gnomon, and the statue of the first Clockmaker. */
function terrace(b, era) {
  const z0 = Z2, x0 = L.gnomonX, y = gy(2, x0);
  if (era !== P) {
    for (let i = 0; i < 9; i++) b.deco(x0 + 0.4, y, z0 - 3.6 + i * 0.4, 0.25, Math.max(0.4, 6 - i * 0.62), 0.4, era === F ? 0x8a9aa8 : C.brass[0]);
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.08 + (0.84 * k) / 8);
      const sx = x0 + 0.5 - Math.cos(a) * 5.5, sz = z0 + 2.6 + Math.sin(a) * 3.2;
      b.deco(sx - 0.3, y, sz - 0.3, 0.6, 0.35, 0.6, C.marble[0]);
      if (era === M) b.glow(sx - 0.12, y + 0.35, sz - 0.12, 0.24, 0.03, 0.24, 0xffd070);
    }
    const sy = gy(2, L.statueX);
    b.solid(L.statueX - 1, sy, z0 - 4, L.statueX + 1, sy + 1, z0 - 2, jitter(C.marble));
    b.deco(L.statueX - 0.6, sy + 0.4, z0 - 1.02, 2.2, 0.6, 0.04, C.brass[0]); // the plaque
  } else {
    b.solid(x0, y, z0 - 3, x0, y + 4, z0 - 3, jitter(C.granite));
    b.glow(x0 + 0.2, y + 4.2, z0 - 2.7, 0.6, 0.15, 0.4, 0x7affc8);
  }
  for (let x = U(58); x < U(95); x += 6) lantern(b, era, x, gy(2, x), z0 + 6.4);
  flagLine(b, era, U(56), y + 6.5, U(96), y + 6.5, z0 + 0.4);
}

/** The Clockworks: a gallery cut into the mountain, iron beams overhead, gears in the rock. */
function clockworkHall(b, era) {
  const z0 = Z3;
  if (era === P) return;
  for (let x = U(32); x < U(96); x += 3) b.deco(x, gy(3, x) + 6.6, z0 - 0.5, 0.5, 0.5, 7.4, 0x3a3f4a);
  for (let x = U(34); x < U(94); x += 9) {
    for (const dx of [0, 4]) b.deco(x + dx, gy(3, x + dx), z0 + 0.1, 0.2, 6.6, 0.2, era === F ? C.ice[0] : 0x4a4e58);
    // a gear, half sunk in the rock behind
    if (era === M) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.deco(x + 2 + Math.cos(a) * 1.4 - 0.2, gy(3, x) + 3.5 + Math.sin(a) * 1.4 - 0.2, z0 + 0.02, 0.4, 0.4, 0.1, C.brass[i % 3]);
    }
  }
}

/** The Crevasses: the First Age's log bridge, and a rockfall across the road, with the frozen falls as the only way over. */
function crevasses(b, era) {
  const z0 = Z4, y = gy(4, L.iceStairX0);
  if (era === P) for (const z of [1.7, 5.9]) b.deco(L.crev1X0, gy(4, L.crev1X0), z0 + z, L.crev1X1 - L.crev1X0 + 1, 0.2, 0.2, C.log[1]);
  else {
    // an expedition ladder that has fallen in
    const cy = gy(4, L.crev1X0);
    b.deco(L.crev1X0 + 0.5, cy - 3.2, z0 + 2.4, 3.6, 0.12, 1.2, era === F ? 0xb8c8dc : 0xc0c4cc);
    for (const x of [L.crev1X0 - 0.3, L.crev1X1 + 1]) b.deco(x, cy, z0 + 1.4, 0.2, 1.3, 0.2, 0x3a2c22);
  }
  // the rockfall: too tall to climb, in every age
  for (let x = L.iceStairX1 + 1; x < L.downX0; x++) b.solid(x, y, z0, x, y + 4, z0 + 6, jitter(C.granite));
  for (let x = L.downX0; x < L.downX0 + 4; x++) b.solid(x, y, z0, x, y + 3 - (x - L.downX0), z0 + 6, jitter(C.granite));
  for (let x = L.iceStairX1 + 1; x < L.downX0; x++) b.solid(x, y + 5, z0, x, y + 5, z0 + 6, jitter(C.snow));
  // the falls coming down beside it: frozen into a stair in the Stopped Age
  if (era === F) for (let i = 0; i <= L.iceStairX1 - L.iceStairX0; i++) b.solid(L.iceStairX0 + i, y, z0, L.iceStairX0 + i, y + i, z0 + 6, jitter(C.ice));
  if (era !== P) cascade(b, era, 4, L.iceStairX0, L.iceStairX1, y);
  if (era === M) b.stream(L.iceStairX0, z0, L.iceStairX1 + 1, z0 + 7, 0x7ac4ec, y);
}

/** The great dome: a copper shell behind the summit road, open at the front, slit at the top. */
function dome(b, era) {
  const { x: cx, y: cy, z: cz, r } = L.dome;
  const shell = era === F ? (x, y, z) => (hash3(x, y, z) < 0.25 ? jitter(C.ice)(x, y, z) : jitter(C.copper)(x, y, z)) : jitter(C.copper);
  for (let x = cx - r; x <= cx + r; x++)
    for (let y = cy; y <= cy + r; y++)
      for (let z = cz - r; z <= cz; z++) {
        const d = Math.hypot(x - cx, y - cy, z - cz);
        if (d > r || d < r - 1.1) continue;
        if (Math.abs(x - cx) <= 1 && y > cy + 3) continue; // the slit the telescope looks out of
        if (era === P) {
          const ang = Math.atan2(z - cz, x - cx);
          const rib = Math.abs(((ang / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.42;
          if (y <= cy + 1) b.setCell(x, y, z, 1, jitter(C.stone)(x, y, z));
          else if (rib) b.setCell(x, y, z, 1, jitter(C.wood)(x, y, z));
          continue;
        }
        if (era === F && hash3(x, y, z) < 0.04 && y > cy + 4) continue;
        const exposed = Math.hypot(x - cx, y + 1 - cy, z - cz) > r && y > cy + 2;
        b.setCell(x, y, z, 1, y <= cy + 1 ? jitter(C.marble)(x, y, z) : exposed ? jitter(C.snow)(x, y, z) : shell(x, y, z));
      }
  for (const px of [cx - r, cx + r]) b.solid(px, OY, ZS, px, OY + 7, ZS, era === P ? jitter(C.wood) : jitter(C.marble));
  if (era !== P) {
    const inl = era === F ? 0x9aa8b8 : C.brass[0];
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      b.deco(L.orrery.x + Math.cos(a) * 4.5 - 0.15, OY, L.orrery.z + Math.sin(a) * 3 - 0.15, 0.3, 0.02, 0.3, inl);
    }
  }
  for (const x of [cx - r + 1.5, cx + r - 1.5]) {
    b.glow(x, OY + 0.6, ZS + 0.6, 0.6, 0.35, 0.6, era === F ? 0x9ac0ff : LAMP[0]);
    b.deco(x - 0.1, OY, ZS + 0.5, 0.8, 0.6, 0.8, 0x2a2a30);
    b.light(x + 0.3, OY + 1.6, ZS + 1.2, era === F ? 0x9ac0ff : 0xff9a3a, 7, 11, era === F ? 0 : 0.25);
  }
}

/** Frost: the Stopped Age seeping into the Golden Hour. Ice on the ground, and a wall of it on the observatory doors. */
function frost(world) {
  world.addFeature({
    id: 'frost', eras: [M, F], key: (s) => String(!!s.flags.hoursReturned),
    build: (b, era, s) => {
      if (s.flags.hoursReturned) return;
      const y = gy(5, L.frostWallX);
      b.solid(L.frostWallX, y, ZS, L.frostWallX, y + 4, ZS + 6, jitter(C.ice));
      for (let z = 0; z <= 6; z += 2) b.glow(L.frostWallX + 0.2, y + 4.8, ZS + z + 0.4, 0.6, 0.12, 1.2, ICE_GLOW);
      if (era !== M) return;
      for (const zn of FROST_ZONES) for (let x = zn.x0; x <= zn.x1; x += 2) {
        const h = hash3(x, 9, zn.k), fy = gy(zn.k, x);
        b.glow(x + h, fy + 0.01, zb(zn.k) + 0.4 + h * 6, 0.9, 0.02, 0.6, ICE_GLOW);
        if (h > 0.6) b.deco(x + h * 0.5, fy, zb(zn.k) + 6.4, 0.3, 0.8 + h, 0.3, C.ice[0]);
      }
    },
  });
}

/** The very top: the Needle (the summit's own gnomon), cairns, a bench, the rail at the overlook, and flags everywhere. */
function summit(b, era) {
  const { x: nx, z: nz } = L.needle, ny = gy(5, nx);
  if (era === P) {
    b.solid(nx, ny, nz, nx, ny + 4, nz, jitter(C.granite));
    b.glow(nx + 0.2, ny + 3, nz + 1, 0.6, 0.6, 0.05, 0x7affc8); // a mark cut into it, glowing: the first one
  } else {
    b.solid(nx - 1, ny, nz - 1, nx + 1, ny, nz + 1, jitter(C.granite));
    b.solid(nx, ny + 1, nz, nx, ny + 9, nz, era === F ? (x, y, z) => (hash3(x, y, z) < 0.4 ? jitter(C.ice)(x, y, z) : jitter(C.granite)(x, y, z)) : jitter(C.granite));
    b.deco(nx - 0.1, ny + 10, nz - 0.1, 1.2, 0.4, 1.2, era === F ? 0x9aa8b8 : C.brass[0]);
    b.deco(nx + 0.38, ny + 10.4, nz + 0.38, 0.24, 1.6, 0.24, era === F ? 0x9aa8b8 : C.brass[0]);
    // flags from the Needle to every corner of the summit: the most flags on the mountain
    for (const [x1, z1] of [[U(0.5), ZS - 10], [U(40), ZS - 10], [U(1), ZS + 6.5], [U(38), ZS + 6.5], [U(18), ZS + 6.5]]) flagLine(b, era, nx + 0.5, ny + 9.6, x1, gy(5, x1) + 2.6, z1, nz + 0.5);
  }
  // cairns
  for (const [cx, cz] of [[U(26.2), ZS + 0.6], [U(4), ZS - 8], [U(34), ZS - 7]])
    for (let i = 0; i < 5; i++) b.deco(cx + i * 0.05, gy(5, cx) + i * 0.32, cz + i * 0.06, 0.9 - i * 0.15, 0.32, 0.8 - i * 0.12, C.stone[i % 4]);
  if (era === P) return;
  // the rail at the north edge: you can look, not fall
  const ry = gy(5, U(10));
  for (let x = U(0); x <= U(OVERLOOK_U); x += 2) b.deco(x + 0.42, gy(5, x), ZS - 10.8, 0.16, 1.1, 0.16, 0x3a2c22);
  b.deco(U(0), ry + 1, ZS - 10.78, OVERLOOK_U + 1, 0.08, 0.12, 0x3a2c22);
  b.deco(U(0), ry + 1.08, ZS - 10.8, OVERLOOK_U + 1, 0.1, 0.16, C.snow[0]);
  // a bench, looking out, and a brass telescope on a tripod
  b.deco(U(12), ry, ZS - 9.2, 2.6, 0.45, 0.7, C.wood[0]);
  b.deco(U(12), ry + 0.45, ZS - 9.2, 2.6, 0.1, 0.7, C.snow[0]);
  if (era === M) {
    for (const [dx, dz] of [[0, 0], [0.5, 0.3], [0.1, 0.5]]) b.deco(U(24) + dx, ry, ZS - 9.4 + dz, 0.08, 1.3, 0.08, 0x3a2c22);
    b.deco(U(23.6), ry + 1.3, ZS - 9.3, 0.9, 0.22, 0.22, C.brass[0]);
  }
}

/** Sela's 600-year stone bridge across the first crevasse, built once she has the Master Drawings. */
function selaSteps(world) {
  world.addFeature({
    id: 'selaSteps', eras: [P, M, F], key: (s) => String(!!s.flags.selaBuilt),
    build: (b, era, s) => {
      if (!s.flags.selaBuilt) return;
      const y = gy(4, L.crev1X0) - 1, z0 = Z4;
      for (let x = L.crev1X0; x <= L.crev1X1; x++) {
        b.solid(x, y, z0, x, y, z0 + 6, jitter(C.marble));
        b.deco(x, y + 1, z0 + 0.2, 1, 0.45, 0.25, C.brass[0]);
        b.deco(x, y + 1, z0 + 6.55, 1, 0.45, 0.25, C.brass[0]);
      }
    },
  });
}

/** Warm thermal spring terraces carved over 600 years across the rockfall once the First Age sluice is shattered. */
function springSteps(world) {
  world.addFeature({
    id: 'springSteps', eras: [P, M], key: (s) => String(!!s.flags.springOpened),
    build: (b, era, s) => {
      if (!s.flags.springOpened) return;
      const y = gy(4, L.iceStairX0), z0 = Z4;
      for (let i = 0; i <= L.iceStairX1 - L.iceStairX0; i++) {
        b.solid(L.iceStairX0 + i, y, z0, L.iceStairX0 + i, y + i, z0 + 6, jitter(C.marble));
        b.glow(L.iceStairX0 + i + 0.1, y + i + 0.98, z0 + 1, 0.8, 0.08, 4.5, 0x6cf0ff);
      }
    },
  });
}

/** Zach's flag, planted at the top for good (the favor). */
function zachFlag(world) {
  world.addFeature({
    id: 'zachFlag', eras: [P, M, F], key: (s) => String(!!s.flags.flagPlanted),
    build: (b, era, s) => {
      if (!s.flags.flagPlanted) return;
      const { x, z } = L.flagSpot, y = gy(5, x);
      b.deco(x + 0.45, y, z, 0.1, 2.6, 0.1, 0x4a3020);
      b.deco(x + 0.55, y + 1.8, z, 1.1, 0.7, 0.05, 0x4a6ad8);
      b.deco(x + 0.85, y + 2.0, z + 0.03, 0.4, 0.3, 0.05, 0xf0c83a);
    },
  });
}

/** The fixed ropes along the road's edge, on posts, as on any big mountain; and drifts of snow. */
function ropes(b, era, rng) {
  for (let k = 0; k <= 5; k++) {
    const arrive = k > 0 ? TURN(k - 1) : null;
    const z = zb(k) + 6.75;
    for (let u = 0; u <= 99; u++) {
      const x = U(u), h = legH(k, u);
      if (arrive && between(u, arrive[0] - 1, arrive[1] + 1)) continue;
      if (holeAt(era, k, x)) continue;
      if (era !== P) {
        if (u % 4 === 0) b.deco(x + 0.44, h, z, 0.12, 1.15, 0.12, era === F ? 0x8a94a8 : 0x5a4030);
        b.deco(x, h + 0.95, z + 0.03, 1, 0.05, 0.05, era === F ? 0xa8b4cc : k % 2 ? 0x3a6ad8 : 0xd83a3a);
      }
      if (rng() < 0.22) b.deco(x + rng() * 0.5, h, zb(k) + 6.2 + rng() * 0.3, 1.2 + rng() * 1.4, 0.16 + rng() * 0.18, 0.6, C.snow[1]);
    }
  }
}

/** Each turn: a cairn and a flagpole at the top, flags down to the bottom, so you can't miss the way up. */
function turnMarkers(b, era) {
  for (let k = 0; k < 5; k++) {
    const [t0, t1] = TURN(k), e = endH(k);
    const outer = LEGS[k].dir > 0 ? U(t1 + 0.6) : U(t0 - 0.2);
    const top = e + TURN_RISE, zTop = zb(k) - GAP;
    for (let i = 0; i < 4; i++) b.deco(outer - 0.4 + i * 0.05, top + i * 0.35, zTop + 0.2 + i * 0.05, 0.9 - i * 0.18, 0.35, 0.8 - i * 0.15, C.stone[i % 4]);
    if (era === P) continue;
    b.deco(outer - 0.05, top + 1.2, zTop + 0.55, 0.12, 4.4, 0.12, 0x4a3020);
    flagLine(b, era, outer, top + 5.4, outer, e + 1.6, zb(k) + 0.4, zTop + 0.6);
    flagLine(b, era, outer, top + 5.4, outer + (LEGS[k].dir > 0 ? -12 : 12), legH(k + 1, LEGS[k].dir > 0 ? 87 : 12) + 3.5, zb(k + 1) + 0.4, zTop + 0.6);
  }
}

/** Pines on the lower slopes and shoulders, and a few on the road's back edge low down. */
function forest(b, era, rng) {
  for (let i = 0; i < 260; i++) {
    const x = rng.int(0, W - 1), z = rng.int(ZMIN + 2, ZMAX - 2);
    const col = column(x, z);
    if (col.kind !== 'rock' || col.top > 14 || col.top < -6) continue;
    if (between(x, U(-8), U(108)) && z > -14) continue; // (nothing between the road and the camera)
    pine(b, era, x, col.top, z, rng.int(5, 10));
  }
}

// ---------------------------------------------------------------------------
// People, things to pick up, things to look at
// ---------------------------------------------------------------------------
const FROZEN = 0xb8ccff;
const on = (k, x, z) => ({ x, y: gy(k, x), z: zb(k) + z });
export const SPAWNS = [
  // Base Camp: the guides and porters
  { type: 'npc', id: 'anwen', era: M, ...on(0, L.guideX, 5.6), sheet: 'anwen', name: 'Anwen the Guide' },
  { type: 'npc', id: 'porterKit', era: M, ...on(0, U(31.5), 1.6), sheet: 'porterKit', name: 'Kit the Porter' },
  { type: 'npc', id: 'porterBram', era: M, ...on(0, U(39.5), 5.4), sheet: 'porterBram', name: 'Bram the Porter' },
  { type: 'npc', id: 'anwenF', era: F, ...on(0, L.guideX, 5.6), sheet: 'anwen', name: 'Anwen the Guide', frozen: true, tint: FROZEN, unless: 'hoursReturned' },
  // the Lantern Road
  { type: 'npc', id: 'ingrid', era: M, ...on(1, L.ingridX, 5.2), sheet: 'ingrid', name: 'Ingrid the Lamplighter' },
  { type: 'npc', id: 'ingridF', era: F, ...on(1, L.ingridX, 5.2), sheet: 'ingrid', name: 'Ingrid the Lamplighter', frozen: true, tint: FROZEN, unless: 'hoursReturned' },
  { type: 'npc', id: 'ingridW', era: F, ...on(1, L.ingridX, 5.2), sheet: 'ingrid', name: 'Ingrid the Lamplighter', needs: 'hoursReturned' },
  { type: 'npc', id: 'sela', era: P, ...on(1, L.campPastX + 2.5, 5.6), sheet: 'sela', name: 'Sela the Stonecutter' },
  { type: 'npc', id: 'michelle', era: M, ...on(1, L.michelleX, 1.4), sheet: 'michelleWinter', name: 'Mysterious Stranger', unless: 'christopherMet', stranger: true },
  { type: 'npc', id: 'porterRest', era: M, ...on(1, U(44.5), 1.4), sheet: 'porterKit', name: 'Kit the Porter' },
  // the Sundial Terrace
  { type: 'npc', id: 'zach', era: M, ...on(2, U(70.5), 5.6), sheet: 'zachWinter', name: 'Zach Tiberious', small: true, unless: 'christopherMet' },
  { type: 'npc', id: 'megan', era: M, ...on(2, U(71.6), 5.9), sheet: 'meganWinter', name: 'Megan the Squirrel', small: true, unless: 'christopherMet' },
  // the Clockworks
  { type: 'npc', id: 'michelleDome', era: M, ...on(3, L.michelle2X, 1.6), sheet: 'michelleWinter', name: 'Mysterious Stranger', stranger: true },
  { type: 'npc', id: 'porterHigh', era: M, ...on(4, U(8.5), 1.6), sheet: 'porterBram', name: 'Bram the Porter' },
  { type: 'npc', id: 'selaHigh', era: P, ...on(4, U(12.5), 1.6), sheet: 'sela', name: 'Sela the Stonecutter' },
  // the Summit: Tobin, the memory under the orrery, Sir Orin at the Needle
  { type: 'npc', id: 'tobin', era: M, ...on(5, L.tobinX, 5.4), sheet: 'tobin', name: 'Tobin the Stargazer' },
  { type: 'npc', id: 'tobinF', era: F, ...on(5, L.tobinX, 5.4), sheet: 'tobin', name: 'Tobin the Stargazer', frozen: true, tint: FROZEN, unless: 'hoursReturned' },
  { type: 'npc', id: 'tobinW', era: F, ...on(5, L.tobinX, 5.4), sheet: 'tobin', name: 'Tobin the Stargazer', needs: 'hoursReturned' },
  { type: 'npc', id: 'youngLyra', era: M, ...on(5, U(68.2), 2.4), sheet: 'lyraYoung', name: 'Lyra (Memory)', needs: 'christopherMet', unless: 'hoursReturned', memory: true },
  { type: 'npc', id: 'youngChristopher', era: M, ...on(5, U(69.6), 2.4), sheet: 'christopherYoung', name: 'Sir Orin (Memory)', needs: 'christopherMet', unless: 'hoursReturned', memory: true },
  { type: 'npc', id: 'christopher', era: M, ...on(5, L.christopherX, 2.2), sheet: 'christopher', name: 'Sir Orin', needs: 'christopherMet', reach: 2.4 }, // (on his throne during the fight: see SummitGame.placeOrin)
  { type: 'npc', id: 'lyraEnd', era: M, ...on(5, U(23.2), 2.4), sheet: 'michelleWinter', name: 'Lyra', needs: 'hoursReturned', unless: 'lyraAtRest' },
  { type: 'npc', id: 'eugene', era: M, ...on(5, U(28.5), 4.4), sheet: 'eugeneWinter', name: 'Donald Eugene', needs: 'hoursReturned' },
  { type: 'npc', id: 'zachEnd', era: M, ...on(5, U(30.2), 5.6), sheet: 'zachWinter', name: 'Zach Tiberious', small: true, needs: 'hoursReturned' },
  { type: 'npc', id: 'meganEnd', era: M, ...on(5, U(31.4), 6), sheet: 'meganWinter', name: 'Megan the Squirrel', small: true, needs: 'hoursReturned' },
  { type: 'npc', id: 'anwenEnd', era: M, ...on(5, U(34.5), 5), sheet: 'anwen', name: 'Anwen the Guide', needs: 'hoursReturned' },
  // things to pick up
  { type: 'pickup', id: 'ember', era: P, ...on(1, L.campPastX - 0.2, 4.3), item: 'ember', needs: 'emberQuest', lift: 0.6 },
  { type: 'pickup', id: 'page', era: M, ...on(1, L.pageX, 5.6), item: 'page', lift: 0.5 },
  { type: 'pickup', id: 'masterDrawings', era: M, ...on(3, U(56.5), 3.5), item: 'masterDrawings', lift: 0.6 },
  // things to strike with the wrench (X)
  { type: 'strike', id: 'cwChime', era: M, ...on(3, U(44.5), 4.8), hits: 3, flag: 'cwChimeRung', prompt: 'Strike the Clockworks resonance chime', visual: 'chime', color: 0xffd070, freq: 392, hx: 1.2, hz: 1.4 },
  { type: 'strike', id: 'thermalLever', era: P, ...on(4, U(50.5), 1.6), hits: 3, flag: 'springOpened', prompt: 'Shatter the frozen thermal sluice', visual: 'ice', color: 0x7be0ff, hx: 1.3, hz: 1.4 },
  { type: 'strike', id: 'orreryChime', era: M, ...on(5, U(73.5), 2.2), hits: 3, flag: 'orreryChimeRung', prompt: 'Ring the Orrery alignment chime', visual: 'chime', color: 0xffe08a, freq: 523, hx: 1.2, hz: 1.4 },
  { type: 'strike', id: 'orinAnchor', era: M, x: ARENA.anchorX, y: ARENA.y, z: ARENA.z0 + 0.6, hits: 3, flag: 'orinPhase1', needs: 'summitTalk', prompt: "Shatter the Needle's Frost-Anchor", visual: 'ice', color: 0x6ce2ff, hx: 1.4, hz: 1.5 },
  // things to look at, and use
  { type: 'interact', id: 'lookoutLamp', era: M, ...on(1, L.lampX + 0.5, 5.4), prompt: 'The lookout lamp' },
  { type: 'interact', id: 'statue', era: M, ...on(2, L.statueX + 0.5, 0.5), prompt: 'The statue' },
  { type: 'interact', id: 'statueF', era: F, ...on(2, L.statueX + 0.5, 0.5), prompt: 'The statue' },
  { type: 'interact', id: 'frostWall', era: M, ...on(5, L.frostWallX + 1.5, 3.5), prompt: 'The frozen doors', unless: 'hoursReturned' },
  { type: 'interact', id: 'starBooks', era: M, ...on(5, U(80.5), 0.6), prompt: "Tobin's star-books" },
  { type: 'interact', id: 'needle', era: M, x: L.needle.x + 0.5, y: gy(5, L.needle.x), z: L.needle.z + 1.6, prompt: 'The Needle' },
  { type: 'interact', id: 'lyraCup', era: M, ...on(5, U(22.4), 3.2), prompt: 'The cup', visual: 'cup', needs: 'lyraAtRest' },
  { type: 'interact', id: 'telescope', era: M, x: U(24), y: gy(5, U(24)), z: ZS - 8.8, prompt: 'Look through the brass telescope' },
  { type: 'interact', id: 'flagSpot', era: M, x: L.flagSpot.x + 0.5, y: gy(5, L.flagSpot.x), z: L.flagSpot.z, prompt: 'Plant the flag', needs: 'zachQuest', unless: 'flagPlanted' },
  // the last of Donald Eugene's spilled cogs
  { type: 'cog', id: 'cogP1', era: P, ...on(0, L.pineX + 0.5, 6), lift: 0.7 },
  { type: 'cog', id: 'cogF1', era: F, ...on(0, L.pineX + 1, 3.5), lift: 3.7 },
  { type: 'cog', id: 'cogM1', era: M, ...on(0, U(36.5), 6), lift: 0.7 },
  { type: 'cog', id: 'cogP2', era: P, ...on(1, U(60.5), 1), lift: 0.7 },
  { type: 'cog', id: 'cogM2', era: M, ...on(1, U(5.5), 1), lift: 0.7 },
  { type: 'cog', id: 'cogF2', era: F, ...on(2, U(84.5), 1), lift: 0.7 },
  { type: 'cog', id: 'cogM3', era: M, ...on(3, U(10.5), 6), lift: 0.7 },
  { type: 'cog', id: 'cogP3', era: P, ...on(3, U(64.5), 6), lift: 0.7 },
  { type: 'cog', id: 'cogM4', era: M, ...on(4, U(64.5), 3), lift: 6.7 },
  { type: 'cog', id: 'cogF3', era: F, x: U(38.5), y: gy(5, U(38.5)), z: ZS - 8, lift: 0.7 },
];
for (const s of SPAWNS) if (s.lift) s.y += s.lift;
export const COG_TOTAL = SPAWNS.filter((s) => s.type === 'cog').length;

// ---------------------------------------------------------------------------
// Pieces shared by the places above, and things that aren't voxels
// ---------------------------------------------------------------------------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.7, ...o });

/** A snowy pine: a trunk and shrinking tiers, snow on each. */
function pine(b, era, x, y, z, h) {
  const needles = era === F ? (px, py, pz) => FROST[Math.floor(hash3(px, py, pz) * 3)] : jitter(C.leaves);
  b.solid(x, y, z, x, y + 1, z, jitter(C.log));
  let r = Math.max(1, Math.round(h / 3));
  for (let ty = y + 2; ty < y + h && r >= 0; ty += 2, r--) {
    b.solid(x - r, ty, z - r, x + r, ty, z + r, needles);
    if (r > 0) b.solid(x - r + 1, ty + 1, z - r + 1, x + r - 1, ty + 1, z + r - 1, jitter(C.snow));
    else b.solid(x, ty + 1, z, x, ty + 1, z, jitter(C.snow));
  }
}

/** A lantern on a post at the road's edge (a torch in the First Age; frozen still in the Stopped Age). */
function lantern(b, era, x, y, z) {
  if (era === P) {
    b.deco(x + 0.42, y, z, 0.16, 1.6, 0.16, 0x4a3020);
    b.glow(x + 0.36, y + 1.6, z - 0.04, 0.28, 0.34, 0.28, LAMP[0]);
    b.light(x + 0.5, y + 2, z + 0.2, 0xff8a3a, 6, 9, 0.3);
    return;
  }
  b.deco(x + 0.42, y, z, 0.16, 2.3, 0.16, 0x23262c);
  b.deco(x + 0.3, y + 2.3, z - 0.12, 0.4, 0.08, 0.4, 0x23262c);
  b.glow(x + 0.34, y + 2.38, z - 0.08, 0.32, 0.4, 0.32, era === M ? LAMP[1] : LAMP[2]);
  b.deco(x + 0.3, y + 2.78, z - 0.12, 0.4, 0.1, 0.4, 0x23262c);
  b.deco(x + 0.27, y + 2.88, z - 0.15, 0.46, 0.12, 0.46, C.snow[0]);
  b.light(x + 0.5, y + 2.6, z + 0.3, era === M ? 0xffb060 : 0x9ac0ff, era === M ? 7 : 5, 10, era === M ? 0.05 : 0);
}

/** A line of prayer flags from (x0, y0, zStart) to (x1, y1, zEnd), sagging a little. (The First Age has none yet.) */
function flagLine(b, era, x0, y0, x1, y1, zEnd, zStart = zEnd) {
  if (era === P) return;
  const cols = era === M ? FLAG_COLS : FLAG_DIM;
  const n = Math.max(3, Math.floor(Math.hypot(x1 - x0, y1 - y0, zEnd - zStart) / 0.7));
  for (let i = 1; i < n; i++) {
    const t = i / n, fx = x0 + (x1 - x0) * t, fy = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 0.9, fz = zStart + (zEnd - zStart) * t;
    b.deco(fx, fy, fz, 0.5, 0.03, 0.03, 0x6a5a4a);
    b.deco(fx + 0.04, fy - 0.45, fz, 0.36, 0.42, 0.03, cols[i % cols.length]);
  }
}

/** The orrery: a sun, and planets on brass rings, turning above the floor (still, in the Stopped Age). */
function orrery(group, era) {
  const o = new THREE.Group();
  o.position.set(L.orrery.x, L.orrery.y, L.orrery.z);
  const brass = std(era === F ? 0xa8b4c4 : 0xc9963a);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffd070, emissive: era === F ? 0x6a7aa0 : 0xffb030, emissiveIntensity: era === F ? 0.6 : 2.4 }));
  o.add(sun);
  const rings = era === P ? 2 : 4;
  const planets = [0x8ab8ff, 0xe08a5a, 0x7affc8, 0xd8c0ff];
  for (let i = 0; i < rings; i++) {
    const rad = 1.7 + i * 1.15;
    const ring = new THREE.Group();
    ring.rotation.x = Math.PI / 2 + (i - 1.5) * 0.12;
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(rad, 0.04, 6, 64), brass));
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, rad, 6), brass);
    arm.rotation.z = Math.PI / 2;
    arm.position.x = rad / 2;
    ring.add(arm);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 2) * 0.12, 16, 12), std(planets[i], { metalness: 0.2, roughness: 0.6, emissive: planets[i], emissiveIntensity: era === F ? 0.05 : 0.35 }));
    pl.position.x = rad;
    ring.add(pl);
    o.add(ring);
    SPINNERS.push({ obj: ring, era, axis: 'z', speed: era === M ? 0.5 / (i + 1) : era === P ? 0.15 / (i + 1) : 0 });
  }
  // a column holding it up
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, L.orrery.y - OY, 8), brass);
  col.position.y = -(L.orrery.y - OY) / 2;
  o.add(col);
  for (const m of o.children) m.castShadow = true;
  group.add(o);
}

/** The great telescope, looking up and out through the dome's slit. */
function telescope(group, era) {
  if (era === P) return; // not cast yet
  const t = new THREE.Group();
  t.position.set(L.dome.x + 0.5, OY, ZS - 6);
  const brass = std(era === F ? 0x9aa8b8 : 0xb8862a);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.2, 12), std(0x3a3a44, { metalness: 0.4 }));
  base.position.y = 1.1;
  t.add(base);
  const tube = new THREE.Group();
  tube.position.y = 2.6;
  tube.rotation.x = -0.75;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 11, 20), brass);
  body.position.y = 4.5;
  tube.add(body);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.98 - i * 0.04, 0.09, 8, 24), std(0x3a2a1a, { metalness: 0.3 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.5 + i * 2.8;
    tube.add(band);
  }
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), new THREE.MeshBasicMaterial({ color: era === F ? 0x8aa0d0 : 0x9fe8ff }));
  lens.position.y = 10.01;
  lens.rotation.x = -Math.PI / 2;
  tube.add(lens);
  t.add(tube);
  t.traverse((m) => m.isMesh && (m.castShadow = true));
  group.add(t);
}

/** The mountain past the voxels, and the ranges all round it, as one sheet of terrain per age. */
const TERRAIN_COLORS = [
  // the First Age: moonlit snow, deep blue shadow, the aurora's green in the haze
  { sun: [0.4, 0.7, 0.65], snowLit: 0xb0c8f4, snowShade: 0x26346a, rockLit: 0x34405e, rockShade: 0x0e1428, low: 0x0e2418, haze: 0x2a4a6a },
  // Golden Hour: snow lit gold and rose, shadows blue-violet, dark rock between
  { sun: [-0.85, 0.32, 0.45], snowLit: 0xffe0c0, snowShade: 0x8a86c8, rockLit: 0x7a5a52, rockShade: 0x2a2440, low: 0x4a6a3a, haze: 0xf4c4a0 },
  // the Stopped Age: silver light, lilac shadow
  { sun: [0.55, 0.75, 0.6], snowLit: 0xf0f2ff, snowShade: 0x6a6aa8, rockLit: 0x5a5a7e, rockShade: 0x20203a, low: 0xc8d0e0, haze: 0x6a6a98 },
];
let terrainCache = null;
function terrain(group, era) {
  terrainCache ||= terrainMeshes({
    heightAt: landAt,
    hole: (x, z) => x > 0 && x < W && z > ZMIN && z < ZMAX,
    bounds: [-560, 720, -800, 200],
    fine: [-180, 320, -260, 60],
    step: 2.5,
    colors: TERRAIN_COLORS,
    snowLine: -6,
    lowLine: -12,
  });
  group.add(terrainCache[era]);
}

/**
 * Far below, through the openings in the clouds behind the mountain: the valley of Hollowmere, and
 * the harbor of Saltwick by the sea. Built big, so they read from the summit. In the First Age
 * there is only forest and sea; in the Stopped Age, frost.
 */
export const TOWNS = { hollowmere: { x: 10, z: -330, y: -30.5 }, saltwick: { x: 160, z: -350, y: -30.5 } };
function below(group, era) {
  const S = 2.4;
  const frost = era === F, first = era === P;
  const mat = (color, glow = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: glow ? color : 0, emissiveIntensity: glow, ...o });
  const town = (t) => {
    const g = new THREE.Group();
    g.position.set(t.x, t.y, t.z);
    g.scale.setScalar(S);
    group.add(g);
    return g;
  };
  const disc = (t, x, z, r, color, o) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat(color, 0, o));
    m.position.set(x, 0, z);
    t.add(m);
    return m;
  };
  const box = (t, x, yy, z, sx, sy, sz, color, glow = 0, rot = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color, glow));
    m.position.set(x, yy + sy / 2, z);
    m.rotation.y = rot;
    t.add(m);
    return m;
  };
  const cone = (t, x, yy, z, r, h, color, sides = 4, rot = Math.PI / 4) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), mat(color));
    m.position.set(x, yy + h / 2, z);
    m.rotation.y = rot;
    t.add(m);
    return m;
  };
  const tree = (t, x, z, h) => cone(t, x, 0, z, h * 0.32, h, frost ? 0xd8e0ee : first ? 0x123a26 : 0x1f4a2c, 6, 0);
  const rng = makeRng(9);

  // ---- Hollowmere: fields, the river and its bridges, roofs, and the Clocktower with its lit face
  const hm = town(TOWNS.hollowmere);
  disc(hm, 0, 0, 48, frost ? 0xc8d0e0 : first ? 0x173a26 : 0x4a7a3a);
  if (!first && !frost) for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, d = 18 + rng() * 26;
    box(hm, Math.cos(a) * d, 0.02, Math.sin(a) * d, 5 + rng() * 6, 0.05, 4 + rng() * 5, [0x6a8a3a, 0x8a9a4a, 0x5a7a34, 0xa89a5a][i % 4], 0, rng() * 3);
  }
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(4, 16).rotateX(-Math.PI / 2), mat(frost ? 0xc8e0f4 : 0x3a7ab8, 0, { roughness: 0.2, metalness: 0.3 }));
    r.position.set(-30 + i * 10, 0.08, -14 + Math.sin(i * 0.9) * 7);
    r.rotation.y = Math.PI / 2 + Math.cos(i * 0.9) * 0.5;
    hm.add(r);
  }
  if (!first) {
    box(hm, -8, 0.1, -12, 2, 0.5, 6, frost ? 0xb8c4d8 : 0x8a7a6a); // a bridge
    for (let i = 0; i < 46; i++) {
      const a = rng() * Math.PI * 2, d = 5 + rng() * 15;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, rot = rng() * 1.5;
      box(hm, x, 0, z, 2.4, 1.8, 2, frost ? 0xa8b4c8 : 0xe8dcc0, 0, rot);
      const roof = cone(hm, x, 1.8, z, 1.9, 1.3, frost ? 0xeef2fa : [0xa8502f, 0x8a3a2a, 0x6a4a3a][i % 3], 4, rot + Math.PI / 4);
      roof.scale.set(1, 1, 0.8);
      if (!frost && i % 2 === 0) box(hm, x, 0.5, z, 2.5, 0.5, 0.3, 0xffc870, 2.6, rot); // lit windows
    }
    // the Clocktower
    box(hm, 0, 0, 0, 4.4, 15, 4.4, frost ? 0x9aa0b0 : 0xc9b48a);
    box(hm, 0, 15, 0, 5, 1, 5, frost ? 0x8a90a0 : 0x8a7a5a);
    cone(hm, 0, 16, 0, 3.6, 6, frost ? 0xdfe6f4 : 0x3a4a5a);
    box(hm, 0, 10.6, 2.25, 3, 3, 0.3, frost ? 0x6a7aa0 : 0xffe0a0, frost ? 0.3 : 2.6);
    box(hm, 0, 10.6, -2.25, 3, 3, 0.3, frost ? 0x6a7aa0 : 0xffe0a0, frost ? 0.3 : 2.6);
  } else for (let i = 0; i < 6; i++) box(hm, -10 + i * 4, 0, 6 - (i % 2) * 5, 0.6, 0.5, 0.6, 0xff8a3a, 3); // campfires in the forest
  for (let i = 0; i < (first ? 140 : 70); i++) {
    const a = rng() * Math.PI * 2, d = (first ? 4 : 22) + rng() * 24;
    tree(hm, Math.cos(a) * d, Math.sin(a) * d, 2.5 + rng() * 3);
  }

  // ---- Saltwick: the sea, the headland, the harbor wall and its boats, and Keeper's Light with its beam
  const sw = town(TOWNS.saltwick);
  disc(sw, 0, 0, 70, frost ? 0x9ab0d0 : first ? 0x0a2a48 : 0x2a6aa0, { roughness: 0.15, metalness: 0.35 });
  const land = disc(sw, -22, 6, 26, frost ? 0xd0d8e8 : first ? 0x2a3a2a : 0x8a9a6a);
  land.position.y = 0.1;
  if (!first) {
    box(sw, -6, 0, 4, 2.6, 12, 2.6, frost ? 0xc8d0e0 : 0xf0eee6);
    for (const y of [3, 7]) box(sw, -6, y, 4, 2.7, 1, 2.7, frost ? 0xa8b0c8 : 0xc83a2a);
    box(sw, -6, 12, 4, 3, 1.6, 3, 0x8a2a2a);
    box(sw, -6, 13.6, 4, 2, 1.6, 2, frost ? 0x6a7aa0 : 0xffe9a0, frost ? 0.4 : 3);
    for (let i = 0; i < 26; i++) {
      const x = -34 + (i % 9) * 3 + rng(), z = 8 + Math.floor(i / 9) * 3.4 + rng();
      box(sw, x, 0.1, z, 2.2, 1.6, 2.2, frost ? 0xb8c4d8 : 0xf0eee6);
      cone(sw, x, 1.7, z, 1.8, 1.2, frost ? 0xeef2fa : 0x3a5a8a);
      if (!frost && i % 3 === 0) box(sw, x, 0.5, z, 2.3, 0.5, 0.3, 0xffc870, 2.6);
    }
    box(sw, 4, 0, 14, 26, 1.2, 1.6, frost ? 0xc0c8d8 : 0x8a8378); // the harbor wall
    for (let i = 0; i < 6; i++) {
      const bx = -2 + i * 3.6, bz = 18 + (i % 2) * 2.4;
      box(sw, bx, 0, bz, 2.6, 0.6, 1, frost ? 0xa8b4c8 : [0xa83a2a, 0x2a6a8a, 0xe8c040][i % 3]);
      box(sw, bx, 0.6, bz, 0.12, 3, 0.12, 0x5a4030);
    }
    if (era === M) {
      // the beam, sweeping round
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 5, 50, 12, 1, true).rotateZ(Math.PI / 2).translate(25, 0, 0),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      const pivot = new THREE.Group();
      pivot.position.set(-6, 14.4, 4);
      pivot.add(beam);
      sw.add(pivot);
      SPINNERS.push({ obj: pivot, era, axis: 'y', speed: 0.6 });
    }
  } else {
    // the First Age: the Tooth, and the Dawn Bell's mast
    box(sw, -6, 0, 4, 3, 8, 3, 0x2a3440);
    box(sw, -6, 8, 4, 0.4, 5, 0.4, 0x5a4030);
  }
  for (let i = 0; i < 30; i++) tree(sw, -30 + rng() * 20, -6 + rng() * 14, 2 + rng() * 2.5);
}

/**
 * The End of Time: Sir Orin's throne room (see ARENA). Black marble, broken, mended with gold.
 * It only exists while the fight is on, and while you're in it, the mountain isn't drawn (see
 * SummitGame.arenaMood): nothing else is at the end of time.
 */
const MARBLE = [0x3e3a48, 0x48434f, 0x35313d, 0x524c5a, 0x413c4a]; // (black marble, as dark as still reads)
const GOLD = 0xffc24a;
export const fightOn = (s) => !!(s.flags.summitTalk && !s.flags.hoursReturned);
function endOfTimeFeature(world) {
  world.addFeature({ id: 'endOfTime', eras: [P, M, F], key: (s) => String(fightOn(s)), build: (b, era, s) => fightOn(s) && endOfTime(b, era) });
}
function endOfTime(b, era) {
  const A = ARENA, y = A.y, rng = makeRng(990 + era * 0); // (the same in every age)
  const marble = jitter(MARBLE);
  // the floor, two blocks thick, its underside broken off in hanging chunks
  b.solid(A.x0, y - 2, A.z0, A.x1, y - 1, A.z1, marble);
  for (let x = A.x0; x <= A.x1; x++) {
    const hang = Math.floor(hash3(x, 7, 7) * 4);
    if (hang) b.solid(x, y - 2 - hang, A.z0 + 1 + (x % 3), x, y - 3, A.z0 + 2 + (x % 3), marble);
  }
  // walls: the back, and either end (the east one behind the throne), their tops broken
  for (let x = A.x0 - 1; x <= A.x1 + 1; x++) {
    const top = y + 7 + Math.floor(hash3(x, 3, 1) * 4) - (x % 9 === 4 ? 3 : 0);
    b.solid(x, y - 2, A.z0 - 1, x, top, A.z0 - 1, marble);
  }
  for (const x of [A.x0 - 1, A.x1 + 1]) b.solid(x, y - 2, A.z0, x, y + 8, A.z1, marble);
  // an invisible rail along the open front edge
  for (let x = A.x0; x <= A.x1; x++) for (let yy = y; yy <= y + 6; yy++) b.setCell(x, yy, A.z1 + 1, 1, 0);
  // the dais, two steps up, and the throne against the east wall
  b.solid(A.daisX, y, A.z0, A.x1, y, A.z1, marble);
  b.solid(A.daisX + 2, y + 1, A.z0 + 1, A.x1, y + 1, A.z1 - 1, marble);
  b.solid(A.throneX, y + 2, A.z0 + 2, A.x1, y + 2, A.z1 - 2, marble); // the seat
  b.solid(A.x1, y + 3, A.z0 + 2, A.x1, y + 6, A.z1 - 2, marble); // its back
  for (const yy of [y + 1, y + 2]) b.glow(A.daisX - 0.02 + (yy - y - 1) * 2, yy - 0.06, A.z0, 0.06, 0.06, A.z1 - A.z0 + 1, GOLD);
  b.glow(A.x1 - 0.06, y + 6.9, A.z0 + 1.9, 0.1, 0.12, 3.2, GOLD);
  for (const z of [A.z0 + 1.95, A.z1 - 1.05]) b.glow(A.throneX, y + 2.92, z, A.x1 - A.throneX + 1, 0.1, 0.1, GOLD);
  // above the throne, a great clock face, shattered, its pieces held in place with gold
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if (hash3(i, 1, 2) < 0.18) continue;
    b.glow(A.x1 - 1.6 + Math.cos(a) * 3.2, y + 9 + Math.sin(a) * 3.2, A.z0 - 0.05, 0.28, 0.28, 0.05, GOLD);
  }
  b.deco(A.x1 - 1.7, y + 9, A.z0 - 0.04, 0.16, 2.6, 0.05, GOLD);
  b.deco(A.x1 - 1.7, y + 9, A.z0 - 0.04, 1.9, 0.16, 0.05, GOLD);
  // broken columns along the back wall, banded in gold; the tops of some float a little way off
  for (let x = A.x0 + 3; x < A.daisX - 1; x += 6) {
    const h = 3 + Math.floor(hash3(x, 5, 5) * 5);
    b.deco(x + 0.05, y, A.z0 - 0.15, 0.9, h, 0.5, MARBLE[3]);
    b.glow(x, y + h - 0.6, A.z0 - 0.2, 1.0, 0.08, 0.6, GOLD);
    b.glow(x, y + 0.4, A.z0 - 0.2, 1.0, 0.08, 0.6, GOLD);
    if (h < 6) {
      b.deco(x + 0.2, y + h + 1.2 + hash3(x, 1, 1), A.z0 - 0.1, 0.8, 1.4, 0.45, MARBLE[1]);
      b.glow(x + 0.15, y + h + 1.1 + hash3(x, 1, 1), A.z0 - 0.15, 0.9, 0.06, 0.5, GOLD);
    }
  }
  // the cracks, everywhere, filled with gold: across the floor, and up the back wall
  for (let i = 0; i < 13; i++) {
    let cx = A.x0 + rng() * (A.daisX - A.x0), cz = A.z0 + rng() * (A.z1 - A.z0 + 1);
    for (let j = 0; j < 3 + rng.int(0, 3); j++) {
      const along = j % 2 === 0, len = 0.6 + rng() * 1.6, dir = rng() < 0.5 ? -1 : 1;
      const nx = along ? cx + len * dir : cx, nz = along ? cz : Math.max(A.z0, Math.min(A.z1 + 0.9, cz + len * dir));
      b.glow(Math.min(cx, nx), y + 0.005, Math.min(cz, nz), Math.max(0.045, Math.abs(nx - cx)), 0.02, Math.max(0.045, Math.abs(nz - cz)), GOLD);
      cx = nx;
      cz = nz;
    }
  }
  for (let i = 0; i < 18; i++) {
    let cx = A.x0 + rng() * (A.x1 - A.x0), cy = y + 1 + rng() * 6;
    for (let j = 0; j < 4; j++) {
      const up = j % 2 === 0, len = 0.5 + rng() * 1.5;
      const nx = up ? cx : cx + (rng() < 0.5 ? -len : len), ny = up ? cy + len : cy;
      b.glow(Math.min(cx, nx), Math.min(cy, ny), A.z0 - 0.04, Math.max(0.07, Math.abs(nx - cx)), Math.max(0.07, Math.abs(ny - cy)), 0.04, GOLD);
      cx = nx;
      cy = ny;
    }
  }
  // the rest of the world, in pieces: shards of marble drifting in the dark all round
  for (let i = 0; i < 70; i++) {
    const fx = A.x0 - 25 + rng() * (A.x1 - A.x0 + 50), fz = A.z0 - 6 - rng() * 22, fy = y - 12 + rng() * 26;
    const sz = 0.4 + rng() * 2.2;
    b.deco(fx, fy, fz, sz, sz * (0.5 + rng()), sz * (0.5 + rng()), MARBLE[i % 5]);
    if (rng() < 0.6) b.glow(fx - 0.02, fy + sz * 0.4, fz - 0.02, sz + 0.04, 0.06, 0.06, GOLD);
  }
  // light: gold, from the cracks and the throne
  for (let x = A.x0 + 4; x < A.x1; x += 8) b.light(x, y + 4, A.z0 + 2, 0xffc870, 9, 14, 0.05);
  b.light(A.x1 - 2, y + 6, A.z0 + 2, 0xffd890, 9, 14, 0);
}

// ---------------------------------------------------------------------------
export function buildLevel(world) {
  SPINNERS.length = 0;
  buildGround(world);
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const rng = makeRng(400 + era);
    forest(b, era, rng);
    baseCamp(b, era);
    fallenPine(b, era);
    town(b, era, rng);
    icefall(b, era);
    terrace(b, era);
    clockworkHall(b, era);
    crevasses(b, era);
    dome(b, era);
    summit(b, era);
    ropes(b, era, rng);
    turnMarkers(b, era);
    const g = world.groups[era];
    orrery(g, era);
    telescope(g, era);
    terrain(g, era);
    below(g, era);
  }
  frost(world);
  lookoutLamp(world);
  selaSteps(world);
  springSteps(world);
  zachFlag(world);
  endOfTimeFeature(world);
  world.finalizeStatic();
  // (everything built so far is the mountain: hidden while you're at the End of Time)
  for (const g of world.groups) for (const c of g.children) c.userData.scenery = true;
}
