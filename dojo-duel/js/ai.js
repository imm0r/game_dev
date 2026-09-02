// Simple but believable CPU AI: keeps its distance, mixes attacks,
// blocks occasionally and dodges projectiles. Deliberately imperfect –
// it only "re-thinks" every few frames and can be outplayed.
window.DD = window.DD || {};

(function () {
  class AIController {
    constructor(me, opp, game) {
      this.me = me;
      this.opp = opp;
      this.game = game;
      this.plan = DD.input.emptyPad();
      this.planTimer = 0;
      this.queue = [];       // a stick motion, one pad per frame
    }

    // Motions are played on the stick, exactly as a human would - the CPU
    // gets no private door into the special moves.
    motion(dirs, toward, button) {
      this.queue = dirs.map((d, i) => {
        const p = DD.input.emptyPad();
        if (d.f) p[toward] = true;
        if (d.d) p.down = true;
        if (i === dirs.length - 1) p[button] = true;
        return p;
      });
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

      // someone is coming down on us -> dragon punch, sometimes
      if (!opp.grounded && dist < 58 && me.grounded && Math.random() < 0.45) {
        this.motion([{ f: 1 }, { d: 1 }, { d: 1, f: 1 }], toward, 'punch');
        return this.queue.shift();
      }

      // danger: incoming projectile -> jump or block
      for (const p of this.game.projectiles) {
        if (p.owner !== opp) continue;
        const coming = (p.vx > 0) === (me.x > p.x);
        const near = Math.abs(p.x - me.x) < 85;
        if (coming && near && me.grounded) {
          if (Math.random() < 0.5) { pad.up = true; pad[toward] = true; }
          else pad[away] = true;
          return pad;
        }
      }

      // opponent is winding up -> block every now and then, and crouch to
      // do it if what is coming is a low. Not always: a CPU that always
      // blocks correctly is no fun to fight.
      if (opp.state === 'attack' && dist < 80 && Math.random() < 0.4) {
        pad[away] = true;
        const move = DD.ATTACKS[opp.atkName];
        if (move && move.low) pad.down = true;
        return pad;
      }

      // a full meter is meant to be spent
      if (me.meter >= DD.C.METER_MAX && dist < 95 && me.grounded
          && Math.random() < 0.09) {
        this.motion([{ d: 1 }, { d: 1, f: 1 }, { f: 1 }], toward, 'special');
        return this.queue.shift();
      }

      // mid range, out of nowhere -> come in behind the rushing special
      if (dist > 55 && dist < 130 && me.grounded && Math.random() < 0.035) {
        this.motion([{ d: 1 }, { d: 1, f: 1 }, { f: 1 }], toward, 'kick');
        return this.queue.shift();
      }

      if (--this.planTimer <= 0) {
        this.planTimer = 10 + Math.floor(Math.random() * 12);
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
      const r = Math.random();
      if (dist > 120) {
        if (r < 0.24) p[toward] = true;
        else if (r < 0.36) p[dash] = true;              // close the gap fast
        else if (r < 0.58 && this.me.fireCd === 0) p.special = true;
        else if (r < 0.72) { p.up = true; p[toward] = true; }
        // otherwise: hold position briefly
      } else if (dist > 60) {
        if (r < 0.38) p[toward] = true;
        else if (r < 0.50) { p.up = true; p[toward] = true; p.kick = true; }
        else if (r < 0.60) p.kick = true;
        else if (r < 0.70) { p.down = true; p.kick = true; }   // sweep the approach
        else if (r < 0.78 && this.me.fireCd === 0) p.special = true;
        else if (r < 0.88) p[away] = true;
      } else {
        if (r < 0.26) p.punch = true;
        else if (r < 0.44) p.kick = true;
        else if (r < 0.58) { p.down = true; p.punch = true; }  // fast low poke
        else if (r < 0.68) { p.down = true; p.kick = true; }   // sweep
        else if (r < 0.80) p[away] = true;
        else if (r < 0.90) { p.up = true; p[toward] = true; p.kick = true; }
        else p[toward] = true;
      }
      return p;
    }
  }

  DD.AIController = AIController;
})();
