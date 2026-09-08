// GET/POST /api/feedback/netprobe —— **临时**链路测速端点(X123 颗粒 5 §2「先量再做」)。
//   目的:量国内(App server)与海外(mini)到 Cloudflare 边缘的**上传**耗时,
//   决定「要不要在服务端做点什么」还是「只能在 App 端压缩」。
//   它不写 R2、不调 GitHub、不记发送记录 —— 纯粹把字节读完就扔,量的是链路不是业务。
//   受 X-RC-Key 保护 + 走**自己的** probe 桶限流(200/10 分钟/IP;不占 thread 桶,
//   否则 10+10+10 次采样正好把 thread 的 30 次上限吃满,量到的就是 429 不是链路)。
//   ⚠️ 量完即删,不进 App 契约。 2026.09.08 Naron
import {
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, rateAllow_claudecode_20260908 as rateAllow,
} from '../../_lib/feedback.js';

const PROBE_MAX_BYTES_20260908 = 4 * 1024 * 1024;
const PROBE_RATE_MAX_20260908 = 200;
const PROBE_GET_MAX_20260908 = 2 * 1024 * 1024;

function guard_claudecode_20260908(request, env) {
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  return null;
}

export const onRequestPost = async ({ request, env }) => {
  const bad = guard_claudecode_20260908(request, env);
  if (bad) return bad;
  const kv = env.LEGAL_CONTENT || null;
  if (!(await rateAllow(kv, clientIp(request), 'probe', PROBE_RATE_MAX_20260908))) {
    return json({ ok: false, err: 'rate_limited' }, 429);
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > PROBE_MAX_BYTES_20260908) return json({ ok: false, err: 'too_large' }, 413);
  return json({ ok: true, bytes: buf.byteLength, colo: request.cf ? (request.cf.colo || '') : '' });
};

export const onRequestGet = async ({ request, env }) => {
  const bad = guard_claudecode_20260908(request, env);
  if (bad) return bad;
  const n = Math.min(parseInt(new URL(request.url).searchParams.get('bytes') || '0', 10) || 0,
    PROBE_GET_MAX_20260908);
  const body = new Uint8Array(n);
  crypto.getRandomValues(body.subarray(0, Math.min(n, 65536)));   // 前 64 KB 随机,防中间层压缩掉整段
  return new Response(body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-RC-Colo': request.cf ? (request.cf.colo || '') : '',
    },
  });
};
