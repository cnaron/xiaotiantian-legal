// GET /api/feedback/sendlog?key=… —— 给 owner 看的发送记录页(不是 App 用的接口)。
// key = HMAC-SHA256(TICKET_SECRET, "sendlog") 前 32 位十六进制,与工单 token 同源
// ⇒ 换掉它 = 换 TICKET_SECRET = 已发出去的工单 token 全废(与 PHP 版同一条限制)。
// no-store + noindex,不会被搜索收录。 2026.09.08 Naron
import {
  RATE_MAX_20260908,
  NO_STORE_20260908, json_claudecode_20260908 as json,
  timingSafeEqual_claudecode_20260908 as tseq, clientIp_claudecode_20260908 as clientIp,
  hmacHex_claudecode_20260908 as hmacHex, rateAllow_claudecode_20260908 as rateAllow,
} from '../../_lib/feedback.js';

const MAX_ROWS_20260908 = 200;

export const onRequestGet = async ({ request, env }) => {
  const kv = env.LEGAL_CONTENT || null;
  if (!(await rateAllow(kv, clientIp(request), 'sendlog', RATE_MAX_20260908.sendlog))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }
  const want = env.TICKET_SECRET ? (await hmacHex(env.TICKET_SECRET, 'sendlog')).slice(0, 32) : '';
  const got = new URL(request.url).searchParams.get('key') || '';
  if (want === '' || !tseq(want, got)) return json({ ok: false, err: 'forbidden' }, 403);
  if (!kv) return json({ ok: false, err: 'kv_unavailable' }, 500);

  const testMode = (await kv.get('feedback:test_mode').catch(() => '')) === 'on';
  const logBody = ((await kv.get('feedback:log_body').catch(() => '')) || 'on') !== 'off';

  const listed = await kv.list({ prefix: 'sendlog:', limit: 1000 });
  // key 里的毫秒时间戳定长 ⇒ 字典序 = 时间序;倒序取最近 MAX_ROWS 条
  const names = listed.keys.map((k) => k.name).sort().reverse().slice(0, MAX_ROWS_20260908);
  const rows = [];
  for (let i = 0; i < names.length; i += 20) {
    const chunk = await Promise.all(names.slice(i, i + 20).map((n) => kv.get(n).catch(() => null)));
    for (const raw of chunk) {
      if (!raw) continue;
      try { rows.push(JSON.parse(raw)); } catch (e) { /* 坏行跳过 */ }
    }
  }

  return new Response(html_claudecode_20260908(rows, listed.keys.length, testMode, logBody), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE_20260908 },
  });
};

/**
 * 审核那一行。**不做解封按钮**(owner 令:解封 = 去 GitHub 把 `blocked` 标签撕掉)——
 * 一个能在这一页解封的按钮,等于把这页的口令变成"能改惩罚状态"的口令,量级不一样。
 */
function modRow_claudecode_20260909(r) {
  if (!r.modSrc && !r.aiState) return '';
  const src = r.modSrc === 'word' ? '关键词库' : (r.modSrc === 'ai' ? 'Workers AI' : '(未命中)');
  const cat = r.modCat ? h_claudecode_20260908(r.modCat + ' ' + catName_claudecode_20260909(r.modCat)) : '-';
  const ai = r.aiState === 'unavailable' ? `<b>ai_unavailable</b> —— ${h_claudecode_20260908(r.aiReason || '')}`
    : (r.aiState === 'skipped' ? '未调用(词表已拦下)' : 'ok');
  return `<dt>审核</dt><dd>来源 ${h_claudecode_20260908(src)} · 类别 ${cat}
    · 命中 ${h_claudecode_20260908(r.modDetail || '-')}<br>
    AI ${ai} · 词表 ${h_claudecode_20260908(r.modMs ?? '-')} ms · AI ${h_claudecode_20260908(r.aiMs ?? '-')} ms</dd>`;
}

/** 类别码 → 中文。这一页是**只读展示**,故意把表抄一份在这儿而不是 import 审核模块 —— 展示页不该有能力去做判定。 */
function catName_claudecode_20260909(cat) {
  const m = {
    abuse: '辱骂脏话', porn: '色情招揽', gambling: '赌博', drug: '毒品',
    fraud: '诈骗黑产', ad: '广告导流', politics: '政治敏感',
    S1: '暴力犯罪', S2: '非暴力犯罪', S3: '性犯罪', S4: '儿童性剥削',
    S9: '无差别武器', S10: '仇恨', S11: '自杀自残', S12: '色情内容',
  };
  return String(cat || '').split('+').map((c) => m[c] || c).join(' / ');
}

function h_claudecode_20260908(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** ISO(UTC)→ 北京时间可读串 */
function bj_claudecode_20260908(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return h_claudecode_20260908(iso);
  return new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function html_claudecode_20260908(rows, total, testMode, logBody) {
  const banner = testMode
    ? '<div class="b off">总闸 <code>feedback:test_mode=on</code> —— <b>所有提交都不开工单</b>,只记在这一页,保留 30 天。上架前记得关掉。</div>'
    : '<div class="b on">总闸关着 —— 提交会真的开 GitHub 工单(owner 收 GitHub 通知)。</div>';
  const privacy = logBody
    ? '<div class="b warn"><code>feedback:log_body=on</code>:这一页会保存用户反馈正文与 App 日志 30 天。要只记元信息,把这个 KV 键设成 <code>off</code>。</div>'
    : '<div class="b on"><code>feedback:log_body=off</code>:只记元信息,不落用户正文与日志。</div>';

  const items = rows.map((r) => {
    const badge = h_claudecode_20260908(r.mode || '-');
    const link = r.issueUrl ? ` · <a href="${h_claudecode_20260908(r.issueUrl)}" rel="noreferrer noopener">工单</a>` : '';
    const bad = (r.mode === 'rejected' || r.mode === 'blocked') ? ' class="bad"' : '';
    return `<details${bad}><summary><span class="t">${bj_claudecode_20260908(r.at)}</span>
      <span class="m ${badge}">${badge}</span>
      <span class="a">${h_claudecode_20260908(r.api || '-')}</span>
      <span class="i">${h_claudecode_20260908(r.id || '-')}</span>
      <span class="d">${h_claudecode_20260908(r.deviceId8 || '')}</span>${
      r.modCat ? `<span class="cat">${h_claudecode_20260908(catName_claudecode_20260909(r.modCat))}</span>` : ''}</summary>
      <dl>
        <dt>标题</dt><dd>${h_claudecode_20260908(r.subject)}</dd>
        <dt>去向</dt><dd>${h_claudecode_20260908(r.to)}${link}</dd>
        <dt>结果</dt><dd>${h_claudecode_20260908(r.result)}${r.err ? ' — <b>' + h_claudecode_20260908(r.err) + '</b>' : ''}</dd>
        <dt>原因</dt><dd>${h_claudecode_20260908(r.reason || '-')}</dd>
      ${modRow_claudecode_20260909(r)}
        <dt>正文前 200 字</dt><dd><pre>${h_claudecode_20260908(r.bodyHead)}</pre></dd>
        <dt>诊断</dt><dd><pre>${h_claudecode_20260908(r.diag)}</pre></dd>
      </dl>
      ${r.log ? `<details><summary>App 日志(${h_claudecode_20260908(r.logLines || 0)} 行)</summary><pre>${h_claudecode_20260908(r.log)}</pre></details>` : ''}
    </details>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>反馈发送记录</title><style>
:root{color-scheme:light dark}
body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;margin:0;padding:16px;max-width:900px}
h1{font-size:19px;margin:0 0 12px}
.b{padding:10px 12px;border-radius:8px;margin:0 0 10px;font-size:14px}
.b.on{background:#e8f5e9;color:#1b5e20}.b.off{background:#fff3e0;color:#e65100}.b.warn{background:#fffde7;color:#827717}
details{border:1px solid #ddd;border-radius:8px;margin:6px 0;padding:6px 10px}
summary{cursor:pointer;white-space:nowrap;overflow-x:auto;display:block}
.t{font-variant-numeric:tabular-nums;color:#555}
.m{display:inline-block;padding:0 6px;border-radius:4px;font-size:12px;background:#eee;margin:0 6px}
.m.issue{background:#c8e6c9}.m.test{background:#ffe0b2}.m.queued{background:#e1bee7}
.m.rejected{background:#ffcdd2;color:#b71c1c;font-weight:600}.m.blocked{background:#b71c1c;color:#fff;font-weight:600}
details.bad{border-color:#e57373;background:#fff5f5}
.cat{display:inline-block;padding:0 6px;border-radius:4px;background:#ffcdd2;color:#b71c1c;font-size:12px;margin-left:6px}
.a{color:#0066cc;margin-right:6px}.i{font-weight:600;margin-right:6px}.d{color:#888;font-size:12px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:8px 0}
dt{color:#666;font-size:13px}dd{margin:0;min-width:0}
pre{white-space:pre-wrap;word-break:break-word;background:#f6f6f6;padding:8px;border-radius:6px;margin:0;font-size:13px}
@media(prefers-color-scheme:dark){body{background:#111;color:#eee}details{border-color:#333}pre{background:#1c1c1c}
.b.on{background:#14301a;color:#a5d6a7}.b.off{background:#3a2a10;color:#ffcc80}.b.warn{background:#33320f;color:#e6ee9c}
.m{background:#333}.m.issue{background:#1b5e20}.m.test{background:#e65100}.m.queued{background:#4a148c}
.m.rejected{background:#7f1d1d;color:#ffcdd2}.m.blocked{background:#b71c1c;color:#fff}
details.bad{border-color:#7f1d1d;background:#2a1414}.cat{background:#7f1d1d;color:#ffcdd2}}
</style></head><body>
<h1>反馈发送记录 · 小天天练跳绳</h1>
${banner}${privacy}
<p style="font-size:13px;color:#888">显示最近 ${rows.length} 条(库里共 ${total} 条,保留 30 天)。后端 = Cloudflare Pages Functions + GitHub App。</p>
${items || '<p>还没有记录。</p>'}
</body></html>`;
}
