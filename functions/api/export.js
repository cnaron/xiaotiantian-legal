// GET /api/export → 四页正文源码打包成 JSON(校 cookie)。
// 用途:GitHub Pages 备份站不会自动跟随 KV,需要同步时由人手动取一次覆盖 content/。
// 2026.09.07 Naron
import { isAuthed, json } from '../_lib/auth.js';
import { PAGE_NAMES, loadSource } from '../_lib/page.js';

export const onRequestGet = async ({ request, env }) => {
  if (!await isAuthed(request, env)) return json({ ok: false, error: '未登录' }, 401);
  const out = {};
  for (const name of PAGE_NAMES) {
    const { src, from } = await loadSource(env, name);
    out[name] = { source: src, from };
  }
  return json({ ok: true, exportedAt: new Date().toISOString(), pages: out });
};
