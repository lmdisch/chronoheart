// Post-processing: the era shift (one age rebuilding into another) / peek blend, soft-knee bloom, bokeh depth of field,
// screen-space god rays, chromatic aberration, film grain and the era colour grade.
// The scene renders into a target with a depth texture so DOF and rays can read depth.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const TimeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPrev: { value: null },
    // Era shift: tPrev is the age being left, still rendered live. The new age spreads out from
    // `center` block by block; each block is rebuilt from the ground up (or from the top down,
    // travelling back). shift runs 0..1 (1 = done); reach is how far the farthest corner is.
    shift: { value: 1 },
    reach: { value: 1.2 },
    shiftDir: { value: 1 },
    blocks: { value: 30 }, // blocks down the screen; 0 = a plain soft fade (reduced motion)
    // 1 for a time-lapse: instead of a front sweeping out, the whole view ages together, each
    // block fading across in its own time (loosely outward from the cause)
    scatter: { value: 0 },
    ripple: { value: 0 },
    peek: { value: 0 },
    peekTint: { value: new THREE.Color(0.6, 0.95, 1.0) },
    ringTint: { value: new THREE.Color(0.5, 1.0, 1.0) },
    aspect: { value: 1.7 },
    time: { value: 0 },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    // Clocktower glitch: slices inside glitchRect (uv min.xy, max.zw) show tPrev (another era)
    glitch: { value: 0 },
    glitchRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    glitchSeed: { value: 0 },
    glitchTint: { value: new THREE.Color(1, 1, 1) },
  },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform sampler2D tPrev;
    uniform float shift; uniform float reach; uniform float shiftDir; uniform float blocks; uniform float scatter;
    uniform float ripple; uniform float peek; uniform vec3 peekTint; uniform vec3 ringTint;
    uniform float aspect; uniform float time; uniform vec2 center;
    uniform float glitch; uniform vec4 glitchRect; uniform float glitchSeed; uniform vec3 glitchTint;
    varying vec2 vUv;
    float gh(float n){ return fract(sin(n * 12.9898 + glitchSeed * 78.233) * 43758.5453); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec2 asp = vec2(aspect, 1.0);
      vec2 c = vUv - center;
      float d = length(c * asp);
      vec2 dir = normalize(c + 1e-5);
      float front = shift * (reach + 0.95); // how far the new age has spread
      float wave = sin(d * 46.0 - time * 20.0) * ripple * 0.005 * smoothstep(1.3, 0.0, d);
      float edge = exp(-abs(d - front) * 14.0) * ripple * (1.0 - scatter);
      vec2 uv = vUv + dir * (wave + edge * 0.01);
      vec3 cur;
      float ab = edge * 0.004 + ripple * 0.0015;
      cur.r = texture2D(tDiffuse, uv + dir * ab).r;
      cur.g = texture2D(tDiffuse, uv).g;
      cur.b = texture2D(tDiffuse, uv - dir * ab).b;
      vec3 col = cur;
      if (shift < 1.0) {
        vec3 prev = texture2D(tPrev, uv).rgb;
        if (blocks > 0.0) {
          vec2 g = vUv * asp * blocks;
          vec2 cell = floor(g), f = fract(g);
          float dc = length((cell + 0.5) / blocks - center * asp);
          if (scatter > 0.5) {
            float lag = h2(cell) * 0.35 + clamp(dc / reach, 0.0, 1.0) * 0.8;
            float t = clamp(shift * 2.15 - lag, 0.0, 1.0);
            col = mix(prev, cur, smoothstep(0.0, 1.0, t)) + ringTint * sin(t * 3.14159) * 0.05;
          } else {
          // each block turns in its own moment, a little before or after its neighbours. Right
          // around you it's quick (what you're standing on is already the new age); further out
          // the change is broad and slow enough to watch.
          float far = smoothstep(0.0, 0.8, dc);
          float t = clamp((front - dc - h2(cell) * mix(0.06, 0.35, far)) / mix(0.16, 0.55, far), 0.0, 1.0);
          float live = sin(t * 3.14159);
          float w = smoothstep(0.12, 0.9, t); // how much of this block has been rebuilt
          float fy = shiftDir > 0.0 ? f.y : 1.0 - f.y;
          float built = step(fy, w) * step(0.001, w);
          // the old age drains toward the new one's colour as its turn comes
          vec3 old = mix(prev, vec3(dot(prev, vec3(0.299, 0.587, 0.114))) * ringTint * 1.25, live * 0.55);
          col = mix(old, cur, built);
          col += ringTint * exp(-abs(fy - w) * 16.0) * live * 0.9; // the bright seam where it is being rebuilt
          float rim = max(smoothstep(0.42, 0.5, abs(f.x - 0.5)), smoothstep(0.42, 0.5, abs(f.y - 0.5)));
          col += ringTint * rim * live * 0.18;
          }
        } else {
          col = mix(prev, cur, smoothstep(0.0, 1.0, scatter > 0.5 ? shift : clamp((front - d) / 0.5, 0.0, 1.0)));
        }
        col += ringTint * edge * 0.5;
      }
      if (glitch > 0.0 && vUv.x > glitchRect.x && vUv.x < glitchRect.z && vUv.y > glitchRect.y && vUv.y < glitchRect.w) {
        // the tower stutters between ages: random horizontal slices from another era
        float rows = 26.0 + floor(gh(3.1) * 30.0);
        float band = floor(vUv.y * rows);
        float r = gh(band);
        // ragged slice edges, so it doesn't read as a clean rectangle
        float edgeL = glitchRect.x + gh(band + 9.0) * 0.06 * (glitchRect.z - glitchRect.x);
        float edgeR = glitchRect.z - gh(band + 17.0) * 0.06 * (glitchRect.z - glitchRect.x);
        if (r < glitch && vUv.x > edgeL && vUv.x < edgeR) {
          float shift = (gh(band + 5.0) - 0.5) * 0.04 * glitch;
          vec2 gu = vec2(vUv.x + shift, vUv.y);
          vec3 g;
          g.r = texture2D(tPrev, gu + vec2(0.005, 0.0)).r;
          g.g = texture2D(tPrev, gu).g;
          g.b = texture2D(tPrev, gu - vec2(0.005, 0.0)).b;
          float scan = 0.82 + 0.18 * sin(vUv.y * 1100.0 + time * 40.0);
          col = mix(col, g * mix(vec3(1.0), glitchTint, 0.4) * scan * 1.08, 0.94);
        } else if (r < glitch * 1.6) {
          // neighbouring slices only tear sideways, with a colour fringe
          float shift = (gh(band + 2.0) - 0.5) * 0.02 * glitch;
          col.r = texture2D(tDiffuse, uv + vec2(shift + 0.004, 0.0)).r;
          col.b = texture2D(tDiffuse, uv + vec2(shift - 0.004, 0.0)).b;
        }
      }
      if (peek > 0.0) {
        vec3 pv = texture2D(tPrev, vUv + vec2(sin(vUv.y * 80.0 + time * 6.0) * 0.0015, 0.0)).rgb;
        float lum = dot(pv, vec3(0.299, 0.587, 0.114));
        vec3 ghost = mix(vec3(lum), pv, 0.55) * peekTint;
        float scan = 0.85 + 0.15 * sin(vUv.y * 600.0 + time * 10.0);
        col = mix(col, ghost * scan * 1.15, peek * 0.5);
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// Single-pass gather bokeh (golden-angle spiral). CoC from inverse depth, so the far
// background and the near foreground both melt while the player's depth stays sharp.
const BokehShader = {
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    cameraNear: { value: 0.5 },
    cameraFar: { value: 400 },
    focus: { value: 20 },
    focusScale: { value: 62 },
    band: { value: 0.003 },
    maxBlur: { value: 9 },
    texel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
  },
  vertexShader: VERT,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tColor; uniform sampler2D tDepth;
    uniform float cameraNear; uniform float cameraFar; uniform float focus; uniform float focusScale; uniform float band;
    uniform float maxBlur; uniform vec2 texel;
    varying vec2 vUv;
    const float GOLDEN = 2.39996323;
    float viewDepth(vec2 uv){
      float z = texture2D(tDepth, uv).x;
      return -perspectiveDepthToViewZ(z, cameraNear, cameraFar);
    }
    float blurSize(float d){
      float coc = max(abs(1.0 / focus - 1.0 / d) - band, 0.0) * focusScale;
      return clamp(coc, 0.0, 1.0) * maxBlur;
    }
    void main(){
      vec3 col = texture2D(tColor, vUv).rgb;
      float cd = viewDepth(vUv);
      float cs = blurSize(cd);
      float tot = 1.0;
      float radius = 0.9;
      for (float ang = 0.0; ang < 200.0; ang += GOLDEN) {
        if (radius >= maxBlur) break;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * texel * radius;
        vec3 sc = texture2D(tColor, tc).rgb;
        float sd = viewDepth(tc);
        float ss = blurSize(sd);
        if (sd > cd) ss = clamp(ss, 0.0, cs * 2.0);
        float m = smoothstep(radius - 0.5, radius + 0.5, ss);
        col += mix(col / tot, sc, m);
        tot += 1.0;
        radius += 1.25 / radius;
      }
      gl_FragColor = vec4(col / tot, 1.0);
    }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tint: { value: new THREE.Color(1, 1, 1) },
    shadowTint: { value: new THREE.Color(1, 1, 1) },
    saturation: { value: 1.1 },
    contrast: { value: 1.05 },
    vignette: { value: 0.35 },
    grain: { value: 0.035 },
    aberration: { value: 0.0016 },
    rays: { value: 0.35 },
    rayColor: { value: new THREE.Color(1, 0.9, 0.7) },
    raySource: { value: new THREE.Vector2(0.2, 1.3) },
    fade: { value: 0 },
    fadeColor: { value: new THREE.Color(0, 0, 0) },
    hurt: { value: 0 },
    time: { value: 0 },
  },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec3 tint; uniform vec3 shadowTint; uniform float saturation; uniform float contrast;
    uniform float vignette; uniform float grain; uniform float aberration; uniform float rays; uniform vec3 rayColor; uniform vec2 raySource;
    uniform float fade; uniform vec3 fadeColor; uniform float hurt; uniform float time;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec2 q = vUv - 0.5;
      // chromatic aberration, stronger toward the edges
      vec2 ca = q * aberration * (0.4 + dot(q, q) * 4.0);
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + ca).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - ca).b;
      // god rays: radial blur of bright pixels toward an off-screen sun
      if (rays > 0.0) {
        vec2 dir = (raySource - vUv) / 28.0;
        vec2 p = vUv;
        float decay = 1.0, acc = 0.0;
        float jitter = rand(vUv * 917.0 + time);
        p += dir * jitter;
        for (int i = 0; i < 28; i++) {
          p += dir;
          vec3 s = texture2D(tDiffuse, clamp(p, 0.001, 0.999)).rgb;
          acc += min(max(lum(s) - 0.6, 0.0), 0.12) * decay;
          decay *= 0.95;
        }
        // soft diagonal shafts so the light reads as beams
        vec2 rd = normalize(vUv - raySource);
        float ang = atan(rd.y, rd.x);
        float shafts = 0.55 + 0.45 * sin(ang * 23.0 + sin(ang * 7.0 + time * 0.15) * 2.0);
        c += rayColor * acc * rays * 0.22 * shafts * smoothstep(-0.2, 1.0, vUv.y);
      }
      float l = lum(c);
      c = mix(vec3(l), c, saturation);
      c = mix(c * shadowTint, c * tint, smoothstep(0.0, 0.6, l));
      c = (c - 0.18) * contrast + 0.18;
      c = max(c, 0.0);
      float v = smoothstep(0.85, 0.2, length(q * vec2(1.1, 1.0)));
      c *= mix(1.0 - vignette, 1.0, v);
      c = mix(c, c * vec3(1.6, 0.35, 0.35), hurt * (1.0 - v));
      // luminance-weighted film grain (strongest in the mids)
      float g = rand(vUv * 731.0 + fract(time * 7.13)) - 0.5;
      c += g * grain * (0.35 + 0.65 * smoothstep(0.0, 0.4, l) * smoothstep(1.4, 0.4, l));
      c = mix(c, fadeColor, fade);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export const SHIFT_TIME = 1.3; // seconds for one age to rebuild into another

export const GRADES = [
  // Past: warm golden hour, strong god rays
  { tint: [1.07, 0.99, 0.86], shadowTint: [0.86, 0.84, 1.0], saturation: 1.14, contrast: 1.07, vignette: 0.36, rays: 0.55, rayColor: [1.0, 0.82, 0.55] },
  // Present: warm highlights / teal shadows
  { tint: [1.04, 1.0, 0.92], shadowTint: [0.8, 0.94, 1.0], saturation: 1.1, contrast: 1.05, vignette: 0.34, rays: 0.4, rayColor: [1.0, 0.94, 0.78] },
  // Future: neon, magenta shadows, no sun shafts
  { tint: [0.96, 0.98, 1.04], shadowTint: [0.95, 0.82, 1.08], saturation: 1.08, contrast: 1.05, vignette: 0.38, rays: 0.0, rayColor: [0.6, 0.7, 1.0] },
];

function makePass(shader) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(shader.uniforms),
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  return { uniforms: mat.uniforms, quad: new FullScreenQuad(mat), mat };
}

export class Post {
  constructor(renderer) {
    this.r = renderer;
    const gl = renderer.gl;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(size.x, size.y) });
    this.rtA = new THREE.WebGLRenderTarget(size.x, size.y, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(size.x, size.y, rtOpts);
    this.prevRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });

    this.time = makePass(TimeShader);
    this.time.uniforms.tPrev.value = this.prevRT.texture;
    this.time.uniforms.tDiffuse.value = this.sceneRT.texture;

    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.5, 0.55, 1.0);
    this.bloom.highPassUniforms.smoothWidth.value = 0.45; // soft knee

    this.dof = makePass(BokehShader);
    this.dof.uniforms.tColor.value = this.rtA.texture;
    this.dof.uniforms.tDepth.value = this.sceneRT.depthTexture;

    this.grade = makePass(GradeShader);
    this.grade.uniforms.tDiffuse.value = this.rtB.texture;
    this.grade.uniforms.tDepth.value = this.sceneRT.depthTexture;

    this.output = new OutputPass();
    this.output.renderToScreen = true;

    this.gradeCur = JSON.parse(JSON.stringify(GRADES[1]));
    this.gradeTarget = GRADES[1];
    this.applyGrade();

    // transition state
    this.trans = 1; // 0..1
    this.shiftTime = SHIFT_TIME;
    this.peekAmt = 0;
    this.focusDist = 20;
    this.onResize();
    renderer.onResizeCb = () => this.onResize();
  }

  onResize() {
    const gl = this.r.gl;
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    for (const rt of [this.sceneRT, this.rtA, this.rtB, this.prevRT]) rt.setSize(size.x, size.y);
    this.bloom.setSize(size.x, size.y);
    this.time.uniforms.aspect.value = size.x / size.y;
    this.dof.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    // blur radius is authored for 1080p; scale with resolution
    this.dof.uniforms.maxBlur.value = Math.max(4, Math.round(9 * (size.y / 1080)));
  }

  /** Render the current scene (with whatever era is visible) into prevRT. */
  capture() {
    const gl = this.r.gl;
    gl.setRenderTarget(this.prevRT);
    gl.render(this.r.scene, this.r.camera);
    gl.setRenderTarget(null);
  }

  /**
   * Start the era shift. The caller keeps the age being left rendered into prevRT (capture())
   * until trans reaches 1. center: where it spreads from, in screen uv. dir: +1 toward the
   * Future, -1 toward the Past. lapse: a time-lapse, where the whole view ages together and the
   * caller sets `trans` itself (0..1) to keep it in step with the years going by.
   */
  startTransition(color, { center = [0.5, 0.5], dir = 1, lapse = false } = {}) {
    const tu = this.time.uniforms;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.trans = 0;
    this.shiftTime = reduced ? 0.6 : SHIFT_TIME;
    tu.ringTint.value.setHex(color);
    tu.center.value.set(center[0], center[1]);
    tu.shiftDir.value = dir;
    tu.scatter.value = lapse ? 1 : 0;
    this.manual = lapse;
    tu.blocks.value = reduced ? 0 : this.r.lowPower ? 22 : 30;
    const a = tu.aspect.value;
    tu.reach.value = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => Math.hypot((x - center[0]) * a, y - center[1])));
    tu.shift.value = 0;
  }

  setGrade(era) {
    this.gradeTarget = GRADES[era];
  }

  applyGrade() {
    const u = this.grade.uniforms, g = this.gradeCur;
    u.tint.value.setRGB(...g.tint);
    u.shadowTint.value.setRGB(...g.shadowTint);
    u.saturation.value = g.saturation;
    u.contrast.value = g.contrast;
    u.vignette.value = g.vignette;
    u.rays.value = g.rays;
    u.rayColor.value.setRGB(...g.rayColor);
  }

  /** focusDist: camera-space distance to keep sharp (the player). */
  update(dt, t, focusDist = 20) {
    const k = 1 - Math.exp(-6 * dt);
    const g = this.gradeCur, tg = this.gradeTarget;
    for (const key of Object.keys(tg)) {
      if (Array.isArray(tg[key])) g[key] = g[key].map((v, i) => v + (tg[key][i] - v) * k);
      else g[key] += (tg[key] - g[key]) * k;
    }
    this.applyGrade();

    const tu = this.time.uniforms;
    tu.time.value = t;
    if (this.trans < 1) {
      if (!this.manual) this.trans = Math.min(1, this.trans + dt / this.shiftTime);
      tu.shift.value = this.trans;
      tu.ripple.value = Math.sin(this.trans * Math.PI) * (this.manual ? 0.2 : 1);
    } else {
      tu.shift.value = 1;
      tu.ripple.value = Math.max(0, tu.ripple.value - dt * 3);
    }
    tu.peek.value = this.peekAmt;
    this.grade.uniforms.time.value = t;

    // per-era bloom (the neon Future gets a gentler one), a little lighter again on phones
    const atm = this.r.atmos;
    this.bloom.strength = (atm.bloom ?? 0.5) * (this.r.lowPower ? 0.8 : 1);

    // smooth focus pull
    this.focusDist += (focusDist - this.focusDist) * (1 - Math.exp(-4 * dt));
    const du = this.dof.uniforms, cam = this.r.camera;
    du.focus.value = this.focusDist;
    du.cameraNear.value = cam.near;
    du.cameraFar.value = cam.far;

    // god-ray source: up in the sky, on the sun's side of the screen
    const sd = this.r.sunDirV;
    if (sd) this.grade.uniforms.raySource.value.set(0.5 + Math.max(-0.45, Math.min(0.45, sd.x * 0.6)), 1.35);
  }

  render() {
    const gl = this.r.gl;
    gl.setRenderTarget(this.sceneRT);
    gl.render(this.r.scene, this.r.camera);

    gl.setRenderTarget(this.rtA);
    this.time.quad.render(gl);

    this.bloom.render(gl, null, this.rtA, 0, false);

    gl.setRenderTarget(this.rtB);
    this.dof.quad.render(gl);

    gl.setRenderTarget(this.rtA);
    this.grade.quad.render(gl);

    this.output.render(gl, null, this.rtA);
  }
}
