// The game itself, as every chapter plays it: modes, era shifting, the time lens, saving,
// fighting, favors, checkpoints and time-lapses. A chapter is a subclass (see
// src/chapters/<id>/game.js) that adds its own powers, set pieces and ending through the
// hooks gathered under "for a chapter to fill in" below.
import * as THREE from 'three';
import { input } from './core/input.js';
import { ERA, ERA_SHORT } from './core/util.js';
import { audio } from './audio/audio.js';
import { Renderer } from './render/renderer.js';
import { Post } from './render/post.js';
import { Ambient, Bursts } from './render/particles.js';
import { World, T } from './world/world.js';
import { hits } from './world/physics.js';
import { Player, NPC, Enemy, Warden, Searchlight, Pushable, Pickup, Interactable, Strikeable, Shrine } from './world/entities.js';
import { HUD, Dialogue, showInventoryPanel, setFade, letterbox } from './ui/ui.js';
import { touchActive } from './ui/touch.js';
import { chapter, theme, progress, content } from './chapter.js';
import { Kit } from './kit.js';
import { pickLock } from './ui/lockpick.js';

export const ERA_RING = theme.eraRing;
const ERA_COLORS = theme.eraCss;
export const BASE_HP = 5;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Short vibration on phones that support it (Android); silently ignored elsewhere. */
export function haptic(ms) {
  try {
    if (touchActive()) navigator.vibrate?.(ms);
  } catch {
    /* not allowed here */
  }
}

/** What every chapter's save starts from. */
export function baseState() {
  return {
    flags: {},
    inventory: [],
    taken: [],
    cogs: [],
    kindness: [], // completed favors (see FAVORS in the chapter's story.js)
    checkpoint: 0,
    playTime: 0,
  };
}

export class Game {
  /**
   * ch: the chapter's content: { L, buildLevel, SPAWNS, CHECKPOINTS, AREAS, COG_TOTAL, talk,
   * interact, struck, ITEMS, INTRO, FAVORS, currentGoal }.
   */
  constructor(container, ch) {
    // Vivienne's own lock pick, in every chapter (see pickLock)
    ch.ITEMS.lockpick ||= {
      name: "Vivienne's Lock Pick",
      desc: 'A bent hairpin and a sliver of watch-spring. She taught herself, her first winter in the workshop: Donald Eugene keeps everything locked.',
    };
    this.ch = ch;
    this.L = ch.L;
    Object.assign(content, { ITEMS: ch.ITEMS, FAVORS: ch.FAVORS, COG_TOTAL: ch.COG_TOTAL }); // for the shared UI and entities
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
    this.lockT = 0;
    this.peekTarget = null;
    this.reachEra = null; // the age the lens is open on, in a chapter where it can be reached through
    this.shiftFrom = null; // the era being left, while a shift is still playing
    this.blockFlashT = 0;
    this.areaIdx = -1;
    this.kinds = { interact: Interactable, strike: Strikeable };
    this.state = this.newState();
    this.kit = new Kit(this);
    this.setup();
    this.buildWorld();
    this.clock = new THREE.Clock();
    this.titleT = 0;
    this.titleEra = 1;
    this.applyEra(ERA.PRESENT, true);
    this.renderer.camTarget.set(16, 1, 3);
  }

  // ------------------------------------------------------------------ for a chapter to fill in
  /** A fresh save for this chapter. */
  newState() {
    return baseState();
  }
  /** Create the chapter's own systems (before the world is built). */
  setup() {}
  /** The world has just been (re)built: hook the chapter's systems up to it. */
  attach() {}
  /** Set anything about the look of the world that depends on the story so far. */
  setMood() {}
  /** Show or hide the chapter's ability buttons and hints to match the save. */
  syncBody() {}
  /** The opening cutscene is over: first-steps toasts. */
  afterIntro() {}
  /** Could this saved game be picked up again? */
  canContinue() {
    return true;
  }
  /** A save has just been loaded into this.state: patch up anything an older version left out. */
  migrate() {}
  welcomeBack() {
    return 'Welcome back, Vivienne.';
  }
  /** May the player travel to `target` right now? (Say why not, if not.) */
  canShift() {
    return true;
  }
  /** True while something other than the player's own legs is moving them. */
  get rewinding() {
    return false;
  }
  /** Something has cut in (a fall, a capture, a death): drop whatever the player was in the middle of. */
  interrupt() {}
  /** A Strikeable took a hit. */
  onStrike() {}
  /** A Lost Cog was just picked up. */
  onCog() {}
  /** An item was just picked up off the ground. */
  onCollected() {}
  /** How high above where an enemy fell its heart floats. */
  heartY(y) {
    return y + 0.1;
  }
  /** Somewhere a player sent back from a hazard must never be put: a spot with no way out. */
  unsafeSpot() {
    return false;
  }
  /** How fast time runs for a machine at (x, y): 1 unless the chapter can bend it. */
  tempoAt() {
    return 1;
  }
  /** Toasts ([text, ms]) the shared entities show. */
  get lines() {
    return {
      spotted: ['Spotted! Break its line of sight, or slip into another age.', 3500],
      searchlight: ['Caught in a searchlight! The Warden is coming.', 4000],
    };
  }
  /** The splash when the player falls into a hazard. */
  hazardBurst() {
    return [0x9fe0ff, 0xffffff];
  }
  /** The player has just been put back at `spot` after a hazard... */
  onHazardPlaced() {}
  /** ...and has lost their heart for it. */
  onHazardDone() {}
  /** Where the Warden throws you out to (x, in the Present). */
  wardenExitX() {
    return this.L.start.x;
  }
  /** Back at the shrine after running out of hearts. */
  revive() {}
  /** What an age is called (a chapter's story may rename one). */
  eraLabel(era) {
    return theme.eraNames[era];
  }
  /** The chapter's own per-frame play: input, powers, set pieces. Must be overridden. */
  updatePlay() {}
  /** Screen effects of the chapter's own, each frame, before the picture is finished. */
  updateEffects() {}
  /** The chapter's ending. */
  async runEnding() {}

  // ------------------------------------------------------------------ world
  buildWorld() {
    if (this.world) {
      for (const g of this.world.groups) this.scene.remove(g);
      for (const s of this.shrines || []) s.remove();
      if (this.player) this.scene.remove(this.player.mesh, this.player.shadow);
    }
    this.setMood();
    this.world = new World();
    this.ch.buildLevel(this.world, this.state);
    for (const g of this.world.groups) this.scene.add(g);
    this.entities = [];
    this.npcs = [];
    this.enemies = [];
    this.pushables = [];
    this.pickups = [];
    this.interactables = [];
    this.strikeables = [];
    for (const s of this.ch.SPAWNS) {
      let e;
      if (s.type === 'npc') this.npcs.push((e = new NPC(this, s)));
      else if (s.type === 'enemy') this.enemies.push((e = new Enemy(this, s)));
      else if (s.type === 'warden') e = this.warden = new Warden(this, s);
      else if (s.type === 'searchlight') e = new Searchlight(this, s);
      else if (s.type === 'pushable') {
        const pos = this.state[s.posKey];
        this.pushables.push((e = new Pushable(this, { ...s, x: pos.x, z: pos.z })));
        e.start = { x: s.x, z: s.z };
      } else if (s.type === 'pickup') this.pickups.push((e = new Pickup(this, s, s.item)));
      else if (s.type === 'cog') this.pickups.push((e = new Pickup(this, s, 'cog')));
      else if (s.type === 'interact') this.interactables.push((e = new this.kinds.interact(this, s)));
      else if (s.type === 'strike') this.strikeables.push((e = new this.kinds.strike(this, s)));
      if (e) this.entities.push(e);
    }
    this.shrines = this.ch.CHECKPOINTS.map((c) => new Shrine(this, c));
    this.entities.push(...this.shrines);
    this.player = new Player(this);
    this.player.maxHp = this.player.hp = this.maxHearts();
    this.placeAtShrine();
    this.attach();
  }

  placeAtShrine() {
    const cp = this.ch.CHECKPOINTS[this.state.checkpoint] || this.ch.CHECKPOINTS[0];
    this.player.place(cp.x + (cp.dx ?? 1.2), cp.y ?? 0, cp.pz ?? 3.5);
  }

  refreshWorld() {
    this.world.__state = this.state;
    this.world.refreshFeatures(this.state);
  }

  // ------------------------------------------------------------------ flow
  startNew() {
    progress.clearSlot(chapter.id);
    this.state = this.newState();
    this.packApron();
    this.buildWorld();
    this.beginPlay();
    this.player.place(this.L.start.x, 0, this.L.start.z);
    this.renderer.camTarget.set(this.L.start.x + 4, 1, 3);
    this.cutscene(this.ch.INTRO).then(() => {
      this.afterIntro();
      const carried = progress.carriedHearts(chapter.id);
      if (carried) setTimeout(() => this.hud.toast(`The kindness you did in earlier chapters comes with you: <b>+${carried} ${carried === 1 ? 'heart' : 'hearts'}</b>.`, 5000), 13500);
    });
  }

  continueGame() {
    const saved = progress.slot(chapter.id);
    if (!saved || !this.canContinue(saved)) return this.startNew();
    this.state = Object.assign(this.newState(), JSON.parse(JSON.stringify(saved)));
    this.migrate();
    this.packApron();
    this.buildWorld();
    this.beginPlay();
    this.hud.toast(this.welcomeBack());
  }

  hasSave() {
    const saved = progress.slot(chapter.id);
    return !!saved?.flags && this.canContinue(saved);
  }

  beginPlay() {
    this.mode = 'play';
    this.applyEra(ERA.PRESENT, true);
    this.post.trans = 1;
    this.post.peekAmt = 0;
    this.hud.show(true);
    this.hud.showAmulet(!!this.state.flags.hasAmulet);
    this.hud.setHearts(this.player.hp, this.player.maxHp);
    this.hud.setInventory(this.state.inventory);
    this.hud.setCogs(this.state.cogs.length);
    this.hud.setResonance(null);
    this.syncBody();
    this.areaIdx = -1;
    audio.setEra(ERA.PRESENT);
    audio.setMusicVolume(0.55);
  }

  /** Write this chapter's progress into the save all the chapters share. */
  save() {
    progress.setSlot(chapter.id, this.state);
  }

  /** The chapter's story is told: later chapters open, whatever becomes of this one's save. */
  finishStory() {
    this.state.flags.finished = true;
    progress.markDone(chapter.id);
    if (chapter.keepsSave) this.save();
    else progress.clearSlot(chapter.id);
  }

  async cutscene(lines) {
    letterbox(true);
    this.mode = 'dialogue';
    await this.dialogue.run(lines);
    letterbox(false);
    if (this.mode === 'dialogue') this.mode = 'play';
    this.lockT = 0.25;
  }

  /**
   * Somebody else's change washes over the world: Donald Eugene, rewriting it with the other
   * half of the Chronoheart. Everyone else lives in the new version; only Vivienne notices.
   * `apply` sets whatever flags the change is made of; `lines` is her reaction.
   */
  async ripple({ at, apply, lines = [] }) {
    if (this.mode !== 'play' || this.dialogue.active || this.lapse) return false;
    this.mode = 'cutscene';
    this.hud.showPrompt(null);
    audio.sfx('shift', { era: this.era });
    this.renderer.shake = Math.max(this.renderer.shake, 0.3);
    this.bursts.emit(at[0], at[1], at[2], 60, { color: [0xffd070, 0xfff6e0], speed: 3.5, life: 1.1, gravity: -0.5, glow: 1 });
    setFade(0.6, '#fff6e0');
    await wait(180);
    apply();
    this.refreshWorld();
    setFade(0);
    await wait(500);
    this.mode = 'play';
    if (lines.length) await this.cutscene(lines);
    this.save();
    return true;
  }

  /**
   * The Cog Finder, always on: which way the nearest Lost Cog still out there is, how far, and
   * which age it is in. (Through the time lens, a cog in the age it shows still sends up gold.)
   */
  updateCogCompass(dt) {
    const el = (this.compassEl ||= document.getElementById('cog-compass'));
    this.compassT = (this.compassT || 0) - dt;
    if (this.compassT > 0) return;
    this.compassT = 0.25;
    const b = this.player.body;
    let best = null, bd = Infinity;
    if (this.state.inventory.includes('finder')) {
      for (const p of this.pickups) {
        if (p.spec.type !== 'cog' || !p.alive || this.state.cogs.includes(p.id) || (p.available && !p.available())) continue;
        const d = Math.hypot(p.x - b.x, (p.y - b.y) * 1.5, (p.z - b.z) * 0.6);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
    }
    el.hidden = !best;
    if (!best) return;
    const dx = best.x - b.x, dy = best.y - b.y, dz = best.z - b.z;
    // left or right along the road; up, down or into the scene when it's right here
    const ang = Math.abs(dx) > 1.5 ? (dx > 0 ? 0 : 180) : Math.abs(dy) > 1.2 ? (dy > 0 ? -90 : 90) : Math.abs(dz) > 1.5 ? (dz < 0 ? -90 : 90) : null;
    el.querySelector('.cc-arrow').style.transform = ang === null ? 'scale(0.7)' : `rotate(${ang}deg)`;
    el.querySelector('.cc-arrow').innerHTML = ang === null ? '&#9679;' : '&#9654;';
    const other = best.era !== this.era;
    el.classList.toggle('other-age', other);
    el.querySelector('.cc-text').innerHTML = `${Math.round(bd)} m${other ? ` · <b>${this.eraLabel(best.era)}</b>` : ''}`;
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

  /**
   * Switch to `era`, with the age you're leaving visibly rebuilding into the new one. It spreads
   * out from `at` (a world position; the middle of the screen if not given). lapse: see timelapse().
   */
  shiftEra(era, at = null, lapse = false) {
    const from = this.era;
    let center;
    if (at) {
      const v = at.clone().project(this.renderer.camera);
      center = [THREE.MathUtils.clamp(v.x * 0.5 + 0.5, 0, 1), THREE.MathUtils.clamp(v.y * 0.5 + 0.5, 0, 1)];
    }
    this.applyEra(era);
    this.post.startTransition(ERA_RING[era], { center, dir: era > from ? 1 : -1, lapse });
    this.renderer.atmosDur = lapse || this.post.shiftTime;
    this.shiftFrom = from;
    this.captureEra(from);
  }

  /** Render `era` (its world, its people, its lamps) into the post-processing "other age" target. */
  captureEra(era) {
    const groups = this.world.groups, r = this.renderer;
    const lyra = this.peekTarget !== null && this.npcs?.find((n) => n.id.startsWith('michelle') && n.active());
    if (lyra) this.scene.add(lyra.group);
    groups.forEach((g, i) => (g.visible = i === era));
    r.updateLights(this.world.lights[era], r.camTarget, this.time);
    this.post.capture();
    groups.forEach((g, i) => (g.visible = i === this.era));
    if (lyra) groups[lyra.era].add(lyra.group);
    r.updateLights(this.world.lights[this.era], r.camTarget, this.time);
  }

  tryShift(target) {
    if (target < 0 || target > 2 || target === this.era || !this.canShift(target)) return;
    if (this.post.trans < 0.27) return;
    const b = this.player.body;
    if (hits(this.world, target, b)) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.blockFlashT = 0.7;
      this.blockFlashEra = target;
      if (!this.state.flags.blockHint) {
        this.state.flags.blockHint = true;
        this.hud.toast(`Something's in the way in the ${ERA_SHORT[target]}. Step aside and try again.`, 3500);
      }
      return;
    }
    if (this.overHazard(target) || !this.groundBelow(target)) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.blockFlashT = 0.7;
      this.blockFlashEra = target;
      this.hud.toast(`Nothing to stand on here in the ${ERA_SHORT[target]}.`, 3000);
      return;
    }
    this.doShift(target);
  }

  /** Something to land on within a few cells below the player in `era`? (no switching into a long fall) */
  groundBelow(era) {
    const b = this.player.body, x = Math.floor(b.x), z = Math.floor(b.z);
    for (let y = Math.floor(b.y + 0.01); y >= Math.floor(b.y) - 3; y--) {
      const c = this.world.cell(era, x, y, z);
      if (c === T.SOLID || c === T.WATER || c === T.LADDER) return true;
    }
    return false;
  }

  /** True if the first non-air cell below the player in `era` is a hazard (a deep river, sinking mud...). */
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
    const b = this.player.body;
    this.shiftEra(target, new THREE.Vector3(b.x, b.y + 0.8, b.z));
    audio.sfx('shift', { era: target });
    this.bursts.emit(b.x, b.y + 0.8, b.z, 40, { color: [ERA_RING[target], 0xffffff], speed: 5, life: 0.6, gravity: 0, glow: 2.5 });
    // a moment to get your bearings: nothing can hurt or notice you right after you arrive
    this.shiftGrace = 1.5;
  }

  // ------------------------------------------------------------------ gameplay hooks
  playerAttack(x, y, z, facing) {
    for (const e of this.enemies) {
      if (!e.active() || e.dead) continue;
      const b = e.body;
      const h = e.cfg ? e.cfg.h : b.h;
      if (Math.abs(b.x - x) < 0.8 + b.hw && Math.abs(b.z - z) < 0.9 && y > b.y - 0.6 && y < b.y + h + 0.6) e.damage(1, facing);
    }
    // someone a Stasis wave is holding: a wrench brings them straight out of it
    for (const n of this.npcs) {
      if (n.active() && n.stasisT > 0 && n.stasisT < 1e5 && Math.abs(n.x - x) < 1 && Math.abs(n.z - z) < 1 && y > n.y - 0.5 && y < n.y + 2) this.kit.struckHeld(n);
    }
    this.onAttack?.(x, y, z, facing);
    for (const s of this.strikeables) {
      if (!s.struckAt(x, y, z)) continue;
      // where the lens can be reached through, and is open on its age, the wrench goes through
      if (s.era === this.reachEra && s.spec.lens && s.available()) s.strike();
      else if (s.active() && !s.spec.lensOnly) s.strike();
    }
  }

  /** A Strikeable has taken its last hit: the story says what happens. */
  strikeDone(s) {
    this.mode = 'dialogue';
    // (finally: a story bug must never leave the player stuck in 'dialogue')
    Promise.resolve(this.ch.struck(this, s)).finally(() => {
      if (this.mode === 'dialogue') this.mode = 'play';
      this.lockT = 0.2;
    });
  }

  /** Something close by that wants the wrench: in this age, or (lens = an era) through the lens. */
  nearestStrike(lens = null) {
    const b = this.player.body;
    return this.strikeables.find((s) => (lens === null ? s.active() && !s.spec.lensOnly : s.era === lens && s.spec.lens && s.available()) && s.distTo(b) < 2.1) || null;
  }

  /** Talk to someone, or use something: the chapter's story takes it from here. */
  use(target) {
    this.mode = 'dialogue';
    const p = target instanceof NPC ? this.ch.talk(this, target) : this.ch.interact(this, target);
    Promise.resolve(p).finally(() => {
      if (this.mode === 'dialogue') this.mode = 'play';
      this.lockT = 0.2;
    });
  }

  /** Walking into a pushable block at cell-edge `dir`: true while it's being pushed (or can't be). */

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

  /** A pushed block has come to rest. */
  onPushed(p) {
    this.state[p.spec.posKey] = { x: p.cx, z: p.cz };
  }

  collect(p) {
    const s = this.state;
    if (p.spec.type === 'cog') {
      s.cogs.push(p.id);
      audio.sfx('cog');
      this.hud.setCogs(s.cogs.length);
      this.hud.toast(`<b>Lost Cog found!</b> (${s.cogs.length}/${this.ch.COG_TOTAL})`);
      this.bursts.emit(p.x, p.y, p.z, 30, { color: [0xffd070, 0xffffff], speed: 4, life: 0.8 });
      this.onCog();
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
    this.onCollected(p);
  }

  giveItem(item) {
    this.state.inventory.push(item);
    this.hud.setInventory(this.state.inventory);
    const it = this.ch.ITEMS[item];
    audio.sfx(it.key ? 'key' : 'pickup');
    this.hud.toast(`${it.key ? `${theme.keyBadge}:` : 'Got:'} <b>${it.name}</b>`, 3000);
  }

  /** What she always has on her: the lock pick. */
  packApron() {
    if (!this.state.inventory.includes('lockpick')) this.state.inventory.unshift('lockpick');
  }

  /**
   * One of Donald Eugene's locks (see src/ui/lockpick.js), with the lock pick: true once it
   * gives. He never hands anything over for good, so everything of his she finds is locked.
   */
  async pickLock(name, pins = 3) {
    this.hud.showPrompt(null);
    const ok = await pickLock({ pins, name, touch: touchActive() });
    this.lockT = 0.3;
    if (!ok) this.hud.toast('You can come back to it.', 2500);
    return ok;
  }

  /** One of his strongboxes: say what it is, pick it, and remember it's open. True once it is. */
  async unlockChest(flag, name, pins, lines = []) {
    const f = this.state.flags;
    if (f[flag]) return true;
    if (lines.length) await this.dialogue.run(lines);
    if (!(await this.pickLock(name, pins))) return false;
    f[flag] = true;
    this.save();
    return true;
  }

  removeItem(item) {
    const i = this.state.inventory.indexOf(item);
    if (i >= 0) this.state.inventory.splice(i, 1);
    this.hud.setInventory(this.state.inventory);
  }

  spawnHeart(era, x, y, z) {
    const h = new Pickup(this, { type: 'heart', id: 'heart' + Math.random(), era, x, y: this.heartY(y), z }, 'heart');
    this.pickups.push(h);
    this.entities.push(h);
  }

  activateCheckpoint(id) {
    this.state.checkpoint = id;
    this.player.heal(this.player.maxHp);
    audio.sfx('checkpoint');
    if (!this.state.flags.shrineHint) {
      this.state.flags.shrineHint = true;
      this.hud.toast('Clock shrines save your progress.', 3000);
    }
    const c = this.ch.CHECKPOINTS[id];
    this.bursts.emit(c.x, (c.y ?? 0) + 1.8, c.z, 30, { color: [0x7ff6ff, 0xffd070], speed: 3, life: 0.8 });
    this.save();
  }

  onHazard() {
    if (this.respawning || this.mode !== 'play' || this.rewinding) return;
    this.respawning = true;
    audio.sfx('splash');
    this.interrupt();
    const b = this.player.body;
    this.bursts.emit(b.x, b.y + 0.5, b.z, 24, { color: this.hazardBurst(), speed: 4, life: 0.6 });
    // straight back to the last safe spot, unless the world has changed under it since (a
    // dry hollow that's a pond now): then the shrine
    let s = [this.player.lastSafe, this.player.lastGround].find((p) => p && this.isSafeSpot(p));
    if (!s) {
      const cp = this.ch.CHECKPOINTS[this.state.checkpoint];
      s = { x: cp.x + (cp.dx ?? 1.2), y: cp.y ?? 0, z: cp.pz ?? 3.5, era: ERA.PRESENT };
    }
    this.player.place(s.x, s.y, s.z);
    if (s.era !== this.era) this.applyEra(s.era, true);
    this.onHazardPlaced(s);
    this.player.body.vx = this.player.body.vy = this.player.body.vz = 0;
    this.player.state = 'normal';
    // lose a heart, without the usual knockback (that could shove you straight back in)
    if (!this.godMode) {
      this.player.hp = Math.max(0, this.player.hp - 1);
      this.player.invuln = 1.1;
      audio.sfx('hurt');
      this.hud.setHearts(this.player.hp, this.player.maxHp);
    }
    this.lockT = 0.25;
    setFade(0.45, '#000');
    setTimeout(() => setFade(0), 90);
    this.respawning = false;
    this.onHazardDone();
    if (this.player.hp <= 0) this.onDeath();
  }

  /** The Warden got you: lose a heart and land back outside its yard, in the Present. */
  caughtByWarden() {
    if (this.respawning || this.rewinding) return;
    this.interrupt();
    audio.sfx('hurt');
    this.renderer.shake = 0.6;
    if (!this.godMode) {
      this.player.hp = Math.max(0, this.player.hp - 1);
      this.hud.setHearts(this.player.hp, this.player.maxHp);
    }
    this.player.invuln = 1.5;
    this.player.place(this.wardenExitX(), 0, 3.5);
    this.applyEra(ERA.PRESENT, true);
    this.warden?.reset();
    setFade(0.6, '#200008');
    setTimeout(() => setFade(0), 160);
    this.lockT = 0.4;
    this.hud.toast("Caught! Stay out of the Warden's sight cone.", 3500);
    if (this.player.hp <= 0) this.onDeath();
  }

  /** Solid ground underneath, nothing in the way, and no hazard where you'd stand. */
  isSafeSpot(s) {
    const w = this.world, fx = Math.floor(s.x), fy = Math.floor(s.y + 0.01), fz = Math.floor(s.z);
    if (w.cell(s.era, fx, fy - 1, fz) !== T.SOLID) return false;
    if (w.cell(s.era, fx, fy, fz) === T.HAZARD) return false;
    return !hits(w, s.era, { ...this.player.body, x: s.x, y: s.y, z: s.z });
  }

  onDeath() {
    if (this.mode !== 'play') return;
    this.mode = 'dead';
    this.interrupt();
    setFade(1, '#05040a', 'Time rewinds...');
    audio.setMusicVolume(0.15);
    setTimeout(() => {
      this.placeAtShrine();
      this.player.hp = this.player.maxHp;
      this.player.invuln = 1.5;
      this.applyEra(ERA.PRESENT, true);
      this.revive();
      for (const e of this.enemies) if (e.alive && e.reset) e.reset();
      this.warden?.reset();
      this.hud.setHearts(this.player.hp, this.player.maxHp);
      this.mode = 'play';
      audio.setMusicVolume(0.55);
      setFade(0);
    }, 1700);
  }

  // ------------------------------------------------------------------ per-frame
  /** The nearest thing to talk to or use: in this age, or (lens = an era) through the lens. */
  nearestInteractive(lens = null) {
    const b = this.player.body;
    let best = null, bd = 1.7;
    const list = [...this.npcs, ...this.interactables];
    // through the lens: things made to be reached that way, and anyone standing in that age
    const reachable = (e) => e.era === lens && (e instanceof NPC ? e.alive && e.present() && !e.spec.memory : e.spec.lens && e.available());
    for (const e of list) {
      if (lens === null ? !e.active() || e.spec.lensOnly : !reachable(e)) continue;
      const d = e.distTo(b);
      if (d < Math.min(bd, e.spec.reach ?? 1.7)) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Everyone and everything but the player takes its turn. */
  updateEntities(dt) {
    const talking = this.dialogue.active;
    for (const e of this.entities) {
      if (!e.alive || !(e.active() || e instanceof Pushable || e.alwaysUpdate)) continue;
      if (talking && e.hostile) continue; // enemies wait while you're in a conversation
      e.update(dt);
    }
    this.entities = this.entities.filter((e) => e.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.pickups = this.pickups.filter((e) => e.alive);
  }

  /** Keep the Menu's goal and hint current, and name each area the first time you walk in. */
  updateGoalAndArea(dt) {
    // the goal (shown in the Menu, with its hint behind a button): announce real changes
    const { goal, hint } = this.ch.currentGoal(this);
    const key = goal + '|' + hint;
    if (key !== this.goalText) {
      const prevGoal = this.goalText?.split('|')[0];
      this.goalText = key;
      document.getElementById('goal-text').innerHTML = goal;
      document.getElementById('goal-hint').innerHTML = hint;
      this.showHint(false);
      // a new goal: a quiet dot on the Menu button rather than more text
      if (prevGoal !== undefined && goal !== prevGoal && !/^Keep heading/.test(goal)) document.body.classList.add('goal-new');
    }
    this.shiftGrace = Math.max(0, (this.shiftGrace || 0) - dt);

    // area banner
    const bx = this.player.body.x, by = this.player.body.y, bz = this.player.body.z;
    let ai = 0;
    // (an area may start at a height, too, or a way back up a mountainside, in a chapter that climbs)
    for (let i = 0; i < this.ch.AREAS.length; i++) {
      const A = this.ch.AREAS[i];
      if (bx >= A.x && by >= (A.y ?? -99) && bz <= (A.zMax ?? 99) && bx <= (A.x1 ?? 1e9)) ai = i;
    }
    if (ai !== this.areaIdx) {
      this.areaIdx = ai;
      // each area's name shows once, the first time you walk in
      this.seenAreas ||= new Set();
      if (!this.seenAreas.has(ai) && this.mode === 'play') this.hud.showBanner(this.ch.AREAS[ai].name, this.era, this.ch.AREAS[ai].subtitle || this.eraLabel(this.era));
      this.seenAreas.add(ai);
    }
  }

  /** Fill the Menu panel (goal and hint are kept up to date every frame). */
  renderMenu() {
    showInventoryPanel(this.state.inventory, true, this.favorList());
    this.kit.renderMenu(document.getElementById('kit'));
  }

  // ------------------------------------------------------------------ kindness side quests
  favorList() {
    const s = this.state;
    return this.ch.FAVORS.filter((fv) => s.flags[fv.start] || s.kindness.includes(fv.id)).map((fv) => ({
      title: fv.title,
      text: s.kindness.includes(fv.id) ? fv.done : fv.todo,
      done: s.kindness.includes(fv.id),
    }));
  }

  startFavor(id) {
    const fv = this.ch.FAVORS.find((x) => x.id === id);
    if (!fv) return;
    audio.sfx('ui');
    this.hud.toast(`New favor: <b>${fv.title}</b>`, 3500);
    this.save();
  }

  /** Each kindness adds a heart, and the hearts earned in earlier chapters come along too. */
  maxHearts() {
    return BASE_HP + this.state.kindness.length + progress.carriedHearts(chapter.id);
  }

  completeKindness(id) {
    const s = this.state;
    if (s.kindness.includes(id)) return;
    s.kindness.push(id);
    const p = this.player;
    p.maxHp = this.maxHearts();
    p.hp = p.maxHp;
    this.hud.setHearts(p.hp, p.maxHp);
    audio.sfx('heal');
    audio.sfx('checkpoint');
    const b = p.body;
    this.bursts.emit(b.x, b.y + 1, b.z, 40, { color: [0xff6080, 0xffd070, 0xffffff], speed: 3.5, life: 1 });
    this.hud.toast('A kindness repaid: <b>+1 heart</b>', 3500);
    this.save();
  }

  // ------------------------------------------------------------------ cause-and-effect time-lapse
  /**
   * Show the consequence of something the player just did: hold the camera on `focus` in the
   * age where they did it, then spin the sky through days and nights while the years count up
   * and that age slowly becomes era `to` in front of them, where the result grows (`grow`:
   * feature ids scaled up from the ground, starting at `growFrom` of full height: water rising
   * from a shallow pool, say), drops into place (`drop`) or floats up with rising water
   * (`float`: { ids, by } rises `by` cells). Then shift back. `to` can be the age you're in:
   * then nothing shifts, and the change simply plays out in front of you. `unit`: what's being
   * counted, if not years. Any tap / key after a moment skips ahead.
   */
  async timelapse({ to, focus, years, caption, grow = [], drop = [], float = null, growFrom = 0, effect = null, erode = null, unit = ['year', 'years'] }) {
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
    const hold = (ms) => new Promise((res) => {
      const t0 = performance.now();
      const tick = () => (skip || performance.now() - t0 >= ms ? res() : requestAnimationFrame(tick));
      tick();
    });

    const lapse = { focus: new THREE.Vector3(...focus), t: 0, spin: 0, grow: [], drop: [] };
    this.lapse = lapse;
    const targets = (ids) => this.world.features.filter((f) => ids.includes(f.id)).flatMap((f) => f.meshes[to] || []);

    overlay.querySelector('.lapse-caption').textContent = caption;
    overlay.querySelector('.lapse-era').textContent = to === from ? this.eraLabel(to) : `${this.eraLabel(from)}  →  ${this.eraLabel(to)}`;
    overlay.style.setProperty('--lapse-color', ERA_COLORS[to]);
    yearsEl.textContent = `+0 ${unit[1]}`;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('in'));

    await hold(650); // camera settles on the spot
    setTimeout(() => {
      window.addEventListener('keydown', skipKeys);
      window.addEventListener('pointerdown', wantSkip);
    }, 300);

    // the age it was done in turns into the later one as the years go by (lapse.update keeps
    // the two in step); the consequence starts small and grows in
    const DUR = 3.2, shifted = to !== from;
    if (shifted) {
      this.shiftEra(to, lapse.focus, DUR * 0.8);
      audio.sfx('shift', { era: to });
    }
    lapse.grow = targets(grow);
    lapse.drop = targets(drop);
    lapse.float = float ? targets(float.ids) : [];
    for (const m of lapse.grow) m.scale.y = Math.max(0.001, growFrom);
    for (const m of lapse.float) m.position.y = -float.by;
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

    lapse.update = (dt) => {
      lapse.t = Math.min(DUR, lapse.t + dt * (skip ? 6 : 1));
      const k = lapse.t / DUR;
      // a beat in the old age first, and the new one fully arrived a little before the years stop
      const a = THREE.MathUtils.clamp((k - 0.08) / 0.8, 0, 1);
      if (shifted) this.post.trans = Math.min(0.999, a * a * (3 - 2 * a));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
      const n = Math.round(e * years);
      yearsEl.textContent = `+${n.toLocaleString()} ${n === 1 ? unit[0] : unit[1]}`;
      // days and nights racing past
      const night = Math.max(0, Math.sin(k * Math.PI * (years > 1 ? 10 : 2))) * (1 - k) * 0.9;
      r.sun.intensity = r.atmos.sunI * (1 - night * 0.85);
      r.hemi.intensity = r.atmos.hemiI * (1 - night * 0.55);
      r.skyUniforms.stars.value = Math.max(night, r.atmos.stars ?? 0);
      // the consequence waits until the new age has begun to show through, then unfolds in it
      const kc = THREE.MathUtils.clamp((k - 0.25) / 0.75, 0, 1);
      const g = 1 - Math.pow(1 - Math.min(1, kc * 1.15), 3); // growth ease-out
      for (const m of lapse.grow) m.scale.y = Math.max(0.001, growFrom + (1 - growFrom) * g);
      for (const m of lapse.float) m.position.y = -float.by * (1 - g);
      for (const m of lapse.drop) m.position.y = 5 * Math.max(0, 1 - Math.min(1, kc * 1.6) ** 2);
      if (lapse.rock) {
        const R = lapse.rock, target = Math.floor(Math.min(1, kc * 1.1) ** 1.2 * R.pieces.length);
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
        const c = lapse.focus, fx = theme.lapse;
        if (effect === 'carve') this.bursts.emit(c.x - 0.5 + Math.random(), 0.5 + Math.random() * 2, c.z - 1 + Math.random() * 2, 3, { color: [0x7fd8ff, 0xd8c09a], speed: 2.5, life: 0.7, gravity: 4 });
        else if (effect === 'shine') this.bursts.emit(c.x - 1 + Math.random() * 2, c.y + Math.random(), c.z, 2, { color: fx.shine, speed: 1.2, life: 0.8, gravity: -0.5, glow: 2 });
        else if (float && fx.splash) this.bursts.emit(c.x - 5 + Math.random() * 10, c.y - 1 + Math.random(), c.z - 2 + Math.random() * 6, 2, { color: fx.splash, speed: 1.6, life: 0.7, gravity: 3 });
        else this.bursts.emit(c.x - 1.5 + Math.random() * 3, c.y - fx.motesDrop + Math.random() * 3, c.z - 1 + Math.random() * 2, 1, { color: fx.motes, speed: 0.8, life: 0.9, gravity: -0.4 });
      }
    };
    await hold(DUR * 1000);
    lapse.t = DUR;
    lapse.update(0);
    lapse.update = null;
    this.post.trans = 1;
    if (rock) {
      rock.parent?.remove(rock);
      rock.geometry.dispose();
      rock.material.dispose();
    }
    r.applyAtmos(r.atmos);
    r.skyUniforms.stars.value = r.atmos.stars ?? 0;
    audio.sfx('checkpoint');
    await hold(1100); // admire the result

    // back to the player's own age
    overlay.classList.remove('in');
    if (shifted) {
      this.shiftEra(from);
      audio.sfx('shift', { era: from });
    }
    window.removeEventListener('keydown', skipKeys);
    window.removeEventListener('pointerdown', wantSkip);
    this.lapse = null;
    p.mesh.visible = p.shadow.visible = true;
    await wait(450);
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
   * The time lens: holding peek opens a round window onto another age around Vivienne, live, so
   * she can walk about with it. (A swipe in progress opens it as far as the drag; a refused
   * shift flashes it red, to show what's in the way.)
   */
  renderPeek() {
    // mid-shift, the "other age" target holds the age being left, kept live so it moves with the camera
    if (this.post.trans < 1 && this.shiftFrom !== null) {
      this.post.peekAmt = 0;
      this.captureEra(this.shiftFrom);
      return;
    }
    // a swipe in progress previews the era it's heading to, fading in with the drag
    const sp = this.swipePeek;
    const target = this.blockFlashT > 0 ? this.blockFlashEra : sp ? sp.target : this.peekTarget;
    const want = target !== null && target !== undefined ? (this.blockFlashT > 0 ? Math.min(1, this.blockFlashT * 2) : sp ? sp.amt : 1) : 0;
    this.post.peekAmt += (want - this.post.peekAmt) * 0.25;
    if (want === 0 && this.post.peekAmt < 0.02) this.post.peekAmt = 0; // closed means closed: no blocks left showing an old frame
    if (this.post.peekAmt > 0.01 && target !== null && target !== undefined) {
      const tu = this.post.time.uniforms, b = this.player.body;
      if (this.blockFlashT > 0) tu.peekTint.value.setRGB(1.4, 0.35, 0.35);
      else tu.peekTint.value.setHex(ERA_RING[target]);
      const v = new THREE.Vector3(b.x, b.y + 0.8, b.z).project(this.renderer.camera);
      tu.peekCenter.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
      tu.peekR.value = Math.min(0.3, 0.42 * tu.aspect.value); // narrower on a phone held upright
      this.captureEra(target);
    }
  }

  updateTitle(dt) {
    this.titleT += dt;
    const { x, sway, y = 1.5, z = 3 } = theme.titleCam;
    this.renderer.camTarget.set(x + Math.sin(this.titleT * 0.08) * sway, y, z);
    if (this.titleT > 6) {
      this.titleT = 0;
      this.titleEra = (this.titleEra + 1) % 3;
      this.shiftEra(this.titleEra);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.time += dt;
    this.blockFlashT = Math.max(0, this.blockFlashT - dt);

    if (this.mode === 'title' || this.mode === 'credits') {
      this.updateTitle(dt);
      this.player.mesh.visible = this.player.shadow.visible = false;
    } else if (this.mode === 'play' || this.mode === 'dialogue') {
      this.updatePlay(dt);
      this.kit.update(dt, this.controlsEnabled());
      this.updateCogCompass(dt);
    }
    else if (this.mode === 'ending') {
      this.player.update(dt);
      for (const e of this.entities) if (e.alive && e.active()) e.update(dt);
    }

    const r = this.renderer;
    r.tickAtmos(dt);
    if (this.lapse) {
      r.updateCamera(dt, this.lapse.focus.clone(), [this.lapse.focus.x - 100, this.lapse.focus.x + 100]);
      this.lapse.update?.(dt);
    } else if (this.camFocus) {
      // a set piece looking somewhere other than at Vivienne (see a chapter's ending)
      r.updateCamera(dt, this.camFocus.clone(), [this.camFocus.x - 100, this.camFocus.x + 100]);
    } else if (this.mode !== 'title' && this.mode !== 'credits') {
      const b = this.player.body;
      // a viewpoint: the camera eases back and down to take in the view (see L.vistas)
      r.setVista(this.L.vistas?.find((v) => b.x >= v.x0 && b.x <= v.x1 && (v.y0 === undefined || (b.y >= v.y0 && b.y <= v.y1)) && (v.z0 === undefined || (b.z >= v.z0 && b.z <= v.z1))) || null);
      const lead = this.mode === 'play' && !this.rewinding ? this.player.facing * 1.3 + THREE.MathUtils.clamp(b.vx * 0.15, -0.8, 0.8) : 0;
      // (on a road that winds back into the scene, the camera follows it all the way)
      r.updateCamera(dt, new THREE.Vector3(b.x, Math.max(b.y, theme.camFloor) + 0.6, theme.openDepth ? b.z : b.z * 0.6 + 1.2), this.L.cameraBounds, lead);
    } else r.updateCamera(dt, r.camTarget.clone(), [r.camTarget.x - 100, r.camTarget.x + 100]);
    r.updateLights(this.world.lights[this.era], r.camTarget, this.time);
    r.tickShaders(this.time);
    this.ambient.update(dt, this.time, r.camTarget.x, r.camTarget.y);
    this.bursts.update(dt);

    // depth-of-field focus: camera distance to the player (or the camera target on the title)
    const fp = this.lapse ? this.lapse.focus : this.player && this.mode !== 'title' && this.mode !== 'credits' ? new THREE.Vector3(this.player.body.x, this.player.body.y + 0.8, this.player.body.z) : r.camTarget;
    const focus = fp.clone().applyMatrix4(r.camera.matrixWorldInverse).z * -1;
    const gu = this.post.grade.uniforms;
    gu.hurt.value = Math.max(0, gu.hurt.value - dt * 2.5);
    this.renderPeek();
    this.updateEffects(dt);
    this.post.update(dt, this.time, focus);
    this.post.render();
    input.endFrame();
  }
}
