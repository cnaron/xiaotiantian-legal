// GET /api/feedback/img/<ticketId>/<32hex>.jpg —— 从 R2 把图读出来。
//
// ★ 这条**故意不要 X-RC-Key**:issue 里的 `![截图](url)` 是 GitHub 的图片代理(camo)
//   在服务器侧去取的,它不会带我们的私有请求头。要能在 GitHub 网页上显示,就必须公网可读。
//   访问控制 = 键名 128 bit 随机猜不到。强度不如「私有仓库」,登记在回执诚实栏。
// 长缓存:键是一次性的,同一个键的内容永不变 ⇒ immutable 安全。
// 2026.09.08 Naron
import { validImgKey_claudecode_20260908 as validKey } from '../../../_lib/images.js';

export const onRequestGet = async ({ params, env }) => {
  const key = Array.isArray(params.key) ? params.key.join('/') : String(params.key || '');
  if (!validKey(key)) return new Response('not found', { status: 404, headers: nf_claudecode_20260908() });
  if (!env.FEEDBACK_IMG) return new Response('storage unavailable', { status: 503, headers: nf_claudecode_20260908() });

  const obj = await env.FEEDBACK_IMG.get(key).catch(() => null);
  if (!obj) return new Response('not found', { status: 404, headers: nf_claudecode_20260908() });

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
      ETag: obj.httpEtag,
    },
  });
};

function nf_claudecode_20260908() {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
  };
}
