// Powers the Chronoheart gains east of the gatehouse: the Stasis Seal, and the Echo, plus the
// Echo Gallery's buttons and the stone steps they raise.
import * as THREE from 'three';
import { input } from './core/input.js';
import { ERA } from './core/util.js';
import { audio } from './audio/audio.js';
import { getSheets, SpriteActor } from './render/sprites.js';
import { ECHO_BUTTONS, ECHO_STEPS, SEALABLES, L } from './levels/hollowmere.js';
import { T } from './world/world.js';
import { touchActive } from './ui/touch.js';

const ECHO_MAX = 5; // seconds of movement an echo can hold
const ECHO_LIMIT = 3; // echoes at once; a new one replaces the oldest
const ECHO_TONE = 0xbff6ff;
const LIT_TIME = 4.5; // seconds a gallery button stays lit after you step off it

// on a button: within 0.65 of its centre (generous, so a step onto its edge still counts)
const standsOn = (b, p) => Math.abs(b.x - (p.x + 0.5)) < 0.65 && Math.abs(b.z - (p.z + 0.5)) < 0.65 && Math.abs(b.y - p.y) < 0.4;

/** A recorded loop of the player's movement, replayed forever in the Present. */
class Echo {
  constructor(game, frames) {
    this.frames = frames;
    this.dur = Math.max(0.1, frames[frames.length - 1].t);
    this.t = 0;
    this.i = 0;
    this.actor = new SpriteActor(getSheets().vivienne, 2.1);
    const m = this.actor.mat;
    m.transparent = true;
    m.depthWrite = false;
    m.opacity = 0.55;
    m.color.setHex(0xa8d8ff);
    m.emissive.setHex(ECHO_TONE);
    m.emissiveIntensity = 0.9;
    this.mesh = this.actor.mesh;
    game.world.groups[ERA.PRESENT].add(this.mesh);
    this.pos = { ...frames[0] };
  }
  update(dt, billboardQ) {
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
    this.mesh.position.set(f.x, f.y - 0.1, f.z);
    this.mesh.quaternion.copy(billboardQ);
  }
  remove() {
    this.mesh.parent?.remove(this.mesh);
  }
}

export class Abilities {
  constructor(game) {
    this.game = game;
    this.echoes = [];
    this.rec = null;
    this.buttons = [];
    this.steps = [];
    this.status = document.getElementById('ability-status');
  }

  get recording() {
    return !!this.rec;
  }

  /** Called after the world is (re)built: echoes, buttons and steps live in its Present group. */
  attach() {
    this.echoes = [];
    this.rec = null;
    this.setStatus(null);
    const g = this.game.world.groups[ERA.PRESENT];
    this.buttons = ECHO_BUTTONS.map((p) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a3440, roughness: 0.7 }));
      base.position.set(p.x + 0.5, p.y + 0.03, p.z + 0.5);
      const mat = new THREE.MeshBasicMaterial({ color: ECHO_TONE });
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), mat);
      glow.position.set(p.x + 0.5, p.y + 0.06, p.z + 0.5);
      // number pips (1, 2, 3) beside the button, so the order reads at a glance
      const pipMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8 });
      for (let i = 0; i <= p.order; i++) {
        const pip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.1), pipMat);
        pip.position.set(p.x + 0.12, p.y + 0.08, p.z + 0.3 + i * 0.2);
        g.add(pip);
      }
      g.add(base, glow);
      return { ...p, mat, glow, pressed: false, lit: 0 };
    });
    this.steps = ECHO_STEPS.map((s) => {
      const w = s.x1 - s.x0 + 1, d = s.z1 - s.z0 + 1;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.85 }));
      mesh.position.set(s.x0 + w / 2, 0, s.z0 + d / 2);
      mesh.castShadow = mesh.receiveShadow = true;
      // a thin glowing outline around the step's top edge (a full glowing top bloomed white)
      const rim = new THREE.Group();
      const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ECHO_TONE).multiplyScalar(0.9) });
      for (const [sx, sz, ox, oz] of [[w, 0.07, 0, -d / 2], [w, 0.07, 0, d / 2], [0.07, d, -w / 2, 0], [0.07, d, w / 2, 0]]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.02, 0.05, sz + 0.02), rimMat);
        bar.position.set(ox, 0, oz);
        rim.add(bar);
      }
      g.add(mesh, rim);
      return { ...s, mesh, rim, cur: 0, shown: 0 };
    });
    this.syncBody();
  }

  /** Body classes show the matching touch buttons and control-sheet rows. */
  syncBody() {
    const f = this.game.state.flags;
    document.body.classList.toggle('has-seal', !!f.hasSeal);
    document.body.classList.toggle('has-echo', !!f.hasEcho);
    document.body.classList.toggle('recording', !!this.rec);
  }

  unlock(which) {
    const f = this.game.state.flags, touch = touchActive();
    audio.sfx('key');
    if (which === 'seal') {
      f.hasSeal = true;
      this.game.hud.toast(
        `<b>Stasis Seal learned!</b> Things that can be sealed shimmer with pale light. Stand beside one and ${touch ? 'tap <b>Seal</b>' : 'press <kbd>R</kbd>'} to hold it in its moment: it will stay exactly as it is, in every age after.`,
        8000,
      );
    } else {
      f.hasEcho = true;
      this.game.hud.toast(
        `<b>Echo Lens fitted!</b> In the Present, ${touch ? 'tap <b>Echo</b>' : 'press <kbd>V</kbd>'} to start recording, and again to stop (up to ${ECHO_MAX} seconds). Your echo repeats it over and over. Up to ${ECHO_LIMIT} echoes at once.`,
        9000,
      );
    }
    this.syncBody();
  }

  update(dt, ctl) {
    const g = this.game, f = g.state.flags;
    if (ctl && f.hasSeal && input.hit('seal')) this.trySeal();
    if (f.hasEcho) {
      if (this.rec) this.record(dt, ctl);
      else if (ctl && input.hit('echo')) this.startRecording();
    }
    for (const e of this.echoes) e.update(dt, g.renderer.billboardQ);
    this.updateGallery(dt);
    this.glint(dt);
  }

  // ------------------------------------------------------------------ Stasis Seal

  /** Sealables that can be sealed right now, in this era (the shimmer shows where). */
  readySealables() {
    const g = this.game, f = g.state.flags;
    if (!f.hasSeal) return [];
    return SEALABLES.filter((s) => s.era === g.era && f[s.needs] && !f[s.flag]);
  }

  /** The sealable the player is standing at, if any: drives the "R Seal ..." prompt and the touch button. */
  sealTarget() {
    const b = this.game.player.body;
    return this.readySealables().find((s) => b.x >= s.x0 && b.x <= s.x1 + 1) || null;
  }

  /** Pale motes rise off anything that can be sealed, so it reads as special before you get there. */
  glint(dt) {
    for (const s of this.readySealables()) {
      if (Math.random() > dt * 14) continue;
      const a = s.glint;
      this.game.bursts.emit(a.x0 + Math.random() * (a.x1 - a.x0), a.y, a.z0 + Math.random() * (a.z1 - a.z0), 1, {
        color: [0xbff6ff, 0xffffff], speed: 0.4, life: 1.2, gravity: -0.8, glow: 1.6,
      });
    }
  }

  trySeal() {
    const g = this.game, b = g.player.body, f = g.state.flags;
    const t = this.sealTarget();
    if (!t) {
      const here = SEALABLES.find((s) => s.era === g.era && b.x >= s.x0 && b.x <= s.x1 + 1);
      if (here && f[here.flag]) return g.hud.toast(`${here.name} is already sealed in its moment.`);
      return g.hud.toast('Nothing here to seal. Things that can be sealed shimmer with pale light. Stand beside one and use the Seal.', 5500);
    }
    f[t.flag] = true;
    audio.sfx('socket');
    audio.sfx('shift', { era: g.era });
    g.bursts.emit(b.x, b.y + 1, b.z, 40, { color: [0xbff6ff, 0xffffff], speed: 4, life: 1 });
    g.refreshWorld();
    g.save();
    g.timelapse({ to: ERA.FUTURE, focus: t.focus, years: 600, caption: t.caption, effect: 'shine' }).then(() => g.hud.toast(t.after, 7000));
  }

  // ------------------------------------------------------------------ Echo
  frameOf() {
    const p = this.game.player, b = p.body;
    return { t: this.rec.t, x: b.x, y: b.y, z: b.z, flip: p.actor.flip, anim: p.actor.anim };
  }

  startRecording() {
    const g = this.game;
    if (g.era !== ERA.PRESENT) return g.hud.toast('Echoes only hold together in the <b>Present</b>, where time runs steady.', 4000);
    this.rec = { t: 0, frames: [] };
    this.rec.frames.push(this.frameOf());
    audio.sfx('tick');
    this.syncBody();
  }

  record(dt, ctl) {
    const g = this.game, r = this.rec;
    if (!ctl || g.era !== ERA.PRESENT) return this.finishRecording();
    r.t += dt;
    r.frames.push(this.frameOf());
    this.setStatus(`Recording echo: ${Math.max(0, ECHO_MAX - r.t).toFixed(1)}s`);
    if (input.hit('echo') || r.t >= ECHO_MAX) this.finishRecording();
  }

  finishRecording() {
    const g = this.game, r = this.rec;
    this.rec = null;
    this.setStatus(null);
    this.syncBody();
    if (r.t < 0.25) return;
    let replaced = false;
    if (this.echoes.length >= ECHO_LIMIT) {
      this.echoes.shift().remove();
      replaced = true;
    }
    this.echoes.push(new Echo(g, r.frames));
    audio.sfx('shift', { era: ERA.PRESENT });
    const first = !g.state.flags.echoHint;
    g.state.flags.echoHint = true;
    const n = this.echoes.length;
    g.hud.toast(
      `Echo ${n} of ${ECHO_LIMIT} left${replaced ? ' (your oldest echo faded)' : ''}.` +
        (first ? ` It repeats what you did, over and over. To remove one, stand on it and ${touchActive() ? 'tap <b>Dispel echo</b>' : 'press <kbd>F</kbd>'}.` : ''),
      first ? 7500 : 3000,
    );
  }

  /** The echo the player is standing on (where it is now, or where its loop starts). */
  dispelTarget() {
    const g = this.game, b = g.player.body;
    if (g.era !== ERA.PRESENT || this.rec) return null;
    const on = (p) => Math.hypot(b.x - p.x, b.z - p.z) < 0.8 && Math.abs(b.y - p.y) < 1;
    return this.echoes.find((e) => on(e.pos) || on(e.frames[0])) || null;
  }

  dispel(e) {
    e.remove();
    this.echoes = this.echoes.filter((x) => x !== e);
    audio.sfx('snap');
    this.game.bursts.emit(e.pos.x, e.pos.y + 0.9, e.pos.z, 30, { color: [ECHO_TONE, 0xffffff], speed: 3, life: 0.7, gravity: 0 });
    this.game.hud.toast('Echo dispelled.', 2000);
  }

  /** Drop a recording in progress (death, hazards, world rebuilds). */
  cancelRecording() {
    this.rec = null;
    this.setStatus(null);
    this.syncBody();
  }

  setStatus(text) {
    if (!this.status) return;
    this.status.hidden = !text;
    if (text) this.status.textContent = text;
  }

  // ------------------------------------------------------------------ Echo Gallery
  /** One-time explanations: first button stepped on, and first out-of-order press. */
  galleryHint(outOfOrder) {
    const f = this.game.state.flags, keys = touchActive() ? 'tap <b>Echo</b>' : 'press <kbd>V</kbd>';
    if (outOfOrder && !f.galleryOrderHint) {
      f.galleryOrderHint = true;
      this.game.hud.toast('That button stays dark: they only light in order, <b>1 → 2 → 3</b>. Count the dots beside each one.', 5500);
    } else if (!outOfOrder && !f.galleryHint) {
      f.galleryHint = true;
      this.game.hud.toast(
        `Buttons light in order, <b>1 → 2 → 3</b>, and fade a few seconds after you step off. The step rises while its whole row is lit. ${keys}, walk the row, then ${keys} again: your echo will keep walking it for you.`,
        9000,
      );
    }
  }

  /**
   * Each step has a row of numbered buttons. A button lights when pressed, but only if the one
   * before it in its row is lit, and it stays lit for LIT_TIME after you step off. The step
   * stands while its whole row is lit: walk the row in order, or record an echo that does.
   */
  updateGallery(dt) {
    const g = this.game, f = g.state.flags, w = g.world, P = ERA.PRESENT;
    for (const btn of this.buttons) {
      const on = (g.era === P && standsOn(g.player.body, btn)) || this.echoes.some((e) => standsOn(e.pos, btn));
      const prev = this.buttons.find((b) => b.step === btn.step && b.order === btn.order - 1);
      if (on && (!prev || prev.lit > 0)) {
        if (btn.lit <= 0) audio.sfx('ui');
        btn.lit = LIT_TIME;
      } else btn.lit = Math.max(0, btn.lit - dt);
      if (on && !btn.pressed && prev && prev.lit <= 0) this.galleryHint(true);
      else if (on && !btn.pressed) this.galleryHint(false);
      btn.pressed = on;
      // brightness shows how much lit time is left
      btn.mat.color.setHex(ECHO_TONE).multiplyScalar(0.3 + 2.2 * (btn.lit / LIT_TIME));
      btn.glow.position.y = btn.y + (on ? 0.035 : 0.06);
    }
    this.steps.forEach((s, i) => {
      const row = this.buttons.filter((b) => b.step === i);
      const target = row.every((b) => b.lit > 0) ? s.h : 0;
      if (target !== s.cur) {
        for (let x = s.x0; x <= s.x1; x++)
          for (let z = s.z0; z <= s.z1; z++)
            for (let y = 0; y < Math.max(s.h, s.cur); y++) {
              if (y < target) w.setDyn(P, x, y, z, T.SOLID);
              else w.clearDyn(P, x, y, z);
            }
        // rising under the player lifts them onto the top instead of burying them
        const b = g.player.body;
        if (target > s.cur && g.era === P && b.x + b.hw > s.x0 && b.x - b.hw < s.x1 + 1 && b.z + b.hd > s.z0 && b.z - b.hd < s.z1 + 1 && b.y < target) {
          b.y = target;
          b.vy = 0;
        }
        s.cur = target;
      }
      s.shown += (s.cur - s.shown) * Math.min(1, dt * 10);
      s.mesh.visible = s.shown > 0.02;
      s.mesh.scale.y = Math.max(0.001, s.shown);
      s.rim.position.set(s.mesh.position.x, s.shown + 0.03, s.mesh.position.z);
      s.rim.visible = s.mesh.visible;
    });
    // once you're up on the gallery, kick down a rope ladder for the way back
    const b = g.player.body;
    if (!f.galleryClimbed && b.x >= L.galleryX0 && b.x <= L.galleryX1 + 1 && b.y >= 3.9 && b.onGround) {
      f.galleryClimbed = true;
      g.refreshWorld();
      g.save();
      g.hud.toast('You made it up! You kick the old rope ladder down the wall, so you can always climb back.', 5500);
    }
  }
}
