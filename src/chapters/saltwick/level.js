// Saltwick: one shore built three times (the Age of Tides / the harbor town / the Dry Age).
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
  grassA: [0x86a843, 0x92b34a, 0x7a9d3a, 0x9aae52],
  jungle: [0x3f7d3a, 0x4a8a3e, 0x5a9a42, 0x356d32, 0x2f6a34],
  palm: [0x5a9a3a, 0x6aaa42, 0x4a8a32],
  wood: [0x7a5232, 0x6b4428, 0x86603a],
  log: [0x8a6038, 0x7a5230, 0x6a4628],
  cobble: [0x8a8378, 0x9a9286, 0xa39a8c, 0x7c766c, 0x6e6a62, 0x948c80],
  curb: [0x6a665e, 0x5e5a52],
  grassM: [0x6f9e3c, 0x7aa843, 0x649036, 0x86b04a, 0x5e8a34],
  leaves: [0x4f8a32, 0x5f9a3a, 0x79a83f, 0x447a2c, 0x3e7028],
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
  overgrowth: [0x3f8f5a, 0x2f7a4a, 0x4aa06a],
  rust: [0x8a4a2a, 0x7a3e22, 0x9a5a32],
  crate: [0xa8743e, 0x98683a, 0xb88048],
  // the shore's own
  mud: [0x5e5247, 0x66594c, 0x564b41],
  salt: [0xd8d2c4, 0xe2ddd0, 0xcfc8b8],
  shingle: [0x9a968c, 0x8d8a80, 0xa6a298],
  seaRock: [0x4f5866, 0x586270, 0x47505c],
  drift: [0x9a917e, 0x8c8472, 0xa89f8a],
  reed: [0xa8a45a, 0x9a964e, 0xb4b066],
  coral: [0xe0786a, 0xd86a5e, 0xe88a7a],
  whitewash: [0xf0eee6, 0xe8e6dc, 0xf6f4ee],
  roofSea: [0x3d6f88, 0x356480, 0x457a94],
  hull: [0x3a2e28, 0x42342c, 0x322822],
  rustHull: [0x6a5a52, 0x74625a, 0x60524a],
  brass: [0xb8862a, 0xa8782a, 0xc9963a],
  wellStone: [0x3f5a62, 0x46626a, 0x38525a],
});
export const NEON = { cyan: 0x36f0ff, amber: 0xffb03a, warm: 0xffc870, fire: 0xff9a3a, sea: 0x5fe6c8, rose: 0xff6a5a, moon: 0xbfd8ff };

const jitter = (pal) => (x, y, z) => {
  const base = pal[Math.floor(hash3(x, y, z) * pal.length)];
  return shade(base, 0.94 + hash3(z, x, y) * 0.12);
};
const pick = (pal, x, y, z) => pal[Math.floor(hash3(x, y, z) * pal.length)];

// ---------------------------------------------------------------------------
// Layout constants (shared with game logic)
// ---------------------------------------------------------------------------
export const L = {
  start: { x: 5.5, y: 0, z: 3.5 },
  // The Mudflats: the harbor basin. Sea in the Past, sinking mud in the Present, dry in the Future.
  flatsX0: 38, basinX0: 42, basinX1: 55,
  // The Long Pier: a raised quay deck (Present) runs out to Bell Rock, through the tide gate
  pierX0: 64, deckX0: 72, deckX1: 85, rockX0: 86, rockX1: 97,
  // The Saltings: a pit with no way out (Future), and the old sea wall
  saltX0: 104, pitX0: 110, pitX1: 113, wallX0: 124, wallX1: 125,
  // Keeper's Light: the lighthouse on its sea stack, and the tide pool beside it
  lightX0: 134, stackX0: 148, stackX1: 153, poolX0: 155, poolX1: 161, galleryY: 10,
  // The Dry Lock: a channel no age can ford, and the Future's bridge over it
  lockX0: 168, walkX0: 171, chanX0: 178, chanX1: 190, jettyX1: 184,
  // The Warden's Wharf
  wharfX0: 198, duskBell: { x: 216.5, z: 3.0 },
  // Gull's Head: the long stair up to the mouth of the Wellhead
  headX0: 232, stairX0: 238, plateauX0: 250, headTop: 12,
  // The Wellhead (Donald Eugene's sluice, over the spring where the river rises)
  wellX0: 256,
  cameraBounds: [10, W - 8],
};

/** Inside the Wellhead: four terraces stepping down to the sluice's great wheel, a gate at each edge. */
export const WELL = {
  x0: L.wellX0, x1: W - 1,
  terraces: [
    { x0: 257, x1: 268, top: 12 },
    { x0: 269, x1: 280, top: 8 },
    { x0: 281, x1: 290, top: 4 },
    { x0: 291, x1: 298, top: 0 },
  ],
  ledge: { x0: 263, x1: 266, top: 15 }, // Past scaffold with the first gate's lever
  alcove: { x0: 274, x1: 276, z0: 0, z1: 2 }, // Past: the winch, walled in
  cage: { x0: 277, x1: 278, z0: 4, z1: 6 }, // Future: the crank, caged
  pit: { x0: 283, x1: 285, z0: 2, z1: 4, floor: 2 }, // Future: the last lever, in a pit with no way out
  heart: { x: 295.5, y: 0, z: 1.3 },
  floodTop: 11.85,
};

/**
 * Gates worked by machinery (see timecraft.js). `open`: seconds it stays open after its lever
 * is pulled; `passFlag`: set once you're through, and then it stays open for good, so the way
 * back never needs the trick again. `openFlag`: it simply opens when that flag is set.
 */
export const GATES = [
  { id: 'tideGate', era: M, x: L.rockX0, y: 4, open: 3.5, passFlag: 'tideGatePassed', color: 0xffc040 },
  { id: 'lockDoor', era: F, x: L.chanX0, y: 4, open: 3.5, passFlag: 'lockPassed', color: 0xffb03a },
  { id: 'gateA', era: M, x: 268, y: 12, openFlag: 'gateA', color: 0x5fe6c8 },
  { id: 'gateB', era: M, x: 280, y: 8, openFlag: 'gateB', color: 0xbfd8ff },
  { id: 'gateC', era: M, x: 290, y: 4, open: 3.5, passFlag: 'gateCPassed', color: 0xff9a4a },
];

/**
 * Places with no way out on foot. Rewind never forgets the way you came into one of
 * these, however long you spend inside (see Timecraft.record), until `until` is set.
 */
export const SEALED = [
  { era: F, x0: L.pitX0, x1: L.pitX1 + 1, z0: 1, z1: 6, y0: -3, y1: -0.5, until: 'pitLeft' },
  { era: F, x0: WELL.pit.x0, x1: WELL.pit.x1 + 1, z0: WELL.pit.z0, z1: WELL.pit.z1 + 1, y0: 1.5, y1: 3.9, until: 'gateCPassed' },
];

export const AREAS = [
  { x: 0, name: 'Saltwick Quay' },
  { x: L.flatsX0, name: 'The Mudflats' },
  { x: L.pierX0, name: 'The Long Pier' },
  { x: L.saltX0, name: 'The Saltings' },
  { x: L.lightX0, name: "Keeper's Light" },
  { x: L.lockX0, name: 'The Dry Lock' },
  { x: L.wharfX0, name: "The Warden's Wharf" },
  { x: L.headX0, name: "Gull's Head" },
  { x: L.wellX0, name: 'The Wellhead', subtitle: 'Where the river rises' },
];

export const CHECKPOINTS = [
  { id: 0, x: 3.5, z: 1.2 },
  { id: 1, x: 34.5, z: 1.2 }, // (before the Mudflats: it used to stand at 58.5, right beside the next one)
  { id: 2, x: 65.5, z: 5.6 },
  { id: 3, x: 105.5, z: 1.2 },
  { id: 4, x: 135.5, z: 1.2 },
  { id: 5, x: 169.5, z: 5.6 },
  { id: 6, x: 199.5, z: 1.2 },
  { id: 7, x: 233.5, z: 1.2 },
  { id: 8, x: 258.5, y: 12, z: 1.2 },
];

// basins: where the sea floor lies three cells below the road
const BASINS = [
  { x0: L.basinX0, x1: L.basinX1, eras: [P, M, F] },
  { x0: L.poolX0, x1: L.poolX1, eras: [P, M] },
  { x0: L.chanX0, x1: L.chanX1, eras: [P, M, F] },
];
const inBasin = (era, x) => BASINS.some((b) => x >= b.x0 && x <= b.x1 && b.eras.includes(era));
/** x-ranges of open foreground sea (z >= 8) between the basins, for the given list of basins. */
function seaSegments(era) {
  const out = [];
  let a = 0;
  for (const b of BASINS.filter((q) => q.eras.includes(era))) {
    out.push([a, b.x0 - 1]);
    a = b.x1 + 1;
  }
  out.push([a, W - 1]);
  return out;
}
const SEA = [0x2fb8b0, 0x3a8fb0, 0x2a9ac8]; // the sea, age by age
const MUD = 0x6a5644;

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
// once the tide is home the Future greens over (set from the save in buildLevel; the verges are
// the 'greenF' feature, so they appear the moment it happens)
let HEALED = false;

function groundColor(era, x, y, z) {
  const h = hash3(x, y, z);
  if (x >= L.wellX0 && z <= 6) return pick(C.wellStone, x, y, z);
  if (x >= L.stairX0 && z <= 6) return pick(C.seaRock, x, y, z);
  if (era === P) {
    if (z >= 7 || y < -1) return pick(C.sand, x, y, z);
    if (z >= 0) return h < 0.1 ? C.grassA[((h * 40) | 0) % 4] : pick(C.sand, x, y, z);
    return h < 0.45 ? pick(C.sand, x, y, z) : pick(C.grassA, x, y, z);
  }
  if (era === M) {
    if (z >= 8 || y < -1) return pick(C.mud, x, y, z);
    const town = x < L.saltX0;
    if (z === 7) return town ? pick(C.curb, x, y, z) : pick(C.shingle, x, y, z);
    if (z >= 1 && z <= 5) return town ? shade(pick(C.cobble, x, y, z), 0.95 + ((x + z) % 2) * 0.06) : pick(C.shingle, x, y, z);
    if (z === 0 || z === 6) return town ? pick(C.curb, x, y, z) : pick(C.shingle, x, y, z);
    return h < 0.08 ? C.dirt[0] : pick(C.grassM, x, y, z);
  }
  // the Dry Age: salt over everything, and here and there a rusted deck plate showing through
  // (healed: grass behind the road, pale paving on it, sand down on the shore)
  if (HEALED && y === -1 && z <= 7) return z >= 1 && z <= 5 ? shade(pick(C.cobble, x, y, z), 1.12) : z <= 0 ? pick(C.grassM, x, y, z) : pick(C.curb, x, y, z);
  if (y === -1 && z >= 1 && z <= 5 && x % 9 === 0 && h < 0.7) return pick(C.rustHull, x, y, z);
  return pick(C.salt, x, y, z);
}

function buildGround(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    for (let x = 0; x < W; x++) {
      const basin = inBasin(era, x);
      for (let z = ZMIN; z < ZMAX; z++) {
        // the shore drops a step beyond the quay's edge; basins go down to the sea floor
        let top = z >= 8 ? -2 : -1;
        if (basin) top = -4;
        if (era === F && x >= L.pitX0 && x <= L.pitX1 && z >= 1 && z <= 5) top = -3; // the salvage pit
        for (let y = -4; y <= top; y++) b.setCell(x, y, z, T.SOLID, groundColor(era, x, y, z));
      }
    }
  }
  // PAST: the sea, right up against the road
  const b = world.staticBuilder(P);
  for (const [x0, x1] of seaSegments(P)) b.water(x0, -1, 8, x1, -1, ZMAX - 1, SEA[P], 0.15);
  b.water(L.basinX0, -3, ZMIN, L.basinX1, -1, ZMAX - 1, SEA[P], 0.15);
  b.water(L.poolX0, -3, ZMIN, L.poolX1, -1, ZMAX - 1, SEA[P], 0.15);
  // the Race: a tide-rip through the channel that nothing swims
  b.hazard(L.chanX0, -3, ZMIN, L.chanX1, -1, ZMAX - 1, 0x1f6f9a, false, 0.15);
  for (let i = 0; i < 16; i++) b.glow(L.chanX0 + 0.5 + hash3(i, 1, 2) * 12, -0.12, hash3(i, 3, 4) * 6.5, 0.9 + hash3(i, 5, 6), 0.03, 0.12, 0xe8fbff); // white water

  // PRESENT and FUTURE: the sea is a feature. Out, until the river comes home.
  world.addFeature({
    id: 'seaM', eras: [M], key: (s) => String(!!s.flags.tideRestored),
    build: (b, era, s) => {
      if (!s.flags.tideRestored) {
        // sinking mud where the harbor and the channel used to be
        b.mud(L.basinX0, -3, ZMIN, L.basinX1, -1, ZMAX - 1, MUD);
        b.mud(L.chanX0, -3, ZMIN, L.chanX1, -1, ZMAX - 1, MUD);
      } else {
        for (const [x0, x1] of seaSegments(P)) b.water(x0, -1, 8, x1, -1, ZMAX - 1, SEA[M], 0.15);
        for (const q of BASINS) b.water(q.x0, -3, ZMIN, q.x1, -1, ZMAX - 1, SEA[M], 0.15);
        poolLadders(b, false);
      }
      // (what stands in the mud or the water still stands: the Marigold, the jetty)
      b.barrier(BOAT.x0, -3, BOAT.z0, BOAT.x1, -1, BOAT.z1);
      b.barrier(L.chanX0, -1, 2, L.jettyX1, -1, 4);
    },
  });
  world.addFeature({
    id: 'seaF', eras: [F], key: (s) => String(!!s.flags.tideRestored),
    build: (b, era, s) => {
      if (!s.flags.tideRestored) return;
      for (const [x0, x1] of seaSegments(F)) b.water(x0, -1, 8, x1, -1, ZMAX - 1, SEA[F], 0.15);
      for (const q of BASINS.filter((q) => q.eras.includes(F))) b.water(q.x0, -3, ZMIN, q.x1, -1, ZMAX - 1, SEA[F], 0.15);
      for (const x of [L.basinX0, L.basinX1, L.chanX0]) b.ladder(x, -3, 0, x, -1, 0);
      // lights along the living shore
      for (let x = 4; x < L.stairX0; x += 9) if (!inBasin(F, x)) b.glow(x, -0.1, 7.9, 1.6, 0.05, 0.08, NEON.sea);
    },
  });
  // ...and the salt greens over: grass behind the road, flower beds, young trees along the quay
  world.addFeature({
    id: 'greenF', eras: [F], key: (s) => String(!!s.flags.tideRestored),
    build: (b, era, s) => {
      if (!s.flags.tideRestored) return;
      for (let x = 0; x < L.stairX0; x++) {
        if (inBasin(F, x) || (x >= L.pitX0 && x <= L.pitX1)) continue;
        for (let z = -4; z <= 0; z++) b.deco(x, 0, z, 1, 0.04, 1, pick(C.grassM, x, 3, z));
        const r = hash3(x, 5, 91);
        if (r < 0.22) b.deco(x + r * 3, 0.04, -0.2 + r, 0.3, 0.25, 0.3, [0xf0c040, 0xe86a8a, 0xf4f0e0, 0xb08af0][(r * 18) | 0]); // flowers
        if (x % 12 === 9 && !inBasin(F, x + 1)) {
          // a young tree in a stone ring, by the shore lamps
          b.deco(x + 0.1, 0, 6.1, 0.8, 0.3, 0.8, C.stone[1]);
          b.deco(x + 0.42, 0.3, 6.42, 0.16, 2.2, 0.16, C.log[1]);
          b.canopy(x + 0.5, 3.0, 6.5, 1.1, C.leaves, { seed: x * 7 });
        }
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
function blobTree(b, cx, cz, rng, era, scale = 1) {
  const trunkH = Math.round((3 + rng.int(0, 2)) * scale);
  const r = (2 + rng() * 1.2) * scale;
  const trunk = era === F ? C.drift : C.log;
  b.solid(cx, 0, cz, cx, trunkH, cz, trunk);
  const pal = era === P ? C.jungle : era === M ? C.leaves : C.overgrowth;
  b.deco(cx + 0.4, trunkH - 1, cz + 0.3, 0.9 * scale, 0.22, 0.22, trunk[1]);
  b.canopy(cx + 0.5, trunkH + r * 0.6 + 0.5, cz + 0.5, r, pal.map((c) => c & 0xffffff), { maxZ: -0.5, seed: cx * 31 + cz });
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
}

function lampPost(b, x, z, era) {
  if (era === M) {
    b.deco(x + 0.42, 0, z + 0.42, 0.16, 2.4, 0.16, 0x2a2a30);
    b.deco(x + 0.3, 2.35, z + 0.3, 0.4, 0.08, 0.4, 0x2a2a30);
    b.glow(x + 0.34, 2.43, z + 0.34, 0.32, 0.36, 0.32, NEON.warm);
    b.deco(x + 0.28, 2.79, z + 0.28, 0.44, 0.1, 0.44, 0x2a2a30);
    b.light(x + 0.5, 2.6, z + 0.5, 0xffb060, 9, 9, 0.08);
  } else if (era === P) {
    // a driftwood post with a bowl of burning fish oil
    b.deco(x + 0.4, 0, z + 0.4, 0.2, 1.8, 0.2, C.drift[1]);
    b.deco(x + 0.26, 1.8, z + 0.26, 0.48, 0.16, 0.48, 0xe8dcc0);
    b.glow(x + 0.33, 1.96, z + 0.33, 0.34, 0.36, 0.34, NEON.fire);
    b.glow(x + 0.41, 2.3, z + 0.41, 0.18, 0.22, 0.18, 0xffe070);
    b.light(x + 0.5, 2.4, z + 0.5, 0xff8a3a, 9, 9, 0.35);
  } else {
    // a leaning harbor beacon, still blinking at ships that will never come
    b.deco(x + 0.42, 0, z + 0.42, 0.16, 2.8, 0.16, 0x5a4a42);
    b.deco(x + 0.3, 2.8, z + 0.3, 0.4, 0.14, 0.4, 0x3a302a);
    b.glow(x + 0.36, 2.94, z + 0.36, 0.28, 0.3, 0.28, NEON.amber);
    b.light(x + 0.5, 3.0, z + 0.5, 0xffa040, 8, 10, 0.3);
  }
}

function wallTorch(b, x, y, z) {
  b.deco(x + 0.42, y, z, 0.16, 0.6, 0.2, C.log[1]);
  b.glow(x + 0.36, y + 0.6, z - 0.02, 0.28, 0.32, 0.28, NEON.fire);
  b.glow(x + 0.43, y + 0.85, z + 0.05, 0.14, 0.2, 0.14, 0xffe070);
  b.light(x + 0.5, y + 0.9, z + 0.6, 0xff8a3a, 7, 8, 0.35);
}

function crate(b, x, y, z, pal = C.crate) {
  b.setCell(x, y, z, T.SOLID, jitter(pal)(x, y, z));
  b.deco(x - 0.02, y + 0.42, z + 0.98, 1.04, 0.16, 0.06, 0x6a4428);
  b.deco(x + 0.42, y, z + 0.98, 0.16, 1.0, 0.06, 0x6a4428);
}

/** A boat left high and dry (scenery): a hull heeled over on its side, with a stump of mast. */
function strandedBoat(b, x, y, z, len, col, mastCol = 0x6a5a4a) {
  b.deco(x, y, z, len, 0.7, 1.5, col);
  b.deco(x + 0.3, y + 0.7, z + 0.15, len - 0.6, 0.25, 1.2, shade(col, 0.8));
  b.deco(x - 0.5, y + 0.25, z + 0.35, 0.6, 0.5, 0.8, col);
  b.deco(x + len * 0.45, y + 0.9, z + 0.6, 0.14, 2.2, 0.14, mastCol);
  b.deco(x + len * 0.45 - 0.7, y + 2.3, z + 0.62, 1.5, 0.1, 0.1, mastCol);
}

/** The same boat with the sea back under her: upright, mast stepped, a scrap of sail set. */
function floatingBoat(b, x, z, len, col) {
  b.deco(x, -0.55, z, len, 0.75, 1.5, col);
  b.deco(x + 0.2, 0.2, z + 0.1, len - 0.4, 0.1, 1.3, shade(col, 1.25));
  b.deco(x - 0.5, -0.3, z + 0.35, 0.6, 0.5, 0.8, col);
  b.deco(x + len - 0.1, -0.3, z + 0.35, 0.5, 0.5, 0.8, col);
  b.deco(x + len * 0.45, 0.3, z + 0.68, 0.14, 3.2, 0.14, 0x6a5a4a);
  b.deco(x + len * 0.45 - 0.9, 0.9, z + 0.72, 1.9, 2.2, 0.05, 0xeadfc0);
}
const FLEET = []; // [x, z, length, color] of the boats along the shore (filled by backdrop())

/** A bell's frame: two posts and a beam (scenery; the bell itself is a Strikeable). */
function bellFrame(b, x, y, z, h, col) {
  for (const ox of [-0.95, 0.75]) b.deco(x + ox, y, z - 0.1, 0.2, h, 0.2, col);
  b.deco(x - 1.05, y + h, z - 0.14, 2.1, 0.22, 0.28, col);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
/** PRESENT: a harbor cottage. Whitewash or plaster, half-timber, a clay or sea-blue roof. */
function seaHouse(b, x0, w, rng) {
  const h = rng.int(4, 6), x1 = x0 + w - 1;
  const white = rng.chance(0.55);
  const wall = white ? C.whitewash : C.plaster;
  const roofPal = rng.chance(0.5) ? C.roofSea : rng.chance(0.6) ? C.roof : C.roofB;
  const mid = 2 + (h > 5 ? 1 : 0);
  b.solid(x0, 0, -4, x1, h - 1, -1, (x, y, z) => (y < 1 ? jitter(C.stone)(x, y, z) : jitter(wall)(x, y, z)));
  const beam = white ? 0x3d5a6a : C.timber[0];
  b.deco(x0, 1, 0, 0.26, h - 1, 0.1, beam);
  b.deco(x1 + 0.74, 1, 0, 0.26, h - 1, 0.1, beam);
  b.deco(x0, mid, 0, w, 0.24, 0.12, beam);
  b.deco(x0, h - 0.26, 0, w, 0.26, 0.12, beam);
  for (let wx = x0 + 1; wx < x1; wx += 2) {
    for (let wy = 1; wy < h - 1; wy += 2) {
      if (wy === mid) continue;
      if (rng.chance(0.6)) b.glow(wx + 0.18, wy + 0.15, 0.0, 0.64, 0.7, 0.05, NEON.warm);
      else b.deco(wx + 0.18, wy + 0.15, 0.0, 0.64, 0.7, 0.05, 0x34404c);
      // shutters
      b.deco(wx + 0.02, wy + 0.1, 0.02, 0.16, 0.8, 0.05, beam);
      b.deco(wx + 0.82, wy + 0.1, 0.02, 0.16, 0.8, 0.05, beam);
    }
  }
  const dx = x0 + 1 + rng.int(0, Math.max(0, w - 3));
  b.deco(dx + 0.1, 0, 0.0, 0.8, 1.7, 0.06, white ? 0x2f5a6a : 0x4a2c18);
  b.deco(dx + 0.65, 0.8, 0.05, 0.08, 0.08, 0.04, 0xc9a44a);
  if (rng.chance(0.4)) {
    b.glow(dx + 1.05, 1.6, 0.05, 0.22, 0.28, 0.22, NEON.warm);
    b.light(dx + 1.1, 1.8, 0.6, 0xffb060, 4, 6, 0.06);
  }
  b.roof(x0 - 0.45, x1 + 1.45, h, -5.5, 0.4, h + 2.6, roofPal[0], wall[0]);
  if (rng.chance(0.45)) b.solid(x1 - 1, h, -4, x1 - 1, h + 3, -4, jitter(C.stone));
  // the harbor's clutter: a net hung out to dry, a glass float, a lobster pot
  if (rng.chance(0.5)) {
    b.deco(x0 + 0.3, 0.9, 0.06, Math.min(w - 0.6, 2.4), 1.3, 0.04, 0x8a7a5a);
    for (let i = 0; i < 3; i++) b.glow(x0 + 0.5 + i * 0.8, 1.0 + (i % 2) * 0.5, 0.1, 0.18, 0.18, 0.06, [0x5fe6c8, 0xffb03a, 0x9fe8ff][i]);
  }
  if (rng.chance(0.4)) b.deco(x1 - 0.2, 0, 0.1, 0.7, 0.5, 0.6, C.wood[1]);
  return w;
}

/** PAST: a tide-folk hut. Reed walls on driftwood stilts, above the reach of the spring tides. */
function stiltHut(b, x0, w, rng) {
  const h = rng.int(2, 3), x1 = x0 + w - 1;
  for (const sx of [x0 + 0.1, x1 + 0.6]) for (const sz of [-3.9, -1.4]) b.deco(sx, 0, sz, 0.3, 1.02, 0.3, C.drift[1]);
  b.solid(x0, 1, -4, x1, 1, -1, jitter(C.drift));
  b.solid(x0, 2, -4, x1, 1 + h, -2, jitter(C.reed));
  b.roof(x0 - 0.5, x1 + 1.5, 2 + h, -4.9, -0.7, 4 + h, C.thatch[0], C.reed[0]);
  const dx = x0 + Math.floor(w / 2) - 0.4;
  b.deco(dx, 2, -1.0, 0.8, 1.4, 0.05, 0x2a1a10);
  b.deco(dx - 0.1, 3.4, -1.02, 1.0, 0.16, 0.08, C.drift[0]);
  // a ladder up to the porch
  for (let i = 0; i < 4; i++) b.deco(x0 + 0.3, 0.2 + i * 0.45, -0.06, 0.7, 0.07, 0.08, C.drift[2]);
  b.deco(x0 + 0.3, 0, -0.06, 0.07, 2, 0.08, C.drift[2]);
  b.deco(x0 + 0.93, 0, -0.06, 0.07, 2, 0.08, C.drift[2]);
  // shell strings, and cloth dyed sea-green or coral
  if (rng.chance(0.7)) b.deco(x1 - 0.6, 2.2, -0.98, 0.7, 1.2, 0.04, rng.pick([0x2f9a8a, 0xe0786a, 0xe8dcc0]));
  for (let i = 0; i < 4; i++) if (rng.chance(0.6)) b.glow(x0 + 0.4 + rng() * (w - 0.8), 3.3 + h * 0.3, -0.96, 0.12, 0.12, 0.04, rng.pick([0xffd8f0, 0xe8fbff, 0x9fe8dc]));
  if (rng.chance(0.4)) wallTorch(b, x1 + 0.2, 1.2, -1.0);
  return w;
}

/** PAST: a tide pole. Each band is a spring tide the folk remember. */
function tidePole(b, x, z) {
  b.solid(x, 0, z, x, 3, z, (px, y) => [0x2f9a8a, 0xe8dcc0, 0xe0786a, 0x237a70][y]);
  b.deco(x + 0.15, 4.0, z + 0.15, 0.7, 0.5, 0.7, 0xf0d8c8);
  b.glow(x + 0.35, 4.5, z + 0.35, 0.3, 0.3, 0.3, NEON.sea);
}

/** FUTURE: what the sea left behind. A beached hulk, a stack of containers, or a dead crane. */
function hulk(b, x0, w, rng) {
  const x1 = x0 + w - 1, roll = rng();
  if (roll < 0.4) {
    const h = rng.int(3, 5);
    b.solid(x0, 0, -5, x1, h - 1, -1, jitter(C.rustHull));
    b.solid(x0 + 1, h, -4, x1 - 1, h + 1, -2, jitter(C.rust));
    for (let x = x0; x <= x1; x++) {
      if (rng.chance(0.5)) b.glow(x + 0.3, h - 1.3, 0.0, 0.4, 0.4, 0.04, rng.chance(0.3) ? NEON.amber : 0x40342c);
      else b.deco(x + 0.3, h - 1.3, 0.0, 0.4, 0.4, 0.04, 0x1a1410);
    }
    b.deco(x0, 1.0, 0.0, w, 0.12, 0.05, 0xb8683a); // the old waterline, a long way from water
    b.deco(x0 + w / 2 - 0.4, h + 2, -3.5, 0.8, 2.2, 0.8, 0x4a3a34); // funnel
    b.deco(x0 + w / 2 - 0.5, h + 3.6, -3.6, 1.0, 0.3, 1.0, 0x8a3a2a);
  } else if (roll < 0.8) {
    const cols = [C.rust, C.panel, C.rustHull, C.metal];
    const n = rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const pal = rng.pick(cols), off = i % 2 ? 1 : 0;
      b.solid(x0 + off, i * 2, -4, Math.max(x0 + off + 1, x1 - (1 - off)), i * 2 + 1, -1, jitter(pal));
      b.deco(x0 + off + 0.2, i * 2 + 0.2, 0.0, 0.1, 1.6, 0.04, 0x2a2420);
      b.deco(x0 + off + 0.9, i * 2 + 0.2, 0.0, 0.1, 1.6, 0.04, 0x2a2420);
    }
    if (rng.chance(0.5)) b.glow(x0 + 0.5, n * 2 - 0.9, 0.02, 0.7, 0.3, 0.04, NEON.amber);
  } else {
    // a dock crane, boom drooping
    const h = rng.int(9, 13);
    for (const sx of [x0 + 0.2, x1 + 0.4]) for (const sz of [-3.6, -1.2]) b.deco(sx, 0, sz, 0.4, h, 0.4, 0x6a4a3a);
    b.deco(x0, h, -4, w, 0.5, 3.2, 0x7a3e22);
    b.deco(x0 - 3, h + 0.5, -2.6, w + 6, 0.35, 0.35, 0x8a4a2a);
    b.deco(x0 - 2.9, h - 3, -2.5, 0.08, 3.5, 0.08, 0x2a2420);
    b.glow(x0 + w / 2, h + 0.9, -2.5, 0.25, 0.25, 0.25, 0xff3040);
  }
  // salt drifted against whatever stands still
  for (let i = 0; i < 3; i++) b.deco(x0 + rng() * w, 0, -0.9 + rng() * 0.6, 0.9 + rng(), 0.25 + rng() * 0.3, 0.7, pick(C.salt, i, x0, 3));
  return w;
}

/** Procedural street-side buildings between x0..x1 (back of the road, z < 0). */
function filler(b, era, x0, x1, seed) {
  const rng = makeRng(seed);
  let x = x0;
  while (x < x1 - 3) {
    let w;
    if (era === M) w = seaHouse(b, x, Math.min(rng.int(4, 7), x1 - x), rng);
    else if (era === P) {
      w = stiltHut(b, x, Math.min(rng.int(3, 5), x1 - x), rng);
      if (rng.chance(0.3)) tidePole(b, x + w, -1);
    } else w = hulk(b, x, Math.min(rng.int(4, 7), x1 - x), rng);
    x += w;
    const gap = rng.int(1, 2);
    if (era === P && rng.chance(0.5)) palmTree(b, x, -3, rng);
    x += gap;
  }
}

/** The west end of the shore: each age closes it off (scenery only; x < 0 is already solid). */
function shoreEnd(world) {
  const z0 = ZMIN, d = ZMAX - ZMIN, far = 44;
  let b = world.staticBuilder(P);
  b.deco(-far, -4, z0, far, 13, d, C.seaRock[0]);
  b.deco(-far, 9, z0, far, 1, d, C.jungle[1]);
  for (let i = 0; i < 9; i++) b.deco(-4.4 + hash3(i, 1, 4) * 3.2, 10, z0 + 1 + i * 3.2, 1.4 + hash3(i, 2, 4), 1 + hash3(i, 3, 4) * 1.6, 1.6, C.jungle[i % 5]);
  b = world.staticBuilder(M);
  b.deco(-far, -4, z0, far, 12, d, C.stone[0]);
  for (let z = z0; z < ZMAX; z += 2) b.deco(-1.2, 8, z, 1.2, 1.1, 1, C.stone[1]);
  b.deco(-0.12, 4.6, z0, 0.14, 0.4, d, C.stone[3]);
  b = world.staticBuilder(F);
  b.deco(-far, -4, z0, far, 16, d, C.rustHull[0]);
  b.deco(-far, 12, z0, far - 2, 3, d, C.salt[0]);
  for (const y of [3.5, 8.5]) b.glow(0, y, z0, 0.05, 0.12, d, NEON.amber);
}

function backdrop(world) {
  FLEET.length = 0;
  world.addFeature({
    id: 'harborBoats', eras: [M], key: (s) => String(!!s.flags.tideRestored),
    build: (b, era, s) => {
      for (const [x, z, len, col] of FLEET) s.flags.tideRestored ? floatingBoat(b, x, z, len, col) : strandedBoat(b, x, -1, z, len, col);
    },
  });
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const rng = makeRng(700 + era);
    // trees and ruins between the buildings and the far backdrop
    for (let x = 2; x < L.stairX0 - 2; x += rng.int(3, 6)) {
      const z = -rng.int(7, 11);
      if (inBasin(era, x) || inBasin(era, x + 1)) continue;
      if (era === F && HEALED) blobTree(b, x, z, rng, era, 1 + rng() * 0.5);
      else if (era === F) {
        if (rng.chance(0.5)) {
          // a salt spire, wind-carved
          const h = rng.int(3, 8);
          b.solid(x, 0, z, x + 1, h, z, jitter(C.salt));
          b.solid(x, h + 1, z, x, h + 2, z, jitter(C.salt));
        }
      } else if (era === P && rng.chance(0.5)) palmTree(b, x, z, rng);
      else blobTree(b, x, z, rng, era, 1 + rng() * 0.5);
    }
    // far cliffs, hills and mesas
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.08 + era) * 3 + Math.sin(x * 0.21 + era * 2) * 1.5;
      const y0 = inBasin(era, x) ? -3 : 0;
      if (era === F) {
        const hh = 4 + Math.floor(hash3(Math.floor(x / 5), 7, 1) * 9);
        b.solid(x, y0, -16, x, hh, -14, (px, y, z) => jitter(y > hh - 2 ? (HEALED ? C.overgrowth : C.salt) : C.rustHull)(px, y, z));
      } else {
        const hh = Math.max(2, Math.round(6 + n));
        const pal = era === P ? C.seaRock : x % 30 < 12 ? C.leaves : C.grassM;
        b.solid(x, y0, -16, x, hh, -14, (px, y, z) => jitter(era === P && y >= hh - 1 ? C.jungle : pal)(px, y, z));
      }
    }
    // along the quay's edge and out on the shore
    for (let x = 1; x < L.stairX0 - 1; x++) {
      if (inBasin(era, x - 1) || inBasin(era, x) || inBasin(era, x + 1)) continue;
      const r = hash3(x, era, 77);
      if (era === M) {
        if (x % 11 === 4) lampPost(b, x, 7, era);
        else if (x % 5 === 0) b.deco(x + 0.3, 0, 7.3, 0.4, 0.55, 0.4, 0x3a3a42); // bollard
        if (x % 13 === 6) FLEET.push([x, 9 + r * 2.5, 3.2 + r * 1.5, [0x6a3a2a, 0x2f5a6a, 0x8a7a4a, 0x4a4a52][x % 4]]);
        else if (r > 0.9) b.stream(x, 9 + r, x + 2.2, 10.6 + r, 0x6a8a94, -1); // a pool the tide forgot
        else if (r < 0.06) b.deco(x + 0.2, -1, 9 + r * 20, 0.5, 0.3, 0.5, 0x7a7468);
      } else if (era === P) {
        if (x % 9 === 2) lampPost(b, x, 7, era);
        else if (r < 0.14) for (const oz of [8.6, 10.1]) b.deco(x + 0.4, -1, oz + r, 0.2, 2.2, 0.2, C.drift[1]); // mooring stakes
        else if (r > 0.9) b.glow(x + 0.2, -0.95, 9 + r * 2, 0.5, 0.3, 0.5, 0xe0786a); // coral, glowing under the water
      } else {
        if (x % 12 === 3) lampPost(b, x, 7, era);
        if (x % 13 === 6) {
          // the same boat, three hundred years on: ribs in the salt
          const bx = x, bz = 9 + hash3(x, M, 77) * 2.5;
          for (let i = 0; i < 4; i++) b.deco(bx + i * 0.9, -1, bz, 0.14, 0.9 + (i % 2) * 0.3, 1.4, 0x5a4a42);
          b.deco(bx - 0.2, -1, bz + 0.65, 4, 0.14, 0.14, 0x5a4a42);
        } else if (r < 0.2) b.deco(x + 0.1, -1, 8.6 + r * 14, 1.2, 0.3 + r, 0.9, pick(C.salt, x, 1, 1));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Saltwick Quay
// ---------------------------------------------------------------------------
export const LANTERN = { x: 15.4, z: 0.7 };

function quay(world) {
  // PRESENT: the harbormaster's office, and the river barge from Hollowmere
  let b = world.staticBuilder(M);
  b.solid(1, 0, -5, 12, 1, -1, jitter(C.stone));
  b.solid(1, 2, -5, 12, 6, -1, jitter(C.whitewash));
  for (const bx of [1, 6.5, 12.74]) b.deco(bx, 2, 0, 0.26, 5, 0.1, 0x3d5a6a);
  for (const by of [2, 6.74]) b.deco(1, by, 0, 12, 0.26, 0.12, 0x3d5a6a);
  b.roof(0.4, 13.6, 7, -6.5, 0.45, 10.2, C.roofSea[0], C.whitewash[0]);
  // the tide gauge: a painted board, its float lying at the very bottom
  b.deco(4.6, 2.4, 0.0, 1.0, 4.0, 0.06, 0xeadfc0);
  for (let i = 0; i < 8; i++) b.deco(4.6, 2.6 + i * 0.45, 0.04, i % 2 ? 0.5 : 0.8, 0.06, 0.04, 0x2a2014);
  b.deco(4.9, 2.42, 0.08, 0.4, 0.3, 0.06, 0xa8362a);
  b.glow(2.0, 2.6, 0.0, 1.6, 1.5, 0.05, NEON.warm);
  b.deco(8.9, 0, 0.0, 1.1, 2.0, 0.06, 0x2f5a6a);
  b.deco(8.4, 2.3, 0.04, 2.6, 0.5, 0.08, 0x1c2e44); // sign
  b.glow(8.55, 2.42, 0.12, 2.3, 0.26, 0.02, 0xe0b040);
  b.light(3, 3, 1.4, 0xffb060, 5, 7, 0.05);
  // the barge, aground beside the quay
  b.deco(1.5, -1, 8.4, 9, 0.8, 2.4, C.hull[0]);
  b.deco(2.0, -0.2, 8.6, 8, 0.2, 2.0, C.drift[0]);
  b.deco(6.5, 0, 9.0, 2.4, 1.3, 1.4, C.wood[0]);
  b.deco(6.3, 1.3, 8.9, 2.8, 0.2, 1.6, C.roofSea[0]);
  b.deco(3.2, 0, 9.5, 0.14, 3.2, 0.14, C.wood[1]);
  // crates and barrels
  crate(b, 23, 0, 1); crate(b, 24, 0, 1);
  crate(b, 28, 0, 1); crate(b, 29, 0, 1); crate(b, 29, 1, 1); crate(b, 30, 0, 1); crate(b, 30, 1, 1); crate(b, 30, 2, 1);
  filler(b, M, 14, 37, 11);

  // PAST: the tide folk's village on the strand
  b = world.staticBuilder(P);
  filler(b, P, 2, 37, 21);
  b.deco(13.6, 0, 3.4, 0.4, 0.2, 1.2, C.drift[0]);
  b.deco(13.2, 0, 3.8, 1.2, 0.2, 0.4, C.drift[1]);
  b.glow(13.5, 0.2, 3.6, 0.6, 0.5, 0.6, NEON.fire);
  b.glow(13.65, 0.6, 3.75, 0.3, 0.4, 0.3, 0xffe070);
  b.light(13.8, 1.2, 4, 0xff8a3a, 12, 10, 0.4);
  for (const tx of [10, 20, 32]) tidePole(b, tx, 0);
  // a fish-drying rack, and coral-stone steps
  b.deco(15.6, 0, 5.4, 0.12, 1.5, 0.12, C.drift[1]);
  b.deco(17.3, 0, 5.4, 0.12, 1.5, 0.12, C.drift[1]);
  b.deco(15.6, 1.4, 5.42, 1.8, 0.08, 0.08, C.drift[0]);
  for (let i = 0; i < 4; i++) b.deco(15.8 + i * 0.4, 0.95, 5.44, 0.14, 0.45, 0.05, 0xb8c4cc);
  b.solid(22, 0, 1, 22, 0, 1, jitter(C.coral));
  b.solid(23, 0, 1, 23, 1, 1, jitter(C.coral));
  b.solid(24, 0, 1, 24, 2, 1, jitter(C.coral));

  // FUTURE: the dry dock
  b = world.staticBuilder(F);
  filler(b, F, 2, 37, 31);
  b.solid(25, 0, 2, 25, 0, 2, jitter(C.rust));
  b.solid(27, 0, 2, 27, 1, 2, jitter(C.panel));
  b.solid(29, 0, 2, 29, 2, 2, jitter(C.rustHull));
  // the port authority's last sign
  b.deco(15.2, 0, 0.3, 0.14, 2.2, 0.14, 0x4a3a34);
  b.deco(14.4, 1.3, 0.28, 1.8, 0.9, 0.06, 0x1a1410);
  b.glow(14.5, 1.4, 0.35, 1.6, 0.7, 0.03, 0x6a2a14);
  for (const [oy, w] of [[1.82, 1.3], [1.62, 1.0]]) b.glow(14.6, oy, 0.39, w, 0.07, 0.02, NEON.amber);
  b.light(15, 2, 1.2, 0xffa040, 4, 6, 0.2);

  // The first favor: a light for the tide folk. It has hung on the quay ever since.
  world.addFeature({
    id: 'everLantern', eras: [P, M, F], key: (s) => String(!!s.flags.lampGiven),
    build: (b, era, s) => {
      if (!s.flags.lampGiven) return;
      const { x, z } = LANTERN, post = [C.drift[1], 0x2a2a30, 0x4a3a34][era];
      b.deco(x - 0.1, 0, z - 0.1, 0.2, 2.9, 0.2, post);
      b.deco(x - 0.1, 2.8, z - 0.06, 0.9, 0.12, 0.12, post);
      b.deco(x + 0.55, 2.2, z - 0.1, 0.3, 0.1, 0.3, 0x8a94a4);
      b.glow(x + 0.58, 2.3, z - 0.07, 0.24, 0.4, 0.24, 0xfff2a8);
      b.deco(x + 0.55, 2.7, z - 0.1, 0.3, 0.1, 0.3, 0x8a94a4);
      b.light(x + 0.7, 2.4, z + 0.4, 0xfff0a0, 9, 10, 0);
      if (era !== P) b.deco(x - 0.3, 0.9, z + 0.11, 0.6, 0.4, 0.03, era === M ? 0xc9a44a : 0x6a2a14); // its plaque
    },
  });
}

// ---------------------------------------------------------------------------
// The Mudflats
// ---------------------------------------------------------------------------
const BOAT = { x0: 43, x1: 46, z0: 1, z1: 3 }; // the Marigold: aground just off the west bank

function mudflats(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    filler(b, era, 38, 41, 40 + era);
    filler(b, era, 56, 63, 43 + era);
  }
  // PRESENT: the Marigold sits upright in the mud, her deck level with the quay
  let b = world.staticBuilder(M);
  b.solid(BOAT.x0, -3, BOAT.z0, BOAT.x1, -1, BOAT.z1, (x, y, z) => jitter(y === -1 ? C.drift : C.hull)(x, y, z));
  // (nothing bridges the gap to the bank: from the quay it's a jump, and it has to look like one)
  b.deco(BOAT.x1 + 0.9, -1.2, BOAT.z0 + 0.9, 0.7, 1.0, 1.2, C.hull[1]);
  b.deco(44.4, 0, 1.2, 0.2, 4.4, 0.2, C.wood[1]);
  b.deco(43.2, 3.6, 1.24, 2.6, 0.1, 0.1, C.wood[1]);
  b.deco(43.4, 2.0, 1.26, 2.2, 1.6, 0.04, 0xd8cca8); // a furled sail
  for (const z of [1.02, 3.92]) b.deco(BOAT.x0, 0, z, 4, 0.3, 0.06, C.hull[2]);
  // another, further out, gone over on her side
  strandedBoat(b, 50.2, -2.4, 4.2, 3.4, 0x2f5a6a);
  // a sign where the ferry steps used to end
  b.deco(40.4, 0, 0.3, 0.12, 1.5, 0.12, C.wood[1]);
  b.deco(39.9, 1.0, 0.28, 1.1, 0.6, 0.06, 0xeadfc0);

  // PAST: the harbor, full to the brim. The Mother Reef grows along its floor.
  b = world.staticBuilder(P);
  for (let i = 0; i < 9; i++) b.deco(43 + hash3(i, 2, 8) * 12, -3, hash3(i, 4, 8) * 6, 0.6 + hash3(i, 6, 8), 0.4 + hash3(i, 7, 8) * 0.9, 0.6, C.coral[i % 3]);
  for (let i = 0; i < 5; i++) b.glow(44 + hash3(i, 3, 5) * 10, -2.6, hash3(i, 9, 5) * 6, 0.25, 0.25, 0.25, 0xffb8a8);
  b.light(48.5, -1, 3.5, 0x9fffe8, 5, 8, 0);

  // FUTURE: the harbor floor, dry. Ladders down either side, and the Marigold's bones.
  b = world.staticBuilder(F);
  for (const x of [L.basinX0, L.basinX1]) {
    b.ladder(x, -3, 0, x, -1, 0);
    for (let y = -3; y < 0; y++) b.deco(x + 0.1, y + 0.4, 0.05, 0.8, 0.1, 0.12, 0x6a4a3a);
    b.deco(x + 0.1, -3, 0.05, 0.1, 3, 0.12, 0x6a4a3a);
    b.deco(x + 0.8, -3, 0.05, 0.1, 3, 0.12, 0x6a4a3a);
  }
  for (let i = 0; i < 5; i++) b.deco(BOAT.x0 + i * 0.9, -3, BOAT.z0, 0.16, 1.6 + (i % 2) * 0.5, 3, 0x5a4a42);
  b.deco(BOAT.x0 - 0.3, -3, BOAT.z0 + 1.4, 4.6, 0.2, 0.2, 0x5a4a42);
  for (let i = 0; i < 10; i++) b.deco(43 + hash3(i, 1, 6) * 12, -3, 0.3 + hash3(i, 2, 6) * 6, 0.8 + hash3(i, 3, 6), 0.2 + hash3(i, 4, 6) * 0.4, 0.7, pick(C.salt, i, 2, 2));
  b.solid(49, -3, 5, 50, -3, 5, jitter(C.rustHull)); // a rusted locker, with something behind it
}

// ---------------------------------------------------------------------------
// The Long Pier, and Bell Rock
// ---------------------------------------------------------------------------
// Present: a raised quay deck runs out to Bell Rock, where the Noon Bell hangs. The tide gate at
// the deck's end opens for a few seconds when its lever is pulled, and the lever is down on the
// shore below: a short drop from the gate, a long way round back up. This is where the
// pocketwatch earns its keep. Bell Rock stands in every age, sheer on its west face.
function longPier(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    // Bell Rock, with steps cut down its east side
    b.solid(L.rockX0, 0, ZMIN, L.rockX1, 3, 6, jitter(C.seaRock));
    for (let i = 0; i < 3; i++) b.solid(L.rockX1 + 1 + i, 0, ZMIN, L.rockX1 + 1 + i, 2 - i, 6, jitter(C.seaRock));
    filler(b, era, 64, 85, 50 + era);
  }
  // PRESENT: the deck, its ladder, and the chapel of the Noon Bell
  let b = world.staticBuilder(M);
  b.solid(L.deckX0, 0, 0, L.deckX1, 3, 3, (x, y, z) => jitter(y === 3 ? C.drift : C.stone)(x, y, z));
  b.ladder(L.deckX0 - 1, 0, 1, L.deckX0 - 1, 3, 2);
  for (let y = 0; y < 4; y++) b.deco(L.deckX0 - 0.9, y + 0.4, 1.1, 0.12, 0.1, 1.8, C.wood[0]);
  for (const z of [1.1, 2.8]) b.deco(L.deckX0 - 0.9, 0, z, 0.12, 4, 0.1, C.wood[1]);
  for (let x = L.deckX0; x <= L.deckX1; x += 3) b.deco(x + 0.4, 4, 0.1, 0.2, 1.0, 0.2, C.wood[1]); // rail posts along the back
  b.deco(L.deckX0, 4.9, 0.14, L.deckX1 - L.deckX0 + 1, 0.1, 0.12, C.wood[0]);
  // the gate's frame on the edge of the rock
  for (const z of [-0.1, 6.9]) b.deco(L.rockX0 + 0.3, 4, z, 0.4, 3.4, 0.2, C.stone[3]);
  b.deco(L.rockX0 + 0.3, 7.3, -0.1, 0.4, 0.3, 7.2, C.stone[3]);
  // the lever's plinth down on the shore, and its chain running up to the gate
  b.deco(83.1, 0, 4.95, 0.8, 0.12, 0.7, C.stone[3]);
  b.deco(84.3, 0.1, 5.2, 1.8, 0.06, 0.06, 0x3a3a42);
  b.deco(85.9, 0, 5.2, 0.06, 4.2, 0.06, 0x3a3a42);
  // the chapel behind the bell, and the bell's frame
  b.solid(89, 4, -5, 96, 8, -1, jitter(C.whitewash));
  b.roof(88.5, 97.5, 9, -6.5, -0.6, 11.6, C.roofSea[0], C.whitewash[0]);
  b.deco(91.6, 4, -0.98, 1.8, 3.2, 0.06, 0x2f5a6a);
  b.glow(94.2, 5.4, -0.98, 0.8, 1.2, 0.05, NEON.warm);
  bellFrame(b, 92.5, 4, 1.2, 3.0, C.wood[1]);
  b.light(92.5, 6.5, 2.2, 0xffd070, 5, 8, 0.05);
  lampPost(b, 68, 0, M);

  // PAST: the rock is bare, but for a spiral the tide folk cut into it
  b = world.staticBuilder(P);
  for (let i = 0; i < 14; i++) {
    const a = i * 0.7, r = 0.25 + i * 0.12;
    b.glow(91.5 + Math.cos(a) * r, 4.0, 2.5 + Math.sin(a) * r, 0.14, 0.03, 0.14, NEON.sea);
  }
  for (let i = 0; i < 5; i++) b.deco(87 + i * 2.2, 4, 0.2 + hash3(i, 3, 3) * 0.5, 0.5, 0.25, 0.4, 0xf0f0f0); // gulls' nests

  // FUTURE: the chapel is a stump, and the Noon Bell lies cracked beside it
  b = world.staticBuilder(F);
  b.solid(89, 4, -5, 96, 5, -1, jitter(C.salt));
  b.deco(91.8, 4, 0.9, 1.2, 0.8, 1.0, 0x8a6a3a);
  b.barrier(92, 4, 1, 92, 4, 1);
  b.deco(92.0, 4.8, 1.0, 0.8, 0.3, 0.8, 0x7a5a30);
  b.deco(92.3, 4, 0.88, 0.08, 0.9, 0.04, 0x1a1410); // the crack
}

// ---------------------------------------------------------------------------
// The Saltings
// ---------------------------------------------------------------------------
// The old sea wall: five high in the Past (a rock ridge) and the Present, four in the Future,
// where the wind has had three more centuries to work. String the nets across the drying posts
// in the Present, and by the Future a dune has piled up against them, right to the wall's top.
// Before that: Salvage Pit 3, in the Future. Something's in it, and it has no way out.
const wallTop = (era) => (era === F ? 4 : 5);

function saltings(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const pal = era === P ? C.seaRock : era === M ? C.stone : C.rustHull;
    const top = wallTop(era);
    b.solid(L.wallX0, 0, ZMIN, L.wallX1, top - 1, 6, jitter(pal));
    // steps down the east side, so the wall can always be climbed back over
    for (let i = 1; i < top; i++) b.solid(L.wallX1 + i, 0, ZMIN, L.wallX1 + i, top - 1 - i, 6, jitter(pal));
    filler(b, era, era === F ? 114 : 104, 118, 60 + era);
    filler(b, era, 130, 133, 63 + era);
  }
  let b = world.staticBuilder(M);
  for (let z = ZMIN; z <= 6; z += 2) b.solid(L.wallX0, 5, z, L.wallX0, 5, z, jitter(C.stone)); // battlements
  b.deco(L.wallX0 - 0.04, 2.2, 2.4, 0.06, 2.2, 1.4, 0x27405e);
  b.deco(L.wallX0 - 0.08, 3.0, 2.8, 0.04, 0.6, 0.6, 0xe0b040);
  // FUTURE: the pit's rim, its warning sign, and a little sand already drifted against the wall
  b = world.staticBuilder(F);
  for (const [x, z, sx, sz] of [[L.pitX0, 0.9, 4, 0.1], [L.pitX0, 6.0, 4, 0.1], [L.pitX0 - 0.1, 1, 0.1, 5], [L.pitX1 + 1, 1, 0.1, 5]]) b.glow(x, 0.0, z, sx, 0.05, sz, NEON.amber);
  b.deco(109.2, 0, 0.3, 0.12, 1.9, 0.12, 0x4a3a34);
  b.deco(108.6, 1.1, 0.28, 1.3, 0.8, 0.06, 0x1a1410);
  b.glow(108.7, 1.2, 0.35, 1.1, 0.6, 0.03, 0x6a2a14);
  b.glow(109.1, 1.3, 0.39, 0.3, 0.4, 0.02, NEON.amber);
  b.light(111.5, -0.5, 3.5, 0xffa040, 5, 6, 0.1);
  b.deco(L.wallX0 - 1.2, 0, 0.5, 1.2, 0.3, 5.8, C.salt[1]);
  // the orchard nobody planted: the only green thing in the Dry Age
  for (const [tx, tz] of [[105, -2], [107, -3], [109, -2], [111, -4]]) blobTree(b, tx, tz, makeRng(tx), M, 1.1);
  b.solid(104, -1, -5, 112, -1, -1, jitter(C.overgrowth));
  b.light(107.5, 2, 0.5, 0x9affb0, 4, 7, 0);

  // Present: the net-drying posts in the wind's path
  world.addFeature({
    id: 'fence', eras: [M], key: (s) => String(!!s.flags.fenceBuilt),
    build: (b, era, s) => {
      for (let x = 120; x <= 123; x++) b.deco(x + 0.42, 0, 0.42, 0.16, 2.0, 0.16, C.wood[1]);
      if (s.flags.fenceBuilt) {
        b.deco(120.5, 0.2, 0.47, 3, 1.7, 0.05, 0x8a7a5a);
        for (let i = 0; i < 6; i++) b.deco(120.5 + i * 0.6, 0.2, 0.5, 0.04, 1.7, 0.02, 0x5a4a32);
        for (let i = 0; i < 4; i++) b.glow(120.7 + i * 0.8, 1.9, 0.5, 0.16, 0.16, 0.06, [0x5fe6c8, 0xffb03a, 0x9fe8ff, 0xe0786a][i]);
        b.deco(120.2, 0, 0.2, 3.6, 0.12, 1.0, C.sand[1]); // and already a little sand at its foot
      }
    },
  });
  // Future: three hundred years of wind against the nets
  world.addFeature({
    id: 'dune', eras: [F], key: (s) => String(!!s.flags.fenceBuilt),
    build: (b, era, s) => {
      if (!s.flags.fenceBuilt) return;
      const heights = [[119, 1], [120, 2], [121, 3], [122, 4], [123, 4]];
      for (const [x, h] of heights) b.solid(x, 0, 0, x, h - 1, 6, jitter(C.salt));
      for (let x = 120; x <= 123; x++) b.deco(x + 0.42, 3.6, 0.42, 0.16, 0.9, 0.16, 0x5a4a42); // the post tops, still showing
      b.deco(117.5, 0, 0.2, 1.5, 0.35, 6.4, C.salt[2]);
    },
  });
  // Future: once you've been in the pit and out again, you leave a rope ladder behind
  world.addFeature({
    id: 'pitLadder', eras: [F], key: (s) => String(!!s.flags.pitLeft),
    build: (b, era, s) => {
      if (!s.flags.pitLeft) return;
      b.ladder(L.pitX0, -2, 1, L.pitX0, -1, 1);
      for (let y = -2; y < 0; y++) b.deco(L.pitX0 + 0.1, y + 0.4, 1.1, 0.8, 0.08, 0.12, 0xc8a060);
      b.deco(L.pitX0 + 0.1, -2, 1.1, 0.06, 2, 0.1, 0xc8a060);
      b.deco(L.pitX0 + 0.84, -2, 1.1, 0.06, 2, 0.1, 0xc8a060);
    },
  });
}

// ---------------------------------------------------------------------------
// Keeper's Light
// ---------------------------------------------------------------------------
// The lighthouse stands on a sea stack. In the Past the stack is bare, and the Dawn Bell hangs
// from a driftwood mast, out over the tide pool: nothing to stand on within reach of it. In the
// Present, the lighthouse gallery is exactly there. (The Keeper's stair up to it stays locked
// until her lamp is lit again, and that needs a pearl three lifetimes in the growing.)
function poolLadders(b, visual = true) {
  for (const x of [L.poolX0, L.poolX1]) {
    b.ladder(x, -3, 0, x, -1, 0);
    if (!visual) continue;
    for (let y = -3; y < 0; y++) b.deco(x + 0.1, y + 0.4, 0.05, 0.8, 0.1, 0.12, C.wood[0]);
    b.deco(x + 0.1, -3, 0.05, 0.1, 3, 0.12, C.wood[0]);
    b.deco(x + 0.8, -3, 0.05, 0.1, 3, 0.12, C.wood[0]);
  }
}
export const CLAM = { x: 158.5, z: 3.5 };

function keepersLight(world) {
  const gy = L.galleryY;
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    b.solid(L.stackX0, 0, -4, L.stackX1, 4, 3, (x, y, z) => jitter(y === 4 && era !== F ? C.stoneMoss : C.seaRock)(x, y, z));
    filler(b, era, 134, 146, 70 + era);
    filler(b, era, 162, 167, 73 + era);
  }
  // PRESENT: the tower, its gallery, the dried-out pool
  let b = world.staticBuilder(M);
  b.solid(149, 5, -3, 152, 16, 0, (x, y, z) => jitter(y % 6 < 2 ? C.roof : C.whitewash)(x, y, z));
  b.solid(148, 17, -4, 153, 17, 1, jitter(C.stone)); // the lamp room's floor
  for (const [px, pz] of [[148.1, -3.9], [153.7, -3.9], [148.1, 1.7], [153.7, 1.7]]) b.deco(px, 18, pz, 0.2, 2.2, 0.2, 0x2a2a30);
  b.roof(147.6, 154.4, 20.2, -4.6, 2.4, 22.6, C.roofSea[0], 0x2a2a30);
  b.deco(150.0, 18, -1.6, 1.0, 1.6, 1.0, 0x3a3a42); // the lamp's cradle
  b.deco(150.1, 5, 0.02, 0.9, 1.9, 0.06, 0x2f5a6a); // door, on the stack top
  for (let y = 8; y < 16; y += 3) b.deco(150.3, y, 0.02, 0.5, 0.8, 0.05, 0x34404c);
  // the gallery: a walk round the tower at half its height, built out over the pool
  b.solid(152, gy - 1, 1, 157, gy - 1, 3, jitter(C.drift));
  for (let x = 152; x <= 157; x++) b.deco(x + 0.44, gy, 3.86, 0.12, 0.9, 0.12, 0x2a2a30);
  b.deco(152, gy + 0.85, 3.88, 6, 0.08, 0.08, 0x2a2a30);
  b.deco(157.86, gy, 1, 0.12, 0.9, 3, 0x2a2a30);
  for (const x of [153.2, 156.8]) b.deco(x, gy - 4, 1.2, 0.14, 3.2, 0.14, C.wood[1]); // struts
  poolLadders(b);
  for (let i = 0; i < 12; i++) b.deco(155.3 + hash3(i, 1, 3) * 6.2, -3, 0.2 + hash3(i, 2, 3) * 6.4, 0.6, 0.03, 0.08, 0x4a3e34); // cracked mud
  lampPost(b, 144, 0, M);

  // PAST: the bare stack, the Dawn Bell's mast, and the Mother Clam at the bottom of the pool
  b = world.staticBuilder(P);
  b.deco(153.1, 5, 1.8, 0.3, 7.4, 0.3, C.drift[1]);
  b.deco(153.1, 12.1, 1.84, 3.4, 0.24, 0.24, C.drift[0]);
  b.deco(152.2, 5, 1.2, 0.2, 3.2, 0.2, C.drift[2]); // a prop, lashed on
  for (let i = 0; i < 6; i++) b.glow(153.2, 6 + i, 1.78, 0.1, 0.5, 0.04, i % 2 ? 0xe8fbff : 0xffd8f0); // shells up the mast
  b.light(155.5, 11, 3, 0xffb88a, 5, 8, 0.05);
  const { x: cx, z: cz } = CLAM;
  b.deco(cx - 0.9, -3, cz - 0.7, 1.8, 0.35, 1.4, 0xe8dcc8);
  b.deco(cx - 0.9, -2.65, cz - 0.7, 1.8, 0.9, 0.25, 0xf0e4d0); // the upper shell, gaping
  for (let i = 0; i < 5; i++) b.deco(cx - 0.8 + i * 0.36, -2.65, cz - 0.45, 0.12, 0.8, 0.06, 0xd8c8b0);
  b.glow(cx - 0.5, -2.62, cz - 0.3, 1.0, 0.1, 0.7, 0xffd8f0);
  b.light(cx, -1.8, cz, 0xffd8f0, 4, 5, 0);

  // FUTURE: the tower fell long ago; its drum lies across the stack
  b = world.staticBuilder(F);
  b.solid(149, 5, -3, 152, 6, 0, jitter(C.whitewash));
  b.deco(153.2, 0, 4.2, 3.6, 1.6, 1.6, C.whitewash[1]);
  b.deco(156.9, 0, 4.4, 1.6, 1.2, 1.2, C.roof[0]);
  b.barrier(153, 0, 4, 156, 1, 5);
  b.barrier(157, 0, 4, 158, 0, 5);

  // the fossil clam on the dry pool bed, and what three lifetimes made inside it
  world.addFeature({
    id: 'clamM', eras: [M], key: (s) => `${!!s.flags.clamSeeded},${!!s.flags.pearlTaken}`,
    build: (b, era, s) => {
      b.deco(cx - 0.9, -3, cz - 0.7, 1.8, 0.3, 1.4, 0x9a9488);
      b.deco(cx - 0.9, -2.7, cz - 0.7, 1.8, 0.8, 0.22, 0xa8a296);
      if (s.flags.clamSeeded && !s.flags.pearlTaken) {
        b.glow(cx - 0.3, -2.7, cz - 0.25, 0.6, 0.6, 0.6, 0xe8e4f4);
        b.light(cx, -2, cz + 0.3, 0xe8e4ff, 6, 6, 0);
      }
    },
  });
  // the Keeper's stair, and her lamp
  world.addFeature({
    id: 'lightStair', eras: [M], key: (s) => String(!!s.flags.lampLit),
    build: (b, era, s) => {
      const lit = !!s.flags.lampLit;
      const rungs = (x, y0, y1, z) => {
        for (let y = y0; y <= y1; y++) b.deco(x + 0.1, y + 0.4, z + 0.05, 0.8, 0.1, 0.12, 0x3a3a42);
        b.deco(x + 0.1, y0, z + 0.05, 0.1, y1 - y0 + 1, 0.12, 0x3a3a42);
        b.deco(x + 0.8, y0, z + 0.05, 0.1, y1 - y0 + 1, 0.12, 0x3a3a42);
      };
      rungs(150, 0, 4, 4);
      rungs(151, 5, gy - 1, 2);
      if (lit) {
        b.ladder(150, 0, 4, 150, 4, 4);
        b.ladder(151, 5, 2, 151, gy - 1, 2);
        // the lamp burns again, and its beam swings out to sea
        b.glow(150.05, 18.6, -1.55, 0.9, 1.1, 0.9, 0xfff6d8);
        b.glow(151, 19.0, -1.2, 9, 0.16, 0.16, 0xfff0c0);
        b.light(150.5, 19, 1.5, 0xfff0c0, 12, 16, 0);
        b.light(151, 9, 3.5, 0xffd8a0, 5, 8, 0);
      } else {
        // a locked cage round the foot of the stair
        b.barrier(150, 0, 4, 150, 2, 4);
        for (let i = 0; i < 4; i++) b.deco(150 + i * 0.3, 0, 4.9, 0.06, 2.6, 0.06, 0x2a2a30);
        b.deco(149.95, 2.6, 4.0, 1.1, 0.1, 1.0, 0x2a2a30);
        b.deco(150.35, 1.1, 4.96, 0.3, 0.36, 0.06, 0xc9a44a); // padlock
      }
    },
  });
}

// ---------------------------------------------------------------------------
// The Dry Lock
// ---------------------------------------------------------------------------
// A channel across the road: a tide-rip in the Past, sinking mud in the Present, a dry canyon in
// the Future, where a bridge crosses it, behind a door. The door's control panel hangs out over
// the drop, where only the Present's old jetty still reaches: press it through the lens, and
// let the pocketwatch take you back to the door before it shuts.
function dryLock(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    filler(b, era, 168, 176, 80 + era);
    filler(b, era, 192, 197, 83 + era);
  }
  // PRESENT: the old jetty out over the mud, and the swing bridge, jammed open
  let b = world.staticBuilder(M);
  b.solid(L.chanX0, -1, 2, L.jettyX1, -1, 4, jitter(C.drift));
  for (let x = L.chanX0; x <= L.jettyX1; x += 2) for (const z of [1.86, 4.94]) b.deco(x + 0.4, -3, z, 0.2, 3.6, 0.2, C.wood[1]);
  b.deco(L.jettyX1 + 0.86, 0, 2, 0.14, 0.9, 0.14, C.wood[1]);
  b.deco(L.jettyX1 + 0.86, 0, 4.86, 0.14, 0.9, 0.14, C.wood[1]);
  b.deco(L.jettyX1 + 0.88, 0.8, 2, 0.1, 0.1, 3, C.wood[0]);
  b.deco(L.chanX1 + 0.2, 0, 0.4, 0.5, 4.5, 0.5, C.stone[3]); // the swing bridge's pivot...
  b.deco(L.chanX1 + 0.3, 3.4, 0.5, 0.3, 0.3, 5.5, C.wood[1]); // ...and its span, swung away along the bank
  b.deco(L.chanX1 + 0.1, 0, 5.6, 0.7, 3.6, 0.5, C.stone[3]);
  lampPost(b, 174, 0, M);
  // PAST: marker stones either side of the Race
  b = world.staticBuilder(P);
  for (const x of [L.chanX0 - 1.4, L.chanX1 + 1.3]) {
    b.deco(x, 0, 0.3, 0.6, 1.6, 0.6, C.seaRock[1]);
    b.barrier(Math.floor(x), 0, 0, Math.floor(x), 1, 0);
    b.glow(x + 0.15, 1.0, 0.92, 0.3, 0.3, 0.03, NEON.sea);
  }
  // FUTURE: the walkway and the bridge at deck height, the door between them, steps down the far side
  b = world.staticBuilder(F);
  b.ladder(L.chanX0, -3, 0, L.chanX0, -1, 0);
  for (let y = -3; y < 0; y++) b.deco(L.chanX0 + 0.1, y + 0.4, 0.05, 0.8, 0.1, 0.12, 0x6a4a3a);
  b.solid(L.walkX0, 3, 1, L.chanX1 + 1, 3, 5, jitter(C.rustHull));
  for (let x = L.walkX0; x <= L.chanX0 - 1; x += 3) for (const z of [1.1, 5.6]) b.deco(x + 0.3, 0, z, 0.3, 3, 0.3, 0x5a4a42); // the walkway's legs
  for (const x of [L.chanX0 + 0.2, 184, L.chanX1 + 0.4]) for (const z of [1.1, 5.6]) b.deco(x, -3, z, 0.4, 6, 0.3, 0x5a4a42); // the bridge's piers
  b.ladder(L.walkX0 - 1, 0, 3, L.walkX0 - 1, 3, 3);
  for (let y = 0; y < 4; y++) b.deco(L.walkX0 - 0.9, y + 0.4, 3.1, 0.12, 0.1, 0.8, 0x6a4a3a);
  for (const z of [3.1, 3.8]) b.deco(L.walkX0 - 0.9, 0, z, 0.12, 4, 0.1, 0x6a4a3a);
  for (let i = 0; i < 3; i++) b.solid(L.chanX1 + 2 + i, 0, 1, L.chanX1 + 2 + i, 2 - i, 5, jitter(C.rustHull));
  // the door's frame
  for (const z of [-0.1, 6.9]) b.deco(L.chanX0 + 0.3, 0, z, 0.4, 7.4, 0.2, 0x4a3a34);
  b.deco(L.chanX0 + 0.3, 7.2, -0.1, 0.4, 0.3, 7.2, 0x4a3a34);
  b.glow(L.chanX0 + 0.25, 7.0, 0.2, 0.06, 0.12, 6.6, NEON.amber);
  // a sign on the walkway, pointing at where the service jetty used to be
  b.deco(172.4, 4, 1.1, 0.1, 1.5, 0.1, 0x4a3a34);
  b.deco(171.9, 4.9, 1.08, 1.1, 0.6, 0.06, 0x1a1410);
  b.glow(172.0, 5.0, 1.15, 0.9, 0.4, 0.03, 0x6a2a14);
  b.light(175.5, 6.6, 0.6, 0xffa040, 6, 8, 0.15);
  b.light(184.5, 1.6, 3.5, 0xffb03a, 4, 5, 0);
}

// ---------------------------------------------------------------------------
// The Warden's Wharf
// ---------------------------------------------------------------------------
// The Dusk Bell hangs on the Future wharf, and a Warden walks round it. In the Present that
// spot is inside the boathouse, so the last stretch has to be walked in the Future. Every
// stroke of the bell brings the Warden running.
export const WARDEN_PATH = [[211.5, 1.0], [221.5, 1.0], [221.5, 5.6], [211.5, 5.6]];
const WHARF_PILLARS = [[204, 3], [206, 1], [206, 5], [208, 3], [213, 3], [215, 4], [218, 2], [220, 3], [219, 4], [224, 2], [224, 5]];

function wharf(world) {
  for (let era = 0; era < 3; era++) filler(world.staticBuilder(era), era, 198, 231, 90 + era);
  const k = L.duskBell;
  // PRESENT: the boathouse over the bell's spot
  let b = world.staticBuilder(M);
  b.solid(214, 0, 1, 219, 2, 4, (x, y, z) => jitter(y === 0 ? C.stone : C.hull)(x, y, z));
  b.roof(213.6, 220.4, 3, 0.6, 5.4, 4.8, C.roofSea[0], C.hull[0]);
  b.deco(216.0, 0, 4.98, 1.6, 2.2, 0.06, 0x2f5a6a);
  b.deco(214.3, 0.9, 5.02, 1.2, 1.1, 0.04, 0x8a7a5a); // a net on the wall
  strandedBoat(b, 208, 0, 0.2, 3.2, 0x8a7a4a);
  for (const x of [203, 226]) lampPost(b, x, 0, M);
  // PAST: fish weirs staked out along the strand
  b = world.staticBuilder(P);
  for (let i = 0; i < 9; i++) b.deco(206 + i * 2.2, 0, 0.3 + (i % 2) * 0.3, 0.14, 1.0, 0.14, C.drift[i % 3]);
  b.deco(206, 0.8, 0.36, 18, 0.06, 0.06, C.drift[0]);
  // FUTURE: bollards for cover, the patrol's corner marks, the bell's gantry
  b = world.staticBuilder(F);
  for (const [x, z] of WHARF_PILLARS) {
    b.solid(x, 0, z, x, 1, z, jitter(C.rustHull));
    b.glow(x + 0.1, 2.0, z + 0.1, 0.8, 0.04, 0.8, NEON.amber);
  }
  for (const [x, z] of WARDEN_PATH) b.glow(x - 0.2, 0.0, z - 0.2, 0.4, 0.03, 0.4, 0xff3040);
  bellFrame(b, k.x, 0, k.z, 3.0, 0x4a3a34);
  b.glow(k.x - 1.05, 3.24, k.z - 0.1, 2.1, 0.05, 0.2, 0xb8a0ff);
  b.light(k.x, 2.6, k.z + 0.8, 0xb8a0ff, 4, 7, 0);
}

// ---------------------------------------------------------------------------
// Gull's Head
// ---------------------------------------------------------------------------
// The road ends in a long stair up the headland. At the top, the mouth of the Tide Well: a door
// that opens to three bells, and only in the Present. The tide folk are still building it in
// the Past; the Dry Age has salted it shut.
function gullsHead(world) {
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    filler(b, era, 232, 237, 100 + era);
    for (let i = 0; i < 12; i++) b.solid(L.stairX0 + i, 0, ZMIN, L.stairX0 + i, i, 6, jitter(C.seaRock));
    b.solid(L.plateauX0, 0, ZMIN, L.wellX0 - 1, L.headTop - 1, 6, (x, y, z) => jitter(y === L.headTop - 1 && era !== F ? C.stoneMoss : C.seaRock)(x, y, z));
    // a rope rail up the stair, in whatever each age had to hand
    const rope = [0xc8a060, 0x8a7a5a, 0x5a4a42][era];
    for (let i = 0; i < 12; i += 2) b.deco(L.stairX0 + i + 0.4, i + 1, 0.1, 0.14, 1.0, 0.14, rope);
  }
  // PAST: the builders' camp
  let b = world.staticBuilder(P);
  const y = L.headTop;
  for (const [ox, oy, oz] of [[0, 0, 0], [0.8, 0, 0.05], [0.4, 0.5, 0.03]]) b.deco(250.6 + ox, y + oy, 0.3 + oz, 0.75, 0.5, 0.6, C.wellStone[1]);
  b.deco(254.4, y, 0.2, 0.2, 3.4, 0.2, C.drift[1]);
  b.deco(254.4, y + 3.3, 0.24, 1.6, 0.2, 0.2, C.drift[0]); // a hoist over the well mouth
  wallTorch(b, 251.2, y + 1.2, 0.0);
  // PRESENT: a cairn, and offerings left by fishermen who never knew what the door was
  b = world.staticBuilder(M);
  b.deco(250.6, y, 0.3, 0.9, 0.5, 0.8, C.stone[1]);
  b.deco(250.75, y + 0.5, 0.4, 0.6, 0.4, 0.6, C.stone[3]);
  b.glow(250.9, y + 0.9, 0.55, 0.3, 0.3, 0.3, NEON.warm);
  b.light(251, y + 1.5, 1.2, 0xffb060, 6, 7, 0.2);
  // FUTURE: salt, to the lintel
  b = world.staticBuilder(F);
  b.deco(253.6, y, 0.2, 2.4, 1.6, 6.6, C.salt[1]);
  b.deco(252.4, y, 1.0, 1.4, 0.7, 5.0, C.salt[2]);

  world.addFeature({
    id: 'wellDoor', eras: [P, M, F], key: (s) => String(!!s.flags.wellOpen),
    build: (b, era, s) => {
      const x = L.wellX0;
      if (era === M && s.flags.wellOpen) {
        for (const z of [1.9, 5.0]) b.glow(x - 0.06, y, z, 0.06, 3.0, 0.1, NEON.sea);
        b.glow(x - 0.06, y + 3.0, 1.9, 0.06, 0.1, 3.2, NEON.sea);
        b.light(x - 0.8, y + 1.5, 3.5, 0x9fffe8, 6, 8, 0);
        return;
      }
      const pal = era === P ? C.drift : era === M ? C.wellStone : C.salt;
      b.solid(x, y, 2, x, y + 2, 4, jitter(pal));
      if (era === M) {
        // three bells carved in the slab, one for each voice it's waiting for
        [['dawnRung', 0xffb88a], ['noonRung', 0xffd870], ['duskRung', 0xb8a0ff]].forEach(([flag, col], i) => {
          const z = 2.3 + i * 0.85;
          if (s.flags[flag]) b.glow(x - 0.06, y + 1.2, z, 0.06, 0.6, 0.5, col);
          else b.deco(x - 0.06, y + 1.2, z, 0.06, 0.6, 0.5, 0x22343a);
        });
        b.deco(x - 0.04, y + 2.3, 2.2, 0.04, 0.12, 2.6, 0x22343a);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// The Tide Well
// ---------------------------------------------------------------------------
// Four terraces stepping down east to the wheel of Donald Eugene's sluice, a gate on the edge of each.
// In the Past and the Future the gates are blank wall; only the Present's still move.
//   Gate A: its lever is up on a Past scaffold. Only the Future's fallen masonry climbs that high,
//           and a stub of the scaffold in the Present is the step between the two.
//   Gate B: its winch is walled into a Past alcove, its crank locked in a Future cage. Reach.
//   Gate C: its lever is in a Future pit with no way out, and it holds the gate for seconds.
// At the bottom, Donald Eugene's cog comes out of the wheel, and the river comes home to carry you out.
function tideWell(world) {
  const G = WELL;
  const dark = [0x2a4046, 0x30484e];
  for (let era = 0; era < 3; era++) {
    const b = world.staticBuilder(era);
    const pal = jitter(C.wellStone);
    b.solid(G.x0, 0, -3, G.x1, 23, -1, pal);
    for (let y = 0; y <= 23; y++) for (let z = 0; z <= 6; z++) if (!(y >= L.headTop && y <= L.headTop + 2 && z >= 2 && z <= 4)) b.setCell(G.x0, y, z, T.SOLID, pal(G.x0, y, z));
    b.solid(G.x1, 0, 0, G.x1, 23, 6, pal);
    for (const t of G.terraces) if (t.top > 0) b.solid(t.x0, 0, 0, t.x1, t.top - 1, 6, pal);
    // tide marks on the back wall: one bright band for every terrace
    for (const t of G.terraces) b.glow(t.x0, t.top + 3.4, -0.02, t.x1 - t.x0 + 1, 0.08, 0.04, [NEON.sea, 0xbfd8ff, NEON.amber, 0xffd070][G.terraces.indexOf(t)]);
    for (let x = G.x0 + 3; x < G.x1; x += 4) b.deco(x + 0.1, 0, -0.02, 0.08, 23, 0.04, dark[0]);
    if (era !== M) for (const gt of GATES.filter((g) => g.id.startsWith('gate'))) b.solid(gt.x, gt.y, 0, gt.x, gt.y + 6, 6, jitter(dark)); // no gate here to open
    for (const [lx, ly] of [[260, 15], [266, 15], [273, 11], [278, 11], [285, 7], [289, 7], [293, 3], [297, 3]]) {
      b.glow(lx + 0.35, ly, -0.06, 0.3, 0.4, 0.08, era === F ? NEON.amber : NEON.sea);
      b.light(lx + 0.5, ly, 1.4, era === F ? 0xffa040 : 0x9fffe8, 6, 9, 0.1);
    }
    // the heart's cradle at the bottom of everything
    const h = G.heart;
    b.deco(h.x - 0.5, 0, h.z - 0.5, 1.0, 0.8, 1.0, dark[1]);
    b.barrier(Math.floor(h.x - 0.5), 0, Math.floor(h.z), Math.floor(h.x - 0.5), 0, Math.floor(h.z));
    b.deco(h.x - 0.4, 0.8, h.z - 0.4, 0.8, 0.06, 0.8, 0x1a2a2e);
  }
  // PRESENT: frames for the three gates. The first stands under a solid arch, so nothing gets
  // over the top of it from the scaffold; the lower two must stay open above, because the tide
  // has to carry you back out over them.
  let b = world.staticBuilder(M);
  for (const gt of GATES.filter((g) => g.id.startsWith('gate'))) {
    for (const z of [-0.1, 6.9]) b.deco(gt.x + 0.3, gt.y, z, 0.4, 3.4, 0.2, dark[0]);
    b.deco(gt.x + 0.3, gt.y + 3.3, -0.1, 0.4, 0.3, 7.2, dark[0]);
  }
  b.solid(268, 15, 0, 268, 18, 6, jitter(dark));
  b.glow(267.97, 15.1, 0.2, 0.04, 0.1, 6.6, GATES.find((g) => g.id === 'gateA').color);
  // what's left of the builders' scaffold: two planks on a corbel, far too high to reach from the
  // floor. (The Chronoheart only steps one age at a time: this is the stepping stone between the
  // Future's rubble and the Past's scaffold.)
  b.solid(263, 14, 0, 264, 14, 1, jitter(C.drift));
  b.deco(263.1, 13.4, 0.1, 1.8, 0.6, 0.5, dark[1]);
  // PAST: the builders' scaffold with gate A's lever, and gate B's winch in its alcove
  b = world.staticBuilder(P);
  const lg = G.ledge;
  b.solid(lg.x0, lg.top - 1, 0, lg.x1, lg.top - 1, 1, jitter(C.drift));
  for (const x of [lg.x0 + 0.1, lg.x1 + 0.7]) b.deco(x, 12, 1.7, 0.2, lg.top - 13, 0.2, C.drift[1]);
  const al = G.alcove;
  b.barrier(al.x0, 8, al.z0, al.x1, 10, al.z1);
  for (let x = al.x0; x <= al.x1 + 1; x += 0.5) b.deco(x - 0.04, 8, al.z1 + 0.92, 0.08, 3, 0.08, C.drift[1]); // bars across the front
  for (let z = al.z0; z <= al.z1 + 0.5; z += 0.5) for (const x of [al.x0 - 0.04, al.x1 + 0.96]) b.deco(x, 8, z, 0.08, 3, 0.08, C.drift[1]);
  b.deco(al.x0, 10.9, al.z0, 3, 0.14, 3, C.drift[0]);
  b.deco(275.0, 8, 0.8, 1.0, 0.9, 0.8, C.drift[2]); // the winch drum
  b.deco(275.3, 8.9, 1.0, 0.4, 0.3, 0.4, 0x8a929e); // and its bare spindle
  b.light(275.5, 10, 1.5, 0x9fffe8, 4, 5, 0);
  // FUTURE: fallen masonry by the door, the caged crank, and the pit in the third terrace
  b = world.staticBuilder(F);
  b.solid(260, 12, 0, 260, 12, 1, jitter(C.wellStone));
  b.solid(261, 12, 0, 261, 13, 1, jitter(C.wellStone));
  b.solid(262, 12, 0, 264, 14, 1, jitter(C.wellStone));
  b.deco(259.2, 12, 0.3, 0.7, 0.4, 0.6, dark[1]);
  const cg = G.cage;
  b.barrier(cg.x0, 8, cg.z0, cg.x1, 10, cg.z1);
  for (let x = cg.x0; x <= cg.x1 + 1; x += 0.5) b.deco(x - 0.04, 8, cg.z0 - 0.04, 0.08, 3, 0.08, 0x5a4a42);
  for (let z = cg.z0; z <= cg.z1 + 1; z += 0.5) for (const x of [cg.x0 - 0.04, cg.x1 + 0.96]) b.deco(x, 8, z - 0.04, 0.08, 3, 0.08, 0x5a4a42);
  b.deco(cg.x0, 10.9, cg.z0, 2, 0.14, 3, 0x4a3a34);
  b.deco(277.5, 8, 4.9, 1.0, 0.5, 0.7, 0x4a3a34);
  b.light(278, 10, 4.5, 0xffa040, 4, 5, 0);
  const pt = G.pit;
  b.air(pt.x0, pt.floor, pt.z0, pt.x1, 3, pt.z1);
  for (const [x, z, sx, sz] of [[pt.x0, pt.z0 - 0.1, 3, 0.1], [pt.x0, pt.z1 + 1, 3, 0.1], [pt.x0 - 0.1, pt.z0, 0.1, 3], [pt.x1 + 1, pt.z0, 0.1, 3]]) b.glow(x, 4.0, z, sx, 0.05, sz, NEON.amber);
  b.light(284.5, 3.2, 3.5, 0xffa040, 4, 5, 0);

  // the ways back up, once each gate has let you through
  world.addFeature({
    id: 'wellLadders', eras: [M], key: (s) => `${!!s.flags.gateA},${!!s.flags.gateB},${!!s.flags.gateCPassed}`,
    build: (b, era, s) => {
      G.terraces.slice(1).forEach((t, i) => {
        if (!s.flags[['gateA', 'gateB', 'gateCPassed'][i]]) return;
        const up = G.terraces[i].top;
        b.ladder(t.x0, t.top, 0, t.x0, up - 1, 0);
        for (let y = t.top; y < up; y++) b.deco(t.x0 + 0.1, y + 0.4, 0.05, 0.8, 0.08, 0.12, 0xc9963a);
        b.deco(t.x0 + 0.1, t.top, 0.05, 0.08, up - t.top, 0.12, 0xc9963a);
        b.deco(t.x0 + 0.82, t.top, 0.05, 0.08, up - t.top, 0.12, 0xc9963a);
      });
    },
  });
  // ...and out of the pit, once the last gate is behind you
  world.addFeature({
    id: 'wellPitLadder', eras: [F], key: (s) => String(!!s.flags.gateCPassed),
    build: (b, era, s) => {
      if (!s.flags.gateCPassed) return;
      b.ladder(pt.x0, pt.floor, pt.z0, pt.x0, 3, pt.z0);
      for (let y = pt.floor; y < 4; y++) b.deco(pt.x0 + 0.1, y + 0.4, pt.z0 + 0.05, 0.8, 0.08, 0.12, 0xc8a060);
    },
  });
  // the heart, home again; and, once the story's told, the Well stays full
  world.addFeature({
    id: 'wellHeart', eras: [M], key: (s) => `${!!s.flags.heartPlaced},${!!s.flags.wellFull}`,
    build: (b, era, s) => {
      const h = G.heart;
      if (s.flags.heartPlaced) {
        // the wheel runs free, and the river runs home beneath it
        b.glow(h.x - 0.3, 0.86, h.z - 0.3, 0.6, 0.04, 0.6, 0x9fe8ff);
        b.light(h.x, 1.6, h.z + 0.6, 0x9fe8ff, 9, 10, 0);
      } else {
        // one small brass cog, jammed into the works: notched in one tooth
        b.glow(h.x - 0.18, 0.86, h.z - 0.18, 0.36, 0.36, 0.08, 0xffc040);
        b.deco(h.x + 0.1, 0.95, h.z - 0.2, 0.08, 0.12, 0.1, 0x2a1a08);
        b.light(h.x, 1.4, h.z + 0.5, 0xffc060, 5, 6, 0);
      }
      if (s.flags.wellFull) {
        for (const t of G.terraces.slice(1)) b.water(t.x0, t.top, 0, t.x1, 11, 6, SEA[M], 0.15);
        G.terraces.slice(1).forEach((t, i) => b.ladder(t.x0, t.top, 0, t.x0, G.terraces[i].top - 1, 0));
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Entity spawns
// ---------------------------------------------------------------------------
const HT = L.headTop;
export const SPAWNS = [
  // People
  { type: 'npc', id: 'eugene', era: M, x: 6.5, z: 2.0, sheet: 'eugene', name: 'Donald Eugene' },
  { type: 'npc', id: 'brannoch', era: M, x: 17.5, z: 1.6, sheet: 'brannoch', name: 'Harbormaster Brannoch' },
  { type: 'npc', id: 'zach', era: M, x: 23.5, y: 1, z: 1.5, sheet: 'zach', name: 'Zach Tiberious', small: true },
  { type: 'npc', id: 'megan', era: M, x: 24.5, y: 1, z: 1.5, sheet: 'megan', name: 'Megan the Squirrel', small: true },
  { type: 'npc', id: 'isha', era: P, x: 18.5, z: 2.0, sheet: 'isha', name: 'Isha the Shell-Singer' },
  { type: 'npc', id: 'pim', era: P, x: 33.5, z: 4.6, sheet: 'pim', name: 'Pim', small: true },
  { type: 'npc', id: 'digby', era: F, x: 12.5, z: 2.0, sheet: 'digby', name: 'DIGBY (Salvage Unit)' },
  { type: 'npc', id: 'pell', era: M, x: 36.8, z: 1.7, sheet: 'pell', name: 'Dr. Pell' },
  { type: 'npc', id: 'michelle', era: M, x: 67.5, z: 1.6, sheet: 'michelle', name: 'Mysterious Stranger', stranger: true },
  { type: 'interact', id: 'seaChest', era: M, x: 70.5, y: 0, z: 0.6, prompt: "Donald Eugene's sea-chest", visual: 'chest', openFlag: 'seaChestOpen', icon: 'hairspring', goneFlag: 'hasRewind' },
  { type: 'npc', id: 'odalys', era: M, x: 145.5, z: 4.4, sheet: 'odalys', name: 'Odalys the Lightkeeper' },
  { type: 'npc', id: 'fenwick', era: M, x: 176.5, z: 1.6, sheet: 'fenwick', name: 'Old Fenwick' },
  { type: 'npc', id: 'maren', era: P, x: 252.5, y: HT, z: 1.8, sheet: 'maren', name: 'Maren the Tide-Reader' },

  // Saltwick Quay
  { type: 'interact', id: 'gauge', era: M, x: 5.1, y: 0, z: 0.5, prompt: 'Tide gauge' },
  { type: 'interact', id: 'trunk', era: M, x: 8.2, y: 0, z: 0.7, prompt: 'Your trunk', visual: 'trunk', openFlag: 'seaCoat', icon: 'seaCoat', goneFlag: 'seaCoat' },
  { type: 'interact', id: 'portSign', era: F, x: 15.2, y: 0, z: 0.9, prompt: 'Port sign' },
  { type: 'interact', id: 'lanternM', era: M, x: LANTERN.x, y: 0, z: LANTERN.z + 0.5, prompt: 'The Ever-Lantern', needs: 'lampGiven' },
  { type: 'interact', id: 'lanternF', era: F, x: LANTERN.x, y: 0, z: LANTERN.z + 0.5, prompt: 'Old lantern', needs: 'lampGiven' },
  // The Mudflats
  { type: 'interact', id: 'ferrySign', era: M, x: 40.5, y: 0, z: 0.8, prompt: 'Ferry sign' },
  { type: 'pickup', id: 'nets', era: M, x: 45.5, y: 0.7, z: 2.5, item: 'nets' },
  { type: 'pickup', id: 'whistle', era: P, x: 48.5, y: -2.5, z: 3.5, item: 'whistle', needs: 'whistleQuest' },
  // The Long Pier
  { type: 'interact', id: 'tideLever', era: M, x: 83.5, y: 0, z: 5.3, prompt: 'Tide gate lever', visual: 'lever', gate: 'tideGate' },
  { type: 'strike', id: 'noonBell', era: M, x: 92.5, y: 4, z: 1.2, flag: 'noonRung', prompt: 'Ring the Noon Bell', visual: 'bell', color: 0xffd870, freq: 262, hang: 2.9, hz: 1.5 },
  // The Saltings
  { type: 'interact', id: 'pitSign', era: F, x: 109.3, y: 0, z: 0.9, prompt: 'Warning sign' },
  { type: 'pickup', id: 'clapper', era: F, x: 111.9, y: -1.3, z: 3.5, item: 'clapper' },
  { type: 'interact', id: 'grove', era: F, x: 107.5, y: 0, z: 0.5, prompt: 'Oak grove' },
  { type: 'interact', id: 'fencePosts', era: M, x: 122, y: 0, z: 1.0, prompt: 'Net-drying posts' },
  { type: 'interact', id: 'drift', era: F, x: L.wallX0 - 0.7, y: 0, z: 3.5, prompt: 'Sea wall', hideIf: 'fenceBuilt' },
  // Keeper's Light
  { type: 'interact', id: 'clamP', era: P, x: CLAM.x, y: -3, z: CLAM.z, prompt: 'The Mother Clam', reach: 2.0 },
  { type: 'interact', id: 'clamM', era: M, x: CLAM.x, y: -3, z: CLAM.z, prompt: 'Fossil clam' },
  { type: 'interact', id: 'stairCage', era: M, x: 150.5, y: 0, z: 5.2, prompt: "The Keeper's stair", hideIf: 'lampLit' },
  { type: 'strike', id: 'dawnBell', era: P, x: 155.5, y: L.galleryY, z: 2.0, flag: 'dawnRung', prompt: 'Ring the Dawn Bell', visual: 'bell', color: 0xffb88a, freq: 330, hang: 2.1, hx: 1.2, hz: 1.4, lens: true, lensOnly: true },
  // The Dry Lock
  { type: 'interact', id: 'lockSign', era: F, x: 172.5, y: 4, z: 1.6, prompt: 'Lock sign' },
  { type: 'interact', id: 'lockConsole', era: F, x: 184.5, y: 1.1, z: 3.5, prompt: 'Lock control', visual: 'console', gate: 'lockDoor', lens: true, lensOnly: true },
  // The Warden's Wharf
  { type: 'interact', id: 'duskBellFit', era: F, x: L.duskBell.x, y: 0, z: L.duskBell.z, prompt: 'The Dusk Bell', hideIf: 'clapperFitted', reach: 1.5 },
  { type: 'strike', id: 'duskBell', era: F, x: L.duskBell.x, y: 0, z: L.duskBell.z, flag: 'duskRung', needs: 'clapperFitted', prompt: 'Ring the Dusk Bell', visual: 'bell', color: 0xb8a0ff, freq: 196, hang: 2.9, hx: 1.2, hz: 1.4 },
  { type: 'strike', id: 'wardenKey', era: F, x: 216.5, y: 0, z: 5.3, hits: 1, flag: 'wardenKeyStruck', needs: 'duskStroke1', prompt: "Strike the Warden's wind-up key", visual: 'key', color: 0xffd070, hx: 1.4, hz: 2.0, lens: true, lensOnly: true },
  { type: 'interact', id: 'boathouse', era: M, x: 216.8, y: 0, z: 5.4, prompt: 'Boathouse door' },
  // Gull's Head
  { type: 'interact', id: 'wellDoorM', era: M, x: L.wellX0 - 0.6, y: HT, z: 3.5, prompt: 'The Wellhead door', hideIf: 'wellOpen' },
  { type: 'interact', id: 'wellDoorP', era: P, x: L.wellX0 - 0.6, y: HT, z: 3.5, prompt: 'Unfinished door' },
  { type: 'interact', id: 'wellDoorF', era: F, x: L.wellX0 - 2.4, y: HT, z: 3.5, prompt: 'Salt-crusted door' },
  // The Tide Well
  { type: 'interact', id: 'leverA', era: P, x: 265.5, y: WELL.ledge.top, z: 0.9, prompt: 'Scaffold lever', visual: 'lever', flag: 'gateA', color: 0x5fe6c8 },
  { type: 'interact', id: 'crankCage', era: F, x: 278, y: 8, z: 5.3, prompt: 'Caged crank', icon: 'crank', goneFlag: 'crankTaken', hideIf: 'crankTaken', lens: true, lensOnly: true },
  { type: 'interact', id: 'winchB', era: P, x: 275.5, y: 8, z: 1.3, prompt: 'Walled-in winch', lens: true, lensOnly: true },
  { type: 'interact', id: 'leverC', era: F, x: 284.5, y: WELL.pit.floor, z: 3.5, prompt: 'Pit lever', visual: 'lever', gate: 'gateC', color: 0xff9a4a },
  { type: 'interact', id: 'heart', era: M, x: WELL.heart.x, y: 0, z: WELL.heart.z + 0.4, prompt: 'The great wheel' },

  // Lost cogs
  { type: 'cog', id: 'cogP1', era: P, x: 24.5, y: 3.7, z: 1.5 },
  { type: 'cog', id: 'cogM1', era: M, x: 30.5, y: 3.7, z: 1.5 },
  { type: 'cog', id: 'cogF1', era: F, x: 29.5, y: 3.7, z: 2.5 },
  { type: 'cog', id: 'cogP2', era: P, x: 53.5, y: -2.4, z: 1.5 }, // on the harbor floor: dive for it
  { type: 'cog', id: 'cogF2', era: F, x: 49.5, y: -2.3, z: 6.3 }, // on the dry harbor floor, behind the locker
  { type: 'cog', id: 'cogP3', era: P, x: 88.5, y: 4.7, z: 5.5 }, // on Bell Rock, before there was a chapel
  { type: 'cog', id: 'cogM2', era: M, x: 80.5, y: 6.5, z: 2.0 }, // above the quay deck: jump for it
  { type: 'cog', id: 'cogF3', era: F, x: 124.5, y: 4.7, z: 5.5 }, // on top of the sea wall
  { type: 'cog', id: 'cogP4', era: P, x: 150.5, y: 5.7, z: 2.0 }, // on the bare sea stack
  { type: 'cog', id: 'cogM3', era: M, x: 157.5, y: L.galleryY + 0.7, z: 1.5 }, // at the far end of the gallery
  { type: 'cog', id: 'cogM4', era: M, x: 184.6, y: 2.3, z: 3.0 }, // over the end of the jetty: jump for it
  { type: 'cog', id: 'cogW1', era: M, x: 270.5, y: 8.7, z: 0.6 }, // in the Well, on the second terrace

  // Creatures
  { type: 'enemy', kind: 'crab', era: P, x: 60, z: 3.5, range: [57, 63] },
  { type: 'enemy', kind: 'crab', era: P, x: 76, z: 2.5, range: [70, 84] },
  { type: 'enemy', kind: 'crab', era: P, x: 115, z: 4, range: [106, 122] },
  { type: 'enemy', kind: 'crab', era: P, x: 140, z: 3, range: [136, 146] },
  { type: 'enemy', kind: 'crab', era: P, x: 205, z: 3, range: [200, 212] },
  { type: 'enemy', kind: 'rat', era: M, x: 61, z: 4, range: [57, 63] },
  { type: 'enemy', kind: 'rat', era: M, x: 108, z: 2, range: [106, 118] },
  { type: 'enemy', kind: 'rat', era: M, x: 116, z: 5, range: [108, 119] },
  { type: 'enemy', kind: 'rat', era: M, x: 194, z: 3, range: [192, 197] },
  { type: 'enemy', kind: 'drone', era: F, x: 46, y: -3, z: 3, range: [44, 53], hideIf: 'tideRestored' },
  { type: 'enemy', kind: 'drone', era: F, x: 52, y: -3, z: 4.5, range: [45, 54], hideIf: 'tideRestored' },
  { type: 'enemy', kind: 'drone', era: F, x: 78, z: 3, range: [70, 84] },
  { type: 'enemy', kind: 'drone', era: F, x: 138, z: 3, range: [135, 146] },
  { type: 'enemy', kind: 'drone', era: F, x: 164, z: 4, range: [156, 167] },
  { type: 'enemy', kind: 'drone', era: F, x: 195, z: 3, range: [195, 199] },
  // (once the tide is home, the Warden has nothing left to guard, and stands down)
  { type: 'warden', era: F, path: WARDEN_PATH, until: 'tideRestored' },
  { type: 'searchlight', era: F, x: 208.5, z: 3.5, a: [208.5, 0.9], b: [208.5, 6.1], period: 5, until: 'tideRestored' },
];

// ---------------------------------------------------------------------------
export const COG_TOTAL = new Set(SPAWNS.filter((s) => s.type === 'cog').map((s) => s.id)).size;

export function buildLevel(world, state) {
  world.__state = state;
  HEALED = !!state.flags.tideRestored;
  buildGround(world);
  backdrop(world);
  shoreEnd(world);
  quay(world);
  mudflats(world);
  longPier(world);
  saltings(world);
  keepersLight(world);
  dryLock(world);
  wharf(world);
  gullsHead(world);
  tideWell(world);
  world.finalizeStatic();
  world.refreshFeatures(state);
}
