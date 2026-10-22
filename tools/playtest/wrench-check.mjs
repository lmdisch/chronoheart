// The wrench and what fits on it (src/kit.js), Donald Eugene's locks (src/ui/lockpick.js), and
// Chapter Two's Reach through the lens: parts learned only when found (a replay starts without
// them), carried into later chapters, swapped with T; a held creature stays held until struck, and
// shatters; the Escapement slows; the Hairspring sends back; a person struck out of a hold says so;
// a lock you walk away from stays locked; a Lost Cog and a person, reached through the lens.
import { boot, newGame, sleep, settle } from './lib.mjs';
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++; };
// (held until it's charged: on a slow machine the game's clock runs behind the wall clock)
const wave = async (page) => { await page.keyboard.down('KeyX'); await page.waitForFunction(() => __game.kit.charged, { timeout: 5000 }).catch(() => {}); await page.keyboard.up('KeyX'); await sleep(1100); }; // (out, across, and landed)

// ---- Chapter One, replayed after finishing it: no Stasis ring until the strongbox is opened again
{
  const save = { v: 2, slots: {}, done: { hollowmere: true }, rewards: { 'power:seal': true }, unlocked: true, last: 'hollowmere' };
  const { browser, page, errors } = await boot({ chapter: 'hollowmere', storage: { 'chronoheart-save-v2': save, 'chronoheart-chapter': 'hollowmere' } });
  const G = (fn, ...a) => page.evaluate(fn, ...a);
  await newGame(page);
  await settle(page, 60000).catch(() => {});
  let s = await G(() => ({ ready: __game.kit.waveReady, parts: __game.kit.parts().map((p) => p.id), chip: document.getElementById('wrench-chip').hidden, pick: __game.state.inventory.includes('lockpick') }));
  check(!s.ready && s.parts.join() === 'plain' && s.chip, `a replay of Chapter One starts with a plain wrench (${JSON.stringify(s)})`);
  check(s.pick, 'she has her lock pick from the start');
  // the strongbox: walk away from the lock, and it stays locked
  await G(() => { const g = __game; g.state.flags.hasAmulet = true; g.applyEra(1, true); g.player.place(208.5, 0, 1.6); });
  await sleep(300);
  await G(() => { const g = __game; g.use(g.interactables.find((i) => i.id === 'satchel')); });
  await page.waitForFunction(() => !document.getElementById('lockpick').hidden, { timeout: 20000 });
  await G(() => clearInterval(window.__autoPick));
  await page.keyboard.press('Escape');
  await settle(page, 20000).catch(() => {});
  s = await G(() => ({ open: !!__game.state.flags.satchelOpen, seal: !!__game.state.flags.hasSeal, paused: __game.mode }));
  check(!s.open && !s.seal && s.paused === 'play', `left for now: still locked, and Esc didn't pause (${JSON.stringify(s)})`);
  // ...and picked
  const { autoplay } = await import('./lib.mjs');
  await autoplay(page);
  await G(() => { const g = __game; g.use(g.interactables.find((i) => i.id === 'satchel')); });
  await page.waitForFunction(() => __game.state.flags.hasSeal, { timeout: 30000 }).catch(() => {});
  await settle(page, 20000).catch(() => {});
  s = await G(() => ({ open: !!__game.state.flags.satchelOpen, ready: __game.kit.waveReady, wrench: __game.kit.wrench }));
  check(s.open && s.ready && s.wrench === 'seal', `picked: the Stasis ring, straight onto the wrench (${JSON.stringify(s)})`);
  // a rat, held by a wave: still held long after; struck, it shatters, and stays gone
  const rat = await G(() => { const g = __game, e = g.enemies.find((q) => q.era === g.era && q.alive && q.spec.kind === 'rat') || g.enemies.find((q) => q.era === g.era && q.alive); g.player.place(e.body.x - 2, e.body.y, e.body.z); g.player.facing = 1; window.__rat = e; return { kind: e.spec.kind, x: e.body.x }; });
  await sleep(100);
  await G(() => { const e = window.__rat; e.update = () => {}; }); // (hold still for the test)
  await wave(page);
  s = await G(() => ({ frozen: (__game.state.frozen || []).length, alive: window.__rat.alive }));
  check(s.frozen === 1 && !s.alive, `the ${rat.kind}, held in its moment (${JSON.stringify(s)})`);
  await sleep(2500);
  await G(() => { const g = __game, r = g.state.frozen[0]; g.player.place(r.x - 0.9, r.y, r.z); g.player.facing = 1; });
  await sleep(200);
  await page.keyboard.press('KeyX');
  await sleep(500);
  s = await G(() => ({ shattered: __game.state.frozen[0].shattered, statues: __game.entities.filter((e) => e.rec).length }));
  check(s.shattered && s.statues === 0, `struck: it shatters, in every age (${JSON.stringify(s)})`);
  await G(() => __game.refreshWorld());
  await sleep(300);
  s = await G(() => __game.entities.filter((e) => e.rec).length);
  check(s === 0, 'and it stays shattered');
  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}

// ---- Chapter Two, after Chapter One: the Stasis ring and the Escapement came along
{
  const save = { v: 2, slots: {}, done: { hollowmere: true }, rewards: {}, unlocked: true, last: 'saltwick' };
  const { browser, page, errors } = await boot({ chapter: 'saltwick', storage: { 'chronoheart-save-v2': save, 'chronoheart-chapter': 'saltwick' } });
  const G = (fn, ...a) => page.evaluate(fn, ...a);
  await newGame(page);
  await settle(page, 60000).catch(() => {});
  let s = await G(() => ({ parts: __game.kit.parts().map((p) => p.id), wrench: __game.kit.wrench, chip: !document.getElementById('wrench-chip').hidden }));
  check(s.parts.join() === 'plain,seal,tempo' && s.wrench === 'seal' && s.chip, `Chapter Two: the ring and the escape wheel came along (${JSON.stringify(s)})`);
  await page.keyboard.press('KeyT');
  await sleep(200);
  s = await G(() => ({ wrench: __game.kit.wrench, chip: document.querySelector('#wrench-chip .wc-name').textContent }));
  check(s.wrench === 'tempo' && s.chip === 'Escapement', `T: the Escapement (${JSON.stringify(s)})`);
  // a crab in the Past, slowed
  await G(() => { const g = __game; g.applyEra(0, true); const c = g.enemies.find((e) => e.era === 0 && e.alive); c.hp = 99; c.go = c.update; c.update = () => {}; g.player.place(c.body.x - 2.2, 0, c.body.z); g.player.facing = 1; window.__crab = c; }); // (held still for the test; the swing that starts the charge may land first)
  await sleep(200);
  await wave(page);
  s = await G(() => ({ slow: window.__crab.slowT, alive: window.__crab.alive, x: window.__crab.body.x, px: __game.player.body.x, wrench: __game.kit.wrench, mode: __game.mode }));
  check(s.slow > 5, `a crab, slowed to a crawl (${JSON.stringify(s)})`);
  await G(() => { const c = window.__crab; c.update = c.go; });
  // the Hairspring (Rewind learned): back where it was
  await G(() => { const g = __game; g.state.flags.hasRewind = true; g.kit.equip('rewind', true); });
  const moved = await G(async () => {
    const c = window.__crab, g = __game;
    c.slowT = 0;
    c.hp = 99; // (the swing that starts the charge lands first)
    g.player.place(c.body.x - 2.2, 0, c.body.z);
    g.player.facing = 1;
    c.trail = [{ x: c.body.x + 1.5, y: c.body.y, z: c.body.z }]; // (where it was, a few seconds ago)
    c.remember = () => {};
    return { was: c.trail[0].x, now: c.body.x };
  });
  await wave(page);
  s = await G(() => window.__crab.body.x);
  check(Math.abs(s - moved.was) < 0.4, `the Hairspring sends it back to where it was (${JSON.stringify(moved)} -> ${s?.toFixed?.(2)})`);
  // a person held, then struck out of it
  await G(() => { const g = __game; g.kit.equip('seal', true); g.applyEra(1, true); g.player.place(15.6, 0, 1.6); g.player.facing = 1; });
  await sleep(300);
  await wave(page);
  s = await G(() => __game.npcs.find((n) => n.id === 'brannoch').stasisT);
  check(s > 3, `Brannoch, held (${s?.toFixed?.(1)}s)`);
  await G(() => { const g = __game, n = g.npcs.find((q) => q.id === 'brannoch'); g.player.place(n.x - 0.9, 0, n.z); g.player.facing = 1; });
  await page.keyboard.press('KeyX');
  await sleep(500);
  s = await G(() => ({ held: __game.npcs.find((n) => n.id === 'brannoch').stasisT, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | ') }));
  check(!(s.held > 0) && /Brannoch/.test(s.toast), `struck out of it, and he says so (${s.toast.slice(-80)})`);
  // Reach: a Lost Cog, and a person, through the lens
  // (a Past cog, brought to where she stands on the quay in the Present, so the level's shape doesn't matter)
  const cog = await G(() => {
    const g = __game;
    g.state.flags.hasReach = true;
    g.applyEra(1, true);
    g.player.place(12.5, 0, 2.5);
    g.post.trans = 1;
    g.lensPref = 0;
    const c = g.pickups.find((p) => p.spec.type === 'cog' && p.era === 0 && p.available());
    Object.assign(c, { x: 12.5, y: 0.6, z: 2.5 });
    return c.id;
  });
  await sleep(300);
  let before = await G((id) => __game.state.cogs.includes(id), cog);
  await page.keyboard.down('Tab');
  await sleep(150);
  await page.keyboard.press('KeyQ');
  await sleep(600);
  await page.keyboard.up('Tab');
  s = await G((id) => __game.state.cogs.includes(id), cog);
  check(!before && s, `a Lost Cog in the Past, picked up through the lens (${cog})`);
  const npc = await G(() => { const g = __game, n = g.npcs.find((q) => q.era === 0 && q.present() && !q.spec.memory); return n && { id: n.id, x: n.x, z: n.z }; });
  await G((n) => { const g = __game; g.applyEra(1, true); g.player.place(n.x - 0.8, 0, n.z); g.post.trans = 1; g.lensPref = 0; }, npc);
  await page.keyboard.down('Tab');
  await sleep(150);
  await page.keyboard.press('KeyQ');
  await sleep(500);
  s = await G(() => document.getElementById('prompt-text').textContent);
  await page.keyboard.press('KeyF');
  await sleep(400);
  const talked = await G(() => __game.dialogue.active);
  await page.keyboard.up('Tab');
  check(/Reach through: Talk to/.test(s) && talked, `talking to ${npc.id} in the Past, through the lens (${s})`);
  await settle(page, 30000).catch(() => {});
  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
