// Chapter Three's last fight: Donald Eugene, at the End of Time, with every power Vivienne has
// gathered against every power he has. Built like the old cartridge boss fights: he works through
// a pattern you can learn, every attack is wound up where you can see it coming, and after each
// pattern he stumbles out of a blink right in front of you, winded, his guard down. That's the
// moment to hit him: with the wrench, or a wave.
//
//   Phase 1  Stasis bolts: balls of cold light, fired down the hall along a line you can see on the
//            floor before they come. Step up or down out of the line (or roll through), or swing
//            the wrench just as one reaches you and knock it back: his own bolt shatters his guard
//            and knocks him down. A bolt that catches you costs a heart and freezes you for a
//            moment (tap to break out).
//   Phase 2  He rewrites the floor: gold cracks spread across a stretch of it, and then it falls
//            away into the dark under the End of Time, until he winds it back. Get off the cracks.
//            Hurt him, and he winds up a Rewind to undo it: hit him while the clock spins.
//   Phase 3  He speeds up, fans his bolts across the hall, and starts rubbing out Zach and Megan:
//            his guard holds until both are held in their moment. Then the Page Turn: a wall of
//            rewritten time down the whole hall. Only the Lantern's light keeps you in your own.
//
// Every part on the wrench has a use: the Stasis ring holds a bolt in mid-air (and him, while his
// guard is down), the Escapement slows a bolt or him, the Hairspring sends a bolt straight back
// into him. He has 12 hours of health, 4 to each phase; die, and the phase starts over.
// (SummitGame owns the flags; this owns everything that moves.)
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { Actor } from '../../render/actors.js';
import { CARDS } from '../../render/fx.js';
import { crystal } from '../../world/entities.js';
import { touchActive } from '../../ui/touch.js';
import { ARENA, inArena } from './level.js';

const M = ERA.PRESENT;
const HP = 12;
const PER_PHASE = 4;
const FY = ARENA.y; // the hall's floor
const CZ = (ARENA.z0 + ARENA.z1 + 1) / 2;
const DEPTH = ARENA.z1 - ARENA.z0 + 1;
const Z0 = ARENA.z0 + 0.4, Z1 = ARENA.z1 + 0.6; // front to back, where she (and he) can be
const X0 = ARENA.x0 + 1, X1 = ARENA.daisX - 1; // the floor he fights over
const STATIONS = [43.5, 50.5, 57.5];
const BOLT = { speed: [0, 5.2, 5.8, 6.4], r: 0.32, y: 0.78, windup: [0, 0.65, 0.6, 0.5] };
const LANES = [-2.2, -0.85, 0.5, 1.85, 3.2]; // the lines his volleys come down, front to back
const RIFT = { w: 3, warn: 1.5, open: 2.6, mend: 0.6 }; // stretches of floor he rewrites
const COLD = 0xbff6ff, BOLT_C = 0x5fd0ff, AMBER = 0xff9a2a, GOLD = 0xffc24a, GREEN = 0x9ee03a;
const MARBLE = [0x3e3a48, 0x48434f, 0x35313d, 0x524c5a, 0x413c4a];
const key = (k, touch) => (touchActive() ? `<b>${touch}</b>` : `<kbd>${k}</kbd>`);
const clampZ = (z) => Math.max(Z0, Math.min(Z1, z));

// ------------------------------------------------------------------ how a broken floor looks
/** Gold cracks across a stretch of floor (three blocks by the hall's depth), drawn pixel by pixel. */
function crackTexture() {
  const S = 16, w = RIFT.w * S, h = DEPTH * S;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff';
  for (let k = 0; k < 9; k++) {
    let x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI * 2;
    for (let i = 0; i < 40; i++) {
      c.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (i % 3 === 0) c.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
      a += (Math.random() - 0.5) * 1.1;
      x = (x + Math.cos(a) * 1.4 + w) % w;
      y = Math.max(0, Math.min(h - 1, y + Math.sin(a) * 1.4));
    }
  }
  // and along the seams where it will break off
  for (let y = 0; y < h; y++) {
    if (Math.random() < 0.7) c.fillRect(0, y, 1, 1);
    if (Math.random() < 0.7) c.fillRect(w - 1, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/**
 * Where the floor has gone: the dark under the End of Time, stars far down in it (they shift as
 * the camera does, so it reads as a hole and not a lid), and a rim of gold where it broke off.
 */
const VOID = {
  uniforms: { time: { value: 0 }, x0: { value: 0 }, x1: { value: 0 }, top: { value: FY } },
  vertexShader: `varying vec3 vW; varying vec3 vN;
    void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
  fragmentShader: `uniform float time, x0, x1, top; varying vec3 vW; varying vec3 vN;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec3 v = normalize(vW - cameraPosition);
      vec3 col = vec3(0.004, 0.003, 0.014);
      float facing = max(0.18, abs(dot(v, vN)));
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec3 p = vW + v * ((2.5 + fi * 5.0) / facing);
        vec2 q = (abs(vN.y) > 0.5 ? p.xz : p.xy) * (1.6 - fi * 0.35) + fi * 17.0;
        vec2 c = floor(q), f = fract(q) - 0.5 - (vec2(hash(c + 1.0), hash(c + 2.0)) - 0.5) * 0.6;
        float h = hash(c);
        float s = step(0.84, h) * smoothstep(0.14, 0.0, length(f));
        col += s * mix(vec3(1.0, 0.82, 0.45), vec3(0.6, 0.8, 1.0), hash(c + 3.0)) * (1.0 - fi * 0.28) * (0.65 + 0.35 * sin(time * 3.0 + h * 40.0));
        col += vec3(0.03, 0.015, 0.05) * max(0.0, sin(q.x * 0.7 + time * 0.4 + fi) * sin(q.y * 0.5 - time * 0.3)) * (0.5 - fi * 0.12);
      }
      float e = min(vW.x - x0, x1 - vW.x);
      if (vW.y < top - 0.01) e = min(e, top - vW.y);
      col += vec3(1.0, 0.72, 0.25) * 2.4 * smoothstep(0.13, 0.0, e);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Duel {
  constructor(game) {
    this.game = game;
    this.on = false;
    this.bolts = [];
    this.warns = [];
    this.rifts = [];
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
  /** Which way he faces: toward her. */
  get face() {
    return this.game.player.body.x < this.x ? -1 : 1;
  }
  hand() {
    return { x: this.x + this.face * 0.6, y: this.y + 1.6, z: this.z + 0.3 };
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
    this.chunkGeo ||= new THREE.BoxGeometry(0.98, 0.98, 0.98);
    this.chunkMats ||= MARBLE.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
    this.glowGeo ||= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.bolts = [];
    this.warns = [];
    this.rifts = [];
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
    this.z = CZ;
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
    for (const b of this.bolts) this.dropBolt(b);
    for (const w of this.warns) w.mesh.parent?.remove(w.mesh);
    for (const r of this.rifts) this.closeRift(r, true);
    if (this.page) this.page.mesh.parent?.remove(this.page.mesh);
    this.bolts = [];
    this.warns = [];
    this.rifts = [];
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
  /** Him, his bolts, and (in phase three) the squirrels he is rubbing out. */
  targets(part) {
    if (!this.active || this.state === 'down') return [];
    const out = [], pz = this.game.player.body.z;
    for (const b of this.bolts) {
      if (b.dead || b.back) continue;
      out.push({ x: b.x, y: FY, z: b.z, name: 'the bolt', pos: () => ({ x: b.x, y: FY + BOLT.y, z: b.z }), gone: () => b.dead, hit: (p) => this.hitBolt(b, p) });
    }
    // (while he's rubbing out the squirrels, a Stasis wave is for them: it would only break on his guard)
    if (!(part === 'seal' && this.squirrelsLeft)) {
      out.push({ x: this.x, y: this.y, z: Math.max(this.z - 1.5, Math.min(this.z + 1.5, pz)), name: 'Donald Eugene', actor: this.don, pos: () => ({ x: this.x, y: this.y + 1.3, z: this.z }), hit: (p) => this.waveHit(p) });
    }
    if (part === 'seal') for (const s of this.game.squirrelTargets?.() || []) out.push(s);
    return out;
  }

  /** A wave meets one of his bolts: held where it is, slowed, or sent back at him. */
  hitBolt(b, part) {
    if (b.dead) return;
    if (part === 'seal') {
      b.held = 1.4;
      b.orb.mat.color.setHex(0xffffff).multiplyScalar(1.5);
      this.hint('boltHeld', 'Held in its moment, in mid-air. It will crumble in a second.');
    } else if (part === 'tempo') {
      b.slow = true;
      b.orb.mat.color.setHex(GREEN).multiplyScalar(1.5);
    } else if (part === 'rewind') {
      this.sendBack(b, AMBER);
      b.power = 2;
      audio.sfx('rewind');
      this.hint('boltBack', 'Back where it came from. Straight at him.');
    }
  }

  /** A bolt turned round, homing on him. */
  sendBack(b, color) {
    b.held = 0;
    b.back = true;
    b.vx = (Math.sign(this.x - b.x) || 1) * Math.max(4, Math.abs(b.vx)) * 1.6;
    b.vz = (this.z - b.z) * 1.5;
    b.orb.mat.color.setHex(color).multiplyScalar(1.6);
  }

  /** The wrench, swung just as a bolt reaches her (or at one held in mid-air): knocked back at him. */
  batBolts(x, y, z) {
    const g = this.game;
    let any = false;
    for (const b of this.bolts) {
      if (b.dead || b.back || Math.abs(b.x - x) > 1.3 || Math.abs(b.z - z) > 1.1 || Math.abs(FY + BOLT.y - y) > 1.2) continue;
      this.sendBack(b, GOLD);
      g.fx.spawn('flash', b.x, FY + BOLT.y, b.z, { size: 0.8, grow: 2.6, life: 0.16, color: GOLD, glow: 2.6 });
      g.fx.spawn('ring', b.x, FY + BOLT.y, b.z, { size: 0.3, grow: 5, life: 0.22, color: GOLD, glow: 2.4 });
      g.fx.scatter('shard', b.x, FY + BOLT.y, b.z, 6, { size: 0.2, speed: 3.5, life: 0.35, color: GOLD, glow: 2.2 });
      any = true;
    }
    if (!any) return false;
    audio.sfx('parry');
    g.hitStop = Math.max(g.hitStop, 0.06);
    g.renderer.shake = Math.max(g.renderer.shake || 0, 0.25);
    this.hint('batted', 'Knocked straight back at him!');
    return true;
  }

  /** His own bolt, back into him: it goes through his guard, and shatters it (the Hairspring's hits harder). */
  struckByBolt(o) {
    if (this.squirrelsLeft) return this.deflect();
    if (this.open) return this.damage(2, 'His own bolt, straight back at him!');
    this.shatterGuard();
    if (this.damage(o.power || 1, 'His own bolt shatters his guard!')) return;
    // knocked down out of whatever he was doing, winded, his guard gone
    for (const w of this.warns) w.mesh.parent?.remove(w.mesh);
    this.warns = [];
    this.queue = [];
    this.state = 'tired';
    this.t = 3;
    this.hint('broken', `His guard is broken, and he's down! Hit him: your wrench (${key('X', 'Attack')}), or a wave.`);
  }

  shatterGuard() {
    const g = this.game, y = this.y + 1.05;
    audio.sfx('crush');
    g.renderer.shake = 0.6;
    g.fx.spawn('flash', this.x, y, this.z + 0.4, { size: 1.6, grow: 2.2, life: 0.2, color: GOLD, glow: 2.6 });
    g.fx.spawn('ring', this.x, y, this.z + 0.4, { size: 2.2, grow: 2.4, life: 0.35, color: GOLD, glow: 2.4 });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      g.fx.spawn('shard', this.x + Math.cos(a) * 1.15, y + Math.sin(a) * 1.15, this.z + 0.4, { size: 0.3, life: 0.7, color: GOLD, glow: 2.4, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 + 2, gravity: 10, spin: 12 });
    }
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
    if (!this.active || this.state === 'down') return;
    if (this.batBolts(x, y, z)) return;
    if (this.hitCd > 0) return;
    if (Math.abs(x - this.x) > 1.25 || Math.abs(z - this.z) > 2.2 || y < this.y - 0.8 || y > this.y + 2.4) return;
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
    g.bursts.emit(this.x, this.y + 1.2, this.z, 16, { color: [GOLD, 0xffffff], speed: 4, life: 0.4 });
    g.fx.spawn('ring', this.x, this.y + 1.2, this.z + 0.3, { size: 1.6, grow: 1.5, life: 0.25, color: GOLD, glow: 2.2 });
    if (this.squirrelsLeft) this.hint('guardSquirrels', `His guard holds while he is rubbing out Zach and Megan. Hold them in their moment first: the <b>Stasis ring</b> (${key('T', 'wrench chip')}), hold ${key('X', 'Attack')} and let go.`);
    else this.hint('guard', `It breaks on his guard. Wait for him to tire (he stumbles and sinks to the floor), or knock one of his bolts back into him: swing your wrench (${key('X', 'Attack')}) just as it reaches you. His own bolt shatters his guard.`);
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
    g.hitStop = Math.max(g.hitStop, 0.08);
    g.renderer.shake = 0.45;
    g.bursts.emit(this.x, this.y + 1.1, this.z, 30, { color: [GOLD, 0xffffff, COLD], speed: 5, life: 0.6 });
    g.fx.spawn('flash', this.x, this.y + 1.3, this.z + 0.4, { size: 1.2, grow: 2.5, life: 0.18, glow: 2.4 });
    g.fx.scatter('shard', this.x, this.y + 1.3, this.z + 0.4, 8, { size: 0.3, speed: 4, life: 0.5, color: GOLD, glow: 2.2, gravity: 8 });
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

  /** What he does next: one pattern, then he stumbles out of a blink in front of her, winded. */
  plan() {
    const p = this.phase, far = this.farStation();
    const W = (t) => ({ do: 'wait', t });
    const aimed = { do: 'bolt', kind: 'aimed' }, three = { do: 'bolt', kind: 'three' }, fan = { do: 'bolt', kind: 'fan' };
    const rest = (t) => [W(0.3), { do: 'blink', near: true }, { do: 'tired', t }];
    this.cycle++;
    if (p === 1) return [{ do: 'blink', x: far }, W(0.4), aimed, W(1.2), three, W(1.5), ...rest(3.4)];
    if (p === 2) {
      if (this.cycle % 2) return [{ do: 'blink', x: far }, { do: 'rift' }, W(0.5), aimed, W(1.1), three, W(1.6), ...rest(3.0)];
      return [{ do: 'blink', x: far }, three, W(1.3), { do: 'rift' }, W(0.4), three, W(1.6), ...rest(3.0)];
    }
    if (this.cycle % 2 === 0 && !this.squirrelsLeft) return [{ do: 'blink', x: STATIONS[2] }, { do: 'page' }, W(1.5), aimed, W(1.4), ...rest(2.8)];
    return [{ do: 'blink', x: far }, fan, W(1.3), aimed, W(0.9), { do: 'rift' }, W(0.4), three, W(1.6), ...rest(2.8)];
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
    const pace = (this.phase === 3 ? 1.15 : 1) * (this.slowT > 0 ? 0.4 : 1);
    this.slowT = Math.max(0, this.slowT - dt);
    const fight = ctl || this.frozenT > 0;
    if (fight && this.state !== 'down') this.think(dt * pace);
    this.updateShots(dt, fight);
    this.updateRifts(dt, fight);
    if (fight && this.active && g.player.body.y < FY - 2.2) this.fell();
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
          this.t = 2.4;
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
        this.game.bursts.emit(this.x, this.y + 1.4, this.z, 30, { color: [AMBER, 0xffffff], speed: 3, life: 0.8 });
        this.game.hud.toast('<b>Donald Eugene:</b> "Undone."', 2200);
        return this.nextPattern(0.5);
      case 'blink':
        if (this.t > 0) return;
        this.x = this.blinkTo.x;
        this.z = this.blinkTo.z;
        this.burst(COLD, 30);
        this.game.fx.spawn('ring', this.x, this.y + 1.2, this.z + 0.3, { size: 0.6, grow: 4, life: 0.3, color: COLD, glow: 2.4 });
        audio.sfx('shift', { era: M });
        this.state = 'busy';
        return;
      case 'boltUp':
        // lining up with her, for a shot down her line
        if (this.volley.kind === 'aimed') {
          this.z += (clampZ(this.game.player.body.z) - this.z) * Math.min(1, dt * 3);
          for (const w of this.warns) w.mesh.position.z = this.z;
          this.volley.lanes[0] = this.z;
        }
        if (this.t > 0) return;
        this.fireVolley();
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
      this.t = 0.35;
      if (a.near) {
        // out of the blink, a few steps from her (on whichever side there's room), and winded
        const b = g.player.body, side = b.x > X1 - 3.5 ? -1 : 1;
        this.blinkTo = { x: Math.max(X0 + 1, Math.min(X1 - 0.5, b.x + side * 2.6)), z: clampZ(b.z) };
      } else this.blinkTo = { x: a.x, z: CZ };
    } else if (a.do === 'bolt') this.windUp(a.kind);
    else if (a.do === 'rift') this.rewriteFloor();
    else if (a.do === 'page') {
      this.state = 'pageUp';
      this.t = 1.6;
      audio.sfx('glitch');
      this.hint('page', `He's turning the whole page! A wall of rewritten time, from wall to wall: light your <b>Lantern</b> (${key('R', 'Lantern')}). Its old light keeps you in your own moment.`);
      g.hud.toast('<b>Donald Eugene:</b> "Every page, turned back!"', 2200);
    } else if (a.do === 'tired') {
      this.state = 'tired';
      this.t = a.t;
      g.fx.scatter('flash', this.x, this.y + 1.6, this.z, 6, { size: 0.2, speed: 1.5, life: 0.6, color: GOLD, glow: 2.4 });
      this.hint('tired', `He's winded, and his guard is down! Now: your wrench (${key('X', 'Attack')}), or a wave.`);
    }
  }

  burst(color, n) {
    this.game.bursts.emit(this.x, this.y + 1, this.z, n, { color: [color, 0xffffff], speed: 3.5, life: 0.6 });
  }

  // ------------------------------------------------------------------ his bolts
  /**
   * A volley, wound up where you can see it: the cold light gathers in his hand, and a line of it
   * runs along the floor down every lane a bolt will take. aimed: one, down her line (he lines up
   * with her first); three: three of the five lanes at once; fan: five spreading from his hand,
   * with one gap.
   */
  windUp(kind) {
    const g = this.game, pz = g.player.body.z;
    let lanes;
    if (kind === 'aimed') lanes = [this.z];
    else {
      const near = LANES.reduce((a, l) => (Math.abs(l - pz) < Math.abs(a - pz) ? l : a));
      const others = LANES.filter((l) => l !== near).sort(() => Math.random() - 0.5);
      lanes = kind === 'three' ? [near, others[0], others[1]] : LANES.filter((l) => l !== others[0]);
    }
    this.volley = { kind, lanes };
    this.state = 'boltUp';
    this.t = BOLT.windup[this.phase];
    audio.sfx('tick');
    const dir = this.face, grp = g.world.groups[M];
    const reach = Math.max(4, Math.abs(g.player.body.x - this.x)), run = Math.max(2, dir < 0 ? this.x - ARENA.x0 : ARENA.x1 + 1 - this.x);
    for (const lane of lanes) {
      const z = kind === 'fan' ? this.z : lane;
      const len = kind === 'fan' ? Math.min(run, Math.hypot(run, ((lane - this.z) * run) / reach)) : run;
      const geo = new THREE.PlaneGeometry(len, 0.16).rotateX(-Math.PI / 2).translate(len / 2, 0, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(BOLT_C).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      mesh.position.set(this.x, FY + 0.03, z);
      // (pointing her way; a fan's lines splay out from under his hand)
      mesh.rotation.y = (dir < 0 ? Math.PI : 0) - (kind === 'fan' ? Math.atan2(lane - this.z, reach) * dir : 0);
      grp.add(mesh);
      this.warns.push({ mesh, t: 0, life: this.t });
      // and where each will come from: a ring of cold light opening beside him
      if (kind === 'three') g.fx.spawn('ring', this.x + dir * 0.9, FY + BOLT.y, z, { size: 0.2, grow: 4, life: this.t, color: COLD, glow: 2.2, fade: 'in', spin: 3 });
    }
    const h = () => (this.state === 'boltUp' ? this.hand() : null);
    g.fx.spawn('orb', 0, 0, 0, { size: 0.3, grow: 3.4, life: this.t, color: BOLT_C, glow: 2, fade: 'in', spin: 5, follow: h });
    g.fx.spawn('glow', 0, 0, 0, { size: 0.6, grow: 3, life: this.t, color: BOLT_C, glow: 1.5, fade: 'in', follow: h });
    this.hint('bolts', `Stasis bolts! A line of light on the floor shows where each one will go. Step up or down out of its line (${key('W', '↑')} / ${key('S', '↓')}), or roll through it (${key('C', 'Roll')}).`);
  }

  fireVolley() {
    const g = this.game, v = this.volley, dir = this.face, sp = BOLT.speed[this.phase], hp = this.hand();
    for (const w of this.warns) w.mesh.parent?.remove(w.mesh);
    this.warns = [];
    const reach = Math.max(4, Math.abs(g.player.body.x - this.x));
    for (const lane of v.lanes) {
      const b = { x: this.x + dir * 0.9, z: v.kind === 'fan' ? this.z : lane, vx: dir * sp, vz: 0, held: 0, slow: false, back: false, dead: false };
      if (v.kind === 'fan') b.vz = ((lane - this.z) * sp) / reach;
      const follow = () => (b.dead ? null : { x: b.x, y: FY + BOLT.y, z: b.z });
      b.orb = g.fx.spawn('orb', b.x, FY + BOLT.y, b.z, { size: 1.05, life: 1e9, fade: 'none', color: BOLT_C, glow: 2, spin: 7, follow });
      g.fx.spawn('glow', b.x, FY + BOLT.y, b.z, { size: 1.7, life: 1e9, fade: 'none', color: BOLT_C, glow: 1.3, follow });
      // (and its light on the floor under it, so you can see which line it's on)
      b.pool = new THREE.Mesh(this.glowGeo, new THREE.MeshBasicMaterial({ map: CARDS.glow, color: new THREE.Color(BOLT_C).multiplyScalar(1.2), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      b.pool.scale.setScalar(1.3);
      b.pool.position.set(b.x, FY + 0.03, b.z);
      g.world.groups[M].add(b.pool);
      this.bolts.push(b);
    }
    g.fx.spawn('flash', hp.x, hp.y, hp.z, { size: 0.6, grow: 2.6, life: 0.18, color: COLD, glow: 2.6 });
    g.fx.spawn('ring', hp.x, hp.y, hp.z, { size: 0.3, grow: 5, life: 0.25, color: COLD, glow: 2.2 });
    audio.sfx('bolt');
  }

  dropBolt(b, burst = false) {
    b.dead = true;
    b.pool?.parent?.remove(b.pool);
    b.pool?.material.dispose();
    if (!burst) return;
    const g = this.game;
    g.fx.spawn('flash', b.x, FY + BOLT.y, b.z, { size: 0.6, grow: 2, life: 0.15, color: COLD, glow: 2.2 });
    g.fx.scatter('shard', b.x, FY + BOLT.y, b.z, 8, { size: 0.2, speed: 3, life: 0.45, color: COLD, glow: 2.2, gravity: 8 });
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
    for (const w of this.warns) {
      if (fight) w.t += dt;
      const k = Math.min(1, w.t / w.life);
      w.mesh.material.opacity = (0.25 + k * 0.6) * (0.6 + 0.4 * (Math.floor(w.t * 14) % 2));
    }
    const slow = this.slowT > 0 ? 0.5 : 1;
    for (const o of this.bolts) {
      if (o.dead) continue;
      o.pool.position.set(o.x, FY + 0.03, o.z);
      if (o.held > 0) {
        o.held -= dt;
        if (o.held <= 0) this.dropBolt(o, true);
        continue;
      }
      if (!fight) continue;
      const k = (o.slow ? 0.3 : 1) * (o.back ? 1 : slow);
      o.x += o.vx * k * dt;
      o.z += o.vz * k * dt;
      if (o.z < Z0 || o.z > Z1) {
        o.z = clampZ(o.z);
        o.vz = 0;
      }
      if (Math.random() < 0.6) g.fx.spawn('shard', o.x - Math.sign(o.vx) * 0.3, FY + BOLT.y + (Math.random() - 0.5) * 0.4, o.z, { size: 0.18, life: 0.3, color: o.back ? AMBER : o.slow ? GREEN : BOLT_C, glow: 2, vx: -o.vx * 0.15, spin: 10 });
      if (o.x < X0 - 1.5 || o.x > ARENA.x1) {
        this.dropBolt(o, true);
        if (!o.back) this.hint('bat', `Next time, swing your wrench (${key('X', 'Attack')}) just as a bolt reaches you: you'll knock it back at him, and his own bolt shatters his guard.`);
        continue;
      }
      if (o.back) {
        // sent back: it finds him, guard or no (unless he's drawing on the squirrels)
        if (Math.abs(o.x - this.x) < 0.8 && this.state !== 'down') {
          this.dropBolt(o, true);
          this.struckByBolt(o);
        }
        continue;
      }
      // her: within reach of it, at its height (a roll gets under it, and so does a good jump)
      const near = Math.hypot(o.x - b.x, (o.z - b.z) * 1.1) < BOLT.r + 0.3;
      if (near && b.y < FY + BOLT.y + 0.3 && b.y + b.h > FY + BOLT.y - 0.3 && p.state !== 'roll') {
        if (this.catchPlayer(o.x)) this.dropBolt(o, true);
      }
    }
    this.bolts = this.bolts.filter((o) => !o.dead);

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
        } else this.catchPlayer(pg.x);
      }
      if (pg.x < X0 - 2) {
        pg.mesh.parent?.remove(pg.mesh);
        this.page = null;
      }
    }
  }

  /** Caught by one of his bolts (or the page): a heart, and frozen in place for a moment. */
  catchPlayer(fromX) {
    const p = this.game.player;
    if (p.invuln > 0 || this.game.mode !== 'play' || this.game.godMode) return false;
    const hp0 = p.hp;
    p.hurt(1, fromX, { force: 3, ignoreRoll: true });
    if (p.hp === hp0) return false;
    p.invuln = 1.6;
    if (p.hp <= 0) return true;
    this.frozenT = 0.6;
    crystal(p.actor, true);
    this.game.fx.scatter('shard', p.body.x, p.body.y + 0.9, p.body.z, 10, { size: 0.25, speed: 3.5, life: 0.5, color: COLD, glow: 2.4, gravity: 8 });
    this.hint('frozen', `Frozen! Tap ${key('X', 'Attack')} or ${key('Space', 'Jump')} to break out sooner.`);
    return true;
  }

  updateFreeze(dt) {
    if (!(this.frozenT > 0)) return;
    const p = this.game.player;
    if (input.hit('attack') || input.hit('jump')) {
      this.frozenT -= 0.2;
      this.game.bursts.emit(p.body.x, p.body.y + 0.9, p.body.z, 6, { color: [COLD, 0xffffff], speed: 2.5, life: 0.4 });
    }
    this.frozenT -= dt;
    if (this.frozenT <= 0) {
      this.frozenT = 0;
      crystal(p.actor, false);
      audio.sfx('snap');
    }
  }

  // ------------------------------------------------------------------ the floor, rewritten
  /**
   * Two stretches of floor (three in phase three), one of them where she's standing: gold cracks
   * first, then it falls away into the dark, and later he winds it back into place. Never two
   * side by side, and never under the squirrels: there is always floor to get to.
   */
  rewriteFloor() {
    const n = this.phase === 3 ? 3 : 2, px = this.game.player.body.x;
    const strips = [];
    for (let x = X0; x + RIFT.w <= X1 + 1; x += RIFT.w) strips.push(x);
    const avoid = (x) => this.rifts.some((r) => Math.abs(r.x0 - x) < RIFT.w * 2) || (this.phase === 3 && x < 43 && x + RIFT.w > 39.5);
    const hers = strips.find((x) => px >= x && px < x + RIFT.w);
    const picked = hers !== undefined && !avoid(hers) ? [hers] : [];
    const rest = strips.filter((x) => !avoid(x) && !picked.some((q) => Math.abs(q - x) <= RIFT.w));
    while (picked.length < n && rest.length) {
      const x = rest.splice(Math.floor(Math.random() * rest.length), 1)[0];
      if (!picked.some((q) => Math.abs(q - x) <= RIFT.w)) picked.push(x);
    }
    const grp = this.game.world.groups[M];
    for (const x0 of picked) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(RIFT.w, DEPTH).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: crackTexture(), color: new THREE.Color(GOLD).multiplyScalar(2.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      crack.position.set(x0 + RIFT.w / 2, FY + 0.04, CZ);
      grp.add(crack);
      this.rifts.push({ x0, x1: x0 + RIFT.w, t: 0, stage: 'crack', crack, chunks: [] });
    }
    audio.sfx('rumble');
    this.game.renderer.shake = 0.3;
    this.hint('rift', 'He is rewriting the floor! Where the gold cracks spread, it is about to fall away: get off it.');
  }

  /** The cells of a stretch of floor (both layers, the hall's whole depth), in every age. */
  riftCells(r, fn) {
    for (let x = r.x0; x < r.x1; x++) for (let z = ARENA.z0; z <= ARENA.z1; z++) for (const y of [FY - 1, FY - 2]) for (let era = 0; era < 3; era++) fn(era, x, y, z);
  }

  openRift(r) {
    const g = this.game, grp = g.world.groups[M];
    r.stage = 'open';
    this.riftCells(r, (era, x, y, z) => g.world.setDyn(era, x, y, z, 0));
    r.crack.parent?.remove(r.crack);
    const mat = new THREE.ShaderMaterial({ ...VOID, uniforms: THREE.UniformsUtils.clone(VOID.uniforms) });
    mat.uniforms.x0.value = r.x0;
    mat.uniforms.x1.value = r.x1;
    r.void = new THREE.Mesh(new THREE.BoxGeometry(RIFT.w + 0.04, 2.06, DEPTH + 0.04), mat);
    r.void.position.set(r.x0 + RIFT.w / 2, FY - 0.995, CZ);
    grp.add(r.void);
    // the floor itself, in pieces, tumbling down into it
    for (let x = r.x0; x < r.x1; x++)
      for (let z = ARENA.z0; z <= ARENA.z1; z++) {
        const mesh = new THREE.Mesh(this.chunkGeo, this.chunkMats[Math.floor(Math.random() * MARBLE.length)]);
        const home = new THREE.Vector3(x + 0.5, FY - 0.5, z + 0.5);
        mesh.position.copy(home);
        grp.add(mesh);
        r.chunks.push({ mesh, home, vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, -0.5 - Math.random() * 2.5, (Math.random() - 0.5) * 1.5), spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(7), delay: Math.random() * 0.25 });
      }
    audio.sfx('crumble');
    g.renderer.shake = 0.6;
    g.bursts.emit(r.x0 + RIFT.w / 2, FY + 0.2, CZ, 40, { color: [GOLD, 0x8a8094, 0xfff2c0], speed: 4, life: 0.7, gravity: 5, spread: 1.6 });
  }

  mendRift(r) {
    r.stage = 'mend';
    r.mendAt = r.t;
    for (const c of r.chunks) {
      if (!c.mesh.visible) c.mesh.position.set(c.home.x + (Math.random() - 0.5) * 3, FY - 9 - Math.random() * 4, c.home.z + (Math.random() - 0.5) * 2);
      c.mesh.visible = true;
      c.from = c.mesh.position.clone();
      c.rot0 = c.mesh.rotation.clone();
    }
    audio.sfx('restore');
  }

  closeRift(r, now = false) {
    const g = this.game;
    r.done = true;
    if (r.stage !== 'crack') this.riftCells(r, (era, x, y, z) => g.world.clearDyn(era, x, y, z));
    r.crack?.parent?.remove(r.crack);
    r.crack?.material.map?.dispose();
    r.void?.parent?.remove(r.void);
    r.void?.material.dispose();
    for (const c of r.chunks) c.mesh.parent?.remove(c.mesh);
    if (now) return;
    // sealed: a seam of gold light where it was broken
    for (let i = 0; i <= 6; i++) for (const x of [r.x0, r.x1]) g.fx.spawn('glow', x, FY + 0.1, ARENA.z0 + (i / 6) * DEPTH, { size: 0.7, life: 0.5, color: GOLD, glow: 2.2 });
    g.bursts.emit(r.x0 + RIFT.w / 2, FY + 0.1, CZ, 20, { color: [GOLD, 0xffffff], speed: 2.5, life: 0.5, spread: 1.6 });
  }

  updateRifts(dt, fight) {
    const g = this.game, b = g.player.body;
    for (const r of this.rifts) {
      if (r.done) continue;
      if (fight) r.t += dt;
      if (r.stage === 'crack') {
        const k = Math.min(1, r.t / RIFT.warn);
        r.crack.material.opacity = Math.min(1, k * 1.3) * (0.55 + 0.45 * (Math.floor(r.t * (6 + k * 16)) % 2));
        if (fight && Math.random() < dt * (8 + k * 30)) g.bursts.emit(r.x0 + Math.random() * RIFT.w, FY + 0.05, ARENA.z0 + Math.random() * DEPTH, 1, { color: [GOLD, 0x9a90a8], speed: 1 + k * 2.5, life: 0.4, gravity: 7, glow: 1.6 });
        if (r.t >= RIFT.warn) this.openRift(r);
      } else if (r.stage === 'open') {
        r.void.material.uniforms.time.value = g.time;
        for (const c of r.chunks) {
          if (!c.mesh.visible) continue;
          if ((c.delay -= dt) > 0) continue;
          c.vel.y -= 16 * dt;
          c.mesh.position.addScaledVector(c.vel, dt);
          c.mesh.rotation.x += c.spin.x * dt;
          c.mesh.rotation.y += c.spin.y * dt;
          c.mesh.rotation.z += c.spin.z * dt;
          if (c.mesh.position.y < FY - 16) c.mesh.visible = false;
        }
        // (never back into place around her, while she's dropping through)
        const inside = b.x > r.x0 - 0.35 && b.x < r.x1 + 0.35 && b.y < FY - 0.05;
        if (r.t >= RIFT.warn + RIFT.open && !inside) this.mendRift(r);
      } else if (r.stage === 'mend') {
        r.void.material.uniforms.time.value = g.time;
        const k = Math.min(1, (r.t - r.mendAt) / RIFT.mend), e = 1 - (1 - k) ** 3;
        for (const c of r.chunks) {
          c.mesh.position.lerpVectors(c.from, c.home, e);
          c.mesh.rotation.set(c.rot0.x * (1 - e), c.rot0.y * (1 - e), c.rot0.z * (1 - e));
          if (Math.random() < dt * 5) g.fx.spawn('glow', c.mesh.position.x, c.mesh.position.y, c.mesh.position.z + 0.5, { size: 0.5, life: 0.3, color: AMBER, glow: 2 });
        }
        if (k >= 1) this.closeRift(r);
      }
    }
    this.rifts = this.rifts.filter((r) => !r.done);
  }

  /** Down through the floor he rewrote: the End of Time hands her back, a little worse for it. */
  fell() {
    const g = this.game, p = g.player, b = p.body;
    let best = null;
    for (let x = X0 + 0.5; x <= X1; x += 0.5) {
      if (this.rifts.some((r) => r.stage !== 'crack' && x > r.x0 - 0.6 && x < r.x1 + 0.6)) continue;
      if (best === null || Math.abs(x - b.x) < Math.abs(best - b.x)) best = x;
    }
    p.place(best ?? ARENA.startX, FY, clampZ(b.z));
    audio.sfx('rewind');
    g.fx.spawn('dial', p.body.x, FY + 1, p.body.z + 0.3, { size: 0.8, grow: 2.5, life: 0.6, color: AMBER, glow: 2.2, rot: 0, fade: 'inout' });
    g.fx.spawn('hand', p.body.x, FY + 1, p.body.z + 0.3, { size: 0.8, grow: 2.5, life: 0.6, glow: 2.2, rot: 0, spin: 14, fade: 'inout' });
    this.hint('fell', 'Down into the dark under the End of Time, and back out of it. Watch for gold cracks in the floor, and get off them before it falls.');
    if (g.godMode) return;
    p.hp = Math.max(0, p.hp - 1);
    p.invuln = 1.6;
    audio.sfx('hurt');
    g.hud.setHearts(p.hp, p.maxHp);
    if (p.hp <= 0) g.onDeath();
  }

  // ------------------------------------------------------------------ how he looks
  draw(dt) {
    const g = this.game, a = this.don;
    this.hover += dt;
    const grounded = ['tired', 'stunned', 'down', 'wind'].includes(this.state);
    const want = grounded ? FY : FY + 0.7 + Math.sin(this.hover * 2.2) * 0.15;
    this.y += (want - this.y) * Math.min(1, dt * 6);
    a.flip = this.face < 0;
    a.play(this.state === 'down' ? 'hurt' : this.state === 'boltUp' || this.state === 'pageUp' || this.state === 'wind' ? 'talk' : 'idle');
    a.update(this.state === 'stunned' ? 0 : dt);
    a.mesh.position.set(this.x, this.y - 0.1, this.z);
    a.mesh.quaternion.copy(g.renderer.billboardQ);
    a.mesh.visible = this.state !== 'blink' || this.t > 0.2 || Math.floor(this.t * 30) % 2 === 0;
    if (!a.mat.userData.preCrystal && !a.mat.userData.preGlow) {
      // tired: gold cracks glowing through him; hit: a white flash; winding up: cold light
      const tired = this.state === 'tired';
      a.mat.emissive.setHex(this.flash > 0 ? 0xffffff : tired ? GOLD : this.state === 'boltUp' ? COLD : 0x000000);
      a.mat.emissiveIntensity = this.flash > 0 ? 1.2 : tired ? 0.4 + Math.sin(g.time * 8) * 0.2 : this.state === 'boltUp' ? 0.7 : 0;
    }
    if (this.state === 'tired' && Math.random() < dt * 8) g.bursts.emit(this.x, this.y + 1.6, this.z, 1, { color: [GOLD, 0xffffff], speed: 0.8, life: 0.6, gravity: -1 });
    this.guard.visible = !this.open && this.state !== 'down';
    this.guard.position.set(this.x, this.y + 1.05, this.z);
    this.guard.quaternion.copy(g.renderer.billboardQ);
    this.guard.material.opacity = (this.squirrelsLeft ? 0.85 : 0.6) + Math.sin(g.time * 5) * 0.12;
    this.clock.visible = this.state === 'wind';
    if (this.clock.visible) {
      this.clock.position.set(this.x, this.y + 2.6, this.z);
      this.clock.quaternion.copy(g.renderer.billboardQ);
      this.clockHand.rotation.z = (this.t / 2.4) * Math.PI * 2; // backward, toward twelve
    }
    if (this.bar) this.bar.classList.toggle('guarded', !this.open);
  }
}
