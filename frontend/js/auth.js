/**
 * 前端认证工具（portal.html 共享）
 */

import { API_BASE } from './config.js';

const TOKEN_KEY = 'g2306_token';
const INFO_KEY  = 'g2306_user';

export function saveSession(token, isAdmin, name) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(INFO_KEY, JSON.stringify({ isAdmin, name }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(INFO_KEY);
}

export function getToken()   { return localStorage.getItem(TOKEN_KEY); }
export function getSession() {
  const s = localStorage.getItem(INFO_KEY);
  return s ? JSON.parse(s) : null;
}

export function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    location.reload();
  }
  return res;
}

export async function login(username, password) {
  const res  = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'login failed');
  saveSession(data.token, data.isAdmin, data.name);
  return data;
}
