// Baut das komplette Spiel in eine einzige HTML-Datei (dist/dojo-duel.html).
// Praktisch zum Verschicken oder für itch.io. Aufruf: node tools/build-single.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const css = readFileSync(join(root, 'style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)]
  .map((m) => m[1]);

let out = html
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(/\s*<script src="js\/[^"]+"><\/script>/g, '');

const bundle = scripts
  .map((s) => `// ==== ${s} ====\n${readFileSync(join(root, s), 'utf8')}`)
  .join('\n');

out = out.replace('</body>', `<script>\n${bundle}\n</script>\n</body>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'dojo-duel.html'), out);
console.log(`dist/dojo-duel.html geschrieben (${scripts.length} Skripte gebündelt)`);
