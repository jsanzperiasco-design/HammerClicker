/* ═══════════════════════════════════════════════════════
   economy.js — Data Definitions · Cost Formulas · Crit Math
   SRP: All economic calculations, upgrade/generator data,
        prestige formulas, number formatting.
   ═══════════════════════════════════════════════════════ */

import { State } from './stateManager.js';

/* ── Number Formatting ── */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd'];

export function fmt(n) {
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return Math.floor(n).toString();
  const t = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const v = n / 10 ** (t * 3);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUFFIXES[t];
}

/* ═══ UPGRADE DEFINITIONS (15 tiers) ═══
   cost(n) = baseCost × growthRate^n
   growthRate ≈ 1.15–1.27 (higher tiers scale faster)
   ═══════════════════════════════════════ */
export const UPGRADES = [
  { id: 'u1',  name: 'Martillo Reforzado',      desc: '+1/clic',     icon: '🔨',  pw: 1,     bc: 15,     gm: 1.15, tier: 'common' },
  { id: 'u2',  name: 'Mango de Acero',           desc: '+5/clic',     icon: '⚒️',  pw: 5,     bc: 100,    gm: 1.15, tier: 'common' },
  { id: 'u3',  name: 'Punta de Diamante',        desc: '+25/clic',    icon: '💎',  pw: 25,    bc: 750,    gm: 1.16, tier: 'common' },
  { id: 'u4',  name: 'Núcleo Energético',        desc: '+100/clic',   icon: '⚡',  pw: 100,   bc: 5e3,    gm: 1.17, tier: 'common' },
  { id: 'u5',  name: 'Forja de Truenos',         desc: '+400/clic',   icon: '🌩️',  pw: 400,   bc: 3e4,    gm: 1.17, tier: 'rare' },
  { id: 'u6',  name: 'Martillo Mítico',          desc: '+1.5K/clic',  icon: '🌟',  pw: 1500,  bc: 18e4,   gm: 1.18, tier: 'rare' },
  { id: 'u7',  name: 'Aleación Celestial',       desc: '+5K/clic',    icon: '🌙',  pw: 5000,  bc: 1e6,    gm: 1.19, tier: 'rare' },
  { id: 'u8',  name: 'Forja Estelar',            desc: '+20K/clic',   icon: '✨',  pw: 2e4,   bc: 8e6,    gm: 1.20, tier: 'epic' },
  { id: 'u9',  name: 'Yunque Primordial',        desc: '+75K/clic',   icon: '🏔️',  pw: 75e3,  bc: 5e7,    gm: 1.21, tier: 'epic' },
  { id: 'u10', name: 'Martillo de Neutrones',    desc: '+300K/clic',  icon: '☢️',  pw: 3e5,   bc: 4e8,    gm: 1.22, tier: 'legendary' },
  { id: 'u11', name: 'Fragmento del Big Bang',   desc: '+1.2M/clic',  icon: '💥',  pw: 12e5,  bc: 3e9,    gm: 1.23, tier: 'legendary' },
  { id: 'u12', name: 'Martillo Omniversal',      desc: '+5M/clic',    icon: '🔮',  pw: 5e6,   bc: 25e9,   gm: 1.24, tier: 'legendary' },
  { id: 'u13', name: 'Chispa de la Creación',    desc: '+20M/clic',   icon: '🌠',  pw: 2e7,   bc: 2e11,   gm: 1.25, tier: 'mythic' },
  { id: 'u14', name: 'Eco del Vacío',            desc: '+100M/clic',  icon: '🕳️',  pw: 1e8,   bc: 2e12,   gm: 1.26, tier: 'mythic' },
  { id: 'u15', name: 'Martillo del Destino',     desc: '+500M/clic',  icon: '⚜️',  pw: 5e8,   bc: 2e13,   gm: 1.27, tier: 'divine' },
];

/* ═══ GENERATOR DEFINITIONS (15 tiers) ═══ */
export const GENERATORS = [
  { id: 'g1',  name: 'Aprendiz Herrero',         desc: '1/s',     icon: '👨‍🔧', gps: 1,     bc: 50,     gm: 1.14, tier: 'common' },
  { id: 'g2',  name: 'Fábrica Automática',       desc: '8/s',     icon: '🏭',  gps: 8,     bc: 400,    gm: 1.15, tier: 'common' },
  { id: 'g3',  name: 'Golem Mecánico',           desc: '40/s',    icon: '🤖',  gps: 40,    bc: 3e3,    gm: 1.16, tier: 'common' },
  { id: 'g4',  name: 'Forja Divina',             desc: '200/s',   icon: '🔥',  gps: 200,   bc: 2e4,    gm: 1.17, tier: 'common' },
  { id: 'g5',  name: 'Motor Celestial',          desc: '800/s',   icon: '⚙️',  gps: 800,   bc: 12e4,   gm: 1.17, tier: 'rare' },
  { id: 'g6',  name: 'Taller de Elfos',          desc: '3.5K/s',  icon: '🧝',  gps: 3500,  bc: 8e5,    gm: 1.18, tier: 'rare' },
  { id: 'g7',  name: 'Fragua Volcánica',         desc: '15K/s',   icon: '🌋',  gps: 15e3,  bc: 5e6,    gm: 1.19, tier: 'rare' },
  { id: 'g8',  name: 'Singularidad',             desc: '60K/s',   icon: '🌀',  gps: 6e4,   bc: 35e6,   gm: 1.20, tier: 'epic' },
  { id: 'g9',  name: 'Grieta Dimensional',       desc: '250K/s',  icon: '🕳️',  gps: 25e4,  bc: 25e7,   gm: 1.21, tier: 'epic' },
  { id: 'g10', name: 'Reactor de Antimateria',   desc: '1M/s',    icon: '⚛️',  gps: 1e6,   bc: 2e9,    gm: 1.22, tier: 'legendary' },
  { id: 'g11', name: 'Colisionador Cósmico',     desc: '4M/s',    icon: '🌌',  gps: 4e6,   bc: 15e9,   gm: 1.23, tier: 'legendary' },
  { id: 'g12', name: 'Tejedor del Tiempo',       desc: '20M/s',   icon: '⏳',  gps: 2e7,   bc: 12e10,  gm: 1.24, tier: 'legendary' },
  { id: 'g13', name: 'Motor de Realidades',      desc: '80M/s',   icon: '🌐',  gps: 8e7,   bc: 1e12,   gm: 1.25, tier: 'mythic' },
  { id: 'g14', name: 'Forja Primordial',         desc: '400M/s',  icon: '🪐',  gps: 4e8,   bc: 1e13,   gm: 1.26, tier: 'mythic' },
  { id: 'g15', name: 'Martillo Infinito',        desc: '2B/s',    icon: '♾️',  gps: 2e9,   bc: 1e14,   gm: 1.27, tier: 'divine' },
];

/* ═══ MILESTONE DEFINITIONS (15 thresholds) ═══ */
export const MILESTONES = [
  { th: 100,    name: 'Martillo de Bronce',    tier: 0, e: '🥉' },
  { th: 1e3,    name: 'Martillo de Hierro',    tier: 1, e: '⚒️' },
  { th: 1e4,    name: 'Martillo Ardiente',     tier: 2, e: '🔥' },
  { th: 1e5,    name: 'Martillo Eléctrico',    tier: 3, e: '⚡' },
  { th: 1e6,    name: 'Martillo Legendario',   tier: 4, e: '🌟' },
  { th: 1e7,    name: 'Martillo Divino',       tier: 4, e: '👑' },
  { th: 1e8,    name: 'Martillo del Cosmos',   tier: 5, e: '🌌' },
  { th: 1e9,    name: 'Martillo Omnipotente',  tier: 5, e: '💠' },
  { th: 1e10,   name: 'Martillo del Infinito', tier: 6, e: '♾️' },
  { th: 1e11,   name: 'Martillo Primordial',   tier: 6, e: '🔱' },
  { th: 1e12,   name: 'Martillo Absoluto',     tier: 7, e: '⚜️' },
  { th: 1e13,   name: 'Martillo Trascendente', tier: 7, e: '✨' },
  { th: 1e14,   name: 'Martillo de Dios',      tier: 8, e: '✝️' },
  { th: 1e15,   name: 'Más Allá del Martillo', tier: 8, e: '🪐' },
  { th: 1e16,   name: 'Omega',                 tier: 9, e: 'Ω'  },
];

/* ═══ FURY CONSTANTS ═══ */
export const FURY = {
  MULT:     3,
  DURATION: 12000,  // ms
  COOLDOWN: 45000   // ms
};

/* ═══ CRITICAL HIT SYSTEM ═══
   Statistical basis:
   p_crit = min(0.05 + 0.02 × floor(combo / 10), 0.25)

   At base (no combo):
     E[v] = 0.95×1 + 0.05×2.5 = 1.075  (+7.5% avg boost)
   This keeps crits rare but impactful.

   Super/Ultra require high combo AND secondary random gate,
   making them genuinely special events.
   ═══════════════════════════════════════════════════════ */
export const CRIT = {
  BASE_CHANCE:  0.05,
  COMBO_PER_10: 0.02,
  MAX_CHANCE:   0.25,
  NORM_MULT:    2.5,
  SUPER_MULT:   5,
  ULTRA_MULT:   10,
  SUPER_COMBO:  15,
  ULTRA_COMBO:  25,
  WINDOW_MS:    2000
};

/**
 * Roll for critical hit.
 * @param {number} combo — current combo count
 * @returns {{ type: 'normal'|'crit'|'super'|'ultra', mult: number }}
 */
export function rollCrit(combo) {
  const chance = Math.min(
    CRIT.BASE_CHANCE + CRIT.COMBO_PER_10 * Math.floor(combo / 10),
    CRIT.MAX_CHANCE
  );
  if (Math.random() >= chance) return { type: 'normal', mult: 1 };
  if (combo >= CRIT.ULTRA_COMBO && Math.random() < .1) return { type: 'ultra', mult: CRIT.ULTRA_MULT };
  if (combo >= CRIT.SUPER_COMBO && Math.random() < .3) return { type: 'super', mult: CRIT.SUPER_MULT };
  return { type: 'crit', mult: CRIT.NORM_MULT };
}

/* ═══ COST & VALUE FORMULAS ═══ */

/**
 * Cost of nth purchase: baseCost × growthRate^n
 * @param {number} baseCost
 * @param {number} growthRate
 * @param {number} owned — units already owned
 * @returns {number}
 */
export function calcCost(baseCost, growthRate, owned) {
  return Math.floor(baseCost * growthRate ** owned);
}

/** Recalculate total click power from all upgrades */
export function recalcClickPower() {
  let total = 1; // base
  const uc = State.get('upgradeCounts');
  UPGRADES.forEach(u => { total += u.pw * (uc[u.id] || 0); });
  State.set('clickPower', total);
}

/** Recalculate total GPS from all generators */
export function recalcGPS() {
  let total = 0;
  const gc = State.get('generatorCounts');
  GENERATORS.forEach(g => { total += g.gps * (gc[g.id] || 0); });
  State.set('gps', total);
}

/** Effective click power (with prestige + fury + ad bonus) */
export function effCP() {
  return State.get('clickPower') * State.get('prestigeMultiplier')
    * (State.get('furyActive') ? FURY.MULT : 1)
    * (State.get('bonusMultiplier') || 1);
}

/** Effective GPS (with prestige + fury + ad bonus) */
export function effGPS() {
  return State.get('gps') * State.get('prestigeMultiplier')
    * (State.get('furyActive') ? FURY.MULT : 1)
    * (State.get('bonusMultiplier') || 1);
}

/* ═══ PRESTIGE FORMULA ═══
   prestigeMultiplier = 1 + (level + 1) × 0.5 + floor(log10(lifetimeGolpes)) × 0.3
   Justification: Logarithmic scaling ensures diminishing returns,
   preventing runaway inflation while rewarding long-term play.
   ═══════════════════════════════════════════════════════ */
export function calcPrestigeMultiplier() {
  const lifetime = State.get('lifetimeGolpes');
  const level = State.get('prestigeLevel');
  if (lifetime < 1e4) return State.get('prestigeMultiplier');
  return 1 + (level + 1) * 0.5 + Math.floor(Math.log10(Math.max(lifetime, 1))) * 0.3;
}

/** Tier label HTML */
export function tierLabel(tier) {
  if (tier === 'common') return '';
  const map = {
    rare: '★ RARO', epic: '★★ ÉPICO',
    legendary: '★★★ LEGENDARIO', mythic: '✦ MÍTICO', divine: '✧ DIVINO'
  };
  return ` <span class="cd-tier tier-${tier}">${map[tier] || ''}</span>`;
}

/** Check if tier is "high" (special VFX on buy) */
export function isHighTier(tier) {
  return ['epic', 'legendary', 'mythic', 'divine'].includes(tier);
}

/** Get color palette for a tier */
export function tierColors(tier) {
  const map = {
    divine:    ['#06b6d4', '#fff', '#f59e0b'],
    mythic:    ['#ec4899', '#8b5cf6', '#fff'],
    legendary: ['#f59e0b', '#fbbf24', '#ef4444'],
    epic:      ['#8b5cf6', '#3b82f6', '#06b6d4']
  };
  return map[tier] || ['#f59e0b', '#fbbf24', '#f97316'];
}
