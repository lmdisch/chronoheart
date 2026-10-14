// Dev tool: can the player always get back to the start? Run in the browser console on the dev
// server:  const r = await import('/tools/reachability/hollowmere.js'); r.checkAll(window.__game)
//
// It walks the voxel world the way the player moves (walk, 1-block jump-ups, short gap jumps,
// falls, ladders, swimming, era switches with the same safety rules as Game.tryShift) for a
// series of story states, and reports any place you can reach but can't get back from.
import { T, W, YMIN, YMAX } from '../../src/world/world.js';
import { L } from '../../src/chapters/hollowmere/level.js';

// The story so far, one step at a time: each stage adds to the one before it.
export const STAGES = [
  ['start', { hasAmulet: true }],
  ['cliff lever', { springOpen: true }],
  ['acorn (Past)', { acornPlanted: true }],
  ['sun block', {}, (s) => (s.blockPos = { ...L.pillarTarget })],
  ['gatehouse shutter', { shutterBroken: true }],
  ['boulder in gully', { millDammed: true }],
  ['sluice closed', { sluiceClosed: true }],
  ['bridge built', { bridgeBuilt: true }],
  ['bridge sealed', { bridgeSealed: true }],
  ['gallery gates passed', { galleryGatesPassed: true }],
  ['gallery climbed', { galleryClimbed: true }],
  ['tower open', { towerUnlocked: true }],
];
// the other way through Rampart Row
export const ALT = [['acorn (Present) only', { hasAmulet: true, springOpen: true, acornPlantedM: true }]];

// Steps you can take in the Past or Future before the Chronoheart runs out (about 30 seconds of
// walking at 4.6 cells a second, less a margin for climbing and fumbling).
export const BUDGET = 110;

export function check(game, { maxX = W - 1, budget = BUDGET, maxGap = 3 } = {}) {
  const w = game.world;
  const S = T.SOLID, H = T.HAZARD, Wt = T.WATER, Ld = T.LADDER;
  const c = (e, x, y, z) => w.cell(e, x, y, z);
  const free = (e, x, y, z) => {
    const t = c(e, x, y, z);
    return t !== S && t !== H;
  };
  const body = (e, x, y, z) => free(e, x, y, z) && free(e, x, y + 1, z);
  const key = (e, x, y, z) => ((e * W + x) * 64 + (y - YMIN)) * 8 + z;
  const dec = (k) => {
    const z = k % 8, y = (Math.floor(k / 8) % 64) + YMIN, x = Math.floor(k / 512) % W, e = Math.floor(k / 512 / W);
    return [e, x, y, z];
  };
  // fall from (x, y, z) until something holds you: ground, water or a ladder
  const settle = (e, x, y, z) => {
    for (; y > YMIN + 1; y--) {
      if (!body(e, x, y, z)) return null;
      const t = c(e, x, y, z), below = c(e, x, y - 1, z);
      if (t === Wt || t === Ld || below === S || below === Ld) return key(e, x, y, z);
      if (below === H) return null;
    }
    return null;
  };
  const grounded = (e, x, y, z) => c(e, x, y - 1, z) === S || c(e, x, y - 1, z) === Ld;
  const edges = (k) => {
    const [e, x, y, z] = dec(k), out = [];
    const push = (n, cost = 1) => n !== null && out.push([n, cost]);
    const swim = c(e, x, y, z) === Wt, ladder = c(e, x, y, z) === Ld || c(e, x, y + 1, z) === Ld;
    const canJump = grounded(e, x, y, z) || swim || ladder;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nx > maxX) continue;
      if (body(e, nx, y, nz)) push(settle(e, nx, y, nz));
      // jump up one block
      if (canJump && free(e, x, y + 2, z) && !free(e, nx, y, nz) && body(e, nx, y + 1, nz) && c(e, nx, y, nz) === S) push(key(e, nx, y + 1, nz));
      // jump a gap of up to two cells (landing level or lower, or one higher after a single cell)
      if (grounded(e, x, y, z) && free(e, x, y + 2, z)) {
        for (let d = 2; d <= maxGap; d++) {
          let clear = true;
          for (let i = 1; i < d; i++) clear &&= body(e, x + dx * i, y, z + dz * i) && free(e, x + dx * i, y + 2, z + dz * i);
          if (!clear) break;
          const tx = x + dx * d, tz = z + dz * d;
          if (tx < 0 || tx > maxX) break;
          if (body(e, tx, y, tz)) push(settle(e, tx, y, tz), d);
          else if (d === 2 && c(e, tx, y, tz) === S && body(e, tx, y + 1, tz)) push(key(e, tx, y + 1, tz), d);
        }
      }
    }
    // swim up and down, climb ladders
    if ((swim && c(e, x, y + 1, z) === Wt) || (ladder && body(e, x, y + 1, z))) push(key(e, x, y + 1, z));
    if ((swim || ladder) && body(e, x, y - 1, z)) push(settle(e, x, y - 1, z));
    // era switches, with the game's own rules: room to stand, no hazard below, ground within 3
    for (const t of [e - 1, e + 1]) {
      if (t < 0 || t > 2 || !body(t, x, y, z)) continue;
      let ok = false;
      for (let yy = y; yy >= y - 3 && !ok; yy--) {
        const cc = c(t, x, yy, z);
        if (cc === H) break;
        ok = cc === S || cc === Wt || cc === Ld;
      }
      if (ok) push(settle(t, x, y, z), 2);
    }
    return out;
  };
  // 1. everything the player can reach at all, with the moves between
  const start = settle(1, Math.floor(L.start.x), 0, Math.floor(L.start.z));
  const fwd = new Map(), back = new Map([[start, []]]);
  const queue = [start];
  while (queue.length) {
    const k = queue.pop();
    const out = edges(k);
    fwd.set(k, out);
    for (const [n, cost] of out) {
      if (!back.has(n)) {
        back.set(n, []);
        queue.push(n);
      }
      back.get(n).push([k, cost]);
    }
  }
  const present = (k) => dec(k)[0] === 1;
  // a bucket queue for the two searches below (costs are small whole numbers)
  const search = (seeds, better, relax) => {
    // label-correcting: a value can drop below the bucket being worked on (back in the Present,
    // the cost resets to 0), so it goes in the current bucket and is checked by value
    const best = new Map(seeds);
    const buckets = [];
    const add = (k, v, at) => ((buckets[Math.max(v, at)] ||= []).push([k, v]));
    for (const [k, v] of seeds) add(k, v, 0);
    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b] || [];
      for (let i = 0; i < list.length; i++) {
        const [k, v] = list[i];
        if (best.get(k) !== v) continue;
        for (const [n, nv] of relax(k, v)) {
          if (nv === null || (best.has(n) && !better(nv, best.get(n)))) continue;
          best.set(n, nv);
          add(n, nv, b);
        }
      }
    }
    return best;
  };
  // 2. forward: the most Chronoheart charge (as budget used) you can arrive anywhere with
  const used = search([[start, 0]], (a, b) => a < b, (k, v) =>
    fwd.get(k).map(([n, cost]) => {
      const nv = present(n) ? 0 : v + cost;
      return [n, nv > budget ? null : nv];
    }));
  // 3. backward: the least charge you need left at each place to get home
  const homes = [...used.keys()].filter((k) => present(k) && dec(k)[1] <= 12).map((k) => [k, 0]);
  const need = search(homes, (a, b) => a < b, (k, v) =>
    (back.get(k) || []).filter(([p]) => used.has(p)).map(([p, cost]) => {
      if (present(p)) return [p, present(k) ? 0 : v + cost <= budget ? 0 : null];
      const nv = present(k) ? cost : v + cost;
      return [p, nv > budget ? null : nv];
    }));
  const seen = used;
  const home = new Set([...used.keys()].filter((k) => need.has(k) && need.get(k) + used.get(k) <= budget));
  // where you get stuck: reachable, but no way home
  const stuck = [...seen.keys()].filter((k) => !home.has(k)).map(dec);
  let farthest = 0;
  for (const k of seen.keys()) farthest = Math.max(farthest, dec(k)[1]);
  // the shortest way home from (era, x, z), as a list of era stretches, for explaining a route
  const routeHome = (e, x, z) => {
    let from = null;
    for (let y = YMIN + 1; y < YMAX - 1 && from === null; y++) if (used.has(key(e, x, y, z))) from = key(e, x, y, z);
    if (from === null) return null;
    // breadth-first over (place, charge used), so the route respects the Chronoheart's limit
    const sk = (k, u) => k * 64 + u;
    const homeSet = new Set(homes.map(([h]) => h));
    const start0 = sk(from, used.get(from));
    const prev = new Map([[start0, null]]);
    const q = [start0];
    let goal = null;
    for (let i = 0; i < q.length && goal === null; i++) {
      const k = Math.floor(q[i] / 64), u = q[i] % 64;
      for (const [n, cost] of fwd.get(k) || []) {
        const nu = present(n) ? 0 : u + cost;
        if (nu > budget) continue;
        const ns = sk(n, nu);
        if (prev.has(ns)) continue;
        prev.set(ns, q[i]);
        if (homeSet.has(n)) goal = ns;
        q.push(ns);
      }
    }
    if (goal === null) return null;
    const path = [];
    for (let k = goal; k !== null; k = prev.get(k)) path.unshift(dec(Math.floor(k / 64)));
    const legs = [];
    for (const [pe, px, py] of path) {
      const last = legs.at(-1);
      if (last && last.era === ERA_NAMES[pe]) (last.to = px), (last.steps += 1), (last.maxY = Math.max(last.maxY, py));
      else legs.push({ era: ERA_NAMES[pe], from: px, to: px, steps: 1, maxY: py });
    }
    return legs.map((l) => `${l.era} ${l.from}→${l.to} (${l.steps} steps, up to y${l.maxY})`);
  };
  return { reachable: seen.size, farthest, stuck, summary: summarize(stuck), routeHome };
}

const ERA_NAMES = ['Past', 'Present', 'Future'];
function summarize(stuck) {
  const groups = new Map();
  for (const [e, x, y, z] of stuck) {
    const k = `${ERA_NAMES[e]} x${x}`;
    if (!groups.has(k)) groups.set(k, new Set());
    groups.get(k).add(`y${y}z${z}`);
  }
  // merge neighboring x columns into ranges
  const out = [];
  for (const e of ERA_NAMES) {
    const xs = [...groups.keys()].filter((k) => k.startsWith(e + ' ')).map((k) => +k.split(' x')[1]).sort((a, b) => a - b);
    let a = null, prev = null;
    for (const x of [...xs, Infinity]) {
      if (a !== null && x !== prev + 1) {
        const ys = new Set();
        for (let i = a; i <= prev; i++) for (const s of groups.get(`${e} x${i}`)) ys.add(+s.slice(1).split('z')[0]);
        out.push(`${e} x${a}-${prev} (y ${Math.min(...ys)}..${Math.max(...ys)})`);
        a = null;
      }
      if (a === null) a = x;
      prev = x;
    }
  }
  return out;
}

/** Apply each story stage in turn and check it. Restores nothing: start a new game afterward. */
export function checkAll(game, stages = STAGES, opts = {}) {
  const results = [];
  for (const [name, flags, fn] of stages) {
    Object.assign(game.state.flags, flags);
    fn?.(game.state);
    game.refreshWorld();
    game.abilities.updateGallery?.(0);
    const r = check(game, opts);
    results.push({ stage: name, farthest: r.farthest, stuck: r.summary });
  }
  return results;
}
