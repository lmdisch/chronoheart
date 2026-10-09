// The Clocktower finale: the great piston (Present) that rises while its button is held, the
// Tower's gears that spin up as keys go in, and the "lurch" each key sets off.
import * as THREE from 'three';
import { ERA } from './core/util.js';
import { audio } from './audio/audio.js';
import { T } from './world/world.js';
import { TOWER, L } from './levels/hollowmere.js';

const STEP_TIME = 0.16; // the piston moves one cell this often: a clunky clockwork lift

const onButton = (b, p) => Math.abs(b.x - (p.x + 0.5)) < 0.65 && Math.abs(b.z - (p.z + 0.5)) < 0.65 && Math.abs(b.y - p.y) < 0.4;

export class Finale {
  constructor(game) {
    this.game = game;
  }

  /** Called after the world is (re)built: the piston and gears live in the era groups. */
  attach() {
    const g = this.game, P = g.world.groups[ERA.PRESENT];
    const pc = TOWER.piston, w = pc.x1 - pc.x0 + 1, d = pc.z1 - pc.z0 + 1;
    // the piston: a stone column with brass bands, rising out of its shaft
    this.piston = new THREE.Group();
    const col = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.8 }));
    col.castShadow = col.receiveShadow = true;
    this.pistonCol = col;
    this.pistonCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.1), new THREE.MeshStandardMaterial({ color: 0xc9a44a, metalness: 0.5, roughness: 0.4 }));
    this.piston.add(col, this.pistonCap);
    this.piston.position.set(pc.x0 + w / 2, 0, pc.z0 + d / 2);
    P.add(this.piston);
    this.h = 0; // collision height, whole cells
    this.shown = 0;
    this.stepT = 0;
    // its button: a big brass plate
    const bt = TOWER.pistonButton;
    this.btnMat = new THREE.MeshBasicMaterial({ color: 0xffc040 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.9), new THREE.MeshStandardMaterial({ color: 0x2a2630 }));
    plate.position.set(bt.x + 0.5, 0.035, bt.z + 0.5);
    this.btnTop = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.1, 18), this.btnMat);
    this.btnTop.position.set(bt.x + 0.5, 0.08, bt.z + 0.5);
    P.add(plate, this.btnTop);
    // the Tower's great gears on the back wall, one set per age; they turn as the Tower wakes
    this.gears = [];
    const tones = [0xb8862a, 0x8a6a3a, 0x5b6472];
    for (let era = 0; era < 3; era++) {
      for (const [gx, gy, r, dir] of [[L.towerX0 + 3, 15, 2.2, 1], [L.towerX0 + 7.2, 17.5, 1.5, -1], [L.towerX0 + 16.5, 9, 1.8, 1]]) {
        const gear = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: tones[era], metalness: 0.4, roughness: 0.5 });
        gear.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.2, 20).rotateX(Math.PI / 2), mat));
        for (let i = 0; i < 10; i++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.2), mat);
          const a = (i / 10) * Math.PI * 2;
          tooth.position.set(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, 0);
          tooth.rotation.z = a;
          gear.add(tooth);
        }
        gear.position.set(gx, gy, 0.15);
        gear.userData.dir = dir / r;
        g.world.groups[era].add(gear);
        this.gears.push(gear);
      }
    }
    this.lurchT = 0;
  }

  get keysPlaced() {
    return Object.keys(this.game.sockets).length;
  }

  update(dt) {
    const g = this.game, w = g.world, P = ERA.PRESENT, pc = TOWER.piston;
    // the gears: still until the Tower wakes, faster with every key
    const speed = [0, 0.5, 1.4, 2.5][this.keysPlaced] ?? 2.5;
    for (const gear of this.gears) gear.rotation.z += gear.userData.dir * speed * dt;
    // the piston has power once the Sun Disc is in
    const powered = !!g.sockets.socketSun;
    const bt = TOWER.pistonButton;
    const held = powered && ((g.era === P && onButton(g.player.body, bt)) || g.abilities.echoes.some((e) => onButton(e.pos, bt)));
    this.btnMat.color.setHex(0xffc040).multiplyScalar(!powered ? 0.25 : held ? 2.2 : 0.6);
    this.btnTop.position.y = held ? 0.06 : 0.08;
    // one cell at a time, up while held, down when released
    this.stepT -= dt;
    const want = held ? pc.h : 0;
    if (this.stepT <= 0 && want !== this.h) {
      this.stepT = STEP_TIME;
      const next = this.h + Math.sign(want - this.h);
      const b = g.player.body;
      const onTop = g.era === P && b.x + b.hw > pc.x0 && b.x - b.hw < pc.x1 + 1 && b.z + b.hd > pc.z0 && b.z - b.hd < pc.z1 + 1;
      for (let x = pc.x0; x <= pc.x1; x++)
        for (let z = pc.z0; z <= pc.z1; z++) {
          if (next > this.h) w.setDyn(P, x, this.h, z, T.SOLID);
          else w.clearDyn(P, x, next, z);
        }
      // carry the player up with it (they fall back down on their own)
      if (next > this.h && onTop && b.y < next + 0.05 && b.y > this.h - 0.6) {
        b.y = next;
        b.vy = 0;
      }
      this.h = next;
      if (g.era === P && Math.abs(b.x - pc.x0) < 14) audio.sfx('tick');
    }
    this.shown += (this.h - this.shown) * Math.min(1, dt * 14);
    this.pistonCol.scale.y = Math.max(0.001, this.shown);
    this.pistonCol.visible = this.shown > 0.02;
    this.pistonCap.position.y = this.shown + 0.07;
    // the lurch after a key goes in
    if (this.lurchT > 0) {
      this.lurchT -= dt;
      if (Math.random() < dt * 30) g.bursts.emit(L.towerX0 + 2 + Math.random() * 18, 18 + Math.random() * 3, Math.random() * 6, 2, { color: [0xd8c09a, 0x9a8a70], speed: 1, life: 1.4, gravity: 6 });
    }
  }

  /** A key went in: the Tower lurches, the gears speed up, and the next stage opens. */
  lurch(socketId) {
    const g = this.game;
    this.lurchT = 2.4;
    g.renderer.shake = 1.0;
    g.towerSurge = 2.4; // the Tower's time-stutter flares (see Game.updateTowerGlitch)
    audio.sfx('gate');
    audio.sfx('bell');
    const msg = {
      socketSun: 'The Tower <b>wakes</b>! Far above, the great piston grinds into life.',
      socketBell: 'The bell rings out! The old belfry floor groans: it will never last the centuries.',
    }[socketId];
    if (msg) setTimeout(() => g.hud.toast(msg, 4500), 500);
  }
}
