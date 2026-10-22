// What Vivienne carries from chapter to chapter: the clothes she wears, the parts her wrench can
// take, and every power the Chronoheart has learned. It lives in the shared save (progress.kit),
// so a choice made in one chapter holds in all of them. The wrench waves live here too, because
// they work in every chapter: the Chronoheart is the power, and the wrench is how she aims it.
// Fit a part to its head (T swaps), hold the swing, let go, and a wave of the part's light goes out
// to the first thing in front of her: the Stasis ring holds it, the Escapement slows it, the
// Hairspring sends it back to where it was a few seconds ago. (How it all looks: src/render/fx.js.)
import * as THREE from 'three';
import { input } from './core/input.js';
import { audio } from './audio/audio.js';
import { chapter, progress, CHAPTERS, theme } from './chapter.js';
import { setOutfit, setWrenchHead, doll, iconURL } from './render/sprites.js';
import { touchActive } from './ui/touch.js';
import { Warden, Pushable } from './world/entities.js';
import { CARDS } from './render/fx.js';

/** What she can wear: each chapter's clothes, once she has been there. */
export const OUTFITS = [
  { id: 'vivienne', name: "Apprentice's apron", note: 'Her everyday work clothes. Pockets for everything.', from: 'hollowmere' },
  { id: 'vivienneCoast', name: 'Sea-coat', note: 'Oilskin and sea-boots: you can hold your breath half as long again under water.', from: 'saltwick', flag: 'seaCoat', icon: 'seaCoat' },
  { id: 'vivienneWinter', name: 'Winter coat', note: 'Wool to the knee, earmuffs and mittens.', from: 'summit', flag: 'winterCoat', icon: 'winterCoat' },
];

/** Every power the Chronoheart learns, and where in the story it works. */
const POWERS = [
  { id: 'seal', name: 'Stasis Seal', where: 'Every chapter, on the wrench.', from: 'hollowmere', flag: 'hasSeal' },
  { id: 'echo', name: 'Echo', where: 'Hollowmere and Highcrest.', from: 'hollowmere', flag: 'hasEcho' },
  { id: 'tempo', name: 'Tempo', where: "Every chapter, on the wrench. Hollowmere's machines too, holding Q or E.", from: 'hollowmere', flag: 'hasTempo' },
  { id: 'rewind', name: 'Rewind', where: 'Every chapter, on the wrench. Rewinding yourself: Saltwick.', from: 'saltwick', flag: 'hasRewind' },
  { id: 'reach', name: 'Reach', where: 'Saltwick, through the time lens.', from: 'saltwick', flag: 'hasReach' },
  { id: 'lantern', name: 'The Lantern', where: 'Highcrest.', from: 'summit', flag: 'hasLantern' },
];

/**
 * What fits on the wrench's head. power: the Chronoheart power that comes with it. css / hex:
 * its glow (on the wrench, the ring it sends, and whatever it is aimed at).
 */
export const PARTS = [
  { id: 'plain', name: 'Plain wrench', note: 'For hitting things, and tightening them.', css: '#e2bf62', hex: 0xe2bf62, fx: 0xe2bf62, icon: 'wrench' },
  { id: 'seal', name: 'Stasis ring', note: 'Holds what it meets in its moment. Strike a held creature and it shatters.', power: 'seal', css: '#bff6ff', hex: 0xbff6ff, fx: 0x5fd8ff, icon: 'stasisRing' },
  { id: 'tempo', name: 'Escapement', note: 'Slows what it meets to a crawl.', power: 'tempo', css: '#c8f070', hex: 0xc8f070, fx: 0x9ee03a, icon: 'escapement' },
  { id: 'rewind', name: 'Hairspring', note: 'Sends what it meets back to where it was a few seconds ago.', power: 'rewind', css: '#ffb84a', hex: 0xffb84a, fx: 0xff9424, icon: 'hairspring' },
];

const CHARGE = 0.45; // seconds the swing is held before letting go sends a wave
const RANGE = 5.5;
// seconds each part holds each kind of thing (a creature held by the Stasis ring stays held until struck)
const HOLD = { enemy: Infinity, warden: 3, npc: 6 };
const SLOW = { enemy: 8, warden: 6, npc: 6 };
// what people say when they come out of it, none the wiser
const THAWED = [
  '...Sorry, where was I?',
  'Did anyone else feel a draft just then?',
  "I've lost my train of thought. And possibly a few seconds.",
  'Why is everyone looking at me?',
  'Hm? Oh. Hello. Was I saying something?',
];
const SLOWED = [
  'Wh-a-a-a-t... a... l-o-o-o-vely... d-a-a-a-y...',
  'Hellllooooo... Viv-i-e-e-e-nne...',
  'Is... it... jusssst... me... or... is... everything... very... fasssst...',
];
const REWOUND = [
  "I've got the strangest feeling I've just done all this.",
  'Hang on. Did I just walk over here? Twice?',
  'Déjà vu. Again.',
];
// Highcrest, before the winter coat (see shiver)
const COLD = [
  'Brrr. I packed for Saltwick. Saltwick was warm.',
  "My trunk. It's by the tents. My coat is in my trunk.",
  "I can't feel my ears. I'm fairly sure I still have ears.",
  'My teeth are chattering in three-quarter time.',
];
const COLD_AGAIN = ['I have a perfectly good winter coat. Why am I not wearing it?', 'Brrr. Coat. Coat, coat, coat.'];
const STRUCK = ['...Ow?', 'Did somebody just hit me with a wrench?', 'Ow! ...Why does my arm hurt?'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// each part's own shape of light (see src/render/fx.js), and the power each mark comes from
const CARD_OF = { plain: 'glow', seal: 'snow', tempo: 'gear', rewind: 'spiral' };
const MARK_POWER = { held: 'seal', slow: 'tempo', rewind: 'rewind' };

/** Where a wave aimed at t should land, now (it may be on the move). */
function aimAt(t) {
  const r = t.ref;
  return () => {
    if (t.kind === 'enemy') return { x: r.body.x, y: r.body.y + Math.min(0.8, r.cfg.h * 0.6), z: r.body.z };
    if (t.kind === 'block') return { x: r.cx + 0.5, y: 0.6, z: r.cz + 0.5 };
    if (t.kind === 'region') return { x: t.x, y: t.y + 0.4, z: t.z };
    if (t.kind === 'custom') return r.pos ? r.pos() : { x: r.x, y: r.y + (r.lift ?? 0.85), z: r.z };
    return { x: r.x, y: (r.y ?? 0) + 0.85, z: r.z };
  };
}
function stillThere(t) {
  if (t.kind === 'enemy') return t.ref.alive;
  if (t.kind === 'npc' || t.kind === 'warden') return t.ref.active();
  if (t.kind === 'custom') return !t.ref.gone?.();
  return true;
}
const posOf = (r) => r.body || { x: r.x, y: r.y ?? 0, z: r.z };
const tall = (r) => r.cfg?.h ?? (r.actor ? r.actor.h * 0.95 : 1.6);
function headOf(r) {
  const p = posOf(r);
  return { x: p.x, y: p.y + tall(r) + 0.55, z: p.z + 0.2 };
}
function midOf(r) {
  const p = posOf(r);
  return { x: p.x, y: p.y + tall(r) * 0.55, z: p.z + 0.25 };
}

export class Kit {
  constructor(game) {
    this.game = game;
    this.holdT = 0;
    this.target = null;
    this.glowing = null;
    this.learnT = 0;
    this.shots = [];
    this.marks = [];
    this.chip = document.getElementById('wrench-chip');
    this.chip?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.game.controlsEnabled()) this.cycle();
    });
    setOutfit(this.outfit); // before the player is built, so she is dressed from the start
    setWrenchHead(PARTS.find((p) => p.id === this.wrench).css);
  }

  // ------------------------------------------------------------------ the shared save
  get saved() {
    return progress.kit();
  }
  /**
   * Learned already? In the chapter it comes from, only once it has been found in this playthrough
   * (a replay starts without it); in a later chapter, once any playthrough has found it; in an
   * earlier one, not yet.
   */
  learned(id) {
    return this.found(POWERS.find((q) => q.id === id), 'power:' + id);
  }
  /** (learned, and the same for clothes: { from, flag }, and the reward a later chapter checks) */
  found({ from, flag }, reward) {
    const n = CHAPTERS.find((c) => c.id === from).number;
    if (chapter.number < n) return false;
    if (chapter.number === n) return !!this.game.state.flags[flag];
    return progress.hasReward(reward) || progress.isDone(from);
  }
  get hasSeal() {
    return this.learned('seal');
  }
  /** The parts she has for the wrench (at the End of Time, all of them: see SummitGame.forceParts). */
  parts() {
    const all = !!this.game.forceParts?.();
    return PARTS.filter((p) => !p.power || all || this.learned(p.power));
  }
  get wrench() {
    const have = this.parts(), want = this.saved.wrench;
    if (have.some((p) => p.id === want)) return want;
    return have.find((p) => p.id === 'seal')?.id || have[have.length - 1].id;
  }
  get part() {
    return PARTS.find((p) => p.id === this.wrench);
  }
  get waveReady() {
    return this.wrench !== 'plain';
  }
  /** What she has on: what she last chose, if it's hers yet; else the chapter's own, or her newest. */
  get outfit() {
    const have = this.outfits(), o = this.saved.outfit;
    if (have.some((x) => x.id === o)) return o;
    return have.find((x) => x.id === theme.playerSheet)?.id || have[have.length - 1].id;
  }
  /** Her clothes: the apron always; each coat once she has opened the trunk it came in. */
  outfits() {
    return OUTFITS.filter((o) => !o.flag || this.found(o, 'outfit:' + o.id));
  }
  /** Before the player is built: in whatever she has on, in this playthrough. */
  dress() {
    setOutfit(this.outfit);
  }
  /** A coat out of her trunk (see each chapter's story.js): hers from now on, and on at once. */
  unpack(id) {
    const o = OUTFITS.find((x) => x.id === id), g = this.game;
    g.state.flags[o.flag] = true;
    progress.grantReward('outfit:' + id);
    this.wear(id);
    const b = g.player.body;
    g.bursts.emit(b.x, b.y + 1, b.z, 24, { color: [0xffe39f, 0xffffff], speed: 2.4, life: 0.6, gravity: 0, glow: 2 });
    g.hud.toast(`<b>${o.name}</b>: ${o.note} Change clothes any time from the menu (${touchActive() ? 'the menu button' : '<kbd>I</kbd>'}).`, 6500);
  }
  /** Highcrest in anything but the winter coat: she says so, every half-minute or so. */
  shiver() {
    const g = this.game, b = g.player?.body;
    const cold = chapter.id === 'summit' && this.outfit !== 'vivienneWinter' && g.mode === 'play' && !g.forceParts?.() && b;
    if (!cold) return void (this.coldT = Math.max(this.coldT ?? 0, 8));
    if ((this.coldT -= 1) > 0) return;
    this.coldT = 30;
    const lines = g.state.flags.winterCoat ? COLD_AGAIN : COLD;
    this.coldN = (this.coldN ?? -1) + 1;
    g.hud.toast(`<b>Vivienne:</b> "${lines[this.coldN % lines.length]}"`, 4000);
    g.bursts.emit(b.x + g.player.facing * 0.3, b.y + 1.5, b.z, 8, { color: [0xffffff, 0xd8ecff], speed: 0.8, life: 0.9, gravity: -0.5 });
  }
  get breathScale() {
    return this.outfit === 'vivienneCoast' ? 1.5 : 1;
  }

  wear(id) {
    progress.setKit({ outfit: id });
    setOutfit(id);
    this.game.player.redress();
    audio.sfx('ui');
  }
  /** Fit a part to the wrench's head. */
  equip(id, quiet = false) {
    progress.setKit({ wrench: id });
    const p = this.part;
    setWrenchHead(p.css);
    this.game.player.redress();
    this.showChip();
    if (quiet) return;
    audio.sfx('socket');
    const b = this.game.player.body;
    this.game.bursts.emit(b.x + this.game.player.facing * 0.4, b.y + 0.9, b.z, 14, { color: [p.hex, 0xffffff], speed: 2, life: 0.5, gravity: 0, glow: 2 });
  }
  /** T (or a tap on the chip): the next part along. */
  cycle() {
    const have = this.parts();
    if (have.length < 2) return;
    const i = have.findIndex((p) => p.id === this.wrench);
    const next = have[(i + 1) % have.length];
    this.equip(next.id);
    const how = next.power ? ` Hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'} and let go.` : '';
    this.game.hud.toast(`<b>${next.name}</b>: ${next.note}${how}`, 3500);
  }
  /** The chip under the hearts: which part is on the wrench (once there is more than one). */
  showChip() {
    const el = this.chip;
    if (!el) return;
    const have = this.parts();
    document.body.classList.toggle('has-parts', have.length > 1);
    el.hidden = have.length < 2;
    if (el.hidden) return;
    const p = this.part;
    el.style.setProperty('--part', p.css);
    el.querySelector('.wc-name').textContent = p.name;
  }
  /** A part learned just now: on the wrench straight away, and say how it works. */
  learnedPart(id) {
    const p = PARTS.find((q) => q.id === id);
    this.equip(id, true);
    const swap = this.parts().length > 2 ? ` ${touchActive() ? 'Tap the wrench under your hearts' : 'Press <kbd>T</kbd>'} to change parts.` : '';
    this.game.hud.toast(`<b>${p.name}</b> fitted to your wrench. Hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}, then let go: ${p.note.toLowerCase()}${swap}`, 8000);
  }

  // ------------------------------------------------------------------ every frame
  /** Holding a swing long enough to show it: the wrench goes up overhead (see Player). */
  get charging() {
    return this.waveReady && this.holdT > 0.16;
  }

  update(dt, ctl) {
    const g = this.game;
    // powers learned in this chapter are written down for the ones after
    this.learnT -= dt;
    if (this.learnT <= 0) {
      this.learnT = 1;
      for (const p of POWERS) if (chapter.id === p.from && g.state.flags[p.flag] && !progress.hasReward('power:' + p.id)) progress.grantReward('power:' + p.id);
      this.shiver();
      if (this.parts().length > 1 && chapter.id !== 'hollowmere' && !progress.hasReward('partsHint') && g.mode === 'play') {
        progress.grantReward('partsHint');
        g.hud.toast(`Your wrench came with you, parts and all. Hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}, then let go, to send a wave; ${touchActive() ? 'tap the wrench under your hearts' : '<kbd>T</kbd>'} changes parts.`, 8000);
      }
      this.showChip();
    }
    if (ctl && input.hit('part')) this.cycle();
    this.updateShots(dt);
    this.updateMarks(dt);
    if (!this.waveReady || !ctl) {
      // (a moment without control, a hit or a toast's pause, doesn't lose a charge still held)
      if (!this.waveReady || !input.held('attack')) {
        this.holdT = 0;
        this.charged = false;
        this.unflicker();
      }
      this.setGlow(null);
      return;
    }
    this.target = this.findTarget();
    this.setGlow(this.target);
    if (input.held('attack')) {
      this.holdT += dt;
      if (this.holdT > 0.12) this.gather(dt);
      if (this.holdT > CHARGE && !this.charged) {
        this.charged = true;
        this.ready();
      }
    } else {
      if (this.holdT > CHARGE) this.fire();
      this.holdT = 0;
      this.charged = false;
      this.unflicker();
    }
  }

  /**
   * The light of the part on her wrench, at its head, wherever her hand is, so you can always see
   * what's fitted: brighter as a wave gathers, and now and then a mote of it drifts off in its own
   * shape (frost, a little gear, a coil). Every frame, whatever the game is doing (see Game.frame).
   */
  updateLamp(dt) {
    const g = this.game, p = g.player;
    if (!this.lamp) {
      const mk = (name) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: CARDS[name], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.renderOrder = 6;
        g.scene.add(sp);
        return sp;
      };
      this.lamp = { glow: mk('glow'), core: mk('snow'), at: new THREE.Vector3(), spin: 0 };
    }
    const L = this.lamp, part = this.part;
    const tip = this.waveReady && p.mesh.visible && g.mode !== 'title' && g.mode !== 'credits' ? p.actor.toolTip(L.at) : null;
    L.glow.visible = L.core.visible = !!tip;
    this.tip = tip;
    if (!tip) return;
    const k = this.charged ? 1 : Math.min(1, Math.max(0, (this.holdT - 0.12) / (CHARGE - 0.12)));
    L.glow.position.copy(tip);
    L.glow.scale.setScalar(0.62 + Math.sin(g.time * 5) * 0.06 + k * 0.7 + (this.charged ? Math.sin(g.time * 30) * 0.12 : 0));
    L.glow.material.color.setHex(part.fx).multiplyScalar(1.6 + k * 1.6);
    const card = CARD_OF[part.id];
    if (L.core.material.map !== CARDS[card]) {
      L.core.material.map = CARDS[card];
      L.core.material.needsUpdate = true;
    }
    L.core.position.copy(tip);
    L.core.scale.setScalar(0.3 + k * 0.22);
    L.core.material.color.setHex(part.fx).multiplyScalar(2.2 + k);
    // each turns its own way: the frost slowly, the escapement in ticks, the hairspring backward
    L.spin += dt * (part.id === 'rewind' ? -4 - k * 8 : part.id === 'tempo' ? 3 + k * 6 : 1.2 + k * 4);
    L.core.material.rotation = part.id === 'tempo' ? Math.round(L.spin / (Math.PI / 5)) * (Math.PI / 5) : L.spin;
    if (g.mode === 'play' && Math.random() < dt * 3) this.mote(tip);
  }

  mote(at) {
    const g = this.game, part = this.part, o = { size: 0.14, life: 0.9, color: part.fx, glow: 2.4, vx: (Math.random() - 0.5) * 0.3, vy: 0.35, vz: 0.05 };
    if (part.id === 'seal') g.fx.spawn('snow', at.x, at.y, at.z, { ...o, spin: 1.5 });
    else if (part.id === 'tempo') g.fx.spawn('gear', at.x, at.y, at.z, { ...o, spin: 3, tick: Math.PI / 5 });
    else g.fx.spawn('spiral', at.x, at.y, at.z, { ...o, spin: -6, vx: -0.3 * g.player.facing });
  }

  /** A wave gathering: motes of the part's light drawn in to the wrench's head from all round. */
  gather(dt) {
    const g = this.game, tip = this.tip, part = this.part;
    this.gatherAcc = (this.gatherAcc || 0) + dt * (this.charged ? 16 : 36);
    for (; tip && this.gatherAcc >= 1; this.gatherAcc--) {
      const a = Math.random() * Math.PI * 2, r = this.charged ? 0.65 : 1.15, T = 0.24;
      const x = tip.x + Math.cos(a) * r, y = tip.y + Math.sin(a) * r;
      g.fx.spawn(part.id === 'seal' ? 'shard' : 'flash', x, y, tip.z, { size: 0.17, life: T, color: part.fx, glow: 2.6, vx: (tip.x - x) / T, vy: (tip.y - y) / T, fade: 'in', rot: a + Math.PI / 2 });
    }
    // charged: she flickers with its light, the way a charged shot always has
    const m = g.player.actor.mat;
    if (m.userData.preCrystal) return;
    const on = this.charged && Math.floor(g.time * 16) % 2 === 0;
    m.emissive.setHex(on ? part.fx : 0x000000);
    m.emissiveIntensity = on ? 0.55 : 1;
    this.flicker = true;
  }
  unflicker() {
    if (!this.flicker) return;
    this.flicker = false;
    const m = this.game.player.actor.mat;
    if (m.userData.preCrystal) return;
    m.emissive.setHex(0x000000);
    m.emissiveIntensity = 1;
  }

  /** Charged: a ring of its light, and a ping. */
  ready() {
    audio.sfx('charged');
    const tip = this.tip, fx = this.game.fx, col = this.part.fx;
    if (!tip) return;
    fx.spawn('ring', tip.x, tip.y, tip.z, { size: 0.3, grow: 6, life: 0.28, color: col, glow: 2.6 });
    fx.spawn('flash', tip.x, tip.y, tip.z, { size: 0.5, grow: 2.2, life: 0.2, glow: 2.2 });
  }

  /** The thing a wave would reach, if it went now: the nearest one in front of her, in her age. */
  findTarget() {
    const g = this.game, b = g.player.body, f = g.player.facing, part = this.wrench;
    let best = null, bd = RANGE;
    const consider = (kind, ref, x, y, z, name) => {
      const dx = (x - b.x) * f, d = Math.hypot(x - b.x, (z - b.z) * 0.7);
      if (dx < -0.6 || Math.abs(z - b.z) > 2.4 || Math.abs(y - b.y) > 2.6 || d >= bd) return;
      bd = d;
      best = { kind, ref, x, y, z, name };
    };
    if (part === 'seal') for (const t of g.sealTargets?.() || []) consider('custom', t, t.x, t.y, t.z, t.name);
    for (const t of g.waveTargets?.(part) || []) consider('custom', t, t.x, t.y, t.z, t.name);
    const held = (e) => e.stasisT > 0;
    for (const e of g.enemies) if (e.alive && e.active() && !held(e) && !e.rewinding) consider('enemy', e, e.body.x, e.body.y, e.body.z, 'it');
    for (const e of g.entities) {
      if (e instanceof Warden && e.active() && !e.dormant && !held(e)) consider('warden', e, e.x, 0, e.z, 'the Warden');
      // the Hairspring on a block: back to where it was before its last push
      if (part === 'rewind' && e instanceof Pushable && e.active() && e.history?.length && !e.moving && !(e.spec.lockFlag && g.state.flags[e.spec.lockFlag])) consider('block', e, e.cx + 0.5, 0, e.cz + 0.5, 'the block');
    }
    for (const n of g.npcs) {
      if (!n.active() || n.spec.memory || n.spec.holo || n.spec.frozen || n.talking || held(n) || n.spec.noSeal || n.rewindT > 0) continue;
      consider('npc', n, n.x, n.y, n.z, n.spec.name);
    }
    // something that shimmers, in a chapter with things to seal (Hollowmere's bridge, belfry, ...)
    const region = part === 'seal' && g.abilities?.readySealables?.().find((s) => b.x >= s.x0 && b.x <= s.x1 + 1 && b.y >= (s.yMin ?? -Infinity));
    if (region) best = { kind: 'region', ref: region, x: (region.glint.x0 + region.glint.x1) / 2, y: region.glint.y, z: (region.glint.z0 + region.glint.z1) / 2, name: region.name };
    return best;
  }

  /** What the wave would reach glows in the part's light, so you can see it before you let go. */
  setGlow(t) {
    const g = this.game;
    const actorOf = (x) => (x && (x.kind === 'enemy' || x.kind === 'warden' || x.kind === 'npc') ? x.ref.actor : x?.ref?.actor || null);
    const was = actorOf(this.glowing), now = actorOf(t);
    if (was && was !== now && was.mat.userData.preGlow) {
      const p = was.mat.userData.preGlow;
      was.mat.emissive.setHex(p.emissive);
      was.mat.emissiveIntensity = p.ei;
      delete was.mat.userData.preGlow;
    }
    if (now && !now.mat.userData.preCrystal) {
      const m = now.mat;
      if (!m.userData.preGlow) m.userData.preGlow = { emissive: m.emissive.getHex(), ei: m.emissiveIntensity };
      m.emissive.setHex(this.wrench === 'seal' ? 0xffffff : this.part.hex);
      m.emissiveIntensity = 0.35 + Math.sin(g.time * 6) * 0.15;
    } else if (t && !now && Math.random() < 0.5) {
      // a place, or a thing with no face: a flurry of motes over it
      g.bursts.emit(t.x + (Math.random() - 0.5) * 1.6, t.y + Math.random() * 1.4, t.z + (Math.random() - 0.5) * 1.2, 1, { color: [0xffffff, this.part.hex], speed: 0.4, life: 0.9, gravity: -0.8, glow: 2.2 });
    }
    this.glowing = t;
  }

  /** Let go of a held swing: the wave goes out from the wrench, and lands on whatever is in front of her. */
  fire(t = this.findTarget()) {
    const g = this.game, p = g.player, b = p.body, part = this.part;
    this.unflicker();
    audio.sfx('wave', { part: part.id });
    p.castT = 0.34;
    p.actor.play('cast', true);
    const f = p.facing, x = b.x + f * 0.75, y = b.y + 1.05, z = b.z + 0.15;
    // the muzzle: a flash, a ring, a kick back
    g.fx.spawn('flash', x, y, z, { size: 0.5, grow: 2.6, life: 0.14, color: part.fx, glow: 2.8 });
    g.fx.spawn('ring', x, y, z, { size: 0.3, grow: 5, life: 0.2, color: part.fx, glow: 2.2 });
    b.vx -= f * 2.2;
    g.renderer.shake = Math.max(g.renderer.shake || 0, 0.14);
    if (t) this.setGlow(null);
    const end = { x: x + f * RANGE, y, z };
    const to = t ? aimAt(t) : () => end;
    const d0 = to();
    const dur = Math.max(0.1, Math.min(0.26, Math.hypot(d0.x - x, d0.y - y, d0.z - z) / 24));
    const shot = { part, from: { x, y, z }, to, t: 0, dur, target: t, x, y, z, stampT: 0 };
    const follow = () => (shot.done ? null : shot);
    shot.core = g.fx.spawn(CARD_OF[part.id], x, y, z, { size: 1.05, life: 9, fade: 'none', color: part.fx, glow: 2.6, spin: part.id === 'rewind' ? -18 : part.id === 'tempo' ? 9 : 7, tick: part.id === 'tempo' ? Math.PI / 5 : 0, follow });
    g.fx.spawn('glow', x, y, z, { size: 1.5, life: 9, fade: 'none', color: part.fx, glow: 1.6, follow });
    this.shots.push(shot);
  }

  updateShots(dt) {
    const fx = this.game.fx;
    for (const s of this.shots) {
      s.t += dt / s.dur;
      const k = Math.min(1, s.t), to = s.to();
      s.x = s.from.x + (to.x - s.from.x) * k;
      s.y = s.from.y + (to.y - s.from.y) * k;
      s.z = s.from.z + (to.z - s.from.z) * k;
      const id = s.part.id, col = s.part.fx;
      if (id === 'seal') {
        // a crystal, shedding ice
        fx.spawn('shard', s.x, s.y + (Math.random() - 0.5) * 0.3, s.z, { size: 0.24, life: 0.4, color: Math.random() < 0.5 ? col : 0xffffff, glow: 2.2, vy: 0.4, gravity: 4, spin: (Math.random() - 0.5) * 14 });
        fx.spawn('snow', s.x, s.y, s.z, { size: 0.7, life: 0.12, color: col, glow: 1.6, alpha: 0.5, rot: s.core.rot });
      } else if (id === 'tempo') {
        // a gear that leaves itself behind every few hundredths of a second: time, stuttering
        s.stampT -= dt;
        if (s.stampT <= 0) {
          s.stampT = 0.03;
          fx.spawn('gear', s.x, s.y, s.z, { size: 0.7, life: 0.45, color: col, glow: 1.8, alpha: 0.55, rot: s.core.rot, tick: Math.PI / 5 });
        }
      } else {
        // a coil turning backward, its light winding round the path
        const a = s.t * 26;
        for (const off of [0, Math.PI]) fx.spawn('glow', s.x, s.y + Math.sin(a + off) * 0.32, s.z + Math.cos(a + off) * 0.32, { size: 0.3, life: 0.4, color: col, glow: 2.4 });
      }
      if (k >= 1) {
        s.done = true;
        this.land(s);
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  /** A wave arrives: on its target (a flash, the briefest pause, the part's effect), or on nothing. */
  land(s) {
    const g = this.game, fx = g.fx, col = s.part.fx, id = s.part.id, { x, y, z } = s;
    const t = s.target && stillThere(s.target) ? s.target : null;
    if (!t) {
      fx.spawn('ring', x, y, z, { size: 0.4, grow: 2.5, life: 0.25, color: col, glow: 1.6 });
      fx.scatter(id === 'seal' ? 'shard' : 'flash', x, y, z, 5, { size: 0.15, speed: 1.6, life: 0.4, color: col, glow: 2 });
      return;
    }
    g.hitStop = 0.07;
    audio.sfx('impact', { part: id });
    g.renderer.shake = Math.max(g.renderer.shake || 0, 0.3);
    fx.spawn('flash', x, y, z, { size: 0.8, grow: 3, life: 0.2, glow: 2.4 });
    fx.spawn('ring', x, y, z, { size: 0.5, grow: 7, life: 0.38, color: col, glow: 2.4 });
    fx.spawn('glow', x, y, z, { size: 2.2, grow: 1.6, life: 0.3, color: col, glow: 1.6 });
    if (id === 'seal') {
      fx.spawn('hex', x, y, z, { size: 0.6, grow: 4, life: 0.65, color: col, glow: 2.4, spin: 1.8, fade: 'inout' });
      fx.scatter('shard', x, y, z, 14, { size: 0.26, speed: 4.5, life: 0.7, color: col, glow: 2.4, gravity: 9 });
    } else {
      // a clock face: its hand creeping forward (the Escapement), or spinning back (the Hairspring)
      fx.spawn('dial', x, y, z, { size: 0.6, grow: 3.4, life: 0.8, color: col, glow: 2.2, rot: 0, fade: 'inout' });
      fx.spawn('hand', x, y, z, { size: 0.6, grow: 3.4, life: 0.8, glow: 2.2, rot: 0, fade: 'inout', ...(id === 'tempo' ? { spin: -0.8, tick: Math.PI / 6 } : { spin: 16 }) });
      if (id === 'tempo') fx.scatter('gear', x, y, z, 6, { size: 0.3, speed: 2.4, life: 0.8, color: col, glow: 2, drag: 2.5, spinAmt: 4 });
      else fx.spawn('spiral', x, y, z, { size: 1.2, grow: 2.4, life: 0.5, color: col, glow: 2.2, spin: 14 });
    }
    this.apply(t, id);
  }

  /** What each part does to what it lands on. */
  apply(t, part) {
    const g = this.game;
    if (t.kind === 'custom') return part === 'seal' && t.ref.seal ? t.ref.seal() : t.ref.hit?.(part);
    if (t.kind === 'region') return g.abilities.trySeal();
    if (t.kind === 'block') return t.ref.rewind();
    const say = (lines) => g.hud.toast(`<b>${t.ref.spec.name}:</b> "${pick(lines)}"`, 3500);
    if (part === 'seal') {
      if (t.kind === 'enemy') {
        if (g.sealEnemy?.(t.ref)) return; // a chapter where it lasts for centuries (Hollowmere's creatures)
        t.ref.stasis(HOLD.enemy);
        this.mark(t.ref, 'held');
        if (!progress.hasReward('shatterHint')) {
          progress.grantReward('shatterHint');
          g.hud.toast(`Held in its moment, until something disturbs it. Strike it (${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}) and it will shatter.`, 5000);
        }
        return;
      }
      this.mark(t.ref, 'held');
      if (t.kind === 'warden') {
        t.ref.stasis(HOLD.warden);
        t.ref.state = 'return';
        return;
      }
      t.ref.stasis(HOLD.npc);
      const s = g.state;
      if (!(s.sealedNpcs ||= []).includes(t.ref.id)) s.sealedNpcs.push(t.ref.id);
      g.onNpcSealed?.(t.ref);
      g.save();
      return;
    }
    if (part === 'tempo') {
      t.ref.slow(SLOW[t.kind]);
      this.mark(t.ref, 'slow');
      if (t.kind === 'npc') say(SLOWED);
      return;
    }
    if (part === 'rewind') {
      t.ref.rewind?.();
      this.mark(t.ref, 'rewind');
      if (t.kind === 'npc') this.backward(t.ref);
    }
  }

  /** Someone sent back a few seconds: what they're about to say, said backward first. */
  backward(n) {
    const line = pick(REWOUND);
    this.game.hud.toast(`<b>${n.spec.name}:</b> "${[...line].reverse().join('')}"`, 1100);
    setTimeout(() => this.game.hud.toast(`<b>${n.spec.name}:</b> "${line}"`, 3500), 1100);
  }

  /**
   * What a wave leaves on something: a dial over it while it's slowed (and afterimages wherever it
   * goes), frost while it's held, a clock running backward while it rewinds.
   */
  mark(ref, kind) {
    const fx = this.game.fx, m = { ref, kind, t: 0, ghostT: 0 };
    this.marks = this.marks.filter((q) => !(q.ref === ref && q.kind === kind));
    this.marks.push(m);
    const col = PARTS.find((p) => p.power === MARK_POWER[kind]).fx;
    const head = () => (this.marks.includes(m) ? headOf(ref) : null);
    if (kind === 'held') fx.spawn('snow', 0, 0, 0, { size: 1.5, life: 1e9, fade: 'none', color: col, glow: 1.2, alpha: 0.35, spin: 0.25, follow: () => (this.marks.includes(m) ? midOf(ref) : null) });
    else {
      fx.spawn('dial', 0, 0, 0, { size: 0.6, life: 1e9, fade: 'none', color: col, glow: 2, rot: 0, follow: head });
      fx.spawn('hand', 0, 0, 0, { size: 0.6, life: 1e9, fade: 'none', glow: 2, rot: 0, follow: head, ...(kind === 'slow' ? { spin: -1.2, tick: Math.PI / 6 } : { spin: 18 }) });
    }
  }

  updateMarks(dt) {
    const fx = this.game.fx;
    for (const m of this.marks) {
      const r = m.ref;
      m.t += dt;
      const here = r.alive !== false && (!r.active || r.active());
      const on = here && (m.kind === 'slow' ? r.slowT > 0 : m.kind === 'held' ? r.stasisT > 0 : r.rewinding || r.rewindT > 0 || m.t < 0.8);
      if (!on) {
        m.done = true;
        continue;
      }
      if (m.kind === 'slow' && r.actor && (m.ghostT -= dt) <= 0) {
        m.ghostT = 0.12;
        fx.ghost(r.actor, PARTS[2].fx, { life: 0.5, alpha: 0.35 });
      }
      if (m.kind === 'held' && Math.random() < dt * 2) {
        const p = midOf(r);
        fx.spawn('flash', p.x + (Math.random() - 0.5) * 0.8, p.y + (Math.random() - 0.5) * 0.8, p.z + 0.3, { size: 0.25, life: 0.3, glow: 2.4, fade: 'inout' });
      }
    }
    this.marks = this.marks.filter((m) => !m.done);
  }

  /** Someone held by a wave has come out of it. */
  thawed(e) {
    if (e.thawLine) return void delete e.thawLine; // (struck out of it: they have already said so)
    if (!e.spec || !this.game.npcs.includes(e) || !e.active()) return;
    this.game.hud.toast(`<b>${e.spec.name}:</b> "${pick(THAWED)}"`, 3500);
  }
  /** A wrench on someone held still: they come straight out of it, and wonder why their arm hurts. */
  struckHeld(n) {
    n.stasisT = 0.0001;
    n.thawLine = pick(STRUCK);
    this.game.hud.toast(`<b>${n.spec.name}:</b> "${n.thawLine}"`, 3500);
  }

  // ------------------------------------------------------------------ the Menu
  /** Vivienne as she is now, her clothes and her wrench's parts to choose from, and the Chronoheart's powers. */
  renderMenu(el) {
    const part = this.part, have = this.parts(), outfits = this.outfits(), o = OUTFITS.find((x) => x.id === this.outfit);
    const d = doll(this.outfit, part.css);
    el.querySelector('.doll-img').src = d.url;
    const glow = el.querySelector('.doll-glow');
    glow.hidden = part.id === 'plain';
    glow.style.left = d.tip[0] * 100 + '%';
    glow.style.top = d.tip[1] * 100 + '%';
    glow.style.setProperty('--part', part.css);
    el.querySelector('.doll-caption').innerHTML = `<b>Vivienne</b><span>${o?.name ?? ''}</span>${o ? `<small>${o.note}</small>` : ''}`;
    const tile = (key, val, img, label, on, css = '') => `<button type="button" class="kit-tile${on ? ' on' : ''}" data-kit="${key}:${val}" aria-pressed="${on}" aria-label="${label}" title="${label}"${css ? ` style="--part:${css}"` : ''}>${img}</button>`;
    const clothes = el.querySelector('.kit-clothes');
    clothes.hidden = outfits.length < 2;
    clothes.querySelector('.kit-tiles').innerHTML = outfits.map((x) => tile('outfit', x.id, `<img src="${doll(x.id, part.css).url}" alt="">`, x.name, x.id === this.outfit)).join('');
    const wr = el.querySelector('.kit-wrench');
    wr.style.setProperty('--part', part.css);
    wr.querySelector('.kit-key').innerHTML = have.length > 1 && !touchActive() ? '<kbd>T</kbd> swaps' : '';
    wr.querySelector('.kit-tiles').innerHTML = have.map((p) => tile('wrench', p.id, `<img src="${iconURL(p.icon)}" alt="">`, p.name, p.id === part.id, p.css)).join('');
    wr.querySelector('.kit-note').innerHTML = `<b>${part.name}.</b> ${part.note}`;
    const learned = POWERS.filter((p) => this.learned(p.id));
    document.querySelector('#inventory-panel .kit-powers').innerHTML = learned.length
      ? learned.map((p) => `<li><b>${p.name}</b><span>${p.where}</span></li>`).join('')
      : '<li class="muted">Nothing yet. The Chronoheart is quiet, for now.</li>';
    if (!el.dataset.wired) {
      el.dataset.wired = '1';
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-kit]');
        if (!b) return;
        const [key, val] = b.dataset.kit.split(':');
        if (key === 'wrench') this.equip(val);
        else this.wear(val);
        this.renderMenu(el);
      });
    }
  }
}
