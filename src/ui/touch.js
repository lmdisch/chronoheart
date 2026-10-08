// On-screen controls for phones and tablets. They feed the same virtual key states as the
// keyboard (see core/input.js), so gameplay code doesn't know which one is in use.
//
// Shown when the primary pointer is a touchscreen, or as soon as anyone touches the screen;
// hidden again if a physical keyboard is used (e.g. an iPad with a keyboard case).
import { input } from '../core/input.js';

const ICON = {
  jump: '<svg viewBox="0 0 24 24"><path d="M12 5l-6 7h4v6h4v-6h4z"/></svg>',
  attack: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5a4.5 4.5 0 0 0-4.3 5.8L4 16.5 7.5 20l7.2-7.2a4.5 4.5 0 0 0 5.8-4.3l-2.7 2.7-2.5-.7-.7-2.5z"/></svg>',
  roll: '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 8 8h-3a5 5 0 1 1-5-5v3l5-4.5L12 1z"/></svg>',
  talk: '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H10l-5 4v-4H4z"/></svg>',
  items: '<svg viewBox="0 0 24 24"><path d="M8 7V6a4 4 0 0 1 8 0v1h3l1 14H4L5 7zm2 0h4V6a2 2 0 0 0-4 0z"/></svg>',
  help: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 14h-2v-2h2zm2.1-6.6-.9.9c-.7.7-1.2 1.3-1.2 2.7h-2v-.5c0-1.1.5-2.1 1.2-2.8l1.2-1.3A1.5 1.5 0 1 0 10.5 8.5h-2a3.5 3.5 0 1 1 6.6 1.9z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z"/></svg>',
};

const STICK_R = 54; // px of thumb travel for full speed

export const touchActive = () => document.body.classList.contains('touch');

export function prefersTouch() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const noHover = !window.matchMedia?.('(hover: hover)').matches;
  return !!(coarse || (navigator.maxTouchPoints > 0 && noHover));
}

export class TouchControls {
  constructor(game, { onHelp, onPause }) {
    this.game = game;
    this.root = document.getElementById('touch-controls');
    this.buildSwipe();
    this.buildButtons({ onHelp, onPause });
    this.buildStick();
    this.bindHud();

    this.set(prefersTouch());
    window.addEventListener('touchstart', () => this.set(true), { capture: true, passive: true });
    window.addEventListener('keydown', (e) => {
      if (!e.repeat && !e.isComposing) this.set(false);
    });
    // stop the browser from scrolling / zooming / long-press selecting while playing
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => {
      if (this.on) e.preventDefault();
    });
  }

  set(on) {
    if (this.on === on) return;
    this.on = on;
    document.body.classList.toggle('touch', on);
    if (!on) this.resetStick();
  }

  /** A button that holds `code` down for as long as it's pressed. */
  hold(el, code) {
    const up = (e) => {
      el.classList.remove('on');
      input.release(code);
      if (e && el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('on');
      input.press(code);
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /** A button that fires once per tap. */
  tap(el, fn) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('on');
      fn();
    });
    const off = () => el.classList.remove('on');
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }

  pulse(code) {
    input.press(code);
    // released next frame; the press still registers as a "hit" this frame
    requestAnimationFrame(() => input.release(code));
  }

  buildButtons({ onHelp, onPause }) {
    const make = (cls, label, icon) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tc-btn ${cls}`;
      b.setAttribute('aria-label', label);
      b.innerHTML = `${icon}<span>${label}</span>`;
      return b;
    };
    const pad = document.createElement('div');
    pad.className = 'tc-pad';
    const jump = make('tc-jump', 'Jump', ICON.jump);
    const attack = make('tc-attack', 'Attack', ICON.attack);
    const roll = make('tc-roll', 'Roll', ICON.roll);
    const talk = make('tc-talk', 'Talk', ICON.talk);
    pad.append(talk, roll, attack, jump);
    this.hold(jump, 'Space');
    this.hold(attack, 'KeyX');
    this.hold(roll, 'KeyC');
    this.hold(talk, 'KeyF');
    this.talkBtn = talk;

    const top = document.createElement('div');
    top.className = 'tc-top';
    const items = make('tc-small', 'Items', ICON.items);
    const help = make('tc-small', 'Help', ICON.help);
    const pause = make('tc-small', 'Pause', ICON.pause);
    top.append(items, help, pause);
    this.tap(items, () => this.pulse('KeyI'));
    this.tap(help, onHelp);
    this.tap(pause, onPause);

    this.root.append(pad, top);
  }

  /**
   * Swipe to travel through time: drag left for the next era (Future-ward), right for the
   * previous one, matching the Past · Present · Future order across the top. While dragging,
   * the destination era fades in as a preview; let go past the threshold to travel there.
   * Works anywhere that isn't the joystick or a button.
   */
  buildSwipe() {
    const zone = document.createElement('div');
    zone.className = 'tc-swipe-zone';
    const label = document.createElement('div');
    label.className = 'tc-swipe-label';
    zone.append(label);
    this.root.append(zone);
    const game = this.game;
    const NAMES = ['Past', 'Present', 'Future'];
    let sw = null;
    const clear = () => {
      sw = null;
      game.swipePeek = null;
      label.className = 'tc-swipe-label';
    };
    zone.addEventListener('pointerdown', (e) => {
      if (!this.on || game.dialogue.active || !game.state.flags.hasAmulet || game.mode !== 'play') return;
      sw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, target: null, amt: 0 };
      zone.setPointerCapture?.(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
      if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        sw.target = null;
        game.swipePeek = null;
        label.className = 'tc-swipe-label';
        return;
      }
      const target = game.era + (dx < 0 ? 1 : -1);
      if (target < 0 || target > 2) {
        label.className = 'tc-swipe-label show none ' + (dx < 0 ? 'left' : 'right');
        label.textContent = dx < 0 ? 'No later era' : 'No earlier era';
        sw.target = null;
        game.swipePeek = null;
        return;
      }
      const need = Math.min(160, window.innerWidth * 0.18);
      sw.target = target;
      sw.amt = Math.min(1, Math.abs(dx) / need);
      game.swipePeek = { target, amt: sw.amt * 0.9 };
      label.textContent = dx < 0 ? `${NAMES[target]}  ▸` : `◂  ${NAMES[target]}`;
      label.className = `tc-swipe-label show ${dx < 0 ? 'left' : 'right'} ${sw.amt >= 1 ? 'ready' : ''} era-${target}`;
    });
    const end = (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const { target, amt } = sw;
      clear();
      if (target !== null && amt >= 1) game.tryShift(target);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', () => clear());
  }

  buildStick() {
    const zone = document.createElement('div');
    zone.className = 'tc-stick-zone';
    const base = document.createElement('div');
    base.className = 'tc-stick';
    const knob = document.createElement('div');
    knob.className = 'tc-knob';
    base.append(knob);
    zone.append(base);
    this.root.append(zone);
    Object.assign(this, { zone, base, knob, stickId: null });

    zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      zone.setPointerCapture?.(e.pointerId);
      const r = zone.getBoundingClientRect();
      // the stick appears under the thumb, kept fully on screen
      this.ox = Math.min(Math.max(e.clientX, r.left + STICK_R + 8), r.right - STICK_R - 8);
      this.oy = Math.min(Math.max(e.clientY, r.top + STICK_R + 8), r.bottom - STICK_R - 8);
      base.style.left = `${this.ox - r.left}px`;
      base.style.top = `${this.oy - r.top}px`;
      base.classList.add('active');
      this.moveStick(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this.moveStick(e);
    });
    const end = (e) => {
      if (e.pointerId === this.stickId) this.resetStick();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  moveStick(e) {
    let dx = (e.clientX - this.ox) / STICK_R, dy = (e.clientY - this.oy) / STICK_R;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    this.knob.style.transform = `translate(${dx * STICK_R}px, ${dy * STICK_R}px)`;
    input.axis.x = dx;
    input.axis.z = dy;
    // digital keys too, so ladders, swimming and menus that read held() still work
    const key = (code, on) => (on ? input.press(code) : input.release(code));
    key('KeyD', dx > 0.45);
    key('KeyA', dx < -0.45);
    key('KeyS', dy > 0.5);
    key('KeyW', dy < -0.5);
    key('ShiftLeft', m > 0.97);
  }

  resetStick() {
    this.stickId = null;
    input.axis.x = input.axis.z = 0;
    for (const c of ['KeyD', 'KeyA', 'KeyS', 'KeyW', 'ShiftLeft']) input.release(c);
    if (this.knob) this.knob.style.transform = '';
    this.base?.classList.remove('active');
    if (this.base) {
      this.base.style.left = '';
      this.base.style.top = '';
    }
  }

  /** Make HUD pieces tappable: era pills travel, holding the dial peeks, prompt and dialogue advance. */
  bindHud() {
    const game = this.game;
    document.querySelectorAll('#chrono .era-pill').forEach((pill) => {
      this.tap(pill, () => {
        if (!this.on) return;
        // travels one era toward the tapped one (while holding the dial, it picks what to peek at)
        const target = Number(pill.dataset.e);
        if (target < game.era) this.pulse('KeyQ');
        else if (target > game.era) this.pulse('KeyE');
      });
    });
    const dial = document.querySelector('#chrono .chrono-dial');
    if (dial) this.hold(dial, 'Tab');

    const prompt = document.getElementById('prompt');
    this.tap(prompt, () => this.pulse('KeyF'));

    // during cutscenes and conversations, a tap anywhere (controls included) moves the dialogue on
    const advance = () => {
      if (this.on && game.dialogue.active) game.dialogue.clicked = true;
    };
    document.getElementById('game-root').addEventListener('pointerdown', advance);
    this.root.addEventListener('pointerdown', advance, true);
    const inv = document.getElementById('inventory-panel');
    inv?.addEventListener('pointerdown', () => {
      if (this.on) this.pulse('KeyI');
    });
  }

  /** Called every frame: highlight Talk when there's something to talk to. */
  update(hasPrompt) {
    if (!this.on) return;
    this.talkBtn.classList.toggle('ready', !!hasPrompt);
  }
}
