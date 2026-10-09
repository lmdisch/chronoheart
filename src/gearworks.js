// The Gearworks, inside the clock: Tempo (the Chronoheart's last gift) and the machines it bends.
//
// Inside the clock the ages are wound too tightly to pull apart, so the era keys become a dial:
// hold Q (back) to slow time around you, E (forward) to speed it up. Only machines within your
// bubble feel it; Vivienne moves as she always does. Tempo runs on the Chronoheart's ring.
import * as THREE from 'three';
import { ERA } from './core/util.js';
import { audio } from './audio/audio.js';
import { input } from './core/input.js';
import { T } from './world/world.js';
import { GEAR, L } from './levels/hollowmere.js';

export const TEMPO = { slow: 0.3, fast: 2.5 };
const RADIUS = 5.5; // how far the bubble reaches, in cells
const CHARGE_TIME = 6; // seconds of Tempo on a full ring
const RECHARGE_TIME = 3; // seconds to refill it, once you let go
const REWIND_EVERY = 5.5; // the lift room: the Tower's stutter throws the lift back down this often

const P = ERA.PRESENT;
const COL = { slow: 0x7fd8ff, fast: 0xffb84a };

/** Machines inside your bubble glow in the tempo's colour, so you can see exactly what you're bending. */
function tintAll(mats, k) {
  const col = k < 1 ? COL.slow : k > 1 ? COL.fast : 0x000000;
  for (const m of mats) {
    m.emissive.setHex(col);
    m.emissiveIntensity = k === 1 ? 0 : 0.55;
  }
}

// ---------------------------------------------------------------------------
// Machines. Each runs on its own clock (machine time), advanced by dt x its tempo factor.
// ---------------------------------------------------------------------------

/** A hammer the full depth of the room: raised for 40% of each beat, then it slams. */
class Hammer {
  constructor(gw, spec) {
    Object.assign(this, { gw, x: spec.x, y: spec.y, t: Math.random(), down: false });
    this.period = 0.5;
    this.cx = this.x + 0.5;
    this.cy = this.y + 1;
    const iron = new THREE.MeshStandardMaterial({ color: 0x55555f, metalness: 0.6, roughness: 0.45 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9963a, metalness: 0.6, roughness: 0.35 });
    this.head = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.96, 7), iron);
    block.position.set(0.5, 1, 3.5);
    block.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 7.04), brass);
    band.position.set(0.5, 0.3, 3.5);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), iron);
    shaft.position.set(0.5, 6, 3.5);
    this.head.add(block, band, shaft);
    this.mats = [iron, brass];
    this.head.position.set(this.x, this.y + 3, 0);
    gw.group.add(this.head);
    this.shown = 3;
  }
  update(mdt, f) {
    const g = this.gw.game, w = g.world;
    this.t = (this.t + mdt / this.period) % 1;
    const down = this.t >= 0.4;
    if (down !== this.down) {
      this.down = down;
      for (let y = this.y; y < this.y + 2; y++)
        for (let z = 0; z <= 6; z++) down ? w.setDyn(P, this.x, y, z, T.SOLID) : w.clearDyn(P, this.x, y, z);
      if (down) {
        const b = g.player.body;
        if (g.era === P && b.x + b.hw > this.x && b.x - b.hw < this.x + 1 && b.y < this.y + 2 && b.y + b.h > this.y) this.gw.crush();
        if (this.gw.near(this.cx, 9) && f < 1.5) audio.sfx('crush');
      }
    }
    // slam fast, lift slowly, both at the hammer's own pace
    const target = down ? 0 : 3;
    this.shown += (target - this.shown) * Math.min(1, (down ? 45 : 10) * mdt);
    this.head.position.y = this.y + this.shown;
  }
  unsafe(x, y) {
    return Math.abs(x - this.cx) < 1.4 && Math.abs(y - this.y) < 1;
  }
  tint(k) {
    tintAll(this.mats, k);
  }
}

/** A spring plate on an escapement: it kicks every beat, harder the faster it runs. */
class Spring {
  constructor(gw, spec) {
    Object.assign(this, { gw, ...spec, t: 0 });
    this.period = 1.2;
    this.cx = this.x + 0.5;
    this.cy = this.y;
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.6, roughness: 0.3, emissive: 0x3a2400 });
    const depth = this.z1 - this.z0 + 1;
    this.plate = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, depth - 0.06), brass);
    this.plate.position.set(this.x + 0.5, this.y + 0.06, this.z0 + depth / 2);
    this.coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a8a95, metalness: 0.7, roughness: 0.3 }));
    this.coil.rotation.x = Math.PI / 2;
    this.coil.position.set(this.x + 0.5, this.y + 0.03, this.z0 + depth / 2);
    gw.group.add(this.plate, this.coil);
    this.mats = [brass, this.coil.material];
  }
  tint(k) {
    tintAll(this.mats, k);
    if (k === 1) this.mats[0].emissive.setHex(0x3a2400), (this.mats[0].emissiveIntensity = 1);
  }
  update(mdt, f) {
    this.t += mdt;
    // the plate sinks as the spring winds, then snaps up
    const wind = Math.min(1, this.t / this.period);
    this.plate.position.y = this.y + 0.06 - wind * 0.08;
    if (this.t < this.period) return;
    this.t -= this.period;
    const g = this.gw.game, b = g.player.body;
    const on = g.era === P && b.onGround && Math.abs(b.y - this.y) < 0.15 && b.x > this.x - 0.2 && b.x < this.x + 1.2 && b.z > this.z0 - 0.2 && b.z < this.z1 + 1.2;
    if (on) {
      b.vy = 6 + 4.2 * f; // about 1.9 cells at normal speed, 4.9 when fast
      b.onGround = false;
      g.player.jumpCut = true;
      g.player.coyote = 0;
      audio.sfx('jump');
      g.bursts.emit(b.x, this.y + 0.1, b.z, 12, { color: [0xffd070, 0xffffff], speed: 2 + f, life: 0.4, gravity: 2 });
    } else if (this.gw.near(this.cx, 8)) audio.sfx('tick');
  }
  unsafe() {
    return false;
  }
}

/**
 * The lift to the mainspring. It rests, crawls up six cells, pauses a moment at the top, and
 * drops. Every few seconds the Tower stutters and throws it back to the bottom: too slow to
 * beat at normal speed, and its pause at the top is too short to step off unless you slow it.
 */
class Lift {
  constructor(gw, spec) {
    Object.assign(this, { gw, ...spec, m: 0, cur: 0 });
    this.cx = (this.x0 + this.x1 + 1) / 2;
    this.cy = this.y + 3;
    this.REST = 0.8;
    this.RISE = 7;
    this.TOP = 0.3;
    const w = this.x1 - this.x0 + 1, d = this.z1 - this.z0 + 1;
    this.col = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x6a6a74, metalness: 0.5, roughness: 0.5 }));
    this.cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.1), new THREE.MeshStandardMaterial({ color: 0xc9963a, metalness: 0.6, roughness: 0.35 }));
    this.col.position.set(this.x0 + w / 2, this.y, this.z0 + d / 2);
    this.cap.position.set(this.x0 + w / 2, this.y + 0.07, this.z0 + d / 2);
    gw.group.add(this.col, this.cap);
    this.shown = 0;
    this.mats = [this.col.material, this.cap.material];
  }
  tint(k) {
    tintAll(this.mats, k);
  }
  height() {
    const m = this.m;
    if (m < this.REST) return 0;
    if (m < this.REST + this.RISE) return Math.floor(((m - this.REST) / this.RISE) * this.h + 0.0001);
    if (m < this.REST + this.RISE + this.TOP) return this.h;
    return 0;
  }
  update(mdt) {
    this.m += mdt;
    if (this.m >= this.REST + this.RISE + this.TOP) this.m = 0;
    this.setHeight(this.height());
    if (this.cur < this.shown - 0.5) this.shown = this.cur; // it drops all at once
    else this.shown += (this.cur - this.shown) * Math.min(1, mdt * 20 + 0.02);
    this.col.scale.y = Math.max(0.001, this.shown);
    this.col.visible = this.shown > 0.02;
    this.cap.position.y = this.y + this.shown + 0.07;
  }
  setHeight(h) {
    if (h === this.cur) return;
    const g = this.gw.game, w = g.world, b = g.player.body;
    const onTop = g.era === P && b.x + b.hw > this.x0 && b.x - b.hw < this.x1 + 1 && b.z + b.hd > this.z0 && b.z - b.hd < this.z1 + 1;
    for (let x = this.x0; x <= this.x1; x++)
      for (let z = this.z0; z <= this.z1; z++)
        for (let y = this.y; y < this.y + Math.max(h, this.cur); y++) (y < this.y + h ? w.setDyn(P, x, y, z, T.SOLID) : w.clearDyn(P, x, y, z));
    // carry the rider up (they drop back down on their own)
    if (h > this.cur && onTop && b.y > this.y + this.cur - 0.6 && b.y < this.y + h + 0.05) {
      b.y = this.y + h;
      b.vy = 0;
    }
    if (h > this.cur && this.gw.near(this.cx, 10)) audio.sfx('tick');
    this.cur = h;
  }
  rewind() {
    this.m = 0;
    this.setHeight(0);
  }
  unsafe(x, y) {
    return x > this.x0 - 0.3 && x < this.x1 + 1.3 && y > this.y + 0.5;
  }
}

// ---------------------------------------------------------------------------

export class Gearworks {
  constructor(game) {
    this.game = game;
    this.mode = 0; // -1 slow, 0 normal, +1 fast
    this.charge = 1;
  }

  /** Called after the world is (re)built. */
  attach() {
    const g = this.game;
    this.group = new THREE.Group();
    g.world.groups[P].add(this.group);
    this.machines = [...GEAR.hammers.map((h) => new Hammer(this, h)), ...GEAR.springs.map((s) => new Spring(this, s))];
    this.lift = new Lift(this, GEAR.lift);
    this.machines.push(this.lift);
    this.rewindT = REWIND_EVERY;
    this.tickT = 0;
    // the clock's own gears, all over the back wall, turning at their own glitchy speeds
    this.gears = [];
    for (let i = 0; i < 26; i++) {
      const r = 0.6 + ((i * 37) % 10) / 4;
      const gx = GEAR.x0 + 1 + ((i * 53) % (GEAR.x1 - GEAR.x0 - 1)), gy = 1 + ((i * 29) % 22);
      const mat = new THREE.MeshStandardMaterial({ color: i % 3 ? 0xa8782a : 0x6a6a74, metalness: 0.6, roughness: 0.4 });
      const gear = new THREE.Group();
      gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.18, 20).rotateX(Math.PI / 2), mat));
      const teeth = 8 + Math.round(r * 4);
      for (let k = 0; k < teeth; k++) {
        const a = (k / teeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), mat);
        tooth.position.set(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, 0);
        tooth.rotation.z = a;
        gear.add(tooth);
      }
      gear.position.set(gx, gy, 0.12 + (i % 3) * 0.08); // just proud of the back wall
      gear.userData = { speed: (i % 2 ? 1 : -1) * (0.6 + (i % 5) * 0.3) / r, glitch: 1, glitchT: 0 };
      this.group.add(gear);
      this.gears.push(gear);
    }
    // the bubble: a faint sphere and a ring at your feet, blue when slow, amber when fast
    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 32, 16),
      new THREE.MeshBasicMaterial({ color: COL.slow, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.BackSide }),
    );
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS, 0.04, 6, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: COL.slow, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    this.bubble.visible = this.ring.visible = false;
    g.scene.add(this.bubble, this.ring);
    this.bubbleShown = 0;
  }

  /** Is the player inside the clock? */
  get active() {
    return !!this.game.state.flags.gearworksOpen && this.game.player && this.game.player.body.x >= L.gearX0 - 0.2;
  }

  near(x, r) {
    return Math.abs(this.game.player.body.x - x) < r;
  }

  /** The tempo a machine at (x, y) feels right now. */
  factor(m) {
    if (!this.mode) return 1;
    const b = this.game.player.body;
    if (Math.abs(b.x - m.cx) > RADIUS || Math.abs(b.y - m.cy) > RADIUS + 1) return 1;
    return this.mode < 0 ? TEMPO.slow : TEMPO.fast;
  }

  crush() {
    const g = this.game;
    g.renderer.shake = 0.6;
    g.onHazard();
  }

  /** No respawning under a hammer or on the lift. */
  unsafeAt(x, y) {
    return this.machines?.some((m) => m.unsafe(x, y));
  }

  update(dt, ctl) {
    const g = this.game, f = g.state.flags;
    const open = !!f.gearworksOpen;
    this.group.visible = open;
    if (!open) return;
    const inside = this.active;
    // Tempo: hold Q to slow, E to speed up, while there's charge in the ring
    let want = 0;
    if (inside && ctl && f.hasTempo) want = input.held('back') ? -1 : input.held('forward') ? 1 : 0;
    // an empty ring needs you to let go before it works again
    if (!want) this.spent = false;
    else if (this.charge <= 0) this.spent = true;
    if (this.spent) want = 0;
    if (want !== this.mode) {
      if (want) audio.sfx('shift', { era: want < 0 ? 0 : 2 });
      this.mode = want;
    }
    if (this.mode && !f.steadyHeart) this.charge = Math.max(0, this.charge - dt / CHARGE_TIME);
    else if (!this.mode) this.charge = Math.min(1, this.charge + dt / RECHARGE_TIME);
    if (f.steadyHeart) this.charge = 1;
    if (inside) g.hud.setMeter(this.charge, ERA.PRESENT, !!f.steadyHeart);
    document.body.classList.toggle('tempo-slow', inside && this.mode < 0);
    document.body.classList.toggle('tempo-fast', inside && this.mode > 0);
    document.body.classList.toggle('in-gearworks', inside && !!f.hasTempo);

    // the machines, each at its own tempo
    const running = g.mode === 'play' || g.mode === 'dialogue';
    if (running) for (const m of this.machines) {
      const k = this.factor(m);
      m.update(dt * k, k);
      if (k !== m.k) m.tint(k), (m.k = k);
    }
    // motes inside the bubble: drifting lazily when slow, streaking past when fast
    if (inside && this.mode && running) {
      const bb = g.player.body, n = this.mode > 0 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        if (Math.random() > dt * 30) continue;
        const a = Math.random() * Math.PI * 2, r = Math.random() * RADIUS * 0.9;
        g.bursts.emit(bb.x + Math.cos(a) * r, bb.y + 0.3 + Math.random() * 4, Math.min(6.5, Math.max(0.2, bb.z + Math.sin(a) * r * 0.5)), 1, this.mode > 0
          ? { color: [COL.fast, 0xffe0a0], speed: 7, life: 0.25, gravity: 0, jitter: 0.2 }
          : { color: [COL.slow, 0xd8f4ff], speed: 0.25, life: 1.8, gravity: -0.1, jitter: 0.2 });
      }
    }
    // inside the clock, the era dial reads Slow / Tempo / Fast, and the music keeps your time
    if (inside !== this.wasInside) {
      this.wasInside = inside;
      const pills = document.querySelectorAll('#chrono .era-pill');
      const names = inside ? ['Slow', 'Tempo', 'Fast'] : ['Past', 'Present', 'Future'];
      pills.forEach((p) => (p.textContent = names[Number(p.dataset.e)]));
      if (!inside) g.hud.setEra(g.era);
    }
    if (inside) document.querySelectorAll('#chrono .era-pill').forEach((p) => p.classList.toggle('active', Number(p.dataset.e) === this.mode + 1));
    if (this.mode !== this.shownMode) {
      this.shownMode = this.mode;
      const badge = document.getElementById('tempo-badge');
      if (badge) badge.textContent = this.mode < 0 ? '◀◀ Time slowed' : this.mode > 0 ? 'Time sped up ▶▶' : '';
      audio.setTempoScale(this.mode < 0 ? 0.5 : this.mode > 0 ? 1.6 : 1);
      if (this.mode && !g.state.flags.tempoExplained) {
        g.state.flags.tempoExplained = true;
        g.hud.toast(`Everything glowing inside the ring is <b>${this.mode < 0 ? 'slowed down' : 'sped up'}</b>. You move as normal.`, 4500);
      }
    }
    // the Tower's stutter throws the lift back down; a flicker warns you just before
    if (running) {
      this.rewindT -= dt;
      if (this.rewindT < 0.5 && this.rewindT + dt >= 0.5 && this.near(this.lift.cx, 14)) g.towerSurge = 0.5;
      if (this.rewindT <= 0) {
        this.rewindT = REWIND_EVERY;
        if (this.lift.cur > 0 && this.near(this.lift.cx, 14)) audio.sfx('glitch');
        this.lift.rewind();
      }
    }
    // the gears: glitching between fast and slow on their own, steady to your tempo nearby
    const b = g.player.body;
    for (const gear of this.gears) {
      const u = gear.userData;
      u.glitchT -= dt;
      if (u.glitchT <= 0) {
        u.glitchT = 0.6 + Math.random() * 2.4;
        u.glitch = [0.15, 1, 1, 3.5][Math.floor(Math.random() * 4)];
      }
      const mine = this.mode && Math.abs(b.x - gear.position.x) < RADIUS && Math.abs(b.y - gear.position.y) < RADIUS + 1;
      gear.rotation.z += u.speed * dt * (mine ? (this.mode < 0 ? TEMPO.slow : TEMPO.fast) : u.glitch);
    }
    // the bubble
    this.bubbleShown += ((this.mode && inside ? 1 : 0) - this.bubbleShown) * Math.min(1, dt * 10);
    const show = this.bubbleShown > 0.02;
    this.bubble.visible = this.ring.visible = show;
    if (show) {
      const col = this.mode < 0 ? COL.slow : COL.fast;
      if (this.mode) this.bubble.material.color.setHex(col), this.ring.material.color.setHex(col);
      const s = 0.85 + 0.15 * this.bubbleShown;
      this.bubble.scale.setScalar(s);
      this.ring.scale.setScalar(s);
      this.bubble.material.opacity = 0.07 * this.bubbleShown;
      this.ring.material.opacity = 0.55 * this.bubbleShown;
      this.bubble.position.set(b.x, b.y + 0.8, b.z);
      this.ring.position.set(b.x, b.y + 0.05, b.z);
    }
    // the clock ticks to your tempo
    if (inside) {
      this.tickT -= dt * (this.mode < 0 ? TEMPO.slow : this.mode > 0 ? TEMPO.fast : 1);
      if (this.tickT <= 0) {
        this.tickT = 0.5;
        audio.sfx('tick');
      }
    }
  }
}
