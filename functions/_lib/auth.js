// Shared server-side auth helpers for the /api/* functions.
//
// Passwords are never checked in the browser anymore: the browser sends the SHA-256 hash of the
// password to /api/login, the server compares it with the stored hash and, if it matches, hands
// back a random session token. Every protected endpoint then checks that token. Password hashes
// are never sent back to any client.

let schemaReady = false;

// Creates the auth tables on first use, so no manual migration is needed on the existing D1 DB.
export async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
         token TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         role TEXT NOT NULL,
         created INTEGER NOT NULL
       )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS login_fail (
         key TEXT PRIMARY KEY,
         count INTEGER NOT NULL,
         first_ts INTEGER NOT NULL
       )`
    ),
  ]);
  schemaReady = true;
}

export const SESSION_TTL_MS = 30 * 86400000;      // sessions last 30 days
export const LOCK_WINDOW_MS = 10 * 60000;         // failed-login window
export const LOCK_MAX_FAILS = 8;                  // failures allowed inside the window

export function isHash(h) {
  return typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function tokenFrom(request) {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer ([0-9a-f]{64})$/.exec(h);
  return m ? m[1] : null;
}

// Returns {name, role, token} for a valid, non-expired session, otherwise null.
export async function getSession(env, request) {
  const token = tokenFrom(request);
  if (!token) return null;
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT name, role, created FROM sessions WHERE token = ?')
    .bind(token).first();
  if (!row) return null;
  if (Date.now() - row.created > SESSION_TTL_MS) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  // The account must still exist (removed athletes/staff lose access immediately).
  const still = await env.DB.prepare('SELECT 1 AS ok FROM roster WHERE name = ? AND role = ?')
    .bind(row.name, row.role).first();
  if (!still) return null;
  return { name: row.name, role: row.role, token };
}

export function unauthorized(error) {
  return Response.json({ error: error || 'unauthorized' }, { status: 401 });
}
export function forbidden() {
  return Response.json({ error: 'forbidden' }, { status: 403 });
}
