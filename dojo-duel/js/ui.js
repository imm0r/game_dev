// HUD, title screen and big announcements ("ROUND 1", "K.O.!", ...)
window.DD = window.DD || {};

(function () {
  const F = () => DD.font;

  function healthBar(ctx, x, y, w, h, hp, showHp, fromLeft) {
    // showHp trails the real value – the red part shows fresh damage
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#401018';
    ctx.fillRect(x, y, w, h);
    const hpW = Math.max(0, Math.round((hp / DD.C.MAX_HP) * w));
    const showW = Math.max(hpW, Math.round((showHp / DD.C.MAX_HP) * w));
    const rx = fromLeft ? x : x + w - showW;
    ctx.fillStyle = '#e04030';
    ctx.fillRect(rx, y, showW, h);
    const fx = fromLeft ? x : x + w - hpW;
    ctx.fillStyle = '#f8d020';
    ctx.fillRect(fx, y, hpW, h);
    if (hpW > 0) {
      ctx.fillStyle = '#fcf4a0';
      ctx.fillRect(fx, y, hpW, 2);
    }
  }

  function pips(ctx, x, y, wins, fromLeft) {
    for (let i = 0; i < DD.C.ROUNDS_TO_WIN; i++) {
      const px = fromLeft ? x + i * 8 : x - i * 8 - 6;
      ctx.fillStyle = '#000';
      ctx.fillRect(px - 1, y - 1, 8, 8);
      ctx.fillStyle = i < wins ? '#f8d020' : '#484050';
      ctx.fillRect(px, y, 6, 6);
    }
  }

  // Super meter. Full, it flashes — you should not have to check a number
  // to know the move is available.
  function meterBar(ctx, x, y, w, meter, fromLeft, t) {
    const full = meter >= DD.C.METER_MAX;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = '#181428';
    ctx.fillRect(x, y, w, 3);
    const mw = Math.round((meter / DD.C.METER_MAX) * w);
    const mx = fromLeft ? x : x + w - mw;
    ctx.fillStyle = full ? ((t % 16) < 8 ? '#f8f8b0' : '#40e8f8') : '#3878c8';
    ctx.fillRect(mx, y, mw, 3);
  }

  function comboCount(ctx, f, x, align) {
    if (f.combo < 2 || f.comboT <= 0) return;
    F().drawTextShadow(ctx, f.combo + ' HITS', x, 46, 1, '#f8d020', align);
  }

  function drawHUD(ctx, game) {
    const [p1, p2] = game.fighters;
    healthBar(ctx, 12, 10, 120, 8, p1.hp, p1.showHp, true);
    healthBar(ctx, 188, 10, 120, 8, p2.hp, p2.showHp, false);
    meterBar(ctx, 12, 20, 120, p1.meter, true, game.t);
    meterBar(ctx, 188, 20, 120, p2.meter, false, game.t);
    F().drawTextShadow(ctx, p1.name, 12, 27, 1, '#f8f8f8', 'left');
    F().drawTextShadow(ctx, p2.name, 308, 27, 1, '#f8f8f8', 'right');
    pips(ctx, 12, 34, p1.wins, true);
    pips(ctx, 308, 34, p2.wins, false);
    comboCount(ctx, p1, 12, 'left');
    comboCount(ctx, p2, 308, 'right');

    const secs = Math.max(0, Math.ceil(game.timeFrames / 60));
    const timeCol = secs <= 10 ? '#f85040' : '#f8f8f8';
    F().drawTextShadow(ctx, String(secs).padStart(2, '0'), 160, 8, 3, timeCol, 'center');
  }

  function announce(ctx, text, scale, color, blink, t) {
    if (blink && (t % 14) < 5) return;
    // dark box behind it so the announcement stays readable on any stage
    const w = text.length * 4 * scale - scale;
    ctx.fillStyle = 'rgba(8, 4, 16, 0.6)';
    ctx.fillRect(160 - w / 2 - 6, 72 - 5, w + 12, 5 * scale + 11);
    F().drawTextShadow(ctx, text, 160, 72, scale, color, 'center');
  }

  function drawTitle(ctx, game, t) {
    ctx.fillStyle = 'rgba(8, 4, 16, 0.62)';
    ctx.fillRect(0, 0, 320, 180);

    // logo with an offset shadow, arcade style
    F().drawText(ctx, 'DOJO DUEL', 163, 21, 5, '#a01818', 'center');
    F().drawText(ctx, 'DOJO DUEL', 160, 18, 5, '#f8d020', 'center');
    F().drawText(ctx, 'RETRO PIXEL FIGHTING', 160, 50, 1, '#59f8e8', 'center');

    // Fighter preview - whoever each side has cycled to. The imported
    // sheets stand a good deal taller than the drawn art they replaced, so
    // the two of them are pushed out to the edges and the whole menu runs
    // down the clear column between them.
    const a = game.fighterPick(0), b = game.fighterPick(1);
    DD.sprites.draw(ctx, a.char, a.skin, DD.sprites.idleFrame(a.char), 1, 46, 136, (t / 32 | 0) % 2);
    DD.sprites.draw(ctx, b.char, b.skin, DD.sprites.idleFrame(b.char), -1, 274, 136, ((t + 16) / 32 | 0) % 2);
    F().drawTextShadow(ctx, a.name, 46, 138, 1, '#f8f8f8', 'center');
    F().drawTextShadow(ctx, b.name, 274, 138, 1, '#f8f8f8', 'center');

    // menu
    const m = game.menuMode;
    F().drawTextShadow(ctx, (m === 0 ? '> ' : '  ') + '1 PLAYER VS CPU', 160, 66, 1, m === 0 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, (m === 1 ? '> ' : '  ') + '2 PLAYERS LOCAL', 160, 76, 1, m === 1 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, '- STAGE: ' + DD.stage.name(game.stageIndex) + ' -', 160, 90, 1, '#ff6ad0', 'center');

    if ((t % 60) < 40) {
      F().drawTextShadow(ctx, 'PRESS ENTER', 160, 104, 1, '#f8f8f8', 'center');
    }

    F().drawTextShadow(ctx, 'QUARTER CIRCLE = SPECIAL   FWD-DOWN-FWD = UPPERCUT', 160, 145, 1, '#7a7488', 'center');
    F().drawTextShadow(ctx, 'FULL METER + QUARTER CIRCLE + SPECIAL = SUPER', 160, 152, 1, '#7a7488', 'center');
    F().drawTextShadow(ctx, 'DOWN+ATTACK = LOW   TAP TWICE = DASH   PUNCH CLOSE = THROW', 160, 159, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'P1: WASD + F/G/H   P2: ARROWS + K/L/J', 160, 166, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'STAGE: LEFT/RIGHT   SOUND: M   PAUSE: P', 160, 173, 1, '#8a8496', 'center');
  }

  // Character select. Both sides choose at once, arcade style: each player
  // moves along the row with their own left/right and locks in with their
  // own punch key.
  //
  // The portraits come from `assets/portraits.png` if it is there. If it
  // is not, each panel falls back to that fighter's own victory pose, the
  // same stand-in the victory splash uses — so the screen works before any
  // portrait art exists, and the art is a drop-in upgrade.
  function drawSelect(ctx, game, t) {
    const R = DD.C.ROSTER;
    const P = DD.portraits;
    const GAP = 12;
    const total = R.length * P.PANEL_W + (R.length - 1) * GAP;
    const x0 = Math.round((320 - total) / 2);
    const y0 = 28;

    ctx.fillStyle = 'rgba(8, 4, 16, 0.78)';
    ctx.fillRect(0, 0, 320, 180);

    F().drawText(ctx, 'CHARACTER SELECT', 161, 7, 2, '#0a2a30', 'center');
    F().drawText(ctx, 'CHARACTER SELECT', 160, 6, 2, '#59f8e8', 'center');

    R.forEach((e, i) => {
      const px = x0 + i * (P.PANEL_W + GAP);
      const hovered = game.pick.indexOf(i) >= 0;

      // A plate behind whatever we draw. The portraits are painted as
      // cards with a frame of their own, but a hairline drawn at 400px
      // does not survive the trip down to 72, so the screen draws the
      // frame itself and the plate is what the rounded corners sit on.
      const art = P.get(e.char);
      ctx.fillStyle = '#141020';
      ctx.fillRect(px, y0, P.PANEL_W, P.PANEL_H);
      if (art) {
        ctx.drawImage(art,
          px + Math.round((P.PANEL_W - art.width) / 2),
          y0 + Math.round((P.PANEL_H - art.height) / 2));
      } else {
        // the victory pose, blown up to fill the panel
        const frames = DD.sprites.frames[e.char][e.skin];
        const pose = frames.win0 ? 'win0' : DD.sprites.idleFrame(e.char);
        const m = DD.sprites.meta[e.char][pose];
        const s = Math.min((P.PANEL_W - 6) / m.w, (P.PANEL_H - 8) / m.h);
        DD.sprites.draw(ctx, e.char, e.skin, pose, 1,
          px + P.PANEL_W / 2, y0 + P.PANEL_H - 4, 0, s);
      }

      // Whoever is not hovered sits behind a veil, so the eye goes to the
      // panels somebody is actually on.
      if (!hovered) {
        ctx.fillStyle = 'rgba(8, 4, 16, 0.5)';
        ctx.fillRect(px, y0, P.PANEL_W, P.PANEL_H);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = hovered ? '#f8d020' : '#4a4460';
      ctx.strokeRect(px + 0.5, y0 + 0.5, P.PANEL_W - 1, P.PANEL_H - 1);
      if (hovered) {                     // a second ring, so it reads as picked
        ctx.strokeStyle = '#8a6a10';
        ctx.strokeRect(px - 1.5, y0 - 1.5, P.PANEL_W + 3, P.PANEL_H + 3);
      }

      F().drawTextShadow(ctx, e.name, px + P.PANEL_W / 2, y0 + P.PANEL_H + 4, 2,
        hovered ? '#f8d020' : '#b8b0c0', 'center');
      if (e.style) {
        F().drawTextShadow(ctx, e.style, px + P.PANEL_W / 2, y0 + P.PANEL_H + 17, 1,
          '#8a8496', 'center');
      }
    });

    // Each side's marker above its panel: locked ones stop blinking, which
    // is the whole feedback a player needs.
    const marker = (side, color, label) => {
      const px = x0 + game.pick[side] * (P.PANEL_W + GAP);
      if (!game.locked[side] && (t % 30) < 12) return;
      const mx = px + P.PANEL_W / 2 + (side === 0 ? -16 : 16);
      F().drawTextShadow(ctx, label, mx, y0 - 9, 1, color, 'center');
      ctx.fillStyle = color;
      ctx.fillRect(mx - 2, y0 - 3, 5, 2);
      if (game.locked[side]) ctx.fillRect(px, y0 - 1, P.PANEL_W, 1);
    };
    marker(0, '#f8d020', game.locked[0] ? 'P1 OK' : 'P1');
    if (game.menuMode === 1) marker(1, '#59f8e8', game.locked[1] ? 'P2 OK' : 'P2');
    else if (game.locked[1]) marker(1, '#ff6ad0', 'CPU');

    F().drawTextShadow(ctx, '- STAGE: ' + DD.stage.name(game.stageIndex) + ' -',
      160, 153, 1, '#ff6ad0', 'center');
    F().drawTextShadow(ctx,
      game.menuMode === 1 ? 'P1: A/D + F     P2: LEFT/RIGHT + K'
                          : 'A/D TO MOVE     F TO CHOOSE',
      160, 163, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'STAGE: UP/DOWN     ESC: BACK', 160, 172, 1, '#7a7488', 'center');
  }

  // Victory splash. No portrait art exists, so the winner's own victory
  // pose is blown up to stand in for one — it is the most characterful
  // frame either fighter has.
  function drawMatchEnd(ctx, game, t) {
    ctx.fillStyle = 'rgba(8, 4, 16, 0.62)';
    ctx.fillRect(0, 0, 320, 180);
    const w = game.matchWinner;
    if (!w) {
      F().drawTextShadow(ctx, 'DRAW', 160, 62, 3, '#f8d020', 'center');
      if ((t % 60) < 40) {
        F().drawTextShadow(ctx, 'ENTER: BACK TO TITLE', 160, 96, 1, '#f8f8f8', 'center');
      }
      return;
    }

    const frames = DD.sprites.frames[w.char][w.skin];
    const pose = frames.win0 ? 'win0' : DD.sprites.idleFrame(w.char);
    const meta = DD.sprites.meta[w.char][pose];
    const scale = Math.min(2.0, 116 / meta.h);
    const bh = Math.round(meta.h * scale);
    const cx = 82, cy = 92;

    // sunburst behind the winner, turning slowly. Wedges rather than
    // rays: a line drawn outwards leaves gaps as the radius grows.
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#f8d020';
    for (let i = 0; i < 16; i += 2) {
      const a0 = (i / 16) * Math.PI * 2 + t / 320;
      const a1 = ((i + 1) / 16) * Math.PI * 2 + t / 320;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 280, cy + Math.sin(a0) * 280);
      ctx.lineTo(cx + Math.cos(a1) * 280, cy + Math.sin(a1) * 280);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    DD.sprites.draw(ctx, w.char, w.skin, pose, 1, cx, cy + bh / 2, 0, scale);

    F().drawTextShadow(ctx, w.name, 218, 66, 3, '#f8d020', 'center');
    F().drawTextShadow(ctx, 'WINS!', 218, 88, 3, '#f8f8f8', 'center');
    if ((t % 60) < 40) {
      F().drawTextShadow(ctx, 'ENTER: BACK TO TITLE', 218, 124, 1, '#b8b0c0', 'center');
    }
  }

  DD.ui = { drawHUD, announce, drawTitle, drawSelect, drawMatchEnd };
})();
