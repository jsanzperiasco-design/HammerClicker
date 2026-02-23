/* ═══════════════════════════════════════════════════════
   animationEngine.js — Keyframe Animation System
   SRP: Interpolate properties over time with easing,
        chaining, priorities, and interruption.
   ═══════════════════════════════════════════════════════ */

/* ── Easing Library ── */
export const Easing = {
  linear:       t => t,
  inQuad:       t => t * t,
  outQuad:      t => 1 - (1 - t) ** 2,
  inOutQuad:    t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  inCubic:      t => t ** 3,
  outCubic:     t => 1 - (1 - t) ** 3,
  inOutCubic:   t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  outBack:      t => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  outElastic:   t => { if (t === 0 || t === 1) return t; return 2 ** (-10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1; },
  outBounce:    t => { const n1 = 7.5625, d1 = 2.75; if (t < 1/d1) return n1*t*t; if (t < 2/d1) return n1*(t-=1.5/d1)*t+.75; if (t < 2.5/d1) return n1*(t-=2.25/d1)*t+.9375; return n1*(t-=2.625/d1)*t+.984375; },
  inExpo:       t => t === 0 ? 0 : 2 ** (10 * t - 10),
  outExpo:      t => t === 1 ? 1 : 1 - 2 ** (-10 * t),
};

/** Resolve easing — string name or function */
function resolveEasing(e) {
  if (typeof e === 'function') return e;
  return Easing[e] || Easing.outCubic;
}

/* ── Active Animations ── */
const _anims = [];
let _nextId = 0;

/**
 * Play a keyframe animation.
 *
 * @param {Object} config
 * @param {HTMLElement}   config.target     — DOM element to animate (style mutations)
 * @param {Object[]}      config.keyframes  — Array of {prop: value} objects
 * @param {number}        config.duration   — ms
 * @param {string|Function} [config.easing] — easing name or function
 * @param {number}        [config.delay]    — ms before start
 * @param {number}        [config.priority] — higher = can interrupt lower (default 0)
 * @param {Function}      [config.onUpdate] — (progress, interpolated) => void
 * @param {Function}      [config.onComplete] — () => void
 * @param {string}        [config.tag]      — named tag for interruption
 * @returns {number} animation id
 *
 * @example
 * AnimationEngine.play({
 *   target: hammerEl,
 *   keyframes: [
 *     { scaleX: 1, scaleY: 1, rotate: 0 },
 *     { scaleX: .88, scaleY: .88, rotate: -28 },
 *     { scaleX: 1.03, scaleY: 1.03, rotate: 0 }
 *   ],
 *   duration: 140,
 *   easing: 'outCubic'
 * });
 */
export const AnimationEngine = {
  play(config) {
    const id = _nextId++;
    const ease = resolveEasing(config.easing);
    const kf = config.keyframes;
    const dur = config.duration || 300;
    const delay = config.delay || 0;
    const priority = config.priority || 0;
    const tag = config.tag || null;

    // Interrupt same-tag animations of lower/equal priority
    if (tag) {
      for (let i = _anims.length - 1; i >= 0; i--) {
        if (_anims[i].tag === tag && _anims[i].priority <= priority) {
          _anims.splice(i, 1);
        }
      }
    }

    _anims.push({
      id, target: config.target, kf, dur, delay, ease, priority, tag,
      onUpdate: config.onUpdate || null,
      onComplete: config.onComplete || null,
      elapsed: 0,
      started: false
    });
    return id;
  },

  /** Chain: play animations sequentially */
  chain(configs) {
    let totalDelay = 0;
    configs.forEach(c => {
      c.delay = (c.delay || 0) + totalDelay;
      this.play(c);
      totalDelay += (c.delay || 0) + (c.duration || 300);
    });
  },

  /** Cancel animation by id */
  cancel(id) {
    const idx = _anims.findIndex(a => a.id === id);
    if (idx !== -1) _anims.splice(idx, 1);
  },

  /** Cancel all animations with a given tag */
  cancelTag(tag) {
    for (let i = _anims.length - 1; i >= 0; i--) {
      if (_anims[i].tag === tag) _anims.splice(i, 1);
    }
  },

  /** Update all active animations (call from game loop) */
  update(dtMs) {
    for (let i = _anims.length - 1; i >= 0; i--) {
      const a = _anims[i];
      a.elapsed += dtMs;

      if (a.elapsed < a.delay) continue;
      a.started = true;

      const localTime = a.elapsed - a.delay;
      const rawProgress = Math.min(localTime / a.dur, 1);
      const easedProgress = a.ease(rawProgress);

      // Interpolate keyframes
      const segCount = a.kf.length - 1;
      const segFloat = easedProgress * segCount;
      const segIdx = Math.min(Math.floor(segFloat), segCount - 1);
      const segT = segFloat - segIdx;

      const from = a.kf[segIdx];
      const to = a.kf[Math.min(segIdx + 1, segCount)];
      const interp = {};

      for (const prop of Object.keys(from)) {
        if (typeof from[prop] === 'number' && typeof to[prop] === 'number') {
          interp[prop] = from[prop] + (to[prop] - from[prop]) * segT;
        } else {
          interp[prop] = rawProgress >= 1 ? to[prop] : from[prop];
        }
      }

      // Apply transform if target exists
      if (a.target) {
        const sx = interp.scaleX ?? interp.scale ?? 1;
        const sy = interp.scaleY ?? interp.scale ?? 1;
        const rot = interp.rotate ?? 0;
        const tx = interp.translateX ?? 0;
        const ty = interp.translateY ?? 0;
        a.target.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy}) rotate(${rot}deg)`;

        if (interp.opacity !== undefined) a.target.style.opacity = interp.opacity;
      }

      if (a.onUpdate) a.onUpdate(rawProgress, interp);

      // Complete
      if (rawProgress >= 1) {
        if (a.onComplete) a.onComplete();
        _anims.splice(i, 1);
      }
    }
  },

  /** Number of active animations */
  get activeCount() { return _anims.length; },

  /** Expose easing library */
  Easing
};
