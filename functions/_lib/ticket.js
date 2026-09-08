// 工单定位:一个 id 到底存不存在、是什么形态。thread / reply 共用。
//
// ★ 为什么要「先定位再验 token」(与 PHP 版的区别,X121 颗粒 12 §10 第 1 条报的毛病):
//   token 是 HMAC(secret, id),对任何 id 都算得出来,所以「id 不存在」和「token 不对」
//   在 PHP 版里都落到 403,App 分不清「我这张票作废了」和「服务器不认识这个号」。
//   这里改成:先查这个 id 存不存在 —— 不存在一律 404,存在再看 token 对不对(403)。
//   代价:拿着 X-RC-Key 的人可以探测「issue #N 在不在」(拿不到内容),限流兜着。
// 2026.09.08 Naron
import { GH_REPO_20260908 as REPO, gh_claudecode_20260908 as gh } from './ghapp.js';

/**
 * @returns {kind:'test'|'queued'|'issue'|'none'|'unavailable', data, issue}
 *   unavailable = GitHub 用不了,判不了在不在(调用方回 409 not_ready)
 */
export async function resolveTicket_claudecode_20260908(kv, ghToken, id) {
  if (id.startsWith('t')) {
    const raw = kv ? await kv.get('fbtest:' + id).catch(() => null) : null;
    if (!raw) return { kind: 'none' };
    try { return { kind: 'test', data: JSON.parse(raw) }; } catch (e) { return { kind: 'none' }; }
  }
  if (id.startsWith('q')) {
    const raw = kv ? await kv.get('fbq:' + id).catch(() => null) : null;
    if (!raw) return { kind: 'none' };
    try { return { kind: 'queued', data: JSON.parse(raw) }; } catch (e) { return { kind: 'none' }; }
  }
  if (ghToken === '') return { kind: 'unavailable' };
  const res = await gh(ghToken, 'GET', `/repos/${REPO}/issues/${id}`, null);
  if (res.status === 404 || res.status === 410) return { kind: 'none' };
  if (!res.ok || !res.json) return { kind: 'unavailable' };
  // GitHub 的 issues 接口也会返回 PR;PR 不是我们的工单
  if (res.json.pull_request) return { kind: 'none' };
  return { kind: 'issue', issue: res.json };
}
