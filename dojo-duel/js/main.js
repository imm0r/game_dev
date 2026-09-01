// Entry point: grab the canvas, build the game, fixed-step 60fps loop.
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
    // cap catch-up steps (e.g. after a tab switch)
    if (acc > STEP * 5) acc = STEP * 5;
    while (acc >= STEP) {
      game.update();
      acc -= STEP;
    }
    game.draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // debug access (e.g. for automated tests): window.__DOJO.game.state
  window.__DOJO = { game, DD };
})();
