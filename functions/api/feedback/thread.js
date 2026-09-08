// GET /api/feedback/thread?id=&token= —— 拉整条对话。
// 契约 = X123-G2 §2.2。两处与 PHP 版**故意不同**(修 X121 颗粒 12 §10 报的毛病):
//   ① 未知 id 一律 404(不再被 token 关挡成 403),见 _lib/ticket.js 顶部说明;
//   ② 测试件的 state 回 `pending`(不再回契约里没有的 `test`),且首帖不会被回复顶掉。
// 2026.09.08 Naron
import {
  RC_KEY_FALLBACK_20260908, RATE_MAX_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, cleanId_claudecode_20260908 as cleanId,
  ticketTokenValid_claudecode_20260908 as tokenValid, rateAllow_claudecode_20260908 as rateAllow,
  firstPostBody_claudecode_20260908 as firstPostBody,
  classifyComment_claudecode_20260908 as classify,
} from '../../_lib/feedback.js';
import {
  GH_REPO_20260908 as REPO, installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh,
} from '../../_lib/ghapp.js';
import { resolveTicket_claudecode_20260908 as resolveTicket } from '../../_lib/ticket.js';

export const onRequestGet = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;
  const ip = clientIp(request);

  if (!tseq(env.RC_KEY || RC_KEY_FALLBACK_20260908, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  if (!(await rateAllow(kv, ip, 'thread', RATE_MAX_20260908.thread))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

  const url = new URL(request.url);
  const id = cleanId(url.searchParams.get('id'));
  const token = url.searchParams.get('token') || '';
  if (id === '') return json({ ok: false, err: 'bad_request' }, 400);

  const ghToken = id.startsWith('t') || id.startsWith('q') ? '' : await installationToken(env, kv);
  const found = await resolveTicket(kv, ghToken, id);
  if (found.kind === 'none') return json({ ok: false, err: 'not_found' }, 404);
  if (found.kind === 'unavailable') return json({ ok: false, err: 'not_ready' }, 409);
  if (!(await tokenValid(env.TICKET_SECRET, id, token))) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }

  // 测试件:内容在 KV 里,按顺序全给(reply 是 append,首帖不会被顶掉)
  if (found.kind === 'test') {
    return json({
      ok: true,
      ticket: { id, state: 'pending', createdAt: found.data.createdAt },
      messages: found.data.messages || [],
    }, 200);
  }
  // 排队中(GitHub 暂时用不了):只有首帖
  if (found.kind === 'queued') {
    return json({
      ok: true,
      ticket: { id, state: 'pending', createdAt: found.data.createdAt },
      messages: [{ cid: 0, from: 'user', body: found.data.desc || '', at: found.data.createdAt }],
    }, 200);
  }

  const j = found.issue;
  const messages = [{
    cid: 0, from: 'user',
    body: firstPostBody(j.body || ''),
    at: j.created_at || '',
  }];
  const cmt = await gh(ghToken, 'GET', `/repos/${REPO}/issues/${id}/comments?per_page=100`, null);
  if (cmt.ok && Array.isArray(cmt.json)) {
    for (const c of cmt.json) {
      if (!c || typeof c !== 'object') continue;
      const cls = classify(c.body);
      messages.push({ cid: c.id || 0, from: cls.from, body: cls.body, at: c.created_at || '' });
    }
  }
  return json({
    ok: true,
    ticket: { id, state: j.state === 'closed' ? 'closed' : 'open', createdAt: j.created_at || '' },
    messages,
  }, 200);
};
