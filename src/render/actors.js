// Characters in 3D: Pixel Relief. Every character is drawn from its sprite sheet's own frames,
// pushed out into cubes, thickest in the middle, so it has depth and takes real light and shadow.
// Every sheet converts by itself, animations and all, and it always faces the camera.
// Actor keeps the old flat sprite actor's interface (mesh, mat, play, update, flip, anim, t).
import * as THREE from 'three';
import { getSheets, SCALE, SPRITE_STRETCH } from './sprites.js';

/** A little light of its own, as the flat sprites had, so faces never go black in shadow. */
function selfLit(mat, amount) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${amount.toFixed(3)};`,
    );
  };
  mat.customProgramCacheKey = () => 'selfLit' + amount;
}

// ---------------------------------------------------------------------------
// Pixel Relief
// ---------------------------------------------------------------------------
const sheetPixels = new WeakMap();
const reliefCache = new WeakMap();
const corner = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();

/** One frame of a sheet as a solid: a column of cube per pixel, half-depth growing with distance from the edge. */
function reliefGeometry(sheet, i, w, h) {
  let bySize = reliefCache.get(sheet);
  if (!bySize) reliefCache.set(sheet, (bySize = new Map()));
  const key = w + 'x' + h;
  let frames = bySize.get(key);
  if (!frames) bySize.set(key, (frames = []));
  if (frames[i]) return frames[i];

  let img = sheetPixels.get(sheet);
  if (!img) sheetPixels.set(sheet, (img = sheet.ctx.getImageData(0, 0, sheet.canvas.width, sheet.canvas.height)));
  const W = sheet.fw * SCALE, H = sheet.fh * SCALE, IW = img.width, data = img.data;
  const ox = (i % sheet.cols) * W, oy = Math.floor(i / sheet.cols) * H;
  const at = (x, y) => ((oy + y) * IW + ox + x) * 4;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[at(x, y) + 3] > 110;

  // chamfer distance to the nearest empty pixel
  const dist = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) dist[y * W + x] = solid(x, y) ? 1e9 : 0;
  const pass = (dir) => {
    const nb = dir > 0 ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]];
    for (let yy = 0; yy < H; yy++) {
      const y = dir > 0 ? yy : H - 1 - yy;
      for (let xx = 0; xx < W; xx++) {
        const x = dir > 0 ? xx : W - 1 - xx;
        if (!solid(x, y)) continue;
        let v = dist[y * W + x];
        for (const [dx, dy, c] of nb) {
          const X = x + dx, Y = y + dy;
          v = Math.min(v, X < 0 || Y < 0 || X >= W || Y >= H ? c : dist[Y * W + X] + c);
        }
        dist[y * W + x] = v;
      }
    }
  };
  pass(1);
  pass(-1);
  const half = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) half[k] = dist[k] > 0 ? Math.round((0.7 + Math.min(dist[k], 4) * 0.45) * 4) / 4 : 0;

  const pw = w / W, ph = (h * SPRITE_STRETCH) / H;
  const pos = [], nor = [], col = [];
  const c = new THREE.Color();
  // a quad from its four corners, wound to face along n
  const quad = (p, n) => {
    e1.subVectors(p[1], p[0]);
    e2.subVectors(p[2], p[0]);
    if (corner.crossVectors(e1, e2).dot(n) < 0) p = [p[0], p[3], p[2], p[1]];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(p[k].x, p[k].y, p[k].z);
      nor.push(n.x, n.y, n.z);
      col.push(c.r, c.g, c.b);
    }
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const N = { px: V(1, 0, 0), nx: V(-1, 0, 0), py: V(0, 1, 0), ny: V(0, -1, 0), pz: V(0, 0, 1), nz: V(0, 0, -1) };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const hp = half[y * W + x];
      if (!hp) continue;
      const d = at(x, y);
      c.setRGB(data[d] / 255, data[d + 1] / 255, data[d + 2] / 255, THREE.SRGBColorSpace);
      const x0 = (x - W / 2) * pw, x1 = x0 + pw, y1 = (H - y) * ph, y0 = y1 - ph, z = hp * pw;
      quad([V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z)], N.pz);
      quad([V(x0, y0, -z), V(x1, y0, -z), V(x1, y1, -z), V(x0, y1, -z)], N.nz);
      // sides, only where they show: past the edge, or where the neighbor is thinner
      for (const [dx, dy, n] of [[1, 0, N.px], [-1, 0, N.nx], [0, -1, N.py], [0, 1, N.ny]]) {
        const X = x + dx, Y = y + dy;
        const nh = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : half[Y * W + X];
        if (nh >= hp) continue;
        const strips = nh ? [[nh * pw, z], [-z, -nh * pw]] : [[-z, z]];
        for (const [za, zb] of strips) {
          if (dx === 1) quad([V(x1, y0, za), V(x1, y0, zb), V(x1, y1, zb), V(x1, y1, za)], n);
          else if (dx === -1) quad([V(x0, y0, za), V(x0, y0, zb), V(x0, y1, zb), V(x0, y1, za)], n);
          else if (dy === -1) quad([V(x0, y1, za), V(x1, y1, za), V(x1, y1, zb), V(x0, y1, zb)], n);
          else quad([V(x0, y0, za), V(x1, y0, za), V(x1, y0, zb), V(x0, y0, zb)], n);
        }
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return (frames[i] = g);
}

class ReliefLook {
  constructor(actor) {
    this.actor = actor;
    const s = actor.sheet;
    // build every frame now, so the first step or swing doesn't stall
    for (let i = 0; i < s.count; i++) reliefGeometry(s, i, actor.w, actor.h);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    selfLit(this.mat, 0.14);
    this.root = new THREE.Mesh(reliefGeometry(s, 0, actor.w, actor.h), this.mat);
    this.root.castShadow = true;
    this.root.renderOrder = 2;
  }
  show(frame) {
    this.root.geometry = reliefGeometry(this.actor.sheet, frame, this.actor.w, this.actor.h);
    this.root.scale.x = this.actor.flip ? -1 : 1;
  }
}

// ---------------------------------------------------------------------------
// The actor
// ---------------------------------------------------------------------------
export class Actor {
  /** name: a sheet in sprites.js. w, h: the size its sprite card would be, in world units. */
  constructor(name, w, h = w) {
    this.name = name;
    this.sheet = getSheets()[name];
    this.w = w;
    this.h = h;
    this.mesh = new THREE.Group();
    // what entities tint and fade (holograms, Echoes)
    this.mat = { color: new THREE.Color(1, 1, 1), emissive: new THREE.Color(0, 0, 0), emissiveIntensity: 1, opacity: 1, transparent: false, depthWrite: true };
    this.anim = null;
    this.t = 0;
    this.flip = false;
    this.done = false;
    this.play(Object.keys(this.sheet.anims)[0]);
    this.look = new ReliefLook(this);
    this.mesh.add(this.look.root);
    this.update(0);
  }
  play(name, restart = false) {
    if (!this.sheet.anims[name]) return;
    if (this.anim === name && !restart) return;
    this.anim = name;
    this.t = 0;
    this.done = false;
  }
  update(dt) {
    const a = this.sheet.anims[this.anim];
    this.t += dt;
    let f = Math.floor(this.t * a.fps);
    if (a.loop) f %= a.frames.length;
    else if (f >= a.frames.length) {
      f = a.frames.length - 1;
      this.done = true;
    }
    this.look.show(a.frames[f]);
    this.applyMat();
  }
  /** Copy the tint, glow and fade onto the material. */
  applyMat() {
    const p = this.mat, m = this.look.mat;
    m.color.copy(p.color);
    m.emissive.copy(p.emissive);
    m.emissiveIntensity = p.emissiveIntensity;
    if (m.transparent !== p.transparent) {
      m.transparent = p.transparent;
      m.needsUpdate = true;
    }
    m.opacity = p.opacity;
    m.depthWrite = p.depthWrite;
  }
}
