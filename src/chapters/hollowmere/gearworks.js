// Tempo, and the machines it bends: the Gearworks inside the clock, and the two regulators
// beside the Clocktower door.
//
// The Escapement Key teaches the Chronoheart Tempo: slow time around you, or speed it up. Only
// machines within your bubble feel it; Vivienne moves as she always does. On touch it's the Slow
// and Fast buttons. On a keyboard it's Q and E held down (a quick tap still travels an era; see
// Game.updatePlay); inside the clock, where the ages are wound too tightly to pull apart, they
// are Tempo from the first instant. It runs on the Chronoheart's ring.
import * as THREE from 'three';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { input } from '../../core/input.js';
import { T } from '../../world/world.js';
import { GEAR, L } from './level.js';

export const TEMPO = { slow: 0.3, fast: 2.5 };
const RADIUS = 5.5; // how far the bubble reaches, in cells
const CHARGE_TIME = 6; // seconds of Tempo on a full ring
const RECHARGE_TIME = 3; // seconds to refill it, once you let go
const REWIND_EVERY = 5.5; // the lift room: the Tower's stutter throws the lift back down this often

const P = ERA.PRESENT;
const COL = { slow: 0x7fd8ff, fast: 0xffb84a };

// The regulators: two flywheels by the Clocktower door (Present), far enough apart that your
// bubble only holds one. The Tower's stutter has knocked them out of step, and the great lock
// won't turn until they beat together: bend one until its marker comes round with the other's.
const REGS = [{ x: L.towerX0 - 13.5, phase: 0 }, { x: L.towerX0 - 2, phase: 0.4 }];
const REG_PERIOD = 3; // seconds a turn
const REG_TOL = 0.07; // how close (in turns) counts as in step
const REG_HOLD = 1.2; // seconds they must stay in step, untouched, to lock together

class Regulator {
  constructor(parent, spec) {
    this.cx = spec.x;
    this.phase = spec.phase;
    const brass = new THREE.MeshStandardMaterial({ color: 0xb8892e, metalness: 0.6, roughness: 0.4 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x4a4a54, metalness: 0.5, roughness: 0.6 });
    this.mats = [brass];
    const g = (this.group = new THREE.Group());
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.3, 0.3), iron);
    post.position.y = 1.15;
    this.wheel = new THREE.Group();
    this.wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 8, 28), brass));
    for (let k = 0; k < 4; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), brass);
      spoke.rotation.z = (k / 4) * Math.PI;
      this.wheel.add(spoke);
    }
    // the marker that comes round once a turn, and the notch it passes at the top
    this.markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), this.markMat);
    mark.position.y = 0.95;
    this.wheel.add(mark);
    this.wheel.position.set(0, 2.5, 0.22);
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.2), iron);
    notch.position.set(0, 3.72, 0.22);
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0x402c10 });
    this.lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), this.lampMat);
    this.lamp.position.set(0, 4.1, 0.22);
    g.add(post, this.wheel, notch, this.lamp);
    g.position.set(spec.x, 0, 0.45);
    parent.add(g);
  }
  /** Returns true on the beat (as the marker passes the notch). */
  update(dt, k, synced) {
    const before = this.phase;
    this.phase = (this.phase + dt / REG_PERIOD) % 1;
    this.wheel.rotation.z = -this.phase * Math.PI * 2;
    const flash = Math.max(0, 1 - Math.min(this.phase, 1 - this.phase) / 0.06);
    const col = synced ? 0xffd070 : k < 1 ? COL.slow : k > 1 ? COL.fast : 0xff7040;
    this.lampMat.color.setHex(col).multiplyScalar(0.25 + flash * 3);
    this.markMat.color.setHex(col).multiplyScalar(2.2);
    if (k !== this.k) tintAll(this.mats, (this.k = k));
    return this.phase < before;
  }
}

/** Machines inside your bubble glow in the tempo's color, so you can see exactly what you're bending. */
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

/**
 * A whipping escapement arm guarding one of the three summit escapement pins. At normal speed it
 * spins too fast to approach; slow it with Tempo to step in and strike the pin with your wrench.
 */
class EscapementArm {
  constructor(gw, spec) {
    Object.assign(this, { gw, ...spec, cx: spec.x, cy: spec.y, angle: 0 });
    this.pivot = new THREE.Group();
    this.pivot.position.set(this.x, this.y + 0.55, this.z);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xb8862a, metalness: 0.65, roughness: 0.35 });
    const tipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a3a).multiplyScalar(2) });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 10), armMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.18), armMat);
    blade.position.set(0.62, 0, 0);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), tipMat);
    tip.position.set(1.22, 0, 0);
    this.pivot.add(hub, blade, tip);
    gw.group.add(this.pivot);
    this.mats = [armMat];
  }
  tint(k) {
    tintAll(this.mats, k);
  }
  update(mdt) {
    const g = this.gw.game, locked = !!g.state.flags[this.flag];
    this.pivot.visible = !locked;
    if (locked) return;
    this.angle += this.speed * mdt;
    this.pivot.rotation.y = this.angle;
    if (g.era !== P || g.mode !== 'play' || g.player.invuln > 0 || g.player.state === 'roll') return;
    const b = g.player.body;
    if (Math.abs(b.y - this.y) > 0.9) return;
    // check distance to the sweeping blade tip and mid-blade
    for (const r of [0.65, 1.18]) {
      const bx = this.x + Math.cos(this.angle) * r;
      const bz = this.z - Math.sin(this.angle) * r;
      if (Math.hypot(b.x - bx, b.z - bz) < 0.48) {
        g.player.hurt(1, this.x);
        break;
      }
    }
  }
  unsafe(x, y) {
    return !this.gw.game.state.flags[this.flag] && Math.abs(x - this.x) < 1.5 && Math.abs(y - this.y) < 1.5;
  }
}

/**
 * The Runaway Mainspring's floor pulse: while any escapement pin remains unlocked, the wild
 * mainspring sends a golden shockwave ring across the summit floor every few seconds. Jump or
 * roll over the ring as it expands (Tempo slows it too).
 */
class MainspringWave {
  constructor(gw, spec) {
    Object.assign(this, { gw, cx: spec.x, cy: spec.y, z: spec.z, r: 0, cooldown: 1.5 });
    this.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.06, 8, 48).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb03a).multiplyScalar(2), transparent: true, opacity: 0.85 }),
    );
    this.mesh.position.set(this.cx, this.cy + 0.14, this.z);
    this.mesh.visible = false;
    gw.group.add(this.mesh);
  }
  tint() {}
  update(mdt) {
    const g = this.gw.game, f = g.state.flags, b = g.player.body;
    const active = !f.mainspringCalmed && !f.finished && g.era === P && b.x >= 335.2 && b.y >= this.cy - 0.5;
    if (!active) {
      this.mesh.visible = false;
      this.r = 0;
      return;
    }
    if (this.r <= 0) {
      this.cooldown -= mdt;
      if (this.cooldown <= 0) {
        this.r = 0.4;
        this.cooldown = 2.4;
        audio.sfx('tick');
      }
      this.mesh.visible = false;
      return;
    }
    this.r += mdt * 3.4;
    if (this.r > 7.2) {
      this.r = 0;
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.mesh.scale.set(this.r, 1, this.r);
    this.mesh.material.opacity = Math.max(0, 0.9 * (1 - this.r / 7.2));
    // Low floor pulse: jump or roll over it
    if (g.mode === 'play' && b.y < this.cy + 0.35 && g.player.state !== 'roll' && g.player.invuln <= 0) {
      const d = Math.hypot(b.x - this.cx, b.z - this.z);
      if (Math.abs(d - this.r) < 0.32) {
        g.player.hurt(1, this.cx);
      }
    }
  }
  unsafe() {
    return false;
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
    this.machines = [
      ...GEAR.hammers.map((h) => new Hammer(this, h)),
      ...GEAR.springs.map((s) => new Spring(this, s)),
      ...GEAR.pins.map((p) => new EscapementArm(this, p)),
      new MainspringWave(this, GEAR.mainspring),
    ];
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
    // the regulators stand in the courtyard from the start, beating out of step
    this.yard = new THREE.Group();
    g.world.groups[P].add(this.yard);
    this.regs = REGS.map((r) => new Regulator(this.yard, r));
    if (g.state.flags.regulatorsSynced) this.regs[1].phase = this.regs[0].phase;
    this.syncT = 0;
  }

  /** Is the player inside the clock? */
  get active() {
    return !!this.game.state.flags.gearworksOpen && this.game.player && this.game.player.body.x >= L.gearX0 - 0.2;
  }

  near(x, r) {
    return Math.abs(this.game.player.body.x - x) < r;
  }

  /** The tempo something at (x, y) feels right now: 1 unless it's inside your bubble. */
  tempoAt(x, y) {
    if (!this.mode) return 1;
    const b = this.game.player.body;
    if (Math.abs(b.x - x) > RADIUS || Math.abs(b.y - y) > RADIUS + 1) return 1;
    return this.mode < 0 ? TEMPO.slow : TEMPO.fast;
  }

  factor(m) {
    return this.tempoAt(m.cx, m.cy);
  }

  /** The courtyard regulators: each turns at its own tempo, and they lock once they agree. */
  updateRegulators(dt) {
    const g = this.game, f = g.state.flags, b = g.player.body;
    const here = g.era === P && Math.abs(b.x - (REGS[0].x + REGS[1].x) / 2) < 16;
    const synced = !!f.regulatorsSynced;
    for (const r of this.regs) {
      const k = synced || g.era !== P ? 1 : this.tempoAt(r.cx, 0);
      if (r.update(dt * k, k, synced) && here && (!synced || r === this.regs[0])) audio.sfx('tick');
    }
    if (synced) return;
    const [a, c] = this.regs;
    let d = Math.abs(a.phase - c.phase);
    d = Math.min(d, 1 - d);
    this.syncT = d < REG_TOL && !this.mode ? this.syncT + dt : 0;
    if (this.syncT > REG_HOLD && g.mode === 'play' && f.hasTempo) {
      f.regulatorsSynced = true;
      c.phase = a.phase;
      audio.sfx('checkpoint');
      for (const r of this.regs) g.bursts.emit(r.cx, 2.5, 0.8, 24, { color: [0xffd070, 0xffffff], speed: 3, life: 0.8, gravity: -0.5, glow: 2 });
      g.hud.toast("<b>In step!</b> The regulators beat together, and the Clocktower's lock is free to turn.", 5000);
      g.save();
    }
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
    const inside = this.active;
    // Tempo: the Slow / Fast buttons, or Q / E held down (g.tempoHold)
    let want = 0;
    if (ctl && f.hasTempo && !input.held('peek')) want = input.held('slow') || g.tempoHold < 0 ? -1 : input.held('fast') || g.tempoHold > 0 ? 1 : 0;
    // it runs on the Chronoheart's ring: the clock's own inside the Gearworks, and outside it the
    // same ring era travel uses. An empty ring needs you to let go before it works again.
    if (!want) this.spent = false;
    else if ((inside ? this.charge : g.meter) <= 0.02) this.spent = true;
    if (this.spent) want = 0;
    if (want !== this.mode) {
      if (want) audio.sfx('shift', { era: want < 0 ? 0 : 2 });
      this.mode = want;
    }
    if (inside) {
      if (this.mode && !f.steadyHeart) this.charge = Math.max(0, this.charge - dt / CHARGE_TIME);
      else if (!this.mode) this.charge = Math.min(1, this.charge + dt / RECHARGE_TIME);
      if (f.steadyHeart) this.charge = 1;
      g.hud.setMeter(this.charge, ERA.PRESENT, !!f.steadyHeart);
    } else {
      this.charge = 1;
      if (this.mode && !f.steadyHeart) g.meter = Math.max(0, g.meter - dt / CHARGE_TIME);
    }
    document.body.classList.toggle('tempo-slow', this.mode < 0);
    document.body.classList.toggle('tempo-fast', this.mode > 0);
    document.body.classList.toggle('in-gearworks', inside && !!f.hasTempo);

    // the machines, each at its own tempo
    const running = g.mode === 'play' || g.mode === 'dialogue';
    if (running) this.updateRegulators(dt);
    if (open && running) for (const m of this.machines) {
      const k = this.factor(m);
      m.update(dt * k, k);
      if (k !== m.k) m.tint(k), (m.k = k);
    }
    // motes inside the bubble: drifting lazily when slow, streaking past when fast
    if (this.mode && running) {
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
    const dial = inside;
    if (dial !== this.wasDial) {
      this.wasDial = dial;
      const pills = document.querySelectorAll('#chrono .era-pill');
      const names = dial ? ['Slow', 'Tempo', 'Fast'] : ['Past', 'Present', 'Future'];
      pills.forEach((p) => (p.textContent = names[Number(p.dataset.e)]));
      document.getElementById('chrono').classList.toggle('tempo', dial);
      if (!dial) g.hud.setEra(g.era);
    }
    if (dial) document.querySelectorAll('#chrono .era-pill').forEach((p) => p.classList.toggle('active', Number(p.dataset.e) === this.mode + 1));
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
    if (open && running) {
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
    if (open) for (const gear of this.gears) {
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
    this.bubbleShown += ((this.mode ? 1 : 0) - this.bubbleShown) * Math.min(1, dt * 10);
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
