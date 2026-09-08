// GitHub App 鉴权 + 仓库调用。 2026.09.08 Naron
//   pem(secret GH_APP_PRIVATE_KEY)→ RS256 签 App JWT → 换 installation token → KV 缓存 50 分钟。
//   issue 由 xiaotiantian-feedback[bot] 建/评论 ⇒ owner 收 GitHub 通知,不用我们自己发邮件。
import { pkcs1ToPkcs8_claudecode_20260908 } from './der.js';

export const GH_REPO_20260908 = 'cnaron/rope-counter';
export const GH_LABEL_20260908 = 'user-feedback';
export const GH_API_20260908 = 'https://api.github.com';
export const GH_UA_20260908 = 'xiaotiantian-feedback (Cloudflare Pages Functions)';
export const TOKEN_KV_KEY_20260908 = 'ghtok';
export const TOKEN_CACHE_SEC_20260908 = 50 * 60;

const enc = new TextEncoder();

function b64url_claudecode_20260908(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** pem(PKCS#1 或 PKCS#8 都吃)→ WebCrypto 私钥 */
export async function importPem_claudecode_20260908(pem) {
  const txt = String(pem).replace(/\\n/g, '\n');
  const m = txt.match(/-----BEGIN (RSA )?PRIVATE KEY-----([\s\S]*?)-----END (RSA )?PRIVATE KEY-----/);
  if (!m) throw new Error('私钥不是 PEM 格式');
  const bin = atob(m[2].replace(/\s+/g, ''));
  let der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  if (m[1]) der = pkcs1ToPkcs8_claudecode_20260908(der);   // PKCS#1 要先包成 PKCS#8
  return crypto.subtle.importKey('pkcs8', der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** App JWT:iat 往前 60 秒抵消时钟漂移,有效期 9 分钟(GitHub 上限 10 分钟) */
export async function appJwt_claudecode_20260908(appId, pem, now = Math.floor(Date.now() / 1000)) {
  const key = await importPem_claudecode_20260908(pem);
  const head = b64url_claudecode_20260908(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const body = b64url_claudecode_20260908(enc.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) })));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + body));
  return head + '.' + body + '.' + b64url_claudecode_20260908(sig);
}

/**
 * 取 installation token。KV 里有没过期的就直接用,省两次 GitHub 往返。
 * 拿不到一律返回 ''(调用方降级排队,不把错误甩给用户)。
 */
export async function installationToken_claudecode_20260908(env, kv, force = false) {
  if (!env.GH_APP_ID || !env.GH_APP_PRIVATE_KEY || !env.GH_INSTALLATION_ID) return '';
  if (kv && !force) {
    try {
      const cached = JSON.parse(await kv.get(TOKEN_KV_KEY_20260908) || 'null');
      if (cached && cached.token && cached.exp > Date.now() + 60000) return cached.token;
    } catch (e) { /* 缓存坏了就当没有 */ }
  }
  let jwt;
  try { jwt = await appJwt_claudecode_20260908(env.GH_APP_ID, env.GH_APP_PRIVATE_KEY); }
  catch (e) { return ''; }
  const res = await fetch(`${GH_API_20260908}/app/installations/${env.GH_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + jwt,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': GH_UA_20260908,
    },
  });
  if (!res.ok) return '';
  const j = await res.json().catch(() => null);
  if (!j || !j.token) return '';
  if (kv) {
    try {
      await kv.put(TOKEN_KV_KEY_20260908,
        JSON.stringify({ token: j.token, exp: Date.now() + TOKEN_CACHE_SEC_20260908 * 1000 }),
        { expirationTtl: TOKEN_CACHE_SEC_20260908 + 120 });
    } catch (e) { /* 缓存写不进去不影响本次 */ }
  }
  return j.token;
}

/** @returns {ok,status,json,err} —— 形状与 PHP 版一致,调用点照抄得动 */
export async function gh_claudecode_20260908(token, method, path, payload) {
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': GH_UA_20260908,
  };
  const init = { method, headers };
  if (payload !== null && payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  let res, text = '';
  try { res = await fetch(GH_API_20260908 + path, init); text = await res.text(); }
  catch (e) { return { ok: false, status: 0, json: null, err: 'fetch 失败:' + e.message }; }
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    json,
    err: (json && json.message) ? String(json.message) : text.slice(0, 200),
  };
}

/** label 不存在就建;已存在 GitHub 回 422,当成功。失败不阻断开单。 */
export async function ensureLabel_claudecode_20260908(token) {
  await gh_claudecode_20260908(token, 'POST', `/repos/${GH_REPO_20260908}/labels`, {
    name: GH_LABEL_20260908, color: 'd876e3', description: 'App「联系我们」自动开的用户反馈工单',
  });
}
