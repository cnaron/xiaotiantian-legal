// GET /api/history?page=privacy        → 最近 20 版的时间戳列表
// GET /api/history?page=privacy&ts=... → 取该版正文(编辑器用它做回滚:载入后再点保存)
// 2026.09.07 Naron
import { isAuthed, json } from '../_lib/auth.js';
import { PAGE_NAMES } from '../_lib/page.js';

export const onRequestGet = async ({ request, env }) => {
  if (!await isAuthed(request, env)) return json({ ok: false, error: '未登录' }, 401);
  if (!env.LEGAL_CONTENT) return json({ ok: false, error: 'KV 未绑定' }, 500);
  const u = new URL(request.url);
  const page = u.searchParams.get('page');
  if (!PAGE_NAMES.includes(page)) return json({ ok: false, error: '未知页面' }, 400);

  const ts = u.searchParams.get('ts');
  if (ts) {
    const body = await env.LEGAL_CONTENT.get(`history:${page}:${ts}`);
    if (body === null) return json({ ok: false, error: '该版本不存在' }, 404);
    return json({ ok: true, page, ts, body });
  }
  const list = await env.LEGAL_CONTENT.list({ prefix: `history:${page}:` });
  const versions = list.keys.map((k) => Number(k.name.split(':')[2])).sort((a, b) => b - a);
  return json({ ok: true, page, versions });
};
