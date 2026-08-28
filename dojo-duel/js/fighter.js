// Der Kämpfer: Zustandsmaschine, Physik, Hitboxen, Treffer-Reaktionen.
window.DD = window.DD || {};

(function () {
  const C = () => DD.C;
  const A = () => DD.ATTACKS;

  class Fighter {
    constructor(id, palName, name, controller) {
      this.id = id;
      this.pal = palName;
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
      this.showHp = C().MAX_HP;   // nachlaufender Anzeigewert (roter Balken)
      this.state = 'idle';
      this.timer = 0;             // Restdauer von hitstun/blockstun
      this.atkName = null;
      this.atkT = 0;
      this.hasHit = false;
      this.airAttackUsed = false;
      this.fireCd = 0;
      this.kbVx = 0;              // Rückstoss
      this.pad = DD.input.emptyPad();
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
      DD.audio.play(A()[name].sfx);
    }

    update(game, pad, opp) {
      this.pad = pad;
      if (this.fireCd > 0) this.fireCd--;
      // Anzeige-HP läuft dem echten Wert langsam hinterher
      if (this.showHp > this.hp) this.showHp = Math.max(this.hp, this.showHp - 0.6);

      // Blickrichtung nur im neutralen Stand anpassen
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
            this.y -= 0.01; // sofort "in der Luft"
            this.state = 'jump';
            this.airAttackUsed = false;
            DD.audio.play('jump');
          } else if (pad.down) {
            this.state = 'crouch';
          } else if (pad.punch) {
            this.startAttack('punch');
          } else if (pad.kick) {
            this.startAttack('kick');
          } else if (pad.special && this.fireCd === 0 && !game.hasProjectile(this)) {
            this.startAttack('special');
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
          if (!pad.down) this.state = 'idle';
          else if (pad.punch) this.startAttack('punch');
          else if (pad.kick) this.startAttack('kick');
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

      // Arena-Begrenzung
      this.x = Math.max(C().WALL_L, Math.min(C().WALL_R, this.x));
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

    // Körper-Box (wo man getroffen werden kann), Weltkoordinaten
    hurtbox() {
      if (this.state === 'kolie' || this.state === 'kofall') return null;
      let top = 64, h = 64;
      if (this.state === 'crouch') { top = 42; h = 42; }
      if (this.state === 'jump' || this.state === 'airkick') { top = 36; h = 36; }
      return { x0: this.x - 10, y0: this.y - top, x1: this.x + 10, y1: this.y - top + h };
    }

    // aktive Angriffs-Box oder null
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

    // dir: Richtung, in die der Getroffene geschoben wird (+1 = nach rechts)
    receiveHit(game, data, dir) {
      if (this.state === 'kolie' || this.state === 'kofall') return 'none';

      const away = dir > 0 ? this.pad.right : this.pad.left;
      const canBlock = this.grounded && (this.controllable);
      if (canBlock && away) {
        this.hp = Math.max(1, this.hp - data.chip); // Chip-Schaden macht kein K.O.
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
      this.state = 'hitstun';
      this.timer = data.stun;
      this.kbVx = dir * data.kb;
      DD.audio.play('hit');
      return 'hit';
    }

    frameName(t) {
      switch (this.state) {
        case 'idle': case 'intro': return 'idle';
        case 'walkF': case 'walkB':
          return ((t / 9 | 0) % 2) ? 'walkA' : 'walkB';
        case 'crouch': return 'crouch';
        case 'jump': return 'jump';
        case 'attack': return this.atkName === 'special' ? 'special'
                            : this.atkName === 'kick' ? 'kick' : 'punch';
        case 'airkick': return 'kick';
        case 'block': return 'block';
        case 'hitstun': return 'hurt';
        case 'kofall': return 'hurt';
        case 'kolie': return 'ko';
        case 'win': return 'win';
        default: return 'idle';
      }
    }

    draw(ctx, t) {
      let dy = 0;
      if (this.state === 'idle' || this.state === 'intro') dy = (t / 32 | 0) % 2;
      if (this.state === 'win') dy = (t / 16 | 0) % 2;
      DD.sprites.draw(ctx, this.pal, this.frameName(t), this.facing, this.x, this.y, dy);
    }

    drawShadow(ctx) {
      if (this.state === 'kolie') return;
      const air = Math.max(0, C().GROUND_Y - this.y);
      const w = Math.max(10, 30 - air * 0.35);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(this.x - w / 2), C().GROUND_Y, Math.round(w), 3);
    }
  }

  DD.Fighter = Fighter;
})();
