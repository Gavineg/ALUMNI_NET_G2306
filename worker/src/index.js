import { hashPassword, verifyPassword, signJwt, verifyJwt, bearerToken } from './auth.js';
import { handleGeocode } from './geocode.js';
import { filterText, listBannedWords, addBannedWord, deleteBannedWord } from './profanity.js';
import {
  mapData, getMe, updateMe,
  adminListStudents, adminCreateStudent, adminUpdateStudent, adminDeleteStudent,
  getSettings, updateSettings
} from './students.js';

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

    // ── Bootstrap（仅本地开发，创建初始管理员）──────────────
    if (path === '/api/bootstrap' && method === 'POST') {
      const existing = await env.DB.prepare('SELECT id FROM students WHERE is_admin=1').first();
      if (existing) return json({ error: 'admin already exists' }, 400);
      const { username, password, display_name } = await request.json().catch(() => ({}));
      if (!username || !password) return json({ error: 'missing fields' }, 400);
      const { hash, salt } = await hashPassword(password);
      await env.DB.prepare(
        'INSERT INTO students (username,password_hash,salt,display_name,is_admin) VALUES (?,?,?,?,1)'
      ).bind(username, hash, salt, display_name || 'Admin').run();
      return json({ ok: true });
    }

    // ── Public ────────────────────────────────────────────────
    if (path === '/api/map/data' && method === 'GET') {
      return addCors(await mapData(env.DB));
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = await request.json().catch(() => ({}));
      if (!username || !password) return json({ error: 'missing fields' }, 400);

      const row = await env.DB.prepare(
        'SELECT id, password_hash, salt, is_admin, display_name FROM students WHERE username = ?'
      ).bind(username).first();

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
      if (method === 'GET') return addCors(await getMe(user.sub, env.DB));
      if (method === 'PUT') return addCors(await updateMe(user.sub, request, env.DB));
    }

    // ── Admin guard ────────────────────────────────────────────
    if (path.startsWith('/api/admin/')) {
      if (!user?.admin) return json({ error: 'forbidden' }, 403);

      // Students
      if (path === '/api/admin/students') {
        if (method === 'GET')  return addCors(await adminListStudents(env.DB));
        if (method === 'POST') return addCors(await adminCreateStudent(request, env.DB));
      }
      const studentMatch = path.match(/^\/api\/admin\/students\/(\d+)$/);
      if (studentMatch) {
        const id = parseInt(studentMatch[1]);
        if (method === 'PUT')    return addCors(await adminUpdateStudent(id, request, env.DB));
        if (method === 'DELETE') return addCors(await adminDeleteStudent(id, env.DB));
      }

      // Banned words
      if (path === '/api/admin/banned-words') {
        if (method === 'GET')  return json(await listBannedWords(env.DB));
        if (method === 'POST') {
          const { word } = await request.json().catch(() => ({}));
          if (!word) return json({ error: 'word required' }, 400);
          await addBannedWord(word, env.DB);
          return json({ ok: true }, 201);
        }
      }
      const bwMatch = path.match(/^\/api\/admin\/banned-words\/(\d+)$/);
      if (bwMatch) {
        if (method === 'DELETE') {
          await deleteBannedWord(parseInt(bwMatch[1]), env.DB);
          return json({ ok: true });
        }
      }

      // Settings
      if (path === '/api/admin/settings') {
        if (method === 'GET') return addCors(await getSettings(env.DB));
        if (method === 'PUT') return addCors(await updateSettings(request, env.DB));
      }
    }

    return json({ error: 'not found' }, 404);
  }
};
