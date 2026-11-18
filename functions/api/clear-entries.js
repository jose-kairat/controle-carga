// POST /api/clear-entries {name} — staff "limpar dados" action: wipes one athlete's history.
import { ensureSchema, getSession, unauthorized, forbidden } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const name = body && body.name;
  if (!name || typeof name !== 'string') return new Response('bad request', { status: 400 });

  try {
    await ensureSchema(env);
    const session = await getSession(env, request);
    if (!session) return unauthorized();
    if (session.role !== 'staff') return forbidden();
    await env.DB.prepare('DELETE FROM entries WHERE athlete = ?').bind(name).run();
    return Response.json({ ok: true });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
