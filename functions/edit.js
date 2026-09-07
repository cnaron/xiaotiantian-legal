// /edit —— 未登录出口令页,已登录出编辑器(默认目录页)。 2026.09.07 Naron
import { isAuthed } from './_lib/auth.js';
import { loadSource } from './_lib/page.js';
import { loginPage, editorPage } from './_lib/editor.js';

export const onRequestGet = async ({ request, env }) => {
  if (!await isAuthed(request, env)) return loginPage('index');
  const { src } = await loadSource(env, 'index');
  return editorPage('index', src);
};
