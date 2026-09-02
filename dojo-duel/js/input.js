// Keyboard input. We track the physical key (event.code) so QWERTZ
// and QWERTY layouts behave identically.
window.DD = window.DD || {};

(function () {
  const down = new Set();      // keys currently held
  const pressedNow = new Set(); // newly pressed this frame (edge)

  // keys the browser must not act on itself (scrolling etc.)
  const SWALLOW = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH',
    'KeyJ', 'KeyK', 'KeyL', 'Enter', 'KeyP', 'KeyM',
    'Digit1', 'Digit2',
  ]);

  window.addEventListener('keydown', (e) => {
    if (SWALLOW.has(e.code)) e.preventDefault();
    if (!down.has(e.code)) pressedNow.add(e.code);
    down.add(e.code);
    DD.audio && DD.audio.unlock(); // the AudioContext needs a user gesture
  });

  window.addEventListener('keyup', (e) => {
    if (SWALLOW.has(e.code)) e.preventDefault();
    down.delete(e.code);
  });

  window.addEventListener('blur', () => down.clear());

  const Input = {
    isDown: (code) => down.has(code),
    wasPressed: (code) => pressedNow.has(code),
    // call once per game frame; afterwards edges count as "consumed"
    endFrame: () => pressedNow.clear(),
  };

  // default key bindings
  Input.P1_KEYS = {
    left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
    punch: 'KeyF', kick: 'KeyG', special: 'KeyH',
  };
  Input.P2_KEYS = {
    left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
    punch: 'KeyK', kick: 'KeyL', special: 'KeyJ',
  };

  // A controller produces the same simple state every frame –
  // no matter whether a human (keyboard) or the AI fills it.
  function emptyPad() {
    return {
      left: false, right: false, up: false, down: false,
      punch: false, kick: false, special: false,       // edges (freshly pressed)
      holdPunch: false, holdKick: false,
      dashL: false, dashR: false,                      // double tap, this frame
    };
  }

  // Two taps of the same direction inside TAP_WINDOW frames. Kept in
  // absolute directions - only the fighter knows which way it is facing,
  // and so which of the two is a forward dash.
  class TapWatch {
    constructor() { this.age = { left: 999, right: 999 }; this.held = {}; }
    feed(pad) {
      const w = (DD.C && DD.C.TAP_WINDOW) || 13;
      for (const dir of ['left', 'right']) {
        this.age[dir]++;
        const now = pad[dir];
        if (now && !this.held[dir]) {
          if (this.age[dir] <= w) {
            pad[dir === 'left' ? 'dashL' : 'dashR'] = true;
            this.age[dir] = 999;                       // one dash per pair
          } else {
            this.age[dir] = 0;
          }
        }
        this.held[dir] = now;
      }
      return pad;
    }
  }

  class HumanController {
    constructor(keys) { this.keys = keys; this.taps = new TapWatch(); }
    read() {
      const k = this.keys;
      const p = emptyPad();
      p.left = Input.isDown(k.left);
      p.right = Input.isDown(k.right);
      p.up = Input.isDown(k.up);
      p.down = Input.isDown(k.down);
      p.punch = Input.wasPressed(k.punch);
      p.kick = Input.wasPressed(k.kick);
      p.special = Input.wasPressed(k.special);
      p.holdPunch = Input.isDown(k.punch);
      p.holdKick = Input.isDown(k.kick);
      return this.taps.feed(p);
    }
  }

  DD.input = { Input, HumanController, TapWatch, emptyPad };
})();
