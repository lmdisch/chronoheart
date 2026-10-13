// Voxel surface materials: palette -> textured surface mapping, palette tagging,
// and the single texture-array material that draws all static world geometry.
import * as THREE from 'three';
import { getTileTextures, TILE_INDEX } from './textures.js';

/**
 * Surface definitions, keyed by level palette name. Layers name tiles in textures.js.
 *  top / side / bottom: tile per face orientation
 *  sideTop: side tile used when nothing solid sits above (grass lips)
 *  alt: [tile, chance] random per-cell side variant
 *  tint: multiplier on the tile color
 */
export const SURFACES = {
  plain: { side: 'plain' },
  sand: { side: 'sand' },
  sandstone: { side: 'sandstone', top: 'sandstone', alt: ['glyph', 0.04] },
  sandDark: { side: 'sandstoneDark', top: 'sand', tint: 0xf4e6d8 },
  grassA: { top: 'jungleTop', side: 'dirt', sideTop: 'jungleSide' },
  jungle: { side: 'jungleLeaves' },
  palm: { side: 'jungleLeaves', tint: 0xd8ffd0 },
  wood: { side: 'planks', top: 'planks' },
  log: { side: 'bark', top: 'logEnd', bottom: 'logEnd' },
  cobble: { top: 'cobble', side: 'stoneBrick' },
  curb: { top: 'curb', side: 'curb' },
  grassM: { top: 'meadowTop', side: 'dirt', sideTop: 'meadowSide' },
  leaves: { side: 'leaves' },
  autumn: { side: 'autumn' },
  plaster: { side: 'plaster', top: 'plaster' },
  timber: { side: 'timber', top: 'timber' },
  roof: { side: 'clayRoof', top: 'clayRoof' },
  roofB: { side: 'slateRoof', top: 'slateRoof' },
  thatch: { side: 'thatch', top: 'thatch' },
  stone: { side: 'stoneBrick', top: 'stoneBrick', alt: ['mossyStone', 0.06] },
  stoneMoss: { side: 'mossyStone', top: 'mossyStone' },
  dirt: { side: 'dirt', top: 'dirt' },
  metal: { side: 'metal', top: 'hexFloor', alt: ['rust', 0.05] },
  metalL: { side: 'metalLight', top: 'metalLight' },
  panel: { side: 'darkPanel', top: 'darkPanel', alt: ['windows', 0.2] },
  floorF: { side: 'metal', top: 'hexFloor' },
  overgrowth: { side: 'overgrowth', top: 'overgrowth' },
  rust: { side: 'rust', top: 'rust' },
  crate: { side: 'crate', top: 'crate' },
  skyline: { side: 'skyline', top: 'darkPanel' },
  mudBrick: { side: 'mudBrick', top: 'sand' },
  mud: { side: 'mud', top: 'mudTop' },
  salt: { side: 'salt', top: 'saltTop' },
  shingle: { side: 'shingle', top: 'shingle' },
  seaRock: { side: 'seaRock', top: 'seaRockTop' },
  drift: { side: 'drift', top: 'drift' },
  reed: { side: 'reed', top: 'reed' },
  coral: { side: 'coral', top: 'coral' },
  whitewash: { side: 'whitewash', top: 'whitewash' },
  roofSea: { side: 'seaRoof', top: 'seaRoof' },
  hull: { side: 'hull', top: 'drift' },
  rustHull: { side: 'rustHull', top: 'rustHull' },
  brass: { side: 'brass', top: 'brass' },
  wellStone: { side: 'wellStone', top: 'wellStone', alt: ['glyphSea', 0.05] },
};

export const SURFACE_NAMES = Object.keys(SURFACES);
const SURFACE_INDEX = Object.fromEntries(SURFACE_NAMES.map((n, i) => [n, i]));

// Material tag lives in bits 25..30 of a palette color (bit 24 marks "visible" in the world grid).
const TAG_SHIFT = 2 ** 25;
export const tagColor = (hex, name) => (hex & 0xffffff) + SURFACE_INDEX[name] * TAG_SHIFT;
export const surfaceOf = (hex) => Math.floor(hex / TAG_SHIFT) & 63;

/** Tag every color of every named palette with its surface. Unknown palettes stay plain. */
export function tagPalettes(C) {
  const out = {};
  for (const [k, pal] of Object.entries(C)) {
    const name = SURFACES[k] ? k : 'plain';
    out[k] = pal.map((h) => tagColor(h, name));
  }
  return out;
}

// Resolved per-surface layer indices (filled lazily).
let resolved = null;
export function surfaceLayers() {
  if (resolved) return resolved;
  resolved = SURFACE_NAMES.map((name) => {
    const s = SURFACES[name];
    const L = (t) => TILE_INDEX[t];
    const side = L(s.side);
    const tint = new THREE.Color(s.tint ?? 0xffffff);
    return {
      name,
      plain: name === 'plain',
      top: L(s.top ?? s.side),
      side,
      bottom: L(s.bottom ?? s.side),
      sideTop: s.sideTop ? L(s.sideTop) : side,
      alt: s.alt ? [L(s.alt[0]), s.alt[1]] : null,
      tint: [tint.r, tint.g, tint.b],
    };
  });
  return resolved;
}

// ---------------------------------------------------------------------------
// The voxel material
// ---------------------------------------------------------------------------
export const voxelUniforms = {
  uAlbedo: { value: null },
  uNormal: { value: null },
  uEmissive: { value: 2.2 },
  uTime: { value: 0 },
};

let voxelMat = null;
export function getVoxelMaterial() {
  if (voxelMat) return voxelMat;
  const tex = getTileTextures();
  voxelUniforms.uAlbedo.value = tex.albedo;
  voxelUniforms.uNormal.value = tex.normal;
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, voxelUniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 tileUv; attribute float layer; attribute float ao;
        varying vec2 vTileUv; varying float vLayer; varying float vAo; varying vec3 vWPos; varying vec3 vWNrm;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vTileUv = tileUv; vLayer = layer; vAo = ao;
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNrm = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform highp sampler2DArray uAlbedo; uniform highp sampler2DArray uNormal; uniform float uEmissive; uniform float uTime;
        varying vec2 vTileUv; varying float vLayer; varying float vAo; varying vec3 vWPos; varying vec3 vWNrm;
        float vh31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          float a = vh31(vec3(i,0.0)), b = vh31(vec3(i+vec2(1,0),0.0)), c = vh31(vec3(i+vec2(0,1),0.0)), d = vh31(vec3(i+vec2(1,1),0.0));
          return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 cell = floor(vWPos - vWNrm * 0.5 + 1e-3);
        // floors: random flip / transpose per cell so the tile grid never reads
        vec2 fuv = fract(vTileUv);
        vec3 orient = vec3(0.0);
        if (vWNrm.y > 0.9) {
          float oh = vh31(cell + 17.0);
          orient = step(0.5, fract(vec3(oh, oh * 7.0, oh * 13.0)));
          if (orient.x > 0.5) fuv.x = 1.0 - fuv.x;
          if (orient.y > 0.5) fuv.y = 1.0 - fuv.y;
          if (orient.z > 0.5) fuv = fuv.yx;
        } else if (abs(vWNrm.y) < 0.1) {
          // walls: random horizontal mirror per cell
          orient.x = step(0.5, vh31(cell + 5.0));
          if (orient.x > 0.5) fuv.x = 1.0 - fuv.x;
        }
        vec3 tuv = vec3(fuv, floor(vLayer + 0.5));
        vec4 texel = texture(uAlbedo, tuv);
        vec4 nrmTex = texture(uNormal, tuv);
        // per-cell tint jitter + broad macro variation so repeats don't show
        float jit = 0.93 + vh31(cell) * 0.14;
        float macro = 0.9 + vnoise(vWPos.xz * 0.11 + vWPos.y * 0.07) * 0.2;
        diffuseColor.rgb *= texel.rgb * jit * macro * vAo;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = texel.a;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 mapN = nrmTex.xyz * 2.0 - 1.0;
          if (orient.z > 0.5) mapN.xy = mapN.yx;
          if (orient.x > 0.5) mapN.x = -mapN.x;
          if (orient.y > 0.5) mapN.y = -mapN.y;
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
          vec2 st0 = dFdx(vTileUv), st1 = dFdy(vTileUv);
          vec3 q1perp = cross(q1, normal), q0perp = cross(normal, q0);
          vec3 T = q1perp * st0.x + q0perp * st1.x;
          vec3 B = q1perp * st0.y + q0perp * st1.y;
          float det = max(dot(T, T), dot(B, B));
          float sc = det == 0.0 ? 0.0 : inversesqrt(det);
          normal = normalize(T * (sc * mapN.x) + B * (sc * mapN.y) + normal * mapN.z);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += texel.rgb * nrmTex.a * uEmissive * (0.92 + 0.08 * sin(uTime * 1.7 + cell.x * 1.3 + cell.y));`,
      );
  };
  m.customProgramCacheKey = () => 'voxel-v3';
  voxelMat = m;
  return m;
}
