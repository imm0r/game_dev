#!/usr/bin/env python3
"""Skeleton-based pixel sprite generator for Dojo Duel.

Hand-typing every pixel row produced blocky, "potato" anatomy: no waist,
legs like bars, arms glued to the torso. This generator instead takes a
pose as a set of JOINT POSITIONS and rasterizes it:

  * limbs are tapered capsules with cylindrical shading, so they read as
    round arms and legs instead of rectangles,
  * the torso is a width profile with a real shoulder-to-waist taper,
  * every body part is stamped with its own outline, so overlapping parts
    stay visually separated (the key to a readable silhouette),
  * light comes from the front-top, so the chest and face catch the light.

Adding a new pose means moving joints, not redrawing pixels.

Usage:
    python3 tools/rig.py            # regenerate the grids in js/sprites.js
    python3 tools/rig.py --preview  # also write PNG contact sheets to dist/

Canonical material letters (each character's palette maps them to colors):
  A S T U  skin: light / mid / shadow / deep crease
  L H J    hair and beard: light / mid / dark
  D G g    cloth: light / mid / shadow
  N n      trim (belt, buckle): light / dark
  R r q    gear (gloves, boots): light / mid / shadow
  W E e    eye white, near eye, far eye
  M        detail (tattoo, scar)
  B F V    flag blue / red / white
  K        outline
"""
import math
import struct
import sys
import zlib
from pathlib import Path

W, H = 72, 78
GROUND = 75             # row the feet stand on
BODY_CX = 25            # where poses put the spine ...
SHIFT = W // 2 - BODY_CX  # ... shifted so it lands on the canvas center, and
                          # the drawn figure lines up with the fighter's hitbox
LIGHT = (0.62, -0.79)   # from the top-front; sprites are drawn facing right

ROOT = Path(__file__).resolve().parent.parent


# ------------------------------------------------------------- rasterizer --

class Canvas:
    """Composites body parts back to front, each with its own outline."""

    def __init__(self):
        self.px = {}

    def stamp(self, part):
        for (x, y) in part:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    p = (x + dx, y + dy)
                    if p not in part and -SHIFT <= p[0] < W - SHIFT and 0 <= p[1] < H:
                        self.px[p] = 'K'
        for p, c in part.items():
            if -SHIFT <= p[0] < W - SHIFT and 0 <= p[1] < H:
                self.px[p] = c

    def shade(self, x, y, want, become):
        if self.px.get((x, y)) in want:
            self.px[(x, y)] = become

    def rows(self):
        return [''.join(self.px.get((x - SHIFT, y), '.') for x in range(W))
                for y in range(H)]


def merge(*parts):
    """One part out of several shapes, so no outline seams appear inside."""
    out = {}
    for p in parts:
        out.update(p)
    return out


def capsule(p0, p1, r0, r1, tones):
    """Tapered limb between two joints, shaded like a cylinder."""
    (x0, y0), (x1, y1) = p0, p1
    ax, ay = x1 - x0, y1 - y0
    alen = math.hypot(ax, ay) or 1e-6
    ux, uy = ax / alen, ay / alen
    px, py = -uy, ux
    if px * LIGHT[0] + py * LIGHT[1] > 0:      # perpendicular away from light
        px, py = -px, -py

    out = {}
    rmax = int(max(r0, r1)) + 2
    for y in range(int(min(y0, y1)) - rmax, int(max(y0, y1)) + rmax + 1):
        for x in range(int(min(x0, x1)) - rmax, int(max(x0, x1)) + rmax + 1):
            vx, vy = x - x0, y - y0
            t = max(0.0, min(1.0, (vx * ux + vy * uy) / alen))
            cx, cy = x0 + ux * alen * t, y0 + uy * alen * t
            dx, dy = x - cx, y - cy
            r = r0 + (r1 - r0) * t
            if math.hypot(dx, dy) > r:
                continue
            k = (dx * px + dy * py) / r if r else 0
            out[(x, y)] = tones[0] if k < -0.35 else (
                tones[2] if k > 0.42 else tones[1])
    return out


def blob(cx, cy, rx, ry, tones):
    """Rounded mass: fist, head, shoulder cap."""
    out = {}
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            nx, ny = (x - cx) / rx, (y - cy) / ry
            if nx * nx + ny * ny > 1.0:
                continue
            k = nx * LIGHT[0] + ny * LIGHT[1]
            out[(x, y)] = tones[0] if k > 0.42 else (
                tones[2] if k < -0.34 else tones[1])
    return out


def torso(sh_y, hip_y, sh_half, waist_half, hip_half, cx, tones, lean=0.0):
    """Shoulder line down to the hips, with a real waist."""
    out = {}
    waist_y = sh_y + (hip_y - sh_y) * 0.62
    for y in range(sh_y, hip_y + 1):
        if y <= waist_y:
            t = (y - sh_y) / max(1e-6, waist_y - sh_y)
            half = sh_half + (waist_half - sh_half) * (t ** 0.72)
        else:
            t = (y - waist_y) / max(1e-6, hip_y - waist_y)
            half = waist_half + (hip_half - waist_half) * (t ** 0.6)
        ccx = cx + lean * (y - sh_y) / max(1, hip_y - sh_y)
        for x in range(int(round(ccx - half)), int(round(ccx + half)) + 1):
            k = (x - ccx) / max(1e-6, half)
            out[(x, y)] = tones[0] if k > 0.34 else (
                tones[2] if k < -0.46 else tones[1])
    return out


def foot(ankle, toe, r, tones, ground=None):
    """Foot or boot; when `ground` is set it rests flat on that row."""
    out = capsule(ankle, toe, r, r * 0.62, tones)
    if ground is not None:
        for x in range(int(min(ankle[0], toe[0])), int(max(ankle[0], toe[0])) + 1):
            out[(x, ground)] = tones[2]
            out[(x, ground - 1)] = tones[1]
        for p in [p for p in out if p[1] > ground]:
            del out[p]
    return out


def head(cx, cy, rx, ry, skin, hair, opts):
    """Head with hair, beard, brow, eyes and nose, seen 3/4 facing right."""
    out = blob(cx, cy, rx, ry, skin)

    for y in range(int(cy), int(cy + ry) + 1):       # jaw narrows to the chin
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if (x, y) in out and abs(x - cx) > rx * (1.0 - 0.30 * (y - cy) / ry):
                del out[(x, y)]

    for (x, y) in list(out):                         # hair cap
        if y < cy - ry * 0.30:
            out[(x, y)] = hair[1] if x < cx else hair[0]
    for (x, y) in list(out):                         # hair at the back
        if x < cx - rx * 0.42 and y < cy + ry * 0.5:
            out[(x, y)] = hair[1]

    if opts.get('beard'):
        full = opts['beard'] == 'full'
        for (x, y) in list(out):
            ny, nx = (y - cy) / ry, (x - cx) / rx
            if ny > (0.24 if full else 0.42) or (
                    abs(nx) > (0.32 if full else 0.48)
                    and ny > -0.05 and nx < 0.55):
                out[(x, y)] = hair[1] if (x * 3 + y) % 4 else hair[2]
        for x in range(int(cx - rx * 0.2), int(cx + rx * 0.7)):
            p = (x, int(cy + ry * (0.10 if full else 0.26)))
            if p in out:
                out[p] = hair[2]

    by = int(cy - ry * 0.20)                         # brow ridge
    for x in range(int(cx - rx * 0.30), int(cx + rx * 0.80)):
        if (x, by) in out:
            out[(x, by)] = skin[2]

    ey = by + 2                                      # eyes
    ex = int(cx + rx * 0.42)
    out[(ex, ey)], out[(ex + 1, ey)] = 'W', 'E'
    fx = int(cx - rx * 0.14)
    out[(fx, ey)], out[(fx + 1, ey)] = 'W', 'e'

    ny = ey + 2                                      # nose and cheek
    out[(int(cx + rx * 0.80), ny)] = skin[2]
    out[(int(cx + rx * 0.72), ny + 1)] = skin[3]

    if opts.get('scar'):
        for i in range(5):
            out[(int(cx + rx * 0.5) + (i % 2), by - 3 + i)] = 'M'
    if opts.get('closed_eyes'):
        for p in ((ex, ey), (ex + 1, ey), (fx, ey), (fx + 1, ey)):
            out[p] = skin[2]
    return out


# -------------------------------------------------------------- costumes --

SKIN = ('A', 'S', 'T', 'U')
DARK = ('T', 'U', 'U', 'U')          # the far side of the body, in shadow
HAIR = ('L', 'H', 'J')
GLOVE = ('R', 'r', 'q')
GLOVE_D = ('r', 'q', 'q')
CLOTH = ('D', 'G', 'g')
CLOTH_D = ('G', 'g', 'g')

KLAUS = dict(
    thick=1.0, beard=True, scar=False,
    torso_mat=SKIN, arm_mat=SKIN, leg_mat=SKIN,
    forearm_mat=SKIN, hand_mat=GLOVE, foot_mat=SKIN,
    shorts=True, shorts_top=-10, shorts_bot=8, belt=True,
    tattoo=True, patch='chest',
)

ANTOINE = dict(
    thick=1.14, beard='full', scar=True,
    torso_mat=CLOTH, arm_mat=CLOTH, leg_mat=CLOTH,
    forearm_mat=SKIN, hand_mat=GLOVE, foot_mat=GLOVE,
    shorts=False, belt=True, boots=True,
    tattoo=False, patch='shoulder',
)


def far(mat):
    """Shadowed variant of a material for the far-side limb."""
    return DARK if mat is SKIN else (GLOVE_D if mat is GLOVE else CLOTH_D)


def draw(j, ch):
    c = Canvas()
    t = ch['thick']
    gnd = j.get('ground', GROUND)
    fa_g = None if j.get('far_air') else gnd
    ne_g = None if j.get('near_air') else gnd

    # --- far arm and far leg (behind the body) ---
    c.stamp(merge(
        capsule(j['sh_far'], j['el_far'], 3.3 * t, 2.6 * t, far(ch['arm_mat'])),
        capsule(j['el_far'], j['fist_far'], 2.5 * t, 2.1 * t,
                far(ch['forearm_mat'])),
        blob(*j['fist_far'], 2.9 * t, 2.7 * t, far(ch['hand_mat'])),
    ))
    c.stamp(merge(
        capsule(j['hip_far'], j['knee_far'], 4.4 * t, 3.2 * t, far(ch['leg_mat'])),
        capsule(j['knee_far'], j['ankle_far'], 3.2 * t, 2.4 * t, far(ch['leg_mat'])),
        foot(j['ankle_far'], j['toe_far'], 2.5 * t, far(ch['foot_mat']), fa_g),
    ))

    # --- torso ---
    c.stamp(torso(j['sh_y'], j['hip_y'], j['sh_half'], j['waist_half'],
                  j['hip_half'], j['cx'], ch['torso_mat'], j.get('lean', 0)))
    cx, sh_y = int(j['cx']), j['sh_y']
    if ch['torso_mat'] is SKIN:                       # pectorals and abs
        for x in range(cx - 5, cx + 6):
            c.shade(x, sh_y + 9, ('S', 'A'), 'T')
        for i in range(3):
            for x in range(cx - 3, cx + 4):
                c.shade(x, sh_y + 13 + i * 4, ('S', 'A'), 'T')
    else:                                             # uniform: pockets, seam
        for i in range(2):
            for x in range(cx - 4 + i * 7, cx - 1 + i * 7):
                for y in range(sh_y + 8, sh_y + 12):
                    c.shade(x, y, ('D', 'G'), 'g')
        for y in range(sh_y + 2, j['hip_y'] - 2):
            c.shade(cx + 3, y, ('D', 'G'), 'g')
    if ch.get('tattoo'):
        for dx, dy in ((-4, 12), (-3, 13), (-5, 13), (-4, 14), (-3, 11)):
            c.shade(cx + dx, sh_y + dy, ('S', 'A', 'T'), 'M')

    # --- shorts / belt ---
    if ch.get('shorts'):
        top = j['hip_y'] + ch['shorts_top']
        c.stamp(torso(top, j['hip_y'] + ch['shorts_bot'], j['waist_half'] + 0.6,
                      j['hip_half'] + 0.4, j['hip_half'] + 1.4, j['cx'], CLOTH,
                      j.get('lean', 0) * 0.4))
    if ch.get('belt'):
        top = j['hip_y'] + (ch['shorts_top'] if ch.get('shorts') else -6)
        for x in range(int(j['cx'] - j['waist_half']) - 1,
                       int(j['cx'] + j['waist_half']) + 2):
            c.px[(x, top)] = 'N'
            c.px[(x, top + 1)] = 'n'
        c.px[(cx + 1, top)] = 'V'
    if ch['patch'] == 'chest':
        c.px[(cx + 4, sh_y + 20)] = 'F'
        c.px[(cx + 5, sh_y + 20)] = 'N'
    else:
        for i, col in enumerate(('B', 'V', 'F')):
            c.px[(cx - 7 + i, sh_y + 4)] = col
            c.px[(cx - 7 + i, sh_y + 5)] = col

    # --- near leg ---
    c.stamp(merge(
        capsule(j['hip_near'], j['knee_near'], 4.7 * t, 3.4 * t, ch['leg_mat']),
        capsule(j['knee_near'], j['ankle_near'], 3.4 * t, 2.5 * t, ch['leg_mat']),
        foot(j['ankle_near'], j['toe_near'], 2.6 * t, ch['foot_mat'], ne_g),
    ))

    # --- head ---
    c.stamp(head(*j['head'], *j['headr'], SKIN, HAIR, {
        'beard': ch['beard'], 'scar': ch['scar'],
        'closed_eyes': j.get('closed_eyes'),
    }))

    # --- near arm (in front of everything) ---
    c.stamp(merge(
        capsule(j['sh_near'], j['el_near'], 3.5 * t, 2.7 * t, ch['arm_mat']),
        capsule(j['el_near'], j['fist_near'], 2.7 * t, 2.2 * t, ch['forearm_mat']),
        blob(*j['fist_near'], 3.1 * t, 2.9 * t, ch['hand_mat']),
    ))
    return c.rows()


# ----------------------------------------------------------------- poses --

BASE = dict(
    cx=25, sh_y=18, hip_y=44, sh_half=9.5, waist_half=6.0, hip_half=7.6,
    lean=-1.0, ground=GROUND,
    head=(28, 10), headr=(6.2, 7.2), neck=(26, 16),
    sh_far=(20, 21), el_far=(15, 29), fist_far=(19, 15),
    sh_near=(31, 21), el_near=(37, 29), fist_near=(38, 20),
    hip_far=(20, 43), knee_far=(13, 57), ankle_far=(11, 71), toe_far=(17, 73),
    hip_near=(30, 43), knee_near=(35, 57), ankle_near=(36, 71), toe_near=(44, 73),
)

ARMS = ('head', 'neck', 'sh_far', 'el_far', 'fist_far',
        'sh_near', 'el_near', 'fist_near')
LEGS = ('hip_far', 'knee_far', 'ankle_far', 'toe_far',
        'hip_near', 'knee_near', 'ankle_near', 'toe_near')


def P(**over):
    """A pose: the base stance with joints overridden."""
    j = dict(BASE)
    dy = over.pop('dy', 0)
    if dy:
        for k in ARMS:
            j[k] = (j[k][0], j[k][1] + dy)
        j['sh_y'] += dy
        j['hip_y'] += dy
        for k in ('hip_far', 'hip_near'):
            j[k] = (j[k][0], j[k][1] + dy)
    j.update(over)
    return j


POSES = {
    'idle0': P(),
    'idle1': P(dy=-1, sh_half=9.9, fist_near=(38, 19), fist_far=(19, 14)),

    # walking is a fighting-game shuffle: the feet never cross
    'walk0': P(knee_near=(37, 56), ankle_near=(40, 71), toe_near=(48, 73),
               knee_far=(14, 57), ankle_far=(12, 71), toe_far=(18, 73)),
    'walk1': P(dy=-1, near_air=True,
               knee_near=(34, 54), ankle_near=(33, 67), toe_near=(41, 69),
               knee_far=(14, 57), ankle_far=(12, 71), toe_far=(18, 73)),
    'walk2': P(knee_near=(34, 57), ankle_near=(34, 71), toe_near=(42, 73),
               knee_far=(15, 56), ankle_far=(14, 71), toe_far=(20, 73)),
    'walk3': P(dy=-1, far_air=True,
               knee_near=(35, 57), ankle_near=(36, 71), toe_near=(44, 73),
               knee_far=(16, 54), ankle_far=(17, 67), toe_far=(23, 69)),

    # punch: coil, full extension with a lunge, then retract
    'pun0': P(fist_near=(30, 23), el_near=(33, 30), fist_far=(21, 16),
              lean=-2.0),
    'pun1': P(cx=26, lean=1.5, sh_y=19,
              sh_near=(32, 22), el_near=(42, 22), fist_near=(53, 22),
              fist_far=(22, 20), el_far=(17, 28),
              hip_near=(31, 44), knee_near=(38, 58), ankle_near=(41, 71),
              toe_near=(49, 73),
              hip_far=(21, 44), knee_far=(12, 58), ankle_far=(9, 71),
              toe_far=(15, 73)),
    'pun2': P(sh_near=(31, 21), el_near=(39, 25), fist_near=(45, 22)),

    # kick: knee chambered, then the leg snaps out
    'kick0': P(near_air=True, lean=-2.5,
               hip_near=(29, 43), knee_near=(35, 47), ankle_near=(32, 56),
               toe_near=(39, 58),
               knee_far=(15, 57), ankle_far=(14, 71), toe_far=(20, 73)),
    'kick1': P(near_air=True, lean=-3.0, cx=24,
               hip_near=(29, 43), knee_near=(38, 44), ankle_near=(49, 42),
               toe_near=(56, 42),
               knee_far=(15, 57), ankle_far=(14, 71), toe_far=(20, 73)),

    # special: draw both hands back, then thrust forward
    'sp0': P(lean=-3.0,
             fist_near=(24, 34), el_near=(30, 33), sh_near=(31, 22),
             fist_far=(20, 31), el_far=(16, 31),
             knee_far=(14, 57), ankle_far=(12, 71), toe_far=(18, 73)),
    'sp1': P(cx=26, lean=1.0,
             sh_near=(32, 22), el_near=(41, 25), fist_near=(50, 27),
             sh_far=(21, 22), el_far=(30, 27), fist_far=(45, 29),
             hip_near=(31, 44), knee_near=(38, 58), ankle_near=(41, 71),
             toe_near=(49, 73)),

    # jump: push off, tuck at the apex, reach for the ground
    'jmp0': P(dy=2, far_air=False,
              hip_near=(30, 45), knee_near=(36, 59), ankle_near=(38, 72),
              toe_near=(46, 74),
              hip_far=(20, 45), knee_far=(12, 59), ankle_far=(9, 72),
              toe_far=(15, 74)),
    'jmp1': P(near_air=True, far_air=True, dy=1,
              hip_near=(30, 44), knee_near=(36, 50), ankle_near=(31, 58),
              toe_near=(38, 60),
              hip_far=(20, 44), knee_far=(15, 51), ankle_far=(21, 58),
              toe_far=(27, 60),
              fist_near=(37, 21), fist_far=(19, 16)),
    'jmp2': P(near_air=True, far_air=True,
              hip_near=(30, 44), knee_near=(37, 56), ankle_near=(39, 68),
              toe_near=(46, 70),
              hip_far=(20, 44), knee_far=(14, 56), ankle_far=(12, 68),
              toe_far=(18, 70)),

    'crouch0': P(dy=13, hip_y=57, lean=-2.0,
                 hip_near=(30, 56), knee_near=(38, 63), ankle_near=(35, 71),
                 toe_near=(43, 73),
                 hip_far=(20, 56), knee_far=(12, 63), ankle_far=(14, 71),
                 toe_far=(20, 73)),

    'block0': P(lean=-2.5,
                sh_near=(31, 21), el_near=(34, 31), fist_near=(35, 17),
                sh_far=(20, 21), el_far=(18, 31), fist_far=(23, 16),
                knee_near=(34, 57), ankle_near=(34, 71), toe_near=(42, 73)),

    'hurt0': P(lean=-4.5, cx=23,
               head=(24, 11), sh_near=(30, 22), el_near=(35, 30),
               fist_near=(33, 22),
               sh_far=(19, 22), el_far=(12, 28), fist_far=(10, 20),
               knee_near=(33, 57), ankle_near=(33, 71), toe_near=(41, 73),
               knee_far=(13, 57), ankle_far=(10, 71), toe_far=(16, 73)),

    'kof0': P(dy=-4, lean=-7.0, cx=21, near_air=True, far_air=True,
              closed_eyes=True,
              head=(20, 12), sh_near=(28, 20), el_near=(33, 27),
              fist_near=(30, 18),
              sh_far=(17, 20), el_far=(9, 25), fist_far=(6, 18),
              hip_near=(28, 42), knee_near=(37, 50), ankle_near=(43, 58),
              toe_near=(49, 61),
              hip_far=(19, 42), knee_far=(27, 52), ankle_far=(34, 61),
              toe_far=(40, 64)),

    'win0': P(sh_near=(31, 21), el_near=(35, 14), fist_near=(37, 5),
              fist_far=(21, 18), el_far=(17, 27),
              knee_near=(34, 57), ankle_near=(34, 71), toe_near=(42, 73)),
}


def ko_pose(ch):
    """Flat on the back: the body laid out horizontally on the floor."""
    j = dict(BASE)
    j.update(
        cx=26, sh_y=66, hip_y=70, sh_half=4.5, waist_half=3.4, hip_half=4.0,
        lean=0.0, closed_eyes=True,
        head=(13, 68), headr=(6.0, 6.0), neck=(19, 68),
        sh_far=(23, 67), el_far=(28, 62), fist_far=(33, 64),
        sh_near=(23, 70), el_near=(29, 72), fist_near=(35, 71),
        hip_far=(31, 68), knee_far=(40, 66), ankle_far=(48, 68), toe_far=(50, 63),
        hip_near=(31, 71), knee_near=(41, 71), ankle_near=(50, 72),
        toe_near=(52, 67),
        near_air=True, far_air=True,
    )
    return j


# ---------------------------------------------------------------- output --

def build(ch):
    out = {name: draw(j, ch) for name, j in POSES.items()}
    out['ko0'] = draw(ko_pose(ch), ch)
    return out


def js_literal(name, rows):
    body = ',\n'.join("      '%s'" % r for r in rows)
    return "    %s: [\n%s,\n    ],\n" % (name, body)


def emit(sets):
    lines = ["  // >>> GENERATED BY tools/rig.py — do not edit by hand >>>",
             "  const GEN = {"]
    for ch_name, poses in sets.items():
        lines.append("  %s: {" % ch_name)
        for pose, rows in poses.items():
            lines.append(js_literal(pose, rows).rstrip('\n'))
        lines.append("  },")
    lines.append("  };")
    lines.append("  // <<< GENERATED BY tools/rig.py <<<")
    return '\n'.join(lines) + '\n'


def patch_sprites(block):
    path = ROOT / 'js' / 'sprites.js'
    src = path.read_text()
    a = src.index('  // >>> GENERATED BY tools/rig.py')
    b = src.index('  // <<< GENERATED BY tools/rig.py')
    b = src.index('\n', b) + 1
    path.write_text(src[:a] + block + src[b:])
    print('js/sprites.js: generated block updated')


# preview palettes (the game's real palettes live in js/sprites.js)
def hexpal(d):
    return {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in d.items()}


PREVIEW = {
    'klaus': hexpal({
        'K': '#191122', 'A': '#f4c79c', 'S': '#dda274', 'T': '#b47a4a',
        'U': '#8a542e', 'L': '#a5722f', 'H': '#6e4420', 'J': '#412613',
        'D': '#33333f', 'G': '#232330', 'g': '#14141d', 'N': '#e0b445',
        'n': '#a67c22', 'R': '#cbcbd8', 'r': '#94949f', 'q': '#5e5e6a',
        'W': '#f4f4f4', 'E': '#4fc4f5', 'e': '#8a5a14', 'M': '#5f4630',
        'B': '#2848a0', 'F': '#d82818', 'V': '#eeeeee',
    }),
    'antoine': hexpal({
        'K': '#141018', 'A': '#e6b98e', 'S': '#cb9767', 'T': '#a4713f',
        'U': '#7c4f28', 'L': '#4e4a44', 'H': '#2c2a2a', 'J': '#181718',
        'D': '#71754a', 'G': '#565a34', 'g': '#383b21', 'N': '#3a3022',
        'n': '#241d14', 'R': '#4a4a52', 'r': '#333339', 'q': '#1e1e24',
        'W': '#f4f4f4', 'E': '#7a4a18', 'e': '#5e3a12', 'M': '#f0d3b4',
        'B': '#2848a0', 'F': '#d82818', 'V': '#eeeeee',
    }),
}


def write_png(path, rows, palette, zoom=4, bg=(36, 28, 48)):
    ph, pw = len(rows) * zoom, len(rows[0]) * zoom
    raw = bytearray()
    for y in range(ph):
        raw.append(0)
        for x in range(pw):
            ch = rows[y // zoom][x // zoom]
            raw += bytes(palette.get(ch, bg) if ch != '.' else bg)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    Path(path).write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', pw, ph, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b''))


def sheet(poses, palette, zoom=3, cols=None):
    names = list(poses)
    cols = cols or len(names)
    gap = 2
    rows_out = []
    for r in range(0, len(names), cols):
        band = names[r:r + cols]
        for y in range(H):
            rows_out.append((('.' * gap).join(poses[n][y] for n in band)))
        rows_out += ['.' * len(rows_out[-1])] * 3
    width = max(len(r) for r in rows_out)
    return [r.ljust(width, '.') for r in rows_out]


if __name__ == '__main__':
    sets = {'klaus': build(KLAUS), 'antoine': build(ANTOINE)}
    patch_sprites(emit(sets))
    if '--preview' in sys.argv:
        out = ROOT / 'dist'
        out.mkdir(exist_ok=True)
        for name, poses in sets.items():
            write_png(out / ('rig-%s.png' % name),
                      sheet(poses, PREVIEW[name], cols=8), PREVIEW[name], zoom=3)
        print('preview sheets written to dist/')
    print('poses per character:', len(sets['klaus']))
