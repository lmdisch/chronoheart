import './ui/style.css';
import { CHAPTERS, chapter, content, progress, switchChapter } from './chapter.js';
import { HollowmereGame } from './chapters/hollowmere/game.js';
import { SaltwickGame } from './chapters/saltwick/game.js';
import { audio } from './audio/audio.js';
import { input } from './core/input.js';
import { iconURL } from './render/sprites.js';
import { setFade } from './ui/ui.js';
import { TouchControls } from './ui/touch.js';

const $ = (id) => document.getElementById(id);
// one chapter per page load (see src/chapter.js): its colors and its own lines of help text
document.body.dataset.chapter = chapter.id;
const GAMES = { hollowmere: HollowmereGame, saltwick: SaltwickGame };
const game = new GAMES[chapter.id]($('game-root'));
window.__game = game; // handy for debugging
window.__unlockChapters = () => {
  progress.unlockAll();
  location.reload();
};

const title = $('title-screen');
const pause = $('pause-menu');
const controls = $('controls-panel');
const credits = $('credits');

// The title: a card per chapter. The lit one is the chapter behind the title, which Continue
// and New Game act on; picking another open one reloads the page on it.
function chapterState(ch) {
  if (!progress.isOpen(ch)) return `Finish ${CHAPTERS.find((c) => c.id === ch.requires).label} to unlock`;
  const saved = progress.slot(ch.id), done = progress.isDone(ch.id);
  if (done) return saved && ch.keepsSave ? 'Complete · keep exploring' : saved ? 'Complete · a new story in progress' : 'Complete';
  return saved ? 'In progress' : 'Not started';
}
function refreshTitle() {
  $('btn-continue').hidden = !game.hasSave();
  $('chapter-tagline').textContent = chapter.tagline;
  document.querySelectorAll('.era-strip span:not(.dot)').forEach((el, i) => (el.textContent = chapter.eras[i]));
  const list = $('chapter-select');
  list.replaceChildren(
    ...CHAPTERS.map((ch) => {
      const open = progress.isOpen(ch), current = ch.id === chapter.id;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `chapter-card${current ? ' current' : ''}${open ? '' : ' locked'}${progress.isDone(ch.id) ? ' done' : ''}`;
      card.setAttribute('aria-pressed', String(current));
      if (!open) card.setAttribute('aria-disabled', 'true');
      for (const [cls, text] of [['ch-label', ch.label], ['ch-title', ch.title], ['ch-state', chapterState(ch)]]) {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        card.append(span);
      }
      card.addEventListener('click', () => {
        if (current) return;
        audio.init();
        if (!open) {
          audio.sfx('blocked');
          card.classList.remove('nudge');
          requestAnimationFrame(() => card.classList.add('nudge'));
          return;
        }
        audio.sfx('ui');
        setFade(1, '#05040a');
        setTimeout(() => switchChapter(ch.id), 350);
      });
      return card;
    }),
  );
}
refreshTitle();

function hideTitle() {
  title.classList.add('out');
  setTimeout(() => (title.hidden = true), 700);
}

$('btn-new').addEventListener('click', () => {
  audio.init();
  audio.sfx('ui');
  hideTitle();
  game.startNew();
});
$('btn-continue').addEventListener('click', () => {
  audio.init();
  audio.sfx('ui');
  hideTitle();
  game.continueGame();
});
// ---------------------------------------------------------------------------
// Overlays: the pause menu, the Controls sheet and the Menu (goal, items, favors). Only one
// shows at a time, and the game is paused while any is open. Controls opened from the pause
// menu go back to it when closed.
const menu = $('inventory-panel');
let overlay = null; // 'pause' | 'controls' | 'menu' | null
let controlsReturn = null; // where closing Controls goes: 'play' | 'pause'

function show(name) {
  pause.hidden = name !== 'pause';
  controls.hidden = name !== 'controls';
  menu.hidden = name !== 'menu';
  overlay = name;
}
function pauseGame(p) {
  game.mode = p ? 'paused' : 'play';
  audio.setMusicVolume(p ? 0.2 : 0.55);
  if (!p) game.clock.getDelta(); // don't let the paused time leak into the next frame
}
function openOverlay(name) {
  if (name === 'controls') {
    controlsReturn = overlay === 'pause' ? 'pause' : !overlay && game.mode === 'play' ? 'play' : null;
    if (!controlsReturn) return; // not on the title, mid-conversation or mid-cutscene
  } else if (overlay || game.mode !== 'play') return;
  audio.init();
  audio.sfx('ui');
  if (!overlay && game.mode === 'play') pauseGame(true);
  if (name === 'menu') {
    game.renderMenu();
    document.body.classList.remove('goal-new');
  }
  show(name);
}
function closeOverlay() {
  if (!overlay) return;
  audio.sfx('ui');
  if (overlay === 'controls' && controlsReturn === 'pause') return show('pause');
  show(null);
  pauseGame(false);
}
const toggle = (name) => (overlay === name ? closeOverlay() : !overlay || name === 'controls' ? openOverlay(name) : null);

document.querySelectorAll('[data-open-controls]').forEach((b) => b.addEventListener('click', () => openOverlay('controls')));
$('hud-controls').addEventListener('click', (e) => {
  e.currentTarget.blur();
  toggle('controls');
});
$('btn-close-controls').addEventListener('click', closeOverlay);
$('btn-close-menu').addEventListener('click', closeOverlay);
$('btn-resume').addEventListener('click', closeOverlay);
$('btn-restart-cp').addEventListener('click', () => {
  show(null);
  pauseGame(false);
  game.player.hp = 1;
  game.player.invuln = 0;
  game.onDeath();
});
$('btn-music').addEventListener('click', () => {
  audio.musicOn = !audio.musicOn;
  $('btn-music').textContent = `Music: ${audio.musicOn ? 'On' : 'Off'}`;
});
$('btn-quit').addEventListener('click', () => location.reload());

// Fullscreen, from the Menu or the Pause screen (hidden where the browser doesn't allow it)
{
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const enabled = !!request && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? false);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const buttons = [...document.querySelectorAll('[data-fullscreen]')];
  const sync = () => buttons.forEach((b) => {
    b.hidden = !enabled;
    b.textContent = isFull() ? 'Exit fullscreen' : 'Fullscreen';
  });
  buttons.forEach((b) =>
    b.addEventListener('click', async () => {
      audio.sfx('ui');
      try {
        if (isFull()) await exit.call(document);
        else await request.call(root);
      } catch {
        // refused (e.g. an embedding page without permission): nothing to do
      }
      sync();
    }),
  );
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  sync();
}

// start music quietly on first interaction with the title
window.addEventListener(
  'pointerdown',
  () => {
    audio.init();
    audio.setEra(game.era);
  },
  { once: true },
);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyH') toggle('controls');
  else if (e.code === 'KeyI') toggle('menu');
  else if (e.code === 'KeyG') {
    // straight to the hint
    if (!overlay) openOverlay('menu');
    if (overlay === 'menu') game.showHint(true);
  } else if (e.code === 'Escape' || e.code === 'KeyP') {
    if (overlay) closeOverlay();
    else openOverlay('pause');
  }
});

const touch = new TouchControls(game, {
  onHelp: () => toggle('controls'),
  onMenu: () => toggle('menu'),
  onPause: () => (overlay ? closeOverlay() : openOverlay('pause')),
});
$('goal-hint-btn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  audio.sfx('ui');
  game.showHint();
});
$('btn-portrait-ok').addEventListener('click', () => document.body.classList.add('portrait-ok'));

game.onCredits = (state) => {
  const t = Math.floor(state.playTime);
  $('stat-time').textContent = `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, '0')}s`;
  const allCogs = state.cogs.length >= content.COG_TOTAL;
  $('stat-cogs').textContent = `${state.cogs.length} / ${content.COG_TOTAL}`;
  $('stat-kind').textContent = `${state.kindness.length} / ${content.FAVORS.length}`;
  $('credits-eyebrow').textContent = chapter.credits.eyebrow;
  $('credits-chapter').textContent = `${chapter.label}: ${chapter.title}`;
  $('credits-bonus').textContent = chapter.credits.bonus;
  $('credits-bonus').hidden = !allCogs;
  $('credits-more').textContent = chapter.credits.more;
  $('credits-more').hidden = chapter.keepsSave && allCogs;
  // straight on to the next chapter, now that it's open
  const next = CHAPTERS.find((c) => c.requires === chapter.id);
  $('btn-credits-next').hidden = !next;
  if (next) $('btn-credits-next').textContent = `Begin ${next.label}`;
  credits.hidden = false;
  requestAnimationFrame(() => credits.classList.add('in'));
  setTimeout(() => setFade(0), 400);
};
$('btn-credits-title').addEventListener('click', () => location.reload());
$('btn-credits-next').addEventListener('click', () => {
  const next = CHAPTERS.find((c) => c.requires === chapter.id);
  if (next) switchChapter(next.id);
});

document.querySelectorAll('img[data-icon]').forEach((img) => (img.src = iconURL(img.dataset.icon)));

function loop() {
  if (game.mode !== 'paused') game.frame();
  else input.endFrame();
  touch.update(document.getElementById('prompt').classList.contains('visible'));
  requestAnimationFrame(loop);
}
loop();
