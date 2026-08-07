function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function accessEmail(request) {
  return normalizeEmail(request.headers.get('Cf-Access-Authenticated-User-Email'));
}

export async function resolveUser(context, required = true) {
  const db = context.env.DB;
  if (!db) throw new Error('D1 binding DB is not configured.');

  const email = accessEmail(context.request);
  if (!email) {
    if (required) {
      const error = new Error('Cloudflare Access identity is missing.');
      error.status = 401;
      throw error;
    }
    return null;
  }

  const user = await db.prepare(`SELECT id, display_name, role, access_email
    FROM users WHERE active = 1 AND lower(access_email) = ?`).bind(email).first();
  if (!user && required) {
    const error = new Error('Izaberite svoj korisnički profil pre korišćenja aplikacije.');
    error.status = 403;
    throw error;
  }
  return user || null;
}

export async function audit(db, user, action, entity, entityId, details = {}) {
  await db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?)`).bind(
      user && user.id ? user.id : null,
      String(action || ''),
      String(entity || ''),
      entityId == null ? null : String(entityId),
      JSON.stringify(details || {})
    ).run();
}

export function errorResponse(error, fallback = 'Request failed.') {
  const status = Number(error && error.status) || 500;
  return Response.json(
    { error: error && error.message ? error.message : fallback },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}
