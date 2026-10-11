import './ui/style.css';
import { Game } from './game.js';
import { audio } from './audio/audio.js';
import { input } from './core/input.js';
import { iconURL } from './render/sprites.js';
import { setFade } from './ui/ui.js';
import { TouchControls } from './ui/touch.js';
import { COG_TOTAL } from './levels/hollowmere.js';

const $ = (id) => document.getElementById(id);
const game = new Game($('game-root'));
window.__game = game; // handy for debugging

const title = $('title-screen');
const pause = $('pause-menu');
const controls = $('controls-panel');
const credits = $('credits');

function refreshTitle() {
  $('btn-continue').hidden = !game.hasSave();
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
// Overlays: the pause menu, the Controls sheet and the Menu (goal, items, favours). Only one
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
// with a mouse, clicking the amulet turns Q / E between era travel and Tempo (the T key)
document.querySelector('#chrono .chrono-dial').addEventListener('click', () => {
  if (!document.body.classList.contains('touch')) game.toggleTempo();
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
  $('stat-cogs').textContent = `${state.cogs.length} / ${COG_TOTAL}`;
  $('stat-kind').textContent = `${state.kindness.length} / 3`;
  $('credits-bonus').hidden = state.cogs.length < COG_TOTAL;
  credits.hidden = false;
  requestAnimationFrame(() => credits.classList.add('in'));
  setTimeout(() => setFade(0), 400);
};
$('btn-credits-title').addEventListener('click', () => location.reload());

document.querySelectorAll('img[data-icon]').forEach((img) => (img.src = iconURL(img.dataset.icon)));

function loop() {
  if (game.mode !== 'paused') game.frame();
  else input.endFrame();
  touch.update(document.getElementById('prompt').classList.contains('visible'));
  requestAnimationFrame(loop);
}
loop();
