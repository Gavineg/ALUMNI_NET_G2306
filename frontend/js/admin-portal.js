import { apiFetch } from './auth.js';

let students = [];
let bannedWords = [];
let settings = {};
let editingId = null;

export async function initAdminPortal(container) {
  container.innerHTML = `
    <div class="panel-title">&gt; ADMIN_ACCESS // SYSTEM_CONTROL</div>
    <div class="panel-tabs">
      <button class="panel-tab active" data-tab="students">[STUDENTS]</button>
      <button class="panel-tab" data-tab="banned">[BANNED_WORDS]</button>
      <button class="panel-tab" data-tab="settings">[MAP_SETTINGS]</button>
      <button class="panel-tab" data-tab="yearbook">[YEARBOOK]</button>
      <button class="panel-tab" data-tab="password">[CHANGE_PASSWORD]</button>
    </div>
    <div id="admin-tab-content"></div>

    <div class="modal-overlay" id="student-modal" style="display:none">
      <div class="modal-box" id="student-modal-box"></div>
    </div>
  `;

  container.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTab(container, tab.dataset.tab);
    });
  });

  await renderTab(container, 'students');
}

async function renderTab(container, tab) {
  const content = container.querySelector('#admin-tab-content');
  if (tab === 'students')  await renderStudents(content, container);
  if (tab === 'banned')    await renderBanned(content);
  if (tab === 'settings')  await renderSettings(content);
  if (tab === 'yearbook')  await renderYearbook(content);
  if (tab === 'password')  renderChangePassword(content);
}

// ── Students tab ────────────────────────────────────────────

async function renderStudents(content, root) {
  const res = await apiFetch('/api/admin/students');
  students  = await res.json();

  content.innerHTML = `
    <div class="search-bar">
      <input class="hud-input" id="admin-search" placeholder="SEARCH BY NAME / UNI..." style="flex:1">
      <button class="hud-btn" id="admin-add-btn">[+ NEW_STUDENT]</button>
    </div>
    <div style="overflow-x:auto">
      <table class="hud-table" id="students-table">
        <thead><tr>
          <th>ID</th><th>USERNAME</th><th>NAME</th>
          <th>UNIVERSITY</th><th>MAJOR</th><th>READY_FOR_FOOD</th><th>ADMIN</th>
        </tr></thead>
        <tbody id="students-tbody"></tbody>
      </table>
    </div>
  `;

  renderStudentRows(content, students);

  content.querySelector('#admin-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = students.filter(s =>
      s.display_name?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q) ||
      s.university?.toLowerCase().includes(q)
    );
    renderStudentRows(content, filtered);
  });

  content.querySelector('#admin-add-btn').addEventListener('click', () => openStudentModal(root, null));
}

function renderStudentRows(content, list) {
  const tbody = content.querySelector('#students-tbody');
  tbody.innerHTML = list.map(s => `
    <tr data-id="${s.id}" style="cursor:pointer">
      <td>${s.id}</td>
      <td>${s.username}</td>
      <td>${s.display_name}</td>
      <td>${s.university || '—'}</td>
      <td>${s.major || '—'}</td>
      <td style="color:${s.can_cengfan ? 'var(--hud-primary)' : 'var(--hud-danger)'}">
        ${s.can_cengfan ? '[YES]' : '[NO]'}
      </td>
      <td>${s.is_admin ? '[ADM]' : '—'}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const s = students.find(x => x.id === tr.dataset.id);
      openStudentModal(content.closest('#portal-panel') || document.body, s);
    });
  });
}

function openStudentModal(root, student) {
  editingId = student?.id ?? null;
  const isNew = editingId === null;
  const modal = root.querySelector('#student-modal') || document.querySelector('#student-modal');
  const box   = root.querySelector('#student-modal-box') || document.querySelector('#student-modal-box');

  box.innerHTML = `
    <h3>${isNew ? '> NEW_STUDENT' : `> EDIT_STUDENT #${editingId}`}</h3>
    <div class="field-group">
      <label class="field-label">&gt; USERNAME</label>
      <input class="hud-input" id="m-username" value="${student?.username || ''}">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; PASSWORD ${isNew ? '' : '(LEAVE BLANK = NO CHANGE)'}</label>
      <input class="hud-input" id="m-password" type="password" placeholder="${isNew ? 'REQUIRED' : 'NEW PASSWORD...'}">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; DISPLAY_NAME</label>
      <input class="hud-input" id="m-name" value="${student?.display_name || ''}">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; UNIVERSITY</label>
      <div class="input-row">
        <input class="hud-input" id="m-uni" value="${student?.university || ''}" placeholder="INSTITUTE NAME...">
        <button class="hud-btn ghost" id="m-locate-btn">[LOCATE]</button>
      </div>
      <div class="coord-display" id="m-coord">${student?.longitude ? `> LON:${student.longitude}  LAT:${student.latitude}  CITY:${student.city || '?'}` : ''}</div>
    </div>
    <div class="field-group">
      <label class="field-label">&gt; MAJOR</label>
      <input class="hud-input" id="m-major" value="${student?.major || ''}">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; LONGITUDE (MANUAL)</label>
      <input class="hud-input" id="m-lon" value="${student?.longitude || ''}" placeholder="e.g. 116.40">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; LATITUDE (MANUAL)</label>
      <input class="hud-input" id="m-lat" value="${student?.latitude || ''}" placeholder="e.g. 39.90">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; CITY</label>
      <input class="hud-input" id="m-city" value="${student?.city || ''}">
    </div>
    <div class="field-group">
      <label class="field-label">&gt; CUSTOM_STATUS</label>
      <input class="hud-input" id="m-status" value="${student?.status_text || ''}">
    </div>
    <div class="field-group" style="display:flex;gap:16px;align-items:center">
      <label class="field-label" style="margin:0">&gt; READY_FOR_FOOD</label>
      <select class="hud-input" id="m-cengfan" style="width:auto">
        <option value="1" ${student?.can_cengfan ? 'selected' : ''}>READY</option>
        <option value="0" ${!student?.can_cengfan && student ? 'selected' : ''}>NOT_READY</option>
      </select>
      <label class="field-label" style="margin:0">&gt; IS_ADMIN</label>
      <select class="hud-input" id="m-admin" style="width:auto">
        <option value="0" ${!student?.is_admin ? 'selected' : ''}>NO</option>
        <option value="1" ${student?.is_admin ? 'selected' : ''}>YES</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="hud-btn full" id="m-save-btn">[SAVE]</button>
      ${!isNew ? `<button class="hud-btn danger" id="m-del-btn">[DELETE]</button>` : ''}
      <button class="hud-btn ghost" id="m-close-btn">[CANCEL]</button>
    </div>
    <div class="msg" id="m-msg"></div>
  `;

  // 临时存坐标
  let tempLon = student?.longitude, tempLat = student?.latitude, tempCity = student?.city;

  box.querySelector('#m-locate-btn').addEventListener('click', async () => {
    const kw  = box.querySelector('#m-uni').value.trim();
    if (!kw) return;
    const btn = box.querySelector('#m-locate-btn');
    btn.textContent = '[LOCATING...]'; btn.disabled = true;
    try {
      const res  = await apiFetch('/api/geocode', { method: 'POST', body: JSON.stringify({ keyword: kw }) });
      const data = await res.json();
      if (res.ok) {
        tempLon = data.longitude; tempLat = data.latitude; tempCity = data.city;
        box.querySelector('#m-lon').value  = data.longitude;
        box.querySelector('#m-lat').value  = data.latitude;
        box.querySelector('#m-city').value = data.city || '';
        box.querySelector('#m-coord').textContent = `> LON:${data.longitude.toFixed(4)}  LAT:${data.latitude.toFixed(4)}  CITY:${data.city}`;
        box.querySelector('#m-uni').value = data.name;
      } else {
        box.querySelector('#m-msg').textContent = `> [ERR] ${data.error}`;
        box.querySelector('#m-msg').className = 'msg err';
      }
    } catch { /* ignore */ }
    btn.textContent = '[LOCATE]'; btn.disabled = false;
  });

  box.querySelector('#m-save-btn').addEventListener('click', async () => {
    const payload = {
      username:     box.querySelector('#m-username').value.trim(),
      display_name: box.querySelector('#m-name').value.trim(),
      university:   box.querySelector('#m-uni').value.trim() || null,
      major:        box.querySelector('#m-major').value.trim() || null,
      city:         box.querySelector('#m-city').value.trim() || null,
      longitude:    parseFloat(box.querySelector('#m-lon').value) || null,
      latitude:     parseFloat(box.querySelector('#m-lat').value) || null,
      status_text:  box.querySelector('#m-status').value.trim(),
      can_cengfan:  parseInt(box.querySelector('#m-cengfan').value),
      is_admin:     parseInt(box.querySelector('#m-admin').value)
    };
    const pw = box.querySelector('#m-password').value;
    if (pw) payload.password = pw;
    if (isNew && !pw) {
      box.querySelector('#m-msg').textContent = '> [ERR] PASSWORD REQUIRED FOR NEW STUDENT';
      box.querySelector('#m-msg').className = 'msg err';
      return;
    }

    const url  = isNew ? '/api/admin/students' : `/api/admin/students/${editingId}`;
    const meth = isNew ? 'POST' : 'PUT';
    const res  = await apiFetch(url, { method: meth, body: JSON.stringify(payload) });
    if (res.ok) {
      modal.style.display = 'none';
      // 刷新学生列表
      const parent = document.querySelector('#admin-tab-content');
      if (parent) await renderStudents(parent, document.querySelector('#portal-panel'));
    } else {
      const d = await res.json();
      box.querySelector('#m-msg').textContent = `> [ERR] ${d.error}`;
      box.querySelector('#m-msg').className = 'msg err';
    }
  });

  if (!isNew) {
    box.querySelector('#m-del-btn').addEventListener('click', async () => {
      if (!confirm(`DELETE STUDENT #${editingId}?`)) return;
      await apiFetch(`/api/admin/students/${editingId}`, { method: 'DELETE' });
      modal.style.display = 'none';
      const parent = document.querySelector('#admin-tab-content');
      if (parent) await renderStudents(parent, document.querySelector('#portal-panel'));
    });
  }

  box.querySelector('#m-close-btn').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.style.display = 'flex';
}

// ── Banned words tab ────────────────────────────────────────

async function renderBanned(content) {
  const res  = await apiFetch('/api/admin/banned-words');
  bannedWords = await res.json();

  content.innerHTML = `
    <div class="search-bar">
      <input class="hud-input" id="bw-input" placeholder="NEW BANNED WORD..." style="flex:1">
      <button class="hud-btn" id="bw-add-btn">[+ ADD]</button>
    </div>
    <table class="hud-table">
      <thead><tr><th>ID</th><th>WORD</th><th>ACTION</th></tr></thead>
      <tbody id="bw-tbody"></tbody>
    </table>
    <div class="msg" id="bw-msg"></div>
  `;

  renderBwRows(content, bannedWords);

  content.querySelector('#bw-add-btn').addEventListener('click', async () => {
    const word = content.querySelector('#bw-input').value.trim();
    if (!word) return;
    const res = await apiFetch('/api/admin/banned-words', { method: 'POST', body: JSON.stringify({ word }) });
    if (res.ok) {
      content.querySelector('#bw-input').value = '';
      await renderBanned(content);
    } else {
      const d = await res.json();
      content.querySelector('#bw-msg').textContent = `> [ERR] ${d.error}`;
      content.querySelector('#bw-msg').className = 'msg err';
    }
  });
}

function renderBwRows(content, list) {
  content.querySelector('#bw-tbody').innerHTML = list.map(w => `
    <tr>
      <td>${w.id}</td>
      <td>${w.word}</td>
      <td><button class="hud-btn danger" style="padding:2px 8px;font-size:11px" data-id="${w.id}">[DEL]</button></td>
    </tr>
  `).join('');

  content.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/admin/banned-words/${btn.dataset.id}`, { method: 'DELETE' });
      await renderBanned(content);
    });
  });
}

// ── Settings tab ─────────────────────────────────────────────

async function renderSettings(content) {
  const res = await apiFetch('/api/admin/settings');
  settings  = await res.json();

  content.innerHTML = `
    <div class="portal-card" style="max-width:520px">
      <div style="margin-bottom:20px">
        <div class="panel-title" style="font-size:12px;margin-bottom:16px">&gt; ORIGIN_POINT</div>
        <div class="field-group">
          <label class="field-label">&gt; DISPLAY_NAME</label>
          <input class="hud-input" id="cfg-oname" value="${settings.originName || ''}">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; ADDRESS (AUTO GEOCODE)</label>
          <div class="input-row">
            <input class="hud-input" id="cfg-oaddr" placeholder="E.G. 深圳市龙岗区...">
            <button class="hud-btn ghost" id="cfg-locate-btn">[LOCATE]</button>
          </div>
          <div class="coord-display" id="cfg-coord">> LON:${settings.originLon}  LAT:${settings.originLat}</div>
        </div>
        <div style="display:flex;gap:8px">
          <div class="field-group" style="flex:1">
            <label class="field-label">&gt; LONGITUDE</label>
            <input class="hud-input" id="cfg-olon" value="${settings.originLon || ''}">
          </div>
          <div class="field-group" style="flex:1">
            <label class="field-label">&gt; LATITUDE</label>
            <input class="hud-input" id="cfg-olat" value="${settings.originLat || ''}">
          </div>
        </div>
      </div>

      <div style="border-top:1px dashed var(--hud-border);padding-top:18px;margin-bottom:20px">
        <div class="panel-title" style="font-size:12px;margin-bottom:16px">&gt; NODE_COLOR_MODE</div>
        <div class="field-group">
          <label class="field-label">&gt; MODE</label>
          <select class="hud-input" id="cfg-cmode">
            <option value="unified" ${settings.colorMode === 'unified' ? 'selected' : ''}>UNIFIED (ONE COLOR)</option>
            <option value="status"  ${settings.colorMode === 'status'  ? 'selected' : ''}>BY STATUS (READY=GREEN / NOT_READY=RED)</option>
          </select>
        </div>
        <div class="field-group" id="cfg-color-row" style="${settings.colorMode !== 'unified' ? 'opacity:0.4;pointer-events:none' : ''}">
          <label class="field-label">&gt; UNIFIED_COLOR</label>
          <div class="input-row">
            <input class="hud-input" id="cfg-ucolor" value="${settings.unifiedColor || '#b8ff47'}" style="flex:1">
            <input type="color" id="cfg-ucolor-picker" value="${settings.unifiedColor || '#b8ff47'}"
              style="width:40px;height:38px;padding:2px;background:transparent;border:1px solid var(--hud-border);cursor:pointer">
          </div>
        </div>
      </div>

      <button class="hud-btn full" id="cfg-save-btn">[SAVE_SETTINGS]</button>
      <div class="msg" id="cfg-msg"></div>
    </div>
  `;

  // 颜色模式联动
  content.querySelector('#cfg-cmode').addEventListener('change', e => {
    const row = content.querySelector('#cfg-color-row');
    row.style.opacity       = e.target.value === 'unified' ? '1' : '0.4';
    row.style.pointerEvents = e.target.value === 'unified' ? 'auto' : 'none';
  });

  // 拾色器双向绑定
  const picker = content.querySelector('#cfg-ucolor-picker');
  const hex    = content.querySelector('#cfg-ucolor');
  picker.addEventListener('input', e => { hex.value = e.target.value; });
  hex.addEventListener('input',    e => { picker.value = e.target.value; });

  // 出发点地理编码
  content.querySelector('#cfg-locate-btn').addEventListener('click', async () => {
    const kw  = content.querySelector('#cfg-oaddr').value.trim();
    if (!kw) return;
    const btn = content.querySelector('#cfg-locate-btn');
    btn.textContent = '[LOCATING...]'; btn.disabled = true;
    try {
      const res  = await apiFetch('/api/geocode', { method: 'POST', body: JSON.stringify({ keyword: kw }) });
      const data = await res.json();
      if (res.ok) {
        content.querySelector('#cfg-olon').value = data.longitude;
        content.querySelector('#cfg-olat').value = data.latitude;
        content.querySelector('#cfg-coord').textContent =
          `> LON:${data.longitude.toFixed(4)}  LAT:${data.latitude.toFixed(4)}  CITY:${data.city}`;
      }
    } catch { /* ignore */ }
    btn.textContent = '[LOCATE]'; btn.disabled = false;
  });

  content.querySelector('#cfg-save-btn').addEventListener('click', async () => {
    const payload = {
      originName:   content.querySelector('#cfg-oname').value.trim(),
      originLon:    content.querySelector('#cfg-olon').value.trim(),
      originLat:    content.querySelector('#cfg-olat').value.trim(),
      colorMode:    content.querySelector('#cfg-cmode').value,
      unifiedColor: content.querySelector('#cfg-ucolor').value.trim()
    };
    const res = await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
    const msg = content.querySelector('#cfg-msg');
    if (res.ok) { msg.textContent = '> SETTINGS SAVED [OK]'; msg.className = 'msg ok'; }
    else        { msg.textContent = '> [ERR] SAVE FAILED';   msg.className = 'msg err'; }
  });
}

// ── Change Password tab ───────────────────────────────────────

function renderChangePassword(content) {
  content.innerHTML = `
    <div class="portal-card" style="max-width:480px">
      <div class="field-group">
        <label class="field-label">&gt; CURRENT_PASSWORD</label>
        <input class="hud-input" type="password" id="ap-old-pw" placeholder="INPUT CURRENT PASSWORD...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; NEW_PASSWORD</label>
        <input class="hud-input" type="password" id="ap-new-pw" placeholder="INPUT NEW PASSWORD...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; CONFIRM_PASSWORD</label>
        <input class="hud-input" type="password" id="ap-confirm-pw" placeholder="CONFIRM NEW PASSWORD...">
      </div>
      <button class="hud-btn full" id="ap-pw-btn">[UPDATE_PASSWORD]</button>
      <div class="msg" id="ap-pw-msg"></div>
    </div>
  `;

  content.querySelector('#ap-pw-btn').addEventListener('click', async () => {
    const oldPw     = content.querySelector('#ap-old-pw').value;
    const newPw     = content.querySelector('#ap-new-pw').value;
    const confirmPw = content.querySelector('#ap-confirm-pw').value;
    const msg       = content.querySelector('#ap-pw-msg');
    const btn       = content.querySelector('#ap-pw-btn');

    if (!oldPw || !newPw || !confirmPw) {
      msg.textContent = '> [ERR] ALL FIELDS REQUIRED'; msg.className = 'msg err'; return;
    }
    if (newPw !== confirmPw) {
      msg.textContent = '> [ERR] PASSWORDS DO NOT MATCH'; msg.className = 'msg err'; return;
    }
    if (newPw.length < 6) {
      msg.textContent = '> [ERR] PASSWORD TOO SHORT (MIN 6)'; msg.className = 'msg err'; return;
    }

    btn.disabled = true; btn.textContent = '[UPDATING...]';
    try {
      const res = await apiFetch('/api/student/password', {
        method: 'PUT',
        body: JSON.stringify({ old_password: oldPw, new_password: newPw })
      });
      if (res.ok) {
        msg.textContent = '> PASSWORD UPDATED — LOGGING OUT...'; msg.className = 'msg ok';
        setTimeout(() => {
          localStorage.removeItem('g2306_token');
          localStorage.removeItem('g2306_user');
          location.reload();
        }, 1500);
      } else {
        const d = await res.json();
        msg.textContent = `> [ERR] ${d.error}`; msg.className = 'msg err';
        btn.disabled = false; btn.textContent = '[UPDATE_PASSWORD]';
      }
    } catch {
      msg.textContent = '> [ERR] REQUEST FAILED'; msg.className = 'msg err';
      btn.disabled = false; btn.textContent = '[UPDATE_PASSWORD]';
    }
  });
}

// ── Yearbook tab (appended to admin-portal.js) ────────────────

async function renderYearbook(content) {
  const res = await apiFetch('/api/admin/memorial');
  const cfg = res.ok ? await res.json() : {};
  cfg.slides     = cfg.slides     || [];
  cfg.boot_lines = cfg.boot_lines || [];

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px;max-width:760px">
      <div class="portal-card">
        <div class="panel-title" style="font-size:12px;margin-bottom:14px">&gt; YEARBOOK_SETTINGS</div>
        <div class="field-group">
          <label class="field-label">&gt; DISPLAY TITLE</label>
          <input class="hud-input" id="ybk-title" value="${escH(cfg.title || 'G2306 YEARBOOK')}">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; BGM URL (MP3 / OGG direct link)</label>
          <input class="hud-input" id="ybk-bgm" value="${escH(cfg.bgm_url || '')}" placeholder="https://...">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; BGM VOLUME (0.0 - 1.0)</label>
          <input class="hud-input" id="ybk-vol" value="${escH(String(cfg.bgm_volume ?? 0.4))}" style="max-width:120px">
        </div>
        <div class="field-group">
          <label class="field-label">&gt; BOOT LINES (one per line)</label>
          <textarea class="hud-input" id="ybk-boot" rows="5"
            style="resize:vertical;font-size:12px;line-height:1.6;text-transform:none"
          >${escH((cfg.boot_lines || []).join('\n'))}</textarea>
        </div>
      </div>
      <div class="portal-card">
        <div class="panel-title" style="font-size:12px;margin-bottom:14px">&gt; SLIDES</div>
        <div id="ybk-slides-list"></div>
        <button class="hud-btn ghost" id="ybk-add-slide" style="margin-top:12px;width:100%">[+ ADD SLIDE]</button>
      </div>
      <button class="hud-btn full" id="ybk-save">[SAVE YEARBOOK]</button>
      <div class="msg" id="ybk-msg"></div>
    </div>
  `;

  let slides = cfg.slides.map(s => ({ ...s }));

  function renderSlideList() {
    const list = content.querySelector('#ybk-slides-list');
    list.innerHTML = '';
    if (!slides.length) {
      list.innerHTML = '<div style="color:var(--hud-text-dim);font-size:12px;padding:8px 0">> No slides yet.</div>';
      return;
    }
    slides.forEach((slide, idx) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--hud-border);padding:14px;margin-bottom:10px';
      card.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <span style="color:var(--hud-text-dim);font-size:11px;min-width:28px">[${String(idx+1).padStart(2,'0')}]</span>
          <select class="hud-input slide-type" style="width:140px;font-size:12px">
            <option value="text"  ${slide.type==='text'  ?'selected':''}>TEXT ONLY</option>
            <option value="image" ${slide.type==='image' ?'selected':''}>IMAGE ONLY</option>
            <option value="mixed" ${slide.type==='mixed' ?'selected':''}>IMAGE + TEXT</option>
          </select>
          <button class="hud-btn ghost slide-del" style="padding:4px 10px;font-size:11px;margin-left:auto">[DEL]</button>
          ${idx > 0 ? '<button class="hud-btn ghost slide-up" style="padding:4px 8px;font-size:11px">[UP]</button>' : ''}
          ${idx < slides.length-1 ? '<button class="hud-btn ghost slide-dn" style="padding:4px 8px;font-size:11px">[DN]</button>' : ''}
        </div>
        <div class="slide-img-row" style="display:${slide.type!=='text'?'block':'none'}">
          <div class="field-group" style="margin-bottom:8px">
            <label class="field-label" style="font-size:10px">&gt; IMAGE URL</label>
            <input class="hud-input slide-url" value="${escH(slide.url||'')}" placeholder="https://..." style="font-size:12px">
          </div>
        </div>
        <div class="slide-text-row" style="display:${slide.type!=='image'?'block':'none'}">
          <div class="field-group" style="margin-bottom:8px">
            <label class="field-label" style="font-size:10px">&gt; TEXT CONTENT</label>
            <textarea class="hud-input slide-content" rows="2"
              style="resize:vertical;font-size:12px;text-transform:none">${escH(slide.content||'')}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="field-group" style="flex:1;margin-bottom:0">
            <label class="field-label" style="font-size:10px">&gt; CAPTION</label>
            <input class="hud-input slide-caption" value="${escH(slide.caption||'')}" style="font-size:12px">
          </div>
          <div class="field-group" style="width:110px;margin-bottom:0">
            <label class="field-label" style="font-size:10px">&gt; DURATION (ms)</label>
            <input class="hud-input slide-dur" value="${escH(String(slide.duration||5000))}" style="font-size:12px">
          </div>
        </div>
      `;
      card.querySelector('.slide-type').addEventListener('change', e => {
        slides[idx].type = e.target.value;
        card.querySelector('.slide-img-row').style.display  = e.target.value !== 'text'  ? 'block' : 'none';
        card.querySelector('.slide-text-row').style.display = e.target.value !== 'image' ? 'block' : 'none';
      });
      card.querySelector('.slide-del').addEventListener('click', () => { slides.splice(idx,1); renderSlideList(); });
      const urlEl  = card.querySelector('.slide-url');
      const contEl = card.querySelector('.slide-content');
      if (urlEl)  urlEl.addEventListener('input',  e => { slides[idx].url     = e.target.value; });
      if (contEl) contEl.addEventListener('input', e => { slides[idx].content = e.target.value; });
      card.querySelector('.slide-caption').addEventListener('input', e => { slides[idx].caption  = e.target.value; });
      card.querySelector('.slide-dur').addEventListener('input',     e => { slides[idx].duration = parseInt(e.target.value)||5000; });
      const upEl = card.querySelector('.slide-up');
      const dnEl = card.querySelector('.slide-dn');
      if (upEl) upEl.addEventListener('click', () => { [slides[idx-1],slides[idx]]=[slides[idx],slides[idx-1]]; renderSlideList(); });
      if (dnEl) dnEl.addEventListener('click', () => { [slides[idx],slides[idx+1]]=[slides[idx+1],slides[idx]]; renderSlideList(); });
      list.appendChild(card);
    });
  }

  renderSlideList();

  content.querySelector('#ybk-add-slide').addEventListener('click', () => {
    slides.push({ type: 'mixed', url: '', content: '', caption: '', duration: 5000 });
    renderSlideList();
  });

  content.querySelector('#ybk-save').addEventListener('click', async () => {
    const msg = content.querySelector('#ybk-msg');
    const bootRaw = content.querySelector('#ybk-boot').value.trim();
    const payload = {
      title:      content.querySelector('#ybk-title').value.trim(),
      bgm_url:    content.querySelector('#ybk-bgm').value.trim(),
      bgm_volume: parseFloat(content.querySelector('#ybk-vol').value) || 0.4,
      boot_lines: bootRaw ? bootRaw.split('\n').map(l => l.trimEnd()) : [],
      slides,
    };
    const r = await apiFetch('/api/admin/memorial', { method: 'PUT', body: JSON.stringify(payload) });
    if (r.ok) { msg.textContent = '> YEARBOOK SAVED [OK]'; msg.className = 'msg ok'; }
    else      { msg.textContent = '> [ERR] SAVE FAILED';  msg.className = 'msg err'; }
  });
}

function escH(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
