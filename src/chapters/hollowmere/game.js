// Chapter One, Hollowmere: the Chronoheart's draining meter, Stasis Seal, Echoes and Tempo, the
// pushable blocks, Donald Eugene's hideaway, the Clocktower's three sockets, the Gearworks inside
// the clock, and the ending. Everything every chapter shares is in src/game.js.
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { W } from '../../world/world.js';
import { hits } from '../../world/physics.js';
import { NPC } from '../../world/entities.js';
import { setFade, letterbox } from '../../ui/ui.js';
import { touchActive } from '../../ui/touch.js';
import { Game, baseState, ERA_RING } from '../../game.js';
import { progress } from '../../chapter.js';
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL, STUDY } from './level.js';
import { talk, interact, struck, ITEMS, INTRO, ENDING, ENDING_COGS, TEMPO_GIFT, TEMPO_LEARN, FAVORS } from './story.js';
import { currentGoal } from './objectives.js';
import { Interactable, Strikeable } from './entities.js';
import { Abilities } from './abilities.js';
import { Finale } from './finale.js';
import { Gearworks } from './gearworks.js';

const DRAIN_TIME = 30; // seconds of charge away from the present (the Everspring ends the drain)
const TAP_TIME = 0.2; // Q / E held less than this is a tap (era travel); longer is Tempo

export class HollowmereGame extends Game {
  constructor(container) {
    super(container, { L, buildLevel, SPAWNS, CHECKPOINTS, AREAS, COG_TOTAL, talk, interact, struck, ITEMS, INTRO, FAVORS, currentGoal });
  }

  // ------------------------------------------------------------------ the chapter's hooks (see Game)
  newState() {
    return {
      ...baseState(),
      blockPos: { ...L.blockStart },
      cratePos: { ...L.crateStart },
      boulderPos: { ...L.boulderStart },
      sockets: {}, // Era Keys placed in the Clocktower (saved, so a key is never lost mid-finale)
    };
  }

  setup() {
    this.meter = 1;
    this.tempoHold = 0; // Q / E held past a tap: -1 slow, +1 fast (see updatePlay)
    this.keyT = { back: 0, forward: 0 }; // how long each has been held
    this.warnT = 0;
    this.kinds = { interact: Interactable, strike: Strikeable };
    this.abilities = new Abilities(this);
    this.finale = new Finale(this);
    this.gearworks = new Gearworks(this);
  }

  attach() {
    this.abilities.attach();
    this.finale.attach();
    this.gearworks.attach();
  }

  syncBody() {
    this.abilities.syncBody();
  }

  beginPlay() {
    this.meter = 1;
    super.beginPlay();
  }

  afterIntro() {
    if (touchActive()) {
      this.hud.toast('Drag the left side to move. <b>?</b> shows all controls.', 5000);
    } else {
      this.hud.toast('Move <kbd>WASD</kbd> · Jump <kbd>Space</kbd> · Interact <kbd>F</kbd> · All controls <kbd>H</kbd>', 5000);
    }
  }

  welcomeBack() {
    return this.state.flags.finished ? 'Welcome back, Vivienne. The Tower is ticking.' : 'Welcome back, Vivienne.';
  }

  migrate() {
    const f = this.state.flags;
    // a save from before the gatehouse shutter existed, already past it: it stays open
    if ((this.state.taken || []).includes('core') || f.posternOpen || f.millDammed) f.shutterBroken = true;
    // a save where the star chart was returned before the valley began remembering it
    if ((this.state.kindness || []).includes('chart')) f.chartReturned = f.statueShown = true;
    // saves from before Tempo came with the Escapement Key, and before the door's regulators
    if (this.state.inventory.includes('clockKey') || f.towerUnlocked) f.hasTempo = true;
    if (f.towerUnlocked) f.regulatorsSynced = true;
    // a save from before the Gearworks, with all three keys in: Tempo, and up into the clock
    if (Object.keys(this.state.sockets || {}).length === 3 && !f.hasTempo) {
      f.hasTempo = f.gearworksOpen = true;
      this.state.checkpoint = 11;
    }
  }

  canShift(target) {
    if (!this.state.flags.hasAmulet) return false;
    if (this.gearworks.active) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.hud.toast('Inside the clock, the ages are wound too tightly to pull apart.', 3000);
      return false;
    }
    if (this.post.trans < 0.27) return false;
    if (target !== ERA.PRESENT && this.meter < 0.06) {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.hud.toast('The Chronoheart needs to recharge in the Present.');
      return false;
    }
    return true;
  }

  interrupt() {
    this.abilities.cancelRecording();
  }

  onCollected(p) {
    if (p.id === 'clockKey') this.learnTempo();
  }

  heartY(y) {
    return Math.max(y, 0.5);
  }

  /** Somewhere a crushed or drowned player must never be put back: under a hammer, on the lift. */
  unsafeSpot(x, y) {
    return this.gearworks.active && this.gearworks.unsafeAt(x, y);
  }

  /** Tempo: machines inside your bubble run slow or fast. */
  tempoAt(x, y) {
    return this.gearworks.tempoAt(x, y);
  }

  get lines() {
    return {
      spotted: ['Spotted! Hide behind a pillar, or slip into another age.', 3500],
      searchlight: ['Caught in a searchlight! The Warden is coming. Slow the lights down to slip past them.', 4500],
    };
  }

  hazardBurst() {
    return this.era === ERA.FUTURE ? [0x7cff6a] : [0x9fe0ff, 0xffffff];
  }

  /** The first time each kind of water turns you back, say why (the Gearworks' hammers aren't water). */
  onHazardDone() {
    const f = this.state.flags;
    if (this.gearworks.active || this.player.hp <= 0) return;
    const treated = this.era === ERA.FUTURE;
    const flag = treated ? 'treatedHint' : 'currentHint';
    if (f[flag]) return;
    f[flag] = true;
    this.hud.toast(treated ? 'Treated water! It glows for a reason. It costs a heart, and puts you back on solid ground.' : "The current's too strong to swim! It costs a heart, and puts you back on solid ground.", 5000);
  }

  onHazardPlaced(spot) {
    if (spot.era !== ERA.PRESENT) this.meter = Math.max(this.meter, 0.6);
  }

  /** Caught: back at the courtyard gate. */
  wardenExitX() {
    return L.yardX0 + 2.5;
  }

  revive() {
    this.meter = 1;
  }

  updateEffects(dt) {
    this.updateTowerGlitch(dt);
  }

  // ------------------------------------------------------------------ Donald Eugene's hideaway
  /** Through the door with the brass gear, into the hidden room (Past only). */
  async enterStudy() {
    this.mode = 'cutscene';
    setFade(1);
    await new Promise((r) => setTimeout(r, 350));
    this.world.pocket = STUDY.pocket;
    this.refreshWorld();
    this.player.place(STUDY.door - 0.4, 0, -1.4);
    this.player.body.vx = this.player.body.vz = 0;
    audio.sfx('lever');
    setFade(0);
    this.mode = 'play';
    this.lockT = 0.3;
  }

  async leaveStudy() {
    this.mode = 'cutscene';
    setFade(1);
    await new Promise((r) => setTimeout(r, 300));
    this.world.pocket = null;
    this.refreshWorld();
    this.player.place(STUDY.door - 0.4, 0, 0.8);
    setFade(0);
    this.mode = 'play';
    this.lockT = 0.2;
  }

  // ------------------------------------------------------------------ the Chronoheart's charge
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
    this.hud.toast('Out of charge: pulled back to the Present.', 3000);
  }

  // ------------------------------------------------------------------ blocks, Tempo, the Era Keys
  onPushed(p) {
    super.onPushed(p);
    if (p.id === 'block') {
      this.refreshWorld();
      const t = L.pillarTarget;
      if (p.cx === t.x && p.cz === t.z) {
        audio.sfx('socket');
        this.bursts.emit(t.x + 0.5, 0.8, t.z + 0.5, 30, { color: [0x3ad0c0, 0xffe070], speed: 3, life: 0.8 });
        this.save();
        this.timelapse({ to: ERA.PRESENT, focus: [t.x + 0.5, 1.5, t.z], years: 600, caption: 'Generations build on the ancient stone...', grow: ['pillar'] }).then(() =>
          this.hud.toast('A pillar now stands beside the bench.', 3500),
        );
      } else if (!this.state.flags.pushHint) {
        this.state.flags.pushHint = true;
        this.hud.toast('That glowing outline looks made for this block...', 3500);
      }
    }
  }

  /**
   * Lifting the Escapement Key brings the Warden straight for you. (Tempo is normally learned at
   * the courtyard gate; anyone who walked past that learns it here instead.)
   */
  async learnTempo() {
    const f = this.state.flags;
    if (!f.hasTempo) {
      this.grantTempo();
      await this.cutscene(TEMPO_LEARN);
      this.tempoToast();
    } else this.hud.toast('The Warden knows the key is gone. <b>Slow it down</b> and get clear!', 4500);
    this.warden?.hunt();
  }

  grantTempo() {
    this.state.flags.hasTempo = true;
    this.abilities.syncBody();
    this.save();
  }

  tempoToast() {
    this.hud.toast(
      touchActive()
        ? '<b>Tempo!</b> Hold <b>Slow</b> to slow the machines near you, <b>Fast</b> to speed them up.'
        : '<b>Tempo!</b> <b>Hold</b> <kbd>Q</kbd> to slow the machines near you, <b>hold</b> <kbd>E</kbd> to speed them up. A quick tap still travels.',
      8000,
    );
  }

  /** Era Keys placed in the Clocktower, keyed by socket id. */
  get sockets() {
    return (this.state.sockets ||= {});
  }

  placeKey(socketId, item) {
    this.removeItem(item);
    this.sockets[socketId] = item;
    audio.sfx('socket');
    if (socketId === 'socketBell') audio.sfx('bell');
    const ent = this.interactables.find((i) => i.id === socketId);
    this.bursts.emit(ent.x, ent.y + 0.6, ent.z, 40, { color: [0xffd070, 0x9ff4ff], speed: 4, life: 0.9 });
    this.renderer.shake = 0.5;
    this.save();
    this.finale.lurch(socketId);
    if (Object.keys(this.sockets).length === 3) this.giftTempo();
  }

  /** The third key: the clock face opens. Then up into the clock, where only Tempo works. */
  async giftTempo() {
    this.mode = 'cutscene';
    this.hud.showPrompt(null);
    this.abilities.cancelRecording();
    await new Promise((r) => setTimeout(r, 1600));
    const f = this.state.flags;
    f.gearworksOpen = true;
    this.refreshWorld();
    this.mode = 'play';
    await this.cutscene(TEMPO_GIFT);
    f.hasTempo = true;
    this.abilities.syncBody();
    this.state.checkpoint = 11;
    this.save();
    await this.enterGearworks();
    this.hud.toast(touchActive() ? 'Inside the clock there is only <b>Tempo</b>: hold <b>Slow</b> or <b>Fast</b>.' : 'Inside the clock, <kbd>Q</kbd> and <kbd>E</kbd> are always <b>Tempo</b>: hold to slow time around you, or speed it up.', 7000);
  }

  /** Up through the doorway on the Tower's east wall, into the clock. */
  async enterGearworks() {
    this.mode = 'cutscene';
    setFade(1, '#fff6e0');
    await new Promise((r) => setTimeout(r, 450));
    this.applyEra(ERA.PRESENT, true);
    this.player.place(L.gearX0 + 2.5, 0, 3.5);
    this.player.facing = 1;
    this.player.body.vx = this.player.body.vz = 0;
    setFade(0);
    this.mode = 'play';
    this.lockT = 0.3;
  }

  async leaveGearworks() {
    this.mode = 'cutscene';
    setFade(1, '#000');
    await new Promise((r) => setTimeout(r, 350));
    this.applyEra(ERA.PRESENT, true);
    this.player.place(L.towerX1 - 3.5, 0, 4.5);
    this.player.facing = -1;
    setFade(0);
    this.mode = 'play';
    this.lockT = 0.3;
  }

  // ------------------------------------------------------------------ the ending
  async runEnding() {
    this.mode = 'ending';
    this.hud.showPrompt(null);
    this.abilities.cancelRecording();
    // a flash of white, and you're back down on the Tower floor for the ending
    setFade(1, '#fff6e0');
    await new Promise((r) => setTimeout(r, 450));
    this.player.place(L.towerX0 + 9.5, 0, 3.5);
    this.player.facing = 1;
    this.applyEra(ERA.PRESENT, true);
    setFade(0);
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
    // Donald Eugene appears
    const os = new NPC(this, { type: 'npc', id: 'eugeneEnd', era: ERA.PRESENT, x: b.x + 2.2, z: b.z, sheet: 'eugene', name: 'Donald Eugene' });
    this.npcs.push(os);
    this.entities.push(os);
    this.bursts.emit(os.x, 1, os.z, 60, { color: [0x9ff4ff, 0xffffff], speed: 4, life: 1 });
    audio.sfx('shift', { era: 1 });
    letterbox(true);
    // all ten Lost Cogs: Donald Eugene fits them to the Chronoheart, before supper
    const allCogs = this.state.cogs.length >= COG_TOTAL;
    await this.dialogue.run(allCogs ? [...ENDING.slice(0, -1), ...ENDING_COGS, ENDING[ENDING.length - 1]] : ENDING);
    letterbox(false);
    if (allCogs) this.grantFinder();
    this.state.checkpoint = 0; // Continue: home, in the square
    this.finishStory(); // the story is told, Chapter Two is open, and the valley is yours to keep walking
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

  /** Ten cogs round the Chronoheart's rim: the lens turns toward lost cogs, in every chapter after. */
  grantFinder() {
    if (!this.state.inventory.includes('finder')) this.giveItem('finder');
    this.state.flags.cogFinder = true;
    progress.grantReward('cogFinder');
    this.save();
  }

  // ------------------------------------------------------------------ per-frame
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
    }
    // Q / E. Before Tempo is learned, a press travels one era. After it, a quick tap still
    // travels (on letting go) and holding bends time instead: no mode to switch. Inside the
    // clock, where the ages can't be pulled apart, they are Tempo from the first instant.
    this.tempoHold = 0;
    for (const [name, dir] of [['back', -1], ['forward', 1]]) {
      const held = ctl && !peeking && input.held(name);
      const t = this.keyT[name];
      if (!ctl || peeking) this.keyT[name] = 0;
      else if (!f.hasTempo) {
        if (input.hit(name) && !this.gearworks.active) this.tryShift(this.era + dir);
      } else if (this.gearworks.active) {
        if (held) this.tempoHold = dir;
      } else if (held) {
        this.keyT[name] = t + dt;
        if (this.keyT[name] >= TAP_TIME) this.tempoHold = dir;
      } else {
        // let go (or a touch tap on an era name, down for a single frame)
        if ((t > 0 && t < TAP_TIME) || (t === 0 && input.hit(name))) this.tryShift(this.era + dir);
        this.keyT[name] = 0;
      }
    }

    // meter
    if (f.steadyHeart) this.meter = 1; // the Everspring: the Chronoheart never drains again
    else if (this.world.pocket) this.meter = Math.max(this.meter, 0.3); // time stands still in the hideaway
    else if (this.era !== ERA.PRESENT && this.mode === 'play') {
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
    } else if (!this.gearworks.mode) this.meter = Math.min(1, this.meter + dt / 2.5); // (Tempo is drawing on it)
    this.hud.setMeter(this.meter, this.era, !!f.steadyHeart);

    // once you reach Millrace Hollow, the old postern passage opens: a way back west in the Present
    if (!f.posternOpen && this.player.body.x > L.millX0 + 1.5 && this.mode === 'play') {
      f.posternOpen = true;
      this.refreshWorld();
      this.save();
      this.hud.toast('<b>A way back:</b> the old postern passage behind you is open, in the Present.', 5000);
    }

    // walking out of Donald Eugene's hideaway
    if (this.world.pocket && ctl && this.player.body.z > -0.7) this.leaveStudy();

    // entities
    this.player.update(dt);
    if (this.era === ERA.PRESENT && this.player.body.onGround) this.lastSafePresent = { x: this.player.body.x, y: this.player.body.y, z: this.player.body.z };
    this.updateEntities(dt);

    // interaction
    const near = ctl ? this.nearestInteractive() : null;
    // with nothing to talk to, offer the Stasis Seal when something sealable is right here
    // ...or, standing on one of your echoes, offer to dispel it
    const strike = ctl && !near ? this.nearestStrike() : null;
    const seal = ctl && !near && !strike ? this.abilities.sealTarget() : null;
    const echo = ctl && !near && !strike && !seal ? this.abilities.dispelTarget() : null;
    if (strike) {
      this.hud.showPrompt(strike.prompt(), 'strike');
      if (!f.strikeHint) {
        f.strikeHint = true;
        this.hud.toast(`Stuck fast. A few good hits should shift it: ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} swings your wrench.`, 5000);
      }
    } else if (seal) this.hud.showPrompt(`Seal ${seal.name}`, 'seal');
    else if (echo) this.hud.showPrompt('Dispel echo', 'dispel');
    else this.hud.showPrompt(near ? (near.prompt ? near.prompt() : 'Interact') : null);
    if (echo && input.hit('interact')) this.abilities.dispel(echo);
    if (near && ctl && input.hit('interact')) this.use(near);

    this.abilities.update(dt, ctl);
    this.finale.update(dt);
    this.gearworks.update(dt, ctl);

    // first time a hostile creature gets close, remind the player how to fight
    if (!f.attackHint && ctl) {
      const b = this.player.body;
      if (this.enemies.some((e) => e.active() && !e.dead && Math.abs(e.body.x - b.x) < 7)) {
        f.attackHint = true;
        this.hud.toast(`Enemy nearby! ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} swings your wrench.`, 3500);
      }
    }

    // Sun Terrace hints: point at the foundation in the Present, at the block in the Past
    {
      const bx = this.player.body.x, t = L.pillarTarget, bp = s.blockPos;
      const solved = bp.x === t.x && bp.z === t.z;
      if (!solved && !f.terraceHint && this.era !== ERA.PAST && bx > 137 && bx < 146 && ctl) {
        f.terraceHint = true;
        this.hud.toast('Too high to climb. That empty foundation by the bench looks like it\'s waiting for something...', 5000);
      }
      if (!solved && !f.blockHint2 && this.era === ERA.PAST && Math.abs(bx - (bp.x + 0.5)) < 5 && ctl) {
        f.blockHint2 = true;
        this.hud.toast('Walk into the carved block to push it.', 3500);
      }
    }

    this.updateGoalAndArea(dt);
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
    // calmer inside the clock, where the puzzles need your eyes, and for reduced-motion players
    const calm = (this.gearworks.active ? 0.6 : 1) * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.5 : 1);
    // right after a key goes in, the stutter flares: bursts come back to back, a little stronger
    this.towerSurge = Math.max(0, (this.towerSurge || 0) - dt);
    const surge = this.towerSurge > 0;
    if (surge) g.t = Math.min(g.t, 0.05);
    g.t -= dt;
    if (g.on <= 0 && g.t <= 0) {
      g.on = 0.1 + Math.random() * (0.16 + keys * 0.03);
      g.t = (2.2 + Math.random() * 3.5) / (1 + keys * 0.3) / (0.5 + prox * 0.5) / calm;
      const others = [0, 1, 2].filter((e) => e !== this.era);
      g.era = others[Math.floor(Math.random() * others.length)];
      if (prox > 0.5) audio.sfx('glitch');
      if (!this.state.flags.towerGlitchSeen && !this.glitchExplaining && this.player.body.x > L.towerX0 - 14 && this.controlsEnabled()) this.explainTowerGlitch();
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
    tu.glitch.value = prox * (0.18 + Math.random() * 0.18 + keys * 0.03) * (surge ? 1.4 : 1) * calm;
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
}
