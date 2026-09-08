// POST /api/feedback/reply —— 用户在 App 的工单页里追加一句。
// 契约沿用 X123 颗粒 2 §2.3(那一版已被本版完整取代)。两处与 PHP 版**故意不同**(修 X121 颗粒 12 §10 报的毛病):
//   ① 未知 id 一律 404(见 _lib/ticket.js);
//   ② 测试模式也返回**递增的真 cid(>0)**、并把这句 append 进测试件 —— PHP 版恒回 cid:0
//      且把首帖顶掉,会让 App 的「cid > lastSeenCid ⇒ 红点」整个失效。
// 2026.09.08 Naron
import {
  RATE_MAX_20260908, REPLY_BODY_MAX_BYTES_20260908, REPLY_MAX_20260908,
  USER_REPLY_PREFIX_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, cleanId_claudecode_20260908 as cleanId,
  clean_claudecode_20260908 as clean, ticketTokenValid_claudecode_20260908 as tokenValid,
  rateAllow_claudecode_20260908 as rateAllow, logBodyOn_claudecode_20260908 as logBodyOn,
  sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import {
  GH_REPO_20260908 as REPO, installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh,
} from '../../_lib/ghapp.js';
import { resolveTicket_claudecode_20260908 as resolveTicket } from '../../_lib/ticket.js';

export const onRequestPost = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;
  const ip = clientIp(request);

  // key 只认 Pages secret;secret 缺席 ⇒ 全拒(不给默认值,见 _lib/feedback.js 顶部)
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  if (!(await rateAllow(kv, ip, 'reply', RATE_MAX_20260908.reply))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

  const raw = await request.text();
  if (raw === '' || new TextEncoder().encode(raw).length > REPLY_BODY_MAX_BYTES_20260908) {
    return json({ ok: false, err: 'bad_request' }, 400);
  }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return json({ ok: false, err: 'bad_request' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, err: 'bad_request' }, 400);
  }
  const id = cleanId(data.id);
  const body = clean(data.body, REPLY_MAX_20260908, false);
  if (id === '' || body === '') return json({ ok: false, err: 'bad_request' }, 400);

  const ghToken = id.startsWith('t') || id.startsWith('q') ? '' : await installationToken(env, kv);
  const found = await resolveTicket(kv, ghToken, id);
  if (found.kind === 'none') return json({ ok: false, err: 'not_found' }, 404);
  if (found.kind === 'unavailable') return json({ ok: false, err: 'not_ready' }, 409);
  if (!(await tokenValid(env.TICKET_SECRET, id, token_claudecode_20260908(data)))) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  const keepBody = await logBodyOn(kv);

  // 测试件:append 一条,cid 从 KV 里的计数器取(>0 且递增,App 的红点判据才成立)
  if (found.kind === 'test') {
    const t = found.data;
    const cid = t.nextCid && t.nextCid > 0 ? t.nextCid : 1;
    t.nextCid = cid + 1;
    t.messages = (t.messages || []).concat([{ cid, from: 'user', body, at: new Date().toISOString() }]);
    if (kv) { try { await kv.put('fbtest:' + id, JSON.stringify(t), { expirationTtl: 30 * 24 * 3600 }); } catch (e) {} }
    await sendlog(kv, {
      api: 'reply', mode: 'test', id, deviceId8: '', to: '(测试模式,未写入 GitHub)',
      subject: '用户追加回复 → 工单 ' + id, bodyHead: body.slice(0, 200), diag: '', log: '', logLines: 0,
      result: 'ok(test) cid=' + cid, err: '', issueUrl: '', reason: '测试件',
    }, keepBody);
    return json({ ok: true, cid }, 200);
  }
  // 排队中的工单还不能追加回复
  if (found.kind === 'queued') return json({ ok: false, err: 'not_ready' }, 409);

  const res = await gh(ghToken, 'POST', `/repos/${REPO}/issues/${id}/comments`,
    { body: USER_REPLY_PREFIX_20260908 + ' ' + body });
  if (res.status === 404) return json({ ok: false, err: 'not_found' }, 404);
  if (!res.ok || !res.json || !res.json.id) {
    await sendlog(kv, {
      api: 'reply', mode: 'issue', id, deviceId8: '', to: 'GitHub issue #' + id,
      subject: '用户追加回复 → 工单 ' + id, bodyHead: body.slice(0, 200), diag: '', log: '', logLines: 0,
      result: '写入失败', err: 'status=' + res.status + ' ' + res.err, issueUrl: '', reason: '',
    }, keepBody);
    return json({ ok: false, err: 'upstream_failed' }, 502);
  }
  await sendlog(kv, {
    api: 'reply', mode: 'issue', id, deviceId8: '', to: 'GitHub issue #' + id,
    subject: '用户追加回复 → 工单 ' + id, bodyHead: body.slice(0, 200), diag: '', log: '', logLines: 0,
    result: '已写入评论 cid=' + res.json.id, err: '', issueUrl: res.json.html_url || '', reason: '',
  }, keepBody);
  return json({ ok: true, cid: res.json.id }, 200);
};

function token_claudecode_20260908(data) {
  return typeof data.token === 'string' ? data.token : '';
}
