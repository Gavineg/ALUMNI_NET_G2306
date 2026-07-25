/**
 * terminal-cmd-advanced.js  — dynamically imported after KONAMI unlock
 */
import { API_BASE } from './config.js';
import { THEMES, applyTheme } from './terminal-cmd-basic.js';

const L = (text, status) => ({ text, status });
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const stars = n => '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0,5-n));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ss = k => { try { return JSON.parse(sessionStorage.getItem(k)||'null'); } catch { return null; } };
const getHacked    = () => ss('g2306_hacked')    || {};
const setHacked    = m  => sessionStorage.setItem('g2306_hacked',    JSON.stringify(m));
const getDownloads = () => ss('g2306_downloads') || {};
const setDownloads = m  => sessionStorage.setItem('g2306_downloads', JSON.stringify(m));
const getConnected = () => sessionStorage.getItem('g2306_connected') || null;
const setConnected = h  => h ? sessionStorage.setItem('g2306_connected', h) : sessionStorage.removeItem('g2306_connected');
const getFirewall  = () => ss('g2306_firewall')  || {};
const setFirewall  = m  => sessionStorage.setItem('g2306_firewall',  JSON.stringify(m));
const getFS        = () => ss('g2306_fs') || { dirs: [], files: {} };
const saveFS       = fs => sessionStorage.setItem('g2306_fs', JSON.stringify(fs));
const getBroken    = () => ss('g2306_broken') || {};
const resetBroken  = () => sessionStorage.removeItem('g2306_broken');
const normPath     = p  => p.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/\/$/,'') || '/';

let crackState = null;

function getConnectedTarget() {
  const s = getConnected(); if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
function portName(p) {
  return ({ '22':'SSH','80':'HTTP','443':'HTTPS','3306':'MYSQL','8080':'HTTP-ALT','21':'FTP','25':'SMTP','3389':'RDP' })[String(p)] || 'UNKNOWN';
}

function genChallenge() {
  const type = Math.floor(Math.random()*3);
  if (type===0) {
    const shift=3+Math.floor(Math.random()*10), plain=pick(['ACCESS','SHELL','ROOT','OVERRIDE','UNLOCK','BYPASS']);
    const cipher=plain.split('').map(c=>String.fromCharCode(((c.charCodeAt(0)-65+shift)%26)+65)).join('');
    return { prompt:[`> CAESAR CIPHER LOCK`,`> SHIFT: ${shift}`,`> CIPHERTEXT: ${cipher}`,`> ENTER PLAINTEXT:`], answer: plain };
  } else if (type===1) {
    const key=1+Math.floor(Math.random()*15), plain=pick(['HACK','OPEN','GATE','PASS','CORE','SYNC']);
    const hex=plain.split('').map(c=>(c.charCodeAt(0)^key).toString(16).padStart(2,'0')).join(' ').toUpperCase();
    return { prompt:[`> XOR CIPHER LOCK`,`> KEY: 0x${key.toString(16).toUpperCase()}`,`> HEX: ${hex}`,`> ENTER DECODED PLAINTEXT:`], answer: plain };
  } else {
    const plain=pick(['SYS','NET','CMD','RUN','ACK']);
    const sum=plain.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    return { prompt:[`> CHECKSUM LOCK`,`> ASCII SUM OF "${plain}"`,`> ENTER HEX VALUE (e.g. 0xFF):`], answer:`0x${sum.toString(16).toUpperCase()}` };
  }
}

export function fullHelpLines() {
  return [
    L('ALUMNI_NET :: FULL SYSTEM ACCESS GRANTED','OK'), L(''),
    L('  [ SYSTEM ]'),
    L('    help            — show this help'),
    L('    date            — show current date/time'),
    L('    clear           — clear terminal output'),
    L('    sudo <CMD>      — attempt to run command as root'),
    L('    themes          — list downloaded themes'),
    L('    apply <file>    — apply downloaded theme'),
    L('    restore         — restore default theme'),
    L('    fullscreen      — enter fullscreen terminal mode'),
    L('    exit            — exit fullscreen / close panel'),
    L('    reboot [-f]     — reload page; -f fetches fresh data from server'),
    L(''),
    L('  [ AUTH ]'),
    L('    login           — authenticate with username + password'),
    L('    logout          — end current session'),
    L('    me              — show your profile'),
    L('    set <field> <v> — update profile field (UNIVERSITY/MAJOR/STATUS/CENGFAN)'),
    L('    passwd          — change password'),
    L('    portal          — open student/admin dashboard (auto-login)'),
    L('    cd <path>       — navigate virtual directories (C:\\G2306\\<username>)'),
    L('    reinstall       — restore deleted tools and reset local filesystem'),
    L(''),
    L('  [ RECON ]'),
    L('    whoami          — show current user'),
    L('    stats           — cohort statistics'),
    L('    find <name>     — locate a student on map'),
    L('    roster          — fullscreen list of all classmates by city'),
    L(''),
    L('  [ HACK ]'),
    L('    scan            — scan network for live hosts'),
    L('    connect <host>  — connect to a host (hostname or IP)'),
    L('    port <num>      — select port to attack'),
    L('    crack           — attempt to crack selected port'),
    L('    exploit         — solve crypto challenge to gain root'),
    L('    download <file> — download file from server'),
    L('    disconnect      — close current connection'),
    L(''),
    L('  [ FILES ]'),
    L('    ls / dir        — list local files'),
    L('    cat <file>      — read a file'),
    L('    mkdir <dir>     — create directory'),
    L('    touch <file>    — create empty file'),
    L('    echo <t> > <f>  — write text to file'),
    L('    rm <file>       — delete file or directory'),
    L('    vim <file>      — edit a file (supports /etc/g2306/.env)'),
    L(''),
    L('  [ ???? ]'),
    L('    MATRIX / KONAMI / SL / FORTUNE / 42 / COFFEE / ABOUT'),
    L(''),
  ];
}

export async function runAdvanced(cmd, cmdRaw, arg, arg1, arg2, raw, ctx) {
  if (cmd === 'hack') return [L(`INITIATING INTRUSION ON "${arg||'UNKNOWN TARGET'}"...`), L('JUST KIDDING. USE SCAN / CONNECT / CRACK / EXPLOIT.','OK')];
  if (cmd === 'sudo') return [L(`SUDO ${arg.toUpperCase()||'(NOTHING)'}`), L('[SUDO] PASSWORD FOR GUEST: ********'), L('PERMISSION DENIED. NICE TRY.','ERR')];
  if (cmd === 'su')   return [L('ACCESS DENIED — USE THE LOGIN PORTAL.','ERR')];

  if (cmd === 'login') {
    if (ctx.getToken()) return [L('ALREADY AUTHENTICATED. USE LOGOUT FIRST.','ERR')];
    const username = await ctx.promptLine('> USERNAME: '); if (!username) return [L('LOGIN ABORTED','ERR')];
    const password = await ctx.promptPassword('> PASSWORD: '); if (!password) return [L('LOGIN ABORTED','ERR')];
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      const data = await res.json();
      if (!res.ok) return [L(`AUTH FAILED: ${(data.error||'unknown').toUpperCase()}`, 'ERR')];
      ctx.setToken(data.token);
      localStorage.setItem('g2306_user', JSON.stringify({isAdmin:!!data.isAdmin,name:data.name,username:data.username}));
      sessionStorage.setItem('g2306_terminal_session','1');
      return [L(`AUTHENTICATED AS: ${data.name}`,'OK'), L(`ROLE: ${data.isAdmin?'ADMINISTRATOR':'STUDENT'}`,'RDY'), L('SESSION TOKEN STORED. USE "PORTAL" TO OPEN DASHBOARD.','OK')];
    } catch { return [L('CONNECTION FAILED','ERR')]; }
  }
  if (cmd === 'logout') {
    if (!ctx.getToken()) return [L('NOT AUTHENTICATED','ERR')];
    ctx.setToken(null); localStorage.removeItem('g2306_user'); sessionStorage.removeItem('g2306_terminal_session');
    return [L('SESSION TERMINATED.','OK'), L('TOKEN PURGED.','RDY')];
  }
  if (cmd === 'portal' || cmd === 'dashboard') {
    if (!ctx.getToken()) return [L('NOT AUTHENTICATED. LOGIN FIRST.','ERR')];
    window.open('admin.html?auto=1','_blank');
    return [L('PORTAL LAUNCHED IN NEW TAB.','OK'), L('DASHBOARD WILL USE YOUR CURRENT SESSION.','RDY')];
  }
  if (cmd === 'cd') {
    const tok = ctx.getToken(); let u = '';
    if (tok) { try { u = (JSON.parse(atob(tok.split('.')[1])).username||'').toUpperCase().replace(/\s+/g,'_'); } catch {} }
    const t = (arg1||'').replace(/\\/g,'/').replace(/\/+$/,'').toUpperCase();
    const home = u ? `C:/G2306/${u}` : 'C:/G2306';
    if (!t||t==='~'||t===home) return [L(`${home}> `,'OK')];
    if (t==='C:'||t==='C:/G2306') return [L('C:\\G2306> ','OK')];
    if (t==='C:/G2306/SYSTEM'||t==='SYSTEM') return [L('C:\\G2306\\SYSTEM>','OK'), L('  kernel.sys  net.dll  auth.bin  bootlog.txt','RDY')];
    if (t==='C:/G2306/NET'||t==='NET') return [L('C:\\G2306\\NET>','OK'), L('  SCAN to list available nodes.','RDY')];
    if (t==='..'||t==='') return [L('C:\\G2306> ','OK')];
    return [L(`CD: PATH NOT FOUND: ${arg1}`,'ERR')];
  }
  if (cmd === 'me') {
    const tok = ctx.getToken(); if (!tok) return [L('NOT AUTHENTICATED. USE LOGIN.','ERR')];
    try {
      const res = await fetch(`${API_BASE}/api/student/me`,{headers:{Authorization:`Bearer ${tok}`}});
      if (!res.ok) return [L('FETCH FAILED','ERR')];
      const d = await res.json();
      return [L(`> DISPLAY_NAME : ${d.display_name||'N/A'}`), L(`> UNIVERSITY   : ${d.university||'N/A'}`),
        L(`> MAJOR        : ${d.major||'N/A'}`), L(`> CITY         : ${d.city||'N/A'}`),
        L(`> STATUS       : ${d.status_text||'—'}`),
        L(`> CENGFAN      : ${d.can_cengfan?'[READY]':'[NOT_READY]'}`, d.can_cengfan?'OK':'ERR'),
        L(`> SERVER       : ${d.server_hostname||'(auto)'}  DIFF: ${stars(d.server_difficulty||2)}`)];
    } catch { return [L('REQUEST FAILED','ERR')]; }
  }
  if (cmd === 'set') {
    const tok = ctx.getToken(); if (!tok) return [L('NOT AUTHENTICATED.','ERR')];
    if (!arg1||!arg2) return [L('USAGE: SET <FIELD> <VALUE>','ERR'), L('FIELDS: UNIVERSITY / MAJOR / STATUS / CENGFAN')];
    const map = {university:'university',major:'major',status:'status_text',cengfan:'can_cengfan'};
    const apiField = map[arg1.toLowerCase()]; if (!apiField) return [L(`UNKNOWN FIELD: ${arg1.toUpperCase()}`,'ERR')];
    const val = apiField==='can_cengfan'?(['1','yes','true'].includes(arg2.toLowerCase())?1:0):arg2;
    try {
      const res = await fetch(`${API_BASE}/api/student/me`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({[apiField]:val})});
      if (!res.ok) return [L('UPDATE FAILED','ERR')];
      return [L(`${arg1.toUpperCase()} UPDATED SUCCESSFULLY.`,'OK')];
    } catch { return [L('REQUEST FAILED','ERR')]; }
  }
  if (cmd === 'passwd') {
    const tok = ctx.getToken(); if (!tok) return [L('NOT AUTHENTICATED.','ERR')];
    const oldPw = await ctx.promptPassword('> CURRENT PASSWORD: '); if (!oldPw) return [L('ABORTED','ERR')];
    const newPw = await ctx.promptPassword('> NEW PASSWORD (MIN 6): '); if (!newPw) return [L('ABORTED','ERR')];
    const conf  = await ctx.promptPassword('> CONFIRM NEW PASSWORD: ');
    if (newPw!==conf) return [L('PASSWORDS DO NOT MATCH. ABORTED.','ERR')];
    try {
      const res = await fetch(`${API_BASE}/api/student/password`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({old_password:oldPw,new_password:newPw})});
      const data = await res.json(); if (!res.ok) return [L(`FAILED: ${(data.error||'unknown').toUpperCase()}`,'ERR')];
      return [L('PASSWORD UPDATED.','OK')];
    } catch { return [L('REQUEST FAILED','ERR')]; }
  }
  if (cmd === 'roster' || cmd === 'classmates') {
    const data = ctx.getMapData(); if (!data) return [L('NO DATA LOADED YET.','ERR')];
    ctx.setFullscreen(true);
    const lines = [L('> ALUMNI_NET ROSTER — G2306 COHORT','RDY'), L('> ─────────────────────────────────')];
    const byCity = {};
    for (const u of data.universities) { const c=u.city||'UNKNOWN'; if (!byCity[c]) byCity[c]=[]; byCity[c].push(u); }
    let idx=1;
    for (const [city, unis] of Object.entries(byCity)) {
      lines.push(L('')); lines.push(L(`> [${city.toUpperCase()}]`));
      for (const u of unis) for (const m of (u.members||[])) {
        const ready=m.canCengfan?'[READY]':'[—]';
        lines.push(L(`  [${String(idx++).padStart(2,'0')}] ${m.name}  —  ${u.university}  —  ${m.major||'N/A'}  ${ready}`, m.canCengfan?'OK':undefined));
      }
    }
    lines.push(L('')); lines.push(L(`> TOTAL: ${idx-1} STUDENT(S)`,'DONE')); lines.push(L('> TYPE "EXIT" TO RETURN TO MAP'));
    return lines;
  }

  // ── SCAN ─────────────────────────────────────────────────────
  if (cmd === 'scan') {
    if (getBroken()['SCAN.EXE']) return [L('SCAN.EXE: command not found — tool has been deleted.','ERR'), L('Use REINSTALL to restore system tools.')];
    const terminal = document.getElementById('terminal-content');
    ctx.setFullscreen(true);
    const t0 = Date.now();
    const stages = ['Initializing ARP broadcast on 10.0.0.0/8...','Probing CIDR blocks: 10.0.0.0/8  172.16.0.0/12  192.168.0.0/16','Running SYN sweep on ports 21,22,23,25,80,443,3306,8080...','Resolving PTR records...','Fingerprinting TTL and TCP window sizes...','Enumerating banner strings on open ports...','Cross-referencing with passive DNS cache...','Building host table...'];
    let servers, fetchErr = false;
    const fetchP = fetch(`${API_BASE}/api/hack/servers`).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{servers=d;}).catch(()=>{fetchErr=true;});
    for (const s of stages) {
      const el = (Date.now()-t0)/1000;
      const div = document.createElement('div'); div.textContent=`[${el.toFixed(2)}s]  ${s}`; div.style.color='var(--hud-text-dim)';
      terminal.appendChild(div); if (!terminal._userScrolled) requestAnimationFrame(()=>{terminal.scrollTop=terminal.scrollHeight;});
      await sleep(350+Math.random()*250); if (servers||fetchErr) break;
    }
    const deadline = t0+5000; while (!servers&&!fetchErr&&Date.now()<deadline) await sleep(100);
    const elapsed = ((Date.now()-t0)/1000).toFixed(2);
    if (fetchErr||!servers) { ctx.setFullscreen(false); return [L(`SCAN FAILED — API UNREACHABLE  [${elapsed}s]`,'ERR')]; }
    ctx.clearTerminal();
    const hacked=getHacked(); const osTypes=['Linux 4.15','Linux 5.4','Linux 3.10','OpenBSD 6.8','FreeBSD 12.1','Windows Server 2016','Ubuntu 20.04','CentOS 7.9','Debian 10'];
    const svcMap={21:'ftp',22:'ssh',23:'telnet',25:'smtp',80:'http',443:'https',3306:'mysql',8080:'http-proxy',3389:'rdp',8443:'https-alt',6379:'redis',27017:'mongodb'};
    const lines=[L(`Starting G2306-SCAN  at ${new Date().toISOString().replace('T',' ').slice(0,19)}`),L(`Scan report for G2306 Alumni Network (10.0.0.0/8)`),L(`Scan completed in ${elapsed}s  —  ${servers.length} hosts up`),L(''),L('─────────────────────────────────────────────────────────────────')];
    for (const s of servers) {
      const rooted=hacked[s.hostname]; const os=osTypes[Math.abs(s.hostname.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%osTypes.length];
      const ports=(s.ports||'22,80').split(',').map(p=>p.trim());
      lines.push(L('')); lines.push(L(`Host: ${s.ip}  (${s.hostname})${rooted?'  [ROOTED]':''}`, rooted?'OK':undefined));
      lines.push(L(`  OS guess: ${os}`)); lines.push(L(`  PORT      STATE   SERVICE`));
      for (const p of ports) lines.push(L(`  ${p.padEnd(9)} open    ${(svcMap[p]||'unknown').padEnd(14)}`));
    }
    lines.push(L('')); lines.push(L('─────────────────────────────────────────────────────────────────')); lines.push(L(`${servers.length} host(s) scanned.  CONNECT <hostname> or CONNECT <ip>`)); lines.push(L('TYPE EXIT TO RETURN TO MAP.'));
    const perLine=Math.min(80,Math.floor(4000/lines.length));
    for (const item of lines) {
      const div=document.createElement('div'); div.textContent=item.text;
      if (item.status==='OK') div.style.color='var(--hud-primary)'; else if (item.status==='ERR') div.style.color='var(--hud-danger)'; else div.style.color='var(--hud-text-dim)';
      terminal.appendChild(div); if (!terminal._userScrolled) requestAnimationFrame(()=>{terminal.scrollTop=terminal.scrollHeight;});
      await sleep(perLine);
    }
    return [];
  }

  if (cmd === 'connect') {
    if (!arg1) return [L('USAGE: CONNECT <hostname|ip>','ERR')];
    let servers; try { const r=await fetch(`${API_BASE}/api/hack/servers`); if(!r.ok) throw new Error(); servers=await r.json(); } catch { return [L('API UNREACHABLE','ERR')]; }
    const target=servers.find(s=>s.hostname.toLowerCase()===arg1.toLowerCase()||s.ip===arg1);
    if (!target) return [L(`connect: ${arg1}: No route to host`,'ERR')];
    const fw=getFirewall(); if (fw[target.hostname]&&Date.now()<fw[target.hostname]) {
      return [L(`ssh: connect to host ${target.ip} port 22: Connection refused  (firewall active, ${Math.ceil((fw[target.hostname]-Date.now())/1000)}s remaining)`,'ERR')];
    }
    setConnected(JSON.stringify(target)); crackState=null;
    const hacked=getHacked(); const ports=target.ports.split(',').map(p=>p.trim());
    const s2={21:'ftp',22:'ssh',23:'telnet',25:'smtp',80:'http',443:'https',3306:'mysql',8080:'http-proxy',3389:'rdp'};
    const lines=[L(`Trying ${target.ip}...`),L(`Connected to ${target.hostname}.`),L(`Escape character is '^]'.`),L(''),L(`  HOST  : ${target.hostname}  (${target.ip})`),L(`  PORT  STATE   SERVICE`)];
    for (const p of ports) lines.push(L(`  ${p.padEnd(6)} open    ${s2[p]||'unknown'}`));
    lines.push(L(''));
    lines.push(hacked[target.hostname] ? L('  [!] ROOT shell available — type LS to browse filesystem','OK') : L('  [*] Target is live. Select a port to attack: PORT <num>','RDY'));
    return lines;
  }
  if (cmd === 'port') {
    const target=getConnectedTarget(); if (!target) return [L('NOT CONNECTED. USE CONNECT <HOSTNAME>.','ERR')];
    if (!arg1) return [L('USAGE: PORT <NUMBER>','ERR')];
    const ports=target.ports.split(',').map(p=>p.trim());
    if (!ports.includes(arg1)) return [L(`PORT ${arg1} NOT OPEN ON THIS HOST.`,'ERR'), L(`OPEN PORTS: ${ports.join(', ')}`)];
    crackState={hostname:target.hostname,studentId:target.studentId,port:arg1,cracked:false};
    return [L(`> PORT ${arg1} SELECTED (${portName(arg1)})`,'RDY'), L('> RUN "CRACK" TO BEGIN EXPLOIT SEQUENCE.')];
  }
  if (cmd === 'crack') {
    if (getBroken()['CRACK.EXE']) return [L('CRACK.EXE: command not found','ERR'), L('Use REINSTALL to restore system tools.')];
    const target=getConnectedTarget(); if (!target) return [L('NOT CONNECTED.','ERR')];
    if (!crackState) return [L('SELECT A PORT FIRST. USE: PORT <NUM>','ERR')];
    if (crackState.cracked) return [L('PORT ALREADY CRACKED. USE EXPLOIT.','RDY')];
    const diff=target.difficulty, steps=3+diff;
    const attacks=['SENDING SYN FLOOD...','INJECTING PAYLOAD...','BYPASSING IDS...','ESCALATING PRIVILEGES...','ENUMERATING SERVICES...','FUZZING INPUT VECTORS...','PATCHING RETURN ADDRESS...'];
    const lines=[L(`> CRACKING PORT ${crackState.port}...`,'RUN')];
    for (let i=0;i<steps;i++) lines.push(L(`  [${Math.floor(((i+1)/steps)*100).toString().padStart(3)}%] ${pick(attacks)}`));
    if (Math.random()<(0.85-diff*0.1)) {
      crackState.cracked=true; lines.push(L('> PORT CRACKED. SHELL OBTAINED.','OK')); lines.push(L('> RUN "EXPLOIT" TO SOLVE CRYPTO CHALLENGE AND GAIN ROOT.'));
    } else {
      crackState=null; const fw=getFirewall(); fw[target.hostname]=Date.now()+30000; setFirewall(fw);
      lines.push(L('> INTRUSION DETECTED. FIREWALL TRIGGERED.','ERR')); lines.push(L('> CONNECTION BLOCKED FOR 30 SECONDS.')); setConnected(null);
    }
    return lines;
  }
  if (cmd === 'exploit') {
    if (getBroken()['EXPLOIT.EXE']) return [L('EXPLOIT.EXE: command not found','ERR'), L('Use REINSTALL to restore system tools.')];
    const target=getConnectedTarget(); if (!target) return [L('NOT CONNECTED.','ERR')];
    if (!crackState?.cracked) return [L('PORT NOT CRACKED YET. RUN CRACK FIRST.','ERR')];
    const challenge=genChallenge();
    await ctx.print([L('> EXPLOIT DELIVERED. AWAITING AUTHENTICATION TOKEN...','RUN'), L('> CRYPTO CHALLENGE REQUIRED:'), L('> ─────────────────────────────'), ...challenge.prompt.map(p=>L(p))]);
    const answer=await ctx.promptLine('> ANSWER: '); if (!answer) return [L('EXPLOIT ABORTED','ERR')];
    if (answer.trim().toUpperCase()===challenge.answer.toUpperCase()) {
      const hacked=getHacked(); hacked[target.hostname]=true; setHacked(hacked); crackState=null;
      return [L('> CORRECT. ROOT ACCESS GRANTED.','OK'), L(`> ${target.hostname} IS NOW UNDER YOUR CONTROL.`,'OK'), L('> TYPE "LS" TO LIST FILES.')];
    } else {
      crackState=null; const fw=getFirewall(); fw[target.hostname]=Date.now()+30000; setFirewall(fw); setConnected(null);
      return [L('> WRONG ANSWER. SECURITY ALERT TRIGGERED.','ERR'), L('> CONNECTION TERMINATED. FIREWALL ACTIVE FOR 30s.','ERR')];
    }
  }
  if (cmd === 'disconnect') {
    const t=getConnectedTarget(); if (!t) return [L('NOT CONNECTED.','ERR')];
    setConnected(null); crackState=null; return [L(`> DISCONNECTED FROM ${t.hostname||'HOST'}.`,'OK')];
  }

  if (cmd === 'download') {
    if (getBroken()['DOWNLOAD.EXE']) return [L('DOWNLOAD.EXE: command not found','ERR'), L('Use REINSTALL to restore.')];
    const target=getConnectedTarget(); if (!target) return [L('NOT CONNECTED. CONNECT TO A HOST FIRST.','ERR')];
    const hacked=getHacked(); if (!hacked[target.hostname]) return [L('NEED ROOT ACCESS FIRST. RUN HACK SEQUENCE.','ERR')];
    const loot=target.loot||[];
    if (!arg1) return [L('USAGE: DOWNLOAD <filename>','ERR'), L(`AVAILABLE: ${loot.join(', ')||'(none)'}`)];
    if (!loot.includes(arg1)) return [L(`FILE NOT FOUND: ${arg1}`,'ERR')];
    const dl=getDownloads(); dl[arg1]=(dl[arg1]||0)+1; setDownloads(dl);
    return [L(`> DOWNLOADING ${arg1}...`,'RUN'), L('  [████████████] 100%'), L(`> ${arg1} SAVED TO LOCAL LOOT.`,'OK')];
  }

  if (cmd === 'loot') {
    const dl=getDownloads(); const keys=Object.keys(dl);
    if (!keys.length) return [L('NO FILES DOWNLOADED YET. USE DOWNLOAD <file> ON A ROOTED HOST.')];
    return [L('DOWNLOADED FILES:','OK'), ...keys.map(f=>L(`  ${f}  (x${dl[f]})`))];
  }

  if (cmd === 'apply' || cmd === 'themes') {
    const names=Object.keys(THEMES);
    if (!arg1) return [L('USAGE: APPLY <theme>','ERR'), L('AVAILABLE: '+names.join(', ')), L('Current: '+(sessionStorage.getItem('g2306_theme')||'DEFAULT'))];
    const key=arg1.toUpperCase();
    if (!THEMES[key]) return [L(`THEME NOT FOUND: ${key}`,'ERR'), L('AVAILABLE: '+names.join(', '))];
    applyTheme(key);
    return [L(`> THEME "${key}" APPLIED.`,'OK')];
  }
  if (cmd === 'restore') {
    applyTheme('DEFAULT');
    return [L('> DEFAULT THEME RESTORED.','OK')];
  }

  if (cmd === 'vim' || cmd === 'vi' || cmd === 'nano') {
    return [L(`${cmdRaw}: no display — only text terminals allowed here.`,'ERR'), L('USE echo, cat, touch, rm.')];
  }

  if (cmd === 'serverconf' || cmd === 'serverset') {
    const tok=ctx.getToken(); let payload;
    try { payload=JSON.parse(atob(tok.split('.')[1])); } catch { return [L('NOT AUTHENTICATED.','ERR')]; }
    if (!payload?.admin) return [L('PERMISSION DENIED — ADMIN ONLY.','ERR')];
    return [L('SERVER CONFIG:','OK'), L(`  API_BASE      : ${API_BASE}`), L(`  HOSTNAME      : ${window.location.host}`), L(`  PROTO         : ${window.location.protocol}`), L(`  BUILD         : G2306_v2`)];
  }

  if (cmd === 'mkdir') {
    if (!arg) return [L('USAGE: MKDIR <dirname>','ERR')];
    const fs=getFS(); const p=normPath(arg);
    if (fs.dirs.includes(p)) return [L(`mkdir: cannot create directory '${arg}': File exists`,'ERR')];
    fs.dirs.push(p); saveFS(fs); return [L(`> DIRECTORY CREATED: ${p}`,'OK')];
  }
  if (cmd === 'touch') {
    if (!arg) return [L('USAGE: TOUCH <filename>','ERR')];
    const fs=getFS(); const p=normPath(arg);
    if (!fs.files[p]) fs.files[p]='';
    saveFS(fs); return [L(`> FILE TOUCHED: ${p}`,'OK')];
  }
  if (cmd === 'echo') {
    return [L(arg||'')];
  }
  if (cmd === 'rm' || cmd === 'del') {
    if (!arg) return [L('USAGE: RM <path>','ERR')];
    const fs=getFS(); const p=normPath(arg);
    const wasDir=fs.dirs.includes(p); const wasFile=p in fs.files;
    if (!wasDir&&!wasFile) return [L(`rm: cannot remove '${arg}': No such file or directory`,'ERR')];
    fs.dirs=fs.dirs.filter(d=>d!==p); delete fs.files[p]; saveFS(fs);
    return [L(`> REMOVED: ${p}`,'OK')];
  }
  if (cmd === 'cat') {
    if (!arg) return [L('USAGE: CAT <filename>','ERR')];
    const fs=getFS(); const p=normPath(arg);
    if (!(p in fs.files)) return [L(`cat: ${arg}: No such file or directory`,'ERR')];
    const content=fs.files[p]; if (!content) return [L('(empty file)')];
    return content.split('\n').map(line=>L(line));
  }

  if (cmd === 'ls' || cmd === 'dir') {
    const target=getConnectedTarget(); const hacked=getHacked();
    if (target && hacked[target.hostname]) {
      const loot=target.loot||[];
      return [L(`Filesystem: ${target.hostname}  (remote shell)`,'OK'), L('  -rw-r--r--  passwd'), L('  -rw-------  shadow'), L('  drwxr-xr-x  etc/'), L('  drwxr-xr-x  var/'), ...loot.map(f=>L(`  -rw-r--r--  ${f}`))];
    }
    const fs=getFS();
    return [L('LOCAL FILESYSTEM:'), ...fs.dirs.map(d=>L(`  drwxr-xr-x  ${d}/`)), ...Object.keys(fs.files).map(f=>L(`  -rw-r--r--  ${f}`)), ...(!fs.dirs.length&&!Object.keys(fs.files).length ? [L('  (empty — use MKDIR or TOUCH to create files)')] : [])];
  }

  if (cmd === 'reinstall') {
    resetBroken(); return [L('> REINSTALLING SYSTEM TOOLS...','RUN'), L('  SCAN.EXE    ✓'), L('  CRACK.EXE   ✓'), L('  EXPLOIT.EXE ✓'), L('  DOWNLOAD.EXE ✓'), L('> ALL TOOLS RESTORED.','OK')];
  }

  return [L(`'${cmdRaw}' IS NOT RECOGNIZED. TYPE help FOR COMMANDS.`,'ERR')];
}
