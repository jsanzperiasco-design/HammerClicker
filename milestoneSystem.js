/* ═══════════════════════════════════════════════════════
   milestoneSystem.js — Milestone Tracking & Rewards
   SRP: Check thresholds, trigger visual/audio rewards,
        update milestone progress bar, notify external
        systems via onMilestone callback.
   ═══════════════════════════════════════════════════════ */

import { State } from './stateManager.js';
import { MILESTONES, fmt } from './economy.js';
import { ParticleEngine } from './particleEngine.js';
import { AudioEngine } from './audioEngine.js';
import { HammerSystem } from './hammerSystem.js';

let _notifyCallback    = null;
let _shakeCallback     = null;
let _flashCallback     = null;
let _milestoneCallback = null;

/* ── Color Palettes for Fireworks ── */
const PALETTES = [
  ['#f59e0b', '#fbbf24', '#f97316'],
  ['#ef4444', '#ec4899', '#f59e0b'],
  ['#8b5cf6', '#06b6d4', '#10b981'],
  ['#fff', '#f59e0b', '#ef4444']
];

const LIGHTNING_COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];

export const MilestoneSystem = {
  /**
   * Set UI callbacks.
   * @param {Object}   opts
   * @param {Function} opts.onNotify    — toast notification
   * @param {Function} opts.onShake     — screen shake
   * @param {Function} opts.onFlash     — screen flash
   * @param {Function} opts.onMilestone — called with milestone object on achieve
   */
  setup({ onNotify, onShake, onFlash, onMilestone }) {
    _notifyCallback    = onNotify;
    _shakeCallback     = onShake;
    _flashCallback     = onFlash;
    _milestoneCallback = onMilestone || null;
  },

  /**
   * Check all milestones against current totalGolpes.
   * Triggers rewards for newly achieved milestones.
   */
  check() {
    const total = State.get('totalGolpes');
    const achieved = State.get('milestones') || [];

    MILESTONES.forEach((m, i) => {
      if (total >= m.th && !achieved.includes(i)) {
        achieved.push(i);
        State.set('milestones', [...achieved]);
        this._onAchieved(m);
      }
    });

    this.updateBar();
  },

  /** Handle milestone achievement — Enhanced VFX + audio + hammer evolution (Part 3) */
  _onAchieved(milestone) {
    // Notification
    if (_notifyCallback) {
      _notifyCallback(`🏆 ¡HITO! ${milestone.e} ${milestone.name}`);
    }

    // Epic milestone fanfare (replaces basic milestone sound)
    AudioEngine.play('epicMilestone');

    // Strong haptic pattern
    try { navigator.vibrate && navigator.vibrate([30, 50, 30, 50, 40]); } catch (e) {}

    // Get center position
    const { x: cx, y: cy } = HammerSystem.getCenter();

    // ── 360° Hammer Celebration Spin (Part 3 enhancement) ──
    HammerSystem.applyTier(milestone.tier);
    HammerSystem.playMilestone360();

    // ── Milestone Overlay Golden Flash ──
    const overlay = document.getElementById('milestone-overlay');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => overlay.classList.remove('active'), 1800);
    }

    // ── Floating "¡HITO!" Text (DOM element, self-removing) ──
    const textEl = document.createElement('div');
    textEl.className = 'milestone-float-text';
    textEl.textContent = `🏆 ¡HITO! ${milestone.name}`;
    textEl.style.left = cx + 'px';
    textEl.style.top = cy + 'px';
    document.body.appendChild(textEl);
    setTimeout(() => textEl.remove(), 2600);

    // ── Milestone Aura Ring (DOM element, self-removing) ──
    const auraEl = document.createElement('div');
    auraEl.className = 'milestone-aura';
    auraEl.style.left = cx + 'px';
    auraEl.style.top = cy + 'px';
    document.body.appendChild(auraEl);
    requestAnimationFrame(() => auraEl.classList.add('active'));
    setTimeout(() => auraEl.remove(), 1300);

    // ── Fireworks — 5 staggered bursts ──
    ParticleEngine.emitFirework(cx, cy, PALETTES[0]);
    setTimeout(() => ParticleEngine.emitFirework(cx - 90, cy - 50, PALETTES[1]), 180);
    setTimeout(() => ParticleEngine.emitFirework(cx + 90, cy + 30, PALETTES[2]), 350);
    setTimeout(() => ParticleEngine.emitFirework(cx, cy - 70, PALETTES[3]), 280);
    setTimeout(() => ParticleEngine.emitFirework(cx + 50, cy + 60, PALETTES[0]), 500);

    // ── Golden Burst Particles ──
    ParticleEngine.emitGoldenBurst(cx, cy, 2.5);

    // ── Aura Ring Particles (expanding diamond ring) ──
    ParticleEngine.emitAuraRing(cx, cy, 200, ['#ffd700', '#f59e0b', '#fbbf24', '#fff'], 32);

    // ── Lightning burst — 8 bolts radially ──
    for (let i = 0; i < 8; i++) {
      const a = (6.28 / 8) * i;
      ParticleEngine.emitLightning(
        cx, cy,
        cx + Math.cos(a) * 280, cy + Math.sin(a) * 280,
        LIGHTNING_COLORS[i % LIGHTNING_COLORS.length], .4
      );
    }

    // ── Speed lines (more for milestone) ──
    ParticleEngine.emitSpeedLines(cx, cy, 28, ['#ffd700', '#f59e0b', '#fff', '#ef4444']);

    // ── Ground Impact Debris ──
    ParticleEngine.emitGroundImpact(cx, cy + 60, 18);

    // ── Screen Effects — heavy shake + golden flash ──
    if (_shakeCallback) _shakeCallback(true);
    if (_flashCallback) _flashCallback('rgba(255,215,0,.22)', .3);

    // External callback (e.g., trigger interstitial ad at natural pause)
    if (_milestoneCallback) _milestoneCallback(milestone);
  },

  /** Update the milestone progress bar in the footer */
  updateBar() {
    const total = State.get('totalGolpes');
    const achieved = State.get('milestones') || [];

    const fillEl = document.getElementById('m-fill');
    const nameEl = document.getElementById('m-name');
    const lblEl = document.getElementById('m-lbl');
    if (!fillEl || !nameEl || !lblEl) return;

    let next = null, prev = 0;
    for (let i = 0; i < MILESTONES.length; i++) {
      if (!achieved.includes(i)) {
        next = MILESTONES[i];
        prev = i > 0 ? MILESTONES[i - 1].th : 0;
        break;
      }
    }

    if (next) {
      const range = next.th - prev;
      const progress = Math.min(100, (total - prev) / range * 100);
      fillEl.style.width = progress + '%';
      nameEl.textContent = `${next.e} ${next.name} (${fmt(next.th)})`;
      lblEl.textContent = 'Próximo hito:';
    } else {
      fillEl.style.width = '100%';
      nameEl.textContent = '👑 ¡Todos completados!';
      lblEl.textContent = '🏆';
    }
  }
};
