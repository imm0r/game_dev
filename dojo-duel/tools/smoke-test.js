// Automated smoke test for Dojo Duel: loads the game headless, simulates
// real keyboard input and verifies the core mechanics.
// Requires the `playwright` npm package (install anywhere, see README).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// By default the test opens the game straight off disk. Pass a URL to test
// a served copy instead - a browser only lets the sprite sheet importer read
// the pixels of `assets/*.png` over http, so that run also covers the
// imported artwork:
//     python3 -m http.server 8000        (in dojo-duel/)
//     node tools/smoke-test.js http://localhost:8000/
const GAME = process.argv[2] || 'file://' + path.join(__dirname, '..', 'index.html');
const SHOTS = path.join(__dirname, '..', 'dist', 'smoke-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const fails = [];
function check(name, cond, extra) {
  if (cond) console.log('  OK  ' + name);
  else { console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); fails.push(name); }
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // ignore expected 404s for the optional stage panoramas (assets/stage-*.png)
    if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) {
      errors.push('console: ' + m.text());
    }
  });

  await page.goto(GAME);
  await page.waitForTimeout(700);

  const state0 = await page.evaluate(() => window.__DOJO && window.__DOJO.game.state);
  check('game loaded, title screen active', state0 === 'title', 'state=' + state0);

  await page.screenshot({ path: SHOTS + '/title-stage1.png' });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/title-stage2.png' });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/title-stage3.png' });
  await page.keyboard.press('ArrowRight'); // back to stage 1
  await page.waitForTimeout(200);

  // each side cycles its own fighter with its own punch key
  const roster = await page.evaluate(() => window.__DOJO.DD.C.ROSTER.map((r) => r.char));
  const pickFrom = await page.evaluate(() => window.__DOJO.game.fighters[0].char);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(150);
  const pickTo = await page.evaluate(() => window.__DOJO.game.fighters[0].char);
  check('P1 cycles their fighter on the title',
    pickFrom === roster[0] && pickTo === roster[1], `${pickFrom} -> ${pickTo}`);
  await page.screenshot({ path: SHOTS + '/title-pick.png' });
  // round the roster back to the default so the rest of the run is the
  // usual matchup
  for (let i = 1; i < roster.length; i++) {
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(120);
  }
  const pickBack = await page.evaluate(() => window.__DOJO.game.fighters[0].char);
  check('cycling wraps back to the first fighter', pickBack === roster[0], pickBack);

  // start two-player mode (deterministic, no AI)
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/round-intro.png' });
  await page.waitForFunction(() => window.__DOJO.game.state === 'fight', null, { timeout: 6000 });
  check('round intro -> fight phase', true);
  await page.screenshot({ path: SHOTS + '/fight-start.png' });

  // P1 walks towards P2
  const xBefore = await page.evaluate(() => window.__DOJO.game.fighters[0].x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const xAfter = await page.evaluate(() => window.__DOJO.game.fighters[0].x);
  check('P1 walks forward', xAfter > xBefore + 10, `${xBefore} -> ${xAfter}`);

  // punch until it lands
  let hp2 = 100;
  for (let i = 0; i < 10 && hp2 >= 100; i++) {
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(220);
    await page.keyboard.up('KeyD');
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(90);
    await page.screenshot({ path: SHOTS + '/punch.png' });
    await page.waitForTimeout(250);
    hp2 = await page.evaluate(() => window.__DOJO.game.fighters[1].hp);
  }
  check('punch lands, P2 loses health', hp2 < 100, 'hp2=' + hp2);

  // projectile
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyA');
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(350);
  const projInfo = await page.evaluate(() => ({
    n: window.__DOJO.game.projectiles.length,
    hp2: window.__DOJO.game.fighters[1].hp,
  }));
  await page.screenshot({ path: SHOTS + '/fireball.png' });
  check('projectile exists or has hit', projInfo.n > 0 || projInfo.hp2 < hp2,
    JSON.stringify(projInfo));

  // jump (wait until the fighter can act again)
  await page.waitForFunction(
    () => window.__DOJO.game.fighters[0].state === 'idle',
    null, { timeout: 4000 },
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(80);
  const jumpInfo = await page.evaluate(() => ({
    state: window.__DOJO.game.fighters[0].state,
    y: window.__DOJO.game.fighters[0].y,
    ground: window.__DOJO.DD.C.GROUND_Y,
  }));
  check('jump works', jumpInfo.state === 'jump' || jumpInfo.y < jumpInfo.ground,
    JSON.stringify(jumpInfo));
  await page.screenshot({ path: SHOTS + '/jump.png' });
  await page.waitForTimeout(700);

  // K.O. sequence: P2 nearly beaten, then attack until the round ends
  await page.evaluate(() => { window.__DOJO.game.fighters[1].hp = 8; });
  for (let i = 0; i < 14; i++) {
    const st = await page.evaluate(() => window.__DOJO.game.state);
    if (st !== 'fight') break;
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(180);
    await page.keyboard.up('KeyD');
    await page.keyboard.press('KeyG');
    await page.waitForTimeout(350);
  }
  const koState = await page.evaluate(() => window.__DOJO.game.state);
  check('K.O. ends the round', koState === 'roundend', 'state=' + koState);
  await page.screenshot({ path: SHOTS + '/ko.png' });

  // victory pose + next round
  await page.waitForTimeout(1600);
  await page.screenshot({ path: SHOTS + '/round-win.png' });
  await page.waitForFunction(
    () => ['intro', 'fight'].includes(window.__DOJO.game.state),
    null, { timeout: 6000 },
  ).catch(() => {});
  const r2 = await page.evaluate(() => ({
    state: window.__DOJO.game.state,
    round: window.__DOJO.game.round,
    wins1: window.__DOJO.game.fighters[0].wins,
  }));
  check('round 2 starts, P1 has 1 win', r2.round === 2 && r2.wins1 === 1, JSON.stringify(r2));

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  await browser.close();
  console.log(fails.length === 0 ? '\nALL TESTS PASSED' : `\n${fails.length} TEST(S) FAILED`);
  process.exit(fails.length === 0 ? 0 : 1);
})().catch((e) => { console.error('test run aborted:', e); process.exit(2); });
