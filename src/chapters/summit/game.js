// Chapter Three, Highcrest: the Lantern and the Echo, the frost (Donald Eugene's seals), the
// shimmer at the Needle, the fight at the End of Time, and the night after. Everything every
// chapter shares is in src/game.js. (Some names here are older than the story: 'christopher' is
// Donald Eugene on his throne, and the 'orin' phases are the fight against him.)
import * as THREE from 'three';
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { ATMOS } from '../../render/renderer.js';
import { GRADES } from '../../render/post.js';
import { Actor } from '../../render/actors.js';
import { NPC } from '../../world/entities.js';
import { setFade, letterbox } from '../../ui/ui.js';
import { touchActive } from '../../ui/touch.js';
import { Game, baseState, wait } from '../../game.js';
import { progress } from '../../chapter.js';
import theme, { ATMOS_GOLDEN, ATMOS_STOPPED, ATMOS_NIGHT, ATMOS_WAKING, GRADE_GOLDEN, GRADE_STOPPED, GRADE_NIGHT, GRADE_WAKING } from './theme.js';
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL, SPINNERS, inFrost, tierAt, gy, zb, ARENA, inArena } from './level.js';
import { talk, interact, struck, runCommand, ITEMS, INTRO, FAVORS, MEET, MEMORY, RELEASE, summitLines, ARRIVE, REUNION, AFTER, COGS_ENDING, VIEW, GONE, SQUIRRELS } from './story.js';
import { currentGoal } from './objectives.js';
import { Powers } from './powers.js';

const M = ERA.PRESENT, F = ERA.FUTURE;

/** The End of Time's light: a dark with no sky in it, and gold coming up out of the cracks. */
const ATMOS_END = {
  skyTop: 0x07050c, skyHorizon: 0x3a2412, fog: 0x120c16, fogNear: 50, fogFar: 130,
  sun: 0xffe2b8, sunI: 2.2, sunDir: [-0.45, 0.85, 0.55],
  hemiSky: 0xd8c8f0, hemiGround: 0x4a3a2a, hemiI: 1.9, exposure: 1.1, emissive: 1.4, glow: 1.5, bloom: 0.45, stars: 0.8, twinkle: 0,
  cloudTop: 0x1a1420, cloudShade: 0x050308, cloudGlow: 0xffb040, cloudGlowAmt: 0.05, cloudSpeed: 0, handSpeed: 0, handShadow: 0,
};
const GRADE_END = { tint: [1.06, 1.0, 0.92], shadowTint: [0.86, 0.82, 1.0], saturation: 1.1, contrast: 1.12, vignette: 0.5, rays: 0.0, rayColor: [1.0, 0.8, 0.5] };
const key = (k, touch) => (touchActive() ? `<b>${touch}</b>` : `<kbd>${k}</kbd>`);

export class SummitGame extends Game {
  constructor(container) {
    super(container, { L, buildLevel, SPAWNS, CHECKPOINTS, AREAS, COG_TOTAL, talk, interact, struck, ITEMS, INTRO, FAVORS, currentGoal });
  }

  // ------------------------------------------------------------------ the chapter's hooks (see Game)
  /** What the earlier chapters send up the mountain with you. */
  carried() {
    const inv = [];
    if (progress.hasReward('cogFinder')) inv.push('finder');
    if (progress.hasReward('ownWatch') || progress.slot('saltwick')?.flags?.ownWatch) inv.push('myWatch');
    return inv;
  }
  newState() {
    return { ...baseState(), flags: { hasAmulet: true }, inventory: this.carried(), lanternAge: null };
  }
  migrate() {
    for (const it of this.carried()) if (!this.state.inventory.includes(it)) this.state.inventory.push(it);
  }
  setup() {
    this.lensPref = F;
    this.powers = new Powers(this);
  }
  attach() {
    this.powers.attach();
    this.inArenaMood = false;
    this.placeOrin();
    this.hallSquirrels = null;
    this.placeSquirrels();
    // the statue of the Founder, on the terrace (in stone; and frosted, in the Stopped Age)
    this.statues = [M, F].map((era) => {
      const a = new Actor('statueDon', 2.1);
      if (era === F) a.mat.color.setHex(0xd8e4ff); // frosted
      a.mesh.scale.setScalar(1.45);
      a.mesh.position.set(L.statueX + 0.5, gy(2, L.statueX) + 2, zb(2) - 3);
      a.update(0);
      this.world.groups[era].add(a.mesh);
      return a;
    });
    this.setupOrinBossMeshes();
  }
  syncBody() {
    this.powers.syncBody();
  }
  /** Visuals for the three phases of the fight at the End of Time. */
  setupOrinBossMeshes() {
    if (this.bossGroup) this.scene.remove(this.bossGroup);
    this.bossGroup = new THREE.Group();
    const A = ARENA, ny = A.y, cz = (A.z0 + A.z1 + 1) / 2;
    // a ring of frost turning round Donald Eugene on his throne, until his locks are broken
    this.bossRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.09, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x6ce2ff, transparent: true, opacity: 0.75 }),
    );
    this.bossRing.rotation.x = Math.PI / 2;
    this.bossRing.position.set(A.orinX, ny + 2.35, cz);
    // Phase 1: waves of frost, rolling off the dais and down the hall
    this.frostWave = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.35, A.z1 - A.z0 + 1),
      new THREE.MeshBasicMaterial({ color: 0x8ae8ff, transparent: true, opacity: 0.65 }),
    );
    this.frostWaveX = A.shieldX - 0.5;
    this.frostWave.position.set(this.frostWaveX, ny + 0.68, cz);
    // Phase 2: the shadow of a gnomon, sweeping round between the two Frost-Lock plates
    this.gnomonPivot = new THREE.Group();
    this.gnomonPivot.position.set(A.platesX + 0.5, ny + 0.32, cz);
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.18, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x6ce2ff, transparent: true, opacity: 0.8 }),
    );
    this.gnomonPivot.add(beam);
    this.bossGroup.add(this.bossRing, this.frostWave, this.gnomonPivot);
    this.scene.add(this.bossGroup);
  }
  startOrinBoss() {
    this.frostWaveX = ARENA.shieldX - 0.5;
    this.hud.toast(
      `<b>Phase 1/3:</b> Waves of rewritten time roll down the hall. Light the <b>Lantern</b> (${key('R', 'Lantern')}) on the <b>First Age</b>: its old light carries you through them (or jump them). Then strike the <b>Anchor-Clock</b> three times (${key('X', 'Attack')})!`,
      7000,
    );
  }

  /** Through the shimmer at the Needle, to the End of Time (see ARENA). first: the first time, with words. */
  async enterArena(first) {
    const f = this.state.flags;
    this.mode = 'cutscene';
    this.hud.showPrompt(null);
    this.powers.clearEchoes?.();
    setFade(1, '#fff2d0');
    audio.sfx('shift', { era: M });
    this.renderer.shake = 1.2;
    await wait(700);
    this.refreshWorld(); // (the hall only exists while the fight is on)
    this.applyEra(M, true);
    this.player.place(ARENA.startX, ARENA.y, (ARENA.z0 + ARENA.z1) / 2);
    this.player.facing = 1;
    this.state.checkpoint = 6;
    this.arenaMood(true);
    this.placeOrin();
    setFade(0);
    this.mode = 'play';
    if (first) {
      await this.cutscene(ARRIVE);
      this.startOrinBoss();
    }
    this.lockT = 0.3;
    this.save();
  }

  /** The End of Time has a light of its own; anywhere else, the chapter's usual one. */
  arenaMood(on) {
    if (this.inArenaMood === on) return;
    this.inArenaMood = on;
    if (on) {
      for (const k of ['aurora', 'auroraA', 'auroraB', 'moon', 'moonDir', 'moonSize', 'moonCol', 'rings', 'ringCol', 'sunSky']) delete ATMOS[M][k];
      Object.assign(ATMOS[M], ATMOS_END);
      GRADES[M] = GRADE_END;
    } else this.setMood();
    this.renderer.setEra(this.era, true);
    this.post.setGrade(this.era);
    this.hideMountain(on);
  }

  /** At the End of Time there is nothing else: the mountain, its features and its far views aren't drawn. */
  hideMountain(on) {
    for (const g of this.world.groups) for (const c of g.children) if (c.userData.scenery) c.visible = !on;
    for (const f of this.world.features) if (f.id !== 'endOfTime') for (const ms of f.meshes) for (const m of ms || []) m.visible = !on;
  }

  /** Donald Eugene: on his throne at the End of Time while the fight is on. */
  placeOrin() {
    const o = this.npcs.find((n) => n.id === 'christopher'), f = this.state.flags;
    if (!o) return;
    const fight = f.summitTalk && !f.hoursReturned;
    o.x = fight ? ARENA.orinX : o.spec.x;
    o.y = fight ? ARENA.y + 2 : o.spec.y;
    o.z = fight ? (ARENA.z0 + ARENA.z1 + 1) / 2 : o.spec.z;
  }
  onOrinPhase1Done() {
    this.hud.toast(
      `<b>Phase 2/3: the Anchor-Clock is broken!</b> Record an <b>Echo</b> (${key('V', 'Echo')}) on one of his blue lock plates and stand on the other yourself, jumping the gnomon's sweeping shadow!`,
      7500,
    );
  }
  async onOrinPhase2Done() {
    this.bursts.emit(ARENA.orinX, ARENA.y + 2.2, (ARENA.z0 + ARENA.z1 + 1) / 2, 45, { color: [0x6ce2ff, 0xffe08a, 0xffffff], speed: 4.5, life: 0.9 });
    this.placeSquirrels();
    await this.cutscene(SQUIRRELS);
    this.hud.toast(
      `<b>Phase 3/3:</b> He is rewriting Zach and Megan! Hold them in their moment with a <b>Stasis wave</b>: hold ${key('X', 'Attack')}, then let go. Then hold <b>him</b>.`,
      8000,
    );
  }

  /** Zach and Megan, flickering by the door as he rubs them out (phase three). */
  placeSquirrels() {
    const f = this.state.flags;
    if (!f.orinPhase2 || f.hoursReturned || this.hallSquirrels) return;
    const cz = (ARENA.z0 + ARENA.z1 + 1) / 2;
    this.hallSquirrels = [['zachHall', 'zachWinter', 'Zach Tiberious', 'zachHeld', 0.8], ['meganHall', 'meganWinter', 'Megan the Squirrel', 'meganHeld', -0.9]].map(([id, sheet, name, flag, dz]) => {
      const n = new NPC(this, { type: 'npc', id, era: M, x: ARENA.startX + 3 + (dz > 0 ? 0 : 1.2), y: ARENA.y, z: cz + dz, sheet, name, small: true, noSeal: true });
      n.flag = flag;
      if (f[flag]) n.stasis(1e6);
      this.npcs.push(n);
      this.entities.push(n);
      return n;
    });
  }

  /** What a Stasis wave can hold here, beyond the usual (see src/kit.js): the squirrels, and then him. */
  sealTargets() {
    const f = this.state.flags, b = this.player.body;
    if (!f.orinPhase2 || f.hoursReturned || !inArena(b.x, b.y, b.z) || this.mode !== 'play') return [];
    const left = (this.hallSquirrels || []).filter((n) => !f[n.flag]);
    if (left.length) {
      return left.map((n) => ({
        x: n.x, y: n.y, z: n.z, name: n.spec.name,
        seal: () => {
          f[n.flag] = true;
          n.stasis(1e6);
          this.save();
          const still = (this.hallSquirrels || []).filter((q) => !f[q.flag]).length;
          this.hud.toast(still ? `${n.spec.name} is held in the moment: his rewrites slide right off. One more!` : 'Both held! His rewrites slide right off them. Now hold <b>him</b>.', 4500);
        },
      }));
    }
    const don = this.npcs.find((n) => n.id === 'christopher');
    return don ? [{ x: don.x, y: don.y - 2, z: don.z, name: 'Donald Eugene', seal: () => { don.stasis(1e6); this.runFinale(); } }] : [];
  }

  /** At the End of Time, once his locks are broken, the wave is always on her wrench. */
  forceWave() {
    const f = this.state.flags, b = this.player.body;
    return !!(f.orinPhase2 && !f.hoursReturned && inArena(b.x, b.y, b.z));
  }

  /** The shimmer at the foot of the Needle: through it, the first time with words. */
  async enterShimmer() {
    const f = this.state.flags;
    if (f.summitTalk) return this.enterArena(false);
    f.summitTalk = true;
    await this.cutscene(summitLines(f));
    return this.enterArena(true);
  }
  grantMasterKey() {
    const f = this.state.flags;
    if (f.masterKey) return;
    f.masterKey = true;
    progress.grantReward('masterKey');
    if (!this.state.inventory.includes('masterKey')) this.giveItem('masterKey');
    this.save();
  }
  /** After the hours go home: a midwinter night in the Present, and the Stopped Age thawing. */
  setMood() {
    const home = !!this.state.flags.hoursReturned;
    Object.assign(ATMOS[1], home ? ATMOS_NIGHT : ATMOS_GOLDEN);
    Object.assign(ATMOS[2], home ? ATMOS_WAKING : ATMOS_STOPPED);
    if (!home) for (const k of ['aurora', 'auroraA', 'auroraB', 'moon', 'moonDir', 'moonSize', 'moonCol', 'rings', 'ringCol', 'sunSky']) {
      if (!(k in ATMOS_GOLDEN)) delete ATMOS[1][k];
    }
    GRADES[1] = home ? GRADE_NIGHT : GRADE_GOLDEN;
    GRADES[2] = home ? GRADE_WAKING : GRADE_STOPPED;
    if (this.ambient) this.ambient.systems[2].cfg.vy = home ? -0.5 : 0; // the snow falls again
    if (this.ambient) this.ambient.systems[2].cfg.drift = home ? 0.6 : 0;
  }
  eraLabel(era) {
    if (this.state.flags.hoursReturned) {
      if (era === M) return 'Midwinter Night';
      if (era === F) return 'The Waking Age';
    }
    return super.eraLabel(era);
  }
  afterIntro() {
    // he is right there at Base Camp... and then he simply isn't
    if (!this.state.flags.donAhead) {
      const d = this.npcs.find((n) => n.id === 'eugeneCamp');
      setTimeout(() => this.ripple({ at: [d?.x ?? L.start.x + 2, (d?.y ?? 0) + 1, d?.z ?? 3], apply: () => (this.state.flags.donAhead = true), lines: GONE }).then(() => this.firstToasts()), 400);
      return;
    }
    this.firstToasts();
  }
  firstToasts() {
    if (touchActive()) this.hud.toast('Drag the left side to move. Swipe to change age: left for the Future, right for the Past.', 7000);
    else {
      this.hud.toast('Move <kbd>WASD</kbd> · Jump <kbd>Space</kbd> · Interact <kbd>F</kbd> · All controls <kbd>H</kbd>. Where the road turns back, <kbd>W</kbd> walks up it.', 6000);
      setTimeout(() => this.hud.toast('<b>The Chronoheart:</b> <kbd>Q</kbd> Past · <kbd>E</kbd> Future · hold <kbd>Tab</kbd> for the time lens.', 7000), 6200);
    }
    this.save();
  }
  welcomeBack() {
    return this.state.flags.finished ? 'Welcome back, Vivienne. It is Midwinter Night on Highcrest.' : 'Welcome back, Vivienne.';
  }
  continueGame() {
    if (this.state.flags.finished) this.state.flags.lyraAtRest = true;
    super.continueGame();
  }

  /** Further forward than the Stopped Age, there is nothing to go to: Vivienne says so. */
  tryShift(target) {
    const f = this.state.flags;
    if (target > ERA.FUTURE && !f.hoursReturned && this.post.trans > 0.9) {
      audio.sfx('blocked');
      this.hud.toast('<b>Vivienne:</b> "I can\'t go any further forward. After this, everything is frozen. There isn\'t any future to go to."', 4500);
      return;
    }
    super.tryShift(target);
  }

  /** The first time in the Stopped Age, Vivienne sees what it means. */
  noticeStoppedAge(f) {
    if (f.stoppedSeen || f.hoursReturned || this.era !== ERA.FUTURE || this.post.trans < 0.95 || this.mode !== 'play') return;
    f.stoppedSeen = true;
    this.hud.toast('<b>Vivienne:</b> "This is as far forward as the Chronoheart will go. Nothing moves. Nothing will ever go wrong again, because nothing will ever happen again."', 7000);
  }

  /** Not in the frost (his seals), and not at the End of Time. */
  canShift() {
    const f = this.state.flags, b = this.player.body;
    if (inArena(b.x, b.y, b.z)) {
      audio.sfx('blocked');
      this.hud.toast('There are no ages here to step between. Only the end of all of them. (The Lantern still works.)', 4000);
      return false;
    }
    if (inFrost(b.x, b.y, b.z) && !f.hoursReturned) {
      audio.sfx('blocked');
      this.hud.toast(`Somebody has sealed the ages still here: the Chronoheart can't shift. The Lantern still works (${key('R', 'Lantern')}).`, 4000);
      return false;
    }
    return true;
  }
  unlockPower(which) {
    const f = this.state.flags;
    audio.sfx('key');
    if (which === 'lantern') {
      f.hasLantern = true;
      this.hud.toast(`<b>The Lantern!</b> It holds the age you last stepped out of. ${key('R', 'Lantern')} lights it: inside its light, that age is real.`, 8000);
    } else {
      f.hasEcho = true;
      this.hud.toast(`<b>Echo!</b> ${key('V', 'Echo')} to start recording yourself, ${key('V', 'Echo')} again to stop. Your echo remembers your path—and your Lantern's light!`, 8000);
    }
    this.powers.syncBody();
    this.save();
  }
  get lines() {
    return { spotted: ['Spotted!', 3000], searchlight: ['', 0] };
  }
  hazardBurst() {
    return [0xdff0ff, 0xffffff];
  }
  onHazardDone() {
    const f = this.state.flags;
    if (!f.coldHint && this.player.hp > 0) {
      f.coldHint = true;
      this.hud.toast('Too cold to touch! It costs a heart, and puts you back on solid ground.', 4500);
    }
  }
  interrupt() {
    if (this.powers?.recording) this.powers.stopRecording();
  }
  onCog() {
    if (this.state.cogs.length >= COG_TOTAL) {
      setTimeout(() => this.hud.toast("That's all ten Lost Cogs! Orin, at the summit, could make something of these.", 5500), 2500);
    }
  }

  /** The Lantern's bubble shows like the time lens, round the lantern (the lens itself wins while held). */
  renderPeek() {
    if (this.peekTarget === null && !this.swipePeek && !(this.blockFlashT > 0) && this.powers.drawBubble()) return;
    super.renderPeek();
  }

  /** The Cog Finder: through the lens, a Lost Cog nearby sends up gold. */
  findCogs(dt) {
    if (!this.state.inventory.includes('finder')) return;
    const b = this.player.body;
    for (const p of this.pickups) {
      if (p.spec.type !== 'cog' || p.era !== this.peekTarget || !p.available() || Math.abs(p.x - b.x) > 14 || Math.abs(p.y - b.y) > 10) continue;
      if (Math.random() < dt * 24) this.bursts.emit(p.x, p.y - 0.4 + Math.random() * 3.5, p.z, 1, { color: [0xffd070, 0xfff2c0], speed: 0.3, life: 1.0, gravity: -1.2, glow: 2 });
    }
  }


  // ------------------------------------------------------------------ story set pieces
  /** On the terrace: Orin, in front of the Founder's statue. */
  async meetChristopher() {
    const f = this.state.flags;
    f.christopherMet = true;
    const ch = new NPC(this, { type: 'npc', id: 'christopherMeet', era: M, x: L.statueX + 1.6, y: gy(2, L.statueX + 1.6), z: zb(2) + 2.4, sheet: 'orinOld', name: 'Orin' });
    this.npcs.push(ch);
    this.entities.push(ch);
    letterbox(true);
    this.mode = 'dialogue';
    await this.dialogue.run(MEET, (cmd) => runCommand(this, cmd));
    letterbox(false);
    this.mode = 'play';
    this.lockT = 0.3;
    ch.remove();
    this.npcs = this.npcs.filter((n) => n !== ch);
    // the frost reaches the doors: and Zach's flag, given in the scene
    this.renderer.shake = 0.4;
    this.refreshWorld();
    this.save();
  }

  /** Held in his moment, he has to listen. Then the mountain lets go, and an old friend is waiting. */
  async runFinale() {
    if (this.mode === 'ending') return;
    const f = this.state.flags;
    this.mode = 'dialogue';
    this.hud.showPrompt(null);
    await this.cutscene(RELEASE);
    this.mode = 'ending';
    // the End of Time comes apart, and the summit is all there is again
    setFade(1, '#fff2d0');
    await wait(600);
    for (const n of this.hallSquirrels || []) n.remove();
    this.npcs = this.npcs.filter((n) => !(this.hallSquirrels || []).includes(n));
    this.hallSquirrels = null;
    this.arenaMood(false);
    f.hoursReturned = true;
    this.placeOrin();
    this.player.place(L.OX + 26, gy(5, L.OX + 26), zb(5) + 3.5);
    setFade(0);
    // the Lantern goes out; his seals let go; the golden evening ends
    this.powers.clearEchoes();
    this.powers.lit = false;
    this.save();
    this.mode = 'play';
    this.applyEra(M, true);
    await this.timelapse({ to: M, focus: [L.needle.x + 0.5, gy(5, L.needle.x) + 2, L.needle.z + 4], years: 50, caption: 'Everything he held still lets go...', effect: 'shine' });
    this.mode = 'ending';
    setFade(1, '#05040a');
    await wait(600);
    this.setMood();
    this.renderer.setEra(M, true);
    this.post.setGrade(M);
    f.lyraAtRest = true; // (her cup, at the foot of the Needle)
    this.refreshWorld();
    this.player.place(L.OX + 26, gy(5, L.OX + 26), zb(5) + 3.5);
    this.player.facing = -1;
    this.player.update(0);
    setFade(0);
    letterbox(true);
    await wait(500);
    await this.dialogue.run(REUNION);
    if (this.state.cogs.length >= COG_TOTAL) {
      await this.dialogue.run(COGS_ENDING);
      this.grantMasterKey();
    }
    await this.dialogue.run(AFTER);
    letterbox(false);
    await this.runEnding();
  }

  async runEnding() {
    this.mode = 'ending';
    audio.sfx('fanfare');
    this.state.checkpoint = 5;
    this.finishStory();
    let fade = 0;
    await new Promise((res) => {
      const stepFade = () => {
        fade += 0.02;
        setFade(Math.min(1, fade), '#eaf2ff');
        if (fade < 1) requestAnimationFrame(stepFade);
        else res();
      };
      stepFade();
    });
    this.mode = 'credits';
    this.hud.show(false);
    this.player.mesh.visible = this.player.shadow.visible = false;
    this.onCredits?.(this.state);
  }

  /** Walking under the orrery, where the memory replays. */
  nearMemory(b) {
    const m = this.npcs.find((n) => n.id === 'youngLyra');
    return !!m && Math.abs(b.x - m.x - 0.7) < 2.5;
  }

  /** Step the three phases of the fight at the End of Time. */
  updateOrinBoss(dt, ctl) {
    const f = this.state.flags, b = this.player.body;
    const active = f.summitTalk && !f.hoursReturned && inArena(b.x, b.y, b.z);
    if (!this.bossGroup) return;
    this.bossRing.visible = active && !f.orinPhase2;
    this.frostWave.visible = active && !f.orinPhase1;
    this.gnomonPivot.visible = active && !!f.orinPhase1 && !f.orinPhase2;
    if (!active) return;

    const ny = ARENA.y;
    this.bossRing.rotation.z += dt * 1.4;

    // Phase 1: waves of frost roll off the dais and down the hall, one after another
    if (!f.orinPhase1) {
      this.frostWaveX -= dt * 5.2;
      if (this.frostWaveX < ARENA.x0 + 0.5) this.frostWaveX = ARENA.shieldX - 0.5;
      this.frostWave.position.x = this.frostWaveX;
      if (ctl && Math.abs(b.x - this.frostWaveX) < 0.65 && b.y < ny + 1.3) {
        const shielded = this.powers.lit && this.powers.age === ERA.PAST;
        if (shielded) {
          if (Math.random() < dt * 15) {
            this.bursts.emit(this.frostWaveX, b.y + 0.8, b.z, 4, { color: [0xffb84a, 0x9fe8ff], speed: 2, life: 0.4 });
          }
        } else {
          this.player.hurt(1, this.frostWaveX + 1);
          if (!f.waveHint) {
            f.waveHint = true;
            this.hud.toast(`<b>Frost Wave!</b> Light your <b>Lantern</b> (${key('R', 'Lantern')}) on the <b>First Age</b> to walk right through it!`, 5500);
          }
        }
      }
    }

    // Phase 2: Sweeping Gnomon Shadow-Beam between the two Frost-Lock plates
    if (f.orinPhase1 && !f.orinPhase2) {
      this.gnomonPivot.rotation.y += dt * 1.65;
      if (ctl && b.y < ny + 0.45) {
        const dx = b.x - this.gnomonPivot.position.x;
        const dz = b.z - this.gnomonPivot.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3.6 && dist > 0.3) {
          const ang = -this.gnomonPivot.rotation.y;
          const rx = dx * Math.cos(ang) - dz * Math.sin(ang);
          const rz = dx * Math.sin(ang) + dz * Math.cos(ang);
          if (Math.abs(rx) < 3.5 && Math.abs(rz) < 0.32) {
            this.player.hurt(1, this.gnomonPivot.position.x);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ per-frame
  updatePlay(dt) {
    const s = this.state, f = s.flags;
    s.playTime += dt;
    this.lockT = Math.max(0, this.lockT - dt);
    this.chimeHoldT = Math.max(0, (this.chimeHoldT || 0) - dt);
    const ctl = this.controlsEnabled();
    const b = this.player.body;

    // the time lens: hold it open on another age (Q / E choose which)
    const peeking = ctl && input.held('peek');
    if (peeking) {
      if (this.peekTarget === null) this.peekTarget = this.era === M ? this.lensPref : M;
      if (input.hit('back') && this.era > 0) this.peekTarget = this.era - 1;
      if (input.hit('forward') && this.era < 2) this.peekTarget = this.era + 1;
      if (this.era === M) this.lensPref = this.peekTarget;
      this.findCogs(dt);
    } else {
      this.peekTarget = null;
      if (ctl) {
        // (while the Lantern is lit, Q / E swing its light instead: see Powers)
        if (input.hit('back') && !this.powers.lit) this.tryShift(this.era - 1);
        if (input.hit('forward') && !this.powers.lit) this.tryShift(this.era + 1);
      }
    }

    this.powers.update(dt, ctl && !peeking);
    this.player.update(dt);
    this.updateEntities(dt);
    this.updateOrinBoss(dt, ctl);
    // Zach and Megan, half rubbed out, until a wave holds them
    for (const n of this.hallSquirrels || []) {
      const m = n.actor.mat;
      m.transparent = !f[n.flag];
      m.opacity = f[n.flag] ? 1 : 0.4 + Math.random() * 0.45;
    }
    this.arenaMood(f.summitTalk && !f.hoursReturned && inArena(b.x, b.y, b.z));
    if (this.inArenaMood) this.hideMountain(true); // (a feature rebuilt mid-fight comes back visible)
    this.noticeStoppedAge(f);
    for (const st of this.statues || []) st.update(0);
    // the orrery's rings, the clockworks' gears, the lighthouse beam far below: turning where time runs
    for (const sp of SPINNERS) if (sp.era === this.era) sp.obj.rotation[sp.axis] += (sp.speed || (f.hoursReturned ? 0.12 : 0)) * dt;

    // talking, using things, and striking chimes / brittle ice-locks with the wrench (X)
    const near = ctl ? this.nearestInteractive() : null;
    const strike = ctl && !near ? this.nearestStrike() : null;
    if (strike) {
      this.hud.showPrompt(strike.prompt(), 'strike');
      if (!f.strikeHint) {
        f.strikeHint = true;
        this.hud.toast(`Swing your wrench (${key('X', 'Attack')}) to strike chimes and shatter brittle ice-locks!`, 5000);
      }
    } else {
      this.hud.showPrompt(near ? (near.prompt ? near.prompt() : 'Interact') : null);
    }
    if (near && input.hit('interact')) this.use(near);

    // the story, where you walk into it
    if (ctl && this.era === M && !f.christopherMet && b.x >= L.metX && b.x < L.metX + 12 && tierAt(b.z) === 2) this.meetChristopher();
    // under the orrery, the first time: the echo Lyra left, of Midwinter Night fifty years ago
    else if (ctl && this.era === M && !f.memorySeen && f.christopherMet && !f.hoursReturned && tierAt(b.z) === 5 && this.nearMemory(b)) {
      f.memorySeen = true;
      this.cutscene(MEMORY).then(() => {
        this.hud.toast('An echo, left behind: <b>Midwinter Night, fifty years ago</b>.', 4000);
        this.save();
      });
    }
    // the overlook, the first time: the whole world, far below
    else if (ctl && !f.sawView && tierAt(b.z) === 5 && b.x <= L.overlookX1 && b.z < L.ZS - 4) {
      f.sawView = true;
      this.cutscene(VIEW[this.era]).then(() => this.save());
    }
    if (ctl && inFrost(b.x, b.y, b.z) && !f.frostHint && !f.hoursReturned) {
      f.frostHint = true;
      this.hud.toast(`<b>Frost.</b> The ages are frozen together here: the Chronoheart can't shift. Only the Lantern works (${key('R', 'Lantern')}).`, 6500);
    }
    this.updateGoalAndArea(dt);
  }
}
