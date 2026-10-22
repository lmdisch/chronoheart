# Headless playtests

Scripted runs that drive the real game in headless Chrome with real key presses.

```bash
npm install --no-save puppeteer-core
npm run dev                       # in another terminal
export GAME_URL=http://localhost:5173/
node tools/playtest/smoke.mjs              # both chapters: title, chapter cards, new game, save, Continue
node tools/playtest/hollowmere-play.mjs    # Chapter One, the whole story, every puzzle solved honestly, then the
                                           #   valley after the story and the Cog Finder carried into Chapter Two
node tools/playtest/hollowmere-check.mjs   # Chapter One's systems one at a time, the ending, old saves brought over
node tools/playtest/saltwick-play.mjs      # Chapter Two, the whole story, every puzzle solved honestly
node tools/playtest/saltwick-side.mjs      # Chapter Two: favors, hazards, the Warden, cogs, the world after the story
node tools/playtest/summit-play.mjs        # Chapter Three, the whole climb: every Lantern and Echo puzzle, the favors,
                                           #   Don's notebooks, the duel at the End of Time (in god mode), the night after
node tools/playtest/duel-check.mjs         # Chapter Three's duel with Donald Eugene: his bolts (dodged, rolled), his guard, the floor, the Rewind
                                           #   wind-up, the squirrels, the Page Turn, and the win
node tools/playtest/wrench-check.mjs       # the wrench's parts (learned, carried, swapped), freeze-and-shatter, the
                                           #   Escapement and Hairspring, a lock left and a lock picked, Reach to cogs and people
node tools/playtest/dusk.mjs               # Chapter Two's Dusk Bell showdown with the Harbor Warden, on its own
node tools/playtest/garden.mjs             # Chapter One's Astral Clock-Door: shut without the Master's Key, the Starlit Garden with it
node tools/playtest/reach.mjs hollowmere   # tools/reachability/hollowmere.js: nowhere traps you
node tools/playtest/reach.mjs saltwick     # tools/reachability/saltwick.js: every gate holds, nothing traps you
```

Set `CHROME` to a Chrome binary if the default path in `lib.mjs` isn't on your machine. Every line should say `PASS`. Each run starts from a clean save with every chapter unlocked.

Don't edit source files while one is running: the dev server's reload restarts the game under it. Anything else that touches the files (a cloud-synced folder, say) does the same. If that happens, serve the game without watching instead, and restart it after each edit: a Vite config with `server: { watch: null, hmr: false }`.

Headless Chrome is started with vsync off (see `lib.mjs`): on a Mac whose screen is asleep or locked, it otherwise stops drawing frames, and the game stands still mid-run.
