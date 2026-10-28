// Chapter Three's duel with Donald Eugene (see src/chapters/summit/duel.js), driven by script: into
// the hall, each phase's attacks, hits that land and hits that don't, the Rewind wind-up, the
// squirrels, the Page Turn, and the win through to the credits.
import { boot, newGame, sleep, settle, SHOTS } from './lib.mjs';
const OUT = SHOTS;
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
// watch his first pattern: bolts come, then he stumbles out of a blink near her, winded
const seen = await G(async () => {
  const g = __game, d = g.duel, out = { bolts: 0, states: new Set(), near: null };
  g.godMode = true;
  for (let i = 0; i < 200; i++) {
    out.bolts = Math.max(out.bolts, d.bolts.length);
    out.states.add(d.state);
    if (d.state === 'tired' && out.near === null) out.near = +Math.abs(d.x - g.player.body.x).toFixed(1);
    await new Promise((r) => setTimeout(r, 50));
  }
  g.godMode = false;
  return { bolts: out.bolts, states: [...out.states], near: out.near };
});
check(seen.bolts > 0 && seen.states.includes('tired') && seen.near !== null && seen.near < 4, `phase 1: bolts, then he tires right in front of her (${JSON.stringify(seen)})`);
const fresh = () => G(() => {
  const g = __game, d = g.duel;
  d.clearShots();
  d.frozenT = 0;
  g.player.place(40, 86, 0.5);
  g.player.invuln = 0;
  g.player.hp = g.player.maxHp;
  g.hud.setHearts(g.player.hp, g.player.maxHp);
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 50.5 }, { do: 'bolt', kind: 'aimed' }, { do: 'wait', t: 9 }];
});
// a bolt down her line, and she stays in it: a heart, and frozen
await sleep(1200);
await fresh();
const caught = await G(async () => {
  const g = __game, d = g.duel, hp0 = g.player.hp;
  for (let i = 0; i < 120; i++) {
    if (d.frozenT > 0) return { frozen: true, hp: g.player.hp, hp0 };
    await new Promise((r) => setTimeout(r, 50));
  }
  return { frozen: false, hp: g.player.hp, hp0 };
});
check(caught.frozen && caught.hp === caught.hp0 - 1, `a bolt that catches her: a heart, and frozen (${JSON.stringify(caught)})`);
// the same again, and she steps down out of its line once it's away: it goes by
await sleep(1500);
await fresh();
await page.waitForFunction(() => __game.duel.bolts.length > 0, { timeout: 8000 }).catch(() => {});
await page.keyboard.down('KeyS');
await sleep(650);
await page.keyboard.up('KeyS');
const dodged = await G(async () => {
  const g = __game, d = g.duel;
  for (let i = 0; i < 80; i++) {
    if (d.frozenT > 0) return { frozen: true };
    if (!d.bolts.length) return { frozen: false, hp: g.player.hp, z: +g.player.body.z.toFixed(2) };
    await new Promise((r) => setTimeout(r, 50));
  }
  return { frozen: false, timeout: true };
});
check(!dodged.frozen && !dodged.timeout, `stepping out of its line: it goes by (${JSON.stringify(dodged)})`);
// ...or a roll, through it
await fresh();
const rolled = await G(async () => {
  const g = __game, d = g.duel;
  for (let i = 0; i < 200; i++) {
    const o = d.bolts[0];
    if (o && Math.abs(o.x - g.player.body.x) < 1.6 && g.player.state !== 'roll') {
      g.player.facing = 1;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC' })), 60);
    }
    if (d.frozenT > 0) return { frozen: true };
    if (!d.bolts.length && i > 30) return { frozen: false };
    await new Promise((r) => setTimeout(r, 16));
  }
  return { frozen: false, timeout: true };
});
check(!rolled.frozen && !rolled.timeout, `a roll goes through it (${JSON.stringify(rolled)})`);
// ...or the wrench, swung just as it reaches her: knocked back, it shatters his guard and he's down
await fresh();
const batted = await G(async () => {
  const g = __game, d = g.duel, hp0 = d.hp;
  let swung = false, back = false;
  for (let i = 0; i < 300; i++) {
    const o = d.bolts[0];
    if (o && !swung && o.x - g.player.body.x < 1.9) {
      swung = true;
      g.player.facing = 1;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX' })), 40);
    }
    if (o && o.back) back = true;
    if (d.frozenT > 0) return { frozen: true };
    if (d.hp < hp0) {
      const out = { back, hp0, hp: d.hp, state: d.state, open: d.open };
      d.hp = hp0;
      d.drawBar();
      return out;
    }
    await new Promise((r) => setTimeout(r, 16));
  }
  return { timeout: true, swung, back };
});
check(batted.back && batted.hp === batted.hp0 - 1 && batted.state === 'tired' && batted.open, `the wrench knocks a bolt back: his guard shatters, and he's down (${JSON.stringify(batted)})`);
// his guard: a wave while he's up does nothing; while he's tired it lands
const guard = await G(async () => {
  const g = __game, d = g.duel;
  d.clearShots();
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
  await new Promise((r) => setTimeout(r, 450));
  const afterGuard = d.hp;
  d.state = 'tired';
  d.t = 3;
  g.kit.fire();
  await new Promise((r) => setTimeout(r, 450));
  return { target: t && t.name, hp0, afterGuard, afterOpen: d.hp, state: d.state };
});
check(guard.target === 'Donald Eugene' && guard.afterGuard === guard.hp0 && guard.afterOpen === guard.hp0 - 1 && guard.state === 'stunned', `guard up: the wave breaks; tired: it lands and holds him (${JSON.stringify(guard)})`);
// the wrench, up close, while he's tired
const melee = await G(async () => {
  const g = __game, d = g.duel;
  d.state = 'tired';
  d.t = 3;
  g.player.place(d.x - 0.9, 86, d.z);
  g.player.facing = 1;
  const hp0 = d.hp;
  g.playerAttack(g.player.body.x + 0.85, 86.7, d.z, 1);
  return { hp0, hp: d.hp };
});
check(melee.hp === melee.hp0 - 1, `a wrench swing lands while he's down (${JSON.stringify(melee)})`);
// finish phase one with the Hairspring: his own bolt, sent back
const back = await G(async () => {
  const g = __game, d = g.duel;
  g.kit.equip('rewind', true);
  d.clearShots();
  d.nextPattern(0);
  d.queue = [{ do: 'blink', x: 52.5 }, { do: 'wait', t: 0.6 }];
  await new Promise((r) => setTimeout(r, 700));
  g.player.place(44, 86, d.z);
  g.player.facing = 1;
  d.nextPattern(0);
  d.queue = [{ do: 'bolt', kind: 'aimed' }, { do: 'wait', t: 9 }];
  const hp0 = d.hp;
  for (let i = 0; i < 150; i++) {
    const o = d.bolts[0];
    if (o && Math.abs(o.x - g.player.body.x) < 4 && !o.back) {
      const t = g.kit.findTarget();
      g.kit.fire();
      await new Promise((r) => setTimeout(r, 1800));
      return { target: t && t.name, hp0, hp: d.hp, phase: d.phase, state: d.state };
    }
    await new Promise((r) => setTimeout(r, 30));
  }
  return { timeout: true };
});
check((back.target === 'the bolt' && back.hp <= back.hp0 - 2) || back.state === 'down', `the Hairspring sends a bolt back into him (${JSON.stringify(back)})`);
await settle(page, 30000).catch(() => {});
// knock phase one out
await G(() => { const d = __game.duel; if (d.phase === 1 && d.state !== 'down') { d.hp = 9; d.state = 'tired'; d.t = 3; d.damage(1); } });
await sleep(1500);
await settle(page, 30000);
await sleep(1000);
s = await G(() => { const d = __game.duel; return { phase: d.phase, hp: d.hp, state: d.state }; });
check(s.phase === 2 && s.hp === 8, `phase two (${JSON.stringify(s)})`);
// the floor, rewritten: cracks, then a hole she falls through (a heart, and back on the floor)
const rift = await G(async () => {
  const g = __game, d = g.duel, out = {};
  d.clearShots();
  g.player.place(45.5, 86, 0.5);
  g.player.invuln = 0;
  g.player.hp = g.player.maxHp;
  const hp0 = g.player.hp;
  d.nextPattern(0);
  d.queue = [{ do: 'rift' }, { do: 'wait', t: 9 }];
  await new Promise((r) => setTimeout(r, 400));
  out.crack = d.rifts.map((r) => r.stage).join();
  out.under = d.rifts.some((r) => r.x0 <= 45.5 && r.x1 > 45.5);
  for (let i = 0; i < 100 && g.player.body.y >= 85.9; i++) await new Promise((r) => setTimeout(r, 30));
  out.dropped = g.player.body.y < 85.9;
  for (let i = 0; i < 100 && g.player.body.y < 85.9; i++) await new Promise((r) => setTimeout(r, 30));
  out.back = Math.abs(g.player.body.y - 86) < 0.2;
  out.lost = hp0 - g.player.hp;
  await new Promise((r) => setTimeout(r, 4000));
  out.mended = d.rifts.length === 0 && g.world.cell(1, 46, 85, 0) === 1;
  return out;
});
check(rift.crack.includes('crack') && rift.under && rift.dropped && rift.back && rift.lost === 1 && rift.mended, `phase 2: the floor cracks and falls away under her; a heart, back on her feet; and it mends (${JSON.stringify(rift)})`);
// the Rewind wind-up
const p2 = await G(async () => {
  const g = __game, d = g.duel, out = {};
  g.godMode = true;
  d.clearShots();
  d.nextPattern(0);
  d.queue = [{ do: 'tired', t: 0.6 }];
  await new Promise((r) => setTimeout(r, 200));
  d.damage(1);
  await new Promise((r) => setTimeout(r, 900));
  out.wind = d.state;
  const hpWind = d.hp;
  await new Promise((r) => setTimeout(r, 2800));
  out.healed = d.hp === hpWind + 1;
  g.godMode = false;
  return out;
});
check(p2.wind === 'wind' && p2.healed, `phase 2: an unanswered Rewind undoes a hit (${JSON.stringify(p2)})`);
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
  d.clearShots();
  d.state = 'tired';
  d.t = 9;
  const guarded = !d.open;
  g.kit.equip('seal', true);
  for (const n of g.hallSquirrels) {
    g.player.place(n.x - 1.6, 86, n.z);
    g.player.facing = 1;
    await new Promise((r) => setTimeout(r, 80));
    g.kit.fire();
    await new Promise((r) => setTimeout(r, 400));
  }
  return { guarded, held: g.state.flags.zachHeld && g.state.flags.meganHeld, openAfter: d.open };
});
check(sq.guarded && sq.held && sq.openAfter, `his guard holds until both squirrels are held (${JSON.stringify(sq)})`);
// the Page Turn: unlit costs a heart; lit, she's safe
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
  if (!g.powers.lit) g.powers.lit = true;
  d.nextPattern(0);
  d.queue = [{ do: 'page' }, { do: 'wait', t: 9 }];
  for (let i = 0; i < 160; i++) {
    if (d.page && d.page.passed) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  return { max: g.player.maxHp, unlit, lit: g.player.hp };
});
check(page1.unlit === page1.max - 1 && page1.lit === page1.max, `the Page Turn: unlit, a heart; lit, safe (${JSON.stringify(page1)})`);
// the end
await G(() => { const g = __game, d = g.duel; g.powers.lit = false; d.state = 'tired'; d.t = 3; d.hp = 1; d.damage(1); });
const end = await page.waitForFunction(() => __game.mode === 'credits', { timeout: 150000 }).then(() => true).catch(() => false);
s = await G(() => ({ mode: __game.mode, f: { won: __game.state.flags.duelWon, home: __game.state.flags.hoursReturned, finished: __game.state.flags.finished } }));
check(end && s.f.won && s.f.home && s.f.finished, `beaten: what she knows, Lyra, the summit, the credits (${JSON.stringify(s)})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await browser.close();
