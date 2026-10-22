// Chapter Three, Highcrest: the whole climb, every puzzle solved the way it's meant to be, with real
// key presses: up the switchbacks (walking up each turn), the Lantern at the ravine, the falls, the crevasse, the rockfall
// and the observatory doors; three echoes on the clockworks plates and one on the gold gate's;
// the Founder's drawings to Sela; the favors; Donald Eugene's notebooks, the shimmer, the duel with him at the End of
// Time (fought here in god mode, with the wrench whenever his guard drops; duel-check.mjs tests his patterns), the
// squirrels held with Stasis waves, the night after, and the credits. Teleports only skip plain walking between them.
import { boot, newGame, sleep, driver, autoplay } from './lib.mjs';

const { browser, page, errors } = await boot({ chapter: 'summit' });
const d = driver(page, errors);
const { tap, walkTo, check, interactNow, shift } = d;
const P = 0, M = 1, F = 2;
const R = () => tap('KeyR');
const lantern = () => page.evaluate(() => { const p = window.__game.powers, b = window.__game.world.bubble; return { lit: p.lit, age: p.age, bubble: b ? b.age : null, echoes: p.echoes.length }; });
/** record an echo standing still on the spot */
async function echoHere() {
  await tap('KeyV');
  await sleep(900);
  await tap('KeyV');
  await sleep(300);
}

await newGame(page);
// (the wolves, beetles and wisps on the road are left out: this is the route, not the fights)
await page.evaluate(() => __game.enemies.forEach((e) => e.remove()));
// the road's layout, from the game: x = OX + u along each leg; leg k's road runs z = zb(k) .. zb(k) + 6
const { OX, ZB, H } = await page.evaluate(() => { const L = window.__game.L; return { OX: L.OX, ZB: [0, 1, 2, 3, 4, 5].map((k) => L.zb(k)), H: { rock: L.gy(4, L.OX + 60) } }; });
const U = (u) => OX + u;
const Z = (k, dz = 3.5) => ZB[k] + dz;
const onLeg = (s, k) => s.z >= ZB[k] - 0.5 && s.z <= ZB[k] + 7;
/** at the end of leg k, walk up the turn (into the mountain) onto the next leg */
async function turn(k) {
  const x = k % 2 ? U(2.5) : U(96.5);
  await walkTo(x, Z(k), { t: 14000, tol: 0.15 });
  await walkTo(x, Z(k + 1), { t: 6000, tol: 0.3 });
  await walkTo(k % 2 ? U(7) : U(92), Z(k + 1), { t: 2000 });
}

await check('Chapter Three begins at Base Camp', (s) => s.x < U(6) && s.y === 0 && s.era === M);
await page.waitForFunction(() => window.__game.state.flags.donAhead, { timeout: 15000 }).catch(() => {});
await d.settle();
await check('Donald Eugene goes on ahead: he is simply not there any more', (s) => s.f.donAhead);
await walkTo(U(14.5), 4.6, { t: 4000 });
await interactNow();
await check('Anwen the Guide explains the switchbacks', (s) => s.mode === 'play');

// ---- up the first slope, to the fallen pine: a sapling in the First Age
await walkTo(U(49.5), 4, { t: 8000 });
await check('walking up the road: it climbs', (s) => s.y >= 2);
await walkTo(U(55), 4, { t: 2000 });
await check('the fallen pine blocks the way', (s) => s.x < U(52));
await shift('KeyQ');
await walkTo(U(52.5), 6, { t: 3000 });
await check('a Lost Cog by the sapling, in the First Age', (s) => s.cogs.includes('cogP1'));
await walkTo(U(57), 4, { t: 3000 });
await shift('KeyE');
await check('past the pine, back in the Golden Hour', (s) => s.x > U(55) && s.era === M);

// ---- the first turn, at the east end
await turn(0);
await check('up the first switchback, onto the Lantern Road', (s) => onLeg(s, 1));

// ---- Ingrid: the Lantern; and the ember favor
await walkTo(U(87.3), Z(1, 4.4), { t: 4000 });
await interactNow();
await check('Ingrid gives you her Lantern', (s) => s.f.hasLantern && s.inv.includes('hourLantern') && s.f.emberQuest);
await walkTo(U(72), Z(1, 4.3), { t: 5000 });
await shift('KeyQ');
await walkTo(U(69.8), Z(1, 4.3), { t: 3000 });
await check("a coal from the First Age's fire", (s) => s.inv.includes('ember'));
await shift('KeyE');
await walkTo(U(87.3), Z(1, 4.4), { t: 6000 });
await interactNow();
await check('the lookout lamp lit: a favor done, a heart more', (s) => s.f.lampLit && s.kind.includes('ember') && s.hp === 6);

// ---- the ravine: light the Lantern (it lights on the First Age), and cross
await walkTo(U(35.6), Z(1), { t: 14000 });
await tap('KeyQ');
await sleep(400);
await check("in the frost, the Chronoheart can't shift", (s) => s.era === M);
await R();
await check('lit: a bubble of the First Age', async () => (await lantern()).bubble === P);
await walkTo(U(28.4), Z(1), { t: 5000 });
await check("across the ravine on the First Age's bridge", (s) => s.x < U(29) && onLeg(s, 1));
await R();
await check('the Lantern put out, on solid ground', async () => !(await lantern()).lit);
await walkTo(U(22.5), Z(1, 5.6), { t: 3000 });
await check("Tobin's lost page", (s) => s.inv.includes('page'));
await turn(1);
await check('up the second switchback, to the Icefall', (s) => onLeg(s, 2));

// ---- the falls: light the Lantern, swing it forward to the Stopped Age, and cross on the ice
await walkTo(U(28.6), Z(2), { t: 9000 });
await R();
await tap('KeyE');
await check('the Lantern swung forward to the Stopped Age', async () => (await lantern()).bubble === F);
await walkTo(U(37.5), Z(2), { t: 5000 });
await check('across the frozen falls', (s) => s.x > U(36.5) && onLeg(s, 2));
await R();

// ---- the Sundial Terrace: Sir Orin
await walkTo(U(62), Z(2), { t: 9000 });
await d.settle();
await check('Sir Orin, at the statue', (s) => s.f.christopherMet && s.inv.includes('summitFlag'));
await turn(2);
await check('up the third switchback, to the Clockworks', (s) => onLeg(s, 3));

// ---- the Clockworks: Lyra; three plates at once (two echoes, and you in the Lantern's First Age light on the frosted one)
await walkTo(U(91.8), Z(3, 1.6), { t: 3000 });
await interactNow();
await check('Lyra gives you the Echo', (s) => s.f.hasEcho);
await walkTo(U(84.5), Z(3, 1.5), { t: 4000 });
await echoHere();
await walkTo(U(80.5), Z(3, 5.5), { t: 4000 });
await echoHere();
await check('two echoes, each on a plate', async () => (await lantern()).echoes === 2);
await walkTo(U(76.5), Z(3, 1.5), { t: 4000 });
await sleep(400);
await check('the frosted plate does nothing without the First Age', (s) => !s.f.clockworksOpen);
await R();
await sleep(500);
await check('all three plates at once: the clockworks door opens for good', (s) => s.f.clockworksOpen);
await R();
await walkTo(U(56.5), Z(3, 3.5), { t: 8000 });
await check('the Master Drawings, in the Clockworks hall', (s) => s.inv.includes('masterDrawings'));

// ---- the gold gate: an echo on its plate
await walkTo(U(47.5), Z(3, 1.5), { t: 12000 });
await echoHere();
await check('three echoes now', async () => (await lantern()).echoes === 3);
await walkTo(U(38), Z(3), { t: 4000 });
await check('through the gold gate, held open by your echo', (s) => s.f.gateDPassed);
await turn(3);
await check('up the fourth switchback, to the Crevasses', (s) => onLeg(s, 4));

// ---- the crevasse: Sela builds a bridge from the Master Drawings
await shift('KeyQ');
await walkTo(U(12.5), Z(4, 2.4), { t: 5000 });
await interactNow();
await check('Sela takes the Master Drawings: six hundred years of bridge', (s) => s.f.selaBuilt && !s.inv.includes('masterDrawings'));
await shift('KeyE');
await walkTo(U(27.4), Z(4), { t: 6000 });
await check('across the crevasse on the stone bridge, no Lantern', (s) => s.x > U(26.5) && onLeg(s, 4));

// ---- the rockfall: the Stopped Age's frozen falls, as a stair
await walkTo(U(56.6), Z(4), { t: 8000 });
await R();
await tap('KeyE');
await walkTo(U(65), Z(4, 3), { jump: true, t: 8000 });
await check('up the frozen falls, onto the rockfall', (s) => s.y >= H.rock + 4.5);
await check('a Lost Cog on top of the rockfall', (s) => s.cogs.includes('cogM4'));
await walkTo(U(73), Z(4), { t: 5000 });
await R();
await check('down the far side', (s) => s.x > U(71) && s.y < H.rock + 1);
await turn(4);
await check('up the last switchback: the summit', (s) => onLeg(s, 5));

// ---- the summit: the frozen doors
await walkTo(U(87.7), Z(5), { t: 4000 });
await R();
await walkTo(U(83.5), Z(5), { t: 4000 });
await check("through the frozen doors, in the First Age's light", (s) => s.x < U(85));
await R();
await walkTo(U(78.8), Z(5, 5.4), { t: 3000 });
await interactNow();
await check('Tobin has his page back', (s) => s.kind.includes('page'));
await walkTo(U(70.2), Z(5, 3.4), { t: 4000 });
await interactNow();
await check('Midwinter Night fifty years ago, left as an echo under the orrery', (s) => s.f.memorySeen);
await walkTo(U(83), Z(5, 2.2), { t: 6000 }); // (in front of the star-books' shelves)
await interactNow();
await check("Donald Eugene's notebooks, in his strongbox (lock picked): Attempt 8,512", (s) => s.f.notebooksRead && s.f.notebookChestOpen);

// ---- the shimmer at the Needle: the End of Time, and the duel with Donald Eugene
await walkTo(U(28), Z(5), { t: 12000 });
await walkTo(U(21.5) + 0.9, Z(5, 2.2), { t: 4000 });
await interactNow();
await d.settle();
await sleep(1500);
await d.settle();
const A = await page.evaluate(async () => (await import('/src/chapters/summit/level.js')).ARENA);
await check('through the shimmer, to the End of Time: he asks, and she says no', (s) => s.f.summitTalk && s.y >= A.y - 0.1 && s.x < A.x0 + 10);
await check('the duel begins: Donald Eugene, 12 hours of health', async () => (await page.evaluate(() => __game.duel.on && __game.duel.hp === 12)));
/** fight him (no dodging: god mode): every time his guard drops, the wrench, up close */
const fight = (until) => page.evaluate(async (until) => {
  const g = __game, d = g.duel, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  g.godMode = true;
  for (let i = 0; i < 3000; i++) {
    if (until === 'squirrels' && d.phase === 3 && d.squirrelsLeft) break;
    if (g.state.flags.duelWon) break;
    if (g.mode === 'play' && d.open && d.state !== 'down') {
      g.player.place(d.x - 1, 86, d.z);
      g.player.facing = 1;
      g.playerAttack(d.x - 0.15, 86.7, d.z, 1);
    }
    await sleep(60);
  }
  g.godMode = false;
  return { phase: d.phase, hp: d.hp };
}, until);
await fight('squirrels');
await d.settle();
await sleep(500);
await d.settle();
await check('phases 1 and 2: hit while his guard is down', (s) => (s.f.duelPhase || 1) === 3);
const cz = (A.z0 + A.z1 + 1) / 2;
/** a Stasis wave: hold the swing, and let go (and give it time to land) */
const wave = async () => { await d.down('KeyX'); await page.waitForFunction(() => __game.kit.charged, { timeout: 5000 }).catch(() => {}); await d.up('KeyX'); await sleep(900); };
const held = (s) => (s.f.zachHeld ? 1 : 0) + (s.f.meganHeld ? 1 : 0);
await page.evaluate(() => { __game.godMode = true; __game.kit.equip('seal', true); });
for (const [n, dz] of [[1, 0.8], [2, -0.9]]) {
  await walkTo(A.startX + 6.5, cz + dz, { t: 6000 });
  await walkTo(A.startX + 6.0, cz + dz, { t: 1500 }); // (facing them)
  await page.evaluate(() => { const d = __game.duel; d.clearShots(); d.nextPattern(6); }); // (no bolt in the way)
  await wave();
  await check(`phase 3: a Stasis wave holds ${n === 1 ? 'one squirrel' : 'the other'} where his rewrites can't reach`, (s) => held(s) >= n);
}
await fight('end');
await page.waitForFunction(() => !document.getElementById('credits').hidden, { timeout: 120000 });
await check('held still, he has to listen; Midwinter Night; and the credits', (s) => s.f.hoursReturned && s.f.finished);
const credits = await page.evaluate(() => ({ chapter: document.getElementById('credits-chapter').textContent, next: !document.getElementById('btn-credits-next').hidden }));
await check('the credits name the chapter, and offer no chapter after it', () => /Other Half/.test(credits.chapter) && !credits.next);

// ---- after the credits: Midwinter Night, and she keeps the whole Chronoheart
await page.reload();
await autoplay(page);
await page.click('#btn-continue');
await d.settle();
await check('Continue: back on the mountain, on Midwinter Night', (s) => s.era === M && s.f.finished);
await tap('KeyQ');
await sleep(1200);
await check('she can still step between the ages', (s) => s.era === P);
await tap('KeyE');
await sleep(1200);
await walkTo(U(30), Z(5), { t: 20000 }); // (along the road, clear of the dome)
await walkTo(U(9.5), ZB[5] - 7, { t: 8000 });
await d.settle();
await check('out on the overlook: the whole world, far below', (s) => s.f.sawView);
await walkTo(U(9.5), ZB[5] - 7, { t: 2000 });
await interactNow();
await check("Zach's flag, planted at the top of the world", (s) => s.f.flagPlanted && s.kind.includes('flag'));

console.log('failures:', d.failures(), 'errors:', errors);
await browser.close();
process.exit(d.failures() ? 1 : 0);
