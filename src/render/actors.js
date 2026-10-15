// Characters in 3D. Every character is drawn one of two ways, the player's choice (pause menu):
//   Pixel Relief: the sprite sheet's own frames, pushed out into cubes, thickest in the middle.
//                 Every sheet converts by itself, animations and all. It always faces the camera.
//   Storybook:    a small toon-shaded model with an ink outline, built from the same palette
//                 (CHAR in sprites.js for people; by hand below for creatures and machines), posed
//                 by code, and turned to face the way it's going.
// Actor keeps the old sprite actor's interface (mesh, mat, play, update, flip, anim, t), so entities
// don't need to know which look is showing. Changing the look rebuilds every actor on its next update.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getSheets, charFor, SCALE, SPRITE_STRETCH } from './sprites.js';

// ---------------------------------------------------------------------------
// The setting
// ---------------------------------------------------------------------------
const KEY = 'chronoheart-look';
export const LOOKS = ['relief', 'toon'];
export const LOOK_NAMES = { relief: 'Pixel Relief', toon: 'Storybook' };
let look = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return LOOKS.includes(v) ? v : 'relief';
  } catch {
    return 'relief';
  }
})();
let lookVersion = 0;
export const getLook = () => look;
export function setLook(v) {
  if (!LOOKS.includes(v) || v === look) return;
  look = v;
  lookVersion++;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* the choice just won't be remembered */
  }
}

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
    this.surfaces = [this.mat];
    this.extras = [];
  }
  show(frame) {
    this.root.geometry = reliefGeometry(this.actor.sheet, frame, this.actor.w, this.actor.h);
    this.root.scale.x = this.actor.flip ? -1 : 1;
  }
  dispose() {
    this.mat.dispose();
  }
}

// ---------------------------------------------------------------------------
// Storybook: models are built from parts hung on bones, then each bone's parts are merged into a
// few meshes (lit body, ink outline, glowing bits), once per character, and cloned per actor.
// ---------------------------------------------------------------------------
const INK = '#1c1222';
const OUTLINE = 0.045; // world units: about a pixel and a half at the game camera
const FACE_YAW = Math.PI / 2 - 0.55; // turned toward the way it's going, and a little toward the camera
const RAMP = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const SEG = 18;
const cyl = (rt, rb, h, open = false, t0 = 0, tl = Math.PI * 2, s = SEG) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, t0, tl);
const sph = (r, s = SEG) => new THREE.SphereGeometry(r, s, Math.max(6, Math.round(s * 0.7)));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
const torus = (r, t, arc = Math.PI * 2, s = 24) => new THREE.TorusGeometry(r, t, 8, s, arc);
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

class Kit {
  constructor() {
    this.root = new THREE.Group();
    this.P = {};
  }
  /** A joint the animation can move. */
  bone(name, parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    g.userData.bone = true;
    (parent ? this.P[parent] : this.root).add(g);
    return (this.P[name] = g);
  }
  /** A fixed frame inside a bone (a head's center, say), for placing parts. */
  frame(parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(...pos);
    (typeof parent === 'string' ? this.P[parent] : parent).add(g);
    return g;
  }
  /** o: pos, rot, scale, glow (unlit, bright), thin (no outline), out (face along this direction), up (point +y along it) */
  part(parent, geo, color, o = {}) {
    const m = new THREE.Mesh(geo);
    if (o.pos) m.position.set(...o.pos);
    if (o.rot) m.rotation.set(...o.rot);
    if (o.out) m.quaternion.setFromUnitVectors(FWD, new THREE.Vector3(...o.out).normalize());
    if (o.up) m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...o.up).normalize());
    if (o.spin) m.rotateZ(o.spin);
    if (o.scale) m.scale.set(...o.scale);
    m.userData = { color, glow: !!o.glow, outline: !o.glow && !o.thin };
    (typeof parent === 'string' ? this.P[parent] : parent).add(m);
    return m;
  }
}

/** Merge each bone's parts into a body mesh, an outline mesh and a glow mesh. */
function bake(root) {
  root.updateMatrixWorld(true);
  const bones = [];
  root.traverse((o) => o.userData.bone && bones.push(o));
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  for (const b of bones) {
    const lists = { body: [], glow: [], outline: [] };
    inv.copy(b.matrixWorld).invert();
    const loose = b.children.filter((c) => !c.userData.bone);
    for (const top of loose)
      top.traverse((m) => {
        if (!m.isMesh) return;
        let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        g.applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
        const c = new THREE.Color(m.userData.color);
        if (m.userData.glow) c.multiplyScalar(1.6);
        const n = g.attributes.position.count, arr = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) arr.set([c.r, c.g, c.b], k * 3);
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        lists[m.userData.glow ? 'glow' : 'body'].push(g);
        if (m.userData.outline) lists.outline.push(g);
      });
    for (const top of loose) b.remove(top);
    b.userData.rest = b.position.toArray();
    for (const kind of ['body', 'outline', 'glow']) {
      if (!lists[kind].length) continue;
      let g = mergeGeometries(lists[kind]);
      if (kind === 'outline') {
        // one smooth normal per corner, so the ink hull has no gaps where faces meet
        g = g.clone();
        g.deleteAttribute('normal');
        g.deleteAttribute('color');
        g = mergeVertices(g, 1e-4);
        g.computeVertexNormals();
      }
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g);
      mesh.userData.kind = kind;
      b.add(mesh);
    }
  }
}

// ----- people -----
const EYE = '#20243a', BLUSH = '#f0a08c', BRASS = '#c9a44a', GLASS = '#9ff4ff', GEM = '#7ff6ff', STRAP = '#6a4a28', BUCKLE = '#e8c25a', GOLD = '#f2cf5a';

function humanoid(k, o) {
  const wide = o.wide ? 1.18 : 1;
  const d = { legU: 0.29, legL: 0.31, torsoH: 0.44, neck: 0.02, shoulderX: 0.2 * wide, shoulderY: 0.39, armU: 0.22, armL: 0.21, hipX: 0.085 * wide };
  k.bone('body', null, [0, d.legU + d.legL, 0]);
  k.bone('torso', 'body');
  k.bone('head', 'torso', [0, d.torsoH + d.neck, 0]);
  for (const [s, x] of [['L', 1], ['R', -1]]) {
    k.bone('shoulder' + s, 'torso', [x * d.shoulderX, d.shoulderY, 0]);
    k.bone('elbow' + s, 'shoulder' + s, [0, -d.armU, 0]);
    k.bone('hip' + s, 'body', [x * d.hipX, 0, 0]);
    k.bone('knee' + s, 'hip' + s, [0, -d.legU, 0]);
  }
  k.bone('tool', 'elbowR', [0, -d.armL, 0]);
  const th = d.torsoH, rt = 0.165, rb = 0.15, lr = 0.055, legLen = d.legU + d.legL;

  // torso, belt
  k.part('torso', cyl(rt, rb, th), o.top, { pos: [0, th / 2, 0], scale: [wide, 1, 0.72] });
  k.part('torso', sph(rt), o.top, { pos: [0, th, 0], scale: [wide, 0.45, 0.72] });
  if (o.belt) {
    k.part('torso', cyl(rb * 1.04, rb * 1.06, th * 0.11), o.belt, { pos: [0, th * 0.12, 0], scale: [wide, 1, 0.74], thin: true });
    k.part('torso', box(rb * 0.36, th * 0.13, 0.03), BUCKLE, { pos: [0, th * 0.12, rb * 0.76], thin: true });
  }
  // a robe falls to the ankles over the legs
  if (o.robe) {
    k.part('body', cyl(rb * 1.05 * wide, rb * 1.75 * wide, legLen * 0.86, true), o.legs, { pos: [0, -legLen * 0.43, 0], scale: [1, 1, 0.8] });
    k.part('body', cyl(rb * 1.76 * wide, rb * 1.78 * wide, legLen * 0.06, true), shade(o.legs, 0.8), { pos: [0, -legLen * 0.83, 0], scale: [1, 1, 0.8], thin: true });
  }
  if (o.coat) {
    // a sea-coat: skirts to mid-thigh, brass buttons, a neckerchief
    k.part('body', cyl(rb * 1.06, rb * 1.42, d.legU * 0.85, true), o.apron, { pos: [0, -d.legU * 0.42, 0], scale: [1, 1, 0.8] });
    for (let i = 0; i < 3; i++) k.part('torso', sph(0.018, 8), BRASS, { pos: [0, th * (0.3 + i * 0.2), rt * 0.74], thin: true });
    if (o.scarf) {
      k.part('torso', cyl(rt * 0.62, rt * 0.75, th * 0.12), o.scarf, { pos: [0, th * 0.96, 0], scale: [1, 1, 0.8], thin: true });
      k.part('torso', cone(rt * 0.3, th * 0.32, 12), o.scarf, { pos: [0, th * 0.78, rt * 0.62], rot: [Math.PI + 0.25, 0, 0], scale: [1, 1, 0.4], thin: true });
    }
  } else if (o.apron) {
    // an apron (or a stole, over a robe): bib on the chest, and down over the legs
    k.part('torso', cyl(rt * 1.05, rb * 1.18, th * 0.85, true, -0.95, 1.9), o.apron, { pos: [0, th * 0.42, 0], scale: [wide, 1, 0.76] });
    const low = o.robe ? legLen * 0.84 : d.legU * 0.8, r0 = o.robe ? rb * 1.1 * wide : rb * 1.18, r1 = o.robe ? rb * 1.8 * wide : rb * 1.4;
    k.part('body', cyl(r0, r1, low, true, -0.7, 1.4), o.apron, { pos: [0, -low / 2, 0], scale: [1, 1, 0.82] });
  }
  if (o.amulet) {
    k.part('torso', torus(rt * 0.42, 0.007, Math.PI, 16), BRASS, { pos: [0, th * 0.86, rt * 0.6], rot: [0.4, 0, Math.PI], thin: true });
    k.part('torso', new THREE.OctahedronGeometry(0.042, 1), o.amuletColor || GEM, { pos: [0, th * 0.62, rt * 0.86], scale: [1, 1.25, 0.6], glow: true });
    k.part('torso', torus(0.046, 0.009, Math.PI * 2, 16), BRASS, { pos: [0, th * 0.62, rt * 0.84], scale: [1, 1.25, 1], thin: true });
  }
  if (o.sunPendant) {
    k.part('torso', torus(rt * 0.42, 0.007, Math.PI, 16), BRASS, { pos: [0, th * 0.86, rt * 0.6], rot: [0.4, 0, Math.PI], thin: true });
    k.part('torso', cyl(0.05, 0.05, 0.015), GOLD, { pos: [0, th * 0.6, rt * 0.82], rot: [Math.PI / 2, 0, 0], thin: true });
  }

  // head
  const hr = 0.245, head = k.frame('head', [0, hr * 0.95, 0]);
  k.part('head', cyl(hr * 0.28, hr * 0.32, hr * 0.5, false, 0, Math.PI * 2, 10), shade(o.skin, 0.92), { pos: [0, hr * 0.12, 0], thin: true });
  k.part(head, sph(hr), o.skin, { scale: [1, 1, 0.98] });
  const onHead = (ax, ay, r = hr) => [Math.sin(ax) * Math.cos(ay) * r, Math.sin(ay) * r, Math.cos(ax) * Math.cos(ay) * r];
  const ey = -0.02, ex = 0.33;
  for (const sx of [-1, 1]) {
    const p = onHead(sx * ex, ey, hr * 0.985);
    const f = k.frame(head, p);
    f.quaternion.setFromUnitVectors(FWD, new THREE.Vector3(...p).normalize());
    k.part(f, sph(hr * 0.12, 12), o.eye || EYE, { scale: [0.8, 1.15, 0.45], thin: true });
    k.part(f, sph(hr * 0.04, 6), '#ffffff', { pos: [-hr * 0.035, hr * 0.06, hr * 0.045], glow: true });
    const bp = onHead(sx * ex, ey + 0.3, hr * 0.99);
    k.part(head, box(hr * 0.2, hr * 0.045, hr * 0.05), shade(o.beard || o.hair || '#3a2a20', 1.1), { pos: bp, out: bp, spin: sx * 0.15, thin: true });
    if (!o.beard) {
      const cp = onHead(sx * 0.58, ey - 0.28, hr * 1.0);
      k.part(head, new THREE.CircleGeometry(hr * 0.1, 12), BLUSH, { pos: cp, out: cp, thin: true });
    }
    k.part(head, sph(hr * 0.13, 10), o.skin, { pos: onHead(sx * 1.5, -0.05, hr * 0.96), scale: [0.5, 1, 0.8], thin: true });
  }
  k.part(head, sph(hr * 0.07, 8), shade(o.skin, 0.96), { pos: onHead(0, ey - 0.17, hr), thin: true });
  if (o.beard) {
    k.part(head, sph(hr * 0.62), o.beard, { pos: onHead(0, -0.62, hr * 0.62), scale: [1.05, 0.95, 0.7] });
    k.part(head, sph(hr * 0.2, 10), o.beard, { pos: onHead(0, -0.3, hr * 0.97), scale: [1.6, 0.55, 0.6], thin: true });
  } else {
    const mp = onHead(0, ey - 0.34, hr * 0.985);
    k.part(head, torus(hr * 0.07, hr * 0.018, Math.PI, 12), shade(o.skin, 0.55), { pos: mp, out: mp, spin: Math.PI, thin: true });
  }
  hair(k, head, o, hr, onHead);
  if (o.goggles) {
    k.part(head, torus(hr * 1.075, hr * 0.06, Math.PI * 2, 36), STRAP, { pos: [0, hr * 0.38, 0], rot: [Math.PI / 2 - 0.22, 0, 0], thin: true });
    for (const sx of [-1, 1]) {
      const p = onHead(sx * 0.36, 0.5, hr * 1.06);
      const f = k.frame(head, p);
      f.quaternion.setFromUnitVectors(FWD, new THREE.Vector3(...p).normalize());
      k.part(f, cyl(hr * 0.24, hr * 0.26, hr * 0.2, false, 0, Math.PI * 2, 16), BRASS, { pos: [0, 0, hr * 0.06], rot: [Math.PI / 2, 0, 0], thin: true });
      k.part(f, new THREE.CircleGeometry(hr * 0.18, 16), GLASS, { pos: [0, 0, hr * 0.165], glow: true });
    }
  }

  // arms and legs
  for (const s of ['L', 'R']) {
    k.part('shoulder' + s, cyl(lr * 1.1, lr, d.armU), o.top, { pos: [0, -d.armU / 2, 0] });
    k.part('shoulder' + s, sph(lr * 1.12), o.top, { thin: true });
    k.part('elbow' + s, cyl(lr * 0.95, lr * 0.85, d.armL), o.coat ? o.top : o.skin, { pos: [0, -d.armL / 2, 0] });
    k.part('elbow' + s, cyl(lr * 1.18, lr * 1.18, d.armL * 0.22), o.coat ? shade(o.top, 0.8) : shade(o.top, 1.15), { pos: [0, o.coat ? -d.armL * 0.9 : -d.armL * 0.06, 0], thin: true });
    k.part('elbow' + s, sph(lr * 1.15), o.skin, { pos: [0, -d.armL - lr * 0.6, 0] });
    k.part('hip' + s, cyl(lr * 1.35, lr * 1.15, d.legU), o.legs, { pos: [0, -d.legU / 2, 0] });
    k.part('hip' + s, sph(lr * 1.3), o.legs, { thin: true });
    const tall = o.coat ? 0.75 : 0.45;
    k.part('knee' + s, cyl(lr * 1.12, lr, d.legL * (1 - tall)), o.legs, { pos: [0, -d.legL * (1 - tall) / 2, 0] });
    k.part('knee' + s, cyl(lr * 1.18, lr * 1.12, d.legL * tall), o.boots, { pos: [0, -d.legL * (1 - tall / 2), 0] });
    k.part('knee' + s, sph(lr * 1.3), o.boots, { pos: [0, -d.legL + lr * 0.55, lr * 0.55], scale: [0.95, 0.6, 1.55] });
    k.part('knee' + s, box(lr * 2.3, lr * 0.32, lr * 3.6), shade(o.boots, 0.45), { pos: [0, -d.legL + lr * 0.16, lr * 0.5], thin: true });
  }
  // the wrench (or hammer), only out for a swing
  if (o.tool === 'hammer') {
    k.part('tool', cyl(0.02, 0.02, 0.34), '#6b4428', { pos: [0, -lr * 0.6, 0.14], rot: [Math.PI / 2, 0, 0], thin: true });
    k.part('tool', box(0.18, 0.08, 0.08), '#7a7f8a', { pos: [0, -lr * 0.6, 0.32], thin: true });
  } else {
    k.part('tool', cyl(0.02, 0.02, 0.36, false, 0, Math.PI * 2, 10), '#b88a3a', { pos: [0, -lr * 0.6, 0.15], rot: [Math.PI / 2, 0, 0], thin: true });
    k.part('tool', torus(0.06, 0.022, Math.PI * 1.5, 14), '#e2bf62', { pos: [0, -lr * 0.6, 0.38], rot: [Math.PI / 2, 0, Math.PI * 0.25], thin: true });
  }
}

/** Hair, by the sprite's hairStyle. (A cap over the crown, a shell round the back, and the rest.) */
function hair(k, head, o, hr, onHead) {
  const c = o.hair, dark = shade(c || '#000000', 0.8);
  const cap = (r = 1.07, t = 1.12) => k.part(head, new THREE.SphereGeometry(hr * r, SEG, 10, 0, Math.PI * 2, 0, t), c, { pos: [0, 0, -hr * 0.03] });
  const back = (t = 2.15) => k.part(head, new THREE.SphereGeometry(hr * 1.06, SEG, 12, Math.PI * 0.82, Math.PI * 1.36, 0, t), c, { pos: [0, 0, -hr * 0.02] });
  const fringe = (n = 5) => {
    const spots = [[-0.55, 0.62, 0.36], [-0.12, 0.7, 0.32], [0.3, 0.66, 0.34], [0.72, 0.5, 0.3], [-0.92, 0.38, 0.3]].slice(0, n);
    for (const [ax, ay, s] of spots) k.part(head, sph(hr * s, 12), c, { pos: onHead(ax, ay, hr * 0.98), scale: [1.15, 0.7, 0.75], thin: true });
  };
  // an arc of hair round the back of the head, at height y
  const ring = (arc, y, t, r = 0.98) => {
    const g = torus(hr * r, hr * t, arc, 20).rotateX(Math.PI / 2).rotateY(arc / 2 + Math.PI / 2);
    k.part(head, g, c, { pos: [0, y, 0] });
  };
  const circlet = () => {
    k.part(head, torus(hr * 1.07, hr * 0.045, Math.PI * 2, 36), BRASS, { pos: [0, hr * 0.42, 0], rot: [Math.PI / 2 - 0.15, 0, 0], thin: true });
    const p = onHead(0, 0.5, hr * 1.1);
    k.part(head, cyl(hr * 0.13, hr * 0.13, hr * 0.05), GOLD, { pos: p, rot: [Math.PI / 2 - 0.5, 0, 0], thin: true });
  };
  const longFall = () => {
    k.part(head, sph(hr), c, { pos: [0, -hr * 0.85, -hr * 0.62], scale: [1.0, 1.75, 0.5] });
    for (const sx of [-1, 1]) k.part(head, sph(hr * 0.5, 12), c, { pos: [sx * hr * 0.82, -hr * 0.35, -hr * 0.1], scale: [0.6, 1.5, 0.9] });
  };
  switch (o.hairStyle) {
    case 'bun': {
      cap(); back(); fringe();
      const b = onHead(Math.PI, 0.72, hr * 1.08);
      k.part(head, sph(hr * 0.44, 14), c, { pos: [b[0], b[1] + hr * 0.12, b[2] + hr * 0.12] });
      k.part(head, torus(hr * 0.3, hr * 0.06, Math.PI * 2, 18), STRAP, { pos: [b[0], b[1] + hr * 0.02, b[2] + hr * 0.25], rot: [-0.9, 0, 0], thin: true });
      break;
    }
    case 'short': cap(); back(1.95); fringe(4); break;
    case 'spiky': {
      cap(); back(1.9);
      for (const [ax, ay] of [[0, 1.2], [0.6, 0.9], [-0.6, 0.9], [0.3, 0.55], [-0.3, 0.55], [Math.PI, 0.8], [2.2, 0.7], [-2.2, 0.7]]) {
        const p = onHead(ax, ay, hr * 1.02);
        k.part(head, cone(hr * 0.2, hr * 0.5, 8), c, { pos: p, up: p });
      }
      break;
    }
    case 'long': cap(); back(2.3); longFall(); fringe(4); break;
    case 'circletLong': cap(); back(2.3); longFall(); fringe(3); circlet(); break;
    case 'circlet': cap(1.06, 1.0); back(1.8); circlet(); break;
    case 'baldRing': ring(Math.PI * 1.25, -hr * 0.12, 0.17); break;
    case 'bald': ring(Math.PI * 0.8, -hr * 0.2, 0.15); break;
    case 'braid':
      cap(); back(2.0); fringe(4);
      for (let i = 0; i < 6; i++) k.part(head, sph(hr * (0.19 - i * 0.012), 10), i % 2 ? dark : c, { pos: [0, -hr * (0.35 + i * 0.3), -hr * (1.0 - i * 0.02)] });
      k.part(head, cyl(hr * 0.1, hr * 0.1, hr * 0.12), '#c8642a', { pos: [0, -hr * 2.1, -hr * 0.92], thin: true });
      break;
    case 'hood':
      k.part(head, new THREE.SphereGeometry(hr * 1.22, SEG, 12, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, 2.35), c);
      k.part('torso', cyl(0.17, 0.25, 0.16, true), c, { pos: [0, 0.39, -0.01], scale: [1, 1, 0.8] });
      break;
    default:
      break;
  }
}

/** Poses a person. Forward swings are negative x rotations; L is +x, R (the tool hand) is -x. */
function animHuman(P, anim, t) {
  const rot = (n, x = 0, y = 0, z = 0) => P[n].rotation.set(x, y, z);
  rot('shoulderL', 0, 0, 0.1);
  rot('shoulderR', 0, 0, -0.1);
  P.elbowL.rotation.x = P.elbowR.rotation.x = -0.12;
  P.tool.visible = anim === 'attack';
  let bob = 0;
  const walk = (rate, amp, lean) => {
    const ph = t * rate, s = Math.sin(ph);
    P.hipL.rotation.x = -s * amp;
    P.hipR.rotation.x = s * amp;
    P.kneeL.rotation.x = 0.12 + Math.max(0, Math.cos(ph)) * amp * 1.4;
    P.kneeR.rotation.x = 0.12 + Math.max(0, -Math.cos(ph)) * amp * 1.4;
    P.shoulderL.rotation.x = s * amp * 0.9;
    P.shoulderR.rotation.x = -s * amp * 0.9;
    P.elbowL.rotation.x = P.elbowR.rotation.x = -0.35;
    rot('torso', lean, s * 0.08, 0);
    rot('head', -lean * 0.6, -s * 0.06, 0);
    bob = Math.abs(Math.cos(ph)) * 0.04 - 0.02;
  };
  switch (anim) {
    case 'idle': {
      const b = Math.sin(t * 2.1);
      bob = b * 0.008;
      P.torso.rotation.x = b * 0.015;
      rot('head', Math.sin(t * 0.9) * 0.04, Math.sin(t * 0.5) * 0.18, Math.sin(t * 0.7) * 0.03);
      P.shoulderL.rotation.x = b * 0.04;
      P.shoulderR.rotation.x = -b * 0.04;
      break;
    }
    case 'talk':
      rot('shoulderR', -0.95 + Math.sin(t * 3.1) * 0.25, 0.2, -0.25);
      P.elbowR.rotation.x = -0.9 + Math.sin(t * 3.1 + 1) * 0.2;
      rot('head', Math.max(0, Math.sin(t * 4.6)) * 0.12, 0.25, Math.sin(t * 1.3) * 0.05);
      bob = Math.sin(t * 2) * 0.006;
      break;
    case 'walk': walk(8.2, 0.55, 0.07); break;
    case 'run': walk(11.5, 0.8, 0.18); break;
    case 'push':
      walk(4.5, 0.4, 0.32);
      rot('shoulderL', -1.45, 0, 0.1);
      rot('shoulderR', -1.45, 0, -0.1);
      P.elbowL.rotation.x = P.elbowR.rotation.x = -0.3;
      break;
    case 'jump':
      rot('shoulderL', -2.3, 0, 0.35);
      rot('shoulderR', -2.0, 0, -0.35);
      P.hipL.rotation.x = -0.9;
      P.kneeL.rotation.x = 1.2;
      P.hipR.rotation.x = 0.2;
      P.kneeR.rotation.x = 0.5;
      P.torso.rotation.x = 0.08;
      break;
    case 'fall':
      rot('shoulderL', -2.5, 0, 0.6);
      rot('shoulderR', -2.5, 0, -0.6);
      P.elbowL.rotation.x = P.elbowR.rotation.x = -0.3;
      P.hipL.rotation.x = -0.35;
      P.hipR.rotation.x = 0.25;
      P.kneeL.rotation.x = P.kneeR.rotation.x = 0.35;
      P.torso.rotation.x = -0.05;
      break;
    case 'climb': {
      const s = Math.sin(t * 7);
      P.shoulderL.rotation.x = -2.8 + s * 0.35;
      P.shoulderR.rotation.x = -2.8 - s * 0.35;
      P.elbowL.rotation.x = P.elbowR.rotation.x = -0.5;
      P.hipL.rotation.x = -0.5 - s * 0.35;
      P.hipR.rotation.x = -0.5 + s * 0.35;
      P.kneeL.rotation.x = P.kneeR.rotation.x = 0.9;
      P.head.rotation.x = -0.25;
      break;
    }
    case 'attack': {
      const u = Math.min(1, t / 0.26), ease = (x) => x * x * (3 - 2 * x);
      const a = u < 0.3 ? -2.9 * ease(u / 0.3) : u < 0.55 ? -2.9 + 3.6 * ease((u - 0.3) / 0.25) : 0.7 * (1 - ease((u - 0.55) / 0.45));
      rot('shoulderR', a, 0, -0.15);
      P.elbowR.rotation.x = -0.25;
      rot('torso', a > 0 ? 0.18 : -0.05, a * 0.08, 0);
      rot('shoulderL', 0.35, 0, 0.3);
      P.elbowL.rotation.x = -0.6;
      P.hipL.rotation.x = -0.35;
      P.kneeL.rotation.x = 0.25;
      P.hipR.rotation.x = 0.2;
      bob = -0.02;
      break;
    }
    case 'hurt':
      P.torso.rotation.x = -0.25;
      rot('shoulderL', -0.6, 0, 0.8);
      rot('shoulderR', -0.6, 0, -0.8);
      P.head.rotation.x = -0.2;
      P.hipL.rotation.x = -0.3;
      break;
    case 'swim': {
      const ph = t * 5, s = Math.sin(ph);
      P.body.rotation.x = 0.7;
      P.head.rotation.x = -0.6;
      P.shoulderL.rotation.x = -2.0 + s * 1.0;
      P.shoulderR.rotation.x = -2.0 - s * 1.0;
      P.hipL.rotation.x = Math.sin(ph * 1.4) * 0.35;
      P.hipR.rotation.x = -Math.sin(ph * 1.4) * 0.35;
      P.kneeL.rotation.x = P.kneeR.rotation.x = 0.3;
      break;
    }
    case 'roll':
      P.body.rotation.x = t * 15;
      P.body.position.y = P.body.userData.rest[1] * 0.55;
      P.hipL.rotation.x = P.hipR.rotation.x = -1.7;
      P.kneeL.rotation.x = P.kneeR.rotation.x = 2.3;
      rot('shoulderL', -1.0, 0, 0.2);
      rot('shoulderR', -1.0, 0, -0.2);
      P.elbowL.rotation.x = P.elbowR.rotation.x = -1.6;
      P.head.rotation.x = 0.45;
      break;
    default:
      break;
  }
  P.body.position.y += bob;
}

// ----- creatures and machines -----
const CREATURES = {
  megan: squirrel({ B: '#c8642a', L: '#e8a060', acorn: true }),
  zach: squirrel({ B: '#86848e', L: '#cfccd6', spectacles: true }),
  brn: {
    build(k) {
      k.bone('body', null, [0, 0.3, 0]);
      k.bone('head', 'body', [0, 0.44, 0]);
      for (const [s, x] of [['L', 1], ['R', -1]]) {
        k.bone('arm' + s, 'body', [x * 0.3, 0.36, 0]);
        k.bone('leg' + s, 'body', [x * 0.11, 0, 0]);
        k.part('arm' + s, box(0.1, 0.26, 0.12), '#8a94a4', { pos: [0, -0.13, 0] });
        k.part('leg' + s, box(0.16, 0.3, 0.18), '#4a5260', { pos: [0, -0.15, 0] });
      }
      k.part('body', box(0.48, 0.44, 0.34), '#c87a2a', { pos: [0, 0.22, 0] });
      k.part('body', box(0.5, 0.06, 0.36), '#e8a050', { pos: [0, 0.42, 0], thin: true });
      k.part('body', box(0.2, 0.14, 0.02), '#3a2a1a', { pos: [0, 0.2, 0.175], thin: true });
      k.part('body', sph(0.025, 8), '#7cff6a', { pos: [-0.05, 0.22, 0.19], glow: true });
      k.part('head', box(0.36, 0.28, 0.3), '#8a94a4', { pos: [0, 0.14, 0] });
      k.part('head', box(0.26, 0.07, 0.02), '#36f0ff', { pos: [0, 0.15, 0.155], glow: true });
      k.part('head', cyl(0.012, 0.012, 0.12, false, 0, Math.PI * 2, 6), '#4a5260', { pos: [0, 0.34, 0], thin: true });
      k.part('head', sph(0.03, 8), '#ffb03a', { pos: [0, 0.41, 0], glow: true });
    },
    animate(P, anim, t) {
      P.body.position.y += Math.sin(t * 2.4) * 0.01;
      P.head.rotation.y = Math.sin(t * 0.7) * 0.3;
      P.armL.rotation.z = 0.08;
      P.armR.rotation.z = -0.08;
      if (anim === 'talk') {
        P.armR.rotation.x = -1.6 + Math.sin(t * 5) * 0.3;
        P.head.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.12;
      }
    },
  },
  tick: {
    build(k) {
      k.bone('body', null, [0, 0.45, 0]);
      k.bone('ring', 'body', [0, -0.34, 0]);
      k.part('body', sph(0.27), '#d8dce6');
      k.part('body', cyl(0.275, 0.275, 0.1, true, -1.1, 2.2), '#1a2030', { pos: [0, 0.02, 0], thin: true });
      for (const x of [-1, 1]) k.part('body', sph(0.035, 8), '#36f0ff', { pos: [x * 0.08, 0.03, 0.268], glow: true });
      k.part('body', cyl(0.03, 0.04, 0.06, false, 0, Math.PI * 2, 8), '#8a94a4', { pos: [0, 0.29, 0], thin: true });
      k.part('body', sph(0.05, 10), '#ffb03a', { pos: [0, 0.35, 0], glow: true });
      k.part('ring', torus(0.13, 0.014), '#ff3fd2', { rot: [Math.PI / 2, 0, 0], glow: true });
      k.part('ring', torus(0.07, 0.012), '#ff3fd2', { pos: [0, -0.05, 0], rot: [Math.PI / 2, 0, 0], glow: true });
    },
    animate(P, anim, t) {
      P.body.position.y += Math.sin(t * 2) * 0.03;
      P.ring.rotation.y = t * 2;
      if (anim === 'talk') P.body.rotation.z = Math.sin(t * 6) * 0.08;
    },
  },
  digby: {
    build(k) {
      k.bone('wheel', null, [0, 0.16, 0]);
      k.bone('body', null, [0, 0.34, 0]);
      k.bone('head', 'body', [0, 0.38, 0]);
      k.bone('scoop', 'body', [-0.27, 0.14, 0.05]);
      k.bone('arm', 'body', [0.27, 0.16, 0]);
      k.part('wheel', torus(0.12, 0.05), '#2a2e36', { rot: [0, Math.PI / 2, 0] });
      k.part('wheel', cyl(0.06, 0.06, 0.12, false, 0, Math.PI * 2, 10), '#5a606c', { rot: [0, 0, Math.PI / 2], thin: true });
      k.part('body', box(0.46, 0.36, 0.36), '#b8683a', { pos: [0, 0.18, 0] });
      k.part('body', box(0.47, 0.05, 0.37), '#d88a5a', { pos: [0, 0.34, 0], thin: true });
      k.part('body', box(0.47, 0.06, 0.37), '#d8b040', { pos: [0, 0.12, 0], thin: true });
      for (let i = 0; i < 3; i++) k.part('body', box(0.04, 0.04, 0.02), '#2a2420', { pos: [-0.12 + i * 0.12, 0.12, 0.19], thin: true });
      k.part('head', box(0.3, 0.24, 0.26), '#8a94a4', { pos: [0, 0.12, 0] });
      k.part('head', cyl(0.065, 0.065, 0.02, false, 0, Math.PI * 2, 14), '#1a1410', { pos: [0, 0.12, 0.135], rot: [Math.PI / 2, 0, 0], thin: true });
      k.part('head', sph(0.035, 10), '#ffb03a', { pos: [0, 0.12, 0.145], glow: true });
      k.part('head', cyl(0.01, 0.01, 0.12, false, 0, Math.PI * 2, 6), '#4a5260', { pos: [-0.08, 0.3, 0], thin: true });
      k.part('head', sph(0.025, 8), '#ff5a3a', { pos: [-0.08, 0.37, 0], glow: true });
      k.part('scoop', box(0.08, 0.08, 0.25), '#8a94a4', { pos: [0, 0, 0.1] });
      k.part('scoop', box(0.16, 0.12, 0.06), '#5a606c', { pos: [0, -0.03, 0.24] });
      k.part('arm', box(0.08, 0.2, 0.08), '#8a94a4', { pos: [0, -0.08, 0] });
    },
    animate(P, anim, t) {
      P.body.position.y += Math.sin(t * 2.6) * 0.012;
      P.head.rotation.y = Math.sin(t * 0.6) * 0.35;
      P.wheel.rotation.x = Math.sin(t * 0.9) * 0.25;
      P.scoop.rotation.x = anim === 'talk' ? -0.6 + Math.sin(t * 5) * 0.3 : Math.sin(t * 1.2) * 0.1;
    },
  },
  thornback: {
    build(k) {
      const B = '#6f8a3a', Bd = '#4f6a2a';
      k.bone('body', null, [0, 0.24, 0]);
      k.bone('head', 'body', [0, 0.04, 0.3]);
      k.bone('tail', 'body', [0, 0, -0.28]);
      for (const [n, x, z] of [['FL', 1, 0.17], ['FR', -1, 0.17], ['BL', 1, -0.15], ['BR', -1, -0.15]]) {
        k.bone(n, 'body', [x * 0.15, -0.06, z]);
        k.part(n, cyl(0.045, 0.035, 0.17, false, 0, Math.PI * 2, 8), Bd, { pos: [0, -0.08, 0] });
      }
      k.part('body', sph(0.2), B, { scale: [1, 0.7, 1.6] });
      k.part('body', sph(0.17), '#d8c27a', { pos: [0, -0.06, 0], scale: [0.9, 0.5, 1.4], thin: true });
      for (let i = 0; i < 5; i++) k.part('body', cone(0.045, 0.12, 6), '#c8642a', { pos: [0, 0.14 - Math.abs(i - 2) * 0.012, -0.2 + i * 0.1], rot: [-0.25, 0, 0] });
      k.part('head', sph(0.13), B, { pos: [0, 0, 0.08], scale: [1, 0.75, 1.3] });
      k.part('head', box(0.12, 0.015, 0.02), '#c84a3a', { pos: [0, -0.045, 0.23], thin: true });
      for (const x of [-1, 1]) {
        k.part('head', sph(0.032, 8), '#ffd23a', { pos: [x * 0.08, 0.045, 0.15], glow: true });
        k.part('head', sph(0.016, 6), '#1a1a1a', { pos: [x * 0.1, 0.05, 0.165], thin: true });
      }
      k.part('tail', cone(0.09, 0.42, 10), B, { pos: [0, -0.02, -0.18], rot: [-Math.PI / 2 - 0.15, 0, 0] });
    },
    animate(P, anim, t) {
      const ph = t * 8, s = Math.sin(ph);
      P.FL.rotation.x = P.BR.rotation.x = s * 0.6;
      P.FR.rotation.x = P.BL.rotation.x = -s * 0.6;
      P.tail.rotation.y = Math.sin(ph * 0.5) * 0.35;
      P.head.rotation.y = Math.sin(ph * 0.5) * 0.1;
      P.body.position.y += Math.abs(s) * 0.02;
      if (anim === 'hurt') P.tail.rotation.x = 0.5;
    },
  },
  crab: {
    facing: 'front', // crabs walk sideways
    build(k) {
      const B = '#d8604a', Bd = '#a8402e';
      k.bone('body', null, [0, 0.2, 0]);
      for (const [s, x] of [['L', 1], ['R', -1]]) {
        k.bone('claw' + s, 'body', [x * 0.26, 0.02, 0.1]);
        k.bone('legs' + s, 'body', [x * 0.18, -0.04, 0]);
        k.part('claw' + s, cyl(0.035, 0.03, 0.18, false, 0, Math.PI * 2, 8), Bd, { pos: [x * 0.06, 0.05, 0], rot: [0, 0, x * 0.9] });
        k.part('claw' + s, sph(0.08, 12), B, { pos: [x * 0.13, 0.13, 0.04], scale: [1, 0.85, 0.7] });
        k.part('claw' + s, cone(0.035, 0.1, 8), B, { pos: [x * 0.15, 0.2, 0.07], rot: [0.5, 0, 0] });
        for (let i = 0; i < 3; i++) k.part('legs' + s, cyl(0.016, 0.012, 0.2, false, 0, Math.PI * 2, 6), Bd, { pos: [x * 0.07, -0.06, -0.1 + i * 0.1], rot: [0, 0, x * 1.0] });
      }
      k.part('body', sph(0.25), B, { scale: [1.2, 0.6, 0.85] });
      k.part('body', sph(0.2), '#f08a6a', { pos: [0, 0.05, 0], scale: [1.2, 0.45, 0.8], thin: true });
      for (const x of [-1, 1]) {
        k.part('body', cyl(0.015, 0.015, 0.12, false, 0, Math.PI * 2, 6), Bd, { pos: [x * 0.07, 0.16, 0.12], thin: true });
        k.part('body', sph(0.035, 8), '#1a1a1a', { pos: [x * 0.07, 0.23, 0.12] });
        k.part('body', sph(0.012, 6), '#ffffff', { pos: [x * 0.06, 0.245, 0.15], glow: true });
      }
    },
    animate(P, anim, t) {
      const ph = t * 10;
      P.body.position.y += Math.abs(Math.sin(ph)) * 0.02;
      P.body.rotation.z = Math.sin(ph) * 0.05;
      P.clawL.rotation.z = Math.sin(ph * 0.5) * 0.3;
      P.clawR.rotation.z = -Math.sin(ph * 0.5) * 0.3;
      P.legsL.rotation.z = Math.sin(ph) * 0.25;
      P.legsR.rotation.z = -Math.sin(ph) * 0.25;
    },
  },
  rat: {
    build(k) {
      k.bone('body', null, [0, 0.13, 0]);
      k.bone('head', 'body', [0, 0.02, 0.2]);
      k.bone('tail', 'body', [0, 0, -0.18]);
      k.part('body', sph(0.15), '#6a6070', { scale: [0.85, 0.75, 1.35] });
      k.part('body', sph(0.12), '#8a8090', { pos: [0, 0.05, 0], scale: [0.7, 0.5, 1.3], thin: true });
      for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) k.part('body', sph(0.03, 6), '#e89aa0', { pos: [x * 0.07, -0.1, z * 0.1], scale: [1, 0.5, 1.4], thin: true });
      k.part('head', sph(0.09), '#6a6070', { pos: [0, 0, 0.04], scale: [0.9, 0.85, 1.3] });
      k.part('head', sph(0.022, 6), '#e89aa0', { pos: [0, -0.01, 0.16], thin: true });
      for (const x of [-1, 1]) {
        k.part('head', sph(0.022, 6), '#ff3030', { pos: [x * 0.05, 0.03, 0.1], glow: true });
        k.part('head', sph(0.04, 8), '#e89aa0', { pos: [x * 0.06, 0.08, 0], scale: [1, 1, 0.3] });
      }
      k.part('tail', cone(0.022, 0.42, 6), '#c87a8a', { pos: [0, -0.02, -0.2], rot: [-Math.PI / 2 + 0.2, 0, 0] });
    },
    animate(P, anim, t) {
      const ph = t * 14;
      P.body.position.y += Math.abs(Math.sin(ph)) * 0.015;
      P.tail.rotation.y = Math.sin(ph * 0.4) * 0.4;
      P.head.rotation.x = Math.sin(ph) * 0.06;
    },
  },
  drone: {
    build(k) {
      k.bone('body', null, [0, 0, 0]);
      k.bone('rotor', 'body', [0, 0.36, 0]);
      k.part('body', sph(0.26), '#4a5468', { scale: [1, 0.8, 1] });
      k.part('body', sph(0.18), '#6a7690', { pos: [0, 0.1, 0], scale: [1, 0.7, 1] });
      k.part('body', cyl(0.11, 0.11, 0.04, false, 0, Math.PI * 2, 16), '#0a0e18', { pos: [0, 0, 0.21], rot: [Math.PI / 2, 0, 0], thin: true });
      k.part('body', sph(0.06, 10), '#ff3fd2', { pos: [0, 0, 0.235], scale: [1, 1, 0.4], glow: true });
      for (const x of [-1, 1]) k.part('body', cyl(0.05, 0.04, 0.06, false, 0, Math.PI * 2, 8), '#36f0ff', { pos: [x * 0.12, -0.22, 0], glow: true });
      k.part('rotor', cyl(0.02, 0.02, 0.12, false, 0, Math.PI * 2, 6), '#2a3040', { pos: [0, -0.06, 0], thin: true });
      k.part('rotor', box(0.6, 0.015, 0.06), '#a0e8ff', { thin: true });
      k.part('rotor', box(0.06, 0.015, 0.6), '#a0e8ff', { thin: true });
    },
    animate(P, anim, t) {
      P.rotor.rotation.y = t * 25;
      P.body.rotation.z = Math.sin(t * 3) * 0.08;
      P.body.position.y += Math.sin(t * 3) * 0.02;
    },
  },
  sentinel: {
    yaw: 0.6, // turned well toward the camera, so its red eye shows
    build(k) {
      k.bone('base', null);
      k.bone('body', null, [0, 0.32, 0]);
      k.bone('head', 'body', [0, 0.62, 0]);
      k.bone('cannon', 'body', [-0.45, 0.32, 0]);
      for (const x of [-1, 1]) {
        k.part('base', box(0.24, 0.3, 0.95), '#2a2e36', { pos: [x * 0.32, 0.15, 0] });
        for (let i = 0; i < 6; i++) k.part('base', box(0.03, 0.18, 0.08), '#5a606c', { pos: [x * 0.45, 0.15, -0.38 + i * 0.15], thin: true });
      }
      k.part('body', box(0.74, 0.6, 0.6), '#7a8494', { pos: [0, 0.3, 0] });
      k.part('body', box(0.76, 0.06, 0.62), '#a6b0c0', { pos: [0, 0.58, 0], thin: true });
      k.part('body', box(0.76, 0.16, 0.62), '#4a5260', { pos: [0, 0.12, 0], thin: true });
      for (let i = 0; i < 4; i++) k.part('body', box(0.1, 0.1, 0.02), '#ffb03a', { pos: [-0.27 + i * 0.18, 0.12, 0.315], thin: true });
      k.part('head', box(0.58, 0.34, 0.5), '#7a8494', { pos: [0, 0.17, 0] });
      k.part('head', box(0.4, 0.1, 0.02), '#ff2a3a', { pos: [0, 0.2, 0.255], glow: true });
      k.part('head', cyl(0.015, 0.015, 0.2, false, 0, Math.PI * 2, 6), '#4a5260', { pos: [0.15, 0.44, 0], thin: true });
      k.part('head', sph(0.035, 8), '#ff3fd2', { pos: [0.15, 0.55, 0], glow: true });
      k.part('cannon', box(0.16, 0.16, 0.5), '#4a5260', { pos: [0, 0, 0.2] });
      k.part('cannon', box(0.12, 0.12, 0.04), '#ffb03a', { pos: [0, 0, 0.46], glow: true });
    },
    animate(P, anim, t) {
      if (anim === 'dead') return;
      P.body.position.y += Math.sin(t * 8) * 0.012;
      P.head.rotation.y = Math.sin(t * 1.5) * 0.3;
    },
  },
};

function squirrel({ B, L, acorn = false, spectacles = false }) {
  return {
    build(k) {
      k.bone('body', null);
      k.bone('head', 'body', [0, 0.36, 0.04]);
      k.bone('tail', 'body', [0, 0.1, -0.13]);
      k.bone('armL', 'body', [0.07, 0.25, 0.09]);
      k.bone('armR', 'body', [-0.07, 0.25, 0.09]);
      k.part('body', sph(0.15), B, { pos: [0, 0.17, 0], scale: [0.95, 1.15, 0.85] });
      k.part('body', sph(0.1), L, { pos: [0, 0.16, 0.09], scale: [0.9, 1.2, 0.5], thin: true });
      for (const x of [-1, 1]) k.part('body', sph(0.05, 8), B, { pos: [x * 0.07, 0.03, 0.05], scale: [1, 0.5, 1.6] });
      if (acorn) {
        k.part('body', sph(0.035, 8), '#8a5a2a', { pos: [0, 0.16, 0.17], scale: [1, 1.2, 1] });
        k.part('body', sph(0.03, 8), '#5a3a1a', { pos: [0, 0.195, 0.17], scale: [1.2, 0.6, 1.2], thin: true });
      }
      k.part('head', sph(0.12), B);
      k.part('head', sph(0.06, 10), L, { pos: [0, -0.03, 0.09], scale: [1, 0.85, 1] });
      k.part('head', sph(0.018, 6), '#3a2020', { pos: [0, -0.01, 0.15], thin: true });
      for (const x of [-1, 1]) {
        k.part('head', sph(0.022, 8), '#1a1a1a', { pos: [x * 0.055, 0.03, 0.095], thin: true });
        k.part('head', sph(0.008, 4), '#ffffff', { pos: [x * 0.05, 0.04, 0.115], glow: true });
        k.part('head', cone(0.035, 0.08, 8), B, { pos: [x * 0.06, 0.12, -0.01] });
        if (spectacles) k.part('head', torus(0.03, 0.006, Math.PI * 2, 12), '#e2bf62', { pos: [x * 0.055, 0.03, 0.115], thin: true });
      }
      for (const [y, z, r, c] of [[0.05, -0.06, 0.09, B], [0.2, -0.13, 0.12, B], [0.37, -0.12, 0.12, B], [0.5, -0.05, 0.09, B], [0.54, 0.0, 0.06, L]]) k.part('tail', sph(r, 12), c, { pos: [0, y, z] });
      for (const s of ['L', 'R']) {
        k.part('arm' + s, cyl(0.025, 0.022, 0.1, false, 0, Math.PI * 2, 8), B, { pos: [0, -0.05, 0] });
        k.part('arm' + s, sph(0.03, 8), L, { pos: [0, -0.1, 0], thin: true });
      }
    },
    animate(P, anim, t) {
      const talk = anim === 'talk';
      P.tail.rotation.x = Math.sin(t * (talk ? 4 : 2)) * 0.12;
      P.tail.rotation.z = Math.sin(t * 1.3) * 0.1;
      P.head.rotation.y = Math.sin(t * 0.8) * 0.3;
      P.head.rotation.x = talk ? Math.max(0, Math.sin(t * 7)) * 0.15 : 0;
      P.armL.rotation.x = -1.2;
      P.armR.rotation.x = acorn ? -1.2 : -2.4 + Math.sin(t * 3) * 0.2;
      P.body.position.y += Math.sin(t * 2.2) * 0.005;
    },
  };
}

const templates = new Map();
/** A character's model, built and baked once. Null if it has no Storybook model. */
function template(name) {
  if (templates.has(name)) return templates.get(name);
  const person = charFor(name);
  const def = CREATURES[name] || (person && { build: (k) => humanoid(k, person), animate: animHuman });
  let t = null;
  if (def) {
    const k = new Kit();
    def.build(k);
    k.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(k.root);
    bake(k.root);
    t = { root: k.root, bounds, animate: def.animate, facing: def.facing || 'side', yaw: def.yaw ?? FACE_YAW };
  }
  templates.set(name, t);
  return t;
}

/** Where the sprite's drawing sits in its card: the model is sized and placed to match it. */
const boundsCache = new WeakMap();
function spriteBounds(sheet) {
  if (boundsCache.has(sheet)) return boundsCache.get(sheet);
  const W = sheet.fw * SCALE, H = sheet.fh * SCALE;
  const data = sheet.ctx.getImageData(0, 0, W, H).data;
  let top = H, bottom = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > 110) {
        top = Math.min(top, y);
        bottom = y;
      }
  const b = { top: (H - top) / H, bottom: (H - 1 - bottom) / H };
  boundsCache.set(sheet, b);
  return b;
}

function outlineMaterial(width) {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOutline = width;
    sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * uOutline;');
  };
  m.customProgramCacheKey = () => 'toonOutline';
  return m;
}

class ToonLook {
  constructor(actor, tpl) {
    this.actor = actor;
    this.tpl = tpl;
    const sb = spriteBounds(actor.sheet), cardH = actor.h * SPRITE_STRETCH;
    const s = ((sb.top - sb.bottom) * cardH) / (tpl.bounds.max.y - tpl.bounds.min.y);
    this.outlineW = { value: OUTLINE / s };
    this.mats = {
      body: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, side: THREE.DoubleSide }),
      outline: outlineMaterial(this.outlineW),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    selfLit(this.mats.body, 0.1);
    this.model = tpl.root.clone(true);
    this.P = {};
    this.model.traverse((o) => {
      if (o.userData.bone) this.P[o.name] = o;
      if (o.isMesh) {
        o.material = this.mats[o.userData.kind];
        o.castShadow = o.userData.kind === 'body';
        o.renderOrder = 2;
      }
    });
    this.model.scale.setScalar(s);
    this.model.position.y = sb.bottom * cardH - tpl.bounds.min.y * s;
    this.root = new THREE.Group();
    this.root.add(this.model);
    this.yaw = this.want();
    this.surfaces = [this.mats.body];
    this.extras = [this.mats.outline, this.mats.glow];
  }
  want() {
    return this.tpl.facing === 'front' ? 0 : (this.actor.flip ? -1 : 1) * this.tpl.yaw;
  }
  show(frame, dt) {
    const a = this.actor;
    // turn toward the way it's facing, quickly but not instantly
    const d = this.want() - this.yaw;
    this.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 14);
    this.model.rotation.y = this.yaw;
    for (const n in this.P) {
      const b = this.P[n];
      b.rotation.set(0, 0, 0);
      b.position.fromArray(b.userData.rest);
    }
    this.tpl.animate(this.P, a.anim, a.t);
  }
  dispose() {
    for (const m of Object.values(this.mats)) m.dispose();
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
    // what entities tint and fade (holograms, Echoes); applied to whichever look is showing
    this.mat = { color: new THREE.Color(1, 1, 1), emissive: new THREE.Color(0, 0, 0), emissiveIntensity: 1, opacity: 1, transparent: false, depthWrite: true };
    this.anim = null;
    this.t = 0;
    this.flip = false;
    this.done = false;
    this.play(Object.keys(this.sheet.anims)[0]);
    this.build();
    this.update(0);
  }
  build() {
    if (this.look) {
      this.mesh.remove(this.look.root);
      this.look.dispose();
    }
    this.version = lookVersion;
    const tpl = look === 'toon' ? template(this.name) : null;
    this.look = tpl ? new ToonLook(this, tpl) : new ReliefLook(this);
    this.mesh.add(this.look.root);
    this.applied = null;
  }
  play(name, restart = false) {
    if (!this.sheet.anims[name]) return;
    if (this.anim === name && !restart) return;
    this.anim = name;
    this.t = 0;
    this.done = false;
  }
  update(dt) {
    if (this.version !== lookVersion) this.build();
    const a = this.sheet.anims[this.anim];
    this.t += dt;
    let f = Math.floor(this.t * a.fps);
    if (a.loop) f %= a.frames.length;
    else if (f >= a.frames.length) {
      f = a.frames.length - 1;
      this.done = true;
    }
    this.look.show(a.frames[f], dt);
    this.applyMat();
  }
  /** Copy the tint, glow and fade onto the look's materials (a hurt flash, too, for the models). */
  applyMat() {
    const p = this.mat, look = this.look;
    const flash = look instanceof ToonLook && this.anim === 'hurt' ? 0.45 + Math.sin(this.t * 40) * 0.25 : 0;
    const dim = this.anim === 'dead' ? 0.35 : 1;
    for (const m of look.surfaces) {
      m.color.copy(p.color).multiplyScalar(dim);
      m.emissive.copy(p.emissive).multiplyScalar(p.emissiveIntensity).addScalar(flash);
      m.emissiveIntensity = 1;
    }
    for (const m of [...look.surfaces, ...look.extras]) {
      if (m.transparent !== p.transparent) {
        m.transparent = p.transparent;
        m.needsUpdate = true;
      }
      m.opacity = p.opacity;
      m.depthWrite = p.depthWrite;
    }
    if (look.mats) look.mats.glow.color.copy(p.color).multiplyScalar(dim);
  }
}
