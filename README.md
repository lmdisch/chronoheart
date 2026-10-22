# Chronoheart

**A time-travel puzzle adventure, told in chapters.**

Vivienne is a clockmaker's apprentice with an amulet, the **Chronoheart**, that lets her step between three ages of the same place: its Past, its Present and its Future. Each chapter is one long road, built three times, where what you do in one age carries forward into the later ones.

| | Chapter | Where | What's new |
| --- | --- | --- | --- |
| **I** | [The Clocktower of Hollowmere](docs/chapter-1-hollowmere.md) | A valley town whose great Clocktower has stopped | The Chronoheart itself, then the Stasis ring, Echoes and Tempo, from Donald Eugene's locked strongboxes |
| **II** | [The Dry Harbor](docs/chapter-2-saltwick.md) | The harbor town of Saltwick, fifty years into a drought | A mended Chronoheart, Rewind (run yourself backward), and reaching through the time lens |
| **III** | [The Other Half](docs/chapter-3-highcrest.md) | Highcrest, the mountain above them both, at Midwinter: a climb to the top of the world | The Lantern (carry a bubble of another age), Echoes that wait for you, and the Stasis wave |

The story across all three is in [docs/story.md](docs/story.md) (spoilers).

Each chapter's guide has its controls, a full walkthrough, every Lost Cog and every favor.

Every world, sprite, melody and sound in the game is generated from code: there are no image or audio files.

**Play it:** <https://claude.ai/artifact/NyZQbGZhqM59hCKBWJQgiX>

---

## Contents

- [Chapters and saving](#chapters-and-saving)
- [Controls](#controls)
- [Running it locally](#running-it-locally)
- [Project structure](#project-structure)
- [How a chapter is put together](#how-a-chapter-is-put-together)
- [Testing](#testing)
- [Publishing the live page](#publishing-the-live-page)

---

## Chapters and saving

- **The title screen has a card for each chapter.** The lit card is the chapter showing behind the title; Continue and New Game act on it. Pick another card to switch.
- **Each chapter is locked until the one before it is finished.** Finishing a chapter opens the next, and the credits offer to take you straight there.
- **One save holds everything**: a slot for each chapter, plus which chapters are finished. It lives in your browser's local storage, so it stays on that browser and that address. Saves from before the two games were combined are brought over the first time the combined game runs.
- **Every chapter keeps its save after the story.** Choose Continue to walk the valley with the Clocktower ticking, or the shore with the river back in.
- **Some rewards carry over.** Bring all ten of Chapter One's Lost Cogs to Donald Eugene and you start Chapters Two and Three with the **Cog Finder**: under your hearts, it points to the nearest Lost Cog and says which age it's in. Earn your own pocketwatch in Chapter Two, and your echo in Chapter Three remembers longer (8 seconds) and holds 4 echoes at once. Bring Orin all ten Lost Cogs in Chapter Three for **The Master's Key**, which opens the secret **Astral Clock-Door** in Hollowmere Square (**The Starlit Garden, 10,000 Years On**). (The save records them under `rewards`.) **Hearts carry over too:** every heart a favor earned in an earlier chapter is added to the five you start each later chapter with.
- **Vivienne dresses for the place.** In Hollowmere she wears her teal workshop tunic and leather apron. In Saltwick she has a navy sea-coat, a red neckerchief, sailcloth trousers and yellow sea-boots. On Highcrest, a teal wool coat with a fur hem, a mustard scarf, and red earmuffs and mittens. The goggles and the amulet go wherever she does.
- **Equipment (the Menu's left side: Vivienne as she is, her clothes and her wrench's parts)** carries between chapters (the save records it under `kit`). **Clothes:** any outfit from a chapter you've reached; the sea-coat lets you hold your breath half as long again. **Wrench:** the Chronoheart is the power, the wrench is how Vivienne aims it. Donald Eugene's parts fit its head, and each sends its own wave (hold `X`, let go) at the first thing in front of her, which glows first: the **Stasis ring** holds it in its moment (a held creature stays held until struck, and then shatters), the **Escapement** slows it, the **Hairspring** sends it back a few seconds (it runs back along its path, played backward; a pushed block slides back to where it was pushed from). She always has the wrench in hand, and the part's light glows at its head, so you can see what's fitted. `T` changes parts; they carry into every later chapter. A part is learned only when found in that chapter's playthrough, so a replay starts with a plain wrench. The menu also lists every power the Chronoheart has learned, and where it works.
- **Locks.** Everything Donald Eugene leaves for Vivienne is padlocked. She picks the locks herself (`src/ui/lockpick.js`): a pick sweeps under the pins, and `X` (or a tap) sets a pin when it's under the gold mark.

To open every chapter without finishing the one before (for testing, or if you finished Chapter One before the game kept a record of it), add `#unlock` to the address once, or run `__unlockChapters()` in the browser console.

---

## Controls

These are the same in every chapter. Each chapter's guide lists the powers it adds.

| Key | Action |
| --- | --- |
| `A` `D` | Move left / right |
| `W` `S` | Move into / out of the scene; climb ladders |
| `Space` | Jump (hold for a higher jump); hold to swim upward (underwater, watch your breath) |
| `Shift` | Sprint |
| `C` | Dodge-roll |
| `X` | Swing your wrench; hold and let go for a wave from the part on its head |
| `T` | Change the part on your wrench |
| `F` | Interact: talk to people, use things |
| `Q` / `E` | Travel one era back / forward |
| `Tab` | Time lens: hold to open a window onto another era around you (`Q`/`E` choose which) |
| `I` | Menu: goal, hint, items, favors |
| `G` | Open the Menu with the hint showing |
| `H` | Controls |
| `Esc` / `P` | Pause |

On a touch screen, on-screen controls appear automatically: a joystick on the left, Jump, Attack, Roll and Interact on the right, and a swipe (left for the Future, right for the Past) to travel.

---

## Running it locally

You need [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (what Vite 8 requires).

```bash
npm install
npm run dev      # dev server with hot reload, usually http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

The only runtime dependency is [three.js](https://threejs.org/). The build tool is [Vite](https://vitejs.dev/).

Handy for debugging: the game object is exposed as `window.__game` in the browser console. Add `#chapter-2` to the address to open straight onto a chapter (if it's unlocked).

---

## Project structure

```
index.html                the page: HUD, dialogue box, title and chapter select, menus (HTML/CSS over a WebGL canvas)
src/
  main.js                 start-up, the title screen and chapter select, the pause / Controls / Menu overlays, credits
  chapter.js              the list of chapters, which one this page load is running, and the save they share
  game.js                 the game every chapter shares: modes, era shifting, the time lens, saving, favors, time-lapses, ripples, the Cog Finder
  kit.js                  what carries between chapters: clothes, the wrench and its parts (the waves), the list of powers
  chapters/
    hollowmere/           Chapter One
      theme.js              its skies, color grades, music, era names and colors (plain data)
      level.js              the whole valley in all three ages: layout, features, spawns, cogs
      story.js              items, favors, all dialogue, and every interaction
      objectives.js         the goal and hint for wherever you are and whatever you've done
      game.js               HollowmereGame: the draining meter, the hideaway, the Era Keys, the ending
      abilities.js          the Stasis Seal, the Echo, and the Echo Gallery's gates, buttons and steps
      gearworks.js          Tempo, and the Gearworks' hammers, spring plates and lift
      finale.js             the Clocktower finale: the great piston, the gears, the lurch as each key goes in
      entities.js           its own things to use and strike (the lever, the workbench, the sockets, the plugs)
    saltwick/             Chapter Two
      theme.js              the same, for the shore (and the Future before and after the tide comes home)
      level.js              the whole shore in all three ages: layout, features, gates, spawns, cogs
      story.js              items, favors, all dialogue, and every interaction
      objectives.js         the goal and hint
      game.js               SaltwickGame: reaching through the lens, Rewind, the Wellhead, the ending
      timecraft.js          Rewind, the timed gates, and the flood that carries you out of the Well
    summit/               Chapter Three, Highcrest
      theme.js              skies (aurora, the near moon, the cloud sea), music, and the ages after the ending
      level.js              the whole mountain in all three ages: the switchback road, the frost
      vista.js              the view from the top: the peninsula far below in voxel miniature (Hollowmere, Saltwick),
                            its sea, and the far ranges on the horizon in pixel art
      story.js              items, favors, every line of dialogue, the endings
      objectives.js         the goal and hint
      game.js               SummitGame: the frost, the shimmer, the End of Time, the ending
      duel.js               the duel with Donald Eugene: his patterns, his bolts, the floor he rewrites (and its void), the Page Turn
      powers.js             the Lantern, the Echo, pressure plates and gates
  core/                   input (keyboard + virtual keys), small utilities
  world/                  voxel world and collision, physics, the shared entities (player, NPCs, enemies, the Warden, bells...)
  render/                 renderer, post-processing, procedural textures and sprites, the 3D characters, the cloud sea, mountain terrain, water and mud, foliage, particles,
                          and fx.js: pixel-art cards of light (the wrench's waves, his bolts) and afterimages
  audio/                  procedural music (one layer per age, the tune from the chapter) and sound effects
  ui/                     HUD and dialogue, touch controls, picking locks, styles
tools/
  reachability/           per chapter: do the gates hold, and can you always walk back to the start?
  playtest/               headless scripted playtests (see its README)
docs/                     each chapter's player guide: how to play, walkthrough, cogs, favors, secrets
IDEAS.md                  the story's decisions, and ideas that were considered
```

---

## How a chapter is put together

**One chapter runs per page load.** `src/chapter.js` decides which (the card you picked, else the last one you played), and exports its `theme`. Choosing another chapter stores the choice and reloads the page, so nothing of one chapter's world is ever left behind in the next.

**The engine is shared, and reads the chapter's theme.** The renderer takes its skies from `theme.atmos`, the music its tune from `theme.music`, the sprite sheet for Vivienne from `theme.playerSheet`, and so on. `theme.js` is plain data with no engine imports.

**A chapter's rules are a subclass of `Game`.** `src/game.js` has everything the chapters share. Each chapter's `game.js` extends it and fills in the hooks listed at the top of the class (`setup`, `canShift`, `updatePlay`, `runEnding`...), which is where its powers and set pieces live.

**Characters are drawn from their sprite sheets** (`src/render/sprites.js`: the palettes in `CHAR`, and a sheet per character). `src/render/actors.js` gives them depth (Pixel Relief): each frame is pushed out into cubes, thickest in the middle, so characters take real light and cast real shadows. A new character only needs a sheet.

**A level is a voxel grid, built once for each age** by the chapter's `level.js`. Things that change with your actions (an eroded cliff, an oak, a dune, the sea itself) are **features**: small builders keyed on save flags, rebuilt whenever those flags change. Time-lapses grow, drop or float those features into place.

**Adding a chapter:** make `src/chapters/<id>/` with the same files, add it to `CHAPTERS` in `src/chapter.js` (with `requires` set to the chapter before it), and add its game class to `GAMES` in `src/main.js`. Anything only one chapter shows in the page (a line of help text, say) gets an `only-<id>` class in `index.html`.

Chapter One's valley is **346 units long** (the last 40 are the Gearworks, inside the clock). Chapter Two's shore is **300**. Chapter Three is a mountain: a road **100** long climbing its face in six switchback legs, each 16 further back and about 14 higher than the last, 77 to the top. It needs a few engine options: `theme.openDepth` (the road leaves the usual strip and winds back into the scene, walled by rock and barriers), `theme.zMin` / `yMax` (a bigger world), `theme.slopes` (you walk up and down single steps), and the terrain past the voxels is built from the same height function as columns of blocks (`src/render/mountains.js`), out to the ranges either side. Far below through the clouds, the peninsula with Hollowmere and Saltwick is a voxel miniature (a block to every two units), and the ranges on the horizon are painted pixel art (both in the chapter's `vista.js`). Where each area begins is in `AREAS` in the chapter's `level.js`.

---

## Testing

**Reachability.** Each chapter has a check that replays its story one stage at a time and, for each, maps everywhere the player can get to (walking, jumping, ladders, swimming, era switches). With the dev server running and a new game started in that chapter, run in the browser console:

```js
const r = await import('/tools/reachability/hollowmere.js'); r.checkAll(window.__game)   // Chapter One
const r = await import('/tools/reachability/saltwick.js'); console.table(r.checkAll(window.__game))   // Chapter Two
```

Every stage should say `stuck: []`, and in Chapter Two that its gate holds. Start a new game afterward, since it changes the save state.

**Scripted playtests.** `tools/playtest/` drives the real game in headless Chrome with real key presses: a smoke test of both chapters, a full playthrough of each chapter, and checks of Chapter One's systems and Chapter Two's side content. See [tools/playtest/README.md](tools/playtest/README.md).

---

## Publishing the live page

The live game is a single self-contained HTML page (a claude.ai artifact), not the `dist/` output. It's assembled like this:

1. Build the game code **unminified**, with `three` left external, as one ES module.
2. Inline `src/ui/style.css` into a `<style>` tag, and copy the `<main id="app">…</main>` markup from `index.html`.
3. Add an import map that loads `three` (and `three/examples/jsm/`) from jsDelivr, version 0.186.0.
4. Add the module script, starting with `document.body.dataset.era = 'present';`.

Smoke-test the assembled page locally (serve it, start a new game in each chapter, switch chapters from the title) before publishing.
