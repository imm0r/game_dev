// Chiptune-Soundeffekte, komplett synthetisiert (WebAudio) – keine Dateien nötig.
window.DD = window.DD || {};

(function () {
  let ctx = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.13;
        master.connect(ctx.destination);
      } catch (e) { /* Ohne Audio geht das Spiel trotzdem */ }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Ein einzelner Retro-"Blip": Oszillator mit Frequenz-Rutsche
  function blip(type, f0, f1, dur, vol, delay) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Kurzer Rausch-Impuls für "Einschlag"-Sounds
  function noise(dur, vol, cutoff) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t);
  }

  const sfx = {
    punch:    () => blip('square', 320, 160, 0.06, 0.5),
    kick:     () => blip('square', 260, 110, 0.09, 0.5),
    hit:      () => { noise(0.12, 0.7, 900); blip('square', 140, 60, 0.12, 0.5); },
    block:    () => { blip('square', 700, 500, 0.05, 0.4); noise(0.04, 0.3, 2000); },
    jump:     () => blip('square', 200, 420, 0.10, 0.25),
    fireball: () => blip('sawtooth', 180, 640, 0.22, 0.4),
    ko:       () => { blip('sawtooth', 420, 50, 0.55, 0.6); noise(0.3, 0.5, 500); },
    round:    () => { blip('square', 440, 440, 0.09, 0.4); blip('square', 660, 660, 0.12, 0.4, 0.12); },
    win:      () => { blip('square', 523, 523, 0.09, 0.4); blip('square', 659, 659, 0.09, 0.4, 0.10); blip('square', 784, 784, 0.16, 0.4, 0.20); },
    select:   () => blip('square', 880, 880, 0.05, 0.3),
  };

  DD.audio = {
    unlock,
    play: (name) => { if (sfx[name]) sfx[name](); },
    toggleMute: () => { muted = !muted; return muted; },
    get muted() { return muted; },
  };
})();
