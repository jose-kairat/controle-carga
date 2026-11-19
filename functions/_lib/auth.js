// Shared server-side auth helpers for the /api/* functions.
//
// Deliberately simple and stateless: no sessions table, no extra tables, nothing to migrate.
// The browser sends the SHA-256 hash of the password in request headers (X-CC-Name, X-CC-Role,
// X-CC-Hash) and the server compares it with the stored hash on every protected call. Password
// hashes are never sent back to any client, so they can no longer be read from /api/state.

export function isHash(h) {
  return typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// True when (name, role, hash) matches an account in the roster.
export async function verify(env, name, role, hash) {
  if (typeof name !== 'string' || !name || (role !== 'athlete' && role !== 'staff') || !isHash(hash)) return false;
  const row = await env.DB.prepare('SELECT hash FROM roster WHERE name = ? AND role = ?').bind(name, role).first();
  return !!(row && row.hash && safeEqual(row.hash, hash));
}

// Returns {name, role, hash} when the request carries valid credentials, otherwise null.
export async function getSession(env, request) {
  const h = request.headers;
  let name = h.get('X-CC-Name');
  const role = h.get('X-CC-Role');
  const hash = h.get('X-CC-Hash');
  if (!name || !role || !hash) return null;
  try { name = decodeURIComponent(name); } catch (e) { return null; }
  return (await verify(env, name, role, hash)) ? { name, role, hash } : null;
}

// Kept so every endpoint reads the same as before; there is no schema to create anymore.
export async function ensureSchema() {}

export function unauthorized(error) {
  return Response.json({ error: error || 'unauthorized' }, { status: 401 });
}
export function forbidden() {
  return Response.json({ error: 'forbidden' }, { status: 403 });
}
