// Chapter Two, Saltwick: the pocketwatch (Rewind), reaching through the time lens, the timed
// gates, the Tide Well and its flood, and the ending that leaves the tide in. Everything every
// chapter shares is in src/game.js.
import { input } from '../../core/input.js';
import { ERA } from '../../core/util.js';
import { audio } from '../../audio/audio.js';
import { ATMOS } from '../../render/renderer.js';
import { GRADES } from '../../render/post.js';
import { NPC } from '../../world/entities.js';
import { setFade, letterbox } from '../../ui/ui.js';
import { touchActive } from '../../ui/touch.js';
import { Game, baseState, wait } from '../../game.js';
import { ATMOS_DRY, ATMOS_HEALED, GRADE_DRY, GRADE_HEALED } from './theme.js';
import { buildLevel, SPAWNS, CHECKPOINTS, AREAS, L, COG_TOTAL } from './level.js';
import { talk, interact, struck, ITEMS, INTRO, ENDING_A, ENDING_B, ENDING_COGS, FAVORS } from './story.js';
import { currentGoal } from './objectives.js';
import { Timecraft } from './timecraft.js';

export class SaltwickGame extends Game {
  constructor(container) {
    super(container, { L, buildLevel, SPAWNS, CHECKPOINTS, AREAS, COG_TOTAL, talk, interact, struck, ITEMS, INTRO, FAVORS, currentGoal });
  }

  // ------------------------------------------------------------------ the chapter's hooks (see Game)
  newState() {
    return {
      ...baseState(),
      flags: { hasAmulet: true }, // the Chronoheart is Vivienne's now, and mended: it never runs down
      inventory: ['watch'],
    };
  }

  setup() {
    this.lensPref = ERA.FUTURE; // which way the lens last looked from the Present
    this.craft = new Timecraft(this);
  }

  attach() {
    this.craft.attach();
  }

  syncBody() {
    this.craft.syncBody();
  }

  /** The Future is a salt desert until the tide comes home; then it's a living harbor at dusk. */
  setMood() {
    const healed = !!this.state.flags.tideRestored;
    Object.assign(ATMOS[2], healed ? ATMOS_HEALED : ATMOS_DRY);
    GRADES[2] = healed ? GRADE_HEALED : GRADE_DRY;
    document.body.classList.toggle('tide-in', healed);
  }

  afterIntro() {
    if (touchActive()) {
      this.hud.toast('Drag the left side to move. Swipe to change age: left for the Future, right for the Past.', 7000);
    } else {
      this.hud.toast('Move <kbd>WASD</kbd> · Jump <kbd>Space</kbd> · Interact <kbd>F</kbd> · All controls <kbd>H</kbd>', 6000);
      setTimeout(() => this.hud.toast('<b>The Chronoheart:</b> <kbd>Q</kbd> Past · <kbd>E</kbd> Future · hold <kbd>Tab</kbd> to look through the time lens.', 7000), 6200);
    }
    this.save();
  }

  welcomeBack() {
    return this.state.flags.finished ? 'Welcome back, Vivienne. The tide is in.' : 'Welcome back, Vivienne.';
  }

  /** While the watch is running you backward, the amulet has to wait. */
  canShift() {
    return !this.craft.rewinding;
  }

  get rewinding() {
    return this.craft.rewinding;
  }

  get lines() {
    return {
      spotted: ['Spotted! Break its line of sight, slip into another age, or <b>rewind</b> out of reach.', 4000],
      searchlight: ['Caught in a searchlight! The Warden is coming.', 4000],
    };
  }

  /** A struck bell rings out. The Dusk Bell's Warden hears every stroke. */
  onStrike(s) {
    if (s.id === 'duskBell' && !this.state.flags.duskRung) this.warden?.hunt(4.5);
  }

  /** Every last cog, after the story's told: Donald Eugene has his movement. */
  onCog() {
    const s = this.state;
    if (s.cogs.length >= COG_TOTAL && s.flags.finished && !s.flags.ownWatch) {
      setTimeout(() => this.hud.toast('All twelve! <b>Take them to Donald Eugene</b>, on the quay.', 6000), 2500);
    }
  }

  /** Somewhere a drowned player must never be put back: a pit with no way out. */
  unsafeSpot(x, y, z) {
    return this.craft.sealedAt(x, y, z, this.era);
  }

  /** Mud in the Present, sea everywhere else. */
  hazardBurst() {
    return this.era === ERA.PRESENT ? [0x8a7a6a, 0x5a4a3c] : [0x9fe0ff, 0xffffff];
  }

  onHazardDone() {
    const f = this.state.flags;
    if (!f.hazardHint && this.player.hp > 0) {
      f.hazardHint = true;
      this.hud.toast(this.era === ERA.PRESENT ? 'Sinking mud! It costs a heart, and puts you back on solid ground.' : 'The tide-rip! It costs a heart, and puts you back on solid ground.', 4500);
    }
  }

  /** Caught: back at the wharf's edge. */
  wardenExitX() {
    return L.wharfX0 + 2.5;
  }

  /** What an age is called. The Dry Age stops being one when the tide comes home. */
  eraLabel(era) {
    return era === ERA.FUTURE && this.state.flags.tideRestored ? 'The Age of Lights' : super.eraLabel(era);
  }

  // ------------------------------------------------------------------ the watch, and the Tide Well
  /** Twelve cogs, one winter: a pocketwatch of Vivienne's own, and Rewind for good. */
  grantOwnWatch() {
    const f = this.state.flags;
    if (f.ownWatch) return;
    f.ownWatch = f.hasRewind = true;
    if (!this.state.inventory.includes('myWatch')) this.giveItem('myWatch');
    this.craft.syncBody();
    this.save();
  }

  /** The watch goes back where it came from: no more Rewind, and the tide turns. */
  placeHeart() {
    const f = this.state.flags;
    f.heartPlaced = true;
    f.hasRewind = false;
    this.removeItem('watch');
    this.craft.clearTrail();
    this.craft.syncBody();
    audio.sfx('socket');
    audio.sfx('bell', { freq: 131 });
    audio.sfx('gate');
    this.renderer.shake = 1.2;
    const h = this.L && this.interactables.find((i) => i.id === 'heart');
    if (h) this.bursts.emit(h.x, 1.2, h.z, 60, { color: [0xffe9a0, 0x9ff4ff, 0xffffff], speed: 5, life: 1.2, gravity: 0 });
    this.refreshWorld();
    this.save();
    setTimeout(() => this.hud.toast('The great wheel shudders, stops... and turns the other way.', 4500), 400);
    setTimeout(() => this.hud.toast(`<b>The tide is coming in!</b> ${touchActive() ? 'Hold <b>Jump</b>' : 'Hold <kbd>Space</kbd>'} to swim up, and out the way you came.`, 8000), 4200);
  }

  // ------------------------------------------------------------------ the ending
  async runEnding() {
    if (this.mode === 'ending') return;
    const f = this.state.flags, r = this.renderer;
    this.mode = 'ending';
    this.hud.showPrompt(null);
    setFade(1, '#eafcff');
    await wait(500);
    // the Well stays full from here on (the 'wellHeart' feature takes over from the moving flood)
    f.wellFull = true;
    this.craft.endFlood();
    this.refreshWorld();
    const y = L.headTop, px = L.plateauX0 + 1.8;
    this.applyEra(ERA.PRESENT, true);
    this.player.place(px, y, 3.5);
    this.player.facing = 1;
    this.player.update(0);
    r.camTarget.set(px + 1, y + 0.6, 3.3);
    const os = new NPC(this, { type: 'npc', id: 'eugeneEnd', era: ERA.PRESENT, x: px + 2.2, y, z: 3.5, sheet: 'eugene', name: 'Donald Eugene' });
    this.npcs.push(os);
    this.entities.push(os);
    setFade(0);
    audio.sfx('bell', { freq: 262 });
    letterbox(true);
    await wait(600);
    await this.dialogue.run(ENDING_A);
    // and now the sea itself: the harbor fills overnight, and three hundred years on it is still there
    setFade(1, '#eafcff');
    await wait(450);
    f.tideRestored = true;
    this.setMood();
    this.refreshWorld();
    const focus = [48.5, 0.6, 3];
    r.camTarget.set(...focus);
    setTimeout(() => setFade(0), 250);
    this.mode = 'play'; // (timelapse() only runs from play)
    await this.timelapse({ to: ERA.PRESENT, focus, years: 1, unit: ['night', 'nights'], caption: 'The tide comes home...', float: { ids: ['seaM', 'harborBoats'], by: 3 } });
    audio.sfx('fanfare');
    await this.timelapse({ to: ERA.FUTURE, focus, years: 300, caption: '...and this time, it stays.', float: { ids: ['seaF'], by: 3 } });
    this.mode = 'ending';
    setFade(1, '#eafcff');
    await wait(450);
    this.applyEra(ERA.PRESENT, true);
    r.camTarget.set(px + 1, y + 0.6, 3.3);
    setFade(0);
    letterbox(true);
    await wait(500);
    // all twelve Lost Cogs: Donald Eugene has exactly enough for a watch movement
    const allCogs = this.state.cogs.length >= COG_TOTAL;
    await this.dialogue.run(allCogs ? [...ENDING_B.slice(0, 3), ...ENDING_COGS, ...ENDING_B.slice(3)] : ENDING_B);
    letterbox(false);
    this.state.checkpoint = 0;
    if (allCogs) {
      f.ownWatch = f.hasRewind = true;
      this.state.inventory.push('myWatch');
    }
    this.finishStory(); // the story is told, and the world it leaves is yours to keep walking in
    let fade = 0;
    await new Promise((res) => {
      const step = () => {
        fade += 0.02;
        setFade(Math.min(1, fade), '#eafcff');
        if (fade < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    this.mode = 'credits';
    this.hud.show(false);
    this.player.mesh.visible = this.player.shadow.visible = false;
    os.remove();
    this.onCredits?.(this.state);
  }

  // ------------------------------------------------------------------ per-frame
  updatePlay(dt) {
    const s = this.state, f = s.flags;
    s.playTime += dt;
    this.lockT = Math.max(0, this.lockT - dt);
    const ctl = this.controlsEnabled();

    // the time lens: hold it open on another age (Q / E choose which)
    const peeking = ctl && input.held('peek') && !this.craft.rewinding;
    if (peeking) {
      if (this.peekTarget === null) this.peekTarget = this.era === ERA.PRESENT ? this.lensPref : ERA.PRESENT;
      if (input.hit('back') && this.era > 0) this.peekTarget = this.era - 1;
      if (input.hit('forward') && this.era < 2) this.peekTarget = this.era + 1;
      if (this.era === ERA.PRESENT) this.lensPref = this.peekTarget;
    } else {
      this.peekTarget = null;
      // Q / E: travel one era back or forward
      if (ctl) {
        if (input.hit('back')) this.tryShift(this.era - 1);
        if (input.hit('forward')) this.tryShift(this.era + 1);
      }
    }
    // with the Loupe, what the lens shows can be touched
    this.reachEra = peeking && f.hasReach ? this.peekTarget : null;

    // the pocketwatch (it moves the player itself while it's running them backward), and the gates
    this.craft.update(dt, ctl);
    const rewinding = this.craft.rewinding;

    // entities
    if (!rewinding) {
      this.player.update(dt);
      if (this.mode === 'play') this.craft.record(dt);
    }
    this.updateEntities(dt);

    // interaction: through the lens first (if it's open and there's something there), then this age
    const free = ctl && !rewinding;
    const reach = free && this.reachEra !== null ? this.nearestInteractive(this.reachEra) : null;
    const reachStrike = free && this.reachEra !== null && !reach ? this.nearestStrike(this.reachEra) : null;
    const near = free && !reach && !reachStrike ? this.nearestInteractive() : null;
    const strike = free && !reach && !reachStrike && !near ? this.nearestStrike() : null;
    if (reach) this.hud.showPrompt(`Reach through: ${reach.prompt()}`, 'reach');
    else if (reachStrike) this.hud.showPrompt(`Through the lens: ${reachStrike.prompt()}`, 'reachStrike');
    else if (strike) {
      this.hud.showPrompt(strike.prompt(), 'strike');
      if (!f.strikeHint) {
        f.strikeHint = true;
        this.hud.toast(`A good bell wants a good swing: ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} swings your wrench.`, 5000);
      }
    } else this.hud.showPrompt(near ? (near.prompt ? near.prompt() : 'Interact') : null);
    const target = reach || near;
    if (target && input.hit('interact')) {
      if (target.spec.gate) this.craft.pull(target.spec.gate); // levers and panels: no words, just the clunk
      else this.use(target);
    }
    // the lens is open on something it could touch, if only it had the knack: a nudge, once
    if (peeking && !f.hasReach && !f.reachTease && this.strikeables.some((e) => e.era === this.peekTarget && e.spec.lens && e.available() && e.distTo(this.player.body) < 2.1)) {
      f.reachTease = true;
      this.hud.toast('So close you could almost touch it...', 3500);
    }

    // first time a hostile creature gets close, remind the player how to fight
    if (!f.attackHint && ctl) {
      const b = this.player.body;
      if (this.enemies.some((e) => e.active() && !e.dead && Math.abs(e.body.x - b.x) < 7 && Math.abs(e.body.y - b.y) < 3)) {
        f.attackHint = true;
        this.hud.toast(`Something unfriendly! ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} swings your wrench.`, 3500);
      }
    }
    // after the story: all twelve cogs brought back to Donald Eugene
    if (f.finished && !f.ownWatch && s.cogs.length >= COG_TOTAL && ctl && this.era === ERA.PRESENT && this.player.body.x < 12 && !this.cogGift) {
      this.cogGift = true;
      this.cutscene(ENDING_COGS).then(() => {
        this.grantOwnWatch();
        this.hud.toast(`<b>Rewind</b> is yours again, for good: ${touchActive() ? 'hold <b>Rewind</b>' : 'hold <kbd>R</kbd>'}.`, 6000);
      });
    }

    this.updateGoalAndArea(dt);
  }
}
