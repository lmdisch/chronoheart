// Foliage: instanced crossed-quad grass tufts / flowers that sway in the wind,
// and tree canopies built from leaf-clump cards that cast dappled shadows.
import * as THREE from 'three';
import { makeRng, hash3 } from '../core/util.js';
import { rampCss } from './textures.js';

export const foliageUniforms = { uTime: { value: 0 } };

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

function pixelTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Tuft atlas: 8 cells of 16x16.
export const TUFT = { grassA: 0, grassB: 1, fronds: 2, flowerY: 3, flowerP: 4, flowerW: 5, flowerV: 6, moss: 7 };
let tuftTex = null;
function getTuftTexture() {
  if (tuftTex) return tuftTex;
  const { c, g } = canvas(128, 16);
  const rng = makeRng(42);
  const px = (x, y, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  // grass is drawn near-white so instance color sets the hue
  const G = ['#7d8a78', '#a3b09c', '#c8d2c0', '#e9efe2', '#ffffff'];
  const blade = (ox, x0, h, lean, ramp = G) => {
    let x = x0;
    for (let i = 0; i < h; i++) {
      const y = 15 - i;
      const t = i / h;
      px(ox + Math.round(x), y, ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]);
      if (i < h * 0.4) px(ox + Math.round(x) + 1, y, ramp[0]);
      x += lean * (0.15 + t * 0.4);
    }
  };
  for (const [cell, n, hMin, hMax] of [[0, 7, 5, 9], [1, 9, 6, 12]]) {
    const ox = cell * 16;
    for (let k = 0; k < n; k++) blade(ox, 3 + rng() * 10, rng.int(hMin, hMax), (rng() - 0.5) * 1.6);
  }
  // fronds: long arching leaves
  {
    const ox = 32;
    for (let k = 0; k < 6; k++) {
      const dir = k % 2 ? 1 : -1;
      let x = 7.5 + (rng() - 0.5) * 2, y = 15;
      const len = rng.int(9, 14);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        px(ox + Math.round(x), Math.round(y), G[Math.min(4, Math.floor((1 - Math.abs(t - 0.6)) * 5))]);
        px(ox + Math.round(x) + dir, Math.round(y) + 1, G[1]);
        y -= 1.1 - t * 0.9;
        x += dir * (0.2 + t * 0.9);
      }
    }
  }
  // flowers: green stems with colored heads (stems drawn green, so instance color stays white-ish)
  const heads = [
    ['#f7d84a', '#fff3a0', '#c99a20'],
    ['#f07aa8', '#ffc0d8', '#b8406a'],
    ['#f4f4f0', '#ffffff', '#b8b8c8'],
    ['#a07af0', '#d0b8ff', '#6a4ab8'],
  ];
  heads.forEach((hc, i) => {
    const ox = (3 + i) * 16;
    for (let k = 0; k < 3; k++) {
      const x = 4 + k * 4 + rng.int(-1, 1);
      const h = rng.int(5, 9);
      for (let y = 0; y < h; y++) px(ox + x, 15 - y, y < 2 ? '#3f6a2a' : '#5a8a3a');
      px(ox + x - 1, 15 - h + 2, '#6a9a42');
      const hy = 15 - h;
      px(ox + x, hy - 1, hc[0]);
      px(ox + x - 1, hy, hc[0]);
      px(ox + x + 1, hy, hc[2]);
      px(ox + x, hy + 1, hc[2]);
      px(ox + x, hy, hc[1]);
    }
  });
  // glowing moss / fungus sprigs
  {
    const ox = 112;
    for (let k = 0; k < 5; k++) {
      const x = 3 + k * 2.4;
      const h = rng.int(2, 6);
      for (let y = 0; y < h; y++) px(ox + Math.round(x), 15 - y, '#4a8a6a');
      px(ox + Math.round(x), 15 - h, '#c8fff0');
      px(ox + Math.round(x) + 1, 15 - h, '#7affd8');
    }
  }
  tuftTex = pixelTex(c);
  return tuftTex;
}

// Leaf-clump atlas: 4 cells of 32x32, grayscale (instance color tints them).
let leafTex = null;
function getLeafTexture() {
  if (leafTex) return leafTex;
  const { c, g } = canvas(128, 32);
  const rng = makeRng(7);
  const R = rampCss(0xb8b8b0, 6, 0.55, 0.03); // dark -> light grays
  const leaf = (ox, cx, cy, s) => {
    // small pixel leaf: dark rim, lit top-left
    for (let y = -s; y <= s; y++)
      for (let x = -s - 1; x <= s + 1; x++) {
        const d = (x * x) / ((s + 1) * (s + 1)) + (y * y) / (s * s);
        if (d > 1) continue;
        const lit = -(x + y) / (2 * s + 1);
        const idx = d > 0.7 ? 0 : Math.max(1, Math.min(5, Math.round(2.6 + lit * 3)));
        g.fillStyle = R[idx];
        g.fillRect(ox + cx + x, cy + y, 1, 1);
      }
  };
  for (let cell = 0; cell < 4; cell++) {
    const ox = cell * 32;
    const n = 26 + cell * 4;
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 11;
      pts.push([16 + Math.cos(a) * r, 16 + Math.sin(a) * r * 0.85]);
    }
    // draw back-to-front (lower leaves first, so upper ones overlap)
    pts.sort((p, q) => q[1] - p[1]);
    for (const [x, y] of pts) leaf(ox, Math.round(x), Math.round(y), rng.int(1, 3));
  }
  leafTex = pixelTex(c);
  return leafTex;
}

// ---------------------------------------------------------------------------
// Shader patch shared by tufts and leaf cards
// ---------------------------------------------------------------------------
function patchFoliage(mat, { cells, sway, heightShade, glow = 0 }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = foliageUniforms.uTime;
    sh.uniforms.uGlow = { value: glow };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime; attribute float aTile; attribute vec3 aNormal; varying float vH;`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
          vMapUv = vec2((uv.x + aTile) / ${cells.toFixed(1)}, uv.y);
        #endif
        vH = uv.y;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float s = sin(uTime * 1.9 + ip.x * 0.6 + ip.z * 0.4) * 0.6 + sin(uTime * 3.7 + ip.x * 1.7) * 0.25;
          float g = sin(uTime * 0.6 + ip.x * 0.12) * 0.5 + 0.5; // gust envelope
          transformed.x += s * ${sway.toFixed(3)} * (0.5 + g) * uv.y;
          transformed.z += s * ${(sway * 0.5).toFixed(3)} * uv.y;
        }`,
      )
      .replace(
        '#include <defaultnormal_vertex>',
        `#include <defaultnormal_vertex>
        transformedNormal = normalize(normalMatrix * aNormal);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow; varying float vH;')
      .replace(
        '#include <normal_fragment_begin>',
        // ignore back-face flipping: foliage normals come from aNormal
        `#include <normal_fragment_begin>
        normal = normalize(vNormal);`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        ${heightShade ? 'diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.7, vH));' : ''}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uGlow * smoothstep(0.5, 1.0, vH);`,
      );
  };
  mat.customProgramCacheKey = () => `foliage-${cells}-${sway}-${heightShade}-${glow}`;
}

function crossedQuadGeo(w, h) {
  const a = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  const c = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(Math.PI / 4);
  const d = c.clone().rotateY(Math.PI / 2);
  const merged = mergeGeos([a, b, c, d]);
  return merged;
}

function mergeGeos(list) {
  const pos = [], uv = [], idx = [];
  let off = 0;
  for (const g of list) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------
// Grass tufts & flowers
// ---------------------------------------------------------------------------
const GRASS_STYLE = {
  // surface name -> scatter rules
  grassM: { per: 3, tiles: [TUFT.grassA, TUFT.grassB], flowers: 0.16, flowerTiles: [TUFT.flowerY, TUFT.flowerP, TUFT.flowerW, TUFT.flowerV], cols: [0x7aa843, 0x86b04a, 0x6f9e3c, 0x94b850], h: [0.45, 0.7] },
  grassA: { per: 3, tiles: [TUFT.grassB, TUFT.fronds, TUFT.grassA], flowers: 0.05, flowerTiles: [TUFT.flowerY, TUFT.flowerW], cols: [0x8aae48, 0x9ab852, 0x6f9a3a, 0x5a8a3a], h: [0.55, 0.95] },
  overgrowth: { per: 1, tiles: [TUFT.moss, TUFT.grassA], flowers: 0, cols: [0x4aa06a, 0x3f8f5a, 0x5ab08a], h: [0.4, 0.6] },
};

/**
 * Scatter tufts over exposed grass tops.
 * tops: [{x, y, z, surface}] where (x, y, z) is the cell whose top face is exposed.
 */
export function buildTufts(tops, era) {
  const rng = makeRng(900 + era);
  const inst = [];
  for (const t of tops) {
    const st = GRASS_STYLE[t.surface];
    if (!st) continue;
    const inPlay = t.z >= 0 && t.z < 7;
    const per = inPlay ? Math.max(0, st.per - 2) : st.per;
    const n = per + (hash3(t.x, t.z, era) < 0.5 ? 1 : 0) - (st.per === 1 && hash3(t.z, t.x, 9) < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const flower = rng() < st.flowers;
      inst.push({
        x: t.x + 0.1 + rng() * 0.8,
        y: t.y + 1,
        z: t.z + 0.1 + rng() * 0.8,
        tile: flower ? rng.pick(st.flowerTiles) : rng.pick(st.tiles),
        col: flower ? 0xffffff : rng.pick(st.cols),
        s: (st.h[0] + rng() * (st.h[1] - st.h[0])) * (inPlay ? 0.75 : 1),
        rot: rng() * Math.PI,
      });
    }
  }
  if (!inst.length) return null;
  const geo = crossedQuadGeo(1, 1);
  const tile = new Float32Array(inst.length);
  const nrm = new Float32Array(inst.length * 3);
  const mat = new THREE.MeshStandardMaterial({
    map: getTuftTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, metalness: 0,
  });
  patchFoliage(mat, { cells: 8, sway: 0.16, heightShade: true, glow: era === 2 ? 1.6 : 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, inst.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  inst.forEach((it, i) => {
    q.setFromAxisAngle(up, it.rot);
    p.set(it.x, it.y, it.z);
    s.set(it.s, it.s, it.s);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    c.setHex(it.col);
    mesh.setColorAt(i, c);
    tile[i] = it.tile;
    nrm[i * 3 + 1] = 1;
  });
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1));
  geo.setAttribute('aNormal', new THREE.InstancedBufferAttribute(nrm, 3));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Canopies
// ---------------------------------------------------------------------------
/**
 * canopies: [{x, y, z, r, cols:[hex], seed, squash}] -> one instanced mesh of leaf cards.
 */
export function buildCanopies(canopies, era) {
  const cards = [];
  for (const cp of canopies) {
    const rng = makeRng(cp.seed ?? Math.floor(cp.x * 131 + cp.z * 17 + 3));
    const ry = cp.r * (cp.squash ?? 0.8);
    const n = Math.round(cp.r * cp.r * cp.r * 3.2 + 8);
    for (let k = 0; k < n; k++) {
      // point in ellipsoid, biased to the shell
      let dx, dy, dz, d;
      do {
        dx = rng() * 2 - 1;
        dy = rng() * 2 - 1;
        dz = rng() * 2 - 1;
        d = dx * dx + dy * dy + dz * dz;
      } while (d > 1);
      const shell = 0.55 + Math.sqrt(d) * 0.45;
      const lx = dx * cp.r * shell, ly = dy * ry * shell, lz = dz * cp.r * shell;
      if (cp.maxZ !== undefined && cp.z + lz > cp.maxZ) continue;
      const nv = new THREE.Vector3(lx / cp.r, ly / ry + 0.35, lz / cp.r).normalize();
      // light the top, darken the underside
      const shade = 0.62 + (dy * 0.5 + 0.5) * 0.45 + dz * 0.08;
      const col = new THREE.Color(rng.pick(cp.cols)).multiplyScalar(shade);
      cards.push({ x: cp.x + lx, y: cp.y + ly, z: cp.z + lz, n: nv, col, s: 1.0 + rng() * 0.7, roll: rng() * Math.PI * 2, tile: rng.int(0, 3) });
    }
  }
  if (!cards.length) return null;
  const geo = new THREE.PlaneGeometry(1, 1);
  const tile = new Float32Array(cards.length);
  const nrm = new Float32Array(cards.length * 3);
  const mat = new THREE.MeshStandardMaterial({ map: getLeafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  patchFoliage(mat, { cells: 4, sway: 0.05, heightShade: false, glow: era === 2 ? 0.25 : 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, cards.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  // face the diorama camera (pitched ~32 degrees down)
  const face = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0));
  const zAxis = new THREE.Vector3(0, 0, 1);
  cards.forEach((cd, i) => {
    qr.setFromAxisAngle(zAxis, cd.roll);
    q.copy(face).multiply(qr);
    p.set(cd.x, cd.y, cd.z);
    s.set(cd.s, cd.s, cd.s);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, cd.col);
    tile[i] = cd.tile;
    nrm.set([cd.n.x, cd.n.y, cd.n.z], i * 3);
  });
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1));
  geo.setAttribute('aNormal', new THREE.InstancedBufferAttribute(nrm, 3));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  // shadow pass: alpha-tested so the shadows are dappled
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: getLeafTexture(), alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking });
  patchDepthAtlas(mesh.customDepthMaterial, 4);
  return mesh;
}

function patchDepthAtlas(mat, cells) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTile;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((uv.x + aTile) / ${cells.toFixed(1)}, uv.y);\n#endif`);
  };
  mat.customProgramCacheKey = () => 'leafdepth' + cells;
}
