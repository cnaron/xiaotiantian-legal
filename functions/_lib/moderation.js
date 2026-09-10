// 预审(词表 → Workers AI)+ 拉黑(GitHub 标签)。X123 颗粒 7 建,X129 颗粒 C1 收敛。
// 2026.09.10 Naron
//
// 两道门,顺序是固定的,理由写在各自函数上:
//   ① 拉黑:owner 在 GitHub 上给这台设备的工单贴 `blocked` 标签 ⇒ 它发的话不再落地。
//      撕掉标签最多 5 分钟恢复。
//   ② 预审:词表命中直接拒;词表放过的再交给 Workers AI 看一眼。
//
// ★★★ X129-C1 的两处收敛(owner 改口径:用户只管发,我们不作响应处理):
//   ① 两道门现在都跑在 **contact 返回 200 之后**的异步段里,拦下来 = **静默丢弃**
//      —— 不回 400/403、不开单、不留任何记录。用户感知不到自己被拦了(owner 明确要的)。
//   ② **「连拒 3 次自动拉黑」整个撤掉**,KV 上那把 `block:<deviceId>` 锁一并撤:
//      自动拉黑要在 KV 里记「这台设备被拒过几次」,而这一轮 KV 不留任何过程记录。
//      拉黑现在**只有一条路**:owner 在 GitHub 上给这台设备的 issue 贴 `blocked` 标签。
//      代价:一台还没开过 issue 的设备**拉黑不了**(它在 GitHub 上没有可贴标签的对象)。
//
// ★★★ 「AI 坏了要放行」这条是**故意的**,不是偷懒:审核服务抽风时把正常用户的求助拦在门外,
//   代价远大于漏掉一句脏话(漏掉的那句 owner 自己在 GitHub 上看得到,还能手动拉黑)。
//   所以超时 / 抛错 / 没绑定一律放行,只在发送记录里留一句 `ai_unavailable`。
import { GH_REPO_20260908 as REPO, gh_claudecode_20260908 as gh } from './ghapp.js';
import { matchWords_claudecode_20260909, MOD_CATEGORIES_20260909 } from './moderation_words.js';

export const BLOCK_LABEL_20260909 = 'blocked';
export const LABELS_CACHE_SEC_20260909 = 300;              // 5 分钟(= 解封最长生效时间)

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
  // ★ X129-C1:只看 GitHub 标签这**一条**路。KV 上那把 `block:<deviceId>` 锁撤了
  //   (它是「连拒自动拉黑」的产物,而自动拉黑要在 KV 里记过程,已随这一轮一起撤)。
  //   `deviceId` 形参保留:调用方现有的写法不用改,将来要恢复设备级拉黑也有位置。
  if (issue > 0) {
    const labels = await issueLabels_claudecode_20260909(kv, ghToken, issue);
    if (labels && labels.includes(BLOCK_LABEL_20260909)) {
      return { blocked: true, why: 'issue #' + issue + ' 带 ' + BLOCK_LABEL_20260909 + ' 标签' };
    }
  }
  return { blocked: false, why: '' };
}

// `deviceIssue_claudecode_20260909`(按 `ticket:<deviceId>` 读工单号)已挪进 contact.js,
// 改名 `deviceIssueWaitingLock_claudecode_20260910` —— 它现在还要处理「开单中」的占位锁,
// 而那把锁是 contact 自己的事,放在预审/拉黑这个文件里名不副实。 2026.09.10 Naron

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

// ── 拒绝计数 / 自动拉黑:X129-C1 已整段撤除 ────────────────────────────
// 撤掉的是 `noteRejection_claudecode_20260909` / `ensureBlockLabel_claudecode_20260909`
// 与 `rej:<主体>` / `block:<deviceId>` 两类 KV 键。理由见本文件顶部 ★★★ 那段。
