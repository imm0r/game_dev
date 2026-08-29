// Dojo Duel – zentrale Spielkonstanten.
// Alle Werte in "internen Pixeln" (320x180) bzw. Frames (60 pro Sekunde).
window.DD = window.DD || {};

DD.C = {
  VIEW_W: 320,
  VIEW_H: 180,

  GROUND_Y: 158,      // Fusslinie der Kämpfer (Strassenniveau)
  WALL_MARGIN: 16,    // Abstand der Kämpfer zum Weltrand (Weltbreite je Stage)

  SCALE: 2,           // ein Sprite-Pixel = 2 Bildschirm-Pixel

  GRAVITY: 0.24,
  JUMP_VY: -4.6,      // ergibt ca. 44px Sprunghöhe
  JUMP_VX: 1.5,       // horizontale Sprunggeschwindigkeit (in der Luft fixiert)
  WALK_F: 1.25,       // vorwärts schneller als rückwärts – wie beim Vorbild
  WALK_B: 0.95,

  MAX_HP: 100,
  ROUND_TIME: 99,
  ROUNDS_TO_WIN: 2,   // Best-of-3

  PUSH_DIST: 24,      // Mindestabstand der Körper (Schiebe-Kollision)

  FIREBALL_SPEED: 2.4,
  FIREBALL_COOLDOWN: 60,

  HITSTOP: 6,         // kurzes Einfrieren bei Treffern ("Impact-Gefühl")

  // Roster: welcher Charakter mit welchem Farbschema antritt.
  // Verfügbar: klaus (gold/crimson), antoine (olive/navy), hanzo (white/red)
  // Bis Antoine auf die neue Sprite-Generation gehoben ist (Roadmap M2),
  // läuft der Standard-Kampf als Klaus-Spiegelmatch.
  P1_CHAR: 'klaus', P1_SKIN: 'gold', P1_NAME: 'KLAUS',
  P2_CHAR: 'klaus', P2_SKIN: 'crimson', P2_NAME: 'KLAUS',
};

// Frame-Daten der Angriffe: startup = Anlauf, active = Trefferfenster,
// recovery = Erholung (alles in Frames). box = Hitbox relativ zur Fussmitte,
// x zeigt in Blickrichtung, y ist negativ nach oben.
DD.ATTACKS = {
  punch: {
    startup: 5, active: 4, recovery: 10,
    dmg: 6, chip: 1, stun: 16, blockstun: 9, kb: 2.0,
    box: { x: 8, y: -52, w: 24, h: 10 },
    sfx: 'punch',
  },
  kick: {
    startup: 8, active: 5, recovery: 15,
    dmg: 10, chip: 2, stun: 22, blockstun: 12, kb: 2.6,
    box: { x: 10, y: -40, w: 28, h: 12 },
    sfx: 'kick',
  },
  airkick: {
    startup: 6, active: 999, recovery: 0,  // aktiv bis zur Landung
    dmg: 8, chip: 2, stun: 18, blockstun: 10, kb: 2.2,
    box: { x: 6, y: -36, w: 26, h: 14 },
    sfx: 'kick',
  },
  special: {
    startup: 14, active: 2, recovery: 24,  // "active" = Frame, in dem der Ball entsteht
    dmg: 0, chip: 0, stun: 0, blockstun: 0, kb: 0,
    box: null,
    sfx: 'fireball',
  },
};

DD.FIREBALL = { dmg: 8, chip: 2, stun: 20, blockstun: 12, kb: 2.4, w: 20, h: 14 };
