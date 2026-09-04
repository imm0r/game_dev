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

  // two-player mode (deterministic, no AI) opens the character select
  const roster = await page.evaluate(() => window.__DOJO.DD.C.ROSTER.map((r) => r.char));
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(300);
  const selState = await page.evaluate(() => window.__DOJO.game.state);
  check('starting a match opens the character select', selState === 'select',
    'state=' + selState);
  await page.screenshot({ path: SHOTS + '/select.png' });

  // each side moves along the row with its own left/right
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(150);
  const p1Pick = await page.evaluate(() => window.__DOJO.game.pick[0]);
  check('P1 moves along the roster', p1Pick === 1 % roster.length, 'pick=' + p1Pick);
  await page.keyboard.press('KeyA');
  await page.waitForTimeout(150);
  const p1Back = await page.evaluate(() => window.__DOJO.game.pick[0]);
  check('and back again', p1Back === 0, 'pick=' + p1Back);

  // locking in: only when both sides have chosen does the match start
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(150);
  const half = await page.evaluate(() => ({
    state: window.__DOJO.game.state, locked: window.__DOJO.game.locked.slice(),
  }));
  check('one side locked in does not start the match',
    half.state === 'select' && half.locked[0] && !half.locked[1],
    JSON.stringify(half));
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/round-intro.png' });
  await page.waitForFunction(() => window.__DOJO.game.state === 'fight', null, { timeout: 6000 });
  check('both locked in -> round intro -> fight phase', true);
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

  // K.O. sequence: P2 nearly beaten, then walk them down and attack until
  // the round ends. Close the distance first rather than swinging from
  // wherever the earlier steps left the two of them - a projectile now
  // puts its target a quarter of the screen away, so "walk for a moment,
  // then kick" no longer starts in range and a fixed number of swings is
  // a test that passes for the wrong reason.
  await page.evaluate(() => { window.__DOJO.game.fighters[1].hp = 8; });
  const inRange = async () => page.evaluate(() => {
    const [a, d] = window.__DOJO.game.fighters;
    return window.__DOJO.game.state !== 'fight' || Math.abs(d.x - a.x) < 44;
  });
  for (let i = 0; i < 40 && !(await inRange()); i++) {
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(120);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(30);
  }
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

  // --- the soundtrack ------------------------------------------------------
  // The patterns are strings, so a typo in one is a note that never plays
  // and nothing else - no error, no crash, just a hole in the music. Parse
  // them, and render one offline to prove the thing makes a sound at all.
  const audio = await page.evaluate(async () => {
    const A = window.DD.audio, out = { bad: [], quiet: [], songs: 0 };
    const SEMI = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6,
                   g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };
    for (const [name, s] of Object.entries(A.SONGS)) {
      out.songs++;
      for (const v of ['lead', 'bass']) {
        for (const tok of s[v]) {
          if (tok !== '.' && tok !== '-' && !/^[a-g]#?-?\d$/.test(tok)) {
            out.bad.push(`${name}.${v}: ${tok}`);
          }
        }
      }
      for (const tok of s.drum) if (!'.-xsh'.includes(tok)) out.bad.push(`${name}.drum: ${tok}`);
      // every voice a whole number of bars, or they drift out of phase
      if (![s.lead, s.bass, s.drum].every((v) => v.length && v.length % 16 === 0)) {
        out.bad.push(`${name}: voice lengths ${s.lead.length}/${s.bass.length}/${s.drum.length}`);
      }
      // render two seconds of the two pitched voices and measure the level
      const oc = new OfflineAudioContext(1, 44100 * 2, 44100);
      const spb = 60 / s.bpm / 4;
      let step = 0, t = 0;
      while (t < 2) {
        for (const vn of ['lead', 'bass']) {
          const v = s[vn], tok = v[step % v.length];
          const m = /^([a-g]#?)(-?\d)$/.exec(tok);
          if (m) {
            const f = 440 * Math.pow(2, (SEMI[m[1]] + (Number(m[2]) - 4) * 12 - 9) / 12);
            let n = 1;
            while (v[(step + n) % v.length] === '-' && n < v.length) n++;
            const o = oc.createOscillator(), g = oc.createGain();
            o.type = vn === 'lead' ? 'square' : 'triangle';
            o.frequency.setValueAtTime(f, t);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + n * spb * 0.92);
            o.connect(g); g.connect(oc.destination);
            o.start(t); o.stop(t + n * spb + 0.02);
          }
        }
        t += spb; step++;
      }
      const d = (await oc.startRendering()).getChannelData(0);
      let sum = 0;
      for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
      const rms = Math.sqrt(sum / d.length);
      if (rms < 0.01) out.quiet.push(`${name} rms ${rms.toFixed(4)}`);
    }
    // ...and that the game asks for the right one from each state
    const G = window.__DOJO.game;
    const was = { state: G.state, stage: G.stageIndex };
    const track = (state, stage) => {
      G.state = state; if (stage !== undefined) G.stageIndex = stage;
      G.updateMusic();
      return A.track;
    };
    out.title = track('title');
    out.stages = [0, 1, 2].map((i) => track('fight', i));
    out.roundend = track('roundend');
    out.duckedAtRoundEnd = A.ducked;
    track('fight', 0);
    out.duckedInFight = A.ducked;
    G.state = was.state; G.stageIndex = was.stage; G.updateMusic();
    return out;
  });
  check('every music pattern parses', audio.bad.length === 0, audio.bad.join(' | '));
  check('every track actually makes a sound', audio.quiet.length === 0,
    audio.quiet.join(' | '));
  check('the menu has its own theme', audio.title === 'title', `got ${audio.title}`);
  check('each stage has its own track',
    new Set(audio.stages).size === 3 && !audio.stages.includes(null),
    audio.stages.join(', '));
  check('the music steps back for a K.O., rather than restarting every round',
    audio.duckedAtRoundEnd && !audio.duckedInFight,
    `ducked at round end: ${audio.duckedAtRoundEnd}, in the fight: ${audio.duckedInFight}`);

  // --- a music file beats the pattern --------------------------------------
  // Served, `sfx/One_Life_Remaining.mp3` should take over the fight music.
  // Off disk a browser will not fetch it, and the point of the fallback is
  // that the game still has music - so the assertion is "something is
  // playing", and "it is the file" only where a fetch can work at all.
  const mfile = await page.evaluate(async () => {
    const G = window.__DOJO.game, A = window.DD.audio;
    A.unlock();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const served = location.protocol.startsWith('http');
    G.stageIndex = 0; G.state = 'fight'; G.updateMusic();
    await wait(served ? 2500 : 300);
    const fight = { track: A.track, file: A.fromFile, on: A.running };
    G.state = 'title'; G.updateMusic();
    await wait(300);
    const title = { track: A.track, file: A.fromFile, on: A.running };
    // A track with no file mapped must still play, from the pattern.
    A.music('nosuchtrack'); A.music('temple');
    G.state = 'roundend'; G.updateMusic();
    return { served, fight, title };
  });
  check('the fight always has music, file or pattern', mfile.fight.on,
    JSON.stringify(mfile.fight));
  check('a track with a file plays the file',
    !mfile.served || mfile.fight.file,
    `served=${mfile.served} fromFile=${mfile.fight.file}`);
  check('one file mapped to several tracks keeps playing across them',
    !mfile.served || (mfile.title.file && mfile.title.track === 'title'),
    JSON.stringify(mfile.title));

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  await browser.close();
  console.log(fails.length === 0 ? '\nALL TESTS PASSED' : `\n${fails.length} TEST(S) FAILED`);
  process.exit(fails.length === 0 ? 0 : 1);
})().catch((e) => { console.error('test run aborted:', e); process.exit(2); });
