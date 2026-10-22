// Chapter Three's view from the top of the world (see L.vistas). Far below, through an opening in
// the sea of clouds: the peninsula where Hollowmere and Saltwick stand, built as voxels in
// miniature (a block to every two units) in the same pixel tiles as the mountain; the sea round it,
// foaming on its shores; and far off on the horizon, ranges painted in pixel art and hazed by the
// distance, under open sky. In the First Age there is only forest and sea; in the Stopped Age, frost.
import * as THREE from 'three';
import { hash3 } from '../../core/util.js';
import { tagPalettes, getVoxelMaterial } from '../../render/materials.js';
import { meshVoxels, meshBox, GeoBuilder } from '../../render/mesher.js';
import { fbm, ridged } from '../../render/mountains.js';
import { waterUniforms } from '../../render/water.js';
import theme from './theme.js';

const P = 0, M = 1, F = 2;
const S = 2; // world units to a block
const GX = -110, GZ = -540, GY = -36; // the grid's corner
const NX = 205, NZ = 170, NY = 22;
const SEA = 3; // the water's surface is a little above the third block
const SEA_Y = GY + (SEA + 0.35) * S;
/** The miniature's extent in world units (the mountain's terrain leaves it alone). */
export const LOWLAND = { x0: GX, x1: GX + NX * S, z0: GZ, z1: GZ + NZ * S };
const HM = { x: -6, z: -332 }, SW = { x: 168, z: -428 };

const T = tagPalettes({
  grassM: [0x6f9e3c], plaster: [0xe8dcc0], timber: [0x5a3820], roof: [0xa8502f], roofB: [0x4a5a6a],
  thatch: [0xc8a860], stone: [0x8f8a80], cobble: [0x8a8378], sand: [0xe0cc98], whitewash: [0xf0eee6], roofSea: [0x3d6f88],
  seaRock: [0x5a6470], wood: [0x7a5232], hull: [0x7a4a2a], snow: [0xeef4fa], dirt: [0x6a4a30],
  // (plain colors: the fields, frosted trees, the lighthouse's bands)
  wheat: [0xd8b850], green: [0x7aa040], pale: [0xa8c050], plowed: [0x8a6a42], frostLeaf: [0xc8d4e4], frostRoad: [0xb8c4d8], red: [0xc83a2a],
  // (grass and trees in plain colors: at this distance a tile's flowers and leaves are only noise)
  meadow: [0x5f9236, 0x689c3a, 0x578a30], canopy: [0x2c5a2c, 0x346634, 0x27502a],
});
const one = (k) => T[k][0];
const some = (k, i, j) => T[k][Math.floor(hash3(i, j, 21) * T[k].length)];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Distance from (x, z) to a polyline. */
function lineDist(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}
const RIVER = [[-14, -200], [-22, -245], [-10, -290], [-6, -324], [-20, -348], [-52, -362], [-100, -374]];
const ROAD = [[HM.x, HM.z], [50, -356], [112, -392], [SW.x, SW.z]];

/** How far inland (world units; below zero, out to sea): the mainland along the mountains' feet, the peninsula reaching out north-east, two islets. */
function inland(x, z) {
  const n = fbm(x * 0.012 + 4, z * 0.012, 3) * 22 + fbm(x * 0.05, z * 0.05, 2) * 5;
  const main = z + 252 + n;
  const dx = 215, dz = -170, t = clamp(((x + 30) * dx + (z + 270) * dz) / (dx * dx + dz * dz), 0, 1);
  const pen = 98 - 56 * t + n - Math.hypot(x + 30 - t * dx, z + 270 - t * dz);
  const isle = Math.max(16 - Math.hypot(x - 252, z + 352) + n * 0.4, 11 - Math.hypot(x - 70, z + 482) + n * 0.3);
  return Math.max(main, pen, isle);
}

// ---------------------------------------------------------------------------- the ground
/** Each column: its height in blocks, and what's on top. */
function survey() {
  const h = new Uint8Array(NX * NZ), kind = new Uint8Array(NX * NZ); // kind: 0 sea, 1 land, 2 beach, 3 river, 4 field, 5 road, 6 town
  const field = new Uint32Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S, c = i + j * NX;
      const l = inland(x, z);
      if (l <= 0) {
        h[c] = SEA - 1;
        continue;
      }
      const dh = Math.hypot(x - HM.x, z - HM.z), ds = Math.hypot(x - SW.x, z - SW.z);
      let y = SEA + 1 + Math.round(Math.max(0, fbm(x * 0.018 + 9, z * 0.018, 3) * 4 + (l - 25) * 0.025) + Math.max(0, (z + 255) * 0.13));
      // the towns stand on level ground
      y = Math.round(y + (SEA + 1 + (dh < 40 ? 1 : 0) - y) * (1 - Math.min(smooth(30, 46, dh), smooth(18, 30, ds))));
      h[c] = Math.min(NY - 6, y);
      kind[c] = l < 5 ? 2 : 1;
      if (lineDist(x, z, RIVER) < 3.2) {
        h[c] = SEA;
        kind[c] = 3;
        continue;
      }
      if (lineDist(x, z, ROAD) < 1.7 && dh > 8) kind[c] = 5;
      else if (dh < 27 || ds < 17) kind[c] = 6;
      else if (dh > 30 && dh < 84 && l > 8 && kind[c] === 1) {
        // a patchwork of fields, on a skew to the grid
        const u = Math.floor((x * 0.86 + z * 0.5) / 9), v = Math.floor((z * 0.86 - x * 0.5) / 7);
        if (hash3(u, v, 3) < 0.8) {
          kind[c] = 4;
          field[c] = (u * 73856093) ^ (v * 19349663);
        }
      }
    }
  return { h, kind, field };
}

/** The miniature, in one age: a grid of tagged colors, plus deco boxes and glowing bits. */
function build(era, sv) {
  const grid = new Uint32Array(NX * NY * NZ);
  const idx = (i, k, j) => i + NX * (k + NY * j);
  const inside = (i, k, j) => i >= 0 && k >= 0 && j >= 0 && i < NX && k < NY && j < NZ;
  const set = (i, k, j, c) => inside(i, k, j) && (grid[idx(i, k, j)] = c);
  const get = (i, k, j) => (inside(i, k, j) ? grid[idx(i, k, j)] : 0);
  const boxes = [], glows = [];
  const cell = (x, z) => [Math.floor((x - GX) / S), Math.floor((z - GZ) / S)];
  const { h, kind, field } = sv;
  const frost = era === F, first = era === P;
  const top = (i, j) => h[i + j * NX];

  // the land, and what grows on it
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const c = i + j * NX, y = h[c], k = kind[c];
      if (y <= SEA - 1 || k === 3) continue;
      let mat = frost ? one('snow') : k === 2 ? one('sand') : some('meadow', i, j);
      if (!first && !frost) {
        if (k === 4) mat = one(['wheat', 'green', 'pale', 'plowed', 'green'][field[c] % 5 >>> 0]);
        else if (k === 5 || k === 6) mat = one('cobble');
      } else if (frost && k === 5) mat = one('frostRoad');
      for (let yy = SEA - 1; yy < y; yy++) set(i, yy, j, yy === y - 1 ? mat : k === 2 ? one('sand') : frost && yy >= y - 1 ? mat : one('dirt'));
      // trees: forest on the hills, hedgerows between the fields; in the First Age, forest everywhere
      const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S;
      const dense = fbm(x * 0.02 + 30, z * 0.02, 3) + (first ? 0.45 : 0) + Math.max(0, (z + 250) * 0.01);
      let tree = false;
      if (k === 1) tree = dense > 0.12 && hash3(i, j, 7) < 0.62;
      else if (k === 4 && !first) {
        const edge = [[1, 0], [0, 1]].some(([a, b]) => kind[c + a + b * NX] === 4 && field[c + a + b * NX] !== field[c]);
        tree = edge && hash3(i, j, 8) < 0.55;
      } else if (first && (k === 6 || k === 4 || k === 5)) tree = hash3(i, j, 9) < 0.5 && Math.hypot(x - HM.x, z - HM.z) > 9;
      if (tree) {
        const leaf = frost ? one('frostLeaf') : some('canopy', i, j);
        set(i, y, j, leaf);
        if (hash3(i, j, 10) < 0.35) set(i, y + 1, j, leaf);
      }
    }
  // bridges over the river, in the towns' reach
  if (!first)
    for (let j = 0; j < NZ; j++)
      for (let i = 0; i < NX; i++) {
        const c = i + j * NX;
        if (kind[c] !== 3) continue;
        const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S;
        if (Math.hypot(x - HM.x, z - HM.z) < 30 && (j % 7 === 0 || lineDist(x, z, ROAD) < 1.7)) set(i, SEA, j, one('wood'));
      }

  // a house: walls a block or two high, a roof on top (sometimes a ridge above that), a lit window toward us
  const house = (i, j, wall, roof, lit, tall = 0.35) => {
    const y = Math.max(top(i, j), top(i + 1, j), top(i, j + 1), top(i + 1, j + 1));
    if ([0, 1].some((a) => [0, 1].some((b) => kind[i + a + (j + b) * NX] === 3 || top(i + a, j + b) < SEA + 1))) return;
    const wh = hash3(i, j, 11) < tall ? 2 : 1;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      for (let yy = top(i + a, j + b); yy < y + wh; yy++) set(i + a, yy, j + b, wall);
      set(i + a, y + wh, j + b, frost ? one('snow') : roof);
    }
    if (hash3(i, j, 12) < 0.4) for (let a = 0; a < 2; a++) set(i + a, y + wh + 1, j + (hash3(i, j, 13) < 0.5 ? 0 : 1), frost ? one('snow') : roof);
    if (lit && hash3(i, j, 14) < 0.65) glows.push({ c: 'window', x: i + 0.5 + (hash3(i, j, 15) < 0.5 ? 0 : 1), y: y + 0.45, z: j + 2.02, sx: 0.4, sy: 0.35, sz: 0.04 });
  };
  /** Lots for houses, on a lattice round a center, out to a radius (world units). */
  const lots = (cx, cz, r0, r1, fn) => {
    const [ci, cj] = cell(cx, cz), R = Math.ceil(r1 / S);
    for (let b = -R; b <= R; b += 3)
      for (let a = -R; a <= R; a += 3) {
        const d = Math.hypot(a, b) * S;
        if (d < r0 || d > r1) continue;
        const i = ci + a, j = cj + b;
        if (i < 1 || j < 1 || i > NX - 3 || j > NZ - 3) continue;
        if (kind[i + j * NX] === 5 || kind[i + 1 + (j + 1) * NX] === 5) continue;
        fn(i, j);
      }
  };

  if (!first) {
    // ---- Hollowmere: a ring of roofs round the square, a wall round them, and the Clocktower with its lit faces
    lots(HM.x, HM.z, 8, 26, (i, j) => hash3(i, j, 16) < 0.86 && house(i, j, hash3(i, j, 17) < 0.6 ? one('plaster') : one('timber'), [one('roof'), one('roof'), one('roofB'), one('thatch')][Math.floor(hash3(i, j, 18) * 4)], !frost));
    const [ci, cj] = cell(HM.x, HM.z), ty = top(ci, cj);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      for (let yy = top(ci + a, cj + b); yy < ty + 9; yy++) set(ci + a, yy, cj + b, one('stone'));
      set(ci + a, ty + 9, cj + b, frost ? one('snow') : one('roofB'));
    }
    for (const yy of [ty + 10, ty + 11]) set(ci, yy, cj, frost ? one('snow') : one('roofB'));
    boxes.push([ci + 0.5, ty + 12.6, cj + 0.5, 0.12, 1.2, 0.12, one('stone')]); // (its weathervane)
    for (const [dx, dz, sx, sz] of [[0, 1.52, 1.6, 0.04], [0, -1.52, 1.6, 0.04], [1.52, 0, 0.04, 1.6], [-1.52, 0, 0.04, 1.6]])
      glows.push({ c: frost ? 'cold' : 'clock', x: ci + 0.5 + dx, y: ty + 7.4, z: cj + 0.5 + dz, sx, sy: 1.6, sz });
    // the town wall, with gaps where the road and the river go through
    const R = 30;
    for (let j = cj - 17; j <= cj + 17; j++)
      for (let i = ci - 17; i <= ci + 17; i++) {
        const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S, d = Math.hypot(x - HM.x, z - HM.z);
        if (Math.abs(d - R) > 1 || kind[i + j * NX] === 3 || lineDist(x, z, ROAD) < 3 || lineDist(x, z, RIVER) < 5) continue;
        const tall = hash3(i, j, 19) < 0.18;
        set(i, top(i, j), j, frost && !tall ? one('snow') : one('stone'));
        if (tall) set(i, top(i, j) + 1, j, frost ? one('snow') : one('stone'));
      }

    // ---- Saltwick: white houses with blue roofs on the headland, the harbor, its boats, and Keeper's Light
    lots(SW.x, SW.z, 0, 18, (i, j) => hash3(i, j, 20) < 0.9 && house(i, j, one('whitewash'), one('roofSea'), !frost, 0.75));
  } else {
    // the First Age: a ring of standing stones where Hollowmere will be, and fires in the forest
    const [ci, cj] = cell(HM.x, HM.z);
    for (let a = 0; a < 8; a++) {
      const i = ci + Math.round(Math.cos((a / 8) * Math.PI * 2) * 4), j = cj + Math.round(Math.sin((a / 8) * Math.PI * 2) * 4);
      for (let yy = 0; yy < 2; yy++) set(i, top(i, j) + yy, j, one('stone'));
    }
    for (const [x, z] of [[HM.x, HM.z], [HM.x + 30, HM.z - 18], [SW.x - 10, SW.z + 8], [HM.x - 26, HM.z + 22]]) {
      const [i, j] = cell(x, z);
      glows.push({ c: 'fire', x: i + 0.5, y: top(i, j) + 0.3, z: j + 0.5, sx: 0.5, sy: 0.6, sz: 0.5 });
    }
  }

  // the harbor: on the shore that faces us, a breakwater out into the sea, and boats inside it
  const shore = [];
  for (let j = 1; j < NZ - 1; j++)
    for (let i = 1; i < NX - 1; i++) {
      const c = i + j * NX;
      if (top(i, j) > SEA - 1) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => top(i + a, j + b) > SEA && kind[c + a + b * NX] !== 3)) continue;
      const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S;
      if (Math.hypot(x - SW.x, z - SW.z) < 40 && z > SW.z) shore.push([i, j, Math.hypot(x - SW.x - 26, z - SW.z - 22)]);
    }
  shore.sort((a, b) => a[2] - b[2]);
  if (shore.length) {
    const [hi, hj] = shore[0];
    if (!first) {
      const wall = [];
      for (let s = 0; s < 9; s++) wall.push([hi + s, hj + Math.round(s * 0.5)]);
      for (let s = 1; s < 6; s++) wall.push([hi + 8 - s, hj + 4 + s]);
      for (const [i, j] of wall) if (top(i, j) <= SEA) set(i, SEA, j, one('stone'));
      if (!frost) glows.push({ c: 'window', x: hi + 3.5, y: SEA + 1.2, z: hj + 9.5, sx: 0.3, sy: 0.3, sz: 0.3 }); // (the harbor lamp)
    }
    // boats (in the First Age, a few fishing canoes)
    for (let n = 0; n < (first ? 3 : 6); n++) {
      const i = hi + 1 + ((n * 3) % 7), j = hj + 2 + ((n * 5) % 5);
      if (top(i, j) > SEA - 1 || get(i, SEA, j)) continue;
      set(i, SEA, j, one('hull'));
      if (!first) {
        set(i + 1, SEA, j, one('hull'));
        boxes.push([i + 1, SEA + 1.8, j + 0.5, 0.1, 1.6, 0.1, one('wood')]);
        if (!frost) boxes.push([i + 1.35, SEA + 1.9, j + 0.5, 0.6, 1.1, 0.06, one(n % 2 ? 'whitewash' : 'red')]);
      }
    }
  }

  // Keeper's Light (in the First Age, the Tooth, and the Dawn Bell's mast): on the headland's tip
  let tip = null, best = -Infinity;
  for (let j = 1; j < NZ - 1; j++)
    for (let i = 1; i < NX - 1; i++) {
      const x = GX + (i + 0.5) * S, z = GZ + (j + 0.5) * S;
      if (top(i, j) <= SEA || Math.hypot(x - SW.x, z - SW.z) > 60) continue;
      const along = (x - SW.x) * 0.78 - (z - SW.z) * 0.62;
      if (along > best) [best, tip] = [along, [i, j]];
    }
  let lamp = null;
  if (tip) {
    const [i, j] = [tip[0] - 2, tip[1] + 1], y = Math.max(top(i, j), top(i + 1, j), top(i, j + 1), top(i + 1, j + 1));
    if (!first) {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        for (let yy = top(i + a, j + b); yy < y + 7; yy++) set(i + a, yy, j + b, yy === y + 2 || yy === y + 5 ? (frost ? one('frostRoad') : one('red')) : one('whitewash'));
        set(i + a, y + 8, j + b, frost ? one('snow') : one('red'));
      }
      lamp = { x: i + 1, y: y + 7.5, z: j + 1 };
      glows.push({ c: frost ? 'cold' : 'lamp', x: lamp.x, y: lamp.y, z: lamp.z, sx: 1.7, sy: 0.9, sz: 1.7 });
    } else {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let yy = top(i + a, j + b); yy < y + 4 + (a + b === 1 ? 1 : a ? 2 : 0); yy++) set(i + a, yy, j + b, one('seaRock'));
      boxes.push([i - 1.5, y + 2.2, j + 1, 0.16, 4.4, 0.16, one('wood')]);
    }
  }
  return { get, boxes, glows, lamp };
}

// ---------------------------------------------------------------------------- the sea
const seaVert = `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vW;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const seaFrag = `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D uShore; uniform vec4 uRect; uniform float uTime; uniform float uFrozen;
  uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uSunCol; uniform vec3 uSunSky;
  varying vec3 vW;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  void main(){
    vec2 px = floor(vW.xz * 1.5) / 1.5; // pixels two-thirds of a unit across: the scale of the blocks' tiles
    vec2 uv = (px - uRect.xy) / uRect.zw;
    float d = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 1.0 : texture2D(uShore, uv).r;
    vec3 col = mix(uShallow, uDeep, smoothstep(0.05, 0.55, d));
    float t = uTime * (1.0 - uFrozen);
    // long swells catching the light, in bands, and a scatter of whitecaps out where it's deep
    float sw = sin(px.x * 0.21 + px.y * 0.35 + t * 0.9 + sin(px.y * 0.13 + t * 0.3) * 2.0);
    col *= 0.94 + 0.08 * step(0.6, sw) + 0.04 * step(0.92, sw);
    col = mix(col, uFoam, step(0.996, h21(floor(px * 0.5) + floor(t * 0.7))) * step(0.5, d) * 0.6 * (1.0 - uFrozen));
    // the foam where it meets the land, breathing in and out
    float wash = 0.06 + 0.07 * step(0.5, sin(t * 1.4 + (px.x + px.y) * 0.08));
    col = mix(col, uFoam, step(0.001, d) * step(d, wash) * mix(0.9, 0.5, uFrozen));
    // the sun's road across the water, glittering
    vec3 v = normalize(vW - cameraPosition), r = reflect(v, vec3(0.0, 1.0, 0.0));
    float g = pow(max(dot(r, normalize(uSunSky)), 0.0), 24.0);
    col += uSunCol * g * step(0.45, h21(px + floor(t * 4.0))) * 1.6 * (1.0 - uFrozen);
    // frozen: cracks across the ice
    col *= 1.0 - uFrozen * 0.18 * step(0.94, h21(floor(px / 3.0))) ;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;
const SEA_COLORS = [
  { deep: 0x0a1c3a, shallow: 0x1c4468, foam: 0x9ab8e0, frozen: 0 },
  { deep: 0x1d5684, shallow: 0x3a9ab4, foam: 0xfff4e4, frozen: 0 },
  { deep: 0x4a6a9c, shallow: 0x7a9cc8, foam: 0xe8f0ff, frozen: 1 },
];
let shoreTex = null;
function sea(era, sv) {
  if (!shoreTex) {
    // how far each cell is from land (in cells, up to 12), for the shallows and the foam
    const dist = new Uint8Array(NX * NZ).fill(255), q = [];
    for (let c = 0; c < NX * NZ; c++) if (sv.h[c] > SEA && sv.kind[c] !== 3) (dist[c] = 0), q.push(c);
    for (let n = 0; n < q.length; n++) {
      const c = q[n], i = c % NX, j = (c / NX) | 0;
      if (dist[c] >= 12) continue;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + a, jj = j + b, cc = ii + jj * NX;
        if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ || dist[cc] <= dist[c] + 1) continue;
        dist[cc] = dist[c] + 1;
        q.push(cc);
      }
    }
    const data = new Uint8Array(NX * NZ * 4);
    for (let c = 0; c < NX * NZ; c++) data[c * 4] = Math.round((Math.min(12, dist[c]) / 12) * 255);
    shoreTex = new THREE.DataTexture(data, NX, NZ);
    shoreTex.magFilter = shoreTex.minFilter = THREE.NearestFilter;
    shoreTex.needsUpdate = true;
  }
  const pal = SEA_COLORS[era], a = theme.atmos[era];
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uShore: { value: null }, uRect: { value: new THREE.Vector4(GX, GZ, NX * S, NZ * S) }, uFrozen: { value: pal.frozen },
        uDeep: { value: new THREE.Color(pal.deep) }, uShallow: { value: new THREE.Color(pal.shallow) }, uFoam: { value: new THREE.Color(pal.foam) },
        uSunCol: { value: new THREE.Color(a.sun) }, uSunSky: { value: new THREE.Vector3(...(a.sunSky || a.sunDir)).normalize() },
      },
    ]),
    vertexShader: seaVert,
    fragmentShader: seaFrag,
    fog: true,
  });
  mat.uniforms.uShore.value = shoreTex;
  mat.uniforms.uTime = waterUniforms.uTime;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(800, 640).rotateX(-Math.PI / 2), mat);
  m.position.set(90, SEA_Y, -430);
  return m;
}

// ---------------------------------------------------------------------------- the far ranges
/**
 * Ranges on the horizon all across the north, painted as pixel art: three of them, the farthest
 * palest. Each is a row of peaks, every one a ridge of rock running down from its summit on a slant,
 * a face on either side of it. Each pixel says which way its face looks (so the light can come from
 * either side), whether snow lies on it, and how much haze is in front of it. Where the sun goes
 * down, the peaks stand lower. (Pure, so it can be looked at outside the game.)
 */
export function rangePixels(W, H, sunAz) {
  const d = new Uint8ClampedArray(W * H * 4);
  const layers = [
    { n: 16, base: 0.3, tall: 0.5, seed: 11, haze: 0.6 },
    { n: 24, base: 0.2, tall: 0.42, seed: 23, haze: 0.38 },
    { n: 34, base: 0.08, tall: 0.32, seed: 37, haze: 0.18 },
  ];
  const r = (a, b, c) => hash3(a, b, c);
  for (const L of layers) {
    const peaks = [];
    for (let k = 0; k < L.n * 1.6; k++) {
      const x = r(k, L.seed, 1) * W, az = (x / W - 0.5) * 200;
      const dip = sunAz === null ? 1 : 1 - 0.7 * Math.exp(-(((az - sunAz) / 16) ** 2));
      const h = (L.base + L.tall * (0.35 + 0.65 * r(k, L.seed, 2) ** 1.5) * dip) * H;
      // how steep each side falls (rows per column), and how the ridge leans as it comes down
      peaks.push({ x, h, sl: 0.45 + r(k, L.seed, 3) * 0.6, sr: 0.45 + r(k, L.seed, 4) * 0.6, lean: (r(k, L.seed, 5) - 0.5) * 0.9, snow: 0.18 + r(k, L.seed, 6) * 0.22 });
    }
    // the tallest first, the lower ones in front of them, so where two meet it's a slanting edge
    peaks.sort((a, b) => b.h - a.h);
    for (const p of peaks) {
      const reach = Math.ceil(p.h / Math.min(p.sl, p.sr)) + 2;
      for (let x = Math.max(0, Math.floor(p.x - reach)); x < Math.min(W, p.x + reach); x++) {
        const dx = x - p.x;
        const top = Math.floor(p.h - Math.abs(dx) * (dx < 0 ? p.sl : p.sr) + (ridged(x * 0.07 + p.x, L.seed, 3) - 0.45) * 4);
        // snow from the summit down to a ragged line, with drips running down below it
        const drip = r(x >> 1, Math.floor(p.x), 8) < 0.2 ? 3 + r(x, Math.floor(p.x), 9) * 7 : 0;
        const snowLine = p.h * (1 - p.snow) + (r(x >> 1, Math.floor(p.x), 7) - 0.5) * 4 - drip;
        for (let y = 0; y < top; y++) {
          const o = ((H - 1 - y) * W + x) * 4;
          const ridge = p.x + (p.h - y) * p.lean + (r(y >> 1, Math.floor(p.x), L.seed) - 0.5) * 2.2;
          const haze = Math.min(1, L.haze + Math.max(0, 1 - y / (H * 0.16)) * 0.6);
          d[o] = Math.round(haze * 255);
          d[o + 1] = x < ridge ? 255 : 0;
          d[o + 2] = y > snowLine ? 255 : 0;
          d[o + 3] = 255;
        }
      }
    }
  }
  return d;
}
function paintRanges(sunAz) {
  const W = 2048, H = 192;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d'), img = c.createImageData(W, H);
  img.data.set(rangePixels(W, H, sunAz));
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
const rangeVert = `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    wp.xz += cameraPosition.xz; // (always the same distance off: they're as good as at the horizon)
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const rangeFrag = `
  uniform sampler2D uMap; uniform vec3 uSnowLit; uniform vec3 uSnowShade; uniform vec3 uRockLit; uniform vec3 uRockShade;
  uniform vec3 fogColor; uniform float uSunX;
  varying vec2 vUv;
  void main(){
    vec4 t = texture2D(uMap, vec2(1.0 - vUv.x, vUv.y));
    if (t.a < 0.5) discard;
    float lit = uSunX < 0.0 ? t.g : 1.0 - t.g;
    vec3 col = mix(mix(uRockShade, uRockLit, lit), mix(uSnowShade, uSnowLit, lit), t.b);
    gl_FragColor = vec4(mix(col, fogColor, t.r), 1.0);
  }`;
function farRanges(era, pal) {
  const a = theme.atmos[era], sky = a.sunSky || a.sunDir;
  const sunAz = sky[2] < 0 ? (Math.atan2(sky[0], -sky[2]) * 180) / Math.PI : null;
  const R = 950, HT = 300;
  const geo = new THREE.CylinderGeometry(R, R, HT, 120, 1, true, Math.PI - (100 * Math.PI) / 180, (200 * Math.PI) / 180);
  const col = (h) => new THREE.Color(h);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uMap: { value: null }, uSnowLit: { value: col(pal.snowLit) }, uSnowShade: { value: col(pal.snowShade) }, uRockLit: { value: col(pal.rockLit) }, uRockShade: { value: col(pal.rockShade) }, uSunX: { value: pal.sun[0] } },
    ]),
    vertexShader: rangeVert,
    fragmentShader: rangeFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: true,
  });
  mat.uniforms.uMap.value = paintRanges(sunAz);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = -50 + HT / 2;
  m.renderOrder = -9;
  m.frustumCulled = false;
  return m;
}

// ---------------------------------------------------------------------------- all of it
const GLOW = { window: [0xffc870, 2.6], clock: [0xffe0a0, 2.8], lamp: [0xffe9a0, 3.2], fire: [0xff8a3a, 3.2], cold: [0x8a9ac0, 0.7] };
let surveyed = null;
/** Everything below and beyond the summit, in one age. spinners: where a lighthouse beam goes to be turned. */
export function vista(group, era, colors, spinners) {
  surveyed ||= survey();
  const { get, boxes, glows, lamp } = build(era, surveyed);
  const gb = meshVoxels(get, [0, SEA - 1, 0], [NX, NY, NZ], new GeoBuilder());
  for (const b of boxes) meshBox(gb, b);
  const geo = gb.build();
  const mini = new THREE.Group();
  mini.position.set(GX, GY, GZ);
  mini.scale.setScalar(S);
  if (geo) mini.add(new THREE.Mesh(geo, getVoxelMaterial()));
  // the lit windows, the clock faces, the lamp, the fires
  const unit = new THREE.BoxGeometry(1, 1, 1), mtx = new THREE.Matrix4();
  for (const [name, [hex, k]] of Object.entries(GLOW)) {
    const list = glows.filter((g) => g.c === name);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(unit, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) }), list.length);
    list.forEach((g, n) => im.setMatrixAt(n, mtx.makeScale(g.sx, g.sy, g.sz).setPosition(g.x, g.y, g.z)));
    mini.add(im);
  }
  if (lamp && era === M) {
    // the beam, sweeping round
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 3, 30, 12, 1, true).rotateZ(Math.PI / 2).translate(15, 0, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    const pivot = new THREE.Group();
    pivot.position.set(lamp.x, lamp.y, lamp.z);
    pivot.add(beam);
    mini.add(pivot);
    spinners.push({ obj: pivot, era, axis: 'y', speed: 0.6 });
  }
  group.add(mini, sea(era, surveyed), farRanges(era, colors));
}
