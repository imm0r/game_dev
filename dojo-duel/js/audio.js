// Chiptune sound effects and music, fully synthesized (WebAudio) – no
// files needed, which is why the whole soundtrack costs a few hundred
// bytes of pattern strings rather than a few megabytes of samples.
window.DD = window.DD || {};

(function () {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let muted = false;

  function unlock() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.13;
        master.connect(ctx.destination);
        // Two buses under the master so music can sit below the effects
        // without either one having to know about the other.
        sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
        musicBus = ctx.createGain(); musicBus.gain.value = 0.6;
        sfxBus.connect(master); musicBus.connect(master);
      } catch (e) { /* the game still works without audio */ }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (ctx && wanted && !timer) startClock();
  }

  // A single retro "blip": oscillator with a frequency slide. `at` is an
  // absolute context time for the sequencer; the effects leave it out and
  // get "now plus delay", which is what they always had.
  function blip(type, f0, f1, dur, vol, delay, at, bus) {
    if (!ctx || muted) return;
    const t = at === undefined ? ctx.currentTime + (delay || 0) : at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // short noise burst for "impact" sounds, and for the drums
  function noise(dur, vol, cutoff, at, bus) {
    if (!ctx || muted) return;
    const t = at === undefined ? ctx.currentTime : at;
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
    src.connect(filt); filt.connect(g); g.connect(bus || sfxBus);
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
    // Below: events that used to borrow another sound, or had none. A
    // dash and a jump were the same noise, a grab and a kick were the
    // same noise, and a super was a fireball - which is a lot of the
    // game's most important moments sounding like something smaller.
    land:     () => noise(0.06, 0.22, 380),
    dash:     () => { noise(0.13, 0.28, 3200); blip('square', 620, 240, 0.10, 0.18); },
    throw:    () => { blip('square', 180, 90, 0.16, 0.45); noise(0.16, 0.5, 700); },
    super:    () => { blip('sawtooth', 120, 900, 0.36, 0.5);
                      blip('square', 240, 1800, 0.36, 0.3, 0.02);
                      noise(0.30, 0.4, 1400); },
    // The sound of being thrown across the room: a hit, then the whoosh
    // of the flight, so a full-screen toss does not land on the ear the
    // same way a poke does.
    launch:   () => { noise(0.14, 0.75, 800); blip('square', 160, 55, 0.14, 0.55);
                      blip('sawtooth', 300, 900, 0.28, 0.16, 0.05); },
    boom:     () => { noise(0.34, 0.7, 420); blip('sawtooth', 200, 40, 0.32, 0.45); },
  };

  // ---------------------------------------------------------------------
  // Music. A chiptune is a grid, so this is a step sequencer: three voices
  // reading one token per sixteenth off a string.
  //
  //   a4   play that note        .   rest, the voice goes quiet
  //   -    hold the note before it
  //
  // and for the drum voice, `x` kick, `s` snare, `h` hihat. The voices
  // loop on their own lengths, so a four-bar melody over a one-bar drum
  // pattern is two strings rather than the melody written out four times.
  const SEMI = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6,
                 g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };

  function hz(tok) {
    const m = /^([a-g]#?)(-?\d)$/.exec(tok);
    if (!m) return 0;
    return 440 * Math.pow(2, (SEMI[m[1]] + (Number(m[2]) - 4) * 12 - 9) / 12);
  }

  const bars = (s) => s.trim().split(/\s+/);

  // Three stages, a title theme and something for the winner. Minor keys
  // throughout, because that is what an arcade sounded like.
  const SONGS = {
    // Tokyo Street: A minor, driving, the one you hear most.
    tokyo: {
      bpm: 138,
      lead: bars(`a4 -  .  e4 .  a4 .  c5  b4 -  .  a4 .  g4 .  .
                  f4 -  .  c5 .  a4 .  g4  e4 -  -  -  .  .  .  .`),
      bass: bars(`a2 .  a2 .  a2 .  a2 .   f2 .  f2 .  g2 .  g2 .
                  f2 .  f2 .  f2 .  f2 .   g2 .  g2 .  e2 .  e2 .`),
      drum: bars('x  .  h  .  s  .  h  .   x  .  h  .  s  .  h  h'),
    },
    // Wind Temple: D minor, slower, room to breathe between the phrases.
    temple: {
      bpm: 104,
      lead: bars(`d4 -  -  .  f4 -  .  g4  a4 -  -  -  .  g4 .  f4
                  d4 -  -  .  c4 -  .  d4  f4 -  -  -  -  .  .  .`),
      bass: bars(`d2 -  -  -  .  .  .  .   a2 -  -  -  .  .  .  .
                  a#2 - -  -  .  .  .  .   a2 -  -  -  .  .  .  .`),
      drum: bars('x  .  .  .  .  .  s  .   .  .  .  .  x  .  s  .'),
    },
    // Neon Crossing: E minor, fastest of the three, busiest bass.
    neon: {
      bpm: 152,
      lead: bars(`e4 .  e4 .  b4 .  a4 .   g4 .  a4 .  b4 -  .  .
                  e4 .  e4 .  g4 .  a4 .   b4 .  d5 .  b4 -  .  .`),
      bass: bars(`e2 e2 .  e2 .  e2 e2 .   c2 c2 .  c2 .  c2 c2 .
                  d2 d2 .  d2 .  d2 d2 .   b1 b1 .  b1 .  b1 b1 .`),
      drum: bars('x  .  h  h  s  .  h  .   x  .  h  h  s  .  h  h'),
    },
    // The title screen, and the only one that is not in a hurry.
    title: {
      bpm: 120,
      lead: bars(`a4 -  -  -  c5 -  -  -   e5 -  -  -  d5 -  -  -
                  c5 -  -  -  b4 -  -  -   a4 -  -  -  -  -  .  .`),
      bass: bars(`a2 -  -  -  a2 -  -  -   f2 -  -  -  f2 -  -  -
                  g2 -  -  -  g2 -  -  -   a2 -  -  -  -  -  .  .`),
      drum: bars('x  .  .  .  .  .  s  .   .  .  .  .  x  .  s  .'),
    },
  };
  // Which track a stage index gets, in the order the stages are listed.
  const STAGE_SONGS = ['tokyo', 'temple', 'neon'];

  // Real music beats a synthesized pattern, the same way a hand-drawn
  // sheet in assets/ beats the generated art. Drop an audio file in
  // `sfx/`, name it against a track here, and it plays instead - the
  // pattern above stays as the fallback for whatever has no file yet, and
  // for opening the page straight off disk, where a browser will not let
  // it fetch one.
  const MUSIC_FILES = {
    tokyo: 'One_Life_Remaining.mp3',
    temple: 'One_Life_Remaining.mp3',
    neon: 'One_Life_Remaining.mp3',
  };
  // Filled by the single-file build, which has no `sfx/` to fetch from.
  DD.MUSIC = DD.MUSIC || {};

  const buffers = {};      // decoded audio, by file name
  const failed = {};       // ...and the ones not worth asking for again
  let source = null;       // the file currently looping, if any

  function fileFor(name) {
    const f = MUSIC_FILES[name];
    return f && !failed[f] ? f : null;
  }

  function stopFile() {
    if (source) { try { source.stop(); } catch (e) { /* already done */ } source = null; }
  }

  function playFile(file) {
    stopFile();
    const buf = buffers[file];
    if (!buf || !ctx) return;
    source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(musicBus);
    source.start();
  }

  // Fetch and decode once, then keep it. A failure is remembered so the
  // fallback takes over for good rather than retrying every frame.
  function loadFile(file, then) {
    if (buffers[file] || failed[file]) { then(); return; }
    const url = DD.MUSIC[file] || `sfx/${file}`;
    // Opened straight off disk there is nothing to fetch - a browser
    // blocks a file:// request from a file:// page - so do not ask and
    // spill a CORS error into everybody's console. The single-file build
    // carries the track as a data: URI and is fine either way.
    if (!/^data:/.test(url) && location.protocol === 'file:') {
      failed[file] = true;
      console.log(`[dojo] ${file} needs a server; using the synthesized track`);
      then();
      return;
    }
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
      .then((buf) => { buffers[file] = buf; then(); })
      .catch(() => {
        failed[file] = true;
        console.log(`[dojo] no music file ${url}, using the synthesized track`);
        then();
      });
  }

  // How long a note actually lasts: itself plus every `-` after it.
  function held(voice, i, spb) {
    let n = 1;
    while (voice[(i + n) % voice.length] === '-' && n < voice.length) n++;
    return n * spb;
  }

  let wanted = null;      // the track that should be playing
  let trackName = null;   // ...by name, for looking up its file
  let song = null;        // ...and the one that is
  let step = 0;
  let nextT = 0;
  let timer = null;
  const LOOKAHEAD = 0.15; // seconds of audio queued ahead of the clock
  const TICK = 30;        // ms between wake-ups; well inside the lookahead

  function voiceStep(name, tok, at, spb, voice, i) {
    if (tok === '.' || tok === '-') return;
    if (name === 'drum') {
      if (tok === 'x') { noise(0.11, 0.5, 160, at, musicBus); blip('sine', 130, 45, 0.11, 0.5, 0, at, musicBus); }
      else if (tok === 's') noise(0.09, 0.32, 1600, at, musicBus);
      else if (tok === 'h') noise(0.03, 0.13, 7000, at, musicBus);
      return;
    }
    const f = hz(tok);
    if (!f) return;
    const dur = held(voice, i, spb) * 0.92;
    if (name === 'lead') blip('square', f, f, dur, 0.20, 0, at, musicBus);
    else blip('triangle', f, f, dur, 0.30, 0, at, musicBus);
  }

  function scheduleStep(at) {
    const spb = 60 / song.bpm / 4;      // one sixteenth, in seconds
    for (const name of ['lead', 'bass', 'drum']) {
      const voice = song[name];
      if (!voice || !voice.length) continue;
      const i = step % voice.length;
      voiceStep(name, voice[i], at, spb, voice, i);
    }
  }

  function pump() {
    if (!ctx) return;
    if (wanted !== song) {          // a switch takes effect on the next step
      song = wanted;
      step = 0;
      nextT = Math.max(nextT, ctx.currentTime + 0.05);
    }
    if (!song || fileFor(trackName) || muted) return;
    const spb = 60 / song.bpm / 4;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + LOOKAHEAD) {
      if (!muted) scheduleStep(nextT);
      nextT += spb;
      step++;
    }
  }

  function startClock() {
    if (timer || !ctx) return;
    nextT = ctx.currentTime + 0.05;
    timer = setInterval(pump, TICK);
  }

  function stopClock() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // `music(name)` starts or switches a track; `music(null)` stops. Naming
  // the track that is already playing does nothing, so calling it every
  // frame from a game state is fine.
  function music(name) {
    const next = name ? SONGS[name] || null : null;
    if (next === wanted) return;
    wanted = next;
    trackName = next ? name : null;
    stopFile();
    if (!next) { song = null; stopClock(); return; }
    const file = fileFor(name);
    if (file && ctx) {
      // Start the pattern meanwhile, so a track that has to be fetched
      // does not leave a silent hole; the file takes over on arrival, and
      // if it never arrives the pattern simply keeps going.
      startClock();
      loadFile(file, () => {
        if (trackName !== name) return;         // switched away while loading
        if (buffers[file]) { stopClock(); song = null; playFile(file); }
      });
      return;
    }
    if (ctx) startClock();
  }

  DD.audio = {
    unlock,
    play: (name) => { if (sfx[name]) sfx[name](); },
    music,
    stageSong: (i) => STAGE_SONGS[i] || STAGE_SONGS[0],
    toggleMute: () => {
      muted = !muted;
      // The sequencer just stops scheduling, but a file is already
      // playing, so it needs the bus turned down.
      if (musicBus) musicBus.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    get muted() { return muted; },
    // What the game has asked for, which is a different question from
    // whether a note is sounding: a browser will not start an
    // AudioContext before the first keypress, and the answer here has to
    // be the same either way or the state wiring cannot be checked.
    get track() {
      return wanted ? Object.keys(SONGS).find((k) => SONGS[k] === wanted) : null;
    },
    get running() { return !!timer || !!source; },
    get fromFile() { return !!source; },
    SONGS,
  };
})();
