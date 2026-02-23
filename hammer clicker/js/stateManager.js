/* ═══════════════════════════════════════════════════════
   stateManager.js — Observable Central State (Singleton)
   SRP: Single source of truth + pub/sub notifications
   ═══════════════════════════════════════════════════════ */

const _listeners = new Map();
let _state = {};
let _batchDepth = 0;
const _pending = new Set();

/** Default game state — all fields typed & documented */
function defaultState() {
  return {
    // Resources
    golpes:           0,
    totalGolpes:      0,
    lifetimeGolpes:   0,

    // Power
    clickPower:       1,
    gps:              0,     // golpes per second
    bonusMultiplier:  1,     // temporary ad-reward multiplier

    // Purchases
    upgradeCounts:    {},    // { u1: 3, u2: 1, ... }
    generatorCounts:  {},    // { g1: 5, g2: 2, ... }

    // Progression
    milestones:       [],    // indices of achieved milestones
    prestigeLevel:    0,
    prestigeMultiplier: 1,

    // Fury
    furyActive:       false,
    furyReady:        true,
    furyTimer:        0,     // ms remaining
    furyCooldown:     0,     // ms remaining

    // Meta
    soundOn:          true,
    lastSave:         Date.now(),
    totalClicks:      0,
    totalCrits:       0,
    startTime:        Date.now(),
    saveVersion:      4
  };
}

/** Notify all subscribers of a key change */
function _notify(key, value, old) {
  const set = _listeners.get(key);
  if (set) set.forEach(cb => { try { cb(value, old); } catch(e) { console.error('State listener error:', e); } });
  const wild = _listeners.get('*');
  if (wild) wild.forEach(cb => { try { cb(key, value, old); } catch(e) {} });
}

export const State = {
  /** Initialize with defaults */
  init() {
    _state = defaultState();
  },

  /** Get a state value */
  get(key) {
    return _state[key];
  },

  /** Set a state value and notify listeners */
  set(key, value) {
    const old = _state[key];
    _state[key] = value;
    if (_batchDepth > 0) {
      _pending.add(key);
    } else {
      _notify(key, value, old);
    }
  },

  /** Batch multiple state changes — listeners fire once at end */
  batch(fn) {
    _batchDepth++;
    fn();
    _batchDepth--;
    if (_batchDepth === 0) {
      for (const key of _pending) {
        _notify(key, _state[key]);
      }
      _pending.clear();
    }
  },

  /**
   * Subscribe to state changes.
   * Use key='*' for wildcard (fires on every change).
   * Returns unsubscribe function.
   */
  subscribe(key, callback) {
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(callback);
    return () => _listeners.get(key)?.delete(callback);
  },

  /** Get full state snapshot (deep clone) */
  getSnapshot() {
    return JSON.parse(JSON.stringify(_state));
  },

  /** Load state from saved data (merges with defaults) */
  loadSnapshot(data) {
    const def = defaultState();
    for (const k of Object.keys(def)) {
      if (data[k] !== undefined) {
        _state[k] = data[k];
      } else {
        _state[k] = def[k];
      }
    }
  },

  /** Reset state — optionally keep prestige data */
  reset(keepPrestige = false) {
    const saved = keepPrestige ? {
      prestigeLevel:      _state.prestigeLevel,
      prestigeMultiplier: _state.prestigeMultiplier,
      lifetimeGolpes:     _state.lifetimeGolpes,
      soundOn:            _state.soundOn,
      totalClicks:        _state.totalClicks,
      totalCrits:         _state.totalCrits,
      startTime:          _state.startTime
    } : {};
    _state = { ...defaultState(), ...saved };
  },

  /** Get default state factory */
  defaultState
};
