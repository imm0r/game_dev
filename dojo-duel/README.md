# DOJO DUEL

A retro pixel fighting game in the spirit of the early 90s — pure vanilla
JavaScript, no engine, no build step, no dependencies. The fighters and
stages are PNGs in `assets/`; everything else is code.

![Title screen](docs/screenshots/doc-title.png)

## Play

```bash
cd dojo-duel
python3 -m http.server 8000
# then open http://localhost:8000
```

Double-clicking `index.html` also works and needs nothing installed, but a
browser will not let a local page read the pixels of a local image — so
the fighters fall back to the generated placeholder art and you miss half
the point. Use the server.

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
| **Dash**   | *tap a direction twice* | same |

| Move | Input | What it does |
| ---- | ----- | ------------ |
| Straight punch | punch | fast, safe poke |
| High kick | kick | slower, hurts more |
| Crouching punch | down + punch | the fastest thing you have |
| **Sweep** | down + kick | slow, **must be blocked low**, knocks them down |
| Flying kick | jump + kick | your way in |
| Dash | tap forward or back twice | covers ground, but you cannot act during it |

That sweep is the whole reason to crouch. Blocking a low while standing
does not work — hold back **and** down, or you end up on the floor. On the
way down you are untouchable, so a knockdown resets the round rather than
starting a loop.

| Standing through it | Blocking it low |
| ------------------- | --------------- |
| ![Sweep](docs/screenshots/doc-sweep.png) | ![Low block](docs/screenshots/doc-lowblock.png) |

Chip damage on block is in, but (unlike the big classics) it cannot score
a K.O.

**Menu / general:** Enter = start/confirm · ↑↓ = pick mode ·
←→ = pick stage · P = pause · M = sound on/off

## What's already in

- **The roster**, drawn as sprite sheets and imported straight from
  `assets/` (see [Bring your own art](#bring-your-own-art)):
  - **KLAUS VÖLKER** (MMA, Germany): bare torso, black-and-gold trunks
    with a flag patch, MMA gloves, full beard. His special throws a
    **fireball**.
    ![Klaus frames](docs/screenshots/klaus-frames.png)
  - **ANTOINE MOREAU** (judo/GIGN, France): heavier, olive uniform with
    rolled-up sleeves, French flag patch on the shoulder, fingerless
    gloves, heavy boots, full beard. His special hurls a **grenade**.
    ![Antoine frames](docs/screenshots/antoine-frames.png)
  - **HANZO**, the karate fighter from the first prototype, remains as a
    bonus set (roster mapping is configurable in `js/constants.js`)

  Each sheet carries 20 poses; eighteen are on screen. The uppercut and
  each fighter's second special are drawn and imported, waiting for the
  motion inputs that will trigger them.
- **Single-player vs CPU** (the AI keeps its distance, blocks, dodges
  projectiles — and is deliberately beatable) plus **local two-player
  mode** on one keyboard
- **3 scrolling stages**, each an 832px-wide painted panorama from
  `assets/`, with a camera that follows the fighters:

  | Stage | Setting |
  | ----- | ------- |
  | TOKYO STREET | evening shopping street under the rail line |
  | WIND TEMPLE | mountain monastery |
  | NEON CROSSING | cyberpunk boulevard on a glass walkway |

  Behind each one sits a **procedural version drawn in code**, used
  whenever the panorama is missing. Those are built from real parallax
  layers (far/mid/near plus foreground silhouettes that pass IN FRONT of
  the fighters) and they animate: a train pulls in and the crowd cheers in
  Tokyo, prayer flags flutter and incense drifts at the temple, traffic
  streams below the glass floor in Neon Crossing. Delete a `stage-N.png`
  to see one.

- Health bars with red damage trails, a 99-second timer, best-of-3
  rounds, K.O. and time-over logic, victory pose
- Hit sparks, hitstop (a brief freeze on impact), screen shake on K.O. —
  the small things that make it feel "arcade"
- Synthesized chiptune sound effects (WebAudio, no audio files)
- A custom 3x5 pixel font, CRT scanline effect (removable in `style.css`)

![Tokyo Street](docs/screenshots/doc-stage1.png)
![Wind Temple](docs/screenshots/doc-stage2.png)
![Neon Crossing](docs/screenshots/doc-stage3.png)

## Bring your own art

Every fighter and every stage in the game is a PNG in
[`assets/`](assets/README.md). Drop one in, reload, done — there is no
import step, no atlas to rebuild, no metadata file to keep in sync.

- **A stage** is one wide panorama, `stage-1.png` … `stage-3.png`. It is
  scaled once to 180px height and becomes the scrolling world (up to 832px
  wide, about 2.6 screens).
- **A fighter** is one sheet with the poses laid out next to each other on
  a flat background, `klaus.png` / `antoine.png` / `hanzo.png`. The
  importer finds each pose as a connected shape — so the rows may even
  overlap, and a drawn grid around the poses is found and removed — keys
  the background out with a soft edge, lines every pose up on its feet and
  scales the sheet so the fighting stance comes out at the right height. A
  partial sheet is fine: whatever it leaves out keeps the generated art.

Pose order, the exact image requirements and a ready-made generator prompt
are in [`assets/README.md`](assets/README.md).

> Load the game from a local server when you use your own art. Opening
> `index.html` directly works, but a browser refuses to let the page read
> the pixels of an image loaded off disk, so the fighters silently fall
> back to the generated placeholders.

## Project structure

| File | Job |
| ---- | --- |
| `js/constants.js` | All tuning knobs: physics, attack frame data, damage, roster |
| `js/spritesheet.js` | **The fighters.** Imports the sprite sheets from `assets/` |
| `js/sprites.js` | Fallback pixel art: every frame a text grid, every character a pixel |
| `tools/rig.py` | Skeleton rig that generates those fallback frames |
| `js/font.js` | 3x5 pixel font |
| `js/stage.js` | The three procedural stages + panorama pipeline |
| `js/fighter.js` | Fighter state machine, hitboxes, hit logic, animation resolve |
| `js/ai.js` | CPU opponent (blocks lows low, sweeps, dashes in) |
| `js/game.js` | Round flow, camera, collisions, projectiles, particles |
| `js/input.js` | Keyboard (physical keys, QWERTZ-safe) |
| `js/audio.js` | Synthesized sound effects |
| `js/ui.js` | HUD, title screen, announcements |
| `js/main.js` | Fixed-step 60fps loop |

### How the fighters are drawn

Two ways, and the game does not care which a frame came from.

**Imported from a sheet** — what Klaus and Antoine use. `js/spritesheet.js`
labels the connected regions of `assets/<fighter>.png`, so a pose is found
as a shape rather than by cutting the image into strips; that is what lets
the sheets have several rows and lets those rows overlap. Each pose is then
cut out with only its own pixels, matted (see below), aligned on the middle
of its feet and scaled by one factor shared across the sheet, so a crouch
stays shorter than a stance. The reference for that factor is the fighting
stance, not the tallest frame — a special wrapped in flames is far taller
than the fighter, and measuring against it would shrink everybody.

Keying the background is the part that decides whether the result looks
bought or homemade, and it is three problems, not one.

*The soft edge.* A yes/no test on "is this pixel magenta" leaves a colored
rim wherever the art fades into the background. Instead each pixel within a
few steps of the background gets a **fractional** alpha, measured against
the solid artwork right next to it, and the key color is then mixed back
out of what survives — so a soft edge stays soft, and a black boot next to
magenta comes out black rather than purple.

*The grid.* Generators like to draw a frame around each pose, and a line
that touches two poses would fuse them into one region. A drawn line gives
itself away twice over: it vanishes when you erase everything thinner than
a limb, and it floats free of any body. Both tests together separate it
from the gold trim on a pair of trunks, which is every bit as thin but
never floats. Where a line was drawn *across* a figure, the slit it leaves
is painted over from the artwork on either side.

*The background is not one color.* The field itself is read as the most
common color in the sheet rather than off the corners, because a grid
drawn to the image edge puts its own color in every corner.

**Generated in code** — the fallback for a fighter with no sheet, and
Hanzo's whole bonus set. Every frame is a text grid, one character per
pixel:

```text
'.............KJHSSWESSAK..................',   ← face with eye
'.............KJHSJJJJJSK..................',   ← beard texture
```

`K` = outline, `S` = skin, `A/T/U` = skin light/shadow/deep, `H` = hair,
`D/G/g` = cloth, and so on (full legend at the top of `js/sprites.js`).
Those grids are themselves written by `tools/rig.py`: a pose there is a set
of joint positions — shoulder, elbow, hip, knee — and the rig rasterizes
limbs as tapered capsules with cylindrical shading, the torso as a width
profile with a real waist, and stamps every part with its own outline so
the silhouette stays readable.

```bash
python3 tools/rig.py             # rewrite the generated grids in sprites.js
python3 tools/rig.py --preview   # plus contact sheets in dist/
```

Adding a pose means adding a joint dictionary to `POSES` in the rig. You
can still edit the grids by hand — just note the next rig run overwrites
them. Each character's second color scheme is a palette swap in
`sprites.js`, and it applies to the generated art only: an imported sheet
brings its own colors.

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
node tools/build-single.mjs           # game only, ~250 KB
node tools/build-single.mjs --embed   # + every PNG in assets/ inlined
```

produces `dist/dojo-duel.html` — the whole game in one file, handy for
sharing or uploading (e.g. itch.io). `--embed` is the version that runs
anywhere, straight off disk, with the real art; it also weighs as much as
that art does (~14 MB today, a third of it panoramas nobody will ever see
at more than 832×180). Shrink the PNGs in `assets/` first if the file has
to travel.

## Tests

An automated smoke test (Playwright) boots the game headless, simulates
keyboard input and verifies hits, projectiles, jumping, K.O. and round
flow: see `tools/smoke-test.js`.

Pass a URL to test a served copy — that run also covers the sprite sheet
import, which a page opened off disk cannot do:

```bash
npm install playwright                            # once, anywhere
node tools/smoke-test.js                          # straight off disk
node tools/smoke-test.js http://localhost:8000/   # served, with the real art
```

`tools/moves-test.js` is the second suite. It drives the fighters' state
machine with scripted pads instead of keystrokes, so it can assert the
rules directly — that a sweep knocks down, that a standing block loses to
a low and a crouching one does not, that a downed fighter cannot be hit,
that a dash outruns a walk, and that every frame an animation asks for
actually exists.

```bash
node tools/moves-test.js
```

## Roadmap

The project grows in milestones — plan, decisions and status live in
[`ROADMAP.md`](ROADMAP.md).

## Legal

Inspired by the arcade classics of the 90s, but every name, sprite, stage
and sound is an original creation of this project. No third-party
material included.
