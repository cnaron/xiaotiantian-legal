// 预审(词表 → Workers AI)+ 拉黑(GitHub 标签)+ 连拒自动拉黑。X123 颗粒 7。
// 2026.09.09 Naron
//
// 两道门,顺序是固定的,理由写在各自函数上:
//   ① 拉黑:owner 在 GitHub 上给这台设备的工单贴 `blocked` 标签 ⇒ 它发不出新的话(403),
//      但 **thread 照常可读**(不让被拉黑的人一脸懵)。撕掉标签最多 5 分钟恢复。
//   ② 预审:词表命中直接拒;词表放过的再交给 Workers AI 看一眼。
//
// ★★★ 「AI 坏了要放行」这条是**故意的**,不是偷懒:审核服务抽风时把正常用户的求助拦在门外,
//   代价远大于漏掉一句脏话(漏掉的那句 owner 自己在 GitHub 上看得到,还能手动拉黑)。
//   所以超时 / 抛错 / 没绑定一律放行,只在发送记录里留一句 `ai_unavailable`。
import { GH_REPO_20260908 as REPO, gh_claudecode_20260908 as gh } from './ghapp.js';
import { matchWords_claudecode_20260909, MOD_CATEGORIES_20260909 } from './moderation_words.js';

export const BLOCK_LABEL_20260909 = 'blocked';
export const LABELS_CACHE_SEC_20260909 = 300;              // 5 分钟(= 解封最长生效时间)
export const REJECT_TTL_SEC_20260909 = 30 * 24 * 3600;     // 拒绝计数保留 30 天
export const REJECT_BLOCK_AT_20260909 = 3;                 // 拒到第几次自动拉黑
export const AUTO_BLOCK_COMMENT_20260909 = '[系统] 因多次提交违规内容已自动屏蔽';

export const AI_MODEL_20260909 = '@cf/meta/llama-guard-3-8b';
export const AI_TIMEOUT_MS_20260909 = 3000;
/**
 * ★★★ 采样温度钉成 0 + 判「不安全」时**再问一次**,两条都是实测逼出来的:
 *   2026-09-09 10:57,线上把「解封探测 11」「解封探测 12」(我自己的解封轮询文案,
 *   完全无辜)判成 **S9 无差别武器** 并拒掉;同样两句话十几分钟后再问,**5/5 判 safe**,
 *   另一句同族的「解封探测 5」**8/8 判 safe**。⇒ 同一输入不同判,是采样随机性。
 *
 *   一个会随机误伤的门 + 「拒绝时不给理由」的产品决定 = 用户被拦了还不知道为什么、
 *   重试一次可能又好了。所以:
 *     ① `temperature: 0` 把随机性摁到最小;
 *     ② 判不安全**不当场定罪**,再问一次,**两次都说不安全才拒**。
 *   代价只落在"被判不安全"那一小撮请求上(正常流量一次都不多花),
 *   而正常流量本来就是绝大多数 ⇒ neurons 账基本不变。
 */
export const AI_TEMPERATURE_20260909 = 0;
export const AI_CONFIRM_UNSAFE_20260909 = true;

/**
 * ★ 本轮的「阈值」就是这两张表 —— Llama Guard 不给分数,它给类别,所以「阈值」= 哪些类别算拒。
 *   写死在这里,不从环境变量读:一个能被 env 改掉的审核门槛等于没有门槛。
 */
export const AI_REJECT_CATEGORIES_20260909 = {
  S1: '暴力犯罪', S2: '非暴力犯罪', S3: '性犯罪', S4: '儿童性剥削',
  S9: '无差别武器', S10: '仇恨', S11: '自杀自残', S12: '色情内容',
};
/**
 * 故意**不拒**的六类。理由:在「一个跳绳 App 的用户吐槽」这个语境里,
 * 它们的假阳性风险远大于收益 —— 抱怨别家 App 可能被判 S8、抱怨某个人可能被判 S5、
 * 用户贴自己的手机号找我们联系是 S7。拦这些等于拦真用户。
 */
export const AI_ALLOW_CATEGORIES_20260909 = {
  S5: '诽谤', S6: '专业建议', S7: '隐私', S8: '知识产权', S13: '选举', S14: '代码解释器滥用',
};

/** 类别码 → 中文(词表类别与 AI 类别共用一个查表口) */
export function categoryName_claudecode_20260909(cat) {
  return MOD_CATEGORIES_20260909[cat] || AI_REJECT_CATEGORIES_20260909[cat]
    || AI_ALLOW_CATEGORIES_20260909[cat] || cat;
}

// ── 拉黑 ──────────────────────────────────────────────────────────────
/**
 * 取某条 issue 的标签,KV 缓存 5 分钟。
 * @returns {string[]|null} null = 问不出来(GitHub 用不了)⇒ 调用方**不要**据此拦人
 */
export async function issueLabels_claudecode_20260909(kv, ghToken, issue, force = false) {
  const key = 'labels:' + issue;
  if (kv && !force) {
    try {
      const raw = await kv.get(key);
      if (raw) { const v = JSON.parse(raw); if (Array.isArray(v)) return v; }
    } catch (e) { /* 缓存坏了当没有 */ }
  }
  if (!ghToken) return null;
  const res = await gh(ghToken, 'GET', `/repos/${REPO}/issues/${issue}`, null);
  if (!res.ok || !res.json) return null;
  const labels = Array.isArray(res.json.labels)
    ? res.json.labels.map((l) => (typeof l === 'string' ? l : (l && l.name) || '')).filter((x) => x !== '')
    : [];
  if (kv) {
    try { await kv.put(key, JSON.stringify(labels), { expirationTtl: LABELS_CACHE_SEC_20260909 }); } catch (e) {}
  }
  return labels;
}

/**
 * 这台设备 / 这条工单被拉黑了吗。
 *
 * ★ 「问不出来 ⇒ 放行」:GitHub 挂了的时候不该把所有人都当成被拉黑的。
 *   拉黑是**惩罚**,惩罚在证据缺失时必须倒向宽松。
 * @returns {{blocked:boolean, why:string}}
 */
export async function isBlocked_claudecode_20260909(kv, ghToken, { deviceId = '', issue = 0 } = {}) {
  // ① 没开过工单也能被拉黑(连拒 3 次时工单还不存在)⇒ KV 上单独一把锁
  if (kv && deviceId !== '') {
    try {
      if (((await kv.get('block:' + deviceId)) || '') !== '') return { blocked: true, why: 'kv block:' + deviceId };
    } catch (e) { /* 读不到就往下走 */ }
  }
  // ② 正路:看这条 issue 的标签
  if (issue > 0) {
    const labels = await issueLabels_claudecode_20260909(kv, ghToken, issue);
    if (labels && labels.includes(BLOCK_LABEL_20260909)) {
      return { blocked: true, why: 'issue #' + issue + ' 带 ' + BLOCK_LABEL_20260909 + ' 标签' };
    }
  }
  return { blocked: false, why: '' };
}

/** contact 走的是 KV 映射(`ticket:<deviceId>`),不查 GitHub 搜索 —— 搜索有几十秒延迟,挡不了实时提交 */
export async function deviceIssue_claudecode_20260909(kv, deviceId) {
  if (!kv || deviceId === '') return 0;
  try { return parseInt((await kv.get('ticket:' + deviceId)) || '0', 10) || 0; } catch (e) { return 0; }
}

// ── 预审 ──────────────────────────────────────────────────────────────
/**
 * 问 Workers AI。**永远不抛** —— 出任何事都回 `{ unavailable: true }` 让调用方放行。
 * @returns {{unsafe:boolean, cats:string[], unavailable:boolean, reason:string, ms:number}}
 */
export async function moderateAI_claudecode_20260909(ai, text) {
  const t0 = Date.now();
  if (!ai || typeof ai.run !== 'function') {
    return { unsafe: false, cats: [], unavailable: true, reason: 'AI 绑定缺席', ms: 0 };
  }
  let raw;
  try {
    // 3 秒还没回来就当它不可用。Promise.race 不会取消那个请求,但我们不再等它。
    raw = await Promise.race([
      ai.run(AI_MODEL_20260909, {
        messages: [{ role: 'user', content: String(text) }],
        temperature: AI_TEMPERATURE_20260909,
      }),
      new Promise((resolve) => setTimeout(() => resolve({ __timeout: true }), AI_TIMEOUT_MS_20260909)),
    ]);
  } catch (e) {
    return { unsafe: false, cats: [], unavailable: true, reason: 'AI 抛错:' + (e && e.message ? e.message : e), ms: Date.now() - t0 };
  }
  const ms = Date.now() - t0;
  if (raw && raw.__timeout) {
    return { unsafe: false, cats: [], unavailable: true, reason: 'AI 超时 >' + AI_TIMEOUT_MS_20260909 + 'ms', ms };
  }
  const parsed = parseGuard_claudecode_20260909(raw);
  if (parsed === null) {
    return { unsafe: false, cats: [], unavailable: true, reason: 'AI 回了看不懂的形状', ms };
  }
  // 只有落在「拒绝表」里的类别才算数;落在「放行表」或没给类别的一律放行
  const hit = parsed.cats.filter((c) => AI_REJECT_CATEGORIES_20260909[c]);
  return {
    unsafe: parsed.unsafe && hit.length > 0,
    cats: parsed.cats, hitCats: hit, unavailable: false, reason: '', ms,
  };
}

/**
 * Llama Guard 的输出解析。
 * ★ 两种形状都认,因为 Workers AI 在不同模型/版本上给过两种:
 *   ① 结构化 `{ response: { safe: false, categories: ['S10'] } }`
 *   ② 纯文本  `{ response: "unsafe\nS10" }` 或直接一个字符串
 *   认不出来回 `null`(⇒ 调用方按「不可用」放行,而不是按「安全」放行 —— 这两者
 *   在结果上一样,但在**发送记录**里不一样:一个说"AI 说没事",一个说"AI 没说话")。
 */
export function parseGuard_claudecode_20260909(raw) {
  const r = (raw && typeof raw === 'object' && 'response' in raw) ? raw.response : raw;
  if (r && typeof r === 'object' && !Array.isArray(r)) {
    if (typeof r.safe === 'boolean') {
      const cats = Array.isArray(r.categories) ? r.categories.map((c) => String(c).trim().toUpperCase()) : [];
      return { unsafe: r.safe === false, cats };
    }
    return null;
  }
  if (typeof r === 'string') {
    const txt = r.trim().toLowerCase();
    if (txt.startsWith('safe')) return { unsafe: false, cats: [] };
    if (txt.startsWith('unsafe')) {
      const cats = (r.match(/S(?:1[0-4]|[1-9])\b/gi) || []).map((c) => c.toUpperCase());
      return { unsafe: true, cats };
    }
    return null;
  }
  return null;
}

/**
 * 一句话过两道门。
 * @returns {{ok:boolean, src:''|'word'|'ai', cat:string, detail:string,
 *            aiState:'ok'|'unavailable'|'skipped', aiReason:string, wordMs:number, aiMs:number}}
 */
export async function moderate_claudecode_20260909(ai, text) {
  const t0 = Date.now();
  const w = matchWords_claudecode_20260909(text);
  const wordMs = Date.now() - t0;
  if (w.hit) {
    return {
      ok: false, src: 'word', cat: w.cat,
      detail: w.id + (w.where === 'stripped' ? '(去插入符后才命中 ⇒ 对方在绕)' : ''),
      aiState: 'skipped', aiReason: '', wordMs, aiMs: 0,
    };
  }
  const a = await moderateAI_claudecode_20260909(ai, text);
  if (a.unavailable) {
    return { ok: true, src: '', cat: '', detail: '', aiState: 'unavailable', aiReason: a.reason, wordMs, aiMs: a.ms };
  }
  if (a.unsafe) {
    // ★ 复核:判不安全不当场定罪,再问一次(理由见 AI_TEMPERATURE_20260909 的注释)
    if (AI_CONFIRM_UNSAFE_20260909) {
      const b = await moderateAI_claudecode_20260909(ai, text);
      if (b.unavailable) {
        // 复核那一次坏了 ⇒ 放行。宁可漏,不可在"证据只有一次且已知会抖"的情况下定罪。
        return {
          ok: true, src: '', cat: '', detail: '', aiState: 'unavailable',
          aiReason: '首判不安全(' + (a.hitCats || []).join('+') + ')但复核不可用:' + b.reason,
          wordMs, aiMs: a.ms + b.ms,
        };
      }
      if (!b.unsafe) {
        return {
          ok: true, src: '', cat: '', detail: '', aiState: 'flaky',
          aiReason: '首判 ' + (a.hitCats || []).join('+') + ' / 复核判安全 ⇒ 放行(模型抖动)',
          wordMs, aiMs: a.ms + b.ms,
        };
      }
      return {
        ok: false, src: 'ai', cat: (b.hitCats || []).join('+'),
        detail: 'AI 两次都判 ' + (b.hitCats || []).map((c) => c + ' ' + categoryName_claudecode_20260909(c)).join(' / ')
          + '(首判 ' + (a.hitCats || []).join('+') + ')',
        aiState: 'ok', aiReason: '', wordMs, aiMs: a.ms + b.ms,
      };
    }
    return {
      ok: false, src: 'ai', cat: (a.hitCats || []).join('+'),
      detail: 'AI 判定 ' + (a.hitCats || []).map((c) => c + ' ' + categoryName_claudecode_20260909(c)).join(' / '),
      aiState: 'ok', aiReason: '', wordMs, aiMs: a.ms,
    };
  }
  return { ok: true, src: '', cat: '', detail: '', aiState: 'ok', aiReason: '', wordMs, aiMs: a.ms };
}

// ── 拒绝计数 / 自动拉黑 ────────────────────────────────────────────────
/**
 * 记一次拒绝,够数就自动拉黑。
 *
 * ★ 计数主体:有 `deviceId` 就按设备;**没有就按工单号**(键 `i<issue>`)。
 *   为什么会没有:`reply` 的请求体里没有 deviceId(契约是颗粒 2 定的,这一轮不改契约)。
 *   两种主体的计数**不合并** —— 合并需要一次 GitHub 往返去查工单属于哪台设备,
 *   为了一个计数器每次拒绝都多打一次 API 不值。差异登记在预注册 §1 F3。
 *
 * @returns {{count:number, autoBlocked:boolean, how:string}}
 */
export async function noteRejection_claudecode_20260909(kv, ghToken, { deviceId = '', issue = 0 } = {}) {
  const subject = deviceId !== '' ? deviceId : (issue > 0 ? 'i' + issue : '');
  if (!kv || subject === '') return { count: 0, autoBlocked: false, how: '无主体可计数' };

  const key = 'rej:' + subject;
  let n = 0;
  try { n = parseInt((await kv.get(key)) || '0', 10) || 0; } catch (e) { n = 0; }
  n += 1;
  try { await kv.put(key, String(n), { expirationTtl: REJECT_TTL_SEC_20260909 }); } catch (e) {}
  if (n < REJECT_BLOCK_AT_20260909) return { count: n, autoBlocked: false, how: '' };

  // 够数了 —— 有工单就贴标签 + 留一句系统说明;没工单就在 KV 上落一把锁
  if (issue > 0 && ghToken) {
    await ensureBlockLabel_claudecode_20260909(ghToken);
    const add = await gh(ghToken, 'POST', `/repos/${REPO}/issues/${issue}/labels`, { labels: [BLOCK_LABEL_20260909] });
    // ★ 贴完必须**强制刷新**这条 issue 的标签缓存:否则自己刚贴的标签,5 分钟内自己看不见
    await issueLabels_claudecode_20260909(kv, ghToken, issue, true);
    let commented = false;
    if (add.ok) {
      const c = await gh(ghToken, 'POST', `/repos/${REPO}/issues/${issue}/comments`, { body: AUTO_BLOCK_COMMENT_20260909 });
      commented = c.ok;
    }
    if (deviceId !== '' ) {
      try { await kv.put('block:' + deviceId, '1', { expirationTtl: REJECT_TTL_SEC_20260909 }); } catch (e) {}
    }
    return {
      count: n, autoBlocked: add.ok,
      how: add.ok ? ('已给 issue #' + issue + ' 贴 ' + BLOCK_LABEL_20260909 + (commented ? ' + 留系统说明' : ' (说明没写上)'))
        : ('贴标签失败 status=' + add.status + ' ' + add.err),
    };
  }
  if (deviceId !== '') {
    try { await kv.put('block:' + deviceId, '1', { expirationTtl: REJECT_TTL_SEC_20260909 }); } catch (e) {}
    return { count: n, autoBlocked: true, how: '这台设备还没有工单 ⇒ 锁在 KV block:' + deviceId };
  }
  return { count: n, autoBlocked: false, how: '既没设备号也没工单号,拉黑不了' };
}

/** `blocked` 标签不存在就建(已存在 GitHub 回 422,当成功)。失败不阻断贴标签本身。 */
export async function ensureBlockLabel_claudecode_20260909(token) {
  await gh(token, 'POST', `/repos/${REPO}/labels`, {
    name: BLOCK_LABEL_20260909, color: 'b60205', description: '这台设备的反馈一律拒收(X123 颗粒 7)',
  });
}
