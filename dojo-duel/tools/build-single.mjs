// Builds the whole game into a single HTML file (dist/dojo-duel.html).
// Handy for sharing or itch.io. Usage: node tools/build-single.mjs
// With --embed, everything in assets/ is inlined as a data URI, so the one
// file also carries the stage panoramas and the fighter sprite sheets.
// That makes the file as large as the artwork - shrink the PNGs first if
// the result has to travel.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const embed = process.argv.includes('--embed');

const css = readFileSync(join(root, 'style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)]
  .map((m) => m[1]);

let out = html
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(/\s*<script src="js\/[^"]+"><\/script>/g, '');

const bundle = scripts
  .map((s) => `// ==== ${s} ====\n${readFileSync(join(root, s), 'utf8')}`)
  .join('\n');

// Inline one asset as a data URI, or return null if it is not there.
function dataUri(name) {
  const p = join(root, 'assets', name);
  if (!existsSync(p)) return null;
  const b64 = readFileSync(p).toString('base64');
  console.log(`embedded: assets/${name} (${(b64.length / 1024 / 1024).toFixed(2)} MB as base64)`);
  return `data:image/png;base64,${b64}`;
}

let assetScript = '';
if (embed) {
  const stages = [];
  for (const n of [1, 2, 3]) {
    const uri = dataUri(`stage-${n}.png`);
    if (uri) stages.push(`${n}: '${uri}'`);
  }
  const sheets = [];
  for (const who of ['klaus', 'antoine', 'hanzo']) {
    const uri = dataUri(`${who}.png`);
    if (uri) sheets.push(`${who}: '${uri}'`);
  }
  const parts = [];
  if (stages.length) parts.push(`DD.ASSETS = { ${stages.join(', ')} };`);
  if (sheets.length) parts.push(`DD.SHEETS = { ${sheets.join(', ')} };`);
  if (parts.length) {
    assetScript = `<script>\nwindow.DD = window.DD || {};\n${parts.join('\n')}\n</script>\n`;
  }
}

out = out.replace('</body>', `${assetScript}<script>\n${bundle}\n</script>\n</body>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'dojo-duel.html'), out);
console.log(`dist/dojo-duel.html written (${scripts.length} scripts bundled)`);
