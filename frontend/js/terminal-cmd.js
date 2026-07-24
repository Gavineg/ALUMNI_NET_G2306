/**
 * DOS/CMD 彩蛋命令 + 登录 + Hacknet 彩蛋
 * runCommand(raw, ctx) 返回 [{text, status}] 给 biosAppend
 */

import { API_BASE } from './config.js';

// ── 主题定义 ──────────────────────────────────────────────────

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

// ── SessionStorage helpers ────────────────────────────────────

function getHacked()    { try { return JSON.parse(sessionStorage.getItem('g2306_hacked') || '{}'); }    catch { return {}; } }
function setHacked(m)   { sessionStorage.setItem('g2306_hacked', JSON.stringify(m)); }
function getDownloads() { try { return JSON.parse(sessionStorage.getItem('g2306_downloads') || '{}'); } catch { return {}; } }
function setDownloads(m){ sessionStorage.setItem('g2306_downloads', JSON.stringify(m)); }
function getConnected() { return sessionStorage.getItem('g2306_connected') || null; }
function setConnected(h){ if (h) sessionStorage.setItem('g2306_connected', h); else sessionStorage.removeItem('g2306_connected'); }
function getFirewall()  { try { return JSON.parse(sessionStorage.getItem('g2306_firewall') || '{}'); }  catch { return {}; } }
function setFirewall(m) { sessionStorage.setItem('g2306_firewall', JSON.stringify(m)); }

// crack challenge state (memory only, not persisted)
let crackState = null; // {hostname, studentId, port, cracked}

// ── Crypto challenge generator ────────────────────────────────

function genChallenge() {
  const type = Math.floor(Math.random() * 3);
  if (type === 0) {
    const shift = 3 + Math.floor(Math.random() * 10);
    const words = ['ACCESS', 'SHELL', 'ROOT', 'OVERRIDE', 'UNLOCK', 'BYPASS'];
    const plain = pick(words);
    const cipher = plain.split('').map(c => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)).join('');
    return { prompt: [`> CAESAR CIPHER LOCK`, `> SHIFT: ${shift}`, `> CIPHERTEXT: ${cipher}`, `> ENTER PLAINTEXT:`], answer: plain };
  } else if (type === 1) {
    const key = 1 + Math.floor(Math.random() * 15);
    const words = ['HACK', 'OPEN', 'GATE', 'PASS', 'CORE', 'SYNC'];
    const plain = pick(words);
    const hex = plain.split('').map(c => (c.charCodeAt(0) ^ key).toString(16).padStart(2,'0')).join(' ').toUpperCase();
    return { prompt: [`> XOR CIPHER LOCK`, `> KEY: 0x${key.toString(16).toUpperCase()}`, `> HEX: ${hex}`, `> ENTER DECODED PLAINTEXT:`], answer: plain };
  } else {
    const words = ['SYS', 'NET', 'CMD', 'RUN', 'ACK'];
    const plain = pick(words);
    const sum = plain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const hex = `0x${sum.toString(16).toUpperCase()}`;
    return { prompt: [`> CHECKSUM LOCK`, `> ASCII SUM OF "${plain}"`, `> ENTER HEX VALUE (e.g. 0xFF):`], answer: hex };
  }
}

// ── Virtual filesystem (sessionStorage) ──────────────────────

function getFS() {
  try { return JSON.parse(sessionStorage.getItem('g2306_fs') || '{"dirs":[],"files":{}}'); } catch { return { dirs: [], files: {} }; }
}
function saveFS(fs) { sessionStorage.setItem('g2306_fs', JSON.stringify(fs)); }

function normPath(p) { return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'; }

// ── Current prompt prefix ─────────────────────────────────────

export function getPromptPrefix(token) {
  if (!token) return 'C:\\G2306';
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    const u = (p.name || 'GUEST').toUpperCase().replace(/\s+/g, '_');
    return `C:\\G2306\\${u}`;
  } catch { return 'C:\\G2306'; }
}

// ── Utilities ─────────────────────────────────────────────────

const FORTUNES = [
  'YOU WILL FIND A BUG TODAY. YOU WROTE IT YESTERDAY.',
  'A WATCHED BUILD NEVER COMPLETES.',
  '99 LITTLE BUGS IN THE CODE, 99 LITTLE BUGS...',
  'THE CAKE IS A LIE. THE FOOD IS REAL. GO CENGFAN.',
  'RESISTANCE IS FUTILE. COMMIT YOUR CHANGES.',
  'THERE IS NO CLOUD. IT IS JUST SOMEONE ELSE\'S COMPUTER.'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function L(text, status) { return { text, status }; }
function stars(n) { return '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0, 5 - n)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function helpLines() {
  return [
    L('AVAILABLE COMMANDS ::'),
    L(''),
    L('  [ SYSTEM ]  HELP  DATE  CLEAR  EXIT'),
    L('  [ AUTH ]    LOGIN  LOGOUT  ME  SET  PASSWD'),
    L('  [ RECON ]   STATS  FIND  ROSTER'),
    L('  [ HACK ]    SCAN  CONNECT  PORT  CRACK  EXPLOIT'),
    L('               LS  DOWNLOAD  DISCONNECT'),
    L('               APPLY  THEMES  RESTORE'),
    L('  [ FILES ]   LS  DIR  CAT <FILE>'),
    L('  [ MISC ]    MATRIX  FORTUNE  42  COFFEE  ABOUT'),
    L(''),
    L('TYPE HELP <COMMAND> FOR DETAILS.')
  ];
}

// ── Main command dispatch ─────────────────────────────────────

export async function runCommand(raw, ctx) {
  const input = raw.trim();
  if (!input) return [];
  const [cmdRaw, ...rest] = input.split(/\s+/);
  const cmd  = cmdRaw.toLowerCase();
  const arg  = rest.join(' ');
  const arg1 = rest[0] || '';
  const arg2 = rest.slice(1).join(' ');

  ctx.openPanel();

  // ── SYSTEM ────────────────────────────────────────────────
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
  if (cmd === 'exit'  || cmd === 'quit' || cmd === 'close') {
    ctx.setFullscreen(false);
    ctx.closePanel();
    return [];
  }

  // ── AUTH: LOGIN ────────────────────────────────────────────
  if (cmd === 'login') {
    if (ctx.getToken()) return [L('ALREADY AUTHENTICATED. USE LOGOUT FIRST.', 'ERR')];
    const username = await ctx.promptLine('> USERNAME: ');
    if (!username) return [L('LOGIN ABORTED', 'ERR')];
    const password = await ctx.promptPassword('> PASSWORD: ');
    if (!password) return [L('LOGIN ABORTED', 'ERR')];
    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) return [L(`AUTH FAILED: ${(data.error||'unknown').toUpperCase()}`, 'ERR')];
      ctx.setToken(data.token);
      return [L(`AUTHENTICATED AS: ${data.name}`, 'OK'), L(`ROLE: ${data.isAdmin ? 'ADMINISTRATOR' : 'STUDENT'}`, 'RDY'), L('SESSION TOKEN STORED.', 'OK')];
    } catch { return [L('CONNECTION FAILED', 'ERR')]; }
  }

  if (cmd === 'logout') {
    if (!ctx.getToken()) return [L('NOT AUTHENTICATED', 'ERR')];
    ctx.setToken(null);
    return [L('SESSION TERMINATED.', 'OK'), L('TOKEN PURGED.', 'RDY')];
  }

  if (cmd === 'me') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED. USE LOGIN.', 'ERR')];
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, { headers:{ Authorization:`Bearer ${tok}` } });
      if (!res.ok) return [L('FETCH FAILED', 'ERR')];
      const d = await res.json();
      return [
        L(`> DISPLAY_NAME : ${d.display_name||'N/A'}`),
        L(`> UNIVERSITY   : ${d.university||'N/A'}`),
        L(`> MAJOR        : ${d.major||'N/A'}`),
        L(`> CITY         : ${d.city||'N/A'}`),
        L(`> STATUS       : ${d.status_text||'—'}`),
        L(`> CENGFAN      : ${d.can_cengfan ? '[READY]' : '[NOT_READY]'}`, d.can_cengfan ? 'OK' : 'ERR'),
        L(`> SERVER       : ${d.server_hostname||'(auto)'}  DIFF: ${stars(d.server_difficulty||2)}`)
      ];
    } catch { return [L('REQUEST FAILED', 'ERR')]; }
  }

  if (cmd === 'set') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED.', 'ERR')];
    if (!arg1 || !arg2) return [L('USAGE: SET <FIELD> <VALUE>', 'ERR'), L('FIELDS: UNIVERSITY / MAJOR / STATUS / CENGFAN')];
    const map = { university:'university', major:'major', status:'status_text', cengfan:'can_cengfan' };
    const apiField = map[arg1.toLowerCase()];
    if (!apiField) return [L(`UNKNOWN FIELD: ${arg1.toUpperCase()}`, 'ERR')];
    const val = apiField === 'can_cengfan' ? (['1','yes','true'].includes(arg2.toLowerCase()) ? 1 : 0) : arg2;
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${tok}`}, body: JSON.stringify({ [apiField]: val }) });
      if (!res.ok) return [L('UPDATE FAILED', 'ERR')];
      return [L(`${arg1.toUpperCase()} UPDATED SUCCESSFULLY.`, 'OK')];
    } catch { return [L('REQUEST FAILED', 'ERR')]; }
  }

  if (cmd === 'passwd') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED.', 'ERR')];
    const oldPw  = await ctx.promptPassword('> CURRENT PASSWORD: ');
    if (!oldPw) return [L('ABORTED', 'ERR')];
    const newPw  = await ctx.promptPassword('> NEW PASSWORD (MIN 6): ');
    if (!newPw) return [L('ABORTED', 'ERR')];
    const conf   = await ctx.promptPassword('> CONFIRM NEW PASSWORD: ');
    if (newPw !== conf) return [L('PASSWORDS DO NOT MATCH. ABORTED.', 'ERR')];
    try {
      const res  = await fetch(`${API_BASE}/api/student/password`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${tok}`}, body: JSON.stringify({ old_password: oldPw, new_password: newPw }) });
      const data = await res.json();
      if (!res.ok) return [L(`FAILED: ${(data.error||'unknown').toUpperCase()}`, 'ERR')];
      return [L('PASSWORD UPDATED.', 'OK')];
    } catch { return [L('REQUEST FAILED', 'ERR')]; }
  }

  // ── RECON ──────────────────────────────────────────────────
  if (cmd === 'stats') {
    const data = ctx.getMapData();
    if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
    const unis    = data.universities;
    const studs   = unis.reduce((s,u) => s + (u.members?.length||0), 0);
    const ready   = unis.reduce((s,u) => s + (u.members?.filter(m=>m.canCengfan).length||0), 0);
    return [L(`UNIVERSITIES :: ${unis.length}`), L(`STUDENTS     :: ${studs}`), L(`READY_FOR_FOOD :: ${ready}`, ready > 0 ? 'OK' : undefined)];
  }

  if (cmd === 'find') {
    if (!arg) return [L('USAGE: FIND <NAME>', 'ERR')];
    const data = ctx.getMapData();
    if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
    const needle = arg.toLowerCase();
    for (const u of data.universities) {
      const hit = (u.members||[]).find(m => (m.name||'').toLowerCase().includes(needle));
      if (hit) {
        ctx.flyTo(u.longitude, u.latitude);
        return [L(`TARGET LOCATED :: ${hit.name}`), L(`UNIVERSITY :: ${u.university}`), L(`CITY :: ${u.city||'UNKNOWN'}`), L('MAP FOCUS LOCKED.', 'OK')];
      }
    }
    return [L(`NO MATCH FOR "${arg.toUpperCase()}"`, 'ERR')];
  }

  // ── ROSTER ────────────────────────────────────────────────
  if (cmd === 'roster' || cmd === 'classmates') {
    const data = ctx.getMapData();
    if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
    ctx.setFullscreen(true);
    const lines = [L('> ALUMNI_NET ROSTER — G2306 COHORT', 'RDY'), L('> ─────────────────────────────────')];
    const byCity = {};
    for (const u of data.universities) {
      const city = u.city || 'UNKNOWN';
      if (!byCity[city]) byCity[city] = [];
      byCity[city].push(u);
    }
    let idx = 1;
    for (const [city, unis] of Object.entries(byCity)) {
      lines.push(L(''));
      lines.push(L(`> [${city.toUpperCase()}]`));
      for (const u of unis) {
        for (const m of (u.members||[])) {
          const ready = m.canCengfan ? '[READY]' : '[—]';
          lines.push(L(`  [${String(idx++).padStart(2,'0')}] ${m.name}  —  ${u.university}  —  ${m.major||'N/A'}  ${ready}`, m.canCengfan ? 'OK' : undefined));
        }
      }
    }
    lines.push(L(''));
    lines.push(L(`> TOTAL: ${idx-1} STUDENT(S)`, 'DONE'));
    lines.push(L('> TYPE "EXIT" TO RETURN TO MAP'));
    return lines;
  }

  // ── HACK: SCAN ─────────────────────────────────────────────
  if (cmd === 'scan') {
    let servers;
    try {
      const res = await fetch(`${API_BASE}/api/hack/servers`);
      if (!res.ok) throw new Error();
      servers = await res.json();
    } catch { return [L('SCAN FAILED — API UNREACHABLE', 'ERR')]; }

    const hacked = getHacked();
    const lines = [L('> SCANNING NETWORK...', 'RUN'), L('> ─────────────────────────────────')];
    for (const s of servers) {
      const status = hacked[s.hostname] ? '[ROOTED]' : '[LOCKED]';
      const statusCode = hacked[s.hostname] ? 'OK' : undefined;
      lines.push(L(`  ${s.ip.padEnd(16)} ${s.hostname.padEnd(28)} ${stars(s.difficulty)} ${status}`, statusCode));
    }
    lines.push(L(''));
    lines.push(L(`> ${servers.length} HOST(S) FOUND.  USE: CONNECT <HOSTNAME>`));
    return lines;
  }

  // ── HACK: CONNECT ──────────────────────────────────────────
  if (cmd === 'connect') {
    if (!arg1) return [L('USAGE: CONNECT <HOSTNAME>', 'ERR')];
    let servers;
    try {
      const res = await fetch(`${API_BASE}/api/hack/servers`);
      servers = await res.json();
    } catch { return [L('SCAN FAILED', 'ERR')]; }

    const target = servers.find(s => s.hostname.toLowerCase() === arg1.toLowerCase());
    if (!target) return [L(`HOST NOT FOUND: ${arg1.toUpperCase()}`, 'ERR'), L('USE SCAN TO LIST AVAILABLE HOSTS.')];

    const fw = getFirewall();
    if (fw[target.hostname] && Date.now() < fw[target.hostname]) {
      const remaining = Math.ceil((fw[target.hostname] - Date.now()) / 1000);
      return [L(`FIREWALL ACTIVE — BLOCKED FOR ${remaining}s`, 'ERR')];
    }

    setConnected(JSON.stringify(target));
    crackState = null;
    const hacked = getHacked();
    const ports = target.ports.split(',').map(p => p.trim());
    const lines = [
      L(`> CONNECTING TO ${target.hostname}...`, 'RUN'),
      L(`> IP: ${target.ip}`),
      L(`> OS: UNKNOWN`),
      L(`> DIFFICULTY: ${stars(target.difficulty)}`),
      L(`> OPEN PORTS:`),
    ];
    for (const p of ports) lines.push(L(`    ${p.padStart(5)}  — ${portName(p)}`));
    if (hacked[target.hostname]) {
      lines.push(L('> STATUS: ROOTED', 'OK'));
      lines.push(L('> TYPE "LS" TO LIST FILES'));
    } else {
      lines.push(L('> SELECT A PORT TO ATTACK:  PORT <NUM>', 'RDY'));
    }
    return lines;
  }

  // ── HACK: PORT ─────────────────────────────────────────────
  if (cmd === 'port') {
    const target = getConnectedTarget();
    if (!target) return [L('NOT CONNECTED. USE CONNECT <HOSTNAME>.', 'ERR')];
    if (!arg1) return [L('USAGE: PORT <NUMBER>', 'ERR')];
    const ports = target.ports.split(',').map(p => p.trim());
    if (!ports.includes(arg1)) return [L(`PORT ${arg1} NOT OPEN ON THIS HOST.`, 'ERR'), L(`OPEN PORTS: ${ports.join(', ')}`)];
    crackState = { hostname: target.hostname, studentId: target.studentId, port: arg1, cracked: false };
    return [L(`> PORT ${arg1} SELECTED (${portName(arg1)})`, 'RDY'), L('> RUN "CRACK" TO BEGIN EXPLOIT SEQUENCE.')];
  }

  // ── HACK: CRACK ────────────────────────────────────────────
  if (cmd === 'crack') {
    const target = getConnectedTarget();
    if (!target) return [L('NOT CONNECTED.', 'ERR')];
    if (!crackState) return [L('SELECT A PORT FIRST. USE: PORT <NUM>', 'ERR')];
    if (crackState.cracked) return [L('PORT ALREADY CRACKED. USE EXPLOIT.', 'RDY')];

    const difficulty = target.difficulty;
    const duration = difficulty * 700;
    const steps = 3 + difficulty;
    const attacks = ['SENDING SYN FLOOD...', 'INJECTING PAYLOAD...', 'BYPASSING IDS...', 'ESCALATING PRIVILEGES...', 'ENUMERATING SERVICES...', 'FUZZING INPUT VECTORS...', 'PATCHING RETURN ADDRESS...'];

    // Return lines that will display progressively (biosAppend handles timing)
    const lines = [L(`> CRACKING PORT ${crackState.port}...`, 'RUN')];
    for (let i = 0; i < steps; i++) {
      lines.push(L(`  [${Math.floor(((i+1)/steps)*100).toString().padStart(3)}%] ${pick(attacks)}`));
    }

    // Simulate async wait via a special approach: return lines with the status baked in
    // We need to add a delay hint — use status 'WAIT' as a signal (biosAppend sleeps between lines)
    // The actual crack result is determined here
    const success = Math.random() < (0.85 - difficulty * 0.1);
    if (success) {
      crackState.cracked = true;
      lines.push(L('> PORT CRACKED. SHELL OBTAINED.', 'OK'));
      lines.push(L('> RUN "EXPLOIT" TO SOLVE CRYPTO CHALLENGE AND GAIN ROOT.'));
    } else {
      crackState = null;
      const fw = getFirewall();
      fw[target.hostname] = Date.now() + 30000;
      setFirewall(fw);
      lines.push(L('> INTRUSION DETECTED. FIREWALL TRIGGERED.', 'ERR'));
      lines.push(L('> CONNECTION BLOCKED FOR 30 SECONDS.'));
      setConnected(null);
    }
    return lines;
  }

  // ── HACK: EXPLOIT ──────────────────────────────────────────
  if (cmd === 'exploit') {
    const target = getConnectedTarget();
    if (!target) return [L('NOT CONNECTED.', 'ERR')];
    if (!crackState?.cracked) return [L('PORT NOT CRACKED YET. RUN CRACK FIRST.', 'ERR')];

    const challenge = genChallenge();
    // Store challenge answer for the next input
    crackState.challenge = challenge;

    const lines = [L('> EXPLOIT DELIVERED. AWAITING AUTHENTICATION TOKEN...', 'RUN'), L('> CRYPTO CHALLENGE REQUIRED:'), L('> ─────────────────────────────')];
    for (const p of challenge.prompt) lines.push(L(p));

    // Now we need user input — use promptLine
    const answer = await ctx.promptLine('> ANSWER: ');
    if (!answer) return [L('EXPLOIT ABORTED', 'ERR')];

    if (answer.trim().toUpperCase() === challenge.answer.toUpperCase()) {
      const hacked = getHacked();
      hacked[target.hostname] = true;
      setHacked(hacked);
      crackState = null;
      return [
        ...lines,
        L(''),
        L('> CORRECT. ROOT ACCESS GRANTED.', 'OK'),
        L(`> ${target.hostname} IS NOW UNDER YOUR CONTROL.`, 'OK'),
        L('> TYPE "LS" TO LIST FILES.')
      ];
    } else {
      crackState = null;
      const fw = getFirewall();
      fw[target.hostname] = Date.now() + 30000;
      setFirewall(fw);
      setConnected(null);
      return [
        ...lines,
        L(''),
        L('> WRONG ANSWER. SECURITY ALERT TRIGGERED.', 'ERR'),
        L('> CONNECTION TERMINATED. FIREWALL ACTIVE FOR 30s.', 'ERR')
      ];
    }
  }

  // ── HACK: LS (on connected server) ────────────────────────
  if ((cmd === 'ls' || cmd === 'dir') && (getConnectedTarget() || arg1)) {
    // If connected to a server and it's rooted, show server files
    const target = getConnectedTarget();
    if (target) {
      const hacked = getHacked();
      if (!hacked[target.hostname]) return [L('ACCESS DENIED — NOT ROOTED.', 'ERR'), L('USE CRACK + EXPLOIT TO GAIN ROOT.')];
      try {
        const res = await fetch(`${API_BASE}/api/hack/loot/${target.studentId}`);
        const data = await res.json();
        const themeName = data.theme || 'DEFAULT';
        const lines = [
          L(`> FILES ON ${target.hostname}:`, 'OK'),
          L('> ─────────────────────────────'),
          L(`  ${themeName}.CSS   — THEME FILE`),
        ];
        if (data.loot) lines.push(L(`  LOOT.TXT          — PERSONAL DATA`));
        lines.push(L(''));
        lines.push(L('> USE: DOWNLOAD <FILENAME>'));
        return lines;
      } catch { return [L('READ ERROR', 'ERR')]; }
    }
    // Fall through to local ls below
  }

  // ── HACK: DOWNLOAD ─────────────────────────────────────────
  if (cmd === 'download') {
    const target = getConnectedTarget();
    if (!target) return [L('NOT CONNECTED.', 'ERR')];
    const hacked = getHacked();
    if (!hacked[target.hostname]) return [L('ACCESS DENIED.', 'ERR')];
    if (!arg1) return [L('USAGE: DOWNLOAD <FILENAME>', 'ERR')];

    try {
      const res = await fetch(`${API_BASE}/api/hack/loot/${target.studentId}`);
      const data = await res.json();
      const fname = arg1.toUpperCase();
      const themeName = (data.theme || 'DEFAULT').toUpperCase();

      if (fname === `${themeName}.CSS` || fname === `${themeName}`) {
        const downloads = getDownloads();
        downloads[`${themeName}.CSS`] = { type: 'theme', name: themeName };
        setDownloads(downloads);
        return [L(`> DOWNLOADING ${themeName}.CSS...`, 'RUN'), L('> TRANSFER COMPLETE.', 'OK'), L(`> USE: APPLY ${themeName}.CSS`)];
      } else if (fname === 'LOOT.TXT' && data.loot) {
        const downloads = getDownloads();
        downloads['LOOT.TXT'] = { type: 'text', content: data.loot };
        setDownloads(downloads);
        return [L('> DOWNLOADING LOOT.TXT...', 'RUN'), L('> TRANSFER COMPLETE.', 'OK'), L('> USE: CAT LOOT.TXT')];
      } else {
        return [L(`FILE NOT FOUND: ${fname}`, 'ERR')];
      }
    } catch { return [L('DOWNLOAD FAILED', 'ERR')]; }
  }

  // ── HACK: DISCONNECT ────────────────────────────────────────
  if (cmd === 'disconnect') {
    if (!getConnectedTarget()) return [L('NOT CONNECTED.', 'ERR')];
    const t = getConnectedTarget();
    setConnected(null);
    crackState = null;
    return [L(`> DISCONNECTED FROM ${t?.hostname||'HOST'}.`, 'OK')];
  }

  // ── THEME: APPLY ───────────────────────────────────────────
  if (cmd === 'apply') {
    if (!arg1) return [L('USAGE: APPLY <FILENAME>', 'ERR')];
    const fname = arg1.toUpperCase().replace(/\.CSS$/, '');
    const downloads = getDownloads();
    const key = `${fname}.CSS`;
    if (!downloads[key]) return [L(`FILE NOT IN LOCAL CACHE: ${key}`, 'ERR'), L('USE DOWNLOAD FIRST.')];
    if (!THEMES[fname]) return [L(`UNKNOWN THEME: ${fname}`, 'ERR')];
    applyTheme(fname);
    return [L(`> THEME ${fname} APPLIED.`, 'OK'), L('> SESSION THEME SAVED.')];
  }

  if (cmd === 'themes') {
    const downloads = getDownloads();
    const active = sessionStorage.getItem('g2306_theme') || 'DEFAULT';
    const keys = Object.keys(downloads).filter(k => downloads[k].type === 'theme');
    if (!keys.length) return [L('NO THEMES DOWNLOADED YET.'), L('HACK A SERVER TO OBTAIN THEME FILES.')];
    return [L('> DOWNLOADED THEMES:'), ...keys.map(k => L(`  ${k}${k.replace('.CSS','') === active ? '  [ACTIVE]' : ''}`, k.replace('.CSS','') === active ? 'OK' : undefined))];
  }

  if (cmd === 'restore') {
    applyTheme('DEFAULT');
    return [L('> DEFAULT THEME RESTORED.', 'OK')];
  }

  // ── SERVERCONF ─────────────────────────────────────────────
  if (cmd === 'serverconf') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED. USE LOGIN.', 'ERR')];
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) return [L('FETCH FAILED', 'ERR')];
      const d = await res.json();
      return [
        L('> SERVER CONFIGURATION:', 'RDY'),
        L(`  HOSTNAME   : ${d.server_hostname || '(auto-generated)'}`),
        L(`  PORTS      : ${d.server_ports    || '(default)'}`),
        L(`  DIFFICULTY : ${stars(d.server_difficulty || 2)}`),
        L(`  THEME      : ${d.server_theme    || 'DEFAULT'}`),
        L(`  HACK_LOOT  : ${d.hack_loot ? `${d.hack_loot.length} CHARS SET` : '(empty)'}`),
        L(''),
        L('> USE: SERVERSET <FIELD> <VALUE>'),
        L('  FIELDS: HOSTNAME / PORTS / DIFFICULTY / THEME'),
        L('> USE: LOOT — to edit your loot file')
      ];
    } catch { return [L('REQUEST FAILED', 'ERR')]; }
  }

  // ── SERVERSET ──────────────────────────────────────────────
  if (cmd === 'serverset') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED.', 'ERR')];
    const field = arg1.toLowerCase();
    const value = arg2;
    if (!field || !value) return [L('USAGE: SERVERSET <FIELD> <VALUE>', 'ERR'), L('FIELDS: HOSTNAME / PORTS / DIFFICULTY / THEME')];
    const themeNames = Object.keys(THEMES).join(' / ');
    const fieldMap = {
      hostname:   'server_hostname',
      ports:      'server_ports',
      difficulty: 'server_difficulty',
      theme:      'server_theme'
    };
    const apiField = fieldMap[field];
    if (!apiField) return [L(`UNKNOWN FIELD: ${field.toUpperCase()}`, 'ERR'), L(`FIELDS: ${Object.keys(fieldMap).join(' / ').toUpperCase()}`)];
    if (field === 'theme' && !THEMES[value.toUpperCase()]) {
      return [L(`UNKNOWN THEME: ${value.toUpperCase()}`, 'ERR'), L(`AVAILABLE: ${themeNames}`)];
    }
    const apiValue = field === 'difficulty' ? Math.min(5, Math.max(1, parseInt(value) || 2))
                   : field === 'theme'      ? value.toUpperCase()
                   : value;
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ [apiField]: apiValue })
      });
      if (!res.ok) return [L('UPDATE FAILED', 'ERR')];
      return [L(`${field.toUpperCase()} SET TO: ${apiValue}`, 'OK')];
    } catch { return [L('REQUEST FAILED', 'ERR')]; }
  }

  // ── LOOT (edit hack_loot interactively) ────────────────────
  if (cmd === 'loot') {
    const tok = ctx.getToken();
    if (!tok) return [L('NOT AUTHENTICATED.', 'ERR')];
    const lines = [
      L('> EDITING LOOT.TXT (MAX 500 CHARS)', 'RDY'),
      L('> TYPE YOUR MESSAGE. PRESS ENTER WHEN DONE.'),
      L('> (SINGLE LINE ONLY — USE \\n FOR NEWLINES)')
    ];
    // Show current value first
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, { headers: { Authorization: `Bearer ${tok}` } });
      const d = await res.json();
      if (d.hack_loot) lines.push(L(`> CURRENT: "${d.hack_loot.slice(0, 60)}${d.hack_loot.length > 60 ? '...' : ''}"`));
    } catch {}
    await ctx.promptLine !== undefined && 0; // just to get lines printed first
    const newLoot = await ctx.promptLine('> NEW CONTENT: ');
    if (!newLoot) return [...lines, L('ABORTED', 'ERR')];
    const content = newLoot.replace(/\\n/g, '\n').slice(0, 500);
    try {
      const res = await fetch(`${API_BASE}/api/student/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ hack_loot: content })
      });
      if (!res.ok) return [...lines, L('SAVE FAILED', 'ERR')];
      return [...lines, L(`> LOOT.TXT SAVED (${content.length} CHARS).`, 'OK')];
    } catch { return [...lines, L('REQUEST FAILED', 'ERR')]; }
  }

  // ── VIRTUAL FILESYSTEM ─────────────────────────────────────
  if (cmd === 'mkdir') {
    if (!arg1) return [L('USAGE: MKDIR <DIRNAME>', 'ERR')];
    const fs = getFS();
    const p = normPath(arg1);
    if (fs.dirs.includes(p)) return [L(`DIRECTORY ALREADY EXISTS: ${p}`, 'ERR')];
    fs.dirs.push(p);
    saveFS(fs);
    return [L(`DIRECTORY CREATED: ${p}`, 'OK')];
  }

  if (cmd === 'touch') {
    if (!arg1) return [L('USAGE: TOUCH <FILENAME>', 'ERR')];
    const fs = getFS();
    const p = normPath(arg1);
    if (!fs.files[p]) fs.files[p] = '';
    saveFS(fs);
    return [L(`FILE: ${p}`, 'OK')];
  }

  if (cmd === 'echo' && arg.includes('>')) {
    const parts = arg.split('>');
    const content = parts[0].trim().replace(/^["']|["']$/g, '');
    const fname = parts[1].trim();
    if (!fname) return [L('USAGE: ECHO <TEXT> > <FILE>', 'ERR')];
    const fs = getFS();
    fs.files[normPath(fname)] = content;
    saveFS(fs);
    return [L(`WRITTEN TO ${fname}`, 'OK')];
  }

  if ((cmd === 'ls' || cmd === 'dir') && !getConnectedTarget()) {
    const fs = getFS();
    const tok = ctx.getToken();
    let username = 'G2306';
    if (tok) { try { username = JSON.parse(atob(tok.split('.')[1])).name || 'G2306'; } catch {} }
    const lines = [
      L(`  SECRETS.TXT`), L(`  ORIGIN.LOG`), L(`  README.MD`), L(`  DO_NOT_OPEN.EXE`)
    ];
    fs.dirs.forEach(d => lines.push(L(`  [DIR] ${d}`)));
    Object.keys(fs.files).forEach(f => lines.push(L(`  ${f}`)));
    lines.push(L(`${4 + fs.dirs.length + Object.keys(fs.files).length} ITEM(S)`));
    return lines;
  }

  if (cmd === 'rm' || cmd === 'del') {
    if (!arg1) return [arg.replace(/\s+/g,'').includes('-rf/') ? L('NICE TRY.', 'ERR') : L('USAGE: RM <FILE>', 'ERR')];
    if (arg.replace(/\s+/g,'').includes('-rf/')) return [L('NICE TRY.'), L('FILESYSTEM PROTECTED BY FRIENDSHIP.', 'OK')];
    const fs = getFS();
    const p = normPath(arg1);
    if (fs.files[p] !== undefined) {
      delete fs.files[p];
      saveFS(fs);
      return [L(`DELETED: ${p}`, 'OK')];
    }
    const di = fs.dirs.indexOf(p);
    if (di >= 0) {
      fs.dirs.splice(di, 1);
      saveFS(fs);
      return [L(`REMOVED DIR: ${p}`, 'OK')];
    }
    return [L(`FILE NOT FOUND: ${p}`, 'ERR')];
  }

  // ── LOCAL FILES (cat with virtual FS support) ──────────────
  if (cmd === 'cat') {
    const file = arg.toUpperCase();
    const downloads = getDownloads();

    // Check virtual filesystem first
    const fs = getFS();
    const vPath = normPath(arg);
    if (fs.files[vPath] !== undefined) {
      return fs.files[vPath] ? [L(fs.files[vPath])] : [L('(EMPTY FILE)')];
    }
    if (file === 'LOOT.TXT' && downloads['LOOT.TXT']) {
      return [L('> READING LOOT.TXT...'), L(downloads['LOOT.TXT'].content || '(EMPTY)')];
    }
    if (file === 'SECRETS.TXT') return [L('DECRYPTING...'), L('THE REAL SECRET WAS THE FRIENDS WE MADE ALONG THE WAY.'), L('ALSO: G2306 STILL OWES SOMEONE A MEAL.', 'OK')];
    if (file === 'ORIGIN.LOG') return [
      L('> BOOT LOG — ORIGIN SYSTEM'),
      L('  [2024-09-01 08:00:00] NODE INITIALIZED AT SHENZHEN LONGGANG'),
      L('  [2024-09-01 08:01:12] BIOMETRIC SCAN CONFIRMED: G2306 COHORT'),
      L('  [2024-09-01 08:01:45] SECURE CHANNEL ESTABLISHED'),
      L('  [2024-09-01 08:02:03] UPLINK TO ALUMNI_NET COMPLETE', 'OK'),
      L('  [2024-09-15 14:32:17] STUDENT_COUNT UPDATED: LOADING...'),
      L('  [—] FURTHER ENTRIES CLASSIFIED', 'ERR')
    ];
    if (file === 'README.MD') return [
      L('> ALUMNI_NET — G2306 COHORT'),
      L(''),
      L('  THIS SYSTEM TRACKS THE LOCATIONS OF G2306 MEMBERS'),
      L('  ACROSS THE NATION. DATA IS PROVIDED VOLUNTARILY.'),
      L(''),
      L('  FEATURES:'),
      L('    — INTERACTIVE MAP WITH PARTICLE ANIMATION'),
      L('    — STUDENT SELF-SERVICE PORTAL (/ADMIN)'),
      L('    — DOS TERMINAL EASTER EGG (YOU FOUND IT)'),
      L('    — HACKNET-STYLE INTRUSION SIMULATOR'),
      L(''),
      L('  BUILT WITH ECHARTS + CLOUDFLARE + FIREBASE.', 'OK'),
      L(''),
      L('  IF YOU ARE READING THIS, YOU ARE CURIOUS ENOUGH.')
    ];
    if (file === 'DO_NOT_OPEN.EXE') return [
      L('> EXECUTING DO_NOT_OPEN.EXE...', 'RUN'),
      L('  WARNING: UNDEFINED BEHAVIOR', 'ERR'),
      L('  INITIALIZING PAYLOAD...'),
      L('  SCANNING FILESYSTEM...'),
      L('  UPLOADING DATA TO 203.0.113.99...'),
      L('  JUST KIDDING.'),
      L('  BUT YOU REALLY SHOULD NOT HAVE OPENED THAT.', 'ERR'),
      L('  FILE CONTAINED: A VERY DISAPPOINTED COMMENT FROM THE DEVELOPER.', 'OK')
    ];
    return [L(`FILE NOT FOUND: ${arg||'(NONE)'}`, 'ERR')];
  }

  // ── MISC ───────────────────────────────────────────────────
  if (cmd === 'matrix') return [L('WAKE UP...'), L('THE MATRIX HAS YOU.'), L('FOLLOW THE WHITE RABBIT.'), L('01000111 00110010 00110011 00110000 00110110')];
  if (cmd === 'hack') return [L(`INITIATING INTRUSION ON "${arg||'UNKNOWN TARGET'}"...`), L('JUST KIDDING. USE SCAN / CONNECT / CRACK / EXPLOIT.', 'OK')];
  if (cmd === 'sudo') return [L(`SUDO ${arg.toUpperCase()||'(NOTHING)'}`), L('[SUDO] PASSWORD FOR GUEST: ********'), L('PERMISSION DENIED. NICE TRY.', 'ERR')];
  if (cmd === 'su')   return [L('ACCESS DENIED — USE THE LOGIN PORTAL.', 'ERR')];
  if (cmd === 'rm')   return arg.replace(/\s+/g,'').includes('-rf/') ? [L('NICE TRY.'), L('FILESYSTEM PROTECTED BY FRIENDSHIP.', 'OK')] : [L('RM: MISSING OPERAND', 'ERR')];
  if (cmd === 'konami') return [L('↑ ↑ ↓ ↓ ← → ← → B A'), L('CODE ACCEPTED.'), L('+30 LIVES GRANTED (NOT REALLY)', 'OK')];
  if (cmd === 'sl')   return [L('🚂 CHOO CHOO...'), L('A TRAIN PASSES THROUGH THE TERMINAL.')];
  if (cmd === 'fortune') return [L(pick(FORTUNES))];
  if (cmd === '42')   return [L('THE ANSWER TO LIFE, THE UNIVERSE, AND EVERYTHING.')];
  if (cmd === 'coffee') return [L('BREWING...'), L("418 I'M A TEAPOT", 'ERR'), L('(THIS TERMINAL CANNOT MAKE COFFEE)')];
  if (cmd === 'about' || cmd === 'credits') return [L('ALUMNI_NET :: G2306'), L('A CYBERPUNK CLASSMATE LOCATOR.'), L('BUILT WITH ECHARTS, CLOUDFLARE, FIREBASE, AND SPITE.'), L('THANK YOU FOR VISITING.', 'OK')];

  return [L(`'${cmdRaw.toUpperCase()}' IS NOT RECOGNIZED. TYPE HELP FOR COMMANDS.`, 'ERR')];
}

// ── Helpers ───────────────────────────────────────────────────

function getConnectedTarget() {
  const s = getConnected();
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function portName(p) {
  const names = { '22':'SSH', '80':'HTTP', '443':'HTTPS', '3306':'MYSQL', '8080':'HTTP-ALT', '21':'FTP', '25':'SMTP', '3389':'RDP' };
  return names[String(p)] || 'UNKNOWN';
}


