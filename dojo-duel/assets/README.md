# assets/ – your own artwork

Drop images in here and the game uses them instead of the built-in art.
No build step: save the file, reload the page.

| File | Replaces |
| ---- | -------- |
| `stage-1.png` … `stage-3.png` | the three stage backgrounds |
| `klaus.png`, `antoine.png`, `hanzo.png` | that fighter's animation frames |

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

## Fighter sprite sheets

A fighter sheet is **one image with the poses laid out next to each
other**. The importer (`js/spritesheet.js`) finds them, keys out the flat
background, lines every pose up on the same foot line and scales the whole
sheet by one factor, so a crouch really does stay shorter than a standing
pose.

`klaus.png` and `antoine.png` in this folder are real sheets, if you want
to see what one looks like before making your own.

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
survives. **Frame lines are fine too** — generators love to draw a grid or
a box around each pose, and those are found and removed, including where
one runs across a figure.

One thing genuinely does break: **artwork in the key color**. Pick a key
the character never wears. Magenta suits Antoine's olive uniform; it does
not suit an effect drawn in hot pink, because nothing can tell that apart
from the background. If the character or the effects are pink, key on
green instead — and if they are green, key on magenta.

### Pose order

Frames are taken **in the order they appear**:

| # | Pose | Used for | # | Pose | Used for |
| - | ---- | -------- | - | ---- | -------- |
| 1 | fighting stance | idle | 11 | special (throwing motion) | special |
| 2 | staggering stance | idle | 12 | special A | — |
| 3 | walking step | walk | 13 | special B | — |
| 4 | running step | — | 14 | jump, knees tucked | jump |
| 5 | straight punch | punch | 15 | crouch block | crouch |
| 6 | uppercut | — | 16 | block, arms raised | block |
| 7 | crouching punch | — | 17 | recoil, head thrown back | hit |
| 8 | standing high kick | kick | 18 | knocked down by a low kick | K.O. fall |
| 9 | crouching low kick | — | 19 | victory pose | win |
| 10 | jumping kick | air kick | 20 | knocked out, on the ground | K.O. |

The poses marked "—" are drawn and imported but no move uses them yet:
the uppercut, the crouching attacks and the second special are waiting for
the moves themselves, and the running stride belongs to a dash the game
does not have. Dropping a running frame into a walk cycle reads as a
stumble, so it stays out until there is a run to put it in.

A **shorter sheet is fine.** Whatever it does not cover keeps the
generated placeholder art, and several poses are reused automatically. A
sheet with just the first handful of poses already replaces most of what
you see in a fight.

If your generator hands you the poses in a different order — or hands you
more of them, which is a good problem to have — write the real order down
in `SHEET_ORDER` in `js/spritesheet.js` instead of regenerating the image.
Klaus draws "walking steps" as two frames, for instance, so his sheet has
21 figures for these 20 poses and his `SHEET_ORDER` says so.

### Prompt to generate one

Paste this into your image generator, swapping in the character
description:

> A pixel art sprite sheet of a single character in **20 poses**, side
> view, all facing right, laid out in rows and read left to right. Flat
> solid magenta background (#FF00FF), no scenery, no ground shadow, no
> text or labels. Every pose shows the **same character at the same
> size**, standing on the same invisible ground line, with clear empty
> space between poses and a margin below the feet. Poses in this exact
> order: 1 fighting stance, 2 staggering stance, 3 walking step,
> 4 running step, 5 straight punch with the arm fully extended,
> 6 uppercut punch, 7 crouching punch, 8 standing high kick with the leg
> extended forward, 9 crouching low kick, 10 jumping kick, 11 special
> attack, a throwing motion with an effect, 12 special attack A with an
> effect, 13 special attack B with an effect, 14 jumping with knees
> tucked up, 15 blocking while crouching, 16 blocking with both arms
> raised, 17 recoiling from a hit with the head thrown back, 18 knocked
> down by a low kick, 19 victory pose with both fists raised, 20 knocked
> out, lying on the ground. Effects must not use magenta or pink.
> Character: **[your description here]**.

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
frame-line color it found.
