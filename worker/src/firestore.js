/**
 * Firestore REST API 客户端（纯 Web Crypto，无 SDK）
 * 在 Cloudflare Workers 环境运行
 */

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

// ── Google Service Account JWT ────────────────────────────────

function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlBuf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss:   env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600
  }));

  const sigInput = `${header}.${payload}`;

  // 解析 PEM 私钥
  const pemBody = env.FIREBASE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(sigInput)
  );

  const jwt = `${sigInput}.${b64urlBuf(sig)}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Firebase access token: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore 值编解码 ────────────────────────────────────────

function toFirestore(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string')  fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
  }
  return { fields };
}

function fromFirestore(doc) {
  if (!doc?.fields) return null;
  const obj = { id: doc.name?.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields)) {
    if ('stringValue'  in v) obj[k] = v.stringValue;
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue);
    else if ('doubleValue'  in v) obj[k] = v.doubleValue;
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('nullValue'    in v) obj[k] = null;
  }
  return obj;
}

// ── CRUD 操作 ─────────────────────────────────────────────────

export class FirestoreDB {
  constructor(env) {
    this.env     = env;
    this.project = env.FIREBASE_PROJECT_ID;
    this._token  = null;
    this._tokenExp = 0;
  }

  async token() {
    const now = Math.floor(Date.now() / 1000);
    if (!this._token || now > this._tokenExp - 60) {
      this._token    = await getAccessToken(this.env);
      this._tokenExp = now + 3600;
    }
    return this._token;
  }

  baseUrl(collection, docId = '') {
    const path = `projects/${this.project}/databases/(default)/documents/${collection}${docId ? '/' + docId : ''}`;
    return `${FIRESTORE_BASE}/${path}`;
  }

  async req(url, opts = {}) {
    const token = await this.token();
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      }
    });
    if (res.status === 404) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // 获取单个文档
  async get(collection, docId) {
    const data = await this.req(this.baseUrl(collection, docId));
    return fromFirestore(data);
  }

  // 列出集合所有文档
  async list(collection) {
    const data = await this.req(this.baseUrl(collection) + '?pageSize=200');
    return (data?.documents || []).map(fromFirestore).filter(Boolean);
  }

  // 按字段查询（单条件）
  async query(collection, field, op, value) {
    const opMap = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '>': 'GREATER_THAN' };
    let fieldFilter;
    if (typeof value === 'string')  fieldFilter = { stringValue: value };
    else if (typeof value === 'number') fieldFilter = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    else if (typeof value === 'boolean') fieldFilter = { booleanValue: value };

    const body = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: opMap[op] || 'EQUAL', value: fieldFilter } }
      }
    };
    const url  = `${FIRESTORE_BASE}/projects/${this.project}/databases/(default)/documents:runQuery`;
    const data = await this.req(url, { method: 'POST', body: JSON.stringify(body) });
    return (Array.isArray(data) ? data : [])
      .map(r => fromFirestore(r.document))
      .filter(Boolean);
  }

  // 创建文档（自动 ID）
  async add(collection, obj) {
    const data = await this.req(this.baseUrl(collection), {
      method: 'POST',
      body: JSON.stringify(toFirestore(obj))
    });
    return fromFirestore(data);
  }

  // 创建或更新（指定 ID，PATCH = merge）
  async set(collection, docId, obj) {
    const fields  = toFirestore(obj).fields;
    const mask    = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
    const data = await this.req(`${this.baseUrl(collection, docId)}?${mask}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields })
    });
    return fromFirestore(data);
  }

  // 删除文档
  async delete(collection, docId) {
    await this.req(this.baseUrl(collection, docId), { method: 'DELETE' });
  }
}
