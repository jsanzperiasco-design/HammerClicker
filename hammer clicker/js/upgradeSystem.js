/* ═══════════════════════════════════════════════════════
   upgradeSystem.js — Upgrade & Generator Management
   SRP: Build UI cards, handle purchases, recalculate
        derived stats, trigger purchase VFX.
   ═══════════════════════════════════════════════════════ */

import { State } from './stateManager.js';
import {
  UPGRADES, GENERATORS, calcCost, recalcClickPower, recalcGPS,
  fmt, tierLabel, isHighTier, tierColors
} from './economy.js';
import { ParticleEngine } from './particleEngine.js';
import { AudioEngine } from './audioEngine.js';
import { HammerSystem } from './hammerSystem.js';

let _uCards = [];
let _gCards = [];
let _notifyCallback = null;
let _miniNotifyCallback = null;
let _flashCallback = null;

export const UpgradeSystem = {
  /** Set UI callbacks */
  setup({ onNotify, onMiniNotify, onFlash }) {
    _notifyCallback = onNotify;
    _miniNotifyCallback = onMiniNotify;
    _flashCallback = onFlash;
  },

  /** Build card DOM elements in the panel containers */
  buildCards() {
    const uList = document.getElementById('uList');
    const gList = document.getElementById('gList');
    if (!uList || !gList) return;

    uList.innerHTML = '';
    gList.innerHTML = '';
    _uCards = [];
    _gCards = [];

    UPGRADES.forEach(u => {
      const card = document.createElement('div');
      card.className = 'cd' + (u.tier !== 'common' ? ' ' + u.tier : '');
      card.addEventListener('click', () => this.buyUpgrade(u));
      uList.appendChild(card);
      _uCards.push(card);
    });

    GENERATORS.forEach(g => {
      const card = document.createElement('div');
      card.className = 'cd' + (g.tier !== 'common' ? ' ' + g.tier : '');
      card.addEventListener('click', () => this.buyGenerator(g));
      gList.appendChild(card);
      _gCards.push(card);
    });

    this.updateCards();
  },

  /** Update all card contents and disabled states */
  updateCards() {
    const golpes = State.get('golpes');
    const uc = State.get('upgradeCounts');
    const gc = State.get('generatorCounts');

    UPGRADES.forEach((u, i) => {
      if (!_uCards[i]) return;
      const n = uc[u.id] || 0;
      const c = calcCost(u.bc, u.gm, n);
      const ok = golpes >= c;

      _uCards[i].innerHTML = `
        <div class="cd-n">${u.icon} ${u.name}${tierLabel(u.tier)}</div>
        <div class="cd-d">${u.desc}</div>
        <div class="cd-c">💰 ${fmt(c)}</div>
        ${n ? `<div class="cd-cnt">x${n}</div>` : ''}
      `;
      _uCards[i].classList.toggle('off', !ok);
    });

    GENERATORS.forEach((g, i) => {
      if (!_gCards[i]) return;
      const n = gc[g.id] || 0;
      const c = calcCost(g.bc, g.gm, n);
      const ok = golpes >= c;

      _gCards[i].innerHTML = `
        <div class="cd-n">${g.icon} ${g.name}${tierLabel(g.tier)}</div>
        <div class="cd-d">${g.desc}</div>
        <div class="cd-c">💰 ${fmt(c)}</div>
        ${n ? `<div class="cd-cnt">x${n}</div>` : ''}
      `;
      _gCards[i].classList.toggle('off', !ok);
    });
  },

  /** Purchase a click upgrade */
  buyUpgrade(u) {
    const uc = { ...State.get('upgradeCounts') };
    const n = uc[u.id] || 0;
    const c = calcCost(u.bc, u.gm, n);
    if (State.get('golpes') < c) return;

    State.batch(() => {
      State.set('golpes', State.get('golpes') - c);
      uc[u.id] = n + 1;
      State.set('upgradeCounts', uc);
    });

    recalcClickPower();
    this._purchaseVFX(u, n, UPGRADES.indexOf(u), _uCards);

    if (_notifyCallback) _notifyCallback(`✅ ${u.name} — +${fmt(u.pw)}/clic`);
    if (_miniNotifyCallback) _miniNotifyCallback(`${u.icon} ${u.name} x${n + 1}`);
  },

  /** Purchase a generator */
  buyGenerator(g) {
    const gc = { ...State.get('generatorCounts') };
    const n = gc[g.id] || 0;
    const c = calcCost(g.bc, g.gm, n);
    if (State.get('golpes') < c) return;

    State.batch(() => {
      State.set('golpes', State.get('golpes') - c);
      gc[g.id] = n + 1;
      State.set('generatorCounts', gc);
    });

    recalcGPS();
    this._purchaseVFX(g, n, GENERATORS.indexOf(g), _gCards);

    if (_notifyCallback) _notifyCallback(`✅ ${g.name} — +${fmt(g.gps)}/seg`);
    if (_miniNotifyCallback) _miniNotifyCallback(`${g.icon} ${g.name} x${n + 1}`);
  },

  /** Shared purchase VFX logic */
  _purchaseVFX(item, prevCount, idx, cards) {
    // Card flash animation
    if (cards[idx]) {
      const flashClass = (item.tier === 'common' || item.tier === 'rare') ? 'flash' : 'flash-leg';
      cards[idx].classList.add(flashClass);
      setTimeout(() => cards[idx].classList.remove('flash', 'flash-leg'), 600);
    }

    // Hammer recoil animation (Part 3 — purchase bounce)
    HammerSystem.playRecoil();

    const { x: hx, y: hy } = HammerSystem.getCenter();
    const high = isHighTier(item.tier);

    if (high) {
      const cols = tierColors(item.tier);
      ParticleEngine.emitSparks(hx, hy, 30, cols, {
        speed: 120, life: .8, type: 'star', gravity: 60
      });
      ParticleEngine.emitLightning(
        hx, hy,
        hx + (Math.random() - .5) * 200,
        hy + (Math.random() - .5) * 200,
        cols[0], .3
      );
      if (_flashCallback) _flashCallback('rgba(139,92,246,.08)', .1);
      AudioEngine.play('buyHigh');
      try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
    } else {
      AudioEngine.play('buy');
      try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    }
  }
};
