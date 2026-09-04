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

  // --- throws --------------------------------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(150, 172);                       // arm's length
    const [a, b2] = G.fighters;
    R.set(1, { right: true });               // they hold back: blocking
    R.set(0, { right: true, punch: true }); R.step(1);
    const name = a.atkName;
    R.set(0, { right: true }); R.step(8);
    return { name, state: b2.state, hp: b2.hp, behind: b2.x < a.x };
  });
  check('walking into them and punching is a throw', r.name === 'throw',
    'atkName=' + r.name);
  check('a throw goes through a block', r.hp < 100, 'hp=' + r.hp);
  check('and puts them behind you, on the floor', r.behind && r.state === 'down',
    'state=' + r.state + ' behind=' + r.behind);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(60, 300);                        // nowhere near
    R.set(0, { right: true, punch: true }); R.step(1);
    return { name: G.fighters[0].atkName };
  });
  check('out of range it is only a punch', r.name === 'punch', 'atkName=' + r.name);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(150, 172);
    const [a, b2] = G.fighters;
    R.set(1, { punch: true }); R.step(1);    // they punch, so they are teching
    R.set(1, {});
    R.set(0, { right: true, punch: true }); R.step(1);
    R.set(0, { right: true }); R.step(6);
    return { hp: b2.hp, state: b2.state };
  });
  check('a grab breaks if they just pressed punch', r.hp === 100 && r.state !== 'down',
    'hp=' + r.hp + ' state=' + r.state);

  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(150, 172);
    const [a, b2] = G.fighters;
    b2.state = 'hitstun'; b2.timer = 30;     // already being hit
    const can = a.canThrow ? (a.pad.right = true, a.canThrow(b2)) : null;
    return { can };
  });
  check('you cannot grab someone out of hitstun', r.can === false, 'canThrow=' + r.can);

  // --- effects fire when they should --------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    R.place(146, 176);
    DD.fx.reset();
    R.set(0, { kick: true }); R.step(1);
    R.set(0, {}); R.step(DD.ATTACKS.kick.startup + 2);
    const onHit = DD.fx.bursts.length;

    R.place(140, 250);
    DD.fx.reset();
    R.set(0, { up: true }); R.step(1);
    R.set(0, {}); R.step(60);                    // jump and land
    const onLand = DD.fx.dust.length;

    R.place(120, 200);
    DD.fx.reset();
    G.fighters[0].meter = DD.C.METER_MAX;
    R.set(0, { down: true }); R.step(2);
    R.set(0, { down: true, right: true }); R.step(2);
    R.set(0, { right: true, special: true }); R.step(1);
    const flash = DD.fx.flash > 0 && DD.fx.tint > 0;

    R.place(90, 260);
    R.set(0, { dashR: true, right: true }); R.step(1);
    R.set(0, { right: true }); R.step(5);
    const trail = G.fighters[0].trail.length;
    return { onHit, onLand, flash, trail };
  });
  check('a hit throws a burst', r.onHit > 0, 'bursts=' + r.onHit);
  check('landing raises dust', r.onLand > 0, 'dust=' + r.onLand);
  check('the super flashes and dims the stage', r.flash);
  check('a dash leaves a trail', r.trail > 1, 'ghosts=' + r.trail);

  // --- the two air attacks --------------------------------------------------
  // One attack per jump, either one: kick reaches further, punch comes out
  // sooner. Both have to connect on the way down, and the second press
  // must not start a second attack.
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    const out = {};
    for (const [key, btn] of [['kick', 'kick'], ['punch', 'punch']]) {
      R.place(150, 178);
      R.set(0, { up: true, right: true }); R.step(1);
      R.set(0, { right: true }); R.step(7);
      R.set(0, Object.assign({ right: true }, { [btn]: true })); R.step(1);
      R.set(0, { right: true }); R.step(2);
      const name = G.fighters[0].atkName;
      // pressing the other button now must not start a second one
      R.set(0, { right: true, kick: true, punch: true }); R.step(1);
      R.set(0, { right: true }); R.step(40);
      out[key] = { name, hp: G.fighters[1].hp, back: G.fighters[0].controllable };
    }
    return out;
  });
  check('kick in the air is the flying kick', r.kick.name === 'airkick',
    'atkName=' + r.kick.name);
  check('...and it connects', r.kick.hp < 100, 'hp=' + r.kick.hp);
  check('punch in the air is the flying punch', r.punch.name === 'airpunch',
    'atkName=' + r.punch.name);
  check('...and it connects', r.punch.hp < 100, 'hp=' + r.punch.hp);
  check('one air attack per jump, and you land out of it',
    r.kick.back && r.punch.back);

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

  // --- the jump has to be worth taking -------------------------------------
  // The whole rock-paper-scissors of a fighting game hangs off one number:
  // whether a jump clears a projectile. It did not for a long time - the
  // apex was seven pixels short - and because nothing measured it, the
  // symptom read as "jumping feels pointless" rather than as a number
  // being wrong. So it is a number now.
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game, C = DD.C;
    const F = DD.FIREBALL, band = { y0: C.GROUND_Y - 42 - F.h / 2, y1: C.GROUND_Y - 42 + F.h / 2 };
    R.place(140, 260);
    const a = G.fighters[0];
    R.set(0, { up: true }); R.step(1); R.set(0, {});
    let clear = 0, frames = 0, apex = 999;
    while (!a.grounded && frames < 200) {
      R.step(1); frames++;
      apex = Math.min(apex, a.y);
      const h = a.hurtbox();
      if (h && (h.y1 <= band.y0 || h.y0 >= band.y1)) clear++;
    }
    // and a fighter standing in the same spot is squarely in the way
    R.place(140, 260);
    const sb = G.fighters[0].hurtbox();
    const standHit = sb.y0 < band.y1 && sb.y1 > band.y0;
    return { clear, frames, apex: Math.round(apex), standHit, band };
  });
  check('a jump clears a fireball', r.clear >= 8,
    `${r.clear} clear frames of ${r.frames}, apex y=${r.apex}, band ${r.band.y0}..${r.band.y1}`);
  check('...but not for the whole jump', r.clear < r.frames - 8,
    `${r.clear} of ${r.frames}`);
  check('standing there does not clear it', r.standHit);

  // --- an anti-air that actually answers ------------------------------------
  // Reach parity is the load-bearing part: a flying kick reaches 34px and
  // the uppercut used to reach 27, which meant no timing beat a jump-in.
  r = await run(() => {
    const up = DD.ATTACKS.uppercut.box, ak = DD.ATTACKS.airkick.box;
    return { up: up.x + up.w, ak: ak.x + ak.w, invuln: DD.ATTACKS.uppercut.invuln,
             cover: DD.ATTACKS.uppercut.startup + DD.ATTACKS.uppercut.active };
  });
  check('the uppercut reaches as far as a flying kick', r.up >= r.ak,
    `uppercut ${r.up}px vs flying kick ${r.ak}px`);
  check('and is invulnerable through its whole hit window', r.invuln >= r.cover,
    `invuln ${r.invuln} covers ${r.cover} frames`);

  // Timed right it wins clean; too late it loses. Both halves matter - an
  // anti-air that always works is not a read, it is a button.
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    const [a, d] = G.fighters;
    const trial = (t) => {
      R.place(150, 228);
      let hitMe = -1, hitThem = -1;
      for (let f = 0; f < 90; f++) {
        R.set(1, f === 0 ? { up: true, left: true }
          : f === 1 ? { left: true, kick: true } : { left: true });
        if (f === t) a.startAttack('uppercut');
        const ha = a.hp, hd = d.hp;
        R.step(1);
        if (a.hp < ha && hitMe < 0) hitMe = f;
        if (d.hp < hd && hitThem < 0) hitThem = f;
      }
      return { hitMe, hitThem };
    };
    const good = trial(18), late = trial(30);
    return { good, late };
  });
  check('a well-timed uppercut beats a jump-in clean',
    r.good.hitThem >= 0 && r.good.hitMe < 0,
    `landed at ${r.good.hitThem}, took a hit at ${r.good.hitMe}`);
  check('...and a late one does not', r.late.hitMe >= 0,
    `took a hit at ${r.late.hitMe}`);

  // --- what a crouch is for --------------------------------------------------
  // A lob passes over a ducking head for part of its flight; a flat
  // fireball never does. That difference is the reason the three fighters
  // play differently at range, so it is worth pinning down.
  r = await run(() => {
    const C = DD.C, F = DD.FIREBALL;
    const crouchTop = C.GROUND_Y - 47;      // hurtbox top while crouching
    const out = {};
    for (const who of Object.keys(DD.PROJECTILES)) {
      const s = DD.PROJECTILES[who];
      let x = 0, y = C.GROUND_Y - 42, vy = s.vy, over = 0, t = 0;
      while (t++ < 300) {
        if (s.gravity) { vy += s.gravity; y += vy; }
        x += s.vx;
        if (s.ground && y >= C.GROUND_Y - 6) break;
        if (x > 340) break;
        if (y + F.h / 2 < crouchTop) over++;
      }
      out[who] = { over, travel: Math.round(x) };
    }
    return out;
  });
  check('Klaus\'s flat fireball can never be ducked', r.klaus.over === 0,
    `${r.klaus.over} frames over a crouch`);
  check('Antoine\'s grenade passes over a crouch', r.antoine.over >= 15,
    `${r.antoine.over} frames`);
  check('so does Maxim\'s molotov', r.maxim.over >= 15, `${r.maxim.over} frames`);
  check('and both lobs stay shorter than the flat one',
    r.antoine.travel < r.klaus.travel && r.maxim.travel < r.klaus.travel,
    `${r.antoine.travel} / ${r.maxim.travel} vs ${r.klaus.travel}`);

  // --- jumping over the other fighter ---------------------------------------
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game;
    const [a, d] = G.fighters;
    R.place(150, 150 + DD.C.PUSH_DIST);
    R.set(0, { up: true, right: true }); R.step(1);
    R.set(0, { right: true });
    let n = 0;
    while (!a.grounded && n++ < 200) R.step(1);
    return { crossed: a.x > d.x, me: Math.round(a.x), opp: Math.round(d.x) };
  });
  check('you can jump over the other fighter', r.crossed, `${r.me} vs ${r.opp}`);

  // --- how far a special throws you ----------------------------------------
  // Stated in screen widths rather than in knockback units, because that
  // is how they were asked for: the screen is 320 wide, so a quarter is
  // 80 and a full one is 320. The tolerance is a few pixels because the
  // arc is stepped a frame at a time and the last frame is partial.
  r = await run(() => {
    const R = window.__rig, G = window.__DOJO.game, C = DD.C;
    const thrown = (pick, mv, gap) => {
      G.pick = [pick, 0];
      G.startMatch(1);
      const [a, d] = G.fighters;
      // far from both walls, or the arena clamps the throw short
      a.reset(300, 1); d.reset(300 + gap, -1);
      a.state = 'idle'; d.state = 'idle';
      G.hitstop = 0; G.projectiles = []; G.state = 'fight';
      const x0 = d.x, hp0 = d.hp;
      a.startAttack(mv);
      let peak = C.GROUND_Y, rose = C.GROUND_Y;
      for (let f = 0; f < 400; f++) {
        if (G.hitstop > 0) { G.hitstop--; continue; }
        a.update(G, DD.input.emptyPad(), d); d.update(G, DD.input.emptyPad(), a);
        G.pushBodies(a, d); G.checkAttacks(a, d); G.updateProjectiles();
        peak = Math.min(peak, d.y); rose = Math.min(rose, a.y);
      }
      return { d: Math.round(d.x - x0), arc: Math.round(C.GROUND_Y - peak),
               rose: Math.round(C.GROUND_Y - rose), hit: d.hp < hp0 };
    };
    return {
      rush: thrown(0, 'rush', 40),
      antoineUpper: thrown(1, 'uppercut', 30),
      klausUpper: thrown(0, 'uppercut', 30),
      sweep: thrown(0, 'sweep', 30),
      proj: ['klaus', 'antoine', 'maxim'].reduce((o, who, i) => {
        G.pick = [i, 0]; G.startMatch(1);
        const [a, d] = G.fighters;
        a.reset(200, 1); d.reset(290, -1);
        a.state = 'idle'; d.state = 'idle';
        G.hitstop = 0; G.projectiles = []; G.state = 'fight';
        const x0 = d.x, hp0 = d.hp;
        a.startAttack('special');
        for (let f = 0; f < 400; f++) {
          if (G.hitstop > 0) { G.hitstop--; continue; }
          a.update(G, DD.input.emptyPad(), d); d.update(G, DD.input.emptyPad(), a);
          G.pushBodies(a, d); G.checkAttacks(a, d); G.updateProjectiles();
        }
        o[who] = { d: Math.round(d.x - x0), hit: d.hp < hp0 };
        return o;
      }, {}),
    };
  });
  const near = (got, want, tol) => Math.abs(got - want) <= (tol || 4);
  check('a rushing special throws a full screen', near(r.rush.d, 320),
    `${r.rush.d}px of a 320px screen`);
  check('...in an arc, not a shove', r.rush.arc > 40, `arc ${r.rush.arc}px`);
  check("Klaus's fireball throws a quarter screen", near(r.proj.klaus.d, 80),
    `${r.proj.klaus.d}px`);
  check("Maxim's molotov throws a quarter screen", near(r.proj.maxim.d, 80),
    `${r.proj.maxim.d}px`);
  check("Antoine's grenade keeps its shove", r.proj.antoine.hit && r.proj.antoine.d < 40,
    `${r.proj.antoine.d}px`);
  check("Antoine's uppercut throws half a screen", near(r.antoineUpper.d, 160),
    `${r.antoineUpper.d}px`);
  check('...and takes him off the ground with it', r.antoineUpper.rose > 40,
    `he rose ${r.antoineUpper.rose}px`);
  check('nobody else uppercuts off the ground', r.klausUpper.rose === 0,
    `Klaus rose ${r.klausUpper.rose}px`);
  check('a plain knockdown is still a shove', r.sweep.d < 30 && r.klausUpper.d < 40,
    `sweep ${r.sweep.d}px, uppercut ${r.klausUpper.d}px`);

  // --- the CPU has more than one idea ---------------------------------------
  // Antoine comes forward, Maxim wants the gap. Run each of them against
  // the same still opponent and the average distance has to separate them,
  // or all three fighters are one fighter.
  r = await run(() => {
    const G = window.__DOJO.game;
    const spacing = (pick) => {
      G.pick = [pick, 0];
      G.startMatch(2);
      const [a, d] = G.fighters;
      const ai = new DD.AIController(a, d, G);
      a.reset(120, 1); d.reset(240, -1); a.state = 'idle'; d.state = 'idle';
      G.projectiles = []; G.state = 'fight'; G.hitstop = 0;
      let sum = 0, n = 0;
      const idle = DD.input.emptyPad();
      for (let f = 0; f < 2400; f++) {
        a.update(G, ai.read(), d);
        d.update(G, idle, a);     // a post to work against, so only the
        d.hp = DD.C.MAX_HP;       // CPU's own spacing shows up
        G.pushBodies(a, d); G.updateProjectiles();
        sum += Math.abs(d.x - a.x); n++;
      }
      return Math.round(sum / n);
    };
    return { antoine: spacing(1), maxim: spacing(2) };
  });
  check('the CPU fighters do not all play the same', r.maxim > r.antoine + 12,
    `Antoine holds ${r.antoine}px, Maxim ${r.maxim}px`);

  // --- every roster entry can take the field -------------------------------
  // The title screen hands these straight to the Fighter constructor, so a
  // name that has no character or no such color scheme is a crash on pick.
  r = await run(() => {
    const bad = [];
    for (const e of DD.C.ROSTER) {
      if (!DD.sprites.CHARS[e.char]) { bad.push(`${e.name}: no character ${e.char}`); continue; }
      if (!DD.sprites.frames[e.char][e.skin]) bad.push(`${e.name}: no skin ${e.skin}`);
    }
    return { bad, n: DD.C.ROSTER.length };
  });
  check('every roster entry names a real fighter and skin',
    r.bad.length === 0, r.bad.join(', '));
  check('the roster holds all three fighters', r.n === 3, `${r.n} entries`);

  check('no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL MOVE CHECKS PASSED');
  process.exit(fails.length ? 1 : 0);
})();
