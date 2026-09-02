// Dojo Duel – central game constants.
// All values are in "internal pixels" (320x180) or frames (60 per second).
window.DD = window.DD || {};

DD.C = {
  VIEW_W: 320,
  VIEW_H: 180,

  GROUND_Y: 158,      // the fighters' foot line (street level)
  WALL_MARGIN: 16,    // fighter margin to the world edge (world width per stage)

  GRAVITY: 0.24,
  JUMP_VY: -4.6,      // yields ~44px of jump height
  JUMP_VX: 1.5,       // horizontal jump speed (locked while airborne)
  WALK_F: 1.25,       // walking forward beats backing up – like the classics
  WALK_B: 0.95,

  MAX_HP: 100,
  ROUND_TIME: 99,
  ROUNDS_TO_WIN: 2,   // Best-of-3

  PUSH_DIST: 26,      // minimum body distance (push collision)

  DASH_SPEED: 3.6,    // double-tap a direction to burst forward or back
  DASH_FRAMES: 11,
  DASH_RECOVER: 5,    // frames you cannot act after the burst
  TAP_WINDOW: 13,     // two taps this close count as a double tap

  KNOCKDOWN_LIE: 24,  // frames on the floor after a sweep
  KNOCKDOWN_GETUP: 11,// frames standing back up (still not actionable)

  FIREBALL_SPEED: 2.4,
  FIREBALL_COOLDOWN: 60,

  HITSTOP: 6,         // brief freeze on hits ("impact feel")

  // Roster: which character enters with which color scheme.
  // Available: klaus (gold/crimson), antoine (olive/navy), hanzo (white/red)
  P1_CHAR: 'klaus', P1_SKIN: 'gold', P1_NAME: 'KLAUS',
  P2_CHAR: 'antoine', P2_SKIN: 'olive', P2_NAME: 'ANTOINE',
};

// Attack frame data: startup = wind-up, active = hit window,
// recovery = cool-down (all in frames). box = hitbox relative to the foot
// center, x points in facing direction, y is negative upwards.
//
// `crouch: true`  - performed from a crouch, and keeps the low hurtbox.
// `low: true`     - can only be blocked by a crouching opponent.
// `knockdown`     - puts the opponent on the floor instead of in hitstun.
DD.ATTACKS = {
  punch: {
    startup: 5, active: 4, recovery: 10,
    dmg: 6, chip: 1, stun: 16, blockstun: 9, kb: 2.0,
    box: { x: 8, y: -57, w: 26, h: 11 },
    sfx: 'punch',
  },
  kick: {
    startup: 8, active: 5, recovery: 15,
    dmg: 10, chip: 2, stun: 22, blockstun: 12, kb: 2.6,
    box: { x: 10, y: -44, w: 30, h: 13 },
    sfx: 'kick',
  },
  // Fast, short, safe. The poke you throw when you are not sure.
  cpunch: {
    startup: 4, active: 4, recovery: 8,
    dmg: 5, chip: 1, stun: 13, blockstun: 8, kb: 1.4,
    box: { x: 8, y: -34, w: 26, h: 11 },
    sfx: 'punch', crouch: true,
  },
  // The classic: slow, has to be blocked low, and puts them on the floor.
  // Whiffing it is the worst thing that can happen to you.
  sweep: {
    startup: 9, active: 5, recovery: 22,
    dmg: 9, chip: 2, stun: 0, blockstun: 13, kb: 2.2,
    box: { x: 8, y: -15, w: 36, h: 13 },
    sfx: 'kick', crouch: true, low: true, knockdown: true,
  },
  airkick: {
    startup: 6, active: 999, recovery: 0,  // active until landing
    dmg: 8, chip: 2, stun: 18, blockstun: 10, kb: 2.2,
    box: { x: 6, y: -39, w: 28, h: 15 },
    sfx: 'kick',
  },
  special: {
    startup: 14, active: 2, recovery: 24,  // "active" = the frame that spawns the projectile
    dmg: 0, chip: 0, stun: 0, blockstun: 0, kb: 0,
    box: null,
    sfx: 'fireball',
  },
};

DD.FIREBALL = { dmg: 8, chip: 2, stun: 20, blockstun: 12, kb: 2.4, w: 20, h: 14 };
