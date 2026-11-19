// POST /api/roster-sync {roster, staffRoster} — full replace of the roster table, run inside
// one D1 batch (atomic). Roster/staff/password changes are infrequent and staff-only, so a
// simple full-replace is the least code and least risk of the options, and it matches how the
// frontend already keeps STATE.roster/staffRoster as the in-memory source of truth before
// calling this.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const roster = Array.isArray(body && body.roster) ? body.roster : [];
  const staffRoster = Array.isArray(body && body.staffRoster) ? body.staffRoster : [];

  for (const a of [...roster, ...staffRoster]) {
    if (!a || typeof a.name !== 'string' || typeof a.hash !== 'string') {
      return new Response('bad request: each entry needs name and hash', { status: 400 });
    }
  }

  try {
    const stmts = [env.DB.prepare('DELETE FROM roster')];
    for (const a of roster) {
      stmts.push(env.DB.prepare('INSERT INTO roster (name, role, hash) VALUES (?, ?, ?)').bind(a.name, 'athlete', a.hash));
    }
    for (const a of staffRoster) {
      stmts.push(env.DB.prepare('INSERT INTO roster (name, role, hash) VALUES (?, ?, ?)').bind(a.name, 'staff', a.hash));
    }
    await env.DB.batch(stmts);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
