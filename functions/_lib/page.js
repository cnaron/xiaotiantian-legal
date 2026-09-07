// 外壳套版:与 build.py 的组装步骤**逐步对应**(占位符替换顺序、META 缩进都一致),
// 保证「Function 渲染出来的页面」与「build.py 生成的 docs/*.html」逐字节相同。
// assets.js 由 build.py 生成,不要手改。 2026.09.07 Naron
import { SHELL, CSS_MIN, PAGES, FALLBACK } from './assets.js';
import { render, renderPage } from './render.js';

export const PAGE_NAMES = ['index', 'privacy', 'terms', 'support'];

export function isPage(name) { return PAGE_NAMES.includes(name); }

// 组装步骤本身住在 render.js 里(浏览器预览要调同一份)⇒ 这里只是绑上本站资产
export function buildPage(name, src) {
  return renderPage(SHELL, CSS_MIN, PAGES[name], src);
}

// KV 取正文;取不到/出错 ⇒ 回退到构建时打包进来的静态正文(KV 挂了页面也在)
export async function loadSource(env, name) {
  try {
    if (env && env.LEGAL_CONTENT) {
      const v = await env.LEGAL_CONTENT.get('page:' + name);
      if (typeof v === 'string' && v.length) return { src: v, from: 'kv' };
    }
  } catch (e) { /* 落到回退 */ }
  return { src: FALLBACK[name], from: 'fallback' };
}

export async function renderPageResponse(env, name) {
  const { src, from } = await loadSource(env, name);
  const html = buildPage(name, src);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Source': from,
    },
  });
}
