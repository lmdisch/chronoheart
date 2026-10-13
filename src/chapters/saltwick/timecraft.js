// What the Chronoheart learns in Saltwick, and the machinery it's used on.
//
// Rewind (Donald Eugene's pocketwatch): hold it, and it runs you backward along the path you
// just took: up drops, across gaps, back through the era shifts you made. Only you: the rest of
// the world keeps going. A gate you opened goes on closing while you run back to it.
//
// Reach (the Keeper's Loupe) lives in Game.updatePlay: with it, things seen through the time
// lens can be used, taken or struck from the age you're standing in.
//
// The machinery: gates on timers or flags, and the flood that carries you out of the Tide Well.
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { T } from '../../world/world.js';
import { hits } from '../../world/physics.js';
import { makeWater } from '../../render/water.js';
import { GATES, SEALED, WELL, L } from './level.js';
import { touchActive } from '../../ui/touch.js';

export const REWIND_MAX = 8; // seconds of your own movement the watch remembers
const REWIND_RATE = 2.6; // how much faster than life it runs you back
const TRAIL_PTS = 56;
const FLOOD_RATE = 0.55; // cells a second
const GATE_H = 3;

const M = ERA.PRESENT;

/** A row of bars across the road that sinks into the floor when open (see GATES). */
class Gate {
  constructor(craft, spec) {
    this.craft = craft;
    this.spec = spec;
    this.openT = 0;
    this.open = false;
    this.init = false;
    this.shown = 0;
    this.tickT = 0;
    const g = (this.group = new THREE.Group());
    const future = spec.era === ERA.FUTURE;
    const barMat = new THREE.MeshStandardMaterial({ color: future ? 0x6a4a3a : 0x4a4a52, roughness: 0.5, metalness: 0.5 });
    for (let z = 0.15; z < 7; z += 0.42) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, GATE_H, 0.12), barMat);
      bar.position.set(spec.x + 0.5, spec.y + GATE_H / 2, z);
      bar.castShadow = true;
      g.add(bar);
    }
    // the band along its top runs down like a fuse while the gate is on its timer
    this.bandMat = new THREE.MeshBasicMaterial({ color: spec.color });
    this.band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 7).translate(0, 0, 3.5), this.bandMat);
    this.band.position.set(spec.x + 0.5, spec.y + GATE_H, 0);
    this.slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 7), new THREE.MeshStandardMaterial({ color: 0x14141a }));
    this.slot.position.set(spec.x + 0.5, spec.y + 0.015, 3.5);
    craft.game.world.groups[spec.era].add(g, this.band, this.slot);
  }

  /** Open for good? (you've been through it, or its flag is set) */
  held() {
    const f = this.craft.game.state.flags, s = this.spec;
    return !!(f[s.passFlag] || f[s.openFlag]);
  }

  /** How much of its time is left, 0..1 (1 once it's open for good). */
  frac() {
    return this.held() ? 1 : Math.max(0, this.openT / (this.spec.open || 1));
  }

  update(dt) {
    const g = this.craft.game, w = g.world, s = this.spec, f = g.state.flags, b = g.player.body;
    this.openT = Math.max(0, this.openT - dt);
    const here = g.era === s.era;
    let open = this.held() || this.openT > 0;
    // never close on top of the player
    const under = here && b.x + b.hw > s.x && b.x - b.hw < s.x + 1 && b.y < s.y + GATE_H && b.y + b.h > s.y;
    if (!open && this.open && under) open = true;
    if (open !== this.open || !this.init) {
      this.init = true;
      for (let y = s.y; y < s.y + GATE_H; y++) for (let z = 0; z <= 6; z++) open ? w.clearDyn(s.era, s.x, y, z) : w.setDyn(s.era, s.x, y, z, T.SOLID);
      if (this.open !== open && here && Math.abs(b.x - s.x) < 14) audio.sfx(open ? 'gate' : 'push');
      this.open = open;
    }
    // through it: from now on it stays open, so the way back never needs the trick again
    if (open && s.passFlag && !f[s.passFlag] && here && b.x > s.x + 1.2 && b.x < s.x + 5 && b.y > s.y - 5 && b.y < s.y + GATE_H) {
      f[s.passFlag] = true;
      audio.sfx('checkpoint');
      g.hud.toast('Through! The gate locks open behind you.', 3500);
      g.refreshWorld();
      g.save();
    }
    // on its timer: the band burns down, and it ticks
    const timing = this.openT > 0 && !this.held();
    if (timing && here && Math.abs(b.x - s.x) < 16) {
      this.tickT -= dt;
      if (this.tickT <= 0) {
        this.tickT = this.openT < 1.2 ? 0.12 : 0.25;
        audio.sfx('tick');
      }
    }
    this.band.scale.z = timing ? Math.max(0.02, this.frac()) : 1;
    this.bandMat.color.setHex(s.color).multiplyScalar(timing ? 2.6 : open ? 0.5 : 1.3);
    this.shown += ((open ? 1 : 0) - this.shown) * Math.min(1, dt * 9);
    this.group.position.y = -(GATE_H + 0.05) * this.shown;
    this.group.visible = this.shown < 0.99;
  }
}

export class Timecraft {
  constructor(game) {
    this.game = game;
    this.trail = [];
    this.span = 0;
    this.rewinding = false;
    this.status = document.getElementById('ability-status');
  }

  /** Called after the world is (re)built: gates and the Well's wheels live in its era groups. */
  attach() {
    const g = this.game;
    this.clearTrail();
    this.rewinding = false;
    this.gates = GATES.map((spec) => new Gate(this, spec));
    // the path the watch remembers: a string of faint gold motes behind you
    const geo = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(TRAIL_PTS * 3).fill(-999);
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trailMat = new THREE.PointsMaterial({ color: 0xffd98a, size: 0.13, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
    if (this.trailPts) g.scene.remove(this.trailPts);
    this.trailPts = new THREE.Points(geo, this.trailMat);
    this.trailPts.frustumCulled = false;
    this.trailPts.renderOrder = 4;
    g.scene.add(this.trailPts);
    // the Tide Clock's wheels, on the back wall of the Well: they turn the wrong way until its heart comes home
    this.wheels = [];
    const tones = [0x7a8a6a, 0xb8862a, 0x6a4a3a];
    for (let era = 0; era < 3; era++) {
      for (const [gx, gy, r, dir] of [[294.5, 6.5, 3.4, 1], [289.2, 9.5, 1.8, -1], [284, 13, 2.4, 1], [276.5, 16, 2.0, -1], [270, 18.5, 1.5, 1], [263, 19.5, 2.2, -1]]) {
        if (era === ERA.PAST && gx < 284) continue; // the builders haven't got that far yet
        const gear = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: tones[era], metalness: 0.5, roughness: 0.5 });
        gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.2, 24).rotateX(Math.PI / 2), mat));
        gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.3, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x22343a })));
        const teeth = 10 + Math.round(r * 2);
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.2), mat);
          tooth.position.set(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, 0);
          tooth.rotation.z = a;
          gear.add(tooth);
        }
        gear.position.set(gx, gy, 0.16);
        gear.userData = { dir: dir / r, era };
        g.world.groups[era].add(gear);
        this.wheels.push(gear);
      }
    }
    this.flood = null;
    this.floodMeshes = [];
    this.syncBody();
  }

  /** Body classes show the matching touch button and control-sheet rows. */
  syncBody() {
    const f = this.game.state.flags;
    document.body.classList.toggle('has-rewind', !!f.hasRewind);
    document.body.classList.toggle('has-reach', !!f.hasReach);
    document.body.classList.toggle('rewinding', this.rewinding);
  }

  unlock(which) {
    const g = this.game, f = g.state.flags, touch = touchActive();
    audio.sfx('key');
    if (which === 'rewind') {
      f.hasRewind = true;
      this.clearTrail();
      g.hud.toast(`<b>Rewind!</b> ${touch ? 'Hold <b>Rewind</b>' : 'Hold <kbd>R</kbd>'} to run yourself backward along the path you just took.`, 7000);
    } else {
      f.hasReach = true;
      g.hud.toast(
        touch
          ? '<b>Reach!</b> Hold the amulet to open the time lens. What you see through it, you can now touch: <b>Interact</b> and <b>Attack</b> go through the lens.'
          : '<b>Reach!</b> Hold <kbd>Tab</kbd> to open the time lens. What you see through it, you can now touch: <kbd>F</kbd> and <kbd>X</kbd> go through the lens.',
        9000,
      );
    }
    this.syncBody();
    g.save();
  }

  // ------------------------------------------------------------------ gates
  gate(id) {
    return this.gates.find((gt) => gt.spec.id === id);
  }

  gateFrac(id) {
    return this.gate(id)?.frac() ?? 0;
  }

  /** A lever or panel has been worked: its gate opens, for a few seconds. */
  pull(id) {
    const g = this.game, gt = this.gate(id);
    if (!gt) return;
    audio.sfx('lever');
    if (gt.held()) return g.hud.toast('The gate already stands open.', 2500);
    gt.openT = gt.spec.open;
    g.renderer.shake = Math.max(g.renderer.shake, 0.25);
    const f = g.state.flags;
    if (!f.gateHint) {
      f.gateHint = true;
      g.hud.toast(`The gate is open... for ${gt.spec.open} seconds.${f.hasRewind ? ' The watch can take you back to where you were.' : ''}`, 5000);
    }
  }

  // ------------------------------------------------------------------ rewind
  clearTrail() {
    this.trail = [];
    this.span = 0;
    this.entry = null;
  }

  /** In one of the places with no way out (see SEALED)? The watch must not forget the way in. */
  sealedAt(x, y, z, era) {
    const f = this.game.state.flags;
    return SEALED.some((s) => s.era === era && !f[s.until] && x >= s.x0 && x < s.x1 && z >= s.z0 && z < s.z1 && y >= s.y0 && y <= s.y1);
  }

  /** Remember where the player is, if they've moved. Only movement counts: standing still costs nothing. */
  record(dt) {
    const g = this.game, p = g.player, b = p.body;
    const last = this.trail[this.trail.length - 1];
    if (last && last.era === g.era && Math.abs(last.x - b.x) + Math.abs(last.y - b.y) + Math.abs(last.z - b.z) < 0.015) return;
    this.trail.push({ x: b.x, y: b.y, z: b.z, era: g.era, flip: p.actor.flip, anim: p.actor.anim, dt });
    this.span += dt;
    if (this.sealedAt(b.x, b.y, b.z, g.era)) {
      // keep the way in, however long you wander about down here: forget the middle instead
      this.entry ??= this.trail.length - 1;
      while (this.span > REWIND_MAX * 2 && this.trail.length > this.entry + 2) this.span -= this.trail.splice(this.entry, 1)[0].dt;
    } else {
      this.entry = null;
      while (this.span > REWIND_MAX && this.trail.length > 2) this.span -= this.trail.shift().dt;
    }
  }

  /** Run the player backward along the trail. Returns false when it can go no further. */
  rewindStep(dt) {
    const g = this.game, p = g.player, b = p.body;
    let budget = dt * REWIND_RATE, moved = null;
    while (budget > 0 && this.trail.length > 1) {
      const to = this.trail[this.trail.length - 2];
      // something has shut across the way back since you came through: this is as far as it goes
      if (hits(g.world, to.era, { ...b, x: to.x, y: to.y, z: to.z, h: 1.45 })) {
        budget = -1;
        moved ??= false;
        break;
      }
      const top = this.trail.pop();
      budget -= top.dt;
      this.span = Math.max(0, this.span - top.dt);
      moved = to;
    }
    if (!moved) return moved === null && this.trail.length > 1;
    Object.assign(b, { x: moved.x, y: moved.y, z: moved.z });
    if (moved.era !== g.era) {
      g.shiftEra(moved.era, new THREE.Vector3(b.x, b.y + 0.8, b.z));
      audio.sfx('shift', { era: moved.era });
    }
    p.showAt(moved.anim, moved.flip, dt);
    return this.trail.length > 1;
  }

  updateRewind(dt, ctl) {
    const g = this.game, f = g.state.flags, b = g.player.body;
    const want = ctl && f.hasRewind && input.held('rewind');
    if (want && !this.rewinding && this.trail.length > 4) {
      this.rewinding = true;
      this.fxT = 0;
      audio.sfx('rewind');
      this.syncBody();
      if (!f.rewindHint) {
        f.rewindHint = true;
        g.hud.toast('Only you run backward. The world keeps going.', 4000);
      }
    }
    if (this.rewinding) {
      const more = want && this.rewindStep(dt);
      g.shiftGrace = Math.max(g.shiftGrace || 0, 0.3); // nothing can catch you mid-rewind
      this.fxT -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.05;
        g.bursts.emit(b.x, b.y + 0.8, b.z, 3, { color: [0xffd98a, 0xfff2c8, 0x9ff4ff], speed: 1.2, life: 0.45, gravity: 0, jitter: 0.5, glow: 2 });
        if (Math.random() < 0.5) audio.sfx('tick');
      }
      if (!more) {
        this.rewinding = false;
        g.player.body.vx = g.player.body.vy = g.player.body.vz = 0;
        this.syncBody();
      }
    }
    // the ring shows how much of your path the watch is holding
    if (f.hasRewind) g.hud.setMeter(Math.min(1, this.span / REWIND_MAX), ERA.PRESENT, false);
    else g.hud.setMeter(1, ERA.PRESENT, false);
    this.drawTrail();
  }

  drawTrail() {
    const g = this.game, pos = this.trailPos, n = this.trail.length;
    const show = !!g.state.flags.hasRewind && n > 4;
    const step = Math.max(1, Math.ceil(n / TRAIL_PTS));
    for (let i = 0; i < TRAIL_PTS; i++) {
      const s = show ? this.trail[n - 1 - i * step] : null;
      if (s && s.era === g.era) pos.set([s.x, s.y + 0.25, s.z], i * 3);
      else pos[i * 3 + 1] = -999;
    }
    this.trailPts.geometry.attributes.position.needsUpdate = true;
    this.trailMat.opacity = this.rewinding ? 0.95 : 0.32;
    this.trailMat.size = this.rewinding ? 0.2 : 0.12;
  }

  // ------------------------------------------------------------------ the flood
  /** The Tide Clock runs forward again: the sea comes up the Well, and carries you out. */
  startFlood(level = 0) {
    const g = this.game;
    this.flood = { y: level, filled: -1 };
    for (const t of WELL.terraces.slice(1)) {
      const w = { x0: t.x0, y0: t.top, z0: 0, x1: t.x1 + 1, y1: WELL.floodTop, z1: 6.98, color: 0x3a8fb0 };
      const mesh = makeWater(w, () => false, false);
      mesh.userData.top = t.top;
      g.world.groups[M].add(mesh);
      this.floodMeshes.push(mesh);
    }
    this.updateFlood(0);
  }

  updateFlood(dt) {
    const fl = this.flood, g = this.game, w = g.world;
    if (!fl) return;
    const before = fl.y;
    fl.y = Math.min(WELL.floodTop, fl.y + dt * FLOOD_RATE);
    // each layer the water passes becomes water to swim in (rock and ladders stay as they are)
    while (fl.filled + 1 <= Math.floor(fl.y - 0.35) && fl.filled < 11) {
      const y = ++fl.filled;
      for (const t of WELL.terraces.slice(1)) {
        if (t.top > y) continue;
        for (let x = t.x0; x <= t.x1; x++) for (let z = 0; z <= 6; z++) if (w.raw(M, x, y, z) === T.AIR) w.setDyn(M, x, y, z, T.WATER);
      }
    }
    for (const m of this.floodMeshes) {
      m.visible = fl.y > m.userData.top + 0.05;
      m.position.y = fl.y - WELL.floodTop;
      m.material.uniforms.uTop.value = fl.y;
    }
    if (fl.y < WELL.floodTop && g.era === M && g.player.body.x > L.wellX0) {
      if (Math.floor(before * 2) !== Math.floor(fl.y * 2)) audio.sfx('splash');
      g.renderer.shake = Math.max(g.renderer.shake, 0.12);
    }
  }

  /** The story takes over the water (see the 'wellHeart' feature): drop the moving flood. */
  endFlood() {
    const g = this.game, w = g.world;
    if (!this.flood) return;
    for (const m of this.floodMeshes) {
      m.parent?.remove(m);
      m.userData.dispose?.();
    }
    this.floodMeshes = [];
    for (const t of WELL.terraces.slice(1)) for (let x = t.x0; x <= t.x1; x++) for (let z = 0; z <= 6; z++) for (let y = t.top; y <= 11; y++) w.clearDyn(M, x, y, z);
    this.flood = null;
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, ctl) {
    const g = this.game, f = g.state.flags, b = g.player.body;
    const running = g.mode === 'play' || g.mode === 'dialogue';
    if (running) for (const gt of this.gates) gt.update(dt);
    this.updateRewind(dt, ctl && g.mode === 'play');

    // a gate on its timer: say how long is left
    const timed = this.gates.filter((gt) => gt.openT > 0 && !gt.held() && Math.abs(b.x - gt.spec.x) < 24).sort((a, c) => a.openT - c.openT)[0];
    this.setStatus(this.rewinding ? '◀◀ Rewinding' : timed ? `Gate open: ${timed.openT.toFixed(1)}s` : null);

    // out of Salvage Pit 3 with the clapper: leave a rope ladder behind, for next time
    if (!f.pitLeft && g.state.taken.includes('clapper') && g.mode === 'play' && b.onGround && b.y >= -0.1 && !this.sealedAt(b.x, b.y, b.z, g.era)) {
      f.pitLeft = true;
      g.refreshWorld();
      g.save();
      g.hud.toast('Out again! You leave a rope ladder down the pit, in case of next time.', 4500);
    }

    // the Well: its wheels, and the tide coming home
    const forward = !!f.heartPlaced;
    for (const gear of this.wheels) {
      const u = gear.userData;
      const k = u.era === M ? (forward ? 1.6 : -0.35) : u.era === ERA.FUTURE ? (f.tideRestored ? 1.6 : -0.08) : 0.5;
      gear.rotation.z += u.dir * k * dt;
    }
    if (forward && !f.wellFull && !this.flood) this.startFlood(f.floodDone ? WELL.floodTop : 0);
    if (running) this.updateFlood(dt);
    if (this.flood && this.flood.y >= WELL.floodTop && !f.floodDone) {
      f.floodDone = true;
      g.save();
    }
    // back on the top terrace with the sea behind you: that's the story told
    const top = WELL.terraces[0];
    if (forward && !f.finished && g.mode === 'play' && g.era === M && b.onGround && b.y >= top.top - 0.1 && b.x > L.wellX0 && b.x < top.x1 + 0.4) g.runEnding();
  }

  setStatus(text) {
    if (!this.status) return;
    if (text === this.statusText) return;
    this.statusText = text;
    this.status.hidden = !text;
    if (text) this.status.textContent = text;
    this.status.classList.toggle('rewind', !!text && text.startsWith('◀'));
  }
}
