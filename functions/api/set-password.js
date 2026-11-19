// POST /api/set-password {hash} — the logged-in athlete/staff member changes THEIR OWN password.
// (Staff resetting someone else's password goes through /api/roster-sync.)
import { ensureSchema, getSession, unauthorized, isHash } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const { hash } = body || {};
  if (!isHash(hash)) return new Response('bad request', { status: 400 });

  try {
    await ensureSchema(env);
    const session = await getSession(env, request);
    if (!session) return unauthorized();
    await env.DB.prepare('UPDATE roster SET hash = ? WHERE name = ? AND role = ?').bind(hash, session.name, session.role).run();
    return Response.json({ ok: true });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
