// Game orchestrator: modes, era shifting, meter, saving, interactions, finale.
import * as THREE from 'three';
import { input } from './core/input.js';
import { ERA, ERA_SHORT } from './core/util.js';
import { audio } from './audio/audio.js';
import { Renderer } from './render/renderer.js';
import { Post } from './render/post.js';
import { Ambient, Bursts } from './render/particles.js';
import { World, T, W } from './world/world.js';
import { hits } from './world/physics.js';
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL } from './levels/hollowmere.js';
import { Player, NPC, Enemy, Sentinel, Pushable, Pickup, Interactable, Shrine } from './world/entities.js';
import { HUD, Dialogue, showInventoryPanel, setFade, letterbox } from './ui/ui.js';
import { talk, interact, ITEMS, INTRO, ENDING, FAVOURS } from './story.js';
import { touchActive } from './ui/touch.js';
import { currentGoal } from './objectives.js';
import { Abilities } from './abilities.js';

const SAVE_KEY = 'chronoheart-save-v1';
// Storage can be unavailable (private windows, embedded viewers): the game still runs, it just won't save.
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* saving unavailable */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* saving unavailable */ } },
};
const ERA_RING = [0xffc060, 0xbff6ff, 0xff4fd8];
const DRAIN_TIME = 10; // seconds of charge away from the present
const RESONANCE_TIME = 22;
const BASE_HP = 5;
/** Short vibration on phones that support it (Android); silently ignored elsewhere. */
export function haptic(ms) {
  try {
    if (touchActive()) navigator.vibrate?.(ms);
  } catch {
    /* not allowed here */
  }
}
const ERA_COLORS = ['#ffc060', '#bff6ff', '#ff5fe0'];
const ERA_LABEL = ['Ancient Age', 'Medieval Age', 'Age of Chrome'];

export function newState() {
  return {
    flags: {},
    inventory: [],
    taken: [],
    cogs: [],
    kindness: [], // completed favours (see FAVOURS in story.js)
    blockPos: { ...L.blockStart },
    cratePos: { ...L.crateStart },
    boulderPos: { ...L.boulderStart },
    checkpoint: 0,
    playTime: 0,
  };
}

export class Game {
  constructor(container) {
    this.L = L;
    this.renderer = new Renderer(container);
    this.scene = this.renderer.scene;
    this.post = new Post(this.renderer);
    this.ambient = new Ambient(this.scene);
    this.bursts = new Bursts(this.scene);
    this.hud = new HUD();
    this.dialogue = new Dialogue();
    this.mode = 'title';
    this.time = 0;
    this.era = ERA.PRESENT;
    this.meter = 1;
    this.sockets = {};
    this.resonance = 0;
    this.lockT = 0;
    this.peekTarget = null;
    this.blockFlashT = 0;
    this.areaIdx = -1;
    this.invOpen = false;
    this.warnT = 0;
    this.state = newState();
    this.abilities = new Abilities(this);
    this.buildWorld();
    this.clock = new THREE.Clock();
    this.titleT = 0;
    this.titleEra = 1;
    this.applyEra(ERA.PRESENT, true);
    this.renderer.camTarget.set(16, 1, 3);
  }

  // ------------------------------------------------------------------ world
  buildWorld() {
    if (this.world) {
      for (const g of this.world.groups) this.scene.remove(g);
      for (const s of this.shrines || []) s.remove();
      if (this.player) this.scene.remove(this.player.mesh, this.player.shadow);
    }
    this.world = new World();
    buildLevel(this.world, this.state);
    for (const g of this.world.groups) this.scene.add(g);
    this.entities = [];
    this.npcs = [];
    this.enemies = [];
    this.pushables = [];
    this.pickups = [];
    this.interactables = [];
    for (const s of SPAWNS) {
      let e;
      if (s.type === 'npc') this.npcs.push((e = new NPC(this, s)));
      else if (s.type === 'enemy') this.enemies.push((e = new Enemy(this, s)));
      else if (s.type === 'sentinel') this.enemies.push((e = this.sentinel = new Sentinel(this, s)));
      else if (s.type === 'pushable') {
        const pos = this.state[s.posKey];
        this.pushables.push((e = new Pushable(this, { ...s, x: pos.x, z: pos.z })));
        e.start = { x: s.x, z: s.z };
      } else if (s.type === 'pickup') this.pickups.push((e = new Pickup(this, s, s.item)));
      else if (s.type === 'cog') this.pickups.push((e = new Pickup(this, s, 'cog')));
      else if (s.type === 'interact') this.interactables.push((e = new Interactable(this, s)));
      if (e) this.entities.push(e);
    }
    this.shrines = CHECKPOINTS.map((c) => new Shrine(this, c));
    this.entities.push(...this.shrines);
    this.player = new Player(this);
    this.player.maxHp = this.player.hp = BASE_HP + this.state.kindness.length; // each kindness adds a heart
    const cp = CHECKPOINTS[this.state.checkpoint] || CHECKPOINTS[0];
    this.player.place(cp.x + 1.2, 0, 3.5);
    this.abilities.attach();
  }

  refreshWorld() {
    this.world.__state = this.state;
    this.world.refreshFeatures(this.state);
  }

  // ------------------------------------------------------------------ flow
  startNew() {
    store.remove(SAVE_KEY);
    this.state = newState();
    this.buildWorld();
    this.beginPlay();
    this.player.place(L.start.x, 0, L.start.z);
    this.renderer.camTarget.set(L.start.x + 4, 1, 3);
    this.cutscene(INTRO).then(() => {
      if (touchActive()) {
        this.hud.toast('Drag on the left side of the screen to move. Tap <b>Jump</b> to jump, and <b>Talk</b> when it lights up.', 6500);
        setTimeout(() => this.hud.toast('Tap <b>Attack</b> to swing your wrench. Tap <b>?</b> any time to see all controls.', 6500), 1200);
      } else {
        this.hud.toast('Move with <kbd>A</kbd><kbd>D</kbd> and <kbd>W</kbd><kbd>S</kbd>. Jump with <kbd>Space</kbd>. Interact with <kbd>F</kbd>.', 6500);
        setTimeout(() => this.hud.toast('Swing your wrench with <kbd>X</kbd>. Press <kbd>H</kbd> any time to see all controls.', 6500), 1200);
      }
    });
  }

  continueGame() {
    const raw = store.get(SAVE_KEY);
    if (!raw) return this.startNew();
    try {
      this.state = Object.assign(newState(), JSON.parse(raw));
    } catch {
      return this.startNew();
    }
    this.buildWorld();
    this.beginPlay();
    this.hud.toast('Welcome back, Vivienne.');
  }

  hasSave() {
    return !!store.get(SAVE_KEY);
  }

  beginPlay() {
    this.mode = 'play';
    this.meter = 1;
    this.sockets = {};
    this.resonance = 0;
    this.applyEra(ERA.PRESENT, true);
    this.post.trans = 1;
    this.post.peekAmt = 0;
    this.hud.show(true);
    this.hud.showAmulet(!!this.state.flags.hasAmulet);
    this.hud.setHearts(this.player.hp, this.player.maxHp);
    this.hud.setInventory(this.state.inventory);
    this.hud.setCogs(this.state.cogs.length);
    this.hud.setResonance(null);
    this.abilities.syncBody();
    this.areaIdx = -1;
    audio.setEra(ERA.PRESENT);
    audio.setMusicVolume(0.55);
  }

  save() {
    store.set(SAVE_KEY, JSON.stringify(this.state));
  }

  async cutscene(lines) {
    letterbox(true);
    this.mode = 'dialogue';
    await this.dialogue.run(lines);
    letterbox(false);
    if (this.mode === 'dialogue') this.mode = 'play';
    this.lockT = 0.25;
  }

  controlsEnabled() {
    return this.mode === 'play' && !this.dialogue.active && this.lockT <= 0;
  }

  // ------------------------------------------------------------------ eras
  applyEra(era, instant = false) {
    this.era = era;
    this.world.groups.forEach((g, i) => (g.visible = i === era));
    this.renderer.setEra(era, instant);
    this.post.setGrade(era);
    if (instant) {
      this.post.gradeCur = JSON.parse(JSON.stringify(this.post.gradeTarget));
      this.post.applyGrade();
    }
    this.ambient.setEra(era);
    this.shrines.forEach((s) => s.setEra(era));
    this.hud.setEra(era);
    audio.setEra(era, instant);
  }

  tryShift(target) {
    if (!this.state.flags.hasAmulet || target < 0 || target > 2 || target === this.era) return;
    if (this.post.trans < 0.6) return;
    const b = this.player.body;
    if (target !== ERA.PRESENT && this.meter < 0.06) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.hud.toast('The Chronoheart needs to recharge in the Present.');
      return;
    }
    if (hits(this.world, target, b)) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.blockFlashT = 0.7;
      this.blockFlashEra = target;
      if (!this.state.flags.blockHint) {
        this.state.flags.blockHint = true;
        this.hud.toast(`Something solid is standing right here in the ${ERA_SHORT[target]}. Move a little and try again.`, 5000);
      }
      return;
    }
    if (this.overHazard(target)) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.blockFlashT = 0.7;
      this.blockFlashEra = target;
      this.hud.toast(`Careful! In the ${ERA_SHORT[target]} there's nothing to stand on here.`, 4000);
      return;
    }
    this.doShift(target);
  }

  /** True if the first non-air cell below the player in `era` is a hazard (deep river, toxic canal...). */
  overHazard(era) {
    const b = this.player.body;
    const x = Math.floor(b.x), z = Math.floor(b.z);
    for (let y = Math.floor(b.y + 0.01); y >= -6; y--) {
      const c = this.world.cell(era, x, y, z);
      if (c === T.HAZARD) return true;
      if (c !== T.AIR) return false;
    }
    return false;
  }

  doShift(target) {
    this.post.peekAmt = 0;
    this.swipePeek = null;
    haptic(25);
    this.post.capture();
    this.applyEra(target);
    this.post.startTransition(ERA_RING[target]);
    audio.sfx('shift', { era: target });
    const b = this.player.body;
    this.bursts.emit(b.x, b.y + 0.8, b.z, 40, { color: [ERA_RING[target], 0xffffff], speed: 5, life: 0.6, gravity: 0, glow: 2.5 });
    this.areaIdx = -1;
    if (target === ERA.FUTURE && this.sentinel && this.sentinel.checkCrush()) {
      audio.sfx('crush');
      this.renderer.shake = 1;
      this.bursts.emit(this.sentinel.body.x, 1, this.sentinel.body.z, 60, { color: [0xffb03a, 0xff3040, 0xffffff], speed: 6, life: 1 });
      setTimeout(() => this.hud.toast('<b>CRUNCH.</b> Three hundred years of rusted portcullis landed right on the Sentinel.', 5000), 600);
      this.save();
    }
    if (target === ERA.FUTURE && this.state.flags.gateDown && this.sentinel && !this.sentinel.dead && this.sentinel.body.x < L.gateX && !this.state.flags.trapHint) {
      this.state.flags.trapHint = true;
      setTimeout(() => this.hud.toast('The Sentinel is trapped behind the fallen gate!'), 700);
    }
  }

  snapBack() {
    const b = this.player.body;
    let ok = !hits(this.world, ERA.PRESENT, b);
    if (!ok) {
      const ox = b.x, oz = b.z, oy = b.y;
      outer: for (let r = 1; r <= 4; r++)
        for (const [dx, dz, dy] of [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [r, 0, r], [-r, 0, r]]) {
          Object.assign(b, { x: ox + dx * 0.6, z: oz + dz * 0.6, y: oy + dy });
          if (!hits(this.world, ERA.PRESENT, b)) {
            ok = true;
            break outer;
          }
        }
    }
    if (!ok || this.overHazard(ERA.PRESENT)) {
      const s = this.lastSafePresent || CHECKPOINTS[this.state.checkpoint];
      this.player.place(s.x, s.y ?? 0, s.z);
    }
    this.doShift(ERA.PRESENT);
    audio.sfx('snap');
    this.hud.toast("The Chronoheart's charge ran out. You were pulled back to the Present!");
  }

  // ------------------------------------------------------------------ gameplay hooks
  playerAttack(x, y, z, facing) {
    for (const e of this.enemies) {
      if (!e.active() || e.dead) continue;
      const b = e.body;
      const h = e.cfg ? e.cfg.h : b.h;
      if (Math.abs(b.x - x) < 0.8 + b.hw && Math.abs(b.z - z) < 0.9 && y > b.y - 0.6 && y < b.y + h + 0.6) e.damage(1, facing);
    }
  }

  tryPushFrom(b, dir, t) {
    const cx = Math.floor(b.x + dir[0] * (b.hw + 0.06));
    const cz = Math.floor(b.z + dir[1] * (b.hd + 0.06));
    if (b.y > 0.5) return false;
    for (const p of this.pushables) {
      if (p.era !== this.era || p.moving || p.cx !== cx || p.cz !== cz) continue;
      if (dir[0] && Math.abs(b.z - (cz + 0.5)) > 0.5) return false;
      if (dir[1] && Math.abs(b.x - (cx + 0.5)) > 0.5) return false;
      if (!p.canPush(dir[0], dir[1])) return true;
      if (t > 0.2) p.push(dir[0], dir[1]);
      return true;
    }
    return false;
  }

  onPushed(p) {
    this.state[p.spec.posKey] = { x: p.cx, z: p.cz };
    if (p.id === 'boulder') {
      const t = L.boulderTarget;
      if (p.cx !== t.x || p.cz !== t.z || this.state.flags.millDammed) return;
      this.state.flags.millDammed = true;
      audio.sfx('socket');
      audio.sfx('splash');
      this.bursts.emit(t.x + 0.5, 0.8, t.z + 0.5, 30, { color: [0x3ad0c0, 0x9fe0ff], speed: 3, life: 0.8 });
      this.refreshWorld();
      this.save();
      this.timelapse({ to: ERA.PRESENT, focus: [195.5, 1, 3], years: 500, caption: 'Turned from its gully, the spring pools in the hollow...', grow: ['millM'] }).then(() =>
        this.hud.toast("The hollow is a millpond now, but it's draining away through the mill's open sluice.", 6500),
      );
    } else if (p.id === 'block') {
      this.refreshWorld();
      const t = L.pillarTarget;
      if (p.cx === t.x && p.cz === t.z) {
        audio.sfx('socket');
        this.bursts.emit(t.x + 0.5, 0.8, t.z + 0.5, 30, { color: [0x3ad0c0, 0xffe070], speed: 3, life: 0.8 });
        this.save();
        this.timelapse({ to: ERA.PRESENT, focus: [t.x + 0.5, 1.5, t.z], years: 600, caption: 'Generations build on the ancient stone...', grow: ['pillar'] }).then(() =>
          this.hud.toast('A pillar now stands on the old foundation, right beside the bench.', 6000),
        );
      } else if (!this.state.flags.pushHint) {
        this.state.flags.pushHint = true;
        this.hud.toast('The ancient block slides across the sand. That glowing outline nearby looks like it was carved for it...');
      }
    }
  }

  collect(p) {
    const s = this.state;
    if (p.spec.type === 'cog') {
      s.cogs.push(p.id);
      audio.sfx('cog');
      this.hud.setCogs(s.cogs.length);
      this.hud.toast(`<b>Lost Cog found!</b> (${s.cogs.length}/${COG_TOTAL})`);
      this.bursts.emit(p.x, p.y, p.z, 30, { color: [0xffd070, 0xffffff], speed: 4, life: 0.8 });
      this.save();
      return;
    }
    if (p.spec.type === 'heart') {
      if (this.player.hp >= this.player.maxHp) return;
      this.player.heal(1);
      audio.sfx('heal');
      p.remove();
      return;
    }
    s.taken.push(p.id);
    this.giveItem(p.icon);
    this.bursts.emit(p.x, p.y, p.z, 30, { color: [0x9ff4ff, 0xffffff], speed: 4, life: 0.8 });
    this.save();
  }

  giveItem(item) {
    this.state.inventory.push(item);
    this.hud.setInventory(this.state.inventory);
    const it = ITEMS[item];
    audio.sfx(it.key ? 'key' : 'pickup');
    this.hud.toast(`${it.key ? '<b>Era Key obtained:</b>' : 'Obtained:'} ${it.name}<br><small>${it.desc}</small>`, 5000);
  }

  removeItem(item) {
    const i = this.state.inventory.indexOf(item);
    if (i >= 0) this.state.inventory.splice(i, 1);
    this.hud.setInventory(this.state.inventory);
  }

  spawnHeart(era, x, y, z) {
    const h = new Pickup(this, { type: 'heart', id: 'heart' + Math.random(), era, x, y: Math.max(y, 0.5), z }, 'heart');
    this.pickups.push(h);
    this.entities.push(h);
  }

  activateCheckpoint(id) {
    this.state.checkpoint = id;
    this.player.heal(this.player.maxHp);
    audio.sfx('checkpoint');
    this.hud.toast('Clock shrine activated. Progress saved.');
    const c = CHECKPOINTS[id];
    this.bursts.emit(c.x, 1.8, c.z, 30, { color: [0x7ff6ff, 0xffd070], speed: 3, life: 0.8 });
    this.save();
  }

  placeKey(socketId, item) {
    this.removeItem(item);
    this.sockets[socketId] = item;
    audio.sfx('socket');
    if (socketId === 'socketBell') audio.sfx('bell');
    const ent = this.interactables.find((i) => i.id === socketId);
    this.bursts.emit(ent.x, ent.y + 0.6, ent.z, 40, { color: [0xffd070, 0x9ff4ff], speed: 4, life: 0.9 });
    this.renderer.shake = 0.5;
    const n = Object.keys(this.sockets).length;
    if (n === 3) {
      this.hud.setResonance(null);
      this.runEnding();
      return;
    }
    if (n === 1) {
      this.resonance = RESONANCE_TIME;
      this.hud.toast('<b>The Tower hums!</b> Place the other Era Keys before the resonance fades!', 5000);
    } else this.hud.toast('Two keys resonate. One more!');
  }

  failResonance() {
    for (const [sid, item] of Object.entries(this.sockets)) this.state.inventory.push(item);
    this.sockets = {};
    this.resonance = 0;
    this.hud.setResonance(null);
    this.hud.setInventory(this.state.inventory);
    audio.sfx('snap');
    this.hud.toast('The resonance faded, and the keys dropped back into your hands. Place all three before the echo dies!', 6000);
  }

  async runEnding() {
    this.mode = 'ending';
    this.hud.showPrompt(null);
    this.abilities.cancelRecording();
    audio.sfx('bell');
    audio.sfx('fanfare');
    this.renderer.shake = 1.5;
    const b = this.player.body;
    for (let i = 0; i < 4; i++) setTimeout(() => this.bursts.emit(b.x + (Math.random() - 0.5) * 8, 4 + Math.random() * 6, 1, 60, { color: [0xffd070, 0x9ff4ff, 0xff4fd8], speed: 6, life: 1.4, gravity: 1 }), i * 400);
    // cycle eras for drama
    for (const e of [ERA.PAST, ERA.FUTURE, ERA.PRESENT]) {
      await new Promise((r) => setTimeout(r, 700));
      this.doShift(e);
    }
    await new Promise((r) => setTimeout(r, 900));
    // Eugene appears
    const os = new NPC(this, { type: 'npc', id: 'eugeneEnd', era: ERA.PRESENT, x: b.x + 2.2, z: b.z, sheet: 'eugene', name: 'Eugene' });
    this.npcs.push(os);
    this.entities.push(os);
    this.bursts.emit(os.x, 1, os.z, 60, { color: [0x9ff4ff, 0xffffff], speed: 4, life: 1 });
    audio.sfx('shift', { era: 1 });
    letterbox(true);
    await this.dialogue.run(ENDING);
    letterbox(false);
    this.state.flags.finished = true;
    this.save();
    // fade to white and show credits
    let f = 0;
    await new Promise((r) => {
      const step = () => {
        f += 0.02;
        setFade(Math.min(1, f), '#fff6e0');
        if (f < 1) requestAnimationFrame(step);
        else r();
      };
      step();
    });
    this.mode = 'credits';
    this.hud.show(false);
    this.onCredits?.(this.state);
  }

  onHazard() {
    if (this.respawning) return;
    this.respawning = true;
    audio.sfx('splash');
    this.abilities.cancelRecording();
    const b = this.player.body;
    this.bursts.emit(b.x, b.y + 0.5, b.z, 24, { color: this.era === ERA.FUTURE ? [0x7cff6a] : [0x9fe0ff, 0xffffff], speed: 4, life: 0.6 });
    setFade(0.85, '#000');
    setTimeout(() => {
      const s = this.player.lastSafe || { ...CHECKPOINTS[this.state.checkpoint], y: 0, era: ERA.PRESENT };
      this.player.place(s.x, s.y, s.z);
      if (s.era !== this.era) this.applyEra(s.era, true);
      if (s.era !== ERA.PRESENT) this.meter = Math.max(this.meter, 0.6);
      this.player.invuln = 0;
      this.player.hurt(1, s.x);
      this.player.body.vx = this.player.body.vy = 0;
      this.player.state = 'normal';
      this.lockT = 0.6;
      setFade(0);
      this.respawning = false;
    }, 380);
  }

  onDeath() {
    if (this.mode !== 'play') return;
    this.mode = 'dead';
    this.abilities.cancelRecording();
    setFade(1, '#05040a', 'Time rewinds...');
    audio.setMusicVolume(0.15);
    setTimeout(() => {
      const cp = CHECKPOINTS[this.state.checkpoint];
      this.player.place(cp.x + 1.2, 0, 3.5);
      this.player.hp = this.player.maxHp;
      this.player.invuln = 1.5;
      this.applyEra(ERA.PRESENT, true);
      this.meter = 1;
      if (Object.keys(this.sockets).length) this.failResonance();
      for (const e of this.enemies) if (e.alive && e.reset) e.reset();
      this.hud.setHearts(this.player.hp, this.player.maxHp);
      this.mode = 'play';
      audio.setMusicVolume(0.55);
      setFade(0);
    }, 1700);
  }

  // ------------------------------------------------------------------ per-frame
  nearestInteractive() {
    const b = this.player.body;
    let best = null, bd = 1.7;
    for (const e of [...this.npcs, ...this.interactables]) {
      if (!e.active()) continue;
      const d = e.distTo(b);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  updatePlay(dt) {
    const s = this.state, f = s.flags;
    s.playTime += dt;
    this.lockT = Math.max(0, this.lockT - dt);
    const ctl = this.controlsEnabled();

    // era input / peek
    const peeking = ctl && f.hasAmulet && input.held('peek');
    if (peeking) {
      if (this.peekTarget === null) this.peekTarget = this.era === ERA.PRESENT ? ERA.FUTURE : ERA.PRESENT;
      if (input.hit('back') && this.era > 0) this.peekTarget = this.era - 1;
      if (input.hit('forward') && this.era < 2) this.peekTarget = this.era + 1;
    } else {
      this.peekTarget = null;
      if (ctl && input.hit('back')) this.tryShift(this.era - 1);
      if (ctl && input.hit('forward')) this.tryShift(this.era + 1);
    }

    // meter
    if (this.era !== ERA.PRESENT && this.mode === 'play') {
      this.meter -= dt / DRAIN_TIME;
      if (this.meter < 0.25) {
        this.warnT -= dt;
        if (this.warnT <= 0) {
          audio.sfx('tick');
          this.warnT = this.meter < 0.12 ? 0.25 : 0.5;
        }
      }
      if (this.meter <= 0) {
        this.meter = 0;
        this.snapBack();
      }
    } else this.meter = Math.min(1, this.meter + dt / 2.5);
    this.hud.setMeter(this.meter, this.era);

    // entities
    this.player.update(dt);
    if (this.era === ERA.PRESENT && this.player.body.onGround) this.lastSafePresent = { x: this.player.body.x, y: this.player.body.y, z: this.player.body.z };
    for (const e of this.entities) if (e.alive && (e.active() || e instanceof Pushable)) e.update(dt);
    this.entities = this.entities.filter((e) => e.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.pickups = this.pickups.filter((e) => e.alive);

    // interaction
    const near = ctl ? this.nearestInteractive() : null;
    // with nothing to talk to, offer the Stasis Seal when something sealable is right here
    // ...or, standing on one of your echoes, offer to dispel it
    const seal = ctl && !near ? this.abilities.sealTarget() : null;
    const echo = ctl && !near && !seal ? this.abilities.dispelTarget() : null;
    if (seal) this.hud.showPrompt(`Seal ${seal.name}`, 'seal');
    else if (echo) this.hud.showPrompt('Dispel echo', 'dispel');
    else this.hud.showPrompt(near ? (near.prompt ? near.prompt() : 'Interact') : null);
    if (echo && input.hit('interact')) this.abilities.dispel(echo);
    if (near && ctl && input.hit('interact')) {
      this.mode = 'dialogue';
      const p = near instanceof NPC ? talk(this, near) : interact(this, near);
      Promise.resolve(p).then(() => {
        if (this.mode === 'dialogue') this.mode = 'play';
        this.lockT = 0.2;
      });
    }

    if (input.hit('hint') && ctl) this.showHint();
    this.abilities.update(dt, ctl);

    // inventory & pause
    if (input.hit('inventory') && ctl) {
      this.invOpen = !this.invOpen;
      showInventoryPanel(this.state.inventory, this.invOpen, this.favourList());
    }

    // resonance
    if (this.resonance > 0) {
      this.resonance -= dt;
      this.hud.setResonance(Math.max(0, this.resonance / RESONANCE_TIME));
      if (this.resonance <= 0) this.failResonance();
    }

    // first time a hostile creature gets close, remind the player how to fight
    if (!f.attackHint && ctl) {
      const b = this.player.body;
      if (this.enemies.some((e) => e.active() && !e.dead && Math.abs(e.body.x - b.x) < 7)) {
        f.attackHint = true;
        this.hud.toast(`Something hostile is nearby! ${touchActive() ? 'Tap <b>Attack</b>' : 'Press <kbd>X</kbd>'} to swing your wrench.`, 5500);
      }
    }

    // Sun Terrace hints: point at the foundation in the Present, at the block in the Past
    {
      const bx = this.player.body.x, t = L.pillarTarget, bp = s.blockPos;
      const solved = bp.x === t.x && bp.z === t.z;
      if (!solved && !f.terraceHint && this.era !== ERA.PAST && bx > 137 && bx < 146 && ctl) {
        f.terraceHint = true;
        this.hud.toast('The terrace is too high to climb. There\'s an old, empty foundation stone right next to the bench, as if something was meant to stand there long ago...', 7000);
      }
      if (!solved && !f.blockHint2 && this.era === ERA.PAST && Math.abs(bx - (bp.x + 0.5)) < 5 && ctl) {
        f.blockHint2 = true;
        this.hud.toast('An ancient carved block, and a glowing foundation outline beside the terrace. Walk into the block to push it.', 7000);
      }
    }

    // goal line: a gentle nudge, with the direct answer behind the Hint button (or G)
    const { goal, hint } = currentGoal(this);
    const key = goal + '|' + hint;
    if (key !== this.goalText) {
      const first = this.goalText === undefined;
      this.goalText = key;
      document.getElementById('goal-text').innerHTML = goal;
      document.getElementById('goal-hint').innerHTML = hint;
      this.showHint(false);
      if (!first) {
        const box = document.getElementById('goal');
        box.classList.remove('new');
        void box.offsetWidth; // restart the highlight animation
        box.classList.add('new');
      }
    }

    // area banner
    const bx = this.player.body.x;
    let ai = 0;
    for (let i = 0; i < AREAS.length; i++) if (bx >= AREAS[i].x) ai = i;
    if (ai !== this.areaIdx) {
      const first = this.areaIdx === -1;
      this.areaIdx = ai;
      if (!first || this.mode === 'play') this.hud.showBanner(AREAS[ai].name, this.era);
    }
  }

  // ------------------------------------------------------------------ kindness side quests
  favourList() {
    const s = this.state;
    return FAVOURS.filter((fv) => s.flags[fv.start] || s.kindness.includes(fv.id)).map((fv) => ({
      title: fv.title,
      text: s.kindness.includes(fv.id) ? fv.done : fv.todo,
      done: s.kindness.includes(fv.id),
    }));
  }

  startFavour(id) {
    const fv = FAVOURS.find((x) => x.id === id);
    if (!fv) return;
    audio.sfx('ui');
    this.hud.toast(`<b>New favour:</b> ${fv.title}<br><small>${fv.todo} (See Items.)</small>`, 6500);
    this.save();
  }

  completeKindness(id) {
    const s = this.state;
    if (s.kindness.includes(id)) return;
    s.kindness.push(id);
    const p = this.player;
    p.maxHp = BASE_HP + s.kindness.length;
    p.hp = p.maxHp;
    this.hud.setHearts(p.hp, p.maxHp);
    audio.sfx('heal');
    audio.sfx('checkpoint');
    const b = p.body;
    this.bursts.emit(b.x, b.y + 1, b.z, 40, { color: [0xff6080, 0xffd070, 0xffffff], speed: 3.5, life: 1 });
    this.hud.toast(`<b>A kindness repaid.</b> Your heart grows stronger: +1 heart. <small>(${s.kindness.length}/${FAVOURS.length} favours)</small>`, 6000);
    this.save();
  }

  // ------------------------------------------------------------------ cause-and-effect time-lapse
  /**
   * Show the consequence of something the player just did: hold the camera on `focus`, spin
   * the sky through days and nights while the years count up, ripple into era `to` where the
   * result grows (`grow`: feature ids scaled up from the ground) or drops into place (`drop`),
   * then ripple back. Any tap / key after a moment skips ahead.
   */
  async timelapse({ to, focus, years, caption, grow = [], drop = [], effect = null, erode = null }) {
    if (this.lapse || (this.mode !== 'play' && this.mode !== 'dialogue')) return;
    const from = this.era;
    const r = this.renderer;
    const overlay = document.getElementById('timelapse');
    const yearsEl = document.getElementById('lapse-years');
    const p = this.player;
    this.mode = 'cutscene';
    letterbox(true);
    document.body.classList.add('lapse');
    p.mesh.visible = p.shadow.visible = false; // Vivienne stays in her own age
    this.hud.showPrompt(null);

    let skip = false;
    const wantSkip = () => (skip = true);
    const skipKeys = (e) => ['Space', 'Enter', 'KeyF', 'KeyX', 'Escape'].includes(e.code) && wantSkip();
    const wait = (ms) => new Promise((res) => {
      const t0 = performance.now();
      const tick = () => (skip || performance.now() - t0 >= ms ? res() : requestAnimationFrame(tick));
      tick();
    });

    const lapse = { focus: new THREE.Vector3(...focus), t: 0, spin: 0, grow: [], drop: [] };
    this.lapse = lapse;
    const targets = (ids) => this.world.features.filter((f) => ids.includes(f.id)).flatMap((f) => f.meshes[to] || []);

    overlay.querySelector('.lapse-caption').textContent = caption;
    overlay.querySelector('.lapse-era').textContent = `${ERA_LABEL[from]}  →  ${ERA_LABEL[to]}`;
    overlay.style.setProperty('--lapse-color', ERA_COLORS[to]);
    yearsEl.textContent = '+0 years';
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('in'));

    await wait(650); // camera settles on the spot
    setTimeout(() => {
      window.addEventListener('keydown', skipKeys);
      window.addEventListener('pointerdown', wantSkip);
    }, 300);

    // ripple into the future era; the consequence starts small and grows in
    this.post.capture();
    this.applyEra(to);
    this.post.startTransition(ERA_RING[to]);
    audio.sfx('shift', { era: to });
    lapse.grow = targets(grow);
    lapse.drop = targets(drop);
    for (const m of lapse.grow) m.scale.y = 0.001;
    for (const m of lapse.drop) m.position.y = 5;
    // erosion: the rock that will be worn away starts whole and crumbles, nearest the water first
    let rock = null;
    if (erode) {
      const pieces = [];
      const [ox, oy, oz] = erode.origin;
      for (const [cx, cy, cz] of erode.cells)
        for (let i = 0; i < 8; i++) {
          const x = cx + 0.25 + (i & 1) * 0.5, y = cy + 0.25 + ((i >> 1) & 1) * 0.5, z = cz + 0.25 + ((i >> 2) & 1) * 0.5;
          pieces.push({ x, y, z, d: Math.hypot(x - ox, (y - oy) * 0.8, z - oz) + Math.random() * 1.2 });
        }
      pieces.sort((a, b) => a.d - b.d);
      const pal = [0xc9935a, 0xbf8850, 0x9a6a3a, 0xd29e64, 0x7f8a70];
      rock = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ roughness: 0.95 }), pieces.length);
      const mtx = new THREE.Matrix4(), col = new THREE.Color();
      pieces.forEach((pc, i) => {
        mtx.makeTranslation(pc.x, pc.y, pc.z);
        rock.setMatrixAt(i, mtx);
        rock.setColorAt(i, col.setHex(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(0.85 + Math.random() * 0.25));
      });
      rock.castShadow = rock.receiveShadow = true;
      this.world.groups[to].add(rock);
      lapse.rock = { mesh: rock, pieces, gone: 0 };
    }

    const DUR = 2.4;
    lapse.update = (dt) => {
      lapse.t = Math.min(DUR, lapse.t + dt * (skip ? 6 : 1));
      const k = lapse.t / DUR;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
      yearsEl.textContent = `+${Math.round(e * years).toLocaleString()} years`;
      // days and nights racing past
      const night = Math.max(0, Math.sin(k * Math.PI * 10)) * (1 - k) * 0.9;
      r.sun.intensity = r.atmos.sunI * (1 - night * 0.85);
      r.hemi.intensity = r.atmos.hemiI * (1 - night * 0.55);
      r.skyUniforms.stars.value = night;
      const g = 1 - Math.pow(1 - Math.min(1, k * 1.15), 3); // growth ease-out
      for (const m of lapse.grow) m.scale.y = Math.max(0.001, g);
      for (const m of lapse.drop) m.position.y = 5 * Math.max(0, 1 - Math.min(1, k * 1.6) ** 2);
      if (lapse.rock) {
        const R = lapse.rock, target = Math.floor(Math.min(1, k * 1.1) ** 1.2 * R.pieces.length);
        const zero = new THREE.Matrix4().makeScale(0, 0, 0);
        while (R.gone < target) {
          const pc = R.pieces[R.gone];
          R.mesh.setMatrixAt(R.gone, zero);
          if (R.gone % 3 === 0) this.bursts.emit(pc.x, pc.y, pc.z, 2, { color: [0xd8c09a, 0x7fd8ff], speed: 1.6, life: 0.6, gravity: 5 });
          R.gone++;
        }
        R.mesh.instanceMatrix.needsUpdate = true;
      }
      if (Math.random() < dt * 14) {
        const f = lapse.focus;
        if (effect === 'carve') this.bursts.emit(f.x - 0.5 + Math.random(), 0.5 + Math.random() * 2, f.z - 1 + Math.random() * 2, 3, { color: [0x7fd8ff, 0xd8c09a], speed: 2.5, life: 0.7, gravity: 4 });
        else if (effect === 'shine') this.bursts.emit(f.x - 1 + Math.random() * 2, f.y + Math.random(), f.z, 2, { color: [0xffd070, 0xffffff], speed: 1.2, life: 0.8, gravity: -0.5, glow: 2 });
        else this.bursts.emit(f.x - 1.5 + Math.random() * 3, f.y + Math.random() * 3, f.z - 1 + Math.random() * 2, 1, { color: [0xffe6a0, 0x9aff7a], speed: 0.8, life: 0.9, gravity: -0.4 });
      }
    };
    await wait(DUR * 1000);
    lapse.t = DUR;
    lapse.update(0);
    lapse.update = null;
    if (rock) {
      rock.parent?.remove(rock);
      rock.geometry.dispose();
      rock.material.dispose();
    }
    r.applyAtmos(r.atmos);
    r.skyUniforms.stars.value = r.atmos.stars ?? 0;
    audio.sfx('checkpoint');
    await wait(1100); // admire the result

    // back to the player's own age
    overlay.classList.remove('in');
    this.post.capture();
    this.applyEra(from);
    this.post.startTransition(ERA_RING[from]);
    audio.sfx('shift', { era: from });
    window.removeEventListener('keydown', skipKeys);
    window.removeEventListener('pointerdown', wantSkip);
    this.lapse = null;
    p.mesh.visible = p.shadow.visible = true;
    await new Promise((res) => setTimeout(res, 450));
    overlay.hidden = true;
    document.body.classList.remove('lapse');
    letterbox(false);
    this.areaIdx = -1;
    this.mode = 'play';
    this.lockT = 0.3;
  }

  /** Reveal or hide the direct hint for the current goal. */
  showHint(on = document.getElementById('goal-hint').hidden) {
    document.getElementById('goal-hint').hidden = !on;
    const btn = document.getElementById('goal-hint-btn');
    btn.textContent = on ? 'Hide hint' : 'Hint';
    btn.setAttribute('aria-expanded', String(on));
  }

  /**
   * While the Clocktower is stopped, it stutters between the three ages: short bursts where
   * slices of the tower show another era. Bursts come faster as you get close, and faster
   * still once Era Keys are placed. It stops for good once the Tower is restarted.
   */
  updateTowerGlitch(dt) {
    const tu = this.post.time.uniforms;
    const g = (this.glitch ||= { t: 1, on: 0, era: 0, seedT: 0, era2: 0 });
    tu.glitch.value = 0;
    const r = this.renderer;
    const busy =
      this.state.flags.finished || this.mode === 'ending' || this.mode === 'credits' || this.lapse ||
      this.post.trans < 1 || this.post.peekAmt > 0.01 || this.blockFlashT > 0 || this.swipePeek || this.peekTarget !== null;
    const prox = Math.min(1, Math.max(0, (r.camTarget.x - (L.towerX0 - 16)) / 14));
    if (busy || prox <= 0) {
      g.on = 0;
      return;
    }
    const keys = Object.keys(this.sockets).length;
    g.t -= dt;
    if (g.on <= 0 && g.t <= 0) {
      g.on = 0.12 + Math.random() * (0.25 + keys * 0.08);
      g.t = (1.4 + Math.random() * 3.2) / (1 + keys * 0.8) / (0.5 + prox * 0.5);
      const others = [0, 1, 2].filter((e) => e !== this.era);
      g.era = others[Math.floor(Math.random() * others.length)];
      if (prox > 0.5) audio.sfx('glitch');
      if (!this.state.flags.towerGlitchSeen && !this.glitchExplaining && this.player.body.x > L.vaultDoorX1 && this.controlsEnabled()) this.explainTowerGlitch();
    }
    if (g.on <= 0) return;
    g.on -= dt;
    // stutter: reshuffle the slices a few times per burst, sometimes flipping era
    g.seedT -= dt;
    if (g.seedT <= 0) {
      g.seedT = 0.03 + Math.random() * 0.05;
      tu.glitchSeed.value = Math.random() * 100;
      if (Math.random() < 0.25) g.era = [0, 1, 2].filter((e) => e !== this.era)[Math.floor(Math.random() * 2)];
    }
    tu.glitch.value = prox * (0.25 + Math.random() * 0.3 + keys * 0.08);
    tu.glitchTint.value.setHex(ERA_RING[g.era]);
    // screen-space bounds of the tower
    const cam = r.camera, v = new THREE.Vector3();
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const cx of [L.towerX0, W]) for (const cy of [0.5, 23]) for (const cz of [-16, 7]) {
      v.set(cx, cy, cz).project(cam);
      const u = v.x * 0.5 + 0.5, w = v.y * 0.5 + 0.5;
      x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, w); y1 = Math.max(y1, w);
    }
    tu.glitchRect.value.set(Math.max(0, x0), Math.max(0, y0), Math.min(1, x1), Math.min(1, y1));
    if (x1 <= 0 || x0 >= 1) {
      tu.glitch.value = 0;
      return;
    }
    // render the other era into the shared "previous frame" target
    const groups = this.world.groups;
    groups.forEach((grp, i) => (grp.visible = i === g.era));
    this.post.capture();
    groups.forEach((grp, i) => (grp.visible = i === this.era));
  }

  /** The first time the stopped Tower stutters in front of you, Vivienne says what it is. */
  explainTowerGlitch() {
    this.glitchExplaining = true;
    const V = (text) => ({ who: 'vivienne', name: 'Vivienne', text });
    setTimeout(() => {
      this.glitchExplaining = false;
      if (this.mode !== 'play' || this.dialogue.active) return; // busy: try again on the next stutter
      this.state.flags.towerGlitchSeen = true;
      this.save();
      this.mode = 'dialogue';
      this.dialogue
        .run([
          V('Whoa! Did the Tower wall just flicker into another age?'),
          V("Its heart has stopped, so it's stuttering between the ages. Once I restart it, it should hold steady."),
        ])
        .then(() => {
          if (this.mode === 'dialogue') this.mode = 'play';
          this.lockT = 0.2;
        });
    }, 900);
  }

  renderPeek() {
    // a swipe in progress previews the era it's heading to, fading in with the drag
    const sp = this.swipePeek;
    const target = this.blockFlashT > 0 ? this.blockFlashEra : sp ? sp.target : this.peekTarget;
    const want = target !== null && target !== undefined ? (this.blockFlashT > 0 ? Math.min(1, this.blockFlashT * 2) : sp ? sp.amt : 1) : 0;
    this.post.peekAmt += (want - this.post.peekAmt) * 0.25;
    const tint = this.post.time.uniforms.peekTint.value;
    if (this.blockFlashT > 0) tint.setRGB(1.4, 0.35, 0.35);
    else tint.setRGB(0.6, 0.95, 1.0);
    if (this.post.peekAmt > 0.01 && target !== null && target !== undefined) {
      const groups = this.world.groups;
      groups.forEach((g, i) => (g.visible = i === target));
      this.post.capture();
      groups.forEach((g, i) => (g.visible = i === this.era));
    }
  }

  updateTitle(dt) {
    this.titleT += dt;
    const x = 16 + Math.sin(this.titleT * 0.08) * 10;
    this.renderer.camTarget.set(x, 1.5, 3);
    if (this.titleT > 6) {
      this.titleT = 0;
      this.titleEra = (this.titleEra + 1) % 3;
      this.post.capture();
      this.applyEra(this.titleEra);
      this.post.startTransition(ERA_RING[this.titleEra]);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.time += dt;
    this.blockFlashT = Math.max(0, this.blockFlashT - dt);

    if (this.mode === 'title' || this.mode === 'credits') {
      this.updateTitle(dt);
      if (this.mode === 'title') this.player.mesh.visible = this.player.shadow.visible = false;
    } else if (this.mode === 'play' || this.mode === 'dialogue' || this.mode === 'ending') {
      if (this.mode === 'play' || this.mode === 'dialogue') this.updatePlay(dt);
      else {
        this.player.update(dt);
        for (const e of this.entities) if (e.alive && e.active()) e.update(dt);
      }
    }

    const r = this.renderer;
    r.tickAtmos(dt);
    if (this.lapse) {
      r.updateCamera(dt, this.lapse.focus.clone(), [this.lapse.focus.x - 100, this.lapse.focus.x + 100]);
      this.lapse.update?.(dt);
    } else if (this.mode !== 'title' && this.mode !== 'credits') {
      const b = this.player.body;
      const lead = this.mode === 'play' ? this.player.facing * 1.3 + THREE.MathUtils.clamp(b.vx * 0.15, -0.8, 0.8) : 0;
      r.updateCamera(dt, new THREE.Vector3(b.x, Math.max(b.y, 0) + 0.6, b.z * 0.6 + 1.2), L.cameraBounds, lead);
    } else r.updateCamera(dt, r.camTarget.clone(), [r.camTarget.x - 100, r.camTarget.x + 100]);
    r.updateLights(this.world.lights[this.era], r.camTarget, this.time);
    r.tickShaders(this.time);
    this.ambient.update(dt, this.time, r.camTarget.x);
    this.bursts.update(dt);

    // depth-of-field focus: camera distance to the player (or the camera target on the title)
    const fp = this.lapse ? this.lapse.focus : this.player && this.mode !== 'title' ? new THREE.Vector3(this.player.body.x, this.player.body.y + 0.8, this.player.body.z) : r.camTarget;
    const focus = fp.clone().applyMatrix4(r.camera.matrixWorldInverse).z * -1;
    const gu = this.post.grade.uniforms;
    gu.hurt.value = Math.max(0, gu.hurt.value - dt * 2.5);
    this.renderPeek();
    this.updateTowerGlitch(dt);
    this.post.update(dt, this.time, focus);
    this.post.render();
    input.endFrame();
  }
}
