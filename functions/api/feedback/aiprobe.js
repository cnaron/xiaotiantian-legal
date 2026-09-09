// ⚠️ 临时探针(X123 颗粒 7 用完即删)—— 只为量 Workers AI 的真实延迟与输出形状。
// 能力上**不新增任何东西**:它做的事 = contact 里预审那一步,同一把 X-RC-Key 保护,
// 不读 KV、不碰 GitHub、不写任何数据。 2026.09.09 Naron
import {
  json_claudecode_20260908 as json, timingSafeEqual_claudecode_20260908 as tseq,
} from '../../_lib/feedback.js';
import { AI_MODEL_20260909, AI_TEMPERATURE_20260909, parseGuard_claudecode_20260909 as parseGuard } from '../../_lib/moderation.js';

export const onRequestPost = async ({ request, env }) => {
  if (!env.RC_KEY || !tseq(env.RC_KEY, request.headers.get('x-rc-key') || '')) {
    return json({ ok: false, err: 'forbidden' }, 403);
  }
  let data;
  try { data = JSON.parse(await request.text()); } catch (e) { return json({ ok: false, err: 'bad_request' }, 400); }
  const text = String((data && data.text) || '');
  if (!env.AI) return json({ ok: false, err: 'no_ai_binding' }, 200);
  const t0 = Date.now();
  let raw = null, err = '';
  try { raw = await env.AI.run(AI_MODEL_20260909, { messages: [{ role: 'user', content: text }], temperature: AI_TEMPERATURE_20260909 }); }
  catch (e) { err = String(e && e.message ? e.message : e); }
  const ms = Date.now() - t0;
  return json({ ok: err === '', ms, model: AI_MODEL_20260909, err, raw, parsed: parseGuard(raw) }, 200);
};
