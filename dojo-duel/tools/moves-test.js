// Rules test: drives the fighters' state machine directly with scripted
// pads instead of keystrokes, so a failure points at a rule and not at
// keyboard timing. Covers the moves, not the game flow - `smoke-test.js`
// does that. Requires the `playwright` npm package.
//
//   node tools/moves-test.js                          # straight off disk
//   node tools/moves-test.js http://localhost:8000/   # served
const { chromium } = require('playwright');
const path = require('path');

const GAME = process.argv[2] || 'file://' + path.join(__dirname, '..', 'index.html');

const fails = [];
function check(name, cond, extra) {
  if (cond) console.log('  OK  ' + name);
  else { console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); fails.push(name); }
}

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    // optional assets (a missing sheet, a missing panorama) legitimately 404
    if (m.type() === 'error'
        && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) {
      errors.push(m.text());
    }
  });
  await p.goto(GAME);
  await p.waitForFunction(() => window.__DOJO && window.__DOJO.game, null, { timeout: 20000 });
  await p.waitForTimeout(1500);

  // A rig that runs the two fighters with scripted pads, no keyboard.
  await p.evaluate(() => {
    const G = window.__DOJO.game;
    G.startMatch(1);
    window.__rig = {
      pads: [DD.input.emptyPad(), DD.input.emptyPad()],
      step(n) {
        const [a, b2] = G.fighters;
        for (let i = 0; i < n; i++) {
          if (G.hitstop > 0) { G.hitstop--; continue; }
          a.update(G, this.pads[0], b2);
          b2.update(G, this.pads[1], a);
          G.pushBodies(a, b2);
          G.checkAttacks(a, b2);
          G.checkAttacks(b2, a);
        }
      },
      set(i, keys) {
        this.pads[i] = Object.assign(DD.input.emptyPad(), keys);
      },
      place(x1, x2) {
        const [a, b2] = G.fighters;
        a.reset(x1, 1); b2.reset(x2, -1);
        a.state = 'idle'; b2.state = 'idle';
        this.pads = [DD.input.emptyPad(), DD.input.emptyPad()];
      },
    };
    G.state = 'fight';
    for (const f of G.fighters) f.state = 'idle';
  });

  const run = (fn) => p.evaluate(fn);

  // --- sweep knocks down -------------------------------------------------
  let r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 168);
    R.set(0, { down: true, kick: true });
    R.step(1);
    R.set(0, { down: true });
    R.step(30);
    return { atk: G.fighters[0].atkName, def: G.fighters[1].state, hp: G.fighters[1].hp };
  });
  check('down+kick starts a sweep', r.atk === 'sweep', 'atkName=' + r.atk);
  check('the sweep knocks the opponent down', r.def === 'down', 'state=' + r.def);
  check('the sweep does damage', r.hp < 100, 'hp=' + r.hp);

  // --- a downed fighter is untouchable and gets back up ------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    const hpDown = G.fighters[1].hp;
    R.set(0, { punch: true });
    R.step(1); R.set(0, {}); R.step(20);
    const safe = G.fighters[1].hp === hpDown;
    R.step(120);
    return { safe, state: G.fighters[1].state };
  });
  check('a downed fighter cannot be hit', r.safe);
  check('a downed fighter gets back up', r.state === 'idle', 'state=' + r.state);

  // --- standing block does not stop a low --------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 168);
    R.set(1, { right: true });            // hold back, standing
    R.set(0, { down: true, kick: true });
    R.step(1);
    R.set(0, { down: true });
    R.step(30);
    return { state: G.fighters[1].state, hp: G.fighters[1].hp };
  });
  check('standing block loses to a low', r.state === 'down' && r.hp < 100,
    'state=' + r.state + ' hp=' + r.hp);

  // --- crouch block stops it ---------------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 168);
    R.set(1, { right: true, down: true }); // hold back AND down
    R.step(2);
    R.set(0, { down: true, kick: true });
    R.step(1);
    R.set(0, { down: true });
    R.step(30);
    return { state: G.fighters[1].state, hp: G.fighters[1].hp };
  });
  check('crouch block stops a low', r.hp > 90 && r.state !== 'down',
    'state=' + r.state + ' hp=' + r.hp);

  // --- crouching punch is a separate, faster move ------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 166);
    R.set(0, { down: true, punch: true });
    R.step(1);
    const name = G.fighters[0].atkName;
    R.set(0, { down: true });
    R.step(20);
    return { name, hp: G.fighters[1].hp,
             fast: DD.ATTACKS.cpunch.startup < DD.ATTACKS.punch.startup };
  });
  check('down+punch is the crouching punch', r.name === 'cpunch', 'atkName=' + r.name);
  check('the crouching punch connects', r.hp < 100, 'hp=' + r.hp);
  check('it beats the standing punch to the spot', r.fast);

  // --- dash travels, then commits ----------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(60, 250);
    const x0 = G.fighters[0].x;
    R.set(0, { dashR: true, right: true });
    R.step(1);
    R.set(0, { right: true });
    R.step(DD.C.DASH_FRAMES - 1);
    const moved = G.fighters[0].x - x0;
    const stillDashing = G.fighters[0].state === 'dash';
    R.set(0, {});                          // let go, or he just walks on
    R.step(DD.C.DASH_RECOVER + 2);
    return { moved, stillDashing, after: G.fighters[0].state,
             walk: DD.C.DASH_FRAMES * DD.C.WALK_F };
  });
  check('a dash covers more ground than walking', r.moved > r.walk,
    'dash=' + r.moved.toFixed(1) + ' walk=' + r.walk.toFixed(1));
  check('the dash locks you in while it runs', r.stillDashing);
  check('the dash ends and hands control back', r.after === 'idle', 'state=' + r.after);

  // --- every pose the moves ask for really exists -------------------------
  r = await run(() => {
    const missing = [];
    for (const ch of Object.keys(DD.sprites.CHARS)) {
      const skin = Object.keys(DD.sprites.frames[ch])[0];
      const anims = DD.sprites.CHARS[ch].anims;
      const names = new Set();
      for (const v of Object.values(anims)) {
        if (typeof v === 'string') names.add(v);
        else if (v.seq) v.seq.forEach((e) => names.add(e[0]));
        else for (const k of ['atk', 'vel', 'vel2', 'two']) {
          if (v[k]) v[k].forEach((n) => names.add(n));
        }
      }
      for (const n of names) {
        if (!DD.sprites.frames[ch][skin][n]) missing.push(ch + ':' + n);
      }
    }
    return { missing };
  });
  check('every animation frame resolves', r.missing.length === 0, r.missing.join(', '));

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL MOVE CHECKS PASSED');
  process.exit(fails.length ? 1 : 0);
})();
