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
      const k = await window.DD.spritesheet.keysOf(`assets/${name}.png`);
      out[name] = {
        found: frames.length,
        expected: window.DD.spritesheet.SHEET_ORDER[name].length,
        drawnLines: k.floatingLinePixels + k.rulePixels,
      };
    }
    return out;
  });
  for (const [name, r] of Object.entries(roster)) {
    check(`${name}: every pose in SHEET_ORDER is found`, r.found === r.expected,
      `found ${r.found}, order lists ${r.expected}`);
    check(`${name}: the drawn frame lines are recognised`, r.drawnLines > 0,
      `${r.drawnLines} line pixels`);
  }

  // --- the animation strips -------------------------------------------------
  // A strip has to hold exactly as many figures as its order lists, and
  // every pose it names has to reach the game. That is all that can be
  // checked here: an earlier version also demanded the figures come out
  // about the same height, to catch a generator drawing them at different
  // sizes - but a tucked jump really is shorter than a stance and a
  // crouching hit reaction really is shorter than both, and nothing tells
  // that apart from drift. Size drift is caught by eye, on the contact
  // sheet, which is where the order has to be read anyway.
  const strips = await p.evaluate(async () => {
    const out = {};
    const S = window.DD.spritesheet;
    for (const [charKey, moves] of Object.entries(S.STRIPS)) {
      for (const [move, strip] of Object.entries(moves)) {
        const frames = await S.inspect(`assets/${charKey}-${move}.png`);
        const skin = Object.keys(window.DD.sprites.frames[charKey])[0];
        out[`${charKey}-${move}`] = {
          found: frames.length,
          expected: strip.order.length,
          missing: strip.order
            .filter((n) => n && n !== S.ANCHOR
              && !window.DD.sprites.frames[charKey][skin][n]),
        };
      }
    }
    return out;
  });
  for (const [name, r] of Object.entries(strips)) {
    check(`${name}: every frame the strip lists is found`, r.found === r.expected,
      `found ${r.found}, order lists ${r.expected}`);
    check(`${name}: its poses reach the game`, r.missing.length === 0,
      `missing ${r.missing.join(', ')}`);
  }

  // --- a light background ---------------------------------------------------
  // One generator handed back a sheet on white instead of the usual flat
  // color, so a light field has to work as well as a dark one. Drawn from
  // scratch rather than by repainting a shipped sheet, because the count
  // then follows from the drawing: a sprite whose own color is the field
  // color cannot be told apart from it by any keying, and Klaus's pale
  // fireball orb is exactly that once the field turns white.
  const white = await p.evaluate(async () => {
    const W = 420, H = 260, POSES = 6;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    // two rows of figures, uneven sizes and baselines, well clear of
    // each other - the layout a generator produces
    const put = (x, y, w, h, fill) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
    put(20, 30, 44, 90, '#3a5a2a');
    put(150, 20, 50, 105, '#7a3a2a');
    put(280, 40, 40, 80, '#2a3a6a');
    put(30, 160, 38, 70, '#5a4a2a');
    put(160, 150, 46, 85, '#6a2a4a');
    put(290, 165, 42, 66, '#2a5a5a');

    const frames = await window.DD.spritesheet.inspect(cv.toDataURL('image/png'));
    const key = await window.DD.spritesheet.keysOf(cv.toDataURL('image/png'));
    return { found: frames.length, want: POSES, keyIsWhite: key.field.every((v) => v > 230) };
  });
  check('a white field is found as the background', white.keyIsWhite);
  check('a light background finds every pose', white.found === white.want,
    `found ${white.found}, drew ${white.want}`);

  // --- the key color inside the drawing ------------------------------------
  // Drawn from scratch so the geometry is known exactly. One solid figure
  // on a white field with three white regions in it: a garment-sized patch
  // walled in, a small gap walled in, and a notch cut in from the outside.
  //
  // The garment is what the rule is for - a white shirt on a white sheet
  // is walled in by the fighter's own outline, and losing it leaves a
  // hollow figure. The small one is what the rule kept getting wrong: a
  // gap between a thigh and a chest is walled in the same way and is
  // background seen through the figure. Share is what separates them, so
  // the test pins both ends.
  const enclosed = await p.evaluate(async () => {
    const W = 260, H = 260;
    const BODY = { x: 50, y: 35, w: 120, h: 180 };
    const SHIRT = { x: 70, y: 55, w: 48, h: 86 };    // walled in, a fifth of it
    const GAP = { x: 75, y: 160, w: 34, h: 40 };     // walled in, a few percent
    const NOTCH = { x: 135, y: 60, w: 45, h: 16 };   // open to the right edge
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#3a5a2a'; c.fillRect(BODY.x, BODY.y, BODY.w, BODY.h);
    c.fillStyle = '#ffffff';
    c.fillRect(SHIRT.x, SHIRT.y, SHIRT.w, SHIRT.h);
    c.fillRect(GAP.x, GAP.y, GAP.w, GAP.h);
    c.fillRect(NOTCH.x, NOTCH.y, NOTCH.w, NOTCH.h);

    const frames = await window.DD.spritesheet.inspect(cv.toDataURL('image/png'));
    if (frames.length !== 1) return { poses: frames.length };
    const f = frames[0];
    const t = document.createElement('canvas');
    t.width = f.width; t.height = f.height;
    const tc = t.getContext('2d', { willReadFrequently: true });
    tc.drawImage(f, 0, 0);
    const px = tc.getImageData(0, 0, f.width, f.height).data;
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 128) opaque++;

    // the frame is scaled down, so compare as a share of the body's area
    const body = BODY.w * BODY.h;
    const scale = (f.width * f.height) / body;
    const notchIn = NOTCH.w - (NOTCH.x + NOTCH.w - (BODY.x + BODY.w));
    return {
      poses: 1,
      share: opaque / (body * scale),
      gapShare: (GAP.w * GAP.h) / body,
      notchShare: (notchIn * NOTCH.h) / body,
    };
  });
  check('a walled-in patch of the key colour is one pose', enclosed.poses === 1,
    `${enclosed.poses} poses`);
  {
    const want = 1 - enclosed.notchShare - enclosed.gapShare;
    const got = (enclosed.share * 100).toFixed(1);
    const aim = (want * 100).toFixed(1);
    check('a garment-sized patch of the key colour survives',
      enclosed.share > want - 0.04, `kept ${got}% of the body, wanted about ${aim}%`);
    check('a gap-sized one does not',
      enclosed.share < want + 0.04, `kept ${got}%, wanted about ${aim}%`);
  }


  // --- every fighter still has a head --------------------------------------
  // The tests that tell a drawn line from a limb work by eroding, and the
  // threshold cannot be an absolute number of pixels: generators do not
  // all draw at the same size. An erode wide enough to dissolve a 2px box
  // on a sheet drawn large also dissolves a head on one drawn small - and
  // a dissolved head floats free of the shoulders exactly like a box edge
  // floats free of everything, so it is condemned and the fighter imports
  // decapitated.
  //
  // The tell is shape, and it holds for any standing figure whatever the
  // art: a fighter tapers to a head, so the top of the pose is far
  // narrower than the shoulders. Start the pose *at* the shoulders and
  // that ratio jumps - Antoine went from 0.25 to 0.57 the day this broke.
  const heads = await p.evaluate(async () => {
    const out = {};
    for (const name of Object.keys(window.DD.spritesheet.SHEET_ORDER)) {
      const frames = await window.DD.spritesheet.inspect(`assets/${name}.png`);
      const f = frames[0];                       // the fighting stance
      const t = document.createElement('canvas');
      t.width = f.width; t.height = f.height;
      const c = t.getContext('2d', { willReadFrequently: true });
      c.drawImage(f, 0, 0);
      const d = c.getImageData(0, 0, f.width, f.height).data;
      const rowW = [];
      for (let y = 0; y < f.height; y++) {
        let lo = -1, hi = -1;
        for (let x = 0; x < f.width; x++) {
          if (d[(y * f.width + x) * 4 + 3] > 128) { if (lo < 0) lo = x; hi = x; }
        }
        rowW.push(lo < 0 ? 0 : hi - lo + 1);
      }
      const band = Math.max(1, Math.round(f.height * 0.1));
      out[name] = +(Math.max(...rowW.slice(0, band)) / Math.max(...rowW)).toFixed(2);
    }
    return out;
  });
  for (const [name, ratio] of Object.entries(heads)) {
    check(`${name}: the fighting stance tapers to a head`, ratio <= 0.5,
      `top of the pose is ${ratio} of its widest row`);
  }

  // --- a ground rule under each row ----------------------------------------
  // Some sheets come back with a line under every row of poses instead of a
  // box around each one. Every figure stands on it, so it welds the row
  // into one region unless it is recognised. Draw one in the outline's own
  // colour, which is the case colour alone cannot solve.
  const ruled = await p.evaluate(async () => {
    const name = Object.keys(window.DD.spritesheet.SHEET_ORDER)[0];
    const img = await new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.src = `assets/${name}.png`;
    });
    const before = await window.DD.spritesheet.inspect(`assets/${name}.png`);

    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;

    // Draw the rules in a colour the artwork itself uses - the second most
    // common colour in the sheet, the first being the background. That is
    // the hard case: telling the rule apart by colour is impossible, so
    // only its shape can give it away.
    const bins = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = `${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`;
      bins.set(k, (bins.get(k) || 0) + 1);
    }
    const top = [...bins.entries()].sort((a, e) => e[1] - a[1]);
    const [r2, g2, b2] = top[1][0].split(',').map((v) => v * 8 + 4);
    c.fillStyle = `rgb(${r2},${g2},${b2})`;
    const rows = 4;
    for (let r = 1; r <= rows; r++) {
      c.fillRect(0, Math.round((img.height / rows) * r) - 4, img.width, 3);
    }
    const after = await window.DD.spritesheet.inspect(cv.toDataURL('image/png'));
    return { before: before.length, after: after.length, rule: `${r2},${g2},${b2}` };
  });
  check('a ground rule does not fuse a row into one pose',
    ruled.after === ruled.before,
    `${ruled.before} poses without the rule, ${ruled.after} with it`);

  // --- the skirt a drawn box leaves behind ---------------------------------
  // A frame box is drawn *over* the field, so the pixels along its edge are
  // a blend of the two: darker than the field, pointing almost its way, and
  // neither the line colour nor the field colour. Every colour test in the
  // importer let those through, and what survived was a one-pixel coloured
  // bar at the top or bottom of the cut frame.
  //
  // This runs on the real sheet rather than a drawn one, and that is not
  // laziness - a synthetic box does not reproduce it. Painted with a
  // canvas stroke the blend comes out an almost exact darkening of the
  // field, which `isShade` already catches, and the line's core is too
  // clean a colour for the "used for nothing but lines" pass to have
  // anything to bite on. It takes a generator's noise to land a blend in
  // the gap between those two tests, so the case is pinned where it
  // actually happens.
  //
  // The measure is the longest *run* of field-hued pixels on any row, not
  // a count: a leftover box edge is a bar, while dark artwork of a similar
  // hue is scattered. Only this sheet is asserted, because a run is not
  // wrong by itself - the flames around Maxim's boots on `maxim-rush` make
  // honest 16px runs and always have.
  const skirt = await p.evaluate(async () => {
    const url = 'assets/maxim-special.png';
    const S = window.DD.spritesheet;
    const key = await S.keysOf(url);
    const frames = await S.inspect(url);
    const f0 = key.field, km = Math.hypot(f0[0], f0[1], f0[2]);
    let worst = 0, where = '';
    frames.forEach((f, k) => {
      const t = document.createElement('canvas');
      t.width = f.width; t.height = f.height;
      const tc = t.getContext('2d', { willReadFrequently: true });
      tc.drawImage(f, 0, 0);
      const d = tc.getImageData(0, 0, f.width, f.height).data;
      for (let y = 0; y < f.height; y++) {
        let run = 0;
        for (let x = 0; x < f.width; x++) {
          const i = (y * f.width + x) * 4;
          const m = Math.hypot(d[i], d[i + 1], d[i + 2]);
          const hue = d[i + 3] > 24 && m > 1 && m / km <= 0.9
            && (d[i] * f0[0] + d[i + 1] * f0[1] + d[i + 2] * f0[2]) / (m * km) >= 0.93;
          run = hue ? run + 1 : 0;
          if (run > worst) { worst = run; where = `frame ${k} row ${y}`; }
        }
      }
    });
    return { n: frames.length, worst, where };
  });
  check('a drawn box leaves no bar behind in the sprite', skirt.worst < 6,
    `longest field-hued run ${skirt.worst}px at ${skirt.where}`);

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL SHEET CHECKS PASSED');
  process.exit(fails.length ? 1 : 0);
})();
