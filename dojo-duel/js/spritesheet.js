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
  const TARGET_H = 74;        // fighter height in game pixels
  const TOL = 46;             // background color tolerance (0-255 per channel)
  const EDGE_BAND = 6;        // how far a soft edge may reach into the pose

  // Frames are mapped in reading order. The default follows the pose list
  // in assets/README.md; a character whose sheet is laid out differently
  // gets its own list here. A shorter sheet is fine: whatever it does not
  // cover keeps the generated art.
  const ORDER = [
    'idle0', 'walk1', 'pun1', 'kick1', 'sp1',
    'jmp1', 'crouch0', 'block0', 'hurt0', 'win0',
  ];
  const SHEET_ORDER = {
    // Klaus: 7 + 7 poses. Row two is mostly stance variants, which make a
    // livelier walk cycle than repeating one frame.
    klaus: [
      'idle0', 'walk1', 'pun1', 'kick1', 'sp1', 'jmp1', 'block0',
      'idle1', 'walk0', 'walk2', 'crouch0', 'walk3', 'hurt0', 'win0',
    ],
    // Antoine: 5 + 7 poses.
    antoine: [
      'idle0', 'walk1', 'pun1', 'kick1', 'jmp1',
      'idle1', 'walk0', 'sp1', 'crouch0', 'block0', 'hurt0', 'win0',
    ],
  };
  // Poses reused from an imported one, so a small sheet still animates.
  const ALIAS = {
    idle1: 'idle0', walk0: 'walk1', walk2: 'walk1', walk3: 'walk1',
    pun0: 'idle0', pun2: 'pun1', kick0: 'idle0',
    sp0: 'idle0', jmp0: 'jmp1', jmp2: 'jmp1',
    kof0: 'hurt0', ko0: 'hurt0',
  };

  function pixels(img) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    return c.getImageData(0, 0, img.width, img.height);
  }

  // Background = whatever fills the corners (a flat key color), or alpha 0.
  function backgroundOf(data, w, h) {
    const at = (x, y) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
    const tally = new Map();
    for (const c of corners) {
      const k = c.slice(0, 3).join(',');
      tally.set(k, (tally.get(k) || 0) + 1);
    }
    let best = null, bestN = 0;
    for (const [k, n] of tally) if (n > bestN) { best = k; bestN = n; }
    return best.split(',').map(Number);
  }

  function isBg(data, i, bg) {
    if (data[i + 3] < 24) return true;
    return Math.abs(data[i] - bg[0]) <= TOL
        && Math.abs(data[i + 1] - bg[1]) <= TOL
        && Math.abs(data[i + 2] - bg[2]) <= TOL;
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
    const bg = backgroundOf(data, w, h);

    const label = new Int32Array(w * h).fill(-1);
    const blobs = [];
    const stack = [];
    for (let p0 = 0; p0 < w * h; p0++) {
      if (label[p0] >= 0 || isBg(data, p0 * 4, bg)) continue;
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
            if (label[q] >= 0 || isBg(data, q * 4, bg)) continue;
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

    return ordered.map((b) => measure(label, w, bg, b));
  }

  // Foot anchor: the middle of the feet, so an outstretched arm does not
  // shove the fighter sideways when the frame is centered. Only the pose's
  // own regions count - two poses can overlap in their bounding boxes.
  function measure(label, w, bg, b) {
    const { x0, x1, top, bottom, ids } = b;
    let fx0 = x1, fx1 = x0;
    const footTop = bottom - Math.max(2, Math.round((bottom - top) * 0.18));
    for (let y = footTop; y <= bottom; y++) {
      for (let x = x0; x <= x1; x++) {
        if (ids.has(label[y * w + x])) {
          if (x < fx0) fx0 = x;
          if (x > fx1) fx1 = x;
        }
      }
    }
    if (fx1 < fx0) { fx0 = x0; fx1 = x1; }
    return { x0, x1, top, bottom, ids, label, sw: w, anchor: (fx0 + fx1) / 2, bg };
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
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const sx = f.x0 + x - offX, sy = f.top + y;
        if (sx >= f.x0 && sx <= f.x1 && f.ids.has(f.label[sy * f.sw + sx])) continue;
        px[(y * iw + x) * 4 + 3] = 0;
      }
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

    // One scale for the whole sheet, from the tallest pose, so the poses
    // keep their relative sizes (a crouch really is shorter).
    const tallest = Math.max(...frames.map((f) => f.bottom - f.top + 1));
    const scale = TARGET_H / tallest;

    const S = DD.sprites;
    const order = SHEET_ORDER[charKey] || ORDER;
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
        resolve(frames.map((f) => cutFrame(img, f, TARGET_H / tallest)));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  DD.spritesheet = { load, inspect, ORDER, SHEET_ORDER, TARGET_H };
})();
