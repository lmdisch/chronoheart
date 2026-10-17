// Chapter Three's powers: the Lantern and the Echo, and the pressure plates and gates they're for.
//
// The Lantern (R) works like the time lens, made real. Light it, and a bubble of another age opens
// around you: inside it, that age's floors, bridges and ice are the real ones (see World.cell).
// While it's lit, Q and E swing its light back and forth between the ages instead of moving you.
// It won't go out while its age is all that's holding you up.
//
// Echoes (V), as in Chapter One: record a few seconds of yourself, and an echo walks those steps
// over and over. Up to three at once; a fourth replaces the oldest. They live outside time, in
// every age at once, and they can stand on plates.
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { audio } from '../../audio/audio.js';
import { Actor } from '../../render/actors.js';
import { T } from '../../world/world.js';
import { touchActive } from '../../ui/touch.js';
import { PLATES, GATES } from './level.js';
import theme from './theme.js';

export const BUBBLE_R = 3.4;
const ECHO_TONE = 0xbff6ff;
const PLATE_HOLD = 0.6; // seconds a plate stays down after a foot leaves it
const GATE_H = 4;
const key = (k, touch) => (touchActive() ? `<b>${touch}</b>` : `<kbd>${k}</kbd>`);

/** A small brass lantern that glows the color of the age it shows. */
function lanternMesh() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a44a, metalness: 0.7, roughness: 0.35 });
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.26), brass);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 4), brass);
  top.position.y = 0.23;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), brass);
  ring.position.y = 0.34;
  g.add(cage, glass, top, ring);
  g.userData.glass = glass;
  return g;
}

export class Powers {
  constructor(game) {
    this.game = game;
    this.status = document.getElementById('ability-status');
  }

  /** Called after the world is (re)built. */
  attach() {
    const g = this.game;
    this.lit = false;
    this.age = 0;
    for (const e of this.echoes || []) e.remove();
    this.echoes = [];
    this.rec = null;
    g.world.bubble = null;
    if (this.mesh) g.scene.remove(this.mesh, this.light);
    for (const o of this.extras || []) g.scene.remove(o);
    this.extras = [];
    this.mesh = lanternMesh();
    this.light = new THREE.PointLight(0xffffff, 0, 6, 1.8);
    g.scene.add(this.mesh, this.light);
    this.plates = PLATES.map((p) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.92), new THREE.MeshStandardMaterial({ color: 0x2a2630, roughness: 0.7 }));
      base.position.set(p.x + 0.5, p.y + 0.03, p.z + 0.5);
      const mat = new THREE.MeshBasicMaterial({ color: p.color });
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.64), mat);
      top.position.set(p.x + 0.5, p.y + 0.07, p.z + 0.5);
      let rim = null;
      if (p.requiresAge !== undefined) {
        rim = new THREE.Mesh(
          new THREE.BoxGeometry(0.84, 0.1, 0.84),
          new THREE.MeshBasicMaterial({ color: 0x9ce2ff, transparent: true, opacity: 0.55 }),
        );
        rim.position.set(p.x + 0.5, p.y + 0.06, p.z + 0.5);
        g.scene.add(rim);
        this.extras.push(rim);
      }
      g.scene.add(base, top);
      this.extras.push(base, top);
      return { ...p, mat, top, rim, pressed: false, held: 0 };
    });
    this.gates = GATES.map((spec) => this.makeGate(spec));
    this.syncBody();
  }

  get hasLantern() {
    return !!this.game.state.flags.hasLantern;
  }
  get hasEcho() {
    return !!this.game.state.flags.hasEcho;
  }
  get recording() {
    return !!this.rec;
  }
  syncBody() {
    document.body.classList.toggle('has-lantern', this.hasLantern);
    document.body.classList.toggle('has-echo', this.hasEcho);
    document.body.classList.toggle('recording', this.recording);
    document.body.classList.toggle('lantern-lit', this.lit);
  }

  // ------------------------------------------------------------------ the Lantern
  /** Is the player held up only by the lantern's age? (Then it mustn't go out.) */
  standingOnBubble(bubble = this.game.world.bubble) {
    const w = this.game.world, b = this.game.player.body, keep = w.bubble;
    if (!bubble) return false;
    const e = this.game.era, x = Math.floor(b.x), z = Math.floor(b.z);
    const below = Math.floor(b.y + 0.01) - 1, mid = Math.floor(b.y + 0.5);
    const look = () => [w.cell(e, x, below, z), w.cell(e, x, mid, z)];
    w.bubble = bubble;
    const withIt = look();
    w.bubble = null;
    const without = look();
    w.bubble = keep;
    const holds = (c) => c === T.SOLID || c === T.LADDER || c === T.WATER;
    return (holds(withIt[0]) && !holds(without[0])) || (withIt[1] === T.LADDER && without[1] !== T.LADDER);
  }

  /** The next age the Lantern can show, back (-1) or forward (+1): any but the one you're in. */
  pickAge(dir) {
    const era = this.game.era;
    let a = this.age + dir;
    if (a === era) a += dir;
    return a < 0 || a > 2 ? this.age : a;
  }

  toggleLantern() {
    const g = this.game;
    if (!this.hasLantern) return;
    if (this.lit) {
      if (this.standingOnBubble()) return g.hud.toast("Not here: the Lantern's light is all that's holding you up.", 3000);
      this.lit = false;
      audio.sfx('push');
      this.syncBody();
      return;
    }
    this.age = g.era === 0 ? 1 : 0; // it always lights on the First Age (or, in the First Age, on Golden Hour); Q / E from there
    this.lit = true;
    this.syncBody();
    audio.sfx('shift', { era: this.age });
    const c = this.center();
    g.bursts.emit(c.x, c.y, c.z, 30, { color: [theme.eraRing[this.age], 0xffffff], speed: 3, life: 0.6, gravity: 0, glow: 2 });
    if (!g.state.flags.lanternLitHint) {
      g.state.flags.lanternLitHint = true;
      g.hud.toast(`Inside the Lantern's light, <b>${g.eraLabel(this.age)}</b> is real. While it's lit, ${key('Q', 'Past')} / ${key('E', 'Future')} change its age. ${key('R', 'Lantern')} puts it out.`, 8000);
    }
  }

  /** While lit: Q / E swing the light to another age (it never moves you). */
  swing(dir) {
    const g = this.game, next = this.pickAge(dir);
    if (next === this.age) return audio.sfx('blocked');
    const nb = { ...g.world.bubble, age: next };
    if (this.standingOnBubble() && !this.standingOnBubble(nb)) {
      const b = g.player.body;
      if (g.world.cell(g.era, Math.floor(b.x), Math.floor(b.y + 0.01) - 1, Math.floor(b.z)) !== T.SOLID) return g.hud.toast("Not here: the Lantern's light is all that's holding you up.", 3000);
    }
    this.age = next;
    audio.sfx('shift', { era: next });
  }

  center() {
    const b = this.game.player.body;
    return { x: b.x, y: b.y + 1, z: b.z };
  }

  updateLantern() {
    const g = this.game, w = g.world;
    if (this.lit && this.age === g.era) this.age = this.pickAge(1) === this.age ? this.pickAge(-1) : this.pickAge(1);
    w.bubble = this.lit ? { ...this.center(), r: BUBBLE_R, age: this.age } : null;
    const show = this.hasLantern && g.mode !== 'title' && g.mode !== 'credits';
    this.mesh.visible = show;
    if (show) {
      const p = g.player.body, flip = g.player.actor.flip;
      this.mesh.position.set(p.x + (flip ? -0.42 : 0.42), p.y + 0.72 + Math.sin(g.time * 3) * 0.02, p.z + 0.15);
      const col = new THREE.Color(theme.eraRing[this.lit ? this.age : g.era]);
      this.mesh.userData.glass.material.color.copy(col).multiplyScalar(this.lit ? 2.4 : 0.5);
      this.light.position.copy(this.mesh.position);
      this.light.color.copy(col);
      this.light.intensity = this.lit ? 3 : 0;
    } else this.light.intensity = 0;
  }

  /** The bubble's window: like the time lens, but as big as the Lantern's reach. */
  drawBubble() {
    const g = this.game, w = g.world;
    if (!w.bubble || g.post.trans < 1) return false;
    const cam = g.renderer.camera, tu = g.post.time.uniforms;
    const c = new THREE.Vector3(w.bubble.x, w.bubble.y, w.bubble.z);
    const v = c.clone().project(cam);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const v2 = c.clone().addScaledVector(up, BUBBLE_R).project(cam);
    tu.peekTint.value.setHex(theme.eraRing[w.bubble.age]);
    tu.peekCenter.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    tu.peekR.value = Math.abs(v2.y - v.y) * 0.5;
    g.post.peekAmt += (1 - g.post.peekAmt) * 0.25;
    g.captureEra(w.bubble.age);
    return true;
  }

  // ------------------------------------------------------------------ Echoes
  get echoMax() {
    return this.game.state.inventory.includes('myWatch') ? 8 : 5; // your own watch remembers longer
  }
  get echoLimit() {
    return this.game.state.inventory.includes('myWatch') ? 4 : 3; // and holds four echoes instead of three
  }

  updateEcho(dt, ctl) {
    const g = this.game, b = g.player.body;
    if (!this.hasEcho) return;
    if (ctl && input.hit('echo')) {
      if (this.rec) this.stopRecording();
      else this.startRecording();
    }
    if (this.rec) {
      this.rec.t += dt;
      this.rec.frames.push({
        t: this.rec.t,
        x: b.x,
        y: b.y,
        z: b.z,
        flip: g.player.actor.flip,
        anim: g.player.actor.anim,
        lanternAge: this.lit ? this.age : null,
      });
      if (this.rec.t >= this.echoMax) this.stopRecording();
    }
    for (const e of this.echoes) e.update(dt);
  }

  startRecording() {
    const g = this.game;
    this.rec = { t: 0, frames: [] };
    audio.sfx('snap');
    this.syncBody();
    if (!g.state.flags.echoRecHint) {
      g.state.flags.echoRecHint = true;
      g.hud.toast(`Recording... ${key('V', 'Echo')} again to stop (up to ${this.echoMax} seconds).`, 4000);
    }
  }

  stopRecording() {
    const g = this.game, rec = this.rec;
    this.rec = null;
    this.syncBody();
    if (!rec || rec.frames.length < 4) return;
    if (this.echoes.length >= this.echoLimit) this.echoes.shift().remove();
    this.echoes.push(new Echo(g, rec.frames));
    audio.sfx('checkpoint');
    if (!g.state.flags.echoHint) {
      g.state.flags.echoHint = true;
      g.hud.toast(`Your echo walks it again, over and over (including your Lantern's light!). Up to ${this.echoLimit} at once.`, 6000);
    }
  }

  clearEchoes() {
    for (const e of this.echoes) e.remove();
    this.echoes = [];
  }

  // ------------------------------------------------------------------ plates and gates
  makeGate(spec) {
    const g = this.game, group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4e58, roughness: 0.5, metalness: 0.6 });
    for (let z = spec.z0 + 0.15; z < spec.z1 + 1; z += 0.42) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, GATE_H, 0.12), mat);
      bar.position.set(spec.x + 0.5, spec.y + GATE_H / 2, z);
      bar.castShadow = true;
      group.add(bar);
    }
    const bandMat = new THREE.MeshBasicMaterial({ color: spec.color });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, spec.z1 - spec.z0 + 1), bandMat);
    band.position.set(spec.x + 0.5, spec.y + GATE_H, (spec.z0 + spec.z1 + 1) / 2);
    group.add(band);
    g.scene.add(group);
    this.extras.push(group);
    return { spec, group, bandMat, open: null, shown: 0 };
  }

  gateHeld(gt) {
    const f = this.game.state.flags, s = gt.spec;
    if (s.id === 'gateD' && (this.game.chimeHoldT || 0) > 0) return true;
    return !!(f[s.openFlag] || f[s.passFlag]);
  }

  updatePlates(dt) {
    const g = this.game, b = g.player.body, f = g.state.flags;
    const on = (p, q) => q && Math.abs(q.x - (p.x + 0.5)) < 0.7 && Math.abs(q.z - (p.z + 0.5)) < 0.7 && Math.abs(q.y - p.y) < 0.5;
    for (const p of this.plates) {
      if (p.needs && !f[p.needs]) {
        p.top.visible = false;
        if (p.rim) p.rim.visible = false;
        continue;
      }
      p.top.visible = true;
      const ageOkPlayer = p.requiresAge === undefined || g.era === p.requiresAge || (this.lit && this.age === p.requiresAge);
      const ageOkEcho = (e) =>
        p.requiresAge === undefined ||
        e.pos.lanternAge === p.requiresAge ||
        (this.lit && this.age === p.requiresAge && Math.hypot(b.x - (p.x + 0.5), b.z - (p.z + 0.5)) < BUBBLE_R);
      if (on(p, b) && !ageOkPlayer && !f.plateFrostHint) {
        f.plateFrostHint = true;
        g.hud.toast(`This plate is frozen stiff! Light the <b>Lantern</b> (${key('R', 'Lantern')}) on <b>${g.eraLabel(p.requiresAge)}</b> while you or an Echo stand on it.`, 6000);
      }
      const now = (on(p, b) && ageOkPlayer) || this.echoes.some((e) => on(p, e.pos) && ageOkEcho(e));
      p.held = now ? PLATE_HOLD : Math.max(0, p.held - dt);
      const was = p.pressed;
      p.pressed = p.held > 0;
      if (p.pressed !== was && Math.abs(b.y - p.y) < 6) audio.sfx(p.pressed ? 'lever' : 'push');
      p.top.position.y = p.y + (p.pressed ? 0.04 : 0.07);
      p.mat.color.setHex(p.color).multiplyScalar(p.pressed ? 2.6 : 1);
      if (p.rim) p.rim.visible = !p.pressed;
    }
    for (const gt of this.gates) {
      const s = gt.spec, mine = this.plates.filter((p) => p.gate === s.id);
      const held = mine.length && mine.every((p) => p.pressed);
      if (held && s.openFlag && !f[s.openFlag]) {
        f[s.openFlag] = true;
        audio.sfx('gate');
        g.renderer.shake = 0.4;
        if (s.id === 'clockworks') g.hud.toast('All three plates at once: the clockworks door grinds open, for good.', 4500);
        else if (s.id === 'orinShield') g.onOrinPhase2Done?.();
        g.save();
      }
      const open = this.gateHeld(gt) || held;
      if (open !== gt.open) {
        gt.open = open;
        if (!s.noWall) {
          for (const era of s.eras) for (let y = s.y; y < s.y + GATE_H; y++) for (let z = s.z0; z <= s.z1; z++) open ? g.world.clearDyn(era, s.x, y, z) : g.world.setDyn(era, s.x, y, z, T.SOLID);
        }
        if (gt.shown > 0.01 && gt.shown < 0.99) audio.sfx(open ? 'gate' : 'push');
      }
      if (open && s.passFlag && !f[s.passFlag] && (b.x - (s.x + 0.5)) * s.dir > 1.2 && Math.abs(b.y - s.y) < 3) {
        f[s.passFlag] = true;
        audio.sfx('checkpoint');
        g.hud.toast('Through! The gate locks open behind you.', 3500);
        g.save();
      }
      gt.shown += ((open ? 1 : 0) - gt.shown) * Math.min(1, dt * 9);
      gt.group.position.y = -(GATE_H + 0.05) * gt.shown;
      gt.group.visible = !s.noWall && gt.shown < 0.99;
      gt.bandMat.color.setHex(s.color).multiplyScalar(held ? 2.6 : 1.2);
    }
  }

  // ------------------------------------------------------------------
  update(dt, ctl) {
    const g = this.game;
    if (ctl && input.hit('seal')) this.toggleLantern();
    if (ctl && this.lit) {
      if (input.hit('back')) this.swing(-1);
      if (input.hit('forward')) this.swing(1);
    }
    this.updateEcho(dt, ctl && g.mode === 'play');
    this.updateLantern();
    this.updatePlates(dt);
    this.setStatus(
      this.rec
        ? `● Recording ${Math.max(0, this.echoMax - this.rec.t).toFixed(1)}s${this.lit ? ` (🕯️ ${g.eraLabel(this.age)})` : ''}`
        : this.lit
          ? `🕯️ Lantern: ${g.eraLabel(this.age)} (Q/E age · R off)`
          : null,
    );
  }

  setStatus(text) {
    if (!this.status || text === this.statusText) return;
    this.statusText = text;
    this.status.hidden = !text;
    if (text) this.status.textContent = text;
  }
}

/** An echo: it walks what you recorded, over and over, in every age at once (and remembers your Lantern's light). */
class Echo {
  constructor(game, frames) {
    this.game = game;
    this.frames = frames;
    this.dur = Math.max(0.1, frames[frames.length - 1].t);
    this.t = 0;
    this.i = 0;
    this.actor = new Actor('vivienne', 2.1);
    const m = this.actor.mat;
    m.transparent = true;
    m.depthWrite = false;
    m.opacity = 0.55;
    m.color.setHex(0xa8d8ff);
    m.emissive.setHex(ECHO_TONE);
    m.emissiveIntensity = 0.9;
    this.lantern = lanternMesh();
    this.lantern.visible = false;
    game.scene.add(this.actor.mesh, this.lantern);
    this.pos = { ...frames[0] };
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.dur) {
      this.t %= this.dur;
      this.i = 0;
    }
    const fr = this.frames;
    while (this.i < fr.length - 1 && fr[this.i + 1].t <= this.t) this.i++;
    const f = fr[this.i];
    this.pos = f;
    this.actor.flip = f.flip;
    this.actor.play(f.anim);
    this.actor.update(dt);
    this.actor.mesh.position.set(f.x, f.y - 0.1, f.z);
    if (f.lanternAge !== null && f.lanternAge !== undefined) {
      this.lantern.visible = true;
      this.lantern.position.set(f.x + (f.flip ? -0.42 : 0.42), f.y + 0.72, f.z + 0.15);
      const col = new THREE.Color(theme.eraRing[f.lanternAge]);
      this.lantern.userData.glass.material.color.copy(col).multiplyScalar(2.2);
    } else {
      this.lantern.visible = false;
    }
    const burstCol = f.lanternAge !== null && f.lanternAge !== undefined ? theme.eraRing[f.lanternAge] : ECHO_TONE;
    if (Math.random() < dt * 4) this.game.bursts.emit(f.x, f.y + 0.6 + Math.random(), f.z, 1, { color: [burstCol, 0xffffff], speed: 0.4, life: 0.7, gravity: -0.4, glow: 1.6 });
  }
  remove() {
    this.actor.mesh.parent?.remove(this.actor.mesh);
    this.lantern.parent?.remove(this.lantern);
  }
}
