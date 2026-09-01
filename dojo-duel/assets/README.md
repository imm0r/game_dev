# assets/ – custom stage panoramas

Drop your panorama images here and the game automatically uses them as
scrolling stage backgrounds:

| File | replaces |
| ---- | -------- |
| `stage-1.png` | Tokyo Street |
| `stage-2.png` | Neon Crossing |
| `stage-3.png` | Wind Temple |

**Via the GitHub website:** open the repository → pick the branch → browse
into `dojo-duel/assets/` → "Add file" → "Upload files" → drag the PNGs in
(using exactly the file names above) → commit.

**Tech notes:** On load, each image is downscaled once (with smoothing) to
180px height. The world width follows from the image width, capped at
832px (~2.6 screen widths); wider panoramas are cropped to the center.
The fighting foot line sits at y = 158 of 180 — panoramas whose ground
occupies the lower third of the image work best. Just reload the page,
no build step needed. For the single-file build,
`node tools/build-single.mjs --embed` inlines the panoramas as well.
