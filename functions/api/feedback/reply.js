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
  cleanId_claudecode_20260908 as cleanId,
  clean_claudecode_20260908 as clean, ticketTokenValid_claudecode_20260908 as tokenValid,
  rateAllow_claudecode_20260908 as rateAllow, logBodyOn_claudecode_20260908 as logBodyOn,
  sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import {
  GH_REPO_20260908 as REPO, installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh,
} from '../../_lib/ghapp.js';
import { resolveTicket_claudecode_20260908 as resolveTicket } from '../../_lib/ticket.js';
import {
  isBlocked_claudecode_20260909 as isBlocked,
  moderate_claudecode_20260909 as moderate,
  noteRejection_claudecode_20260909 as noteRejection,
  categoryName_claudecode_20260909 as categoryName,
} from '../../_lib/moderation.js';

export const onRequestPost = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;

  // key 只认 Pages secret;secret 缺席 ⇒ 全拒(不给默认值,见 _lib/feedback.js 顶部)
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
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

  // 限流 —— **主体 = 工单号,不再是 IP**(X123 颗粒 8,owner 令「别收 IP」)。
  //   ★ 主体在请求体里 ⇒ 只能挪到解析之后;代价与残留风险写在 PREREG-X123-G8.md §5。
  //   ★ 放在 token 校验**之前**:不然没票的人可以无限次去打 resolveTicket(那会打 GitHub API)。
  //   ★ 阈值一个没动:5 次 / 600 秒。
  if (!(await rateAllow(kv, id, 'reply', RATE_MAX_20260908.reply))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

  const ghToken = id.startsWith('t') || id.startsWith('q') ? '' : await installationToken(env, kv);
  const found = await resolveTicket(kv, ghToken, id);
  if (found.kind === 'none') return json({ ok: false, err: 'not_found' }, 404);
  if (found.kind === 'unavailable') return json({ ok: false, err: 'not_ready' }, 409);
  if (!(await tokenValid(env.TICKET_SECRET, id, token_claudecode_20260908(data)))) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  const keepBody = await logBodyOn(kv);

  // ── X123 颗粒 7 两道门 ────────────────────────────────────────────────
  // ★ 放在 token 校验**之后**:不然拿着 X-RC-Key 的人可以用「403 blocked / 404」
  //   的差别去探测「哪条工单被拉黑了」。先证明你是这张票的主人,再谈拦不拦你。
  // ★ reply 的请求体里没有 deviceId(契约是颗粒 2 定的,这轮不改)⇒ 主体按工单号算。
  const issueNo = /^[0-9]+$/.test(id) ? parseInt(id, 10) : 0;
  const blk = await isBlocked(kv, ghToken, { issue: issueNo });
  if (blk.blocked) {
    await sendlog(kv, {
      api: 'reply', mode: 'blocked', id, deviceId8: '', to: '(已拉黑,未写入)',
      subject: '被拉黑的工单追加回复', bodyHead: body.slice(0, 200), diag: '', log: '', logLines: 0,
      result: '拒收', err: '', issueUrl: '', reason: blk.why,
    }, keepBody);
    return json({ ok: false, err: 'blocked' }, 403);
  }
  const mod = await moderate(env.AI, body);
  if (!mod.ok) {
    const note = await noteRejection(kv, ghToken, { issue: issueNo });
    await sendlog(kv, {
      api: 'reply', mode: 'rejected', id, deviceId8: '', to: '(预审拒绝,未写入)',
      subject: '预审拒绝 · ' + categoryName(mod.cat), bodyHead: body.slice(0, 200),
      diag: '', log: '', logLines: 0,
      result: '第 ' + note.count + ' 次被拒' + (note.autoBlocked ? ' ⇒ 已自动拉黑(' + note.how + ')' : ''),
      err: '', issueUrl: '', reason: '来源 ' + mod.src + ' · 类别 ' + mod.cat + ' · ' + mod.detail,
      modSrc: mod.src, modCat: mod.cat, modDetail: mod.detail,
      modMs: mod.wordMs, aiMs: mod.aiMs, aiState: mod.aiState, aiReason: mod.aiReason,
    }, keepBody);
    return json({ ok: false, err: 'rejected' }, 400);
  }

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
      modSrc: '', modCat: '', modDetail: '', modMs: mod.wordMs, aiMs: mod.aiMs,
      aiState: mod.aiState, aiReason: mod.aiReason,
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
    modSrc: '', modCat: '', modDetail: '', modMs: mod.wordMs, aiMs: mod.aiMs,
    aiState: mod.aiState, aiReason: mod.aiReason,
  }, keepBody);
  return json({ ok: true, cid: res.json.id }, 200);
};

function token_claudecode_20260908(data) {
  return typeof data.token === 'string' ? data.token : '';
}
