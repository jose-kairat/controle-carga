// GET /api/avaliacoes — avaliações físicas (composição corporal, força, Illinois, salto, velocidade, VO2).
// Somente leitura e só para a comissão técnica (login obrigatório). Não usa o banco de dados.
import { getSession, unauthorized, forbidden } from '../_lib/auth.js';
import { AVALIACOES } from '../_lib/avaliacoes-data.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const session = await getSession(env, request);
    if (!session) return unauthorized();
    if (session.role !== 'staff') return forbidden();
    return new Response(JSON.stringify(AVALIACOES), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (err) {
    return new Response('server error: ' + err.message, { status: 500 });
  }
}
