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
          // mirrors updateFight: hitstop freezes the fight, not the stick
          if (G.hitstop > 0) {
            G.hitstop--;
            a.motion.feed(this.pads[0], a.facing);
            b2.motion.feed(this.pads[1], b2.facing);
            continue;
          }
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
        // hitstop left over from the previous case would eat the first
        // input of this one
        G.hitstop = 0;
        G.projectiles = []; G.particles = [];
        G.state = 'fight';
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

  // --- motion inputs ------------------------------------------------------
  // A quarter circle is down, down-forward, forward; a dragon punch is
  // forward, down, down-forward. Feeding one must never read as the other.
  const roll = (dirs, btn) => `
    R.place(140, 240);
    ${dirs.map((d) => `R.set(0, {${d}}); R.step(2);`).join('\n')}
    R.set(0, {${dirs[dirs.length - 1]}${btn ? ', ' + btn + ': true' : ''}});
    R.step(1);`;

  r = await run(new Function(`
    const R = window.__rig, G = window.__DOJO.game;
    ${roll(['down: true', 'down: true, right: true', 'right: true'], 'kick')}
    return { name: G.fighters[0].atkName, state: G.fighters[0].state };
  `));
  check('quarter circle + kick is the rushing special', r.name === 'rush',
    'atkName=' + r.name + ' state=' + r.state);

  r = await run(new Function(`
    const R = window.__rig, G = window.__DOJO.game;
    ${roll(['right: true', 'down: true', 'down: true, right: true'], 'punch')}
    return { name: G.fighters[0].atkName };
  `));
  check('dragon punch motion + punch is the uppercut', r.name === 'uppercut',
    'atkName=' + r.name);

  r = await run(new Function(`
    const R = window.__rig, G = window.__DOJO.game;
    ${roll(['down: true', 'down: true, right: true', 'right: true'], 'punch')}
    return { name: G.fighters[0].atkName };
  `));
  check('quarter circle + punch throws the projectile', r.name === 'special',
    'atkName=' + r.name);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 240);
    R.set(0, { right: true }); R.step(6);        // just walking forward
    R.set(0, { right: true, punch: true }); R.step(1);
    return { name: G.fighters[0].atkName };
  });
  check('walking forward and punching is still just a punch', r.name === 'punch',
    'atkName=' + r.name);

  // --- the uppercut is an anti-air ---------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(150, 176);
    const [a, b2] = G.fighters;
    b2.vy = -3; b2.y -= 20; b2.state = 'jump';   // put him in the air
    const airborne = b2.y;
    R.set(0, { right: true }); R.step(2);
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true, punch: true }); R.step(1);
    const name = a.atkName;
    R.set(0, {}); R.step(10);
    return { name, airborne, hit: b2.hp < 100, state: b2.state };
  });
  check('the uppercut reaches someone in the air', r.name === 'uppercut' && r.hit,
    'atkName=' + r.name + ' state=' + r.state);

  // --- the rush travels and stops on contact ------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(80, 300);
    const x0 = G.fighters[0].x;
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true }); R.step(2);
    R.set(0, { right: true, kick: true }); R.step(1);
    R.set(0, {});
    R.step(DD.ATTACKS.rush.startup + DD.ATTACKS.rush.active);
    return { moved: G.fighters[0].x - x0, name: G.fighters[0].atkName };
  });
  check('the rushing special carries you forward', r.name === 'rush' && r.moved > 40,
    'moved=' + (r.moved || 0).toFixed(1));

  // --- meter ---------------------------------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 166);
    G.fighters[0].meter = 0; G.fighters[1].meter = 0;
    R.set(0, { punch: true }); R.step(1);
    R.set(0, {}); R.step(20);
    return { hitter: G.fighters[0].meter, hurt: G.fighters[1].meter };
  });
  check('landing a hit builds meter', r.hitter > 0, 'meter=' + r.hitter);
  check('taking one builds meter too', r.hurt > 0, 'meter=' + r.hurt);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 240);
    G.fighters[0].meter = DD.C.METER_MAX - 1;
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true }); R.step(2);
    R.set(0, { right: true, special: true }); R.step(1);
    const denied = G.fighters[0].atkName;
    R.place(140, 240);
    G.fighters[0].meter = DD.C.METER_MAX;
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true }); R.step(2);
    R.set(0, { right: true, special: true }); R.step(1);
    return { denied, granted: G.fighters[0].atkName, left: G.fighters[0].meter };
  });
  check('no super without a full meter', r.denied !== 'super', 'atkName=' + r.denied);
  check('a full meter buys the super', r.granted === 'super', 'atkName=' + r.granted);
  check('and the super spends it', r.left === 0, 'meter=' + r.left);

  // --- the super hits several times and is invulnerable on start-up -------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(120, 190);
    const [a, b2] = G.fighters;
    a.meter = DD.C.METER_MAX;
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true }); R.step(2);
    R.set(0, { right: true, special: true }); R.step(1);
    const safe = a.hurtbox() === null;                 // invulnerable start-up
    R.set(0, {});
    R.step(DD.ATTACKS.super.startup + DD.ATTACKS.super.active + 4);
    return { safe, hits: a.hitCount, combo: a.combo, hp: b2.hp, down: b2.state };
  });
  check('the super is invulnerable while it starts', r.safe);
  check('the super hits more than once', r.hits > 1, 'hits=' + r.hits);
  check('those hits count as a combo', r.combo > 1, 'combo=' + r.combo);

  // --- cancelling a normal into a special ---------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(140, 168);
    const [a, b2] = G.fighters;
    R.set(0, { punch: true }); R.step(1);              // punch...
    R.set(0, {}); R.step(DD.ATTACKS.punch.startup + DD.ATTACKS.punch.active);
    const landed = a.hasHit;
    R.set(0, { down: true }); R.step(1);               // ...cancelled into
    R.set(0, { down: true, right: true }); R.step(1);  //    a quarter circle
    R.set(0, { right: true, kick: true }); R.step(1);
    return { landed, name: a.atkName, combo: a.combo, hp: b2.hp };
  });
  check('a connected normal cancels into a special', r.landed && r.name === 'rush',
    'landed=' + r.landed + ' atkName=' + r.name);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(60, 300);                                  // far apart: whiff
    const a = G.fighters[0];
    R.set(0, { punch: true }); R.step(1);
    R.set(0, {}); R.step(DD.ATTACKS.punch.startup + DD.ATTACKS.punch.active);
    R.set(0, { down: true }); R.step(1);
    R.set(0, { down: true, right: true }); R.step(1);
    R.set(0, { right: true, kick: true }); R.step(1);
    return { name: a.atkName };
  });
  check('a whiffed normal does not cancel', r.name === 'punch', 'atkName=' + r.name);

  // --- the grenade arcs, the fireball does not -----------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    const drop = (who) => {
      R.place(80, 240);
      const f = G.fighters[who];
      f.fireCd = 0;
      G.projectiles = [];
      G.spawnFireball(f);
      const p = G.projectiles[0];
      const y0 = p.y;
      let rose = 0, frames = 0;
      // a lob goes up first and lands eventually; a fireball does neither
      while (frames < 200 && !p.dead) {
        G.updateProjectiles();
        rose = Math.min(rose, p.y - y0);
        frames++;
      }
      return { rose, landed: p.dead && p.x > 0 && p.x < G.worldW, frames };
    };
    return { klaus: drop(0), antoine: drop(1) };
  });
  check("Klaus's fireball flies flat", Math.abs(r.klaus.rose) < 1,
    'rise=' + r.klaus.rose.toFixed(1));
  check("Antoine's grenade arcs up", r.antoine.rose < -8,
    'rise=' + r.antoine.rose.toFixed(1));
  check('and goes off where it lands', r.antoine.landed,
    'frames=' + r.antoine.frames);

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
