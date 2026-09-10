// POST /api/feedback/contact —— 提交反馈 ⇒ 开 GitHub issue / 追加到本设备已有的 issue。
//
// ★★★ X129 颗粒 C1(owner 2026-09-10 12:10 改口径)—— **契约改成单向**:
//   owner 原话:「① 不限制用户发送,想发就发,点击发送立即响应,审核在过程中处理,不需要让
//   用户感知;② KV 不需要记录,因为不需要给用户回复,自然也不需要过程消息展示;③ 处理审核后
//   的消息还是留到 GitHub 的 issues 里,用唯一 ID 追加写入;④ 之后 AI 批量处理用户消息,
//   解决后的 issue 回复不同步到 App,只是备份记录。用户只管发,我们只管查收和部分解决,
//   不作响应处理。」
//
//   落到代码上是三件事:
//   ① **立即 200**:只校验 key 与「描述非空」,随即返回 `{"ok":true}`;审核 / 定位 / 开单 /
//      追加评论**全部**进 `context.waitUntil(...)`。响应体里**不再有** ticket 号、token、
//      mode、cid —— App 不读它们了(线 A 的 X129-G3 同步改 App)。
//   ② **KV 不存消息**:发送记录(`sendlog:*`)、测试件(`fbtest:*`)、降级队列(`fbq:*`)
//      三处写入**全删**。KV 里与「联系我们」有关的只剩 `ticket:<deviceId>` → issue 号
//      这一条**索引**(它不是消息,是「同一台设备的话要接在同一个 issue 后面」的定位手段;
//      GitHub 搜索索引有几十秒延迟,当不了主路径),外加限流窗口与鉴权缓存。
//   ③ **用户永远看不到失败**:限流、拉黑、审核不过一律「200 + 静默丢弃」。这是 owner 明确
//      要的「不需要让用户感知」。**代价**:后台丢了就是丢了,用户和 owner 都不会知道
//      —— 旧版至少还有发送记录页能查。登记在 PREREG-X129-C1.md §4。
//   ★ 静默上限**保留**(用户看不见):全局日限 + 单设备窗口,数值沿用现值,只为不把 GitHub /
//      Workers AI 的免费额度打爆。数值待 owner 确认,见回执。
//   2026.09.10 Naron
//
// —— 以下是仍然有效的历史设计说明 ——
// X123 颗粒 7:issue 排版 —— 标题 = 用户原话(去换行、超 60 字加「…」);正文第一屏 = 用户原话
//   (引用块 + 大字号),元数据全部收进「设备与诊断信息」折叠块;设备号放 HTML 注释首行
//   (页面上看不见,GitHub 全文搜索照样命中,兜底那条 searchDeviceIssue 靠它)。
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
  rateAllow_claudecode_20260908 as rateAllow, globalDayAllow_claudecode_20260908 as globalDayAllow,
  testModeReason_claudecode_20260910 as testModeReason,
  TICKET_LOCK_PREFIX_20260910, TICKET_LOCK_TTL_SEC_20260910,
  deviceIssueWaitingLock_claudecode_20260910 as deviceIssueWaitingLock,
} from '../../_lib/feedback.js';
import { jwsInspect_claudecode_20260908 as jwsInspect } from '../../_lib/applejws.js';
import {
  isBlocked_claudecode_20260909 as isBlocked,
  moderate_claudecode_20260909 as moderate,
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

/**
 * ★ 前台只做三件事:验 key、收下请求体、确认用户真写了字。做完立刻回 `{"ok":true}`。
 *   为什么保留 403/400 而不是「一律 200」:这两条**不是用户行为的判决**,是「这个请求根本
 *   不是我们的 App 发出来的 / 是个空包」。App 自己发的请求永远走不到这两条,用户感知不到;
 *   而把它们也压成 200 会让线 A 调试时分不清「发出去了」和「打错地址了」。
 */
export const onRequestPost = async (context) => {
  const { request, env } = context;
  const kv = env.LEGAL_CONTENT || null;

  // ① key —— 缺或错一律 403,不区分(不给扫描者反馈)
  // key 只认 Pages secret;secret 缺席 ⇒ 全拒(不给默认值,见 _lib/feedback.js 顶部)
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }

  // ② 请求体
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

  // ③ 其余全部异步。请求头在这儿先读出来 —— 异步那段跑起来时 request 已经交出去了,
  //    再去碰它是自找麻烦。
  const testHeader = (request.headers.get('x-rc-test') || '') === '1';
  context.waitUntil(deliver_claudecode_20260910(env, kv, data, desc, testHeader));

  // ④ 立即返回。**只有 ok 一个字段** —— 没有工单号/token/状态,App 不需要,也没地方去读了。
  return json({ ok: true }, 200);
};

/**
 * 后台那一段:静默上限 → 拉黑 → 预审 → 开单 / 追加评论。
 *
 * ★ 全程**不返回任何东西给用户**,也**不写任何消息进 KV**。任何一步不通过就直接 return
 *   —— 不留痕、不排队、不给理由(owner:不需要过程记录)。唯一会写 KV 的是最后那句
 *   `ticket:<deviceId>` 映射。
 * ★ 永远不抛:`waitUntil` 里抛出去没人接,还会在 Cloudflare 面板上刷一堆异常。
 */
async function deliver_claudecode_20260910(env, kv, data, desc, testHeader) {
  try {
    // ⓪ 静默上限 —— 用户看不见(前面已经回过 200 了)。存在的唯一理由是保护免费额度:
    //    GitHub API、Workers AI neurons、KV 写次数都是有限的。数值一个没动。
    if (!(await globalDayAllow(kv))) return;
    const deviceId = cleanDeviceId(data.deviceId);
    if (!(await rateAllow(kv, deviceId || RATE_SUBJECT_NONE_20260909, 'contact', RATE_MAX_20260908.contact))) return;

    // ① 这台设备已有的 issue(KV 索引,主路径)。读到「开单中」的锁就等一会儿再读。
    const myIssue = await deviceIssueWaitingLock(kv, deviceId);
    const ghTokenForGate = myIssue > 0 ? await installationToken(env, kv) : '';

    // ② 拉黑 —— owner 在 GitHub 上给这条 issue 贴 `blocked` 标签 ⇒ 这台设备的话不再落地。
    //    ★ 放在预审**之前**:被拉黑的人不该再消耗一次 AI 额度。
    //    ★ X129-C1 起**只认 GitHub 标签**,KV 上那把 `block:<deviceId>` 锁连同「连拒三次
    //      自动拉黑」一起撤了 —— 自动拉黑要在 KV 里记拒绝次数,而这一轮 KV 不留过程记录。
    const blk = await isBlocked(kv, ghTokenForGate, { deviceId, issue: myIssue });
    if (blk.blocked) return;

    // ③ 预审 —— 只审用户自己写的那段话(不审日志、不审元信息:那些是我们自己拼的)。
    //    不过就**静默丢弃**:不开单、不评论、不留记录。
    const mod = await moderate(env.AI, desc);
    if (!mod.ok) return;

    // ④ 测试模式:不调 GitHub。**也不再存测试件** —— 存测试件就是存消息。
    if (await testModeReason(testHeader, kv)) return;

    // ⑤ 组装
    const contactWay = clean(data.contact, CONTACT_MAX_20260908, true);
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

    const title = titleFromDesc(desc, '[反馈] ' + bj_claudecode_20260908(false));
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

    const folds = jws.present ? '\n' + jwsDetails(jwsRaw, jws) : '';
    // bodyCore 不含 @提及:它同时用于「新开 issue」和「追加评论」,评论里再 @ 一次是重复打扰
    const bodyCore = quoteDesc(desc) + '\n\n'
      + '**联系方式**:' + (contactWay !== '' ? contactWay : '(用户未填)') + '\n\n'
      + diagDetails(diagRows) + folds;
    let issueBody = deviceMark(deviceId) + '\n' + OWNER_MENTION_20260908 + '\n\n' + bodyCore;
    if (log !== '') issueBody += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...issueBody].length - 200);

    // ⑥ 落到 GitHub。拿不到 token 就**丢掉**(旧版会排队进 KV,那是存消息,已撤)。
    const ghToken = ghTokenForGate !== '' ? ghTokenForGate : await installationToken(env, kv);
    if (ghToken === '') return;

    let existing = myIssue;                      // 拉黑那道门已经查过 KV 映射,不重复读
    if (existing === 0 && deviceId !== '') existing = await searchDeviceIssue_claudecode_20260908(ghToken, deviceId);

    if (existing > 0) {
      const app = await appendUserMessage_claudecode_20260908(ghToken, existing, bodyCore, log, logLines);
      if (app.ok) {
        // 兜底搜出来的号也补进索引,下次就走主路径
        if (deviceId !== '' && kv && existing !== myIssue) {
          try { await kv.put('ticket:' + deviceId, String(existing)); } catch (e) {}
        }
        return;
      }
      // 追加失败(issue 被删/被转成 PR 之类)⇒ 往下走,开一条新的
    }
    // ★ 开新单之前先占位(理由见 TICKET_LOCK_PREFIX_20260910 上面那段)
    const takeLock = deviceId !== '' && kv;
    if (takeLock) {
      try {
        await kv.put('ticket:' + deviceId, TICKET_LOCK_PREFIX_20260910 + Date.now(),
          { expirationTtl: TICKET_LOCK_TTL_SEC_20260910 });
      } catch (e) { /* 占不上就照常开,最坏退回到「可能开两条」 */ }
    }
    await ensureLabel(ghToken);
    const res = await gh(ghToken, 'POST', `/repos/${REPO}/issues`, { title, body: issueBody, labels: [LABEL] });
    if (takeLock) {
      try {
        if (res.ok && res.json && res.json.number) await kv.put('ticket:' + deviceId, String(res.json.number));
        else await kv.delete('ticket:' + deviceId);   // 开单没成 ⇒ 把锁撤掉,别卡住这台设备
      } catch (e) {}
    }
  } catch (e) {
    // 后台链路里任何意外都到此为止:用户早就拿到 200 了,这里再抛只会污染日志
  }
}

/**
 * 兜底:KV 映射里没有时问 GitHub 搜索。搜索索引有几十秒延迟,所以只是兜底不是主路径;
 * 这个 GitHub App 只有 issues:write / metadata:read,搜索用不用得了未经证实 ⇒ 失败不算错。
 * ★ 设备号在 issue 正文的 HTML 注释里(`<!-- device: … -->`),GitHub 全文检索索引的是原文。
 */
async function searchDeviceIssue_claudecode_20260908(token, deviceId) {
  const q = `repo:${REPO} label:${LABEL} "${deviceId}"`;
  const res = await gh(token, 'GET',
    '/search/issues?per_page=1&sort=created&order=desc&q=' + encodeURIComponent(q), null);
  if (!res.ok || !res.json || !Array.isArray(res.json.items) || res.json.items.length === 0) return 0;
  return parseInt(res.json.items[0].number, 10) || 0;
}

/** 往这台设备已有的 issue 追加 [用户消息 n];issue 关着先 reopen。首帖算 #1。
 *  ★ 传进来的 `bodyNoLog` 是新排版的 bodyCore(原话引用块在前、诊断折叠在后),
 *    且**不含 @提及** —— 评论本身就会通知 owner,再 @ 一次是重复打扰。 */
async function appendUserMessage_claudecode_20260908(token, issueNumber, bodyNoLog, log, logLines) {
  const base = `/repos/${REPO}/issues/${issueNumber}`;
  const issue = await gh(token, 'GET', base, null);
  if (!issue.ok || !issue.json) return { ok: false, n: 0 };
  if (issue.json.state === 'closed') await gh(token, 'PATCH', base, { state: 'open' });

  let n = 2;
  const cmt = await gh(token, 'GET', base + '/comments?per_page=100', null);
  if (cmt.ok && Array.isArray(cmt.json)) {
    n = cmt.json.filter((c) => c && typeof c.body === 'string' && c.body.startsWith(USER_MSG_PREFIX_20260909)).length + 2;
  }

  let body = USER_MSG_PREFIX_20260909 + n + ']\n\n' + bodyNoLog;
  if (log !== '') body += '\n' + logDetails(log, logLines, GH_BODY_MAX_20260908 - [...body].length - 200);
  const res = await gh(token, 'POST', base + '/comments', { body });
  return { ok: !!(res.ok && res.json && res.json.id), n };
}
