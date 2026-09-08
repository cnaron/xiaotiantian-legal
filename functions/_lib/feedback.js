// 「联系我们」工单后端的公共件:清洗 / token / 限流 / issue 正文组装 / 发送记录。
// 接口契约沿用 X123 颗粒 2 定下的那一份(行为对 App 必须一致);那一版跑在 App server 的 PHP 上,
// **已由本文件所在的 Cloudflare 版完整取代**,本后端不依赖任何 App server / 旧域名。
// 2026.09.08 Naron
// ⚠️ 这里**不放**任何默认 key:本仓库是公开仓库,写死在这儿等于把 App 的请求头公之于众。
// key 只从 Pages secret `RC_KEY` 读;secret 没配 ⇒ 所有请求 403(宁可全拒,不可默认放行)。
// 2026-09-08 轮换过一次:上一版 key 曾被我误提交进这个公开仓库(history 里还有),
// 现役 key 只在 Pages secret 与交接文件里。 2026.09.08 Naron
export const RATE_WINDOW_SEC_20260908 = 600;
export const RATE_MAX_20260908 = { contact: 5, thread: 30, reply: 5, sendlog: 60 };
export const RATE_GLOBAL_DAY_20260908 = 300;
export const BODY_MAX_BYTES_20260908 = 131072;      // 128 KB
export const REPLY_BODY_MAX_BYTES_20260908 = 8192;
export const DESC_MAX_20260908 = 200;
export const CONTACT_MAX_20260908 = 80;
export const META_MAX_20260908 = 64;
export const REPLY_MAX_20260908 = 2000;
export const LOG_MAX_BYTES_20260908 = 65536;        // 64 KB
export const JWS_MAX_BYTES_20260908 = 32768;
export const DEVICE_ID_MAX_20260908 = 64;
export const GH_BODY_MAX_20260908 = 60000;
export const USER_REPLY_PREFIX_20260908 = '[用户回复]';
export const USER_MSG_PREFIX_20260908 = '[用户消息 #';
export const SENDLOG_KEEP_SEC_20260908 = 30 * 24 * 3600;
export const OWNER_MENTION_20260908 = '@cnaron';

const enc = new TextEncoder();

export const NO_STORE_20260908 = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json_claudecode_20260908(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE_20260908, ...extra },
  });
}

export function timingSafeEqual_claudecode_20260908(a, b) {
  const A = enc.encode(String(a)), B = enc.encode(String(b));
  let diff = A.length ^ B.length;
  const n = Math.max(A.length, B.length, 1);
  for (let i = 0; i < n; i++) diff |= (A[i % A.length || 0] || 0) ^ (B[i % B.length || 0] || 0);
  return diff === 0;
}

export function clientIp_claudecode_20260908(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
}

export function maskIp_claudecode_20260908(ip) {
  if (ip.includes('.')) {
    const p = ip.split('.');
    if (p.length === 4) { p[3] = 'x'; return p.join('.'); }
  }
  if (ip.includes(':')) {
    const p = ip.split(':');
    return p.slice(0, Math.ceil(p.length / 2)).join(':') + '::x';
  }
  return ip;
}

// ── 清洗 ───────────────────────────────────────────────────────────────
// 控制字符:除 \n \t 外全去掉(与 PHP 版同一张表)
const CTRL_20260908 = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** 去 HTML 标签 + 去控制字符 + 截断;singleLine 时连换行也换成空格(防头注入) */
export function clean_claudecode_20260908(value, maxChars, singleLine) {
  if (value === null || value === undefined || typeof value === 'object' || typeof value === 'function') return '';
  let s = String(value).replace(/<[^>]*>/g, '');
  s = s.replace(CTRL_20260908, '');
  s = singleLine ? s.replace(/[\r\n\t]/g, ' ') : s.replace(/\r\n/g, '\n');
  s = s.trim();
  return [...s].slice(0, maxChars).join('');
}

export function cleanDeviceId_claudecode_20260908(v) {
  if (v === null || v === undefined || typeof v === 'object' || typeof v === 'function') return '';
  return String(v).replace(/[^0-9A-Za-z-]/g, '').slice(0, DEVICE_ID_MAX_20260908);
}

/** id 只允许:纯数字(issue 号)、q+16 进制(排队号)、t+16 进制(测试件号) */
export function cleanId_claudecode_20260908(id) {
  if (id === null || id === undefined || typeof id === 'object' || typeof id === 'function') return '';
  const s = String(id).trim();
  return (/^[0-9]{1,9}$/.test(s) || /^[qt][0-9a-f]{1,24}$/.test(s)) ? s : '';
}

export function cleanJws_claudecode_20260908(v) {
  if (v === null || v === undefined || typeof v === 'object' || typeof v === 'function') return '';
  const s = String(v).trim();
  if (s === '' || enc.encode(s).length > JWS_MAX_BYTES_20260908) return '';
  return /^[A-Za-z0-9_\-.]+$/.test(s) ? s : '';
}

/** App 日志:去控制字符(留 \n)、按字节保留尾部、拆掉会破坏 markdown 代码块的三连反引号 */
export function cleanLog_claudecode_20260908(log) {
  if (log === null || log === undefined || typeof log === 'object' || typeof log === 'function') return '';
  let s = String(log).replace(/\r\n/g, '\n').replace(CTRL_20260908, '');
  const bytes = enc.encode(s);
  if (bytes.length > LOG_MAX_BYTES_20260908) {
    s = new TextDecoder().decode(bytes.subarray(bytes.length - LOG_MAX_BYTES_20260908));
    s = s.replace(/^�+/, '');            // 从半个字符切开的话开头会出替换符
  }
  return s.replace(/```/g, "'''").trim();
}

// ── 文本组装(与 PHP 版逐字对齐,App 拿到的 body 才不会变) ─────────────
export function planText_claudecode_20260908(plan) {
  const map = { free: 'free(免费)', '1y': '1y(一年)', '3y': '3y(三年)', forever: 'forever(永久)' };
  const k = (plan === null || plan === undefined || typeof plan === 'object') ? '' : String(plan);
  return map[k] || '-';
}

export function sessionText_claudecode_20260908(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return '-';
  const parts = [];
  const mode = clean_claudecode_20260908(s.mode, 32, true);
  if (mode !== '') parts.push(mode);
  if (typeof s.durationSec === 'number' && s.durationSec >= 0) parts.push(Math.trunc(s.durationSec) + ' 秒');
  if (typeof s.count === 'number' && s.count >= 0) parts.push(Math.trunc(s.count) + ' 下');
  const date = clean_claudecode_20260908(s.date, 32, true);
  if (date !== '') parts.push(date);
  return parts.length ? parts.join(' · ') : '-';
}

export function permissionText_claudecode_20260908(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '-';
  const names = { camera: '相机', mic: '麦克风', photosRead: '相册读', photosWrite: '相册写', health: '健康' };
  const allow = { granted: 1, denied: 1, notDetermined: 1 };
  return Object.keys(names).map((k) => {
    const v = typeof p[k] === 'string' ? p[k] : '';
    return names[k] + ' ' + (allow[v] ? v : '-');
  }).join(' / ');
}

export function paymentText_claudecode_20260908(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '-';
  const parts = ['档 ' + planText_claudecode_20260908(p.plan)];
  const fields = { productId: '商品', purchaseDate: '购买', expiresAt: '到期', originalTransactionId: '原始交易号' };
  for (const k of Object.keys(fields)) {
    const v = clean_claudecode_20260908(p[k], META_MAX_20260908, true);
    parts.push(fields[k] + ' ' + (v !== '' ? v : '-'));
  }
  return parts.join(' · ');
}

export function channelText_claudecode_20260908(chan, jws) {
  const kinds = { appstore: 1, testflight: 1, development: 1, adhoc: 1, unknown: 1 };
  let kind = (chan && typeof chan.kind === 'string') ? chan.kind : '';
  if (!kinds[kind]) kind = 'unknown';
  const prov = (chan && 'provisioning' in chan) ? (chan.provisioning ? 'true' : 'false') : '-';
  const receiptEnv = clean_claudecode_20260908(chan ? chan.receiptEnv : '', META_MAX_20260908, true);
  const env = jws.env !== '' ? jws.env : receiptEnv;
  const detail = 'kind ' + kind + ' · provisioning ' + prov
    + ' · receiptEnv ' + (receiptEnv !== '' ? receiptEnv : '-')
    + ' · JWS ' + (jws.present ? (jws.verified ? '已验证 ✅' : '未验证 ❌(' + jws.reason + ')') : '未提供');
  return { kind, env, detail };
}

export function jwsDetails_claudecode_20260908(jwsRaw, jws) {
  const head = 'JWS 校验:' + (jws.verified ? '通过 ✅' : '未通过 ❌ —— ' + jws.reason)
    + '(签名 vs 叶子证书 ' + jws.sigVsLeaf + ' / 证书链 ' + jws.chain
    + (jws.leafCN !== '' ? ' / 叶子 CN ' + jws.leafCN : '') + ')';
  const payloadTxt = jws.payload ? JSON.stringify(jws.payload, null, 4) : '(没解析出来)';
  return '<details><summary>AppTransaction JWS(' + enc.encode(jwsRaw).length + ' 字节)· '
    + (jws.verified ? 'verified' : 'unverified') + '</summary>\n\n'
    + head + '\n\n```json\n' + payloadTxt + '\n```\n\n原文:\n\n```\n' + jwsRaw + '\n```\n\n</details>\n';
}

export function logDetails_claudecode_20260908(log, lines, budget) {
  if (budget < 500) return '';
  const wrapLen = 120;
  let body = log;
  if ([...body].length > budget - wrapLen) {
    body = [...body].slice(-(budget - wrapLen)).join('');
    body = '…(日志已按 GitHub issue 长度上限截断)…\n' + body;
  }
  return '<details><summary>App 日志(' + lines + ' 行)</summary>\n\n```\n' + body + '\n```\n\n</details>\n';
}

/** 从 issue 正文里取出用户那段描述(取不到就整篇返回) */
export function firstPostBody_claudecode_20260908(body) {
  const head = '【问题描述】';
  const s = String(body ?? '');
  const pos = s.indexOf(head);
  if (pos < 0) return s;
  let rest = s.slice(pos + head.length);
  const end = rest.indexOf('\n【');
  if (end >= 0) rest = rest.slice(0, end);
  return rest.trim();
}

/** 一条评论是用户说的还是开发者说的;顺带把传输标记剥掉(标记是噪声,from 已经说清楚了) */
export function classifyComment_claudecode_20260908(body) {
  const s = String(body ?? '');
  if (s.startsWith(USER_REPLY_PREFIX_20260908)) {
    return { from: 'user', body: s.slice(USER_REPLY_PREFIX_20260908.length).replace(/^\s+/, '') };
  }
  if (s.startsWith(USER_MSG_PREFIX_20260908)) {
    return { from: 'user', body: firstPostBody_claudecode_20260908(s) };
  }
  return { from: 'dev', body: s };
}

// ── token ─────────────────────────────────────────────────────────────
export async function hmacHex_claudecode_20260908(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(String(msg))));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** token = HMAC-SHA256(TICKET_SECRET, id) 前 32 位十六进制(与 PHP 同式) */
export async function ticketToken_claudecode_20260908(secret, id) {
  if (!secret) return '';
  return (await hmacHex_claudecode_20260908(secret, id)).slice(0, 32);
}

export async function ticketTokenValid_claudecode_20260908(secret, id, token) {
  const want = await ticketToken_claudecode_20260908(secret, id);
  if (want === '' || typeof token !== 'string' || token === '') return false;
  return timingSafeEqual_claudecode_20260908(want, token);
}

// ── 限流(KV 滑动窗口;同一 colo 内写后立刻可读,跨 colo 最终一致) ──────
export async function rateAllow_claudecode_20260908(kv, ip, bucket, max, now = Date.now()) {
  if (!kv) return true;                          // KV 不可用时不拦真实反馈
  const key = 'fbrate:' + bucket + ':' + ip;
  let hits = [];
  try { hits = JSON.parse((await kv.get(key)) || '[]'); } catch (e) { hits = []; }
  if (!Array.isArray(hits)) hits = [];
  const kept = hits.filter((t) => typeof t === 'number' && now - t < RATE_WINDOW_SEC_20260908 * 1000);
  if (kept.length >= max) {
    // 不追加本次:避免恶意刷把窗口无限往后推
    try { await kv.put(key, JSON.stringify(kept), { expirationTtl: RATE_WINDOW_SEC_20260908 }); } catch (e) {}
    return false;
  }
  kept.push(now);
  try { await kv.put(key, JSON.stringify(kept), { expirationTtl: RATE_WINDOW_SEC_20260908 }); } catch (e) {}
  return true;
}

export async function globalDayAllow_claudecode_20260908(kv, now = new Date()) {
  if (!kv) return true;
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const key = 'fbrate:global:' + day;
  let n = 0;
  try { n = parseInt((await kv.get(key)) || '0', 10) || 0; } catch (e) { n = 0; }
  if (n >= RATE_GLOBAL_DAY_20260908) return false;
  try { await kv.put(key, String(n + 1), { expirationTtl: 2 * 24 * 3600 }); } catch (e) {}
  return true;
}

// ── 测试模式 / 发送记录 ────────────────────────────────────────────────
/** @returns '' = 不是测试模式;否则是原因串 */
export async function testModeReason_claudecode_20260908(request, kv) {
  if ((request.headers.get('x-rc-test') || '') === '1') return 'X-RC-Test 头';
  if (kv) {
    try { if (((await kv.get('feedback:test_mode')) || '') === 'on') return 'KV 总闸 feedback:test_mode=on'; }
    catch (e) { /* 读不到就当没开 */ }
  }
  return '';
}

export async function logBodyOn_claudecode_20260908(kv) {
  if (!kv) return true;
  try { return ((await kv.get('feedback:log_body')) || 'on') !== 'off'; } catch (e) { return true; }
}

export function stampId_claudecode_20260908() {
  return Date.now().toString(16) + Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
}

/** 写一行发送记录。log_body=off 时只留元信息与长度,不落正文(隐私开关) */
export async function sendlogAppend_claudecode_20260908(kv, rec, keepBody) {
  if (!kv) return;
  const row = { at: new Date().toISOString(), ...rec };
  if (!keepBody) {
    row.bodyHead = '(已按 feedback:log_body=off 不记录,原长 ' + [...(rec.bodyHead || '')].length + ' 字)';
    row.log = '';
    row.diag = '(已按 feedback:log_body=off 不记录)';
  }
  const key = 'sendlog:' + String(Date.now()).padStart(14, '0') + '-'
    + Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  try { await kv.put(key, JSON.stringify(row), { expirationTtl: SENDLOG_KEEP_SEC_20260908 }); } catch (e) {}
}
