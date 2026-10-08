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
document.querySelectorAll('[data-open-controls]').forEach((b) =>
  b.addEventListener('click', () => {
    audio.init();
    audio.sfx('ui');
    controls.hidden = false;
  }),
);
// Controls overlay during play (H key or the HUD button) freezes the game while open.
let controlsFromPlay = false;
function openControlsInPlay() {
  if (game.mode !== 'play' || !controls.hidden) return;
  audio.sfx('ui');
  controlsFromPlay = true;
  controls.hidden = false;
  game.mode = 'paused';
}
function closeControls() {
  controls.hidden = true;
  if (controlsFromPlay) {
    controlsFromPlay = false;
    game.mode = 'play';
    game.clock.getDelta();
  }
}
$('hud-controls').addEventListener('click', (e) => {
  e.currentTarget.blur();
  openControlsInPlay();
});
$('btn-close-controls').addEventListener('click', () => {
  audio.sfx('ui');
  closeControls();
});

// start music quietly on first interaction with the title
window.addEventListener(
  'pointerdown',
  () => {
    audio.init();
    audio.setEra(game.era);
  },
  { once: true },
);

function setPaused(p) {
  if (p && game.mode !== 'play') return;
  pause.hidden = !p;
  game.mode = p ? 'paused' : 'play';
  audio.setMusicVolume(p ? 0.2 : 0.55);
  if (!p) game.clock.getDelta();
}
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-restart-cp').addEventListener('click', () => {
  setPaused(false);
  game.player.hp = 1;
  game.player.invuln = 0;
  game.onDeath();
});
$('btn-music').addEventListener('click', () => {
  audio.musicOn = !audio.musicOn;
  $('btn-music').textContent = `Music: ${audio.musicOn ? 'On' : 'Off'}`;
});
$('btn-quit').addEventListener('click', () => location.reload());

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH') {
    if (!controls.hidden && controlsFromPlay) closeControls();
    else openControlsInPlay();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (!controls.hidden) closeControls();
    else if (game.mode === 'play') setPaused(true);
    else if (game.mode === 'paused') setPaused(false);
  }
});

const touch = new TouchControls(game, {
  onHelp: () => openControlsInPlay(),
  onPause: () => {
    audio.sfx('ui');
    if (game.mode === 'play') setPaused(true);
    else if (game.mode === 'paused' && !pause.hidden) setPaused(false);
  },
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
