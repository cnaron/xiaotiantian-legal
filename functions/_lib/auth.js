// 口令 / 签名 cookie / 失败锁定。 2026.09.07 Naron
//   cookie = "<过期毫秒>.<base64url(HMAC-SHA256(EDIT_COOKIE_KEY, 过期毫秒))>"
//   HttpOnly + Secure + SameSite=Strict + Path=/,12 小时过期。
//   服务端只做「签名对不对 + 过没过期」两件事,不存会话(KV 省一次读)。
export const COOKIE_NAME = 'xtt_edit';
export const SESSION_MS = 12 * 60 * 60 * 1000;
// FAIL_LIMIT(旧的「同 IP 5 次即锁」)随 X123 颗粒 8 一起退休:没有主体就锁不了单个人,
// 全局硬锁会把 owner 自己锁在门外。现在用的是下面的递增延时。
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

// ── /edit 登录的防爆破(X123 颗粒 8 起**不再按 IP**)──────────────────────────
// 旧写法:`login_fail:<IP>`,同一 IP 连错 5 次 ⇒ 15 分钟内即使口令对也 429。
//   它把访客 IP 明文写进 KV 存 15 分钟 —— owner 令「别收 IP 这种敏感信息」之后不能留。
// 换成什么:**全局错误计数 + 递增延时,不硬锁**。三个候选与取舍见 PREREG-X123-G8.md §3。
//   ★ 为什么不做「全局硬锁」:这个端点是公开的,任何人连按 5 次错口令就能**把 owner 自己
//     锁在门外** —— 白送的 DoS。所以口令**对**的请求永远 0 延时、永远进得去。
//   ★ 为什么不按 cookie:清一下 cookie 就绕过去了,等于没有。
//   ★ 诚实的局限:并发爆破能绕过延时(每条请求各自延时,不串行)。真正的防线仍然是
//     口令强度 + 上面那个常数时间比较。旧的按 IP 硬锁对换 IP 的攻击者本来也无效。
//   ⇒ 颗粒 3 的 `G-SEC`(同 IP 5 次后即使口令对也 429)**本轮改判**,新尺子见 RECEIPT §4。
export const FAIL_DELAY_STEP_MS_20260909 = 250;     // 每一次近期失败加的延时
export const FAIL_DELAY_MAX_MS_20260909 = 4000;     // 封顶,免得把 Worker 挂住

/** 15 分钟一格的窗口键;窗口滚动 = 自然遗忘,不需要额外清理 */
function failWindowKey_claudecode_20260909(now = Date.now()) {
  return 'login_fail:global:' + Math.floor(now / (FAIL_TTL_SEC * 1000));
}

export async function failCount_claudecode_20260909(env) {
  if (!env.LEGAL_CONTENT) return 0;
  const v = await env.LEGAL_CONTENT.get(failWindowKey_claudecode_20260909());
  return v ? parseInt(v, 10) || 0 : 0;
}

export async function bumpFail_claudecode_20260909(env) {
  if (!env.LEGAL_CONTENT) return;
  const key = failWindowKey_claudecode_20260909();
  const n = (await failCount_claudecode_20260909(env)) + 1;
  await env.LEGAL_CONTENT.put(key, String(n), { expirationTtl: 2 * FAIL_TTL_SEC });
}

/** 口令错时按「最近 15 分钟全局失败次数」拖一下;返回实际拖了多少毫秒(闸要读它) */
export async function failDelay_claudecode_20260909(env) {
  const n = await failCount_claudecode_20260909(env);
  const ms = Math.min(n * FAIL_DELAY_STEP_MS_20260909, FAIL_DELAY_MAX_MS_20260909);
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  return ms;
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
