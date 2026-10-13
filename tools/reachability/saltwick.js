// Dev tool: do the gates hold, and can the player always get back to the start? Run in the
// browser console on the dev server:
//   const r = await import('/tools/reachability/saltwick.js'); r.checkAll(window.__game)
//
// It walks the voxel world roughly the way the player moves (walk, 1-block jump-ups, gap jumps,
// falls, ladders, swimming, era switches one age at a time with the same safety rules as
// Game.tryShift, including switching in mid-jump) for a series of story states. For each it
// reports how far east you can get, and any place you can reach but can't walk back from.
// The model is generous (it jumps a little further than Vivienne does), so "can't get past" is
// trustworthy; "stuck" is a prompt to go and look.
import { T, W, YMIN, YMAX } from '../../src/world/world.js';
import { L, SEALED, WELL } from '../../src/chapters/saltwick/level.js';

// The story so far, one step at a time: each stage adds to the one before it.
// limit: [era, x] pairs you must NOT be able to reach yet at this stage (era -1 = any).
export const STAGES = [
  ['start', {}, { maxX: L.rockX0 - 0.5, note: 'the tide gate holds' }],
  ['tide gate passed', { hasRewind: true, tideGatePassed: true }, { maxX: L.wallX0 - 0.5, note: 'the sea wall holds' }],
  ['nets strung', { fenceBuilt: true }, { maxX: L.chanX1 + 0.5, note: 'the Dry Lock holds' }],
  ['lamp lit', { lampLit: true, hasReach: true }, { maxX: L.chanX1 + 0.5, note: 'the Dry Lock holds' }],
  ['lock door passed', { lockPassed: true, pitLeft: true }, { maxX: L.wellX0 + 0.5, note: 'the Well door holds' }],
  ['Well open', { wellOpen: true }, { maxX: WELL.terraces[0].x1 + 0.5, note: 'gate A holds' }],
  ['gate A', { gateA: true }, { maxX: WELL.terraces[1].x1 + 0.5, note: 'gate B holds' }],
  ['gate B', { gateB: true }, { maxX: WELL.terraces[2].x1 + 0.5, note: 'gate C holds' }],
  ['gate C passed', { gateCPassed: true }, { maxX: W }],
  ['tide restored', { heartPlaced: true, wellFull: true, tideRestored: true, finished: true }, { maxX: W }],
];

const ZS = 7;
const key = (e, x, y, z) => ((e * W + x) * (YMAX - YMIN) + (y - YMIN)) * ZS + z;
const dec = (k) => {
  const z = k % ZS; k = (k - z) / ZS;
  const y = (k % (YMAX - YMIN)) + YMIN; k = (k - (y - YMIN)) / (YMAX - YMIN);
  const x = k % W;
  return [(k - x) / W, x, y, z];
};

export function check(game) {
  const w = game.world;
  const cell = (e, x, y, z) => (y >= YMAX ? T.AIR : w.cell(e, x, y, z));
  const free = (e, x, y, z) => { const c = cell(e, x, y, z); return c !== T.SOLID; };
  const fits = (e, x, y, z) => free(e, x, y, z) && free(e, x, y + 1, z);
  const hazard = (e, x, y, z) => cell(e, x, y, z) === T.HAZARD;
  const supported = (e, x, y, z) => {
    const c = cell(e, x, y, z);
    return c === T.WATER || c === T.LADDER || cell(e, x, y - 1, z) === T.SOLID;
  };
  /** Where a body dropped into (x, y, z) comes to rest; null if it can't be there or ends in a hazard. */
  const settle = (e, x, y, z) => {
    if (x < 0 || x >= W || z < 0 || z >= ZS || !fits(e, x, y, z)) return null;
    for (let yy = y; yy >= YMIN; yy--) {
      if (hazard(e, x, yy, z)) return null;
      if (supported(e, x, yy, z)) return key(e, x, yy, z);
    }
    return null;
  };
  const canShiftAt = (e, x, y, z) => {
    if (!fits(e, x, y, z)) return false;
    let ground = false;
    for (let yy = y; yy >= y - 3; yy--) { const c = cell(e, x, yy, z); if (c === T.SOLID || c === T.WATER || c === T.LADDER) ground = true; }
    if (!ground) return false;
    for (let yy = y; yy >= -6; yy--) { const c = cell(e, x, yy, z); if (c === T.HAZARD) return false; if (c !== T.AIR) break; }
    return true;
  };
  const edges = (k) => {
    const [e, x, y, z] = dec(k), out = [];
    const c = cell(e, x, y, z);
    const push = (n) => { if (n !== null && n !== k) out.push(n); };
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // walk (and fall), or hop up one
      push(settle(e, x + dx, y, z + dz));
      if (free(e, x, y + 2, z) && fits(e, x + dx, y + 1, z + dz) && supported(e, x + dx, y + 1, z + dz) && !hazard(e, x + dx, y + 1, z + dz)) push(key(e, x + dx, y + 1, z + dz));
      // gap jumps: up to 4 cells across at the same height or lower, 3 if landing one higher
      if (c !== T.WATER && free(e, x, y + 2, z)) {
        for (let d = 2; d <= 4; d++) {
          let clear = true;
          for (let i = 1; i < d && clear; i++) clear = fits(e, x + dx * i, y + 1, z + dz * i);
          if (!clear) break;
          const tx = x + dx * d, tz = z + dz * d;
          if (d <= 3 && fits(e, tx, y + 1, tz) && supported(e, tx, y + 1, tz) && !hazard(e, tx, y + 1, tz)) push(key(e, tx, y + 1, tz));
          push(settle(e, tx, y + 1, tz));
        }
      }
    }
    // ladders and swimming
    if (c === T.LADDER || c === T.WATER) {
      if (fits(e, x, y + 1, z) && !hazard(e, x, y + 1, z)) {
        const up = cell(e, x, y + 1, z);
        if (up === T.LADDER || up === T.WATER) push(key(e, x, y + 1, z));
        else {
          // off the top: onto whatever is beside it
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (fits(e, x + dx, y + 1, z + dz) && supported(e, x + dx, y + 1, z + dz) && !hazard(e, x + dx, y + 1, z + dz)) push(key(e, x + dx, y + 1, z + dz));
        }
      }
      if (fits(e, x, y - 1, z) && !hazard(e, x, y - 1, z) && cell(e, x, y - 1, z) !== T.SOLID) push(settle(e, x, y - 1, z));
    }
    // era switches, one age at a time: where you stand, or anywhere a jump takes you
    for (const te of [e - 1, e + 1]) {
      if (te < 0 || te > 2) continue;
      for (let dx = -3; dx <= 3; dx++)
        for (const dy of [0, 1]) {
          if (dx || dy) {
            if (c === T.WATER || !free(e, x, y + 2, z)) continue;
            let clear = true;
            for (let i = Math.sign(dx); i !== dx + Math.sign(dx) && clear; i += Math.sign(dx) || 1) clear = fits(e, x + i, y + dy, z) || fits(e, x + i, y + 1, z);
            if (!clear || !fits(e, x + dx, y + dy, z)) continue;
          }
          if (canShiftAt(te, x + dx, y + dy, z)) push(settle(te, x + dx, y + dy, z));
        }
    }
    return out;
  };

  // 1. everywhere you can get to from the start
  const start = settle(1, Math.floor(L.start.x), 0, Math.floor(L.start.z));
  const fwd = new Map([[start, null]]);
  const order = [start];
  for (let i = 0; i < order.length; i++) {
    const es = edges(order[i]);
    fwd.set(order[i], es);
    for (const n of es) if (!fwd.has(n)) { fwd.set(n, null); order.push(n); }
  }
  // 2. from which of those can you get back?
  const back = new Map();
  for (const [k, es] of fwd) for (const n of es || []) (back.get(n) || back.set(n, []).get(n)).push(k);
  const home = new Set([start]);
  const q = [start];
  for (let i = 0; i < q.length; i++) for (const p of back.get(q[i]) || []) if (!home.has(p)) { home.add(p); q.push(p); }
  const f = game.state.flags;
  const sealed = (e, x, y, z) => SEALED.some((s) => s.era === e && !f[s.until] && x + 0.5 >= s.x0 && x + 0.5 < s.x1 && z + 0.5 >= s.z0 && z + 0.5 < s.z1 && y >= s.y0 && y <= s.y1);
  const stuck = [...fwd.keys()].filter((k) => !home.has(k)).map(dec).filter(([e, x, y, z]) => !sealed(e, x, y, z));
  const far = [0, 0, 0];
  for (const k of fwd.keys()) { const [e, x] = dec(k); far[e] = Math.max(far[e], x); }
  return { reachable: fwd.size, far, stuck: summarize(stuck), has: (e, x, y, z) => fwd.has(key(e, x, y, z)) };
}

const ERA_NAMES = ['Past', 'Present', 'Future'];
function summarize(stuck) {
  const cols = new Map();
  for (const [e, x, y] of stuck) {
    const k = e * 1000 + x;
    const c = cols.get(k) || cols.set(k, [y, y]).get(k);
    c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y);
  }
  const out = [];
  let run = null;
  for (const k of [...cols.keys()].sort((a, b) => a - b)) {
    const e = Math.floor(k / 1000), x = k % 1000, [y0, y1] = cols.get(k);
    if (run && run.e === e && x === run.x1 + 1) { run.x1 = x; run.y0 = Math.min(run.y0, y0); run.y1 = Math.max(run.y1, y1); } else {
      if (run) out.push(run);
      run = { e, x0: x, x1: x, y0, y1 };
    }
  }
  if (run) out.push(run);
  return out.map((r) => `${ERA_NAMES[r.e]} x${r.x0}-${r.x1} (y ${r.y0}..${r.y1})`);
}

/** Apply each story stage in turn and check it. It changes the save state: start a new game afterward. */
export function checkAll(game, stages = STAGES) {
  const results = [];
  for (const [name, flags, want] of stages) {
    Object.assign(game.state.flags, flags);
    game.setMood();
    game.refreshWorld();
    for (const gt of game.craft.gates) gt.update(0);
    const r = check(game);
    const farthest = Math.max(...r.far);
    results.push({ stage: name, far: r.far.join(' / '), holds: farthest <= want.maxX ? (want.note || 'ok') : `BROKEN: reached x=${farthest}, expected at most ${want.maxX}`, stuck: r.stuck });
  }
  return results;
}
