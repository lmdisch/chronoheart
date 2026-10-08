// Procedural audio: three synchronized era music layers + synthesized SFX (Web Audio, no files).

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A minor progression: Am - F - C - G (one chord per bar, 16 steps per bar)
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76];
// hand-authored melody (step -> scale index), 64 steps
const MELODY = {
  0: 5, 4: 4, 6: 3, 8: 4, 12: 2,
  16: 3, 20: 2, 22: 1, 24: 2, 28: 0,
  32: 1, 34: 2, 36: 4, 40: 5, 42: 6, 44: 5,
  48: 4, 52: 3, 54: 2, 56: 3, 60: 1,
};
const MELODY2 = { 2: 7, 10: 6, 18: 5, 26: 4, 34: 6, 38: 7, 46: 8, 50: 7, 58: 5, 62: 4 };

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.layerGain = [0, 0, 0];
    this.layerTarget = [0, 1, 0];
    this.musicOn = true;
    this.step = 0;
    this.tempo = 84;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.32;
    this.reverb.connect(this.revGain).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.55;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.layers = [0, 1, 2].map(() => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      return g;
    });
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);
    const sfxRev = ctx.createGain();
    sfxRev.gain.value = 0.25;
    this.sfxBus.connect(sfxRev).connect(this.reverb);

    this.noiseBuf = this.makeNoise();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  impulse(sec, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * sec;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  makeNoise() {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setEra(era, instant = false) {
    this.layerTarget = [0, 1, 2].map((i) => (i === era ? 1 : 0));
    if (instant) this.layerGain = [...this.layerTarget];
  }
  setMusicVolume(v) {
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  schedule() {
    const ctx = this.ctx;
    // fade layers
    for (let i = 0; i < 3; i++) {
      this.layerGain[i] += (this.layerTarget[i] - this.layerGain[i]) * 0.12;
      this.layers[i].gain.setTargetAtTime(this.layerGain[i] * (this.musicOn ? 1 : 0), ctx.currentTime, 0.05);
    }
    const stepDur = 60 / this.tempo / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const s = this.step % 64;
      for (let i = 0; i < 3; i++) if (this.layerGain[i] > 0.01 || this.layerTarget[i] > 0) this.playStep(i, s, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  // ---------------- instruments ----------------
  osc(type, freq, t, dur, gain, dest, { attack = 0.01, release = 0.1, detune = 0, filter = null, q = 1, vib = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setTargetAtTime(0, t + Math.max(attack, dur), release / 3);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      f.Q.value = q;
      node.connect(f);
      node = f;
    }
    if (vib) {
      const l = ctx.createOscillator();
      l.frequency.value = 5.5;
      const lg = ctx.createGain();
      lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + release + 0.1);
    }
    node.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + release + 0.1);
    return { o, g };
  }
  noise(t, dur, gain, dest, { type = 'highpass', freq = 6000, q = 0.7, attack = 0.002 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    return f;
  }
  drum(t, f0, f1, dur, gain, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  playStep(layer, s, t, sd) {
    const bar = Math.floor(s / 16);
    const bs = s % 16;
    const chord = CHORDS[bar];
    const root = ROOTS[bar];
    const dest = this.layers[layer];
    if (layer === 0) {
      // ANCIENT: tribal drums, shaker, drone, flute
      if ([0, 6, 8, 11, 14].includes(bs)) this.drum(t, bs === 0 || bs === 8 ? 110 : 160, 50, 0.35, bs === 0 ? 0.5 : 0.3, dest);
      if (bs % 2 === 1) this.noise(t, 0.06, 0.05, dest, { freq: 7000 });
      if (bs === 0) {
        this.osc('triangle', mtof(root - 12), t, sd * 15, 0.12, dest, { attack: 0.4, release: 0.6, filter: 600 });
        this.osc('triangle', mtof(root - 5), t, sd * 15, 0.06, dest, { attack: 0.6, release: 0.6, filter: 800 });
      }
      if (MELODY[s] !== undefined) this.osc('sine', mtof(PENTA[MELODY[s]] + 12), t, sd * 3, 0.13, dest, { attack: 0.06, release: 0.4, vib: 6 });
      if (MELODY[s] !== undefined) this.noise(t, 0.12, 0.015, dest, { type: 'bandpass', freq: mtof(PENTA[MELODY[s]] + 24), q: 4, attack: 0.03 });
    } else if (layer === 1) {
      // MEDIEVAL: lute arpeggio, string pad, recorder
      if (bs % 2 === 0) {
        const seq = [0, 1, 2, 1, 2, 0, 1, 2];
        const n = chord[seq[(bs / 2) % 8]] + (bs >= 8 ? 12 : 0);
        this.osc('triangle', mtof(n), t, 0.05, 0.12, dest, { attack: 0.003, release: 0.5, filter: 2600 });
        this.osc('sawtooth', mtof(n), t, 0.02, 0.03, dest, { attack: 0.002, release: 0.25, filter: 1800 });
      }
      if (bs === 0) {
        for (const n of chord) {
          this.osc('sawtooth', mtof(n), t, sd * 15, 0.025, dest, { attack: 0.8, release: 0.8, filter: 900, detune: -7 });
          this.osc('sawtooth', mtof(n), t, sd * 15, 0.025, dest, { attack: 0.8, release: 0.8, filter: 900, detune: 7 });
        }
        this.osc('triangle', mtof(root - 12), t, sd * 7, 0.12, dest, { attack: 0.02, release: 0.4, filter: 500 });
      }
      if (bs === 8) this.osc('triangle', mtof(root - 12 + 7), t, sd * 7, 0.08, dest, { attack: 0.02, release: 0.4, filter: 500 });
      if (MELODY2[s] !== undefined) this.osc('square', mtof(PENTA[MELODY2[s]] + 12), t, sd * 3.5, 0.035, dest, { attack: 0.05, release: 0.3, filter: 1800, vib: 4 });
    } else {
      // FUTURE: synth arp, sub bass, pad, hats, kick
      const arp = [0, 1, 2, 1];
      const n = chord[arp[bs % 4]] + 12 + (bs % 8 >= 4 ? 12 : 0);
      this.osc('sawtooth', mtof(n), t, sd * 0.6, 0.045, dest, { attack: 0.003, release: 0.12, filter: 1200 + 900 * Math.sin((s / 64) * Math.PI * 2) + 1000, q: 6 });
      if (bs % 4 === 0) {
        this.drum(t, 140, 40, 0.3, 0.45, dest);
        this.osc('sine', mtof(root - 12), t + 0.05, sd * 3, 0.2, dest, { attack: 0.04, release: 0.15 });
      }
      if (bs % 2 === 1) this.noise(t, 0.04, 0.05, dest, { freq: 9000 });
      if (bs === 4 || bs === 12) this.noise(t, 0.18, 0.08, dest, { type: 'bandpass', freq: 1800, q: 0.8 });
      if (bs === 0)
        for (const m of chord) {
          for (const d of [-12, 0, 12]) this.osc('sawtooth', mtof(m + 12), t, sd * 15, 0.012, dest, { attack: 0.5, release: 1.0, filter: 1400, detune: d });
        }
      if (MELODY[s] !== undefined && bar % 2 === 1) this.osc('square', mtof(PENTA[MELODY[s]] + 12), t, sd * 2.5, 0.03, dest, { attack: 0.01, release: 0.4, filter: 2500, vib: 3 });
    }
  }

  // ---------------- SFX ----------------
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, d = this.sfxBus;
    switch (name) {
      case 'jump':
        this.osc('square', 300, t, 0.06, 0.06, d, { filter: 2000 }).o.frequency.exponentialRampToValueAtTime(620, t + 0.1);
        break;
      case 'land':
        this.noise(t, 0.08, 0.12, d, { type: 'lowpass', freq: 500 });
        break;
      case 'step':
        this.noise(t, 0.04, 0.03, d, { type: 'bandpass', freq: 900 + Math.random() * 400, q: 2 });
        break;
      case 'roll':
        this.noise(t, 0.25, 0.08, d, { type: 'bandpass', freq: 600, q: 1 });
        break;
      case 'swing':
        this.noise(t, 0.12, 0.12, d, { type: 'bandpass', freq: 2200, q: 1.5 });
        break;
      case 'hit':
        this.noise(t, 0.12, 0.25, d, { type: 'lowpass', freq: 1800 });
        this.drum(t, 220, 80, 0.12, 0.3, d);
        break;
      case 'hurt':
        this.osc('sawtooth', 300, t, 0.15, 0.12, d, { filter: 1500 }).o.frequency.exponentialRampToValueAtTime(120, t + 0.2);
        break;
      case 'enemyDie':
        this.noise(t, 0.3, 0.2, d, { type: 'lowpass', freq: 1200 });
        [600, 450, 300].forEach((f, i) => this.osc('square', f, t + i * 0.05, 0.05, 0.05, d, { filter: 2000 }));
        break;
      case 'shift': {
        const era = opt.era ?? 1;
        const base = [57, 64, 69][era];
        const f = this.noise(t, 0.6, 0.18, d, { type: 'bandpass', freq: 400, q: 3, attack: 0.05 });
        f.frequency.exponentialRampToValueAtTime(5000, t + 0.5);
        [0, 7, 12, 19].forEach((iv, i) => this.osc('sine', mtof(base + iv + 12), t + 0.08 + i * 0.05, 0.05, 0.08, d, { release: 1.2 }));
        this.osc('triangle', mtof(base - 12), t, 0.2, 0.12, d, { release: 0.6 });
        break;
      }
      case 'blocked':
        this.osc('square', 1400, t, 0.02, 0.06, d, { filter: 3000 });
        this.osc('square', 1000, t + 0.12, 0.02, 0.06, d, { filter: 3000 });
        this.osc('sawtooth', 110, t, 0.2, 0.08, d, { filter: 400 });
        break;
      case 'glitch':
        // a burst of digital static and a stuttering clock tick
        this.noise(t, 0.12, 0.05, d, { type: 'bandpass', freq: 2400 + Math.random() * 2400, q: 6 });
        this.osc('square', 180 + Math.random() * 120, t, 0.03, 0.04, d, { attack: 0.002, filter: 1400, release: 0.04 });
        this.osc('square', 2600, t + 0.05, 0.02, 0.02, d, { attack: 0.002, filter: 5000, release: 0.02 });
        break;
      case 'tick':
        this.osc('square', 2000, t, 0.01, 0.03, d, { filter: 4000, release: 0.03 });
        break;
      case 'snap':
        this.noise(t, 0.5, 0.2, d, { type: 'lowpass', freq: 800 });
        this.osc('sine', 880, t, 0.3, 0.1, d, { release: 0.5 }).o.frequency.exponentialRampToValueAtTime(220, t + 0.4);
        break;
      case 'pickup':
        [72, 76, 79, 84].forEach((m, i) => this.osc('triangle', mtof(m), t + i * 0.06, 0.08, 0.1, d, { release: 0.3 }));
        break;
      case 'cog':
        [84, 88, 91, 96, 100].forEach((m, i) => this.osc('sine', mtof(m), t + i * 0.04, 0.05, 0.08, d, { release: 0.5 }));
        break;
      case 'key':
        [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.osc('triangle', mtof(m), t + i * 0.08, 0.2, 0.09, d, { release: 0.8 }));
        [48, 55].forEach((m) => this.osc('sawtooth', mtof(m), t, 0.9, 0.04, d, { filter: 900, attack: 0.1, release: 0.8 }));
        break;
      case 'lever':
        this.drum(t, 180, 60, 0.15, 0.35, d);
        this.noise(t + 0.05, 0.2, 0.12, d, { type: 'bandpass', freq: 700, q: 2 });
        break;
      case 'push':
        this.noise(t, 0.3, 0.1, d, { type: 'lowpass', freq: 300 });
        break;
      case 'splash':
        this.noise(t, 0.4, 0.2, d, { type: 'bandpass', freq: 1200, q: 0.8 });
        break;
      case 'talk':
        this.osc('square', 300 + (opt.pitch || 0) + Math.random() * 60, t, 0.025, 0.03, d, { filter: 2200, release: 0.03 });
        break;
      case 'ui':
        this.osc('triangle', 880, t, 0.03, 0.06, d, { release: 0.1 });
        break;
      case 'checkpoint':
        [67, 71, 74, 79].forEach((m, i) => this.osc('sine', mtof(m), t + i * 0.09, 0.15, 0.08, d, { release: 1.0 }));
        break;
      case 'heal':
        [72, 79].forEach((m, i) => this.osc('sine', mtof(m), t + i * 0.08, 0.1, 0.08, d, { release: 0.4 }));
        break;
      case 'gate':
        this.noise(t, 0.9, 0.25, d, { type: 'lowpass', freq: 600 });
        for (let i = 0; i < 6; i++) this.osc('square', 140 - i * 8, t + i * 0.08, 0.03, 0.05, d, { filter: 800 });
        this.drum(t + 0.5, 90, 40, 0.5, 0.5, d);
        break;
      case 'crush':
        this.noise(t, 0.8, 0.35, d, { type: 'lowpass', freq: 2000 });
        this.drum(t, 120, 30, 0.6, 0.6, d);
        break;
      case 'grow':
        [57, 60, 64, 69, 72, 76].forEach((m, i) => this.osc('sine', mtof(m), t + i * 0.1, 0.2, 0.06, d, { release: 0.8 }));
        break;
      case 'bell':
        [0, 0.01].forEach((dt, k) => {
          [1, 2.76, 5.4].forEach((h, i) => this.osc('sine', 220 * h * (k ? 1.003 : 1), t + dt, 0.05, 0.12 / (i + 1), d, { release: 3.5 }));
        });
        break;
      case 'socket':
        [64, 71, 76].forEach((m, i) => this.osc('triangle', mtof(m), t + i * 0.07, 0.15, 0.09, d, { release: 0.9 }));
        break;
      case 'fanfare':
        [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach((ch, i) =>
          ch.forEach((m) => this.osc('sawtooth', mtof(m), t + i * 0.4, 0.35, 0.035, d, { filter: 2400, attack: 0.03, release: 0.8 })),
        );
        break;
      default:
        break;
    }
  }
}

export const audio = new AudioEngine();
