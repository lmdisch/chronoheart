// Chapter One's own things to use and to strike: the spring lever, the workbench, the sockets
// in the Clocktower, the shutter's lock, the trough's plugs. (The shared engine's versions, in
// src/world/entities.js, are driven by their spawn data instead.)
import * as THREE from 'three';
import { damp, ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { iconTexture } from '../../render/sprites.js';
import { EraEntity, ENEMY } from '../../world/entities.js';
import { Actor } from '../../render/actors.js';

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
    if (this.id.startsWith('escapePin')) {
      // a brass-and-iron escapement pin on the Gearworks summit deck
      this.box = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.85, 12), new THREE.MeshStandardMaterial({ color: 0xc9963a, metalness: 0.7, roughness: 0.35 }));
      this.lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd070).multiplyScalar(2.2) }));
      this.lamp.position.set(0, 0.42, 0);
      this.box.add(this.lamp);
      this.box.position.set(spec.x, spec.y + 0.42, spec.z);
      this.group.add(this.box);
    }
    // gone once it has given (spec.keep: it stays put, e.g. a plug that was the wrong one)
    this.group.visible = !game.state.flags[spec.flag] || !!spec.keep;
  }
  active() {
    if (this.id.startsWith('escapePin') && !this.game.state.flags.gearworksOpen) return false;
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
/** What the Stasis Seal calls each creature (and the prompt over it). */
export const CREATURES = { thornback: 'thornback', rat: 'rat', drone: 'drone' };

/**
 * A creature the Stasis Seal has held in its moment (a record in state.frozen): it stands where
 * it was sealed, harmless and pale, in that age and in every age after. By the Future someone
 * has put a placard up beside it (see interact 'frozen' for what everyone makes of it).
 */
export class Frozen extends EraEntity {
  constructor(game, rec, era) {
    super(game, { id: 'frozen', era, x: rec.x, y: rec.y, z: rec.z, kind: rec.kind, sealedIn: rec.era, reach: 1.9 });
    this.actor = new Actor(rec.kind, ENEMY[rec.kind].size);
    this.actor.flip = rec.flip;
    this.actor.play('walk');
    const m = this.actor.mat;
    m.color.setHex(0x9cc8ff);
    m.emissive.setHex(0x5fb0ff);
    m.emissiveIntensity = 0.85;
    this.actor.update(0);
    this.actor.mesh.position.set(rec.x, rec.y - 0.08, rec.z);
    this.group.add(this.actor.mesh);
    // the moment it's held in: a pale shell of crystal around it
    const cfg = ENEMY[rec.kind];
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(cfg.size * 0.85, cfg.hw * 2 + 0.5), cfg.h + 0.45, cfg.hd * 2 + 0.4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe0ff).multiplyScalar(1.2), transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shell.position.set(rec.x, rec.y + (cfg.h + 0.45) / 2 - 0.1, rec.z);
    shell.renderOrder = 2;
    this.group.add(shell);
    this.exhibit = era === ERA.FUTURE && rec.era !== era;
    if (this.exhibit) {
      // a museum placard on a little brass post, and a velvet rope to keep the visitors back
      // (lit from within, so it reads in the dim neon of the Future)
      const brass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8b050).multiplyScalar(1.3) });
      const base = rec.y - (ENEMY[rec.kind].fly ? 1.1 : 0);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), brass);
      post.position.set(rec.x + 1.0, base + 0.45, rec.z + 0.55);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.05), brass);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.32), new THREE.MeshBasicMaterial({ color: 0x2a2238 }));
      face.position.z = 0.03;
      for (let i = 0; i < 3; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(i ? 0.4 : 0.3, 0.035), new THREE.MeshBasicMaterial({ color: 0xf0e2b0 }));
        line.position.set(0, 0.08 - i * 0.08, 0.035);
        plate.add(line);
      }
      plate.add(face);
      plate.position.set(rec.x + 1.0, base + 1.0, rec.z + 0.58);
      plate.rotation.x = -0.35;
      // the velvet rope between two little stanchions
      const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd02840).multiplyScalar(1.2) });
      const rope = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), red);
      rope.position.set(rec.x - 0.1, base + 0.5, rec.z + 0.8);
      this.group.add(post, plate, rope);
      for (const dx of [-0.8, 0.6]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), brass);
        st.position.set(rec.x + dx, base + 0.3, rec.z + 0.8);
        this.group.add(st);
      }
    }
  }
  prompt() {
    return this.exhibit ? 'Read the placard' : `Frozen ${CREATURES[this.spec.kind]}`;
  }
  update(dt) {
    this.actor.mesh.quaternion.copy(this.game.renderer.billboardQ);
    if (Math.random() < dt * 2) this.game.bursts.emit(this.x, this.y + 0.4, this.z, 1, { color: [0xbff6ff, 0xffffff], speed: 0.3, life: 1, gravity: -0.6, glow: 1.4, jitter: 0.4 });
  }
}
