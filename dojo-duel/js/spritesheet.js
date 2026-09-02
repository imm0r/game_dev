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
  const THIN = 5;             // anything thinner than this is a drawn line,
                              // not a limb
  const BRIDGE = 3;           // close gaps this wide when a removed line cut
                              // a pose in two - wide enough for the line,
                              // narrow enough to keep two poses apart

  // Frames are mapped in reading order. The default follows the pose list
  // in assets/README.md; a character whose sheet is laid out differently
  // gets its own list here. A shorter sheet is fine: whatever it does not
  // cover keeps the generated art.
  const ORDER = [
    'idle0', 'walk1', 'pun1', 'kick1', 'sp1',
    'jmp1', 'crouch0', 'block0', 'hurt0', 'win0',
  ];
  // Both roster sheets follow the 20-pose list in assets/README.md.
  //
  // Only one pose is left over. Klaus's "special B" is a dash trailing hot
  // pink speed lines - the same color the background is keyed on, so it
  // cannot be separated from it - and Antoine's is a second effect punch
  // no move needs. Everything else the generators drew is in the game.
  const SHEET_ORDER = {
    // Klaus draws "walking steps" as two frames, so his sheet has 21.
    klaus: [
      'idle0', 'idle1', 'walk1', 'walk2', 'run0', 'pun1', 'upp0',
      'cpun0', 'kick1', 'swp0', 'air0', 'sp1', 'rush0', null,
      'jmp1', 'crouch0', 'block0', 'hurt0', 'kof0', 'win0', 'ko0',
    ],
    antoine: [
      'idle0', 'idle1', 'walk1', 'run0', 'pun1', 'upp0',
      'cpun0', 'kick1', 'swp0', 'air0', 'sp1', null, 'rush0',
      'jmp1', 'crouch0', 'block0', 'hurt0', 'kof0', 'win0', 'ko0',
    ],
  };
  // Poses reused from an imported one, so a small sheet still animates.
  // Order matters: an entry may lean on one resolved above it.
  const ALIAS = {
    idle1: 'idle0', walk0: 'walk1', walk2: 'idle1', walk3: 'walk2',
    pun0: 'idle0', pun2: 'pun1', kick0: 'idle0', air0: 'kick1',
    sp0: 'idle0', jmp0: 'jmp1', jmp2: 'jmp1', run0: 'walk1',
    cpun0: 'crouch0', swp0: 'crouch0', upp0: 'pun1', rush0: 'sp1',
    kof0: 'hurt0', ko0: 'hurt0',
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

  // Frame lines. Generators like to draw a grid or a box around each pose,
  // and those lines are poison here: they run through several poses at
  // once, so labelling would fuse the whole sheet into one region.
  //
  // Two things are true of a drawn line and of nothing else. It is thin -
  // erase everything thinner than THIN and it vanishes, while a body color
  // always has bulk behind it. And it floats on its own: a grid line runs
  // across empty field, while every thin thing in the artwork - an outline,
  // the gold trim on a pair of trunks, a strand of hair - is attached to
  // the body it belongs to. The second test is what keeps this from
  // dissolving the characters along with the grid.
  function frameColors(data, w, h, bg) {
    const fg = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) fg[p] = isBg(data, p * 4, [bg]) ? 0 : 1;
    const thick = dilate(erode(fg, w, h, THIN), w, h, THIN);
    const attached = dilate(thick, w, h, 3);

    const bin = (i) => ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const N = 1 << 15;
    const all = new Int32Array(N), thin = new Int32Array(N), stuck = new Int32Array(N);
    for (let p = 0; p < w * h; p++) {
      if (!fg[p]) continue;
      const k = bin(p * 4);
      all[k]++;
      if (!thick[p]) thin[k]++;
      if (attached[p]) stuck[k]++;
    }
    const found = [];
    for (let k = 0; k < N; k++) {
      if (thin[k] < 300) continue;                 // too little of it to matter
      if (thin[k] < all[k] * 0.7) continue;        // has bulk: it is body art
      if (stuck[k] > all[k] * 0.35) continue;      // hangs off a body: not a line
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
    const keys = [bg, ...frameColors(data, w, h, bg)];

    // Three masks, and the difference between them matters.
    //   art  - real artwork: neither field nor frame line. This is what
    //          ends up in the sprite.
    //   line - the frame lines, grown a little so the soft edge where one
    //          was drawn over a figure comes with it. Painted over later.
    //   solid- art, closed, so a pose a line cut in two is one region
    //          again. Only ever used to tell the poses apart: closing also
    //          fills the notch between a glove and a hip, and what it
    //          fills there is background, not art.
    const field = new Uint8Array(w * h), line = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (isBg(data, i, [bg])) field[p] = 1;         // the flat field
      else if (isBg(data, i, keys)) line[p] = 1;     // a frame line
    }

    // Background is not "every pixel of the key color" - it is the key
    // color the background can actually reach. Flood it in from the edges,
    // through the frame lines as well as the field, and anything of that
    // color left enclosed by artwork is artwork: the white of a flag patch
    // on a white sheet, the white core of a flame. Without this, keying on
    // a color the drawing also uses punches holes straight through it.
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

    const art = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (line[p]) continue;                          // frame lines never stay
      art[p] = field[p] && outside[p] ? 0 : 1;
    }
    const lines = keys.length > 1 ? dilate(line, w, h, 2) : line;
    const solid = keys.length > 1
      ? erode(dilate(art, w, h, BRIDGE), w, h, BRIDGE)
      : art;

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
      for (let pass = 0; left && pass < THIN * 2; pass++) {
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

  function install(charKey, img) {
    const frames = findFrames(img);
    if (!frames.length) return 0;

    const S = DD.sprites;
    const order = SHEET_ORDER[charKey] || ORDER;

    // One scale for the whole sheet, so the poses keep their relative
    // sizes - a crouch really does stay shorter than a stance. The
    // reference is the fighting stance, not the tallest frame: a special
    // wrapped in flames or trailing a rocket plume is far taller than the
    // fighter, and measuring against it would shrink everybody.
    const stand = frames[order.indexOf('idle0')];
    const ref = stand ? stand.bottom - stand.top + 1
      : Math.max(...frames.map((f) => f.bottom - f.top + 1));
    const scale = STAND_H / ref;
    const cut = {};
    frames.forEach((f, i) => {
      const pose = order[i];
      if (!pose || cut[pose]) return;
      cut[pose] = cutFrame(img, f, scale);
    });
    if (!cut.ko0 && (cut.hurt0 || cut.idle0)) {
      cut.ko0 = toppled(cut.hurt0 || cut.idle0);
    }
    for (const [pose, from] of Object.entries(ALIAS)) {
      if (!cut[pose] && cut[from]) cut[pose] = cut[from];
    }

    let n = 0;
    for (const [pose, cv] of Object.entries(cut)) {
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

  function load() {
    for (const charKey of ['klaus', 'antoine', 'hanzo']) {
      const src = (DD.SHEETS && DD.SHEETS[charKey]) || `assets/${charKey}.png`;
      const img = new Image();
      img.onload = () => {
        try {
          const n = install(charKey, img);
          if (n) console.info(`[dojo] ${charKey}: ${n} frames from sprite sheet`);
        } catch (e) {
          console.warn(`[dojo] ${charKey}: sheet import failed`, e);
        }
      };
      img.onerror = () => { /* no sheet: keep the generated art */ };
      img.src = src;
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
        const bg = dominant(data);
        resolve([bg, ...frameColors(data, img.width, img.height, bg)]);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  DD.spritesheet = { load, inspect, keysOf, ORDER, SHEET_ORDER, STAND_H };
})();
