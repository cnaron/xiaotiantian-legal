// GET /api/feedback/thread?id=&token= —— 拉整条对话。
// 契约沿用 X123 颗粒 2 §2.2(那一版已被本版完整取代)。两处与 PHP 版**故意不同**(修 X121 颗粒 12 §10 报的毛病):
//   ① 未知 id 一律 404(不再被 token 关挡成 403),见 _lib/ticket.js 顶部说明;
//   ② 测试件的 state 回 `pending`(不再回契约里没有的 `test`),且首帖不会被回复顶掉。
// X123 颗粒 6:颗粒 5 加的 `images: []` **已移除**(owner 令:不让用户上传图片,
//   上传/嵌图/取图三条接口与 R2 桶都撤了)。App 侧同步在颗粒 16 不再读这个字段。
//   ★ 但正文里遗留的 `![截图](url)` **仍然要剥**:颗粒 5 期间开出的工单正文里已经写进去了,
//     owner 在 GitHub 网页上回复时拖图也会产生同样的写法 —— 不剥,App 气泡里就冒出这一行。
//     剥的理由与作用域见 _lib/feedback.js 里 stripImageMarkdown 的注释。
//   ★ 剥必须在 firstPostBody / classify **之前**做:图行在正文最末尾,而 firstPostBody
//     只截【问题描述】那一段 —— 顺序反了图行会被截没。 2026.09.08 Naron
import {
  RATE_MAX_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  cleanId_claudecode_20260908 as cleanId,
  ticketTokenValid_claudecode_20260908 as tokenValid, rateAllow_claudecode_20260908 as rateAllow,
  firstPostBody_claudecode_20260908 as firstPostBody,
  classifyComment_claudecode_20260908 as classify,
  stripImageMarkdown_claudecode_20260908 as stripImages,
} from '../../_lib/feedback.js';
import {
  GH_REPO_20260908 as REPO, installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh,
} from '../../_lib/ghapp.js';
import { resolveTicket_claudecode_20260908 as resolveTicket } from '../../_lib/ticket.js';

export const onRequestGet = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;

  // key 只认 Pages secret;secret 缺席 ⇒ 全拒(不给默认值,见 _lib/feedback.js 顶部)
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }

  const url = new URL(request.url);
  const id = cleanId(url.searchParams.get('id'));
  const token = url.searchParams.get('token') || '';
  if (id === '') return json({ ok: false, err: 'bad_request' }, 400);

  // 限流 —— **主体 = 工单号,不再是 IP**(X123 颗粒 8);阈值一个没动:30 次 / 600 秒。
  //   放在 token 校验之前,理由同 reply.js:挡住"无票的人反复触发 GitHub API"。
  if (!(await rateAllow(kv, id, 'thread', RATE_MAX_20260908.thread))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

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
      // 只回四个字段:颗粒 5 期间 attach 可能往 KV 里这条上写过 images,
      // 白名单式挑字段 ⇒ 老数据里的 images 也不会漏出去(G6-NO-IMAGES-FIELD 查的就是这个)
      messages: (found.data.messages || []).map((m) => ({
        cid: m.cid || 0, from: m.from, body: m.body, at: m.at,
      })),
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
  const headBody = stripImages(j.body || '');       // ★ 先剥掉遗留图行,再截【问题描述】那一段
  const messages = [{
    cid: 0, from: 'user',
    body: firstPostBody(headBody),
    at: j.created_at || '',
  }];
  const cmt = await gh(ghToken, 'GET', `/repos/${REPO}/issues/${id}/comments?per_page=100`, null);
  if (cmt.ok && Array.isArray(cmt.json)) {
    for (const c of cmt.json) {
      if (!c || typeof c !== 'object') continue;
      const cls = classify(stripImages(c.body));    // ★ 同样先剥再分类
      messages.push({ cid: c.id || 0, from: cls.from, body: cls.body, at: c.created_at || '' });
    }
  }
  return json({
    ok: true,
    ticket: { id, state: j.state === 'closed' ? 'closed' : 'open', createdAt: j.created_at || '' },
    messages,
  }, 200);
};
