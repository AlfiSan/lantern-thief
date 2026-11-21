// Lantern Thief — procedural sound, all synthesized with WebAudio.
// No audio files: footsteps, pebble ticks, lantern chimes, the alarm sting
// and the win/lose motifs are all built from oscillators and noise.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let lastStep = 0;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.12, when = 0, slideTo = null) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, gain = 0.1, filterFreq = 1200, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },

    step(sneaking) {
      const now = performance.now();
      if (now - lastStep < (sneaking ? 420 : 260)) return;
      lastStep = now;
      noise(0.07, sneaking ? 0.02 : 0.05, 700);
    },
    pebble() { noise(0.05, 0.12, 2600); tone(1400, 0.05, 'triangle', 0.05); },
    pebbleLand() { tone(950, 0.09, 'triangle', 0.09, 0, 620); noise(0.08, 0.08, 1800); },
    lantern() {
      tone(880, 0.35, 'sine', 0.12);
      tone(1318, 0.45, 'sine', 0.09, 0.07);
      tone(1760, 0.5, 'sine', 0.05, 0.14);
    },
    suspicious() { tone(392, 0.18, 'triangle', 0.1, 0, 466); },
    alarm() {
      tone(220, 0.22, 'sawtooth', 0.12, 0, 330);
      tone(330, 0.22, 'sawtooth', 0.12, 0.2, 220);
      tone(220, 0.3, 'sawtooth', 0.12, 0.4, 330);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.14, 0, 98);
      tone(147, 0.8, 'sawtooth', 0.14, 0.35, 73);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'sine', 0.11, i * 0.12));
    },
    click() { tone(660, 0.06, 'triangle', 0.07); },
  };
}
