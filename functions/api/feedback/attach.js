// POST /api/feedback/attach —— 把已经传上来的图嵌进工单的某条消息里。
// 契约(X123 颗粒 5 §3):
//   体  {"id":"3","token":"…","cid":0,"keys":["3/<32hex>.jpg", …]}
//       cid 省略或 0 ⇒ 嵌进**首帖**(issue 正文);cid>0 ⇒ 嵌进那条评论。
//       cid 从哪来:contact 现在会在 ticket 里回一个 cid(新开单 = 0,追加到老单 = 那条评论的 id),
//       reply 本来就回 cid。App 拿着刚拿到的 cid 调这里就对了。
//   出  200 {"ok":true,"cid":<实际嵌进去的那条>,"n":<本次嵌了几张>}
//       400 bad_request · 403 forbidden · 404 not_found · 409 not_ready(排队中) · 502 upstream_failed
// 为什么是「改已有的那条」而不是「另发一条只有图的评论」:另发一条会让 App 的对话里凭空
//   多出一个空气泡,而且 thread 里那条的 from 判定要另开一类。改原帖对 App 是零新增概念。
// 2026.09.08 Naron
import {
  RATE_MAX_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, cleanId_claudecode_20260908 as cleanId,
  ticketTokenValid_claudecode_20260908 as tokenValid,
  rateAllow_claudecode_20260908 as rateAllow, logBodyOn_claudecode_20260908 as logBodyOn,
  sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import {
  GH_REPO_20260908 as REPO, installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh,
} from '../../_lib/ghapp.js';
import { resolveTicket_claudecode_20260908 as resolveTicket } from '../../_lib/ticket.js';
import {
  IMG_PER_MESSAGE_20260908,
  keyBelongsTo_claudecode_20260908 as keyBelongs,
  imgUrl_claudecode_20260908 as imgUrl, imgMarkdown_claudecode_20260908 as imgMarkdown,
} from '../../_lib/images.js';

export const onRequestPost = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;

  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  if (!(await rateAllow(kv, clientIp(request), 'reply', RATE_MAX_20260908.reply))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

  let data;
  try { data = JSON.parse(await request.text()); } catch (e) { return json({ ok: false, err: 'bad_request' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, err: 'bad_request' }, 400);
  }
  const id = cleanId(data.id);
  const cid = typeof data.cid === 'number' && data.cid > 0 ? Math.trunc(data.cid) : 0;
  const keys = Array.isArray(data.keys) ? data.keys.filter((k) => keyBelongs(k, id)) : [];
  if (id === '' || keys.length === 0) return json({ ok: false, err: 'bad_request' }, 400);
  if (keys.length > IMG_PER_MESSAGE_20260908) return json({ ok: false, err: 'bad_request', detail: 'too_many_images' }, 400);

  const ghToken = id.startsWith('t') || id.startsWith('q') ? '' : await installationToken(env, kv);
  const found = await resolveTicket(kv, ghToken, id);
  if (found.kind === 'none') return json({ ok: false, err: 'not_found' }, 404);
  if (found.kind === 'unavailable') return json({ ok: false, err: 'not_ready' }, 409);
  if (!(await tokenValid(env.TICKET_SECRET, id, typeof data.token === 'string' ? data.token : ''))) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  const keepBody = await logBodyOn(kv);
  const md = imgMarkdown(keys.map((k) => imgUrl(request, k)));

  // 测试件:图挂在 KV 里那条消息上,不碰 GitHub
  if (found.kind === 'test') {
    const t = found.data;
    const msgs = t.messages || [];
    const target = msgs.find((m) => (m.cid || 0) === cid);
    if (!target) return json({ ok: false, err: 'not_found', detail: 'cid' }, 404);
    target.images = (target.images || []).concat(keys.map((k) => imgUrl(request, k)));
    if (kv) { try { await kv.put('fbtest:' + id, JSON.stringify(t), { expirationTtl: 30 * 24 * 3600 }); } catch (e) {} }
    await sendlogRow(kv, keepBody, id, cid, keys, 'ok(test)', '');
    return json({ ok: true, cid, n: keys.length }, 200);
  }
  if (found.kind === 'queued') return json({ ok: false, err: 'not_ready' }, 409);

  // 真工单:把 markdown 追加到首帖正文或那条评论的末尾
  const path = cid > 0 ? `/repos/${REPO}/issues/comments/${cid}` : `/repos/${REPO}/issues/${id}`;
  const cur = await gh(ghToken, 'GET', path, null);
  if (cur.status === 404) return json({ ok: false, err: 'not_found', detail: 'cid' }, 404);
  if (!cur.ok || !cur.json) return json({ ok: false, err: 'upstream_failed' }, 502);
  // 评论必须属于这个工单 —— 否则拿 A 单的 token 能改到 B 单的评论
  if (cid > 0) {
    const belongs = String(cur.json.issue_url || '').endsWith('/issues/' + id);
    if (!belongs) return json({ ok: false, err: 'not_found', detail: 'cid' }, 404);
  }
  const body = String(cur.json.body || '') + '\n\n' + md + '\n';
  const res = await gh(ghToken, 'PATCH', path, { body });
  if (!res.ok) {
    await sendlogRow(kv, keepBody, id, cid, keys, '写入失败', 'status=' + res.status + ' ' + res.err);
    return json({ ok: false, err: 'upstream_failed' }, 502);
  }
  await sendlogRow(kv, keepBody, id, cid, keys, '已嵌入 ' + keys.length + ' 张', '');
  return json({ ok: true, cid, n: keys.length }, 200);
};

function sendlogRow(kv, keepBody, id, cid, keys, result, err) {
  return sendlog(kv, {
    api: 'attach', mode: 'image', id, deviceId8: '',
    to: cid > 0 ? 'GitHub 评论 #' + cid : 'GitHub issue #' + id + ' 首帖',
    subject: '工单图片嵌入 · ' + keys.length + ' 张',
    bodyHead: '(图片,只记键名)', diag: keys.join(' | '),
    log: '', logLines: 0, result, err, issueUrl: '', reason: '',
  }, keepBody);
}
