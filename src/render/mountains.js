// Mountains as terrain, not cones: a heightfield built from ridged noise (sharp crests, long
// gullies, the look of real high peaks), lit and shaded like the rest of the world, with snow
// lying where the slope is gentle enough to hold it and bare rock on the steep faces. A chapter
// gives the height of the land everywhere (heightAt), the part of it its voxels already cover
// (hole), and colors for each age; the grid is finest near the middle and coarser toward the
// horizon, where the haze takes over anyway.
import * as THREE from 'three';

// ---------------------------------------------------------------------------- noise
const PERM = new Uint8Array(512);
{
  let s = 1337;
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth gradient noise, roughly -1..1. */
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const g = (i, j, dx, dy) => {
    const v = GRAD[PERM[PERM[X + i] + Y + j] & 7];
    return v[0] * dx + v[1] * dy;
  };
  const u = fade(xf), v = fade(yf);
  const a = g(0, 0, xf, yf) + u * (g(1, 0, xf - 1, yf) - g(0, 0, xf, yf));
  const b = g(0, 1, xf, yf - 1) + u * (g(1, 1, xf - 1, yf - 1) - g(0, 1, xf, yf - 1));
  return (a + v * (b - a)) * 1.4;
}

/** Ridged multifractal noise, 0..~1: knife-edge crests where plain noise crosses zero. */
export function ridged(x, y, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, weight = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * freq + i * 19.1, y * freq - i * 7.3));
    n *= n;
    n *= weight;
    weight = Math.min(1, Math.max(0, n * 2));
    sum += n * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

/** Plain fractal noise, -1..1. */
export function fbm(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq + i * 31.7, y * freq + i * 11.3) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------- the terrain mesh
/** Grid lines: fine from a to b, then wider and wider out to lo and hi (a and b themselves included). */
function axis(lo, a, b, hi, fine) {
  const out = [];
  for (let v = a; v < b; v += fine) out.push(v);
  out.push(b);
  for (let v = b, s = fine; v < hi; ) {
    s *= 1.045;
    v += s;
    out.push(v);
  }
  const left = [];
  for (let v = a, s = fine; v > lo; ) {
    s *= 1.045;
    v -= s;
    left.push(v);
  }
  return [...left.reverse(), ...out];
}

/**
 * opts: {
 *   heightAt(x, z)           the land's height
 *   hole(x, z)               true where the voxel world already is (no terrain drawn there)
 *   bounds: [x0, x1, z0, z1] the whole sheet; fine: [x0, x1, z0, z1] its finest part (lines fall on these)
 *   step                     grid spacing in the finest part
 *   colors: per age { sun: [x, y, z], snowLit, snowShade, rockLit, rockShade, low, haze }
 *   snowLine                 no snow below this height; lowLine: valley land below this
 * }
 * Returns three meshes (one per age), sharing one shape.
 */
export function terrainMeshes(opts) {
  const [X0, X1, Z0, Z1] = opts.bounds;
  const [fx0, fx1, fz0, fz1] = opts.fine;
  const xs = axis(X0, fx0, fx1, X1, opts.step);
  const zs = axis(Z0, fz0, fz1, Z1, opts.step);
  if (opts.blocks) return blockMeshes(opts, xs, zs);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const hs = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, h = opts.heightAt(xs[i], zs[j]);
      hs[k] = h;
      pos.set([xs[i], h, zs[j]], k * 3);
    }
  const idx = [];
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (opts.hole((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)) continue;
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      // split each cell along whichever diagonal keeps a crest a crest
      if (Math.abs(hs[a] - hs[d]) < Math.abs(hs[b] - hs[c])) idx.push(a, c, d, a, d, b);
      else idx.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;

  // what each point is, the same in every age: how much snow it holds, how deep in a gully, how far below the clouds
  const mask = new Float32Array(nx * nz * 3);
  for (let k = 0; k < nx * nz; k++) {
    const x = pos[k * 3], h = hs[k], z = pos[k * 3 + 2], ny = nrm.getY(k);
    const streak = fbm(x * 0.05, z * 0.05, 3);
    const hold = (ny - 0.5 - streak * 0.16 - Math.max(0, 30 - h) * 0.004) / 0.16;
    const line = (h - opts.snowLine) / 14;
    let snow = Math.min(1, Math.max(0, hold)) * Math.min(1, Math.max(0, line));
    if (h > opts.snowLine + 70) snow = Math.max(snow, Math.min(1, (h - opts.snowLine - 70) / 60) * 0.7); // the high crests: cornices
    const dark = Math.min(1, Math.max(0, 0.45 - streak * 1.5));
    const low = Math.min(1, Math.max(0, (opts.lowLine - h) / 6));
    mask.set([snow, dark, low], k * 3);
  }
  geo.setAttribute('mask', new THREE.BufferAttribute(mask, 3));
  return opts.colors.map((pal) => {
    const mesh = new THREE.Mesh(geo, terrainMaterial(pal));
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    return mesh;
  });
}

/**
 * The same land as columns of blocks, the way the voxel world near at hand is built: a flat top on
 * each cell of the grid (its height stepped to opts.step), and a cliff down each side that drops to
 * a lower neighbor. The blocks grow with the grid toward the horizon. Cells that stay under the
 * clouds (below opts.under) are left out, unless opts.keep(x, z) wants them (an opening).
 */
function blockMeshes(opts, xs, zs) {
  const nx = xs.length - 1, nz = zs.length - 1, q = opts.step;
  const tops = new Float32Array(nx * nz).fill(NaN);
  const snowOf = new Float32Array(nx * nz), darkOf = new Float32Array(nx * nz), lowOf = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = (xs[i] + xs[i + 1]) / 2, z = (zs[j] + zs[j + 1]) / 2;
      if (opts.hole(x, z)) continue;
      const h = opts.heightAt(x, z);
      if (opts.under !== undefined && h < opts.under && !opts.keep?.(x, z)) continue;
      const k = j * nx + i;
      tops[k] = Math.round(h / q) * q;
      // how much snow it holds: by how steep the land is round it, and how high
      const e = Math.max(q, (xs[i + 1] - xs[i]) * 0.5);
      const gx = (opts.heightAt(x + e, z) - opts.heightAt(x - e, z)) / (2 * e), gz = (opts.heightAt(x, z + e) - opts.heightAt(x, z - e)) / (2 * e);
      const ny = 1 / Math.hypot(gx, gz, 1);
      const streak = fbm(x * 0.05, z * 0.05, 3);
      const hold = (ny - 0.5 - streak * 0.16 - Math.max(0, 30 - h) * 0.004) / 0.16;
      let snow = Math.min(1, Math.max(0, hold)) * Math.min(1, Math.max(0, (h - opts.snowLine) / 14));
      if (h > opts.snowLine + 70) snow = Math.max(snow, Math.min(1, (h - opts.snowLine - 70) / 60) * 0.7);
      snowOf[k] = snow > 0.5 ? 1 : snow > 0.25 ? 0.6 : 0;
      darkOf[k] = Math.min(1, Math.max(0, 0.45 - streak * 1.5));
      lowOf[k] = Math.min(1, Math.max(0, (opts.lowLine - h) / 6));
    }
  const pos = [], nrm = [], mask = [], idx = [];
  const quad = (ps, n, m) => {
    const b = pos.length / 3;
    for (const p of ps) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(n[0], n[1], n[2]);
      mask.push(m[0], m[1], m[2]);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const FLOOR = -40;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, t = tops[k];
      if (Number.isNaN(t)) continue;
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
      quad([[x0, t, z1], [x1, t, z1], [x1, t, z0], [x0, t, z0]], [0, 1, 0], [snowOf[k], darkOf[k], lowOf[k]]);
      // a cliff down to each lower neighbor (snow lies on its lip, bare rock below)
      const side = (ni, nj, ps, n) => {
        const inside = ni >= 0 && nj >= 0 && ni < nx && nj < nz;
        const kn = nj * nx + ni;
        let b = inside ? tops[kn] : FLOOR;
        if (inside && Number.isNaN(b)) {
          const cx = (xs[ni] + xs[ni + 1]) / 2, cz = (zs[nj] + zs[nj + 1]) / 2;
          if (opts.hole(cx, cz)) return; // (the voxels take over there)
          b = FLOOR;
        }
        if (b >= t) return;
        const lip = Math.max(b, t - q * 0.4);
        const m = [0, Math.min(1, darkOf[k] + 0.25), lowOf[k]];
        if (snowOf[k] > 0 && lip > b) {
          quad(ps(lip, t), n, [snowOf[k], darkOf[k], lowOf[k]]);
          quad(ps(b, lip), n, m);
        } else quad(ps(b, t), n, m);
      };
      side(i, j + 1, (lo, hi) => [[x0, lo, z1], [x1, lo, z1], [x1, hi, z1], [x0, hi, z1]], [0, 0, 1]);
      side(i, j - 1, (lo, hi) => [[x1, lo, z0], [x0, lo, z0], [x0, hi, z0], [x1, hi, z0]], [0, 0, -1]);
      side(i + 1, j, (lo, hi) => [[x1, lo, z1], [x1, lo, z0], [x1, hi, z0], [x1, hi, z1]], [1, 0, 0]);
      side(i - 1, j, (lo, hi) => [[x0, lo, z0], [x0, lo, z1], [x0, hi, z1], [x0, hi, z0]], [-1, 0, 0]);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('mask', new THREE.Float32BufferAttribute(mask, 3));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  return opts.colors.map((pal) => {
    const mesh = new THREE.Mesh(geo, terrainMaterial({ ...pal, blocks: true }));
    mesh.frustumCulled = false;
    return mesh;
  });
}

// ---------------------------------------------------------------------------- the terrain's look
const terrainVert = `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec3 mask;
  varying vec3 vMask; varying vec3 vN; varying vec3 vW;
  void main(){
    vMask = mask;
    vN = normal;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const terrainFrag = `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uSun; uniform vec3 uSnowLit; uniform vec3 uSnowShade; uniform vec3 uRockLit; uniform vec3 uRockShade;
  uniform vec3 uLow; uniform vec3 uHaze; uniform float uCloudY; uniform float uBlocks;
  varying vec3 vMask; varying vec3 vN; varying vec3 vW;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main(){
    vec3 n = normalize(vN);
    float l = dot(n, normalize(uSun));
    if (uBlocks > 0.5) {
      // blocks: lit by face, as the voxels are; tops a little brighter, and a grain of big pixels over all of it
      l = n.y > 0.5 ? max(l, 0.35) : l;
    }
    // light that wraps a little round the edges, and faces turned away fall into cool shadow
    float lit = smoothstep(-0.15, 0.55, l);
    vec3 snow = mix(uSnowShade, uSnowLit, lit) * (0.92 + 0.12 * n.y);
    vec3 rock = mix(uRockShade, uRockLit, lit * 0.9);
    vec3 col = mix(rock * (1.0 - vMask.y * 0.45), snow, vMask.x);
    col = mix(col, uLow * (0.6 + 0.4 * lit), vMask.z);
    if (uBlocks > 0.5) {
      vec3 cell = floor(vW * 1.25 + n * 0.01);
      col *= 0.9 + 0.16 * hash(cell);
    }
    // the air: low down, near the cloud sea, everything softens toward it
    float haze = 1.0 - smoothstep(uCloudY, uCloudY + 40.0, vW.y);
    col = mix(col, uHaze, haze * 0.45);
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

function terrainMaterial(pal) {
  const c = (h) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uSun: { value: new THREE.Vector3(...pal.sun).normalize() },
        uSnowLit: { value: c(pal.snowLit) }, uSnowShade: { value: c(pal.snowShade) },
        uRockLit: { value: c(pal.rockLit) }, uRockShade: { value: c(pal.rockShade) },
        uLow: { value: c(pal.low) }, uHaze: { value: c(pal.haze) }, uCloudY: { value: pal.cloudY ?? -9 }, uBlocks: { value: pal.blocks ? 1 : 0 },
      },
    ]),
    vertexShader: terrainVert,
    fragmentShader: terrainFrag,
    fog: true,
  });
}
