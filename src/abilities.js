// Powers the Chronoheart gains east of the gatehouse: the Stasis Seal and the Echo, plus the
// Chord Vault's pressure plates, which the Echo exists to solve.
import * as THREE from 'three';
import { input } from './core/input.js';
import { ERA, ERA_SHORT } from './core/util.js';
import { audio } from './audio/audio.js';
import { getSheets, SpriteActor } from './render/sprites.js';
import { CHORD_PLATES, SEALABLES, L } from './levels/hollowmere.js';
import { touchActive } from './ui/touch.js';

const ECHO_MAX = 5; // seconds of movement an echo can hold
const ERA_TONE = [0xffc060, 0xbff6ff, 0xff4fd8];

const standsOn = (b, p) => Math.floor(b.x) === p.x && Math.floor(b.z) === p.z && Math.abs(b.y - p.y) < 0.4;

/** A recorded loop of the player's movement, replayed forever in the era it was made in. */
class Echo {
  constructor(game, era, frames) {
    this.era = era;
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
    m.emissive.setHex(ERA_TONE[era]);
    m.emissiveIntensity = 0.9;
    this.mesh = this.actor.mesh;
    game.world.groups[era].add(this.mesh);
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
    this.echoes = [null, null, null];
    this.rec = null;
    this.plates = [];
    this.status = document.getElementById('ability-status');
  }

  get recording() {
    return !!this.rec;
  }

  /** Called after the world is (re)built: echoes and plate markers live in its era groups. */
  attach() {
    this.echoes = [null, null, null];
    this.rec = null;
    this.setStatus(null);
    this.plates = CHORD_PLATES.map((p) => {
      const g = this.game.world.groups[p.era];
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), new THREE.MeshStandardMaterial({ color: 0x3a3440, roughness: 0.7 }));
      base.position.set(p.x + 0.5, p.y + 0.025, p.z + 0.5);
      base.receiveShadow = true;
      const mat = new THREE.MeshBasicMaterial({ color: ERA_TONE[p.era] });
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.7), mat);
      glow.position.set(p.x + 0.5, p.y + 0.04, p.z + 0.5);
      g.add(base, glow);
      return { ...p, mat, pressed: false };
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
        `<b>Echo Lens fitted!</b> ${touch ? 'Tap <b>Echo</b>' : 'Press <kbd>V</kbd>'} to start recording, and again to stop (up to ${ECHO_MAX} seconds). Your echo repeats what you did, over and over, in that age.`,
        8000,
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
    for (const e of this.echoes) if (e) e.update(dt, g.renderer.billboardQ);
    this.updatePlates();
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
    this.rec = { era: this.game.era, t: 0, frames: [] };
    this.rec.frames.push(this.frameOf());
    audio.sfx('tick');
    this.syncBody();
  }

  record(dt, ctl) {
    const g = this.game, r = this.rec;
    if (!ctl || g.era !== r.era) return this.finishRecording();
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
    this.echoes[r.era]?.remove();
    this.echoes[r.era] = new Echo(g, r.era, r.frames);
    audio.sfx('shift', { era: r.era });
    const first = !g.state.flags.echoHint;
    g.state.flags.echoHint = true;
    g.hud.toast(
      `Echo left in the <b>${ERA_SHORT[r.era]}</b>.${first ? ` It keeps repeating there while you travel. Record a new one to replace it, or stand on it and ${touchActive() ? 'tap <b>Dispel echo</b>' : 'press <kbd>F</kbd>'} to remove it.` : ''}`,
      first ? 7000 : 3000,
    );
  }

  /** The echo the player is standing on in this era (where it is now, or where its loop starts). */
  dispelTarget() {
    const g = this.game, b = g.player.body, e = this.echoes[g.era];
    if (!e || this.rec) return null;
    const on = (p) => Math.hypot(b.x - p.x, b.z - p.z) < 0.8 && Math.abs(b.y - p.y) < 1;
    return on(e.pos) || on(e.frames[0]) ? e : null;
  }

  dispel(e) {
    e.remove();
    this.echoes[e.era] = null;
    audio.sfx('snap');
    this.game.bursts.emit(e.pos.x, e.pos.y + 0.9, e.pos.z, 30, { color: [ERA_TONE[e.era], 0xffffff], speed: 3, life: 0.7, gravity: 0 });
    this.game.hud.toast(`Echo dispelled in the <b>${ERA_SHORT[e.era]}</b>.`, 2500);
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

  // ------------------------------------------------------------------ Chord Vault plates
  updatePlates() {
    const g = this.game, f = g.state.flags;
    let n = 0;
    for (const p of this.plates) {
      const echo = this.echoes[p.era];
      const on = !!f.chordOpen || (g.era === p.era && standsOn(g.player.body, p)) || (!!echo && standsOn(echo.pos, p));
      if (on && !p.pressed && !f.chordOpen) {
        audio.sfx('ui');
        if (!f.chordHint) {
          f.chordHint = true;
          g.hud.toast('The plate glows, but the vault door stays shut. It wants all three ages pressing at the same moment.', 6500);
        }
      }
      p.pressed = on;
      p.mat.color.setHex(ERA_TONE[p.era]).multiplyScalar(on ? 2.4 : 0.3);
      n += on ? 1 : 0;
    }
    if (n === 3 && !f.chordOpen) this.openVault();
  }

  openVault() {
    const g = this.game;
    g.state.flags.chordOpen = true;
    g.refreshWorld();
    audio.sfx('bell');
    audio.sfx('gate');
    g.renderer.shake = 0.8;
    g.bursts.emit(L.vaultDoorX0, 2, 3.5, 60, { color: ERA_TONE, speed: 5, life: 1.1 });
    g.hud.toast('<b>A perfect chord!</b> Three ages press as one, and the vault door rolls open in every age.', 6500);
    g.save();
  }
}
