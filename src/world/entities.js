// Game entities: player, NPCs, enemies, the Warden, pushables, pickups, interactables, shrines.
import * as THREE from 'three';
import { input } from '../core/input.js';
import { clamp, damp, ERA } from '../core/util.js';
import { audio } from '../audio/audio.js';
import { moveBody, overlapsType, hits } from './physics.js';
import { T } from './world.js';
import { getSheets, SpriteActor, iconTexture } from '../render/sprites.js';
import { ITEMS } from '../story.js';

const GRAV = 28;

// shared blob-shadow
const shadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function makeShadow(size) {
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.scale.setScalar(size);
  m.renderOrder = 1;
  return m;
}
function groundBelow(world, era, x, y, z) {
  for (let yy = Math.floor(y + 0.01) - 1; yy > y - 8; yy--) if (world.cell(era, Math.floor(x), yy, Math.floor(z)) === T.SOLID) return yy + 1;
  return -99;
}

// ---------------------------------------------------------------------------
export class Player {
  constructor(game) {
    this.game = game;
    this.body = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, hw: 0.28, hd: 0.22, h: 1.45, onGround: false };
    this.actor = new SpriteActor(getSheets().vivienne, 2.1);
    this.mesh = this.actor.mesh;
    this.shadow = makeShadow(1.0);
    game.scene.add(this.mesh, this.shadow);
    this.facing = 1;
    this.state = 'normal';
    this.stateT = 0;
    this.maxHp = 5;
    this.hp = 5;
    this.invuln = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.rollCd = 0;
    this.swimCd = 0;
    this.pushT = 0;
    this.pushDir = null;
    this.attackDone = false;
    this.lastSafe = null;
    this.stepT = 0;
    this.wasGround = true;
    this.jumpCut = false;
    this.pushing = false;
  }

  place(x, y, z) {
    Object.assign(this.body, { x, y, z, vx: 0, vy: 0, vz: 0 });
    this.state = 'normal';
  }

  hurt(n, fromX, { force = 6, ignoreRoll = false } = {}) {
    if (this.invuln > 0 || this.game.godMode) return;
    if (this.game.dialogue.active || this.game.mode !== 'play' || this.game.lockT > 0) return; // never mid-conversation
    if (this.game.shiftGrace > 0) return; // just arrived in another era
    if (this.state === 'roll' && !ignoreRoll) return;
    this.hp = Math.max(0, this.hp - n);
    this.invuln = 1.1;
    if (document.body.classList.contains('touch')) try { navigator.vibrate?.(60); } catch { /* not allowed */ }
    const s = Math.sign(this.body.x - fromX) || -this.facing;
    this.body.vx = s * force;
    this.body.vy = 5;
    this.state = 'hurt';
    this.stateT = 0;
    audio.sfx('hurt');
    this.game.renderer.shake = 0.6;
    this.game.post.grade.uniforms.hurt.value = 1;
    this.game.hud.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) this.game.onDeath();
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.game.hud.setHearts(this.hp, this.maxHp);
  }

  update(dt) {
    const g = this.game, b = this.body, world = g.world, era = g.era;
    const canAct = g.controlsEnabled();
    this.invuln = Math.max(0, this.invuln - dt);
    this.rollCd = Math.max(0, this.rollCd - dt);
    this.swimCd = Math.max(0, this.swimCd - dt);
    this.stateT += dt;

    let ix = 0, iz = 0;
    if (canAct) {
      ix = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      iz = (input.held('down') ? 1 : 0) - (input.held('up') ? 1 : 0);
      // touch joystick gives proportional movement
      if (Math.hypot(input.axis.x, input.axis.z) > 0.15) {
        ix = input.axis.x;
        iz = input.axis.z;
      }
    }
    if (Math.abs(ix) > 0.2) this.facing = Math.sign(ix);

    const onLadder = overlapsType(world, era, b, T.LADDER, 0.15, 0.75);
    const inWater = overlapsType(world, era, b, T.WATER, 0.25, 0.65);
    if (inWater && !this.wasWater) {
      audio.sfx('splash');
      g.bursts.emit(b.x, b.y + 0.8, b.z, 14, { color: [0x9fe0ff, 0xffffff], speed: 3, life: 0.5, glow: 1.2 });
      if (!g.state.flags.swimHint) {
        g.state.flags.swimHint = true;
        g.hud.toast(`Clean water: you can swim here. ${document.body.classList.contains('touch') ? 'Hold <b>Jump</b>' : 'Hold <kbd>Space</kbd>'} to rise, let go to sink.`, 5000);
      }
    }
    this.wasWater = inWater;

    if (canAct) {
      if (input.hit('jump')) this.jumpBuf = 0.14;
    }
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.coyote = b.onGround ? 0.1 : Math.max(0, this.coyote - dt);

    // ----- state machine -----
    if (this.state === 'hurt') {
      b.vy -= GRAV * dt;
      b.vx = damp(b.vx, 0, 4, dt);
      b.vz = damp(b.vz, 0, 4, dt);
      if (this.stateT > 0.35) this.state = 'normal';
    } else if (this.state === 'roll') {
      b.vy -= GRAV * dt;
      if (this.stateT > 0.42) {
        this.state = 'normal';
        b.h = 1.45;
      }
    } else if (this.state === 'climb') {
      if (!onLadder) {
        this.state = 'normal';
        if (input.held('up')) b.vy = 5.5;
      } else {
        b.vy = input.held('up') ? 3.2 : input.held('down') ? -3.2 : 0;
        b.vx = ix * 2.2;
        b.vz = 0;
        if (canAct && this.jumpBuf > 0) {
          this.jumpBuf = 0;
          this.state = 'normal';
          b.vy = 7;
          b.vx = this.facing * 3;
          audio.sfx('jump');
        }
        if (b.onGround && input.held('down')) this.state = 'normal';
      }
    } else {
      // normal / attack
      const attacking = this.state === 'attack';
      const sprint = canAct && input.held('sprint') && !inWater;
      let speed = sprint ? 7.0 : 4.6;
      if (inWater) speed *= 0.6;
      if (attacking) speed *= 0.35;
      const accel = b.onGround ? 20 : 9;
      b.vx = damp(b.vx, ix * speed, accel, dt);
      b.vz = damp(b.vz, iz * speed * 0.85, accel, dt);

      if (inWater) {
        b.vy -= 7 * dt;
        b.vy = Math.max(b.vy, -2.4);
        if (canAct && input.held('jump') && this.swimCd <= 0) {
          b.vy = 4.6;
          this.swimCd = 0.32;
          audio.sfx('splash');
        }
      } else {
        b.vy -= GRAV * dt;
        if (this.jumpBuf > 0 && this.coyote > 0) {
          b.vy = 9.7;
          this.jumpBuf = 0;
          this.coyote = 0;
          this.jumpCut = false;
          audio.sfx('jump');
          g.bursts.emit(b.x, b.y + 0.05, b.z, 6, { color: 0xe8dcc0, speed: 1.5, life: 0.35, gravity: 2, glow: 0.8 });
        }
        if (!input.held('jump') && b.vy > 2 && !this.jumpCut) {
          b.vy *= 0.5;
          this.jumpCut = true;
        }
      }
      b.vy = Math.max(b.vy, -22);

      if (canAct && onLadder && (input.held('up') || (input.held('down') && !b.onGround)) && !attacking) {
        this.state = 'climb';
        this.stateT = 0;
        b.vx = 0;
      }
      if (canAct && input.hit('roll') && this.rollCd <= 0 && b.onGround && !attacking) {
        this.state = 'roll';
        this.stateT = 0;
        this.rollCd = 0.65;
        b.vx = this.facing * 9.5;
        b.vz = iz * 4;
        b.h = 0.8;
        audio.sfx('roll');
      }
      if (canAct && input.hit('attack') && !attacking) {
        this.state = 'attack';
        this.stateT = 0;
        this.attackDone = false;
        this.actor.play('attack', true);
        audio.sfx('swing');
      }
      if (attacking) {
        if (!this.attackDone && this.stateT > 0.07) {
          this.attackDone = true;
          g.playerAttack(b.x + this.facing * 0.85, b.y + 0.7, b.z, this.facing);
        }
        if (this.stateT > 0.3) this.state = 'normal';
      }
    }
    if (this.state === 'roll') {
      b.vx = damp(b.vx, this.facing * 4, 3, dt);
    }

    const prevVy = b.vy;
    moveBody(world, era, b, dt);
    if (this.state === 'roll' && this.stateT > 0.42 && hits(world, era, { ...b, h: 1.45 })) this.stateT = 0.3; // stay low under ceilings

    // landing
    if (b.onGround && !this.wasGround && prevVy < -6) {
      audio.sfx('land');
      g.bursts.emit(b.x, b.y + 0.05, b.z, 8, { color: 0xe8dcc0, speed: 1.8, life: 0.4, gravity: 2, glow: 0.7 });
    }
    this.wasGround = b.onGround;

    // footsteps
    if (b.onGround && (Math.abs(b.vx) + Math.abs(b.vz)) > 1 && this.state === 'normal') {
      this.stepT -= dt * (Math.abs(b.vx) + Math.abs(b.vz)) * 0.5;
      if (this.stepT <= 0) {
        this.stepT = 1;
        audio.sfx('step');
      }
    }

    // pushing
    this.pushing = false;
    if (canAct && b.onGround && this.state === 'normal' && (ix || iz)) {
      // whole-cell direction: the touch joystick gives analog values like 0.83, which made
      // the push direction (and its timer) change every frame, so blocks never moved
      const dir = ix && b.hitX ? [Math.sign(ix), 0] : iz && b.hitZ ? [0, Math.sign(iz)] : null;
      if (dir) {
        const key = dir.join(',');
        if (this.pushDir !== key) {
          this.pushDir = key;
          this.pushT = 0;
        }
        this.pushT += dt;
        this.pushing = g.tryPushFrom(b, dir, this.pushT);
        if (this.pushing && this.pushT > 0.2) this.pushT = 0;
      } else this.pushT = 0;
    } else this.pushT = 0;

    // hazards
    const inHazard = overlapsType(world, era, b, T.HAZARD, 0, 0.4);
    if (inHazard || b.y < -7) g.onHazard();

    // safe spot tracking
    // (never on a hazard's bed: you could land there before the respawn kicks in)
    // the last solid footing at all (narrow log rafts never pass the "safe" test below)
    const machine = g.unsafeSpot?.(b.x, b.y); // never remember a spot under a hammer or on a lift
    if (b.onGround && !inWater && !inHazard && !g.respawning && !machine && world.cell(era, Math.floor(b.x), Math.floor(b.y + 0.01) - 1, Math.floor(b.z)) === T.SOLID)
      this.lastGround = { x: b.x, y: b.y, z: b.z, era };
    if (b.onGround && this.state !== 'hurt' && !inWater && !inHazard && !g.respawning && !machine) {
      const fy = Math.floor(b.y) - 1;
      const solidAt = (dx, dz) => world.cell(era, Math.floor(b.x + dx), fy, Math.floor(b.z + dz)) === T.SOLID;
      if (solidAt(0, 0) && solidAt(0.9, 0) && solidAt(-0.9, 0) && solidAt(0, 0.9) && solidAt(0, -0.9)) {
        this.lastSafe = { x: b.x, y: b.y, z: b.z, era };
      }
    }

    // ----- animation -----
    const a = this.actor;
    a.flip = this.facing < 0;
    const moving = Math.abs(b.vx) + Math.abs(b.vz) > 0.6;
    if (this.state === 'hurt') a.play('hurt');
    else if (this.state === 'roll') a.play('roll');
    else if (this.state === 'attack') a.play('attack');
    else if (this.state === 'climb') {
      a.play('climb');
      if (Math.abs(b.vy) < 0.1 && Math.abs(b.vx) < 0.1) a.t = 0;
    } else if (inWater && !b.onGround) a.play('swim');
    else if (!b.onGround) a.play(b.vy > 0 ? 'jump' : 'fall');
    else if (this.pushing) a.play('push');
    else if (moving) a.play(Math.abs(b.vx) > 5.5 || Math.abs(b.vz) > 5 ? 'run' : 'walk');
    else a.play('idle');
    a.update(dt);

    this.mesh.position.set(b.x, b.y - 0.1, b.z);
    this.mesh.quaternion.copy(g.renderer.billboardQ);
    this.mesh.visible = !(this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0);
    const gy = groundBelow(world, era, b.x, b.y + 0.2, b.z);
    this.shadow.visible = gy > -50;
    this.shadow.position.set(b.x, gy + 0.02, b.z);
    this.shadow.scale.setScalar(clamp(1.0 - (b.y - gy) * 0.12, 0.4, 1.0));
  }
}

// ---------------------------------------------------------------------------
class EraEntity {
  constructor(game, spec) {
    this.game = game;
    this.spec = spec;
    this.id = spec.id;
    this.era = spec.era;
    this.x = spec.x;
    this.y = spec.y ?? 0;
    this.z = spec.z;
    this.group = new THREE.Group();
    this.alive = true;
    if (this.era === undefined || this.era === -1) game.scene.add(this.group);
    else game.world.groups[this.era].add(this.group);
  }
  remove() {
    this.alive = false;
    this.group.parent?.remove(this.group);
  }
  active() {
    return this.alive && (this.era === -1 || this.era === undefined || this.era === this.game.era);
  }
  distTo(b) {
    return Math.hypot(b.x - this.x, (b.y + 0.7 - (this.y + 0.7)) * 0.7, (b.z - this.z) * 0.8);
  }
}

export class NPC extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    const sheet = getSheets()[spec.sheet];
    const size = spec.small ? 1.6 : 2.1;
    this.actor = new SpriteActor(sheet, size);
    this.group.add(this.actor.mesh);
    if (spec.holo) {
      this.actor.mat.transparent = true;
      this.actor.mat.opacity = 0.75;
      this.actor.mat.emissive.setHex(0x36f0ff);
      this.actor.mat.emissiveIntensity = 1.4;
      this.actor.mat.color.setHex(0x80e0ff);
      this.actor.mesh.scale.setScalar(1.4);
    } else {
      this.shadow = makeShadow(0.9);
      this.group.add(this.shadow);
    }
    if (spec.tint) this.actor.mat.color.setHex(spec.tint);
    this.facing = 1;
    this.talking = false;
    this.t = Math.random() * 10;
  }
  prompt() {
    return `Talk to ${this.spec.name}`;
  }
  update(dt) {
    const p = this.game.player.body;
    this.t += dt;
    if (Math.abs(p.x - this.x) < 5) this.facing = p.x > this.x ? 1 : -1;
    this.actor.flip = this.facing < 0;
    this.actor.play(this.talking ? 'talk' : 'idle');
    this.actor.update(dt);
    let y = this.y;
    if (this.spec.hover) y += 0.3 + Math.sin(this.t * 2) * 0.15;
    if (this.spec.holo) {
      this.actor.mat.opacity = 0.6 + Math.sin(this.t * 13) * 0.05 + (Math.random() < 0.03 ? -0.3 : 0);
    }
    this.actor.mesh.position.set(this.x, y - 0.1, this.z);
    this.actor.mesh.quaternion.copy(this.game.renderer.billboardQ);
    if (this.shadow) this.shadow.position.set(this.x, this.y + 0.02, this.z);
  }
}

// ---------------------------------------------------------------------------
const ENEMY = {
  thornback: { hp: 2, speed: 1.5, chase: 3.1, hw: 0.5, hd: 0.3, h: 0.7, size: 2.0, sight: 5 },
  rat: { hp: 1, speed: 2.0, chase: 3.8, hw: 0.35, hd: 0.25, h: 0.4, size: 1.6, sight: 5 },
  drone: { hp: 2, speed: 1.8, chase: 3.0, hw: 0.35, hd: 0.35, h: 0.7, size: 1.6, sight: 6, fly: true },
};

export class Enemy extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.hostile = true;
    this.cfg = ENEMY[spec.kind];
    this.hp = this.cfg.hp;
    this.body = { x: spec.x, y: spec.y ?? 0, z: spec.z, vx: 0, vy: 0, vz: 0, hw: this.cfg.hw, hd: this.cfg.hd, h: this.cfg.h };
    this.actor = new SpriteActor(getSheets()[spec.kind], this.cfg.size);
    this.shadow = makeShadow(this.cfg.hw * 2.4);
    this.group.add(this.actor.mesh, this.shadow);
    this.dir = 1;
    this.hurtT = 0;
    this.t = Math.random() * 5;
    this.home = { ...this.body };
  }
  reset() {
    Object.assign(this.body, { x: this.home.x, y: this.home.y, z: this.home.z, vx: 0, vy: 0, vz: 0 });
  }
  damage(n, dir) {
    if (this.hurtT > 0) return;
    this.hp -= n;
    this.hurtT = 0.3;
    this.body.vx = dir * 7;
    this.body.vy = this.cfg.fly ? 0 : 4;
    audio.sfx('hit');
    this.game.bursts.emit(this.body.x, this.body.y + this.cfg.h * 0.6, this.body.z, 10, { color: [0xffffff, 0xffd070], speed: 4, life: 0.3 });
    if (this.hp <= 0) {
      audio.sfx('enemyDie');
      const col = this.spec.kind === 'drone' ? [0x36f0ff, 0xff3fd2] : this.spec.kind === 'rat' ? [0xaaaaaa, 0xffffff] : [0x8ab04a, 0xffd070];
      this.game.bursts.emit(this.body.x, this.body.y + 0.4, this.body.z, 26, { color: col, speed: 4.5, life: 0.7 });
      if (Math.random() < 0.4) this.game.spawnHeart(this.era, this.body.x, this.body.y + 0.4, this.body.z);
      this.remove();
    }
  }
  update(dt) {
    const g = this.game, b = this.body, p = g.player.body, cfg = this.cfg;
    this.t += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    const [r0, r1] = this.spec.range;
    const dx = p.x - b.x, dz = p.z - b.z;
    const sees = Math.abs(dx) < cfg.sight && Math.abs(p.y - b.y) < 2.2 && g.controlsEnabled() && !(g.shiftGrace > 0);
    if (this.hurtT <= 0) {
      if (sees) {
        b.vx = Math.sign(dx) * cfg.chase * (Math.abs(dx) > 0.2 ? 1 : 0);
        b.vz = clamp(dz, -1, 1) * cfg.chase * 0.6;
      } else {
        if (b.x < r0) this.dir = 1;
        if (b.x > r1) this.dir = -1;
        b.vx = this.dir * cfg.speed;
        b.vz = Math.sin(this.t * 0.7) * 0.5;
      }
    } else b.vx = damp(b.vx, 0, 6, dt);
    // keep within a leash
    if (b.x < r0 - 2 && b.vx < 0) b.vx = 0;
    if (b.x > r1 + 2 && b.vx > 0) b.vx = 0;
    if (cfg.fly) {
      const gy = groundBelow(g.world, this.era, b.x, b.y + 3, b.z);
      const target = (gy > -50 ? gy : 0) + 1.1 + Math.sin(this.t * 3) * 0.2;
      b.vy = (target - b.y) * 4;
    } else b.vy -= GRAV * dt;
    moveBody(g.world, this.era, b, dt);
    if (b.hitX && !sees) this.dir *= -1;

    // contact damage
    if (
      Math.abs(p.x - b.x) < cfg.hw + p.hw && Math.abs(p.z - b.z) < cfg.hd + p.hd + 0.1 &&
      p.y < b.y + cfg.h && p.y + p.h > b.y && this.hurtT <= 0
    ) g.player.hurt(1, b.x);

    const a = this.actor;
    a.flip = b.vx < 0;
    a.play(this.hurtT > 0 ? 'hurt' : 'walk');
    a.update(dt);
    a.mesh.position.set(b.x, b.y - 0.08, b.z);
    a.mesh.quaternion.copy(g.renderer.billboardQ);
    const gy = groundBelow(g.world, this.era, b.x, b.y + 0.3, b.z);
    this.shadow.position.set(b.x, gy + 0.02, b.z);
    this.shadow.visible = gy > -50;
  }
}

// ---------------------------------------------------------------------------
/**
 * The Warden guards the Clocktower key in the Future courtyard. It walks a loop of waypoints,
 * pausing at each corner to turn, and sees you inside its vision cone (drawn on the ground)
 * unless something solid is in the way. Spotted, it winds up and charges; caught, you're thrown
 * out of the courtyard. Hide behind pillars, or slip into another era to lose it.
 */
// tuned to be fair: a short, narrow cone, a slow walk, long looks around at each corner, a
// clear wind-up before it charges, and it gives up quickly once you're out of sight
const WARDEN = { range: 4.6, halfAngle: (36 * Math.PI) / 180, walk: 1.45, charge: 3.6, turn: 2.6, pause: 1.8, windup: 0.9, giveUp: 0.8, hear: 0.8 };
export class Warden extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.hostile = true; // holds still during conversations
    this.alwaysUpdate = true; // keeps patrolling while you're in another era
    this.path = spec.path;
    this.actor = new SpriteActor(getSheets().sentinel, 2.6);
    this.shadow = makeShadow(1.8);
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(new THREE.CircleGeometry(WARDEN.range, 28, -WARDEN.halfAngle, WARDEN.halfAngle * 2).rotateX(-Math.PI / 2), this.coneMat);
    this.cone.renderOrder = 1;
    this.group.add(this.actor.mesh, this.shadow, this.cone);
    this.reset();
  }
  reset() {
    const [x, z] = this.path[0];
    Object.assign(this, { x, z, wp: 1, state: 'patrol', stateT: 0, lostT: 0, pauseT: 0, huntT: 0 });
    const [nx, nz] = this.path[1];
    this.heading = Math.atan2(nz - z, nx - x);
  }
  /** Can it see the player right now? (same era, in range, inside the cone, clear line of sight) */
  sees() {
    const g = this.game, p = g.player.body;
    if (g.era !== this.era || g.mode !== 'play' || g.shiftGrace > 0) return false;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz);
    if (d > WARDEN.range || Math.abs(p.y) > 2) return false;
    if (d > WARDEN.hear) {
      let da = Math.atan2(dz, dx) - this.heading;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > WARDEN.halfAngle) return false;
    }
    const steps = Math.ceil(d / 0.25);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (g.world.cell(this.era, Math.floor(this.x + dx * t), 1, Math.floor(this.z + dz * t)) === T.SOLID) return false;
    }
    return true;
  }
  /** Step toward (tx, tz), sliding along solid cells; returns the remaining distance. */
  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d < 0.01) return 0;
    const want = Math.atan2(dz, dx);
    let da = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    this.heading += Math.sign(da) * Math.min(Math.abs(da), WARDEN.turn * dt);
    const step = Math.min(d, speed * dt);
    const w = this.game.world, free = (x, z) => w.cell(this.era, Math.floor(x), 0, Math.floor(z)) !== T.SOLID;
    const nx = this.x + (dx / d) * step, nz = this.z + (dz / d) * step;
    if (free(nx, this.z)) this.x = nx;
    if (free(this.x, nz)) this.z = nz;
    return d - step;
  }
  /** It knows where you are (the key has just been lifted): it comes for you, in sight or not. */
  hunt(secs = 7) {
    // through its usual wind-up first, so there's a moment to react
    Object.assign(this, { state: 'alert', stateT: 0, lostT: 0, huntT: secs });
    audio.sfx('blocked');
  }
  update(dt) {
    const g = this.game, p = g.player.body;
    // it's a machine: Tempo slows it down or hurries it along when it's inside your bubble
    const tempo = g.era === this.era ? g.gearworks.tempoAt(this.x, 0) : 1;
    dt *= tempo;
    this.stateT += dt;
    this.huntT = Math.max(0, this.huntT - dt);
    const seen = this.sees();
    if (this.state === 'patrol' || this.state === 'return') {
      if (seen) {
        this.state = 'alert';
        this.stateT = 0;
        audio.sfx('blocked');
        if (!g.state.flags.wardenHint) {
          g.state.flags.wardenHint = true;
          g.hud.toast('Spotted! Hide behind a pillar, or slip into another age.', 3500);
        }
      } else if (this.state === 'return') {
        const [tx, tz] = this.path[this.wp];
        if (this.moveToward(tx, tz, WARDEN.walk, dt) <= 0.05) this.state = 'patrol';
      } else {
        const [tx, tz] = this.path[this.wp];
        if (this.pauseT > 0) {
          // pause at the corner, turning to face the next leg
          this.pauseT -= dt;
          const [nx, nz] = this.path[(this.wp + 1) % this.path.length];
          const want = Math.atan2(nz - this.z, nx - this.x);
          const da = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
          this.heading += Math.sign(da) * Math.min(Math.abs(da), WARDEN.turn * 0.6 * dt);
          if (this.pauseT <= 0) this.wp = (this.wp + 1) % this.path.length;
        } else if (this.moveToward(tx, tz, WARDEN.walk, dt) <= 0.05) this.pauseT = WARDEN.pause;
      }
    } else if (this.state === 'alert') {
      // a short wind-up: face the player, then charge
      const want = Math.atan2(p.z - this.z, p.x - this.x);
      const da = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
      this.heading += Math.sign(da) * Math.min(Math.abs(da), WARDEN.turn * 2 * dt);
      if (this.stateT > WARDEN.windup) {
        this.state = 'chase';
        this.stateT = 0;
        audio.sfx('glitch');
      }
    } else if (this.state === 'chase') {
      this.lostT = seen || this.huntT > 0 ? 0 : this.lostT + dt;
      if (g.era === this.era) this.moveToward(p.x, p.z, WARDEN.charge, dt);
      if (this.lostT > WARDEN.giveUp || (this.stateT > 5 && this.huntT <= 0)) {
        this.state = 'return';
        let best = 0;
        this.path.forEach(([x, z], i) => {
          if (Math.hypot(x - this.x, z - this.z) < Math.hypot(this.path[best][0] - this.x, this.path[best][1] - this.z)) best = i;
        });
        this.wp = best;
      }
    }
    // caught
    if (g.era === this.era && g.mode === 'play' && !(g.shiftGrace > 0) && Math.hypot(p.x - this.x, p.z - this.z) < 0.9 && p.y < 2) g.caughtByWarden();

    const alarmed = this.state === 'alert' || this.state === 'chase';
    this.coneMat.color.setHex(tempo < 1 ? 0x7fd8ff : tempo > 1 ? 0xffb84a : alarmed ? 0xff3040 : 0xffd040);
    this.coneMat.opacity = alarmed ? 0.32 : 0.22;
    this.cone.position.set(this.x, 0.04, this.z);
    this.cone.rotation.y = -this.heading;
    const a = this.actor;
    a.flip = Math.cos(this.heading) < 0;
    a.play('walk');
    a.update(dt * (this.state === 'chase' ? 2 : this.pauseT > 0 ? 0 : 1));
    a.mesh.position.set(this.x, -0.1, this.z);
    a.mesh.quaternion.copy(g.renderer.billboardQ);
    this.shadow.position.set(this.x, 0.02, this.z);
  }
}

// ---------------------------------------------------------------------------
/**
 * A searchlight in the Warden's yard: a pool of light sweeping back and forth between two points.
 * Step into it and the Warden comes straight for you. It's a machine, so Tempo slows or hurries it.
 */
export class Searchlight extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.alwaysUpdate = true; // keeps sweeping while you're in another era
    this.t = spec.phase ?? 0;
    this.r = spec.r ?? 1.25;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(this.r, 28).rotateX(-Math.PI / 2), this.mat);
    this.pool.renderOrder = 1;
    this.rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe8ff).multiplyScalar(2), transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    this.rim = new THREE.Mesh(new THREE.RingGeometry(this.r - 0.06, this.r, 36).rotateX(-Math.PI / 2), this.rimMat);
    this.rim.renderOrder = 2;
    // its lamp, on a mast at the back of the yard
    const [ax, az] = spec.a, [bx, bz] = spec.b;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.6, 0.16), new THREE.MeshStandardMaterial({ color: 0x3a404c, metalness: 0.5, roughness: 0.5 }));
    mast.position.set((ax + bx) / 2, 2.3, 0.2);
    this.lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), this.rimMat);
    this.lamp.position.set((ax + bx) / 2, 4.6, 0.3);
    this.group.add(this.pool, this.rim, mast, this.lamp);
    this.cool = 0;
  }
  update(dt) {
    const g = this.game, p = g.player.body, [ax, az] = this.spec.a, [bx, bz] = this.spec.b;
    const tempo = g.era === this.era ? g.gearworks.tempoAt(this.x, 0) : 1;
    this.t += (dt * tempo) / this.spec.period;
    const k = 0.5 - 0.5 * Math.cos(this.t * Math.PI * 2); // there and back, easing at each end
    this.x = ax + (bx - ax) * k;
    this.z = az + (bz - az) * k;
    this.pool.position.set(this.x, 0.05, this.z);
    this.rim.position.set(this.x, 0.06, this.z);
    const col = tempo < 1 ? 0x7fd8ff : tempo > 1 ? 0xffb84a : 0xdff2ff;
    this.mat.color.setHex(col);
    this.rimMat.color.setHex(col).multiplyScalar(2);
    this.cool = Math.max(0, this.cool - dt);
    const lit = g.era === this.era && g.mode === 'play' && !(g.shiftGrace > 0) && p.y < 2 && Math.hypot(p.x - this.x, p.z - this.z) < this.r - 0.15;
    if (lit && this.cool <= 0 && g.warden && g.warden.state !== 'chase' && g.warden.state !== 'alert') {
      this.cool = 3;
      g.warden.hunt(3.5);
      if (!g.state.flags.lightHint) {
        g.state.flags.lightHint = true;
        g.hud.toast('Caught in a searchlight! The Warden is coming. Slow the lights down to slip past them.', 4500);
      }
    }
  }
}

// ---------------------------------------------------------------------------
const stoneGeo = new THREE.BoxGeometry(1, 1, 1);
export class Pushable extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.cx = spec.x;
    this.cz = spec.z;
    this.start = { x: spec.x, z: spec.z };
    const isStone = spec.kind === 'stone';
    const mat = new THREE.MeshStandardMaterial({ color: isStone ? 0xc9935a : 0x5b6472, roughness: 0.85 });
    this.mesh = new THREE.Mesh(stoneGeo, mat);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
    // decoration
    const glyphMat = new THREE.MeshBasicMaterial({ color: isStone ? 0x3ad0c0 : 0xffb03a });
    glyphMat.color.multiplyScalar(2.2);
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.04), glyphMat);
    g1.position.set(0, 0, 0.51);
    const g2 = g1.clone();
    g2.rotation.y = Math.PI / 2;
    g2.position.set(0.51, 0, 0);
    const g3 = g1.clone();
    g3.position.set(0, 0, -0.51);
    const g4 = g2.clone();
    g4.position.set(-0.51, 0, 0);
    this.mesh.add(g1, g2, g3, g4);
    if (isStone) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.14, 1.04), new THREE.MeshStandardMaterial({ color: 0x9a6a3a }));
      top.position.y = 0.45;
      this.mesh.add(top);
    }
    this.moving = null;
    this.occupy(this.cx, this.cz);
    this.sync();
  }
  occupy(x, z) {
    this.game.world.setDyn(this.era, x, 0, z, T.SOLID);
  }
  vacate(x, z) {
    this.game.world.clearDyn(this.era, x, 0, z);
  }
  setCell(x, z) {
    this.vacate(this.cx, this.cz);
    this.cx = x;
    this.cz = z;
    this.occupy(x, z);
    this.moving = null;
    this.sync();
  }
  sync() {
    this.mesh.position.set(this.cx + 0.5, 0.5, this.cz + 0.5);
  }
  canPush(dx, dz) {
    if (this.moving) return false;
    const w = this.game.world;
    if (this.spec.lockFlag && this.game.state.flags[this.spec.lockFlag]) return false; // wedged in place for good
    const tx = this.cx + dx, tz = this.cz + dz;
    if (w.cell(this.era, tx, 0, tz) !== T.AIR) return false;
    if (w.cell(this.era, tx, -1, tz) !== T.SOLID) return false;
    return true;
  }
  push(dx, dz) {
    const tx = this.cx + dx, tz = this.cz + dz;
    this.occupy(tx, tz);
    this.moving = { fx: this.cx, fz: this.cz, tx, tz, t: 0 };
    audio.sfx('push');
  }
  update(dt) {
    if (!this.moving) return;
    const m = this.moving;
    m.t += dt / 0.24;
    const t = Math.min(1, m.t);
    this.mesh.position.set(m.fx + (m.tx - m.fx) * t + 0.5, 0.5, m.fz + (m.tz - m.fz) * t + 0.5);
    if (t >= 1) {
      this.vacate(m.fx, m.fz);
      this.cx = m.tx;
      this.cz = m.tz;
      this.moving = null;
      this.game.bursts.emit(this.cx + 0.5, 0.1, this.cz + 0.5, 8, { color: 0xd8c09a, speed: 1.5, life: 0.4, gravity: 2, glow: 0.7 });
      this.game.onPushed(this);
    }
  }
}

// ---------------------------------------------------------------------------
export class Pickup extends EraEntity {
  constructor(game, spec, icon) {
    super(game, spec);
    this.icon = icon;
    const tex = iconTexture(icon);
    // Era Keys are drawn larger and at normal brightness: overbright gold vanished into the bloom
    const key = ITEMS[icon]?.key || ITEMS[icon]?.showcase;
    const big = spec.type === 'cog' ? 0.75 : key ? 1.3 : 0.85;
    this.sprite = new THREE.Mesh(
      new THREE.PlaneGeometry(big, big),
      new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: true }),
    );
    this.sprite.material.color.setScalar(key ? 0.78 : 1.6); // keys stay under the bloom threshold, so they keep their detail
    this.group.add(this.sprite);
    if (key) {
      // a dark halo behind the key separates it from bright backgrounds
      this.halo = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: 0x140c08, transparent: true, opacity: 0.6, depthWrite: false }));
      this.group.add(this.halo);
    }
    this.t = Math.random() * 6;
    this.glowCol = spec.type === 'cog' ? 0xffd070 : spec.type === 'heart' ? 0xff6080 : 0x9ff4ff;
  }
  available() {
    const s = this.game.state;
    const needs = [].concat(this.spec.needs || []); // any one of these flags unlocks it
    if (needs.length && !needs.some((n) => s.flags[n])) return false;
    if (this.spec.unless && s.flags[this.spec.unless]) return false;
    if (this.spec.type === 'cog') return !s.cogs.includes(this.id);
    if (this.spec.type === 'heart') return true;
    return !s.taken.includes(this.id);
  }
  update(dt) {
    this.t += dt;
    const av = this.available();
    this.group.visible = av;
    if (!av) return;
    this.sprite.position.set(this.x, this.y + Math.sin(this.t * 2.5) * 0.12, this.z);
    this.sprite.quaternion.copy(this.game.renderer.billboardQ);
    this.sprite.rotateY(Math.sin(this.t * 1.5) * 0.4);
    if (this.halo) {
      this.halo.position.copy(this.sprite.position);
      this.halo.quaternion.copy(this.game.renderer.billboardQ);
      this.halo.translateZ(-0.05);
    }
    if (Math.random() < dt * 6) this.game.bursts.emit(this.x, this.y, this.z, 1, { color: this.glowCol, speed: 0.6, life: 0.8, gravity: -0.6, jitter: 0.6 });
    const p = this.game.player.body;
    if (Math.abs(p.x - this.x) < 0.65 && Math.abs(p.z - this.z) < 0.7 && this.y > p.y - 0.3 && this.y < p.y + p.h + 0.4) this.game.collect(this);
  }
}

// ---------------------------------------------------------------------------
export class Interactable extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.buildVisual();
    // the seized lever is on show (and shudders when struck) before it can be used
    if (this.id === 'lever') this.alwaysUpdate = true;
    this.jolt = 0;
  }
  buildVisual() {
    const id = this.id;
    if (id === 'lever' || id === 'postern') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x7a5a3a }));
      base.position.set(this.x, 0.2, this.z);
      this.handle = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x6b4428 }));
      stick.position.y = 0.4;
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3ad0c0).multiplyScalar(2) }));
      knob.position.y = 0.82;
      this.handle.add(stick, knob);
      this.handle.position.set(this.x, 0.35, this.z);
      this.group.add(base, this.handle);
    } else if (id === 'workbench') {
      this.amulet = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        new THREE.MeshBasicMaterial({ map: iconTexture('amulet'), alphaTest: 0.5, side: THREE.DoubleSide }),
      );
      this.amulet.material.color.setScalar(1.8);
      this.group.add(this.amulet);
    } else if (id === 'soil') {
      this.sparkT = 0;
    } else if (id.startsWith('socket')) {
      const item = { socketSun: 'disc', socketBell: 'hammer', socketCore: 'core' }[id];
      this.placedIcon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        new THREE.MeshBasicMaterial({ map: iconTexture(item), alphaTest: 0.5, side: THREE.DoubleSide }),
      );
      this.placedIcon.material.color.setScalar(2.2);
      this.group.add(this.placedIcon);
      this.ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd070).multiplyScalar(2.5) }),
      );
      this.ring.rotation.x = Math.PI / 2;
      this.group.add(this.ring);
    } else if (this.spec.icon) {
      // something to pick up from it: floats above until its flag is set
      this.floatIcon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        new THREE.MeshBasicMaterial({ map: iconTexture(this.spec.icon), alphaTest: 0.5, side: THREE.DoubleSide }),
      );
      this.floatIcon.material.color.setScalar(1.8);
      this.group.add(this.floatIcon);
    }
  }
  prompt() {
    return this.spec.prompt;
  }
  active() {
    const f = this.game.state.flags;
    return super.active() && !(this.spec.hideIf && f[this.spec.hideIf]) && !(this.spec.needs && !f[this.spec.needs]);
  }
  update(dt) {
    const s = this.game.state, t = this.game.time;
    if (this.id === 'lever' || this.id === 'postern') {
      const target = (this.id === 'lever' ? s.flags.springOpen : s.flags.posternOpen) ? -0.9 : 0.9;
      this.rest = damp(this.rest ?? target, target, 10, dt);
      this.jolt = Math.max(0, this.jolt - dt * 3);
      this.handle.rotation.z = this.rest + Math.sin(t * 55) * 0.12 * this.jolt;
    } else if (this.id === 'workbench') {
      this.amulet.visible = !s.flags.hasAmulet;
      this.amulet.position.set(this.x, this.y + 0.3 + Math.sin(t * 2) * 0.06, this.z);
      this.amulet.quaternion.copy(this.game.renderer.billboardQ);
      if (!s.flags.hasAmulet && Math.random() < dt * 8) this.game.bursts.emit(this.x, this.y + 0.35, this.z, 1, { color: 0x7ff6ff, speed: 0.6, life: 0.8, gravity: -0.5, jitter: 0.5 });
    } else if (this.id === 'soil') {
      if (!s.flags.acornPlanted && !s.flags.acornPlantedM && Math.random() < dt * 5) this.game.bursts.emit(this.x, 0.15, this.z, 1, { color: 0x9aff7a, speed: 0.4, life: 1, gravity: -0.6, jitter: 0.8 });
    } else if (this.id === 'soilM') {
      if (!s.flags.acornPlanted && !s.flags.acornPlantedM && Math.random() < dt * 5) this.game.bursts.emit(this.x, 0.55, this.z, 1, { color: 0x9aff7a, speed: 0.4, life: 1, gravity: -0.6, jitter: 0.6 });
    } else if (this.floatIcon) {
      const waiting = !s.flags[this.spec.goneFlag];
      this.floatIcon.visible = waiting;
      this.floatIcon.position.set(this.x, this.y + 0.5 + Math.sin(t * 2) * 0.06, this.z);
      this.floatIcon.quaternion.copy(this.game.renderer.billboardQ);
      if (waiting && Math.random() < dt * 8) this.game.bursts.emit(this.x, this.y + 0.5, this.z, 1, { color: 0x7ff6ff, speed: 0.6, life: 0.8, gravity: -0.5, jitter: 0.5 });
    } else if (this.placedIcon) {
      const placed = this.game.sockets[this.id];
      this.placedIcon.visible = !!placed;
      this.placedIcon.position.set(this.x, this.y + 0.6 + Math.sin(t * 3) * 0.08, this.z);
      this.placedIcon.quaternion.copy(this.game.renderer.billboardQ);
      this.ring.position.set(this.x, this.y + 0.05, this.z);
      this.ring.scale.setScalar(placed ? 1 + Math.sin(t * 6) * 0.1 : 0.8);
      this.ring.material.color.setHex(placed ? 0x9ff4ff : 0xffd070).multiplyScalar(placed ? 3 : 1.5);
    }
  }
}

// ---------------------------------------------------------------------------
/**
 * Something stuck fast that a few good swings of the wrench will knock loose. spec.flag is set
 * (by the story, see struck()) once it gives; hx / hz: how wide a swing still lands on it.
 */
export class Strikeable extends EraEntity {
  constructor(game, spec) {
    super(game, spec);
    this.need = spec.hits ?? 3;
    this.hits = 0;
    this.jolt = 0;
    if (this.id === 'shutterLock') {
      // the shutter's lock housing: a rusted box on its west face, with a tell-tale lamp
      this.box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9, metalness: 0.3 }));
      this.lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3040).multiplyScalar(2.5) }));
      this.lamp.position.set(-0.17, 0.12, 0);
      this.box.add(this.lamp);
      this.box.position.set(spec.x - 0.25, 1.25, spec.z);
      this.group.add(this.box);
    }
    if (this.id.startsWith('plug')) {
      // a stone plug in the wall of the spring's trough
      this.box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.62), new THREE.MeshStandardMaterial({ color: 0xb98a54, roughness: 0.95 }));
      this.box.position.set(spec.x + 0.05, 0.34, spec.z);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.26), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3ad0c0).multiplyScalar(1.6) }));
      ring.position.set(-0.22, 0, 0);
      this.box.add(ring);
      this.group.add(this.box);
    }
    // gone once it has given (spec.keep: it stays put, e.g. a plug that was the wrong one)
    this.group.visible = !game.state.flags[spec.flag] || !!spec.keep;
  }
  active() {
    return super.active() && !this.game.state.flags[this.spec.flag];
  }
  /** Back as it was, to be struck again (the story re-seats a wrong plug). */
  reseat() {
    this.hits = 0;
    this.group.visible = true;
  }
  /** The prompt shows how far along it is. */
  prompt() {
    return `${this.spec.prompt} ${'●'.repeat(this.hits)}${'○'.repeat(this.need - this.hits)}`;
  }
  /** Does a wrench swing at (x, y, z) land on it? */
  struckAt(x, y, z) {
    return Math.abs(x - this.x) < (this.spec.hx ?? 1) && Math.abs(z - this.z) < (this.spec.hz ?? 1.2) && y > this.y - 0.5 && y < this.y + 2.4;
  }
  strike() {
    const g = this.game;
    if (this.hits >= this.need) return;
    this.hits++;
    this.jolt = 1;
    audio.sfx('hit');
    audio.sfx('lever');
    g.renderer.shake = Math.max(g.renderer.shake, 0.2 + 0.1 * this.hits);
    const sy = this.box ? this.box.position.y : this.y + 0.9, sx = this.box ? this.box.position.x : this.x;
    g.bursts.emit(sx, sy, this.z, 10 + this.hits * 4, { color: [0xffd070, 0xffffff, 0xff8a3a], speed: 4, life: 0.4, gravity: 9, glow: 2.5 });
    if (this.id === 'leverJam') {
      const lever = g.interactables.find((e) => e.id === 'lever');
      if (lever) lever.jolt = 1;
    }
    if (this.hits >= this.need) {
      this.group.visible = false;
      g.strikeDone(this);
    }
  }
  update(dt) {
    this.jolt = Math.max(0, this.jolt - dt * 3.5);
    if (this.box) {
      // each hit knocks it further askew, and its lamp gutters
      const t = this.game.time;
      this.box.rotation.x = this.hits * 0.16 + Math.sin(t * 60) * 0.1 * this.jolt;
      this.box.rotation.z = -this.hits * 0.09;
      if (this.lamp) this.lamp.visible = this.hits === 0 || Math.sin(t * (14 + this.hits * 12)) > -0.2 * this.hits;
    }
  }
}

// ---------------------------------------------------------------------------
export class Shrine extends EraEntity {
  constructor(game, spec) {
    super(game, { ...spec, era: -1 });
    this.cp = spec;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.9 }));
    base.position.set(this.x, 0.3, this.z);
    base.castShadow = true;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: 0x9a958a }));
    col.position.set(this.x, 1.05, this.z);
    col.castShadow = true;
    this.baseMat = base.material;
    this.colMat = col.material;
    this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd070) });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 20), this.ringMat);
    this.ring.position.set(this.x, 1.85, this.z);
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), this.ringMat);
    this.hand.geometry.translate(0, 0.12, 0);
    this.hand.position.copy(this.ring.position);
    this.group.add(base, col, this.ring, this.hand);
    this.lit = false;
  }
  setEra(era) {
    const c = [[0xc9935a, 0xd29e64], [0x8a8378, 0x9a958a], [0x4a5260, 0x6a7484]][era];
    this.baseMat.color.setHex(c[0]);
    this.colMat.color.setHex(c[1]);
  }
  update(dt) {
    const t = this.game.time;
    const on = this.game.state.checkpoint === this.cp.id;
    this.ring.rotation.y = t * (on ? 2 : 0.5);
    this.hand.rotation.z = -t * (on ? 3 : 0.3);
    this.ringMat.color.setHex(on ? 0x7ff6ff : 0xffd070).multiplyScalar(on ? 3 : 1.2);
    const p = this.game.player.body;
    if (!on && Math.abs(p.x - this.x) < 1.0 && Math.abs(p.z - this.z) < 1.4 && p.y < 2) this.game.activateCheckpoint(this.cp.id);
  }
}
