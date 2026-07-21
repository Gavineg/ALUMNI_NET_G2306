const ITERATIONS = 100_000;
const KEY_LEN    = 32;
const ALGO       = { name: 'PBKDF2', hash: 'SHA-256' };

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), ALGO, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ ...ALGO, salt, iterations: ITERATIONS }, key, KEY_LEN * 8);
  return { hash: b64(bits), salt: b64(salt) };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  const salt = fromb64(storedSalt);
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), ALGO, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ ...ALGO, salt, iterations: ITERATIONS }, key, KEY_LEN * 8);
  return b64(bits) === storedHash;
}

// --- JWT (HS256) ---
function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function base64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signJwt(payload, secret, expiresInHours = 24 * 7) {
  const header  = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body    = base64url(new TextEncoder().encode(JSON.stringify({
    ...payload, iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInHours * 3600
  })));
  const signing = new TextEncoder().encode(`${header}.${body}`);
  const key     = await getHmacKey(secret);
  const sig     = await crypto.subtle.sign('HMAC', key, signing);
  return `${header}.${body}.${base64url(sig)}`;
}

export async function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const key  = await getHmacKey(secret);
  const ok   = await crypto.subtle.verify('HMAC', key, base64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`));
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function bearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}
