// Picking one of Donald Eugene's locks. He never meant to hand anything over for good: every part he
// leaves for Vivienne is locked away, so she picks her way in. A row of pins, and a pick sweeping
// back and forth under them: press when it's under the gold mark and that pin sets. A miss costs
// nothing but the moment (the mark moves). Every pin set, and the lock gives.
import { audio } from '../audio/audio.js';

const $ = (id) => document.getElementById(id);
const PICK_KEYS = ['KeyX', 'KeyF', 'Space', 'Enter'];

/**
 * pins: how many pins (2 to 5). name: whose lock this is. touch: say "tap" rather than a key.
 * Resolves true once it opens, false if she gives up (Esc, or the button).
 */
export function pickLock({ pins = 3, name = 'A lock', touch = false } = {}) {
  const root = $('lockpick');
  const track = root.querySelector('.lp-track');
  const pick = root.querySelector('.lp-pick');
  const zone = root.querySelector('.lp-zone');
  const row = root.querySelector('.lp-pins');
  root.querySelector('.lp-name').textContent = name;
  root.querySelector('.lp-how').innerHTML = touch ? 'Tap when the pick is under the gold mark.' : 'Press <kbd>X</kbd> when the pick is under the gold mark. <kbd>Esc</kbd> to stop.';
  row.innerHTML = Array.from({ length: pins }, () => '<i class="lp-pin"></i>').join('');
  const pinEls = [...row.children];
  root.hidden = false;
  root.classList.remove('lp-open', 'lp-miss');

  let set = 0, pos = 0, dir = 1, last = performance.now(), zoneAt = 0, zoneW = 0, done = false;
  const speed = () => 0.75 + set * 0.18; // track-lengths a second: a little quicker with every pin
  const newZone = () => {
    zoneW = Math.max(0.12, 0.2 - set * 0.02);
    // somewhere the pick isn't right now, so a press can't land by accident
    do zoneAt = 0.08 + Math.random() * (0.84 - zoneW);
    while (Math.abs(zoneAt + zoneW / 2 - pos) < 0.25);
    zone.style.left = `${zoneAt * 100}%`;
    zone.style.width = `${zoneW * 100}%`;
    pinEls.forEach((p, i) => p.classList.toggle('lp-now', i === set));
  };
  newZone();

  return new Promise((resolve) => {
    const finish = (ok) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey, true);
      root.removeEventListener('pointerdown', onTap);
      give.removeEventListener('pointerdown', onGive);
      setTimeout(() => {
        root.hidden = true;
        resolve(ok);
      }, ok ? 650 : 0);
    };
    const attempt = () => {
      if (done) return;
      if (pos >= zoneAt - 0.015 && pos <= zoneAt + zoneW + 0.015) {
        pinEls[set].classList.add('lp-set');
        set++;
        audio.sfx(set === pins ? 'lever' : 'tick');
        if (set === pins) {
          root.classList.add('lp-open');
          audio.sfx('gate');
          return finish(true);
        }
        newZone();
      } else {
        audio.sfx('blocked');
        root.classList.remove('lp-miss');
        void root.offsetWidth; // (restart the shake)
        root.classList.add('lp-miss');
        newZone();
      }
    };
    const onKey = (e) => {
      // nothing else hears these while the pick is in: no pausing, no swinging the wrench
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') finish(false);
      else if (PICK_KEYS.includes(e.code)) attempt();
    };
    const onTap = (e) => {
      e.preventDefault();
      attempt();
    };
    const give = root.querySelector('.lp-give');
    const onGive = (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', onTap);
    give.addEventListener('pointerdown', onGive);
    const step = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pos += dir * speed() * dt;
      if (pos > 1) (pos = 2 - pos), (dir = -1);
      if (pos < 0) (pos = -pos), (dir = 1);
      pick.style.left = `${pos * 100}%`;
      track.classList.toggle('lp-hot', pos >= zoneAt && pos <= zoneAt + zoneW);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
