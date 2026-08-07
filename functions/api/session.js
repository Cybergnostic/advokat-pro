import { accessEmail, audit, errorResponse, resolveUser } from '../_lib/auth.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const email = accessEmail(context.request);
    if (!email) return json({ error: 'Cloudflare Access identity is missing.' }, 401);

    const [current, users] = await Promise.all([
      resolveUser(context, false),
      db.prepare(`SELECT id, display_name, role FROM users
        WHERE active = 1 ORDER BY CASE WHEN role = 'dev' THEN 2 ELSE 1 END, display_name COLLATE NOCASE`).all()
    ]);

    return json({
      current: current ? { id: current.id, displayName: current.display_name, role: current.role } : null,
      needsClaim: !current,
      users: (users.results || []).map((u) => ({ id: u.id, displayName: u.display_name, role: u.role }))
    });
  } catch (error) {
    console.error('GET /api/session failed', error);
    return errorResponse(error, 'Session request failed.');
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const email = accessEmail(context.request);
    if (!email) return json({ error: 'Cloudflare Access identity is missing.' }, 401);

    const existing = await resolveUser(context, false);
    if (existing) {
      return json({ current: { id: existing.id, displayName: existing.display_name, role: existing.role } });
    }

    const body = await context.request.json();
    const userId = String(body && body.userId || '').trim();
    if (!userId) return json({ error: 'Izaberite korisnički profil.' }, 400);

    const target = await db.prepare(`SELECT id, display_name, role, access_email
      FROM users WHERE id = ? AND active = 1`).bind(userId).first();
    if (!target) return json({ error: 'Korisnički profil ne postoji.' }, 404);
    if (target.access_email && String(target.access_email).toLowerCase() !== email) {
      return json({ error: 'Ovaj profil je već povezan sa drugim nalogom.' }, 409);
    }

    const emailOwner = await db.prepare('SELECT id FROM users WHERE lower(access_email) = ?').bind(email).first();
    if (emailOwner && emailOwner.id !== userId) {
      return json({ error: 'Ovaj Access nalog je već povezan sa drugim profilom.' }, 409);
    }

    await db.prepare('UPDATE users SET access_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(email, userId).run();

    const claimed = { id: target.id, display_name: target.display_name, role: target.role };
    await audit(db, claimed, 'claim', 'user', userId, { displayName: target.display_name });

    return json({ current: { id: target.id, displayName: target.display_name, role: target.role } });
  } catch (error) {
    console.error('POST /api/session failed', error);
    return errorResponse(error, 'Profile claim failed.');
  }
}
