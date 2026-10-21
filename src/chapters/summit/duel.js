// Chapter Three's last fight: Donald Eugene, at the End of Time, with every power Vivienne has
// gathered against every power he has. Built like the old cartridge boss fights: he works through
// a pattern you can learn, every attack is wound up where you can see it, and after each pattern
// he tires and drops his guard. That's the moment to hit him: with the wrench, or a wave.
//
//   Phase 1  Stasis rings roll down the hall at you, along the floor: jump them. A ring that
//            catches you freezes you for a moment (tap to break out sooner).
//   Phase 2  He rewrites the hall: strips of floor flare gold (stay off them), and rings come high
//            (roll under) as well as low. Hurt him, and he winds up a Rewind to undo it: hit him
//            while the clock spins (the Stasis ring holds him; the Hairspring undoes his undoing).
//   Phase 3  He speeds himself up, and starts rubbing out Zach and Megan. His guard holds until
//            both are held in their moment. Then the Page Turn: a wall of rewritten time down the
//            whole hall. Only the Lantern's light keeps you in your own moment.
//
// Every part on the wrench has a use: the Stasis ring freezes his rings in the air (and him, while
// his guard is down), the Escapement slows his rings or him, the Hairspring sends a ring straight
// back where it came from, into him. He has 12 hours of health, 4 to each phase; die, and the
// phase starts over. (SummitGame owns the flags; this owns everything that moves.)
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { Actor } from '../../render/actors.js';
import { crystal } from '../../world/entities.js';
import { touchActive } from '../../ui/touch.js';
import { ARENA, inArena } from './level.js';

const M = ERA.PRESENT;
const HP = 12;
const PER_PHASE = 4;
const FY = ARENA.y; // the hall's floor
const CZ = (ARENA.z0 + ARENA.z1 + 1) / 2;
const DEPTH = ARENA.z1 - ARENA.z0 + 1;
const X0 = ARENA.x0 + 1, X1 = ARENA.daisX - 1; // the floor he fights over
const STATIONS = [43.5, 50.5, 57.5];
const RING = { speed: [0, 6, 6.6, 7.6], low: [0, 1.0], high: [1.0, 1.95], thick: 0.45 };
const SEAM_W = 3; // strips of floor he rewrites, every other one
const COLD = 0xbff6ff, AMBER = 0xffb84a, GOLD = 0xffc24a, GREEN = 0xc8f070;
const key = (k, touch) => (touchActive() ? `<b>${touch}</b>` : `<kbd>${k}</kbd>`);

export class Duel {
  constructor(game) {
    this.game = game;
    this.on = false;
    this.rings = [];
    this.seams = [];
    this.page = null;
    this.frozenT = 0;
    this.bar = document.getElementById('boss-bar');
  }

  get flags() {
    return this.game.state.flags;
  }
  /** The fight is on, and she's in the hall. */
  get active() {
    const f = this.flags, b = this.game.player.body;
    return this.on && f.summitTalk && !f.hoursReturned && inArena(b.x, b.y, b.z);
  }
  get phase() {
    return this.flags.duelPhase || 1;
  }
  get floorHp() {
    return HP - PER_PHASE * this.phase;
  }
  /** Squirrels still being rubbed out, in phase three: he draws on that, and it guards him. */
  get squirrelsLeft() {
    const f = this.flags;
    return this.phase === 3 && !(f.zachHeld && f.meganHeld);
  }
  /** Can anything get through to him right now? */
  get open() {
    return ['tired', 'wind', 'stunned'].includes(this.state) && !this.squirrelsLeft;
  }

  // ------------------------------------------------------------------ setting up
  /** The world was (re)built: his figure, his guard, his rewind clock, all in the Present's group. */
  attach() {
    const g = this.game, grp = g.world.groups[M];
    this.don = new Actor('eugeneWinter', 2.1);
    this.don.mesh.scale.multiplyScalar(1.3); // (a boss is drawn a size up)
    this.group = new THREE.Group();
    this.group.add(this.don.mesh);
    this.guard = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.6), transparent: true, opacity: 0.8, depthWrite: false }));
    this.clock = new THREE.Group();
    const face = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(2), side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    this.clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.02).translate(0, 0.22, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(2.4) }));
    this.clock.add(face, this.clockHand);
    grp.add(this.group, this.guard, this.clock);
    this.rings = [];
    this.seams = [];
    this.page = null;
    this.group.visible = this.guard.visible = this.clock.visible = false;
  }

  /** Into the hall: the fight starts (or starts its phase over). */
  start() {
    const f = this.flags;
    f.duelPhase ||= 1;
    this.on = true;
    this.reset();
    this.showBar(true);
  }

  /** The phase from the top: his health, his place on the throne, nothing in the air. */
  reset() {
    this.hp = HP - PER_PHASE * (this.phase - 1);
    this.clearShots();
    this.x = ARENA.orinX;
    this.y = FY + 2;
    this.hover = 0;
    this.state = 'idle';
    this.t = 0.9;
    this.queue = [];
    this.slowT = 0;
    this.hitCd = 0;
    this.tookHit = false;
    this.cycle = 0;
    this.frozenT = 0;
    if (this.game.player.actor.mat.userData.preCrystal) crystal(this.game.player.actor, false);
    this.drawBar();
  }

  clearShots() {
    for (const r of this.rings) r.mesh.parent?.remove(r.mesh);
    for (const s of this.seams) s.mesh.parent?.remove(s.mesh);
    if (this.page) this.page.mesh.parent?.remove(this.page.mesh);
    this.rings = [];
    this.seams = [];
    this.page = null;
  }

  stop() {
    this.on = false;
    this.clearShots();
    this.showBar(false);
    if (this.group) this.group.visible = this.guard.visible = this.clock.visible = false;
  }

  // ------------------------------------------------------------------ his health, along the top
  showBar(on) {
    if (!this.bar) return;
    this.bar.hidden = !on;
    if (on) this.drawBar();
  }
  drawBar() {
    if (!this.bar) return;
    const pips = this.bar.querySelector('.bb-pips');
    if (pips.children.length !== HP) pips.innerHTML = Array.from({ length: HP }, () => '<i></i>').join('');
    [...pips.children].forEach((p, i) => p.classList.toggle('lost', i >= this.hp));
    this.bar.classList.toggle('guarded', !this.open);
  }

  // ------------------------------------------------------------------ what she can aim at (see src/kit.js)
  /** Him, his rings, and (in phase three) the squirrels he is rubbing out. */
  targets(part) {
    if (!this.active || this.state === 'down') return [];
    const out = [];
    for (const r of this.rings) {
      if (r.dead) continue;
      out.push({ x: r.x, y: FY + (r.high ? 1.2 : 0.2), z: this.game.player.body.z, name: 'the ring', hit: (p) => this.hitRing(r, p) });
    }
    // (while he's rubbing out the squirrels, a Stasis wave is for them: it would only break on his guard)
    if (!(part === 'seal' && this.squirrelsLeft)) out.push({ x: this.x, y: this.y, z: CZ, name: 'Donald Eugene', actor: this.don, hit: (p) => this.waveHit(p) });
    if (part === 'seal') for (const s of this.game.squirrelTargets?.() || []) out.push(s);
    return out;
  }

  /** A wave meets one of his rings: held where it is, slowed, or sent back at him. */
  hitRing(r, part) {
    const g = this.game;
    if (part === 'seal') {
      r.held = 1.4;
      r.mat.color.setHex(0xffffff).multiplyScalar(2);
      this.hint('ringHeld', 'Held in its moment, in mid-air. It will crumble in a second.');
    } else if (part === 'tempo') {
      r.slow = true;
      r.mat.color.setHex(GREEN).multiplyScalar(1.8);
    } else if (part === 'rewind') {
      r.back = true;
      r.dir = Math.sign(this.x - r.x) || 1;
      r.mat.color.setHex(AMBER).multiplyScalar(2);
      audio.sfx('rewind');
      this.hint('ringBack', 'Back where it came from. Straight at him.');
    }
    g.bursts.emit(r.x, FY + 1, g.player.body.z, 20, { color: [r.mat.color.getHex(), 0xffffff], speed: 3, life: 0.5 });
  }

  /** A wave meets him. While his guard is up, it just breaks on it. */
  waveHit(part) {
    if (this.state === 'wind') {
      // he was undoing it: any wave stops him, and the Hairspring undoes his undoing
      if (this.damage(part === 'rewind' ? 2 : 1, part === 'rewind' ? 'He spins out of his own Rewind!' : null)) return;
      if (part === 'seal') this.stun(1.4);
      else this.nextPattern(0.8);
      return;
    }
    if (!this.open) return this.deflect();
    if (this.damage(1)) return;
    if (part === 'seal') this.stun(1.5);
    if (part === 'tempo') {
      this.slowT = 5;
      this.hint('donSlow', 'Slowed! For a few seconds, everything he does comes at a crawl.');
    }
  }

  /** The wrench, swung at him. */
  meleeHit(x, y, z) {
    if (!this.active || this.hitCd > 0 || this.state === 'down') return;
    if (Math.abs(x - this.x) > 1.2 || Math.abs(z - CZ) > DEPTH / 2 + 0.5 || y < this.y - 0.8 || y > this.y + 2.4) return;
    this.hitCd = 0.3;
    if (this.state === 'wind') {
      if (!this.damage(1)) this.nextPattern(0.8);
      return;
    }
    if (!this.open) return this.deflect();
    this.damage(1);
  }

  deflect() {
    const g = this.game;
    audio.sfx('blocked');
    g.bursts.emit(this.x, this.y + 1.2, CZ, 16, { color: [GOLD, 0xffffff], speed: 4, life: 0.4 });
    if (this.squirrelsLeft) this.hint('guardSquirrels', `His guard holds while he is rubbing out Zach and Megan. Hold them in their moment first: the <b>Stasis ring</b> (${key('T', 'wrench chip')}), hold ${key('X', 'Attack')} and let go.`);
    else this.hint('guard', 'It breaks on his guard. Wait for him to tire: when he sinks to the floor, his guard is down.');
  }

  stun(secs) {
    this.state = 'stunned';
    this.t = secs;
    crystal(this.don, true);
  }

  /** True if that was the end of the phase. */
  damage(n, line = null) {
    const g = this.game;
    this.hp = Math.max(this.floorHp, this.hp - n);
    this.tookHit = true;
    this.flash = 0.25;
    audio.sfx('hit');
    g.renderer.shake = 0.45;
    g.bursts.emit(this.x, this.y + 1.1, CZ, 30, { color: [GOLD, 0xffffff, COLD], speed: 5, life: 0.6 });
    if (line) g.hud.toast(line, 2500);
    this.drawBar();
    if (this.hp > this.floorHp) return false;
    this.endPhase();
    return true;
  }

  hint(flag, text) {
    const f = this.flags;
    if (f['duel_' + flag]) return;
    f['duel_' + flag] = true;
    this.game.hud.toast(text, 5000);
  }

  // ------------------------------------------------------------------ phases
  endPhase() {
    const g = this.game;
    this.clearShots();
    this.state = 'down';
    this.t = 0;
    if (this.don.mat.userData.preCrystal) crystal(this.don, false);
    // a heart or two for the next phase, the way they always fall
    for (let i = 0; i < 2; i++) g.spawnHeart(M, X0 + 6 + i * 8, FY + 0.4, CZ);
    if (this.phase === 3) return g.duelWon();
    g.duelPhaseDone(this.phase);
  }

  /** On to the next phase (SummitGame has said what it had to say). */
  nextPhase() {
    this.flags.duelPhase = this.phase + 1;
    this.game.save();
    this.state = 'idle';
    this.t = 0.6;
    this.queue = [];
    this.cycle = 0;
    this.drawBar();
  }

  /** What he does next: one pattern, then he tires. */
  plan() {
    const p = this.phase, far = this.farStation();
    const W = (t) => ({ do: 'wait', t });
    const R = (high = false) => ({ do: 'ring', high });
    this.cycle++;
    if (p === 1) return [{ do: 'blink', x: far }, W(0.5), R(), W(1.0), R(), W(1.0), R(), W(1.0), { do: 'tired', t: 2.8 }];
    const mix = () => R(Math.random() < 0.5);
    if (p === 2) return [{ do: 'blink', x: far }, { do: 'seams' }, W(0.5), mix(), W(0.9), mix(), W(0.9), mix(), W(0.8), { do: 'tired', t: 2.4 }];
    if (this.cycle % 2 === 0 && !this.squirrelsLeft) return [{ do: 'blink', x: STATIONS[2] }, { do: 'page' }, W(1.4), R(), W(0.8), { do: 'tired', t: 2.2 }];
    return [{ do: 'blink', x: far }, R(), W(0.65), R(true), W(0.65), R(), W(0.7), { do: 'seams' }, W(1.0), { do: 'tired', t: 2.2 }];
  }

  /** A station well away from her (he never lands on top of her). */
  farStation() {
    const px = this.game.player.body.x;
    const choices = STATIONS.filter((x) => Math.abs(x - px) > 6 && Math.abs(x - this.x) > 1);
    const pool = choices.length ? choices : STATIONS.filter((x) => Math.abs(x - px) > 4);
    return pool[Math.floor(Math.random() * pool.length)] ?? STATIONS[2];
  }

  nextPattern(delay = 0.5) {
    if (this.don.mat.userData.preCrystal) crystal(this.don, false);
    this.state = 'idle';
    this.t = delay;
    this.queue = [];
  }

  // ------------------------------------------------------------------ every frame
  update(dt, ctl) {
    const g = this.game;
    const show = this.on && this.flags.summitTalk && !this.flags.hoursReturned && g.inArenaMood;
    this.group.visible = show;
    if (!show) {
      this.guard.visible = this.clock.visible = false;
      return;
    }
    this.updateFreeze(dt);
    this.hitCd = Math.max(0, this.hitCd - dt);
    this.flash = Math.max(0, (this.flash || 0) - dt);
    // he runs on his own clock: quicker in phase three, a crawl while the Escapement holds him
    const pace = (this.phase === 3 ? 1.3 : 1) * (this.slowT > 0 ? 0.4 : 1);
    this.slowT = Math.max(0, this.slowT - dt);
    const fight = ctl || this.frozenT > 0;
    if (fight && this.state !== 'down') this.think(dt * pace);
    this.updateShots(dt, fight);
    this.draw(dt);
  }

  think(dt) {
    this.t -= dt;
    switch (this.state) {
      case 'stunned':
        if (this.t <= 0) {
          crystal(this.don, false);
          this.nextPattern(0.4);
        }
        return;
      case 'tired':
        if (this.t > 0) return;
        // hurt while he was down (from phase two on): he winds up a Rewind to undo it
        if (this.tookHit && this.phase >= 2 && this.hp < HP - PER_PHASE * (this.phase - 1)) {
          this.state = 'wind';
          this.t = 2.2;
          audio.sfx('rewind');
          this.hint('wind', `He's winding up a <b>Rewind</b>, to undo the damage! Hit him before the clock comes round: the wrench, or any wave.`);
          return;
        }
        return this.nextPattern(0.5);
      case 'wind':
        if (this.t > 0) {
          if (Math.random() < 0.15) audio.sfx('tick');
          return;
        }
        // undone
        this.hp = Math.min(HP - PER_PHASE * (this.phase - 1), this.hp + 1);
        this.drawBar();
        audio.sfx('heal');
        this.game.bursts.emit(this.x, this.y + 1.4, CZ, 30, { color: [AMBER, 0xffffff], speed: 3, life: 0.8 });
        this.game.hud.toast('<b>Donald Eugene:</b> "Undone."', 2200);
        return this.nextPattern(0.5);
      case 'blink':
        if (this.t > 0) return;
        this.x = this.blinkTo;
        this.burst(COLD, 30);
        audio.sfx('shift', { era: M });
        this.state = 'busy';
        return;
      case 'ringUp':
        if (this.t > 0) return;
        this.fireRing(this.ringHigh);
        this.state = 'busy';
        return;
      case 'pageUp':
        if (this.t > 0) return;
        this.firePage();
        this.state = 'busy';
        return;
      case 'idle':
      case 'busy':
      default:
        if (this.t > 0) return;
        if (!this.queue.length) this.queue = this.plan();
        this.doNext(this.queue.shift());
    }
  }

  doNext(a) {
    const g = this.game;
    this.tookHit = false;
    this.state = 'busy';
    this.t = 0;
    if (a.do === 'wait') this.t = a.t;
    else if (a.do === 'blink') {
      this.burst(COLD, 30);
      this.state = 'blink';
      this.blinkTo = a.x;
      this.t = 0.35;
    } else if (a.do === 'ring') {
      // the wind-up: a flare of cold light at his hand, so you see it coming
      this.state = 'ringUp';
      this.ringHigh = a.high;
      this.t = 0.5;
      audio.sfx('tick');
    } else if (a.do === 'seams') this.rewriteFloor();
    else if (a.do === 'page') {
      this.state = 'pageUp';
      this.t = 1.6;
      audio.sfx('glitch');
      this.hint('page', `He's turning the whole page! A wall of rewritten time, from wall to wall: light your <b>Lantern</b> (${key('R', 'Lantern')}). Its old light keeps you in your own moment.`);
      g.hud.toast('<b>Donald Eugene:</b> "Every page, turned back!"', 2200);
    } else if (a.do === 'tired') {
      this.state = 'tired';
      this.t = a.t;
      this.hint('tired', `He's winded, and his guard is down! Now: your wrench (${key('X', 'Attack')}), or a wave.`);
    }
  }

  burst(color, n) {
    this.game.bursts.emit(this.x, this.y + 1, CZ, n, { color: [color, 0xffffff], speed: 3.5, life: 0.6 });
  }

  // ------------------------------------------------------------------ his attacks
  fireRing(high) {
    const g = this.game, grp = g.world.groups[M];
    const lo = high ? RING.high[0] : RING.low[0], hi = high ? RING.high[1] : RING.low[1];
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLD).multiplyScalar(1.7), transparent: true, opacity: 0.6, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(RING.thick, hi - lo, DEPTH), mat);
    mesh.position.set(this.x, FY + (lo + hi) / 2, CZ);
    grp.add(mesh);
    const dir = Math.sign(g.player.body.x - this.x) || -1;
    this.rings.push({ x: this.x - dir * 0.2 + dir * 0.6, dir, high, lo, hi, mesh, mat, held: 0, slow: false, back: false });
    audio.sfx('shift', { era: M });
  }

  /** Strips of floor flare: first a flicker where it will happen, then the gold burns. */
  rewriteFloor() {
    const g = this.game, grp = g.world.groups[M];
    const odd = Math.random() < 0.5 ? 1 : 0;
    for (let i = 0, x = X0; x + SEAM_W <= X1 + 1; i++, x += SEAM_W) {
      if (i % 2 !== odd) continue;
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.6), transparent: true, opacity: 0.2, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(SEAM_W - 0.1, 0.05, DEPTH - 0.1), mat);
      mesh.position.set(x + SEAM_W / 2, FY + 0.03, CZ);
      grp.add(mesh);
      this.seams.push({ x0: x, x1: x + SEAM_W, t: 0, warn: 1.2, burn: 1.8, mesh, mat });
    }
    audio.sfx('glitch');
    this.hint('seams', 'He is rewriting the floor! Where it flickers, it is about to burn: get off it, or jump.');
  }

  firePage() {
    const g = this.game, grp = g.world.groups[M];
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(1.8), transparent: true, opacity: 0.55, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, DEPTH), mat);
    grp.add(mesh);
    this.page = { x: ARENA.x1 + 0.5, mesh, mat }; // from the far wall, so there is nowhere behind it to stand
    audio.sfx('crush');
    g.renderer.shake = 0.8;
  }

  updateShots(dt, fight) {
    const g = this.game, p = g.player, b = p.body;
    const speed = RING.speed[this.phase] * (this.slowT > 0 ? 0.5 : 1);
    for (const r of this.rings) {
      if (r.held > 0) {
        r.held -= dt;
        r.mat.opacity = 0.3 + r.held * 0.4;
        if (r.held <= 0) {
          r.dead = true;
          g.bursts.emit(r.x, FY + (r.lo + r.hi) / 2, b.z, 18, { color: [COLD, 0xffffff], speed: 3, life: 0.5, gravity: 6 });
        }
        continue;
      }
      if (!fight) continue;
      r.x += r.dir * speed * (r.slow ? 0.3 : 1) * (r.back ? 1.6 : 1) * dt;
      r.mesh.position.x = r.x;
      if (r.x < X0 - 1 || r.x > ARENA.x1) r.dead = true;
      if (r.back) {
        // sent back: it finds him, guard or no (unless he's drawing on the squirrels)
        if (Math.abs(r.x - this.x) < 0.7 && this.state !== 'down') {
          r.dead = true;
          if (this.squirrelsLeft) this.deflect();
          else this.damage(2, 'His own ring, straight back at him!');
        }
        continue;
      }
      // her: overlapping the band, and inside its height
      if (Math.abs(r.x - b.x) < RING.thick / 2 + b.hw && b.y < FY + r.hi && b.y + b.h > FY + r.lo) {
        if (this.catchPlayer(r.x)) r.dead = true;
      }
    }
    for (const r of this.rings) if (r.dead) r.mesh.parent?.remove(r.mesh);
    this.rings = this.rings.filter((r) => !r.dead);

    for (const s of this.seams) {
      if (fight) s.t += dt;
      const burning = s.t > s.warn;
      s.mat.opacity = burning ? 0.85 : 0.12 + (Math.floor(s.t * 10) % 2) * 0.25;
      if (burning && Math.random() < dt * 30) g.bursts.emit(s.x0 + Math.random() * SEAM_W, FY + 0.1, ARENA.z0 + Math.random() * DEPTH, 1, { color: [GOLD, 0xfff2c0], speed: 0.6, life: 0.6, gravity: -2, glow: 2 });
      if (burning && b.x > s.x0 && b.x < s.x1 && b.y < FY + 0.25 && b.onGround) p.hurt(1, b.x - 1, { force: 3, ignoreRoll: true });
      if (s.t > s.warn + s.burn) s.dead = true;
    }
    for (const s of this.seams) if (s.dead) s.mesh.parent?.remove(s.mesh);
    this.seams = this.seams.filter((s) => !s.dead);

    const pg = this.page;
    if (pg) {
      if (fight) pg.x -= 7.5 * (this.slowT > 0 ? 0.5 : 1) * dt;
      pg.mesh.position.set(pg.x, FY + 3.5, CZ);
      pg.mat.opacity = 0.45 + Math.sin(g.time * 30) * 0.1;
      if (Math.random() < dt * 40) g.bursts.emit(pg.x, FY + Math.random() * 7, ARENA.z0 + Math.random() * DEPTH, 1, { color: [0xfff2d0, GOLD], speed: 1, life: 0.5 });
      if (!pg.passed && Math.abs(pg.x - b.x) < 0.5) {
        pg.passed = true;
        if (g.powers.lit) {
          g.bursts.emit(b.x, b.y + 1, b.z, 30, { color: [0xffb84a, 0xfff2d0], speed: 3, life: 0.6 });
          audio.sfx('checkpoint');
          this.hint('pageSafe', 'The Lantern held. Its light keeps you in your own moment.');
        } else this.catchPlayer(pg.x, 2);
      }
      if (pg.x < X0 - 2) {
        pg.mesh.parent?.remove(pg.mesh);
        this.page = null;
      }
    }
  }

  /** Caught by one of his rings (or the page): a heart, and frozen in place for a moment. */
  catchPlayer(fromX, hearts = 1) {
    const p = this.game.player;
    if (p.invuln > 0 || this.game.mode !== 'play' || this.game.godMode) return false;
    p.hurt(hearts, fromX, { force: 3, ignoreRoll: true });
    if (p.hp <= 0) return true;
    this.frozenT = 1.1;
    crystal(p.actor, true);
    this.hint('frozen', `Frozen! Tap ${key('X', 'Attack')} or ${key('Space', 'Jump')} to break out sooner.`);
    return true;
  }

  updateFreeze(dt) {
    if (!(this.frozenT > 0)) return;
    const p = this.game.player;
    if (input.hit('attack') || input.hit('jump')) {
      this.frozenT -= 0.22;
      this.game.bursts.emit(p.body.x, p.body.y + 0.9, p.body.z, 6, { color: [COLD, 0xffffff], speed: 2.5, life: 0.4 });
    }
    this.frozenT -= dt;
    if (this.frozenT <= 0) {
      this.frozenT = 0;
      crystal(p.actor, false);
      audio.sfx('snap');
    }
  }

  // ------------------------------------------------------------------ how he looks
  draw(dt) {
    const g = this.game, a = this.don;
    this.hover += dt;
    const grounded = ['tired', 'stunned', 'down', 'wind'].includes(this.state);
    const want = grounded ? FY : FY + 0.7 + Math.sin(this.hover * 2.2) * 0.15;
    this.y += (want - this.y) * Math.min(1, dt * 6);
    a.flip = g.player.body.x < this.x;
    a.play(this.state === 'down' ? 'hurt' : this.state === 'ringUp' || this.state === 'pageUp' || this.state === 'wind' ? 'talk' : 'idle');
    a.update(this.state === 'stunned' ? 0 : dt);
    a.mesh.position.set(this.x, this.y - 0.1, CZ);
    a.mesh.quaternion.copy(g.renderer.billboardQ);
    a.mesh.visible = this.state !== 'blink' || this.t > 0.2 || Math.floor(this.t * 30) % 2 === 0;
    if (!a.mat.userData.preCrystal && !a.mat.userData.preGlow) {
      // tired: gold cracks glowing through him; hit: a white flash
      const tired = this.state === 'tired';
      a.mat.emissive.setHex(this.flash > 0 ? 0xffffff : tired ? GOLD : this.state === 'ringUp' ? COLD : 0x000000);
      a.mat.emissiveIntensity = this.flash > 0 ? 1.2 : tired ? 0.4 + Math.sin(g.time * 8) * 0.2 : this.state === 'ringUp' ? 0.8 : 0;
    }
    if (this.state === 'tired' && Math.random() < dt * 8) g.bursts.emit(this.x, this.y + 1.6, CZ, 1, { color: [GOLD, 0xffffff], speed: 0.8, life: 0.6, gravity: -1 });
    this.guard.visible = !this.open && this.state !== 'down';
    this.guard.position.set(this.x, this.y + 1.05, CZ);
    this.guard.quaternion.copy(g.renderer.billboardQ);
    this.guard.material.opacity = (this.squirrelsLeft ? 0.85 : 0.6) + Math.sin(g.time * 5) * 0.12;
    this.clock.visible = this.state === 'wind';
    if (this.clock.visible) {
      this.clock.position.set(this.x, this.y + 2.6, CZ);
      this.clock.quaternion.copy(g.renderer.billboardQ);
      this.clockHand.rotation.z = (this.t / 2.2) * Math.PI * 2; // backward, toward twelve
    }
    if (this.bar) this.bar.classList.toggle('guarded', !this.open);
  }
}
