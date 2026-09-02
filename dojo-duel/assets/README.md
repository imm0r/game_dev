# assets/ – your own artwork

Drop images in here and the game uses them instead of the built-in art.
No build step: save the file, reload the page.

| File | Replaces |
| ---- | -------- |
| `stage-1.png` … `stage-3.png` | the three stage backgrounds |
| `klaus.png`, `antoine.png`, `maxim.png` | that fighter's animation frames |
| `portraits.png` | the faces on the character select screen |

**Uploading via the GitHub website:** open the repository → pick the
branch → browse into `dojo-duel/assets/` → "Add file" → "Upload files" →
drag the PNGs in (using exactly the file names above) → commit.

---

## Stage panoramas

On load each image is downscaled once (with smoothing) to 180px height.
The world width follows from the image width, capped at 832px (~2.6 screen
widths); wider panoramas are cropped to the center. The fighting foot line
sits at y = 158 of 180 — panoramas whose ground occupies the lower third
of the image work best. For the single-file build,
`node tools/build-single.mjs --embed` inlines the panoramas as well.

---

## Character select portraits

`portraits.png` is one image with the roster's faces **side by side, in the
same order as the fighters in `js/constants.js`** — today Klaus, Antoine,
Maxim. The select screen splits it into that many equal columns, so the
faces have to be evenly spaced and the image should contain nothing else:
no frames, no names, no header. The screen draws those itself, which is
also why a generator inventing names for your fighters does no harm.

A portrait keeps whatever background it was painted with — unlike a fighter
sheet, nothing is keyed out. Each column is scaled down once, smoothly, to
fit a 72x98 panel, so anything from roughly 300x400 per face upwards is
plenty. Portrait orientation reads best; a square one works and simply
leaves more air above and below.

No file, no problem: each panel falls back to that fighter's own victory
pose until the art shows up.

> A pixel art character select sheet: **three portraits side by side**,
> evenly spaced, each one head-and-shoulders facing the viewer. No frames,
> no borders, no text, no names, no logo — the portraits only. Each face
> fills its own share of the image at the same size. Left to right:
> **[fighter 1]**, **[fighter 2]**, **[fighter 3]**.

---

## Fighter sprite sheets

A fighter sheet is **one image with the poses laid out next to each
other**. The importer (`js/spritesheet.js`) finds them, keys out the flat
background, lines every pose up on the same foot line and scales the whole
sheet by one factor, so a crouch really does stay shorter than a standing
pose.

`klaus.png`, `antoine.png` and `maxim.png` in this folder are real sheets,
if you want to see what one looks like before making your own. No two of
them came back from the generator laid out quite the same way, which is
what `SHEET_ORDER` is for.

### What the image has to look like

- **poses in one or more rows**, read left to right, top to bottom. Rows
  may even overlap a little — the importer finds each pose as a connected
  shape rather than by slicing the image into strips
- **a flat single-color background**, ideally magenta `#FF00FF` — no
  scenery, no gradient, and **no cast shadow on the ground** (a shadow
  touching the feet is treated as part of the character)
- **the same character at the same scale** in every pose, seen from the
  side, **facing right**
- no text or labels
- pixel art, roughly 200–400px tall per pose is plenty

Poses may sit at different heights — the importer aligns them by their
feet. Soft, anti-aliased edges are fine: the background is removed with a
fractional alpha and the key color is mixed back out, so no magenta rim
survives. **Frame lines are fine too** — generators love to draw a box
around each pose, or a ground line under each row, and both are found and
removed, including where one runs across a figure. Boxes are recognised by
colour; a ground line the figures stand on is recognised by shape, since a
dark rule and a dark outline can be the same colour.

**The background does not have to be magenta.** Whatever color fills most
of the image is taken as the key, so a white or grey sheet works as well as
a magenta one — the generator picking its own background is not a problem.

The key color may even appear *inside* the drawing: only key-colored pixels
the background can actually reach are removed, so the white of a flag patch
survives on a white sheet, and so does the white core of a flame.

What still breaks is the key color **touching the outline** — an effect
drawn in the same color as the background, running off the edge of the
figure into it. Nothing can tell those apart, and a pose whose effect is
drawn in the field colour is a pose that has to be dropped. So: keep the
effects a different color from the background, and it does not matter much
which color that is.

The same limit has a quieter form. A sprite that is *itself* close to the
background colour cannot be separated from it either — a pale fireball orb
on a white field is background as far as any keying is concerned. It is
only worth knowing about if a generator hands you a light sheet: give the
effects some contrast against it.

### Pose order

Frames are taken **in the order they appear**:

| # | Pose | Used for | # | Pose | Used for |
| - | ---- | -------- | - | ---- | -------- |
| 1 | fighting stance | idle | 13 | special B, an effect on its own | the projectile |
| 2 | staggering stance | idle | 14 | jump, knees tucked | jump |
| 3 | walking step | walk | 15 | crouch | crouch |
| 4 | running step | dash | 16 | block, arms raised | block |
| 5 | straight punch | punch | 17 | recoil, head thrown back | hit |
| 6 | uppercut | uppercut | 18 | knocked down by a low kick | K.O. fall |
| 7 | crouching punch | crouching punch | 19 | victory pose | win |
| 8 | standing high kick | kick | 20 | knocked out, on the ground | K.O. |
| 9 | crouching low kick | sweep | 21 | reaching forward, hands open | grab |
| 10 | jumping kick | air kick | 22 | hoisting overhead | lift |
| 11 | special, a throwing motion | special | 23 | hurling down past the hip | slam |
| 12 | special A, wreathed in an effect | rushing special | | | |

Every one of those is on screen. Pose 13 is the odd one: ask for the
**effect by itself**, with no character in the picture, and the importer
finds it as a pose like any other — that gives the projectile drawn art
instead of a grid typed out in code. If the generator insists on drawing
the effect in the character's hand instead, no harm done: the projectile
falls back to the code grid.

A **shorter sheet is fine.** Whatever it does not cover keeps the
generated placeholder art, and several poses are reused automatically — a
kneeling guard falls back to the plain crouch, a second punch to the
first. A sheet with just the first handful of poses already replaces most
of what you see in a fight.

If your generator hands you the poses in a different order — or hands you
more of them, which is a good problem to have — write the real order down
in `SHEET_ORDER` in `js/spritesheet.js` instead of regenerating the image.
None of the three shipped sheets came back in exactly this order, and all
three are used as they are. `null` in that list drops a frame the game has
no use for.

### Prompt to generate one

Paste this into your image generator, swapping in the character
description:

> A pixel art sprite sheet of a single character in **23 poses**, side
> view, all facing right, laid out in rows and read left to right. Flat
> solid magenta background (#FF00FF), no scenery, no ground shadow, no
> text or labels. Every pose shows the **same character at the same
> size**, standing on the same invisible ground line, with clear empty
> space between poses and a margin below the feet. Poses in this exact
> order: 1 fighting stance, 2 staggering stance, 3 walking step,
> 4 running step, 5 straight punch with the arm fully extended,
> 6 uppercut punch, 7 crouching punch, 8 standing high kick with the leg
> extended forward, 9 crouching low kick, 10 jumping kick, 11 special
> attack, a throwing motion with an effect, 12 special attack, the whole
> body wreathed in the effect, 13 the effect on its own with no character
> in the picture, 14 jumping with knees tucked up, 15 crouching,
> 16 blocking with both arms raised, 17 recoiling from a hit with the
> head thrown back, 18 knocked down by a low kick, 19 victory pose with
> both fists raised, 20 knocked out, lying on the ground, 21 reaching
> forward with both arms out at chest height, hands open, as if about to
> take hold of a heavy sack, 22 standing upright with both arms raised
> over one shoulder, as if hoisting a heavy sack, 23 twisting hard at the
> waist with both arms swung down past the hip, as if hurling a heavy
> sack at the ground. Effects must not use magenta or pink.
> Character: **[your description here]**.

### Poses that need two people

A generator asked for a "throw" will draw two characters, every time, and
arguing with it does not help: a throw is two people, so it draws two
people. The way round it is to never name the interaction. Ask for the
**gesture**, against an invisible object — poses 21 to 23 in the prompt
above are written that way, and that is the only reason they come back
with one figure in them.

Same trick for anything else that implies a partner. Describe the body,
not the fight.

A two-character image is not useless, but it is only usable for a mirror
match — the game draws each fighter on its own, and a picture of Antoine
throwing Antoine puts the wrong man on the floor. If one slips through,
put `null` in that slot in `SHEET_ORDER` and the frame is dropped;
Maxim's sheet has exactly one.

Generators drift, so check what came back before wiring it up — count the
figures, and make sure the later poses still look like the same person. If
they do not, generate the sheet in two halves and note the real order in
`SHEET_ORDER`; whatever is missing simply keeps the placeholder art.

### Checking the result

Open the game **over a local server**, not by double-clicking the file: a
browser will not let a page read the pixels of an image loaded straight
off disk, and the import quietly falls back to the placeholder art.

```bash
cd dojo-duel
python3 -m http.server 8000
```

The importer then logs `[dojo] klaus: N frames from sprite sheet` in the
browser console. If nothing is logged, the file name or path is off; if
the character looks cut off, the background is probably not flat enough
(raise the contrast between character and background, or use pure
magenta). To see which pose the importer thinks is which, run

```js
DD.spritesheet.inspect('assets/klaus.png').then((f) => f.forEach((c) => document.body.append(c)))
```

in the console — it returns the frames as canvases, in the order they are
mapped onto the pose list. `DD.spritesheet.keysOf('assets/klaus.png')`
reports what it decided is background: the flat field first, then every
frame-line color it found. Setting `DD.spritesheet.verbose = true` before
either call also logs any ground rule it strips, with the row or column it
found it on.
