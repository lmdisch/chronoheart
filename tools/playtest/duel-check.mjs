// Chapter Three's duel with Donald Eugene (see src/chapters/summit/duel.js), driven by script: into
// the hall, each phase's attacks, hits that land and hits that don't, the Rewind wind-up, the
// squirrels, the Page Turn, and the win through to the credits.
import { boot, newGame, sleep, settle } from './lib.mjs';
const OUT = process.env.SHOTS || '.';
const { browser, page, errors } = await boot({ chapter: 'summit' });
const G = (fn, ...a) => page.evaluate(fn, ...a);
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++; };
await newGame(page);
await settle(page, 60000).catch(() => {});
await sleep(1500);
await settle(page, 60000).catch(() => {});
await G(() => { const g = __game; Object.assign(g.state.flags, { christopherMet: true, hasLantern: true, hasEcho: true, notebooksRead: true, notebookChestOpen: true }); g.refreshWorld(); });
await G(() => __game.enterShimmer());
await settle(page, 60000);
await sleep(3800); // (his health bar comes in once his title card has gone)
let s = await G(() => { const g = __game, d = g.duel; return { on: d.on, hp: d.hp, phase: d.phase, arena: g.inArenaMood, bar: !document.getElementById('boss-bar').hidden, parts: g.kit.parts().map((p) => p.id), wrench: g.kit.wrench }; });
check(s.on && s.hp === 12 && s.phase === 1 && s.arena && s.bar, `the duel starts in the hall (${JSON.stringify(s)})`);
check(s.parts.length === 4, `every wrench part is on at the End of Time (${s.parts})`);
await sleep(2500);
await page.screenshot({ path: `${OUT}/duel-p1.png` });
// watch his first pattern: rings come, then he tires
const seen = await G(async () => {
  const g = __game, d = g.duel, out = { rings: 0, states: new Set(), caught: 0 };
  g.godMode = true;
  for (let i = 0; i < 160; i++) {
    out.rings = Math.max(out.rings, d.rings.length);
    out.states.add(d.state);
    if (d.frozenT > 0) out.caught++;
    await new Promise((r) => setTimeout(r, 50));
  }
  g.godMode = false;
  return { rings: out.rings, states: [...out.states], caught: out.caught };
});
check(seen.rings > 0 && seen.states.includes('tired'), `phase 1: rings, then he tires (${JSON.stringify(seen)})`);
// a ring that reaches her freezes her (not in god mode)
const caught = await G(async () => {
  const g = __game, d = g.duel, b = g.player.body;
  g.player.place(40, 86, 0);
  g.player.invuln = 0;
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 50.5 }, { do: 'ring', high: false }, { do: 'wait', t: 5 }];
  const hp0 = g.player.hp;
  for (let i = 0; i < 80; i++) {
    if (d.frozenT > 0) return { frozen: true, hp: g.player.hp, hp0 };
    await new Promise((r) => setTimeout(r, 50));
  }
  return { frozen: false, hp: g.player.hp, hp0, x: b.x };
});
check(caught.frozen && caught.hp === caught.hp0 - 1, `a low ring that catches her: a heart, and frozen (${JSON.stringify(caught)})`);
await sleep(1500);
// jumping a low ring: no catch
const jumped = await G(async () => {
  const g = __game, d = g.duel;
  await new Promise((r) => setTimeout(r, 1200));
  d.clearShots();
  d.frozenT = 0;
  g.player.place(40, 86, 0);
  g.player.invuln = 0;
  g.player.hp = g.player.maxHp;
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 50.5 }, { do: 'ring', high: false }, { do: 'wait', t: 5 }];
  for (let i = 0; i < 100; i++) {
    const r = d.rings[0];
    if (r && Math.abs(r.x - g.player.body.x) < 2.4 && g.player.body.onGround) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })), 300);
    }
    if (d.frozenT > 0) return { frozen: true };
    if (!d.rings.length && i > 20) return { frozen: false, hp: g.player.hp };
    await new Promise((r) => setTimeout(r, 30));
  }
  return { frozen: false, timeout: true };
});
check(!jumped.frozen, `jumping a low ring clears it (${JSON.stringify(jumped)})`);
// his guard: a wave while he's up does nothing; while he's tired it lands
const guard = await G(async () => {
  const g = __game, d = g.duel;
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 46.5 }, { do: 'wait', t: 9 }];
  await new Promise((r) => setTimeout(r, 600));
  g.player.place(43, 86, 0.5);
  g.player.facing = 1;
  g.kit.equip('plain', true);
  g.kit.equip('seal', true);
  const hp0 = d.hp;
  const t = g.kit.findTarget();
  g.kit.fire();
  const afterGuard = d.hp;
  d.state = 'tired';
  d.t = 3;
  await new Promise((r) => setTimeout(r, 100));
  g.kit.fire();
  return { target: t && t.name, hp0, afterGuard, afterOpen: d.hp, state: d.state };
});
check(guard.target === 'Donald Eugene' && guard.afterGuard === guard.hp0 && guard.afterOpen === guard.hp0 - 1 && guard.state === 'stunned', `guard up: the wave breaks; tired: it lands and holds him (${JSON.stringify(guard)})`);
// the wrench, up close, while he's tired
const melee = await G(async () => {
  const g = __game, d = g.duel;
  d.state = 'tired';
  d.t = 3;
  if (d.don.mat.userData.preCrystal) d.don.mat.userData.preCrystal && null;
  g.player.place(d.x - 0.9, 86, 0.5);
  g.player.facing = 1;
  const hp0 = d.hp;
  g.playerAttack(g.player.body.x + 0.85, 86.7, 0.5, 1);
  return { hp0, hp: d.hp };
});
check(melee.hp === melee.hp0 - 1, `a wrench swing lands while he's down (${JSON.stringify(melee)})`);
// finish phase one with the Hairspring: his own ring, sent back
const back = await G(async () => {
  const g = __game, d = g.duel;
  g.kit.equip('rewind', true);
  d.clearShots();
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 52.5 }, { do: 'wait', t: 0.6 }];
  await new Promise((r) => setTimeout(r, 700));
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 52.5 }, { do: 'ring', high: false }, { do: 'wait', t: 9 }];
  g.player.place(44, 86, 0.5);
  g.player.facing = 1;
  const hp0 = d.hp;
  for (let i = 0; i < 100; i++) {
    const r = d.rings[0];
    if (r && Math.abs(r.x - g.player.body.x) < 4 && !r.back) {
      const t = g.kit.findTarget();
      g.kit.fire();
      await new Promise((r) => setTimeout(r, 1500));
      return { target: t && t.name, hp0, hp: d.hp, phase: d.phase, state: d.state };
    }
    await new Promise((r) => setTimeout(r, 30));
  }
  return { timeout: true };
});
check(back.target === 'the ring' && back.hp <= back.hp0 - 2 || back.state === 'down', `the Hairspring sends a ring back into him (${JSON.stringify(back)})`);
await settle(page, 30000).catch(() => {});
// knock phase one out
await G(() => { const d = __game.duel; if (d.phase === 1 && d.state !== 'down') { d.hp = 9; d.state = 'tired'; d.t = 3; d.damage(1); } });
await sleep(1500);
await settle(page, 30000);
await sleep(1000);
s = await G(() => { const d = __game.duel; return { phase: d.phase, hp: d.hp, state: d.state }; });
check(s.phase === 2 && s.hp === 8, `phase two (${JSON.stringify(s)})`);
// the seams, and the Rewind wind-up
const p2 = await G(async () => {
  const g = __game, d = g.duel, out = { seams: 0, high: 0 };
  g.godMode = true;
  for (let i = 0; i < 160; i++) {
    out.seams = Math.max(out.seams, d.seams.length);
    if (d.rings.some((r) => r.high)) out.high++;
    await new Promise((r) => setTimeout(r, 50));
  }
  // hurt him while he's tired: when it ends, he winds up
  d.nextPattern(0);
  d.queue = [{ do: 'tired', t: 0.6 }];
  await new Promise((r) => setTimeout(r, 200));
  d.damage(1);
  await new Promise((r) => setTimeout(r, 900));
  out.wind = d.state;
  const hpWind = d.hp;
  await new Promise((r) => setTimeout(r, 2600));
  out.healed = d.hp === hpWind + 1;
  g.godMode = false;
  return out;
});
check(p2.seams > 0 && p2.wind === 'wind' && p2.healed, `phase 2: floor seams, and an unanswered Rewind undoes a hit (${JSON.stringify(p2)})`);
await page.screenshot({ path: `${OUT}/duel-p2.png` });
await G(() => { const d = __game.duel; d.hp = 5; d.state = 'tired'; d.t = 3; d.damage(1); });
await sleep(1500);
await settle(page, 30000);
await sleep(800);
s = await G(() => { const g = __game, d = g.duel; return { phase: d.phase, hp: d.hp, squirrels: (g.hallSquirrels || []).length, left: d.squirrelsLeft }; });
check(s.phase === 3 && s.squirrels === 2 && s.left, `phase three, with Zach and Megan flickering (${JSON.stringify(s)})`);
await page.screenshot({ path: `${OUT}/duel-p3.png` });
// guarded until both squirrels are held
const sq = await G(async () => {
  const g = __game, d = g.duel;
  d.state = 'tired';
  d.t = 5;
  const guarded = !d.open;
  g.kit.equip('seal', true);
  for (const n of g.hallSquirrels) {
    g.player.place(n.x - 1.6, 86, n.z);
    g.player.facing = 1;
    await new Promise((r) => setTimeout(r, 80));
    g.kit.fire();
  }
  return { guarded, held: g.state.flags.zachHeld && g.state.flags.meganHeld, openAfter: d.open };
});
check(sq.guarded && sq.held && sq.openAfter, `his guard holds until both squirrels are held (${JSON.stringify(sq)})`);
// the Page Turn: unlit costs hearts; lit, she's safe
const page1 = await G(async () => {
  const g = __game, d = g.duel;
  d.clearShots();
  g.player.place(44, 86, 0);
  g.player.hp = g.player.maxHp;
  g.player.invuln = 0;
  g.powers.lit = false;
  d.nextPattern(0);
  d.queue = [{ do: 'page' }, { do: 'wait', t: 9 }];
  for (let i = 0; i < 160; i++) {
    if (d.page && d.page.passed) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  const unlit = g.player.hp;
  await new Promise((r) => setTimeout(r, 1500));
  d.clearShots();
  g.player.hp = g.player.maxHp;
  g.player.invuln = 0;
  d.frozenT = 0;
  g.powers.toggle?.();
  if (!g.powers.lit) g.powers.lit = true;
  d.nextPattern(0);
  d.queue = [{ do: 'page' }, { do: 'wait', t: 9 }];
  for (let i = 0; i < 160; i++) {
    if (d.page && d.page.passed) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  return { max: g.player.maxHp, unlit, lit: g.player.hp };
});
check(page1.unlit === page1.max - 2 && page1.lit === page1.max, `the Page Turn: unlit, two hearts; lit, safe (${JSON.stringify(page1)})`);
// the end
await G(() => { const g = __game, d = g.duel; g.powers.lit = false; d.state = 'tired'; d.t = 3; d.hp = 1; d.damage(1); });
const end = await page.waitForFunction(() => __game.mode === 'credits', { timeout: 150000 }).then(() => true).catch(() => false);
s = await G(() => ({ mode: __game.mode, f: { won: __game.state.flags.duelWon, home: __game.state.flags.hoursReturned, finished: __game.state.flags.finished } }));
check(end && s.f.won && s.f.home && s.f.finished, `beaten: what she knows, Lyra, the summit, the credits (${JSON.stringify(s)})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await browser.close();
