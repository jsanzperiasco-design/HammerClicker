/* ═══════════════════════════════════════════════════════
   comboSystem.js — Click Combo Tracker
   SRP: Track click frequency within a time window,
        provide combo count for crit probability scaling.
   ═══════════════════════════════════════════════════════ */

import { CRIT } from './economy.js';

let _timestamps = [];

export const ComboSystem = {
  /**
   * Register a click and return current combo count.
   * @returns {number} combo — clicks within the window
   */
  registerClick() {
    const now = Date.now();
    _timestamps.push(now);
    // Prune old timestamps outside the combo window
    _timestamps = _timestamps.filter(t => now - t < CRIT.WINDOW_MS);
    return _timestamps.length;
  },

  /** Get current combo count without registering */
  get count() {
    const now = Date.now();
    _timestamps = _timestamps.filter(t => now - t < CRIT.WINDOW_MS);
    return _timestamps.length;
  },

  /** Reset combo state */
  reset() {
    _timestamps = [];
  }
};
