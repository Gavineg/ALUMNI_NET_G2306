import { hashPassword } from './auth.js';
import { filterText }   from './profanity.js';

const SETTINGS_DEFAULTS = {
  colorMode:    'unified',
  unifiedColor: '#b8ff47',
  originName:   'SHENZHEN_LONGGANG',
  originLon:    '114.247',
  originLat:    '22.723'
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
    universities: Object.values(uniMap)
  });
}

// GET /api/student/me
export async function getMe(userId, db) {
  const doc = await db.get('students', userId);
  if (!doc) return json({ error: 'not found' }, 404);
  // 只返回安全字段
  const { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan } = doc;
  return json({ id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan });
}

// PUT /api/student/me
export async function updateMe(userId, request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['university', 'major', 'city', 'longitude', 'latitude', 'status_text', 'can_cengfan'];
  const update = {};

  for (const k of allowed) {
    if (k in body) {
      update[k] = k === 'status_text' ? await filterText(body[k], db) : body[k];
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
    const { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan, is_admin, created_at } = s;
    return { id, username, display_name, university, major, city, longitude, latitude, status_text, can_cengfan, is_admin, created_at };
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

  const allowed = ['username', 'display_name', 'university', 'major', 'city', 'longitude', 'latitude', 'status_text', 'can_cengfan', 'is_admin'];
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

  const allowed = ['colorMode', 'unifiedColor', 'originName', 'originLon', 'originLat'];
  for (const k of allowed) {
    if (k in body) {
      await db.set('settings', k, { value: String(body[k]) });
    }
  }
  return json({ ok: true });
}
