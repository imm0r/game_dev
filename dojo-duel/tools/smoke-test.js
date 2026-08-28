// Automatischer Rauchtest für Dojo Duel: lädt das Spiel headless,
// simuliert echte Tastatur-Eingaben und prüft die Kern-Mechanik.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME = "file://" + path.join(__dirname, "..", "index.html");
const SHOTS = path.join(__dirname, 'shots');
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
    // erwartete 404s der optionalen Stage-Bilder (assets/stage-*.png) ignorieren
    if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) {
      errors.push('console: ' + m.text());
    }
  });

  await page.goto(GAME);
  await page.waitForTimeout(700);

  const state0 = await page.evaluate(() => window.__DOJO && window.__DOJO.game.state);
  check('Spiel geladen, Titelbildschirm aktiv', state0 === 'title', 'state=' + state0);

  await page.screenshot({ path: SHOTS + '/title-stage1.png' });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/title-stage2.png' });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/title-stage3.png' });
  await page.keyboard.press('ArrowRight'); // zurück zu Stage 1
  await page.waitForTimeout(200);

  // 2-Spieler-Modus (deterministisch, keine KI) starten
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/round-intro.png' });
  await page.waitForFunction(() => window.__DOJO.game.state === 'fight', null, { timeout: 6000 });
  check('Runden-Intro -> Kampfphase', true);
  await page.screenshot({ path: SHOTS + '/fight-start.png' });

  // P1 läuft auf P2 zu
  const xBefore = await page.evaluate(() => window.__DOJO.game.fighters[0].x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const xAfter = await page.evaluate(() => window.__DOJO.game.fighters[0].x);
  check('P1 bewegt sich vorwärts', xAfter > xBefore + 10, `${xBefore} -> ${xAfter}`);

  // Schlagen bis der Treffer sitzt
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
  check('Schlag trifft, P2 verliert Energie', hp2 < 100, 'hp2=' + hp2);

  // Feuerball
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
  check('Feuerball existiert oder hat getroffen', projInfo.n > 0 || projInfo.hp2 < hp2,
    JSON.stringify(projInfo));

  // Sprung (erst warten, bis der Kämpfer wieder handlungsfähig ist)
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
  check('Sprung funktioniert', jumpInfo.state === 'jump' || jumpInfo.y < jumpInfo.ground,
    JSON.stringify(jumpInfo));
  await page.screenshot({ path: SHOTS + '/jump.png' });
  await page.waitForTimeout(700);

  // K.O.-Sequenz: P2 fast besiegt, dann Schläge bis zum Rundenende
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
  check('K.O. beendet die Runde', koState === 'roundend', 'state=' + koState);
  await page.screenshot({ path: SHOTS + '/ko.png' });

  // Sieger-Pose + nächste Runde
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
  check('Runde 2 startet, P1 hat 1 Sieg', r2.round === 2 && r2.wins1 === 1, JSON.stringify(r2));

  check('Keine JavaScript-Fehler', errors.length === 0, errors.slice(0, 5).join(' | '));

  await browser.close();
  console.log(fails.length === 0 ? '\nALLE TESTS BESTANDEN' : `\n${fails.length} TEST(S) FEHLGESCHLAGEN`);
  process.exit(fails.length === 0 ? 0 : 1);
})().catch((e) => { console.error('Testlauf abgebrochen:', e); process.exit(2); });
