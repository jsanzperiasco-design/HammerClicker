/* ═══════════════════════════════════════════════════════
   audioEngine.js — Web Audio Synthesizer
   SRP: Sound effect generation, volume control, ducking
   ═══════════════════════════════════════════════════════ */

let _ctx = null;
let _muted = false;
let _masterGain = null;

/** Lazy-init AudioContext (must be called after user gesture) */
function ensureContext() {
  if (_ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    _ctx = new AC();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 0.5;
    _masterGain.connect(_ctx.destination);
    return true;
  } catch (e) {
    console.warn('AudioEngine: Web Audio not available');
    return false;
  }
}

/** Resume context if suspended (autoplay policy) */
function resumeIfNeeded() {
  if (_ctx && _ctx.state === 'suspended') _ctx.resume();
}

/**
 * Create oscillator + gain pair connected to master
 * @returns {{ osc: OscillatorNode, gain: GainNode, t: number }}
 */
function makeOsc(type, freq) {
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, _ctx.currentTime);
  o.connect(g);
  g.connect(_masterGain);
  return { osc: o, gain: g, t: _ctx.currentTime };
}

/* ── Sound Definitions ── */
const _sounds = {
  click(t) {
    const { osc, gain } = makeOsc('sine', 700);
    osc.frequency.exponentialRampToValueAtTime(350, t + .08);
    gain.gain.setValueAtTime(.12, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .08);
    osc.start(t); osc.stop(t + .08);
  },

  crit(t) {
    const { osc: o1, gain: g1 } = makeOsc('sawtooth', 250);
    o1.frequency.exponentialRampToValueAtTime(1200, t + .12);
    g1.gain.setValueAtTime(.14, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .18);
    o1.start(t); o1.stop(t + .18);

    const { osc: o2, gain: g2 } = makeOsc('sine', 800);
    o2.frequency.exponentialRampToValueAtTime(1600, t + .15);
    g2.gain.setValueAtTime(.06, t + .05);
    g2.gain.exponentialRampToValueAtTime(.001, t + .2);
    o2.start(t + .05); o2.stop(t + .2);
  },

  super(t) {
    const { osc: o1, gain: g1 } = makeOsc('sawtooth', 150);
    o1.frequency.exponentialRampToValueAtTime(2000, t + .2);
    g1.gain.setValueAtTime(.15, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .3);
    o1.start(t); o1.stop(t + .3);

    const { osc: o2, gain: g2 } = makeOsc('square', 900);
    o2.frequency.exponentialRampToValueAtTime(2200, t + .2);
    g2.gain.setValueAtTime(.05, t + .08);
    g2.gain.exponentialRampToValueAtTime(.001, t + .25);
    o2.start(t + .08); o2.stop(t + .25);
  },

  ultra(t) {
    const { osc: o1, gain: g1 } = makeOsc('sawtooth', 100);
    o1.frequency.exponentialRampToValueAtTime(2400, t + .25);
    g1.gain.setValueAtTime(.16, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .4);
    o1.start(t); o1.stop(t + .4);

    const types = ['sine', 'square', 'triangle'];
    for (let i = 0; i < 3; i++) {
      const { osc: ox, gain: gx } = makeOsc(types[i], 600 + i * 400);
      ox.frequency.exponentialRampToValueAtTime(1800 + i * 300, t + .2 + .05 * i);
      gx.gain.setValueAtTime(.04, t + .05 * i);
      gx.gain.exponentialRampToValueAtTime(.001, t + .35);
      ox.start(t + .05 * i); ox.stop(t + .35);
    }
  },

  buy(t) {
    const { osc, gain } = makeOsc('triangle', 400);
    osc.frequency.exponentialRampToValueAtTime(900, t + .12);
    gain.gain.setValueAtTime(.09, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .15);
    osc.start(t); osc.stop(t + .15);
  },

  buyHigh(t) {
    const { osc: o1, gain: g1 } = makeOsc('sine', 300);
    o1.frequency.exponentialRampToValueAtTime(800, t + .1);
    o1.frequency.exponentialRampToValueAtTime(1200, t + .2);
    g1.gain.setValueAtTime(.12, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .3);
    o1.start(t); o1.stop(t + .3);

    const { osc: o2, gain: g2 } = makeOsc('sine', 600);
    o2.frequency.exponentialRampToValueAtTime(1600, t + .25);
    g2.gain.setValueAtTime(.07, t + .05);
    g2.gain.exponentialRampToValueAtTime(.001, t + .35);
    o2.start(t + .05); o2.stop(t + .35);
  },

  milestone(t) {
    const { osc, gain } = makeOsc('sine', 500);
    osc.frequency.exponentialRampToValueAtTime(1000, t + .15);
    osc.frequency.setValueAtTime(800, t + .2);
    osc.frequency.exponentialRampToValueAtTime(1400, t + .4);
    gain.gain.setValueAtTime(.14, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .5);
    osc.start(t); osc.stop(t + .5);
  },

  fury(t) {
    const { osc, gain } = makeOsc('sawtooth', 120);
    osc.frequency.exponentialRampToValueAtTime(500, t + .25);
    osc.frequency.exponentialRampToValueAtTime(120, t + .5);
    gain.gain.setValueAtTime(.13, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .55);
    osc.start(t); osc.stop(t + .55);
  },

  prestige(t) {
    const { osc, gain } = makeOsc('sine', 300);
    osc.frequency.exponentialRampToValueAtTime(600, t + .2);
    osc.frequency.exponentialRampToValueAtTime(1200, t + .4);
    osc.frequency.exponentialRampToValueAtTime(1800, t + .6);
    gain.gain.setValueAtTime(.15, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .7);
    osc.start(t); osc.stop(t + .7);
  },

  golden(t) {
    const { osc: o1, gain: g1 } = makeOsc('sine', 800);
    o1.frequency.exponentialRampToValueAtTime(1200, t + .1);
    o1.frequency.setValueAtTime(1000, t + .15);
    o1.frequency.exponentialRampToValueAtTime(1500, t + .3);
    g1.gain.setValueAtTime(.12, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .4);
    o1.start(t); o1.stop(t + .4);
  },

  // Enhanced metallic tap — short punchy transient + overtone (60ms)
  metalTap(t) {
    const { osc, gain } = makeOsc('square', 1200);
    osc.frequency.exponentialRampToValueAtTime(400, t + .04);
    gain.gain.setValueAtTime(.08, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .06);
    osc.start(t); osc.stop(t + .06);
    const { osc: o2, gain: g2 } = makeOsc('sine', 3200);
    o2.frequency.exponentialRampToValueAtTime(1800, t + .03);
    g2.gain.setValueAtTime(.04, t);
    g2.gain.exponentialRampToValueAtTime(.001, t + .04);
    o2.start(t); o2.stop(t + .04);
  },

  // Deep impact — bass punch + harmonics + chime (250ms, for crits)
  deepImpact(t) {
    const { osc: o1, gain: g1 } = makeOsc('sine', 80);
    o1.frequency.exponentialRampToValueAtTime(40, t + .15);
    g1.gain.setValueAtTime(.16, t);
    g1.gain.exponentialRampToValueAtTime(.001, t + .25);
    o1.start(t); o1.stop(t + .25);
    const { osc: o2, gain: g2 } = makeOsc('sawtooth', 300);
    o2.frequency.exponentialRampToValueAtTime(1400, t + .1);
    g2.gain.setValueAtTime(.08, t);
    g2.gain.exponentialRampToValueAtTime(.001, t + .2);
    o2.start(t); o2.stop(t + .2);
    const { osc: o3, gain: g3 } = makeOsc('sine', 1200);
    o3.frequency.exponentialRampToValueAtTime(2000, t + .15);
    g3.gain.setValueAtTime(.04, t + .05);
    g3.gain.exponentialRampToValueAtTime(.001, t + .25);
    o3.start(t + .05); o3.stop(t + .25);
  },

  // Epic milestone fanfare — rising chord C-E-G-C + shimmer + bass (800ms)
  epicMilestone(t) {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const { osc, gain } = makeOsc('sine', freq);
      osc.frequency.setValueAtTime(freq, t + i * .1);
      gain.gain.setValueAtTime(0, t + i * .1);
      gain.gain.linearRampToValueAtTime(.1, t + i * .1 + .05);
      gain.gain.exponentialRampToValueAtTime(.001, t + .8);
      osc.start(t + i * .1); osc.stop(t + .8);
    });
    const { osc: os, gain: gs } = makeOsc('triangle', 2000);
    os.frequency.exponentialRampToValueAtTime(4000, t + .6);
    gs.gain.setValueAtTime(.03, t + .2);
    gs.gain.exponentialRampToValueAtTime(.001, t + .7);
    os.start(t + .2); os.stop(t + .7);
    const { osc: ob, gain: gb } = makeOsc('sine', 60);
    ob.frequency.exponentialRampToValueAtTime(30, t + .3);
    gb.gain.setValueAtTime(.14, t);
    gb.gain.exponentialRampToValueAtTime(.001, t + .4);
    ob.start(t); ob.stop(t + .4);
  },

  // Ground hit thud — low sine drop (150ms)
  groundHit(t) {
    const { osc, gain } = makeOsc('sine', 100);
    osc.frequency.exponentialRampToValueAtTime(35, t + .1);
    gain.gain.setValueAtTime(.1, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .15);
    osc.start(t); osc.stop(t + .15);
  }
};

/* ── Public API ── */
export const AudioEngine = {
  /** Initialize (call on first user interaction) */
  init() {
    ensureContext();
  },

  /** Play a named sound effect */
  play(name) {
    if (_muted || !ensureContext()) return;
    resumeIfNeeded();
    try {
      if (_sounds[name]) _sounds[name](_ctx.currentTime);
    } catch (e) {
      // Silently fail — audio should never break gameplay
    }
  },

  /** Set muted state */
  setMuted(muted) {
    _muted = muted;
    if (_masterGain) _masterGain.gain.value = muted ? 0 : 0.5;
  },

  /** Get muted state */
  get isMuted() { return _muted; },

  /** Toggle mute */
  toggleMute() {
    this.setMuted(!_muted);
    return _muted;
  }
};
