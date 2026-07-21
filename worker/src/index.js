import { hashPassword, verifyPassword, signJwt, verifyJwt, bearerToken } from './auth.js';
import { handleGeocode } from './geocode.js';
import { filterText, listBannedWords, addBannedWord, deleteBannedWord } from './profanity.js';
import {
  mapData, getMe, updateMe,
  adminListStudents, adminCreateStudent, adminUpdateStudent, adminDeleteStudent,
  getSettings, updateSettings
} from './students.js';
import { FirestoreDB } from './firestore.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

function addCors(response) {
  const r = new Response(response.body, response);
  Object.entries(CORS).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

async function getUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyJwt(token, env.JWT_SECRET);
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const db = new FirestoreDB(env);

    // ── Bootstrap（仅本地开发，创建初始管理员）──────────────
    if (path === '/api/bootstrap' && method === 'POST') {
      const admins = await db.query('students', 'is_admin', '==', 1);
      if (admins.length > 0) return json({ error: 'admin already exists' }, 400);

      const { username, password, display_name } = await request.json().catch(() => ({}));
      if (!username || !password) return json({ error: 'missing fields' }, 400);

      const { hash, salt } = await hashPassword(password);
      const now = new Date().toISOString();
      await db.add('students', {
        username,
        password_hash: hash,
        salt,
        display_name: display_name || 'Admin',
        is_admin:     1,
        can_cengfan:  0,
        created_at:   now,
        updated_at:   now
      });
      return json({ ok: true });
    }

    // ── Public ────────────────────────────────────────────────
    if (path === '/api/map/data' && method === 'GET') {
      return addCors(await mapData(db));
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = await request.json().catch(() => ({}));
      if (!username || !password) return json({ error: 'missing fields' }, 400);

      const rows = await db.query('students', 'username', '==', username);
      const row  = rows[0];

      if (!row || !(await verifyPassword(password, row.password_hash, row.salt))) {
        return json({ error: 'invalid credentials' }, 401);
      }

      const token = await signJwt(
        { sub: row.id, name: row.display_name, admin: !!row.is_admin },
        env.JWT_SECRET
      );
      return json({ token, isAdmin: !!row.is_admin, name: row.display_name });
    }

    // ── Auth guard ────────────────────────────────────────────
    const user = await getUser(request, env);

    if (path === '/api/geocode' && method === 'POST') {
      if (!user) return json({ error: 'unauthorized' }, 401);
      return addCors(await handleGeocode(request, env));
    }

    if (path === '/api/student/me') {
      if (!user) return json({ error: 'unauthorized' }, 401);
      if (method === 'GET') return addCors(await getMe(user.sub, db));
      if (method === 'PUT') return addCors(await updateMe(user.sub, request, db));
    }

    if (path === '/api/student/password' && method === 'PUT') {
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { old_password, new_password } = await request.json().catch(() => ({}));
      if (!old_password || !new_password) return json({ error: 'missing fields' }, 400);
      if (new_password.length < 6) return json({ error: 'password too short' }, 400);

      const row = await db.get('students', user.sub);
      if (!row || !(await verifyPassword(old_password, row.password_hash, row.salt))) {
        return json({ error: 'current password incorrect' }, 401);
      }

      const { hash, salt } = await hashPassword(new_password);
      await db.set('students', user.sub, {
        password_hash: hash,
        salt,
        updated_at:    new Date().toISOString()
      });
      return json({ ok: true });
    }

    // ── Admin guard ────────────────────────────────────────────
    if (path.startsWith('/api/admin/')) {
      if (!user?.admin) return json({ error: 'forbidden' }, 403);

      // Students
      if (path === '/api/admin/students') {
        if (method === 'GET')  return addCors(await adminListStudents(db));
        if (method === 'POST') return addCors(await adminCreateStudent(request, db));
      }
      const studentMatch = path.match(/^\/api\/admin\/students\/([^/]+)$/);
      if (studentMatch) {
        const id = studentMatch[1];
        if (method === 'PUT')    return addCors(await adminUpdateStudent(id, request, db));
        if (method === 'DELETE') return addCors(await adminDeleteStudent(id, db));
      }

      // Banned words
      if (path === '/api/admin/banned-words') {
        if (method === 'GET')  return json(await listBannedWords(db));
        if (method === 'POST') {
          const { word } = await request.json().catch(() => ({}));
          if (!word) return json({ error: 'word required' }, 400);
          await addBannedWord(word, db);
          return json({ ok: true }, 201);
        }
      }
      const bwMatch = path.match(/^\/api\/admin\/banned-words\/([^/]+)$/);
      if (bwMatch) {
        if (method === 'DELETE') {
          await deleteBannedWord(bwMatch[1], db);
          return json({ ok: true });
        }
      }

      // Settings
      if (path === '/api/admin/settings') {
        if (method === 'GET') return addCors(await getSettings(db));
        if (method === 'PUT') return addCors(await updateSettings(request, db));
      }
    }

    return json({ error: 'not found' }, 404);
  }
};
