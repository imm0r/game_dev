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
  const GAP = 2;              // background columns that separate two poses

  // Frames are mapped in the order they appear on the sheet. A shorter
  // sheet is fine: whatever it does not cover keeps the generated art.
  const ORDER = [
    'idle0', 'walk1', 'pun1', 'kick1', 'sp1',
    'jmp1', 'crouch0', 'block0', 'hurt0', 'win0',
  ];
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

  // Split into frames along empty columns, then trim each one vertically.
  function findFrames(img) {
    const { data } = pixels(img);
    const w = img.width, h = img.height;
    const bg = backgroundOf(data, w, h);

    const filled = new Array(w).fill(false);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (!isBg(data, (y * w + x) * 4, bg)) { filled[x] = true; break; }
      }
    }

    const spans = [];
    let start = -1, blank = 0;
    for (let x = 0; x < w; x++) {
      if (filled[x]) {
        if (start < 0) start = x;
        blank = 0;
      } else if (start >= 0 && ++blank >= GAP) {
        spans.push([start, x - blank]);
        start = -1;
      }
    }
    if (start >= 0) spans.push([start, w - 1]);

    return spans.map(([x0, x1]) => {
      let top = h, bottom = -1;
      for (let y = 0; y < h; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!isBg(data, (y * w + x) * 4, bg)) {
            if (y < top) top = y;
            bottom = y;
            break;
          }
        }
      }
      // Horizontal anchor: the middle of the feet, not of the bounding box,
      // so an outstretched arm does not shove the fighter sideways.
      let fx0 = x1, fx1 = x0;
      const footTop = bottom - Math.max(2, Math.round((bottom - top) * 0.18));
      for (let y = footTop; y <= bottom; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!isBg(data, (y * w + x) * 4, bg)) {
            if (x < fx0) fx0 = x;
            if (x > fx1) fx1 = x;
          }
        }
      }
      return { x0, x1, top, bottom, anchor: (fx0 + fx1) / 2, bg };
    }).filter((f) => f.bottom >= f.top);
  }

  // Cut one frame out, key the background, center it on the foot anchor and
  // scale it down smoothly (the same trick the stage panoramas use).
  function cutFrame(img, f, scale) {
    const src = document.createElement('canvas');
    const halfL = f.anchor - f.x0, halfR = f.x1 - f.anchor;
    const half = Math.ceil(Math.max(halfL, halfR)) + 1;
    src.width = half * 2;
    src.height = f.bottom - f.top + 1;
    const sc = src.getContext('2d', { willReadFrequently: true });
    sc.drawImage(img, f.x0, f.top, f.x1 - f.x0 + 1, src.height,
                 Math.round(half - halfL), 0, f.x1 - f.x0 + 1, src.height);

    const id = sc.getImageData(0, 0, src.width, src.height);
    for (let i = 0; i < id.data.length; i += 4) {
      if (isBg(id.data, i, f.bg)) id.data[i + 3] = 0;
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
    const cut = {};
    frames.forEach((f, i) => {
      if (i >= ORDER.length) return;
      cut[ORDER[i]] = cutFrame(img, f, scale);
    });
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

  DD.spritesheet = { load, ORDER, TARGET_H };
})();
