// Bake the sprite import.
//
// The importer runs in the browser at load time: it reads `assets/*.png`,
// keys out the background, finds each pose as a connected shape, lines
// them up on a foot line and scales the sheet down so the fighting stance
// is 66 pixels tall. That is a lot of work to redo on every page load,
// and the source sheets are about eight times the resolution the game
// ever draws - 22 MB of PNG to produce roughly 1 MB of sprites.
//
// So run it once, here, and write down what it produced: one atlas per
// fighter plus a manifest of where each pose sits in it. The game loads
// that instead when it is there, and falls back to importing when it is
// not - the same shape as every other "a file beats the generated thing"
// in this project. Re-run it after changing any sheet:
//
//   python3 -m http.server 8000        (in dojo-duel/)
//   node tools/bake-sprites.js http://localhost:8000/
//
// Requires the `playwright` npm package, like the tests, because only a
// browser can run the importer.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME = process.argv[2] || 'http://localhost:8000/';
const OUT = path.join(__dirname, '..', 'assets', 'baked');

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(GAME);
  await p.waitForFunction(() => window.DD && window.DD.sprites && window.DD.spritesheet,
    null, { timeout: 20000 });

  // Wait for the import to settle: every sheet is fetched and decoded
  // asynchronously, so "the page loaded" is not "the art is in".
  // Only the fighters with a real sheet - Hanzo is a bonus set built from
  // code and has no import to wait for, so waiting on him waits forever.
  await p.waitForFunction(() => {
    const S = window.DD.sprites;
    return Object.keys(window.DD.spritesheet.SHEET_ORDER).every((c) => {
      const skin = Object.keys(S.frames[c])[0];
      return Object.keys(S.frames[c][skin]).length > 20;
    });
  }, null, { timeout: 30000 });
  await p.waitForTimeout(2500);   // ...and let the strips land on top

  const baked = await p.evaluate(() => {
    const S = window.DD.sprites;
    const out = {};
    // Same set: baking the generated bonus character would cost bytes for
    // art the code rebuilds for free anyway.
    for (const char of Object.keys(window.DD.spritesheet.SHEET_ORDER)) {
      const skin = Object.keys(S.frames[char])[0];
      const set = S.frames[char][skin];
      // Aliases share one canvas object - a second punch really is the
      // first punch - so pack each drawing once and let several poses
      // point at the same rectangle.
      const rectOf = new Map();
      const drawings = [];
      for (const pair of Object.values(set)) {
        if (!rectOf.has(pair.right)) { rectOf.set(pair.right, null); drawings.push(pair.right); }
      }
      // Shelf packing, tallest first. Good enough for sixty sprites and
      // it keeps the atlas readable when something looks wrong.
      drawings.sort((a, c) => c.height - a.height);
      const W = 512;
      let x = 0, y = 0, rowH = 0;
      const place = [];
      for (const c of drawings) {
        if (x + c.width > W) { x = 0; y += rowH; rowH = 0; }
        place.push({ c, x, y });
        rectOf.set(c, [x, y, c.width, c.height]);
        x += c.width; rowH = Math.max(rowH, c.height);
      }
      const H = y + rowH;
      const at = document.createElement('canvas');
      at.width = W; at.height = H;
      const g = at.getContext('2d');
      for (const { c, x: px, y: py } of place) g.drawImage(c, px, py);

      const frames = {};
      for (const [pose, pair] of Object.entries(set)) frames[pose] = rectOf.get(pair.right);
      out[char] = {
        w: W, h: H,
        frames,
        // The strips merge their own timing into the character on import,
        // so the animation tables have to be baked too - frames without
        // them would play the pre-strip animations.
        anims: S.CHARS[char].anims,
        scale: S.CHARS[char].scale,
        png: at.toDataURL('image/png'),
      };
    }
    return out;
  });

  if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));

  fs.mkdirSync(OUT, { recursive: true });
  const index = {};
  let total = 0;
  for (const [char, d] of Object.entries(baked)) {
    const png = Buffer.from(d.png.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, `${char}.png`), png);
    total += png.length;
    index[char] = { w: d.w, h: d.h, frames: d.frames, anims: d.anims, scale: d.scale };
    console.log(`  ${char.padEnd(9)} ${Object.keys(d.frames).length} poses  ${d.w}x${d.h}  ${(png.length / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  const jsonKB = fs.statSync(path.join(OUT, 'index.json')).size / 1024;
  console.log(`  index.json ${jsonKB.toFixed(0)} KB`);
  console.log(`\nbaked ${(total / 1024 / 1024).toFixed(2)} MB of atlases into assets/baked/`);
  await b.close();
})().catch((e) => { console.error('bake failed:', e); process.exit(1); });
