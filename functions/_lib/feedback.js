// 「联系我们」工单后端的公共件:清洗 / token / 限流 / issue 正文组装 / 发送记录。
// 接口契约沿用 X123 颗粒 2 定下的那一份(行为对 App 必须一致);那一版跑在 App server 的 PHP 上,
// **已由本文件所在的 Cloudflare 版完整取代**,本后端不依赖任何 App server / 旧域名。
// 2026.09.08 Naron
// ⚠️ 这里**不放**任何默认 key:本仓库是公开仓库,写死在这儿等于把 App 的请求头公之于众。
// key 只从 Pages secret `RC_KEY` 读;secret 没配 ⇒ 所有请求 403(宁可全拒,不可默认放行)。
// 2026-09-08 轮换过一次:上一版 key 曾被我误提交进这个公开仓库(history 里还有),
// 现役 key 只在 Pages secret 与交接文件里。 2026.09.08 Naron
export const RATE_WINDOW_SEC_20260908 = 600;
// X129-C1:thread / reply / sendlog 三条路由已下线 ⇒ 只剩 contact 一个桶。
// ★ 这个上限现在是**静默**的:超了不再回 429,而是「照回 200,后台把这条丢掉」。
export const RATE_MAX_20260908 = { contact: 5 };
export const RATE_GLOBAL_DAY_20260908 = 300;
// 主体拿不到时(比如请求体里没带设备编号)共用这一个桶 —— 宁可几个人挤一个窗口,也不回头去认 IP。
export const RATE_SUBJECT_NONE_20260909 = 'nodev';
export const BODY_MAX_BYTES_20260908 = 131072;      // 128 KB
export const DESC_MAX_20260908 = 200;
export const CONTACT_MAX_20260908 = 80;
export const META_MAX_20260908 = 64;
export const LOG_MAX_BYTES_20260908 = 65536;        // 64 KB
export const JWS_MAX_BYTES_20260908 = 32768;
export const DEVICE_ID_MAX_20260908 = 64;
export const GH_BODY_MAX_20260908 = 60000;
/**
 * 追加消息的前缀。
 * ★ X123 颗粒 7 去掉了井号:旧写法 `[用户消息 #2]` 里的 `#2` 会被 GitHub **自动链成
 *   「引用 issue #2」** —— 每追加一次,就在编号恰好撞上的那条老工单下面留一条交叉引用,
 *   等于拿别人的工单当留言板(截图上一眼就看到 `#2` 是蓝色链接)。
 * ★ 新前缀是旧前缀的**真前缀**(旧的 = 新的 + `#`),所以 `startsWith(新)` 对
 *   **老评论也成立** —— 分类和计数一行都不用写兼容分支。旧常量保留只为文档,不再用于生成。
 * 2026.09.09 Naron
 */
export const USER_MSG_PREFIX_20260909 = '[用户消息 ';
/** @deprecated 旧生成格式(带井号),只用于说明;匹配一律用 USER_MSG_PREFIX_20260909 */
export const USER_MSG_PREFIX_20260908 = '[用户消息 #';
export const OWNER_MENTION_20260908 = '@cnaron';

// ── X123 颗粒 7:issue 排版重做(owner 真机试用 issue #7 后当场提的)────────────
// 旧排版把「时间·机型·build·设备前 8」当标题、用户原话埋在第 5 行的【问题描述】里,
// owner 在 GitHub 通知列表上**看不到用户到底说了什么**。新排版:标题 = 用户原话,
// 正文第一屏 = 用户原话(引用块 + 大字号),所有抓来的元数据收进折叠块。
export const TITLE_MAX_20260909 = 60;                 // 标题取原话前 60 字,超了加「…」
export const DESC_MARK_BEGIN_20260909 = '<!-- rc:desc:begin -->';
export const DESC_MARK_END_20260909 = '<!-- rc:desc:end -->';
export const DESC_QUOTE_PREFIX_20260909 = '> ';       // 每行都加
export const DESC_HEAD_PREFIX_20260909 = '### ';      // 只加在第一行(渲染成大字号)
export const DEVICE_MARK_PREFIX_20260909 = '<!-- device: ';
export const DEVICE_MARK_SUFFIX_20260909 = ' -->';

const enc = new TextEncoder();

export const NO_STORE_20260908 = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json_claudecode_20260908(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE_20260908, ...extra },
  });
}

export function timingSafeEqual_claudecode_20260908(a, b) {
  const A = enc.encode(String(a)), B = enc.encode(String(b));
  let diff = A.length ^ B.length;
  const n = Math.max(A.length, B.length, 1);
  for (let i = 0; i < n; i++) diff |= (A[i % A.length || 0] || 0) ^ (B[i % B.length || 0] || 0);
  return diff === 0;
}

// ── 清洗 ───────────────────────────────────────────────────────────────
// 控制字符:除 \n \t 外全去掉(与 PHP 版同一张表)
const CTRL_20260908 = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** 去 HTML 标签 + 去控制字符 + 截断;singleLine 时连换行也换成空格(防头注入) */
export function clean_claudecode_20260908(value, maxChars, singleLine) {
  if (value === null || value === undefined || typeof value === 'object' || typeof value === 'function') return '';
  let s = String(value).replace(/<[^>]*>/g, '');
  s = s.replace(CTRL_20260908, '');
  s = singleLine ? s.replace(/[\r\n\t]/g, ' ') : s.replace(/\r\n/g, '\n');
  s = s.trim();
  return [...s].slice(0, maxChars).join('');
}

export function cleanDeviceId_claudecode_20260908(v) {
  if (v === null || v === undefined || typeof v === 'object' || typeof v === 'function') return '';
  return String(v).replace(/[^0-9A-Za-z-]/g, '').slice(0, DEVICE_ID_MAX_20260908);
}

export function cleanJws_claudecode_20260908(v) {
  if (v === null || v === undefined || typeof v === 'object' || typeof v === 'function') return '';
  const s = String(v).trim();
  if (s === '' || enc.encode(s).length > JWS_MAX_BYTES_20260908) return '';
  return /^[A-Za-z0-9_\-.]+$/.test(s) ? s : '';
}

/** App 日志:去控制字符(留 \n)、按字节保留尾部、拆掉会破坏 markdown 代码块的三连反引号 */
export function cleanLog_claudecode_20260908(log) {
  if (log === null || log === undefined || typeof log === 'object' || typeof log === 'function') return '';
  let s = String(log).replace(/\r\n/g, '\n').replace(CTRL_20260908, '');
  const bytes = enc.encode(s);
  if (bytes.length > LOG_MAX_BYTES_20260908) {
    s = new TextDecoder().decode(bytes.subarray(bytes.length - LOG_MAX_BYTES_20260908));
    s = s.replace(/^�+/, '');            // 从半个字符切开的话开头会出替换符
  }
  return s.replace(/```/g, "'''").trim();
}

// ── 文本组装(与 PHP 版逐字对齐,App 拿到的 body 才不会变) ─────────────
export function planText_claudecode_20260908(plan) {
  const map = { free: 'free(免费)', '1y': '1y(一年)', '3y': '3y(三年)', forever: 'forever(永久)' };
  const k = (plan === null || plan === undefined || typeof plan === 'object') ? '' : String(plan);
  return map[k] || '-';
}

export function sessionText_claudecode_20260908(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return '-';
  const parts = [];
  const mode = clean_claudecode_20260908(s.mode, 32, true);
  if (mode !== '') parts.push(mode);
  if (typeof s.durationSec === 'number' && s.durationSec >= 0) parts.push(Math.trunc(s.durationSec) + ' 秒');
  if (typeof s.count === 'number' && s.count >= 0) parts.push(Math.trunc(s.count) + ' 下');
  const date = clean_claudecode_20260908(s.date, 32, true);
  if (date !== '') parts.push(date);
  return parts.length ? parts.join(' · ') : '-';
}

export function permissionText_claudecode_20260908(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '-';
  const names = { camera: '相机', mic: '麦克风', photosRead: '相册读', photosWrite: '相册写', health: '健康' };
  const allow = { granted: 1, denied: 1, notDetermined: 1 };
  return Object.keys(names).map((k) => {
    const v = typeof p[k] === 'string' ? p[k] : '';
    return names[k] + ' ' + (allow[v] ? v : '-');
  }).join(' / ');
}

/**
 * 付费明细。**不再带「档 …」** —— X123 颗粒 7 起「会员档」是独立一行,由
 * `memberPlanText_claudecode_20260909` 统一裁决,这里再写一遍就是第二个说法。
 */
export function paymentDetailText_claudecode_20260909(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '-';
  const parts = [];
  const fields = { productId: '商品', purchaseDate: '购买', expiresAt: '到期', originalTransactionId: '原始交易号' };
  for (const k of Object.keys(fields)) {
    const v = clean_claudecode_20260908(p[k], META_MAX_20260908, true);
    parts.push(fields[k] + ' ' + (v !== '' ? v : '-'));
  }
  return parts.join(' · ');
}

/**
 * 「会员档」到底显示哪个 —— issue #7 里同一张工单上「会员档 forever」和「付费 档 free」
 * 打架,owner 当场要求服务端只给**一个**说法。
 *
 * ## 根因(已在 App 侧查实,不是服务端取错字段)
 * 那台设备开着开发者模式、**模拟了 Pro**。App 里两个字段来源本来就不同:
 *   · 顶层 `plan`      ← 屏上显示用的会员状态,**会被 DEV override 顶掉** ⇒ 假的 `forever`
 *   · `payment.plan`   ← 只在「真扫苹果交易记录」那条路里写;有 override 时那条路
 *                        提前 return 了 ⇒ 停在初值 `free`(真的,但含义是"从没扫过")
 * 见 App `SubscriptionManager.swift` 的 `scanRealEntitlement_claudecode_20260909` 注释。
 *
 * ## 本函数的规矩(owner 令)
 *   1. 「会员档」**以 `payment.plan` 为准**(那是真实权益的口径)。
 *   2. App 带了 `devOverridePlan` ⇒ 折叠块里**单独一行**「DEV 模拟档」,不混进会员档。
 *   3. 老版本 App 不发 `devOverridePlan`,但顶层 `plan` 与 `payment.plan` 不一致时
 *      仍然把差异**登记**在会员档那一行后面 —— 不假装两个数一样。
 *
 * @returns {{plan:string, devOverride:string, mismatch:string}}
 */
export function memberPlanText_claudecode_20260909(topPlan, payment, devOverridePlan) {
  const payPlan = (payment && typeof payment === 'object' && !Array.isArray(payment)) ? payment.plan : undefined;
  const hasPay = payPlan !== undefined && payPlan !== null && typeof payPlan !== 'object';
  const plan = planText_claudecode_20260908(hasPay ? payPlan : topPlan);

  const devRaw = (devOverridePlan === null || devOverridePlan === undefined || typeof devOverridePlan === 'object')
    ? '' : String(devOverridePlan);
  const devOverride = devRaw === '' ? '' : planText_claudecode_20260908(devRaw);

  // 登记差异:只在「老 App 没告诉我们它开了 override」时才需要提醒
  let mismatch = '';
  const topRaw = (topPlan === null || topPlan === undefined || typeof topPlan === 'object') ? '' : String(topPlan);
  if (devRaw === '' && hasPay && topRaw !== '' && topRaw !== String(payPlan)) {
    mismatch = 'App 上报的顶层 plan=' + planText_claudecode_20260908(topRaw)
      + ' 与 payment.plan 不一致,已按 payment.plan 取(常见成因:设备开了 DEV 模拟档)';
  }
  return { plan, devOverride, mismatch };
}

export function channelText_claudecode_20260908(chan, jws) {
  const kinds = { appstore: 1, testflight: 1, development: 1, adhoc: 1, unknown: 1 };
  let kind = (chan && typeof chan.kind === 'string') ? chan.kind : '';
  if (!kinds[kind]) kind = 'unknown';
  const prov = (chan && 'provisioning' in chan) ? (chan.provisioning ? 'true' : 'false') : '-';
  const receiptEnv = clean_claudecode_20260908(chan ? chan.receiptEnv : '', META_MAX_20260908, true);
  const env = jws.env !== '' ? jws.env : receiptEnv;
  const detail = 'kind ' + kind + ' · provisioning ' + prov
    + ' · receiptEnv ' + (receiptEnv !== '' ? receiptEnv : '-')
    + ' · JWS ' + (jws.present ? (jws.verified ? '已验证 ✅' : '未验证 ❌(' + jws.reason + ')') : '未提供');
  return { kind, env, detail };
}

export function jwsDetails_claudecode_20260908(jwsRaw, jws) {
  const head = 'JWS 校验:' + (jws.verified ? '通过 ✅' : '未通过 ❌ —— ' + jws.reason)
    + '(签名 vs 叶子证书 ' + jws.sigVsLeaf + ' / 证书链 ' + jws.chain
    + (jws.leafCN !== '' ? ' / 叶子 CN ' + jws.leafCN : '') + ')';
  const payloadTxt = jws.payload ? JSON.stringify(jws.payload, null, 4) : '(没解析出来)';
  return '<details><summary>AppTransaction JWS(' + enc.encode(jwsRaw).length + ' 字节)· '
    + (jws.verified ? 'verified' : 'unverified') + '</summary>\n\n'
    + head + '\n\n```json\n' + payloadTxt + '\n```\n\n原文:\n\n```\n' + jwsRaw + '\n```\n\n</details>\n';
}

export function logDetails_claudecode_20260908(log, lines, budget) {
  if (budget < 500) return '';
  const wrapLen = 120;
  let body = log;
  if ([...body].length > budget - wrapLen) {
    body = [...body].slice(-(budget - wrapLen)).join('');
    body = '…(日志已按 GitHub issue 长度上限截断)…\n' + body;
  }
  return '<details><summary>App 日志(' + lines + ' 行)</summary>\n\n```\n' + body + '\n```\n\n</details>\n';
}

// ── X123 颗粒 7 排版件 ────────────────────────────────────────────────
/**
 * 标题 = 用户原话。换行折成空格(GitHub 标题是单行),超过 60 字截断加「…」。
 * 空串进来回一个兜底串 —— GitHub 不收空标题,而 `desc` 理论上已被上游挡住,这里只是不让它炸。
 */
export function titleFromDesc_claudecode_20260909(desc, fallback) {
  const one = String(desc ?? '').replace(/\s+/g, ' ').trim();
  if (one === '') return String(fallback ?? '(用户未填写描述)');
  const chars = [...one];
  return chars.length <= TITLE_MAX_20260909 ? one : chars.slice(0, TITLE_MAX_20260909).join('') + '…';
}

/**
 * 把用户原话包成「机器认得出 + 人看着醒目」的一段:
 *
 *     <!-- rc:desc:begin -->
 *     > ### 第一行
 *     > 第二行
 *     <!-- rc:desc:end -->
 *
 * · 两个 HTML 注释是**给机器用的锚点**(GitHub 页面上不显示),`unquoteDesc` 靠它精确回取
 *   —— 比旧版靠中文字面量【问题描述】+「下一个【」扫描稳得多。
 * · 每行都加 `> `(引用块),第一行**额外**加 `### `(渲染成大字号,owner 要的"原话要显眼")。
 * · 空行输出成裸 `>`(带尾空格的 `> ` 会被某些 markdown 工具 trim 掉,回取时两种都认)。
 * · ★ 与 `unquoteDesc_claudecode_20260909` 是**严格互逆**的一对:第一行永远只加一个
 *   `### `,所以用户原文即使自己就以 `### ` 或 `> ` 开头,回取也一字不差。单测钉死了这条。
 */
export function quoteDesc_claudecode_20260909(desc) {
  const lines = String(desc ?? '').split('\n');
  const body = lines.map((ln, i) => {
    const withHead = i === 0 ? DESC_HEAD_PREFIX_20260909 + ln : ln;
    return withHead === '' ? '>' : DESC_QUOTE_PREFIX_20260909 + withHead;
  }).join('\n');
  return DESC_MARK_BEGIN_20260909 + '\n' + body + '\n' + DESC_MARK_END_20260909;
}

/**
 * `quoteDesc` 的逆。整篇正文丢进来,取出用户原话;找不到锚点回 `null`。
 * ★ X129-C1 起**线上没有调用方**了(thread 下线,服务端不再从 issue 往回读)。保留的理由:
 *   它是 `quoteDesc` 的严格逆,单测靠这对往返把「写进 issue 的格式」钉死 —— 删了就只剩
 *   「写出来长这样」,没人证明它还读得回来。
 */
export function unquoteDesc_claudecode_20260909(body) {
  const s = String(body ?? '');
  const a = s.indexOf(DESC_MARK_BEGIN_20260909);
  if (a < 0) return null;
  const from = a + DESC_MARK_BEGIN_20260909.length;
  const b = s.indexOf(DESC_MARK_END_20260909, from);
  if (b < 0) return null;
  const inner = s.slice(from, b).replace(/^\n/, '').replace(/\n$/, '');
  const lines = inner.split('\n').map((ln) => (
    ln.startsWith(DESC_QUOTE_PREFIX_20260909) ? ln.slice(DESC_QUOTE_PREFIX_20260909.length)
      : (ln === '>' ? '' : ln)
  ));
  if (lines.length > 0 && lines[0].startsWith(DESC_HEAD_PREFIX_20260909)) {
    lines[0] = lines[0].slice(DESC_HEAD_PREFIX_20260909.length);
  }
  return lines.join('\n');
}

/**
 * 设备号锚点。**HTML 注释**形式:页面上看不见,但 GitHub 全文搜索照样能搜到
 * (`searchDeviceIssue` 那条兜底路径靠它)。旧排版是明晃晃一行 `device: xxx`,
 * owner 说那行对他没用还占地方。
 */
export function deviceMark_claudecode_20260909(deviceId) {
  const v = String(deviceId ?? '');
  return DEVICE_MARK_PREFIX_20260909 + (v !== '' ? v : '(未提供)') + DEVICE_MARK_SUFFIX_20260909;
}

/** 抓来的元数据 → 一个折叠块。`rows` = [[名字, 值], …],值为空串的行照样留(缺什么一眼看得出) */
export function diagDetails_claudecode_20260909(rows, summary) {
  const body = rows.map(([k, v]) => '- **' + k + '**:' + (v !== '' && v !== undefined && v !== null ? v : '-')).join('\n');
  return '<details><summary>' + (summary || '设备与诊断信息') + '</summary>\n\n' + body + '\n\n</details>\n';
}

// ── 限流(KV 滑动窗口;同一 colo 内写后立刻可读,跨 colo 最终一致) ──────
/**
 * ★ X123 颗粒 8(2026-09-09,owner 令「别收 IP 这种敏感信息」)—— **限流主体不再是 IP**。
 *   以前键是 `fbrate:<桶>:<IP>`,等于把每个用户的 IP 明文写进 KV 存 10 分钟;
 *   现在主体 = App 自己生成的设备编号。**阈值与窗口一个都没动。**
 * ★ X129-C1:thread / reply / sendlog 三条路由下线 ⇒ 只剩 contact 一个桶;而且这个桶
 *   现在是**静默**的 —— 超了不回 429,是「照回 200,后台把这条丢掉」。
 * ★ 代价写在 PREREG-X123-G8.md §5:设备编号/工单号是请求体里的东西 ⇒ 限流只能挪到解析之后,
 *   JSON 坏掉的请求不再计入单主体窗口(仍被 globalDayAllow 的 300/天 计入);
 *   拿到 X-RC-Key 的人换工单号可以绕开单主体窗口(RC_KEY 在 App 二进制里,视同半公开)。
 * @param subject 主体标识:必须是已清洗过的串(cleanDeviceId 的输出,或常量)
 */
export async function rateAllow_claudecode_20260908(kv, subject, bucket, max, now = Date.now()) {
  if (!kv) return true;                          // KV 不可用时不拦真实反馈
  const key = 'fbrate:' + bucket + ':' + (subject || RATE_SUBJECT_NONE_20260909);
  let hits = [];
  try { hits = JSON.parse((await kv.get(key)) || '[]'); } catch (e) { hits = []; }
  if (!Array.isArray(hits)) hits = [];
  const kept = hits.filter((t) => typeof t === 'number' && now - t < RATE_WINDOW_SEC_20260908 * 1000);
  if (kept.length >= max) {
    // 不追加本次:避免恶意刷把窗口无限往后推
    try { await kv.put(key, JSON.stringify(kept), { expirationTtl: RATE_WINDOW_SEC_20260908 }); } catch (e) {}
    return false;
  }
  kept.push(now);
  try { await kv.put(key, JSON.stringify(kept), { expirationTtl: RATE_WINDOW_SEC_20260908 }); } catch (e) {}
  return true;
}

export async function globalDayAllow_claudecode_20260908(kv, now = new Date()) {
  if (!kv) return true;
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const key = 'fbrate:global:' + day;
  let n = 0;
  try { n = parseInt((await kv.get(key)) || '0', 10) || 0; } catch (e) { n = 0; }
  if (n >= RATE_GLOBAL_DAY_20260908) return false;
  try { await kv.put(key, String(n + 1), { expirationTtl: 2 * 24 * 3600 }); } catch (e) {}
  return true;
}

// ── 测试模式 ──────────────────────────────────────────────────────────
/**
 * 测试模式:开着就**什么都不做**(不调 GitHub、不写任何东西)。
 * ★ X129-C1 起签名从 `(request, kv)` 改成 `(testHeader, kv)` —— contact 在返回 200 之前
 *   就把请求头读出来了,异步那段拿不到 `request`(那时它已经交出去了)。
 * ★ 旧版还会存一份「测试件」到 KV 让 App 能拉对话 —— thread 已下线,那就是纯粹的存消息,已撤。
 * @returns {boolean}
 */
export async function testModeReason_claudecode_20260910(testHeader, kv) {
  if (testHeader === true) return true;
  if (kv) {
    try { return ((await kv.get('feedback:test_mode')) || '') === 'on'; }
    catch (e) { /* 读不到就当没开 */ }
  }
  return false;
}

// ── 「开单中」占位锁(X129-C1)────────────────────────────────────────
/**
 * ★★★ 「开单中」占位锁 —— X129-C1 实测逼出来的,不是想象中的问题。
 *
 * 立刻回 200 之后,用户连点两下(或 App 重试)会有**两个后台任务同时在跑**;
 * 旧版是同步的,第二次请求必然排在第一次之后,`ticket:<deviceId>` 早写好了。
 * 2026-09-10 首次生产实测:两条相隔约 1 秒的提交**开出了两个 issue(#12 / #13)**
 * —— 第二条读 `ticket:` 时第一条还没写完,GitHub 搜索兜底又有几十秒索引延迟,救不了。
 *
 * 处置:开新 issue 之前先把这把锁写进**同一个键**(值是 `lock:<时间戳>`,不是数字,
 * 所以老读法自然读成 0),开完再用真 issue 号覆盖;开单失败就把键删掉,别让这台设备
 * 卡满 TTL。看见锁的那一方等一会儿再读。
 *
 * ★ 诚实边界:KV 跨 colo 是**最终一致**的,这把锁只挡得住「同一个 colo 里的连点」,
 *   挡不住两台机房同时开单。它是**缓解**不是**互斥** —— 要真互斥得上 Durable Objects,
 *   为一个「用户手抖点两下」的场景不值。登记在回执。
 */
export const TICKET_LOCK_PREFIX_20260910 = 'lock:';
export const TICKET_LOCK_TTL_SEC_20260910 = 60;
export const TICKET_LOCK_WAIT_MS_20260910 = 1500;
export const TICKET_LOCK_TRIES_20260910 = 3;

/**
 * 读这台设备的 issue 号;读到「开单中」就等一会儿重读。
 * @param waitMs 每次重读之间等多久(单测把它调到 1ms;线上不传)
 * @returns {number} 0 = 没有(或者等到最后那一方也没写出来 ⇒ 放行去开单)
 */
export async function deviceIssueWaitingLock_claudecode_20260910(kv, deviceId, waitMs = TICKET_LOCK_WAIT_MS_20260910) {
  if (!kv || deviceId === '') return 0;
  for (let i = 0; i <= TICKET_LOCK_TRIES_20260910; i++) {
    let raw = '';
    try { raw = (await kv.get('ticket:' + deviceId)) || ''; } catch (e) { return 0; }
    if (raw === '') return 0;
    if (!raw.startsWith(TICKET_LOCK_PREFIX_20260910)) return parseInt(raw, 10) || 0;
    if (i === TICKET_LOCK_TRIES_20260910) return 0;      // 锁一直没解开 ⇒ 当它死了,照常开单
    await new Promise((r) => setTimeout(r, waitMs));   // waitMs 只为单测能调快,线上永远用默认值
  }
  return 0;
}
