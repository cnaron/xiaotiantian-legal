// POST /api/feedback/upload —— App 传一张已压缩的 JPEG 截图,存进 R2,返回一个公网可读的 URL。
// 契约(X123 颗粒 5 §3;X121 颗粒 15 照抄):
//   头   X-RC-Key / X-RC-Ticket-Id / X-RC-Ticket-Token / Content-Type: image/jpeg
//   体   **raw JPEG 字节**(不收 multipart —— 一条路一份测试,少一个解析器少一处坑)
//   出   200 {"ok":true,"key":"<ticketId>/<32hex>.jpg","url":"https://…/api/feedback/img/<key>","bytes":N}
//        403 forbidden(key 错 / token 与 id 对不上) · 400 bad_request(不是 JPEG / 空体 / id 不合法)
//        413 too_large(>1 MB) · 429 rate_limited(IP 桶或每工单每日 20 张) · 500 storage_unavailable
// ★ 两处「把等待藏起来」的写法,是量出来才加的(回执 §2.4:同一条链路、同一份 98 KB 图,
//   打「读完就扔」的探针 1.92s,打这个接口 3.57s ⇒ 服务端自己吃掉 1.56s,占总时长 44%):
//   ① 限流那次 KV 往返与**读上传体**并发跑 —— 反正都要等用户把字节传完,KV 的延迟就白赚了;
//   ② 发送记录用 waitUntil 事后写 —— 用户不需要等我们记完账才拿到 URL。
//   语义都没变:限流照样「每次尝试都计数」,记录照样写。
// 传图**不查工单存不存在**:token = HMAC(TICKET_SECRET, id),算得出来就证明这个 id 是我们发的;
//   查一次存在性要多打一次 GitHub,而国内链路上每一次往返都很贵(见回执 §2 耗时表)。
//   真正的存在性检查在 attach 那一步(它反正要写 GitHub)。
// 2026.09.08 Naron
import {
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
  clientIp_claudecode_20260908 as clientIp, cleanId_claudecode_20260908 as cleanId,
  ticketTokenValid_claudecode_20260908 as tokenValid,
  rateAllow_claudecode_20260908 as rateAllow, logBodyOn_claudecode_20260908 as logBodyOn,
  sendlogAppend_claudecode_20260908 as sendlog,
} from '../../_lib/feedback.js';
import {
  IMG_MAX_BYTES_20260908, IMG_RATE_MAX_20260908,
  newImgKey_claudecode_20260908 as newKey, imgUrl_claudecode_20260908 as imgUrl,
  looksLikeJpeg_claudecode_20260908 as looksLikeJpeg,
  imgDayQuota_claudecode_20260908 as dayQuota,
} from '../../_lib/images.js';

export const onRequestPost = async ({ request, env, waitUntil }) => {
  const kv = env.LEGAL_CONTENT || null;
  const ip = clientIp(request);
  const defer = typeof waitUntil === 'function' ? waitUntil : (p) => p;

  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  // ★ 先发车不等车到:这一次 KV 往返与下面的「读上传体」并发。
  //   同时挂 waitUntil —— 否则中途提前 return(比如 413)会把这个还没写完的计数**取消掉**,
  //   「每次尝试都计数」就成了「只有走到最后才计数」,限流会被超大包白嫖。
  const ratePromise = rateAllow(kv, ip, 'upload', IMG_RATE_MAX_20260908);
  defer(ratePromise);

  const id = cleanId(request.headers.get('x-rc-ticket-id') || '');
  const token = request.headers.get('x-rc-ticket-token') || '';
  if (id === '') return json({ ok: false, err: 'bad_request' }, 400);
  if (!(await tokenValid(env.TICKET_SECRET, id, token))) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }

  // 先看 Content-Length 挡掉大的,省得把 1 GB 读进内存
  const declared = parseInt(request.headers.get('content-length') || '0', 10) || 0;
  if (declared > IMG_MAX_BYTES_20260908) return json({ ok: false, err: 'too_large' }, 413);

  const buf = await request.arrayBuffer();
  if (!(await ratePromise)) return json({ ok: false, err: 'rate_limited' }, 429);
  if (buf.byteLength === 0) return json({ ok: false, err: 'bad_request' }, 400);
  if (buf.byteLength > IMG_MAX_BYTES_20260908) return json({ ok: false, err: 'too_large' }, 413);
  if (!looksLikeJpeg(buf)) return json({ ok: false, err: 'bad_request', detail: 'not_jpeg' }, 400);

  const quota = await dayQuota(kv, id);
  if (!quota.allow) return json({ ok: false, err: 'rate_limited', detail: 'daily_image_quota' }, 429);

  if (!env.FEEDBACK_IMG) return json({ ok: false, err: 'storage_unavailable' }, 500);
  const key = newKey(id);
  try {
    await env.FEEDBACK_IMG.put(key, buf, {
      httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { ticket: String(id), at: new Date().toISOString() },
    });
  } catch (e) {
    return json({ ok: false, err: 'storage_unavailable' }, 500);
  }

  // 发送记录:**记键不记图**(图本身在 R2,记录页里只会看到键名与字节数)。
  // waitUntil ⇒ 响应先回给用户,记账在后台写完(Workers 保证进程活到它 resolve)
  defer((async () => sendlog(kv, {
    api: 'upload', mode: 'image', id, deviceId8: '', to: 'R2 ' + key,
    subject: '工单图片上传 · ' + buf.byteLength + ' 字节',
    bodyHead: '(图片,不记录内容)', diag: '本日第 ' + quota.used + ' 张(上限 20)',
    log: '', logLines: 0, result: 'ok ' + buf.byteLength + ' 字节', err: '', issueUrl: '', reason: '',
  }, await logBodyOn(kv)))());

  return json({ ok: true, key, url: imgUrl(request, key), bytes: buf.byteLength }, 200);
};
