// Einstiegspunkt: Canvas holen, Spiel bauen, 60fps-Loop mit fester Schrittweite.
window.DD = window.DD || {};

(function () {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const game = new DD.Game(ctx);

  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;

  function loop(now) {
    acc += now - last;
    last = now;
    // Nachhol-Schritte begrenzen (z.B. nach Tab-Wechsel)
    if (acc > STEP * 5) acc = STEP * 5;
    while (acc >= STEP) {
      game.update();
      acc -= STEP;
    }
    game.draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Debug-Zugriff (z.B. für automatisierte Tests): window.__DOJO.game.state
  window.__DOJO = { game, DD };
})();
