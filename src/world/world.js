// Voxel world: per-era collision grids, dynamic overlays, and greedy-meshed textured visuals.
import * as THREE from 'three';
import { hash3 } from '../core/util.js';
import { getVoxelMaterial, surfaceOf, SURFACE_NAMES } from '../render/materials.js';
import { GeoBuilder, meshVoxels, meshBox, meshRoof } from '../render/mesher.js';
import { makeWater, makeWaterfall } from '../render/water.js';
import { buildTufts, buildCanopies } from '../render/foliage.js';

export const T = { AIR: 0, SOLID: 1, WATER: 2, LADDER: 3, HAZARD: 4 };

export const W = 204; // level length (x)
export const YMIN = -5;
export const YMAX = 26;
export const ZMIN = -16;
export const ZMAX = 14;
export const PLAY_Z0 = 0;
export const PLAY_Z1 = 7; // exclusive
const H = YMAX - YMIN;
const D = ZMAX - ZMIN;
const CHUNK = 24;

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const tmpM = new THREE.Matrix4();
const tmpC = new THREE.Color();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

export const glowMat = new THREE.MeshBasicMaterial({ toneMapped: true });
glowMat.color.setScalar(2.6);

const GRASS_SURFACES = new Set(['grassM', 'grassA', 'overgrowth']);

const inRange = (x, y, z) => x >= 0 && x < W && y >= YMIN && y < YMAX && z >= ZMIN && z < ZMAX;
const idx = (x, y, z) => x + W * ((y - YMIN) + H * (z - ZMIN));

/**
 * Builder collects voxels for either the static layer of an era or a feature overlay.
 * All coordinate ranges are inclusive integer cell ranges.
 */
export class Builder {
  constructor(world, era, feature = null) {
    this.world = world;
    this.era = era;
    this.feature = feature; // null => static
    this.decos = [];
    this.glows = [];
    this.waters = [];
    this.hazards = [];
    this.featureCells = []; // [x,y,z,color] visual cells for features
    this.lights = [];
    this.roofs = [];
    this.canopies = [];
    this.falls = [];
    this.streams = [];
  }

  colorAt(pal, x, y, z) {
    if (typeof pal === 'function') return pal(x, y, z);
    if (Array.isArray(pal)) return pal[Math.floor(hash3(x, y, z) * pal.length)];
    return pal;
  }

  setCell(x, y, z, type, color = 0) {
    if (!inRange(x, y, z)) return;
    if (this.feature) {
      const k = idx(x, y, z);
      this.world.overlay[this.era].set(k, type);
      this.feature.keys[this.era].push(k);
      if (type === T.SOLID && color) this.featureCells.push([x, y, z, color]);
    } else {
      const i = idx(x, y, z);
      this.world.grid[this.era][i] = type;
      this.world.color[this.era][i] = type === T.SOLID && color ? (color | 0x1000000) : 0;
    }
  }

  /** Fill solid cells with visual voxels. pal: hex | hex[] | fn(x,y,z) */
  solid(x0, y0, z0, x1, y1, z1, pal) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.setCell(x, y, z, T.SOLID, this.colorAt(pal, x, y, z));
  }

  /** Invisible collision. */
  barrier(x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.setCell(x, y, z, T.SOLID, 0);
  }

  air(x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.setCell(x, y, z, T.AIR);
  }

  ladder(x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.setCell(x, y, z, T.LADDER);
  }

  /** Water region (cells become WATER, rendered as one translucent box). */
  water(x0, y0, z0, x1, y1, z1, color, surfaceDrop = 0.15) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.setCell(x, y, z, T.WATER);
    this.waters.push({ x0, y0, z0, x1: x1 + 1, y1: y1 + 1 - surfaceDrop, z1: z1 + 1, color });
  }

  /** Deadly liquid / current. */
  hazard(x0, y0, z0, x1, y1, z1, color, glow = false, surfaceDrop = 0.3) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.setCell(x, y, z, T.HAZARD);
    (glow ? this.hazards : this.waters).push({ x0, y0, z0, x1: x1 + 1, y1: y1 + 1 - surfaceDrop, z1: z1 + 1, color });
  }

  /** Visual-only box: min corner (x,y,z) and size. */
  deco(x, y, z, sx, sy, sz, color) {
    this.decos.push([x + sx / 2, y + sy / 2, z + sz / 2, sx, sy, sz, color]);
  }

  glow(x, y, z, sx, sy, sz, color) {
    this.glows.push([x + sx / 2, y + sy / 2, z + sz / 2, sx, sy, sz, color]);
  }

  light(x, y, z, color, intensity = 6, distance = 9, flicker = 0) {
    this.lights.push({ x, y, z, color, intensity, distance, flicker });
  }

  /** Visual gabled roof, ridge along x. color: tagged roof colour, gable: end-wall colour. */
  roof(x0, x1, y0, zBack, zFront, ridgeY, color, gable) {
    this.roofs.push({ x0, x1, y0, zBack, zFront, ridgeY, ridgeZ: (zBack + zFront) / 2, color, gable });
  }

  /** Visual waterfall: a falling sheet of water (no collision). */
  waterfall(x0, x1, y0, y1, z0, z1, color = 0x5ab8e8) {
    this.falls.push({ x0, x1, y0, y1, z0, z1, color });
  }

  /** Visual shallow stream / puddle on the ground (no collision, doesn't make the player swim). */
  stream(x0, z0, x1, z1, color = 0x3e9fd0, y = 0) {
    this.streams.push({ x0, x1, z0, z1, y0: y - 0.02, y1: y + 0.07, color });
  }

  /** Leaf-card canopy (visual only). cols: palette. */
  canopy(x, y, z, r, cols, opts = {}) {
    this.canopies.push({ x, y, z, r, cols, ...opts });
  }
}

function makeInstanced(mat, list, group, castShadow = true, receiveShadow = true) {
  if (!list.length) return null;
  const mesh = new THREE.InstancedMesh(boxGeo, mat, list.length);
  for (let i = 0; i < list.length; i++) {
    const [x, y, z, sx, sy, sz, c] = list[i];
    tmpP.set(x, y, z);
    tmpS.set(sx, sy, sz);
    tmpM.compose(tmpP, tmpQ, tmpS);
    mesh.setMatrixAt(i, tmpM);
    tmpC.setHex(c & 0xffffff);
    mesh.setColorAt(i, tmpC);
  }
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function voxelMesh(gb, group) {
  const geo = gb.build();
  if (!geo) return null;
  const mesh = new THREE.Mesh(geo, getVoxelMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/** Glow boxes, water bodies and canopies shared by static and feature builders. */
function addSharedVisuals(world, era, b, group) {
  const meshes = [];
  const add = (m) => {
    if (!m) return;
    group.add(m);
    meshes.push(m);
  };
  meshes.push(makeInstanced(glowMat, b.glows, group, false, false));
  for (const w of b.waters) add(makeWater(w, world.shoreFn(era, w), false));
  for (const w of b.hazards) add(makeWater(w, world.shoreFn(era, w), true));
  for (const w of b.streams) add(makeWater(w, world.shoreFn(era, w), false));
  for (const f of b.falls) add(makeWaterfall(f));
  if (b.canopies.length) add(buildCanopies(b.canopies, era));
  return meshes.filter(Boolean);
}

/** Visuals for a feature builder: its voxels (culled against the static world), decos, roofs, glows... */
function addFeatureVisuals(world, era, b, group) {
  const meshes = [];
  const cells = new Map();
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const [x, y, z, c] of b.featureCells) {
    cells.set(idx(x, y, z), c);
    lo = [Math.min(lo[0], x), Math.min(lo[1], y), Math.min(lo[2], z)];
    hi = [Math.max(hi[0], x + 1), Math.max(hi[1], y + 1), Math.max(hi[2], z + 1)];
  }
  const gb = new GeoBuilder();
  if (cells.size) {
    const get = (x, y, z) => (inRange(x, y, z) ? cells.get(idx(x, y, z)) || 0 : 0);
    const occ = (x, y, z) => get(x, y, z) || world.staticVisible(era, x, y, z);
    meshVoxels(get, lo, hi, gb, occ);
  }
  for (const d of b.decos) meshBox(gb, d);
  for (const r of b.roofs) meshRoof(gb, r);
  const vm = voxelMesh(gb, group);
  if (vm) meshes.push(vm);
  return meshes.concat(addSharedVisuals(world, era, b, group));
}

export class World {
  constructor() {
    this.grid = [0, 1, 2].map(() => new Uint8Array(W * H * D));
    this.color = [0, 1, 2].map(() => new Uint32Array(W * H * D));
    this.overlay = [new Map(), new Map(), new Map()]; // feature-controlled cells
    this.dynamic = [new Map(), new Map(), new Map()]; // entity-controlled cells (pushables)
    this.groups = [0, 1, 2].map(() => new THREE.Group());
    this.lights = [[], [], []];
    this.features = [];
    this.staticBuilders = [null, null, null];
  }

  /** Visible static voxel colour (tagged) or 0. */
  staticVisible(era, x, y, z) {
    if (!inRange(x, y, z)) return 0;
    const i = idx(x, y, z);
    return this.grid[era][i] === T.SOLID ? this.color[era][i] : 0;
  }

  /** Shore test for a water body: solid ground at the water's surface layer. */
  shoreFn(era, w) {
    const ys = Math.floor(w.y1 - 0.01);
    return (x, z) => this.raw(era, x, ys, z) === T.SOLID || this.raw(era, x, ys + 1, z) === T.SOLID;
  }

  staticBuilder(era) {
    if (!this.staticBuilders[era]) this.staticBuilders[era] = new Builder(this, era);
    return this.staticBuilders[era];
  }

  /** Raw cell lookup (no play-area clamping). */
  raw(era, x, y, z) {
    if (!inRange(x, y, z)) return T.AIR;
    const k = idx(x, y, z);
    const d = this.dynamic[era];
    if (d.size && d.has(k)) return d.get(k);
    const o = this.overlay[era];
    if (o.size && o.has(k)) return o.get(k);
    return this.grid[era][k];
  }

  /** Collision lookup: outside the playable strip counts as solid walls. */
  cell(era, x, y, z) {
    if (x < 0 || x >= W || z < PLAY_Z0 || z >= PLAY_Z1) return T.SOLID;
    if (y >= YMAX) return T.AIR;
    return this.raw(era, x, y, z);
  }

  solidAt(era, x, y, z) {
    return this.cell(era, Math.floor(x), Math.floor(y), Math.floor(z)) === T.SOLID;
  }

  /** True if AABB (min/max) overlaps any solid cell in era. */
  boxHits(era, x0, y0, z0, x1, y1, z1, type = T.SOLID) {
    const ex = 1e-4;
    for (let x = Math.floor(x0 + ex); x <= Math.floor(x1 - ex); x++)
      for (let y = Math.floor(y0 + ex); y <= Math.floor(y1 - ex); y++)
        for (let z = Math.floor(z0 + ex); z <= Math.floor(z1 - ex); z++) if (this.cell(era, x, y, z) === type) return true;
    return false;
  }

  setDyn(era, x, y, z, type) {
    this.dynamic[era].set(idx(x, y, z), type);
  }
  clearDyn(era, x, y, z) {
    this.dynamic[era].delete(idx(x, y, z));
  }

  /** Register a time-conditional feature. key(state) -> string; build(b, era, state). */
  addFeature(def) {
    const f = { ...def, keys: [[], [], []], meshes: [[], [], []], lastKey: [null, null, null], lights: [[], [], []] };
    this.features.push(f);
    return f;
  }

  refreshFeatures(state) {
    let changed = false;
    for (const f of this.features) {
      for (const era of f.eras) {
        const key = f.key(state, era);
        if (key === f.lastKey[era]) continue;
        changed = true;
        f.lastKey[era] = key;
        // clear old
        for (const k of f.keys[era]) this.overlay[era].delete(k);
        f.keys[era] = [];
        for (const m of f.meshes[era]) {
          this.groups[era].remove(m);
          if (m.userData.dispose) m.userData.dispose();
          else if (m.isInstancedMesh) m.dispose();
          else m.geometry.dispose();
        }
        // remove old lights
        this.lights[era] = this.lights[era].filter((l) => !f.lights[era].includes(l));
        const b = new Builder(this, era, f);
        f.build(b, era, state);
        f.meshes[era] = addFeatureVisuals(this, era, b, this.groups[era]);
        f.lights[era] = b.lights;
        this.lights[era].push(...b.lights);
      }
    }
    return changed;
  }

  /** Mesh the static layer: chunked greedy voxels + decos + roofs, then water, glows and foliage. */
  finalizeStatic() {
    for (let era = 0; era < 3; era++) {
      const b = this.staticBuilder(era);
      const group = this.groups[era];
      const get = (x, y, z) => this.staticVisible(era, x, y, z);
      for (let cx = 0; cx < W; cx += CHUNK) {
        const x1 = Math.min(W, cx + CHUNK);
        const gb = meshVoxels(get, [cx, YMIN, ZMIN], [x1, YMAX, ZMAX]);
        for (const d of b.decos) if (d[0] >= cx && d[0] < x1) meshBox(gb, d);
        for (const r of b.roofs) if (r.x0 >= cx && r.x0 < x1) meshRoof(gb, r);
        voxelMesh(gb, group);
      }
      addSharedVisuals(this, era, b, group);
      const tufts = buildTufts(this.grassTops(era), era);
      if (tufts) group.add(tufts);
      this.lights[era].push(...b.lights);
    }
  }

  /** Exposed tops of grassy voxels, for tuft scattering. */
  grassTops(era) {
    const tops = [];
    const g = this.grid[era], col = this.color[era];
    for (let z = ZMIN; z < ZMAX; z++)
      for (let y = YMIN; y < YMAX - 1; y++)
        for (let x = 0; x < W; x++) {
          const i = idx(x, y, z);
          if (g[i] !== T.SOLID || !col[i]) continue;
          const surface = SURFACE_NAMES[surfaceOf(col[i])];
          if (!GRASS_SURFACES.has(surface)) continue;
          if (g[idx(x, y + 1, z)] !== T.AIR) continue;
          let roofed = false; // no grass growing indoors (forges, archways)
          for (let yy = y + 2; yy < Math.min(YMAX, y + 8) && !roofed; yy++) roofed = g[idx(x, yy, z)] === T.SOLID;
          if (roofed) continue;
          if (hash3(x, z, y + era) < 0.08) continue; // leave a few bare patches
          tops.push({ x, y, z, surface });
        }
    return tops;
  }
}
