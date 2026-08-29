// HUD, Titelbildschirm und grosse Ansagen ("ROUND 1", "K.O.!", ...)
window.DD = window.DD || {};

(function () {
  const F = () => DD.font;

  function healthBar(ctx, x, y, w, h, hp, showHp, fromLeft) {
    // showHp läuft dem echten Wert nach – der rote Teil zeigt frischen Schaden
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

  function drawHUD(ctx, game) {
    const [p1, p2] = game.fighters;
    healthBar(ctx, 12, 10, 120, 8, p1.hp, p1.showHp, true);
    healthBar(ctx, 188, 10, 120, 8, p2.hp, p2.showHp, false);
    F().drawTextShadow(ctx, DD.C.P1_NAME, 12, 21, 1, '#f8f8f8', 'left');
    F().drawTextShadow(ctx, DD.C.P2_NAME, 308, 21, 1, '#f8f8f8', 'right');
    pips(ctx, 12, 29, p1.wins, true);
    pips(ctx, 308, 29, p2.wins, false);

    const secs = Math.max(0, Math.ceil(game.timeFrames / 60));
    const timeCol = secs <= 10 ? '#f85040' : '#f8f8f8';
    F().drawTextShadow(ctx, String(secs).padStart(2, '0'), 160, 8, 3, timeCol, 'center');
  }

  function announce(ctx, text, scale, color, blink, t) {
    if (blink && (t % 14) < 5) return;
    // dunkle Box dahinter, damit die Ansage vor jeder Stage lesbar bleibt
    const w = text.length * 4 * scale - scale;
    ctx.fillStyle = 'rgba(8, 4, 16, 0.6)';
    ctx.fillRect(160 - w / 2 - 6, 72 - 5, w + 12, 5 * scale + 11);
    F().drawTextShadow(ctx, text, 160, 72, scale, color, 'center');
  }

  function drawTitle(ctx, game, t) {
    ctx.fillStyle = 'rgba(8, 4, 16, 0.62)';
    ctx.fillRect(0, 0, 320, 180);

    // Logo mit Versatz-Schatten in Arcade-Manier
    F().drawText(ctx, 'DOJO DUEL', 163, 25, 5, '#a01818', 'center');
    F().drawText(ctx, 'DOJO DUEL', 160, 22, 5, '#f8d020', 'center');
    F().drawText(ctx, 'RETRO PIXEL FIGHTING', 160, 54, 1, '#59f8e8', 'center');

    // Kämpfer-Vorschau
    DD.sprites.draw(ctx, DD.C.P1_CHAR, DD.C.P1_SKIN, DD.sprites.idleFrame(DD.C.P1_CHAR), 1, 92, 150, (t / 32 | 0) % 2);
    DD.sprites.draw(ctx, DD.C.P2_CHAR, DD.C.P2_SKIN, DD.sprites.idleFrame(DD.C.P2_CHAR), -1, 228, 150, ((t + 16) / 32 | 0) % 2);
    F().drawTextShadow(ctx, DD.C.P1_NAME, 92, 154, 1, '#f8f8f8', 'center');
    F().drawTextShadow(ctx, DD.C.P2_NAME, 228, 154, 1, '#f8f8f8', 'center');

    // Menü
    const m = game.menuMode;
    F().drawTextShadow(ctx, (m === 0 ? '> ' : '  ') + '1 SPIELER GEGEN CPU', 160, 74, 1, m === 0 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, (m === 1 ? '> ' : '  ') + '2 SPIELER LOKAL', 160, 84, 1, m === 1 ? '#f8d020' : '#b8b0c0', 'center');
    F().drawTextShadow(ctx, '- STAGE: ' + DD.stage.name(game.stageIndex) + ' -', 160, 98, 1, '#ff6ad0', 'center');

    if ((t % 60) < 40) {
      F().drawTextShadow(ctx, 'DRUECKE ENTER', 160, 112, 1, '#f8f8f8', 'center');
    }

    F().drawTextShadow(ctx, 'P1: WASD + F/G/H   P2: PFEILE + K/L/J', 160, 166, 1, '#8a8496', 'center');
    F().drawTextShadow(ctx, 'STAGE: LINKS/RECHTS   TON: M   PAUSE: P', 160, 174, 1, '#8a8496', 'center');
  }

  function drawMatchEnd(ctx, game, t) {
    ctx.fillStyle = 'rgba(8, 4, 16, 0.45)';
    ctx.fillRect(0, 0, 320, 180);
    const w = game.matchWinner;
    if (w) {
      F().drawTextShadow(ctx, w.name + ' GEWINNT!', 160, 62, 3, '#f8d020', 'center');
    } else {
      F().drawTextShadow(ctx, 'UNENTSCHIEDEN', 160, 62, 3, '#f8d020', 'center');
    }
    if ((t % 60) < 40) {
      F().drawTextShadow(ctx, 'ENTER: ZURUECK ZUM TITEL', 160, 96, 1, '#f8f8f8', 'center');
    }
  }

  DD.ui = { drawHUD, announce, drawTitle, drawMatchEnd };
})();
