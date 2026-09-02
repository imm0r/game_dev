// Impact effects: the layer between "a hit was registered" and "a hit felt
// like it landed". Bursts, dust, motion trails and screen flashes all live
// here so the game loop only has to say what happened, not how it looks.
window.DD = window.DD || {};

(function () {
  // Each palette runs from the flash of contact to what is left of it.
  const PALETTES = {
    hit: ['#ffffff', '#fcf4a0', '#f8d020', '#f88020', '#c04010'],
    block: ['#ffffff', '#c8ecff', '#88c8f8', '#4890d8', '#204880'],
    super: ['#ffffff', '#d8f8ff', '#59f8e8', '#40a8f8', '#2050a0'],
  };

  const bursts = [];
  const dust = [];
  const fx = {
    flash: 0,        // frames of full-screen white left
    tint: 0,         // frames of darkened backdrop left (super start-up)
  };

  // `power` scales the whole thing: a jab and a super should not look alike.
  function burst(x, y, kind, power) {
    const p = Math.max(0.6, Math.min(2.2, power || 1));
    bursts.push({
      x, y, kind,
      t: 0,
      life: Math.round(10 + p * 6),
      size: 7 + p * 7,
      spokes: p > 1.4 ? 8 : 6,
      rot: Math.random() * Math.PI,
    });
    // a few chips of debris thrown off the impact
    for (let i = 0; i < Math.round(4 + p * 4); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.6 + Math.random() * 1.8) * p;
      dust.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.6,
        life: 9 + Math.random() * 9,
        gravity: 0.14,
        col: PALETTES[kind][1 + (i % 3)],
      });
    }
  }

  // Landing, and scraping to a stop: low, wide, and it stays on the floor.
  function puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      dust.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y - Math.random() * 2,
        vx: dir * (0.4 + Math.random() * 1.1),
        vy: -Math.random() * 0.5,
        life: 12 + Math.random() * 8,
        gravity: 0.02,
        col: i % 3 ? '#b0a8b8' : '#e0d8e0',
      });
    }
  }

  function update() {
    for (const b of bursts) b.t++;
    for (let i = bursts.length - 1; i >= 0; i--) {
      if (bursts[i].t >= bursts[i].life) bursts.splice(i, 1);
    }
    for (const d of dust) {
      d.x += d.vx; d.y += d.vy; d.vy += d.gravity; d.vx *= 0.94; d.life--;
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      if (dust[i].life <= 0) dust.splice(i, 1);
    }
    if (fx.flash > 0) fx.flash--;
    if (fx.tint > 0) fx.tint--;
  }

  function reset() {
    bursts.length = 0;
    dust.length = 0;
    fx.flash = 0;
    fx.tint = 0;
  }

  // Drawn inside the camera transform, so effects sit in the world.
  function drawWorld(ctx) {
    for (const d of dust) {
      ctx.globalAlpha = Math.min(1, d.life / 7);
      ctx.fillStyle = d.col;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }
    ctx.globalAlpha = 1;

    for (const b of bursts) {
      const p = b.t / b.life;
      const pal = PALETTES[b.kind] || PALETTES.hit;
      const col = pal[Math.min(pal.length - 1, Math.floor(p * pal.length))];
      ctx.globalAlpha = Math.max(0, 1 - p * p);

      // Core: white at the moment of contact, then the palette takes over.
      // Drawn as a diamond and capped - a filled square scaled off the
      // full burst size reads as a slab the size of a fighter's head on
      // the heavy hits, which is where the energy is meant to be spokes.
      const cr = Math.max(1, Math.min(5, Math.round(b.size * (1 - p) * 0.35)));
      ctx.fillStyle = p < 0.35 ? '#ffffff' : col;
      for (let dy = -cr; dy <= cr; dy++) {
        const half = cr - Math.abs(dy);
        ctx.fillRect(Math.round(b.x - half), Math.round(b.y + dy), half * 2 + 1, 1);
      }

      // spokes, drawn as chunks so they stay pixels rather than lines
      const r = b.size * (0.4 + p * 1.0);
      ctx.fillStyle = col;
      for (let i = 0; i < b.spokes; i++) {
        const a = b.rot + (i / b.spokes) * Math.PI * 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        for (let d = r * 0.5; d <= r; d += 1.6) {
          ctx.fillRect(Math.round(b.x + dx * d), Math.round(b.y + dy * d), 2, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Over the stage but under the fighters: a super dims the world it is
  // happening in, not the person doing it.
  function drawTint(ctx, w, h) {
    if (fx.tint <= 0) return;
    ctx.fillStyle = 'rgba(10, 6, 24, 0.5)';
    ctx.fillRect(0, 0, w, h);
  }

  // Over everything.
  function drawScreen(ctx, w, h) {
    if (fx.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, fx.flash / 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  DD.fx = {
    burst, puff, update, reset, drawWorld, drawTint, drawScreen,
    get flash() { return fx.flash; },
    set flash(v) { fx.flash = v; },
    get tint() { return fx.tint; },
    set tint(v) { fx.tint = v; },
    bursts, dust,
  };
})();
