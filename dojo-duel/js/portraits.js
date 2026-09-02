// Character select portraits.
//
// One image per fighter, `assets/portrait-<name>.png`, painted on the same
// flat field as the sprite sheets. The field is keyed out and the picture
// cropped to what is left, so the generator can frame the shot however it
// likes and the screen still gets a clean rectangle.
//
// Unlike a fighter sheet nothing else is done to it: no pose finding, no
// alignment, no matte. A portrait is a picture. It is scaled down once,
// smoothly, to the panel it is drawn in.
//
// No file, no problem: the select screen falls back to the fighter's own
// victory pose, the same stand-in the victory splash uses.
window.DD = window.DD || {};

(function () {
  const PANEL_W = 72;         // the select screen's panel, in game pixels
  const PANEL_H = 98;
  const SPLASH_W = 94;        // ...and the victory splash's, which is bigger
  const SPLASH_H = 126;

  const cutouts = {};         // keyed and cropped, at source resolution
  const sized = {};           // scaled copies, by `char:WxH`
  let pending = 0;

  // Everything the flat field can reach from the edge of the image is
  // background; anything of that colour walled in by the artwork is
  // artwork. Same rule the sprite sheets use, for the same reason.
  function keyOut(img) {
    const S = DD.spritesheet;
    const id = S.pixels(img);
    const d = id.data;
    const w = img.width, h = img.height;
    const bg = [S.dominant(d)];

    const outside = new Uint8Array(w * h);
    const stack = [];
    const push = (p) => {
      if (outside[p] || !S.isBg(d, p * 4, bg)) return;
      outside[p] = 1; stack.push(p);
    };
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

    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let p = 0; p < w * h; p++) {
      if (outside[p]) { d[p * 4 + 3] = 0; continue; }
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < x0) return null;                    // the whole image is field

    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const c = out.getContext('2d');
    const full = document.createElement('canvas');
    full.width = w; full.height = h;
    full.getContext('2d').putImageData(id, 0, 0);
    c.drawImage(full, x0, y0, cw, ch, 0, 0, cw, ch);
    return out;
  }

  // Fill the box rather than fit inside it, so portraits drawn at
  // different aspect ratios still make one tidy row. What is over is
  // cropped off the sides and the bottom - a portrait is framed on the
  // face, and it is the belt that can go.
  //
  // Painted art needs the smoothed downscale; nearest-neighbour on a
  // brush stroke is noise, not pixel art.
  function fit(cut, bw, bh) {
    const scale = Math.max(bw / cut.width, bh / cut.height);
    const sw = Math.min(cut.width, bw / scale);
    const sh = Math.min(cut.height, bh / scale);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(sw * scale));
    out.height = Math.max(1, Math.round(sh * scale));
    const c = out.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(cut, (cut.width - sw) / 2, 0, sw, sh, 0, 0, out.width, out.height);
    return out;
  }

  function load() {
    for (const e of DD.C.ROSTER) {
      const src = (DD.SHEETS && DD.SHEETS[`portrait-${e.char}`])
        || `assets/portrait-${e.char}.png`;
      const img = new Image();
      pending++;
      img.onload = () => {
        try {
          const cv = keyOut(img);
          if (cv) cutouts[e.char] = cv;
        } catch (err) {
          console.warn(`[dojo] ${e.char}: portrait failed`, err);
        }
        if (--pending === 0) {
          const n = Object.keys(cutouts).length;
          if (n) console.info(`[dojo] portraits: ${n} loaded`);
        }
      };
      img.onerror = () => { pending--; };   // no portrait: the win pose stands in
      img.src = src;
    }
  }

  // Scaled copies are cached: two sizes are ever asked for, and a portrait
  // is resampled once rather than every frame it is on screen.
  function at(charKey, bw, bh) {
    const cut = cutouts[charKey];
    if (!cut) return null;
    const key = `${charKey}:${bw}x${bh}`;
    if (!sized[key]) sized[key] = fit(cut, bw, bh);
    return sized[key];
  }

  DD.portraits = {
    load,
    PANEL_W,
    PANEL_H,
    SPLASH_W,
    SPLASH_H,
    get(charKey) { return at(charKey, PANEL_W, PANEL_H); },
    splash(charKey) { return at(charKey, SPLASH_W, SPLASH_H); },
  };
})();
