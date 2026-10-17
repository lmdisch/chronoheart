// Assemble the live page: one self-contained HTML fragment for a claude.ai artifact (see
// "Publishing the live page" in the README). Not the dist/ output: the game code is built
// unminified as a single ES module with three.js left external, then stitched together with
// the stylesheet and the page markup.
//
//   node tools/artifact/build.mjs            -> dist-artifact/chronoheart.html (the fragment to publish)
//                                               dist-artifact/test.html       (the same, wrapped to open locally)
//   node tools/artifact/build.mjs --chapter summit
//                                            -> dist-artifact/summit.html, summit-test.html: the same game,
//                                               opening on that chapter, every chapter unlocked (a review page
//                                               for a chapter still being built: its saves are its own)
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, 'dist-artifact');
const tmp = resolve(out, 'build');
const THREE = '0.186.0';
const at = process.argv.indexOf('--chapter');
const only = at > 0 ? process.argv[at + 1] : null;

await build({
  root,
  logLevel: 'warn',
  build: {
    outDir: tmp,
    emptyOutDir: true,
    minify: false,
    lib: { entry: resolve(root, 'src/main.js'), formats: ['es'], fileName: 'game' },
    rollupOptions: { external: [/^three/] },
  },
});

const page = readFileSync(resolve(root, 'index.html'), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b) + b.length);
// the head's title, description, theme color and font links (the host adds charset and viewport itself)
const head = page
  .slice(page.indexOf('<title>'), page.indexOf('</head>'))
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('<link rel="icon"'))
  .join('\n');
const main = between(page, '<main id="app">', '</main>');
const css = readFileSync(resolve(root, 'src/ui/style.css'), 'utf8');
const code = readFileSync(resolve(tmp, 'game.js'), 'utf8');
if (/\bimport\(/.test(code)) throw new Error('the build has a dynamic import: the live page must be a single module');

const cdn = `https://cdn.jsdelivr.net/npm/three@${THREE}`;
const importmap = JSON.stringify({ imports: { three: `${cdn}/build/three.module.js`, 'three/examples/jsm/': `${cdn}/examples/jsm/` } });
const fragment = `${head}
<style>
${css}
</style>
${main}
<script type="importmap">${importmap}</script>
${only ? `<script>try { sessionStorage.setItem('chronoheart-chapter', '${only}'); history.replaceState(null, '', '#unlock'); } catch {}</script>\n` : ''}<script type="module">
document.body.dataset.era = 'present';
${code}
</script>
`;
mkdirSync(out, { recursive: true });
const name = only || 'chronoheart';
writeFileSync(resolve(out, `${name}.html`), fragment);
writeFileSync(resolve(out, only ? `${only}-test.html` : 'test.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${fragment}</body></html>`);
rmSync(tmp, { recursive: true, force: true });
console.log(`dist-artifact/${name}.html  ${(fragment.length / 1024).toFixed(0)} KB`);
