// Game flow: title -> round intro -> fight -> K.O./time -> winner.
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
      this.menuMode = 0;          // 0 = vs CPU, 1 = two players
      this.pick = [C().P1_PICK, C().P2_PICK];    // entries in C().ROSTER
      this.locked = [false, false];              // ...confirmed on select
      this.fighters = [];
      this.projectiles = [];
      this.particles = [];
      this.hitstop = 0;
      this.shake = 0;
      this.slowmo = 0;
      this.paused = false;
      this.round = 1;
      this.timeFrames = C().ROUND_TIME * 60;
      this.matchWinner = null;
      this.pendingWinner = null;
      this.seqT = 0;
      this.seqLabel = '';
      DD.sprites.buildAll();
      DD.spritesheet.load();   // hand-made sheets override the generated art
      DD.portraits.load();     // select-screen art, if any
      DD.stage.init();
      this.cam = 0;
      this.worldW = DD.stage.worldW(this.stageIndex);
      this.spawnTitleFighters();
    }

    refreshWorld() {
      this.worldW = DD.stage.worldW(this.stageIndex);
    }

    // camera follows the midpoint between both fighters, softly damped
    updateCamera() {
      const [p1, p2] = this.fighters;
      const target = Math.max(0, Math.min(this.worldW - DD.C.VIEW_W,
        (p1.x + p2.x) / 2 - DD.C.VIEW_W / 2));
      this.cam += (target - this.cam) * 0.12;
    }

    // who each side picked, as the roster entry itself
    fighterPick(side) {
      const r = C().ROSTER;
      return r[((this.pick[side] % r.length) + r.length) % r.length];
    }

    // title screen only – real fighters are created on match start
    spawnTitleFighters() {
      this.fighters = [0, 1].map((side) => {
        const p = this.fighterPick(side);
        return new DD.Fighter(side, p.char, p.skin, p.name, null);
      });
    }

    startMatch(mode) {
      const a = this.fighterPick(0), b = this.fighterPick(1);
      const p1 = new DD.Fighter(0, a.char, a.skin, a.name, null);
      const p2 = new DD.Fighter(1, b.char, b.skin, b.name, null);
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
      // wins and meter carry across rounds; everything else starts fresh
      const w1 = p1.wins, w2 = p2.wins, m1 = p1.meter, m2 = p2.meter;
      p1.reset(cx - 60, 1); p1.wins = w1; p1.meter = m1;
      p2.reset(cx + 60, -1); p2.wins = w2; p2.meter = m2;
      this.cam = Math.max(0, Math.min(this.worldW - DD.C.VIEW_W, cx - DD.C.VIEW_W / 2));
      p1.state = 'intro'; p2.state = 'intro';
      this.projectiles = [];
      this.particles = [];
      this.timeFrames = C().ROUND_TIME * 60;
      this.hitstop = 0;
      this.shake = 0;
      this.slowmo = 0;
      DD.fx.reset();
      this.pendingWinner = null;
      this.state = 'intro';
      this.seqT = 0;
      DD.audio.play('round');
    }

    hasProjectile(f) {
      return this.projectiles.some((p) => p.owner === f);
    }

    spawnFireball(f) {
      const spec = DD.PROJECTILES[f.char] || DD.PROJECTILES.klaus;
      this.projectiles.push({
        owner: f,
        x: f.x + f.facing * 28,
        y: f.y - 42,
        vx: f.facing * spec.vx,
        vy: spec.vy,
        gravity: spec.gravity,
        ground: spec.ground,   // goes off where it lands instead of flying on
        toss: spec.toss,       // how far back a hit puts them, in screen px
        t: 0,
        dead: false,
      });
      f.fireCd = C().FIREBALL_COOLDOWN;
      DD.audio.play('fireball');
    }

    spawnSparks(x, y, kind, power) {
      DD.fx.burst(x, y, kind, power);
    }

    overlap(a, b) {
      return a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    }

    // What should be playing, decided from the game state alone. Naming a
    // track that is already playing does nothing, so this can run every
    // frame and there is nowhere for a "start the music" call to be
    // forgotten. A round ends in silence on purpose: the K.O. lands, then
    // the win jingle, and neither wants a bassline underneath it.
    updateMusic() {
      const s = this.state;
      if (s === 'title' || s === 'select') DD.audio.music('title');
      else if (s === 'intro' || s === 'fight') {
        DD.audio.music(DD.audio.stageSong(this.stageIndex));
      } else DD.audio.music(null);
    }

    update() {
      this.t++;
      if (Input.wasPressed('KeyM')) DD.audio.toggleMute();
      DD.fx.update();
      this.updateMusic();

      // A K.O. runs at a third speed for a moment, so the hit that ended
      // the round is something you get to watch rather than something you
      // find out about afterwards.
      if (this.slowmo > 0) {
        this.slowmo--;
        if (this.slowmo % 3) { Input.endFrame(); return; }
      }

      switch (this.state) {
        case 'title': this.updateTitle(); break;
        case 'select': this.updateSelect(); break;
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
      // slow camera pan across the stage as a living backdrop
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
      if (Input.wasPressed('Digit1')) { this.openSelect(0); return; }
      if (Input.wasPressed('Digit2')) { this.openSelect(1); return; }
      if (Input.wasPressed('Enter')) this.openSelect(this.menuMode);
    }

    openSelect(mode) {
      this.menuMode = mode;
      this.locked = [false, false];
      this.state = 'select';
      DD.audio.play('select');
    }

    // Both sides choose at once. Each moves along the row with their own
    // left/right and locks in with their own punch key; against the CPU
    // only player one chooses, and the machine takes somebody else.
    updateSelect() {
      this.refreshWorld();
      this.cam = ((1 - Math.cos(this.t / 300)) / 2) * (this.worldW - DD.C.VIEW_W);
      const n = C().ROSTER.length;

      const move = (side, keys) => {
        if (this.locked[side]) return;
        const step = (Input.wasPressed(keys.left) ? -1 : 0)
                   + (Input.wasPressed(keys.right) ? 1 : 0);
        if (!step) return;
        this.pick[side] = (this.pick[side] + step + n) % n;
        this.spawnTitleFighters();
        DD.audio.play('select');
      };
      move(0, Input.P1_KEYS);
      if (this.menuMode === 1) move(1, Input.P2_KEYS);

      // the stage moves to up/down here, so left/right belongs to the row
      if (Input.wasPressed(Input.P1_KEYS.up) || Input.wasPressed(Input.P2_KEYS.up)) {
        this.stageIndex = (this.stageIndex + DD.stage.count - 1) % DD.stage.count;
        DD.audio.play('select');
      }
      if (Input.wasPressed(Input.P1_KEYS.down) || Input.wasPressed(Input.P2_KEYS.down)) {
        this.stageIndex = (this.stageIndex + 1) % DD.stage.count;
        DD.audio.play('select');
      }

      if (Input.wasPressed('Escape')) {
        this.state = 'title';
        this.spawnTitleFighters();
        DD.audio.play('select');
        return;
      }

      const lock = (side, key) => {
        if (this.locked[side] || !Input.wasPressed(key)) return;
        this.locked[side] = true;
        DD.audio.play('round');
      };
      lock(0, Input.P1_KEYS.punch);
      lock(0, 'Enter');                        // and the menu key, either way
      if (this.menuMode === 1) lock(1, Input.P2_KEYS.punch);
      else if (this.locked[0] && !this.locked[1]) {
        // The machine picks somebody who is not you, so a mirror match is
        // something you have to ask for rather than something you get.
        const others = [];
        for (let i = 0; i < n; i++) if (i !== this.pick[0]) others.push(i);
        this.pick[1] = others.length
          ? others[(Math.random() * others.length) | 0] : this.pick[0];
        this.locked[1] = true;
        this.spawnTitleFighters();
      }
      if (this.locked[0] && this.locked[1]) this.startMatch(this.menuMode);
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

      const [p1, p2] = this.fighters;
      const pad1 = p1.controller.read();
      const pad2 = p2.controller.read();

      // Hitstop freezes the fight, but not the stick. Buffering a cancel
      // during the freeze is exactly when a player does it, so the motion
      // buffers keep reading even though nobody moves.
      if (this.hitstop > 0) {
        this.hitstop--;
        p1.motion.feed(pad1, p1.facing);
        p2.motion.feed(pad2, p2.facing);
        return;
      }

      p1.update(this, pad1, p2);
      p2.update(this, pad2, p1);

      this.pushBodies(p1, p2);
      this.checkAttacks(p1, p2);
      this.checkAttacks(p2, p1);
      this.updateProjectiles();
      this.updateParticles();
      this.updateCamera();

      if (this.state !== 'fight') return; // a K.O. switched the phase

      this.timeFrames--;
      if (this.timeFrames <= 0) this.resolveTimeout();
    }

    pushBodies(a, b) {
      if (!a.grounded || !b.grounded) return;
      if (a.state === 'kolie' || b.state === 'kolie') return;
      if (a.state === 'kofall' || b.state === 'kofall') return;
      if (a.state === 'down' || b.state === 'down') return;   // walk over them
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
      const a = hb.data;
      att.hasHit = true;
      att.hitCount++;
      att.hitCd = a.hitGap || 0;
      // A multi-hit move that knocks down on every hit would launch them
      // out of its own remaining hits.
      const last = att.hitCount >= (a.hits || 1);
      const data = a.knockdown === 'last' && !last
        ? Object.assign({}, a, { knockdown: false })
        : a;

      const dir = def.x >= att.x ? 1 : -1;
      const cx = (Math.max(hb.x0, dbox.x0) + Math.min(hb.x1, dbox.x1)) / 2;
      const cy = (Math.max(hb.y0, dbox.y0) + Math.min(hb.y1, dbox.y1)) / 2;
      const wasStunned = def.state === 'hitstun';
      const result = def.receiveHit(this, data, dir);

      if (result === 'throw') {
        // over the shoulder: they land behind you, facing back at you
        const m = C().WALL_MARGIN;
        def.x = Math.max(m, Math.min(this.worldW - m, att.x - att.facing * 24));
        def.facing = att.facing;
        att.combo = 1;
        att.comboT = C().COMBO_SHOW;
        att.gainMeter(data.dmg * C().METER_DEALT);
        def.gainMeter(data.dmg * C().METER_TAKEN);
      } else if (result === 'tech') {
        // both shoved apart, nobody hurt
        att.kbVx = -att.facing * 1.6;
        def.kbVx = att.facing * 1.6;
        att.state = 'hitstun'; att.timer = 10; att.stunMax = 10;
        def.state = 'hitstun'; def.timer = 10; def.stunMax = 10;
      } else if (result === 'hit' || result === 'ko') {
        att.combo = wasStunned ? att.combo + 1 : 1;
        att.comboT = C().COMBO_SHOW;
        att.gainMeter(data.dmg * C().METER_DEALT);
        def.gainMeter(data.dmg * C().METER_TAKEN);
      } else if (result === 'block') {
        def.gainMeter(data.chip * C().METER_BLOCK);
      }
      this.afterHit(att, def, result, cx, cy, data);
    }

    afterHit(att, def, result, cx, cy, data) {
      if (result === 'none') return;
      // a jab and a super should not throw the same spark
      const power = 0.6 + ((data && data.dmg) || 6) / 9;
      const kind = result === 'block' || result === 'tech' ? 'block'
        : (att && att.atkName === 'super' ? 'super' : 'hit');
      this.spawnSparks(cx, cy, kind, power);
      this.hitstop = C().HITSTOP;
      this.shake = Math.max(this.shake, Math.round(power * 3));
      if (result === 'ko') {
        this.hitstop = C().HITSTOP + 8;
        this.shake = 20;
        this.slowmo = C().KO_SLOWMO;    // the moment gets to land
        DD.fx.flash = 6;
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
        if (p.gravity) { p.vy += p.gravity; p.y += p.vy; }
        if (p.x < -30 || p.x > this.worldW + 30) { p.dead = true; continue; }
        // a lobbed grenade goes off where it lands
        if (p.ground && p.y >= C().GROUND_Y - 6) {
          p.dead = true;
          this.spawnSparks(p.x, C().GROUND_Y - 6, 'hit');
          DD.audio.play('boom');   // a grenade going off is not a jab
          continue;
        }
        const box = { x0: p.x - F.w / 2, y0: p.y - F.h / 2, x1: p.x + F.w / 2, y1: p.y + F.h / 2 };
        // projectile vs projectile: both dissolve
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
          // All three projectiles share one set of hit numbers; what the
          // thrower's own entry adds is how far it puts you.
          const hit = p.toss ? Object.assign({}, F, { toss: p.toss }) : F;
          const result = def.receiveHit(this, hit, dir);
          this.afterHit(p.owner, def, result, p.x + p.vx * 2, p.y, hit);
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
      // the loser keeps falling / physics settles
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

    // ------------------------------------------------------------- Drawing

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
      if (this.state === 'select') {
        DD.ui.drawSelect(ctx, this, this.t);
        ctx.restore();
        return;
      }

      DD.fx.drawTint(ctx, DD.C.VIEW_W, DD.C.VIEW_H);

      // world layer: everything here scrolls with the camera
      ctx.save();
      ctx.translate(-cam, 0);

      // shadows, fighters (the one in hitstun draws on top), projectiles
      for (const f of this.fighters) f.drawShadow(ctx);
      const order = [...this.fighters].sort((a, b) => (a.state === 'hitstun' ? 1 : 0) - (b.state === 'hitstun' ? 1 : 0));
      for (const f of order) f.draw(ctx, this.t);

      for (const p of this.projectiles) {
        const frame = ((p.t / 4 | 0) % 2) ? 'fireballA' : 'fireballB';
        DD.sprites.draw(ctx, p.owner.char, p.owner.skin, frame, p.vx >= 0 ? 1 : -1, p.x, p.y + 8, 0);
      }

      DD.fx.drawWorld(ctx);

      ctx.restore();

      // foreground silhouettes (scroll faster than the fighters)
      DD.stage.drawFg(ctx, this.stageIndex, this.t, cam);

      DD.fx.drawScreen(ctx, DD.C.VIEW_W, DD.C.VIEW_H);
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
