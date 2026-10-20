// What Vivienne carries from chapter to chapter: the clothes she wears, what her wrench can do,
// and every power the Chronoheart has learned. It lives in the shared save (progress.kit), so a
// choice made in one chapter holds in all of them. The Stasis wave lives here too, because it
// works in every chapter: hold the wrench's swing, let go, and a ring of pale light holds the
// first thing in front of you in its moment.
import * as THREE from 'three';
import { input } from './core/input.js';
import { audio } from './audio/audio.js';
import { chapter, progress, CHAPTERS, theme } from './chapter.js';
import { setOutfit } from './render/sprites.js';
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
  { id: 'seal', name: 'Stasis Seal', where: 'Every chapter. With it on your wrench, hold the swing and let go.', from: 'hollowmere', flag: 'hasSeal' },
  { id: 'echo', name: 'Echo', where: 'Hollowmere and Highcrest.', from: 'hollowmere', flag: 'hasEcho' },
  { id: 'tempo', name: 'Tempo', where: "Hollowmere's machines.", from: 'hollowmere', flag: 'hasTempo' },
  { id: 'rewind', name: 'Rewind', where: 'Saltwick.', from: 'saltwick', flag: 'hasRewind' },
  { id: 'reach', name: 'Reach', where: 'Saltwick, through the time lens.', from: 'saltwick', flag: 'hasReach' },
  { id: 'lantern', name: 'The Lantern', where: 'Highcrest.', from: 'summit', flag: 'hasLantern' },
];

const CHARGE = 0.45; // seconds the swing is held before letting go sends a wave
const RANGE = 5.5;
const HOLD = { enemy: 8, warden: 5, npc: 6 }; // seconds a wave holds each kind of thing
// what people say when they come out of it, none the wiser
const THAWED = [
  '...Sorry, where was I?',
  'Did anyone else feel a draft just then?',
  "I've lost my train of thought. And possibly a few seconds.",
  'Why is everyone looking at me?',
  'Hm? Oh. Hello. Was I saying something?',
];

export class Kit {
  constructor(game) {
    this.game = game;
    this.holdT = 0;
    this.target = null;
    this.glowing = null;
    this.learnT = 0;
    this.wave = null;
    setOutfit(this.outfit); // before the player is built, so she is dressed from the start
  }

  // ------------------------------------------------------------------ the shared save
  get saved() {
    return progress.kit();
  }
  /** Learned already, in this chapter or an earlier one? */
  learned(id) {
    const p = POWERS.find((q) => q.id === id);
    return progress.hasReward('power:' + id) || progress.isDone(p.from) || (chapter.id === p.from && !!this.game.state.flags[p.flag]);
  }
  get hasSeal() {
    return this.learned('seal');
  }
  get wrench() {
    return this.saved.wrench ?? 'seal';
  }
  get waveReady() {
    return (this.hasSeal && this.wrench === 'seal') || !!this.game.forceWave?.();
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
  equip(wrench) {
    progress.setKit({ wrench });
    audio.sfx('socket');
  }

  // ------------------------------------------------------------------ every frame
  update(dt, ctl) {
    const g = this.game;
    // powers learned in this chapter are written down for the ones after
    this.learnT -= dt;
    if (this.learnT <= 0) {
      this.learnT = 1;
      for (const p of POWERS) if (chapter.id === p.from && g.state.flags[p.flag] && !progress.hasReward('power:' + p.id)) progress.grantReward('power:' + p.id);
      if (this.hasSeal && chapter.id !== 'hollowmere' && !progress.hasReward('waveHint') && g.mode === 'play') {
        progress.grantReward('waveHint');
        g.hud.toast(`Your <b>Stasis Seal</b> came with you. Hold ${touchActive() ? '<b>Attack</b>' : '<kbd>X</kbd>'}, then let go: a Stasis wave holds whatever is in front of you.`, 7000);
      }
    }
    this.updateWave(dt);
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
        g.bursts.emit(b.x + g.player.facing * 0.4, b.y + 0.9, b.z, 1, { color: [0xbff6ff, 0xffffff], speed: 1.2, life: 0.4, gravity: 0, glow: 2 });
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

  /** The thing a wave would hold, if it went now: the nearest one in front of her, in her age. */
  findTarget() {
    const g = this.game, b = g.player.body, f = g.player.facing;
    let best = null, bd = RANGE;
    const consider = (kind, ref, x, y, z, name) => {
      const dx = (x - b.x) * f, d = Math.hypot(x - b.x, (z - b.z) * 0.7);
      if (dx < -0.6 || Math.abs(z - b.z) > 2.4 || Math.abs(y - b.y) > 2.6 || d >= bd) return;
      bd = d;
      best = { kind, ref, x, y, z, name };
    };
    for (const t of g.sealTargets?.() || []) consider('custom', t, t.x, t.y, t.z, t.name);
    for (const e of g.enemies) if (e.alive && e.active() && !(e.stasisT > 0)) consider('enemy', e, e.body.x, e.body.y, e.body.z, 'it');
    for (const e of g.entities) if (e instanceof Warden && e.active() && !e.dormant && !(e.stasisT > 0)) consider('warden', e, e.x, 0, e.z, 'the Warden');
    for (const n of g.npcs) {
      if (!n.active() || n.spec.memory || n.spec.holo || n.spec.frozen || n.talking || n.stasisT > 0 || n.spec.noSeal) continue;
      consider('npc', n, n.x, n.y, n.z, n.spec.name);
    }
    // something that shimmers, in a chapter with things to seal (Hollowmere's bridge, vault, ...)
    const region = g.abilities?.readySealables?.().find((s) => b.x >= s.x0 && b.x <= s.x1 + 1 && b.y >= (s.yMin ?? -Infinity));
    if (region) best = { kind: 'region', ref: region, x: (region.glint.x0 + region.glint.x1) / 2, y: region.glint.y, z: (region.glint.z0 + region.glint.z1) / 2, name: region.name };
    return best;
  }

  /** What the wave would hold glows white, so you can see it before you let go. */
  setGlow(t) {
    const g = this.game;
    const actorOf = (x) => (x && (x.kind === 'enemy' || x.kind === 'warden' || x.kind === 'npc') ? x.ref.actor : null);
    const was = actorOf(this.glowing), now = actorOf(t);
    if (was && was !== now && was.mat.userData.preGlow) {
      const p = was.mat.userData.preGlow;
      was.mat.emissive.setHex(p.emissive);
      was.mat.emissiveIntensity = p.ei;
      delete was.mat.userData.preGlow;
    }
    if (now) {
      const m = now.mat;
      if (!m.userData.preGlow) m.userData.preGlow = { emissive: m.emissive.getHex(), ei: m.emissiveIntensity };
      m.emissive.setHex(0xffffff);
      m.emissiveIntensity = 0.35 + Math.sin(g.time * 6) * 0.15;
    } else if (t && Math.random() < 0.5) {
      // a place, or a thing with no face: a flurry of white motes over it
      g.bursts.emit(t.x + (Math.random() - 0.5) * 1.6, t.y + Math.random() * 1.4, t.z + (Math.random() - 0.5) * 1.2, 1, { color: [0xffffff, 0xbff6ff], speed: 0.4, life: 0.9, gravity: -0.8, glow: 2.2 });
    }
    this.glowing = t;
  }

  /** Let go of a held swing: a ring of pale light, and whatever it meets is held. */
  fire() {
    const g = this.game, b = g.player.body, t = this.findTarget();
    audio.sfx('shift', { era: g.era });
    this.launchRing(b.x, b.y + 0.9, b.z, g.player.facing, t);
    if (!t) return;
    this.setGlow(null);
    g.bursts.emit(t.x, t.y + 0.8, t.z, 40, { color: [0xbff6ff, 0xffffff], speed: 4, life: 1 });
    audio.sfx('socket');
    if (t.kind === 'custom') return t.ref.seal();
    if (t.kind === 'region') return g.abilities.trySeal();
    if (t.kind === 'enemy') {
      if (g.sealEnemy?.(t.ref)) return; // a chapter where it lasts forever (Hollowmere's creatures)
      return t.ref.stasis(HOLD.enemy);
    }
    if (t.kind === 'warden') {
      t.ref.stasis(HOLD.warden);
      t.ref.state = 'return';
      return;
    }
    if (t.kind === 'npc') {
      t.ref.stasis(HOLD.npc);
      const s = g.state;
      if (!(s.sealedNpcs ||= []).includes(t.ref.id)) s.sealedNpcs.push(t.ref.id);
      g.onNpcSealed?.(t.ref);
      g.save();
    }
  }

  /** Someone held by a wave has come out of it. */
  thawed(e) {
    if (!e.spec || !this.game.npcs.includes(e) || !e.active()) return;
    const said = THAWED[Math.floor(Math.random() * THAWED.length)];
    this.game.hud.toast(`<b>${e.spec.name}:</b> "${said}"`, 3500);
  }

  launchRing(x, y, z, dir, t) {
    const g = this.game;
    if (!this.ringMesh) {
      this.ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.06, 6, 28),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbff6ff).multiplyScalar(2.2), transparent: true, depthWrite: false }),
      );
      this.ringMesh.rotation.y = Math.PI / 2;
      g.scene.add(this.ringMesh);
    }
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
    if (this.hasSeal) {
      parts.push(`<div class="kit-row"><h4>Wrench</h4><div class="kit-opts">${btn('wrench', 'plain', 'Plain wrench', this.wrench === 'plain', 'For striking things.')}${btn('wrench', 'seal', 'Stasis wave', this.wrench === 'seal', `Hold ${touchActive() ? 'Attack' : 'X'}, then let go.`)}</div></div>`);
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
