import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME || process.env.HOME + '/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Open the game on a chapter ('hollowmere' or 'saltwick'), with a clean save and every chapter
 * unlocked. save: a saved state to put in that chapter's slot first (for Continue). unlocked:
 * false leaves later chapters locked, as a new player finds them. storage: raw localStorage
 * entries to start from instead (for testing how old saves are brought over).
 */
export async function boot({ width = 1280, height = 720, url = process.env.GAME_URL || 'http://localhost:5173/', chapter = 'hollowmere', save = null, unlocked = true, storage = null } = {}) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${width},${height}`, '--mute-audio'] });
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
  await page.waitForFunction('window.__game');
  // auto-advance dialogue, auto-skip time-lapses
  await page.evaluate(() => {
    window.__auto = setInterval(() => {
      const g = window.__game;
      if (g.dialogue.active) g.dialogue.clicked = true;
      if (g.lapse) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); }
    }, 60);
  });
  return { browser, page, errors };
}
export async function newGame(page) {
  await page.click('#btn-new');
  await page.waitForFunction('window.__game.mode === "play" && !window.__game.dialogue.active', { timeout: 30000 });
  await sleep(400);
}
/** wait until the game is back in plain play */
export const settle = (page, t = 30000) => page.waitForFunction('window.__game.mode === "play" && !window.__game.dialogue.active && !window.__game.lapse', { timeout: t });
