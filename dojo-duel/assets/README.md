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

One image per fighter, `portrait-klaus.png` / `portrait-antoine.png` /
`portrait-maxim.png` — the file name is the character's key in
`js/constants.js`, so a new fighter's portrait needs no code change.

Paint them on the same flat background as the sprite sheets (magenta
`#FF00FF` or whatever the generator picks; the same key finds it either
way). The field is keyed out and the picture cropped to what is left, then
scaled to **fill** a 72x98 panel — what is over is cropped off the sides
and the bottom, so frame on the face and let the belt go. Anything from
roughly 300x400 upwards is plenty.

There is no need to draw a frame, a name or a label. The screen draws all
of that itself, from the roster — which is also why a generator inventing
names for your fighters does no harm.

The victory splash uses the same picture, at a larger size.

No file, no problem: both fall back to the fighter's own victory pose
until the art shows up.

> A pixel art character portrait, head and upper body, facing the viewer,
> on a flat solid magenta background (#FF00FF). No frame, no border, no
> text, no name, no logo — the character only. Character: **[your
> description here]**.

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

### Prompts for the animation strips

One pose per movement is a switch, not an animation. A strip gives a
movement its in-between steps, and the game plays them across the frames
the move already lasts.

**One strip per image, not one image per pose.** Within a single image the
generator holds the character together; across separate generations it
drifts — proportions wander, a beard grows, Maxim's bottle changes hands.

Two rules come out of how the importer works, and both matter:

- **Pose 1 is always the neutral fighting stance.** The importer scales a
  whole sheet by one factor measured from the stance. A strip without one
  has nothing to measure against and lands in the game at the wrong size.
- **The character must not travel across the strip.** Frames are aligned
  on the middle of the feet, so a foot that wanders makes the fighter
  slide sideways as the animation plays. For an attack, the supporting
  foot stays planted; for a walk cycle, the hips stay put and the legs
  alternate around them.

The skeleton, with the movement and the anchor rule swapped in:

> A pixel art animation strip of a single character in **[N] poses in one
> row**, side view, all facing right, read left to right. Flat solid
> magenta background (#FF00FF), no scenery, no ground shadow, no text or
> labels. Every pose shows the **same character at the same size**,
> standing on the same invisible ground line, with clear empty space
> between poses and a margin below the feet. **Pose 1 is the neutral
> fighting stance.** Poses 2-[N] are **one single movement broken into
> even in-between steps**: [MOVEMENT]. [ANCHOR]. Effects must not use
> magenta or pink. Character: **[description]**.

#### Walk — 5 poses

The one to try first: the game already has a four-key walk cycle waiting
for it, so it needs no code change at all, only the file.

> ...**5 poses in one row**... Poses 2-5 are one walk cycle broken into
> four even steps, seen from the side: 2 the near leg forward and planted
> with the weight on it, the far leg trailing behind; 3 both legs passing
> under the body, the rear leg swinging through; 4 the far leg forward and
> planted, the near leg trailing behind; 5 both legs passing under the
> body again, the other leg swinging through. The arms swing opposite the
> legs. **The character does not travel across the strip: the hips stay at
> the same horizontal position in every pose and the legs alternate around
> them.**

#### Idle — 4 poses

> ...**4 poses in one row**... Poses 2-4 continue a slow breathing loop
> that returns to pose 1: 2 the chest rising and the guard lifting
> slightly; 3 the top of the breath, shoulders at their highest; 4 the
> chest settling back down. The feet do not move at all.

#### Straight punch — 6 poses

Five drawings of movement, and they are not worth the same: the game holds
the contact frame through the whole hit window and spreads the rest over
the wind-up and the recovery.

> ...**6 poses in one row**... Poses 2-6 are one straight punch broken
> into five even steps: 2 winding up, the punching fist drawn back to the
> hip and the shoulder turning away; 3 the fist starting forward, the
> shoulder coming round; 4 the arm fully extended at maximum reach, the
> body committed behind it; 5 the arm bending back halfway; 6 returning
> towards the guard. **The character does not travel: the supporting foot
> stays in exactly the same place in every pose and only the upper body
> and the punching arm move.**

#### High kick — 6 poses

> ...**6 poses in one row**... Poses 2-6 are one standing high kick broken
> into five even steps: 2 the weight shifting onto the standing leg, the
> kicking knee lifting; 3 the knee chambered high, the shin still folded;
> 4 the leg fully extended forward at head height, the body leaning back
> to counterbalance; 5 the shin folding back in; 6 the foot coming down
> towards the floor. **The standing foot stays in exactly the same place
> in every pose.**

#### Jump — 4 poses

The jump reads vertical speed rather than time, so it needs only three
drawings and gets them however long the arc lasts.

> ...**4 poses in one row**... Poses 2-4 are one jump: 2 rising, knees
> tucked up and arms drawn in; 3 the top of the arc, the body at its most
> compact; 4 falling, the legs reaching down for the ground.

### One sheet for every movement

A strip per movement means a generation per movement, and the character
drifts between them. Asking for **all the movements in one image** costs
one generation and gets one look: 24 figures in six rows is the same
order of magnitude as the 23-pose sheets that came back clean.

It does not make the drift go away — it moves it. What the moves sheet
covers becomes internally consistent, and what is left on the main sheet
(the special, the throw, the victory pose, the K.O.) is what you see for a
moment rather than all match long.

**Do not ask for rows.** The importer has no idea what a row is: it finds
each pose as a connected shape and reads them left to right, top to
bottom, so a generator that packs two movements into one line and none
into the next has changed nothing that matters. Asking for a row layout
only adds an instruction it can fail. Ask for **one numbered sequence**
and let it fall where it falls.

What does matter for the reading order is that every figure **stands on
the same invisible ground line**. A figure floating well above its
neighbours can sort into the row above and land in the wrong place in the
sequence, and that is worth insisting on.

**Name the colours, and name what the character is holding.** This is the
cheap lever and it is worth more than any wording about consistency.
Klaus's first walk strip came back in gold trunks because "black-and-gold
trunks" does not say which is which; write "black trunks with a gold
waistband and a gold side stripe" and the question never comes up. The
same goes for anything the character never puts down - Maxim has a bottle
in his fist in every pose on his main sheet, and a moveset generated
without "always holding a bottle in one hand" came back empty-handed and
in a different jacket.

> A pixel art sprite sheet of a single character in **21 poses**, side
> view, all figures facing right, on a flat solid magenta background
> (#FF00FF). No scenery, no ground shadow, no text, no labels. **Every
> figure is the same character at the same size and in the same
> colours**, and every figure **stands on the same invisible ground
> line**. Lay them out in reading order, left to right and top to bottom,
> over as many lines as they need, with clear empty space between them.
>
> The 21 poses are five movements, each **broken into even in-between
> steps**. Within a movement the character **does not travel**: the
> supporting foot stays in exactly the same place.
>
> **Idle, 1-4:** 1 the neutral fighting stance, guard up; 2 the chest
> rising and the guard lifting slightly; 3 the top of the breath,
> shoulders at their highest; 4 the chest settling back down. The feet do
> not move at all.
>
> **Walk, 5-8:** 5 the near leg forward and planted with the weight on it,
> the far leg trailing; 6 both legs passing under the body; 7 the far leg
> forward and planted, the near leg trailing; 8 both legs passing under
> the body again. The hips stay at the same horizontal position in all
> four.
>
> **Straight punch, 9-13:** 9 winding up, the punching fist drawn back to
> the hip and the shoulder turning away; 10 the fist starting forward;
> 11 the arm fully extended at maximum reach, the body committed behind
> it; 12 the arm bending back halfway; 13 returning to the guard.
>
> **High kick, 14-18:** 14 the weight shifting onto the standing leg, the
> kicking knee lifting; 15 the knee chambered high, the shin still folded;
> 16 the leg fully extended forward at head height, the body leaning back
> to counterbalance; 17 the shin folding back in; 18 the foot coming down
> towards the floor.
>
> **Hit reaction, 19-21:** 19 the head snapping back from a blow to the
> face; 20 the deepest point of the recoil, the body folded away from it;
> 21 straightening up again.
>
> Character: **[your description here, colours named]**.

Save it as `<fighter>-moves.png`. Pose 1 is both the idle stance and the
figure the whole sheet is scaled by; save the airborne one as
`<fighter>-jump.png`.

Its pose 1 is a stance for the same reason and is **only measured, never
installed** - `@anchor` in the order says so. It has to be there: a sheet
is scaled so its stance comes out 66 game pixels tall, and a jump pose
with the knees tucked is shorter than a stance, so measuring against one
would bring the whole jump in oversized.

**What makes an air attack read as one** is the leg that is *not*
attacking. Folded up under the body, the figure is flying; reaching back
and down, it is running, and the same drawing stops reading as airborne at
all. Antoine's and Maxim's `air0` on their main sheets have it right and
are worth pointing a generator at. Klaus's `air0` is not a kick at all -
it is a flying punch, and a good one.

**The jump is not on this sheet, and cannot be.** Every other figure
stands on the same ground line - that is what keeps the reading order
unambiguous - and a jump is off the ground by definition. Asked for both
at once, the generator drops the one it cannot reconcile, which is exactly
what happened the first time. It gets its own image, with the ground line
rule replaced:

It carries the two air attacks as well, because they are in the air for
the same reason and belong in the same generation:

> A pixel art sprite sheet of a single character in **10 poses**, side
> view, all facing right, on a flat solid magenta background (#FF00FF).
> No scenery, no ground shadow, no text, no labels. **Every figure is the
> same character at the same size and in the same colours.** Lay them out
> in reading order, left to right and top to bottom.
>
> Pose 1 stands on the ground. **Poses 2-10 are all in the air, drawn at
> the same height in the picture, none of them touching the ground.**
>
> **Stance, 1:** the neutral fighting stance, guard up, standing.
>
> **Jump, 2-4:** 2 rising, knees tucked up and arms drawn in; 3 the top of
> the arc, the body at its most compact; 4 falling, the legs reaching down
> for the ground.
>
> **Jumping punch, 5-7:** falling forward and punching **downwards and
> forwards** at someone below, **both legs folded up under the body**.
> 5 the fist drawn back and the shoulder cocked; 6 the arm fully extended
> down and forward at maximum reach, angled below horizontal; 7 the arm
> folding back in.
>
> **Jumping kick, 8-10:** falling forward and kicking **downwards and
> forwards** at someone below. In all three the **non-kicking leg is
> folded up underneath the body, knee tucked toward the chest - never
> trailing out behind** - and the body leans slightly forward over the
> kick with the arms held in a guard. 8 the kicking knee chambered up
> against the chest, foot not yet out; 9 the kicking leg fully extended
> down and forward at maximum reach, angled below horizontal; 10 the shin
> folding back in, **the knee still raised**.
>
> Character: **[your description here, colours named]**.

**No text, no labels, no numbers.** A generator that helpfully numbers the
figures has put ten more shapes on the sheet, and the importer finds poses
by shape - it has no way to know a "3" is not a pose.

Check the **count per movement** rather than the layout. If a movement
comes back with a figure more or less than asked, everything after it
shifts by that much - which `SHEET_ORDER` absorbs in one line, but only
once somebody has noticed.

---

Save each single-movement strip as `<fighter>-<move>.png` — `klaus-walk.png`,
`maxim-punch.png` — and add one line to `STRIPS` in `js/spritesheet.js`
naming the poses it fills. It is loaded beside that fighter's main sheet,
and a pose on a strip wins over the same pose on the sheet whichever image
the browser happens to finish first.

**Keep a strip looking like the sheet.** This is the part that bites. A
strip is a separate generation, so the character drifts between it and the
main sheet — Klaus's first walk strip came back in gold shorts where his
sheet has black ones, which flips his colours the moment he takes a step.
Feed the existing sheet in as a reference image if your generator takes
one, and check the strip against it before wiring it up: **colours,
build, and any marking** — a tattoo that only exists on the strip appears
and vanishes with the movement.

**What the importer does about a cast shadow.** It removes it, however
firmly the prompt asked for none. A shadow is the background colour with
the light taken out of it — same colour, darker — and nothing in a drawing
is that by coincidence. It has to go, because a shadow bridges the two
feet and walls the field in between the legs, and walled-in field survives
into the sprite as a magenta wedge between the knees. The same rule draws
a line under how much a pocket has to be sealed by: a gap between an arm
and a chest is closed by the few pixels where they touch, and that is
background showing through, not artwork.

The rule that keeps a walled-in patch of the key colour — the white of a
flag patch on a white sheet — now has two exceptions, both of them shapes
nobody draws on purpose. A **speck** is what survives where a wall was
just thick enough to seal a few pixels. A long thin **channel** is the gap
between a limb and a body: Klaus's walk has one 25x91 pixels between his
fist and his hip, sealed at both ends by his own glove and shorts, and
left in it painted a magenta bar down his side.

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
