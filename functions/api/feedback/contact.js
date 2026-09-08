// POST /api/feedback/contact —— 提交反馈 ⇒ 开 GitHub issue / 追加到本设备已有的 issue。
// 契约 = gugushizi-server/docs/X123-G2-TICKETS-20260908.md §2.1(行为对 App 必须一致)。
// 与 PHP 版的区别:不发邮件(GitHub App 开的 issue 会给 owner 发通知),队列存 KV 不存文件。
// 2026.09.08 Naron
import {
  RC_KEY_FALLBACK_20260908, RATE_MAX_20260908, BODY_MAX_BYTES_20260908,
  DESC_MAX_20260908, CONTACT_MAX_20260908, META_MAX_20260908, GH_BODY_MAX_20260908,
  USER_MSG_PREFIX_20260908, OWNER_MENTION_20260908,
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, maskIp_claudecode_20260908 as maskIp,
  clean_claudecode_20260908 as clean, cleanDeviceId_claudecode_20260908 as cleanDeviceId,
  cleanJws_claudecode_20260908 as cleanJws, cleanLog_claudecode_20260908 as cleanLog,
  planText_claudecode_20260908 as planText, sessionText_claudecode_20260908 as sessionText,
  permissionText_claudecode_20260908 as permissionText, paymentText_claudecode_20260908 as paymentText,
  channelText_claudecode_20260908 as channelText, jwsDetails_claudecode_20260908 as jwsDetails,
  logDetails_claudecode_20260908 as logDetails,
  ticketToken_claudecode_20260908 as ticketToken,
  rateAllow_claudecode_20260908 as rateAllow, globalDayAllow_claudecode_20260908 as globalDayAllow,
  testModeReason_claudecode_20260908 as testModeReason, logBodyOn_claudecode_20260908 as logBodyOn,
  stampId_claudecode_20260908 as stampId, sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import { jwsInspect_claudecode_20260908 as jwsInspect } from '../../_lib/applejws.js';
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
  const ip = clientIp(request);

  // ① key —— 缺或错一律 403,不区分(不给扫描者反馈)
  if (!tseq(env.RC_KEY || RC_KEY_FALLBACK_20260908, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  // ② 限流 —— 放在参数校验之前:任何一次尝试(哪怕参数错)都计数
  if (!(await globalDayAllow(kv))) return json({ ok: false, err: 'rate_limited' }, 429);
  if (!(await rateAllow(kv, ip, 'contact', RATE_MAX_20260908.contact))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }

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
  const desc = clean(data.desc, DESC_MAX_20260908, false);
  if (desc === '') return json({ ok: false, err: 'bad_request' }, 400);

  const contactWay = clean(data.contact, CONTACT_MAX_20260908, true);
  const appName = clean(data.app, META_MAX_20260908, true);
  const version = clean(data.version, META_MAX_20260908, true);
  const build = clean(data.build, META_MAX_20260908, true);
  const device = clean(data.device, META_MAX_20260908, true);
  const os = clean(data.os, META_MAX_20260908, true);
  const locale = clean(data.locale, META_MAX_20260908, true);
  const deviceId = cleanDeviceId(data.deviceId);
  const jwsRaw = cleanJws(data.channel && data.channel.appTransactionJWS);
  const jws = await jwsInspect(jwsRaw);
  const chanText = channelText(data.channel, jws);
  const log = cleanLog(data.log);
  const logLines = log === '' ? 0 : log.split('\n').length;

  // ④ 组装
  const nowIso = new Date().toISOString();
  const title = '[反馈] ' + bj_claudecode_20260908(false) + ' · ' + (device !== '' ? device : '未知机型')
    + ' · b' + (build !== '' ? build : '-')
    + (deviceId !== '' ? ' · ' + deviceId.slice(0, 8) : '');

  // 首行固定 device: <deviceId> —— KV 映射丢了还能靠 GitHub 搜索找回这台设备的 issue
  const header = 'device: ' + (deviceId !== '' ? deviceId : '(未提供)') + '\n'
    + 'channel: ' + chanText.kind + ' · verified: ' + (jws.verified ? 'yes' : 'no')
    + ' · env: ' + (chanText.env !== '' ? chanText.env : 'unknown') + '\n'
    + OWNER_MENTION_20260908 + ' 有新的用户反馈。\n\n';

  const meta = '【联系方式】' + (contactWay !== '' ? contactWay : '(用户未填)') + '\n'
    + '【App 版本】' + (version !== '' ? version : '-') + ' (build ' + (build !== '' ? build : '-') + ')\n'
    + '【机型 / 系统 / 语言】' + (device !== '' ? device : '-') + ' / ' + (os !== '' ? os : '-') + ' / ' + (locale !== '' ? locale : '-') + '\n'
    + '【会员档】' + planText(data.plan) + '\n'
    + '【付费】' + paymentText(data.payment) + '\n'
    + '【渠道】' + chanText.detail + '\n'
    + '【最近一局】' + sessionText(data.lastSession) + '\n'
    + '【权限】' + permissionText(data.permissions) + '\n'
    + '【提交时间】' + bj_claudecode_20260908(true) + '\n'
    + '【来源 IP】' + maskIp(ip);

  const folds = jws.present ? '\n' + jwsDetails(jwsRaw, jws) : '';
  const bodyNoLog = header + '【问题描述】\n' + desc + '\n\n' + meta + '\n' + folds;
  let issueBody = bodyNoLog;
  if (log !== '') issueBody += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...issueBody].length - 200);

  const keepBody = await logBodyOn(kv);
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
      diag: header + meta, log, logLines, result: 'ok(test)', err: '', issueUrl: '', reason: testReason,
    }, keepBody);
    return json({ ok: true, ticket: { id: ticketId, token, createdAt: nowIso, mode: 'test' } }, 200);
  }

  // ⑤ 开工单 / 追加到这台设备已有的工单;拿不到 token 就降级排队,对用户不报错
  const ghToken = await installationToken(env, kv);
  let mode = 'queued', ticketId = '', createdAt = nowIso, issueUrl = '', ghAction = '', ghErr = '';

  if (ghToken !== '') {
    let existing = 0;
    if (deviceId !== '' && kv) {
      try { existing = parseInt((await kv.get('ticket:' + deviceId)) || '0', 10) || 0; } catch (e) { existing = 0; }
    }
    if (existing === 0 && deviceId !== '') existing = await searchDeviceIssue_claudecode_20260908(ghToken, deviceId);

    if (existing > 0) {
      const app = await appendUserMessage_claudecode_20260908(ghToken, existing, bodyNoLog, log, logLines);
      if (app.ok) {
        mode = 'issue'; ghAction = 'comment#' + app.n; ticketId = existing;
        issueUrl = app.url; createdAt = app.issueCreatedAt || nowIso;
      } else { ghErr = 'append status=' + app.status + ' ' + app.err; }
    }
    if (mode !== 'issue') {
      await ensureLabel(ghToken);
      const res = await gh(ghToken, 'POST', `/repos/${REPO}/issues`, { title, body: issueBody, labels: [LABEL] });
      if (res.ok && res.json && res.json.number) {
        mode = 'issue'; ghAction = 'new'; ticketId = res.json.number;
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
    subject, bodyHead: desc.slice(0, 200), diag: header + meta, log, logLines,
    result: ghAction !== '' ? 'GitHub ' + ghAction : 'GitHub 未成功,已排队',
    err: ghErr, issueUrl, reason: '',
  }, keepBody);

  return json({ ok: true, ticket: { id: ticketId, token, createdAt, mode } }, 200);
};

/**
 * 兜底:KV 映射里没有时问 GitHub 搜索。搜索索引有几十秒延迟,所以只是兜底不是主路径;
 * 这个 GitHub App 只有 issues:write / metadata:read,搜索用不用得了未经证实 ⇒ 失败不算错。
 */
async function searchDeviceIssue_claudecode_20260908(token, deviceId) {
  const q = `repo:${REPO} label:${LABEL} "${deviceId}"`;
  const res = await gh(token, 'GET',
    '/search/issues?per_page=1&sort=created&order=desc&q=' + encodeURIComponent(q), null);
  if (!res.ok || !res.json || !Array.isArray(res.json.items) || res.json.items.length === 0) return 0;
  return parseInt(res.json.items[0].number, 10) || 0;
}

/** 往这台设备已有的 issue 追加 [用户消息 #n];issue 关着先 reopen。首帖算 #1。 */
async function appendUserMessage_claudecode_20260908(token, issueNumber, bodyNoLog, log, logLines) {
  const base = `/repos/${REPO}/issues/${issueNumber}`;
  const issue = await gh(token, 'GET', base, null);
  if (!issue.ok || !issue.json) {
    return { ok: false, n: 0, url: '', issueCreatedAt: '', status: issue.status, err: issue.err };
  }
  const issueCreatedAt = issue.json.created_at || '';
  const issueUrl = issue.json.html_url || '';
  if (issue.json.state === 'closed') await gh(token, 'PATCH', base, { state: 'open' });

  let n = 2;
  const cmt = await gh(token, 'GET', base + '/comments?per_page=100', null);
  if (cmt.ok && Array.isArray(cmt.json)) {
    n = cmt.json.filter((c) => c && typeof c.body === 'string' && c.body.startsWith(USER_MSG_PREFIX_20260908)).length + 2;
  }

  let body = USER_MSG_PREFIX_20260908 + n + ']\n\n' + bodyNoLog;
  if (log !== '') body += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...body].length - 200);
  const res = await gh(token, 'POST', base + '/comments', { body });
  if (!res.ok || !res.json || !res.json.id) {
    return { ok: false, n, url: issueUrl, issueCreatedAt, status: res.status, err: res.err };
  }
  return { ok: true, n, url: res.json.html_url || issueUrl, issueCreatedAt, status: res.status, err: '' };
}
