// 公开页 /terms:KV 取正文 → 同一份渲染器 → 外壳套版。 2026.09.07 Naron
import { renderPageResponse } from './_lib/page.js';
export const onRequestGet = ({ env }) => renderPageResponse(env, 'terms');
