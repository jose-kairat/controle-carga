// POST /api/entry {name, date, patch} — atomic upsert of one athlete/date row. `patch` carries
// only the fields the pré-treino or pós-treino form just collected; any field not present in
// patch keeps its existing value (read-merge-write against the current row). This is the one
// endpoint athletes hit, so it deliberately never touches the roster table — two different
// athletes (or the same athlete's pré and pós answers) submitting close together never race.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const { name, date, patch } = body || {};
  if (!name || typeof name !== 'string' || !date || typeof date !== 'string' || !patch || typeof patch !== 'object') {
    return new Response('bad request', { status: 400 });
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM entries WHERE athlete = ? AND date = ?'
    ).bind(name, date).first();

    const pick = (key) => (key in patch) ? patch[key] : (existing ? existing[key] : null);
    const sleep = pick('sleep');
    const fatigue = pick('fatigue');
    const dor = pick('dor');
    const dorRegiao = ('dorRegiao' in patch) ? patch.dorRegiao : (existing && existing.dor_regiao ? JSON.parse(existing.dor_regiao) : null);
    const stress = pick('stress');
    const pse = pick('pse');
    const duration = pick('duration');
    const load = pick('load');

    await env.DB.prepare(
      `INSERT INTO entries (athlete, date, sleep, fatigue, dor, dor_regiao, stress, pse, duration, load)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(athlete, date) DO UPDATE SET
         sleep=excluded.sleep, fatigue=excluded.fatigue, dor=excluded.dor, dor_regiao=excluded.dor_regiao,
         stress=excluded.stress, pse=excluded.pse, duration=excluded.duration, load=excluded.load`
    ).bind(
      name, date, sleep, fatigue, dor,
      dorRegiao ? JSON.stringify(dorRegiao) : null,
      stress, pse, duration, load
    ).run();

    // Prune this athlete's history beyond a rolling window — well past what the 7/28-day
    // ACWR charts use, keeps the table from growing without bound.
    const cutoff = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
    await env.DB.prepare('DELETE FROM entries WHERE athlete = ? AND date < ?').bind(name, cutoff).run();

    return Response.json({ ok: true });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
