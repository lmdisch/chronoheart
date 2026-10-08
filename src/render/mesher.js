// Greedy voxel mesher: merges exposed faces that share a surface, tile layer and
// AO pattern into large quads with world-space tile UVs and baked vertex AO.
// Also emits textured deco boxes and sloped roofs into the same geometry.
import * as THREE from 'three';
import { hash3 } from '../core/util.js';
import { surfaceLayers, surfaceOf } from './materials.js';

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
const tmpC = new THREE.Color();

class GeoBuilder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
    this.uv = [];
    this.layer = [];
    this.ao = [];
    this.idx = [];
  }
  vert(p, n, c, uv, layer, ao) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.col.push(c[0], c[1], c[2]);
    this.uv.push(uv[0], uv[1]);
    this.layer.push(layer);
    this.ao.push(ao);
    return this.pos.length / 3 - 1;
  }
  /** Quad from 4 corners in CCW order (seen from the front). */
  quad(ps, n, c, uvs, layer, aos, flip = false) {
    const i0 = this.vert(ps[0], n, c, uvs[0], layer, aos[0]);
    const i1 = this.vert(ps[1], n, c, uvs[1], layer, aos[1]);
    const i2 = this.vert(ps[2], n, c, uvs[2], layer, aos[2]);
    const i3 = this.vert(ps[3], n, c, uvs[3], layer, aos[3]);
    if (flip) this.idx.push(i1, i2, i3, i1, i3, i0);
    else this.idx.push(i0, i1, i2, i0, i2, i3);
  }
  tri(ps, n, c, uvs, layer) {
    const i0 = this.vert(ps[0], n, c, uvs[0], layer, 1);
    const i1 = this.vert(ps[1], n, c, uvs[1], layer, 1);
    const i2 = this.vert(ps[2], n, c, uvs[2], layer, 1);
    this.idx.push(i0, i1, i2);
  }
  build() {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('tileUv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('layer', new THREE.Float32BufferAttribute(this.layer, 1));
    g.setAttribute('ao', new THREE.Float32BufferAttribute(this.ao, 1));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** World-space tile UV for an axis-aligned face. d = axis (0 x, 1 y, 2 z), s = ±1. */
function faceUv(p, d, s) {
  if (d === 0) return [s > 0 ? -p[2] : p[2], p[1]];
  if (d === 1) return [p[0], s > 0 ? -p[2] : p[2]];
  return [s > 0 ? p[0] : -p[0], p[1]];
}

function rgbOf(hex) {
  tmpC.setHex(hex & 0xffffff);
  return [tmpC.r, tmpC.g, tmpC.b];
}

/** Colour + layer for a palette colour on a given face. */
function surfaceFor(hex, faceKind) {
  const S = surfaceLayers()[surfaceOf(hex)] || surfaceLayers()[0];
  const layer = faceKind === 'top' ? S.top : faceKind === 'bottom' ? S.bottom : faceKind === 'sideTop' ? S.sideTop : S.side;
  return { S, layer, color: S.plain ? rgbOf(hex) : S.tint };
}

/**
 * Greedy-mesh voxels in [lo, hi) using get(x,y,z) -> tagged colour (0 = empty).
 * Faces are culled against neighbours outside the region too, so chunks seam cleanly.
 * occ(x,y,z) decides occupancy for culling/AO (defaults to get).
 */
export function meshVoxels(get, lo, hi, gb = new GeoBuilder(), occ = get) {
  const layers = surfaceLayers();
  const solid = (x, y, z) => (occ(x, y, z) ? 1 : 0);
  const p = [0, 0, 0], q = [0, 0, 0];
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const nu = hi[u] - lo[u], nv = hi[v] - lo[v];
    const mask = new Float64Array(nu * nv);
    const meta = new Array(nu * nv);
    for (const s of [1, -1]) {
      for (let i = lo[d]; i < hi[d]; i++) {
        mask.fill(0);
        for (let b = 0; b < nv; b++)
          for (let a = 0; a < nu; a++) {
            p[d] = i; p[u] = lo[u] + a; p[v] = lo[v] + b;
            const c = get(p[0], p[1], p[2]);
            if (!c) continue;
            q[0] = p[0]; q[1] = p[1]; q[2] = p[2];
            q[d] += s;
            if (solid(q[0], q[1], q[2])) continue;
            // AO from the cells in front of the face
            const f = q;
            const occ = (du, dv) => {
              const o = [f[0], f[1], f[2]];
              o[u] += du; o[v] += dv;
              return solid(o[0], o[1], o[2]);
            };
            const aoAt = (du, dv) => {
              const s1 = occ(du, 0), s2 = occ(0, dv);
              return s1 && s2 ? 0 : 3 - (s1 + s2 + occ(du, dv));
            };
            const a0 = aoAt(-1, -1), a1 = aoAt(1, -1), a2 = aoAt(1, 1), a3 = aoAt(-1, 1);
            const aoBits = a0 | (a1 << 2) | (a2 << 4) | (a3 << 6);
            // pick the tile for this face
            const surf = surfaceOf(c);
            const S = layers[surf] || layers[0];
            let layer;
            if (d === 1) layer = s > 0 ? S.top : S.bottom;
            else {
              layer = solid(p[0], p[1] + 1, p[2]) ? S.side : S.sideTop;
              if (S.alt && layer === S.side && hash3(p[0] * 7 + 3, p[1] * 13, p[2] * 5 + d) < S.alt[1]) layer = S.alt[0];
            }
            const rgb = S.plain ? c & 0xffffff : 0;
            const key = ((surf * 64 + layer) * 256 + aoBits) * 16777216 + rgb + 1;
            const k = a + b * nu;
            mask[k] = key;
            meta[k] = { S, layer, rgb, ao: [a0, a1, a2, a3] };
          }
        // greedy merge
        for (let b = 0; b < nv; b++)
          for (let a = 0; a < nu; ) {
            const key = mask[a + b * nu];
            if (!key) {
              a++;
              continue;
            }
            let w = 1;
            while (a + w < nu && mask[a + w + b * nu] === key) w++;
            let h = 1;
            outer: while (b + h < nv) {
              for (let k = 0; k < w; k++) if (mask[a + k + (b + h) * nu] !== key) break outer;
              h++;
            }
            const m = meta[a + b * nu];
            emitFace(gb, d, u, v, s, i, lo[u] + a, lo[v] + b, w, h, m);
            for (let hh = 0; hh < h; hh++) for (let k = 0; k < w; k++) mask[a + k + (b + hh) * nu] = 0;
            a += w;
          }
      }
    }
  }
  return gb;
}

function emitFace(gb, d, u, v, s, i, ua, va, w, h, m) {
  const plane = s > 0 ? i + 1 : i;
  const corner = (du, dv) => {
    const c = [0, 0, 0];
    c[d] = plane;
    c[u] = ua + du;
    c[v] = va + dv;
    return c;
  };
  let ps = [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h)];
  let ao = m.ao.map((x) => AO_CURVE[x]);
  if (s < 0) {
    ps = [ps[0], ps[3], ps[2], ps[1]];
    ao = [ao[0], ao[3], ao[2], ao[1]];
  }
  const n = [0, 0, 0];
  n[d] = s;
  const color = m.S.plain ? rgbOf(m.rgb) : m.S.tint;
  const uvs = ps.map((pp) => faceUv(pp, d, s));
  gb.quad(ps, n, color, uvs, m.layer, ao, ao[0] + ao[2] < ao[1] + ao[3]);
}

/** Textured box (visual-only deco). Box: [cx, cy, cz, sx, sy, sz, color]. */
export function meshBox(gb, box) {
  const [cx, cy, cz, sx, sy, sz, hex] = box;
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
  const grounded = Math.abs(y0 - Math.round(y0)) < 0.02;
  const bottomAo = grounded ? 0.72 : 0.92;
  const faces = [
    // [normal, corners CCW]
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 'side'],
    [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], 'side'],
    [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], 'side'],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 'side'],
    [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 'top'],
  ];
  if (!grounded) faces.push([[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 'bottom']);
  for (const [n, ps, kind] of faces) {
    const { layer, color } = surfaceFor(hex, kind);
    const d = n[0] ? 0 : n[1] ? 1 : 2;
    const s = n[d];
    const uvs = ps.map((pp) => faceUv(pp, d, s));
    const ao = ps.map((pp) => (kind === 'side' && pp[1] === y0 ? bottomAo : 1));
    gb.quad(ps, n, color, uvs, layer, ao);
  }
}

/**
 * Gabled roof with the ridge along x.
 * r: { x0, x1, y0, zBack, zFront, ridgeY, ridgeZ, color, gable }
 */
export function meshRoof(gb, r) {
  const { x0, x1, y0, zBack, zFront, ridgeY, ridgeZ, color, gable } = r;
  const slope = (zA, zB) => {
    // eave at zA (y0), ridge at zB (ridgeY)
    const dz = zB - zA, dy = ridgeY - y0;
    const len = Math.hypot(dz, dy);
    const n = [0, Math.abs(dz) / len, (dz > 0 ? -dy : dy) / len];
    const { layer, color: c } = surfaceFor(color, 'top');
    const front = dz < 0; // front slope runs toward -z as it rises
    let ps = [[x0, y0, zA], [x1, y0, zA], [x1, ridgeY, zB], [x0, ridgeY, zB]];
    let uvs = [[x0, 0], [x1, 0], [x1, len], [x0, len]];
    if (!front) {
      ps = [ps[1], ps[0], ps[3], ps[2]];
      uvs = [[-x1, 0], [-x0, 0], [-x0, len], [-x1, len]];
    }
    gb.quad(ps, n, c, uvs, layer, [0.8, 0.8, 1, 1]);
    // eave thickness strip
    const t = 0.18;
    const { layer: l2, color: c2 } = surfaceFor(color, 'side');
    const e = front ? [[x0, y0 - t, zA], [x1, y0 - t, zA], [x1, y0, zA], [x0, y0, zA]] : [[x1, y0 - t, zA], [x0, y0 - t, zA], [x0, y0, zA], [x1, y0, zA]];
    gb.quad(e, [0, 0, front ? 1 : -1], c2, e.map((pp) => [front ? pp[0] : -pp[0], pp[1]]), l2, [0.7, 0.7, 0.85, 0.85]);
  };
  slope(zFront, ridgeZ);
  slope(zBack, ridgeZ);
  // gable ends
  const g = gable ?? color;
  for (const [x, sgn] of [[x0, -1], [x1, 1]]) {
    const { layer, color: c } = surfaceFor(g, 'side');
    let ps = [[x, y0, zFront], [x, ridgeY, ridgeZ], [x, y0, zBack]];
    if (sgn < 0) ps = [ps[0], ps[1], ps[2]];
    else ps = [ps[2], ps[1], ps[0]];
    const n = [sgn, 0, 0];
    gb.tri(ps, n, c, ps.map((pp) => faceUv(pp, 0, sgn)), layer);
  }
}

export { GeoBuilder };
