/* ═══════════════════════════════════════════════════════
   saveSystem.js — Persistent Storage with Versioning
   SRP: Save/load to localStorage, version migration,
        auto-save scheduling, offline earnings.
   ═══════════════════════════════════════════════════════ */

import { State } from './stateManager.js';
import { recalcClickPower, recalcGPS, effGPS, fmt } from './economy.js';

const STORAGE_KEY = 'hammerEmpireV4';
const CURRENT_VERSION = 4;
const MAX_OFFLINE_MS = 7_200_000; // 2 hours
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

let _autoSaveTimer = null;
let _notifyCallback = null;

/* ── Version Migrations ── */
const migrations = {
  // Example: version 3 → 4 migration
  3: (data) => {
    // Rename old keys if they exist
    if (data.uc && !data.upgradeCounts) {
      data.upgradeCounts = data.uc;
      delete data.uc;
    }
    if (data.gc && !data.generatorCounts) {
      data.generatorCounts = data.gc;
      delete data.gc;
    }
    if (data.pLvl !== undefined && data.prestigeLevel === undefined) {
      data.prestigeLevel = data.pLvl;
      data.prestigeMultiplier = data.pMult || 1;
      delete data.pLvl;
      delete data.pMult;
    }
    data.saveVersion = 4;
    return data;
  }
};

/** Apply migrations from saved version to current */
function migrate(data) {
  let version = data.saveVersion || 1;
  while (version < CURRENT_VERSION) {
    if (migrations[version]) {
      data = migrations[version](data);
    }
    version++;
  }
  data.saveVersion = CURRENT_VERSION;
  return data;
}

export const SaveSystem = {
  /** Set notification callback for offline earnings message */
  onNotify(cb) { _notifyCallback = cb; },

  /** Save current state to localStorage */
  save() {
    State.set('lastSave', Date.now());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(State.getSnapshot()));
    } catch (e) {
      console.warn('SaveSystem: Failed to save', e);
    }
  },

  /** Load state from localStorage, apply migrations + offline earnings */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      let data = JSON.parse(raw);

      // Apply version migrations
      data = migrate(data);

      // Load into state
      State.loadSnapshot(data);

      // Recalculate derived values
      recalcClickPower();
      recalcGPS();

      // Calculate offline earnings (capped at MAX_OFFLINE_MS)
      const now = Date.now();
      const elapsed = Math.min(now - (State.get('lastSave') || now), MAX_OFFLINE_MS);
      if (elapsed > 1000 && State.get('gps') > 0) {
        const earned = State.get('gps') * State.get('prestigeMultiplier') * (elapsed / 1000);
        State.batch(() => {
          State.set('golpes', State.get('golpes') + earned);
          State.set('totalGolpes', State.get('totalGolpes') + earned);
          State.set('lifetimeGolpes', State.get('lifetimeGolpes') + earned);
        });
        if (_notifyCallback) {
          _notifyCallback(`⏰ Offline: +${fmt(earned)} golpes`);
        }
      }

      // Reset fury state & ad bonus on load (can't persist timers)
      State.batch(() => {
        State.set('furyActive', false);
        State.set('furyReady', true);
        State.set('furyTimer', 0);
        State.set('furyCooldown', 0);
        State.set('bonusMultiplier', 1);
      });

      return true;
    } catch (e) {
      console.warn('SaveSystem: Failed to load', e);
      return false;
    }
  },

  /** Start auto-save interval */
  startAutoSave() {
    if (_autoSaveTimer) clearInterval(_autoSaveTimer);
    _autoSaveTimer = setInterval(() => this.save(), AUTOSAVE_INTERVAL);

    // Also save on visibility change and before unload
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
    window.addEventListener('beforeunload', () => this.save());
  },

  /** Stop auto-save */
  stopAutoSave() {
    if (_autoSaveTimer) {
      clearInterval(_autoSaveTimer);
      _autoSaveTimer = null;
    }
  },

  /** Delete all saved data */
  deleteAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  },

  /** Export save as JSON string */
  exportSave() {
    return JSON.stringify(State.getSnapshot());
  },

  /** Import save from JSON string */
  importSave(jsonStr) {
    try {
      const data = migrate(JSON.parse(jsonStr));
      State.loadSnapshot(data);
      recalcClickPower();
      recalcGPS();
      return true;
    } catch (e) {
      console.warn('SaveSystem: Import failed', e);
      return false;
    }
  }
};
