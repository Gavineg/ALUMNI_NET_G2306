import { apiFetch, getSession } from './auth.js';
import { API_BASE } from './config.js';
import { runCommand } from './terminal-cmd.js';
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

  // 关闭强制大写
  input.style.textTransform = 'none';

  let pendingResolve = null;
  let maskValue = '';
  let cmdRunning = false;
  const cmdHistory = [];
  let histIdx = -1;

  // 从 JWT 取 username slug（用 sub id，避免中文）
  function getUserSlug() {
    try {
      const tok = localStorage.getItem('g2306_token');
      const p = JSON.parse(atob(tok.split('.')[1]));
      // name 可能是中文，用 sub（student id）作为目录名
      return (p.sub || 'user').toString().toLowerCase();
    } catch { return 'user'; }
  }

  const userSlug = getUserSlug();

  // 当前目录
  let cwd = `/home/${userSlug}`;

  // 服务器虚拟文件系统
  const SERVER_FS = {
    '/': ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'proc', 'root', 'srv', 'tmp', 'usr', 'var'],
    '/bin': ['bash', 'cat', 'cp', 'echo', 'grep', 'ls', 'mkdir', 'mv', 'rm', 'sh', 'touch'],
    '/boot': ['grub', 'vmlinuz', 'initrd.img', 'System.map'],
    '/dev': ['null', 'zero', 'random', 'urandom', 'sda', 'sda1', 'tty', 'pts'],
    '/etc': ['apt', 'cron.d', 'g2306', 'hosts', 'hostname', 'nginx', 'passwd', 'shadow', 'ssh', 'systemd', 'os-release'],
    '/etc/apt': ['sources.list', 'trusted.gpg'],
    '/etc/g2306': ['.env'],
    '/etc/nginx': ['nginx.conf', 'sites-available', 'sites-enabled'],
    '/etc/nginx/sites-available': ['default', 'g2306'],
    '/etc/nginx/sites-enabled': ['default'],
    '/etc/ssh': ['sshd_config', 'ssh_config', 'ssh_host_rsa_key.pub', 'ssh_host_ed25519_key.pub'],
    '/etc/systemd': ['system', 'network', 'resolved.conf'],
    '/etc/systemd/system': ['g2306.service', 'nginx.service', 'sshd.service'],
    '/home': [userSlug],
    [`/home/${userSlug}`]: ['.bashrc', '.profile', '.ssh', 'logs'],
    [`/home/${userSlug}/.ssh`]: ['authorized_keys', 'known_hosts'],
    [`/home/${userSlug}/logs`]: ['access.log', 'error.log'],
    '/lib': ['modules', 'systemd', 'x86_64-linux-gnu'],
    '/proc': ['1', 'cpuinfo', 'meminfo', 'mounts', 'net', 'uptime', 'version'],
    '/root': ['.bashrc', '.profile', '.ssh'],
    '/srv': ['http', 'ftp'],
    '/srv/http': ['index.html', 'static'],
    '/tmp': ['.ICE-unix', '.X11-unix'],
    '/usr': ['bin', 'include', 'lib', 'local', 'share', 'sbin'],
    '/usr/bin': ['curl', 'git', 'node', 'npm', 'python3', 'ssh', 'vim', 'wget'],
    '/usr/local': ['bin', 'etc', 'lib', 'share'],
    '/usr/local/bin': ['g2306-node'],
    '/var': ['log', 'run', 'spool', 'tmp', 'www'],
    '/var/log': ['auth.log', 'syslog', 'nginx', 'kern.log', 'dpkg.log'],
    '/var/log/nginx': ['access.log', 'error.log'],
    '/var/www': ['html'],
    '/var/www/html': ['index.html'],
  };

  function cwdDisplay() {
    // 把 Linux 路径映射成终端显示路径，主目录缩写为 ~
    const home = `/home/${userSlug}`;
    if (cwd === home) return '~';
    if (cwd.startsWith(home + '/')) return '~' + cwd.slice(home.length);
    return cwd;
  }

  function updatePrompt() {
    const u = (session?.username || session?.name || 'USER').toUpperCase().replace(/\s+/g,'_');
    const path = cwdDisplay();
    const text = `${u}@G2306:${path}$`;
    promptEl.textContent = text + ' ';
    if (labelEl) labelEl.textContent = text;
  }
  updatePrompt();

  function appendLine(text, color) {
    const div = document.createElement('div');
    div.textContent = text;
    if (color) div.style.color = color;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  // 后台专用命令处理（拦截 ls/cd/pwd，其余走 runCommand）
  async function handleCmd(raw) {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    if (cmd === 'pwd') {
      appendLine(cwd);
      return;
    }

    if (cmd === 'cd') {
      const target = arg.trim() || `/home/${userSlug}`;
      let next = target.startsWith('/') ? target : (cwd + '/' + target).replace(/\/+/g, '/');
      const parts2 = next.split('/').filter(Boolean);
      const resolved = [];
      for (const p of parts2) { if (p === '..') resolved.pop(); else resolved.push(p); }
      next = '/' + resolved.join('/');
      if (next !== '/' && !SERVER_FS[next]) {
        appendLine(`bash: cd: ${target}: No such file or directory`, 'var(--hud-danger)');
        return;
      }
      cwd = next || '/';
      updatePrompt();
      return;
    }

    if (cmd === 'ls' || cmd === 'dir') {
      const entries = SERVER_FS[cwd];
      if (!entries) { appendLine(`ls: cannot access '${cwd}': No such file or directory`, 'var(--hud-danger)'); return; }
      entries.forEach(e => appendLine(e));
      return;
    }

    if (cmd === 'cat') {
      const filePath = arg.startsWith('/') ? arg : (cwd + '/' + arg).replace(/\/+/g,'/');

      // 静态文件内容
      const now = new Date();
      const ts = () => now.toISOString().replace('T',' ').slice(0,19);
      const staticFiles = {
        [`/home/${userSlug}/.bashrc`]: [
          `# ~/.bashrc: executed by bash(1) for non-login shells.`,
          `export PS1='\\u@G2306:\\w$ '`,
          `export PATH="$HOME/.local/bin:$PATH"`,
          `alias ll='ls -alF'`,
          `alias la='ls -A'`,
          `alias grep='grep --color=auto'`,
        ],
        [`/home/${userSlug}/.ssh/authorized_keys`]: [
          `# Authorized SSH keys for ${userSlug}@g2306`,
          `# ssh-rsa AAAA... (no keys configured)`,
        ],
        [`/home/${userSlug}/.ssh/known_hosts`]: [
          `|1|hash/== ecdsa-sha2-nistp256 AAAA...`,
          `github.com ssh-rsa AAAA...`,
        ],
        [`/home/${userSlug}/logs/access.log`]: [
          `${ts()} [INFO] SSH login from 192.168.1.1 as ${userSlug}`,
          `${ts()} [INFO] Session opened for user ${userSlug}`,
          `${ts()} [INFO] Command executed: ls /home`,
          `${ts()} [WARN] Failed auth attempt from 185.220.101.32`,
          `${ts()} [INFO] Session closed`,
        ],
        [`/home/${userSlug}/logs/error.log`]: [
          `${ts()} [ERROR] Connection refused: port 8080 not bound`,
          `${ts()} [WARN]  Disk usage at 74% on /dev/sda1`,
          `${ts()} [INFO]  Service g2306-node restarted`,
        ],
        '/etc/hosts': [
          `127.0.0.1   localhost`,
          `127.0.1.1   g2306-node`,
          `::1         localhost ip6-localhost ip6-loopback`,
        ],
        '/etc/passwd': [
          `root:x:0:0:root:/root:/bin/bash`,
          `daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin`,
          `${userSlug}:x:1000:1000:,,,:/home/${userSlug}:/bin/bash`,
        ],
        '/var/log/auth.log': [
          `${ts()} g2306-node sshd[1337]: Accepted publickey for ${userSlug}`,
          `${ts()} g2306-node sshd[1337]: pam_unix(sshd:session): session opened`,
          `${ts()} g2306-node sudo: ${userSlug} : TTY=pts/0 ; PWD=/home/${userSlug}`,
        ],
        '/var/log/syslog': [
          `${ts()} g2306-node kernel: [0.000000] Initializing cgroup subsys`,
          `${ts()} g2306-node systemd[1]: Started G2306 Node Service.`,
          `${ts()} g2306-node cron[892]: (CRON) INFO (pidfile fd = 3)`,
        ],
        '/etc/hostname': [`g2306-node`],
        '/etc/os-release': [
          `NAME="Debian GNU/Linux"`,
          `VERSION_ID="12"`,
          `ID=debian`,
          `PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"`,
        ],
        '/etc/nginx/nginx.conf': [
          `user www-data;`,
          `worker_processes auto;`,
          `error_log /var/log/nginx/error.log;`,
          `events { worker_connections 1024; }`,
          `http {`,
          `  include /etc/nginx/sites-enabled/*;`,
          `  server_tokens off;`,
          `}`,
        ],
        '/etc/nginx/sites-available/g2306': [
          `server {`,
          `  listen 80;`,
          `  server_name g2306-node;`,
          `  root /var/www/html;`,
          `  location /api/ { proxy_pass http://127.0.0.1:3000; }`,
          `}`,
        ],
        '/etc/ssh/sshd_config': [
          `Port 22`,
          `PermitRootLogin no`,
          `PasswordAuthentication no`,
          `PubkeyAuthentication yes`,
          `AuthorizedKeysFile .ssh/authorized_keys`,
          `X11Forwarding no`,
        ],
        '/etc/systemd/system/g2306.service': [
          `[Unit]`,
          `Description=G2306 Node API Service`,
          `After=network.target`,
          ``,
          `[Service]`,
          `Type=simple`,
          `User=${userSlug}`,
          `WorkingDirectory=/usr/local/bin`,
          `ExecStart=/usr/bin/node /usr/local/bin/g2306-node`,
          `Restart=always`,
          ``,
          `[Install]`,
          `WantedBy=multi-user.target`,
        ],
        '/proc/uptime': [`${Math.floor(Math.random()*864000 + 86400)}.00 ${Math.floor(Math.random()*400000)}.00`],
        '/proc/version': [`Linux version 6.1.0-21-amd64 (debian-kernel@lists.debian.org) (gcc-12 12.2.0) #1 SMP PREEMPT_DYNAMIC`],
        '/proc/meminfo': [
          `MemTotal:        2048000 kB`,
          `MemFree:          412800 kB`,
          `MemAvailable:     819200 kB`,
          `Buffers:           65536 kB`,
          `Cached:           409600 kB`,
        ],
        '/var/log/nginx/access.log': [
          `192.168.1.1 - - [${ts()}] "GET / HTTP/1.1" 200 1024`,
          `10.0.0.2 - - [${ts()}] "GET /api/map/data HTTP/1.1" 200 4096`,
          `185.220.101.32 - - [${ts()}] "GET /.env HTTP/1.1" 404 0`,
        ],
        '/var/log/nginx/error.log': [
          `${ts()} [warn] 892#892: conflicting server name "g2306-node"`,
        ],
        '/var/www/html/index.html': [
          `<!DOCTYPE html><html><head><title>G2306</title></head>`,
          `<body><h1>G2306 Node</h1><p>Alumni Network Node</p></body></html>`,
        ],
        [`/home/${userSlug}/.profile`]: [
          `# ~/.profile: executed by the command interpreter for login shells.`,
          `if [ -n "$BASH_VERSION" ]; then`,
          `  if [ -f "$HOME/.bashrc" ]; then . "$HOME/.bashrc"; fi`,
          `fi`,
          `export PATH="$HOME/bin:$HOME/.local/bin:$PATH"`,
        ],
      };

      if (filePath === '/etc/g2306/.env') {
        const tok = localStorage.getItem('g2306_token');
        let d = {};
        if (tok) {
          try { const r = await fetch(`${API_BASE}/api/student/me`, { headers:{Authorization:`Bearer ${tok}`} }); if(r.ok) d = await r.json(); } catch {}
        }
        appendLine('# G2306 NODE SERVER CONFIGURATION');
        appendLine(`SERVER_HOSTNAME=${d.server_hostname||''}`);
        appendLine(`SERVER_PORTS=${d.server_ports||'22,80'}`);
        appendLine(`SERVER_DIFFICULTY=${d.server_difficulty||2}`);
        appendLine(`SERVER_THEME=${d.server_theme||'DEFAULT'}`);
        appendLine(`HACK_LOOT=${d.hack_loot ? '"'+d.hack_loot.slice(0,60)+'"' : ''}`);
        return;
      }

      if (filePath === '/etc/shadow') {
        appendLine(`cat: /etc/shadow: Permission denied`, 'var(--hud-danger)');
        return;
      }

      if (staticFiles[filePath]) {
        staticFiles[filePath].forEach(l => appendLine(l));
        return;
      }

      // 判断路径是否是已知目录
      if (SERVER_FS[filePath]) {
        appendLine(`cat: ${arg}: Is a directory`, 'var(--hud-danger)');
        return;
      }

      // 已知的二进制/不可读文件
      const binDirs = ['/bin', '/usr/bin', '/lib', '/usr/local/bin', '/boot', '/dev'];
      if (binDirs.some(d => filePath.startsWith(d + '/') || filePath === d)) {
        appendLine(`cat: ${arg}: binary file, use strings(1) to inspect`, 'var(--hud-danger)');
        return;
      }

      appendLine(`cat: ${arg}: No such file or directory`, 'var(--hud-danger)');
      return;
    }

    if (cmd === 'clear' || cmd === 'cls') { output.innerHTML = ''; return; }

    if (cmd === 'vim' || cmd === 'vi' || cmd === 'nano') {
      // vim /etc/g2306/.env — 编辑服务器配置
      const filePath = arg.startsWith('/') ? arg : (cwd + '/' + arg).replace(/\/+/g,'/');
      if (filePath !== '/etc/g2306/.env') {
        appendLine(`${cmd}: ${arg}: permission denied`, 'var(--hud-danger)');
        return;
      }
      const tok = localStorage.getItem('g2306_token');
      if (!tok) { appendLine('permission denied: not authenticated', 'var(--hud-danger)'); return; }
      let d = {};
      try { const r = await fetch(`${API_BASE}/api/student/me`, { headers:{Authorization:`Bearer ${tok}`} }); if(r.ok) d = await r.json(); } catch {}

      appendLine(`"/etc/g2306/.env"  -- INSERT --`);
      appendLine('# G2306 NODE SERVER CONFIGURATION');
      appendLine('# Edit values, then type :w KEY=VALUE ... to save');
      appendLine(`SERVER_HOSTNAME=${d.server_hostname||''}`);
      appendLine(`SERVER_PORTS=${d.server_ports||'22,80'}`);
      appendLine(`SERVER_DIFFICULTY=${d.server_difficulty||2}`);
      appendLine(`SERVER_THEME=${d.server_theme||'DEFAULT'}`);
      appendLine(`HACK_LOOT=${d.hack_loot ? '"'+d.hack_loot.slice(0,60)+'"' : ''}`);
      appendLine('');

      // 等待 :w 输入
      const userInput = await new Promise(resolve => {
        appendLine(':');
        pendingResolve = { resolve, mask: false, label: ':' };
        maskValue = '';
        input.value = '';
        input.focus();
      });

      if (!userInput) { appendLine('"[No Write Since Last Change]"'); return; }
      const vcmd = userInput.trim().toLowerCase();
      if (vcmd === 'q' || vcmd === 'q!') { appendLine('"[File not saved]"'); return; }
      if (!vcmd.startsWith('w')) { appendLine(`E492: Not an editor command: ${userInput}`, 'var(--hud-danger)'); return; }

      const raw2 = userInput.replace(/^wq?/i,'').trim();
      const payload = {};
      const fieldMap = { SERVER_HOSTNAME:'server_hostname', SERVER_PORTS:'server_ports', SERVER_DIFFICULTY:'server_difficulty', SERVER_THEME:'server_theme', HACK_LOOT:'hack_loot' };
      for (const part of raw2.split(/\s+/)) {
        const [k,...vs] = part.split('=');
        const v = vs.join('=').replace(/^"|"$/g,'');
        if (k && vs.length && fieldMap[k.toUpperCase()]) {
          const fk = k.toUpperCase();
          payload[fieldMap[fk]] = fk==='SERVER_DIFFICULTY' ? Math.min(5,Math.max(1,parseInt(v)||2)) : v;
        }
      }
      if (!Object.keys(payload).length) { appendLine('"[No changes to write]"'); return; }
      try {
        const res = await fetch(`${API_BASE}/api/student/me`, {
          method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},
          body: JSON.stringify(payload)
        });
        if (!res.ok) { appendLine('write failed: permission denied', 'var(--hud-danger)'); return; }
        appendLine(`"/etc/g2306/.env" written — updated: ${Object.keys(payload).join(', ')}`, 'var(--hud-primary)');
      } catch { appendLine('write failed: connection error', 'var(--hud-danger)'); }
      return;
    }

    // 其余命令（help, whoami, me, set, passwd, stats 等）走公用 runCommand
    const ctx = makeCtx();
    try {
      const lines = await runCommand(raw, ctx);
      if (lines?.length) await biosAppend(output, lines);
    } catch (err) {
      appendLine(`[ERR] ${err.message}`, 'var(--hud-danger)');
    }
  }

  // ctx for runCommand — portal mode, no map/fullscreen
  function makeCtx() {
    return {
      openPanel: () => {}, closePanel: () => {},
      clearTerminal: () => { output.innerHTML = ''; },
      getMapData: () => null, flyTo: () => {}, setFullscreen: () => {},
      getToken: () => localStorage.getItem('g2306_token'),
      setToken: (t) => { if (t) localStorage.setItem('g2306_token', t); else localStorage.removeItem('g2306_token'); },
      promptLine: (label) => new Promise(resolve => {
        appendLine(label);
        pendingResolve = { resolve, mask: false, label };
        maskValue = ''; input.value = ''; input.focus();
      }),
      promptPassword: (label) => new Promise(resolve => {
        appendLine(label);
        pendingResolve = { resolve, mask: true, label };
        maskValue = ''; input.value = ''; input.focus();
      }),
    };
  }

  // 密码遮掩
  input.addEventListener('input', () => {
    if (!pendingResolve?.mask) return;
    maskValue += input.value;   // 累加，不是覆盖
    input.value = '';
    const last = output.lastElementChild;
    if (last) last.textContent = pendingResolve.label + '*'.repeat(maskValue.length);
    output.scrollTop = output.scrollHeight;
  });

  input.addEventListener('keydown', async e => {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (pendingResolve) { pendingResolve.resolve(null); pendingResolve = null; maskValue = ''; input.value = ''; }
      cmdRunning = false;
      appendLine('^C', 'var(--hud-danger)');
      return;
    }

    if (pendingResolve?.mask && e.key === 'Backspace') {
      e.preventDefault();
      maskValue = maskValue.slice(0, -1);
      input.value = '';
      const last = output.lastElementChild;
      if (last) last.textContent = pendingResolve.label + '*'.repeat(maskValue.length);
      return;
    }

    if (pendingResolve) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = pendingResolve.mask ? maskValue : input.value;
        const { resolve, mask, label } = pendingResolve;
        pendingResolve = null; input.value = ''; maskValue = '';
        const last = output.lastElementChild;
        if (last) last.textContent = label + (mask ? '*'.repeat(val.length) : val);
        resolve(val || null);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        pendingResolve.resolve(null); pendingResolve = null; input.value = ''; maskValue = '';
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      input.value = cmdHistory[cmdHistory.length - 1 - histIdx];
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.max(histIdx - 1, -1);
      input.value = histIdx < 0 ? '' : cmdHistory[cmdHistory.length - 1 - histIdx];
      return;
    }

    if (e.key !== 'Enter') return;
    if (cmdRunning) { input.value = ''; return; }

    const cmd = input.value.trim();
    input.value = '';
    histIdx = -1;
    if (!cmd) return;
    cmdHistory.push(cmd);

    appendLine(`${promptEl.textContent.trimEnd()} ${cmd}`, 'var(--hud-text-dim)');
    cmdRunning = true;
    await handleCmd(cmd);
    cmdRunning = false;
    updatePrompt();
    input.focus();
  }, true);

  input.focus();
}
