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
    F().drawTextShadow(ctx, DD.C.P1_NAME, 12, 27, 1, '#f8f8f8', 'left');
    F().drawTextShadow(ctx, DD.C.P2_NAME, 308, 27, 1, '#f8f8f8', 'right');
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
    F().drawText(ctx, 'DOJO DUEL', 163, 25, 5, '#a01818', 'center');
    F().drawText(ctx, 'DOJO DUEL', 160, 22, 5, '#f8d020', 'center');
    F().drawText(ctx, 'RETRO PIXEL FIGHTING', 160, 54, 1, '#59f8e8', 'center');

    // fighter preview
    DD.sprites.draw(ctx, DD.C.P1_CHAR, DD.C.P1_SKIN, DD.sprites.idleFrame(DD.C.P1_CHAR), 1, 92, 150, (t / 32 | 0) % 2);
    DD.sprites.draw(ctx, DD.C.P2_CHAR, DD.C.P2_SKIN, DD.sprites.idleFrame(DD.C.P2_CHAR), -1, 228, 150, ((t + 16) / 32 | 0) % 2);
    F().drawTextShadow(ctx, DD.C.P1_NAME, 92, 154, 1, '#f8f8f8', 'center');
    F().drawTextShadow(ctx, DD.C.P2_NAME, 228, 154, 1, '#f8f8f8', 'center');

    // menu
    const m = game.menuMode;
    F().drawTextShadow(ctx, (m === 0 ? '> ' : '  ') + '1 PLAYER VS CPU', 160, 74, 1, m === 0 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, (m === 1 ? '> ' : '  ') + '2 PLAYERS LOCAL', 160, 84, 1, m === 1 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, '- STAGE: ' + DD.stage.name(game.stageIndex) + ' -', 160, 98, 1, '#ff6ad0', 'center');

    if ((t % 60) < 40) {
      F().drawTextShadow(ctx, 'PRESS ENTER', 160, 112, 1, '#f8f8f8', 'center');
    }

    F().drawTextShadow(ctx, 'P1: WASD + F/G/H   P2: ARROWS + K/L/J', 160, 160, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'DOWN+ATTACK = LOW   TAP TWICE = DASH', 160, 168, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'QUARTER CIRCLE = SPECIAL   FWD-DOWN-FWD = UPPERCUT', 160, 144, 1, '#7a7488', 'center');
    F().drawTextShadow(ctx, 'FULL METER + QUARTER CIRCLE + SPECIAL = SUPER', 160, 152, 1, '#7a7488', 'center');
    F().drawTextShadow(ctx, 'STAGE: LEFT/RIGHT   SOUND: M   PAUSE: P', 160, 176, 1, '#8a8496', 'center');
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

  DD.ui = { drawHUD, announce, drawTitle, drawMatchEnd };
})();
