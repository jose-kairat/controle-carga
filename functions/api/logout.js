// POST /api/logout — ends the current session.
import { ensureSchema, tokenFrom } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = tokenFrom(request);
  if (token) {
    try {
      await ensureSchema(env);
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    } catch (err) { /* best effort */ }
  }
  return Response.json({ ok: true });
}
