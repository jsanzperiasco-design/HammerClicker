/* ═══════════════════════════════════════════════════════
   adSystem.js — Production Ad Integration v3.0
   ═══════════════════════════════════════════════════════
   Part 5: Smart ad timing — gameplay state awareness,
           never interrupt active play (combo/fury/clicks)
   Part 6: Milestone reward prompt flow — offer rewarded
           ad at natural pauses with clear value proposition
   Part 7: 4-group A/B testing, session analytics,
           retention tracking, CTR measurement
   ═══════════════════════════════════════════════════════ */

import { State }          from './stateManager.js';
import { AudioEngine }    from './audioEngine.js';
import { ParticleEngine } from './particleEngine.js';
import { HammerSystem }   from './hammerSystem.js';
import { effGPS, effCP, fmt } from './economy.js';

/* ═══════════════════════════════════════════════════════
   §1  CONFIGURATION
   ═══════════════════════════════════════════════════════ */
const AD_CFG = {
  rewarded: {
    cooldownMs:       180_000,
    watchDurationMs:  5_000,
    bonusMultiplier:  2,
    bonusDurationMs:  30_000,
    preloadAheadMs:   30_000,
    maxPerSession:    12,
    maxPerHour:       8,
  },
  interstitial: {
    cooldownMs:       480_000,
    skipAfterMs:      3_000,
    maxPerSession:    4,
    maxPerHour:       2,
    allowedContexts:  ['milestone', 'prestige', 'achievement'],
  },
  banner: {
    rotateMs:         30_000,
    refreshMs:        60_000,
    position:         'bottom',
    maxHeight:        50,
  },
  /* ── Part 6: Milestone Prompt ── */
  milestonePrompt: {
    autoDismissMs:    12_000,
    minIdleMs:        3_000,   // player must be idle 3s for prompt to appear
  },
  global: {
    sessionStartGraceMs: 30_000,
    consentRequired:     true,
    debugMode:           false,
    abTestGroup:         null,
  }
};

/* ═══════════════════════════════════════════════════════
   §2  INTERNAL STATE
   ═══════════════════════════════════════════════════════ */
let _initialized      = false;
let _consentGiven     = false;
let _sessionStart     = Date.now();

let _rewardedHistory  = [];
let _intHistory       = [];
let _lastRewarded     = 0;
let _lastInterstitial = 0;

let _bonusActive      = false;
let _bonusTimer       = 0;

let _watching         = false;
let _watchTimer       = null;
let _skipTimer        = null;

let _rewardedPreloaded = false;
let _intPreloaded      = false;
let _preloadTimer      = null;

let _bannerInterval   = null;
let _bannerRefreshTimer = null;
let _bannerIdx        = 0;
let _bannerVisible    = true;

let _sdkLoaded        = false;
let _sdkProvider      = 'simulated';

/* ── Part 5: Gameplay State ── */
let _gameplayState = {
  comboCount:   0,
  furyActive:   false,
  lastClickTs:  0,
  isAnimating:  false,
};

/* ── Part 6: Milestone Prompt State ── */
let _milestonePromptActive = false;
let _milestonePromptTimer  = null;

/* ── Part 7: Enhanced Analytics ── */
let _analytics = {
  rewardedShown:      0,
  rewardedCompleted:  0,
  rewardedCancelled:  0,
  interstitialShown:  0,
  interstitialSkipped:0,
  bannerImpressions:  0,
  totalRevenue:       0,
  sessionDuration:    0,
  abGroup:            null,
  // Part 7 — Milestone prompt metrics
  promptsShown:       0,
  promptsAccepted:    0,
  promptsDismissed:   0,
  promptsTimedOut:    0,
  // Part 7 — Session engagement
  sessionPeakCombo:   0,
};

let _notifyCb = null;
let _flashCb  = null;

/* ── Banner Content ── */
const BANNERS = [
  { text: '⚒️ Hammer Empire Pro — Sin anuncios',           color: '#f59e0b' },
  { text: '🎮 ¿Te gusta el juego? ¡Comparte con amigos!',  color: '#8b5cf6' },
  { text: '⭐ Califica Hammer Empire — 5 estrellas',        color: '#10b981' },
  { text: '🔥 Descubre más juegos increíbles',              color: '#ef4444' },
  { text: '💎 Versión Premium — Multiplicador permanente',   color: '#06b6d4' },
  { text: '🏆 ¡Compite con tus amigos! Tabla de líderes',   color: '#ec4899' },
  { text: '📱 Disponible en Android e iOS pronto',           color: '#f97316' },
  { text: '🌟 Sigue jugando — nuevas mejoras cada semana',   color: '#fbbf24' },
];

/* ═══════════════════════════════════════════════════════
   §3  SDK LOADER + Live Ad Network Integration
   ═══════════════════════════════════════════════════════ */

/* ── Ad Network IDs ── */
const LIVE_AD_CONTAINER_ID = 'container-18e6fe8da5f48e31e9d71de2dbd5b233';
const SECONDARY_AD_SCRIPT  = 'https://pl28780933.effectivegatecpm.com/7f/b8/73/7fb87382e3c3296ca657770314a0c15e.js';
let _secondaryAdLoaded = false;

/** Check if the live ad network script has loaded and rendered content */
function _hasLiveAd() {
  const el = document.getElementById(LIVE_AD_CONTAINER_ID);
  return el && el.children.length > 0;
}

/** Clone/move the live ad container into a target slot */
function _injectLiveAdInto(targetSlotId) {
  const source = document.getElementById(LIVE_AD_CONTAINER_ID);
  const target = document.getElementById(targetSlotId);
  if (!source || !target) return false;
  target.innerHTML = '';
  target.appendChild(source.cloneNode(true));
  const placeholder = target.closest('.ad-placeholder');
  if (placeholder) placeholder.classList.add('has-live-ad');
  return true;
}

/** Detect when the banner ad loads and switch to live mode */
function _watchBannerAd() {
  const container = document.getElementById(LIVE_AD_CONTAINER_ID);
  if (!container) return;
  const observer = new MutationObserver(() => {
    if (container.children.length > 0) {
      const banner = document.getElementById('ad-banner');
      if (banner) banner.classList.add('has-live-ad');
      _log('Live banner ad detected');
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  if (container.children.length > 0) {
    const banner = document.getElementById('ad-banner');
    if (banner) banner.classList.add('has-live-ad');
  }
}

/**
 * Dynamically load the secondary ad script (popunder/interstitial network).
 * Only called AFTER user consent is granted — respects GDPR/CCPA.
 */
function _loadSecondaryAdScript() {
  if (_secondaryAdLoaded) return;
  _secondaryAdLoaded = true;
  try {
    const s = document.createElement('script');
    s.src = SECONDARY_AD_SCRIPT;
    s.onload = () => _log('Secondary ad script loaded (EffectiveGate popunder)');
    s.onerror = () => _log('Secondary ad script failed to load');
    document.body.appendChild(s);
    _trackEvent('secondary_ad_loaded');
  } catch (e) {
    _log('Error loading secondary ad script:', e);
  }
}

function _loadSDK() {
  return new Promise((resolve) => {
    _sdkProvider = 'effectivegate-dual';
    _sdkLoaded = true;
    _log('Using EffectiveGate dual network (banner + popunder)');
    // Watch for live banner ad content
    setTimeout(() => _watchBannerAd(), 1000);
    // Load secondary ad only if consent already granted
    if (_consentGiven) {
      setTimeout(() => _loadSecondaryAdScript(), 2000);
    }
    resolve(true);
  });
}

/* ═══════════════════════════════════════════════════════
   §4  FREQUENCY CAPPING
   ═══════════════════════════════════════════════════════ */
function _pruneHistory() {
  const h = Date.now() - 3_600_000;
  _rewardedHistory = _rewardedHistory.filter(t => t > h);
  _intHistory      = _intHistory.filter(t => t > h);
}
function _inGracePeriod() {
  return Date.now() - _sessionStart < AD_CFG.global.sessionStartGraceMs;
}
function _sessionRewardedCount() {
  return _rewardedHistory.filter(t => t >= _sessionStart).length;
}
function _sessionIntCount() {
  return _intHistory.filter(t => t >= _sessionStart).length;
}

/* ═══════════════════════════════════════════════════════
   §4.1  GAMEPLAY STATE AWARENESS — Part 5
   ═══════════════════════════════════════════════════════
   Block system-initiated ads during active gameplay:
   - Player clicked within last 3s (active clicking)
   - Combo count >= 5 (in combo zone)
   - Fury mode active
   - Hammer animation playing
   This ONLY applies to system-initiated ads (interstitials,
   milestone prompts). Player-initiated rewarded ads are
   always allowed because the player chose to watch.
   ═══════════════════════════════════════════════════════ */
function _shouldBlockAds() {
  const now = Date.now();
  if (now - _gameplayState.lastClickTs < AD_CFG.milestonePrompt.minIdleMs) return true;
  if (_gameplayState.comboCount >= 5) return true;
  if (_gameplayState.furyActive) return true;
  if (_gameplayState.isAnimating) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════
   §5  PRELOADING
   ═══════════════════════════════════════════════════════ */
function _schedulePreload() {
  if (_preloadTimer) clearTimeout(_preloadTimer);
  const timeUntilReady = Math.max(0, AD_CFG.rewarded.cooldownMs - (Date.now() - _lastRewarded));
  const preloadAt = Math.max(0, timeUntilReady - AD_CFG.rewarded.preloadAheadMs);
  _preloadTimer = setTimeout(() => { _rewardedPreloaded = true; _log('Rewarded preloaded'); }, preloadAt);
}
function _preloadInterstitial() { _intPreloaded = true; }

/* ═══════════════════════════════════════════════════════
   §6  AD EXECUTION
   ═══════════════════════════════════════════════════════ */
function _executeRewardedAd() {
  return new Promise((resolve) => {
    if (_sdkProvider === 'adsense' && window.adBreak) {
      window.adBreak({
        type: 'reward', name: 'bonus-multiplier',
        adViewed: () => resolve('completed'),
        adDismissed: () => resolve('cancelled'),
        adBreakDone: (info) => { if (info.breakStatus === 'notReady') resolve('error'); }
      });
      return;
    }
    _simulateRewardedCountdown(resolve);
  });
}
function _executeInterstitialAd(context) {
  return new Promise((resolve) => {
    if (_sdkProvider === 'adsense' && window.adBreak) {
      window.adBreak({
        type: 'next', name: context || 'natural-pause',
        adBreakDone: (info) => resolve(info.breakStatus === 'viewed' ? 'completed' : 'skipped')
      });
      return;
    }
    _simulateInterstitialCountdown(context, resolve);
  });
}

/* ═══════════════════════════════════════════════════════
   §7  SIMULATED AD UI
   ═══════════════════════════════════════════════════════ */
let _simulatedResolve = null;
let _simulatedIntResolve = null;

function _simulateRewardedCountdown(resolve) {
  const modal = document.getElementById('mo-rewarded');
  const bar   = document.getElementById('ad-rw-bar');
  const timer = document.getElementById('ad-rw-timer');
  const info  = document.getElementById('ad-rw-info');
  const close = document.getElementById('ad-rw-close');
  if (info) info.textContent = `Recompensa: x${AD_CFG.rewarded.bonusMultiplier} durante ${AD_CFG.rewarded.bonusDurationMs / 1000}s`;
  if (modal) modal.classList.add('on');
  if (close) close.style.display = 'none';

  // Inject live ad into rewarded slot if available
  _injectLiveAdInto('ad-rw-live');

  let elapsed = 0;
  const total = AD_CFG.rewarded.watchDurationMs;
  _watchTimer = setInterval(() => {
    elapsed += 100;
    if (bar)   bar.style.width = Math.min(100, elapsed / total * 100) + '%';
    if (timer) timer.textContent = Math.ceil((total - elapsed) / 1000) + 's';
    if (elapsed >= total) {
      clearInterval(_watchTimer); _watchTimer = null;
      if (modal) modal.classList.remove('on');
      resolve('completed');
    }
  }, 100);
  _simulatedResolve = resolve;
}

function _simulateInterstitialCountdown(context, resolve) {
  const modal = document.getElementById('mo-interstitial');
  const skip  = document.getElementById('ad-int-skip');
  const cd    = document.getElementById('ad-int-cd');
  const ctx   = document.getElementById('ad-int-ctx');
  const msgs = {
    milestone: '🏆 ¡Nuevo hito alcanzado!', prestige: '⭐ ¡Prestigio completado!',
    achievement: '🎯 ¡Logro desbloqueado!', general: '⚒️ Hammer Empire',
  };
  if (ctx) ctx.textContent = msgs[context] || msgs.general;
  if (modal) modal.classList.add('on');
  if (skip) { skip.style.display = 'none'; skip.disabled = true; }

  // Inject live ad into interstitial slot if available
  _injectLiveAdInto('ad-int-live');

  let elapsed = 0;
  const skipAfter = AD_CFG.interstitial.skipAfterMs;
  _skipTimer = setInterval(() => {
    elapsed += 100;
    const rem = Math.ceil((skipAfter - elapsed) / 1000);
    if (cd) cd.textContent = rem > 0 ? `Cerrar en ${rem}s` : '';
    if (elapsed >= skipAfter) {
      clearInterval(_skipTimer); _skipTimer = null;
      if (skip) { skip.style.display = ''; skip.disabled = false; }
      if (cd) cd.textContent = '';
    }
  }, 100);
  _simulatedIntResolve = resolve;
}

/* ═══════════════════════════════════════════════════════
   §8  CONSENT
   ═══════════════════════════════════════════════════════ */
function _checkConsent() {
  try {
    const s = localStorage.getItem('hammerEmpire_adConsent');
    if (s === 'granted') { _consentGiven = true; return true; }
    if (s === 'denied')  { _consentGiven = false; return false; }
  } catch(e) {}
  return null;
}
function _saveConsent(granted) {
  _consentGiven = granted;
  try { localStorage.setItem('hammerEmpire_adConsent', granted ? 'granted' : 'denied'); } catch(e) {}
}

/* ═══════════════════════════════════════════════════════
   §9  A/B TESTING — 4 groups (Part 7 expansion)
   ═══════════════════════════════════════════════════════
   Group A: Control — default timings
   Group B: Longer bonus (45s), less frequent interstitials (10min)
   Group C: Higher multiplier (x3), default duration
   Group D: Most generous (60s bonus, 10min interstitial cooldown)
   ═══════════════════════════════════════════════════════ */
function _assignABGroup() {
  if (AD_CFG.global.abTestGroup) { _analytics.abGroup = AD_CFG.global.abTestGroup; }
  else {
    try {
      let group = localStorage.getItem('hammerEmpire_abGroup');
      if (!group) {
        const r = Math.random();
        group = r < 0.25 ? 'A' : r < 0.5 ? 'B' : r < 0.75 ? 'C' : 'D';
        localStorage.setItem('hammerEmpire_abGroup', group);
      }
      _analytics.abGroup = group;
    } catch(e) { _analytics.abGroup = 'A'; }
  }
  switch (_analytics.abGroup) {
    case 'A': break;
    case 'B':
      AD_CFG.rewarded.bonusDurationMs = 45_000;
      AD_CFG.interstitial.cooldownMs  = 600_000;
      break;
    case 'C':
      AD_CFG.rewarded.bonusMultiplier = 3;
      break;
    case 'D':
      AD_CFG.rewarded.bonusDurationMs = 60_000;
      AD_CFG.interstitial.cooldownMs  = 600_000;
      break;
  }
  _log(`A/B Group: ${_analytics.abGroup}`);
}

/* ═══════════════════════════════════════════════════════
   §10  ANALYTICS — Enhanced (Part 7)
   ═══════════════════════════════════════════════════════ */
function _trackEvent(eventName, data = {}) {
  const event = {
    event: eventName, timestamp: Date.now(),
    session: Date.now() - _sessionStart,
    abGroup: _analytics.abGroup, provider: _sdkProvider, ...data
  };
  _log('📊', event);
  /* if (window.gtag) gtag('event', eventName, { event_category: 'ads', ...data }); */
}

/** Part 7: Retention tracking via first-visit timestamp */
function _checkRetention(days) {
  try {
    const key = 'hammerEmpire_firstVisit';
    let first = localStorage.getItem(key);
    if (!first) { localStorage.setItem(key, Date.now().toString()); return 'new_user'; }
    const elapsed = (Date.now() - parseInt(first)) / 86_400_000;
    return elapsed >= days ? 'retained' : `pending_${Math.floor(elapsed)}d`;
  } catch(e) { return 'unknown'; }
}

/* ═══════════════════════════════════════════════════════
   §11  UTILITY
   ═══════════════════════════════════════════════════════ */
function _log(...a) { if (AD_CFG.global.debugMode) console.log('[AdSystem]', ...a); }

/* ═══════════════════════════════════════════════════════
   §12  PUBLIC API
   ═══════════════════════════════════════════════════════ */
export const AdSystem = {

  /* ── Setup & Init ── */
  setup({ onNotify, onFlash }) { _notifyCb = onNotify; _flashCb = onFlash; },

  async init() {
    _sessionStart = Date.now();
    _assignABGroup();
    if (AD_CFG.global.consentRequired) {
      const consentResult = _checkConsent();
      if (consentResult === null) {
        // First visit — show consent banner
        this._showConsentBanner();
      } else if (consentResult === false) {
        // Previously denied — hide all ad UI
        _consentGiven = false;
        const banner = document.getElementById('ad-banner');
        if (banner) banner.style.display = 'none';
        const rwc = document.getElementById('rw-c');
        if (rwc) rwc.style.display = 'none';
      } else {
        // Previously granted — show banner
        _consentGiven = true;
        const banner = document.getElementById('ad-banner');
        if (banner) banner.style.display = 'flex';
      }
    } else { _consentGiven = true; }
    try {
      await _loadSDK();
    } catch (e) {
      console.warn('[AdSystem] SDK load failed:', e);
    }
    _initialized = true;
    if (_consentGiven) {
      this._rotateBanner();
    }
    _bannerInterval = setInterval(() => this._rotateBanner(), AD_CFG.banner.rotateMs);
    _schedulePreload();
    _preloadInterstitial();
    this._refreshBtn();
    _log('Init complete', { provider: _sdkProvider, consent: _consentGiven, ab: _analytics.abGroup });
  },

  /* ── Consent ── */
  _showConsentBanner() {
    const el = document.getElementById('consent-banner');
    if (el) el.style.display = 'flex';
  },
  grantConsent() {
    _saveConsent(true);
    document.getElementById('consent-banner')?.style.setProperty('display', 'none');
    // Load secondary ad network now that consent is granted
    _loadSecondaryAdScript();
    _trackEvent('consent_granted');
  },
  denyConsent() {
    _saveConsent(false);
    document.getElementById('consent-banner')?.style.setProperty('display', 'none');
    this.closeBanner();
    const rwc = document.getElementById('rw-c');
    if (rwc) rwc.style.display = 'none';
    _trackEvent('consent_denied');
  },

  /* ── Banner ── */
  _rotateBanner() {
    const el = document.getElementById('ad-banner-text');
    if (!el) return;
    const b = BANNERS[_bannerIdx % BANNERS.length];
    el.textContent = b.text; el.style.color = b.color;
    _bannerIdx++; _analytics.bannerImpressions++;
  },
  closeBanner() {
    const el = document.getElementById('ad-banner');
    if (el) el.style.display = 'none';
    document.body.classList.remove('has-banner');
    _bannerVisible = false; _trackEvent('banner_closed');
  },
  showBanner() {
    if (!_consentGiven) return;
    const el = document.getElementById('ad-banner');
    if (el) el.style.display = 'flex';
    document.body.classList.add('has-banner');
    _bannerVisible = true;
  },

  /* ── Rewarded Ad ── */
  canShowRewarded() {
    if (!_initialized || !_consentGiven) return false;
    if (_watching || _bonusActive) return false;
    if (_inGracePeriod()) return false;
    // NOTE: No _shouldBlockAds() — rewarded ads are player-initiated (Part 5)
    if (Date.now() - _lastRewarded < AD_CFG.rewarded.cooldownMs) return false;
    _pruneHistory();
    if (_sessionRewardedCount() >= AD_CFG.rewarded.maxPerSession) return false;
    if (_rewardedHistory.length >= AD_CFG.rewarded.maxPerHour) return false;
    return true;
  },

  async showRewarded() {
    if (!this.canShowRewarded()) return;
    _watching = true;
    _analytics.rewardedShown++;
    _trackEvent('rewarded_start');
    AudioEngine.play('buy');
    const result = await _executeRewardedAd();
    _watching = false;
    if (result === 'completed') {
      this._rewardComplete();
      _analytics.rewardedCompleted++;
      _trackEvent('rewarded_completed', { bonus: AD_CFG.rewarded.bonusMultiplier });
    } else {
      _analytics.rewardedCancelled++;
      _trackEvent('rewarded_cancelled', { reason: result });
    }
    _lastRewarded = Date.now();
    _rewardedHistory.push(Date.now());
    _rewardedPreloaded = false;
    _schedulePreload();
    this._refreshBtn();
  },

  _rewardComplete() {
    _bonusActive = true;
    _bonusTimer = AD_CFG.rewarded.bonusDurationMs;
    State.set('bonusMultiplier', AD_CFG.rewarded.bonusMultiplier);
    if (_notifyCb) _notifyCb(
      `📺 ¡Bonus x${AD_CFG.rewarded.bonusMultiplier} activado por ${AD_CFG.rewarded.bonusDurationMs / 1000}s!`
    );
    const { x, y } = HammerSystem.getCenter();
    ParticleEngine.emitFirework(x, y, ['#10b981', '#06b6d4', '#fff', '#f59e0b']);
    ParticleEngine.emitSparks(x, y, 35, ['#10b981', '#06b6d4', '#fff', '#fbbf24'], {
      speed: 170, life: .9, type: 'star', gravity: 40
    });
    ParticleEngine.emitSpeedLines(x, y, 14, ['#10b981', '#06b6d4', '#fff']);
    for (let i = 0; i < 4; i++) {
      const a = (6.28 / 4) * i;
      ParticleEngine.emitLightning(x, y, x + Math.cos(a) * 200, y + Math.sin(a) * 200, '#10b981', .3);
    }
    if (_flashCb) _flashCb('rgba(16,185,129,.18)', .22);
    AudioEngine.play('milestone');
    try { navigator.vibrate && navigator.vibrate([15, 30, 15]); } catch(e) {}
    this._refreshBtn();
    this._refreshBadge();
  },

  cancelRewarded() {
    if (_watchTimer) { clearInterval(_watchTimer); _watchTimer = null; }
    _watching = false;
    document.getElementById('mo-rewarded')?.classList.remove('on');
    if (_simulatedResolve) { _simulatedResolve('cancelled'); _simulatedResolve = null; }
    _trackEvent('rewarded_user_cancelled');
  },

  /* ── Interstitial ── */
  canShowInterstitial(context) {
    if (!_initialized || !_consentGiven) return false;
    if (_inGracePeriod()) return false;
    if (_watching || _bonusActive) return false;
    // Part 5: Block during active gameplay
    if (_shouldBlockAds()) return false;
    if (!AD_CFG.interstitial.allowedContexts.includes(context)) return false;
    if (Date.now() - _lastInterstitial < AD_CFG.interstitial.cooldownMs) return false;
    _pruneHistory();
    if (_sessionIntCount() >= AD_CFG.interstitial.maxPerSession) return false;
    if (_intHistory.length >= AD_CFG.interstitial.maxPerHour) return false;
    return true;
  },

  async showInterstitial(context = 'milestone') {
    if (!this.canShowInterstitial(context)) return;
    _analytics.interstitialShown++;
    _trackEvent('interstitial_start', { context });
    const result = await _executeInterstitialAd(context);
    _lastInterstitial = Date.now();
    _intHistory.push(Date.now());
    _intPreloaded = false;
    if (result === 'skipped') _analytics.interstitialSkipped++;
    _trackEvent('interstitial_done', { context, result });
    setTimeout(() => _preloadInterstitial(), 5000);
  },

  closeInterstitial() {
    if (_skipTimer) { clearInterval(_skipTimer); _skipTimer = null; }
    document.getElementById('mo-interstitial')?.classList.remove('on');
    if (_simulatedIntResolve) { _simulatedIntResolve('skipped'); _simulatedIntResolve = null; }
  },

  /* ═══════════════════════════════════════════════════
     Part 5: Gameplay State Awareness
     ═══════════════════════════════════════════════════ */

  /**
   * Called from game loop to feed current gameplay state.
   * Used by _shouldBlockAds() to prevent ad interruptions.
   */
  updateGameplayState(state) {
    Object.assign(_gameplayState, state);
    if ((state.comboCount || 0) > _analytics.sessionPeakCombo) {
      _analytics.sessionPeakCombo = state.comboCount;
    }
  },

  /* ═══════════════════════════════════════════════════
     Part 6: Milestone Reward Prompt
     Non-modal floating prompt after milestone celebration.
     Flow: milestone → VFX → 1.5s delay → prompt appears →
     player accepts (rewarded ad) or declines → auto-dismiss 12s
     ═══════════════════════════════════════════════════ */

  /**
   * Show milestone reward prompt (non-modal, auto-dismiss).
   * @param {Object} milestone — { name, e, th, tier }
   * @returns {boolean} true if prompt was shown
   */
  promptMilestoneReward(milestone) {
    if (!_initialized || !_consentGiven) return false;
    if (_milestonePromptActive) return false;
    if (_bonusActive || _watching) return false;
    // Part 5: Don't show prompt during active gameplay
    if (_shouldBlockAds()) return false;

    // Verify rewarded ad is actually available
    _pruneHistory();
    const cdOk   = Date.now() - _lastRewarded >= AD_CFG.rewarded.cooldownMs;
    const sessOk = _sessionRewardedCount() < AD_CFG.rewarded.maxPerSession;
    const hourOk = _rewardedHistory.length < AD_CFG.rewarded.maxPerHour;
    if (!cdOk || !sessOk || !hourOk) return false;

    _milestonePromptActive = true;
    _analytics.promptsShown++;

    // Populate prompt UI
    const el      = document.getElementById('milestone-reward-prompt');
    const nameEl  = document.getElementById('mrp-name');
    const bonusEl = document.getElementById('mrp-bonus');

    if (nameEl) nameEl.textContent = `${milestone.e} ${milestone.name}`;
    if (bonusEl) bonusEl.textContent =
      `x${AD_CFG.rewarded.bonusMultiplier} durante ${AD_CFG.rewarded.bonusDurationMs / 1000}s`;

    if (el) el.classList.add('show');

    // Animate timer bar (CSS-driven shrink over autoDismissMs)
    const timerFill = document.getElementById('mrp-timer-fill');
    if (timerFill) {
      timerFill.style.animation = 'none';
      void timerFill.offsetWidth;
      timerFill.style.animation =
        `mpTimerShrink ${AD_CFG.milestonePrompt.autoDismissMs}ms linear forwards`;
    }

    // Auto-dismiss after timeout
    _milestonePromptTimer = setTimeout(() => {
      this.dismissMilestonePrompt('timeout');
    }, AD_CFG.milestonePrompt.autoDismissMs);

    _trackEvent('milestone_prompt_shown', { milestone: milestone.name });
    AudioEngine.play('buy');

    return true;
  },

  /** Player accepts the milestone reward prompt → show rewarded ad */
  acceptMilestonePrompt() {
    if (!_milestonePromptActive) return;
    _analytics.promptsAccepted++;
    this.dismissMilestonePrompt('accepted');
    _trackEvent('milestone_prompt_accepted');
    // Show the actual rewarded ad
    this.showRewarded();
  },

  /** Dismiss the milestone prompt (by player, timeout, or after acceptance) */
  dismissMilestonePrompt(reason = 'dismissed') {
    _milestonePromptActive = false;
    if (_milestonePromptTimer) {
      clearTimeout(_milestonePromptTimer);
      _milestonePromptTimer = null;
    }
    const el = document.getElementById('milestone-reward-prompt');
    if (el) el.classList.remove('show');

    if (reason === 'dismissed') _analytics.promptsDismissed++;
    if (reason === 'timeout')   _analytics.promptsTimedOut++;
    if (reason !== 'accepted') {
      _trackEvent('milestone_prompt_dismissed', { reason });
    }
  },

  /* ═══════════════════════════════════════════════════
     Part 7: Session Analytics Report
     ═══════════════════════════════════════════════════ */

  /**
   * Get comprehensive session analytics report.
   * Includes CTR, retention, A/B group, and engagement metrics.
   */
  getSessionReport() {
    const duration = Date.now() - _sessionStart;
    const ctr = _analytics.promptsShown > 0
      ? (_analytics.promptsAccepted / _analytics.promptsShown * 100).toFixed(1) + '%'
      : 'N/A';
    return {
      durationMin:        (duration / 60000).toFixed(1),
      rewardedCTR:        ctr,
      rewardedShown:      _analytics.rewardedShown,
      rewardedCompleted:  _analytics.rewardedCompleted,
      rewardedCancelled:  _analytics.rewardedCancelled,
      interstitialShown:  _analytics.interstitialShown,
      interstitialSkipped: _analytics.interstitialSkipped,
      promptsShown:       _analytics.promptsShown,
      promptsAccepted:    _analytics.promptsAccepted,
      promptsDismissed:   _analytics.promptsDismissed,
      promptsTimedOut:    _analytics.promptsTimedOut,
      peakCombo:          _analytics.sessionPeakCombo,
      abGroup:            _analytics.abGroup,
      provider:           _sdkProvider,
      retention: {
        day1: _checkRetention(1),
        day7: _checkRetention(7),
      }
    };
  },

  /* ── Game-Loop Update ── */
  update(dtMs) {
    _analytics.sessionDuration = Date.now() - _sessionStart;
    if (_bonusActive) {
      _bonusTimer -= dtMs;
      if (_bonusTimer <= 0) {
        _bonusActive = false; _bonusTimer = 0;
        State.set('bonusMultiplier', 1);
        if (_notifyCb) _notifyCb('⏱️ Bonus de anuncio terminado');
        _trackEvent('bonus_expired');
        document.getElementById('rb')?.classList.remove('on');
        document.getElementById('bvig')?.classList.remove('on');
      }
      this._refreshBadge();
    }
    this._refreshBtn();
  },

  /* ── UI Helpers ── */
  _refreshBtn() {
    const btn = document.getElementById('b-rewarded');
    if (!btn) return;
    if (!_consentGiven) {
      btn.disabled = true;
      btn.innerHTML = '<span class="rw-icon">🚫</span> Requiere consentimiento';
      btn.classList.remove('rw-active');
      return;
    }
    if (_bonusActive) {
      btn.disabled = true;
      btn.innerHTML = `<span class="rw-icon">📺</span> Bonus activo (${Math.ceil(_bonusTimer / 1000)}s)`;
      btn.classList.add('rw-active');
    } else if (!this.canShowRewarded()) {
      btn.disabled = true;
      const rem = Math.max(0, Math.ceil((AD_CFG.rewarded.cooldownMs - (Date.now() - _lastRewarded)) / 1000));
      _pruneHistory();
      let reason;
      if (_inGracePeriod()) reason = 'Disponible pronto…';
      else if (_sessionRewardedCount() >= AD_CFG.rewarded.maxPerSession) reason = 'Máximo por sesión';
      else if (_rewardedHistory.length >= AD_CFG.rewarded.maxPerHour) reason = 'Máximo por hora';
      else reason = `Disponible en ${rem}s`;
      btn.innerHTML = `<span class="rw-icon">⏱️</span> ${reason}`;
      btn.classList.remove('rw-active');
    } else {
      btn.disabled = false;
      btn.innerHTML = '<span class="rw-icon">📺</span> Ver anuncio (+Bonus)';
      btn.classList.remove('rw-active');
    }
  },

  _refreshBadge() {
    const badge = document.getElementById('reward-badge');
    if (!badge) return;
    if (_bonusActive) {
      badge.style.display = '';
      badge.textContent = `📺 x${AD_CFG.rewarded.bonusMultiplier} (${Math.ceil(_bonusTimer / 1000)}s)`;
    } else { badge.style.display = 'none'; }
  },

  /* ── Read-Only Getters ── */
  get isRewardActive()   { return _bonusActive; },
  get rewardMultiplier() { return _bonusActive ? AD_CFG.rewarded.bonusMultiplier : 1; },
  get config()           { return AD_CFG; },
  get provider()         {
    if (_sdkProvider === 'effectivegate-dual') return 'EffectiveGate Dual (Banner+Pop)';
    if (_sdkProvider === 'effectivegate') return 'EffectiveGate CPM';
    return _sdkProvider;
  },
  get analytics()        { return { ..._analytics }; },
  get isConsentGiven()   { return _consentGiven; },

  /* ── Cleanup ── */
  destroy() {
    if (_bannerInterval) clearInterval(_bannerInterval);
    if (_bannerRefreshTimer) clearInterval(_bannerRefreshTimer);
    if (_watchTimer) clearInterval(_watchTimer);
    if (_skipTimer) clearInterval(_skipTimer);
    if (_preloadTimer) clearTimeout(_preloadTimer);
    if (_milestonePromptTimer) clearTimeout(_milestonePromptTimer);
  },
};
