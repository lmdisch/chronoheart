// Chapter One's own systems, and the chapter plumbing around them: the draining Chronoheart,
// pushing a block, Seal / Echo / Tempo, the Gearworks, the ending, and what finishing unlocks.
// (The whole story, played through, is hollowmere-play.mjs.)
// It is not a playthrough: it puts Vivienne where each thing happens and uses real key presses there.
import { boot, newGame, sleep, settle } from './lib.mjs';
let failed = false;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed = true; };
const SAVE = 'chronoheart-save-v2';

{
  const { browser, page, errors } = await boot({ chapter: 'hollowmere', unlocked: false });
  const G = (fn, ...a) => page.evaluate(fn, ...a);
  const tap = async (key, ms = 60) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };
  const era = () => G(() => __game.era);

  // a new player: Chapter Two is locked, and its card won't take you there
  const locked = await G(() => [...document.querySelectorAll('.chapter-card')].map((c) => [c.classList.contains('locked'), c.querySelector('.ch-state').textContent]));
  check(!locked[0][0] && locked[1][0], `Chapter Two is locked for a new player ("${locked[1][1]}")`);
  await page.click('.chapter-card.locked');
  await sleep(900);
  check((await G(() => document.body.dataset.chapter)) === 'hollowmere', 'clicking the locked card changes nothing');

  await newGame(page);
  check((await G(() => getComputedStyle(document.getElementById('chrono')).display !== 'none' && __game.state.flags.hasAmulet)) !== true, 'no amulet at the start');
  await tap('KeyQ'); await sleep(400);
  check((await era()) === 1, 'before the amulet, Q travels nowhere');

  // talk to Elder Karen Louise
  await G(() => __game.player.place(19.4, 0, 2.6));
  await sleep(400);
  const prompt = await G(() => document.getElementById('prompt').textContent);
  await tap('KeyF');
  await sleep(300);
  await settle(page);
  check(/Louise/.test(prompt), `a prompt to talk ("${prompt.trim()}"), and the conversation ends back in play`);

  // the Chronoheart: travel, drain, and the pull back to the Present
  await G(() => { const g = __game; g.state.flags.hasAmulet = true; g.hud.showAmulet(true); g.player.place(8.5, 0, 4.5); });
  await sleep(300);
  await tap('KeyQ'); await sleep(1700);
  const m1 = await G(() => __game.meter);
  check((await era()) === 0 && m1 < 1, `Q travels to the Past, and the meter drains (${m1.toFixed(2)})`);
  await page.waitForFunction('window.__game.era === 1', { timeout: 40000 });
  check(true, 'out of charge (about 30 seconds): pulled back to the Present');
  await sleep(3200);
  await tap('KeyE'); await sleep(1700);
  check((await era()) === 2, 'E travels to the Future');
  await tap('KeyQ'); await sleep(1700);
  check((await era()) === 1, 'and Q comes back');

  // pushing the carved block onto the foundation (the Sun Terrace, Past)
  await G(() => { const g = __game; g.state.flags.steadyHeart = true; g.applyEra(0, true); g.player.place(141.6, 0, 4.5); });
  await sleep(400);
  await page.keyboard.down('KeyD');
  await page.waitForFunction('window.__game.state.blockPos.x === 145', { timeout: 15000 }).catch(() => {});
  await page.keyboard.up('KeyD');
  const bp = await G(() => __game.state.blockPos);
  check(bp.x === 145, `walking into the block pushes it to the foundation (x=${bp.x})`);
  await sleep(600);
  await settle(page, 40000);
  check(await G(() => __game.world.cell(1, 145, 1, 4) === 1), 'six hundred years on, a pillar stands on it in the Present');

  // Seal and Echo
  await G(() => { const g = __game; g.applyEra(1, true); g.player.place(8.5, 0, 4.5); g.abilities.unlock('seal'); g.abilities.unlock('echo'); });
  await sleep(300);
  check(await G(() => document.body.classList.contains('has-seal') && document.body.classList.contains('has-echo')), 'Seal and Echo unlock');
  await tap('KeyV'); await sleep(150);
  const rec = await G(() => __game.abilities.recording);
  await page.keyboard.down('KeyD'); await sleep(900); await page.keyboard.up('KeyD');
  await tap('KeyV'); await sleep(300);
  const echoes = await G(() => __game.abilities.echoes.length);
  check(rec && echoes === 1, `V records an echo, V again sets it going (${echoes})`);

  // Tempo: a tap still travels, a hold bends time
  await G(() => { const g = __game; g.state.flags.hasTempo = true; g.abilities.syncBody(); });
  await page.keyboard.down('KeyE'); await sleep(600);
  const held = await G(() => [__game.tempoHold, __game.era]);
  await page.keyboard.up('KeyE'); await sleep(400);
  check(held[0] === 1 && held[1] === 1 && (await era()) === 1, 'holding E is Tempo (fast), and travels nowhere');
  await tap('KeyE', 80); await sleep(1700);
  check((await era()) === 2, 'a quick tap of E still travels');
  await tap('KeyQ', 80); await sleep(1700);

  // inside the clock
  await G(() => { const g = __game; g.state.flags.gearworksOpen = true; g.refreshWorld(); return g.enterGearworks(); });
  await sleep(1500);
  await settle(page);
  check(await G(() => __game.gearworks.active), 'into the Gearworks');
  await tap('KeyQ', 80); await sleep(600);
  check((await era()) === 1, 'inside the clock, the ages hold');

  // the ending: credits, the chapter marked finished, its slot kept, Chapter Two open
  await G(() => { __game.save(); });
  check(await G((k) => !!JSON.parse(localStorage.getItem(k)).slots.hollowmere, SAVE), 'saving writes Chapter One\'s slot in the shared save');
  await G(() => { __game.runEnding(); });
  await page.waitForFunction('window.__game.mode === "credits"', { timeout: 90000 });
  await sleep(1500);
  const end = await G((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    const next = document.getElementById('btn-credits-next');
    return { done: s.done.hollowmere, slot: !!s.slots.hollowmere, eyebrow: document.getElementById('credits-eyebrow').textContent, chapter: document.getElementById('credits-chapter').textContent, next: next.hidden ? null : next.textContent, cogs: document.getElementById('stat-cogs').textContent };
  }, SAVE);
  check(end.done && end.slot, 'the ending marks Chapter One finished and keeps its slot');
  check(end.eyebrow === 'The Clocktower ticks again' && /Chapter One/.test(end.chapter) && end.next === 'Begin Chapter Two', `the credits name the chapter and offer the next ("${end.chapter}", ${end.cogs}, "${end.next}")`);
  await page.screenshot({ path: `${process.env.SHOTS || '.'}/credits-hollowmere.png` });
  await page.click('#btn-credits-next');
  await sleep(1500);
  await page.waitForFunction('window.__game && document.body.dataset.chapter');
  const after = await G(() => ({ chapter: document.body.dataset.chapter, cards: [...document.querySelectorAll('.chapter-card')].map((c) => c.className + ' | ' + c.querySelector('.ch-state').textContent) }));
  check(after.chapter === 'saltwick', 'Begin Chapter Two opens the page on Chapter Two');
  check(/done/.test(after.cards[0]) && !/locked/.test(after.cards[1]), `its card is open, and Chapter One's says so (${after.cards.join(' ; ')})`);
  await page.screenshot({ path: `${process.env.SHOTS || '.'}/title-after-one.png` });
  // and back again from the title
  await page.click('.chapter-card:not(.current)');
  await sleep(1500);
  await page.waitForFunction('window.__game && document.body.dataset.chapter');
  check((await G(() => document.body.dataset.chapter)) === 'hollowmere' && (await G(() => !document.getElementById('btn-continue').hidden)), 'the title switches back to Chapter One, and Continue walks the valley after the story');
  check(errors.length === 0, `no errors ${errors.join(' | ').slice(0, 800)}`);
  await browser.close();
}

// saves from before the games were combined
{
  const old = { flags: { hasAmulet: true, hasRewind: true }, inventory: ['watch'], taken: [], cogs: ['c1'], kindness: [], checkpoint: 1, playTime: 99 };
  const { browser, page, errors } = await boot({ storage: { 'chronoheart2-save-v1': old } });
  const got = await page.evaluate((k) => ({ chapter: document.body.dataset.chapter, cont: !document.getElementById('btn-continue').hidden, save: JSON.parse(localStorage.getItem(k) || 'null'), locked: document.querySelectorAll('.chapter-card.locked').length }), SAVE);
  check(got.chapter === 'saltwick' && got.cont && got.locked === 0, 'an old Chapter Two save is brought over: it opens on Chapter Two, unlocked, with Continue');
  await page.click('#btn-continue');
  await page.waitForFunction('window.__game.mode === "play"', { timeout: 20000 });
  const st = await page.evaluate(() => ({ cogs: __game.state.cogs.length, cp: __game.state.checkpoint, rewind: document.body.classList.contains('has-rewind') }));
  check(st.cogs === 1 && st.cp === 1 && st.rewind, 'and continues where it was');
  check(errors.length === 0, `no errors ${errors.join(' | ').slice(0, 800)}`);
  await browser.close();
}
{
  const old = { flags: { hasAmulet: true }, inventory: [], taken: [], cogs: ['a', 'b'], kindness: [], checkpoint: 2, playTime: 50, blockPos: { x: 143, z: 4 }, cratePos: { x: 140, z: 5 }, boulderPos: { x: 0, z: 0 }, sockets: {} };
  const { browser, page, errors } = await boot({ storage: { 'chronoheart-save-v1': old } });
  const got = await page.evaluate(() => ({ chapter: document.body.dataset.chapter, cont: !document.getElementById('btn-continue').hidden, locked: document.querySelectorAll('.chapter-card.locked').length }));
  check(got.chapter === 'hollowmere' && got.cont && got.locked === 1, 'an old Chapter One save is brought over, and Chapter Two stays locked');
  check(errors.length === 0, `no errors ${errors.join(' | ').slice(0, 800)}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
