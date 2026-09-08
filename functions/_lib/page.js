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

// 正文的强 ETag —— 让「每次都问一句」的代价降到一个 304。 2026.09.08 Naron
async function etagOf_claudecode_20260908(html) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // 弱 ETag(W/):Cloudflare 会对启用压缩的响应改写/丢弃**强** ETag(实测直接被剥掉,
  // 见 RECEIPT-X122-G6.md),弱 ETag 才留得住。语义上也正确:我们比的是「同一份正文」,
  // 不是「同一串字节的传输表示」。 2026.09.08 Naron
  return 'W/"' + hex.slice(0, 32) + '"';
}

// 缓存口径(X122 颗粒 6 改)。原来是 `max-age=300, s-maxage=600, stale-while-revalidate=86400`,
// 那条 SWR 的意思是「过期后 24 小时内浏览器可以先把上次存的旧页画出来,再后台更新」——
// 实测它让 owner 在编辑前一直看的是 68 分钟前的旧页,一保存才跳到最新,于是「只删了一行」
// 看起来像「整页重排了」(成因取证见 PREREG-X122-G6.md §一)。
// 「保存并发布」要名副其实,这里就不能留任何允许画旧页的余量:每次都条件请求,
// 没变回 304(几百字节),变了立刻拿新的。 2026.09.08 Naron
const PAGE_CACHE_CONTROL_20260908 = 'public, max-age=0, must-revalidate';

export async function renderPageResponse(env, name, request) {
  const { src, from } = await loadSource(env, name);
  const html = buildPage(name, src);
  const etag = await etagOf_claudecode_20260908(html);
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': PAGE_CACHE_CONTROL_20260908,
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Source': from,
  };
  // 条件请求:内容没变就别再传一遍整页
  const inm = request && request.headers ? request.headers.get('If-None-Match') : null;
  if (inm && inm.split(',').some((t) => t.trim() === etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(html, { headers });
}
