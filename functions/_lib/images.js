// 工单图片(X123 颗粒 5)的公共件:键名规矩 / markdown 嵌入与剥离 / 每工单每日配额。
//
// ★ 为什么图存 R2 而不是塞进 issue 正文:GitHub 的 API 没有「上传附件」这一说
//   (网页端拖拽走的是另一套私有接口),issue 正文只能引用一个**公网可读**的 URL。
//   所以链路是:App 传给我们 → R2 → issue 正文写 `![截图](https://…/api/feedback/img/<key>)`
//   → GitHub 的图片代理(camo)去取那个 URL 并缓存。
//
// ★ 访问控制 = 键名猜不到(<ticketId>/<32 位随机十六进制>.jpg,128 bit 熵)。
//   **不能**给这个 URL 加 X-RC-Key:camo 是 GitHub 的服务器去取图,它不会带我们的头。
//   代价写在回执诚实栏:拿到 URL 的人就能看图,和「私有仓库」不是一个强度。
// 2026.09.08 Naron

export const IMG_MAX_BYTES_20260908 = 1048576;          // 单张 ≤1 MB
export const IMG_PER_MESSAGE_20260908 = 4;              // 每条消息 ≤4 张
export const IMG_PER_TICKET_DAY_20260908 = 20;          // 每工单每日 ≤20 张
export const IMG_RATE_MAX_20260908 = 40;                // upload 桶:40 次 / 10 分钟 / IP
// ★ attach 必须有**自己的**桶。第一版让它蹭 reply 桶(5 次/10 分钟),线上当场撞出 429:
//   一次「带图提交 + 两次带图追问」= contact/attach/reply/attach/reply/attach,
//   光 attach 就 3 次,再加 reply 2 次就把 5 次的桶吃满,用户第三句话直接发不出去。
//   证据见回执 §6 G5-RATE-SPLIT(改之前实测 429,改之后同一序列 200)。 2026.09.08 Naron
export const ATTACH_RATE_MAX_20260908 = 20;             // attach 桶:20 次 / 10 分钟 / IP
export const IMG_TTL_DAYS_20260908 = 90;                // R2 生命周期(桶上配的规则,这里只是文档值)
export const IMG_PATH_PREFIX_20260908 = '/api/feedback/img/';
export const IMG_MD_ALT_20260908 = '截图';

/** 对象键:<ticketId>/<32 位十六进制>.jpg —— ticketId 与 cleanId 同一张表(纯数字 / q+hex / t+hex) */
const KEY_RE_20260908 = /^(?:[0-9]{1,9}|[qt][0-9a-f]{1,24})\/[0-9a-f]{32}\.jpg$/;

export function validImgKey_claudecode_20260908(key) {
  return typeof key === 'string' && KEY_RE_20260908.test(key);
}

/** 键属于这个工单吗 —— 防止 A 工单的 token 把 B 工单的图嵌进自己的帖子 */
export function keyBelongsTo_claudecode_20260908(key, ticketId) {
  return validImgKey_claudecode_20260908(key) && key.slice(0, key.indexOf('/')) === String(ticketId);
}

export function newImgKey_claudecode_20260908(ticketId) {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return String(ticketId) + '/' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('') + '.jpg';
}

export function imgUrl_claudecode_20260908(request, key) {
  return new URL(IMG_PATH_PREFIX_20260908 + key, request.url).toString();
}

/** 一段 markdown 图片行(GitHub 会渲染成图) */
export function imgMarkdown_claudecode_20260908(urls) {
  return urls.map((u) => '![' + IMG_MD_ALT_20260908 + '](' + u + ')').join('\n');
}

/**
 * 从一段正文里剥出图片 URL,并把 markdown 从正文里去掉。
 * thread 要用:App 的气泡里不该出现 `![截图](https://…)` 这行字面量,
 * 图应当作为 messages[].images 单独给出去。
 * @returns {body, images}
 */
export function splitImages_claudecode_20260908(body) {
  const s = String(body ?? '');
  const images = [];
  const re = /!\[[^\]]*\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(s)) !== null) images.push(m[1]);
  if (images.length === 0) return { body: s, images };
  return { body: s.replace(re, '').replace(/\n{3,}/g, '\n\n').trim(), images };
}

/** JPEG 魔数:SOI FF D8 FF … EOI FF D9。挡住「把别的东西改个扩展名传上来」 */
export function looksLikeJpeg_claudecode_20260908(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 4) return false;
  if (!(b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF)) return false;
  return b[b.length - 2] === 0xFF && b[b.length - 1] === 0xD9;
}

/** 每工单每日配额。@returns {allow, used} */
export async function imgDayQuota_claudecode_20260908(kv, ticketId, now = new Date()) {
  if (!kv) return { allow: true, used: 0 };
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const key = 'fbimgday:' + ticketId + ':' + day;
  let n = 0;
  try { n = parseInt((await kv.get(key)) || '0', 10) || 0; } catch (e) { n = 0; }
  if (n >= IMG_PER_TICKET_DAY_20260908) return { allow: false, used: n };
  try { await kv.put(key, String(n + 1), { expirationTtl: 2 * 24 * 3600 }); } catch (e) {}
  return { allow: true, used: n + 1 };
}
