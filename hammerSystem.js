/* ═══════════════════════════════════════════════════════
   hammerSystem.js — Hammer Evolution with SVG Sprite System
   SRP: Manage hammer visual tiers, SVG rendering,
        material transitions, and animation triggers.

   11 Tiers (-1 through 9):
   -1  Base wooden mallet      0  Bronze
    1  Iron (silver)            2  Forged (blue-steel)
    3  Electric (purple)        4  Legendary (gold)
    5  Mythic (pink crystal)    6  Cosmic (cyan star)
    7  Divine (white-gold)      8  Transcendent (rainbow)
    9  Omega (ultimate energy)
   ═══════════════════════════════════════════════════════ */

import { State } from './stateManager.js';
import { MILESTONES } from './economy.js';

/* ═══ SVG SPRITE DEFINITIONS ═══ */

const SP = {};

// ── Tier -1: Basic Wooden Mallet ──
SP[-1] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#999"/><stop offset="100%" stop-color="#666"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a07040"/><stop offset="100%" stop-color="#7a5530"/>
    </linearGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="3" fill="url(#hg_s)" stroke="#5a3e15" stroke-width="1"/>
  <rect x="40" y="52" width="20" height="12" rx="2" fill="#777" stroke="#555" stroke-width="1"/>
  <rect x="18" y="18" width="64" height="36" rx="5" fill="url(#hg_h)" stroke="#555" stroke-width="1.5"/>
  <rect x="20" y="20" width="60" height="3" rx="1" fill="rgba(255,255,255,0.1)"/>
</svg>`;

// ── Tier 0: Bronze Hammer ──
SP[0] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#8B5A2B"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#6B4F12"/>
    </linearGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="3" fill="url(#hg_s)" stroke="#5a3e15" stroke-width="1"/>
  <rect x="46" y="92" width="8" height="2" rx="1" fill="#5a3e15" opacity=".4"/>
  <rect x="46" y="104" width="8" height="2" rx="1" fill="#5a3e15" opacity=".4"/>
  <rect x="46" y="116" width="8" height="2" rx="1" fill="#5a3e15" opacity=".4"/>
  <rect x="40" y="52" width="20" height="12" rx="2" fill="#9A7030" stroke="#6B4F12" stroke-width="1"/>
  <rect x="18" y="18" width="64" height="36" rx="5" fill="url(#hg_h)" stroke="#6B4F12" stroke-width="1.5"/>
  <rect x="20" y="20" width="60" height="3" rx="1" fill="rgba(255,255,255,.15)"/>
  <circle cx="30" cy="35" r="2.5" fill="#DBA04A" stroke="#8B5A2B" stroke-width=".5"/>
  <circle cx="70" cy="35" r="2.5" fill="#DBA04A" stroke="#8B5A2B" stroke-width=".5"/>
</svg>`;

// ── Tier 1: Iron Hammer ──
SP[1] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D0D0D0"/><stop offset="50%" stop-color="#A8A8A8"/><stop offset="100%" stop-color="#808080"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#888"/><stop offset="100%" stop-color="#666"/>
    </linearGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="3" fill="url(#hg_s)" stroke="#555" stroke-width="1"/>
  <rect x="42" y="78" width="16" height="4" rx="1" fill="#999" stroke="#555" stroke-width=".5"/>
  <rect x="42" y="98" width="16" height="4" rx="1" fill="#999" stroke="#555" stroke-width=".5"/>
  <rect x="38" y="52" width="24" height="12" rx="2" fill="#888" stroke="#555" stroke-width="1"/>
  <rect x="14" y="14" width="72" height="40" rx="4" fill="url(#hg_h)" stroke="#555" stroke-width="1.5"/>
  <rect x="17" y="16" width="66" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
  <line x1="14" y1="54" x2="86" y2="54" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
</svg>`;

// ── Tier 2: Forged Blue-Steel ──
SP[2] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4A90D9"/><stop offset="50%" stop-color="#2B5F9E"/><stop offset="100%" stop-color="#1A3D6E"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#555"/><stop offset="100%" stop-color="#333"/>
    </linearGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="2" fill="url(#hg_s)" stroke="#222" stroke-width="1"/>
  <rect x="43" y="82" width="14" height="3" rx="1" fill="#4A90D9" opacity=".35"/>
  <rect x="43" y="102" width="14" height="3" rx="1" fill="#4A90D9" opacity=".35"/>
  <rect x="38" y="50" width="24" height="14" rx="2" fill="#444" stroke="#222" stroke-width="1"/>
  <path d="M18,14 L82,14 L88,52 L12,52 Z" fill="url(#hg_h)" stroke="#1A3D6E" stroke-width="1.5"/>
  <line x1="18" y1="14" x2="12" y2="52" stroke="#7AB8FF" stroke-width="1" opacity=".45" class="svg-edge-glow"/>
  <line x1="82" y1="14" x2="88" y2="52" stroke="#7AB8FF" stroke-width="1" opacity=".45" class="svg-edge-glow"/>
  <line x1="20" y1="15" x2="80" y2="15" stroke="rgba(122,184,255,.35)" stroke-width="1.5"/>
</svg>`;

// ── Tier 3: Electric (Purple Energy) ──
SP[3] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9B59B6"/><stop offset="50%" stop-color="#7D3C98"/><stop offset="100%" stop-color="#5B2C6F"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#444"/><stop offset="100%" stop-color="#2a2a3a"/>
    </linearGradient>
    <radialGradient id="hg_c" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#D4AAFF"/><stop offset="60%" stop-color="#9B59B6" stop-opacity=".6"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="2" fill="url(#hg_s)" stroke="#1a1a2a" stroke-width="1"/>
  <line x1="50" y1="62" x2="50" y2="135" stroke="#9B59B6" stroke-width="2" opacity=".25" class="svg-pulse"/>
  <rect x="38" y="50" width="24" height="14" rx="2" fill="#3a2a4a" stroke="#1a1a2a" stroke-width="1"/>
  <path d="M14,12 L86,12 L94,34 L80,56 L20,56 L6,34 Z" fill="url(#hg_h)" stroke="#5B2C6F" stroke-width="1.5"/>
  <ellipse cx="50" cy="34" rx="14" ry="10" fill="url(#hg_c)" class="svg-pulse"/>
  <polyline points="30,18 35,30 28,33 36,48" fill="none" stroke="#D4AAFF" stroke-width="1" opacity=".45" class="svg-bolt"/>
  <polyline points="70,18 65,30 72,33 64,48" fill="none" stroke="#D4AAFF" stroke-width="1" opacity=".45" class="svg-bolt"/>
</svg>`;

// ── Tier 4: Legendary (Gold + Runes) ──
SP[4] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/><stop offset="35%" stop-color="#FFC107"/><stop offset="70%" stop-color="#DAA520"/><stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8B6914"/><stop offset="100%" stop-color="#6B4F12"/>
    </linearGradient>
    <radialGradient id="hg_c" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFA500"/><stop offset="100%" stop-color="#FF6600"/>
    </radialGradient>
  </defs>
  <rect x="44" y="58" width="12" height="82" rx="3" fill="url(#hg_s)" stroke="#5a3e0a" stroke-width="1"/>
  <rect x="42" y="74" width="16" height="5" rx="1" fill="#DAA520" opacity=".55"/>
  <rect x="42" y="94" width="16" height="5" rx="1" fill="#DAA520" opacity=".55"/>
  <rect x="42" y="114" width="16" height="5" rx="1" fill="#DAA520" opacity=".55"/>
  <circle cx="50" cy="142" r="4" fill="url(#hg_c)" stroke="#B8860B" stroke-width="1"/>
  <rect x="36" y="50" width="28" height="14" rx="3" fill="#DAA520" stroke="#B8860B" stroke-width="1"/>
  <path d="M12,30 Q12,10 32,10 L68,10 Q88,10 88,30 L88,48 Q88,60 68,60 L32,60 Q12,60 12,48 Z" fill="url(#hg_h)" stroke="#B8860B" stroke-width="1.5"/>
  <circle cx="50" cy="35" r="6" fill="url(#hg_c)" stroke="#B8860B" stroke-width="1"/>
  <text x="28" y="40" font-size="9" fill="#FFF" opacity=".35" font-family="serif" class="svg-rune">ᚱ</text>
  <text x="67" y="40" font-size="9" fill="#FFF" opacity=".35" font-family="serif" class="svg-rune">ᚦ</text>
  <path d="M20,16 Q25,24 18,27" fill="none" stroke="rgba(255,255,255,.2)" stroke-width=".8"/>
  <path d="M80,16 Q75,24 82,27" fill="none" stroke="rgba(255,255,255,.2)" stroke-width=".8"/>
</svg>`;

// ── Tier 5: Mythic (Crystal + Floating Shards) ──
SP[5] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EC4899"/><stop offset="50%" stop-color="#A855F7"/><stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a2060"/><stop offset="100%" stop-color="#2a1040"/>
    </linearGradient>
    <radialGradient id="hg_a" cx="50%" cy="40%">
      <stop offset="0%" stop-color="rgba(236,72,153,.25)"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="35" rx="44" ry="34" fill="url(#hg_a)" class="svg-aura"/>
  <rect x="44" y="58" width="12" height="82" rx="2" fill="url(#hg_s)" stroke="#1a0830" stroke-width="1"/>
  <line x1="50" y1="62" x2="50" y2="135" stroke="#EC4899" stroke-width="1.5" opacity=".25" class="svg-pulse"/>
  <rect x="38" y="50" width="24" height="14" rx="2" fill="#5a2070" stroke="#3a1050" stroke-width="1"/>
  <path d="M50,4 L82,24 L72,58 L28,58 L18,24 Z" fill="url(#hg_h)" stroke="#7C3AED" stroke-width="1.5"/>
  <path d="M8,14 L16,10 L18,20 Z" fill="#EC4899" opacity=".5" class="svg-shard-1"/>
  <path d="M82,14 L90,8 L92,18 Z" fill="#A855F7" opacity=".5" class="svg-shard-2"/>
  <path d="M4,38 L12,34 L10,44 Z" fill="#7C3AED" opacity=".4" class="svg-shard-3"/>
  <line x1="50" y1="8" x2="50" y2="54" stroke="rgba(255,255,255,.08)" stroke-width=".5"/>
  <line x1="22" y1="32" x2="78" y2="32" stroke="rgba(255,255,255,.08)" stroke-width=".5"/>
  <circle cx="50" cy="32" r="7" fill="rgba(236,72,153,.25)" class="svg-pulse"/>
</svg>`;

// ── Tier 6: Cosmic (Star-Forged + Constellation) ──
SP[6] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06B6D4"/><stop offset="50%" stop-color="#0891B2"/><stop offset="100%" stop-color="#0E7490"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3a4a"/><stop offset="100%" stop-color="#0d2030"/>
    </linearGradient>
    <radialGradient id="hg_a" cx="50%" cy="50%">
      <stop offset="0%" stop-color="rgba(224,247,250,.2)"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="34" rx="48" ry="36" fill="url(#hg_a)" class="svg-aura"/>
  <rect x="44" y="58" width="12" height="82" rx="2" fill="url(#hg_s)" stroke="#0d2030" stroke-width="1"/>
  <rect x="43" y="78" width="14" height="3" rx="1" fill="#06B6D4" opacity=".35"/>
  <rect x="43" y="98" width="14" height="3" rx="1" fill="#06B6D4" opacity=".25"/>
  <rect x="38" y="50" width="24" height="14" rx="2" fill="#0E7490" stroke="#0d2030" stroke-width="1"/>
  <path d="M50,2 L64,20 L88,24 L72,42 L76,64 L50,52 L24,64 L28,42 L12,24 L36,20 Z" fill="url(#hg_h)" stroke="#0E7490" stroke-width="1.5"/>
  <ellipse cx="50" cy="33" rx="32" ry="22" fill="none" stroke="#E0F7FA" stroke-width=".7" opacity=".2" stroke-dasharray="4 4" class="svg-orbit-ring"/>
  <circle cx="32" cy="18" r="1.5" fill="#E0F7FA" opacity=".5" class="svg-star-1"/>
  <circle cx="72" cy="22" r="1" fill="#E0F7FA" opacity=".4" class="svg-star-2"/>
  <circle cx="50" cy="8" r="1.3" fill="#fff" opacity=".5" class="svg-star-1"/>
  <circle cx="38" cy="48" r="1" fill="#E0F7FA" opacity=".3" class="svg-star-2"/>
  <circle cx="65" cy="46" r=".8" fill="#E0F7FA" opacity=".3" class="svg-star-1"/>
</svg>`;

// ── Tier 7: Divine (Winged + Halo) ──
SP[7] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFDE7"/><stop offset="35%" stop-color="#FFD700"/><stop offset="100%" stop-color="#DAA520"/>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#DAA520"/><stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
    <radialGradient id="hg_a" cx="50%" cy="45%">
      <stop offset="0%" stop-color="rgba(255,253,231,.3)"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="30" rx="48" ry="38" fill="url(#hg_a)" class="svg-aura"/>
  <line x1="50" y1="-5" x2="50" y2="68" stroke="#FFD700" stroke-width=".5" opacity=".12"/>
  <line x1="5" y1="30" x2="95" y2="30" stroke="#FFD700" stroke-width=".5" opacity=".12"/>
  <line x1="18" y1="2" x2="82" y2="58" stroke="#FFD700" stroke-width=".3" opacity=".08"/>
  <line x1="82" y1="2" x2="18" y2="58" stroke="#FFD700" stroke-width=".3" opacity=".08"/>
  <rect x="44" y="58" width="12" height="82" rx="3" fill="url(#hg_s)" stroke="#B8860B" stroke-width="1"/>
  <rect x="42" y="76" width="16" height="4" rx="1" fill="#FFD700" opacity=".45"/>
  <rect x="42" y="96" width="16" height="4" rx="1" fill="#FFD700" opacity=".45"/>
  <rect x="36" y="50" width="28" height="14" rx="3" fill="#DAA520" stroke="#B8860B" stroke-width="1"/>
  <path d="M50,8 L72,18 L95,4 L83,32 L90,58 L50,44 L10,58 L17,32 L5,4 L28,18 Z" fill="url(#hg_h)" stroke="#B8860B" stroke-width="1.5"/>
  <ellipse cx="50" cy="4" rx="18" ry="5" fill="none" stroke="#FFD700" stroke-width="1.5" opacity=".4" class="svg-halo"/>
  <circle cx="50" cy="30" r="5" fill="rgba(255,253,231,.5)" class="svg-pulse"/>
  <circle cx="50" cy="30" r="9" fill="none" stroke="#FFD700" stroke-width=".5" opacity=".25"/>
</svg>`;

// ── Tier 8: Transcendent (Fragmented + Rainbow) ──
SP[8] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <linearGradient id="hg_h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ef4444">
        <animate attributeName="stop-color" values="#ef4444;#f59e0b;#10b981;#06b6d4;#8b5cf6;#ec4899;#ef4444" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#8b5cf6">
        <animate attributeName="stop-color" values="#8b5cf6;#ec4899;#ef4444;#f59e0b;#10b981;#06b6d4;#8b5cf6" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#06b6d4">
        <animate attributeName="stop-color" values="#06b6d4;#10b981;#f59e0b;#ef4444;#ec4899;#8b5cf6;#06b6d4" dur="4s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <linearGradient id="hg_s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333"/><stop offset="100%" stop-color="#1a1a2a"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="34" rx="46" ry="36" fill="rgba(139,92,246,.06)" class="svg-aura"/>
  <rect x="44" y="60" width="12" height="80" rx="2" fill="url(#hg_s)" stroke="#111" stroke-width="1"/>
  <line x1="50" y1="62" x2="50" y2="136" stroke="url(#hg_h)" stroke-width="2" opacity=".25"/>
  <rect x="38" y="52" width="24" height="14" rx="2" fill="#2a2a3a" stroke="#111" stroke-width="1"/>
  <path d="M26,14 L74,14 L78,52 L22,52 Z" fill="url(#hg_h)" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
  <path d="M10,6 L22,11 L18,22 L6,17 Z" fill="url(#hg_h)" opacity=".65" class="svg-frag-1"/>
  <path d="M78,6 L90,11 L86,22 L74,17 Z" fill="url(#hg_h)" opacity=".65" class="svg-frag-2"/>
  <path d="M43,0 L57,0 L55,12 L45,12 Z" fill="url(#hg_h)" opacity=".55" class="svg-frag-3"/>
  <line x1="36" y1="18" x2="28" y2="48" stroke="#fff" stroke-width=".7" opacity=".2"/>
  <line x1="64" y1="18" x2="72" y2="48" stroke="#fff" stroke-width=".7" opacity=".2"/>
  <line x1="50" y1="14" x2="50" y2="52" stroke="#fff" stroke-width=".5" opacity=".15"/>
</svg>`;

// ── Tier 9: Omega (Ultimate Energy Form) ──
SP[9] = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" class="hammer-svg">
  <defs>
    <radialGradient id="hg_a" cx="50%" cy="38%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".25"/><stop offset="30%" stop-color="#FFD700" stop-opacity=".15"/><stop offset="60%" stop-color="#f59e0b" stop-opacity=".08"/><stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <linearGradient id="hg_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/><stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="hg_e" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="36" rx="50" ry="42" fill="url(#hg_a)" class="svg-omega-aura"/>
  <rect x="46" y="58" width="8" height="82" rx="2" fill="url(#hg_e)" opacity=".75"/>
  <rect x="44" y="58" width="12" height="82" rx="2" fill="none" stroke="#FFD700" stroke-width=".5" opacity=".25"/>
  <path d="M44,72 Q38,82 44,92 Q38,102 44,112 Q38,122 44,132" fill="none" stroke="#FFD700" stroke-width=".7" opacity=".25" class="svg-spiral-1"/>
  <path d="M56,72 Q62,82 56,92 Q62,102 56,112 Q62,122 56,132" fill="none" stroke="#8b5cf6" stroke-width=".7" opacity=".25" class="svg-spiral-2"/>
  <rect x="36" y="50" width="28" height="14" rx="3" fill="#f59e0b" stroke="#FFD700" stroke-width="1" opacity=".65"/>
  <circle cx="50" cy="30" r="28" fill="url(#hg_h)" stroke="#FFD700" stroke-width="2" opacity=".85"/>
  <circle cx="50" cy="30" r="20" fill="none" stroke="#fff" stroke-width=".5" opacity=".25"/>
  <circle cx="50" cy="30" r="12" fill="none" stroke="#fff" stroke-width=".5" opacity=".15"/>
  <circle cx="50" cy="30" r="5" fill="#fff" opacity=".7" class="svg-pulse"/>
  <text x="50" y="37" font-size="18" fill="#fff" opacity=".65" text-anchor="middle" font-family="serif" font-weight="bold" class="svg-omega-sym">Ω</text>
  <circle r="2" fill="#FFD700" opacity=".55">
    <animateTransform attributeName="transform" type="rotate" from="0 50 30" to="360 50 30" dur="3s" repeatCount="indefinite"/>
    <animateMotion dur="3s" repeatCount="indefinite" path="M22,30 A28,28 0 1,1 22,30.01"/>
  </circle>
  <circle r="1.5" fill="#8b5cf6" opacity=".45">
    <animateTransform attributeName="transform" type="rotate" from="360 50 30" to="0 50 30" dur="4.5s" repeatCount="indefinite"/>
    <animateMotion dur="4.5s" repeatCount="indefinite" path="M28,30 A22,22 0 1,0 28,30.01"/>
  </circle>
  <circle r="1" fill="#06b6d4" opacity=".4">
    <animateTransform attributeName="transform" type="rotate" from="0 50 30" to="360 50 30" dur="6s" repeatCount="indefinite"/>
    <animateMotion dur="6s" repeatCount="indefinite" path="M15,30 A35,35 0 1,1 15,30.01"/>
  </circle>
</svg>`;


/* ═══════════════════════════════════════════════════════
   HAMMER SYSTEM — Visual State Manager
   ═══════════════════════════════════════════════════════ */

let _hammerEl = null;
let _nebulaEl = null;
let _currentTier = -1;

export const HammerSystem = {
  /** Initialize with DOM references */
  init(hammerEl, nebulaEl) {
    _hammerEl = hammerEl;
    _nebulaEl = nebulaEl;
    // Render initial SVG sprite
    this._renderHammer(-1);
  },

  /** Render SVG sprite for given tier */
  _renderHammer(tier) {
    if (!_hammerEl) return;
    const svg = SP[tier] || SP[-1];
    _hammerEl.innerHTML = svg;
  },

  /**
   * Determine the highest tier achieved from milestones.
   * @returns {number} tier (0–9)
   */
  getMaxTier() {
    let maxTier = -1;
    const milestones = State.get('milestones') || [];
    milestones.forEach(idx => {
      if (MILESTONES[idx] && MILESTONES[idx].tier > maxTier) {
        maxTier = MILESTONES[idx].tier;
      }
    });
    return maxTier;
  },

  /**
   * Get the form name for a given tier.
   */
  getFormName(tier) {
    const forms = [
      'bronze', 'iron', 'forged', 'electric', 'legendary',
      'mythic', 'cosmic', 'divine', 'transcendent', 'omega'
    ];
    return forms[Math.max(0, Math.min(tier, forms.length - 1))] || 'basic';
  },

  /**
   * Apply visual tier to hammer element.
   * Updates SVG sprite, CSS tier class, and nebula.
   */
  applyTier(tier) {
    if (!_hammerEl || tier === _currentTier) return;
    _currentTier = tier;

    // Remove all tier classes
    for (let i = 0; i <= 9; i++) {
      _hammerEl.classList.remove('t' + i);
    }

    // Apply new tier class (for external glow/filter effects)
    if (tier >= 0) {
      _hammerEl.classList.add('t' + Math.min(tier, 9));
    }

    // Render SVG sprite for this tier
    this._renderHammer(tier);

    // Update nebula background
    this._updateNebula(tier);
  },

  /** Apply current max tier (call after loading save) */
  applyCurrentTier() {
    const tier = this.getMaxTier();
    this.applyTier(tier);
  },

  /** Reset hammer to base state */
  reset() {
    if (_hammerEl) {
      _hammerEl.className = 'hmr';
    }
    _currentTier = -1;
    this._renderHammer(-1);
    this._updateNebula(-1);
  },

  /** Trigger click animation */
  playClickAnim() {
    if (!_hammerEl) return;
    _hammerEl.classList.remove('click');
    void _hammerEl.offsetWidth;
    _hammerEl.classList.add('click');
    setTimeout(() => _hammerEl.classList.remove('click'), 120);
  },

  /** Trigger shake animation */
  playShakeAnim() {
    if (!_hammerEl) return;
    _hammerEl.classList.add('shake');
    setTimeout(() => _hammerEl.classList.remove('shake'), 500);
  },

  /** Get center position of hammer element */
  getCenter() {
    if (!_hammerEl) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = _hammerEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },

  /** Get current tier */
  get currentTier() { return _currentTier; },

  /* ═══ Enhanced Animation Methods ═══ */

  /** Play impact strike — normal click */
  playImpactStrike() {
    if (!_hammerEl) return;
    const tc = _currentTier >= 0 ? 't' + Math.min(_currentTier, 9) : null;
    if (tc) _hammerEl.classList.remove(tc);
    _hammerEl.classList.remove('click', 'impact-strike', 'deep-strike', 'mega-strike', 'recoil');
    void _hammerEl.offsetWidth;
    _hammerEl.classList.add('impact-strike');
    setTimeout(() => {
      _hammerEl.classList.remove('impact-strike');
      if (tc) _hammerEl.classList.add(tc);
    }, 230);
  },

  /** Play deep strike — critical hit */
  playDeepStrike() {
    if (!_hammerEl) return;
    const tc = _currentTier >= 0 ? 't' + Math.min(_currentTier, 9) : null;
    if (tc) _hammerEl.classList.remove(tc);
    _hammerEl.classList.remove('click', 'impact-strike', 'deep-strike', 'mega-strike', 'recoil');
    void _hammerEl.offsetWidth;
    _hammerEl.classList.add('deep-strike');
    setTimeout(() => {
      _hammerEl.classList.remove('deep-strike');
      if (tc) _hammerEl.classList.add(tc);
    }, 310);
  },

  /** Play 360° milestone celebration */
  playMilestone360() {
    if (!_hammerEl) return;
    const tc = _currentTier >= 0 ? 't' + Math.min(_currentTier, 9) : null;
    if (tc) _hammerEl.classList.remove(tc);
    _hammerEl.classList.remove('click', 'impact-strike', 'deep-strike', 'mega-strike', 'spin', 'milestone-360', 'recoil');
    void _hammerEl.offsetWidth;
    _hammerEl.classList.add('milestone-360');
    setTimeout(() => {
      _hammerEl.classList.remove('milestone-360');
      if (tc) _hammerEl.classList.add(tc);
    }, 1250);
  },

  /** Play recoil — on purchase */
  playRecoil() {
    if (!_hammerEl) return;
    const tc = _currentTier >= 0 ? 't' + Math.min(_currentTier, 9) : null;
    if (tc) _hammerEl.classList.remove(tc);
    _hammerEl.classList.remove('click', 'impact-strike', 'deep-strike', 'mega-strike', 'recoil');
    void _hammerEl.offsetWidth;
    _hammerEl.classList.add('recoil');
    setTimeout(() => {
      _hammerEl.classList.remove('recoil');
      if (tc) _hammerEl.classList.add(tc);
    }, 420);
  },

  /** Update nebula background based on tier */
  _updateNebula(tier) {
    if (!_nebulaEl) return;
    _nebulaEl.className = 'nebula';
    if (tier >= 8)      _nebulaEl.classList.add('t8');
    else if (tier >= 6) _nebulaEl.classList.add('t6');
    else if (tier >= 4) _nebulaEl.classList.add('t4');
    else if (tier >= 2) _nebulaEl.classList.add('t2');
  }
};
