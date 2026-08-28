// Kämpfer-Sprites als Text-Grids – jedes Zeichen ist ein Pixel.
// Legende:  .  transparent      K  Umriss (fast schwarz)
//           S  Haut             H  Haar
//           R  Stirnband/Handschuhe (Akzentfarbe)
//           G  Gi (Anzug)       D  Gi-Schatten
//           B  Gürtel
// Spieler 2 bekommt automatisch eine Palette-Swap-Variante (Klassiker!).
// Alle Grids sind 28 Zeichen breit und 36 Zeilen hoch. Blickrichtung: rechts.
window.DD = window.DD || {};

(function () {
  const PALETTES = {
    p1: { // HANZO: weisser Gi, rotes Band, dunkles Haar
      K: '#181020', S: '#f0c090', H: '#402818', R: '#d82818',
      G: '#f0ede0', D: '#b8b4a8', B: '#282430',
      O: '#1838a0', C: '#38c8f8', W: '#f8f8f8',
    },
    p2: { // KAITO: roter Gi, gelbes Band, blondes Haar
      K: '#181020', S: '#e8b080', H: '#e8c850', R: '#f8d838',
      G: '#c03028', D: '#8c1e1c', B: '#282430',
      O: '#802090', C: '#e858f8', W: '#f8f8f8',
    },
  };

  // ---------------------------------------------------------------- Posen --

  const IDLE = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGK.........',
    '.........KGDGGGGGKSSK.......',
    '.........KGDGGGGGKSKRRK.....',
    '.........KGDGGGGGKKRRRK.....',
    '.........KGDGGGGGK.KKK......',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KSSK.KSSK..........',
    '........KSSSK.KSSSSK........',
    '........KKKKK.KKKKKK........',
    '............................',
  ];

  // Beine gespreizt (Schrittstellung)
  const LEGS_APART = [
    '........KGGGK.KGGGK.........',
    '........KGGK...KGGK.........',
    '........KGGK...KGGK.........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KSSK.....KSSK........',
    '......KSSSK.....KSSSSK......',
    '......KKKKK.....KKKKKK......',
  ];

  // Beine fast geschlossen (Durchschwung beim Gehen)
  const LEGS_PASS = [
    '.........KGGGGGGGK..........',
    '..........KGGGGGK...........',
    '..........KGGGGGK...........',
    '..........KGGKGGK...........',
    '..........KGGKGGK...........',
    '..........KGGKGGK...........',
    '..........KGGKGGK...........',
    '..........KGGKGGK...........',
    '..........KGGKGGK...........',
    '..........KSSKSSK...........',
    '.........KSSSKSSSK..........',
    '.........KKKKKKKKK..........',
  ];

  function withLegs(base, legs) {
    return base.slice(0, 23).concat(legs, base.slice(23 + legs.length));
  }

  const WALK_A = withLegs(IDLE, LEGS_APART);
  const WALK_B = withLegs(IDLE, LEGS_PASS);

  const PUNCH = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGKK........',
    '.........KGDGGGGGGGSSSRRK...',
    '.........KGDGGGGGGGSSRRRK...',
    '.........KGDGGGGGKKKKKRRK...',
    '.........KGDGGGGGK..KKKK....',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '........KGGGK.KGGGK.........',
    '........KGGK...KGGK.........',
    '........KGGK...KGGK.........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KSSK.....KSSK........',
    '......KSSSK.....KSSSSK......',
    '......KKKKK.....KKKKKK......',
    '............................',
  ];

  const KICK = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGK.........',
    '.........KGDGGGGGKSK........',
    '.........KGDGGGGGKRRK.......',
    '.........KGDGGGGGKKKK.......',
    '.........KGDGGGGGK..........',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGKKKKKKKK...',
    '.........KGGGGGGGGGGGGSSSSK.',
    '.........KGGGGGGGKKKKKKKKKK.',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KGGK..............',
    '..........KSSK..............',
    '.........KSSSK..............',
    '.........KKKKK..............',
    '............................',
  ];

  const SPECIAL = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGKK........',
    '.........KGDGGGGGGSSSSK.....',
    '.........KGDGGGGGKKSSSK.....',
    '.........KGDGGGGGGSSSSK.....',
    '.........KGDGGGGGKKKKKK.....',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '........KGGGK.KGGGK.........',
    '........KGGK...KGGK.........',
    '........KGGK...KGGK.........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KSSK.....KSSK........',
    '......KSSSK.....KSSSSK......',
    '......KKKKK.....KKKKKK......',
    '............................',
  ];

  const JUMP = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGK.........',
    '.........KGDGGGGGKSSK.......',
    '.........KGDGGGGGKRRK.......',
    '.........KGDGGGGGK.KK.......',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '........KGGGGGGGGGK.........',
    '........KGGKKKKGGK..........',
    '........KSSK..KSSK..........',
    '........KKKK..KKKK..........',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
  ];

  const CROUCH = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGK.........',
    '.........KGDGGGGGKSSK.......',
    '.........KGDGGGGGKRRK.......',
    '.........KGDGGGGGKKKK.......',
    '.........KGDGGGGGK..........',
    '..........KBBBBBK...........',
    '........KGGGGGGGGGK.........',
    '.......KGGGGGGGGGGGK........',
    '.......KGGKKKKKKKGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KSSK.....KSSK........',
    '......KSSSK.....KSSSSK......',
    '......KKKKK.....KKKKKK......',
    '............................',
  ];

  const BLOCK = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............KHHHK...........',
    '...........KHHHHHK..........',
    '..........RRKRRRRK..........',
    '...........KSSSKSSK.........',
    '...........KSSSSSSK.........',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGKRRK.......',
    '.........KGGGGGGGGKRRK......',
    '.........KGDGGGGGKKSSK......',
    '.........KGDGGGGGKKSSK......',
    '.........KGDGGGGGKRRKK......',
    '.........KGDGGGGGKKKK.......',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KSSK.KSSK..........',
    '........KSSSK.KSSSSK........',
    '........KKKKK.KKKKKK........',
    '............................',
  ];

  const HURT = [
    '............................',
    '............................',
    '............................',
    '............................',
    '..........KHHHK.............',
    '.........KHHHHHK............',
    '........RRKRRRRK............',
    '.........KSSKSSK............',
    '.........KSSSSSK............',
    '..........KSSSK.............',
    '...........KSSK.............',
    '.........KGGGGGGK...........',
    '........KGGGGGGGGK..........',
    '.......KSSKGGGGGGK..........',
    '......KRRKGDGGGGGK..........',
    '......KRRKGDGGGGGKSSK.......',
    '......KKKKGDGGGGGKKKK.......',
    '.........KGDGGGGK...........',
    '..........KGDGGGK...........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '........KGGGK.KGGGK.........',
    '........KGGK...KGGK.........',
    '........KGGK...KGGK.........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KGGK.....KGGK........',
    '.......KSSK.....KSSK........',
    '......KSSSK.....KSSSSK......',
    '......KKKKK.....KKKKKK......',
    '............................',
  ];

  const KO_LIE = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '....KHHK........KRRK........',
    '...KHSSKGGGGGGGGKSSK........',
    '...KSSSKGGDGGBGGDGGGKSSSK...',
    '....KKKKKKKKKKKKKKKKKKKK....',
    '............................',
    '............................',
    '............................',
  ];

  const WIN = [
    '..................KKK.......',
    '.................KRRK.......',
    '.................KRRK.......',
    '.................KSSK.......',
    '............KHHHK.KSK.......',
    '...........KHHHHHKKSK.......',
    '..........RRKRRRRKKSK.......',
    '...........KSSSKSSKSK.......',
    '...........KSSSSSSKKK.......',
    '............KSSSSK..........',
    '.............KSSK...........',
    '..........KGGGGGGK..........',
    '.........KGGGGGGGGK.........',
    '.........KGDGGGGGK..........',
    '.........KGDGGGGGK..........',
    '.........KGDGGGGGK..........',
    '.........KGDGGGGGK..........',
    '.........KGDGGGGGK..........',
    '..........KGDGGGGK..........',
    '..........KBBBBBK...........',
    '.........KGGGGGGGK..........',
    '.........KGGGGGGGK..........',
    '.........KGGDGGDGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KGGK.KGGK..........',
    '.........KSSK.KSSK..........',
    '........KSSSK.KSSSSK........',
    '........KKKKK.KKKKKK........',
    '............................',
  ];

  const FIREBALL_A = [
    '...OOOO.....',
    '..OCCCCOO...',
    '.OCWWWWCCO..',
    'OCWWWWWWCCO.',
    'OCWWWWWWCCO.',
    '.OCWWWWCCO..',
    '..OCCCCOO...',
    '...OOOO.....',
  ];

  const FIREBALL_B = [
    '....OOOO....',
    '..OOCCCCO...',
    '.OCCWWWWCO..',
    'OCCWWWWWWCO.',
    'OCCWWWWWWCO.',
    '.OCCWWWWCO..',
    '..OOCCCCO...',
    '....OOOO....',
  ];

  const GRIDS = {
    idle: IDLE, walkA: WALK_A, walkB: WALK_B,
    punch: PUNCH, kick: KICK, special: SPECIAL,
    jump: JUMP, crouch: CROUCH, block: BLOCK,
    hurt: HURT, ko: KO_LIE, win: WIN,
    fireballA: FIREBALL_A, fireballB: FIREBALL_B,
  };

  // ------------------------------------------------- Grid -> Canvas-Frames --

  function buildCanvas(rows, pal, name) {
    const w = rows[0].length;
    const h = rows.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) {
        throw new Error(`Sprite "${name}", Zeile ${y}: ${rows[y].length} statt ${w} Zeichen`);
      }
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        const col = pal[ch];
        if (!col) throw new Error(`Sprite "${name}": unbekanntes Zeichen "${ch}"`);
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  function flipCanvas(cv) {
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const ctx = out.getContext('2d');
    ctx.translate(cv.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, 0, 0);
    return out;
  }

  // unterste belegte Zeile: dort "stehen" die Füße auf dem Boden
  function bottomRow(rows) {
    for (let y = rows.length - 1; y >= 0; y--) {
      if (/[^.]/.test(rows[y])) return y + 1;
    }
    return rows.length;
  }

  const frames = { p1: {}, p2: {}, meta: {} };

  function buildAll() {
    for (const name of Object.keys(GRIDS)) {
      const rows = GRIDS[name];
      frames.meta[name] = {
        w: rows[0].length,
        h: rows.length,
        bottom: bottomRow(rows),
      };
      for (const p of ['p1', 'p2']) {
        const cv = buildCanvas(rows, PALETTES[p], name);
        frames[p][name] = { right: cv, left: flipCanvas(cv) };
      }
    }
  }

  // Einen Frame an Weltposition (x = Fussmitte, y = Fusslinie) zeichnen
  function draw(ctx, palName, frameName, facing, x, y, dy) {
    const f = frames[palName][frameName];
    const m = frames.meta[frameName];
    const S = DD.C.SCALE;
    const img = facing >= 0 ? f.right : f.left;
    const dx = Math.round(x - (m.w * S) / 2);
    const dyy = Math.round(y - m.bottom * S + (dy || 0));
    ctx.drawImage(img, dx, dyy, m.w * S, m.h * S);
  }

  DD.sprites = { buildAll, draw, frames, PALETTES };
})();
