// Baut das komplette Spiel in eine einzige HTML-Datei (dist/dojo-duel.html).
// Praktisch zum Verschicken oder für itch.io. Aufruf: node tools/build-single.mjs
// Mit --embed werden vorhandene assets/stage-N.png als data-URIs eingebettet,
// damit die Einzeldatei auch die eigenen Stage-Panoramen enthält.
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

let assetScript = '';
if (embed) {
  const entries = [];
  for (const n of [1, 2, 3]) {
    const p = join(root, 'assets', `stage-${n}.png`);
    if (existsSync(p)) {
      const b64 = readFileSync(p).toString('base64');
      entries.push(`${n}: 'data:image/png;base64,${b64}'`);
      console.log(`eingebettet: assets/stage-${n}.png (${(b64.length / 1024 / 1024).toFixed(2)} MB als base64)`);
    }
  }
  if (entries.length) {
    assetScript = `<script>\nwindow.DD = window.DD || {};\nDD.ASSETS = { ${entries.join(', ')} };\n</script>\n`;
  }
}

out = out.replace('</body>', `${assetScript}<script>\n${bundle}\n</script>\n</body>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'dojo-duel.html'), out);
console.log(`dist/dojo-duel.html geschrieben (${scripts.length} Skripte gebündelt)`);
