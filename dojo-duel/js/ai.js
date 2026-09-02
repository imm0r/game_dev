// The CPU. It plays on the same stick a human uses - no private door into
// the special moves - and it is deliberately imperfect: it re-thinks only
// every few frames, and it can be read.
//
// The thing it used to be missing was not skill, it was *intent*. Every
// few frames it rolled a fresh table of moves, which averages out to one
// behaviour: walk forward and attack. That is a legitimate way to play a
// fighting game, and for one of these three it is the character - but all
// three doing it is one fighter played three times.
//
// So it holds a **stance** for a while instead. A stance decides what the
// distance means: to a zoner 130px is where it wants to be and it will
// back up to stay there, to a rusher it is a gap to close. Reactions -
// anti-air, blocking, answering a projectile - sit in front of the stance
// and interrupt it, because those are answers to what just happened
// rather than a plan.
window.DD = window.DD || {};

(function () {
  // Temperament per fighter, and it follows their projectile. Klaus
  // throws flat down the whole screen, so keeping you out is a real plan.
  // Antoine's grenade dies at 107px - he has no long game, so he does not
  // pretend to have one and comes at you. Maxim's molotov is shorter
  // still, but it lobs over a crouch, so he throws it to make you move
  // and punishes the approach.
  const STYLE = {
    klaus:   { rush: 0.40, zone: 0.40, antiAir: 0.55, hold: 34, fire: 0.55 },
    antoine: { rush: 0.75, zone: 0.05, antiAir: 0.40, hold: 20, fire: 0.30 },
    maxim:   { rush: 0.20, zone: 0.60, antiAir: 0.65, hold: 46, fire: 0.60 },
    hanzo:   { rush: 0.45, zone: 0.35, antiAir: 0.50, hold: 30, fire: 0.45 },
  };
  const DEFAULT = STYLE.klaus;

  // How far out the CPU wants to stand in each stance.
  const ZONE_RANGE = 120;   // far enough that a walk-in can be seen coming
  const POKE_RANGE = 62;    // just outside a standing kick

  class AIController {
    constructor(me, opp, game) {
      this.me = me;
      this.opp = opp;
      this.game = game;
      this.plan = DD.input.emptyPad();
      this.planTimer = 0;
      this.queue = [];        // a stick motion, one pad per frame
      this.stance = 'poke';
      this.stanceT = 0;
    }

    get style() { return STYLE[this.me.char] || DEFAULT; }

    // Motions are played on the stick, exactly as a human would.
    motion(dirs, toward, button) {
      this.queue = dirs.map((d, i) => {
        const p = DD.input.emptyPad();
        if (d.f) p[toward] = true;
        if (d.d) p.down = true;
        if (i === dirs.length - 1) p[button] = true;
        return p;
      });
    }

    canFire() {
      return this.me.fireCd === 0 && !this.game.hasProjectile(this.me);
    }

    // Their projectile, if one is on its way here, with how long we have.
    incoming() {
      for (const p of this.game.projectiles) {
        if (p.owner !== this.opp || p.dead) continue;
        const gap = this.me.x - p.x;
        if (Math.sign(gap) !== Math.sign(p.vx)) continue;   // going away
        return { p, frames: Math.abs(gap) / Math.max(0.1, Math.abs(p.vx)) };
      }
      return null;
    }

    // Losing badly, or losing on time, is a reason to stop being careful.
    get urgency() {
      const behind = (this.opp.hp - this.me.hp) / DD.C.MAX_HP;
      const late = this.game.timeFrames < 20 * 60 ? 0.25 : 0;
      return Math.max(0, behind) + late;
    }

    pickStance(dist) {
      const s = this.style;
      const u = this.urgency;
      this.stanceT = s.hold + Math.floor(Math.random() * s.hold);
      // Being behind pushes everyone towards coming forward: sitting on a
      // lead is a plan, sitting on a deficit is just losing slower.
      const rush = Math.min(0.95, s.rush + u * 0.5);
      const zone = Math.max(0, s.zone - u * 0.4);
      const r = Math.random();
      if (r < rush) this.stance = 'rush';
      else if (r < rush + zone) this.stance = 'zone';
      else this.stance = 'poke';
    }

    read() {
      const me = this.me, opp = this.opp;
      if (this.queue.length) return this.queue.shift();
      const pad = DD.input.emptyPad();
      if (!me.controllable && me.state !== 'jump') { this.planTimer = 0; return pad; }

      const d = opp.x - me.x;
      const dist = Math.abs(d);
      const toward = d > 0 ? 'right' : 'left';
      const away = d > 0 ? 'left' : 'right';
      const s = this.style;

      // ---- reactions, in front of any plan ----------------------------

      // Someone is coming down on us. Now that an uppercut has
      // invulnerable start-up this is a real answer and not a trade, so it
      // is worth doing on purpose.
      if (!opp.grounded && dist < 62 && me.grounded && Math.random() < s.antiAir) {
        this.motion([{ f: 1 }, { d: 1 }, { d: 1, f: 1 }], toward, 'punch');
        return this.queue.shift();
      }

      // A projectile on its way. Jumping it only works in the middle of
      // the arc - the feet are above the fireball from about frame 13 to
      // frame 31 of a 44 frame jump - so it has to leave at the right
      // moment rather than as soon as it sees one. Too early is how you
      // land on it.
      const inc = this.incoming();
      if (inc && me.grounded) {
        if (inc.frames > 16 && inc.frames < 26 && Math.random() < 0.55) {
          pad.up = true;
          // jump in behind it, or straight up to stay out of the corner
          if (dist > 80 && Math.random() < 0.7) pad[toward] = true;
          return pad;
        }
        // far enough out, answer it with one of our own: they cancel, and
        // that is the fireball war
        if (inc.frames > 26 && dist > 100 && this.canFire() && Math.random() < s.fire) {
          pad.special = true;
          return pad;
        }
        if (inc.frames < 20) { pad[away] = true; return pad; }   // block it
      }

      // Winding up at us -> block sometimes, and crouch to do it if what
      // is coming is a low. A CPU that always blocks correctly is no fun.
      if (opp.state === 'attack' && dist < 80 && Math.random() < 0.4) {
        pad[away] = true;
        const move = DD.ATTACKS[opp.atkName];
        if (move && move.low) pad.down = true;
        return pad;
      }

      // Sitting on block at arm's length -> grab them out of it.
      if (opp.state === 'block' && dist < DD.C.THROW_RANGE - 3 && me.grounded
          && Math.random() < 0.3) {
        pad[toward] = true;
        pad.punch = true;
        return pad;
      }

      // A full meter is meant to be spent.
      if (me.meter >= DD.C.METER_MAX && dist < 95 && me.grounded
          && Math.random() < 0.09) {
        this.motion([{ d: 1 }, { d: 1, f: 1 }, { f: 1 }], toward, 'special');
        return this.queue.shift();
      }

      // ---- the stance -------------------------------------------------

      if (--this.stanceT <= 0) this.pickStance(dist);
      if (--this.planTimer <= 0) {
        this.planTimer = 8 + Math.floor(Math.random() * 10);
        this.plan = this.newPlan(dist, toward, away);
      }

      // execute the stored plan; attacks and dashes are one-shot impulses
      Object.assign(pad, this.plan);
      this.plan.punch = this.plan.kick = this.plan.special = this.plan.up = false;
      this.plan.dashL = this.plan.dashR = false;
      return pad;
    }

    newPlan(dist, toward, away) {
      const p = DD.input.emptyPad();
      const dash = toward === 'right' ? 'dashR' : 'dashL';
      const s = this.style;
      const r = Math.random();
      const cornered = this.me.x < 46 || this.me.x > this.game.worldW - 46;

      // ZONE: the distance is the plan. Hold it, and make them come
      // through something to close it. Backed into a corner there is
      // nowhere left to hold, so it stops pretending and comes out.
      if (this.stance === 'zone' && !cornered) {
        const backDash = toward === 'right' ? 'dashL' : 'dashR';
        if (dist < 42) {
          // Already inside their reach, and walking will not fix it:
          // forward walking is faster than backing up on purpose, so
          // holding back never opens a gap. Only the back dash and a
          // knockdown actually buy room, so those are the plan.
          if (r < 0.40) p[backDash] = true;
          else if (r < 0.60) { p.down = true; p.kick = true; }  // sweep = space
          else if (r < 0.74) p.punch = true;                    // fastest button
          else if (r < 0.86) p[away] = true;
          else p.kick = true;
        } else if (dist < ZONE_RANGE - 20) {
          // approaching: give ground, or make them pay for the walk
          if (r < 0.30) p[away] = true;
          else if (r < 0.52) p[backDash] = true;
          else if (r < 0.66) { p.down = true; p.kick = true; }
          else if (r < 0.78) p.kick = true;
          else p[away] = true;
        } else if (this.canFire() && r < s.fire) {
          p.special = true;
        } else if (r < s.fire + 0.14) {
          p[away] = true;                                        // buy the cooldown
        } else if (r < s.fire + 0.24) {
          p[toward] = true;                                      // creep back in
        }
        // otherwise: stand still and wait, which is a move
        return p;
      }

      // RUSH: get in and stay in. This is Antoine most of the time, and
      // any of them when they are behind.
      if (this.stance === 'rush') {
        if (dist > 110) {
          if (r < 0.46) p[toward] = true;
          else if (r < 0.68) p[dash] = true;
          else if (r < 0.82) { p.up = true; p[toward] = true; }
          else if (r < 0.92 && this.canFire()) p.special = true;
          else p[toward] = true;
        } else if (dist > 58) {
          if (r < 0.34) p[toward] = true;
          else if (r < 0.48) p[dash] = true;
          else if (r < 0.62) { p.up = true; p[toward] = true; p.kick = true; }
          else if (r < 0.74) { this.rushSpecial(toward); }
          else if (r < 0.86) p.kick = true;
          else p[toward] = true;
        } else {
          if (r < 0.28) p.punch = true;
          else if (r < 0.46) p.kick = true;
          else if (r < 0.60) { p.down = true; p.punch = true; }
          else if (r < 0.72) { p.down = true; p.kick = true; }
          else if (r < 0.84) { p[toward] = true; p.punch = true; }   // walk in and grab
          else p[toward] = true;
        }
        return p;
      }

      // POKE: the neutral game. Live just outside their reach, step in
      // and out, and take what is offered.
      if (dist > 130) {
        if (r < 0.30) p[toward] = true;
        else if (r < 0.42) p[dash] = true;
        else if (r < 0.62 && this.canFire()) p.special = true;
        else if (r < 0.74) { p.up = true; p[toward] = true; }
      } else if (dist > POKE_RANGE) {
        if (r < 0.30) p[toward] = true;
        else if (r < 0.42) { p.up = true; p[toward] = true; p.kick = true; }
        else if (r < 0.54) p.kick = true;
        else if (r < 0.64) { p.down = true; p.kick = true; }
        else if (r < 0.74 && this.canFire()) p.special = true;
        else if (r < 0.88) p[away] = true;
      } else {
        if (r < 0.24) p.punch = true;
        else if (r < 0.40) p.kick = true;
        else if (r < 0.54) { p.down = true; p.punch = true; }
        else if (r < 0.64) { p.down = true; p.kick = true; }
        else if (r < 0.80) p[away] = true;
        else if (r < 0.90) { p.up = true; p[toward] = true; p.kick = true; }
        else p[toward] = true;
      }
      return p;
    }

    // Queued rather than returned: it costs three frames of stick.
    rushSpecial(toward) {
      this.motion([{ d: 1 }, { d: 1, f: 1 }, { f: 1 }], toward, 'kick');
    }
  }

  DD.AIController = AIController;
})();
