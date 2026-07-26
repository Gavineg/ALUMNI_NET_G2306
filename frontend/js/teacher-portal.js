/**
 * teacher-portal.js — 教师自助后台
 * 教师可修改自己的姓名、科目、联系方式、备注
 */

import { apiFetch, getSession } from './auth.js';

export async function initTeacherPortal(container) {
  const session = getSession();

  container.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:13px;color:var(--hud-text-dim);letter-spacing:2px;margin-bottom:4px">
        TEACHER ACCESS — ${(session?.name || 'UNKNOWN').toUpperCase()}
      </div>
      <div style="font-size:11px;color:var(--hud-text-dim);opacity:0.6">UPDATE YOUR PROFILE INFORMATION</div>
    </div>
    <div id="teacher-content"></div>
  `;

  await renderTeacherForm(document.getElementById('teacher-content'));
}

async function renderTeacherForm(container) {
  container.innerHTML = `<div style="color:var(--hud-text-dim);font-size:12px">LOADING...</div>`;

  const res = await apiFetch('/api/teacher/me');
  if (!res.ok) {
    container.innerHTML = `<div style="color:var(--hud-danger)">FAILED TO LOAD PROFILE.</div>`;
    return;
  }
  const data = await res.json();

  container.innerHTML = `
    <div class="portal-section">
      <div class="section-title">&gt; TEACHER_PROFILE</div>

      <div class="field-group">
        <label class="field-label">&gt; NAME</label>
        <input class="hud-input" id="t-name" value="${esc(data.name)}" placeholder="YOUR NAME...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; SUBJECT</label>
        <input class="hud-input" id="t-subject" value="${esc(data.subject)}" placeholder="E.G. MATHEMATICS...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; CONTACT <span style="opacity:0.5;font-size:10px">(OPTIONAL)</span></label>
        <input class="hud-input" id="t-contact" value="${esc(data.contact)}" placeholder="EMAIL / WECHAT / PHONE...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; NOTE <span style="opacity:0.5;font-size:10px">(OPTIONAL)</span></label>
        <textarea class="hud-input" id="t-note" rows="3" style="resize:vertical" placeholder="PERSONAL NOTE OR MESSAGE...">${esc(data.note)}</textarea>
      </div>

      <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
        <button class="hud-btn" id="t-save-btn">[SAVE CHANGES]</button>
        <span id="t-msg" style="font-size:11px"></span>
      </div>
    </div>

    <div class="portal-section" style="margin-top:24px">
      <div class="section-title">&gt; CHANGE_PASSWORD</div>
      <div class="field-group">
        <label class="field-label">&gt; CURRENT PASSWORD</label>
        <input class="hud-input" id="t-old-pw" type="password" placeholder="CURRENT PASSWORD...">
      </div>
      <div class="field-group">
        <label class="field-label">&gt; NEW PASSWORD</label>
        <input class="hud-input" id="t-new-pw" type="password" placeholder="NEW PASSWORD (MIN 6)...">
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;align-items:center">
        <button class="hud-btn" id="t-pw-btn">[CHANGE PASSWORD]</button>
        <span id="t-pw-msg" style="font-size:11px"></span>
      </div>
    </div>
  `;

  document.getElementById('t-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('t-save-btn');
    const msg = document.getElementById('t-msg');
    btn.disabled = true;
    btn.textContent = '[SAVING...]';
    msg.textContent = '';

    const body = {
      name:    document.getElementById('t-name').value.trim(),
      subject: document.getElementById('t-subject').value.trim(),
      contact: document.getElementById('t-contact').value.trim(),
      note:    document.getElementById('t-note').value.trim(),
    };

    if (!body.name) {
      msg.textContent = '> [ERR] NAME IS REQUIRED';
      msg.style.color = 'var(--hud-danger)';
      btn.disabled = false; btn.textContent = '[SAVE CHANGES]';
      return;
    }

    const res = await apiFetch('/api/teacher/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    btn.disabled = false; btn.textContent = '[SAVE CHANGES]';
    if (res.ok) {
      msg.textContent = '> [OK] PROFILE UPDATED';
      msg.style.color = 'var(--hud-primary)';
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = `> [ERR] ${(err.error || 'SAVE FAILED').toUpperCase()}`;
      msg.style.color = 'var(--hud-danger)';
    }
  });

  document.getElementById('t-pw-btn').addEventListener('click', async () => {
    const btn = document.getElementById('t-pw-btn');
    const msg = document.getElementById('t-pw-msg');
    const oldPw = document.getElementById('t-old-pw').value;
    const newPw = document.getElementById('t-new-pw').value;

    if (!oldPw || !newPw) {
      msg.textContent = '> [ERR] BOTH FIELDS REQUIRED';
      msg.style.color = 'var(--hud-danger)';
      return;
    }
    if (newPw.length < 6) {
      msg.textContent = '> [ERR] PASSWORD MIN 6 CHARS';
      msg.style.color = 'var(--hud-danger)';
      return;
    }

    btn.disabled = true; btn.textContent = '[UPDATING...]';
    msg.textContent = '';

    const res = await apiFetch('/api/student/password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPw, new_password: newPw })
    });

    btn.disabled = false; btn.textContent = '[CHANGE PASSWORD]';
    if (res.ok) {
      msg.textContent = '> [OK] PASSWORD CHANGED';
      msg.style.color = 'var(--hud-primary)';
      document.getElementById('t-old-pw').value = '';
      document.getElementById('t-new-pw').value = '';
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = `> [ERR] ${(err.error || 'FAILED').toUpperCase()}`;
      msg.style.color = 'var(--hud-danger)';
    }
  });
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
