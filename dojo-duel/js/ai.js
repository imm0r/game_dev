// Einfache aber glaubwürdige CPU-KI: hält Distanzen, mischt Angriffe,
// blockt manchmal und weicht Feuerbällen aus. Bewusst nicht perfekt –
// sie "überlegt" nur alle paar Frames neu und lässt sich austricksen.
window.DD = window.DD || {};

(function () {
  class AIController {
    constructor(me, opp, game) {
      this.me = me;
      this.opp = opp;
      this.game = game;
      this.plan = DD.input.emptyPad();
      this.planTimer = 0;
    }

    read() {
      const me = this.me, opp = this.opp;
      const pad = DD.input.emptyPad();
      if (!me.controllable && me.state !== 'jump') { this.planTimer = 0; return pad; }

      const d = opp.x - me.x;
      const dist = Math.abs(d);
      const toward = d > 0 ? 'right' : 'left';
      const away = d > 0 ? 'left' : 'right';

      // Gefahr: anfliegender Feuerball -> springen oder blocken
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

      // Gegner holt aus -> ab und zu blocken
      if (opp.state === 'attack' && dist < 75 && Math.random() < 0.35) {
        pad[away] = true;
        return pad;
      }

      if (--this.planTimer <= 0) {
        this.planTimer = 10 + Math.floor(Math.random() * 12);
        this.plan = this.newPlan(dist, toward, away);
      }

      // gemerkten Plan ausführen; Angriffe sind Einmal-Impulse
      Object.assign(pad, this.plan);
      this.plan.punch = this.plan.kick = this.plan.special = this.plan.up = false;
      return pad;
    }

    newPlan(dist, toward, away) {
      const p = DD.input.emptyPad();
      const r = Math.random();
      if (dist > 120) {
        if (r < 0.30) p[toward] = true;
        else if (r < 0.55 && this.me.fireCd === 0) p.special = true;
        else if (r < 0.70) { p.up = true; p[toward] = true; }
        // sonst: kurz stehen bleiben
      } else if (dist > 60) {
        if (r < 0.45) p[toward] = true;
        else if (r < 0.60) { p.up = true; p[toward] = true; p.kick = true; }
        else if (r < 0.72) p.kick = true;
        else if (r < 0.80 && this.me.fireCd === 0) p.special = true;
        else if (r < 0.90) p[away] = true;
      } else {
        if (r < 0.34) p.punch = true;
        else if (r < 0.58) p.kick = true;
        else if (r < 0.72) p[away] = true;
        else if (r < 0.84) { p.up = true; p[toward] = true; p.kick = true; }
        else p[toward] = true;
      }
      return p;
    }
  }

  DD.AIController = AIController;
})();
