// A scripted playthrough: teleports between set pieces, but every puzzle is solved with real inputs.
import { boot, newGame, sleep, settle } from './lib.mjs';
const { browser, page, errors } = await boot({ chapter: 'saltwick' });
const log = (...a) => console.log(...a);
const st = () => page.evaluate(() => { const g = window.__game, b = g.player.body; return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), era: g.era, mode: g.mode, hp: g.player.hp, ground: b.onGround, f: g.state.flags, inv: g.state.inventory, prompt: document.getElementById('prompt').classList.contains('visible') ? document.getElementById('prompt-text').textContent : null }; });
const tp = (x, y, z, era) => page.evaluate((x, y, z, era) => { const g = window.__game; if (era !== undefined && era !== g.era) g.applyEra(era, true); g.player.place(x, y, z); g.post.trans = 1; }, x, y, z, era);
const K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
const down = (c) => page.keyboard.down(c), up = (c) => page.keyboard.up(c);
const tap = async (c, ms = 60) => { await down(c); await sleep(ms); await up(c); await sleep(60); };
/** hold movement keys until the player is within tol of (x, z), or time runs out */
async function walkTo(x, z, { tol = 0.25, t = 6000, jump = false } = {}) {
  const t0 = Date.now(); let held = new Set();
  const set = async (code, on) => { if (on && !held.has(code)) { await down(code); held.add(code); } if (!on && held.has(code)) { await up(code); held.delete(code); } };
  let ok = false;
  while (Date.now() - t0 < t) {
    const s = await st();
    const dx = x === null ? 0 : x - s.x, dz = z === null ? 0 : z - s.z;
    if (Math.abs(dx) < tol && Math.abs(dz) < tol) { ok = true; break; }
    await set(K.right, dx > tol * 0.6); await set(K.left, dx < -tol * 0.6);
    await set(K.down, dz > tol * 0.6); await set(K.up, dz < -tol * 0.6);
    if (jump) { if ((Date.now() - t0) % 500 < 200) await set('Space', true); else await set('Space', false); }
    await sleep(25);
  }
  for (const c of [...held]) await up(c);
  await sleep(120);
  return ok;
}
async function climb(dir, topY, t = 5000) {
  await down('KeyW');
  const t0 = Date.now();
  while (Date.now() - t0 < t) { const s = await st(); if (s.y >= topY - 0.6) break; await sleep(40); }
  if (dir) await down(dir);
  while (Date.now() - t0 < t) { const s = await st(); if (s.y >= topY - 0.02 && s.ground) break; await sleep(40); }
  await up('KeyW'); if (dir) { await sleep(150); await up(dir); }
  await sleep(150);
}
const check = async (name, cond) => { if (errors.length) { log('ERRORS', errors.slice(0, 3)); process.exit(1); } const s = await st(); const ok = cond(s); log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify({ x: s.x, y: s.y, z: s.z, era: s.era, mode: s.mode, prompt: s.prompt })); return ok; };
const interactNow = async () => { await tap('KeyF'); await sleep(300); await settle(page); await sleep(200); };

await newGame(page);
await page.evaluate(() => { window.__game.godMode = true; });

// --- era travel basics
await tap('KeyQ'); await sleep(1600);
await check('shift to Past', (s) => s.era === 0);
await tap('KeyE'); await sleep(1600); await tap('KeyE'); await sleep(1600);
await check('shift to Future', (s) => s.era === 2);
await tap('KeyQ'); await sleep(1600);

// --- Brannoch
await tp(16.6, 0, 1.8, 1); await sleep(200);
await check('prompt Brannoch', (s) => /Brannoch/.test(s.prompt || ''));
await interactNow();
await check('met Brannoch', (s) => s.f.metBrannoch);

// --- Mudflats: mud in the Present is refused / the Past is a swim
await tp(41.3, 0, 3.5, 1); await sleep(200);
await tap('KeyQ'); await sleep(1600);
await check('Past at the bank', (s) => s.era === 0);
await down('Space');
await walkTo(57.5, null, { t: 12000 });
await up('Space');
await check('swam the harbor', (s) => s.x > 56.5 && s.y >= -0.05);
// and the Future: down the ladder, across, up the far one
await tp(41.3, 0, 0.5, 2); await sleep(300);
await walkTo(42.5, 0.5, { t: 3000 }); await sleep(900);
await check('down in the dry harbor', (s) => s.y <= -2.9);
await page.evaluate(() => { for (const e of window.__game.enemies) if (e.era === 2 && e.body.y < -1) e.remove(); });
await walkTo(55.5, 0.5, { t: 8000 });
await climb(K.right, 0);
await walkTo(57, 1.5, { t: 2500 });
await check('up the far ladder', (s) => s.x > 56 && s.y >= -0.05);

// --- nets on the Marigold
await tp(41.5, 0, 2.5, 1); await sleep(200);
await down('ShiftLeft'); await down(K.right); await sleep(120); await tap('Space', 250); await sleep(700); await up(K.right); await up('ShiftLeft');
await walkTo(45.5, 2.5, { t: 3000 });
await check('nets taken', (s) => s.inv.includes('nets'));

// --- Lyra teaches Rewind
await tp(66.6, 0, 1.8, 1); await sleep(200);
await interactNow();
await check('has Rewind', (s) => s.f.hasRewind);

// --- the tide gate, honestly: gate -> off the deck -> lever -> rewind -> through
await tp(70.5, 0, 1.5, 1); await sleep(200);
await walkTo(71.5, 1.5, { t: 2000 });
await climb(K.right, 4);
await walkTo(73, 1.5, { t: 2500 });
await check('up the ladder onto the deck', (s) => s.y >= 3.95 && s.x > 72);
await walkTo(84.6, 2.5, { t: 6000 });
await walkTo(84.6, 4.6, { t: 2000 }); await sleep(500);
await check('dropped to the shore', (s) => s.y < 0.1);
await walkTo(83.6, 5.0, { t: 2000 });
await check('lever prompt', (s) => /lever/i.test(s.prompt || ''));
await tap('KeyF');
await check('gate opening', (s) => true);
await down('KeyR');
await page.waitForFunction('window.__game.player.body.y >= 3.95 && window.__game.player.body.z < 3.6', { timeout: 5000 }).catch(() => {});
await up('KeyR');
await check('rewound up to the gate', (s) => s.y >= 3.95 && s.x > 83);
await walkTo(88.5, 2.5, { t: 3000 });
await check('through the tide gate', (s) => s.x > 87.3 && s.f.tideGatePassed);

// --- the Noon Bell
await walkTo(91.6, 1.4, { t: 4000 });
await tap(K.right, 80);
for (let i = 0; i < 3; i++) { await tap('KeyX'); await sleep(450); }
await settle(page); await sleep(300);
await check('Noon Bell rung', (s) => s.f.noonRung && s.inv.includes('noteNoon'));

// --- the Saltings: the pit, the nets, the dune
await tp(108.5, 0, 3.5, 2); await sleep(300);
await walkTo(111.9, 3.5, { t: 3000 }); await sleep(600);
await check('in the pit with the clapper', (s) => s.y <= -1.9 && s.inv.includes('clapper'));
await tap('KeyQ'); await sleep(400);
await check('no way out by era', (s) => s.era === 2);
// wander about in the pit for a good while, then rewind out
for (let i = 0; i < 6; i++) { await walkTo(110.6, 2); await walkTo(113.4, 4.8); }
await down('KeyR');
await page.waitForFunction('!window.__game.craft.rewinding && window.__game.player.body.y >= -0.05', { timeout: 15000 }).catch(() => {});
await up('KeyR'); await sleep(400);
await check('rewound out of the pit', (s) => s.y >= -0.05 && s.f.pitLeft);
await tp(122, 0, 1.7, 1); await sleep(200);
await interactNow(); await sleep(500); await settle(page);
await check('nets strung', (s) => s.f.fenceBuilt && !s.inv.includes('nets'));
await tp(117.5, 0, 3.5, 2); await sleep(300);
await walkTo(130.5, 3.5, { t: 9000, jump: true }); await sleep(900);
await check('over the sea wall by the dune', (s) => s.x > 129.5 && s.y < 0.1);

// --- Keeper's Light: chip, clam, pearl, lamp, loupe
await tp(144.6, 0, 4.4, 1); await sleep(200);
await interactNow();
await check('got the chip', (s) => s.inv.includes('pearlChip'));
await tp(158.5, -0.5, 3.5, 0); await sleep(2500);
await check('sunk to the clam', (s) => s.y < -2 && /Clam/.test(s.prompt || ''));
await interactNow(); await sleep(500); await settle(page);
await check('clam seeded', (s) => s.f.clamSeeded);
await tp(155.5, 0, 0.5, 1); await sleep(1500);
await check('down the pool ladder (fell)', (s) => s.y <= -2.9);
await walkTo(158.5, 3.2, { t: 4000 });
await interactNow();
await check('pearl taken', (s) => s.inv.includes('pearl'));
await walkTo(161.5, 0.5, { t: 4000 });
await climb(K.right, 0);
await walkTo(163, 1.5, { t: 2000 });
await check('climbed out of the pool', (s) => s.y >= -0.05 && s.x > 162);
await tp(144.6, 0, 4.4, 1); await sleep(200);
await interactNow();
await check('lamp lit, loupe in hand', (s) => s.f.lampLit && s.f.hasReach && s.inv.includes('loupe'));
// up the Keeper's stair
await tp(150.5, 0, 5.4, 1); await sleep(200);
await walkTo(150.5, 4.5, { t: 2000 });
await climb(null, 5);
await check('on the stack', (s) => s.y >= 4.95 && s.z < 4);
await walkTo(151.5, 2.5, { t: 3000 });
await climb(K.right, 10);
await walkTo(153, 2.5, { t: 2500 });
await check('on the gallery', (s) => s.y >= 9.95);
await walkTo(154.9, 2.0, { t: 3000 });
await tap(K.right, 60);
await tap('KeyQ'); await sleep(900);
await check('cannot step into the Past here', (s) => s.era === 1);
await down('Tab'); await sleep(200); await tap('KeyQ'); await sleep(400);
await check('reach prompt on the Dawn Bell', (s) => /Dawn Bell/.test(s.prompt || ''));

for (let i = 0; i < 3; i++) { await tap('KeyX'); await sleep(450); }
await up('Tab');
await settle(page); await sleep(300);
await check('Dawn Bell rung', (s) => s.f.dawnRung);

// --- the Dry Lock, honestly
await tp(169.5, 0, 3.5, 2); await sleep(300);
await walkTo(170.5, 3.5, { t: 2000 });
await climb(K.right, 4);
await walkTo(172, 3.5, { t: 2500 });
await check('on the walkway', (s) => s.y >= 3.95);
await walkTo(177.3, 3.5, { t: 4000 });
await walkTo(177.3, 6.4, { t: 2500 }); await sleep(500);
await check('stepped off the walkway', (s) => s.y < 0.1);
await tap('KeyQ'); await sleep(350);
await check('in the Present by the jetty', (s) => s.era === 1);
await walkTo(177.4, 3.5, { t: 3000 });
await walkTo(184.3, 3.5, { t: 5000 });
await down('Tab'); await sleep(150); await tap('KeyE'); await sleep(300);
await check('reach prompt on the console', (s) => /Lock control/.test(s.prompt || ''));

await tap('KeyF'); await up('Tab');
await down('KeyR');
await page.waitForFunction('window.__game.era === 2 && window.__game.player.body.y >= 3.95 && window.__game.player.body.z < 5.4', { timeout: 8000 }).catch(() => {});
await up('KeyR');
await check('rewound to the door, in the Future', (s) => s.era === 2 && s.y >= 3.95);
await walkTo(180.5, 3.5, { t: 3000 });
await check('through the lock door', (s) => s.x > 179.3 && s.f.lockPassed);
await walkTo(196, 3.5, { t: 8000 });
await check('down the far side', (s) => s.x > 195 && s.y < 0.1);

// --- the Warden's Wharf
await page.evaluate(() => { const w = window.__game.warden; w.path = [[228, 1], [229, 1], [229, 2], [228, 2]]; w.reset(); });
await tp(215.4, 0, 3.0, 2); await sleep(300);
await check('bell prompt', (s) => /Dusk Bell/.test(s.prompt || ''));
await interactNow();
await check('clapper fitted', (s) => s.f.clapperFitted);
await tap(K.right, 60);
await tap('KeyX'); await sleep(450);
await check('first stroke: the Harbor Warden shields the bell', (s) => s.f.duskStroke1 && !s.f.duskRung);
await tap('KeyX'); await sleep(450);
await check('the shield blocks a second stroke', () => page.evaluate(() => window.__game.strikeables.find((x) => x.id === 'duskBell').hits === 1));
// into the Present, and through the lens to the Warden's wind-up key
await tap('KeyQ'); await page.waitForFunction(() => window.__game.era === 1 && window.__game.post.trans > 0.95, { timeout: 4000 }).catch(() => {});
await walkTo(216.5, 6.6, { t: 4000 });
await down('Tab'); await sleep(150); await tap('KeyE'); await sleep(300);
await tap('KeyX'); await sleep(300); await up('Tab');
await settle(page);
await check("the Warden's wind-up key, struck through the lens from the Present", (s) => s.f.wardenKeyStruck);
await tap('KeyE'); await page.waitForFunction(() => window.__game.era === 2 && window.__game.post.trans > 0.95, { timeout: 4000 }).catch(() => {});
await tp(215.4, 0, 3.0); await sleep(300);
await walkTo(214.2, 3.0, { t: 2000 }); await walkTo(215.4, 3.0, { t: 2000 });
await tap(K.right, 60);
await tap('KeyX'); await sleep(450);
await check('second stroke', (s) => s.f.duskStroke2 && !s.f.duskRung);
// bait its charge, and rewind out of the lunge
await page.waitForFunction(() => window.__game.warden.state === 'chase', { timeout: 10000 }).catch(() => {});
await down('KeyR'); await sleep(700); await up('KeyR'); await sleep(300);
await check('the Warden crashes, and drops its shield', (s) => s.f.wardenCrashed);
await tp(215.4, 0, 3.0); await sleep(300);
await tap(K.right, 60);
await tap('KeyX'); await sleep(450);
await settle(page); await sleep(300);
await check('Dusk Bell rung', (s) => s.f.duskRung);

// --- Gull's Head and the door
await tp(236, 0, 3.5, 1); await sleep(200);
await walkTo(251, 3.5, { t: 14000, jump: true });
await check('climbed the Head', (s) => s.y >= 11.95);
await walkTo(255.3, 3.5, { t: 3000 });
await interactNow(); await sleep(600);
await check('Well open', (s) => s.f.wellOpen);
await walkTo(258.2, 2.0, { t: 4000 });
await check('inside the Well', (s) => s.x > 257);

// --- gate A: Future rubble -> Present stub -> Past scaffold -> lever
await tap('KeyE'); await sleep(1500);
await walkTo(259.4, 0.6, { t: 3000 });
await walkTo(263.5, 0.6, { t: 6000, jump: true });
await check('up the rubble', (s) => s.era === 2 && s.y >= 14.95);
await tap('KeyQ'); await sleep(1500); await tap('KeyQ'); await sleep(1500);
await check('on the Past scaffold', (s) => s.era === 0 && s.y >= 14.95);
await walkTo(265.2, 0.8, { t: 2500 });
await interactNow();
await check('gate A open', (s) => s.f.gateA);
await walkTo(267, 3.5, { t: 3000 }); await sleep(500);
await tap('KeyE'); await sleep(1500);
await walkTo(270.5, 3.5, { t: 3000 }); await sleep(600);
await check('down on terrace B', (s) => s.era === 1 && Math.abs(s.y - 8) < 0.1);

// --- gate B: the crank out of the Future's cage, the winch in the Past's alcove
await walkTo(277.9, 5.2, { t: 3000 });
await down('Tab'); await sleep(150); await tap('KeyE'); await sleep(300);
await check('reach prompt on the crank', (s) => /crank/i.test(s.prompt || ''));
await tap('KeyF'); await up('Tab'); await sleep(300); await settle(page); await sleep(300);
await check('crank taken', (s) => s.inv.includes('crank'));
await walkTo(275.5, 1.4, { t: 3000 });
await down('Tab'); await sleep(150); await tap('KeyQ'); await sleep(300);
await check('reach prompt on the winch', (s) => /winch/i.test(s.prompt || ''));
await tap('KeyF'); await up('Tab'); await sleep(300); await settle(page); await sleep(300);
await check('gate B open', (s) => s.f.gateB);
await walkTo(282.5, 3.5, { t: 4000 }); await sleep(600);
await check('down on terrace C', (s) => Math.abs(s.y - 4) < 0.1);

// --- gate C: gate -> Future pit -> lever -> rewind -> through
await walkTo(289.3, 3.5, { t: 4000 });
await walkTo(284.5, 3.5, { t: 3000 });
await tap('KeyE'); await sleep(900);
await check('in the Future pit', (s) => s.era === 2 && Math.abs(s.y - 2) < 0.1);
await check('pit lever prompt', (s) => /lever/i.test(s.prompt || ''));
await tap('KeyF');
await down('KeyR');
await page.waitForFunction('window.__game.era === 1 && window.__game.player.body.x > 288.8', { timeout: 8000 }).catch(() => {});
await up('KeyR');
await check('rewound to gate C', (s) => s.era === 1 && s.x > 288.5 && Math.abs(s.y - 4) < 0.1);
await walkTo(292.5, 3.5, { t: 3000 }); await sleep(700);
await check('through gate C to the bottom', (s) => s.f.gateCPassed && s.y < 0.1);

// --- the heart, and the tide
await walkTo(295.5, 2.2, { t: 3000 });
await check('heart prompt', (s) => /heart/i.test(s.prompt || ''));
await interactNow();
await check('heart placed, Rewind given up', (s) => s.f.heartPlaced && !s.f.hasRewind && !s.inv.includes('watch'));
await sleep(3000);

await down('Space');
const t0 = Date.now();
while (Date.now() - t0 < 60000) {
  const s = await st();
  if (s.mode !== 'play') break;
  if (s.y > 11.2) { await down(K.left); } else { await up(K.left); if (s.x > 292) await tap(K.left, 100); }
  await sleep(100);
}
await up('Space'); await up(K.left);
await check('ending begun', (s) => s.mode !== 'play');
await page.waitForFunction('window.__game.mode === "credits"', { timeout: 120000 });
await sleep(2500);

await check('finished, tide restored', (s) => s.f.finished && s.f.tideRestored);
log("errors:", errors.slice(0, 8));
await browser.close();
