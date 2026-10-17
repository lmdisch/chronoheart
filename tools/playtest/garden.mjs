// Chapter One's secret: with Chapter Three's Master's Key, the Astral Clock-Door in Hollowmere Square
// opens onto the Starlit Garden. Without it, the door stays shut.
import { boot, newGame, sleep, driver } from './lib.mjs';

for (const key of [false, true]) {
  const save = { v: 2, slots: {}, done: {}, unlocked: true, last: 'hollowmere', rewards: key ? { masterKey: true } : {} };
  const { browser, page, errors } = await boot({ chapter: 'hollowmere', storage: { 'chronoheart-save-v2': save, 'chronoheart-chapter': 'hollowmere' } });
  const d = driver(page, errors);
  await newGame(page);
  await page.evaluate(() => { window.__game.state.flags.hasAmulet = true; });
  await d.tp(11.9, 0, 0.9, 1); await sleep(400);
  await d.check(`${key ? 'with' : 'without'} the key: the star-iron door prompt`, (s) => /Star-iron/.test(s.prompt || ''));
  await d.interactNow(); await sleep(600);
  const pocket = () => page.evaluate(() => window.__game.world.pocket?.id || null);
  if (!key) {
    await d.check('without the key, the door stays shut', async () => (await pocket()) === null);
  } else {
    await d.check('with the key, the door opens onto the Starlit Garden', async (s) => (await pocket()) === 'garden' && s.era === 2);
    await d.check('no shifting out of the garden', async () => { await d.tap('KeyQ'); await sleep(600); return (await page.evaluate(() => window.__game.era)) === 2; });
    await d.walkTo(33.5, -1.4, { t: 3000 });
    await sleep(300);
    await d.check('the memorial prompt', (s) => /Memorial/.test(s.prompt || ''));
    await page.screenshot({ path: process.env.SHOT || '/tmp/garden.png' });
    await d.interactNow();
    await d.walkTo(33.5, 0.5, { t: 3000 });
    await sleep(900);
    await d.check('walking out: back in the square, in the Present', async (s) => (await pocket()) === null && s.era === 1);
  }
  console.log('failures:', d.failures(), 'errors:', errors);
  await browser.close();
}
