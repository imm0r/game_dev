// Builds the whole game into a single HTML file (dist/dojo-duel.html).
// Handy for sharing or itch.io. Usage: node tools/build-single.mjs
// With --embed, everything in assets/ is inlined as a data URI, so the one
// file also carries the stage panoramas and the fighter sprite sheets.
// That makes the file as large as the artwork - shrink the PNGs first if
// the result has to travel.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(root, 'assets');
const SFX = join(root, 'sfx');
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
function dataUri(name, dir, mime) {
  const p = join(dir || ASSETS, name);
  if (!existsSync(p)) return null;
  const b64 = readFileSync(p).toString('base64');
  const where = dir === SFX ? 'sfx' : dir && dir !== ASSETS ? 'assets/baked' : 'assets';
  console.log(`embedded: ${where}/${name} (${(b64.length / 1024 / 1024).toFixed(2)} MB as base64)`);
  return `data:${mime || 'image/png'};base64,${b64}`;
}

const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4' };

let assetScript = '';
if (embed) {
  const stages = [];
  for (const n of [1, 2, 3]) {
    const uri = dataUri(`stage-${n}.png`);
    if (uri) stages.push(`${n}: '${uri}'`);
  }
  // A baked atlas, if `tools/bake-sprites.js` has been run. It is the
  // whole ball game for size: the source sheets are about eight times the
  // resolution the game draws, so embedding them costs ~29 MB of base64
  // to deliver ~1.4 MB of sprites. With the atlas the source sheets are
  // left out of the build entirely.
  const bakedIndex = join(ASSETS, 'baked', 'index.json');
  const haveBaked = existsSync(bakedIndex);
  const bakedPng = [];
  if (haveBaked) {
    for (const file of readdirSync(join(ASSETS, 'baked')).sort()) {
      if (!/\.png$/i.test(file)) continue;
      const uri = dataUri(file, join(ASSETS, 'baked'));
      if (uri) bakedPng.push(`'${file.replace(/\.png$/i, '')}': '${uri}'`);
    }
  }

  // Every PNG in assets/ that is not a stage: the fighters' sprite sheets
  // and the select-screen portraits, keyed by file name. Read the folder
  // rather than a list here, so adding a character to the roster never
  // means remembering to edit the build script too. The keys are quoted
  // because a portrait's is `portrait-klaus`. With a baked atlas the
  // sheets are skipped and only the portraits come along - nothing reads
  // a sheet once the atlas is there.
  const sheets = [];
  for (const file of readdirSync(ASSETS).sort()) {
    if (!/^(?!stage-).+\.png$/i.test(file)) continue;
    const who = file.replace(/\.png$/i, '');
    if (haveBaked && !who.startsWith('portrait-')) continue;
    const uri = dataUri(file);
    if (uri) sheets.push(`'${who}': '${uri}'`);
  }
  // ...and any music dropped in sfx/, which the page would otherwise
  // fetch by path. Keyed by file name, because that is what the track
  // table in js/audio.js names.
  const music = [];
  if (existsSync(SFX)) {
    for (const file of readdirSync(SFX).sort()) {
      const ext = (file.split('.').pop() || '').toLowerCase();
      if (!MIME[ext]) continue;
      const uri = dataUri(file, SFX, MIME[ext]);
      if (uri) music.push(`'${file}': '${uri}'`);
    }
  }

  const parts = [];
  if (stages.length) parts.push(`DD.ASSETS = { ${stages.join(', ')} };`);
  if (sheets.length) parts.push(`DD.SHEETS = { ${sheets.join(', ')} };`);
  if (music.length) parts.push(`DD.MUSIC = { ${music.join(', ')} };`);
  if (haveBaked) {
    parts.push(`DD.BAKED = ${readFileSync(bakedIndex, 'utf8')};`);
    parts.push(`DD.BAKED_PNG = { ${bakedPng.join(', ')} };`);
  }
  if (parts.length) {
    assetScript = `<script>\nwindow.DD = window.DD || {};\n${parts.join('\n')}\n</script>\n`;
  }
}

out = out.replace('</body>', `${assetScript}<script>\n${bundle}\n</script>\n</body>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'dojo-duel.html'), out);
console.log(`dist/dojo-duel.html written (${scripts.length} scripts bundled)`);
