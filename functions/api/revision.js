import { errorResponse, resolveUser } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return Response.json({ error: 'D1 binding DB is not configured.' }, { status: 500 });

  try {
    await resolveUser(context, true);
    const row = await db.prepare('SELECT COALESCE(MAX(id), 0) AS revision FROM audit_log').first();
    return Response.json(
      { revision: Number(row && row.revision || 0) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/revision failed', error);
    return errorResponse(error, 'Revision request failed.');
  }
}
