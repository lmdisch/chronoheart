// Powers the Chronoheart gains east of the gatehouse: the Stasis Seal, and the Echo, plus the
// Echo Gallery's buttons and the stone steps they raise.
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { Actor } from '../../render/actors.js';
import { ECHO_BUTTONS, ECHO_STEPS, ECHO_GATES, GATE_BUTTONS, SEALABLES, L } from './level.js';
import { T } from '../../world/world.js';
import { touchActive } from '../../ui/touch.js';
import { Frozen, CREATURES } from './entities.js';

// which spawn a frozen creature was (so it isn't spawned live again)
const frozenKey = (spec) => `${spec.kind}@${spec.x},${spec.z}`;

const ECHO_MAX = 5; // seconds of movement an echo can hold
const ECHO_LIMIT = 3; // echoes at once; a new one replaces the oldest
const ECHO_TONE = 0xbff6ff;
const LIT_TIME = 5.2; // seconds a gallery button glows on after an echo steps off it (longer than any echo's loop)

// on a button: within 0.65 of its center (generous, so a step onto its edge still counts)
const standsOn = (b, p) => Math.abs(b.x - (p.x + 0.5)) < 0.65 && Math.abs(b.z - (p.z + 0.5)) < 0.65 && Math.abs(b.y - p.y) < 0.4;

/** A recorded loop of the player's movement, replayed forever in the Present. */
class Echo {
  constructor(game, frames) {
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
    // creatures held by the Stasis Seal stay held, in their age and every one after
    const g0 = this.game;
    for (const rec of g0.state.frozen || []) {
      for (const e of g0.enemies) if (e.alive && frozenKey(e.spec) === rec.key) e.remove();
      this.placeFrozen(rec);
    }
    g0.enemies = g0.enemies.filter((e) => e.alive);
    this.echoes = [];
    this.rec = null;
    this.setStatus(null);
    const g = this.game.world.groups[ERA.PRESENT];
    // gallery buttons ride on top of their platform (the ground, or a step), so nothing floats
    // while a step is down. Arrows on the floor point from each button to the next in its ring.
    const arrowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c8).multiplyScalar(1.2) });
    this.buttons = ECHO_BUTTONS.map((p) => {
      const group = new THREE.Group();
      group.position.set(p.x + 0.5, 0, p.z + 0.5);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a3440, roughness: 0.7 }));
      base.position.y = 0.03;
      const mat = new THREE.MeshBasicMaterial({ color: ECHO_TONE });
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), mat);
      glow.position.y = 0.06;
      group.add(base, glow);
      // the first button of each ring wears a bright ring: start here
      if (p.order === 0) {
        const start = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 24).rotateX(Math.PI / 2), arrowMat);
        start.position.y = 0.08;
        group.add(start);
      }
      // an arrowhead on the floor, halfway to the next button
      const next = ECHO_BUTTONS.find((q) => q.step === p.step && q.order === p.order + 1);
      if (next) {
        const dx = next.x - p.x, dz = next.z - p.z;
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3).rotateX(Math.PI / 2), arrowMat);
        arrow.position.set(dx * 0.5, 0.05, dz * 0.5);
        arrow.rotation.y = Math.atan2(dx, dz);
        arrow.scale.y = 0.3;
        group.add(arrow);
      }
      g.add(group);
      return { ...p, mat, glow, group, pressed: false, lit: 0 };
    });
    // gate buttons: plain square plates in their gate's color
    this.gateButtons = GATE_BUTTONS.map((p) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.92), new THREE.MeshStandardMaterial({ color: 0x2a2630, roughness: 0.7 }));
      base.position.set(p.x + 0.5, p.y + 0.03, p.z + 0.5);
      const mat = new THREE.MeshBasicMaterial({ color: p.color });
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.64), mat);
      top.position.set(p.x + 0.5, p.y + 0.07, p.z + 0.5);
      g.add(base, top);
      return { ...p, mat, top, pressed: false };
    });
    // gates: a row of bars across the road that sink into the floor when open. The second
    // green gate is the airlock's "inverted" half: open only while its button is NOT held.
    this.gates = ECHO_GATES.map((gt) => {
      const color = GATE_BUTTONS.find((b) => b.id === gt.button).color;
      const group = new THREE.Group();
      const barMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.5, metalness: 0.4 });
      for (let z = 0.15; z < 7; z += 0.42) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), barMat);
        bar.position.set(gt.x + 0.5, 1.5, z);
        bar.castShadow = true;
        group.add(bar);
      }
      const bandMat = new THREE.MeshBasicMaterial({ color });
      if (gt.inverted) {
        // dashed band: "opens when the button is released"
        for (let z = 0.1; z < 7; z += 0.8) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.45), bandMat);
          dash.position.set(gt.x + 0.5, 3.0, z + 0.22);
          group.add(dash);
        }
      } else {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 7), bandMat);
        band.position.set(gt.x + 0.5, 3.0, 3.5);
        group.add(band);
      }
      g.add(group);
      return { ...gt, group, open: false, shown: 0, init: false };
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
    document.body.classList.toggle('has-tempo', !!f.hasTempo);
    document.body.classList.toggle('recording', !!this.rec);
  }

  unlock(which) {
    const f = this.game.state.flags, touch = touchActive();
    audio.sfx('key');
    if (which === 'seal') {
      f.hasSeal = true;
      this.game.hud.toast(
        `<b>Stasis Seal!</b> Stand by something that shimmers (or right up close to a creature) and ${touch ? 'tap <b>Seal</b>' : 'press <kbd>R</kbd>'}.`,
        6000,
      );
    } else {
      f.hasEcho = true;
      this.game.hud.toast(
        `<b>Echo!</b> ${touch ? 'Tap <b>Echo</b>' : 'Press <kbd>V</kbd>'} to record, again to stop. Your echo repeats it.`,
        5000,
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
    return this.readySealables().find((s) => b.x >= s.x0 && b.x <= s.x1 + 1 && b.y >= (s.yMin ?? -Infinity)) || this.creatureTarget();
  }

  /** A creature close enough to touch the ring to: it works on living things too. */
  creatureTarget() {
    const g = this.game, b = g.player.body;
    if (!g.state.flags.hasSeal) return null;
    let best = null, bd = 1.8;
    for (const e of g.enemies) {
      if (!e.alive || !e.active() || !CREATURES[e.spec.kind]) continue;
      const d = Math.hypot(e.body.x - b.x, (e.body.z - b.z) * 0.8);
      if (d < bd && Math.abs(e.body.y - b.y) < 1.8) {
        bd = d;
        best = e;
      }
    }
    return best && { creature: best, name: `the ${CREATURES[best.spec.kind]}` };
  }

  /** A frozen creature's statues: where it was sealed, and the same spot in each later age (unless something has been built right through it). */
  placeFrozen(rec) {
    const g = this.game;
    for (let era = rec.era; era <= ERA.FUTURE; era++) {
      if (era !== rec.era && g.world.cell(era, Math.floor(rec.x), Math.floor(rec.y + 0.3), Math.floor(rec.z)) === T.SOLID) continue;
      const e = new Frozen(g, rec, era);
      g.entities.push(e);
      g.interactables.push(e);
    }
  }

  sealCreature(e) {
    const g = this.game, s = g.state, f = s.flags, eb = e.body, name = CREATURES[e.spec.kind];
    const rec = { key: frozenKey(e.spec), kind: e.spec.kind, era: e.era, x: eb.x, y: eb.y, z: eb.z, flip: e.actor.flip };
    (s.frozen ||= []).push(rec);
    e.remove();
    g.enemies = g.enemies.filter((x) => x.alive);
    this.placeFrozen(rec);
    audio.sfx('socket');
    audio.sfx('shift', { era: g.era });
    g.bursts.emit(eb.x, eb.y + 0.5, eb.z, 40, { color: [0xbff6ff, 0xffffff], speed: 4, life: 1 });
    g.save();
    // the first time in each age, see what the centuries make of it; after that, you know
    const seen = 'frozenLapse' + e.era;
    if (e.era < ERA.FUTURE && !f[seen]) {
      f[seen] = true;
      const years = e.era === ERA.PAST ? 600 : 300;
      g.timelapse({ to: ERA.FUTURE, focus: [eb.x, eb.y + 0.6, eb.z], years, caption: `Held in its moment, the ${name} waits out the centuries...`, effect: 'shine' })
        .then(() => g.hud.toast(`The ${name} is still there in the <b>Future</b>, and somebody has put up a placard.`, 6000));
    } else g.hud.toast(`The ${name} is held in its moment.`, 3000);
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
      return g.hud.toast('Nothing here shimmers to seal.', 2500);
    }
    if (t.creature) return this.sealCreature(t.creature);
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
    if (g.era !== ERA.PRESENT) return g.hud.toast('Echoes only work in the <b>Present</b>.', 2500);
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
    g.hud.toast(`Echo ${n}/${ECHO_LIMIT}${replaced ? ' (oldest faded)' : ''}`, 2200);
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
  galleryHint(kind) {
    const f = this.game.state.flags, hud = this.game.hud;
    if (kind === 'order' && !f.galleryOrderHint) {
      f.galleryOrderHint = true;
      hud.toast('They light in order: start at the ringed button and follow the arrows.', 3500);
    } else if (kind === 'self' && !f.gallerySelfHint) {
      f.gallerySelfHint = true;
      hud.toast('A button you press yourself goes dark when you step off. An echo leaves it glowing.', 4500);
    } else if (kind === 'row' && !f.galleryHint) {
      f.galleryHint = true;
      hud.toast('The step rises while its whole ring is lit.', 3500);
    }
  }

  /**
   * Each step has a ring of buttons. A button lights when pressed, but only if the one before it
   * in its ring is lit. An echo leaves it lit for LIT_TIME; you light it only while you stand on
   * it. The step stands while its whole ring is lit: record an echo that walks the ring.
   */
  updateGallery(dt) {
    const g = this.game, f = g.state.flags, w = g.world, P = ERA.PRESENT;
    // gate buttons only count while something stands on them
    for (const btn of this.gateButtons) {
      btn.pressed = (g.era === P && standsOn(g.player.body, btn)) || this.echoes.some((e) => standsOn(e.pos, btn));
      btn.mat.color.setHex(btn.color).multiplyScalar(btn.pressed ? 2.2 : 0.45);
      btn.top.position.y = btn.y + (btn.pressed ? 0.04 : 0.07);
    }
    const pb = g.player.body;
    // once you're through, the gates stay open behind you, so you can always go back
    if (!f.galleryGatesPassed && g.era === P && pb.x > L.gatesX1 + 1.5 && pb.x < L.galleryX0) {
      f.galleryGatesPassed = true;
      g.save();
    }
    for (const gt of this.gates) {
      const held = this.gateButtons.find((b) => b.id === gt.button).pressed;
      let open = !!f.galleryClimbed || !!f.galleryGatesPassed || (gt.inverted ? !held : held);
      // never close on top of the player
      if (!open && gt.open && g.era === P && pb.x + pb.hw > gt.x && pb.x - pb.hw < gt.x + 1) open = true;
      if (open !== gt.open || !gt.init) {
        gt.init = true;
        for (let y = 0; y < 3; y++) for (let z = 0; z <= 6; z++) open ? w.clearDyn(P, gt.x, y, z) : w.setDyn(P, gt.x, y, z, T.SOLID);
        if (gt.open !== open && Math.abs(pb.x - gt.x) < 10 && g.era === P) audio.sfx('push');
        gt.open = open;
      }
      gt.shown += ((gt.open ? 1 : 0) - gt.shown) * Math.min(1, dt * 9);
      gt.group.position.y = -3.05 * gt.shown;
      gt.group.visible = gt.shown < 0.99;
    }
    for (const btn of this.buttons) {
      // a ring on a step only works while that step is up; its buttons ride on the step's top
      const surface = btn.step === 0 ? null : this.steps[btn.step - 1];
      const up = !surface || surface.cur >= surface.h;
      btn.group.position.y = surface ? surface.shown : 0;
      const byYou = up && g.era === P && standsOn(g.player.body, btn);
      const byEcho = up && this.echoes.some((e) => standsOn(e.pos, btn));
      const on = byYou || byEcho;
      const prev = this.buttons.find((b) => b.step === btn.step && b.order === btn.order - 1);
      const inOrder = !prev || prev.lit > 0;
      if (!up) btn.lit = 0;
      else if (on && inOrder) {
        if (btn.lit <= 0) audio.sfx('ui');
        // an echo leaves a button glowing for a while; you only light it while you stand on it
        btn.lit = byEcho ? LIT_TIME : Math.max(btn.lit, 0.05);
      } else btn.lit = Math.max(0, btn.lit - dt);
      if (on && !btn.pressed) this.galleryHint(!inOrder ? 'order' : byYou && !byEcho ? 'self' : 'row');
      btn.pressed = on;
      // brightness shows how much lit time is left; dark when its step is down
      btn.mat.color.setHex(ECHO_TONE).multiplyScalar(!up ? 0.08 : 0.3 + 2.2 * Math.min(1, btn.lit / LIT_TIME + (btn.lit > 0 ? 0.25 : 0)));
      btn.glow.position.y = on ? 0.035 : 0.06;
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
      g.hud.toast('You kick a rope ladder down for the way back.', 3000);
    }
  }
}
