import { errorResponse, resolveUser } from '../../_lib/auth.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const currentUser = await resolveUser(context, true);
    const body = await context.request.json();
    const endpoint = String(body && body.endpoint || '').trim();
    const p256dh = String(body && body.keys && body.keys.p256dh || '').trim();
    const auth = String(body && body.keys && body.keys.auth || '').trim();
    if (!endpoint || !endpoint.startsWith('https://')) return json({ error: 'Invalid push endpoint.' }, 400);
    if (!p256dh || !auth) return json({ error: 'Missing push encryption keys.' }, 400);

    await db.prepare(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = excluded.user_id,
        updated_at = CURRENT_TIMESTAMP`)
      .bind(endpoint, p256dh, auth, currentUser.id).run();

    return json({ ok: true, userId: currentUser.id });
  } catch (error) {
    console.error('POST /api/push/subscribe failed', error);
    return errorResponse(error, 'Push subscription failed.');
  }
}
