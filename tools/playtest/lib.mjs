import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
const CHROME = process.env.CHROME || process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Where screenshots go: $SHOTS, else the system temp folder (never the repo). */
export const SHOTS = process.env.SHOTS || tmpdir();
/**
 * Open the game on a chapter ('hollowmere', 'saltwick' or 'summit'), with a clean save and every chapter
 * unlocked. save: a saved state to put in that chapter's slot first (for Continue). unlocked:
 * false leaves later chapters locked, as a new player finds them. storage: raw localStorage
 * entries to start from instead (for testing how old saves are brought over).
 */
export async function boot({ width = 1280, height = 720, url = process.env.GAME_URL || 'http://localhost:5173/', chapter = 'hollowmere', save = null, unlocked = true, storage = null } = {}) {
  // Frames are not tied to the display's refresh: on a Mac whose screen is asleep or locked,
  // headless Chrome otherwise stops drawing frames altogether, and the game stands still.
  const gpu = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: [...gpu, `--window-size=${width},${height}`, '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(url);
  await page.evaluate((id, slot, unlocked, storage) => {
    localStorage.clear();
    sessionStorage.clear();
    if (storage) return Object.entries(storage).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
    localStorage.setItem('chronoheart-save-v2', JSON.stringify({ v: 2, slots: slot ? { [id]: slot } : {}, done: {}, unlocked, last: id }));
    localStorage.setItem('chronoheart-chapter', id);
  }, chapter, save, unlocked, storage);
  await page.reload();
  await autoplay(page);
  return { browser, page, errors };
}
/** Auto-advance dialogue, skip time-lapses, and pick locks (again after any reload of the page). */
export async function autoplay(page) {
  await page.waitForFunction('window.__game');
  await page.evaluate(() => {
    // one of Donald Eugene's locks: press X when the pick is under the gold mark, as a player would
    clearInterval(window.__autoPick);
    window.__autoPick = setInterval(() => {
      const lp = document.getElementById('lockpick');
      if (!lp || lp.hidden) return;
      const pick = parseFloat(lp.querySelector('.lp-pick').style.left), z = lp.querySelector('.lp-zone');
      const z0 = parseFloat(z.style.left), z1 = z0 + parseFloat(z.style.width);
      if (pick > z0 + 1 && pick < z1 - 1) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX' }));
      }
    }, 12);
    clearInterval(window.__auto);
    window.__auto = setInterval(() => {
      const g = window.__game;
      if (g.dialogue.active) g.dialogue.clicked = true;
      if (g.lapse) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); }
    }, 60);
  });
}
export async function newGame(page) {
  await page.click('#btn-new');
  await page.waitForFunction('window.__game.mode === "play" && !window.__game.dialogue.active', { timeout: 30000 });
  await sleep(400);
}
/** wait until the game is back in plain play */
export const settle = (page, t = 30000) => page.waitForFunction('window.__game.mode === "play" && !window.__game.dialogue.active && !window.__game.lapse', { timeout: t });

/**
 * Helpers for a scripted playthrough on `page`: read the state, teleport between set pieces,
 * and drive Vivienne with real key presses. check() prints PASS/FAIL and stops on page errors.
 */
export function driver(page, errors) {
  const log = (...a) => console.log(...a);
  let failures = 0;
  const st = () =>
    page.evaluate(() => {
      const g = window.__game, b = g.player.body;
      const pr = document.getElementById('prompt');
      return {
        x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), era: g.era, mode: g.mode, hp: g.player.hp, ground: b.onGround,
        f: g.state.flags, inv: g.state.inventory, cogs: g.state.cogs, outfit: g.kit.outfit, kind: g.state.kindness, taken: g.state.taken, meter: g.meter,
        prompt: pr.classList.contains('visible') ? document.getElementById('prompt-text').textContent : null,
      };
    });
  const tp = (x, y, z, era) =>
    page.evaluate((x, y, z, era) => {
      const g = window.__game;
      if (era !== undefined && era !== g.era) g.applyEra(era, true);
      g.player.place(x, y, z);
      g.player.body.vx = g.player.body.vz = 0;
      g.post.trans = 1;
      if (g.meter !== undefined) g.meter = 1;
    }, x, y, z, era);
  const K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
  const down = (c) => page.keyboard.down(c), up = (c) => page.keyboard.up(c);
  const tap = async (c, ms = 60) => { await down(c); await sleep(ms); await up(c); await sleep(60); };
  /** hold movement keys until the player is within tol of (x, z), or time runs out */
  async function walkTo(x, z, { tol = 0.25, t = 6000, jump = false, sprint = false } = {}) {
    const t0 = Date.now(), held = new Set();
    const set = async (code, on) => {
      if (on && !held.has(code)) { await down(code); held.add(code); }
      if (!on && held.has(code)) { await up(code); held.delete(code); }
    };
    let ok = false;
    if (sprint) await set('ShiftLeft', true);
    while (Date.now() - t0 < t) {
      const s = await st();
      const dx = x === null ? 0 : x - s.x, dz = z === null ? 0 : z - s.z;
      if (Math.abs(dx) < tol && Math.abs(dz) < tol) { ok = true; break; }
      await set(K.right, dx > tol * 0.6); await set(K.left, dx < -tol * 0.6);
      await set(K.down, dz > tol * 0.6); await set(K.up, dz < -tol * 0.6);
      if (jump) await set('Space', (Date.now() - t0) % 500 < 220);
      await sleep(25);
    }
    for (const c of [...held]) await up(c);
    await sleep(120);
    return ok;
  }
  /** up a ladder (W) to topY, then step off toward dir */
  async function climb(dir, topY, t = 6000) {
    await down('KeyW');
    const t0 = Date.now();
    while (Date.now() - t0 < t) { const s = await st(); if (s.y >= topY - 0.6) break; await sleep(40); }
    if (dir) await down(dir);
    while (Date.now() - t0 < t) { const s = await st(); if (s.y >= topY - 0.02 && s.ground) break; await sleep(40); }
    await up('KeyW'); if (dir) { await sleep(150); await up(dir); }
    await sleep(150);
  }
  const check = async (name, cond) => {
    if (errors.length) { log('ERRORS', errors.slice(0, 3)); process.exit(1); }
    const s = await st();
    const ok = !!(await cond(s));
    if (!ok) failures++;
    log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify({ x: s.x, y: s.y, z: s.z, era: s.era, mode: s.mode, prompt: s.prompt }));
    return ok;
  };
  const settleNow = async () => { await sleep(250); await settle(page, 60000); await sleep(200); };
  const interactNow = async () => { await tap('KeyF'); await settleNow(); };
  /** travel one era with a tap (Q back, E forward), and wait for the shift to finish */
  async function shift(key) {
    const before = await page.evaluate(() => window.__game.era);
    // (a press during a moment's input lock, say right after a time-lapse, goes unheard: try again)
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => window.__game.controlsEnabled(), { timeout: 4000 }).catch(() => {});
      await tap(key, 60);
      const ok = await page.waitForFunction((b) => window.__game.era !== b && window.__game.post.trans > 0.95, { timeout: 2500 }, before).then(() => true, () => false);
      if (ok) break;
    }
    await sleep(150);
  }
  /** swing the wrench n times */
  async function strike(n = 3) { for (let i = 0; i < n; i++) { await tap('KeyX'); await sleep(450); } await settleNow(); }
  return { log, st, tp, K, down, up, tap, walkTo, climb, check, settle: settleNow, interactNow, shift, strike, failures: () => failures };
}
