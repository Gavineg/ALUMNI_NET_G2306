import { hashPassword } from './auth.js';
import { filterText }   from './profanity.js';

const SETTINGS_DEFAULTS = {
  colorMode:    'unified',
  unifiedColor: '#b8ff47',
  originName:   'SHENZHEN_LONGGANG',
  originLon:    '114.247',
  originLat:    '22.723',
  originIcon:   'diamond',
  lineAnim:     'comet',
  nodeAnim:     'expand'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

// GET /api/map/data  — 公开，返回地图渲染所需的聚合数据
export async function mapData(db) {
  const [allStudents, settingsDocs] = await Promise.all([
    db.list('students'),
    db.list('settings')
  ]);

  // 合并默认值
  const settingsMap = { ...SETTINGS_DEFAULTS };
  for (const doc of settingsDocs) {
    if (doc.id && doc.value !== undefined) settingsMap[doc.id] = doc.value;
  }

  // 只取有坐标的学生
  const students = allStudents.filter(s => s.longitude != null && s.latitude != null);

  // 按大学聚合
  const uniMap = {};
  for (const s of students) {
    if (!uniMap[s.university]) {
      uniMap[s.university] = {
        university: s.university, city: s.city,
        longitude: s.longitude, latitude: s.latitude,
        members: []
      };
    }
    uniMap[s.university].members.push({
      name: s.display_name, major: s.major,
      status: s.status_text, canCengfan: !!s.can_cengfan
    });
  }

  return json({
    origin: {
      name:      settingsMap.originName,
      longitude: parseFloat(settingsMap.originLon),
      latitude:  parseFloat(settingsMap.originLat)
    },
    colorMode:    settingsMap.colorMode,
    unifiedColor: settingsMap.unifiedColor,
    originIcon:   settingsMap.originIcon,
    lineAnim:     settingsMap.lineAnim,
    nodeAnim:     settingsMap.nodeAnim,
    universities: Object.values(uniMap)
  });
}

// GET /api/student/me
export async function getMe(userId, db) {
  const doc = await db.get('students', userId);
  if (!doc) return json({ error: 'not found' }, 404);
  const { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan,
          server_hostname, server_ip, server_theme, server_difficulty, server_ports, hack_loot } = doc;
  return json({ id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan,
                server_hostname, server_ip, server_theme, server_difficulty, server_ports, hack_loot });
}

// PUT /api/student/me
export async function updateMe(userId, request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['university', 'major', 'city', 'longitude', 'latitude', 'status_text', 'can_cengfan',
                   'server_hostname', 'server_theme', 'server_difficulty', 'server_ports', 'hack_loot'];
  const update = {};

  for (const k of allowed) {
    if (k in body) {
      if (k === 'status_text') {
        update[k] = await filterText(body[k], db);
      } else if (k === 'hack_loot') {
        update[k] = String(body[k] ?? '').slice(0, 500);
      } else if (k === 'server_hostname') {
        // Basic sanitize: lowercase alphanumeric + hyphens only
        update[k] = String(body[k] ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32) || null;
      } else {
        update[k] = body[k];
      }
    }
  }
  if (!Object.keys(update).length) return json({ error: 'nothing to update' }, 400);

  update.updated_at = new Date().toISOString();
  await db.set('students', userId, update);
  return json({ ok: true });
}

// --- Admin handlers ---

export async function adminListStudents(db) {
  const students = await db.list('students');
  return json(students.map(s => {
    const { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan, is_admin, created_at,
            server_hostname, server_ip, server_theme, server_difficulty, server_ports, hack_loot } = s;
    return { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan, is_admin, created_at,
             server_hostname, server_ip, server_theme, server_difficulty, server_ports, hack_loot };
  }));
}

export async function adminCreateStudent(request, db) {
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password || !body?.display_name) {
    return json({ error: 'username, password, display_name required' }, 400);
  }
  const { hash, salt } = await hashPassword(body.password);
  const now = new Date().toISOString();
  const doc = await db.add('students', {
    username:      body.username,
    password_hash: hash,
    salt,
    display_name:  body.display_name,
    university:    body.university    ?? null,
    major:         body.major         ?? null,
    city:          body.city          ?? null,
    longitude:     body.longitude     ?? null,
    latitude:      body.latitude      ?? null,
    is_admin:      body.is_admin ? 1 : 0,
    can_cengfan:   0,
    created_at:    now,
    updated_at:    now
  });
  return json({ ok: true, id: doc.id }, 201);
}

export async function adminUpdateStudent(id, request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['username', 'display_name', 'university', 'major', 'city', 'longitude', 'latitude', 'status_text', 'can_cengfan', 'is_admin',
                   'server_hostname', 'server_ip', 'server_theme', 'server_difficulty', 'server_ports', 'hack_loot'];
  const update = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }

  if (body.password) {
    const { hash, salt } = await hashPassword(body.password);
    update.password_hash = hash;
    update.salt = salt;
  }

  if (!Object.keys(update).length) return json({ error: 'nothing to update' }, 400);
  update.updated_at = new Date().toISOString();

  await db.set('students', id, update);
  return json({ ok: true });
}

export async function adminDeleteStudent(id, db) {
  await db.delete('students', id);
  return json({ ok: true });
}

// ── Hack API ─────────────────────────────────────────────────

// Simple deterministic hostname/IP from display_name (used when student hasn't set one)
function defaultHostname(name, existingHostnames) {
  const base = (name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
  let hostname = `${base}-srv`;
  let n = 2;
  while (existingHostnames.has(hostname)) { hostname = `${base}-srv${n++}`; }
  return hostname;
}

function deterministicIp(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  const b1 = 10 + ((h >>> 24) & 0x3f);        // 10–73
  const b2 = ((h >>> 16) & 0xff);
  const b3 = ((h >>> 8) & 0xff);
  const b4 = (h & 0xfe) + 1;                  // avoid .0 and .255
  return `${b1}.${b2}.${b3}.${b4}`;
}

const THEMES = ['MATRIX_GREEN', 'ICE_BLUE', 'BLOOD_RED', 'AMBER', 'PHANTOM'];

// GET /api/hack/servers — public listing (no loot)
export async function hackServers(db) {
  const students = await db.list('students');
  const usedHostnames = new Set();

  // First pass: collect all custom hostnames
  for (const s of students) {
    if (s.server_hostname) usedHostnames.add(s.server_hostname);
  }

  const servers = students.map((s, i) => {
    const hostname = s.server_hostname || defaultHostname(s.username || s.display_name || s.id, usedHostnames);
    const ip       = s.server_ip || deterministicIp(s.id + (s.username || s.display_name || ''));
    const theme    = s.server_theme || THEMES[parseInt(s.id?.slice(-2) || i, 36) % THEMES.length];
    const difficulty = s.server_difficulty ?? 2;
    const ports    = s.server_ports || (difficulty <= 2 ? '80,22' : difficulty <= 3 ? '22,80,443' : '22,80,443,8080,3306');
    return { studentId: s.id, hostname, ip, theme, difficulty, ports };
  });

  return json(servers);
}

// GET /api/hack/loot/:studentId — returns loot content (caller must prove they hacked it; we trust client-side for the game)
export async function hackLoot(studentId, db) {
  const doc = await db.get('students', studentId);
  if (!doc) return json({ error: 'not found' }, 404);

  const theme    = doc.server_theme || THEMES[parseInt(doc.id?.slice(-2) || '0', 36) % THEMES.length];
  const loot     = doc.hack_loot || null;
  const hostname = doc.server_hostname || defaultHostname(doc.username || doc.display_name || doc.id, new Set());

  return json({ hostname, theme, loot });
}

// Settings
export async function getSettings(db) {
  const docs = await db.list('settings');
  const result = { ...SETTINGS_DEFAULTS };
  for (const doc of docs) {
    if (doc.id && doc.value !== undefined) result[doc.id] = doc.value;
  }
  return json(result);
}

export async function updateSettings(request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['colorMode', 'unifiedColor', 'originName', 'originLon', 'originLat', 'originIcon', 'lineAnim', 'nodeAnim'];
  for (const k of allowed) {
    if (k in body) {
      await db.set('settings', k, { value: String(body[k]) });
    }
  }
  return json({ ok: true });
}

// ── Memorial / Yearbook ───────────────────────────────────────

export async function getMemorial(db) {
  const docs = await db.list('memorial');
  // memorial is stored as a single doc with id='config', value=JSON string
  const doc = docs.find(d => d.id === 'config');
  if (!doc || !doc.value) return json({ title: 'G2306 YEARBOOK', slides: [], boot_lines: [] });
  try { return json(JSON.parse(doc.value)); }
  catch { return json({ title: 'G2306 YEARBOOK', slides: [], boot_lines: [] }); }
}

export async function updateMemorial(request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);
  // validate basic shape
  if (body.slides && !Array.isArray(body.slides)) return json({ error: 'slides must be array' }, 400);
  await db.set('memorial', 'config', { value: JSON.stringify(body) });
  return json({ ok: true });
}
