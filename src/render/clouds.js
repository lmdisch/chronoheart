// A sea of clouds below the world, for a chapter set above them (theme.clouds). Two layers: a
// thick floor of cloud, and thin wisps drifting a little above it. Their colors and speed come
// from the age's atmosphere (cloudTop, cloudShade, cloudGlow, cloudGlowAmt, cloudSpeed), so an
// age where time has stopped can have clouds that stand still. Holes open onto the world below,
// and a long shadow (a sundial's hand) can sweep across them.
import * as THREE from 'three';

const vert = `
  varying vec3 vW;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const frag = `
  uniform vec2 uOff; uniform float uTime; uniform float uWisp;
  uniform vec3 uTop; uniform vec3 uShade; uniform vec3 uGlow; uniform float uGlowAmt; uniform vec3 uHorizon;
  uniform vec3 uSunDir; uniform vec3 uCam; uniform float uFadeNear; uniform float uFadeFar;
  uniform vec3 uHoles[4]; uniform vec4 uHand; uniform float uHandShadow; uniform vec3 uSunSky; uniform vec3 uSunCol;
  varying vec3 vW;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += vn(p) * a; p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  void main(){
    vec2 p = vW.xz * 0.02 + uOff;
    float h = fbm(p) * 0.75 + fbm(p * 2.7 + 9.0 - uOff * 0.4) * 0.25;
    // the side of each puff that faces the sun is lit, the far side in shade
    vec2 sd = normalize(uSunDir.xz + vec2(1e-4)) * 0.05;
    float hs = fbm(p + sd) * 0.75 + fbm((p + sd) * 2.7 + 9.0 - uOff * 0.4) * 0.25;
    float lit = clamp(0.5 + (h - hs) * 7.0, 0.0, 1.0);
    float tone = clamp(smoothstep(0.32, 0.7, h) * 0.6 + lit * 0.55, 0.0, 1.0);
    vec3 col = mix(uShade, uTop, tone * tone * (3.0 - 2.0 * tone));
    // looking toward a low sun, the cloud tops catch its light
    vec3 v = normalize(vW - uCam);
    col += uSunCol * pow(max(dot(v, normalize(uSunSky)), 0.0), 6.0) * (0.25 + 0.75 * tone) * 0.6;
    col += uGlow * uGlowAmt * (0.35 + 0.65 * fbm(p * 0.45 + vec2(uTime * 0.015, 0.0)));
    float a = 1.0;
    if (uWisp > 0.0) {
      // the upper layer is only its thickest wisps
      a = smoothstep(0.52, 0.68, h) * uWisp;
      col = mix(col, uTop, 0.4);
    } else {
      for (int i = 0; i < 4; i++) {
        vec3 o = uHoles[i];
        if (o.z <= 0.0) continue;
        float e = length(vW.xz - o.xy) / o.z + (h - 0.5) * 0.7;
        a = min(a, smoothstep(0.72, 1.0, e));
        col *= mix(0.75, 1.0, smoothstep(0.95, 1.25, e)); // a shadowed rim round each opening
      }
      if (uHand.z > 0.0 && uHandShadow > 0.0) {
        // a long shadow across the clouds, swinging slowly round: the mountain's own clock hand
        vec2 rel = vW.xz - uHand.xy, dir = vec2(cos(uHand.w), sin(uHand.w));
        float along = dot(rel, dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
        float w = mix(5.0, 0.8, clamp(along / uHand.z, 0.0, 1.0));
        float sh = step(0.0, along) * (1.0 - smoothstep(uHand.z * 0.85, uHand.z, along)) * (1.0 - smoothstep(w * 0.55, w, across));
        col *= 1.0 - sh * uHandShadow;
      }
    }
    float f = smoothstep(uFadeNear, uFadeFar, length(vW.xz - uCam.xz));
    gl_FragColor = vec4(mix(col, uHorizon, f), a);
  }`;

export class Clouds {
  /** cfg: { y, holes: [[x, z, r]...], hand: { x, z, len } } */
  constructor(scene, cfg) {
    this.cfg = cfg;
    this.off = new THREE.Vector2();
    this.speed = 0;
    this.handA = cfg.hand?.angle ?? 0;
    this.handSpeed = 0;
    this.last = null;
    const holes = [0, 1, 2, 3].map((i) => new THREE.Vector3(...(cfg.holes?.[i] || [0, 0, 0])));
    const make = (wisp) => {
      const u = {
        uOff: { value: this.off }, uTime: { value: 0 }, uWisp: { value: wisp },
        uTop: { value: new THREE.Color(0xffffff) }, uShade: { value: new THREE.Color(0x8890a0) },
        uGlow: { value: new THREE.Color(0) }, uGlowAmt: { value: 0 }, uHorizon: { value: new THREE.Color(0xffffff) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uCam: { value: new THREE.Vector3() },
        uFadeNear: { value: cfg.fadeNear ?? 120 }, uFadeFar: { value: cfg.fadeFar ?? 520 },
        uHoles: { value: holes }, uHandShadow: { value: 0 }, uSunSky: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0) }, uHand: { value: new THREE.Vector4(cfg.hand?.x ?? 0, cfg.hand?.z ?? 0, cfg.hand ? cfg.hand.len : 0, this.handA) },
      };
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2),
        new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: !wisp }),
      );
      m.position.y = cfg.y + (wisp ? 1.6 : 0);
      m.renderOrder = wisp ? 1 : -5;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.layers = [make(0), make(0.55)];
  }

  applyAtmos(a) {
    for (const m of this.layers) {
      const u = m.material.uniforms;
      if (a.cloudTop !== undefined) u.uTop.value.setHex(a.cloudTop);
      if (a.cloudShade !== undefined) u.uShade.value.setHex(a.cloudShade);
      if (a.cloudGlow !== undefined) u.uGlow.value.setHex(a.cloudGlow);
      u.uGlowAmt.value = a.cloudGlowAmt ?? 0;
      u.uHorizon.value.setHex(a.skyHorizon);
      u.uSunDir.value.set(...a.sunDir).normalize();
      u.uSunSky.value.set(...(a.sunSky || a.sunDir)).normalize();
      u.uSunCol.value.setHex(a.sun).multiplyScalar(Math.min(1, (a.sunI ?? 1) / 3));
      u.uHandShadow.value = a.handShadow ?? 0.5;
    }
    this.speed = a.cloudSpeed ?? 1;
    this.handSpeed = a.handSpeed ?? 1;
  }

  tick(t, cam) {
    const dt = this.last === null ? 0 : Math.min(0.1, t - this.last);
    this.last = t;
    // drift by the age's speed, so slowing to a stop (or starting again) never jumps
    this.off.x += dt * 0.012 * this.speed;
    this.off.y += dt * 0.004 * this.speed;
    this.handA += dt * 0.05 * this.handSpeed;
    for (const m of this.layers) {
      m.position.x = Math.round(cam.x / 50) * 50;
      m.position.z = Math.round(cam.z / 50) * 50;
      const u = m.material.uniforms;
      u.uTime.value = t;
      u.uCam.value.copy(cam);
      u.uHand.value.w = this.handA;
    }
  }
}
