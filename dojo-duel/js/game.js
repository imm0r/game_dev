// Spielablauf: Titel -> Runden-Intro -> Kampf -> K.O./Zeit -> Sieger.
window.DD = window.DD || {};

(function () {
  const C = () => DD.C;
  const { Input, HumanController } = DD.input;

  class Game {
    constructor(ctx) {
      this.ctx = ctx;
      this.t = 0;
      this.state = 'title';
      this.stageIndex = 0;
      this.menuMode = 0;          // 0 = gegen CPU, 1 = zwei Spieler
      this.fighters = [];
      this.projectiles = [];
      this.particles = [];
      this.hitstop = 0;
      this.shake = 0;
      this.paused = false;
      this.round = 1;
      this.timeFrames = C().ROUND_TIME * 60;
      this.matchWinner = null;
      this.pendingWinner = null;
      this.seqT = 0;
      this.seqLabel = '';
      DD.sprites.buildAll();
      DD.stage.init();
      this.cam = 0;
      this.worldW = DD.stage.worldW(this.stageIndex);
      this.spawnTitleFighters();
    }

    refreshWorld() {
      this.worldW = DD.stage.worldW(this.stageIndex);
    }

    // Kamera folgt der Mitte zwischen beiden Kämpfern, sanft gedämpft
    updateCamera() {
      const [p1, p2] = this.fighters;
      const target = Math.max(0, Math.min(this.worldW - DD.C.VIEW_W,
        (p1.x + p2.x) / 2 - DD.C.VIEW_W / 2));
      this.cam += (target - this.cam) * 0.12;
    }

    // Nur fürs Titelbild – echte Kämpfer entstehen bei Spielstart
    spawnTitleFighters() {
      this.fighters = [
        new DD.Fighter(0, C().P1_CHAR, C().P1_SKIN, C().P1_NAME, null),
        new DD.Fighter(1, C().P2_CHAR, C().P2_SKIN, C().P2_NAME, null),
      ];
    }

    startMatch(mode) {
      const p1 = new DD.Fighter(0, C().P1_CHAR, C().P1_SKIN, C().P1_NAME, null);
      const p2 = new DD.Fighter(1, C().P2_CHAR, C().P2_SKIN, C().P2_NAME, null);
      p1.controller = new HumanController(Input.P1_KEYS);
      p2.controller = mode === 1
        ? new HumanController(Input.P2_KEYS)
        : new DD.AIController(p2, p1, this);
      this.fighters = [p1, p2];
      this.round = 1;
      this.matchWinner = null;
      this.startRound();
    }

    startRound() {
      this.refreshWorld();
      const cx = this.worldW / 2;
      const [p1, p2] = this.fighters;
      const w1 = p1.wins, w2 = p2.wins;
      p1.reset(cx - 60, 1); p1.wins = w1;
      p2.reset(cx + 60, -1); p2.wins = w2;
      this.cam = Math.max(0, Math.min(this.worldW - DD.C.VIEW_W, cx - DD.C.VIEW_W / 2));
      p1.state = 'intro'; p2.state = 'intro';
      this.projectiles = [];
      this.particles = [];
      this.timeFrames = C().ROUND_TIME * 60;
      this.hitstop = 0;
      this.shake = 0;
      this.pendingWinner = null;
      this.state = 'intro';
      this.seqT = 0;
      DD.audio.play('round');
    }

    hasProjectile(f) {
      return this.projectiles.some((p) => p.owner === f);
    }

    spawnFireball(f) {
      this.projectiles.push({
        owner: f,
        x: f.x + f.facing * 28,
        y: f.y - 42,
        vx: f.facing * C().FIREBALL_SPEED,
        t: 0,
        dead: false,
      });
      f.fireCd = C().FIREBALL_COOLDOWN;
      DD.audio.play('fireball');
    }

    spawnSparks(x, y, kind) {
      const cols = kind === 'block'
        ? ['#88c8f8', '#f8f8f8', '#4890d8']
        : ['#f8f8f8', '#f8d020', '#f88020'];
      for (let i = 0; i < 9; i++) {
        this.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.7) * 3,
          life: 10 + Math.random() * 8,
          col: cols[i % cols.length],
        });
      }
    }

    overlap(a, b) {
      return a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    }

    update() {
      this.t++;
      if (Input.wasPressed('KeyM')) DD.audio.toggleMute();

      switch (this.state) {
        case 'title': this.updateTitle(); break;
        case 'intro': this.updateIntro(); break;
        case 'fight': this.updateFight(); break;
        case 'roundend': this.updateRoundEnd(); break;
        case 'matchend':
          if (Input.wasPressed('Enter')) {
            this.state = 'title';
            this.spawnTitleFighters();
            DD.audio.play('select');
          }
          break;
      }

      Input.endFrame();
    }

    updateTitle() {
      // langsamer Kameraschwenk über die Stage als lebendiger Hintergrund
      this.refreshWorld();
      this.cam = ((1 - Math.cos(this.t / 300)) / 2) * (this.worldW - DD.C.VIEW_W);
      if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')
        || Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) {
        this.menuMode = 1 - this.menuMode;
        DD.audio.play('select');
      }
      if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA')) {
        this.stageIndex = (this.stageIndex + DD.stage.count - 1) % DD.stage.count;
        DD.audio.play('select');
      }
      if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) {
        this.stageIndex = (this.stageIndex + 1) % DD.stage.count;
        DD.audio.play('select');
      }
      if (Input.wasPressed('Digit1')) { this.startMatch(0); return; }
      if (Input.wasPressed('Digit2')) { this.startMatch(1); return; }
      if (Input.wasPressed('Enter')) this.startMatch(this.menuMode);
    }

    updateIntro() {
      this.updateCamera();
      this.seqT++;
      if (this.seqT === 66) DD.audio.play('round');
      if (this.seqT >= 110) {
        this.state = 'fight';
        for (const f of this.fighters) f.state = 'idle';
      }
    }

    updateFight() {
      if (Input.wasPressed('KeyP')) this.paused = !this.paused;
      if (this.paused) return;

      if (this.hitstop > 0) { this.hitstop--; return; }

      const [p1, p2] = this.fighters;
      const pad1 = p1.controller.read();
      const pad2 = p2.controller.read();
      p1.update(this, pad1, p2);
      p2.update(this, pad2, p1);

      this.pushBodies(p1, p2);
      this.checkAttacks(p1, p2);
      this.checkAttacks(p2, p1);
      this.updateProjectiles();
      this.updateParticles();
      this.updateCamera();

      if (this.state !== 'fight') return; // K.O. hat die Phase gewechselt

      this.timeFrames--;
      if (this.timeFrames <= 0) this.resolveTimeout();
    }

    pushBodies(a, b) {
      if (!a.grounded || !b.grounded) return;
      if (a.state === 'kolie' || b.state === 'kolie') return;
      if (a.state === 'kofall' || b.state === 'kofall') return;
      const d = b.x - a.x;
      const dist = Math.abs(d);
      if (dist >= C().PUSH_DIST) return;
      const push = (C().PUSH_DIST - dist) / 2;
      const dir = d >= 0 ? 1 : -1;
      const m = C().WALL_MARGIN, wr = this.worldW - m;
      a.x = Math.max(m, Math.min(wr, a.x - dir * push));
      b.x = Math.max(m, Math.min(wr, b.x + dir * push));
    }

    checkAttacks(att, def) {
      const hb = att.attackHitbox();
      if (!hb) return;
      const dbox = def.hurtbox();
      if (!this.overlap(hb, dbox)) return;
      att.hasHit = true;
      const dir = def.x >= att.x ? 1 : -1;
      const cx = (Math.max(hb.x0, dbox.x0) + Math.min(hb.x1, dbox.x1)) / 2;
      const cy = (Math.max(hb.y0, dbox.y0) + Math.min(hb.y1, dbox.y1)) / 2;
      const result = def.receiveHit(this, hb.data, dir);
      this.afterHit(att, def, result, cx, cy);
    }

    afterHit(att, def, result, cx, cy) {
      if (result === 'none') return;
      this.spawnSparks(cx, cy, result === 'block' ? 'block' : 'hit');
      this.hitstop = C().HITSTOP;
      if (result === 'ko') {
        this.hitstop = C().HITSTOP + 8;
        this.shake = 20;
        this.pendingWinner = att;
        this.seqLabel = 'K.O.!';
        this.state = 'roundend';
        this.seqT = 0;
        DD.audio.play('ko');
      }
    }

    updateProjectiles() {
      const F = DD.FIREBALL;
      for (const p of this.projectiles) {
        if (p.dead) continue;
        p.t++;
        p.x += p.vx;
        if (p.x < -30 || p.x > this.worldW + 30) { p.dead = true; continue; }
        const box = { x0: p.x - F.w / 2, y0: p.y - F.h / 2, x1: p.x + F.w / 2, y1: p.y + F.h / 2 };
        // Feuerball gegen Feuerball: beide lösen sich auf
        for (const q of this.projectiles) {
          if (q === p || q.dead || q.owner === p.owner) continue;
          const qbox = { x0: q.x - F.w / 2, y0: q.y - F.h / 2, x1: q.x + F.w / 2, y1: q.y + F.h / 2 };
          if (this.overlap(box, qbox)) {
            p.dead = true; q.dead = true;
            this.spawnSparks((p.x + q.x) / 2, p.y, 'hit');
          }
        }
        if (p.dead) continue;
        const def = this.fighters.find((f) => f !== p.owner);
        const dbox = def && def.hurtbox();
        if (dbox && this.overlap(box, dbox)) {
          p.dead = true;
          const dir = def.x >= p.owner.x ? 1 : -1;
          const result = def.receiveHit(this, F, dir);
          this.afterHit(p.owner, def, result, p.x + p.vx * 2, p.y);
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead);
    }

    updateParticles() {
      for (const s of this.particles) {
        s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life--;
      }
      this.particles = this.particles.filter((s) => s.life > 0);
    }

    resolveTimeout() {
      const [p1, p2] = this.fighters;
      this.seqLabel = 'TIME OVER';
      this.pendingWinner = p1.hp > p2.hp ? p1 : (p2.hp > p1.hp ? p2 : null);
      this.state = 'roundend';
      this.seqT = 0;
    }

    updateRoundEnd() {
      this.seqT++;
      const [p1, p2] = this.fighters;
      // Verlierer fällt weiter / Physik läuft aus
      const empty = DD.input.emptyPad();
      p1.update(this, empty, p2);
      p2.update(this, empty, p1);
      this.updateProjectiles();
      this.updateParticles();

      if (this.seqT === 80 && this.pendingWinner) {
        this.pendingWinner.state = 'win';
        DD.audio.play('win');
      }
      if (this.seqT >= 170) {
        if (this.pendingWinner) this.pendingWinner.wins++;
        const winner = this.fighters.find((f) => f.wins >= C().ROUNDS_TO_WIN);
        if (winner) {
          this.matchWinner = winner;
          this.state = 'matchend';
        } else {
          this.round++;
          this.startRound();
        }
      }
    }

    // ------------------------------------------------------------- Zeichnen

    draw() {
      const ctx = this.ctx;
      ctx.save();
      if (this.shake > 0) {
        this.shake--;
        ctx.translate(
          Math.round((Math.random() - 0.5) * 4),
          Math.round((Math.random() - 0.5) * 3),
        );
      }

      const cam = Math.round(this.cam);
      DD.stage.draw(ctx, this.stageIndex, this.t, cam);

      if (this.state === 'title') {
        DD.ui.drawTitle(ctx, this, this.t);
        ctx.restore();
        return;
      }

      // Welt-Ebene: alles hier scrollt mit der Kamera
      ctx.save();
      ctx.translate(-cam, 0);

      // Schatten, Kämpfer (der zuletzt Getroffene liegt "oben"), Projektile
      for (const f of this.fighters) f.drawShadow(ctx);
      const order = [...this.fighters].sort((a, b) => (a.state === 'hitstun' ? 1 : 0) - (b.state === 'hitstun' ? 1 : 0));
      for (const f of order) f.draw(ctx, this.t);

      for (const p of this.projectiles) {
        const frame = ((p.t / 4 | 0) % 2) ? 'fireballA' : 'fireballB';
        DD.sprites.draw(ctx, p.owner.char, p.owner.skin, frame, p.vx >= 0 ? 1 : -1, p.x, p.y + 8, 0);
      }

      for (const s of this.particles) {
        ctx.globalAlpha = Math.min(1, s.life / 8);
        ctx.fillStyle = s.col;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Vordergrund-Silhouetten (ziehen schneller vorbei als die Kämpfer)
      DD.stage.drawFg(ctx, this.stageIndex, this.t, cam);

      DD.ui.drawHUD(ctx, this);

      if (this.state === 'intro') {
        if (this.seqT < 66) {
          const label = (this.fighters[0].wins === C().ROUNDS_TO_WIN - 1
                      && this.fighters[1].wins === C().ROUNDS_TO_WIN - 1)
                      ? 'FINAL ROUND' : 'ROUND ' + this.round;
          DD.ui.announce(ctx, label, 3, '#f8d020', false, this.t);
        } else {
          DD.ui.announce(ctx, 'FIGHT!', 4, '#f85040', false, this.t);
        }
      }
      if (this.state === 'roundend' && this.seqT < 120) {
        DD.ui.announce(ctx, this.seqLabel, 4, '#f85040', true, this.t);
      }
      if (this.state === 'matchend') {
        DD.ui.drawMatchEnd(ctx, this, this.t);
      }
      if (this.paused && this.state === 'fight') {
        ctx.fillStyle = 'rgba(8,4,16,0.5)';
        ctx.fillRect(0, 0, 320, 180);
        DD.ui.announce(ctx, 'PAUSE', 3, '#f8f8f8', false, this.t);
      }

      ctx.restore();
    }
  }

  DD.Game = Game;
})();
