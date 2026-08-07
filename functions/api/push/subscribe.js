function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const body = await context.request.json();
    const endpoint = String(body && body.endpoint || '').trim();
    if (!endpoint || !endpoint.startsWith('https://')) return json({ error: 'Invalid push endpoint.' }, 400);

    await db.prepare(`INSERT INTO push_subscriptions (endpoint)
      VALUES (?)
      ON CONFLICT(endpoint) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`)
      .bind(endpoint).run();

    return json({ ok: true });
  } catch (error) {
    console.error('POST /api/push/subscribe failed', error);
    return json({ error: error.message || 'Push subscription failed.' }, 500);
  }
}
