// POST /api/login  {passphrase} → 口令对则下发签名 cookie。 2026.09.07 Naron
// 阴性对照(G-SEC):口令错 401;同 IP 连续 5 次错之后,**即使口令对也 429**,15 min 自动解锁。
import { makeToken, sessionCookie, timingSafeEqual, clientIp, failCount, bumpFail, clearFail, FAIL_LIMIT, json } from '../_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  const ip = clientIp(request);
  if (await failCount(env, ip) >= FAIL_LIMIT) {
    return json({ ok: false, error: '错误次数过多,请 15 分钟后再试' }, 429);
  }
  let pass = '';
  try {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) pass = (await request.json()).passphrase || '';
    else pass = (await request.formData()).get('passphrase') || '';
  } catch (e) { pass = ''; }

  if (!env.EDIT_PASSPHRASE) return json({ ok: false, error: '服务端未配置口令' }, 500);
  if (!timingSafeEqual(pass, env.EDIT_PASSPHRASE)) {
    await bumpFail(env, ip);
    return json({ ok: false, error: '口令不对' }, 401);
  }
  await clearFail(env, ip);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(await makeToken(env)) });
};
