// Sprite effects: little pixel-art cards of light (crystals, gear-dials, hairsprings, flashes,
// shock rings, Donald Eugene's bolts) that grow, spin, drift and fade, and afterimages: a
// character's own shape left hanging in the air in a color of light. The wrench's waves
// (src/kit.js) and the End of Time (src/chapters/summit/duel.js) are drawn with these. Everything is
// pooled, and drawn additive, so the bloom makes it glow.
import * as THREE from 'three';

const S = 32;
const px = (c, x, y, col) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), 1, 1);
};
const W = '#ffffff', D = 'rgba(255,255,255,0.55)';

function line(c, x0, y0, x1, y1, col, w = 1) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5) || 1;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    for (let k = 0; k < w; k++) px(c, x + (k % 2), y + (k >> 1), col);
  }
}
function ring(c, cx, cy, r, col, gap = 0) {
  const n = Math.ceil(r * 7);
  for (let i = 0; i < n; i++) {
    if (gap && i % gap === 0) continue;
    const a = (i / n) * Math.PI * 2;
    px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, col);
  }
}

/** A pixel card: drawn at 32x32 (or size), kept sharp. */
function card(draw, size = S, smooth = false) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  draw(c, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (!smooth) {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  return t;
}

/** Every card, by name. All are white (or nearly): a sprite's color tints them. */
export const CARDS = {
  glow: card((c, n) => {
    const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, n, n);
  }, 64, true),
  // a four-point star: the flash of a shot leaving, or landing
  flash: card((c) => {
    for (let i = 0; i < 15; i++) {
      const w = Math.max(0, 2 - Math.floor(i / 5));
      for (let k = -w; k <= w; k++) {
        const col = Math.abs(k) === w && w ? D : W;
        px(c, 16 + k, 16 - i, col); px(c, 16 + k, 16 + i, col);
        px(c, 16 - i, 16 + k, col); px(c, 16 + i, 16 + k, col);
      }
    }
    for (let i = 1; i < 7; i++) {
      px(c, 16 + i, 16 + i, D); px(c, 16 - i, 16 - i, D); px(c, 16 + i, 16 - i, D); px(c, 16 - i, 16 + i, D);
    }
    c.fillStyle = W;
    c.fillRect(13, 13, 7, 7);
  }),
  ring: card((c) => {
    ring(c, 16, 16, 14, W);
    ring(c, 16, 16, 13, D, 3);
  }),
  // the Stasis ring's crystal: six arms, branched, like frost
  snow: card((c) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      line(c, 16, 16, 16 + ca * 14, 16 + sa * 14, W);
      for (const [d, l] of [[6, 4], [10, 3]]) {
        const bx = 16 + ca * d, by = 16 + sa * d;
        for (const s of [-1, 1]) {
          const b = a + s * 0.9;
          line(c, bx, by, bx + Math.cos(b) * l, by + Math.sin(b) * l, D);
        }
      }
    }
    ring(c, 16, 16, 3, W);
    px(c, 16, 16, W);
  }),
  // a hexagon with a star inside: the frost sigil where a Stasis wave lands
  hex: card((c) => {
    const pt = (k, r) => [16 + Math.cos((k / 6) * Math.PI * 2) * r, 16 + Math.sin((k / 6) * Math.PI * 2) * r];
    for (let k = 0; k < 6; k++) {
      const [x0, y0] = pt(k, 14), [x1, y1] = pt(k + 1, 14), [x2, y2] = pt(k + 2, 14);
      line(c, x0, y0, x1, y1, W);
      line(c, x0, y0, x2, y2, D);
    }
    ring(c, 16, 16, 5, W, 2);
  }),
  // the Escapement: a toothed gear round a hub
  gear: card((c) => {
    ring(c, 16, 16, 10, W);
    ring(c, 16, 16, 9, D);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      for (let r = 11; r <= 13.5; r += 0.5) for (const s of [-0.12, 0, 0.12]) px(c, 16 + Math.cos(a + s) * r, 16 + Math.sin(a + s) * r, W);
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      line(c, 16, 16, 16 + Math.cos(a) * 8, 16 + Math.sin(a) * 8, D);
    }
    ring(c, 16, 16, 2.5, W);
  }),
  // a clock face, without its hand (the hand is a card of its own, so it can turn)
  dial: card((c) => {
    ring(c, 16, 16, 14, W);
    ring(c, 16, 16, 12.5, D, 4);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, l = k % 3 === 0 ? 4 : 2;
      line(c, 16 + Math.cos(a) * (12 - l), 16 + Math.sin(a) * (12 - l), 16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, W);
    }
    px(c, 16, 16, W);
  }),
  hand: card((c) => {
    line(c, 16, 17, 16, 5, W, 2);
    px(c, 15, 6, W); px(c, 18, 6, W); px(c, 16, 3, W); px(c, 17, 3, W);
    c.fillStyle = W;
    c.fillRect(14, 15, 4, 4);
  }),
  // the Hairspring: a coil, wound tight in the middle
  spiral: card((c) => {
    for (let a = 0; a < Math.PI * 5; a += 0.05) {
      const r = 1 + a * 0.82;
      px(c, 16 + Math.cos(a) * r, 16 + Math.sin(a) * r, W);
      if (a > 3) px(c, 16 + Math.cos(a) * (r - 0.8), 16 + Math.sin(a) * (r - 0.8), D);
    }
    line(c, 16 + Math.cos(Math.PI * 5) * 13.9, 16 + Math.sin(Math.PI * 5) * 13.9, 30, 14, W);
  }),
  // a shard of ice (or glass), for trails
  shard: card((c) => {
    for (let y = 0; y < 14; y++) {
      const w = Math.round((y < 5 ? y / 5 : (14 - y) / 9) * 3);
      for (let x = -w; x <= w; x++) px(c, 8 + x, 1 + y, Math.abs(x) === w ? D : W);
    }
  }, 16),
  // his bolt: a hot core, a hard rim, and crackle round it
  orb: card((c) => {
    c.fillStyle = W;
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y <= 42) c.fillRect(16 + x, 16 + y, 1, 1);
    ring(c, 16, 16, 9, W);
    ring(c, 16, 16, 10, D, 2);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + Math.sin(k * 7.3), r = 11 + (k % 3);
      px(c, 16 + Math.cos(a) * r, 16 + Math.sin(a) * r, k % 2 ? W : D);
      px(c, 16 + Math.cos(a) * (r + 1), 16 + Math.sin(a) * (r + 1), D);
    }
  }),
};

const ghostGeo = new THREE.PlaneGeometry(1, 1);
const GAIN = 0.7; // (under the bloom, anything much brighter turns to a white blur and loses its shape)

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.free = [];
    this.ghosts = [];
    this.freeGhosts = [];
  }

  /**
   * One card of light at (x, y, z). Options: life (seconds), size (world units) and grow (its size
   * at the end, times size), color and glow (brightness), alpha, fade ('out', 'in', 'inout', 'none'),
   * rot and spin (radians, per second; tick: turn in steps of that many radians instead), velocity
   * (vx, vy, vz) and gravity, drag, follow (a function giving where to be, each frame), delay.
   */
  spawn(name, x, y, z, o = {}) {
    let it = this.free.pop();
    if (!it) {
      const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(mat);
      s.renderOrder = 6;
      s.frustumCulled = false;
      this.scene.add(s);
      it = { s, mat };
    }
    const m = it.mat;
    if (m.map !== CARDS[name]) {
      m.map = CARDS[name];
      m.needsUpdate = true;
    }
    m.blending = o.normal ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.depthTest = o.onTop ? false : true;
    m.color.setHex(o.color ?? 0xffffff).multiplyScalar((o.glow ?? 2) * GAIN);
    Object.assign(it, {
      x, y, z, t: 0, life: o.life ?? 0.4, size: o.size ?? 1, grow: o.grow ?? 1, alpha: (o.alpha ?? 1) * (name === 'glow' ? 0.55 : 1), fade: o.fade || 'out',
      rot: o.rot ?? Math.random() * Math.PI * 2, spin: o.spin ?? 0, tick: o.tick || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      gravity: o.gravity || 0, drag: o.drag || 0, follow: o.follow || null, delay: o.delay || 0, sx: o.sx ?? 1, sy: o.sy ?? 1, dead: false,
    });
    it.s.visible = false;
    this.items.push(it);
    return it;
  }

  /** A burst of cards flying out from a point (shards, sparks). */
  scatter(name, x, y, z, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, up = (o.up ?? 0.5) + Math.random() * (o.lift ?? 1), sp = (o.speed ?? 3) * (0.5 + Math.random() * 0.5);
      this.spawn(name, x, y, z, { ...o, vx: Math.cos(a) * sp, vy: up * sp * 0.6, vz: Math.sin(a) * sp * 0.4, life: (o.life ?? 0.5) * (0.7 + Math.random() * 0.6), spin: (Math.random() - 0.5) * (o.spinAmt ?? 12) });
    }
  }

  /**
   * An afterimage: the actor's shape as it is this instant, left behind in a color of light,
   * fading over `life` seconds. (Its geometry is the actor's own, cached frame: nothing to dispose.)
   */
  ghost(actor, color, { life = 0.4, alpha = 0.55, glow = 1.6, drift = null } = {}) {
    let gh = this.freeGhosts.pop();
    if (!gh) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: false });
      const mesh = new THREE.Mesh(ghostGeo, mat);
      mesh.renderOrder = 5;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      gh = { mesh, mat };
    }
    const src = actor.look.root;
    gh.mesh.geometry = src.geometry;
    actor.mesh.updateWorldMatrix(true, false);
    src.updateWorldMatrix(false, false);
    src.matrixWorld.decompose(gh.mesh.position, gh.mesh.quaternion, gh.mesh.scale);
    gh.mat.color.setHex(color).multiplyScalar(glow);
    Object.assign(gh, { t: 0, life, alpha, drift });
    gh.mat.opacity = alpha;
    gh.mesh.visible = true;
    this.ghosts.push(gh);
    return gh;
  }

  /** Everything off, at once (a scene change). */
  clear() {
    for (const it of this.items) {
      it.s.visible = false;
      this.free.push(it);
    }
    for (const gh of this.ghosts) {
      gh.mesh.visible = false;
      this.freeGhosts.push(gh);
    }
    this.items = [];
    this.ghosts = [];
  }

  update(dt) {
    for (const it of this.items) {
      if (it.delay > 0) {
        it.delay -= dt;
        continue;
      }
      it.t += dt;
      const k = Math.min(1, it.t / it.life);
      if (it.follow) {
        const p = it.follow();
        if (!p) it.t = it.life;
        else {
          it.x = p.x;
          it.y = p.y;
          it.z = p.z;
        }
      }
      it.vy -= it.gravity * dt;
      if (it.drag) {
        const d = Math.exp(-it.drag * dt);
        it.vx *= d;
        it.vy *= d;
        it.vz *= d;
      }
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.z += it.vz * dt;
      it.rot += it.spin * dt;
      const s = it.s, sz = it.size * (1 + (it.grow - 1) * (1 - (1 - k) * (1 - k)));
      s.visible = true;
      s.position.set(it.x, it.y, it.z);
      s.scale.set(sz * it.sx, sz * it.sy, 1);
      it.mat.rotation = it.tick ? Math.round(it.rot / it.tick) * it.tick : it.rot;
      const f = it.fade === 'none' ? 1 : it.fade === 'in' ? k : it.fade === 'inout' ? Math.min(1, k * 4, (1 - k) * 3) : 1 - k * k;
      it.mat.opacity = it.alpha * f;
      if (it.t >= it.life) it.dead = true;
    }
    if (this.items.some((it) => it.dead)) {
      this.items = this.items.filter((it) => {
        if (!it.dead) return true;
        it.s.visible = false;
        this.free.push(it);
        return false;
      });
    }
    for (const gh of this.ghosts) {
      gh.t += dt;
      const k = Math.min(1, gh.t / gh.life);
      gh.mat.opacity = gh.alpha * (1 - k);
      if (gh.drift) gh.mesh.position.addScaledVector(gh.drift, dt);
      if (k >= 1) gh.dead = true;
    }
    if (this.ghosts.some((g) => g.dead)) {
      this.ghosts = this.ghosts.filter((gh) => {
        if (!gh.dead) return true;
        gh.mesh.visible = false;
        this.freeGhosts.push(gh);
        return false;
      });
    }
  }
}
