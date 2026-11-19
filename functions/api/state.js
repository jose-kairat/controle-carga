// GET /api/state — reconstructs the full app state from the database. Always current: no
// caching, no "published version", no pin to go stale. This is the single source of truth
// every screen loads from (loadDocState() on the frontend).
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rosterRows = await env.DB.prepare(
      'SELECT name, hash FROM roster WHERE role = ? ORDER BY name'
    ).bind('athlete').all();
    const staffRows = await env.DB.prepare(
      'SELECT name, hash FROM roster WHERE role = ? ORDER BY name'
    ).bind('staff').all();
    const entryRows = await env.DB.prepare(
      'SELECT * FROM entries ORDER BY date ASC'
    ).all();

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

    return Response.json({
      roster: rosterRows.results,
      staffRoster: staffRows.results,
      entries,
    });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
