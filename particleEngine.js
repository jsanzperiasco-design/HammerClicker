/* ═══════════════════════════════════════════════════════
   particleEngine.js — Canvas VFX System with Pooling
   SRP: All visual particles, shockwaves, lightning,
        text popups, speed lines, embers, fireworks, trails.
   ═══════════════════════════════════════════════════════ */

import { Easing } from './animationEngine.js';

/* ── Performance Budgets ── */
const IS_MOBILE = /Mobi|Android/i.test(navigator.userAgent);
const BUDGET = {
  sparks:     IS_MOBILE ? 120 : 300,
  shockwaves: 20,
  lightnings: 15,
  texts:      50,
  speedLines: 30,
  embers:     IS_MOBILE ? 40 : 120,
  orbs:       12
};

/* ── VFX Storage ── */
const pools = {
  sparks: [], shockwaves: [], lightnings: [],
  texts: [], speedLines: [], embers: [], orbs: []
};

/** Add to pool with budget eviction */
function poolAdd(type, obj) {
  const arr = pools[type];
  if (arr.length >= BUDGET[type]) arr.shift();
  arr.push(obj);
}

/* ── Shape Helpers ── */
function drawStar(c, x, y, r, pts) {
  c.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i * Math.PI) / pts - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * .4;
    if (i === 0) c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    else c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath(); c.fill();
}

/* ═══ PARTICLE TYPES ═══ */

/** Spark particle (circle, star, diamond, line) */
function mkSpark(x, y, vx, vy, color, size, life, grav, type) {
  return {
    x, y, vx, vy, color, size, life, maxLife: life,
    grav: grav ?? 400, type: type || 'circle',
    rot: Math.random() * 6.28, rs: (Math.random() - .5) * 8, dead: false,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.grav * dt;
      this.vx *= .995;
      this.rot += this.rs * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    draw(c) {
      const a = Math.max(0, this.life / this.maxLife);
      const s = this.size * (.3 + a * .7);
      c.save(); c.globalAlpha = a;
      c.translate(this.x, this.y); c.rotate(this.rot);
      c.fillStyle = this.color; c.shadowColor = this.color; c.shadowBlur = s * 2.5;
      if (this.type === 'star') { drawStar(c, 0, 0, s, 5); }
      else if (this.type === 'spark') {
        c.strokeStyle = this.color; c.lineWidth = Math.max(.5, s * .35);
        c.lineCap = 'round'; c.beginPath(); c.moveTo(-s * 1.5, 0); c.lineTo(s * 1.5, 0); c.stroke();
      }
      else if (this.type === 'diamond') {
        c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .6, 0); c.lineTo(0, s); c.lineTo(-s * .6, 0); c.closePath(); c.fill();
      }
      else { c.beginPath(); c.arc(0, 0, s, 0, 6.28); c.fill(); }
      c.restore();
    }
  };
}

/** Expanding shockwave ring */
function mkShockwave(x, y, maxR, dur, color, lw) {
  return {
    x, y, maxR, dur, color: color || '#f59e0b', lw: lw || 3,
    t: 0, dead: false,
    update(dt) { this.t += dt; if (this.t >= this.dur) this.dead = true; },
    draw(c) {
      const p = this.t / this.dur;
      const r = this.maxR * Easing.outCubic(p);
      const a = (1 - p) * .7;
      const w = this.lw * (1 - p);
      c.save(); c.globalAlpha = a;
      c.strokeStyle = this.color; c.lineWidth = w;
      c.shadowColor = this.color; c.shadowBlur = 8;
      c.beginPath(); c.arc(this.x, this.y, r, 0, 6.28); c.stroke();
      c.restore();
    }
  };
}

/** Procedural branching lightning */
function mkLightning(x1, y1, x2, y2, color, life) {
  const segs = [];
  function gen(ax, ay, bx, by, d) {
    if (d === 0) { segs.push({ x1: ax, y1: ay, x2: bx, y2: by }); return; }
    const mx = (ax + bx) / 2 + (Math.random() - .5) * 50;
    const my = (ay + by) / 2 + (Math.random() - .5) * 50;
    gen(ax, ay, mx, my, d - 1); gen(mx, my, bx, by, d - 1);
    if (d >= 2 && Math.random() < .3) {
      gen(mx, my, mx + (Math.random() - .5) * 80, my + (Math.random() - .5) * 80, d - 2);
    }
  }
  gen(x1, y1, x2, y2, 4);
  return {
    segs, color: color || '#f59e0b', life, maxLife: life, dead: false,
    update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; },
    draw(c) {
      const a = Math.max(0, this.life / this.maxLife);
      c.save(); c.globalAlpha = a;
      c.strokeStyle = this.color; c.lineWidth = 2 + a * 2;
      c.shadowColor = this.color; c.shadowBlur = 15; c.lineCap = 'round';
      c.beginPath();
      this.segs.forEach((s, i) => { if (i === 0) c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); });
      c.stroke();
      // Inner white core
      c.lineWidth = 1; c.strokeStyle = '#fff'; c.globalAlpha = a * .6;
      c.beginPath();
      this.segs.forEach((s, i) => { if (i === 0) c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); });
      c.stroke();
      c.restore();
    }
  };
}

/** Radial speed/impact line */
function mkSpeedLine(cx, cy, ang, len, color, life) {
  return {
    cx, cy, ang, len, color, life, maxLife: life, innerR: 40, dead: false,
    update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; },
    draw(c) {
      const a = Math.max(0, this.life / this.maxLife);
      const t = 1 - a;
      const r1 = this.innerR + t * 20;
      const r2 = r1 + this.len * Easing.outCubic(Math.min(t + .3, 1));
      c.save(); c.globalAlpha = a * .55;
      c.strokeStyle = this.color; c.lineWidth = 2.5 * a; c.lineCap = 'round';
      c.shadowColor = this.color; c.shadowBlur = 6;
      c.beginPath();
      c.moveTo(this.cx + Math.cos(this.ang) * r1, this.cy + Math.sin(this.ang) * r1);
      c.lineTo(this.cx + Math.cos(this.ang) * r2, this.cy + Math.sin(this.ang) * r2);
      c.stroke(); c.restore();
    }
  };
}

/** Canvas floating text popup */
function mkTextPop(x, y, text, size, color, dur, isCrit) {
  return {
    x, y, text, size, color, dur, maxDur: dur,
    vy: isCrit ? -200 : -130, vx: (Math.random() - .5) * 50,
    sc: isCrit ? .3 : .7, targetSc: isCrit ? 1.5 : 1, dead: false,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy *= .97;
      this.dur -= dt;
      const t = 1 - this.dur / this.maxDur;
      if (t < .15) this.sc = this.targetSc * Easing.outBack(t / .15);
      if (this.dur <= 0) this.dead = true;
    },
    draw(c) {
      const a = Math.max(0, Math.min(1, this.dur / this.maxDur * 2.5));
      c.save(); c.globalAlpha = a;
      c.translate(this.x, this.y); c.scale(this.sc, this.sc);
      c.font = `900 ${this.size}px 'Orbitron',monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(this.text, 2, 2);
      c.fillStyle = this.color; c.shadowColor = this.color; c.shadowBlur = 14;
      c.fillText(this.text, 0, 0);
      c.restore();
    }
  };
}

/** Multi-particle firework burst */
function mkFirework(x, y, colors) {
  const parts = [];
  const cnt = 35 + Math.random() * 30;
  for (let i = 0; i < cnt; i++) {
    const ang = (6.28 / cnt) * i + (Math.random() - .5) * .3;
    const spd = 100 + Math.random() * 220;
    const col = colors[Math.floor(Math.random() * colors.length)];
    const tp = Math.random() > .6 ? 'star' : Math.random() > .5 ? 'diamond' : 'circle';
    parts.push(mkSpark(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, col, 2 + Math.random() * 5, .7 + Math.random() * .9, 180, tp));
  }
  return {
    parts, dead: false,
    update(dt) { this.parts.forEach(p => p.update(dt)); this.parts = this.parts.filter(p => !p.dead); if (!this.parts.length) this.dead = true; },
    draw(c) { this.parts.forEach(p => p.draw(c)); }
  };
}

/* ── Mouse Trail State ── */
let trailPts = [];

/* ═══ PUBLIC API ═══ */
export const ParticleEngine = {
  /** Reference to canvas + context (set during init) */
  canvas: null,
  ctx: null,

  /** Initialize with canvas element */
  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  /** Spawn spark particles */
  emitSparks(x, y, count, colors, opts = {}) {
    const spd = opts.speed || 140, sv = opts.speedVar || 90;
    const sz = opts.size || 3, szv = opts.sizeVar || 3;
    const l = opts.life || .5, lv = opts.lifeVar || .35;
    const g = opts.gravity ?? 400;
    const tp = opts.type;
    for (let i = 0; i < count; i++) {
      const ang = (6.28 / count) * i + (Math.random() - .5) * .6;
      const sp = spd + Math.random() * sv;
      const col = colors[Math.floor(Math.random() * colors.length)];
      const t = tp || (Math.random() > .65 ? 'star' : Math.random() > .5 ? 'spark' : 'circle');
      poolAdd('sparks', mkSpark(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, col, sz + Math.random() * szv, l + Math.random() * lv, g, t));
    }
  },

  /** Spawn shockwave(s) by type */
  emitShockwave(x, y, type) {
    if (type === 'ultra') {
      poolAdd('shockwaves', mkShockwave(x, y, 280, .7, '#ec4899', 4));
      setTimeout(() => poolAdd('shockwaves', mkShockwave(x, y, 350, .85, '#8b5cf6', 3)), 80);
      setTimeout(() => poolAdd('shockwaves', mkShockwave(x, y, 400, .95, '#06b6d4', 2)), 160);
    } else if (type === 'super') {
      poolAdd('shockwaves', mkShockwave(x, y, 220, .65, '#ef4444', 3.5));
      setTimeout(() => poolAdd('shockwaves', mkShockwave(x, y, 300, .8, '#f59e0b', 2.5)), 100);
    } else if (type === 'crit') {
      poolAdd('shockwaves', mkShockwave(x, y, 180, .6, '#ef4444', 3));
    } else {
      poolAdd('shockwaves', mkShockwave(x, y, 100, .45, '#f59e0b', 2));
    }
  },

  /** Spawn lightning bolt(s) */
  emitLightning(x1, y1, x2, y2, color, life) {
    poolAdd('lightnings', mkLightning(x1, y1, x2, y2, color, life || .3));
  },

  /** Spawn radial speed lines */
  emitSpeedLines(cx, cy, count, colors) {
    for (let i = 0; i < count; i++) {
      const ang = (6.28 / count) * i + (Math.random() - .5) * .3;
      const col = colors[Math.floor(Math.random() * colors.length)];
      poolAdd('speedLines', mkSpeedLine(cx, cy, ang, 60 + Math.random() * 80, col, .35 + Math.random() * .2));
    }
  },

  /** Spawn floating text popup */
  emitText(x, y, text, size, color, dur, isCrit) {
    poolAdd('texts', mkTextPop(x, y, text, size, color, dur || 1, isCrit));
  },

  /** Spawn ember (rising fire particle) */
  emitEmber(x, y, color) {
    poolAdd('embers', mkSpark(
      x, y, (Math.random() - .5) * 30, -(90 + Math.random() * 140),
      color, 2 + Math.random() * 4, 2 + Math.random() * 3, -15,
      Math.random() > .5 ? 'circle' : 'spark'
    ));
  },

  /** Spawn firework burst */
  emitFirework(x, y, colors) {
    poolAdd('sparks', mkFirework(x, y, colors));
  },

  /** Spawn confetti burst (for ad rewards & celebrations) */
  emitConfetti(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * 6.28;
      const spd = 80 + Math.random() * 200;
      const col = colors[Math.floor(Math.random() * colors.length)];
      poolAdd('sparks', mkSpark(
        x + (Math.random() - .5) * 80,
        y + (Math.random() - .5) * 50,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 120,
        col, 3 + Math.random() * 5,
        1.5 + Math.random() * 1.5, 130,
        Math.random() > .5 ? 'diamond' : 'star'
      ));
    }
  },

  /** Spawn golden burst — expanding ring of golden star particles */
  emitGoldenBurst(x, y, intensity = 1) {
    const count = Math.floor(20 * intensity);
    const colors = ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24', '#fff'];
    for (let i = 0; i < count; i++) {
      const ang = (6.28 / count) * i + (Math.random() - .5) * .4;
      const spd = 50 + Math.random() * 110 * intensity;
      const col = colors[Math.floor(Math.random() * colors.length)];
      poolAdd('sparks', mkSpark(
        x, y, Math.cos(ang) * spd, Math.sin(ang) * spd,
        col, 3 + Math.random() * 4 * intensity,
        .6 + Math.random() * .5, 20, 'star'
      ));
    }
  },

  /** Spawn ground impact debris — small upward particles at impact point */
  emitGroundImpact(x, y, count = 8) {
    const colors = ['#888', '#aaa', '#666', '#f59e0b33'];
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * .5 + (Math.random() - .5) * 1.8;
      const spd = 40 + Math.random() * 120;
      const col = colors[Math.floor(Math.random() * colors.length)];
      poolAdd('sparks', mkSpark(
        x + (Math.random() - .5) * 40, y,
        Math.cos(ang) * spd, Math.sin(ang) * spd - 50,
        col, 1.5 + Math.random() * 2, .3 + Math.random() * .3, 500, 'circle'
      ));
    }
  },

  /** Spawn aura ring — particles expanding outward in a circle */
  emitAuraRing(x, y, radius, colors, count = 24) {
    for (let i = 0; i < count; i++) {
      const ang = (6.28 / count) * i;
      const startX = x + Math.cos(ang) * 20;
      const startY = y + Math.sin(ang) * 20;
      const col = colors[Math.floor(Math.random() * colors.length)];
      poolAdd('sparks', mkSpark(
        startX, startY,
        Math.cos(ang) * radius * .8,
        Math.sin(ang) * radius * .8,
        col, 2 + Math.random() * 3, .8 + Math.random() * .4, -10, 'diamond'
      ));
    }
  },

  /** Update ambient orbs (called from game loop) */
  updateOrbs(cx, cy, targetCount) {
    while (pools.orbs.length < Math.min(targetCount, BUDGET.orbs)) {
      const colors = ['#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#10b981', '#ec4899'];
      pools.orbs.push({
        ang: Math.random() * 6.28,
        rad: 70 + Math.random() * 130,
        spd: .3 + Math.random() * .5,
        sz: 1.5 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        cx, cy, dead: false,
        update(dt) { this.ang += this.spd * dt; },
        draw(c) {
          const x = this.cx + Math.cos(this.ang) * this.rad;
          const y = this.cy + Math.sin(this.ang) * this.rad * .55;
          c.save(); c.globalAlpha = .35 + Math.sin(this.ang * 2) * .2;
          c.fillStyle = this.color; c.shadowColor = this.color; c.shadowBlur = 10;
          c.beginPath(); c.arc(x, y, this.sz, 0, 6.28); c.fill(); c.restore();
        }
      });
    }
  },

  /** Add mouse trail point */
  addTrailPoint(x, y, color) {
    trailPts.push({ x, y, color, sz: 2.5, life: .25, maxLife: .25 });
    if (trailPts.length > 150) trailPts.splice(0, trailPts.length - 150);
  },

  /** Main render loop — update + draw all VFX */
  render(dt) {
    if (!this.ctx) return;
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update & draw all pools
    for (const key of Object.keys(pools)) {
      const arr = pools[key];
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].update(dt);
        if (arr[i].dead) arr.splice(i, 1);
      }
      arr.forEach(o => o.draw(c));
    }

    // Mouse trail
    for (let i = trailPts.length - 1; i >= 0; i--) {
      const tp = trailPts[i];
      tp.life -= dt;
      if (tp.life <= 0) { trailPts.splice(i, 1); continue; }
      const a = tp.life / tp.maxLife * .3;
      c.save(); c.globalAlpha = a;
      c.fillStyle = tp.color; c.shadowColor = tp.color; c.shadowBlur = 5;
      c.beginPath(); c.arc(tp.x, tp.y, tp.sz * (tp.life / tp.maxLife), 0, 6.28);
      c.fill(); c.restore();
    }
  },

  /** Get current budget info */
  get stats() {
    const counts = {};
    for (const key of Object.keys(pools)) counts[key] = pools[key].length;
    return { counts, budget: BUDGET, isMobile: IS_MOBILE };
  }
};
