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
- no text, labels, frames or borders in the image
- pixel art, roughly 200–400px tall per pose is plenty

Poses may sit at different heights — the importer aligns them by their
feet. Soft, anti-aliased edges are fine: the background is removed with a
fractional alpha and the key color is mixed back out, so no magenta rim
survives.

### Pose order

Frames are taken **in the order they appear**, mapped to:

| # | Pose | # | Pose |
| - | ---- | - | ---- |
| 1 | idle / fighting stance | 6 | jump (knees tucked) |
| 2 | walking step | 7 | crouch |
| 3 | punch, arm extended | 8 | block / guard |
| 4 | kick, leg extended | 9 | hit reaction (head back) |
| 5 | special (throw / thrust) | 10 | victory pose |

A **shorter sheet is fine.** Whatever it does not cover keeps the
generated placeholder art, and a few poses are reused automatically (the
walk borrows from the walking step, the K.O. is the hit reaction tipped
onto its back). So a sheet with just the first three or four poses already
replaces most of what you see in a fight.

If your generator hands you the poses in a different order — or hands you
more of them, which is a good problem to have — write the real order down
in `SHEET_ORDER` in `js/spritesheet.js` instead of regenerating the image.
That is what Klaus and Antoine do: both came back with 14 and 12 poses in
two rows, in an order of the generator's own choosing, and the extra
stances went into the walk cycle.

### Prompt to generate one

Paste this into your image generator, swapping in the character
description:

> A pixel art sprite sheet of a single character in **10 poses in one
> horizontal row**, side view, all facing right. Flat solid magenta
> background (#FF00FF), no scenery, no ground shadow, no text or labels.
> Every pose shows the **same character at the same size**, standing on
> the same invisible ground line, with clear empty space between poses.
> Poses in this exact order: 1 fighting stance, 2 walking step, 3 straight
> punch with the arm fully extended, 4 kick with the leg extended forward,
> 5 special attack (throwing motion), 6 jumping with knees tucked up,
> 7 crouching low, 8 blocking with both arms raised, 9 recoiling from a
> hit with the head thrown back, 10 victory pose with one fist raised.
> Character: **[your description here]**.

Generators often drift after a handful of figures, so if the later poses
stop matching, generate **two sheets of five poses** instead and upload
the better one first — the missing poses simply keep the placeholder until
you add them.

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
mapped onto the pose list.
