// HTML overlay UI: HUD, dialogue, toasts, banners, menus.
import { input } from '../core/input.js';
import { audio } from '../audio/audio.js';
import { iconURL, portraitURL } from '../render/sprites.js';
import { ITEMS } from '../story.js';
import { ERA_NAMES } from '../core/util.js';

const $ = (id) => document.getElementById(id);
const ERA_CLASS = ['past', 'present', 'future'];

export class HUD {
  constructor() {
    this.root = $('hud');
    this.hearts = $('hearts');
    this.ring = $('chrono-ring');
    this.chrono = $('chrono');
    this.inv = $('inventory');
    this.cogs = $('cog-count');
    this.prompt = $('prompt');
    this.promptText = $('prompt-text');
    this.toasts = $('toasts');
    this.banner = $('area-banner');
    this.res = $('resonance');
    this.resBar = $('resonance-bar');
    $('cog-icon').src = iconURL('cog');
    $('chrono-core').src = iconURL('amulet');
    this.circ = 2 * Math.PI * 40;
    this.ring.style.strokeDasharray = `${this.circ}`;
    this.lastPrompt = null;
    this.bannerTimer = null;
  }
  show(v) {
    this.root.hidden = !v;
  }
  showAmulet(v) {
    this.chrono.classList.toggle('locked', !v);
  }
  setHearts(hp, max) {
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="heart ${i < hp ? 'full' : 'empty'}"></span>`;
    this.hearts.innerHTML = html;
  }
  setMeter(v, era) {
    this.ring.style.strokeDashoffset = `${this.circ * (1 - v)}`;
    this.chrono.classList.toggle('low', v < 0.25 && era !== 1);
  }
  setEra(era) {
    this.chrono.dataset.era = ERA_CLASS[era];
    document.body.dataset.era = ERA_CLASS[era];
    document.querySelectorAll('.era-pill').forEach((p) => p.classList.toggle('active', Number(p.dataset.e) === era));
  }
  setInventory(items) {
    this.inv.innerHTML = items
      .map((it) => `<div class="slot ${ITEMS[it]?.key ? 'key' : ''}" title="${ITEMS[it]?.name || it}"><img src="${iconURL(it === 'hammerBroken' ? 'hammerBroken' : it)}" alt="${ITEMS[it]?.name || it}"></div>`)
      .join('');
  }
  setCogs(n) {
    this.cogs.textContent = `${n}/9`;
  }
  showPrompt(text) {
    if (text === this.lastPrompt) return;
    this.lastPrompt = text;
    if (!text) {
      this.prompt.classList.remove('visible');
      return;
    }
    this.promptText.textContent = text;
    this.prompt.classList.add('visible');
  }
  toast(html, ms = 4200) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    this.toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 500);
    }, ms);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  }
  showBanner(name, era) {
    this.banner.querySelector('.area-name').textContent = name;
    this.banner.querySelector('.area-era').textContent = ERA_NAMES[era];
    this.banner.classList.remove('in');
    void this.banner.offsetWidth;
    this.banner.classList.add('in');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.remove('in'), 3200);
  }
  setResonance(frac) {
    if (frac === null) {
      this.res.hidden = true;
      return;
    }
    this.res.hidden = false;
    this.resBar.style.transform = `scaleX(${frac})`;
  }
  flashBlocked() {
    this.chrono.classList.remove('blocked');
    void this.chrono.offsetWidth;
    this.chrono.classList.add('blocked');
  }
}

export class Dialogue {
  constructor() {
    this.el = $('dialogue');
    this.nameEl = this.el.querySelector('.d-name');
    this.textEl = this.el.querySelector('.d-text');
    this.portrait = this.el.querySelector('.d-portrait');
    this.portraitImg = this.portrait.querySelector('img');
    this.active = false;
    this.el.addEventListener('click', () => (this.clicked = true));
    window.addEventListener('keydown', (e) => {
      if (this.active && !e.repeat && ['KeyF', 'Space', 'Enter', 'KeyX'].includes(e.code)) this.clicked = true;
    });
  }
  /** lines: [{who,name,text} | {give:...}] ; onCmd for non-text commands */
  async run(lines, onCmd = () => {}) {
    this.active = true;
    document.body.classList.add('in-dialogue');
    this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add('in'));
    for (const line of lines) {
      if (!line.text) {
        onCmd(line);
        continue;
      }
      await this.show(line);
    }
    this.el.classList.remove('in');
    await new Promise((r) => setTimeout(r, 180));
    this.el.hidden = true;
    this.active = false;
    document.body.classList.remove('in-dialogue');
    input.endFrame();
  }
  show(line) {
    return new Promise((resolve) => {
      this.nameEl.textContent = line.name || '';
      this.nameEl.hidden = !line.name;
      if (line.who) {
        this.portraitImg.src = portraitURL(line.who);
        this.portrait.hidden = false;
      } else this.portrait.hidden = true;
      this.el.classList.toggle('narration', !line.who);
      const text = line.text;
      let i = 0;
      this.textEl.textContent = '';
      this.clicked = false;
      const pitch = { michelle: 20, zach: 420, vivienne: 140, louise: 40, samaria: 120, aria: -80, callie: 60, sheng: -70, lillian: 160, eugene: -20, tick: 300, brn: 250, megan: 500 }[line.who] ?? 0;
      let acc = 0;
      let last = performance.now();
      const tick = (now) => {
        const dt = (now - last) / 1000;
        last = now;
        const skip = this.clicked;
        if (i < text.length) {
          if (skip) {
            i = text.length;
            this.clicked = false;
            input.endFrame();
          } else {
            acc += dt * 55;
            while (acc >= 1 && i < text.length) {
              acc -= 1;
              i++;
              if (i % 3 === 0 && text[i] !== ' ') audio.sfx('talk', { pitch });
            }
          }
          this.textEl.textContent = text.slice(0, i);
          this.el.classList.toggle('done', i >= text.length);
          requestAnimationFrame(tick);
        } else {
          this.el.classList.add('done');
          if (skip) {
            this.clicked = false;
            input.endFrame();
            audio.sfx('ui');
            resolve();
          } else requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }
}

export function showInventoryPanel(items, open, favours = []) {
  const el = $('inventory-panel');
  el.hidden = !open;
  if (!open) return;
  // favours (kindness side quests) the player has heard about
  const fav = el.querySelector('.favours');
  fav.hidden = !favours.length;
  fav.querySelector('.favour-list').innerHTML = favours
    .map((f) => `<div class="favour ${f.done ? 'done' : ''}"><span class="favour-mark" aria-hidden="true">${f.done ? '♥' : '◇'}</span><div><h4>${f.title}${f.done ? ' <span class="badge kind">Done</span>' : ''}</h4><p>${f.text}</p></div></div>`)
    .join('');
  const list = el.querySelector('.inv-list');
  if (!items.length) {
    list.innerHTML = '<p class="muted">Your apron pockets are empty, apart from a trusty wrench.</p>';
    return;
  }
  list.innerHTML = items
    .map(
      (it) => `<div class="inv-item ${ITEMS[it]?.key ? 'key' : ''}"><img src="${iconURL(it)}" alt=""><div><h3>${ITEMS[it].name}${ITEMS[it].key ? ' <span class="badge">Era Key</span>' : ''}</h3><p>${ITEMS[it].desc}</p></div></div>`,
    )
    .join('');
}

export function setFade(v, color = '#000', text = '') {
  const f = $('fade');
  f.style.background = color;
  f.style.opacity = v;
  $('fade-text').textContent = text;
  $('fade-text').style.opacity = text && v > 0.5 ? 1 : 0;
}

export function letterbox(on) {
  document.body.classList.toggle('letterbox', on);
}
