// POST /api/roster-sync {roster, staffRoster} — staff-only full replace of the roster list.
//
// Each item is {name} or {name, hash}. `hash` is only present when staff just created the
// account or reset its password; an item without `hash` keeps the password already stored.
// Anyone missing from the lists is removed (and loses their sessions). The only call allowed
// without being logged in is the very first staff-account setup, while no staff exists yet.
import { ensureSchema, getSession, unauthorized, forbidden, isHash } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const roster = Array.isArray(body && body.roster) ? body.roster : [];
  const staffRoster = Array.isArray(body && body.staffRoster) ? body.staffRoster : [];

  for (const a of [...roster, ...staffRoster]) {
    if (!a || typeof a.name !== 'string' || !a.name) {
      return new Response('bad request: each entry needs a name', { status: 400 });
    }
    if (a.hash !== undefined && !isHash(a.hash)) {
      return new Response('bad request: invalid hash', { status: 400 });
    }
  }

  try {
    await ensureSchema(env);
    const session = await getSession(env, request);
    const existingRows = (await env.DB.prepare('SELECT name, role, hash FROM roster').all()).results;
    const staffExists = existingRows.some((r) => r.role === 'staff');

    if (session) {
      if (session.role !== 'staff') return forbidden();
    } else if (staffExists) {
      return unauthorized();
    } else if (!staffRoster.length) {
      return new Response('bad request', { status: 400 }); // bootstrap must create a staff account
    }
    // Never allow a change that leaves the app with no staff account at all.
    if (!staffRoster.length) return new Response('bad request: at least one staff member required', { status: 400 });

    const oldHash = new Map(existingRows.map((r) => [r.role + ':' + r.name, r.hash]));
    const finalRows = [];
    const resetKeys = [];
    for (const [role, list] of [['athlete', roster], ['staff', staffRoster]]) {
      const seen = new Set();
      for (const a of list) {
        if (seen.has(a.name)) continue;
        seen.add(a.name);
        const key = role + ':' + a.name;
        const prev = oldHash.get(key);
        const hash = a.hash !== undefined ? a.hash : (prev || '');
        if (prev !== undefined && prev !== hash) resetKeys.push([a.name, role]);
        finalRows.push([a.name, role, hash]);
      }
    }

    const stmts = [env.DB.prepare('DELETE FROM roster')];
    for (const [name, role, hash] of finalRows) {
      stmts.push(env.DB.prepare('INSERT INTO roster (name, role, hash) VALUES (?, ?, ?)').bind(name, role, hash));
    }
    // Sessions of removed accounts, and of accounts whose password was just reset, are ended.
    for (const [name, role] of resetKeys) {
      stmts.push(env.DB.prepare('DELETE FROM sessions WHERE name = ? AND role = ?').bind(name, role));
    }
    stmts.push(env.DB.prepare(
      'DELETE FROM sessions WHERE NOT EXISTS (SELECT 1 FROM roster r WHERE r.name = sessions.name AND r.role = sessions.role)'
    ));
    await env.DB.batch(stmts);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
