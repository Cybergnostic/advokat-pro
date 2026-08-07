import { clientConfig, loadDomain } from '../_lib/domain.js';
import { errorResponse, resolveUser } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return Response.json({ error: 'D1 binding DB is not configured.' }, { status: 500 });

  try {
    await resolveUser(context, true);
    const domain = await loadDomain(db);
    return Response.json(clientConfig(domain), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('GET /api/config failed', error);
    return errorResponse(error, 'Configuration request failed.');
  }
}
