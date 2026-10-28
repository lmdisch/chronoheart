// Quick check of every chapter: the title screen, a new game, a save and Continue, no errors.
import { boot, newGame, sleep, SHOTS } from './lib.mjs';
const out = SHOTS;
let failed = false;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed = true; };
for (const chapter of ['hollowmere', 'saltwick', 'summit']) {
  const { browser, page, errors } = await boot({ chapter });
  await sleep(1500);
  await page.screenshot({ path: `${out}/title-${chapter}.png` });
  const title = await page.evaluate(() => ({
    chapter: document.body.dataset.chapter,
    cards: [...document.querySelectorAll('.chapter-card')].map((c) => c.className + ' | ' + c.textContent),
    tagline: document.getElementById('chapter-tagline').textContent,
    cont: !document.getElementById('btn-continue').hidden,
  }));
  check(title.chapter === chapter, `${chapter}: the page is running this chapter`);
  check(title.cards.length === 3 && title.cards.filter((c) => c.includes('current')).length === 1, `${chapter}: three chapter cards, one current`);
  check(!title.cont, `${chapter}: no Continue on a clean save`);
  await newGame(page);
  await sleep(1200);
  await page.screenshot({ path: `${out}/start-${chapter}.png` });
  const st = await page.evaluate(() => ({ mode: __game.mode, x: __game.player.body.x, cogs: document.getElementById('cog-count').textContent, inv: __game.state.inventory }));
  check(st.mode === 'play', `${chapter}: a new game reaches play (x=${st.x.toFixed(1)}, cogs ${st.cogs}, items ${st.inv})`);
  // walk right for a moment, save, and come back through Continue
  await page.keyboard.down('KeyD'); await sleep(1200); await page.keyboard.up('KeyD');
  const x1 = await page.evaluate(() => { __game.save(); return __game.player.body.x; });
  check(x1 > st.x + 1, `${chapter}: Vivienne walks (${st.x.toFixed(1)} -> ${x1.toFixed(1)})`);
  await page.reload();
  await page.waitForFunction('window.__game');
  const again = await page.evaluate(() => ({ chapter: document.body.dataset.chapter, cont: !document.getElementById('btn-continue').hidden, state: [...document.querySelectorAll('.chapter-card.current .ch-state')].map((e) => e.textContent)[0] }));
  check(again.chapter === chapter && again.cont, `${chapter}: after a reload, same chapter and Continue is offered ("${again.state}")`);
  await page.click('#btn-continue');
  await page.waitForFunction('window.__game.mode === "play"', { timeout: 20000 });
  check(true, `${chapter}: Continue reaches play`);
  check(errors.length === 0, `${chapter}: no errors ${errors.join(' | ').slice(0, 600)}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
