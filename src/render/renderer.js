// Scene, camera, lighting and per-era atmosphere.
import * as THREE from 'three';
import { lerp } from '../core/util.js';
import { theme } from '../chapter.js';
import { voxelUniforms } from './materials.js';
import { foliageUniforms } from './foliage.js';
import { waterUniforms } from './water.js';
import { prefersTouch } from '../ui/touch.js';
import { glowMat } from '../world/world.js';

/** Sky, fog and light for each age, from the chapter (which may change them as its story goes: see setMood). */
export const ATMOS = theme.atmos;

const POOL = 12;

export class Renderer {
  constructor(container) {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // phones and tablets: render at CSS resolution and lighter shadows to keep the frame rate up
    this.lowPower = prefersTouch();
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPower ? 1 : 1.5));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';
    this.gl = r;

    this.scene = new THREE.Scene();
    // Diorama camera: long lens, high pitch, far away (HD-2D look)
    this.camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 1, 400);
    this.camTarget = new THREE.Vector3(10, 1, 3);
    this.camPos = new THREE.Vector3(10, 9, 20);
    const pitch = THREE.MathUtils.degToRad(31), dist = 23.5;
    this.baseOffset = new THREE.Vector3(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    this.camOffset = this.baseOffset.clone();
    this.fitAspect();
    this.lookAhead = 0;
    // sprites stand upright (yaw-only billboards) and are stretched to undo the pitch foreshortening
    this.billboardQ = new THREE.Quaternion();
    this.spriteStretch = 1 / Math.cos(pitch * 0.8);
    this.shake = 0;

    this.scene.fog = new THREE.Fog(0xffffff, 30, 140);

    // sky dome
    this.skyUniforms = {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunCol: { value: new THREE.Color() },
      stars: { value: 0 },
      time: { value: 0 },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyUniforms,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float stars; uniform float time;
          varying vec3 vDir;
          float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
          void main(){
            float y = clamp(vDir.y, -0.2, 1.0);
            vec3 col = mix(horizon, top, pow(smoothstep(-0.05, 0.75, y), 0.8));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunCol * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35);
            if (stars > 0.0) {
              vec2 g = floor(vDir.xz / max(vDir.y, 0.05) * 60.0);
              float st = step(0.996, h21(g)) * smoothstep(0.1, 0.5, y);
              col += vec3(st) * stars * (0.6 + 0.4 * sin(time * 2.0 + h21(g) * 30.0));
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    sky.renderOrder = -10;
    this.sky = sky;
    this.scene.add(sky);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(this.lowPower ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -18; sc.near = 1; sc.far = 140;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(this.hemi);

    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 9, 1.6);
      l.position.set(0, -100, 0);
      this.scene.add(l);
      this.pool.push(l);
    }

    this.atmos = this.cloneAtmos(ATMOS[1]);
    this.atmosFrom = null;
    this.atmosTo = null;
    this.atmosT = 1;
    this.applyAtmos(this.atmos);

    window.addEventListener('resize', () => this.onResize());
  }

  cloneAtmos(a) {
    return JSON.parse(JSON.stringify(a));
  }

  /** On screens taller than wide (phones held upright), pull the camera back so the path stays visible. */
  fitAspect() {
    const aspect = window.innerWidth / window.innerHeight;
    const k = aspect < 1.2 ? Math.min(1.9, Math.sqrt(1.2 / aspect)) : 1;
    this.camOffset.copy(this.baseOffset).multiplyScalar(k);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.fitAspect();
    this.gl.setSize(window.innerWidth, window.innerHeight);
    if (this.onResizeCb) this.onResizeCb();
  }

  setEra(era, instant = false) {
    if (instant) {
      this.atmos = this.cloneAtmos(ATMOS[era]);
      this.atmosT = 1;
      this.applyAtmos(this.atmos);
      return;
    }
    this.atmosFrom = this.cloneAtmos(this.atmos);
    this.atmosTo = ATMOS[era];
    this.atmosT = 0;
  }

  applyAtmos(a) {
    const c = (k) => new THREE.Color(a[k]);
    this.skyUniforms.top.value.copy(c('skyTop'));
    this.skyUniforms.horizon.value.copy(c('skyHorizon'));
    this.skyUniforms.sunCol.value.copy(c('sun'));
    this.skyUniforms.stars.value = a.stars ?? 0;
    this.scene.fog.color.copy(c('fog'));
    this.scene.fog.near = a.fogNear;
    this.scene.fog.far = a.fogFar;
    this.sun.color.copy(c('sun'));
    this.sun.intensity = a.sunI;
    this.hemi.color.copy(c('hemiSky'));
    this.hemi.groundColor.copy(c('hemiGround'));
    this.hemi.intensity = a.hemiI;
    this.gl.toneMappingExposure = a.exposure;
    const d = new THREE.Vector3(...a.sunDir).normalize();
    this.skyUniforms.sunDir.value.copy(d);
    this.sunDirV = d;
    waterUniforms.uSunDir.value.copy(d);
    waterUniforms.uSunCol.value.copy(c('sun')).multiplyScalar(a.sunI * 0.5);
    waterUniforms.uSky.value.copy(c('skyHorizon')).lerp(c('skyTop'), 0.4);
    voxelUniforms.uEmissive.value = a.emissive ?? 2.0;
    glowMat.color.setScalar(a.glow ?? 2.6); // neon strips, windows, lamps
  }

  tickAtmos(dt) {
    if (this.atmosT >= 1 || !this.atmosTo) return;
    this.atmosT = Math.min(1, this.atmosT + dt / (this.atmosDur || 0.55));
    const t = this.atmosT;
    const A = this.atmosFrom, B = this.atmosTo, out = this.atmos;
    for (const k of Object.keys(B)) {
      if (typeof B[k] === 'number' && /sky|fog$|sun$|hemiSky|hemiGround/.test(k) && k !== 'sunI' && k !== 'fogNear' && k !== 'fogFar') {
        out[k] = new THREE.Color(A[k]).lerp(new THREE.Color(B[k]), t).getHex();
      } else if (typeof B[k] === 'number') out[k] = lerp(A[k], B[k], t);
      else if (Array.isArray(B[k])) out[k] = B[k].map((v, i) => lerp(A[k][i], v, t));
    }
    out.stars = lerp(A.stars ?? 0, B.stars ?? 0, t);
    this.applyAtmos(out);
  }

  /** Assign the nearest light sources of the current era to the pooled point lights. */
  updateLights(lights, focus, time) {
    const fx = focus.x;
    const cands = [];
    for (const l of lights) {
      const d = Math.abs(l.x - fx);
      if (d < 26) cands.push([d, l]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < POOL; i++) {
      const p = this.pool[i];
      const c = cands[i];
      if (!c) {
        p.intensity = 0;
        p.position.y = -100;
        continue;
      }
      const l = c[1];
      p.position.set(l.x, l.y, l.z);
      p.color.setHex(l.color);
      p.distance = l.distance;
      let f = 1;
      if (l.flicker) f = 1 - l.flicker * (0.5 + 0.5 * Math.sin(time * 13 + l.x * 7) * Math.sin(time * 7.3 + l.z));
      // fade lights near the edge of the candidate radius to avoid popping
      const edge = Math.min(1, (26 - c[0]) / 6);
      p.intensity = l.intensity * f * edge;
    }
  }

  /** Advance time for every animated shader (wind, water, emissive flicker). */
  tickShaders(t) {
    this.skyUniforms.time.value = t;
    voxelUniforms.uTime.value = t;
    foliageUniforms.uTime.value = t;
    waterUniforms.uTime.value = t;
  }

  /** lead: desired horizontal look-ahead (world units) in the direction of travel. */
  updateCamera(dt, target, bounds, lead = 0) {
    this.lookAhead += (lead - this.lookAhead) * (1 - Math.exp(-2.2 * dt));
    const desired = target.clone();
    desired.x += this.lookAhead;
    desired.x = Math.max(bounds[0], Math.min(bounds[1], desired.x));
    const k = 1 - Math.exp(-5 * dt);
    this.camTarget.x += (desired.x - this.camTarget.x) * k;
    this.camTarget.y += (desired.y - this.camTarget.y) * (1 - Math.exp(-3 * dt));
    this.camTarget.z += (desired.z - this.camTarget.z) * (1 - Math.exp(-2 * dt));
    this.camPos.copy(this.camTarget).add(this.camOffset);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.35;
      this.camPos.x += (Math.random() - 0.5) * s;
      this.camPos.y += (Math.random() - 0.5) * s;
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 0.6, this.camTarget.z);
    this.sky.position.copy(this.camera.position);
    // sun follows the camera so shadows stay crisp
    const d = this.sunDirV || new THREE.Vector3(0, 1, 0);
    this.sun.target.position.set(this.camTarget.x, 0, 0);
    this.sun.position.copy(this.sun.target.position).addScaledVector(d, 60);
  }
}
