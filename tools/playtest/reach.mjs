// Run a chapter's reachability check (tools/reachability/<chapter>.js) and print what it finds.
//   node tools/playtest/reach.mjs hollowmere | saltwick
import { boot, newGame } from './lib.mjs';
const chapter = process.argv[2] || 'hollowmere';
const { browser, page, errors } = await boot({ chapter });
await newGame(page);
const res = await page.evaluate(async (id) => {
  const r = await import(`/tools/reachability/${id}.js`);
  return r.checkAll(window.__game);
}, chapter);
console.log(JSON.stringify(res, null, 1));
console.log('errors:', errors);
await browser.close();
