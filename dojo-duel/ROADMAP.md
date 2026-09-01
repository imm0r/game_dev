# Dojo Duel – Roadmap

This project grows over weeks, milestone by milestone. The project owner
acts as creative director (references, feedback, priorities), Claude
implements. Every milestone ends in a playable build.

## Decisions taken

- **Stages:** The generated panorama references are used directly as
  scrolling backgrounds (`assets/stage-N.png`); the procedural code
  stages remain as fallback and for extra layers.
- **Character art:** Hybrid workflow. The project owner provides
  reference sheets, Claude turns them into editable text-grid sprites
  and animates them. Target quality is the hand-pixeled "test pixel"
  tier; animations aim for "fluid modern" (4-6 frames per action),
  delivered package by package.
- **Roster so far:** KLAUS VÖLKER (MMA, Germany — heterochromia: blue
  eye from the right, brown from the left) and ANTOINE MOREAU
  (judo/GIGN, France — throws grenades). The karate prototype HANZO
  stays in the code as a bonus set.
- **Language:** The entire repository is English — the project takes
  part in an international game-dev community.

## Milestones

### M1 – Camera & real stages  *(done)*
- [x] Camera system: scrolling arenas, soft follow, title pan
- [x] All three code stages rebuilt on parallax layers (far/mid/near/front)
- [x] Foreground silhouettes (utility poles, holo banners, prayer flags)
- [x] Panorama pipeline: `assets/stage-N.png` becomes a scrolling world
- [x] Original panoramas uploaded and integrated (flicker-free prerender,
      world cap 832px, `--embed` build option)

### M2 – Character art upgrade  *(in progress)*

**Package 1 (delivered): Klaus v2**
- [x] New animation system: frame sequences, phase frames for attacks,
      velocity-based jump frames, per-character pixel density
- [x] Klaus fully redrawn: 42x68 at 1x density, 20 colors, anatomy
      shading, beard texture, tattoo, flag patch — 20 frames
- [x] 4-frame walk cycle, 4-phase breathing idle, attacks with
      wind-up/hit/recover, new energy projectile
- [x] Default match temporarily runs as a Klaus mirror (gold vs. crimson)

**Package 2 (next): Antoine v2**
- [ ] Antoine at the same quality tier (uniform, full beard, scar, boots)
- [ ] Grenade projectile in the new style, then roster back to
      Klaus vs. Antoine

**Package 3: fleshing out**
- [ ] Walk cycle to 6 frames, idle to 4 real poses
- [ ] Attacks to 4-5 phases (impact frames, follow-through)
- [ ] Extended hit reactions (2 levels), scar/detail pass per reference

### M3 – Effects & game feel
- [ ] Super flash, slow-motion K.O., motion trails, landing dust
- [ ] Animated hit-spark sprites instead of particle squares
- [ ] Stage reactions (crowd cheers on K.O.), victory splash with portrait

### M4 – Fighting depth
- [ ] Special-move inputs (e.g. quarter-circle + punch)
- [ ] Antoine's judo throw as a grab mechanic, grenade arc trajectory
- [ ] 2-3 specials per character, combos, super meter

### M5 – Third character
- [ ] Based on the project owner's next reference sheet

### M6 – Sound & music
- [ ] Chiptune tracks per stage (WebAudio sequencer), more SFX variants

### M7 – Release polish
- [ ] Character select screen, arcade mode (opponent ladder)
- [ ] Gamepad support, itch.io build
