// Sprite sheet import test. Checks the things that decide whether a sheet
// dropped into assets/ comes out usable: how many poses are found, that a
// frame line is removed rather than fusing two poses, and that keying works
// even when the background color also appears inside the drawing.
//
// Requires the `playwright` npm package, and a served copy - a browser will
// not let a page read the pixels of an image loaded off disk.
//
//   python3 -m http.server 8000        (in dojo-duel/)
//   node tools/sheet-test.js http://localhost:8000/
const { chromium } = require('playwright');

const GAME = process.argv[2] || 'http://localhost:8000/';

const fails = [];
function check(name, cond, extra) {
  if (cond) console.log('  OK  ' + name);
  else { console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); fails.push(name); }
}

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(GAME);
  await p.waitForFunction(() => window.DD && window.DD.spritesheet, null, { timeout: 20000 });

  // --- the shipped sheets ---------------------------------------------------
  const roster = await p.evaluate(async () => {
    const out = {};
    for (const name of Object.keys(window.DD.spritesheet.SHEET_ORDER)) {
      const frames = await window.DD.spritesheet.inspect(`assets/${name}.png`);
      out[name] = {
        found: frames.length,
        expected: window.DD.spritesheet.SHEET_ORDER[name].length,
        keys: (await window.DD.spritesheet.keysOf(`assets/${name}.png`)).length,
      };
    }
    return out;
  });
  for (const [name, r] of Object.entries(roster)) {
    check(`${name}: every pose in SHEET_ORDER is found`, r.found === r.expected,
      `found ${r.found}, order lists ${r.expected}`);
    check(`${name}: the drawn frame lines are recognised`, r.keys > 1,
      `${r.keys} key colors`);
  }

  // --- a light background, and the key color inside the drawing -------------
  // Repaint a sheet's field white and stamp white into the artwork. Keying
  // on a color the drawing also uses must not punch holes in it.
  const white = await p.evaluate(async () => {
    const name = Object.keys(window.DD.spritesheet.SHEET_ORDER)[0];
    const img = await new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.src = `assets/${name}.png`;
    });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const id = c.getImageData(0, 0, img.width, img.height);
    const d = id.data;

    const bins = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = `${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`;
      bins.set(k, (bins.get(k) || 0) + 1);
    }
    let best = null, bn = -1;
    for (const [k, n] of bins) if (n > bn) { bn = n; best = k; }
    const f = best.split(',').map((v) => v * 8 + 4);
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - f[0]) <= 46 && Math.abs(d[i + 1] - f[1]) <= 46
          && Math.abs(d[i + 2] - f[2]) <= 46) {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
      }
    }
    c.putImageData(id, 0, 0);
    c.fillStyle = '#ffffff';
    c.fillRect(70, 60, 10, 10);
    c.fillRect(70, 90, 8, 14);      // white blocks inside the first pose

    const solid = (fr) => {
      const t = document.createElement('canvas');
      t.width = fr.width; t.height = fr.height;
      const tc = t.getContext('2d', { willReadFrequently: true });
      tc.drawImage(fr, 0, 0);
      const px = tc.getImageData(0, 0, fr.width, fr.height).data;
      let n = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 128) n++;
      return n;
    };

    const before = await window.DD.spritesheet.inspect(`assets/${name}.png`);
    const after = await window.DD.spritesheet.inspect(cv.toDataURL('image/png'));
    const key = await window.DD.spritesheet.keysOf(cv.toDataURL('image/png'));
    return {
      name,
      keyIsWhite: key[0].every((v) => v > 230),
      count: [before.length, after.length],
      sizes: [before.map((x) => x.width + 'x' + x.height).join(),
              after.map((x) => x.width + 'x' + x.height).join()],
      pixels: [solid(before[0]), solid(after[0])],
    };
  });
  check('a white field is found as the background', white.keyIsWhite);
  check('a light background finds the same poses',
    white.count[0] === white.count[1] && white.sizes[0] === white.sizes[1],
    `${white.count[0]} vs ${white.count[1]}`);
  check('white inside the drawing is not keyed away',
    white.pixels[1] >= white.pixels[0],
    `${white.pixels[0]} px -> ${white.pixels[1]} px`);

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL SHEET CHECKS PASSED');
  process.exit(fails.length ? 1 : 0);
})();
