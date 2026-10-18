// Chapter Three, Highcrest: the Lantern and the Echo, the frost, Sir Christopher, the hours going
// home, and the last shift, that decides which age Vivienne lives in. Everything every chapter
// shares is in src/game.js.
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
import { talk, interact, struck, runCommand, ITEMS, INTRO, FAVORS, MEET, RELEASE, SUMMIT, ARRIVE, REUNION, COGS_ENDING, CHOICE, CHOICES, ENDINGS, VIEW } from './story.js';
import { currentGoal } from './objectives.js';
import { Powers, BUBBLE_R } from './powers.js';

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
    // the statue of the first Clockmaker, on the terrace (in stone; and frosted, in the Stopped Age)
    this.statues = [M, F].map((era) => {
      const a = new Actor('statue', 2.1);
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
  /** Visuals for the 3-phase confrontation with Sir Orin at the Needle. */
  setupOrinBossMeshes() {
    if (this.bossGroup) this.scene.remove(this.bossGroup);
    this.bossGroup = new THREE.Group();
    const A = ARENA, ny = A.y, cz = (A.z0 + A.z1 + 1) / 2;
    // a ring of frost turning round Sir Orin on his throne, until his locks are broken
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
      `<b>Phase 1/3:</b> Light the <b>Lantern</b> (${key('R', 'Lantern')}) on the <b>First Age</b> to walk through Orin's Frost Waves (or jump them), then strike the <b>Frost-Anchor</b> three times (${key('X', 'Attack')})!`,
      7000,
    );
  }

  /** Sir Orin pulls Vivienne to the End of Time (see ARENA). first: the first time, with words. */
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

  /** Sir Orin: on his throne at the End of Time while the fight is on; at the Needle otherwise. */
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
      `<b>Phase 2/3: the Frost-Anchor is shattered!</b> Record an <b>Echo</b> (${key('V', 'Echo')}) on one blue Frost-Lock plate and stand on the other while dodging the sweeping gnomon beam!`,
      7500,
    );
  }
  onOrinPhase2Done() {
    this.bursts.emit(L.christopherX, gy(5, L.christopherX) + 1.2, L.ZS + 2.2, 45, {
      color: [0x6ce2ff, 0xffe08a, 0xffffff],
      speed: 4.5,
      life: 0.9,
    });
    this.hud.toast(
      `<b>Phase 3/3: his locks are broken!</b> Stand beside Sir Orin, light the <b>Lantern</b> (${key('R', 'Lantern')}), swing it to <b>the Stopped Age</b> (${key('E', 'Future')}), and talk to him!`,
      8000,
    );
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
    if (touchActive()) this.hud.toast('Drag the left side to move. Swipe to change age: left for the Future, right for the Past.', 7000);
    else {
      this.hud.toast('Move <kbd>WASD</kbd> · Jump <kbd>Space</kbd> · Interact <kbd>F</kbd> · All controls <kbd>H</kbd>. Where the road turns back, <kbd>W</kbd> walks up it.', 6000);
      setTimeout(() => this.hud.toast('<b>The Chronoheart:</b> <kbd>Q</kbd> Past · <kbd>E</kbd> Future · hold <kbd>Tab</kbd> for the time lens.', 7000), 6200);
    }
    this.save();
  }
  welcomeBack() {
    return this.state.flags.endingAge !== undefined ? 'Welcome back, Vivienne. The hours are home.' : 'Welcome back, Vivienne.';
  }
  continueGame() {
    super.continueGame();
    const age = this.state.flags.endingAge;
    if (age !== undefined) this.applyEra(age, true);
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
    this.hud.toast('<b>Vivienne:</b> "This is as far forward as the Chronoheart will go. Nothing moves. If the hour never ends, this is all the future there is."', 7000);
  }

  /** Not after the last shift (unless you forged the Master's Key!); not in the frost. */
  canShift() {
    const f = this.state.flags, b = this.player.body;
    if (inArena(b.x, b.y, b.z)) {
      audio.sfx('blocked');
      this.hud.toast('There are no ages here to step between. Only the end of all of them. (The Lantern still works.)', 4000);
      return false;
    }
    if (f.endingAge !== undefined && !f.masterKey && !this.state.inventory.includes('masterKey')) {
      this.hud.toast("The Chronoheart's last shift is spent. Find all ten Lost Cogs to forge the Master's Key!", 4000);
      return false;
    }
    if (inFrost(b.x, b.y, b.z) && !f.hoursReturned) {
      audio.sfx('blocked');
      this.hud.toast(`The frost holds the ages still here: the Chronoheart can't shift. The Lantern still works (${key('R', 'Lantern')}).`, 4000);
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
      if (this.state.flags.hoursReturned && !this.state.flags.masterKey) {
        this.grantMasterKey();
        setTimeout(() => this.hud.toast("<b>All ten Lost Cogs!</b> You forged <b>The Master's Key</b>—you can now shift freely across all ages and open Hollowmere's Astral Clock-Door!", 7000), 2200);
      } else {
        setTimeout(() => this.hud.toast("That's all ten Lost Cogs! Donald Eugene and Sir Orin can forge the <b>Master's Key</b> with these.", 5500), 2500);
      }
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

  /** Talking to Sir Orin with the Stopped Age lit beside him after breaking the Needle's locks: the hours go home. */
  use(target) {
    const f = this.state.flags, bb = this.world.bubble;
    if (target.id === 'christopher' && f.summitTalk && f.orinPhase2 && !f.hoursReturned) {
      const near = bb && bb.age === F && Math.hypot(bb.x - target.x, bb.y - (target.y + 1)) < BUBBLE_R + 1.8;
      if (near) return void this.runFinale();
    }
    super.use(target);
  }

  // ------------------------------------------------------------------ story set pieces
  /** On the terrace: Sir Orin, in front of the statue. */
  async meetChristopher() {
    const f = this.state.flags;
    f.christopherMet = true;
    const ch = new NPC(this, { type: 'npc', id: 'christopherMeet', era: M, x: L.statueX + 1.6, y: gy(2, L.statueX + 1.6), z: zb(2) + 2.4, sheet: 'christopher', name: 'Sir Orin' });
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

  /** The hours go home: a sunset fifty years late, Lyra waking for one final real hour, Donald Eugene up the last switchback, and the last shift. */
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
    this.arenaMood(false);
    f.hoursReturned = true;
    this.placeOrin();
    this.player.place(L.OX + 26, gy(5, L.OX + 26), zb(5) + 3.5);
    setFade(0);
    // the Lantern goes out; the frost melts; the Golden Hour ends
    this.powers.clearEchoes();
    this.powers.lit = false;
    f.hoursReturned = true;
    this.save();
    this.mode = 'play';
    this.applyEra(M, true);
    await this.timelapse({ to: M, focus: [L.needle.x + 0.5, gy(5, L.needle.x) + 2, L.needle.z + 4], years: 50, caption: 'Fifty years of borrowed hours go home...', effect: 'shine' });
    this.mode = 'ending';
    setFade(1, '#05040a');
    await wait(600);
    this.setMood();
    this.renderer.setEra(M, true);
    this.post.setGrade(M);
    this.refreshWorld();
    this.player.place(L.OX + 26, gy(5, L.OX + 26), zb(5) + 3.5);
    this.player.facing = -1;
    this.player.update(0);
    setFade(0);
    letterbox(true);
    await wait(500);
    const allCogs = this.state.cogs.length >= COG_TOTAL;
    await this.dialogue.run([...REUNION, ...(allCogs ? COGS_ENDING : []), ...CHOICE]);
    if (allCogs) this.grantMasterKey();
    letterbox(false);
    const age = await this.chooseAge();
    await this.runEnding(age);
  }

  /** The last shift: three ages, one choice. */
  chooseAge() {
    return new Promise((res) => {
      const panel = document.createElement('div');
      panel.className = 'glass panel choice-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Where will Vivienne stay?');
      const h = document.createElement('h2');
      h.textContent = 'Where will Vivienne stay?';
      panel.append(h);
      for (const c of CHOICES) {
        const btn = document.createElement('button');
        btn.className = `btn choice era-${c.era}`;
        btn.type = 'button';
        btn.innerHTML = `<span class="choice-title">${c.title}</span><span class="choice-text">${c.text}</span>`;
        btn.addEventListener('click', () => {
          audio.sfx('ui');
          panel.remove();
          res(c.era);
        });
        panel.append(btn);
      }
      document.body.append(panel);
      panel.querySelector('button')?.focus();
    });
  }

  async runEnding(age) {
    const f = this.state.flags;
    this.mode = 'ending';
    f.endingAge = age;
    audio.sfx('shift', { era: age });
    this.shiftEra(age, new THREE.Vector3(this.player.body.x, this.player.body.y + 1, this.player.body.z));
    await wait(1500);
    letterbox(true);
    await this.dialogue.run(ENDINGS[age]);
    letterbox(false);
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

  /** Step the 3-phase Needle encounter with Sir Orin. */
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
    else if (ctl && this.era === M && !f.summitTalk && f.christopherMet && tierAt(b.z) === 5 && b.x < L.christopherX + 8) {
      f.summitTalk = true;
      this.cutscene(SUMMIT).then(() => this.enterArena(true));
    }
    // (back on the summit mid-fight: the crack he opened at the Needle still leads to him)
    else if (ctl && f.summitTalk && !f.hoursReturned && tierAt(b.z) === 5 && !inArena(b.x, b.y, b.z) && b.x < L.christopherX + 4) this.enterArena(false);
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
