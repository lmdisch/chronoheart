// Particle systems: ambient era motes + pooled burst particles.
import * as THREE from 'three';

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const DOT = dotTexture();

const AMBIENT = [
  { count: 220, colors: [0xffe6a0, 0xffd070, 0xfff4d0], size: 0.12, vy: 0.08, drift: 0.25, glow: 2.0 },
  { count: 220, colors: [0xfff6d8, 0xffd9a0, 0xe0884a], size: 0.11, vy: -0.05, drift: 0.35, glow: 1.6 },
  { count: 260, colors: [0x36f0ff, 0xff3fd2, 0xa0e8ff], size: 0.09, vy: 0.25, drift: 0.15, glow: 1.6 },
];

export class Ambient {
  constructor(scene) {
    this.systems = AMBIENT.map((cfg) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(cfg.count * 3);
      const col = new Float32Array(cfg.count * 3);
      const seed = new Float32Array(cfg.count);
      const c = new THREE.Color();
      for (let i = 0; i < cfg.count; i++) {
        pos[i * 3] = Math.random() * 60 - 30;
        pos[i * 3 + 1] = Math.random() * 12;
        pos[i * 3 + 2] = Math.random() * 18 - 8;
        c.setHex(cfg.colors[i % cfg.colors.length]).multiplyScalar(cfg.glow);
        col.set([c.r, c.g, c.b], i * 3);
        seed[i] = Math.random() * 100;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: cfg.size, map: DOT, vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.85,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.visible = false;
      scene.add(pts);
      return { pts, cfg, seed, ox: 0 };
    });
  }
  setEra(era) {
    this.systems.forEach((s, i) => (s.pts.visible = i === era));
  }
  update(dt, t, cx) {
    for (const s of this.systems) {
      if (!s.pts.visible) continue;
      const p = s.pts.geometry.attributes.position.array;
      const n = s.cfg.count;
      for (let i = 0; i < n; i++) {
        const k = s.seed[i];
        p[i * 3] += Math.sin(t * 0.5 + k) * s.cfg.drift * dt;
        p[i * 3 + 1] += (s.cfg.vy + Math.sin(t + k) * 0.05) * dt;
        p[i * 3 + 2] += Math.cos(t * 0.4 + k) * s.cfg.drift * 0.5 * dt;
        // wrap around camera
        if (p[i * 3] < cx - 30) p[i * 3] += 60;
        if (p[i * 3] > cx + 30) p[i * 3] -= 60;
        if (p[i * 3 + 1] > 12) p[i * 3 + 1] = 0;
        if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 12;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }
}

const MAX = 900;
export class Bursts {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.base = new Float32Array(MAX * 3);
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999;
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.16, map: DOT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.next = 0;
  }
  emit(x, y, z, n, { color = 0xffffff, speed = 3, life = 0.6, gravity = 6, spread = 1, up = 0, glow = 2, jitter = 0 } = {}) {
    const c = new THREE.Color();
    const cols = Array.isArray(color) ? color : [color];
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      this.pos[i * 3] = x + (Math.random() - 0.5) * jitter;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * jitter;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * jitter;
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = Math.sin(b) * Math.cos(a) * s * spread;
      this.vel[i * 3 + 1] = Math.abs(Math.cos(b)) * s + up;
      this.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s * spread;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
      this.grav[i] = gravity;
      c.setHex(cols[k % cols.length]).multiplyScalar(glow);
      this.base.set([c.r, c.g, c.b], i * 3);
    }
  }
  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -999;
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.col[i * 3] = this.base[i * 3] * f;
      this.col[i * 3 + 1] = this.base[i * 3 + 1] * f;
      this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
