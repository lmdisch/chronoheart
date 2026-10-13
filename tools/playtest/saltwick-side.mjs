// Favors, cogs, hazards, the Warden, and the world after the story.
import { boot, newGame, sleep, settle } from './lib.mjs';
const { browser, page, errors } = await boot({ chapter: 'saltwick' });
const log = (...a) => console.log(...a);
const st = () => page.evaluate(() => { const g = window.__game, b = g.player.body; return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), era: g.era, mode: g.mode, hp: g.player.hp, maxHp: g.player.maxHp, f: g.state.flags, inv: g.state.inventory, kind: g.state.kindness, cogs: g.state.cogs.length, cp: g.state.checkpoint, prompt: document.getElementById('prompt').classList.contains('visible') ? document.getElementById('prompt-text').textContent : null }; });
const tp = (x, y, z, era) => page.evaluate((x, y, z, era) => { const g = window.__game; if (era !== undefined && era !== g.era) g.applyEra(era, true); g.player.place(x, y, z); g.post.trans = 1; }, x, y, z, era);
const tap = async (c, ms = 60) => { await page.keyboard.down(c); await sleep(ms); await page.keyboard.up(c); await sleep(60); };
const check = async (name, cond) => { if (errors.length) { log('ERRORS', errors.slice(0, 3)); process.exit(1); } const s = await st(); const ok = cond(s); log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify({ x: s.x, y: s.y, z: s.z, era: s.era, mode: s.mode, hp: s.hp, prompt: s.prompt, kind: s.kind, cogs: s.cogs })); return ok; };
const talkAt = async (x, y, z, era) => { await tp(x, y, z, era); await sleep(250); await tap('KeyF'); await sleep(300); await settle(page, 60000); await sleep(250); };

await newGame(page);
// --- favors
await talkAt(17.6, 0, 2.0, 0); // Isha
await check('lamp favor asked', (s) => s.f.lampQuest);
await talkAt(11.6, 0, 2.0, 2); // DIGBY: first meeting
await talkAt(11.6, 0, 2.0, 2); // DIGBY: the lumen cell
await check('lumen cell given', (s) => s.inv.includes('lumen'));
await talkAt(17.6, 0, 2.0, 0);
await check('lamp favor done, lantern hung', (s) => s.kind.includes('lamp') && s.f.lanternShown && s.maxHp === 6);
await talkAt(15.4, 0, 1.6, 1);
await check('lantern prompt gone after reading (no crash)', (s) => s.mode === 'play');
await talkAt(32.6, 0, 4.6, 0); // Pim
await check('whistle favor asked', (s) => s.f.whistleQuest);
await tp(48.5, -1, 3.5, 0); await sleep(2200);
await check('whistle found on the harbor floor', (s) => s.inv.includes('whistle'));
await talkAt(32.6, 0, 4.6, 0);
await check('whistle favor done', (s) => s.kind.includes('whistle') && s.maxHp === 7);
await talkAt(22.6, 0, 1.5, 1); // Zach, up on his crate
await check('hoard favor asked', (s) => s.f.hoardQuest);
await talkAt(107.5, 0, 1.2, 2);
await check('grove seen', (s) => s.f.groveSeen);
await talkAt(22.6, 0, 1.5, 1);
await check('hoard favor done', (s) => s.kind.includes('hoard') && s.maxHp === 8);

// --- hazards cost a heart and put you back; the last heart sends you to the shrine
await tp(39.5, 0, 3.5, 1); await sleep(200);
// (let go as soon as the heart is lost: keep walking and you'd wade straight back in)
await page.keyboard.down('KeyD'); await page.waitForFunction('window.__game.player.hp < 8', { timeout: 6000 }).catch(() => {}); await page.keyboard.up('KeyD'); await sleep(500);
await check('mud costs a heart and puts you back on the bank', (s) => s.hp === 7 && s.x > 38 && s.x < 42 && s.mode === 'play');
await page.evaluate(() => { window.__game.player.hp = 1; window.__game.player.invuln = 0; });
await page.keyboard.down('KeyD'); await sleep(1200); await page.keyboard.up('KeyD'); await sleep(2600);
await check('last heart: back at the shrine, healed', (s) => s.hp === 8 && s.x < 10 && s.mode === 'play');

// --- the Warden catches you in its cone and throws you out
await tp(213.5, 0, 1.0, 2); await sleep(200);
await page.evaluate(() => { const g = window.__game; g.shiftGrace = 0; g.warden.reset(); });
await sleep(6000);
await check('caught by the Warden: thrown out, in the Present', (s) => s.era === 1 && Math.abs(s.x - 200.5) < 1.5 && s.hp === 7);

// --- every cog can be stood next to, once the story's done
const cogs = await page.evaluate(async () => {
  const g = window.__game;
  const { STAGES, check } = await import('/tools/reachability/saltwick.js');
  const { SPAWNS } = await import('/src/chapters/saltwick/level.js');
  const out = {};
  for (const [name, flags] of STAGES.slice(0, 9)) Object.assign(g.state.flags, flags);
  g.refreshWorld(); for (const gt of g.craft.gates) gt.update(0);
  const r = check(g);
  for (const c of SPAWNS.filter((s) => s.type === 'cog')) {
    let ok = false;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = -3; dy <= 0; dy++) ok ||= r.has(c.era, Math.floor(c.x) + dx, Math.floor(c.y) + dy, Math.min(6, Math.max(0, Math.floor(c.z) + dz)));
    out[c.id] = ok;
  }
  return out;
});
delete cogs.cogM4; // (the leap off the jetty: by design you fall after taking it)
log(Object.values(cogs).every(Boolean) ? 'PASS' : 'FAIL', 'all cogs reachable', JSON.stringify(cogs));
// collect them all by walking into them
const spawns = await page.evaluate(async () => (await import('/src/chapters/saltwick/level.js')).SPAWNS.filter((s) => s.type === 'cog').map((c) => [c.x, c.y, c.z, c.era]));
await page.evaluate(() => { window.__game.godMode = true; });
for (const [x, y, z, era] of spawns) { await tp(x, y - 0.5, z, era); await sleep(250); }
await check('twelve cogs collected', (s) => s.cogs === 12);

// --- after the story: save, reload, continue
await page.evaluate(() => { const g = window.__game; Object.assign(g.state.flags, { heartPlaced: true, wellFull: true, floodDone: true, tideRestored: true, finished: true, hasRewind: false }); g.state.inventory = g.state.inventory.filter((i) => i !== 'watch'); g.state.checkpoint = 0; g.save(); });
await page.reload(); await page.waitForFunction('window.__game');
await page.evaluate(() => { window.__auto = setInterval(() => { const g = window.__game; if (g.dialogue.active) g.dialogue.clicked = true; if (g.lapse) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); } }, 60); });
await sleep(800);
await page.click('#btn-continue');
await sleep(1500);
const world = await page.evaluate(() => { const g = window.__game, w = g.world; return { harbor: w.cell(1, 48, -1, 5), harborF: w.cell(2, 48, -1, 5), chan: w.cell(1, 186, -1, 3), jetty: w.cell(1, 180, -1, 3), boat: w.cell(1, 44, -1, 2), well: w.cell(1, 295, 5, 3), mode: g.mode, hud: document.body.classList.contains('tide-in') }; });
log(world.harbor === 2 && world.harborF === 2 && world.chan === 2 && world.jetty === 1 && world.boat === 1 && world.well === 2 && world.hud ? 'PASS' : 'FAIL', 'the sea is back in every age after it', JSON.stringify(world));
await sleep(3000); await settle(page, 60000); await sleep(500);
await check('Donald Eugene builds the watch: Rewind for good', (s) => s.f.ownWatch && s.f.hasRewind && s.inv.includes('myWatch'));

// swim the harbor in the Present now
// (without the harbor's rats: this is about the water)
await page.evaluate(() => { for (const e of window.__game.enemies) e.remove(); });
await tp(41.4, 0, 3.5, 1); await sleep(300);
await page.keyboard.down('Space'); await page.keyboard.down('KeyD'); await sleep(7000); await page.keyboard.up('KeyD'); await page.keyboard.up('Space'); await sleep(400);
await check('swam the Present harbor', (s) => s.x > 56 && s.y >= -0.05 && s.hp === 8);
log('errors:', errors.slice(0, 8));
await browser.close();
