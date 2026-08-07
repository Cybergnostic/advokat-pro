import { clientConfig, loadDomain } from '../_lib/domain.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return Response.json({ error: 'D1 binding DB is not configured.' }, { status: 500 });

  try {
    const domain = await loadDomain(db);
    return Response.json(clientConfig(domain), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('GET /api/config failed', error);
    return Response.json({ error: error.message || 'Configuration request failed.' }, { status: 500 });
  }
}
