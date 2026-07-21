import { hashPassword } from './auth.js';
import { filterText }   from './profanity.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

// GET /api/map/data  — 公开，返回地图渲染所需的聚合数据
export async function mapData(db) {
  const [{ results: students }, { results: settingsRows }] = await Promise.all([
    db.prepare(`SELECT display_name, university, city, longitude, latitude,
                       status_text, can_cengfan
                FROM students
                WHERE longitude IS NOT NULL AND latitude IS NOT NULL`).all(),
    db.prepare('SELECT key, value FROM settings').all()
  ]);

  const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

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
      name: settings.originName,
      longitude: parseFloat(settings.originLon),
      latitude:  parseFloat(settings.originLat)
    },
    colorMode:    settings.colorMode,
    unifiedColor: settings.unifiedColor,
    universities: Object.values(uniMap)
  });
}

// GET /api/student/me
export async function getMe(userId, db) {
  const row = await db.prepare(
    'SELECT id,username,display_name,university,major,city,longitude,latitude,status_text,can_cengfan FROM students WHERE id=?'
  ).bind(userId).first();
  if (!row) return json({ error: 'not found' }, 404);
  return json(row);
}

// PUT /api/student/me
export async function updateMe(userId, request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['university', 'major', 'city', 'longitude', 'latitude', 'status_text', 'can_cengfan'];
  const fields = [];
  const values = [];

  for (const k of allowed) {
    if (k in body) {
      fields.push(`${k} = ?`);
      values.push(k === 'status_text' ? await filterText(body[k], db) : body[k]);
    }
  }
  if (!fields.length) return json({ error: 'nothing to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(userId);

  await db.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return json({ ok: true });
}

// --- Admin handlers ---

export async function adminListStudents(db) {
  const { results } = await db.prepare(
    'SELECT id,username,display_name,university,major,city,longitude,latitude,status_text,can_cengfan,is_admin,created_at FROM students ORDER BY id'
  ).all();
  return json(results);
}

export async function adminCreateStudent(request, db) {
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password || !body?.display_name) {
    return json({ error: 'username, password, display_name required' }, 400);
  }
  const { hash, salt } = await hashPassword(body.password);
  await db.prepare(
    `INSERT INTO students (username,password_hash,salt,display_name,university,major,city,longitude,latitude,is_admin)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    body.username, hash, salt, body.display_name,
    body.university ?? null, body.major ?? null, body.city ?? null,
    body.longitude  ?? null, body.latitude ?? null,
    body.is_admin   ? 1 : 0
  ).run();
  return json({ ok: true }, 201);
}

export async function adminUpdateStudent(id, request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const fields = [];
  const values = [];

  const allowed = ['username','display_name','university','major','city','longitude','latitude','status_text','can_cengfan','is_admin'];
  for (const k of allowed) {
    if (k in body) { fields.push(`${k} = ?`); values.push(body[k]); }
  }

  if (body.password) {
    const { hash, salt } = await hashPassword(body.password);
    fields.push('password_hash = ?', 'salt = ?');
    values.push(hash, salt);
  }

  if (!fields.length) return json({ error: 'nothing to update' }, 400);
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return json({ ok: true });
}

export async function adminDeleteStudent(id, db) {
  await db.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// Settings
export async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  return json(Object.fromEntries(results.map(r => [r.key, r.value])));
}

export async function updateSettings(request, db) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid json' }, 400);

  const allowed = ['colorMode','unifiedColor','originName','originLon','originLat'];
  for (const k of allowed) {
    if (k in body) {
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, String(body[k])).run();
    }
  }
  return json({ ok: true });
}
