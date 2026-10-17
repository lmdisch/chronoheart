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
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL, SPINNERS, inFrost, tierAt, gy, zb } from './level.js';
import { talk, interact, struck, runCommand, ITEMS, INTRO, FAVORS, MEET, RELEASE, SUMMIT, REUNION, COGS_ENDING, CHOICE, CHOICES, ENDINGS, VIEW } from './story.js';
import { currentGoal } from './objectives.js';
import { Powers, BUBBLE_R } from './powers.js';

const M = ERA.PRESENT, F = ERA.FUTURE;
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
  }
  syncBody() {
    this.powers.syncBody();
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

  /** Not after the last shift; not in the frost; not off ground only the Lantern's age is holding up. */
  canShift() {
    const f = this.state.flags, b = this.player.body;
    if (f.endingAge !== undefined) {
      this.hud.toast("The Chronoheart's last shift is spent. You live here now.", 3500);
      return false;
    }
    if (inFrost(b.x, b.y, b.z)) {
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
      this.hud.toast(`<b>Echo!</b> ${key('V', 'Echo')} to start recording yourself, ${key('V', 'Echo')} again to stop. Your echo does it again, then waits.`, 8000);
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
    if (this.state.cogs.length >= COG_TOTAL) setTimeout(() => this.hud.toast("That's all ten! Donald Eugene will want to hear about this.", 5000), 2500);
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

  /** Talking to Sir Christopher with the Stopped Age lit beside him: the hours go home. */
  use(target) {
    const f = this.state.flags, bb = this.world.bubble;
    if (target.id === 'christopher' && f.summitTalk && !f.hoursReturned) {
      const near = bb && bb.age === F && Math.hypot(bb.x - target.x, bb.y - (target.y + 1)) < BUBBLE_R + 1.5;
      if (near) return void this.runFinale();
    }
    super.use(target);
  }

  // ------------------------------------------------------------------ story set pieces
  /** On the terrace: Sir Christopher, in front of the statue. */
  async meetChristopher() {
    const f = this.state.flags;
    f.christopherMet = true;
    const ch = new NPC(this, { type: 'npc', id: 'christopherMeet', era: M, x: L.statueX + 1.6, y: gy(2, L.statueX + 1.6), z: zb(2) + 2.4, sheet: 'christopher', name: 'Sir Christopher' });
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

  /** The hours go home: a sunset fifty years late, Donald Eugene up the last switchback, and the last shift. */
  async runFinale() {
    if (this.mode === 'ending') return;
    const f = this.state.flags;
    this.mode = 'dialogue';
    this.hud.showPrompt(null);
    await this.cutscene(RELEASE);
    this.mode = 'ending';
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

  // ------------------------------------------------------------------ per-frame
  updatePlay(dt) {
    const s = this.state, f = s.flags;
    s.playTime += dt;
    this.lockT = Math.max(0, this.lockT - dt);
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
    for (const st of this.statues || []) st.update(0);
    // the orrery's rings, the clockworks' gears, the lighthouse beam far below: turning where time runs
    for (const sp of SPINNERS) if (sp.era === this.era) sp.obj.rotation[sp.axis] += (sp.speed || (f.hoursReturned ? 0.12 : 0)) * dt; // (the Stopped Age's start again, slowly, once it thaws)

    // talking and using things
    const near = ctl ? this.nearestInteractive() : null;
    this.hud.showPrompt(near ? (near.prompt ? near.prompt() : 'Interact') : null);
    if (near && input.hit('interact')) this.use(near);

    // the story, where you walk into it
    if (ctl && this.era === M && !f.christopherMet && b.x >= L.metX && b.x < L.metX + 12 && tierAt(b.z) === 2) this.meetChristopher();
    else if (ctl && this.era === M && !f.summitTalk && f.christopherMet && tierAt(b.z) === 5 && b.x < L.christopherX + 8) {
      f.summitTalk = true;
      this.cutscene(SUMMIT).then(() => this.save());
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
