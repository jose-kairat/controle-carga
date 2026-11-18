// POST /api/login {name, role, hash} — checks the password hash on the server and returns a
// session token. Repeated wrong passwords lock that account for a few minutes.
import { ensureSchema, isHash, safeEqual, newToken, SESSION_TTL_MS, LOCK_WINDOW_MS, LOCK_MAX_FAILS } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const { name, role, hash } = body || {};
  if (typeof name !== 'string' || !name || (role !== 'athlete' && role !== 'staff') || !isHash(hash)) {
    return new Response('bad request', { status: 400 });
  }

  try {
    await ensureSchema(env);
    const now = Date.now();
    const key = role + ':' + name;

    const fail = await env.DB.prepare('SELECT count, first_ts FROM login_fail WHERE key = ?').bind(key).first();
    if (fail && now - fail.first_ts < LOCK_WINDOW_MS && fail.count >= LOCK_MAX_FAILS) {
      return Response.json({ error: 'locked' }, { status: 429 });
    }

    const row = await env.DB.prepare('SELECT hash FROM roster WHERE name = ? AND role = ?').bind(name, role).first();
    if (!row || !row.hash) {
      return Response.json({ error: 'no_password' }, { status: 401 });
    }

    if (!safeEqual(row.hash, hash)) {
      if (fail && now - fail.first_ts < LOCK_WINDOW_MS) {
        await env.DB.prepare('UPDATE login_fail SET count = count + 1 WHERE key = ?').bind(key).run();
      } else {
        await env.DB.prepare(
          'INSERT INTO login_fail (key, count, first_ts) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, first_ts = excluded.first_ts'
        ).bind(key, now).run();
      }
      return Response.json({ error: 'wrong_password' }, { status: 401 });
    }

    const token = newToken();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM login_fail WHERE key = ?').bind(key),
      env.DB.prepare('DELETE FROM sessions WHERE created < ?').bind(now - SESSION_TTL_MS),
      env.DB.prepare('INSERT INTO sessions (token, name, role, created) VALUES (?, ?, ?, ?)').bind(token, name, role, now),
    ]);
    return Response.json({ ok: true, token, name, role });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
