# Headless playtests

Scripted runs that drive the real game in headless Chrome with real key presses.

```bash
npm install --no-save puppeteer-core
npm run dev                       # in another terminal
export GAME_URL=http://localhost:5173/
node tools/playtest/smoke.mjs              # both chapters: title, chapter cards, new game, save, Continue
node tools/playtest/saltwick-play.mjs      # Chapter Two, the whole story, every puzzle solved honestly
node tools/playtest/saltwick-side.mjs      # Chapter Two: favors, hazards, the Warden, cogs, the world after the story
node tools/playtest/reach.mjs hollowmere   # tools/reachability/hollowmere.js: nowhere traps you
node tools/playtest/reach.mjs saltwick     # tools/reachability/saltwick.js: every gate holds, nothing traps you
```

Set `CHROME` to a Chrome binary if the default path in `lib.mjs` isn't on your machine. Every line should say `PASS`. Each run starts from a clean save with every chapter unlocked. Don't edit source files while one is running: the dev server's reload restarts the game under it.

There is no scripted playthrough of Chapter One yet.
