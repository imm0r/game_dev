// Import hand-made sprite sheets.
//
// Drop `assets/klaus.png` (or `antoine.png`) into the repo and the fighter
// stops using the generated placeholder art: the sheet is sliced into
// frames, the flat background is keyed out, every frame is aligned on the
// same foot line and scaled to the game's fighter height.
//
// The sheet is one image with the poses side by side, separated by at
// least two columns of pure background. See assets/README.md for the
// generator prompt and the pose order.
window.DD = window.DD || {};

(function () {
  const STAND_H = 66;         // height of the fighting stance, in game pixels
  const TOL = 46;             // background color tolerance (0-255 per channel)
  const EDGE_BAND = 6;        // how far a soft edge may reach into the pose
  const THIN_MIN = 3;         // anything thinner than this is a drawn line,
  const THIN_MAX = 8;         // not a limb - measured per sheet, see thinness()
  const SHADE_MIN = 0.30;     // how dark a cast shadow of the field may get
  const SHADE_HUE = 0.995;    // ...and how exactly it must keep its colour
  const POCKET = 5;           // a wall thinner than twice this does not seal
                              // a patch of background off from the outside
  const HOLE_SHARE = 0.15;    // a walled-in patch of the key colour is only
                              // artwork if it is this much of its figure
  const BRIDGE = 3;           // close gaps this wide when a removed line cut
                              // a pose in two - wide enough for a drawn rule
                              // even where it crosses a figure's shins,
                              // narrow enough to keep two poses apart

  // Frames are mapped in reading order. The default follows the pose list
  // in assets/README.md; a character whose sheet is laid out differently
  // gets its own list here. A shorter sheet is fine: whatever it does not
  // cover keeps the generated art.
  const ORDER = [
    'idle0', 'walk1', 'pun1', 'kick1', 'sp1',
    'jmp1', 'crouch0', 'block0', 'hurt0', 'win0',
  ];
  // The roster sheets, in the order each generator laid them out. See the
  // pose list in assets/README.md; `null` is a frame no move uses.
  //
  // `fireballA` is not a pose at all: Klaus's sheet carries the projectile
  // itself as its own picture, which is exactly what the game needs and
  // better than the hand-drawn one it replaces. The other two draw their
  // effect into the throwing pose, so they keep the drawn projectile.
  const SHEET_ORDER = {
    klaus: [
      'idle0', 'idle1', 'walk1', 'run0', 'pun1', 'upp0', 'cpun0',
      'kick1', 'swp0', 'air0', 'sp1', 'fireballA', 'rush0', 'jmp1',
      'crouch0', 'cblock0', 'block0', 'hurt0', 'kof0', 'win0', 'ko0',
      'grab0', 'lift0', 'slam0',
    ],
    // Antoine's throw and the arc it leaves are one drawing in one box, so
    // unlike Klaus he has no projectile picture of his own and keeps the
    // drawn grenade.
    antoine: [
      'idle0', 'idle1', 'walk1', 'run0', 'pun1', 'upp0', 'cpun0',
      'kick1', 'swp0', 'air0', 'rush0', 'sp1', 'jmp1',
      'crouch0', 'block0', 'hurt0', 'kof0', 'win0', 'ko0',
      'grab0', 'lift0', 'slam0',
    ],
    // Maxim's molotov is thrown from pose 13 and the bottle is drawn with
    // it, so that pose carries its own projectile. His slot 18 is dropped:
    // the generator drew two figures in it, and a pose the game applies to
    // one fighter cannot contain his opponent.
    maxim: [
      'idle0', 'idle1', 'walk1', 'run0', 'pun1', 'pun2', 'upp0',
      'cpun0', 'kick1', 'swp0', 'air0', 'rush0', 'sp1', 'jmp1',
      'crouch0', 'block0', 'hurt0', null, 'win0', 'ko0',
      'grab0', 'lift0', 'slam0',
    ],
  };
  // A sheet is scaled by one factor measured from the fighting stance, so
  // every sheet needs a stance in it somewhere. A sheet of movements has
  // one at the front purely to be measured against: `@anchor` says scale
  // by this figure and do not install it, which keeps a strip from
  // quietly replacing the main sheet's idle with a stance drawn in a
  // different generation. A sheet that means its stance to *be* the idle
  // just lists it as `idle0`.
  const ANCHOR = '@anchor';

  // Extra sheets that carry movement, `<fighter>-<move>.png`. A pose on
  // one of these beats the same pose on the main sheet, so a movement is
  // upgraded without the main sheet being touched, and each brings its own
  // timing along with its drawings.
  const STRIPS = {
    klaus: {
      // 22 figures: idle 4, walk 4, punch 6, kick 5, hit reaction 3. The
      // punch came back as two punches back to back rather than one in
      // five steps, so the arm goes out through the first and comes back
      // through the tail of the second - the spare guard between them is
      // dropped.
      moves: {
        order: [
          'idle0', 'idle1', 'idle2', 'idle3',
          'walk0', 'walk1', 'walk2', 'walk3',
          'pun0', 'pun1', 'pun2', null, 'pun3', 'pun4',
          'kick0', 'kick1', 'kick2', 'kick3', 'kick4',
          'hurt0', 'hurt1', 'hurt2',
        ],
        anims: {
          idle: { seq: [['idle0', 12, 0], ['idle1', 12, 0], ['idle2', 12, 0], ['idle3', 12, 0]] },
          walk: { seq: [['walk0', 5, 0], ['walk1', 5, 0], ['walk2', 5, 0], ['walk3', 5, 0]] },
          punch: { atk: ['pun0', 'pun1', 'pun2', 'pun3', 'pun4'], hit: 2 },
          kick: { atk: ['kick0', 'kick1', 'kick2', 'kick3', 'kick4'], hit: 2 },
          hurt: { hit: ['hurt0', 'hurt1', 'hurt2'] },
        },
      },
      // 10 figures, all but the first off the ground: a stance to measure
      // by, the jump arc, then the two air attacks.
      jump: {
        order: [
          ANCHOR,
          'jmp0', 'jmp1', 'jmp2',
          'apun0', 'apun1', 'apun2',
          'air0', 'air1', 'air2',
        ],
        anims: {
          jump: { vel: ['jmp0', 'jmp1', 'jmp2'] },
          airkick: { atk: ['air0', 'air1', 'air2'], hit: 1 },
          airpunch: { atk: ['apun0', 'apun1', 'apun2'], hit: 1 },
        },
      },
    },

    antoine: {
      // 21 figures, exactly as asked: 4 / 4 / 5 / 5 / 3.
      moves: {
        order: [
          'idle0', 'idle1', 'idle2', 'idle3',
          'walk0', 'walk1', 'walk2', 'walk3',
          'pun0', 'pun1', 'pun2', 'pun3', 'pun4',
          'kick0', 'kick1', 'kick2', 'kick3', 'kick4',
          'hurt0', 'hurt1', 'hurt2',
        ],
        anims: {
          idle: { seq: [['idle0', 13, 0], ['idle1', 13, 0], ['idle2', 13, 0], ['idle3', 13, 0]] },
          walk: { seq: [['walk0', 5, 0], ['walk1', 5, 0], ['walk2', 5, 0], ['walk3', 5, 0]] },
          punch: { atk: ['pun0', 'pun1', 'pun2', 'pun3', 'pun4'], hit: 2 },
          kick: { atk: ['kick0', 'kick1', 'kick2', 'kick3', 'kick4'], hit: 2 },
          hurt: { hit: ['hurt0', 'hurt1', 'hurt2'] },
        },
      },
      // 11: one spare tuck between the punch and the kick.
      jump: {
        order: [
          ANCHOR,
          'jmp0', 'jmp1', 'jmp2',
          'apun0', 'apun1', 'apun2',
          null,
          'air0', 'air1', 'air2',
        ],
        anims: {
          jump: { vel: ['jmp0', 'jmp1', 'jmp2'] },
          airkick: { atk: ['air0', 'air1', 'air2'], hit: 1 },
          airpunch: { atk: ['apun0', 'apun1', 'apun2'], hit: 1 },
        },
      },
    },

    maxim: {
      // 21 figures, exactly as asked: 4 / 4 / 5 / 5 / 3. The sheet came
      // back in three rows fenced off by thick black bars - the line pass
      // keys them out, so they cost nothing.
      moves: {
        order: [
          'idle0', 'idle1', 'idle2', 'idle3',
          'walk0', 'walk1', 'walk2', 'walk3',
          'pun0', 'pun1', 'pun2', 'pun3', 'pun4',
          'kick0', 'kick1', 'kick2', 'kick3', 'kick4',
          'hurt0', 'hurt1', 'hurt2',
        ],
        anims: {
          idle: { seq: [['idle0', 14, 0], ['idle1', 14, 0], ['idle2', 14, 0], ['idle3', 14, 0]] },
          walk: { seq: [['walk0', 6, 0], ['walk1', 6, 0], ['walk2', 6, 0], ['walk3', 6, 0]] },
          punch: { atk: ['pun0', 'pun1', 'pun2', 'pun3', 'pun4'], hit: 2 },
          kick: { atk: ['kick0', 'kick1', 'kick2', 'kick3', 'kick4'], hit: 2 },
          hurt: { hit: ['hurt0', 'hurt1', 'hurt2'] },
        },
      },
      // 12: the air punch came back as two swings back to back, so the
      // first one is the move and the second one is spare.
      jump: {
        order: [
          ANCHOR,
          'jmp0', 'jmp1', 'jmp2',
          'apun0', 'apun1', 'apun2',
          null, null,
          'air0', 'air1', 'air2',
        ],
        anims: {
          jump: { vel: ['jmp0', 'jmp1', 'jmp2'] },
          airkick: { atk: ['air0', 'air1', 'air2'], hit: 1 },
          airpunch: { atk: ['apun0', 'apun1', 'apun2'], hit: 1 },
        },
      },
    },
  };
  // Poses reused from an imported one, so a small sheet still animates.
  // Order matters: an entry may lean on one resolved above it.
  const ALIAS = {
    idle1: 'idle0', walk0: 'walk1', walk2: 'idle1', walk3: 'walk2',
    pun0: 'idle0', pun2: 'pun1', kick0: 'idle0', air0: 'kick1',
    sp0: 'idle0', jmp0: 'jmp1', jmp2: 'jmp1', run0: 'walk1',
    cpun0: 'crouch0', swp0: 'crouch0', upp0: 'pun1', rush0: 'sp1',
    cblock0: 'crouch0',
    grab0: 'pun1', lift0: 'win0', slam0: 'sp1',
    kof0: 'hurt0', ko0: 'hurt0', fireballB: 'fireballA',
  };

  function pixels(img) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    return c.getImageData(0, 0, img.width, img.height);
  }

  // The flat field is simply the most common color in the sheet. Reading
  // the corners instead looks cheaper and is wrong as soon as a generator
  // draws a frame around the poses: those lines run to the image edge and
  // put their own color in every corner.
  function dominant(data) {
    const bins = new Int32Array(1 << 15);
    const bin = (i) => ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] >= 24) bins[bin(i)]++;
    }
    let best = 0, bestN = -1;
    for (let k = 0; k < bins.length; k++) if (bins[k] > bestN) { bestN = bins[k]; best = k; }
    const c = [((best >> 10) & 31) * 8 + 4, ((best >> 5) & 31) * 8 + 4, (best & 31) * 8 + 4];
    // A dithered field spills over the bucket edges - average what is near
    // it, so the color the rest of the code compares against is exact.
    let n = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 24) continue;
      if (Math.abs(data[i] - c[0]) > TOL || Math.abs(data[i + 1] - c[1]) > TOL
          || Math.abs(data[i + 2] - c[2]) > TOL) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : c;
  }

  // A cast shadow is the background with the light taken out of it: the
  // same colour, darker. Generators draw one under a figure however firmly
  // the prompt says not to, and it does real damage - a shadow bridges the
  // two feet, which walls in the field between the legs so the flood fill
  // cannot reach it, and that patch of pure background then survives into
  // the sprite as a magenta wedge between the knees.
  //
  // Nothing in a drawing is the field colour scaled down by coincidence,
  // so the test is exactly that: pointing the same way in RGB, and
  // shorter. Anti-aliasing along an edge blends artwork *into* the field
  // and so points somewhere else, which is why a soft edge survives this.
  function isShade(data, i, field) {
    if (data[i + 3] < 24) return false;
    const fl = field[0] * field[0] + field[1] * field[1] + field[2] * field[2];
    const cl = data[i] * data[i] + data[i + 1] * data[i + 1] + data[i + 2] * data[i + 2];
    if (!fl || !cl) return false;
    const k = Math.sqrt(cl / fl);
    if (k < SHADE_MIN || k > 1) return false;
    const dot = data[i] * field[0] + data[i + 1] * field[1] + data[i + 2] * field[2];
    return dot / Math.sqrt(cl * fl) >= SHADE_HUE;
  }

  // Not artwork: fully transparent, or within TOL of one of the key colors
  // (the flat field, plus any frame lines found below).
  function isBg(data, i, keys) {
    if (data[i + 3] < 24) return true;
    for (const k of keys) {
      if (Math.abs(data[i] - k[0]) <= TOL && Math.abs(data[i + 1] - k[1]) <= TOL
          && Math.abs(data[i + 2] - k[2]) <= TOL) return true;
    }
    return false;
  }

  // Erode / dilate with a square, done as two 1-D passes over prefix sums,
  // so the cost does not grow with the radius. Out of bounds counts as
  // empty: a structure running off the image edge erodes like any other.
  function morph(mask, w, h, r, erodeIt) {
    const pass = (src, dst, n, m, idx) => {
      const sum = new Int32Array(n + 1);
      for (let j = 0; j < m; j++) {
        for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + src[idx(i, j)];
        for (let i = 0; i < n; i++) {
          const a = Math.max(0, i - r), b = Math.min(n, i + r + 1);
          const got = sum[b] - sum[a];
          dst[idx(i, j)] = erodeIt
            ? (i - r >= 0 && i + r + 1 <= n && got === 2 * r + 1 ? 1 : 0)
            : (got > 0 ? 1 : 0);
        }
      }
    };
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    pass(mask, tmp, w, h, (i, j) => j * w + i);
    pass(tmp, out, h, w, (i, j) => i * w + j);
    return out;
  }
  const erode = (m, w, h, r) => morph(m, w, h, r, true);
  const dilate = (m, w, h, r) => morph(m, w, h, r, false);

  // How thick this sheet's artwork is drawn, as a radius.
  //
  // The tests below tell a drawn line from a limb by eroding: whatever
  // dissolves was thin. That threshold cannot be a fixed number of pixels,
  // because generators do not all draw at the same size. An erode wide
  // enough to dissolve a 2px box on a sheet drawn large also dissolves a
  // whole head on a sheet drawn small - and a head that has dissolved
  // floats free of the shoulders exactly like a box edge floats free of
  // everything, so it is condemned and the fighter comes out decapitated.
  //
  // Measured as the radius at which half the artwork has eroded away.
  // That tracks limb thickness and does not care how many poses are on
  // the sheet or how much of it is background.
  function thinness(drawn, w, h) {
    let full = 0;
    for (let p = 0; p < w * h; p++) full += drawn[p];
    if (!full) return THIN_MIN;
    for (let r = THIN_MIN; r < THIN_MAX; r++) {
      const e = erode(drawn, w, h, r);
      let left = 0;
      for (let p = 0; p < w * h; p++) left += e[p];
      if (left * 2 < full) return r;
    }
    return THIN_MAX;
  }

  // Drawn rules and boxes, found by shape rather than colour. Colour only
  // works when the generator picks something that contrasts with the art;
  // a dark box edge and a dark outline land in the same bucket, and then
  // every box survives to become a pose of its own.
  //
  // What gives a drawn line away is that it is a long, straight hairline:
  // clear space a few pixels above and below along its whole length. No
  // part of a character is - a body always has something directly above or
  // below it - and where a figure crosses the line, its pixels fail that
  // test and stay, so the figure is not cut in two.
  //
  // Measuring runs rather than how much of the sheet a row covers is what
  // makes this work for boxes as well as ground lines: one box edge is
  // only a couple of hundred pixels long, but it is still unmistakably a
  // drawn line.
  function findRules(mask, w, h) {
    const out = new Uint8Array(w * h);
    const GAP = 4;         // clear space required to either side
    const MIN_RUN = 60;    // shorter than this and it could be artwork

    const scan = (n, m, at, axis) => {
      // off the edge of the sheet counts as empty, so a rule drawn right
      // against the border is found like any other
      const empty = (i, j) => j < 0 || j >= m || !mask[at(i, j)];
      const hair = (i, j) => !empty(i, j) && empty(i, j - GAP) && empty(i, j + GAP);
      for (let j = 0; j < m; j++) {
        let run = 0;
        for (let i = 0; i <= n; i++) {
          if (i < n && hair(i, j)) { run++; continue; }
          if (run >= MIN_RUN) {
            if (DD.spritesheet && DD.spritesheet.verbose) {
              console.info(`[dojo] rule ${axis}=${j}, ${run}px from ${i - run}`);
            }
            for (let k = i - run; k < i; k++) {
              for (let d = -2; d <= 2; d++) {
                const y = j + d;
                if (y < 0 || y >= m) continue;
                const p = at(k, y);
                if (mask[p]) out[p] = 1;
              }
            }
          }
          run = 0;
        }
      }
    };
    scan(w, h, (i, j) => j * w + i, 'y');
    scan(h, w, (i, j) => i * w + j, 'x');
    return out;
  }

  // Frame lines, decided per pixel. A drawn line floats: it is thin, and
  // it is nowhere near anything with bulk. Every thin thing in the artwork
  // - an outline, the gold trim on a pair of trunks, a strand of hair - is
  // attached to the body it belongs to.
  //
  // Deciding this per colour instead is the obvious shortcut and it fails
  // badly: a sheet whose box frames are drawn in the same dark tone as the
  // characters' own outlines condemns the outlines with the boxes, and
  // every figure falls apart into its interior colour patches.
  function floatingLines(drawn, w, h, thin) {
    const thick = dilate(erode(drawn, w, h, thin), w, h, thin);
    const attached = dilate(thick, w, h, 3);
    const out = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) out[p] = drawn[p] && !attached[p] ? 1 : 0;
    return out;
  }

  // The same question asked of a whole colour rather than a pixel, which
  // catches the stretch of a box that happens to pass close to a figure.
  // It may only condemn a colour that is *essentially never* attached to a
  // body: a sheet whose boxes are drawn in the characters' own outline tone
  // would otherwise lose the outlines too, and every figure falls apart
  // into its interior colour patches. Where a colour does both jobs there
  // is nothing to decide per colour, and the per-pixel test above stands
  // on its own.
  function frameColors(data, drawn, w, h, r) {
    const thick = dilate(erode(drawn, w, h, r), w, h, r);
    const attached = dilate(thick, w, h, 3);
    const bin = (i) => ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const N = 1 << 15;
    const all = new Int32Array(N), thin = new Int32Array(N), stuck = new Int32Array(N);
    for (let p = 0; p < w * h; p++) {
      if (!drawn[p]) continue;
      const k = bin(p * 4);
      all[k]++;
      if (!thick[p]) thin[k]++;
      if (attached[p]) stuck[k]++;
    }
    const found = [];
    for (let k = 0; k < N; k++) {
      if (thin[k] < 300) continue;                 // too little of it to matter
      if (thin[k] < all[k] * 0.7) continue;        // has bulk: it is body art
      if (stuck[k] > all[k] * 0.05) continue;      // does double duty: hands off
      found.push([((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
    }
    return found;
  }

  // Find the poses as connected shapes.
  //
  // Scanning for empty rows and columns looks simpler, but it breaks as
  // soon as two rows of poses overlap vertically - one raised fist
  // reaching up into the row above is enough. A drawn character is always
  // one connected region, so labelling regions segments the sheet no
  // matter how the poses are packed.
  function findFrames(img) {
    const { data } = pixels(img);
    const w = img.width, h = img.height;
    const bg = dominant(data);

    // Three masks, and the difference between them matters.
    //   art  - real artwork: neither field nor frame line. This is what
    //          ends up in the sprite.
    //   line - the frame lines, grown a little so the soft edge where one
    //          was drawn over a figure comes with it. Painted over later.
    //   solid- art, closed, so a pose a line cut in two is one region
    //          again. Only ever used to tell the poses apart: closing also
    //          fills the notch between a glove and a hip, and what it
    //          fills there is background, not art.
    const field = new Uint8Array(w * h), drawn = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (isBg(data, p * 4, [bg]) || isShade(data, p * 4, bg)) field[p] = 1;
      else drawn[p] = 1;
    }

    // Three tests, covering different lines. A box out in the open field
    // floats free of everything. A ground line the figures stand on does
    // not float at all, but is unmistakably a long straight hairline. And
    // a colour used for nothing but lines condemns every last pixel of
    // itself, including the stretch of a box that runs close to a figure
    // and so looks attached.
    const thin = thinness(drawn, w, h);
    const line = floatingLines(drawn, w, h, thin);
    const rules = findRules(drawn, w, h);
    const keys = frameColors(data, drawn, w, h, thin);
    for (let p = 0; p < w * h; p++) {
      if (rules[p] || (keys.length && isBg(data, p * 4, keys))) line[p] = 1;
      if (line[p]) drawn[p] = 0;
    }

    // Background is not "every pixel of the key color" - it is the key
    // color the background can actually reach. Flood it in from the edges,
    // through the frame lines as well as the field, and anything of that
    // color left enclosed by artwork is artwork: the white of a flag patch
    // on a white sheet, the white core of a flame. Without this, keying on
    // a color the drawing also uses punches holes straight through it.
    // A first pass at the artwork, used only to measure how thick the
    // walls around a pocket are.
    const art0 = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) art0[p] = line[p] || field[p] ? 0 : 1;

    const outside = new Uint8Array(w * h);
    {
      const stack = [];
      const push = (p) => {
        if (outside[p] || !(field[p] || line[p])) return;
        outside[p] = 1; stack.push(p);
      };
      for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
      while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            push(ny * w + nx);
          }
        }
      }
    }

    // A pocket only counts as artwork if real bulk seals it. The rule
    // above saves a patch of the key colour walled in by a drawing - the
    // white of a flag patch on a white sheet - but the channel between a
    // fist and a hip is walled in too, and that is background showing
    // through, not artwork.
    //
    // So flood a second time through the drawing's *core*: erode the
    // artwork, and anything thinner than the erode is simply not there
    // any more, which lets the outside run through a hairline wall while
    // a limb's worth of drawing still seals. Only field pixels are ever
    // added, so eroding the artwork cannot eat into the artwork itself.
    //
    // Closing the outside instead is the obvious version and does not
    // work: a closing opens the wall and then erodes the pocket away
    // again, so raising its radius changes nothing at all.
    {
      const core = erode(art0, w, h, POCKET);
      const seen = new Uint8Array(w * h);
      const stack = [];
      const push = (p) => { if (seen[p] || core[p]) return; seen[p] = 1; stack.push(p); };
      for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
      while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        if (x > 0) push(p - 1);
        if (x < w - 1) push(p + 1);
        if (y > 0) push(p - w);
        if (y < h - 1) push(p + w);
      }
      for (let p = 0; p < w * h; p++) if (seen[p] && field[p]) outside[p] = 1;
    }

    // An enclosed patch of the key colour counts as artwork - that is the
    // rule that saves a white shirt on a white sheet, where the whole
    // inside of the fighter is walled in by its own outline. A gap between
    // a thigh and a chest is walled in exactly the same way and is not
    // artwork at all, and left in it is the brightest artifact a keyer can
    // produce: a magenta wedge at the crotch of every airborne frame.
    //
    // What tells them apart is not size but *share*. A garment is most of
    // a figure; a gap is a few percent of one. So measure each pocket
    // against the drawn region that encloses it. This also covers the two
    // shapes that used to have rules of their own - a speck sealed by a
    // wall that happened to be thick enough, and the long channel between
    // a fist and a hip - because both are small in exactly this sense.
    {
      const host = new Int32Array(w * h).fill(-1);
      const area = [];
      const stack = [];
      for (let p0 = 0; p0 < w * h; p0++) {
        if (host[p0] >= 0 || !art0[p0]) continue;
        const id = area.length;
        let n = 0;
        host[p0] = id; stack.push(p0);
        while (stack.length) {
          const p = stack.pop();
          n++;
          const x = p % w, y = (p / w) | 0;
          const step = (q, ok) => {
            if (!ok || host[q] >= 0 || !art0[q]) return;
            host[q] = id; stack.push(q);
          };
          step(p - 1, x > 0); step(p + 1, x < w - 1);
          step(p - w, y > 0); step(p + w, y < h - 1);
        }
        area.push(n);
      }

      const seen = new Uint8Array(w * h);
      const px = [];
      for (let p0 = 0; p0 < w * h; p0++) {
        if (seen[p0] || !field[p0] || outside[p0]) continue;
        px.length = 0;
        let around = -1;
        seen[p0] = 1; stack.push(p0);
        while (stack.length) {
          const p = stack.pop();
          px.push(p);
          const x = p % w, y = (p / w) | 0;
          const step = (q, ok) => {
            if (!ok) return;
            if (host[q] >= 0 && area[host[q]] > (around < 0 ? -1 : area[around])) {
              around = host[q];               // the biggest thing it touches
            }
            if (seen[q] || !field[q] || outside[q]) return;
            seen[q] = 1; stack.push(q);
          };
          step(p - 1, x > 0); step(p + 1, x < w - 1);
          step(p - w, y > 0); step(p + w, y < h - 1);
        }
        const big = around >= 0 && px.length >= area[around] * HOLE_SHARE;
        if (!big) for (const p of px) outside[p] = 1;
      }
    }

    const art = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (line[p]) continue;                          // frame lines never stay
      art[p] = field[p] && outside[p] ? 0 : 1;
    }
    let ruled = 0;
    for (let p = 0; p < w * h; p++) ruled += line[p];
    const lines = ruled ? dilate(line, w, h, 2) : line;
    const solid = ruled ? erode(dilate(art, w, h, BRIDGE), w, h, BRIDGE) : art;

    const label = new Int32Array(w * h).fill(-1);
    const blobs = [];
    const stack = [];
    for (let p0 = 0; p0 < w * h; p0++) {
      if (label[p0] >= 0 || !solid[p0]) continue;
      const id = blobs.length;
      const box = { id, x0: w, x1: -1, top: h, bottom: -1, area: 0 };
      label[p0] = id;
      stack.push(p0);
      while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        box.area++;
        if (x < box.x0) box.x0 = x;
        if (x > box.x1) box.x1 = x;
        if (y < box.top) box.top = y;
        if (y > box.bottom) box.bottom = y;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (label[q] >= 0 || !solid[q]) continue;
            label[q] = id;
            stack.push(q);
          }
        }
      }
      blobs.push(box);
    }
    if (!blobs.length) return [];

    // A pose is a big region; anything much smaller is either a speck of
    // background noise or a detached bit (a glove with a gap in its
    // outline), which is folded back into the pose it sits on.
    const areas = blobs.map((b) => b.area).sort((p, q) => q - p);
    const big = areas[Math.min(areas.length - 1, Math.floor(areas.length / 2))];
    const poses = blobs.filter((b) => b.area >= big * 0.35);
    for (const b of poses) b.ids = new Set([b.id]);
    for (const b of blobs) {
      if (b.ids) continue;                                // already a pose
      if (b.area < big * 0.004) continue;                 // speck: drop it
      const host = poses.find((o) => b.x0 <= o.x1 + 4 && b.x1 >= o.x0 - 4
                                  && b.top <= o.bottom + 4 && b.bottom >= o.top - 4);
      if (!host) continue;
      host.ids.add(b.id);
      host.x0 = Math.min(host.x0, b.x0); host.x1 = Math.max(host.x1, b.x1);
      host.top = Math.min(host.top, b.top);
      host.bottom = Math.max(host.bottom, b.bottom);
    }

    // Reading order: group into rows by vertical center, then left to right.
    const midH = poses.reduce((s2, b) => s2 + (b.bottom - b.top), 0) / poses.length;
    poses.sort((p, q) => (p.top + p.bottom) - (q.top + q.bottom));
    const rows = [];
    for (const b of poses) {
      const c = (b.top + b.bottom) / 2;
      const row = rows[rows.length - 1];
      if (row && Math.abs(c - row.c) < midH * 0.6) row.items.push(b);
      else rows.push({ c, items: [b] });
    }
    const ordered = [];
    for (const row of rows) {
      row.items.sort((p, q) => p.x0 - q.x0);
      ordered.push(...row.items);
    }

    return ordered.map((b) => measure(label, w, bg, art, lines, b));
  }

  // Foot anchor: the middle of the feet, so an outstretched arm does not
  // shove the fighter sideways when the frame is centered. Only the pose's
  // own regions count - two poses can overlap in their bounding boxes.
  function measure(label, w, bg, art, lines, b) {
    const { x0, x1, top, bottom, ids } = b;
    let fx0 = x1, fx1 = x0;
    const footTop = bottom - Math.max(2, Math.round((bottom - top) * 0.18));
    for (let y = footTop; y <= bottom; y++) {
      for (let x = x0; x <= x1; x++) {
        const q = y * w + x;
        if (art[q] && ids.has(label[q])) {
          if (x < fx0) fx0 = x;
          if (x > fx1) fx1 = x;
        }
      }
    }
    if (fx1 < fx0) { fx0 = x0; fx1 = x1; }
    return { x0, x1, top, bottom, ids, label, art, lines, sw: w, bg,
             anchor: (fx0 + fx1) / 2 };
  }

  // Cut one frame out, key the background, center it on the foot anchor and
  // scale it down smoothly (the same trick the stage panoramas use).
  function cutFrame(img, f, scale) {
    const src = document.createElement('canvas');
    const halfL = f.anchor - f.x0, halfR = f.x1 - f.anchor;
    const half = Math.ceil(Math.max(halfL, halfR)) + 1;
    src.width = half * 2;
    src.height = f.bottom - f.top + 1;
    const offX = Math.round(half - halfL);
    const sc = src.getContext('2d', { willReadFrequently: true });
    sc.drawImage(img, f.x0, f.top, f.x1 - f.x0 + 1, src.height,
                 offX, 0, f.x1 - f.x0 + 1, src.height);

    const id = sc.getImageData(0, 0, src.width, src.height);
    const px = id.data, iw = src.width, ih = src.height;
    // Keep this pose and nothing else: a bounding box can also contain a
    // speck of generator noise or a limb of the pose in the row above.
    // A frame line drawn across the figure becomes a hole to paint over.
    const hole = new Uint8Array(iw * ih);
    let left = 0;
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const p = y * iw + x;
        const sx = f.x0 + x - offX, sy = f.top + y;
        const mine = sx >= f.x0 && sx <= f.x1 && f.ids.has(f.label[sy * f.sw + sx]);
        const q = sy * f.sw + sx;
        if (mine && f.art[q]) continue;
        if (mine && f.lines[q]) { hole[p] = 1; left++; continue; }
        px[p * 4 + 3] = 0;
      }
    }

    // Where a frame line was drawn across the figure it leaves a slit
    // inside the silhouette. Paint it over from the artwork on either
    // side; a few pixels wide, it closes in a couple of passes and beats
    // both a magenta stripe and a transparent cut.
    if (left) {
      for (let pass = 0; left && pass < THIN_MAX * 2; pass++) {
        const fixed = [];
        for (let p = 0; p < iw * ih; p++) {
          if (!hole[p]) continue;
          const x = p % iw, y = (p / iw) | 0;
          let n = 0, r = 0, g = 0, b = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= iw || ny >= ih) continue;
            const q = ny * iw + nx;
            if (hole[q] || !px[q * 4 + 3]) continue;
            r += px[q * 4]; g += px[q * 4 + 1]; b += px[q * 4 + 2]; n++;
          }
          if (n) fixed.push([p, r / n, g / n, b / n]);
        }
        if (!fixed.length) break;
        for (const [p, r, g, b] of fixed) {
          px[p * 4] = r; px[p * 4 + 1] = g; px[p * 4 + 2] = b;
          hole[p] = 0; left--;
        }
      }
      for (let p = 0; p < iw * ih; p++) if (hole[p]) px[p * 4 + 3] = 0;
    }
    // Soften the edge. Generated art fades into the key color over several
    // pixels; keying it away with a yes/no test either leaves a colored rim
    // or bites chunks out of the silhouette. So walk at most EDGE_BAND
    // pixels inwards from the background, give each of those pixels a
    // fractional alpha from how far its color still sits from the key
    // color, and then mix the key color back out of what is left. Depth and
    // distance together protect the artwork: nothing deeper inside is ever
    // touched, and neither is anything that already looks nothing like the
    // background - so Klaus keeps his blue gloves next to magenta.
    const dist2 = (i) => {
      const dr = px[i] - f.bg[0], dg = px[i + 1] - f.bg[1], db = px[i + 2] - f.bg[2];
      return dr * dr + dg * dg + db * db;
    };
    {
      const dist = new Float32Array(iw * ih);
      for (let p = 0; p < iw * ih; p++) {
        if (px[p * 4 + 3]) dist[p] = Math.sqrt(dist2(p * 4));
      }

      const depth = new Int16Array(iw * ih).fill(-1);
      const queue = [];
      for (let p = 0; p < iw * ih; p++) {
        if (px[p * 4 + 3] === 0) { depth[p] = 0; queue.push(p); }
      }
      for (let head = 0; head < queue.length; head++) {
        const p = queue[head];
        if (depth[p] >= EDGE_BAND) continue;
        const x = p % iw, y = (p / iw) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= iw || ny >= ih) continue;
          const q = ny * iw + nx;
          if (depth[q] >= 0) continue;
          depth[q] = depth[p] + 1;
          queue.push(q);
        }
      }

      // How transparent a blended pixel is depends on the color it was
      // blended with: half a black boot mixed into magenta lands somewhere
      // else than half an olive sleeve. So read the reference off the solid
      // art right next to the pixel instead of off the frame as a whole -
      // one global threshold tints dark edges purple. Pixels deeper than
      // the band are the ones that are definitely artwork.
      const inner = [];
      for (let p = 0; p < iw * ih; p++) if (depth[p] < 0) inner.push(dist[p]);
      inner.sort((p, q) => p - q);
      const fallback = inner.length ? inner[inner.length >> 1] : TOL * 4;

      const R = 3;
      for (let p = 0; p < iw * ih; p++) {
        if (depth[p] <= 0) continue;                  // background, or deep inside
        const i = p * 4;
        const d = dist[p];
        const x = p % iw, y = (p / iw) | 0;
        let ref = 0;
        for (let ny = Math.max(0, y - R); ny <= Math.min(ih - 1, y + R); ny++) {
          for (let nx = Math.max(0, x - R); nx <= Math.min(iw - 1, x + R); nx++) {
            const q = ny * iw + nx;
            if (depth[q] >= 0) continue;              // still edge: no reference
            if (dist[q] > ref) ref = dist[q];
          }
        }
        // A speck floating on its own has no artwork to compare against;
        // judging it by itself would always call it solid, which is how
        // leftover flecks of key color survive. Use the frame instead.
        if (ref === 0) ref = fallback;
        const T1 = Math.max(TOL * 2, ref * 0.9);
        if (d >= T1) continue;                        // nothing like the key color
        const a = (d - TOL) / (T1 - TOL);
        if (a <= 0) { px[i + 3] = 0; continue; }
        for (let k = 0; k < 3; k++) {
          const v = (px[i + k] - (1 - a) * f.bg[k]) / a;
          px[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        px[i + 3] = Math.round(a * 255);
      }
    }
    sc.putImageData(id, 0, 0);

    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(src.width * scale));
    out.height = Math.max(1, Math.round(src.height * scale));
    const oc = out.getContext('2d');
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = 'high';
    oc.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }

  // Tip a frame onto its back: head away from the opponent, feet toward
  // it. Sheets never include a lying pose, and leaving a K.O.'d fighter
  // standing looks plainly wrong.
  function toppled(cv) {
    const out = document.createElement('canvas');
    out.width = cv.height; out.height = cv.width;
    const c = out.getContext('2d');
    c.translate(out.width, 0);
    c.rotate(Math.PI / 2);
    c.scale(1, -1);
    c.translate(0, -cv.height);
    c.drawImage(cv, 0, 0);
    return out;
  }

  function flip(cv) {
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const c = out.getContext('2d');
    c.translate(cv.width, 0);
    c.scale(-1, 1);
    c.drawImage(cv, 0, 0);
    return out;
  }

  // What each pose was last written from, so load order does not decide
  // the result: a strip's walk beats the main sheet's walk whichever
  // image the browser finishes first.
  const RANK = {};

  function install(charKey, img, order, rank) {
    const frames = findFrames(img);
    if (!frames.length) return 0;

    const S = DD.sprites;
    const strip = rank > 1;         // a strip does not run the aliases: its
                                    // job is the movement it carries, not
                                    // standing in for what a sheet lacks

    // One scale for the whole sheet, so the poses keep their relative
    // sizes - a crouch really does stay shorter than a stance. The
    // reference is the fighting stance, not the tallest frame: a special
    // wrapped in flames or trailing a rocket plume is far taller than the
    // fighter, and measuring against it would shrink everybody.
    let at = order.indexOf('idle0');
    if (at < 0) at = order.indexOf(ANCHOR);
    const stand = frames[at];
    const ref = stand ? stand.bottom - stand.top + 1
      : Math.max(...frames.map((f) => f.bottom - f.top + 1));
    const scale = STAND_H / ref;
    const cut = {};
    frames.forEach((f, i) => {
      const pose = order[i];
      if (!pose || pose === ANCHOR || cut[pose]) return;
      cut[pose] = cutFrame(img, f, scale);
    });
    if (!strip) {
      if (!cut.ko0 && (cut.hurt0 || cut.idle0)) {
        cut.ko0 = toppled(cut.hurt0 || cut.idle0);
      }
      for (const [pose, from] of Object.entries(ALIAS)) {
        if (!cut[pose] && cut[from]) cut[pose] = cut[from];
      }
    }

    const rankOf = RANK[charKey] || (RANK[charKey] = {});
    let n = 0;
    for (const [pose, cv] of Object.entries(cut)) {
      if ((rankOf[pose] || 0) > rank) continue;
      rankOf[pose] = rank;
      const pair = { right: cv, left: flip(cv) };
      for (const skin of Object.keys(S.frames[charKey])) {
        S.frames[charKey][skin][pose] = pair;
      }
      S.meta[charKey][pose] = { w: cv.width, h: cv.height, bottom: cv.height };
      n++;
    }
    S.CHARS[charKey].scale = 1;
    return n;
  }

  // A strip brings its timing with it. Until the file is actually in and
  // its drawings are cut, the character keeps the animation it had - so a
  // missing strip is a character with a shorter punch, not a broken one.
  function loadSheet(charKey, file, order, rank, label, anims) {
    const src = (DD.SHEETS && DD.SHEETS[file]) || `assets/${file}.png`;
    const img = new Image();
    img.onload = () => {
      try {
        const n = install(charKey, img, order, rank);
        if (n && anims) Object.assign(DD.sprites.CHARS[charKey].anims, anims);
        if (n) console.info(`[dojo] ${label}: ${n} frames from sprite sheet`);
      } catch (e) {
        console.warn(`[dojo] ${label}: sheet import failed`, e);
      }
    };
    img.onerror = () => { /* no sheet: keep whatever is already there */ };
    img.src = src;
  }

  function load() {
    for (const charKey of Object.keys(DD.sprites.CHARS)) {
      loadSheet(charKey, charKey, SHEET_ORDER[charKey] || ORDER, 1, charKey);
      for (const [move, strip] of Object.entries(STRIPS[charKey] || {})) {
        loadSheet(charKey, `${charKey}-${move}`, strip.order, 2,
          `${charKey} ${move}`, strip.anims);
      }
    }
  }

  // `inspect` is for checking a new sheet: it returns the detected frames
  // in reading order, so a dev page can render them numbered and you can
  // see exactly which pose the importer thinks is which.
  function inspect(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const frames = findFrames(img);
        const tallest = Math.max(...frames.map((f) => f.bottom - f.top + 1));
        resolve(frames.map((f) => cutFrame(img, f, STAND_H / tallest)));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // `keysOf` reports what the importer decided is background for a sheet:
  // the flat field first, then any frame lines it found. Handy when a sheet
  // comes out wrong and you need to know whether the lines were spotted.
  function keysOf(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { data } = pixels(img);
        const w = img.width, h = img.height;
        const bg = dominant(data);
        const drawn = new Uint8Array(w * h);
        for (let p = 0; p < w * h; p++) {
          drawn[p] = (isBg(data, p * 4, [bg]) || isShade(data, p * 4, bg)) ? 0 : 1;
        }
        const thin = thinness(drawn, w, h);
        const floating = floatingLines(drawn, w, h, thin);
        const rules = findRules(drawn, w, h);
        const keys = frameColors(data, drawn, w, h, thin);
        let f = 0, r = 0;
        for (let p = 0; p < w * h; p++) { f += floating[p]; r += rules[p]; }
        resolve({ field: bg, thinness: thin, floatingLinePixels: f,
                  rulePixels: r, lineColors: keys });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // `dominant` and `isBg` are what "background" means in this project.
  // The select-screen portraits come off the same magenta field and have
  // to agree with the sheets about that, so they borrow the decision
  // rather than making a second one that can drift.
  DD.spritesheet = {
    load, inspect, keysOf, ORDER, SHEET_ORDER, STRIPS, ANCHOR, STAND_H,
    pixels, dominant, isBg,
  };
})();
