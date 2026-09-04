// The fighter: state machine, physics, hitboxes, hit reactions.
window.DD = window.DD || {};

(function () {
  const C = () => DD.C;
  const A = () => DD.ATTACKS;

  class Fighter {
    constructor(id, charKey, skinKey, name, controller) {
      this.id = id;
      this.char = charKey;
      this.skin = skinKey;
      this.name = name;
      this.controller = controller;
      this.wins = 0;
      this.reset(160, 1);
    }

    reset(x, facing) {
      this.x = x;
      this.y = C().GROUND_Y;
      this.vx = 0;
      this.vy = 0;
      this.facing = facing;
      this.hp = C().MAX_HP;
      this.showHp = C().MAX_HP;   // trailing display value (red bar)
      this.state = 'idle';
      this.timer = 0;             // remaining hitstun/blockstun
      this.atkName = null;
      this.atkT = 0;
      this.hasHit = false;
      this.hitCount = 0;          // hits this attack has landed
      this.hitCd = 0;             // frames until it may hit again
      this.meter = 0;             // super meter, 0..METER_MAX
      this.combo = 0;             // hits in the current combo
      this.comboT = 0;            // frames the counter stays on screen
      this.airAttackUsed = false;
      this.fireCd = 0;
      this.kbVx = 0;              // knockback
      this.crouching = false;     // this attack came out of a crouch
      this.techT = 0;             // frames left in which a grab would break
      this.dashT = 0;             // frames left in a dash
      this.dashDir = 0;
      this.downT = 0;             // frames left lying / getting up after a sweep
      this.tossT = 0;             // frames of a throw still carrying them
      this.tossing = false;       // ...and whether one is under way at all
      this.stunMax = 0;           // the stun this hit started with
      this.pad = DD.input.emptyPad();
      this.animT = 0;             // frames in the current state (for sequences)
      this.prevState = 'idle';
      this.motion = new DD.input.MotionBuffer();
      this.trail = [];            // ghost frames left by a dash or a rush
    }

    // A move as *this* fighter performs it: the shared frame data with
    // their own entry merged over it, if they have one. Everything reads
    // moves through here rather than off DD.ATTACKS, so a per-fighter
    // difference is one line in DD.CHAR_ATTACKS and nothing else.
    move(name) {
      const base = A()[name];
      const mine = (DD.CHAR_ATTACKS[this.char] || {})[name];
      return mine ? Object.assign({}, base, mine) : base;
    }

    // Anything that covers ground fast enough to smear leaves a trail.
    get streaking() {
      if (this.state === 'dash') return true;
      if (this.state !== 'attack') return false;
      const a = this.move(this.atkName);
      return !!a.rush && this.atkT >= a.startup
        && this.atkT < a.startup + a.active;
    }

    get grounded() { return this.y >= C().GROUND_Y; }

    get controllable() {
      return this.state === 'idle' || this.state === 'walkF'
          || this.state === 'walkB' || this.state === 'crouch';
    }

    startAttack(name) {
      this.state = 'attack';
      this.atkName = name;
      this.atkT = 0;
      this.hasHit = false;
      this.hitCount = 0;
      this.hitCd = 0;
      this.crouching = !!this.move(name).crouch;
      if (name === 'super') this.meter = 0;
      DD.audio.play(this.move(name).sfx);
    }

    gainMeter(amount) {
      this.meter = Math.min(C().METER_MAX, this.meter + amount);
    }

    // A grab reaches about an arm's length, needs you walking into them,
    // and will not pick someone out of hitstun - that would be a loop.
    canThrow(opp) {
      if (!opp || !opp.grounded || !this.grounded) return false;
      if (Math.abs(opp.x - this.x) > C().THROW_RANGE) return false;
      const fwd = this.facing > 0 ? this.pad.right : this.pad.left;
      if (!fwd) return false;
      return opp.controllable || opp.state === 'block';
    }

    // Invulnerable during a super's start-up: that is what the meter buys.
    get invulnerable() {
      if (this.state !== 'attack') return false;
      const a = this.move(this.atkName);
      return !!a.invuln && this.atkT < a.invuln;
    }

    startDash(dir) {
      this.state = 'dash';
      this.dashT = C().DASH_FRAMES + C().DASH_RECOVER;
      this.dashDir = dir;
      DD.audio.play('dash');
    }

    // Anything crouching stays low, hitbox and hurtbox alike.
    get low() {
      if (this.state === 'crouch') return true;
      return this.crouching && (this.state === 'attack' || this.state === 'getup'
        || this.state === 'block');
    }

    // The specials, in the order they get to claim a button press: the
    // harder motion first, so a dragon punch is never read as a fireball.
    trySpecial(game, pad) {
      const w = C().MOTION_WINDOW, M = DD.MOTIONS;
      if (pad.special && this.meter >= C().METER_MAX && this.motion.has(M.qcf, w)) {
        this.motion.clear();
        this.startAttack('super');
        DD.fx.flash = 8;                       // the screen announces it
        DD.fx.tint = A().super.invuln + 6;     // and everything else dims
        return true;
      }
      if (pad.punch && this.motion.has(M.dp, w)) {
        this.motion.clear(); this.startAttack('uppercut'); return true;
      }
      if (pad.kick && this.motion.has(M.qcf, w)) {
        this.motion.clear(); this.startAttack('rush'); return true;
      }
      if (pad.punch && this.motion.has(M.qcf, w)
          && this.fireCd === 0 && !game.hasProjectile(this)) {
        this.motion.clear(); this.startAttack('special'); return true;
      }
      return false;
    }

    update(game, pad, opp) {
      this.pad = pad;
      this.motion.feed(pad, this.facing);
      if (this.state === this.prevState) this.animT++;
      else { this.animT = 0; this.prevState = this.state; }
      if (this.fireCd > 0) this.fireCd--;
      if (this.comboT > 0 && --this.comboT === 0) this.combo = 0;
      // pressing punch leaves a short window in which a grab breaks
      if (pad.punch) this.techT = C().THROW_TECH;
      else if (this.techT > 0) this.techT--;
      // display HP slowly trails the real value
      if (this.showHp > this.hp) this.showHp = Math.max(this.hp, this.showHp - 0.6);

      // only re-face the opponent while in a neutral stance
      if (this.controllable && this.grounded && opp) {
        const d = opp.x - this.x;
        if (d !== 0) this.facing = d > 0 ? 1 : -1;
      }

      switch (this.state) {
        case 'idle':
        case 'walkF':
        case 'walkB': {
          this.state = 'idle';
          if (pad.up) {
            this.vy = C().JUMP_VY;
            this.vx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
            this.vx *= C().JUMP_VX;
            this.y -= 0.01; // instantly "airborne"
            this.state = 'jump';
            this.airAttackUsed = false;
            DD.audio.play('jump');
          } else if (this.trySpecial(game, pad)) {
            /* a motion claimed the button */
          } else if (pad.punch && this.canThrow(opp)) {
            this.startAttack('throw');        // walk into them and punch
          } else if (pad.down && pad.punch) {
            this.startAttack('cpunch');       // down+attack fires at once,
          } else if (pad.down && pad.kick) {  // no need to already be crouching
            this.startAttack('sweep');
          } else if (pad.down) {
            this.state = 'crouch';
          } else if (pad.punch) {
            this.startAttack('punch');
          } else if (pad.kick) {
            this.startAttack('kick');
          } else if (pad.special && this.fireCd === 0 && !game.hasProjectile(this)) {
            this.startAttack('special');
          } else if (pad.dashL || pad.dashR) {
            this.startDash(pad.dashR ? 1 : -1);
          } else {
            const dir = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
            if (dir !== 0) {
              const fwd = dir === this.facing;
              this.x += dir * (fwd ? C().WALK_F : C().WALK_B);
              this.state = fwd ? 'walkF' : 'walkB';
            }
          }
          break;
        }

        case 'crouch':
          if (this.trySpecial(game, pad)) break;   // a motion can end crouched
          if (pad.punch) this.startAttack('cpunch');
          else if (pad.kick) this.startAttack('sweep');
          else if (!pad.down) this.state = 'idle';
          break;

        case 'dash': {
          // The burst is over before the recovery is: you travel, then you
          // stand there for a moment, which is what makes it a commitment.
          if (this.dashT > C().DASH_RECOVER) this.x += this.dashDir * C().DASH_SPEED;
          if (--this.dashT <= 0) this.state = 'idle';
          break;
        }

        case 'down': {
          this.x += this.kbVx;
          // A thrown body does not slow down until it lands. A shove
          // decays from the first frame, as it always has.
          if (this.tossT > 0) this.tossT--;
          else this.kbVx *= 0.88;
          if (!this.grounded) {
            this.applyGravity();
            if (this.grounded) {
              this.y = C().GROUND_Y;
              this.downT = C().KNOCKDOWN_LIE;
              // A throw is measured door to door: landing ends it, rather
              // than adding another skid's worth on top of the distance
              // the move promised.
              if (this.tossing) { this.tossing = false; this.kbVx = 0; }
            }
          } else if (--this.downT <= 0) {
            this.state = 'getup';
            this.downT = C().KNOCKDOWN_GETUP;
            this.crouching = true;
          }
          break;
        }

        case 'getup':
          if (--this.downT <= 0) { this.state = 'idle'; this.crouching = false; }
          break;

        case 'jump': {
          this.applyGravity();
          // One attack per jump, either one. The kick reaches further, the
          // punch comes out sooner.
          const air = pad.kick ? 'airkick' : pad.punch ? 'airpunch' : null;
          if (air && !this.airAttackUsed) {
            this.airAttackUsed = true;
            this.state = 'airatk';
            this.atkName = air;
            this.atkT = 0;
            this.hasHit = false;
            DD.audio.play(this.move(air).sfx);
          }
          if (this.grounded) this.land();
          break;
        }

        case 'airatk':
          this.applyGravity();
          this.atkT++;
          if (this.grounded) this.land();
          break;

        case 'attack': {
          this.atkT++;
          if (this.hitCd > 0) this.hitCd--;
          const a = this.move(this.atkName);
          if (this.atkName === 'special' && this.atkT === a.startup) {
            game.spawnFireball(this);
          }
          // A move that leaves the ground: push off as the hit window
          // opens, then fall. The hitbox is anchored to the feet, so it
          // rises along with them - which is what makes a leaping
          // uppercut reach someone already in the air. The move ends on
          // landing however much recovery is left, because standing in
          // recovery mid-air would be nonsense.
          if (a.rise) {
            if (this.atkT === a.startup) { this.vy = a.rise; this.y -= 0.01; }
            if (!this.grounded) {
              this.applyGravity();
              if (this.grounded) {
                this.y = C().GROUND_Y;
                this.vy = 0;
                this.state = 'idle';
                this.atkName = null;
                break;
              }
            }
          }
          // Cancel a connected normal into a special: that is the whole
          // combo engine. Only once it has hit, so a whiffed poke stays
          // as punishable as it looks.
          if (a.cancel && this.hasHit && this.atkT >= a.startup
              && this.trySpecial(game, pad)) break;
          // A rushing special travels while it is active. A single-hit one
          // stops dead on contact, or it would drag them across the arena;
          // a multi-hit one has to keep going, or it never lands its
          // second hit.
          if (a.rush && (a.hits > 1 || !this.hasHit)
              && this.atkT >= a.startup && this.atkT < a.startup + a.active) {
            this.x += this.facing * a.rush;
          }
          if (this.atkT >= a.startup + a.active + a.recovery) {
            this.state = 'idle';
            this.atkName = null;
          }
          break;
        }

        case 'block':
        case 'hitstun': {
          this.x += this.kbVx;
          this.kbVx *= 0.86;
          if (!this.grounded) {
            this.applyGravity();
            if (this.grounded) this.y = C().GROUND_Y;
          }
          if (--this.timer <= 0) this.state = 'idle';
          break;
        }

        case 'kofall': {
          this.x += this.kbVx;
          this.kbVx *= 0.97;
          this.applyGravity();
          if (this.grounded) {
            this.y = C().GROUND_Y;
            this.state = 'kolie';
          }
          break;
        }

        case 'kolie':
        case 'win':
        case 'intro':
          break;
      }

      // arena bounds (world width comes from the current stage)
      const m = C().WALL_MARGIN;
      this.x = Math.max(m, Math.min(game.worldW - m, this.x));

      if (this.streaking) {
        const { f } = this.resolveFrame();
        this.trail.unshift({ x: this.x, y: this.y, facing: this.facing, f });
        this.trail.length = Math.min(this.trail.length, C().TRAIL);
      } else if (this.trail.length) {
        this.trail.pop();
      }
    }

    applyGravity() {
      this.vy += C().GRAVITY;
      this.y += this.vy;
      this.x += this.vx;
      if (this.y >= C().GROUND_Y) {
        this.y = C().GROUND_Y;
      }
    }

    land() {
      this.y = C().GROUND_Y;
      this.vy = 0;
      this.vx = 0;
      this.state = 'idle';
      this.atkName = null;
      DD.audio.play('land');
      DD.fx.puff(this.x, C().GROUND_Y, 6);
    }

    // body box (where you can be hit), world coordinates
    hurtbox() {
      if (this.state === 'kolie' || this.state === 'kofall') return null;
      if (this.state === 'down') return null;          // floored = untouchable
      if (this.invulnerable) return null;              // super start-up
      let top = 71, h = 71;
      if (this.low) { top = 47; h = 47; }
      if (this.state === 'jump' || this.state === 'airatk') { top = 40; h = 40; }
      return { x0: this.x - 11, y0: this.y - top, x1: this.x + 11, y1: this.y - top + h };
    }

    // active attack box or null
    attackHitbox() {
      let a = null, t = 0;
      if (this.state === 'attack' && this.atkName !== 'special') {
        a = this.move(this.atkName);
        t = this.atkT;
      } else if (this.state === 'airatk') {
        a = this.move(this.atkName);
        t = this.atkT;
      }
      if (!a || !a.box) return null;
      if (this.hitCount >= (a.hits || 1) || this.hitCd > 0) return null;
      if (t < a.startup || t >= a.startup + a.active) return null;
      const b = a.box;
      const xA = this.x + this.facing * b.x;
      const xB = this.x + this.facing * (b.x + b.w);
      return {
        x0: Math.min(xA, xB), y0: this.y + b.y,
        x1: Math.max(xA, xB), y1: this.y + b.y + b.h,
        data: a,
      };
    }

    // Off the ground and backwards. Without `toss` this is the shove the
    // game always had: a horizontal speed that decays away in a few
    // frames, worth about seven times itself in distance.
    //
    // With it, the hit throws them a stated number of *screen pixels* -
    // the screen is 320 wide, so 80 is a quarter of it - and the arc
    // follows from the distance rather than being tuned beside it. Launch
    // at 45 degrees and the whole thing falls out of one number: a body
    // thrown that way covers `g*T*T/2`, so the time in the air is
    // `sqrt(2*range/g)` and the speeds are what carry it that far. 80px
    // lifts them 20 and lands them in 26 frames; 320 lifts them 80 and
    // takes 52. The big throw looks big because it *is* big, not because
    // a second constant says so.
    //
    // Horizontal speed holds while they are in the air and only decays
    // once they touch down, which is both what a thrown body does and the
    // only way the distance comes out as asked.
    launch(dir, data, vy) {
      this.kbVx = dir * data.kb;
      this.vy = vy === undefined ? -2.0 : vy;
      this.tossT = 0;
      this.tossing = false;
      if (data.toss) {
        const g = C().GRAVITY;
        this.vy = -Math.sqrt(data.toss * g / 2);
        // The flight is stepped a frame at a time, so the horizontal
        // speed has to be the distance over the frames it will actually
        // take, not over the continuous time it would take. Counting them
        // here is a dozen iterations and means the throw lands where it
        // said it would rather than a few percent short.
        let n = 0, y = -0.01, v = this.vy;
        while (y < 0 && n < 600) { v += g; y += v; n++; }
        this.kbVx = dir * (data.toss / Math.max(1, n));
        this.tossT = n;
        this.tossing = true;
      }
      this.y -= 0.01;   // "airborne" this frame, so gravity takes over
    }

    // dir: direction the defender gets pushed (+1 = to the right)
    receiveHit(game, data, dir) {
      if (this.state === 'kolie' || this.state === 'kofall') return 'none';
      if (this.state === 'down' || this.state === 'getup') return 'none';

      // A grab ignores guard entirely - that is the point of it - but
      // whoever pressed punch a moment ago shrugs it off.
      if (data.grab) {
        if (this.techT > 0) { DD.audio.play('block'); return 'tech'; }
        this.hp -= data.dmg;
        if (this.hp <= 0) {
          this.hp = 0;
          this.state = 'kofall';
          this.kbVx = dir * 1.8;
          this.vy = -2.6;
          this.y -= 0.01;
          return 'ko';
        }
        this.state = 'down';
        this.crouching = false;
        this.launch(dir, data, -2.4);
        this.downT = C().KNOCKDOWN_LIE;
        DD.audio.play('hit');
        return 'throw';
      }

      const away = dir > 0 ? this.pad.right : this.pad.left;
      const canBlock = this.grounded && this.controllable
        // A low has to be blocked low. Standing there holding back is
        // exactly what a sweep is for.
        && (!data.low || this.state === 'crouch');
      if (canBlock && away) {
        this.hp = Math.max(1, this.hp - data.chip); // chip damage cannot K.O.
        this.crouching = this.state === 'crouch';   // block low, stay low
        this.state = 'block';
        this.timer = data.blockstun;
        this.kbVx = dir * data.kb * 0.7;
        DD.audio.play('block');
        return 'block';
      }

      this.hp -= data.dmg;
      if (this.hp <= 0) {
        this.hp = 0;
        this.state = 'kofall';
        this.kbVx = dir * 1.8;
        this.vy = -2.6;
        this.y -= 0.01;
        return 'ko';
      }
      if (data.knockdown || data.toss) {
        this.state = 'down';
        this.crouching = false;
        this.launch(dir, data);
        this.downT = C().KNOCKDOWN_LIE;
        DD.audio.play(data.toss ? 'launch' : 'hit');
        return 'hit';
      }
      this.state = 'hitstun';
      this.timer = data.stun;
      this.stunMax = data.stun;
      this.kbVx = dir * data.kb;
      DD.audio.play('hit');
      return 'hit';
    }

    // resolve frame + y offset from the character's animation tables
    resolveFrame() {
      const anims = DD.sprites.CHARS[this.char].anims;

      // The drawings spread over the move's own frame data: whatever comes
      // before `hit` plays through the wind-up, `hit` itself is held for
      // the whole hit window, and the rest plays out the recovery. Three
      // drawings with hit at 1 - the shape every move had before any of
      // them got a strip - lands exactly where it used to.
      const atkFrame = (an) => {
        const a = this.move(this.atkName);
        const fr = an.atk;
        const hit = Math.min(fr.length - 1, an.hit === undefined ? 1 : an.hit);
        const span = (from, to, t, dur) => {
          const lo = Math.max(0, from), hi = Math.min(fr.length - 1, to);
          if (hi <= lo) return fr[Math.min(lo, fr.length - 1)];
          const n = hi - lo + 1;
          return fr[lo + Math.min(n - 1, Math.floor((t / Math.max(1, dur)) * n))];
        };
        return this.atkT < a.startup
          ? span(0, hit - 1, this.atkT, a.startup)
          : this.atkT < a.startup + a.active
            ? fr[hit]
            : span(hit + 1, fr.length - 1,
              this.atkT - a.startup - a.active, a.recovery);
      };

      const seqPick = (anim, reverse) => {
        const total = anim.seq.reduce((s, e) => s + e[1], 0);
        let tt = this.animT % total;
        const order = reverse ? [...anim.seq].reverse() : anim.seq;
        for (const e of order) {
          if (tt < e[1]) return { f: e[0], yo: e[2] };
          tt -= e[1];
        }
        return { f: anim.seq[0][0], yo: 0 };
      };

      switch (this.state) {
        case 'idle': case 'intro': return seqPick(anims.idle);
        case 'walkF': return seqPick(anims.walk);
        case 'walkB': return seqPick(anims.walk, true);
        case 'crouch': return { f: anims.crouch, yo: 0 };
        case 'dash': return { f: anims.dash, yo: 0 };
        case 'getup': return { f: anims.getup, yo: 0 };
        case 'down': return { f: anims.down, yo: 0 };
        case 'jump': {
          const fr = anims.jump.vel;
          const f = this.vy < -0.8 ? fr[0] : this.vy < 0.8 ? fr[1] : fr[2];
          return { f, yo: 0 };
        }
        case 'attack': return { f: atkFrame(anims[this.atkName]), yo: 0 };
        case 'airatk': return { f: atkFrame(anims[this.atkName]), yo: 0 };
        case 'block': return { f: this.crouching ? anims.cblock : anims.block, yo: 0 };
        case 'hitstun': {
          // Spread over the stun as it runs down, so a hit plays out
          // instead of holding one drawing until it ends. Different moves
          // stun for different lengths, so it goes by how much of *this*
          // one is left.
          const fr = anims.hurt.hit;
          const max = this.stunMax || this.timer || 1;
          const gone = Math.max(0, max - this.timer) / max;
          return { f: fr[Math.min(fr.length - 1, Math.floor(gone * fr.length))], yo: 0 };
        }
        case 'kofall': return { f: this.vy < 0 ? anims.kofall.vel2[0] : anims.kofall.vel2[1], yo: 0 };
        case 'kolie': return { f: anims.ko, yo: 0 };
        case 'win': return seqPick(anims.win);
        default: return seqPick(anims.idle);
      }
    }

    draw(ctx) {
      // ghosts first, oldest and faintest at the back
      for (let i = this.trail.length - 1; i >= 1; i--) {
        const g = this.trail[i];
        ctx.globalAlpha = 0.5 * (1 - (i - 1) / C().TRAIL);
        DD.sprites.draw(ctx, this.char, this.skin, g.f, g.facing, g.x, g.y, 0);
      }
      ctx.globalAlpha = 1;
      const { f, yo } = this.resolveFrame();
      DD.sprites.draw(ctx, this.char, this.skin, f, this.facing, this.x, this.y, yo);
    }

    drawShadow(ctx) {
      if (this.state === 'kolie') return;
      if (this.state === 'down' && this.grounded) return;
      const air = Math.max(0, C().GROUND_Y - this.y);
      const w = Math.max(10, 30 - air * 0.35);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(this.x - w / 2), C().GROUND_Y, Math.round(w), 3);
    }
  }

  DD.Fighter = Fighter;
})();
