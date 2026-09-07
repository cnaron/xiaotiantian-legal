// /<page>/edit —— 直达某一页的编辑器;page 不在四页里 ⇒ 404。 2026.09.07 Naron
import { isAuthed } from '../_lib/auth.js';
import { loadSource, isPage } from '../_lib/page.js';
import { loginPage, editorPage } from '../_lib/editor.js';
import { NO_STORE } from '../_lib/auth.js';

export const onRequestGet = async ({ request, env, params }) => {
  const page = String(params.page || '');
  if (!isPage(page) || page === 'index') {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NO_STORE } });
  }
  if (!await isAuthed(request, env)) return loginPage(page);
  const { src } = await loadSource(env, page);
  return editorPage(page, src);
};
