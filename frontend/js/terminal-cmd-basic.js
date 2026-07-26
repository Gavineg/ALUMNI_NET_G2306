/**
 * terminal-cmd-basic.js — always loaded
 * Handles commands visible before KONAMI unlock.
 * Heavy advanced commands are dynamically imported after unlock.
 */

import { API_BASE } from './config.js';

// ── Theme definitions ─────────────────────────────────────────

export const THEMES = {
  DEFAULT:      { '--hud-primary':'#b8ff47',  '--hud-danger':'#ff4b1f', '--hud-bg':'#050709',  '--hud-border':'rgba(184,255,71,0.35)', '--hud-text-dim':'rgba(184,255,71,0.55)', '--hud-grid':'rgba(184,255,71,0.06)', '--hud-dim':'rgba(184,255,71,0.15)' },
  MATRIX_GREEN: { '--hud-primary':'#00ff41',  '--hud-danger':'#ff4b1f', '--hud-bg':'#001a00',  '--hud-border':'rgba(0,255,65,0.4)',    '--hud-text-dim':'rgba(0,255,65,0.55)',   '--hud-grid':'rgba(0,255,65,0.06)',   '--hud-dim':'rgba(0,255,65,0.15)'   },
  ICE_BLUE:     { '--hud-primary':'#00e5ff',  '--hud-danger':'#ff4b6e', '--hud-bg':'#000a0f',  '--hud-border':'rgba(0,229,255,0.4)',   '--hud-text-dim':'rgba(0,229,255,0.55)', '--hud-grid':'rgba(0,229,255,0.06)', '--hud-dim':'rgba(0,229,255,0.15)'  },
  BLOOD_RED:    { '--hud-primary':'#ff1a1a',  '--hud-danger':'#ff9900', '--hud-bg':'#0d0000',  '--hud-border':'rgba(255,26,26,0.4)',   '--hud-text-dim':'rgba(255,26,26,0.55)', '--hud-grid':'rgba(255,26,26,0.06)', '--hud-dim':'rgba(255,26,26,0.15)'  },
  AMBER:        { '--hud-primary':'#ffb000',  '--hud-danger':'#ff4b1f', '--hud-bg':'#0a0600',  '--hud-border':'rgba(255,176,0,0.4)',   '--hud-text-dim':'rgba(255,176,0,0.55)', '--hud-grid':'rgba(255,176,0,0.06)', '--hud-dim':'rgba(255,176,0,0.15)'  },
  PHANTOM:      { '--hud-primary':'#cc00ff',  '--hud-danger':'#ff4b1f', '--hud-bg':'#06000d',  '--hud-border':'rgba(204,0,255,0.4)',   '--hud-text-dim':'rgba(204,0,255,0.55)', '--hud-grid':'rgba(204,0,255,0.06)', '--hud-dim':'rgba(204,0,255,0.15)'  },
};

export function applyTheme(name) {
  const vars = THEMES[name];
  if (!vars) return;
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  sessionStorage.setItem('g2306_theme', name);
}

export function restoreTheme() {
  const saved = sessionStorage.getItem('g2306_theme');
  if (saved && THEMES[saved]) applyTheme(saved);
}

// ── Unlock state ──────────────────────────────────────────────

export function isUnlocked() { return sessionStorage.getItem('g2306_unlocked') === '1'; }
export function setUnlocked() { sessionStorage.setItem('g2306_unlocked', '1'); }

export const BASIC_CMDS   = ['help','whoami','date','time','stats','find','reboot','clear','cls','fullscreen','fs','exit','quit','close','matrix','konami','sl','fortune','42','coffee','about','credits','yearbook','yearbook.exe'];
export const ADVANCED_CMDS = ['login','logout','portal','dashboard','cd','me','set','passwd','roster','classmates','scan','connect','port','crack','exploit','download','disconnect','loot','apply','themes','restore','vim','vi','nano','mkdir','touch','echo','rm','del','cat','ls','dir','reinstall','hack','sudo','su'];

// ── Prompt prefix ─────────────────────────────────────────────

export function getPromptPrefix(token) {
  if (!token) return 'C:\\G2306';
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    const u = (p.username || p.name || 'GUEST').toUpperCase().replace(/\s+/g, '_');
    const connected = sessionStorage.getItem('g2306_connected');
    if (connected) {
      try {
        const t = JSON.parse(connected);
        if (t && t.ip) return t.ip;
      } catch {}
    }
    return `C:\\G2306\\${u}`;
  } catch { return 'C:\\G2306'; }
}

// ── Helpers ───────────────────────────────────────────────────

const FORTUNES = [
  'YOU WILL FIND A BUG TODAY. YOU WROTE IT YESTERDAY.',
  'A WATCHED BUILD NEVER COMPLETES.',
  '99 LITTLE BUGS IN THE CODE, 99 LITTLE BUGS...',
  'THE CAKE IS A LIE. THE FOOD IS REAL. GO CENGFAN.',
  'RESISTANCE IS FUTILE. COMMIT YOUR CHANGES.',
  "THERE IS NO CLOUD. IT IS JUST SOMEONE ELSE'S COMPUTER."
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function L(text, status) { return { text, status }; }

function helpLines() {
  return [
    L('  [ ???? ]'),
    L('    help            — show this help'),
    L('    reboot [-f]     — reload page; -f clears cache'),
    L('    date            — show current date/time'),
    L('    whoami          — show current user'),
    L('    stats           — cohort statistics'),
    L('    find <name>     — locate a student on map'),
    L('    MATRIX          — ???'),
    L('    KONAMI          — ↑↑↓↓←→←→BA'),
    L('    SL              — CHOO CHOO'),
    L('    FORTUNE         — ASK THE ORACLE'),
    L('    42              — THE ANSWER'),
    L('    COFFEE          — BREW A CUP'),
    L('    ABOUT / CREDITS — PROJECT INFO'),
    L('    YEARBOOK.EXE    — ???'),
    L(''),
  ];
}

// ── Advanced module cache ─────────────────────────────────────

let _advanced = null;
async function getAdvanced() {
  if (!_advanced) _advanced = await import('./terminal-cmd-advanced.js');
  return _advanced;
}

// ── Main command dispatch ─────────────────────────────────────

export async function runCommand(raw, ctx) {
  const input = raw.trim();
  if (!input) return [];
  const [cmdRaw, ...rest] = input.split(/\s+/);
  const cmd  = cmdRaw.toLowerCase();
  const arg  = rest.join(' ');
  const arg1 = rest[0] || '';

  ctx.openPanel();

  // ── Always-available system commands ─────────────────────────
  if (cmd === '?' || cmd === 'help' || cmd === '/help') return helpLines();

  if (cmd === 'whoami') {
    const tok = ctx.getToken();
    if (!tok) return [L('GUEST @ ALUMNI_NET_G2306'), L('ACCESS_LEVEL :: OBSERVER'), L('CLEARANCE :: NONE', 'ERR')];
    try {
      const p = JSON.parse(atob(tok.split('.')[1]));
      return [L(`USER :: ${p.name}`), L(`ROLE :: ${p.admin ? 'ADMINISTRATOR' : 'STUDENT'}`, 'OK'), L('ACCESS_LEVEL :: AUTHENTICATED', 'OK')];
    } catch { return [L('TOKEN DECODE ERROR', 'ERR')]; }
  }

  if (cmd === 'date' || cmd === 'time') return [L(new Date().toString().toUpperCase())];
  if (cmd === 'clear' || cmd === 'cls') { ctx.clearTerminal(); return []; }
  if (cmd === 'fullscreen' || cmd === 'fs') { ctx.setFullscreen(true); return [L('FULLSCREEN MODE. TYPE EXIT TO RETURN TO MAP.', 'RDY')]; }
  if (cmd === 'exit' || cmd === 'quit' || cmd === 'close') { ctx.setFullscreen(false); ctx.closePanel(); return []; }

  if (cmd === 'stats') {
    const data = ctx.getMapData();
    if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
    const unis  = data.universities;
    const studs = unis.reduce((s, u) => s + (u.members?.length || 0), 0);
    const ready = unis.reduce((s, u) => s + (u.members?.filter(m => m.canCengfan).length || 0), 0);
    return [L(`UNIVERSITIES :: ${unis.length}`), L(`STUDENTS     :: ${studs}`), L(`READY_FOR_FOOD :: ${ready}`, ready > 0 ? 'OK' : undefined)];
  }

  if (cmd === 'find') {
    if (!arg) return [L('USAGE: FIND <NAME>', 'ERR')];
    const data = ctx.getMapData();
    if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
    const needle = arg.toLowerCase();
    for (const u of data.universities) {
      const hit = (u.members || []).find(m => (m.name || '').toLowerCase().includes(needle));
      if (hit) {
        ctx.flyTo(u.longitude, u.latitude);
        return [L(`TARGET LOCATED :: ${hit.name}`), L(`UNIVERSITY :: ${u.university}`), L(`CITY :: ${u.city || 'UNKNOWN'}`), L('MAP FOCUS LOCKED.', 'OK')];
      }
    }
    return [L(`NO MATCH FOR "${arg.toUpperCase()}"`, 'ERR')];
  }

  // ── Easter eggs (always-visible) ─────────────────────────────
  if (cmd === 'matrix') return [L('WAKE UP...'), L('THE MATRIX HAS YOU.'), L('FOLLOW THE WHITE RABBIT.'), L('01000111 00110010 00110011 00110000 00110110')];
  if (cmd === 'sl')      return [L('🚂 CHOO CHOO...'), L('A TRAIN PASSES THROUGH THE TERMINAL.')];
  if (cmd === 'fortune') return [L(pick(FORTUNES))];
  if (cmd === '42')      return [L('THE ANSWER TO LIFE, THE UNIVERSE, AND EVERYTHING.')];
  if (cmd === 'coffee')  return [L('BREWING...'), L("418 I'M A TEAPOT", 'ERR'), L('(THIS TERMINAL CANNOT MAKE COFFEE)')];
  if (cmd === 'about' || cmd === 'credits') {
    const data = ctx.getMapData();
    const studs = data ? data.universities.reduce((s, u) => s + (u.members?.length || 0), 0) : '??';
    const onlineStart = new Date('2026-07-22T00:00:00+08:00').getTime();
    function fmtUptime() {
      const ms = Math.max(0, Date.now() - onlineStart);
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return `${h}H ${String(m).padStart(2,'0')}M ${String(s).padStart(2,'0')}S`;
    }
    // Fetch commit count from GitHub
    let commitCount = '...';
    let githubMessage = 'UNKNOWN';
    try {
      const r = await fetch('https://api.github.com/repos/Gavineg/ALUMNI_NET_G2306/commits?per_page=1', { headers: { Accept: 'application/vnd.github.v3+json' } });
      const data = await r.json().catch(() => null);
      const link = r.headers.get('Link') || '';
      const m2 = link.match(/&page=(\d+)>; rel="last"/);
      commitCount = m2 ? m2[1] : '?';

      if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message.trim()) {
        githubMessage = String(data.message);
      } else if (Array.isArray(data) && data[0]?.commit?.message) {
        githubMessage = String(data[0].commit.message);
      } else if (r.ok) {
        githubMessage = 'API OK';
      } else {
        githubMessage = 'UNAVAILABLE';
      }
    } catch (e) {
      githubMessage = e?.message || 'UNAVAILABLE';
    }
    return [
      L('ALUMNI_NET :: G2306'),
      L(`VERSION: v${commitCount}`),
      { text: `ONLINE TIME: ${fmtUptime()}`, live(div) {
        setInterval(() => { div.textContent = `ONLINE TIME: ${fmtUptime()}`; }, 1000);
      }},
      L(`COMMITS: ${commitCount}`),
      L('STATUS: ONLINE', 'OK'),
      L(`BUG FIXED: ${githubMessage || 'UNKNOWN'}`),
      L('SLEEP: 404 NOT FOUND'),
      L('THANK YOU FOR VISITING.', 'OK'),
    ];
  }

  if (cmd === 'yearbook.exe' || cmd === 'yearbook') {
    if (ctx.launchYearbook) {
      ctx.launchYearbook();
      return [L('> YEARBOOK.EXE — LOADING ARCHIVE SYSTEM...'), L('> DECRYPTING G2306 MEMORY FRAGMENTS...'), L('> [OK]'), L('')];
    }
    return [L('> YEARBOOK.EXE: MODULE UNAVAILABLE', 'ERR')];
  }

  if (cmd === 'reboot') {
    const force = arg1 === '-f';
    setTimeout(() => {
      if (force) sessionStorage.removeItem('g2306_map_cache');
      window.location.href = window.location.pathname + (force ? '?_=' + Date.now() : '');
    }, 1200);
    return [
      L('> Broadcast message from root@localhost'),
      L(`> (/dev/pts/0) at ${new Date().toString().toUpperCase()}...`),
      L(force ? '> The system is going down for reboot NOW!  [FORCE: cache purged]' : '> The system is going down for reboot NOW!'),
      L(''),
    ];
  }

  // ── KONAMI — unlock advanced module ──────────────────────────
  if (cmd === 'konami') {
    await ctx.print([
      L('↑ ↑ ↓ ↓ ← → ← → B A'),
      L('> CHEAT CODE DETECTED.', 'RDY'),
      L('> WARNING: This will unlock all system commands.'),
      L('> Are you sure? Type YES to confirm:'),
    ]);
    const c1 = await ctx.promptLine('> ');
    if (c1?.trim().toUpperCase() !== 'YES') return [L('ABORTED.', 'ERR')];
    await ctx.print([L('> CONFIRM AGAIN — type OVERRIDE to proceed:')]);
    const c2 = await ctx.promptLine('> ');
    if (c2?.trim().toUpperCase() !== 'OVERRIDE') return [L('ABORTED.', 'ERR')];

    await ctx.print([
      L('> LOADING SYSTEM MODULES...'),
      L('  [██        ] 20%  — auth.sys'),
      L('  [████      ] 40%  — hack.bin'),
      L('  [██████    ] 60%  — roster.db'),
      L('  [████████  ] 80%  — cmd.dll'),
    ]);
    // Trigger the dynamic import while progress bar is showing
    const adv = await getAdvanced();
    setUnlocked();
    return [
      L('  [██████████] 100% — DONE', 'OK'),
      L(''),
      L('+30 LIVES GRANTED.', 'OK'),
      L('FULL COMMAND SET UNLOCKED.', 'OK'),
      L(''),
      ...adv.fullHelpLines()
    ];
  }

  // ── Gate: anything else requires unlock ──────────────────────
  if (!isUnlocked()) {
    return [L(`'${cmdRaw}' IS NOT RECOGNIZED. TYPE help FOR COMMANDS.`, 'ERR')];
  }

  // ── Delegate to advanced module ───────────────────────────────
  const adv = await getAdvanced();
  return adv.runAdvanced(cmd, cmdRaw, arg, arg1, rest.slice(1).join(' '), raw, ctx);
}
