/* ═══════════════════════════════════════════════════════
   main.js — Game Controller & Loop
   SRP: Initialize all systems, run game loop, wire events,
        manage fury/golden events, HUD updates, screen FX,
        integrate ad system.
   ═══════════════════════════════════════════════════════ */

import { State }           from './stateManager.js';
import { AnimationEngine } from './animationEngine.js';
import { AudioEngine }     from './audioEngine.js';
import { ParticleEngine }  from './particleEngine.js';
import { ComboSystem }     from './comboSystem.js';
import { SaveSystem }      from './saveSystem.js';
import { HammerSystem }    from './hammerSystem.js';
import { MilestoneSystem } from './milestoneSystem.js';
import { UpgradeSystem }   from './upgradeSystem.js';
import { AdSystem }        from './adSystem.js';
import {
  effCP, effGPS, fmt, rollCrit, CRIT, FURY,
  calcPrestigeMultiplier, recalcClickPower, recalcGPS
} from './economy.js';

/* ═══ DOM REFERENCES ═══ */
const $ = id => document.getElementById(id);

let centerEl, hmrEl;
let _lastClickTs = 0;

/* ═══ SCREEN EFFECTS ═══ */
function shake(heavy) {
  document.body.classList.remove('shake', 'shake-h', 'warp');
  void document.body.offsetWidth;
  document.body.classList.add(heavy ? 'shake-h' : 'shake');
  setTimeout(() => document.body.classList.remove('shake', 'shake-h'), heavy ? 300 : 150);
}

function warp() {
  document.body.classList.remove('warp');
  void document.body.offsetWidth;
  document.body.classList.add('warp');
  setTimeout(() => document.body.classList.remove('warp'), 350);
}

function flash(color, opacity) {
  const sf = $('sf');
  if (!sf) return;
  sf.style.background = color || 'rgba(245,158,11,.06)';
  sf.classList.add('on');
  sf.style.opacity = opacity || .12;
  setTimeout(() => { sf.classList.remove('on'); sf.style.opacity = 0; }, 100);
}

function haptic(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {}
}

/* ═══ NOTIFICATIONS ═══ */
let _notifTimer = null;

function notify(text) {
  const el = $('notif');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  if (_notifTimer) clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function miniNotif(text) {
  const q = $('nq');
  if (!q) return;
  const d = document.createElement('div');
  d.className = 'ni';
  d.textContent = text;
  q.appendChild(d);
  setTimeout(() => d.remove(), 3000);
  while (q.children.length > 5) q.firstChild.remove();
}

/* ═══ ENHANCED CLICK VFX HELPERS (Part 3) ═══ */

/** Spawn glowing crit aura overlay at click position */
function spawnCritAura(x, y, type) {
  const el = document.createElement('div');
  el.className = `crit-aura ${type}`;
  el.style.position = 'fixed';
  el.style.left = (x - 100) + 'px';
  el.style.top = (y - 100) + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));
  setTimeout(() => el.remove(), 450);
}

/** Spawn floating crit type badge */
function spawnCritBadge(x, y, text, type) {
  const el = document.createElement('div');
  el.className = `crit-badge ${type}-crit`;
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.style.transition = 'all 0.4s ease-out';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -100%) scale(0.8)';
    setTimeout(() => el.remove(), 400);
  }, 600);
}

/** Spawn elliptical ground impact ring */
function spawnImpactRing(x, y, isCrit) {
  const el = document.createElement('div');
  el.className = `impact-ring${isCrit ? ' crit' : ''}`;
  el.style.position = 'fixed';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));
  setTimeout(() => el.remove(), 520);
}

/* ═══ CLICK HANDLER ═══ */
function onHammerClick(e) {
  AudioEngine.init();
  e.preventDefault();

  _lastClickTs = Date.now();
  State.set('totalClicks', (State.get('totalClicks') || 0) + 1);

  // Combo
  const combo = ComboSystem.registerClick();

  // Combo display
  const comboEl = $('combo');
  const cCountEl = $('ccount');
  if (comboEl && cCountEl) {
    if (combo >= 5) {
      comboEl.classList.add('vis');
      comboEl.classList.remove('mega', 'ultra');
      cCountEl.textContent = combo;
      if (combo >= CRIT.ULTRA_COMBO) comboEl.classList.add('ultra');
      else if (combo >= CRIT.SUPER_COMBO) comboEl.classList.add('mega');
    } else {
      comboEl.classList.remove('vis', 'mega', 'ultra');
    }
  }

  // Critical roll
  const cr = rollCrit(combo);
  const gained = effCP() * cr.mult;

  State.batch(() => {
    State.set('golpes', State.get('golpes') + gained);
    State.set('totalGolpes', State.get('totalGolpes') + gained);
    State.set('lifetimeGolpes', State.get('lifetimeGolpes') + gained);
    if (cr.type !== 'normal') {
      State.set('totalCrits', (State.get('totalCrits') || 0) + 1);
    }
  });

  // Hammer click animation — Part 3 enhanced impact system
  if (cr.type === 'ultra') {
    // Ultra: mega-strike with tier conflict resolution
    const tc = HammerSystem.currentTier >= 0 ? 't' + Math.min(HammerSystem.currentTier, 9) : null;
    if (tc && hmrEl) hmrEl.classList.remove(tc);
    hmrEl?.classList.remove('mega-strike', 'deep-strike', 'impact-strike');
    void hmrEl?.offsetWidth;
    hmrEl?.classList.add('mega-strike');
    setTimeout(() => {
      hmrEl?.classList.remove('mega-strike');
      if (tc && hmrEl) hmrEl.classList.add(tc);
    }, 300);
  } else if (cr.type === 'super' || cr.type === 'crit') {
    // Crit/Super: deep strike (-22° → +8°, heavier, 300ms)
    HammerSystem.playDeepStrike();
  } else {
    // Normal: impact strike (-15° → +5°, refined, 220ms)
    HammerSystem.playImpactStrike();
  }

  // Click position
  const touch = e.touches ? e.touches[0] : e;
  const cx = touch.clientX || touch.pageX;
  const cy = touch.clientY || touch.pageY;

  // Text popup
  const txtColor = cr.type === 'ultra' ? '#ec4899' : cr.type === 'super' ? '#ef4444' : cr.type === 'crit' ? '#fbbf24' : '#f59e0b';
  const txtSize = cr.type === 'ultra' ? 32 : cr.type === 'super' ? 26 : cr.type === 'crit' ? 22 : 16;
  const prefix = cr.type === 'ultra' ? '💥 ' : cr.type === 'super' ? '🔥 ' : cr.type === 'crit' ? '⚡ ' : '';
  ParticleEngine.emitText(cx + (Math.random() - .5) * 40, cy - 25, prefix + '+' + fmt(gained), txtSize, txtColor, cr.type !== 'normal' ? 1.4 : 1, cr.type !== 'normal');

  // Cascading numbers for ultra
  if (cr.type === 'ultra') {
    const ultColors = ['#8b5cf6', '#06b6d4', '#10b981'];
    for (let i = 1; i <= 3; i++) {
      setTimeout(() => ParticleEngine.emitText(
        cx + (Math.random() - .5) * 80, cy - 20,
        '+' + fmt(gained / 4), 18, ultColors[i - 1], .9, true
      ), i * 80);
    }
  }

  // Shockwave
  ParticleEngine.emitShockwave(cx, cy, cr.type);

  // Particles
  const pColors = cr.type === 'ultra' ? ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#fff', '#10b981'] :
                  cr.type === 'super' ? ['#ef4444', '#f59e0b', '#fbbf24', '#f97316', '#ff6b6b'] :
                  cr.type === 'crit'  ? ['#fbbf24', '#f59e0b', '#ef4444', '#f97316'] :
                                        ['#f59e0b', '#fbbf24', '#f97316', '#fcd34d'];
  const pCount = cr.type === 'ultra' ? 50 : cr.type === 'super' ? 30 : cr.type === 'crit' ? 18 : 8;
  ParticleEngine.emitSparks(cx, cy, pCount, pColors, {
    speed: cr.type === 'ultra' ? 250 : cr.type === 'super' ? 180 : cr.type === 'crit' ? 150 : 120,
    speedVar: cr.type === 'ultra' ? 180 : 100,
    size: cr.type === 'ultra' ? 5 : cr.type !== 'normal' ? 3.5 : 2.5,
    sizeVar: 4,
    life: cr.type === 'ultra' ? .9 : .55,
    lifeVar: .4,
    gravity: cr.type === 'ultra' ? 200 : 350,
    type: cr.type === 'ultra' ? 'star' : undefined
  });

  // Speed lines for crits
  if (cr.type !== 'normal') {
    const slCount = cr.type === 'ultra' ? 24 : cr.type === 'super' ? 16 : 10;
    ParticleEngine.emitSpeedLines(cx, cy, slCount, pColors);
  }

  // Lightning for crits
  if (cr.type !== 'normal') {
    const lCount = cr.type === 'ultra' ? 6 : cr.type === 'super' ? 3 : 1;
    const lColors = cr.type === 'ultra' ? ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#fff'] :
                    cr.type === 'super' ? ['#ef4444', '#f59e0b', '#fbbf24'] : ['#f59e0b'];
    for (let i = 0; i < lCount; i++) {
      ParticleEngine.emitLightning(
        cx, cy,
        cx + (Math.random() - .5) * 350,
        cy + (Math.random() - .5) * 350,
        lColors[i % lColors.length], .3
      );
    }
  }

  // Screen effects
  if (cr.type === 'ultra')      { shake(true); warp(); flash('rgba(236,72,153,.15)', .25); haptic([10, 30, 10, 30, 20]); }
  else if (cr.type === 'super') { shake(true); flash('rgba(239,68,68,.1)', .15); haptic([10, 20, 10]); }
  else if (cr.type === 'crit')  { shake(false); flash('rgba(245,158,11,.08)', .1); haptic(15); }
  else                          { flash('rgba(245,158,11,.03)', .04); haptic(5); }

  // Sound — enhanced metallic tap for normal clicks (Part 3)
  AudioEngine.play(cr.type === 'ultra' ? 'ultra' : cr.type === 'super' ? 'super' : cr.type === 'crit' ? 'crit' : 'metalTap');

  // ═══ PART 3 — Enhanced Click VFX ═══

  // Crit-specific overlays and effects
  if (cr.type !== 'normal') {
    // Glowing aura burst (gold/red/rainbow based on crit tier)
    const auraType = cr.type === 'ultra' ? 'rainbow' : cr.type === 'super' ? 'red' : 'gold';
    spawnCritAura(cx, cy, auraType);

    // Floating crit type badge
    const badgeText = { crit: '⚡ ¡CRÍTICO!', super: '🔥 ¡SUPER!', ultra: '💥 ¡ULTRA!' };
    spawnCritBadge(cx, cy - 60, badgeText[cr.type], cr.type);

    // Golden burst particles (intensity scales with crit tier)
    ParticleEngine.emitGoldenBurst(cx, cy, cr.type === 'ultra' ? 2.5 : cr.type === 'super' ? 1.5 : 1);

    // Deep impact sound layer (bass punch)
    AudioEngine.play('deepImpact');

    // Center area scale pulse (1.12x bounce)
    if (centerEl) {
      centerEl.classList.remove('crit-pulse');
      void centerEl.offsetWidth;
      centerEl.classList.add('crit-pulse');
      setTimeout(() => centerEl.classList.remove('crit-pulse'), 310);
    }
  }

  // Impact ground ring (every click, enhanced ring for crits)
  spawnImpactRing(cx, cy + 50, cr.type !== 'normal');

  // Ground impact debris particles
  ParticleEngine.emitGroundImpact(cx, cy + 60, cr.type !== 'normal' ? 14 : 5);

  // Ground thud sound for crits
  if (cr.type !== 'normal') AudioEngine.play('groundHit');

  // Counter value flash effect
  const counterEl = $('d-golpes');
  if (counterEl) {
    counterEl.classList.add('counter-flash');
    setTimeout(() => counterEl.classList.remove('counter-flash'), 200);
  }

  MilestoneSystem.check();
}

/* ═══ FURY SYSTEM ═══ */
let _furyEmberInterval = null;

function activateFury() {
  if (!State.get('furyReady') || State.get('furyActive')) return;

  State.batch(() => {
    State.set('furyActive', true);
    State.set('furyReady', false);
    State.set('furyTimer', FURY.DURATION);
  });

  $('b-fury')?.classList.add('on');
  $('fb')?.classList.add('on');
  $('vig')?.classList.add('on');
  const fbar = $('fbar');
  if (fbar) fbar.style.visibility = 'visible';

  const { x: hx, y: hy } = HammerSystem.getCenter();

  // VFX burst
  ParticleEngine.emitFirework(hx, hy, ['#ef4444', '#f59e0b', '#fbbf24', '#ff6b6b']);
  ParticleEngine.emitSparks(hx, hy, 60, ['#ef4444', '#f59e0b', '#fbbf24'], {
    speed: 220, speedVar: 160, life: 1, type: 'star', gravity: -30
  });
  for (let i = 0; i < 8; i++) {
    const a = (6.28 / 8) * i;
    ParticleEngine.emitLightning(hx, hy, hx + Math.cos(a) * 280, hy + Math.sin(a) * 280, '#ef4444', .3);
  }
  ParticleEngine.emitSpeedLines(hx, hy, 20, ['#ef4444', '#f59e0b', '#fbbf24']);

  // Hammer power-up flash
  hmrEl?.classList.add('power-up');
  setTimeout(() => hmrEl?.classList.remove('power-up'), 500);

  shake(true);
  flash('rgba(239,68,68,.2)', .28);
  AudioEngine.play('fury');
  haptic([30, 50, 30]);
  notify(`🔥 ¡FURIA DEL HERRERO! x${FURY.MULT} durante ${FURY.DURATION / 1000}s`);

  // Continuous embers
  startFuryEmbers();
}

function startFuryEmbers() {
  if (_furyEmberInterval) clearInterval(_furyEmberInterval);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  _furyEmberInterval = setInterval(() => {
    if (!State.get('furyActive')) {
      clearInterval(_furyEmberInterval);
      _furyEmberInterval = null;
      return;
    }
    const x = Math.random() * innerWidth;
    const colors = ['#ef4444', '#f59e0b', '#fbbf24', '#ff6b6b'];
    ParticleEngine.emitEmber(x, innerHeight + 10, colors[Math.floor(Math.random() * 4)]);
  }, isMobile ? 80 : 40);
}

function updateFury(dtMs) {
  const btnEl = $('b-fury');
  const fillEl = $('ffill');
  const barEl = $('fbar');

  if (State.get('furyActive')) {
    const t = State.get('furyTimer') - dtMs;
    State.set('furyTimer', t);
    const pct = Math.max(0, t / FURY.DURATION * 100);
    if (fillEl) { fillEl.style.width = pct + '%'; fillEl.style.background = 'linear-gradient(90deg,#f59e0b,#ef4444)'; }
    if (btnEl) btnEl.textContent = `🔥 FURIA (${Math.ceil(t / 1000)}s)`;

    if (t <= 0) {
      State.batch(() => {
        State.set('furyActive', false);
        State.set('furyCooldown', FURY.COOLDOWN);
      });
      btnEl?.classList.remove('on');
      $('fb')?.classList.remove('on');
      $('vig')?.classList.remove('on');
      if (btnEl) btnEl.disabled = true;
      if (_furyEmberInterval) { clearInterval(_furyEmberInterval); _furyEmberInterval = null; }
      notify(`⏱️ Furia terminada — enfriamiento ${FURY.COOLDOWN / 1000}s`);
    }
  } else if (!State.get('furyReady')) {
    const cd = State.get('furyCooldown') - dtMs;
    State.set('furyCooldown', cd);
    const pct = Math.max(0, (1 - cd / FURY.COOLDOWN) * 100);
    if (fillEl) { fillEl.style.width = pct + '%'; fillEl.style.background = '#64748b'; }
    if (btnEl) btnEl.textContent = `⏱️ Enfriamiento (${Math.ceil(cd / 1000)}s)`;

    if (cd <= 0) {
      State.set('furyReady', true);
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = '🔥 Furia del Herrero'; }
      if (barEl) barEl.style.visibility = 'hidden';
      notify('🔥 ¡Furia lista!');
    }
  }
}

/* ═══ GOLDEN HAMMER EVENT ═══ */
let _goldenActive = false;
let _goldenEl = null;
let _goldenTimeout = null;
let _nextGoldenTime = 0;

function scheduleGolden() {
  _nextGoldenTime = Date.now() + 60000 + Math.random() * 120000;
}

function checkGolden() {
  if (_goldenActive || State.get('totalGolpes') < 500) return;
  if (Date.now() >= _nextGoldenTime) spawnGolden();
}

function spawnGolden() {
  _goldenActive = true;
  const el = document.createElement('div');
  el.className = 'golden';
  el.textContent = '🔨';
  el.style.left = (15 + Math.random() * 70) + 'vw';
  el.style.top = (15 + Math.random() * 50) + 'vh';
  el.addEventListener('click', () => collectGolden(el));
  el.addEventListener('touchstart', e => { e.preventDefault(); collectGolden(el); });
  document.body.appendChild(el);
  _goldenEl = el;
  _goldenTimeout = setTimeout(() => {
    if (_goldenEl) { _goldenEl.remove(); _goldenEl = null; _goldenActive = false; scheduleGolden(); }
  }, 6000);
  AudioEngine.play('golden');
}

function collectGolden(el) {
  if (!_goldenActive) return;
  const bonus = Math.max(effGPS() * 30, effCP() * 50);
  State.batch(() => {
    State.set('golpes', State.get('golpes') + bonus);
    State.set('totalGolpes', State.get('totalGolpes') + bonus);
    State.set('lifetimeGolpes', State.get('lifetimeGolpes') + bonus);
  });

  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  ParticleEngine.emitText(cx, cy - 20, '🌟 +' + fmt(bonus), 28, '#ffd700', 1.5, true);
  ParticleEngine.emitSparks(cx, cy, 35, ['#ffd700', '#fff', '#fbbf24', '#f59e0b'], { speed: 180, life: .8, type: 'star', gravity: 100 });
  ParticleEngine.emitFirework(cx, cy, ['#ffd700', '#fff', '#fbbf24']);
  flash('rgba(255,215,0,.15)', .2);
  shake(false);
  AudioEngine.play('golden');
  haptic(30);
  notify(`🌟 ¡Martillo Dorado! +${fmt(bonus)} golpes`);

  el.remove();
  _goldenEl = null;
  _goldenActive = false;
  clearTimeout(_goldenTimeout);
  scheduleGolden();
}

/* ═══ PRESTIGE ═══ */
function showPrestige() {
  const nm = calcPrestigeMultiplier();
  const cur = $('p-cur');
  const nw = $('p-new');
  const ok = $('p-ok');
  const info = $('p-info');
  if (cur) cur.textContent = State.get('prestigeMultiplier').toFixed(1);
  if (nw) nw.textContent = nm.toFixed(1);
  if (ok) ok.disabled = State.get('lifetimeGolpes') < 1e4;
  if (info) info.textContent = State.get('lifetimeGolpes') < 1e4
    ? `Necesitas 10,000 golpes de por vida. Actual: ${fmt(State.get('lifetimeGolpes'))}`
    : 'Reinicia tu progreso a cambio de un multiplicador permanente.';
  $('mo-prestige')?.classList.add('on');
}

function doPrestige() {
  if (State.get('lifetimeGolpes') < 1e4) return;

  const newLevel = State.get('prestigeLevel') + 1;
  // Preserve ad bonus if active
  const adBonus = State.get('bonusMultiplier');

  State.set('prestigeLevel', newLevel);
  State.set('prestigeMultiplier', calcPrestigeMultiplier());

  State.reset(true);
  State.set('prestigeLevel', newLevel);
  // Restore ad bonus
  State.set('bonusMultiplier', adBonus);

  // Reset UI
  $('b-fury')?.classList.remove('on');
  const bFury = $('b-fury');
  if (bFury) { bFury.disabled = false; bFury.textContent = '🔥 Furia del Herrero'; }
  $('fb')?.classList.remove('on');
  $('vig')?.classList.remove('on');
  const fbar = $('fbar');
  if (fbar) fbar.style.visibility = 'hidden';

  HammerSystem.reset();

  // VFX celebration
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => ParticleEngine.emitFirework(
      cx + (Math.random() - .5) * 300,
      cy + (Math.random() - .5) * 200,
      ['#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#fff']
    ), i * 120);
  }

  // Confetti celebration
  ParticleEngine.emitConfetti(cx, cy, 40, ['#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#06b6d4', '#ec4899']);

  flash('rgba(139,92,246,.2)', .3);
  shake(true);

  $('mo-prestige')?.classList.remove('on');
  UpgradeSystem.buildCards();
  updateHUD();
  MilestoneSystem.updateBar();
  SaveSystem.save();
  AudioEngine.play('prestige');
  notify(`⭐ ¡Prestigio ${newLevel}! x${State.get('prestigeMultiplier').toFixed(1)}`);

  // Trigger interstitial at prestige (natural pause)
  setTimeout(() => AdSystem.showInterstitial('prestige'), 800);
}

/* ═══ STATS MODAL ═══ */
function showStats() {
  const elapsed = Date.now() - (State.get('startTime') || Date.now());
  const hrs = Math.floor(elapsed / 36e5);
  const mins = Math.floor((elapsed % 36e5) / 6e4);
  const uc = State.get('upgradeCounts');
  const gc = State.get('generatorCounts');

  const adStats = AdSystem.analytics;
  const report = AdSystem.getSessionReport ? AdSystem.getSessionReport() : {};

  const items = [
    { l: 'Golpes Totales',      v: fmt(State.get('totalGolpes')) },
    { l: 'Golpes de Por Vida',  v: fmt(State.get('lifetimeGolpes')) },
    { l: 'Clics Totales',       v: fmt(State.get('totalClicks') || 0) },
    { l: 'Críticos Totales',    v: fmt(State.get('totalCrits') || 0) },
    { l: 'Poder de Clic',       v: fmt(effCP()) },
    { l: 'Golpes/Seg',          v: fmt(effGPS()) },
    { l: 'Nivel Prestigio',     v: State.get('prestigeLevel') },
    { l: 'Multiplicador',       v: 'x' + State.get('prestigeMultiplier').toFixed(1) },
    { l: 'Bonus Activo',        v: AdSystem.isRewardActive ? `x${AdSystem.rewardMultiplier}` : 'Ninguno' },
    { l: 'Mejoras Compradas',   v: Object.values(uc).reduce((a, b) => a + b, 0) },
    { l: 'Generadores',         v: Object.values(gc).reduce((a, b) => a + b, 0) },
    { l: 'Hitos',               v: (State.get('milestones') || []).length + '/15' },
    { l: 'Tiempo Jugado',       v: `${hrs}h ${mins}m` },
    { l: 'Anuncios Vistos',     v: adStats.rewardedCompleted },
    { l: 'CTR Prompts',         v: report.rewardedCTR || '—' },
    { l: 'Prompts Mostrados',   v: report.promptsShown || 0 },
    { l: 'Prompts Aceptados',   v: report.promptsAccepted || 0 },
    { l: 'Combo Máximo',        v: report.peakCombo || 0 },
    { l: 'Retención D1',        v: report.retention?.day1 || '—' },
    { l: 'Retención D7',        v: report.retention?.day7 || '—' },
    { l: 'Grupo A/B',           v: adStats.abGroup || '—' },
    { l: 'Proveedor Ads',       v: AdSystem.provider },
  ];

  const grid = $('stats-grid');
  if (grid) {
    grid.innerHTML = items.map(i =>
      `<div class="sg-item"><div class="sg-label">${i.l}</div><div class="sg-val">${i.v}</div></div>`
    ).join('');
  }
  $('mo-stats')?.classList.add('on');
}

/* ═══ HUD UPDATE ═══ */
function updateHUD() {
  const dg = $('d-golpes');
  const dgps = $('d-gps');
  const dcp = $('d-cp');
  const pci = $('pci');
  const dpi = $('dpi');
  const pbadge = $('pbadge');

  if (dg)   dg.textContent = fmt(State.get('golpes'));
  if (dgps) dgps.textContent = fmt(effGPS());
  if (dcp)  dcp.textContent = fmt(effCP());
  if (pci)  pci.textContent = `+${fmt(effCP())} por clic`;

  // Auto GPS display with bonus indicator
  if (dpi) {
    let autoText = effGPS() > 0 ? `⚙️ ${fmt(effGPS())}/s auto` : '';
    if (AdSystem.isRewardActive) autoText += ' 📺';
    if (State.get('furyActive'))  autoText += ' 🔥';
    dpi.textContent = autoText;
  }

  // Prestige badge
  if (pbadge) {
    if (State.get('prestigeLevel') > 0) {
      pbadge.style.display = '';
      const plvl = $('plvl');
      const pmult = $('pmult');
      if (plvl) plvl.textContent = State.get('prestigeLevel');
      if (pmult) pmult.textContent = State.get('prestigeMultiplier').toFixed(1);
    } else {
      pbadge.style.display = 'none';
    }
  }

  // Reward border + vignette
  const rb = $('rb');
  const bvig = $('bvig');
  if (rb) {
    if (AdSystem.isRewardActive) {
      rb.classList.add('on');
      if (bvig) bvig.classList.add('on');
    } else {
      rb.classList.remove('on');
      if (bvig) bvig.classList.remove('on');
    }
  }
}

/* ═══ BACKGROUND PARTICLES ═══ */
function createBgParticles() {
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'bgp';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (10 + Math.random() * 20) + 's';
    p.style.animationDelay = Math.random() * 15 + 's';
    p.style.width = (1 + Math.random() * 2) + 'px';
    p.style.height = p.style.width;
    document.body.appendChild(p);
  }
}

/* ═══ GAME LOOP ═══ */
let _lastTick = performance.now();
let _renderAcc = 0;

function gameLoop(timestamp) {
  const dtMs = Math.min(timestamp - _lastTick, 500);
  const dt = dtMs / 1000;
  _lastTick = timestamp;

  // Auto-generation
  const gpsGain = effGPS() * dt;
  if (gpsGain > 0) {
    State.batch(() => {
      State.set('golpes', State.get('golpes') + gpsGain);
      State.set('totalGolpes', State.get('totalGolpes') + gpsGain);
      State.set('lifetimeGolpes', State.get('lifetimeGolpes') + gpsGain);
    });
  }

  // Systems update
  updateFury(dtMs);

  // Part 5: Feed gameplay state for smart ad blocking
  AdSystem.updateGameplayState({
    comboCount:  ComboSystem.count,
    furyActive:  State.get('furyActive'),
    lastClickTs: _lastClickTs,
    isAnimating: AnimationEngine.activeCount > 0
  });

  AdSystem.update(dtMs);
  MilestoneSystem.check();
  checkGolden();
  AnimationEngine.update(dtMs);

  // Update ambient orbs
  if (centerEl) {
    const r = centerEl.getBoundingClientRect();
    const orbCount = Math.min(12, Math.floor(State.get('totalGolpes') / 500) + 1);
    ParticleEngine.updateOrbs(r.left + r.width / 2, r.top + r.height / 2, orbCount);
  }

  // Render canvas VFX
  ParticleEngine.render(dt);

  // HUD (every frame for smooth counter)
  updateHUD();

  // Cards (throttled — every 200ms)
  _renderAcc += dtMs;
  if (_renderAcc >= 200) {
    UpgradeSystem.updateCards();
    _renderAcc = 0;
  }

  requestAnimationFrame(gameLoop);
}

/* ═══ INITIALIZATION ═══ */
function init() {
  // Initialize state
  State.init();

  // DOM refs
  centerEl = $('center');
  hmrEl = $('hmr');

  // Initialize engines
  AudioEngine.init();
  ParticleEngine.init($('vfx-canvas'));
  HammerSystem.init(hmrEl, $('nebula'));

  // Setup callbacks for sub-systems
  SaveSystem.onNotify(notify);
  MilestoneSystem.setup({
    onNotify: notify,
    onShake: shake,
    onFlash: flash,
    onMilestone: (milestone) => {
      // Part 6: Offer rewarded ad first (player value), fallback to interstitial
      // Delayed 1.5s to let the milestone VFX play first
      setTimeout(() => {
        // Priority 1: Show milestone reward prompt (voluntary rewarded ad)
        if (!AdSystem.promptMilestoneReward(milestone)) {
          // Priority 2: Interstitial only if prompt conditions not met
          AdSystem.showInterstitial('milestone');
        }
      }, 1500);
    }
  });
  UpgradeSystem.setup({ onNotify: notify, onMiniNotify: miniNotif, onFlash: flash });
  AdSystem.setup({ onNotify: notify, onFlash: flash });

  // Load saved game
  SaveSystem.load();

  // Build UI
  UpgradeSystem.buildCards();
  updateHUD();
  MilestoneSystem.updateBar();
  HammerSystem.applyCurrentTier();
  createBgParticles();
  scheduleGolden();

  // Initialize ad system (async — loads SDK, checks consent)
  AdSystem.init().then(() => {
    if (AdSystem.isConsentGiven) {
      document.body.classList.add('has-banner');
    }
  });

  // Sound state
  const soundOn = State.get('soundOn');
  AudioEngine.setMuted(!soundOn);
  const bSound = $('b-sound');
  if (bSound) bSound.textContent = soundOn ? '🔊' : '🔇';

  /* ── Event Wiring ── */

  // Hammer click
  $('hc')?.addEventListener('pointerdown', onHammerClick);

  // Mouse trail
  document.addEventListener('mousemove', e => {
    if (State.get('totalGolpes') > 300) {
      const trailColor = AdSystem.isRewardActive ? '#10b981'
                       : State.get('furyActive') ? '#ef4444'
                       : '#f59e0b';
      ParticleEngine.addTrailPoint(e.clientX, e.clientY, trailColor);
    }
  });

  // Fury
  $('b-fury')?.addEventListener('click', activateFury);

  // Prestige
  $('b-prestige')?.addEventListener('click', showPrestige);
  $('p-ok')?.addEventListener('click', doPrestige);
  $('p-no')?.addEventListener('click', () => $('mo-prestige')?.classList.remove('on'));

  // Reset
  $('b-reset')?.addEventListener('click', () => $('mo-reset')?.classList.add('on'));
  $('r-ok')?.addEventListener('click', () => { SaveSystem.deleteAll(); location.reload(); });
  $('r-no')?.addEventListener('click', () => $('mo-reset')?.classList.remove('on'));

  // Stats
  $('b-stats')?.addEventListener('click', showStats);
  $('s-no')?.addEventListener('click', () => $('mo-stats')?.classList.remove('on'));

  // Save
  $('b-save')?.addEventListener('click', () => { SaveSystem.save(); notify('💾 Guardado'); });

  // Sound toggle
  $('b-sound')?.addEventListener('click', () => {
    const muted = AudioEngine.toggleMute();
    State.set('soundOn', !muted);
    const btn = $('b-sound');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  });

  /* ── Ad System Events ── */

  // Consent buttons
  $('consent-accept')?.addEventListener('click', () => {
    AdSystem.grantConsent();
    AdSystem.showBanner();
    document.body.classList.add('has-banner');
    notify('✅ Anuncios activados — ¡gracias por apoyarnos!');
  });

  $('consent-decline')?.addEventListener('click', () => {
    AdSystem.denyConsent();
    document.body.classList.remove('has-banner');
    notify('🎮 Sin anuncios — ¡disfruta el juego!');
  });

  // Part 6: Milestone reward prompt buttons
  $('mrp-accept')?.addEventListener('click', () => {
    AdSystem.acceptMilestonePrompt();
  });
  $('mrp-decline')?.addEventListener('click', () => {
    AdSystem.dismissMilestonePrompt('dismissed');
  });

  // Rewarded ad button
  $('b-rewarded')?.addEventListener('click', () => {
    AudioEngine.init(); // Ensure audio context for interaction
    AdSystem.showRewarded();
  });

  // Banner close
  $('ad-banner-close')?.addEventListener('click', () => {
    AdSystem.closeBanner();
    document.body.classList.remove('has-banner');
  });

  // Interstitial close
  $('ad-int-skip')?.addEventListener('click', () => {
    AdSystem.closeInterstitial();
  });

  // Rewarded ad cancel
  $('ad-rw-close')?.addEventListener('click', () => {
    AdSystem.cancelRewarded();
  });

  // Modal close on backdrop click
  document.querySelectorAll('.modal-ov').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) {
        ov.classList.remove('on');
        // Clean up ad modals specifically
        if (ov.id === 'mo-rewarded') AdSystem.cancelRewarded();
        if (ov.id === 'mo-interstitial') AdSystem.closeInterstitial();
      }
    });
  });

  // Start auto-save
  SaveSystem.startAutoSave();

  // Start game loop
  requestAnimationFrame(gameLoop);
}

/* ── Boot ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
