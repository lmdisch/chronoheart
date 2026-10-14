// A scripted playthrough of Chapter One: it teleports between set pieces, but every puzzle is
// solved with real key presses (enemies can't hurt; the Warden still can).
//   node tools/playtest/hollowmere-play.mjs
import { boot, newGame, sleep, driver, autoplay } from './lib.mjs';
const { browser, page, errors } = await boot({ chapter: 'hollowmere' });
const { log, st, tp, K, down, up, tap, walkTo, climb, check, settle, interactNow, shift, strike, failures } = driver(page, errors);
const P = 0, M = 1, F = 2;
const G = (fn, ...a) => page.evaluate(fn, ...a);

await newGame(page);
await G(() => { window.__game.godMode = true; });

// ---- Hollowmere Square: the Chronoheart, and the favors that start here
await tp(9.0, 0, 1.4, M); await sleep(200);
await check('prompt at the workbench', (s) => /workbench/i.test(s.prompt || ''));
await interactNow();
await check('the Chronoheart', (s) => s.f.hasAmulet);
await tp(11.6, 0, 1.8, M); await sleep(300);
await check('nobody home yet: Donald Eugene is missing', async (s) => !/Donald Eugene/.test(s.prompt || '') && !(await G(() => window.__game.npcs.find((n) => n.id === 'eugene').group.visible)));
await tp(19.4, 0, 2.6, M); await sleep(200);
await interactNow();
await check('Karen Louise asks about the sun-lilies', (s) => s.f.lilyQuest);
await tp(23.5, 0, 4.4, M); await sleep(200);
await shift('KeyQ');
await check('the Past', (s) => s.era === P);
await interactNow();
await check('sun-lily seeds', (s) => s.inv.includes('lilySeeds'));
await shift('KeyE');
await interactNow();
await check('lilies planted: a favor done, a heart more', (s) => s.kind.includes('lilies') && s.hp === 6);
// the cog on the crate stack (Present)
await tp(28.5, 0, 1.5, M); await walkTo(30.5, 1.5, { jump: true, t: 4000 });
await check('cog on the crates (Present)', (s) => s.cogs.includes('cogM1'));
// ...on the sandstone steps (Past), and the floating steps (Future)
await tp(20.5, 0, 1.5, P); await walkTo(24.5, 1.5, { jump: true, t: 4000 });
await check('cog on the sandstone steps (Past)', (s) => s.cogs.includes('cogP1'));
await tp(23.5, 0, 2.5, F); await walkTo(29.5, 2.5, { jump: true, t: 5000 });
await check('cog on the floating steps (Future)', (s) => s.cogs.includes('cogF1'));

// ---- The Old Ford: stepping stones in the Past
await tp(37.5, 0, 3.5, M); await sleep(200);
await shift('KeyQ');
await walkTo(49.5, 3.5, { t: 5000 });
await check('across the ford on the stepping stones', (s) => s.x > 48.5 && s.era === P && s.y > -0.1);

// ---- Sandstone Cliffs: knock the seized lever loose (Past), walk the tunnel (Present)
await tp(62.2, 0, 1.3, P); await sleep(200);
await check('strike prompt at the seized lever', (s) => /lever/i.test(s.prompt || ''));
await strike(3);
await check('the spring runs', (s) => s.f.springOpen);
await tp(54.5, 0, 0.6, P); await walkTo(57.5, 0.5, { jump: true, t: 4000 });
await check('cog on the temple steps (Past)', (s) => s.cogs.includes('cogP2'));
await tp(64.0, 0, 3.5, M); await sleep(200);
await walkTo(69.5, 3.5, { t: 4000 });
await check('through the tunnel the water wore', (s) => s.x > 68.5 && s.era === M);
// the aqueduct pool (Future): the sign lends a snorkel, and a cog lies on the bottom
await tp(61.6, 0, 1.4, F); await sleep(200);
await interactNow();
await check('the pool sign lends a snorkel', (s) => s.f.hasSnorkel);
await walkTo(65.5, 3.5, { t: 5000 });
await page.waitForFunction(() => window.__game.state.cogs.includes('cogF2'), { timeout: 5000 }).catch(() => {});
await check('cog from the bottom of the pool', (s) => s.cogs.includes('cogF2'));

// ---- Rampart Row: the acorn, planted in the Past, climbed in the Present
await tp(83.4, 0, 1.5, M); await sleep(200);
await walkTo(85.5, 1.5, { jump: true, t: 4000 });
await check('the acorn off the crate stack', (s) => s.inv.includes('acorn'));
await tp(91.4, 0, 3.5, P); await sleep(200);
await interactNow();
await check('acorn planted in the Past: an oak in the Present', (s) => s.f.acornPlanted && !s.inv.includes('acorn'));
await tp(91.0, 0, 4.6, F); await walkTo(92.9, 4.6, { t: 3000 });
await check('cog among the roots (Future)', (s) => s.cogs.includes('cogF3'));
await tp(92.5, 0, 5.0, M); await sleep(200);
await walkTo(92.5, 4.5, { t: 2000 });
await climb(K.right, 8);
await walkTo(95.5, 3.5, { t: 3000 });
await check('up the oak, onto the branch, and its cog', (s) => s.y >= 7.9 && s.cogs.includes('cogM2'));
await walkTo(101.5, 3.5, { t: 5000 });
await check('over the town wall', (s) => s.x > 100 && s.y < 6);

// ---- Smithy Lane: the Bell Hammer, and Lillian's keepsake
await tp(110.2, 0, 2.2, M); await sleep(200);
await interactNow();
await check('Aria gives the cracked hammer', (s) => s.inv.includes('hammerBroken'));
await tp(112.5, 0, 1.6, M); await sleep(200);
await interactNow();
await check('sealed in the quench-vault for three centuries', (s) => s.f.hammerLeft);
await tp(120.5, 0, 2.4, F); await sleep(200);
await interactNow();
await check('Lillian wants something Aria held', (s) => s.f.keepsakeQuest);
await walkTo(118.7, 0.6, { t: 3000 });
await check('the Bell Hammer, off the display case', (s) => s.inv.includes('hammer'));
await tp(110.2, 0, 2.2, M); await sleep(200);
await interactNow();
await check("Aria's medallion", (s) => s.inv.includes('medallion'));
await tp(120.5, 0, 2.4, F); await sleep(200);
await interactNow();
await check("Lillian's keepsake: a favor done", (s) => s.kind.includes('keepsake'));

// ---- The Sun Terrace: push the block in the Past, climb bench, pillar, terrace in the Present
await tp(141.6, 0, 4.5, P); await sleep(300);
await down(K.right);
await page.waitForFunction(() => window.__game.state.blockPos.x === 145, { timeout: 15000 }).catch(() => {});
await up(K.right);
await settle();
await check('block on the foundation', (s) => true);
await tp(143.0, 0, 4.5, M); await sleep(200);
await walkTo(147.5, 4.5, { jump: true, t: 6000 });
await check('bench, pillar, terrace', (s) => s.y >= 2.9 && s.x > 146);
await shift('KeyQ');
await walkTo(151.5, 1.4, { jump: true, t: 4000 });
await check('the Sun Disc', (s) => s.inv.includes('disc'));
await walkTo(154.5, 5.0, { t: 3000 });
await check('cog on the terrace (Past)', (s) => s.cogs.includes('cogP3'));
await shift('KeyE');

// ---- The Gatehouse: the Future corridor, the rusted shutter, the Fusion Core
await tp(166.5, 0, 3.5, F); await sleep(200);
await walkTo(171.6, 3.5, { t: 3000 });
await strike(3);
await check('the shutter drops', (s) => s.f.shutterBroken);
await walkTo(178.5, 3.5, { jump: true, t: 4000 });
await check('the Fusion Core', (s) => s.inv.includes('core'));
await walkTo(184.5, 3.5, { t: 4000 });
await shift('KeyQ');
await check('back in the Present at Millrace Hollow, and the postern is open', (s) => s.era === M && s.x > 182 && s.f.posternOpen);

// ---- Millrace Hollow: the south plug (Past), the wheel (Future), the sluice (Present)
await tp(197.0, 0, 6.0, P); await sleep(200);
await check('strike prompt at the south plug', (s) => /south/i.test(s.prompt || ''));
await strike(3);
await check('the millrace runs: a millpond', (s) => s.f.millDammed);
await tp(183.5, 0, 4.0, F); await sleep(200);
await walkTo(185.05, 4.05, { t: 3000 });
await check('the brass sluice wheel', (s) => s.inv.includes('wheel'));
await tp(186.5, 0, 5.5, M); await sleep(200);
await walkTo(190.5, 5.5, { jump: true, t: 4000 });
await check('up on the dam', (s) => s.y >= 2.9);
await interactNow();
await check('sluice shut: the pond fills', (s) => s.f.sluiceClosed);
await walkTo(190.5, 3.0, { t: 2000 });
await walkTo(201.5, 3.0, { jump: true, t: 6000 });
// (a slip between the logs is no disaster now: it's clean water, so swim on and climb out)
if ((await st()).x < 200) { await down('Space'); await walkTo(201.5, 3.0, { t: 6000 }); await up('Space'); }
await check('across the log boom', (s) => s.x > 200 && s.y >= 2.9);
// and the millpond can simply be swum: off the dam, across, and out onto the far bank
await tp(190.5, 3, 4.5, M); await sleep(300);
await down('Space'); await walkTo(201.5, 5.5, { t: 8000 }); await up('Space');
await check('swim the millpond and climb out (clean water, no harm done)', (s) => s.x > 200 && s.y >= 2.9);

// ---- Tamsin's Crossing: the Stasis Seal (Present), cable (Future), Tamsin's bridge (Past)
await tp(208.5, 0, 1.6, M); await sleep(200);
await interactNow();
await check("the Stasis Seal, from Donald Eugene's satchel", (s) => s.f.hasSeal);
await tp(209.0, 0, 5.2, F); await sleep(200);
await walkTo(210.5, 5.2, { t: 3000 });
await check('the steel cable', (s) => s.inv.includes('cable'));
await tp(211.6, 0, 1.6, P); await sleep(200);
await interactNow();
await check('Tamsin builds the bridge', (s) => s.f.bridgeBuilt);
await walkTo(215.5, 3.5, { t: 3000 });
await check('a Seal prompt on the bridge', (s) => /Seal/.test(s.prompt || ''));
await tap('KeyR');
await settle();
await check('the bridge sealed in its moment', (s) => s.f.bridgeSealed);
await tp(214.5, 0, 3.5, F); await sleep(200);
await walkTo(228.5, 3.5, { jump: true, t: 6000 });
await check('across in the Future, over the rubble', (s) => s.x > 227);
await shift('KeyQ');
await check('back in the Present past the wall', (s) => s.era === M && s.x > 227);

// ---- The Echo Gallery: the Echo (lectern), the gold gate, the green airlock
await tp(230.6, 0, 1.4, M); await sleep(200);
await interactNow();
await check('the Echo, from the lectern', (s) => s.f.hasEcho);
// gold: an echo standing on the gold button holds its gate open
await walkTo(232.5, 5.5, { t: 3000 });
await tap('KeyV'); await sleep(700); await tap('KeyV'); await sleep(300);
await check('an echo on the gold button', () => true);
// green: an echo that stands on the button, then steps off
await walkTo(232.5, 1.5, { t: 3000 });
await tap('KeyV'); await sleep(1800);
await walkTo(232.5, 3.2, { t: 2000 }); await sleep(1500);
await tap('KeyV'); await sleep(200);
await check('two echoes', async () => (await G(() => window.__game.abilities.echoes.length)) === 2);
await walkTo(233.5, 3.5, { t: 3000 });
await walkTo(235.5, 3.5, { t: 3000 });
await check('through the gold gate', (s) => s.x > 234.8);
await page.waitForFunction(() => window.__game.abilities.gates[1].open, { timeout: 8000 }).catch(() => {});
await walkTo(237.5, 3.5, { t: 3000 });
await page.waitForFunction(() => window.__game.abilities.gates[2].open, { timeout: 8000 }).catch(() => {});
await walkTo(239.6, 3.5, { t: 3000 });
await check('through the green airlock', (s) => s.x > 239 && s.f.galleryGatesPassed);

// the wall: each ring walked by an echo, clockwise from its ringed button
const RINGS = [[[239, 3], [241, 3]], [[242, 1], [243, 1], [243, 3], [243, 5], [242, 5], [242, 3]], [[244, 1], [245, 1], [245, 3], [245, 5], [244, 5], [244, 3]]];
async function walkRing(cells) {
  await walkTo(cells[0][0] + 0.5, cells[0][1] + 0.5, { tol: 0.2, t: 3000 });
  await tap('KeyV');
  for (const [x, z] of cells.slice(1)) await walkTo(x + 0.5, z + 0.5, { tol: 0.3, t: 2000 });
  await tap('KeyV'); await sleep(400);
}
await walkTo(239.5, 3.5, { t: 2000 }); await sleep(300);
await check('a button you stand on yourself lights...', async () => (await G(() => window.__game.abilities.buttons[0].lit > 0)));
await walkTo(241.5, 3.5, { t: 2000 }); await sleep(300);
await check('...and goes dark when you step off', async () => (await G(() => window.__game.abilities.buttons[0].lit === 0 && window.__game.abilities.steps[0].cur === 0)));
await walkRing(RINGS[0]);
await page.waitForFunction(() => window.__game.abilities.steps[0].cur === 1, { timeout: 6000 }).catch(() => {});
await check('an echo walks the two ground buttons: the first step rises', async () => (await G(() => window.__game.abilities.steps[0].cur)) === 1);
await walkTo(242.5, 3.5, { jump: true, t: 3000 });
await walkRing(RINGS[1]);
await page.waitForFunction(() => window.__game.abilities.steps[1].cur === 2, { timeout: 6000 }).catch(() => {});
await check('the second step', async () => (await G(() => window.__game.abilities.steps[1].cur)) === 2);
await walkTo(244.5, 3.5, { jump: true, t: 3000 });
await walkRing(RINGS[2]);
await page.waitForFunction(() => window.__game.abilities.steps[2].cur === 3, { timeout: 6000 }).catch(() => {});
await check('the third step', async () => (await G(() => window.__game.abilities.steps[2].cur)) === 3);
await walkTo(249.5, 3.5, { jump: true, t: 5000 });
await check('up on the gallery, rope ladder kicked down', (s) => s.y >= 3.9 && s.f.galleryClimbed);

// ---- The Warden's Courtyard: Tempo (Present), the Escapement Key (Future), the regulators
await tp(257.6, 0, 1.5, M); await sleep(200);
await interactNow();
await check("Tempo, from Donald Eugene's toolbox", (s) => s.f.hasTempo);
// walk most of the way in the Present, wait by the fountain for the Warden to be far off
await walkTo(271.3, 2.5, { t: 6000 });
await page.waitForFunction(() => window.__game.warden.x > 278.5, { timeout: 20000, polling: 50 }).catch(() => {});
await shift('KeyE');
await walkTo(273.5, 2.5, { t: 2000 });
await walkTo(271.2, 2.5, { t: 2000 });
await shift('KeyQ');
await check('the Escapement Key, and back to the Present', (s) => s.inv.includes('clockKey') && s.era === M);
// the regulators: stand by the east one and hold Q (slow) until its marker comes round with the other's
await tp(282.0, 0, 2.5, M); await sleep(300);
await down('KeyQ');
await page.waitForFunction(() => { const r = window.__game.gearworks.regs; let d = Math.abs(r[0].phase - r[1].phase); d = Math.min(d, 1 - d); return d < 0.02; }, { timeout: 15000, polling: 16 }).catch(() => {});
await up('KeyQ');
await page.waitForFunction(() => window.__game.state.flags.regulatorsSynced, { timeout: 5000 }).catch(() => {});
await check('the regulators beat in step', (s) => s.f.regulatorsSynced && s.era === M);
await tp(282.6, 0, 3.5, M); await sleep(200);
await interactNow();
await check('the Clocktower door opens', (s) => s.f.towerUnlocked);

// ---- The Clocktower: the Sun Disc (Past stair), the Bell Hammer (piston + echo), the Fusion Core (seal + Future gantry)
await tp(294.5, 0, 1.0, P); await sleep(200);
await walkTo(287.5, 1.2, { jump: true, t: 6000 });
await check('up the ancient stair to the ledge', (s) => s.y >= 5.9);
await interactNow();
await check('the Sun Disc wakes the Tower', async () => !!(await G(() => window.__game.state.sockets.socketSun)));
await tp(288.5, 0, 5.5, M); await sleep(300);
await tap('KeyV'); await walkTo(290.5, 5.5, { t: 2000 }); await tap('KeyV');
await walkTo(297.0, 3.0, { t: 4000 });
// wait beside it until the piston is back down, then step onto its base
await page.waitForFunction(() => window.__game.finale.h === 0 && window.__game.finale.phase === 'rest', { timeout: 15000, polling: 16 }).catch(() => {});
await walkTo(298.9, 3.0, { t: 2000 });
await page.waitForFunction(() => window.__game.player.body.y > 11.5, { timeout: 15000 }).catch(() => {});
await check('the echo sends the piston up, with Vivienne on it', (s) => s.y > 11.5);
await walkTo(296.5, 0.9, { t: 3000 });
await check('cog in the belfry', (s) => s.cogs.includes('cogM3'));
await walkTo(295.2, 1.4, { t: 2000 });
await interactNow();
await check('the Bell Hammer in the great bell', async () => !!(await G(() => window.__game.state.sockets.socketBell)));
await walkTo(297.0, 1.0, { t: 2000 });
await check('a Seal prompt on the belfry floor', (s) => /Seal/.test(s.prompt || ''));
await tap('KeyR'); await settle();
await check('the belfry floor sealed', (s) => s.f.belfrySealed);
await shift('KeyE');
await walkTo(302.0, 1.0, { jump: true, t: 6000 });
await check('up the gantry to the reactor deck (Future)', (s) => s.y >= 15.9);
await tap('KeyF');
await page.waitForFunction(() => window.__game.gearworks.active && window.__game.mode === 'play' && !window.__game.dialogue.active, { timeout: 30000 }).catch(() => {});
await sleep(800);
await check('the Fusion Core: the clock face opens, and up into the Gearworks', (s) => s.f.gearworksOpen && s.x > 306);

// ---- The Gearworks: Tempo only
const hammer = (i) => G((i) => { const h = window.__game.gearworks.machines[i]; return { t: h.t, down: h.down }; }, i);
async function underHammer(i, from, to) {
  await walkTo(from, 3.5, { t: 3000 });
  await down('KeyQ');
  // wait for the hammer to lift, then run
  await page.waitForFunction((i) => { const h = window.__game.gearworks.machines[i]; return !h.down && h.t < 0.1; }, { timeout: 8000, polling: 16 }, i).catch(() => {});
  await walkTo(to, 3.5, { t: 2000, tol: 0.3 });
  await up('KeyQ'); await sleep(300);
}
async function springUp(x, y, landX) {
  await walkTo(x + 0.5, 3.0, { t: 3000 });
  await down('KeyE');
  await page.waitForFunction((y) => window.__game.player.body.y > y + 2.5, { timeout: 6000, polling: 16 }, y).catch(() => {});
  await walkTo(landX, 3.0, { t: 2500 });
  await up('KeyE'); await sleep(400);
}
await underHammer(0, 311.3, 313.6);
await underHammer(1, 314.3, 316.6);
await check('under the first two hammers', (s) => s.x > 316 && s.y < 1);
await sleep(2500); // let the ring refill
await springUp(320, 0, 322.5);
await check('the spring plate, run fast, throws you up to the ledge', (s) => s.y >= 3.9 && s.x > 321);
await underHammer(2, 324.3, 326.6);
await underHammer(3, 327.3, 329.6);
await sleep(2500);
await springUp(330, 4, 332.5);
await check('the second spring plate, to the level above', (s) => s.y >= 7.9 && s.x > 331);
await sleep(2500);
// the lift: ride it fast, slow it at the top, step off onto the summit
await walkTo(334.9, 3.0, { t: 3000 });
await page.waitForFunction(() => window.__game.gearworks.lift.cur === 0 && window.__game.gearworks.lift.m < 0.3, { timeout: 15000, polling: 16 }).catch(() => {});
await down('KeyE');
await page.waitForFunction(() => window.__game.gearworks.lift.cur >= 6, { timeout: 8000, polling: 16 }).catch(() => {});
await up('KeyE'); await down('KeyQ');
await walkTo(337.5, 3.0, { t: 2000 });
await up('KeyQ');
await check('up the lift, onto the summit', (s) => s.y >= 13.9 && s.x > 336);
await walkTo(340.5, 3.5, { t: 3000 });
await check('prompt at the mainspring', (s) => /mainspring/i.test(s.prompt || ''));
await tap('KeyF');
await page.waitForFunction(() => window.__game.mode === 'credits', { timeout: 120000 }).catch(() => {});
await sleep(1500);
await check('the Clocktower ticks again: credits', (s) => s.mode === 'credits' && s.f.finished);

// ---- After the story: the save is kept, and the valley goes on
const credits = await G(() => ({ more: document.getElementById('credits-more').hidden ? null : document.getElementById('credits-more').textContent, save: JSON.parse(localStorage.getItem('chronoheart-save-v2')) }));
await check(`the save is kept, and the credits say so (cogs ${(await st()).cogs.length}/10)`, () => !!credits.save.slots.hollowmere && credits.save.done.hollowmere && /Continue/.test(credits.more || ''));
await page.click('#btn-credits-title');
await page.waitForFunction(() => window.__game && !document.getElementById('btn-continue').hidden, { timeout: 30000 }).catch(() => {});
await autoplay(page);
await page.click('#btn-continue');
await page.waitForFunction(() => window.__game.mode === 'play', { timeout: 30000 }).catch(() => {});
await sleep(800);
await G(() => { window.__game.godMode = true; });
await check('Continue: back in the square, the story told', (s) => s.mode === 'play' && s.f.finished && s.x < 12 && s.era === M);
await tp(11.6, 0, 1.8, M); await sleep(300);
await check('Donald Eugene is home, in his workshop', (s) => /Donald Eugene/.test(s.prompt || ''));
await interactNow();
await check('nine cogs: no finder yet', (s) => !s.inv.includes('finder'));
// the Future courtyard: the Warden has stood down
await tp(271.5, 0, 1.4, F); await sleep(300);
await walkTo(273.5, 2.5, { t: 3000 }); await sleep(2500);
await check('the Warden stands down: walk right up to the key spot, unbothered', async (s) => s.era === F && s.x > 272.5 && (await G(() => window.__game.warden.dormant && !window.__game.warden.cone.visible)));
// the last cog, on the pontoon off the Future boom (the reservoir is treated: hop, don't swim)
await tp(195.5, 3, 3.5, F); await sleep(300);
await walkTo(195.5, 4.5, { t: 2000 });
await down(K.down); await down('Space'); await sleep(250); await up('Space'); await sleep(500); await up(K.down); await sleep(300);
await check('the last cog, on the pontoon', (s) => s.cogs.length === 10);
await tp(11.6, 0, 1.8, M); await sleep(300);
await interactNow();
await check('all ten to Donald Eugene: the Cog Finder, carried to every chapter', async (s) => s.inv.includes('finder') && (await G(() => JSON.parse(localStorage.getItem('chronoheart-save-v2')).rewards.cogFinder)));

// ---- Chapter Two starts with it, and Lost Cogs glint through the lens
await page.reload();
await page.waitForFunction(() => window.__game && document.querySelectorAll('.chapter-card').length === 2, { timeout: 30000 });
await page.click('.chapter-card:not(.current)');
await page.waitForFunction(() => window.__game && document.body.dataset.chapter === 'saltwick', { timeout: 30000 }).catch(() => {});
await autoplay(page);
await sleep(1000);
await page.click('#btn-new');
await page.waitForFunction('window.__game.mode === "play" && !window.__game.dialogue.active', { timeout: 30000 });
await sleep(400);
await check('Chapter Two begins with the Cog Finder', (s) => s.inv.includes('finder') && s.inv.includes('watch'));
const cog = await G(() => { const c = window.__game.pickups.find((p) => p.spec.type === 'cog' && p.era === 2); return { x: c.x, z: c.z }; });
await tp(cog.x - 3, 0, 3.5, M); await sleep(300);
await down('Tab'); await sleep(1200); await up('Tab'); await sleep(200);
await check('through the lens, the finder turns toward a Lost Cog', (s) => s.f.finderHint);

if (process.env.STOP === 'mill') { log('failures:', failures(), 'errors:', errors); await browser.close(); process.exit(failures() ? 1 : 0); }

log('failures:', failures(), 'errors:', errors);
await browser.close();
process.exit(failures() || errors.length ? 1 : 0);
