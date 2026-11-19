// POST /api/login {name, role, hash} — checks the password hash on the server. Returns
// {ok:true} when it matches. Stateless: the browser keeps sending the credentials in headers.
import { isHash, verify } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const { name, role, hash } = body || {};
  if (typeof name !== 'string' || !name || (role !== 'athlete' && role !== 'staff') || !isHash(hash)) {
    return new Response('bad request', { status: 400 });
  }
  try {
    const row = await env.DB.prepare('SELECT hash FROM roster WHERE name = ? AND role = ?').bind(name, role).first();
    if (!row || !row.hash) return Response.json({ error: 'no_password' }, { status: 401 });
    if (!(await verify(env, name, role, hash))) return Response.json({ error: 'wrong_password' }, { status: 401 });
    return Response.json({ ok: true, name, role });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
