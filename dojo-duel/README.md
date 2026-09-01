# DOJO DUEL

A retro pixel fighting game in the spirit of the early 90s — pure vanilla
JavaScript, no engine, no build step, no external assets. Open `index.html`
in a browser and fight.

![Title screen](docs/screenshots/doc-title.png)

## Play

**Easiest way:** double-click `index.html` — it runs straight in the browser.

Or with a local server (recommended if your browser blocks local files and
you use custom stage images in `assets/`):

```bash
cd dojo-duel
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Action     | Player 1 | Player 2 |
| ---------- | -------- | -------- |
| Move       | A / D    | ← / →    |
| Jump       | W        | ↑        |
| Crouch     | S        | ↓        |
| Punch      | F        | K        |
| Kick       | G        | L        |
| Special    | H        | J        |
| **Block**  | *hold back while the opponent attacks* | same |

Jump + kick = flying kick. Chip damage on block is in, but (unlike the
big classics) it cannot score a K.O.

**Menu / general:** Enter = start/confirm · ↑↓ = pick mode ·
←→ = pick stage · P = pause · M = sound on/off

## What's already in

- **The roster** (based on the project owner's character reference sheets,
  built with a hybrid workflow — reference sheet in, grid sprite out):
  - **KLAUS VÖLKER** (MMA, Germany) — since M2 in the **new sprite
    generation**: 42x68 pixels at 1x density, 20 colors with real
    light/shadow modelling, beard texture, tattoo, flag patch, a 4-frame
    walk cycle, breathing idle and attack phases (wind-up/hit/recover).
    Plus heterochromia: from the right you see his blue eye, from the
    left his brown one.
    ![Klaus frames](docs/screenshots/klaus-frames.png)
  - **ANTOINE MOREAU** (judo/GIGN, France) — also on the **new sprite
    generation** since M2: 44x68 at 1x density, bulky build, olive
    uniform with rolled-up sleeves, chest pockets, French flag patch,
    fingerless gloves, heavy boots, a massive full beard and the scar
    across his right brow. His special winds up and hurls a **grenade**.
    ![Antoine frames](docs/screenshots/antoine-frames.png)
  - **HANZO**, the karate fighter from the first prototype, remains as a
    bonus set (roster mapping is configurable in `js/constants.js`)
- **Single-player vs CPU** (the AI keeps its distance, blocks, dodges
  projectiles — and is deliberately beatable) plus **local two-player
  mode** on one keyboard
- **3 scrolling stages** based on the project owner's reference panoramas:
  640px arenas, a camera that follows the fighters, and real parallax
  layers (far/mid/near plus foreground silhouettes passing IN FRONT of
  the fighters), all with animated details:

  | Stage | Homage | Animations |
  | ----- | ------ | ---------- |
  | TOKYO STREET | evening shopping street | passing train, cheering crowd, neon flicker, tower beacon |
  | NEON CROSSING | cyberpunk boulevard | traffic below the glass floor, monorail, drone, pulsing billboards, mech eyes |
  | WIND TEMPLE | mountain monastery | fluttering prayer flags, incense, swaying monks |

- Health bars with red damage trails, a 99-second timer, best-of-3
  rounds, K.O. and time-over logic, victory pose
- Hit sparks, hitstop (a brief freeze on impact), screen shake on K.O. —
  the small things that make it feel "arcade"
- Synthesized chiptune sound effects (WebAudio, no audio files)
- A custom 3x5 pixel font, CRT scanline effect (removable in `style.css`)

![Tokyo Street](docs/screenshots/doc-stage1.png)
![Neon Crossing](docs/screenshots/doc-stage2.png)
![Wind Temple](docs/screenshots/doc-stage3.png)

## Custom stage panoramas

The three stages are drawn procedurally in code — meant as placeholders
for the original panoramas: drop them in as `assets/stage-1.png` through
`stage-3.png` and they are automatically used as a **scrolling world**
(scaled to 180px height, world width up to 832px from the image width).
Details and upload guide: [`assets/README.md`](assets/README.md).

## Project structure

| File | Job |
| ---- | --- |
| `js/constants.js` | All tuning knobs: physics, attack frame data, damage, roster |
| `js/sprites.js` | **The pixel art.** Every frame is a text grid, every character a pixel |
| `js/font.js` | 3x5 pixel font |
| `js/stage.js` | The three procedural stages + panorama pipeline |
| `js/fighter.js` | Fighter state machine, hitboxes, hit logic, animation resolve |
| `js/ai.js` | CPU opponent |
| `js/game.js` | Round flow, camera, collisions, projectiles, particles |
| `js/input.js` | Keyboard (physical keys, QWERTZ-safe) |
| `js/audio.js` | Synthesized sound effects |
| `js/ui.js` | HUD, title screen, announcements |
| `js/main.js` | Fixed-step 60fps loop |

### Editing sprites — it's this simple

A frame in `js/sprites.js` looks like this (excerpt):

```text
'.............KJHSSWESSAK..................',   ← face with eye
'.............KJHSJJJJJSK..................',   ← beard texture
```

`K` = outline, `S` = skin, `H` = hair, `A/T/U` = skin light/shadow/deep,
and so on (full legend at the top of the file). Change characters, reload
the page, done. Each character's second color scheme comes from the
palette in the same file.

### Balancing

All attacks live as frame data in `js/constants.js`:

```js
punch: { startup: 5, active: 4, recovery: 10, dmg: 6, ... }
```

`startup` = wind-up frames, `active` = hit-window frames, `recovery` =
cool-down frames (at 60 frames per second). Turn these knobs to balance
the game.

## Single-file build

```bash
node tools/build-single.mjs           # game only
node tools/build-single.mjs --embed   # game + stage panoramas inlined
```

produces `dist/dojo-duel.html` — the whole game in one file, handy for
sharing or uploading (e.g. itch.io).

## Tests

An automated smoke test (Playwright) boots the game headless, simulates
keyboard input and verifies hits, projectiles, jumping, K.O. and round
flow: see `tools/smoke-test.js`.

```bash
npm install playwright   # once, anywhere outside the repo is fine
node tools/smoke-test.js
```

## Roadmap

The project grows in milestones — plan, decisions and status live in
[`ROADMAP.md`](ROADMAP.md).

## Legal

Inspired by the arcade classics of the 90s, but every name, sprite, stage
and sound is an original creation of this project. No third-party
material included.
