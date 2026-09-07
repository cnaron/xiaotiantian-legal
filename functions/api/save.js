// POST /api/save {page, body} → 校 cookie → 写 KV + 存一版历史(最多留 20 版)。 2026.09.07 Naron
import { isAuthed, json } from '../_lib/auth.js';
import { PAGE_NAMES } from '../_lib/page.js';

const HISTORY_KEEP = 20;

export const onRequestPost = async ({ request, env }) => {
  if (!await isAuthed(request, env)) return json({ ok: false, error: '未登录' }, 401);
  if (!env.LEGAL_CONTENT) return json({ ok: false, error: 'KV 未绑定' }, 500);

  let page, body;
  try { ({ page, body } = await request.json()); } catch (e) { return json({ ok: false, error: '请求格式错' }, 400); }
  if (!PAGE_NAMES.includes(page)) return json({ ok: false, error: '未知页面' }, 400);
  if (typeof body !== 'string') return json({ ok: false, error: '正文必须是文本' }, 400);
  if (body.length > 200000) return json({ ok: false, error: '正文过长(>200000 字符)' }, 413);

  const ts = Date.now();
  // 先存历史再覆盖正文:中途失败也不会出现「正文没了历史也没了」
  await env.LEGAL_CONTENT.put(`history:${page}:${ts}`, body);
  await env.LEGAL_CONTENT.put(`page:${page}`, body);

  // 修剪历史:只留最新 HISTORY_KEEP 版
  let trimmed = 0;
  try {
    const list = await env.LEGAL_CONTENT.list({ prefix: `history:${page}:` });
    const keys = list.keys.map((k) => k.name).sort();          // 时间戳定长 ⇒ 字典序=时间序
    for (const k of keys.slice(0, Math.max(0, keys.length - HISTORY_KEEP))) {
      await env.LEGAL_CONTENT.delete(k); trimmed++;
    }
  } catch (e) { /* 修剪失败不影响保存 */ }

  // 「保存即发布」:把本页的边缘缓存条目删掉
  const origin = new URL(request.url).origin;
  const paths = page === 'index' ? ['/', '/index.html'] : [`/${page}`, `/${page}.html`];
  const purged = [];
  for (const p of paths) {
    try { purged.push([p, await caches.default.delete(new Request(origin + p))]); } catch (e) { purged.push([p, 'err']); }
  }
  return json({ ok: true, ts, trimmed, purged });
};
