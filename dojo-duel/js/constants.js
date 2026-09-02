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

  MOTION_WINDOW: 20,  // frames a stick motion may take before it goes stale

  METER_MAX: 100,
  METER_DEALT: 0.7,   // meter per point of damage dealt
  METER_TAKEN: 0.5,   // ...and taken, so losing still builds towards a super
  METER_BLOCK: 2.5,   // per point of chip damage blocked
  COMBO_SHOW: 70,     // frames the hit counter stays up after the last hit

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
    sfx: 'punch', cancel: true,
  },
  kick: {
    startup: 8, active: 5, recovery: 15,
    dmg: 10, chip: 2, stun: 22, blockstun: 12, kb: 2.6,
    box: { x: 10, y: -44, w: 30, h: 13 },
    sfx: 'kick', cancel: true,
  },
  // Fast, short, safe. The poke you throw when you are not sure.
  cpunch: {
    startup: 4, active: 4, recovery: 8,
    dmg: 5, chip: 1, stun: 13, blockstun: 8, kb: 1.4,
    box: { x: 8, y: -34, w: 26, h: 11 },
    sfx: 'punch', crouch: true, cancel: true,
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
  // Anti-air. The hitbox is tall rather than long, so it beats someone
  // coming down on you and loses to anyone standing back — and the 26
  // frames of recovery are what you pay when you guess wrong.
  uppercut: {
    startup: 4, active: 8, recovery: 26,
    dmg: 13, chip: 3, stun: 26, blockstun: 15, kb: 2.6,
    box: { x: 3, y: -74, w: 24, h: 44 },
    sfx: 'punch', knockdown: true,
  },
  // Each fighter's second special: Klaus charges wreathed in flame,
  // Antoine turns himself into a cannonball. Same rules, different art.
  rush: {
    startup: 10, active: 20, recovery: 20,
    dmg: 15, chip: 3, stun: 28, blockstun: 16, kb: 3.2,
    box: { x: 0, y: -58, w: 32, h: 46 },
    sfx: 'fireball', knockdown: true, rush: 3.1,
  },
  // The super. Same charge as the rush, but it hits four times on the way
  // through and cannot be interrupted while it starts up - a full meter
  // buys you the one move nobody trades with.
  super: {
    startup: 12, active: 34, recovery: 26,
    dmg: 7, chip: 2, stun: 20, blockstun: 12, kb: 1.4,
    box: { x: -2, y: -66, w: 38, h: 56 },
    sfx: 'fireball', rush: 2.8, hits: 4, hitGap: 8, invuln: 12,
    knockdown: 'last',   // only the fourth hit puts them down
  },
  special: {
    startup: 14, active: 2, recovery: 24,  // "active" = the frame that spawns the projectile
    dmg: 0, chip: 0, stun: 0, blockstun: 0, kb: 0,
    box: null,
    sfx: 'fireball',
  },
};

// Projectiles fly differently per fighter: Klaus throws a fireball
// straight, Antoine lobs a grenade that arcs and goes off where it lands.
DD.PROJECTILES = {
  klaus: { vx: 2.4, vy: 0, gravity: 0 },
  antoine: { vx: 2.1, vy: -2.6, gravity: 0.13, ground: true },
  hanzo: { vx: 2.4, vy: 0, gravity: 0 },
};

// Stick motions, in numpad notation relative to the way you are facing:
// 6 = forward, 4 = back, 2 = down, 3 = down-forward, 8 = up.
DD.MOTIONS = {
  qcf: [2, 3, 6],   // quarter circle forward
  dp: [6, 2, 3],    // the dragon-punch motion
};

DD.FIREBALL = { dmg: 8, chip: 2, stun: 20, blockstun: 12, kb: 2.4, w: 20, h: 14 };
