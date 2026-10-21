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
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL, STUDY, GARDEN, LASER_FENCE, POSTERN_SAG, BAKERY, TOWER_FACE, CURIOS } from './level.js';
import { talk, interact, struck, ITEMS, INTRO, ENDING, ENDING_COGS, TEMPO_GIFT, TEMPO_LEARN, FAVORS, endingSlip } from './story.js';
import { currentGoal } from './objectives.js';
import { Interactable, Strikeable } from './entities.js';
import { Abilities } from './abilities.js';
import { CREATURES } from './entities.js';
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
    this.attachTowerHands();
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
    // a finished save from before the Tower's face lit up: it is ticking, so it is lit
    if (f.finished) f.towerLit = true;
    // (and from before the bakery changed: by now it has)
    if (f.finished) f.bakeryChanged = true;
  }

  canShift(target) {
    if (!this.state.flags.hasAmulet) return false;
    if (this.world.pocket?.id === 'garden') {
      audio.sfx('blocked');
      this.hud.flashBlocked();
      this.hud.toast('Ten thousand years on, the ages have settled into one.', 3000);
      return false;
    }
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
    this.turnTowerHands(dt);
  }

  /** The Clocktower's two hands: still, until it runs again; then they turn (see TOWER_FACE). */
  attachTowerHands() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2014, roughness: 0.6 });
    const hand = (len, w) => {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.06), mat);
      m.position.y = len / 2 - 0.15;
      pivot.add(m);
      pivot.position.set(TOWER_FACE.x, TOWER_FACE.y, TOWER_FACE.z + 0.06);
      return pivot;
    };
    this.towerHands = { minute: hand(TOWER_FACE.r - 0.5, 0.18), hour: hand(TOWER_FACE.r - 1.3, 0.24), spin: 0 };
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12).rotateX(Math.PI / 2), mat);
    hub.position.set(TOWER_FACE.x, TOWER_FACE.y, TOWER_FACE.z + 0.12);
    this.towerHands.group = new THREE.Group();
    this.towerHands.group.add(this.towerHands.minute, this.towerHands.hour, hub);
    this.world.groups[ERA.PRESENT].add(this.towerHands.group);
  }

  turnTowerHands(dt) {
    const h = this.towerHands;
    if (!h) return;
    h.group.visible = !!this.state.flags.towerLit;
    if (!h.group.visible) return;
    // a whirl as it wakes, settling into a steady tick: one jump of the minute hand a second
    h.spin = Math.max(0, h.spin - dt * 0.9);
    h.tickT = (h.tickT || 0) + dt;
    if (h.spin > 0) h.minute.rotation.z -= dt * h.spin * 9;
    else if (h.tickT >= 1) {
      h.tickT = 0;
      h.minute.rotation.z -= (Math.PI * 2) / 60;
    }
    h.hour.rotation.z = h.minute.rotation.z / 12;
  }

  // ------------------------------------------------------------------ Donald Eugene's hideaway & The Starlit Garden
  /** Through the door with the brass gear, into the hidden room (Past only). */
  async enterStudy() {
    this.mode = 'cutscene';
    setFade(1);
    await new Promise((r) => setTimeout(r, 350));
    this.world.pocket = STUDY.pocket;
    this.refreshWorld();
    this.player.place(STUDY.door + 0.8, 0, -1.4); // on the rug, clear of the cot
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

  /** Through the Star-iron Astral Door, into The Starlit Garden (10,000 Years On). */
  async enterGarden() {
    this.mode = 'cutscene';
    setFade(1, '#fff6e0');
    await new Promise((r) => setTimeout(r, 400));
    this.world.pocket = GARDEN.pocket;
    this.applyEra(ERA.FUTURE, true);
    this.refreshWorld();
    this.player.place((GARDEN.x0 + GARDEN.x1 + 1) / 2, 0, -1.3);
    this.player.body.vx = this.player.body.vz = 0;
    audio.sfx('bell');
    setFade(0);
    this.mode = 'play';
    this.lockT = 0.3;
    this.hud.showBanner('The Starlit Garden', this.era, 'Ten Thousand Years On');
  }

  async leaveGarden() {
    this.mode = 'cutscene';
    setFade(1);
    await new Promise((r) => setTimeout(r, 300));
    this.world.pocket = null;
    this.applyEra(ERA.PRESENT, true);
    this.refreshWorld();
    this.player.place(GARDEN.door, 0, 0.8);
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
    setTimeout(() => this.hud.toast(`The <b>Escapement</b> fits your wrench, too: ${touchActive() ? 'tap the wrench under your hearts' : 'press <kbd>T</kbd>'} to fit it, then hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} and let go to slow a creature (or a Warden) to a crawl.`, 8000), 8400);
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
    this.save();
    this.hud.toast('The east wall beside the deck has opened. Walk on into the clock.', 5000);
  }

  /** Walking into the clock (through the deck's doorway, or the door on the Tower floor): the ages wind together there, into the Present. */
  updateClockEntry(f) {
    if (!this.gearworks.active || this.mode !== 'play') return;
    if (this.era !== ERA.PRESENT && this.post.trans > 0.95) this.doShift(ERA.PRESENT);
    if (!f.gearworksToast) {
      f.gearworksToast = true;
      this.state.checkpoint = 11;
      this.save();
      this.hud.toast(touchActive() ? 'Inside the clock there is only <b>Tempo</b>: hold <b>Slow</b> or <b>Fast</b>.' : 'Inside the clock, <kbd>Q</kbd> and <kbd>E</kbd> are always <b>Tempo</b>: hold to slow time around you, or speed it up.', 7000);
    }
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
    await new Promise((r) => setTimeout(r, 600));
    // the face: up on the west wall, it lights warm gold, and its hands begin to turn
    this.camFocus = new THREE.Vector3(TOWER_FACE.x, TOWER_FACE.y - 2.5, 3.5);
    await new Promise((res) => setTimeout(res, 900));
    this.state.flags.towerLit = true;
    this.towerHands.spin = 3;
    this.refreshWorld();
    audio.sfx('gate');
    this.bursts.emit(TOWER_FACE.x, TOWER_FACE.y, 1, 70, { color: [0xffe0a0, 0xfff6e0], speed: 4, life: 1.3, gravity: 0 });
    [262, 330, 392, 523].forEach((freq, i) => setTimeout(() => audio.sfx('bell', { freq }), 500 + i * 650));
    await new Promise((res) => setTimeout(res, 3400));
    this.camFocus = null;
    await new Promise((res) => setTimeout(res, 700));
    // Donald Eugene appears
    const os = new NPC(this, { type: 'npc', id: 'eugeneEnd', era: ERA.PRESENT, x: b.x + 2.2, z: b.z, sheet: 'eugene', name: 'Donald Eugene' });
    this.npcs.push(os);
    this.entities.push(os);
    this.bursts.emit(os.x, 1, os.z, 60, { color: [0x9ff4ff, 0xffffff], speed: 4, life: 1 });
    audio.sfx('shift', { era: 1 });
    letterbox(true);
    // all ten Lost Cogs: Donald Eugene fits them to the Chronoheart, before supper
    const allCogs = this.state.cogs.length >= COG_TOTAL;
    const ending = ENDING.flatMap((l) => (l.slip ? endingSlip(this.state.flags) : [l]));
    await this.dialogue.run(allCogs ? [...ending.slice(0, -1), ...ENDING_COGS, ending[ending.length - 1]] : ending);
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

  /** A Stasis wave (src/kit.js) holds Hollowmere's creatures for good, as the ring does. */
  sealEnemy(e) {
    if (!CREATURES[e.spec.kind]) return false;
    this.abilities.sealCreature(e);
    return true;
  }

  /** A wrench on a creature held where it was held: it shatters (an exhibit, in a later age, is behind a rope). */
  onAttack(x, y, z) {
    for (const e of this.entities) {
      if (!e.rec || !e.alive || e.era !== this.era || e.rec.era !== this.era) continue;
      if (Math.abs(e.x - x) < 1.1 && Math.abs(e.z - z) < 1 && y > e.y - 0.6 && y < e.y + 1.6) return this.abilities.shatterFrozen(e);
    }
  }

  /** Small things a Stasis wave can hold for good (see CURIOS): the figs, and Karen Louise's tea. */
  sealTargets() {
    const f = this.state.flags;
    if (!f.hasSeal) return [];
    return CURIOS.filter((c) => c.era === this.era && !f[c.flag]).map((c) => ({
      x: c.x, y: c.id === 'figs' ? 0.55 : 0.75, z: c.z, name: c.name,
      seal: async () => {
        f[c.flag] = true;
        this.refreshWorld();
        this.save();
        audio.sfx('shift', { era: this.era });
        await this.timelapse({ to: ERA.FUTURE, focus: [c.x, 1, c.z + 1], years: c.era === ERA.PAST ? 900 : 300, caption: `Held in its moment, ${c.name} waits out the centuries...`, effect: 'shine', grow: ['curios'] });
        this.hud.toast(`${c.name[0].toUpperCase() + c.name.slice(1)}: still there in the <b>Future</b>. Somebody has made an exhibit of it.`, 6000);
      },
    }));
  }

  /** Someone held still for a moment in an earlier age: the valley never forgets it. */
  onNpcSealed(npc) {
    if (npc.era === ERA.FUTURE) return;
    if (!this.state.flags.stillness) this.hud.toast('Six seconds of perfect stillness. Somebody is bound to remember that.', 4500);
    this.state.flags.stillness = true;
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

    // walking out of Donald Eugene's hideaway or the Starlit Garden
    if (this.world.pocket && ctl && this.player.body.z > -0.7) {
      if (this.world.pocket.id === 'garden') this.leaveGarden();
      else this.leaveStudy();
    }

    // entities
    this.player.update(dt);
    if (this.era === ERA.PRESENT && this.player.body.onGround) this.lastSafePresent = { x: this.player.body.x, y: this.player.body.y, z: this.player.body.z };
    this.updateEntities(dt);
    this.updateRollSpots(f);
    this.vaultSteam(dt, f);
    this.updateClockEntry(f);
    if (ctl) this.updateRipples(dt, f);

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
    } else if (seal) this.hud.showPrompt(null, 'seal'); // (what can be sealed glows white instead)
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
  /**
   * Donald Eugene, adjusting the valley while his apprentice is out in it (see Game.ripple).
   * She holds the other half of the Chronoheart, so she sees every change; nobody else does.
   */
  updateRipples(dt, f) {
    if (!f.hasAmulet || this.era !== ERA.PRESENT || this.world.pocket) return;
    const x = this.player.body.x;
    const N = (text) => ({ who: null, name: '', text });
    const V = (text) => ({ who: 'vivienne', name: 'Vivienne', text });
    // the bakery's sign, as she walks out of the square
    if (!f.bakeryChanged && x > BAKERY.x - 1.5 && x < BAKERY.x + 2) {
      this.ripple({
        at: [BAKERY.x, 2.3, 0.8],
        apply: () => (f.bakeryChanged = true),
        lines: [
          N('The sign over the bakery door shivers, like heat over a road... and settles.'),
          V("MARLOW'S BAKERY... no. HALE'S BAKERY?"),
          V("It's been Marlow's my whole life. I've bought bread there every week since I was nine."),
          N('Nobody else in the square even looks up.'),
        ],
      });
      return;
    }
    // Sheng, a moment after he has sent her off
    if (f.metSheng && !f.shengKind && Math.abs(x - 160.5) > 3 && Math.abs(x - 160.5) < 10) {
      this.ripple({
        at: [160.5, 1.2, 1.2],
        apply: () => (f.shengKind = true),
        lines: [
          N('Behind you, the air shivers, like heat over a road.'),
          { who: 'sheng', name: 'Sheng the Gatekeeper', text: 'Bye now, Vivienne! Lovely day for it!' },
          V("...Sheng has never said \"lovely day\" in his life."),
        ],
      });
      return;
    }
    // stuck at the town wall a long while: somebody makes it easier
    if (!f.donLadder && !f.acornPlanted && !f.acornPlantedM && x > 79 && x < L.wallX0) {
      this.wallT = (this.wallT || 0) + dt;
      if (this.wallT > 150) {
        this.ripple({
          at: [L.wallX0 - 0.5, 3, 5.4],
          apply: () => (f.donLadder = true),
          lines: [V('...That ladder was not there a minute ago.'), V("I'd have seen it. I've been staring at this wall for ages.")],
        });
      }
    }
  }

  /** Aria's quench-vault breathes steam, and glints, while there's a cracked hammer to put in it. */
  vaultSteam(dt, f) {
    if (this.era !== ERA.PRESENT || f.hammerLeft) return;
    const x = 112.5, waiting = this.state.inventory.includes('hammerBroken');
    if (Math.abs(this.player.body.x - x) > 24) return;
    if (Math.random() < dt * (waiting ? 10 : 3)) this.bursts.emit(x + 0.45, 2.0, 0.35, 1, { color: [0xf4f4f8, 0xd8dce4], speed: 0.5, life: 1.6, gravity: -1.2, jitter: 0.2, glow: 1 });
    if (waiting && Math.random() < dt * 10) this.bursts.emit(x - 0.6 + Math.random() * 1.4, 0.3 + Math.random() * 1.0, 1.2, 1, { color: [0xffd070, 0xffffff], speed: 0.3, life: 0.9, gravity: -0.6, glow: 2 });
  }

  /** The places only a roll gets through: the Future corridor's laser fence, and the postern's crawlspace. */
  updateRollSpots(f) {
    const p = this.player, b = p.body, roll = touchActive() ? 'tap <b>Roll</b>' : 'press <kbd>C</kbd>';
    const lf = LASER_FENCE, mid = (lf.x0 + lf.x1) / 2;
    if (this.era === ERA.FUTURE && b.z > lf.z0 - 0.5 && b.z < lf.z1 + 0.5) {
      if (!f.laserHint && Math.abs(b.x - mid) < 3.5) {
        f.laserHint = true;
        this.hud.toast(`A laser fence, with a gap along the floor. Too low to walk under, too high to jump: ${roll} to roll beneath it.`, 6000);
      }
      const inside = b.x + b.hw > lf.x0 && b.x - b.hw < lf.x1;
      if (!inside) this.laserSide = Math.sign(b.x - mid);
      else if (p.state !== 'roll' && lf.beams.some((y) => y + 0.05 > b.y && y < b.y + b.h)) {
        // it burns, and (even while you're still smarting from the last time) it won't let you by
        if (p.invuln <= 0) this.bursts.emit(b.x, b.y + 1, b.z, 14, { color: [0xff2030, 0xffa0a0], speed: 3, life: 0.4 });
        p.hurt(1, mid);
        const side = this.laserSide || -1;
        b.x = side < 0 ? lf.x0 - b.hw - 0.01 : lf.x1 + b.hw + 0.01;
        if (Math.sign(b.vx) === -side) b.vx = 0;
      }
    }
    if (!f.crawlHint && this.era === ERA.PRESENT && f.posternOpen && b.onGround && b.z > 2 && b.x > POSTERN_SAG.x0 - 2 && b.x < POSTERN_SAG.x1 + 3) {
      f.crawlHint = true;
      this.hud.toast(`The roof has caved in to a crawlspace. ${roll[0].toUpperCase() + roll.slice(1)} to roll through.`, 5000);
    }
  }

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
          V("It's as if somebody has changed it so many times it can't make up its mind which age it's in. Once it's running again, it should hold steady."),
        ])
        .then(() => {
          if (this.mode === 'dialogue') this.mode = 'play';
          this.lockT = 0.2;
        });
    }, 900);
  }
}
