// 口令 / 签名 cookie / 失败锁定。 2026.09.07 Naron
//   cookie = "<过期毫秒>.<base64url(HMAC-SHA256(EDIT_COOKIE_KEY, 过期毫秒))>"
//   HttpOnly + Secure + SameSite=Strict + Path=/,12 小时过期。
//   服务端只做「签名对不对 + 过没过期」两件事,不存会话(KV 省一次读)。
export const COOKIE_NAME = 'xtt_edit';
export const SESSION_MS = 12 * 60 * 60 * 1000;
export const FAIL_LIMIT = 5;
export const FAIL_TTL_SEC = 15 * 60;

const enc = new TextEncoder();

function b64url(buf) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 常量时间比较:长度不同也走完全程,不提前返回
export function timingSafeEqual(a, b) {
  const A = enc.encode(String(a)), B = enc.encode(String(b));
  let diff = A.length ^ B.length;
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) diff |= (A[i % A.length || 0] || 0) ^ (B[i % B.length || 0] || 0);
  return diff === 0;
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

export async function makeToken(env, now = Date.now()) {
  const exp = String(now + SESSION_MS);
  return exp + '.' + await hmac(env.EDIT_COOKIE_KEY, exp);
}

export async function verifyToken(env, token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const exp = token.slice(0, dot), sig = token.slice(dot + 1);
  if (!/^\d{10,16}$/.test(exp)) return false;
  const want = await hmac(env.EDIT_COOKIE_KEY, exp);
  if (!timingSafeEqual(sig, want)) return false;
  return Number(exp) > Date.now();
}

export function readCookie(request, name = COOKIE_NAME) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const p = part.trim();
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

export async function isAuthed(request, env) {
  return verifyToken(env, readCookie(request));
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
}
export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

export async function failCount(env, ip) {
  if (!env.LEGAL_CONTENT) return 0;
  const v = await env.LEGAL_CONTENT.get('login_fail:' + ip);
  return v ? parseInt(v, 10) || 0 : 0;
}
export async function bumpFail(env, ip) {
  if (!env.LEGAL_CONTENT) return;
  const n = (await failCount(env, ip)) + 1;
  await env.LEGAL_CONTENT.put('login_fail:' + ip, String(n), { expirationTtl: FAIL_TTL_SEC });
}
export async function clearFail(env, ip) {
  if (!env.LEGAL_CONTENT) return;
  await env.LEGAL_CONTENT.delete('login_fail:' + ip);
}

export const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...extra },
  });
}
