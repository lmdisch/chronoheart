// Chapters: which one this page load is running, and the one save they all share.
//
// Chronoheart is one game in chapters. Each chapter has its own level, story and rules (see
// src/chapters/<id>/), built on the shared engine. A page load runs exactly one chapter: picking
// another on the title screen stores the choice and reloads, so nothing of one chapter's world
// is ever left behind in the next. This module has no engine imports, so anything may import it.
import hollowmere from './chapters/hollowmere/theme.js';
import saltwick from './chapters/saltwick/theme.js';

export const CHAPTERS = [
  {
    id: 'hollowmere',
    number: 1,
    numeral: 'I',
    label: 'Chapter One',
    title: 'The Clocktower of Hollowmere',
    tagline: 'Change the past. Borrow from the future. Restart the Clocktower of Hollowmere.',
    blurb: 'The great Clocktower has stopped, and the valley is coming loose in time.',
    eras: ['Ancient', 'Medieval', 'Chrome'],
    credits: {
      eyebrow: 'The Clocktower ticks again',
      bonus: 'You found every Lost Cog! Donald Eugene has fitted them to the Chronoheart: in Chapter Two, Lost Cogs glint through the time lens.',
      // (not shown once every cog is found)
      more: 'Your save is kept: choose Continue to walk the valley with the Tower ticking. Bring Donald Eugene all ten Lost Cogs, in his workshop, and he has something for the Chronoheart.',
    },
    theme: hollowmere,
    requires: null,
    keepsSave: true, // the Tower keeps ticking: you can keep walking the valley after the credits
  },
  {
    id: 'saltwick',
    number: 2,
    numeral: 'II',
    label: 'Chapter Two',
    title: 'The Backward Tide',
    tagline: 'The sea has gone out of Saltwick, and it is not coming back. Not unless someone winds it forward.',
    blurb: 'Three weeks after the Clocktower restarts, the tide goes out of Saltwick and stays out.',
    eras: ['The Age of Tides', 'Saltwick', 'The Dry Age'],
    credits: {
      eyebrow: 'The tide is in',
      bonus: 'You found every Lost Cog! Donald Eugene is building you a pocketwatch of your own: Rewind is yours for good.',
      // (not shown once every cog is found)
      more: 'Your save is kept: choose Continue to walk the shore with the tide back in. Bring Donald Eugene all twelve Lost Cogs, and he can build you a watch of your own.',
    },
    theme: saltwick,
    requires: 'hollowmere',
    keepsSave: true, // the tide stays in: you can keep walking the shore after the credits
  },
];

// Storage can be unavailable (private windows, embedded viewers): the game still runs, it just won't save.
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* saving unavailable */ } },
  session: (k, v) => {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      sessionStorage.setItem(k, v);
    } catch { /* unavailable */ }
    return null;
  },
};
const parse = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

const SAVE_KEY = 'chronoheart-save-v2';
const PICK_KEY = 'chronoheart-chapter';
// the two games' own saves, from before they were chapters of one
const OLD_KEYS = { hollowmere: 'chronoheart-save-v1', saltwick: 'chronoheart2-save-v1' };

/**
 * { v, slots: { [chapter id]: saved state }, done: { [chapter id]: true }, rewards: { [id]: true },
 *   unlocked, last }. Rewards are earned in one chapter and carried into the others.
 */
function loadSave() {
  const cur = parse(store.get(SAVE_KEY));
  if (cur?.v === 2) return { slots: {}, done: {}, rewards: {}, ...cur };
  // first run of the combined game: bring over whatever the separate games had saved
  const save = { v: 2, slots: {}, done: {}, rewards: {}, unlocked: false, last: null };
  for (const id of Object.keys(OLD_KEYS)) {
    const old = parse(store.get(OLD_KEYS[id]));
    if (!old?.flags) continue;
    if (old.flags.finished) save.done[id] = true;
    const ch = CHAPTERS.find((c) => c.id === id);
    if (!old.flags.finished || ch.keepsSave) save.slots[id] = old;
    // someone already walking the shore is never sent back to earn it
    if (ch.requires) save.done[ch.requires] = true;
    save.last = id;
  }
  return save;
}

const save = loadSave();
const write = () => store.set(SAVE_KEY, JSON.stringify(save));

// `#unlock` on the address opens every chapter, for good (for testing, and for anyone who
// finished Chapter One before finishing it was written down anywhere)
let hash = '';
try { hash = location.hash.replace('#', ''); } catch { /* no address to read */ }
if (hash === 'unlock' && !save.unlocked) {
  save.unlocked = true;
  write();
}

export const progress = {
  /** This chapter's saved game, or null. */
  slot: (id) => save.slots[id] || null,
  setSlot(id, state) {
    save.slots[id] = state;
    save.last = id;
    write();
  },
  clearSlot(id) {
    delete save.slots[id];
    write();
  },
  isDone: (id) => !!save.done[id],
  markDone(id) {
    save.done[id] = true;
    write();
  },
  /** Something earned in one chapter that the others carry: 'cogFinder' (all of Chapter One's cogs). */
  hasReward: (id) => !!save.rewards[id],
  grantReward(id) {
    save.rewards[id] = true;
    write();
  },
  /** Open to play? The first chapter always is; each later one once the one before it is finished. */
  isOpen: (ch) => !ch.requires || !!save.done[ch.requires] || !!save.unlocked,
  unlockAll() {
    save.unlocked = true;
    write();
  },
};

function pickChapter() {
  const fromHash = /^chapter-?(\d)$/.exec(hash)?.[1];
  // (a choice made on the title screen beats the address it was first opened with)
  const picked = store.session(PICK_KEY) || CHAPTERS[fromHash - 1]?.id || store.get(PICK_KEY) || save.last;
  const ch = CHAPTERS.find((c) => c.id === picked);
  return ch && progress.isOpen(ch) ? ch : CHAPTERS[0];
}

/** The chapter this page load is running. */
export const chapter = pickChapter();
export const theme = chapter.theme;

/** Leave for another chapter: remember the choice and start the page afresh on it. */
export function switchChapter(id) {
  store.session(PICK_KEY, id);
  store.set(PICK_KEY, id);
  location.reload();
}

/**
 * The running chapter's words and counts (ITEMS, FAVORS, COG_TOTAL), for the shared UI and
 * entities. Filled in by main.js before the game is built, and only read while it runs.
 */
export const content = {};
