// POST /api/logout → 清 cookie。 2026.09.07 Naron
import { clearCookie, json } from '../_lib/auth.js';
export const onRequestPost = () => json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
