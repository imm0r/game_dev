// Character select portraits.
//
// One image, `assets/portraits.png`, with the roster's faces side by side
// in the same order as `DD.C.ROSTER`. Unlike a fighter sheet a portrait is
// a picture, not a cut-out: it keeps whatever background it was painted
// with, so nothing is keyed out here. The image is simply split into as
// many equal columns as there are fighters and each column is scaled down
// once, smoothly, to the size the select screen draws it at.
//
// No file, no problem: the select screen falls back to the fighter's own
// victory pose, the same stand-in the victory splash uses.
window.DD = window.DD || {};

(function () {
  const PANEL_W = 72;         // the select screen's panel, in game pixels
  const PANEL_H = 98;

  const frames = [];          // by roster index
  let loaded = false;

  // One column of the sheet, scaled to fit the panel without distorting
  // it. Painted art needs the smoothed downscale - nearest-neighbour on a
  // brush stroke is noise, not pixel art.
  function cut(img, i, n) {
    const sw = Math.floor(img.width / n);
    const sx = i * sw;
    const scale = Math.min(PANEL_W / sw, PANEL_H / img.height);
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(img, sx, 0, sw, img.height, 0, 0, w, h);
    return cv;
  }

  function load() {
    const src = (DD.SHEETS && DD.SHEETS.portraits) || 'assets/portraits.png';
    const img = new Image();
    img.onload = () => {
      const n = DD.C.ROSTER.length;
      if (!img.width || !img.height) return;
      for (let i = 0; i < n; i++) frames[i] = cut(img, i, n);
      loaded = true;
      console.info(`[dojo] portraits: ${n} from ${src}`);
    };
    img.onerror = () => { /* no portraits: the win pose stands in */ };
    img.src = src;
  }

  DD.portraits = {
    load,
    PANEL_W,
    PANEL_H,
    get(i) { return loaded ? frames[i] : null; },
    get ready() { return loaded; },
  };
})();
