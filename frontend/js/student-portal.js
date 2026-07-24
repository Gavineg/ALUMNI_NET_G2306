import { apiFetch, getSession } from './auth.js';
import { API_BASE } from './config.js';
import { runCommand } from './terminal-cmd.js';
import { buildVFS } from './vfs.js';
import { biosAppend } from './boot.js';

let profile = {};

export async function initStudentPortal(container) {
  const session = getSession();
  container.innerHTML = `
    <div class="panel-title">&gt; STUDENT_ACCESS // ${session?.name || ''}</div>

    <div class="portal-card" style="max-width:520px">
      <div class="field-group">
        <label class="field-label">&gt; DISPLAY_NAME</label>
        <input class="hud-input" id="s-name" readonly>
      </div>

      <div class="field-group">
        <label class="field-label">&gt; UNIVERSITY</label>
        <div class="input-row">
          <input class="hud-input" id="s-uni" placeholder="INPUT INSTITUTE NAME...">
          <button class="hud-btn ghost" id="s-locate-btn">[LOCATE]</button>
        </div>
        <div class="coord-display" id="s-coord"></div>
      </div>

      <div style="display:flex;gap:8px">
        <div class="field-group" style="flex:1">
          <label class="field-label">&gt; LONGITUDE</label>
          <input class="hud-input" id="s-lon" placeholder="E.G. 116.40">
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">&gt; LATITUDE</label>
          <input class="hud-input" id="s-lat" placeholder="E.G. 39.90">
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">&gt; MAJOR</label>
        <input class="hud-input" id="s-major" placeholder="INPUT MAJOR...">
      </div>

      <div class="field-group">
        <label class="field-label">&gt; READY_FOR_FOOD</label>
        <div class="cengfan-toggle">
          <button class="hud-btn" id="s-avail-btn">[READY]</button>
          <button class="hud-btn danger" id="s-offline-btn">[NOT_READY]</button>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label">&gt; CUSTOM_STATUS <span class="char-count" id="s-char-count">0/100</span></label>
        <textarea class="hud-input" id="s-status" rows="3" maxlength="100" placeholder="INPUT STATUS TEXT..."></textarea>
      </div>

      <button class="hud-btn full" id="s-save-btn">[SAVE_CHANGES]</button>
      <div class="msg" id="s-msg"></div>

      <div style="border-top:1px dashed var(--hud-border);padding-top:18px;margin-top:18px">
        <div style="font-size:11px;color:var(--hud-text-dim);letter-spacing:2px;margin-bottom:14px">&gt; CHANGE_PASSWORD</div>
        <div class="field-group">
          <label class="field-label">&gt; CURRENT_PASSWORD</label>
          <input class="hud-input" type="password" id="s-old-pw" placeholder="INPUT CURRENT PASSWORD...">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; NEW_PASSWORD</label>
          <input class="hud-input" type="password" id="s-new-pw" placeholder="INPUT NEW PASSWORD...">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; CONFIRM_PASSWORD</label>
          <input class="hud-input" type="password" id="s-confirm-pw" placeholder="CONFIRM NEW PASSWORD...">
        </div>
        <button class="hud-btn full ghost" id="s-pw-btn">[UPDATE_PASSWORD]</button>
        <div class="msg" id="s-pw-msg"></div>
      </div>
    </div>

    <!-- ── 内嵌终端 ───────────────────────────────── -->
    <div class="portal-terminal" style="max-width:520px;width:100%">
      <div class="portal-terminal-header">
        &gt; NODE_TERMINAL <span id="pt-prompt-label">C:\\G2306</span>
        <span style="opacity:0.5">TYPE HELP FOR COMMANDS</span>
      </div>
      <div class="portal-terminal-body" id="pt-output"></div>
      <div class="portal-terminal-input-row">
        <span class="portal-terminal-prompt" id="pt-prompt">C:\\G2306&gt;&nbsp;</span>
        <input class="portal-terminal-input" id="pt-input" type="text"
               autocomplete="off" spellcheck="false" placeholder="enter command...">
      </div>
    </div>
  `;

  await loadProfile(container);
  bindStudentEvents(container);
  initPortalTerminal(container, session);
}

async function loadProfile(container) {
  const res  = await apiFetch('/api/student/me');
  profile    = await res.json();

  container.querySelector('#s-name').value  = profile.display_name || '';
  container.querySelector('#s-uni').value   = profile.university   || '';
  container.querySelector('#s-major').value = profile.major        || '';
  container.querySelector('#s-status').value = profile.status_text || '';
  updateCharCount(container, profile.status_text || '');
  updateCoordDisplay(container, profile.longitude, profile.latitude, profile.city);
  if (profile.longitude) container.querySelector('#s-lon').value = profile.longitude;
  if (profile.latitude)  container.querySelector('#s-lat').value = profile.latitude;
  setCengfan(container, !!profile.can_cengfan);
}

function setCengfan(container, canCengfan) {
  container.querySelector('#s-avail-btn').classList.toggle('active', canCengfan);
  container.querySelector('#s-offline-btn').classList.toggle('active', !canCengfan);
  profile.can_cengfan = canCengfan ? 1 : 0;
}

function updateCharCount(container, text) {
  container.querySelector('#s-char-count').textContent = `${text.length}/100`;
}

function updateDiffLabel(container, val) {
  const n = parseInt(val);
  const el = container.querySelector('#s-diff-label');
  if (el) el.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
}

function updateCoordDisplay(container, lon, lat, city) {
  const el = container.querySelector('#s-coord');
  if (lon && lat) el.textContent = `> LON:${lon.toFixed(4)}  LAT:${lat.toFixed(4)}  CITY:${city || '?'}`;
  else el.textContent = '';
}

function setMsg(container, text, type = 'ok') {
  const el = container.querySelector('#s-msg');
  el.textContent = text;
  el.className = `msg ${type}`;
}

function bindStudentEvents(container) {
  container.querySelector('#s-status').addEventListener('input', e => {
    updateCharCount(container, e.target.value);
  });

  container.querySelector('#s-avail-btn').addEventListener('click', () => setCengfan(container, true));
  container.querySelector('#s-offline-btn').addEventListener('click', () => setCengfan(container, false));

  container.querySelector('#s-locate-btn').addEventListener('click', async () => {
    const keyword = container.querySelector('#s-uni').value.trim();
    if (!keyword) return;
    const btn = container.querySelector('#s-locate-btn');
    btn.textContent = '[LOCATING...]';
    btn.disabled = true;
    try {
      const res  = await apiFetch('/api/geocode', {
        method: 'POST',
        body: JSON.stringify({ keyword })
      });
      const data = await res.json();
      if (res.ok) {
        profile.longitude = data.longitude;
        profile.latitude  = data.latitude;
        profile.city      = data.city;
        container.querySelector('#s-uni').value = data.name;
        updateCoordDisplay(container, data.longitude, data.latitude, data.city);
        setMsg(container, `> LOCATION LOCKED: ${data.name}`, 'ok');
      } else {
        setMsg(container, `> [ERR] ${data.error || 'NOT FOUND'}`, 'err');
      }
    } catch {
      setMsg(container, '> [ERR] GEOCODE REQUEST FAILED', 'err');
    }
    btn.textContent = '[LOCATE]';
    btn.disabled = false;
  });

  container.querySelector('#s-save-btn').addEventListener('click', async () => {
    const payload = {
      university:  container.querySelector('#s-uni').value.trim(),
      major:       container.querySelector('#s-major').value.trim(),
      city:        profile.city      || null,
      longitude:   parseFloat(container.querySelector('#s-lon').value) || profile.longitude || null,
      latitude:    parseFloat(container.querySelector('#s-lat').value) || profile.latitude  || null,
      status_text: container.querySelector('#s-status').value.trim(),
      can_cengfan: profile.can_cengfan
    };
    const btn = container.querySelector('#s-save-btn');
    btn.disabled = true;
    btn.textContent = '[SAVING...]';
    try {
      const res = await apiFetch('/api/student/me', { method: 'PUT', body: JSON.stringify(payload) });
      if (res.ok) {
        setMsg(container, '> PROFILE UPDATED [OK]', 'ok');
      } else {
        const d = await res.json();
        setMsg(container, `> [ERR] ${d.error}`, 'err');
      }
    } catch {
      setMsg(container, '> [ERR] SAVE FAILED', 'err');
    }
    btn.disabled = false;
    btn.textContent = '[SAVE_CHANGES]';
  });

  container.querySelector('#s-pw-btn').addEventListener('click', async () => {
    const oldPw    = container.querySelector('#s-old-pw').value;
    const newPw    = container.querySelector('#s-new-pw').value;
    const confirmPw = container.querySelector('#s-confirm-pw').value;
    const pwMsg    = container.querySelector('#s-pw-msg');
    const btn      = container.querySelector('#s-pw-btn');

    if (!oldPw || !newPw || !confirmPw) {
      pwMsg.textContent = '> [ERR] ALL FIELDS REQUIRED'; pwMsg.className = 'msg err'; return;
    }
    if (newPw !== confirmPw) {
      pwMsg.textContent = '> [ERR] PASSWORDS DO NOT MATCH'; pwMsg.className = 'msg err'; return;
    }
    if (newPw.length < 6) {
      pwMsg.textContent = '> [ERR] PASSWORD TOO SHORT (MIN 6)'; pwMsg.className = 'msg err'; return;
    }

    btn.disabled = true; btn.textContent = '[UPDATING...]';
    try {
      const res = await apiFetch('/api/student/password', {
        method: 'PUT',
        body: JSON.stringify({ old_password: oldPw, new_password: newPw })
      });
      if (res.ok) {
        pwMsg.textContent = '> PASSWORD UPDATED — LOGGING OUT...'; pwMsg.className = 'msg ok';
        setTimeout(() => {
          localStorage.removeItem('g2306_token');
          localStorage.removeItem('g2306_user');
          location.reload();
        }, 1500);
      } else {
        const d = await res.json();
        pwMsg.textContent = `> [ERR] ${d.error}`; pwMsg.className = 'msg err';
        btn.disabled = false; btn.textContent = '[UPDATE_PASSWORD]';
      }
    } catch {
      pwMsg.textContent = '> [ERR] REQUEST FAILED'; pwMsg.className = 'msg err';
      btn.disabled = false; btn.textContent = '[UPDATE_PASSWORD]';
    }
  });
}


// ── 内嵌终端 ───────────────────────────────────────────────────

function initPortalTerminal(container, session) {
  const output   = container.querySelector('#pt-output');
  const input    = container.querySelector('#pt-input');
  const promptEl = container.querySelector('#pt-prompt');
  const labelEl  = container.querySelector('#pt-prompt-label');

  input.style.textTransform = 'none';

  let pendingResolve = null;
  let maskValue = '';
  let cmdRunning = false;
  const cmdHistory = [];
  let histIdx = -1;
  let tabState = null; // { base, matches, pos }

  // JWT sub as userSlug (avoids Chinese chars in paths)
  function getUserSlug() {
    try {
      const tok = localStorage.getItem('g2306_token');
      const p = JSON.parse(atob(tok.split('.')[1]));
      return (p.username || p.sub || 'user').toString().toLowerCase().replace(/\s+/g,'_');
    } catch { return 'user'; }
  }

  const userSlug = getUserSlug();
  const home = `/home/${userSlug}`;

  // Build VFS
  const { tree, files, binaries } = buildVFS(userSlug);

  // Deleted files (tools the user has rm'd)
  const DELETED_KEY = `g2306_deleted_${userSlug}`;
  function getDeleted() { try { return new Set(JSON.parse(sessionStorage.getItem(DELETED_KEY)||'[]')); } catch { return new Set(); } }
  function saveDeleted(s) { sessionStorage.setItem(DELETED_KEY, JSON.stringify([...s])); }

  // Check if a tool binary exists (not deleted)
  function toolExists(name) {
    const paths = [
      `/bin/${name}`, `/usr/bin/${name}`, `/sbin/${name}`,
      `/usr/sbin/${name}`, `/usr/local/bin/${name}`
    ];
    const deleted = getDeleted();
    return paths.some(p => (tree[p.slice(0, p.lastIndexOf('/'))]||[]).includes(p.slice(p.lastIndexOf('/')+1)) && !deleted.has(p));
  }

  let cwd = home;

  // ── Prompt ────────────────────────────────────────────────
  function cwdDisplay() {
    if (cwd === home) return '~';
    if (cwd.startsWith(home + '/')) return '~' + cwd.slice(home.length);
    return cwd;
  }

  function updatePrompt() {
    const u = (session?.username || session?.name || 'USER').toUpperCase().replace(/\s+/g,'_');
    const text = `${u}@G2306:${cwdDisplay()}$`;
    promptEl.textContent = text + ' ';
    if (labelEl) labelEl.textContent = text;
  }
  updatePrompt();

  // ── Output ────────────────────────────────────────────────
  function appendLine(text, color) {
    const div = document.createElement('div');
    div.textContent = text;
    if (color) div.style.color = color;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  // ── Path resolution ───────────────────────────────────────
  function resolvePath(arg) {
    if (!arg || arg === '~') return home;
    if (arg.startsWith('~/')) return home + arg.slice(1);
    if (arg.startsWith('/')) return normPath(arg);
    return normPath(cwd + '/' + arg);
  }

  function normPath(p) {
    const parts = p.split('/').filter(Boolean);
    const out = [];
    for (const s of parts) { if (s === '..') out.pop(); else if (s !== '.') out.push(s); }
    return '/' + out.join('/');
  }

  function isDir(p) { return p === '/' || !!tree[p]; }

  function parentAndBase(p) {
    const i = p.lastIndexOf('/');
    return [i === 0 ? '/' : p.slice(0, i), p.slice(i + 1)];
  }

  // ── Tab completion ────────────────────────────────────────
  function tabComplete(val) {
    const parts = val.trimStart().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.length > 1 ? parts[parts.length - 1] : null;

    // Complete command name
    if (parts.length === 1) {
      const CMDS = ['ls','cd','cat','pwd','vim','vi','nano','rm','mkdir','rmdir',
        'touch','cp','mv','chmod','chown','grep','find','echo','which','uname',
        'whoami','id','ps','top','df','du','free','uptime','clear','cls','exit',
        'history','env','printenv','ping','curl','wget','ssh','scp','git','node',
        'npm','python3','systemctl','service','sudo','su','crontab','tail','head',
        'less','more','sort','uniq','wc','diff','tar','gzip','gunzip','netstat',
        'ss','ifconfig','ip','iptables','ufw','fail2ban-client'];
      const base = val.trimStart().toLowerCase();
      const matches = CMDS.filter(c => c.startsWith(base));
      return { matches, prefix: '' };
    }

    // Complete path argument
    const argRaw = arg || '';
    let dirPart, filePart;
    if (argRaw.includes('/')) {
      const lastSlash = argRaw.lastIndexOf('/');
      dirPart = argRaw.slice(0, lastSlash) || '/';
      filePart = argRaw.slice(lastSlash + 1);
    } else {
      dirPart = '';
      filePart = argRaw;
    }

    const resolvedDir = dirPart ? resolvePath(dirPart) : cwd;
    const entries = tree[resolvedDir] || [];
    const deleted = getDeleted();
    const matches = entries
      .filter(e => e.startsWith(filePart) && !deleted.has(resolvedDir + '/' + e))
      .map(e => {
        const full = resolvedDir + '/' + e;
        return isDir(full) ? e + '/' : e;
      });

    // Rebuild prefix (everything before the last path component being completed)
    const cmdPrefix = parts.slice(0, -1).join(' ') + ' ';
    const pathPrefix = dirPart ? (argRaw.slice(0, argRaw.lastIndexOf('/') + 1)) : '';
    return { matches, prefix: cmdPrefix + pathPrefix };
  }


  // ── Binary file display ───────────────────────────────────
  function fakeBinaryOutput(filePath) {
    let seed = 0;
    for (let i = 0; i < filePath.length; i++) seed = (seed * 31 + filePath.charCodeAt(i)) & 0xffffffff;
    const lines = [`ELF binary — use strings(1) or hexdump(1) to inspect`, ``];
    for (let row = 0; row < 8; row++) {
      let hex = '', ascii = '';
      for (let col = 0; col < 16; col++) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        const byte = (seed >>> 24) & 0xff;
        hex += byte.toString(16).padStart(2,'0') + (col === 7 ? '  ' : ' ');
        ascii += (byte >= 0x20 && byte < 0x7f) ? String.fromCharCode(byte) : '.';
      }
      lines.push(`${(row*16).toString(16).padStart(8,'0')}  ${hex} |${ascii}|`);
    }
    lines.push(`...`);
    return lines;
  }


  // ── Command handler ───────────────────────────────────────
  async function handleCmd(raw) {
    const deleted = getDeleted();
    const tokens = raw.trim().split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    const arg = args.join(' ');
    const arg1 = args[0] || '';

    // Check if core tool is destroyed
    const toolMap = { ls:'ls',cat:'cat',rm:'rm',mkdir:'mkdir',cp:'cp',mv:'mv',
      chmod:'chmod',grep:'grep',find:'find',vim:'vim',nano:'nano' };
    if (toolMap[cmd] && !toolExists(toolMap[cmd])) {
      appendLine(`-bash: ${cmd}: command not found`, 'var(--hud-danger)'); return;
    }

    if (cmd === 'pwd') { appendLine(cwd); return; }
    if (cmd === 'clear' || cmd === 'cls') { output.innerHTML = ''; return; }
    if (cmd === 'whoami') { appendLine(session?.username || userSlug); return; }
    if (cmd === 'id') {
      const u = session?.username || userSlug;
      appendLine('uid=1000(' + u + ') gid=1000(' + u + ') groups=1000(' + u + '),27(sudo)'); return;
    }
    if (cmd === 'uname') {
      if (arg === '-a') appendLine('Linux g2306-node 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
      else if (arg === '-r') appendLine('6.1.0-21-amd64');
      else appendLine('Linux');
      return;
    }
    if (cmd === 'hostname') { appendLine(arg === '-I' ? '10.0.0.10 ' : 'g2306-node'); return; }
    if (cmd === 'uptime') { appendLine(' ' + new Date().toTimeString().slice(0,8) + ' up 3 days,  4:22,  1 user,  load average: 0.12, 0.08, 0.05'); return; }
    if (cmd === 'df') {
      appendLine('Filesystem      Size  Used Avail Use% Mounted on');
      appendLine('/dev/sda1        20G   14G  4.8G  75% /');
      appendLine('tmpfs           1.0G     0  1.0G   0% /dev/shm');
      return;
    }
    if (cmd === 'free') {
      appendLine('               total        used        free      shared  buff/cache   available');
      appendLine('Mem:         2048000      614400      412800       20480      614400      819200');
      appendLine('Swap:         524288           0      524288');
      return;
    }
    if (cmd === 'env' || cmd === 'printenv') {
      appendLine('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
      appendLine('HOME=' + home); appendLine('USER=' + userSlug);
      appendLine('SHELL=/bin/bash'); appendLine('LANG=en_US.UTF-8'); return;
    }
    if (cmd === 'history') { cmdHistory.forEach((c,i) => appendLine('  ' + String(i+1).padStart(4) + '  ' + c)); return; }
    if (cmd === 'echo') { appendLine(args.join(' ').replace(/^["']|["']$/g,'')); return; }
    if (cmd === 'exit' || cmd === 'logout') { appendLine('logout'); return; }
    if (cmd === 'which') {
      if (!arg1) { appendLine('which: missing argument','var(--hud-danger)'); return; }
      for (const dir of ['/usr/local/bin','/usr/bin','/bin','/usr/sbin','/sbin']) {
        if ((tree[dir]||[]).includes(arg1) && !deleted.has(dir + '/' + arg1)) { appendLine(dir + '/' + arg1); return; }
      }
      appendLine(arg1 + ' not found','var(--hud-danger)'); return;
    }
    if (cmd === 'ps') {
      appendLine('  PID TTY          TIME CMD');
      appendLine(' 1000 pts/0    00:00:00 bash');
      appendLine(' 1001 pts/0    00:00:00 node');
      appendLine(' 1002 pts/0    00:00:00 ps');
      return;
    }
    if (cmd === 'ping') {
      if (!arg1) { appendLine('ping: missing host operand','var(--hud-danger)'); return; }
      appendLine('PING ' + arg1 + ': 56 data bytes');
      appendLine('64 bytes from ' + arg1 + ': icmp_seq=1 ttl=64 time=0.123 ms');
      appendLine('--- ' + arg1 + ' ping statistics ---');
      appendLine('1 packets transmitted, 1 received, 0% packet loss');
      return;
    }

    // cd
    if (cmd === 'cd') {
      const dest = resolvePath(arg1 || home);
      if (!isDir(dest)) { appendLine('bash: cd: ' + arg1 + ': No such file or directory', 'var(--hud-danger)'); return; }
      cwd = dest; updatePrompt(); return;
    }

    // ls
    if (cmd === 'ls' || cmd === 'dir') {
      const target = arg1 && !arg1.startsWith('-') ? resolvePath(arg1) : cwd;
      if (!isDir(target)) { appendLine('ls: cannot access ' + "'" + arg1 + "'" + ': No such file or directory', 'var(--hud-danger)'); return; }
      const entries = tree[target] || [];
      const showHidden = args.some(a => a.startsWith('-') && a.includes('a'));
      const longFmt = args.some(a => a.startsWith('-') && a.includes('l'));
      const filtered = showHidden ? entries : entries.filter(e => !e.startsWith('.'));
      if (longFmt) {
        appendLine('total ' + filtered.length * 4);
        for (const e of filtered) {
          const full = (target === '/' ? '' : target) + '/' + e;
          const d = isDir(full) ? 'd' : '-';
          const x = (binaries.has(full) || e.endsWith('.sh')) ? 'x' : '-';
          const del = deleted.has(full) ? ' [DELETED]' : '';
          appendLine(d + 'rwxr-x' + (d === 'd' ? 'r-x' : 'r--') + ' 1 ' + userSlug + ' ' + userSlug + '  4096 Jan 15 10:00 ' + e + del);
        }
      } else {
        filtered.forEach(e => appendLine(e + (deleted.has((target === '/' ? '' : target) + '/' + e) ? ' [DELETED]' : '')));
      }
      return;
    }

    // cat
    if (cmd === 'cat') {
      if (!arg1) { appendLine('cat: missing operand', 'var(--hud-danger)'); return; }
      const fp = resolvePath(arg1);
      if (deleted.has(fp)) { appendLine('cat: ' + arg1 + ': No such file or directory', 'var(--hud-danger)'); return; }
      if (fp === '/etc/shadow' || fp === '/etc/gshadow') { appendLine('cat: ' + arg1 + ': Permission denied', 'var(--hud-danger)'); return; }
      if (isDir(fp)) { appendLine('cat: ' + arg1 + ': Is a directory', 'var(--hud-danger)'); return; }
      if (binaries.has(fp)) { fakeBinaryOutput(fp).forEach(l => appendLine(l, l.match(/^[0-9a-f]{8}/) ? 'var(--hud-text-dim)' : undefined)); return; }
      if (fp === '/etc/g2306/.env') {
        const tok = localStorage.getItem('g2306_token');
        let d = {};
        try { const r = await fetch(API_BASE + '/api/student/me', {headers:{Authorization:'Bearer ' + tok}}); if(r.ok) d = await r.json(); } catch {}
        appendLine('# G2306 NODE SERVER CONFIGURATION');
        appendLine('SERVER_HOSTNAME=' + (d.server_hostname||''));
        appendLine('SERVER_PORTS=' + (d.server_ports||'22,80'));
        appendLine('SERVER_DIFFICULTY=' + (d.server_difficulty||2));
        appendLine('SERVER_THEME=' + (d.server_theme||'DEFAULT'));
        appendLine('HACK_LOOT=' + (d.hack_loot ? '"' + d.hack_loot.slice(0,60) + '"' : ''));
        return;
      }
      if (files[fp]) { files[fp].forEach(l => appendLine(l)); return; }
      const [par, base] = parentAndBase(fp);
      if ((tree[par]||[]).includes(base)) { appendLine('cat: ' + arg1 + ': Permission denied','var(--hud-danger)'); return; }
      appendLine('cat: ' + arg1 + ': No such file or directory', 'var(--hud-danger)'); return;
    }

    // mkdir
    if (cmd === 'mkdir') {
      if (!arg1) { appendLine('mkdir: missing operand','var(--hud-danger)'); return; }
      const fp = resolvePath(arg1);
      if (isDir(fp)) { appendLine("mkdir: cannot create directory '" + arg1 + "': File exists",'var(--hud-danger)'); return; }
      const [par, base] = parentAndBase(fp);
      if (!isDir(par)) { appendLine("mkdir: cannot create directory '" + arg1 + "': No such file or directory",'var(--hud-danger)'); return; }
      tree[par] = [...(tree[par]||[]), base]; tree[fp] = [];
      return;
    }

    // touch
    if (cmd === 'touch') {
      if (!arg1) { appendLine('touch: missing file operand','var(--hud-danger)'); return; }
      const fp = resolvePath(arg1);
      const [par, base] = parentAndBase(fp);
      if (!isDir(par)) { appendLine("touch: cannot touch '" + arg1 + "': No such file or directory",'var(--hud-danger)'); return; }
      if (!(tree[par]||[]).includes(base)) tree[par] = [...(tree[par]||[]), base];
      if (!files[fp]) files[fp] = [];
      return;
    }

    // rm
    if (cmd === 'rm') {
      const rflag = args.some(a => a.startsWith('-') && a.includes('r'));
      const targets = args.filter(a => !a.startsWith('-'));
      if (!targets.length) { appendLine('rm: missing operand','var(--hud-danger)'); return; }
      const del = getDeleted();
      for (const t of targets) {
        const fp = resolvePath(t);
        if (isDir(fp) && !rflag) { appendLine("rm: cannot remove '" + t + "': Is a directory",'var(--hud-danger)'); continue; }
        const [par, base] = parentAndBase(fp);
        if (!(tree[par]||[]).includes(base) && !files[fp] && !binaries.has(fp)) {
          appendLine("rm: cannot remove '" + t + "': No such file or directory",'var(--hud-danger)'); continue;
        }
        del.add(fp);
        if (rflag && isDir(fp)) {
          for (const k of Object.keys(tree)) { if (k.startsWith(fp + '/') || k === fp) del.add(k); }
          for (const k of Object.keys(files)) { if (k.startsWith(fp + '/') || k === fp) del.add(k); }
        }
      }
      saveDeleted(del);
      return;
    }

    // vim / vi / nano
    if (cmd === 'vim' || cmd === 'vi' || cmd === 'nano') {
      if (!arg1) { appendLine(cmd + ': missing filename','var(--hud-danger)'); return; }
      const fp = resolvePath(arg1);
      if (fp !== '/etc/g2306/.env') { appendLine(cmd + ': ' + arg1 + ': permission denied','var(--hud-danger)'); return; }
      const tok = localStorage.getItem('g2306_token');
      if (!tok) { appendLine('permission denied: not authenticated','var(--hud-danger)'); return; }
      let d = {};
      try { const r = await fetch(API_BASE + '/api/student/me',{headers:{Authorization:'Bearer ' + tok}}); if(r.ok) d=await r.json(); } catch {}
      appendLine('"/etc/g2306/.env"  -- INSERT --');
      appendLine('SERVER_HOSTNAME=' + (d.server_hostname||''));
      appendLine('SERVER_PORTS=' + (d.server_ports||'22,80'));
      appendLine('SERVER_DIFFICULTY=' + (d.server_difficulty||2));
      appendLine('SERVER_THEME=' + (d.server_theme||'DEFAULT'));
      appendLine('HACK_LOOT=' + (d.hack_loot ? '"' + d.hack_loot.slice(0,60) + '"' : ''));
      appendLine('');
      const userInput = await new Promise(resolve => {
        appendLine(':'); pendingResolve = { resolve, mask: false, label: ':' };
        maskValue = ''; input.value = ''; input.focus();
      });
      if (!userInput) { appendLine('"[No Write Since Last Change]"'); return; }
      const vc = userInput.trim().toLowerCase();
      if (vc === 'q' || vc === 'q!') { appendLine('"[File not saved]"'); return; }
      if (!vc.startsWith('w')) { appendLine('E492: Not an editor command: ' + userInput,'var(--hud-danger)'); return; }
      const raw2 = userInput.replace(/^wq?/i,'').trim();
      const payload = {};
      const fm = {SERVER_HOSTNAME:'server_hostname',SERVER_PORTS:'server_ports',SERVER_DIFFICULTY:'server_difficulty',SERVER_THEME:'server_theme',HACK_LOOT:'hack_loot'};
      for (const part of raw2.split(/\s+/)) {
        const eqIdx = part.indexOf('=');
        if (eqIdx < 0) continue;
        const k = part.slice(0, eqIdx).toUpperCase();
        const v = part.slice(eqIdx+1).replace(/^"|"$/g,'');
        if (fm[k]) payload[fm[k]] = k === 'SERVER_DIFFICULTY' ? Math.min(5,Math.max(1,parseInt(v)||2)) : v;
      }
      if (!Object.keys(payload).length) { appendLine('"[No changes to write]"'); return; }
      try {
        const res = await fetch(API_BASE + '/api/student/me',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer ' + tok},body:JSON.stringify(payload)});
        appendLine(res.ok ? '"/etc/g2306/.env" written' : 'write failed','var(--hud-danger)');
      } catch { appendLine('write failed: connection error','var(--hud-danger)'); }
      return;
    }

    // grep
    if (cmd === 'grep') {
      const patIdx = args.findIndex(a => !a.startsWith('-'));
      if (patIdx < 0) { appendLine('usage: grep [OPTION]... PATTERN [FILE]...','var(--hud-danger)'); return; }
      const pat = args[patIdx];
      const fileArgs = args.slice(patIdx + 1);
      if (!fileArgs.length) { appendLine('(reading from stdin — not supported)','var(--hud-text-dim)'); return; }
      try {
        const re = new RegExp(pat, 'i');
        for (const fa of fileArgs) {
          const fp = resolvePath(fa);
          for (const line of (files[fp]||[])) { if (re.test(line)) appendLine(fa + ': ' + line); }
        }
      } catch { appendLine('grep: invalid regex','var(--hud-danger)'); }
      return;
    }

    // tail / head
    if (cmd === 'tail' || cmd === 'head') {
      const nFlag = args.indexOf('-n');
      const n = nFlag >= 0 ? (parseInt(args[nFlag+1])||10) : 10;
      const fileArg = args.find(a => !a.startsWith('-') && (nFlag < 0 || a !== args[nFlag+1]));
      if (!fileArg) { appendLine(cmd + ': missing file operand','var(--hud-danger)'); return; }
      const fp = resolvePath(fileArg);
      const lines2 = files[fp] || [];
      (cmd === 'tail' ? lines2.slice(-n) : lines2.slice(0,n)).forEach(l => appendLine(l));
      return;
    }

    // chmod / chown
    if (cmd === 'chmod' || cmd === 'chown') {
      if (args.length < 2) { appendLine(cmd + ': missing operand','var(--hud-danger)'); return; }
      return; // success, no output
    }

    // cp / mv
    if (cmd === 'cp' || cmd === 'mv') {
      if (args.length < 2) { appendLine(cmd + ': missing operand','var(--hud-danger)'); return; }
      const src = resolvePath(args[0]);
      const dst = resolvePath(args[1]);
      const srcLines = files[src];
      if (!srcLines && !isDir(src)) { appendLine(cmd + ": '" + args[0] + "': No such file or directory",'var(--hud-danger)'); return; }
      const [dstPar, dstBase] = parentAndBase(dst);
      if (!isDir(dstPar)) { appendLine(cmd + ": '" + args[1] + "': No such file or directory",'var(--hud-danger)'); return; }
      files[dst] = srcLines ? [...srcLines] : [];
      if (!(tree[dstPar]||[]).includes(dstBase)) tree[dstPar] = [...(tree[dstPar]||[]), dstBase];
      if (cmd === 'mv') { const del = getDeleted(); del.add(src); saveDeleted(del); }
      return;
    }

    // systemctl
    if (cmd === 'systemctl') {
      const sub = arg1, svc = args[1] || 'g2306';
      if (sub === 'status') {
        appendLine('● ' + svc + '.service - G2306 Alumni Network Node');
        appendLine('   Loaded: loaded (/etc/systemd/system/' + svc + '.service; enabled)');
        appendLine('   Active: active (running) since ' + new Date().toUTCString());
        appendLine('  Process: 1001 ExecStart=/usr/bin/node index.js');
      } else if (sub === 'restart' || sub === 'start') {
        // silent success
      } else if (sub === 'stop') {
        appendLine('Warning: service stopped.','var(--hud-danger)');
      } else { appendLine('Unknown subcommand: ' + sub,'var(--hud-danger)'); }
      return;
    }

    // ssh
    if (cmd === 'ssh') { appendLine('ssh: connect to host ' + arg1 + ' port 22: Connection refused','var(--hud-danger)'); return; }

    // sudo
    if (cmd === 'sudo') {
      appendLine('[sudo] password for ' + (session?.username || userSlug) + ': ');
      const pw = await new Promise(resolve => {
        pendingResolve = { resolve, mask: true, label: '[sudo] password: ' };
        maskValue = ''; input.value = ''; input.focus();
      });
      if (pw) appendLine('Sorry, try again.','var(--hud-danger)');
      return;
    }

    // find
    if (cmd === 'find') {
      const base2 = arg1 && !arg1.startsWith('-') ? resolvePath(arg1) : cwd;
      const nameFlag = args.indexOf('-name');
      const pat2 = nameFlag >= 0 ? args[nameFlag+1] : null;
      const re2 = pat2 ? new RegExp('^' + pat2.replace(/\*/g,'.*').replace(/\?/g,'.') + '$') : null;
      function findIn(dir) {
        appendLine(dir);
        for (const e of (tree[dir]||[])) {
          const fp = (dir === '/' ? '' : dir) + '/' + e;
          if (!re2 || re2.test(e)) appendLine(fp);
          if (isDir(fp)) findIn(fp);
        }
      }
      findIn(base2);
      return;
    }

    // delegate unknown commands to main terminal runCommand
    const ctx = {
      getToken: () => localStorage.getItem('g2306_token'),
      setToken: (t) => { if(t) localStorage.setItem('g2306_token',t); else localStorage.removeItem('g2306_token'); },
      promptLine: (label) => new Promise(resolve => {
        appendLine(label); pendingResolve = { resolve, mask: false, label };
        maskValue = ''; input.value = ''; input.focus();
      }),
      promptPassword: (label) => new Promise(resolve => {
        appendLine(label); pendingResolve = { resolve, mask: true, label };
        maskValue = ''; input.value = ''; input.focus();
      }),
      print: async (lines) => { (lines||[]).forEach(l => appendLine(l.text || l, l.status === 'ERR' ? 'var(--hud-danger)' : undefined)); },
      flyTo: () => {}, setFullscreen: () => {},
    };
    try {
      const lines = await runCommand(raw, ctx);
      if (lines?.length) lines.forEach(l => appendLine(l.text || l, l.status === 'ERR' ? 'var(--hud-danger)' : l.status === 'OK' ? 'var(--hud-primary)' : undefined));
    } catch { appendLine('bash: ' + cmd + ': command not found','var(--hud-danger)'); }
  }


  // ── Keyboard handler ─────────────────────────────────────
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const val = input.value;
      if (pendingResolve) return;

      if (!tabState || tabState.base !== val) {
        const result = tabComplete(val);
        if (!result.matches.length) return;
        if (result.matches.length === 1) {
          input.value = result.prefix + result.matches[0];
          tabState = null; return;
        }
        tabState = { base: val, matches: result.matches, prefix: result.prefix, pos: 0 };
        result.matches.forEach(m => appendLine('  ' + m));
      } else {
        tabState.pos = (tabState.pos + 1) % tabState.matches.length;
        input.value = tabState.prefix + tabState.matches[tabState.pos];
      }
      return;
    }

    tabState = null;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pendingResolve) return;
      if (histIdx < cmdHistory.length - 1) { histIdx++; input.value = cmdHistory[cmdHistory.length - 1 - histIdx]; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (pendingResolve) return;
      if (histIdx > 0) { histIdx--; input.value = cmdHistory[cmdHistory.length - 1 - histIdx]; }
      else { histIdx = -1; input.value = ''; }
      return;
    }

    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      if (pendingResolve) { pendingResolve.resolve(''); pendingResolve = null; maskValue = ''; }
      appendLine('^C');
      input.value = ''; cmdRunning = false; return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = maskValue || input.value;
      input.value = '';

      if (pendingResolve) {
        const { resolve, mask } = pendingResolve;
        pendingResolve = null; maskValue = '';
        if (!mask) appendLine(val);
        resolve(val); return;
      }

      const raw = val.trim();
      if (!raw) return;
      cmdHistory.push(raw); histIdx = -1;
      appendLine(promptEl.textContent.trimEnd() + ' ' + raw);

      if (cmdRunning) return;
      cmdRunning = true;
      try { await handleCmd(raw); }
      finally { cmdRunning = false; updatePrompt(); }
      return;
    }

    // Mask password input
    if (pendingResolve?.mask && e.key.length === 1) {
      maskValue += e.key;
      const stars = '*'.repeat(maskValue.length);
      input.value = stars;
      e.preventDefault();
      return;
    }
    if (pendingResolve?.mask && e.key === 'Backspace') {
      maskValue = maskValue.slice(0, -1);
      input.value = '*'.repeat(maskValue.length);
      e.preventDefault();
    }
  });

  // Focus input on container click
  container.addEventListener('click', () => input.focus());
  input.focus();

  // Welcome message
  appendLine('Debian GNU/Linux 12 (bookworm) — g2306-node');
  appendLine('Last login: ' + new Date().toUTCString());
  appendLine('Type "help" for available commands.');
  appendLine('');
}
