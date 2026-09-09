// POST /api/login  {passphrase} → 口令对则下发签名 cookie。 2026.09.07 Naron
// X123 颗粒 8(2026-09-09):防爆破**不再按 IP** —— 口令对的请求永远 0 延时、永不被锁;
//   口令错的请求按「最近 15 分钟全局失败次数」递增延时(250ms × n,封顶 4s),不返回 429。
//   为什么这么选、代价是什么:PREREG-X123-G8.md §3 与 _lib/auth.js 里的注释。
// 阴性对照(G8-SEC,取代旧 G-SEC):口令错 401 且第 n 次耗时单调上去;口令对 200 且耗时不涨。
import { makeToken, sessionCookie, timingSafeEqual,
  bumpFail_claudecode_20260909 as bumpFail,
  failDelay_claudecode_20260909 as failDelay, json } from '../_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  let pass = '';
  try {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) pass = (await request.json()).passphrase || '';
    else pass = (await request.formData()).get('passphrase') || '';
  } catch (e) { pass = ''; }

  if (!env.EDIT_PASSPHRASE) return json({ ok: false, error: '服务端未配置口令' }, 500);
  if (!timingSafeEqual(pass, env.EDIT_PASSPHRASE)) {
    await bumpFail(env);
    await failDelay(env);          // 先记账再延时 ⇒ 第 n 次错的延时里已经含这一次
    return json({ ok: false, error: '口令不对' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(await makeToken(env)) });
};
