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
      this.airAttackUsed = false;
      this.fireCd = 0;
      this.kbVx = 0;              // knockback
      this.crouching = false;     // this attack came out of a crouch
      this.dashT = 0;             // frames left in a dash
      this.dashDir = 0;
      this.downT = 0;             // frames left lying / getting up after a sweep
      this.pad = DD.input.emptyPad();
      this.animT = 0;             // frames in the current state (for sequences)
      this.prevState = 'idle';
      this.motion = new DD.input.MotionBuffer();
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
      this.crouching = !!A()[name].crouch;
      DD.audio.play(A()[name].sfx);
    }

    startDash(dir) {
      this.state = 'dash';
      this.dashT = C().DASH_FRAMES + C().DASH_RECOVER;
      this.dashDir = dir;
      DD.audio.play('jump');
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
          this.kbVx *= 0.88;
          if (!this.grounded) {
            this.applyGravity();
            if (this.grounded) { this.y = C().GROUND_Y; this.downT = C().KNOCKDOWN_LIE; }
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
          if (pad.kick && !this.airAttackUsed) {
            this.airAttackUsed = true;
            this.state = 'airkick';
            this.atkName = 'airkick';
            this.atkT = 0;
            this.hasHit = false;
            DD.audio.play('kick');
          }
          if (this.grounded) this.land();
          break;
        }

        case 'airkick':
          this.applyGravity();
          this.atkT++;
          if (this.grounded) this.land();
          break;

        case 'attack': {
          this.atkT++;
          const a = A()[this.atkName];
          if (this.atkName === 'special' && this.atkT === a.startup) {
            game.spawnFireball(this);
          }
          // A rushing special travels while it is active, and stops dead
          // the moment it connects - otherwise it drags them across the
          // arena on a single hit.
          if (a.rush && !this.hasHit
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
    }

    // body box (where you can be hit), world coordinates
    hurtbox() {
      if (this.state === 'kolie' || this.state === 'kofall') return null;
      if (this.state === 'down') return null;          // floored = untouchable
      let top = 71, h = 71;
      if (this.low) { top = 47; h = 47; }
      if (this.state === 'jump' || this.state === 'airkick') { top = 40; h = 40; }
      return { x0: this.x - 11, y0: this.y - top, x1: this.x + 11, y1: this.y - top + h };
    }

    // active attack box or null
    attackHitbox() {
      let a = null, t = 0;
      if (this.state === 'attack' && this.atkName !== 'special') {
        a = A()[this.atkName];
        t = this.atkT;
      } else if (this.state === 'airkick') {
        a = A().airkick;
        t = this.atkT;
      }
      if (!a || !a.box || this.hasHit) return null;
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

    // dir: direction the defender gets pushed (+1 = to the right)
    receiveHit(game, data, dir) {
      if (this.state === 'kolie' || this.state === 'kofall') return 'none';
      if (this.state === 'down' || this.state === 'getup') return 'none';

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
      if (data.knockdown) {
        this.state = 'down';
        this.crouching = false;
        this.kbVx = dir * data.kb;
        this.vy = -2.0;
        this.y -= 0.01;
        this.downT = C().KNOCKDOWN_LIE;
        DD.audio.play('hit');
        return 'hit';
      }
      this.state = 'hitstun';
      this.timer = data.stun;
      this.kbVx = dir * data.kb;
      DD.audio.play('hit');
      return 'hit';
    }

    // resolve frame + y offset from the character's animation tables
    resolveFrame() {
      const anims = DD.sprites.CHARS[this.char].anims;

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
        case 'attack': {
          const a = DD.ATTACKS[this.atkName];
          const fr = anims[this.atkName].atk;
          const f = this.atkT < a.startup ? fr[0]
            : this.atkT < a.startup + a.active ? fr[1] : fr[2];
          return { f, yo: 0 };
        }
        case 'airkick': return { f: anims.airkick.atk[1], yo: 0 };
        case 'block': return { f: this.crouching ? anims.crouch : anims.block, yo: 0 };
        case 'hitstun': return { f: anims.hurt.two[this.timer > 8 ? 0 : 1], yo: 0 };
        case 'kofall': return { f: this.vy < 0 ? anims.kofall.vel2[0] : anims.kofall.vel2[1], yo: 0 };
        case 'kolie': return { f: anims.ko, yo: 0 };
        case 'win': return seqPick(anims.win);
        default: return seqPick(anims.idle);
      }
    }

    draw(ctx) {
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
