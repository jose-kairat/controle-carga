// GET /api/state — reconstructs the app state from the database. Always current: no caching.
//
// What each caller gets:
//  - not logged in : only the names (so the login screen can list them) and whether each has a
//                    password. No entries, no hashes.
//  - athlete       : the names + THEIR OWN entries.
//  - staff         : the names + every athlete's entries.
// Password hashes are never returned.
import { ensureSchema, getSession } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    await ensureSchema(env);
    const session = await getSession(env, request);

    const rosterRows = await env.DB.prepare(
      "SELECT name, (hash != '') AS has_password FROM roster WHERE role = ? ORDER BY name"
    ).bind('athlete').all();
    const staffRows = await env.DB.prepare(
      "SELECT name, (hash != '') AS has_password FROM roster WHERE role = ? ORDER BY name"
    ).bind('staff').all();

    let entryRows = { results: [] };
    if (session && session.role === 'staff') {
      entryRows = await env.DB.prepare('SELECT * FROM entries ORDER BY date ASC').all();
    } else if (session && session.role === 'athlete') {
      entryRows = await env.DB.prepare('SELECT * FROM entries WHERE athlete = ? ORDER BY date ASC')
        .bind(session.name).all();
    }

    const entries = {};
    for (const row of entryRows.results) {
      if (!entries[row.athlete]) entries[row.athlete] = [];
      entries[row.athlete].push({
        date: row.date,
        sleep: row.sleep,
        fatigue: row.fatigue,
        dor: row.dor,
        dorRegiao: row.dor_regiao ? JSON.parse(row.dor_regiao) : null,
        stress: row.stress,
        pse: row.pse,
        duration: row.duration,
        load: row.load,
      });
    }

    const toPublic = (r) => ({ name: r.name, hasPassword: !!r.has_password });
    return Response.json({
      roster: rosterRows.results.map(toPublic),
      staffRoster: staffRows.results.map(toPublic),
      entries,
      me: session ? { name: session.name, role: session.role } : null,
    });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
