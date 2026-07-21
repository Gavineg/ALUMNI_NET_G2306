import { apiFetch, getSession } from './auth.js';
import { API_BASE } from './config.js';

let profile = {};

export async function initStudentPortal(container) {
  container.innerHTML = `
    <div class="panel-title">&gt; STUDENT_ACCESS // ${getSession()?.name || ''}</div>

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
    </div>
  `;

  await loadProfile(container);
  bindStudentEvents(container);
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
      longitude:   profile.longitude || null,
      latitude:    profile.latitude  || null,
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
}
