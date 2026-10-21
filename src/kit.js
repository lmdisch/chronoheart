// What Vivienne carries from chapter to chapter: the clothes she wears, the parts her wrench can
// take, and every power the Chronoheart has learned. It lives in the shared save (progress.kit),
// so a choice made in one chapter holds in all of them. The wrench waves live here too, because
// they work in every chapter: the Chronoheart is the power, and the wrench is how she aims it.
// Fit a part to its head (T swaps), hold the swing, let go, and a ring of light goes out to the
// first thing in front of her: the Stasis ring holds it, the Escapement slows it, the Hairspring
// sends it back to where it was a few seconds ago.
import * as THREE from 'three';
import { input } from './core/input.js';
import { audio } from './audio/audio.js';
import { chapter, progress, CHAPTERS, theme } from './chapter.js';
import { setOutfit, setWrenchHead } from './render/sprites.js';
import { touchActive } from './ui/touch.js';
import { Warden } from './world/entities.js';

/** What she can wear: each chapter's clothes, once she has been there. */
export const OUTFITS = [
  { id: 'vivienne', name: "Apprentice's apron", note: 'Her everyday work clothes. Pockets for everything.', from: 'hollowmere' },
  { id: 'vivienneCoast', name: 'Sea-coat', note: 'Oilskin and sea-boots: you can hold your breath half as long again under water.', from: 'saltwick' },
  { id: 'vivienneWinter', name: 'Winter coat', note: 'Wool to the knee, earmuffs and mittens.', from: 'summit' },
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
  { id: 'plain', name: 'Plain wrench', note: 'For hitting things, and tightening them.', css: '#e2bf62', hex: 0xe2bf62 },
  { id: 'seal', name: 'Stasis ring', note: 'Holds what it meets in its moment. Strike a held creature and it shatters.', power: 'seal', css: '#bff6ff', hex: 0xbff6ff },
  { id: 'tempo', name: 'Escapement', note: 'Slows what it meets to a crawl.', power: 'tempo', css: '#c8f070', hex: 0xc8f070 },
  { id: 'rewind', name: 'Hairspring', note: 'Sends what it meets back to where it was a few seconds ago.', power: 'rewind', css: '#ffb84a', hex: 0xffb84a },
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
const STRUCK = ['...Ow?', 'Did somebody just hit me with a wrench?', 'Ow! ...Why does my arm hurt?'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Kit {
  constructor(game) {
    this.game = game;
    this.holdT = 0;
    this.target = null;
    this.glowing = null;
    this.learnT = 0;
    this.wave = null;
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
   * (a replay starts without it); in a later chapter, once any playthrough has found it.
   */
  learned(id) {
    const p = POWERS.find((q) => q.id === id);
    if (chapter.id === p.from) return !!this.game.state.flags[p.flag];
    return progress.hasReward('power:' + id) || progress.isDone(p.from);
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
  get outfit() {
    const o = this.saved.outfit;
    return o && this.outfits().some((x) => x.id === o) ? o : theme.playerSheet;
  }
  outfits() {
    const n = this.reached();
    return OUTFITS.filter((o) => CHAPTERS.find((c) => c.id === o.from).number <= n);
  }
  /** The furthest chapter she has reached. */
  reached() {
    return Math.max(...CHAPTERS.filter((c) => progress.isDone(c.id) || progress.slot(c.id)).map((c) => c.number), chapter.number);
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
  update(dt, ctl) {
    const g = this.game;
    // powers learned in this chapter are written down for the ones after
    this.learnT -= dt;
    if (this.learnT <= 0) {
      this.learnT = 1;
      for (const p of POWERS) if (chapter.id === p.from && g.state.flags[p.flag] && !progress.hasReward('power:' + p.id)) progress.grantReward('power:' + p.id);
      if (this.parts().length > 1 && chapter.id !== 'hollowmere' && !progress.hasReward('partsHint') && g.mode === 'play') {
        progress.grantReward('partsHint');
        g.hud.toast(`Your wrench came with you, parts and all. Hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}, then let go, to send a wave; ${touchActive() ? 'tap the wrench under your hearts' : '<kbd>T</kbd>'} changes parts.`, 8000);
      }
      this.showChip();
    }
    if (ctl && input.hit('part')) this.cycle();
    this.updateWave(dt);
    // a part on the wrench: now and then a mote of its light drifts off her hand
    if (this.waveReady && g.mode === 'play' && Math.random() < dt * 2.5) {
      const b = g.player.body;
      g.bursts.emit(b.x + g.player.facing * 0.35, b.y + 0.75, b.z + 0.05, 1, { color: [this.part.hex, 0xffffff], speed: 0.25, life: 0.8, gravity: -0.5, glow: 1.6, jitter: 0.1 });
    }
    if (!this.waveReady || !ctl) {
      this.holdT = 0;
      this.setGlow(null);
      return;
    }
    this.target = this.findTarget();
    this.setGlow(this.target);
    if (input.held('attack')) {
      this.holdT += dt;
      if (this.holdT > CHARGE && Math.random() < dt * 30) {
        const b = g.player.body;
        g.bursts.emit(b.x + g.player.facing * 0.4, b.y + 0.9, b.z, 1, { color: [this.part.hex, 0xffffff], speed: 1.2, life: 0.4, gravity: 0, glow: 2 });
      }
      if (this.holdT > CHARGE && !this.charged) {
        this.charged = true;
        audio.sfx('tick');
      }
    } else {
      if (this.holdT > CHARGE) this.fire();
      this.holdT = 0;
      this.charged = false;
    }
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
    for (const e of g.enemies) if (e.alive && e.active() && !held(e)) consider('enemy', e, e.body.x, e.body.y, e.body.z, 'it');
    for (const e of g.entities) if (e instanceof Warden && e.active() && !e.dormant && !held(e)) consider('warden', e, e.x, 0, e.z, 'the Warden');
    for (const n of g.npcs) {
      if (!n.active() || n.spec.memory || n.spec.holo || n.spec.frozen || n.talking || held(n) || n.spec.noSeal) continue;
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

  /** Let go of a held swing: a ring of light, and whatever it meets gets the part's effect. */
  fire() {
    const g = this.game, b = g.player.body, t = this.findTarget(), part = this.wrench;
    audio.sfx('shift', { era: g.era });
    this.launchRing(b.x, b.y + 0.9, b.z, g.player.facing, t);
    if (!t) return;
    this.setGlow(null);
    g.bursts.emit(t.x, t.y + 0.8, t.z, 40, { color: [this.part.hex, 0xffffff], speed: 4, life: 1 });
    audio.sfx('socket');
    if (t.kind === 'custom') return part === 'seal' && t.ref.seal ? t.ref.seal() : t.ref.hit?.(part);
    if (t.kind === 'region') return g.abilities.trySeal();
    const say = (lines) => g.hud.toast(`<b>${t.ref.spec.name}:</b> "${pick(lines)}"`, 3500);
    if (part === 'seal') {
      if (t.kind === 'enemy') {
        if (g.sealEnemy?.(t.ref)) return; // a chapter where it lasts for centuries (Hollowmere's creatures)
        t.ref.stasis(HOLD.enemy);
        if (!progress.hasReward('shatterHint')) {
          progress.grantReward('shatterHint');
          g.hud.toast(`Held in its moment, until something disturbs it. Strike it (${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}) and it will shatter.`, 5000);
        }
        return;
      }
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
      if (t.kind === 'npc') say(SLOWED);
      return;
    }
    if (part === 'rewind') {
      if (t.kind === 'npc') return say(REWOUND);
      t.ref.rewind?.();
      g.bursts.emit(t.ref.body?.x ?? t.ref.x, (t.ref.body?.y ?? 0) + 0.8, t.ref.body?.z ?? t.ref.z, 30, { color: [this.part.hex, 0xffffff], speed: 3, life: 0.8 });
    }
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

  launchRing(x, y, z, dir, t) {
    const g = this.game;
    if (!this.ringMesh) {
      this.ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.06, 6, 28),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }),
      );
      this.ringMesh.rotation.y = Math.PI / 2;
      g.scene.add(this.ringMesh);
    }
    this.ringMesh.material.color.setHex(this.part.hex).multiplyScalar(2.2);
    const to = t ? { x: t.x, y: t.y + 0.8, z: t.z } : { x: x + dir * RANGE, y, z };
    this.wave = { t: 0, from: { x, y, z }, to };
    this.ringMesh.visible = true;
  }

  updateWave(dt) {
    const w = this.wave;
    if (!w) return;
    w.t += dt / 0.3;
    const k = Math.min(1, w.t), m = this.ringMesh;
    m.position.set(w.from.x + (w.to.x - w.from.x) * k, w.from.y + (w.to.y - w.from.y) * k, w.from.z + (w.to.z - w.from.z) * k);
    m.quaternion.copy(this.game.renderer.billboardQ); // (face on, so it reads as a ring)
    m.scale.setScalar(0.6 + k * 1.6);
    m.material.opacity = 1 - k * 0.8;
    if (k >= 1) {
      m.visible = false;
      this.wave = null;
    }
  }

  // ------------------------------------------------------------------ the Menu
  renderMenu(el) {
    const learned = POWERS.filter((p) => this.learned(p.id));
    const btn = (key, val, label, on, note = '') => `<button type="button" class="kit-opt${on ? ' on' : ''}" data-kit="${key}:${val}" aria-pressed="${on}">${label}${note ? `<small>${note}</small>` : ''}</button>`;
    const parts = [];
    const have = this.parts();
    if (have.length > 1) {
      parts.push(`<div class="kit-row"><h4>Wrench <span class="kit-key">${touchActive() ? '' : '<kbd>T</kbd> swaps'}</span></h4><div class="kit-opts">${have.map((p) => btn('wrench', p.id, `<i class="kit-swatch" style="--part:${p.css}"></i>${p.name}`, this.wrench === p.id, p.note)).join('')}</div></div>`);
    }
    const outfits = this.outfits();
    if (outfits.length > 1) parts.push(`<div class="kit-row"><h4>Clothes</h4><div class="kit-opts">${outfits.map((o) => btn('outfit', o.id, o.name, this.outfit === o.id, o.note)).join('')}</div></div>`);
    if (learned.length) parts.push(`<div class="kit-row"><h4>The Chronoheart</h4><ul class="kit-powers">${learned.map((p) => `<li><b>${p.name}</b> <span>${p.where}</span></li>`).join('')}</ul></div>`);
    el.hidden = !parts.length;
    el.querySelector('.kit-list').innerHTML = parts.join('');
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
