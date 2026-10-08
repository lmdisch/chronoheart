// Shader water: pixel-quantised ripples, shore foam from a per-body shore mask,
// depth tint, sun glints. Toxic variant bubbles and glows.
import * as THREE from 'three';

export const waterUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunCol: { value: new THREE.Color(1, 1, 1) },
  uSky: { value: new THREE.Color(0.6, 0.8, 1) },
};

const vert = `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWPos; varying vec3 vWNrm;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vWNrm = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const frag = `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSky;
  uniform vec3 uShallow; uniform vec3 uDeep; uniform sampler2D uShore; uniform vec4 uShoreRect;
  uniform float uTop; uniform float uDepth; uniform float uToxic; uniform float uAlpha;
  varying vec3 vWPos; varying vec3 vWNrm;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  void main(){
    float t = uTime;
    vec3 col; float a = uAlpha;
    vec3 V = normalize(cameraPosition - vWPos);
    if (vWNrm.y > 0.5) {
      vec2 pq = (floor(vWPos.xz * 16.0) + 0.5) / 16.0; // 16 px per unit
      float shore = texture2D(uShore, (pq - uShoreRect.xy) / uShoreRect.zw).r;
      float w = sin(pq.x * 3.1 + t * 1.3 + sin(pq.y * 2.3 + t * 0.7) * 1.6) + sin(pq.y * 4.7 - t * 1.1 + pq.x * 1.3) * 0.8 + (vn(pq * 2.0 + t * 0.3) - 0.5) * 1.2;
      col = mix(uDeep, uShallow, clamp(shore * 0.8 + 0.15 + w * 0.05, 0.0, 1.0));
      // ripple bands
      col = mix(col, uShallow * 1.35 + 0.05, step(1.45, w) * 0.7);
      col *= 1.0 - step(w, -1.55) * 0.18;
      // sky reflection at grazing angles
      float fres = pow(1.0 - max(V.y, 0.0), 3.0);
      col = mix(col, uSky, fres * 0.45 * (1.0 - uToxic));
      // foam
      float fn = vn(pq * 5.0 + vec2(t * 0.6, -t * 0.4));
      float f = shore + (fn - 0.5) * 0.45 + sin(t * 2.0 + pq.x * 2.0) * 0.05;
      vec3 foamCol = mix(vec3(0.95, 0.98, 1.0), vec3(0.75, 1.0, 0.6), uToxic);
      col = mix(col, foamCol * 0.85, step(0.34, f) * 0.45);
      col = mix(col, foamCol, step(0.5, f));
      a = mix(a, 1.0, step(0.34, f));
      // sun glint sparkles
      vec2 cell = floor(vWPos.xz * 16.0);
      float tw = h21(cell + floor(t * 4.0 + h21(cell) * 8.0));
      vec3 H = normalize(normalize(uSunDir) + V);
      float spec = pow(max(dot(vec3(0.0, 1.0, 0.0), H), 0.0), 40.0);
      col += uSunCol * step(0.985 - spec * 0.03, tw) * (0.6 + spec) * (1.0 - uToxic * 0.5) * step(w, 0.8);
      if (uToxic > 0.5) {
        // rising bubbles that pop into rings
        vec2 bc = floor(vWPos.xz * 2.0);
        float ph = fract(t * 0.45 + h21(bc) * 7.0);
        vec2 ctr = (bc + 0.25 + 0.5 * vec2(h21(bc + 3.1), h21(bc + 7.7))) / 2.0;
        float r = ph * 0.22;
        float dd = length(pq - ctr);
        float ring = step(abs(dd - r), 0.04) * step(0.15, ph) * (1.0 - ph);
        float blob = step(dd, 0.07 * (1.0 - ph)) * step(ph, 0.25);
        col += vec3(0.6, 1.0, 0.4) * (ring + blob) * 1.0;
        col += uShallow * 0.3 * (0.6 + 0.4 * sin(t * 2.0 + vWPos.x * 0.7));
      }
    } else {
      // side walls: darker with depth, bright surface line
      float d = clamp((uTop - vWPos.y) / max(uDepth, 0.5), 0.0, 1.0);
      d = floor(d * 8.0) / 8.0;
      col = mix(uShallow, uDeep * 0.55, d);
      vec2 pq = floor(vec2(vWPos.x + vWPos.z, vWPos.y) * 16.0) / 16.0;
      float band = sin(pq.x * 4.0 + pq.y * 6.0 + t * 1.5) * sin(pq.x * 1.7 - t);
      col *= 1.0 + step(0.7, band) * 0.12;
      col = mix(col, mix(vec3(0.85, 0.95, 1.0), vec3(0.7, 1.0, 0.5), uToxic), step(uTop - vWPos.y, 0.07) * 0.8);
      if (uToxic > 0.5) col += uShallow * 0.2;
      a = mix(uAlpha, 1.0, d * 0.6);
    }
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }`;

function shoreTexture(w, isShore) {
  const nx = Math.round(w.x1 - w.x0) + 2, nz = Math.round(w.z1 - w.z0) + 2;
  const data = new Uint8Array(nx * nz * 4);
  for (let z = 0; z < nz; z++)
    for (let x = 0; x < nx; x++) {
      const v = isShore(Math.floor(w.x0) - 1 + x, Math.floor(w.z0) - 1 + z) ? 255 : 0;
      const i = (z * nx + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, nx, nz, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return { tex: t, rect: new THREE.Vector4(Math.floor(w.x0) - 1, Math.floor(w.z0) - 1, nx, nz) };
}

/**
 * Build one water body. w: {x0,y0,z0,x1,y1,z1,color}. isShore(x,z) -> bool marks
 * cells next to land at the surface. toxic -> bubbling glow.
 */
export function makeWater(w, isShore, toxic = false) {
  const sx = w.x1 - w.x0, sy = w.y1 - w.y0, sz = w.z1 - w.z0;
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  // drop the bottom face (index group 3 = -y)
  const idx = geo.index.array;
  const keep = [];
  for (const g of geo.groups) if (g.materialIndex !== 3) for (let i = g.start; i < g.start + g.count; i++) keep.push(idx[i]);
  geo.setIndex(keep);
  geo.clearGroups();
  geo.translate(w.x0 + sx / 2, w.y0 + sy / 2, w.z0 + sz / 2);
  const base = new THREE.Color(w.color);
  const shallow = base.clone().multiplyScalar(toxic ? 0.95 : 1.12);
  const deep = toxic ? base.clone().multiplyScalar(0.35) : new THREE.Color(w.color).lerp(new THREE.Color(0x1a2a6a), 0.55).multiplyScalar(0.6);
  const { tex, rect } = shoreTexture(w, isShore);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uShallow: { value: shallow }, uDeep: { value: deep }, uShore: { value: tex }, uShoreRect: { value: rect },
        uTop: { value: w.y1 }, uDepth: { value: sy }, uToxic: { value: toxic ? 1 : 0 }, uAlpha: { value: toxic ? 0.9 : 0.78 },
      },
    ]),
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  // share the animated uniforms by reference
  Object.assign(mat.uniforms, waterUniforms);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 3;
  m.userData.dispose = () => {
    tex.dispose();
    mat.dispose();
    geo.dispose();
  };
  return m;
}

// ---------------------------------------------------------------------------
// Waterfalls: a falling sheet of water with pixel streaks that scroll downward
// and foam where it lands.
const fallFrag = `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime; uniform vec3 uColor; uniform float uBottom; uniform float uTop;
  varying vec3 vWPos; varying vec3 vWNrm;
  float h11(float n){ return fract(sin(n * 91.345) * 47453.5453); }
  void main(){
    vec3 q = floor(vWPos * 16.0) / 16.0;                    // 16 px per unit
    float lane = floor((vWPos.x + vWPos.z) * 16.0);         // one streak lane per pixel column
    float speed = 2.2 + h11(lane) * 1.6;
    float s = fract(q.y * 0.9 + uTime * speed + h11(lane + 7.0) * 9.0);
    float streak = step(0.78, s) + step(0.93, s) * 0.6;
    vec3 col = mix(uColor * 0.8, uColor * 1.25 + 0.12, streak * 0.75);
    // brighter, frothier near the top lip and where it lands
    float foam = smoothstep(uBottom + 0.7, uBottom, vWPos.y) + smoothstep(uTop - 0.35, uTop, vWPos.y) * 0.6;
    foam *= 0.6 + 0.4 * step(0.5, fract(q.x * 8.0 + q.y * 5.0 + uTime * 3.0));
    col = mix(col, vec3(0.92, 0.97, 1.0), clamp(foam, 0.0, 1.0));
    gl_FragColor = vec4(col, 0.8 + streak * 0.12 + foam * 0.1);
    #include <fog_fragment>
  }`;

/** f: {x0,x1,y0,y1,z0,z1,color} */
export function makeWaterfall(f) {
  const sx = f.x1 - f.x0, sy = f.y1 - f.y0, sz = f.z1 - f.z0;
  const geo = new THREE.BoxGeometry(sx, sy, sz).translate(f.x0 + sx / 2, f.y0 + sy / 2, f.z0 + sz / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(f.color ?? 0x5ab8e8) }, uBottom: { value: f.y0 }, uTop: { value: f.y1 } }]),
    vertexShader: vert,
    fragmentShader: fallFrag,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  mat.uniforms.uTime = waterUniforms.uTime;
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 3;
  m.userData.dispose = () => {
    mat.dispose();
    geo.dispose();
  };
  return m;
}
