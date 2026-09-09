// POST /api/feedback/contact —— 提交反馈 ⇒ 开 GitHub issue / 追加到本设备已有的 issue。
// 契约沿用 X123 颗粒 2 §2.1(行为对 App 必须一致)。
// 与那一版的区别:不发邮件(GitHub App 开的 issue 会给 owner 发通知)、队列存 KV 不存文件、
// **整条链路只用 Cloudflare + GitHub,不回落到 App server 或旧域名**。
// X123 颗粒 5 追加:返回里多一个 `ticket.cid` —— 这次留言落在哪条消息上
//   (新开单 = 0 即首帖;追加到老单 = 那条评论的 id)。
// X123 颗粒 6:它当初是给 /api/feedback/attach 传图用的,那条接口已按 owner 令删掉。
//   `cid` **保留**:reply 本来就回同一个东西、App 的「有新回复红点」判据在用它,
//   而且它与图片无关(就是一条 GitHub 评论 id)。删它是白白制造一次契约变更。
//   **纯新增字段**,老 App 读不到它也照常工作。 2026.09.08 Naron
// ★ X123 颗粒 7(owner 真机开了 issue #7 之后当场提的)—— **issue 排版重做**:
//   ① 标题 = 用户原话(去换行、超 60 字加「…」),旧的「时间·机型·build·设备前 8」整条退休:
//      owner 在 GitHub 通知列表里要一眼看见用户说了什么,那串元数据在那儿只是噪声。
//   ② 正文第一屏 = 用户原话,引用块 + 大字号;元数据全部收进「设备与诊断信息」折叠块;
//      日志、JWS 各自还是一个折叠块。
//   ③ 设备号从明晃晃的 `device: xxx` 改成 HTML 注释 `<!-- device: xxx -->` 放正文首行 ——
//      页面上看不见,GitHub 全文搜索照样命中(兜底那条 searchDeviceIssue 还靠它)。
//   ④ 「会员档」只给一个说法(以 payment.plan 为准)、DEV 模拟档单独一行,见 memberPlanText。
//   ★ 旧排版的 issue(#1–#7)still 要能读:回取用的 firstPostBody 两种排版都认。 2026.09.09 Naron
import {
  RATE_MAX_20260908, BODY_MAX_BYTES_20260908,
  DESC_MAX_20260908, CONTACT_MAX_20260908, META_MAX_20260908, GH_BODY_MAX_20260908,
  USER_MSG_PREFIX_20260909, OWNER_MENTION_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  RATE_SUBJECT_NONE_20260909,
  clean_claudecode_20260908 as clean, cleanDeviceId_claudecode_20260908 as cleanDeviceId,
  cleanJws_claudecode_20260908 as cleanJws, cleanLog_claudecode_20260908 as cleanLog,
  sessionText_claudecode_20260908 as sessionText,
  permissionText_claudecode_20260908 as permissionText,
  paymentDetailText_claudecode_20260909 as paymentDetailText,
  memberPlanText_claudecode_20260909 as memberPlanText,
  channelText_claudecode_20260908 as channelText, jwsDetails_claudecode_20260908 as jwsDetails,
  logDetails_claudecode_20260908 as logDetails,
  titleFromDesc_claudecode_20260909 as titleFromDesc,
  quoteDesc_claudecode_20260909 as quoteDesc,
  deviceMark_claudecode_20260909 as deviceMark,
  diagDetails_claudecode_20260909 as diagDetails,
  ticketToken_claudecode_20260908 as ticketToken,
  rateAllow_claudecode_20260908 as rateAllow, globalDayAllow_claudecode_20260908 as globalDayAllow,
  testModeReason_claudecode_20260908 as testModeReason, logBodyOn_claudecode_20260908 as logBodyOn,
  stampId_claudecode_20260908 as stampId, sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import { jwsInspect_claudecode_20260908 as jwsInspect } from '../../_lib/applejws.js';
import {
  isBlocked_claudecode_20260909 as isBlocked,
  deviceIssue_claudecode_20260909 as deviceIssue,
  moderate_claudecode_20260909 as moderate,
  noteRejection_claudecode_20260909 as noteRejection,
  categoryName_claudecode_20260909 as categoryName,
} from '../../_lib/moderation.js';
import {
  GH_REPO_20260908 as REPO, GH_LABEL_20260908 as LABEL,
  installationToken_claudecode_20260908 as installationToken,
  gh_claudecode_20260908 as gh, ensureLabel_claudecode_20260908 as ensureLabel,
} from '../../_lib/ghapp.js';

/** 北京时间的 'YYYY-MM-DD HH:mm[:ss]'(Workers 跑在 UTC,offset 自己加) */
function bj_claudecode_20260908(withSec) {
  const d = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
  return withSec ? d.slice(0, 19).replace('T', ' ') : d.slice(0, 16).replace('T', ' ');
}

export const onRequestPost = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;

  // ① key —— 缺或错一律 403,不区分(不给扫描者反馈)
  // key 只认 Pages secret;secret 缺席 ⇒ 全拒(不给默认值,见 _lib/feedback.js 顶部)
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  // ② 全局日限 —— 仍然放在参数校验之前:任何一次尝试(哪怕请求体是坏的)都计数
  if (!(await globalDayAllow(kv))) return json({ ok: false, err: 'rate_limited' }, 429);

  // ③ 参数
  const raw = await request.text();
  if (raw === '' || new TextEncoder().encode(raw).length > BODY_MAX_BYTES_20260908) {
    return json({ ok: false, err: 'bad_request' }, 400);
  }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return json({ ok: false, err: 'bad_request' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, err: 'bad_request' }, 400);
  }

  // ②' 单主体限流 —— **主体 = App 自己生成的设备编号,不再是 IP**(X123 颗粒 8,owner 令)。
  //   ★ 位置:必须在解析之后 —— 主体在请求体里,不解析就拿不到。所以「请求体坏掉的尝试
  //     也计数」这条性质**没了**(那种请求现在只被上面的全局 300/天 计入),写在 PREREG §5③。
  //   ★ 位置仍在**其它参数校验之前**:参数错(比如 desc 空)照样计数,这条性质保留。
  //   ★ 阈值一个没动:5 次 / 600 秒。
  const deviceId = cleanDeviceId(data.deviceId);
  if (!(await rateAllow(kv, deviceId || RATE_SUBJECT_NONE_20260909, 'contact', RATE_MAX_20260908.contact))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

  const desc = clean(data.desc, DESC_MAX_20260908, false);
  if (desc === '') return json({ ok: false, err: 'bad_request' }, 400);

  const contactWay = clean(data.contact, CONTACT_MAX_20260908, true);
  const appName = clean(data.app, META_MAX_20260908, true);
  const version = clean(data.version, META_MAX_20260908, true);
  const build = clean(data.build, META_MAX_20260908, true);
  const device = clean(data.device, META_MAX_20260908, true);
  const os = clean(data.os, META_MAX_20260908, true);
  const locale = clean(data.locale, META_MAX_20260908, true);
  const jwsRaw = cleanJws(data.channel && data.channel.appTransactionJWS);
  const jws = await jwsInspect(jwsRaw);
  const chanText = channelText(data.channel, jws);
  const log = cleanLog(data.log);
  const logLines = log === '' ? 0 : log.split('\n').length;

  // ③-拉黑 —— owner 在 GitHub 上贴 `blocked` 标签 ⇒ 这台设备发不出新的话。
  //   ★ 放在预审**之前**:被拉黑的人不该再消耗一次 AI 额度。
  //   ★ thread 那条**故意不查**:拉黑的是"发言",不是"看自己的历史"。
  const keepBodyEarly = await logBodyOn(kv);
  const myIssue = await deviceIssue(kv, deviceId);
  const ghTokenForGate = myIssue > 0 ? await installationToken(env, kv) : '';
  const blk = await isBlocked(kv, ghTokenForGate, { deviceId, issue: myIssue });
  if (blk.blocked) {
    await sendlog(kv, {
      api: 'contact', mode: 'blocked', id: myIssue > 0 ? String(myIssue) : '-', deviceId8: deviceId.slice(0, 8),
      to: '(已拉黑,未开工单)', subject: '被拉黑的设备提交反馈', bodyHead: desc.slice(0, 200),
      diag: '', log: '', logLines: 0, result: '拒收', err: '', issueUrl: '', reason: blk.why,
    }, keepBodyEarly);
    return json({ ok: false, err: 'blocked' }, 403);
  }

  // ③-预审 —— 只审用户自己写的那段话(不审日志、不审元信息:那些是我们自己拼的)
  const mod = await moderate(env.AI, desc);
  if (!mod.ok) {
    // ghTokenForGate 只在 myIssue>0 时才非空;myIssue==0 时 noteRejection 只写 KV,不需要 token
    const note = await noteRejection(kv, ghTokenForGate, { deviceId, issue: myIssue });
    await sendlog(kv, {
      api: 'contact', mode: 'rejected', id: myIssue > 0 ? String(myIssue) : '-', deviceId8: deviceId.slice(0, 8),
      to: '(预审拒绝,未开工单)', subject: '预审拒绝 · ' + categoryName(mod.cat),
      bodyHead: desc.slice(0, 200), diag: '', log: '', logLines: 0,
      result: '第 ' + note.count + ' 次被拒' + (note.autoBlocked ? ' ⇒ 已自动拉黑(' + note.how + ')' : ''),
      err: '', issueUrl: '', reason: '来源 ' + mod.src + ' · 类别 ' + mod.cat + ' · ' + mod.detail,
      modSrc: mod.src, modCat: mod.cat, modDetail: mod.detail,
      modMs: mod.wordMs, aiMs: mod.aiMs, aiState: mod.aiState, aiReason: mod.aiReason,
    }, keepBodyEarly);
    // 不给理由:告诉对方"哪个词被拦了"等于送他一张绕过说明书
    return json({ ok: false, err: 'rejected' }, 400);
  }

  // ④ 组装 —— X123 颗粒 7 新排版(owner 看 issue #7 后当场提的):
  //    标题 = 用户原话;正文第一屏 = 用户原话(引用块 + 大字号);抓来的元数据全收进折叠块。
  //    设备号改成 HTML 注释放首行:页面上看不见,GitHub 全文搜索照样命中(兜底那条路还靠它)。
  const nowIso = new Date().toISOString();
  const title = titleFromDesc(desc, '[反馈] ' + bj_claudecode_20260908(false));

  // 「会员档」只给一个说法,以 payment.plan 为准;DEV 模拟档单独一行。理由见 memberPlanText 注释。
  const member = memberPlanText(data.plan, data.payment, data.devOverridePlan);
  const diagRows = [
    ['App 版本', (version !== '' ? version : '-') + ' (build ' + (build !== '' ? build : '-') + ')'],
    ['机型 / 系统 / 语言', (device !== '' ? device : '-') + ' / ' + (os !== '' ? os : '-') + ' / ' + (locale !== '' ? locale : '-')],
    ['会员档', member.plan + (member.mismatch !== '' ? ' —— ⚠️ ' + member.mismatch : '')],
  ];
  if (member.devOverride !== '') {
    diagRows.push(['DEV 模拟档', member.devOverride + '(开发者模式模拟的,不是真实权益)']);
  }
  diagRows.push(
    ['付费', paymentDetailText(data.payment)],
    ['渠道', chanText.detail + ' · env ' + (chanText.env !== '' ? chanText.env : 'unknown')],
    ['最近一局', sessionText(data.lastSession)],
    ['权限', permissionText(data.permissions)],
    ['提交时间', bj_claudecode_20260908(true)],
  );
  // 发送记录页看的是纯文本版(那一页不渲染 markdown,折叠块在那儿只会变成一坨标签)
  const diagPlain = diagRows.map((r) => r[0] + ':' + r[1]).join('\n');

  const folds = jws.present ? '\n' + jwsDetails(jwsRaw, jws) : '';
  // bodyCore 不含 @提及:它同时用于「新开 issue」和「追加评论」,评论里再 @ 一次是重复打扰
  const bodyCore = quoteDesc(desc) + '\n\n'
    + '**联系方式**:' + (contactWay !== '' ? contactWay : '(用户未填)') + '\n\n'
    + diagDetails(diagRows) + folds;
  const bodyNoLog = bodyCore;
  let issueBody = deviceMark(deviceId) + '\n' + OWNER_MENTION_20260908 + '\n\n' + bodyCore;
  if (log !== '') issueBody += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...issueBody].length - 200);

  const keepBody = keepBodyEarly;
  const subject = '[' + (appName !== '' ? appName : '小天天练跳绳') + '] 用户反馈 · '
    + (build !== '' ? build : '-') + ' · ' + bj_claudecode_20260908(true);

  // ⑤-0 测试模式:不调 GitHub,只写一条测试件 + 一行发送记录
  //      测试件独立存 KV(不是从发送记录里反推),reply 才能 append 而不是把首帖顶掉
  const testReason = await testModeReason(request, kv);
  if (testReason !== '') {
    const ticketId = 't' + stampId();
    const token = await ticketToken(env.TICKET_SECRET, ticketId);
    if (kv) {
      try {
        await kv.put('fbtest:' + ticketId, JSON.stringify({
          createdAt: nowIso, nextCid: 1,
          messages: [{ cid: 0, from: 'user', body: desc, at: nowIso }],
        }), { expirationTtl: 30 * 24 * 3600 });
      } catch (e) { /* 存不进去也照常返回,只是 thread 查不到 */ }
    }
    await sendlog(kv, {
      api: 'contact', mode: 'test', id: ticketId, deviceId8: deviceId.slice(0, 8),
      to: '(测试模式,未调 GitHub)', subject, bodyHead: desc.slice(0, 200),
      diag: diagPlain, log, logLines, result: 'ok(test)', err: '', issueUrl: '', reason: testReason,
      modSrc: '', modCat: '', modDetail: '', modMs: mod.wordMs, aiMs: mod.aiMs,
      aiState: mod.aiState, aiReason: mod.aiReason,
    }, keepBody);
    return json({ ok: true, ticket: { id: ticketId, token, createdAt: nowIso, mode: 'test', cid: 0 } }, 200);
  }

  // ⑤ 开工单 / 追加到这台设备已有的工单;拿不到 token 就降级排队,对用户不报错
  const ghToken = ghTokenForGate !== '' ? ghTokenForGate : await installationToken(env, kv);
  let mode = 'queued', ticketId = '', createdAt = nowIso, issueUrl = '', ghAction = '', ghErr = '';
  let cid = 0;                       // 这次留言落在哪条消息上(首帖 = 0)

  if (ghToken !== '') {
    let existing = myIssue;                      // 拉黑那道门已经查过 KV 映射,不重复读
    if (existing === 0 && deviceId !== '') existing = await searchDeviceIssue_claudecode_20260908(ghToken, deviceId);

    if (existing > 0) {
      const app = await appendUserMessage_claudecode_20260908(ghToken, existing, bodyNoLog, log, logLines);
      if (app.ok) {
        mode = 'issue'; ghAction = 'comment#' + app.n; ticketId = existing;
        issueUrl = app.url; createdAt = app.issueCreatedAt || nowIso; cid = app.cid || 0;
      } else { ghErr = 'append status=' + app.status + ' ' + app.err; }
    }
    if (mode !== 'issue') {
      await ensureLabel(ghToken);
      const res = await gh(ghToken, 'POST', `/repos/${REPO}/issues`, { title, body: issueBody, labels: [LABEL] });
      if (res.ok && res.json && res.json.number) {
        mode = 'issue'; ghAction = 'new'; ticketId = res.json.number; cid = 0;
        issueUrl = res.json.html_url || ''; createdAt = res.json.created_at || nowIso;
        if (deviceId !== '' && kv) { try { await kv.put('ticket:' + deviceId, String(ticketId)); } catch (e) {} }
      } else { ghErr = (ghErr ? ghErr + ' | ' : '') + 'create status=' + res.status + ' ' + res.err; }
    }
  } else {
    ghErr = 'GitHub App 鉴权拿不到 installation token';
  }

  if (mode === 'queued') {
    ticketId = 'q' + stampId();
    if (kv) {
      try {
        await kv.put('fbq:' + ticketId, JSON.stringify({
          createdAt: nowIso, title, body: issueBody, desc, deviceId, status: 'pending',
        }), { expirationTtl: 30 * 24 * 3600 });
      } catch (e) { /* 队列也写不进去时仍返回 200,内容在发送记录里 */ }
    }
  }

  const token = await ticketToken(env.TICKET_SECRET, ticketId);
  await sendlog(kv, {
    api: 'contact', mode, id: String(ticketId), deviceId8: deviceId.slice(0, 8),
    to: mode === 'issue' ? 'GitHub issue #' + ticketId : '(排队中)',
    subject, bodyHead: desc.slice(0, 200), diag: diagPlain, log, logLines,
    result: ghAction !== '' ? 'GitHub ' + ghAction : 'GitHub 未成功,已排队',
    err: ghErr, issueUrl, reason: '',
    modSrc: '', modCat: '', modDetail: '', modMs: mod.wordMs, aiMs: mod.aiMs,
    aiState: mod.aiState, aiReason: mod.aiReason,
  }, keepBody);

  return json({ ok: true, ticket: { id: ticketId, token, createdAt, mode, cid } }, 200);
};

/**
 * 兜底:KV 映射里没有时问 GitHub 搜索。搜索索引有几十秒延迟,所以只是兜底不是主路径;
 * 这个 GitHub App 只有 issues:write / metadata:read,搜索用不用得了未经证实 ⇒ 失败不算错。
 * ★ 颗粒 7 把设备号挪进了 HTML 注释。GitHub 全文检索索引的是 issue 正文**原文**,
 *   注释里的字照样能搜到 —— 但这是"应该"不是"证明",本轮实测见回执 G7-SEARCH-COMMENT;
 *   即使它失效,主路径(KV `ticket:<deviceId>`)也不受影响。
 */
async function searchDeviceIssue_claudecode_20260908(token, deviceId) {
  const q = `repo:${REPO} label:${LABEL} "${deviceId}"`;
  const res = await gh(token, 'GET',
    '/search/issues?per_page=1&sort=created&order=desc&q=' + encodeURIComponent(q), null);
  if (!res.ok || !res.json || !Array.isArray(res.json.items) || res.json.items.length === 0) return 0;
  return parseInt(res.json.items[0].number, 10) || 0;
}

/** 往这台设备已有的 issue 追加 [用户消息 #n];issue 关着先 reopen。首帖算 #1。
 *  cid = 新评论的 GitHub 评论 id(App 的「有新回复红点」判据用它)。
 *  ★ 颗粒 7:传进来的 `bodyNoLog` 已经是新排版的 bodyCore(原话引用块在前、诊断折叠在后),
 *    且**不含 @提及** —— 评论本身就会通知 owner,再 @ 一次是重复打扰。 */
async function appendUserMessage_claudecode_20260908(token, issueNumber, bodyNoLog, log, logLines) {
  const base = `/repos/${REPO}/issues/${issueNumber}`;
  const issue = await gh(token, 'GET', base, null);
  if (!issue.ok || !issue.json) {
    return { ok: false, n: 0, cid: 0, url: '', issueCreatedAt: '', status: issue.status, err: issue.err };
  }
  const issueCreatedAt = issue.json.created_at || '';
  const issueUrl = issue.json.html_url || '';
  if (issue.json.state === 'closed') await gh(token, 'PATCH', base, { state: 'open' });

  let n = 2;
  const cmt = await gh(token, 'GET', base + '/comments?per_page=100', null);
  if (cmt.ok && Array.isArray(cmt.json)) {
    n = cmt.json.filter((c) => c && typeof c.body === 'string' && c.body.startsWith(USER_MSG_PREFIX_20260909)).length + 2;
  }

  let body = USER_MSG_PREFIX_20260909 + n + ']\n\n' + bodyNoLog;
  if (log !== '') body += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...body].length - 200);
  const res = await gh(token, 'POST', base + '/comments', { body });
  if (!res.ok || !res.json || !res.json.id) {
    return { ok: false, n, cid: 0, url: issueUrl, issueCreatedAt, status: res.status, err: res.err };
  }
  return { ok: true, n, cid: res.json.id, url: res.json.html_url || issueUrl, issueCreatedAt, status: res.status, err: '' };
}
