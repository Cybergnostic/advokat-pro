const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function extension(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function disposition(name) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(String(name || 'document'))}`;
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  const bucket = context.env.FILES;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);
  if (!bucket) return json({ error: 'R2 binding FILES is not configured.' }, 500);

  try {
    const form = await context.request.formData();
    const actionId = String(form.get('actionId') || '');
    const file = form.get('file');

    if (!actionId) return json({ error: 'Missing actionId.' }, 400);
    if (!file || typeof file.stream !== 'function') return json({ error: 'Missing file.' }, 400);

    const action = await db.prepare('SELECT id FROM actions WHERE id = ?').bind(actionId).first();
    if (!action) return json({ error: 'Action not found.' }, 404);

    const ext = extension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) return json({ error: 'Unsupported file type.' }, 400);
    if (!file.size || file.size > MAX_FILE_SIZE) return json({ error: 'File is empty or larger than 25 MB.' }, 400);

    const id = crypto.randomUUID();
    const key = `actions/${actionId}/${id}`;
    const type = file.type || 'application/octet-stream';

    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: type },
      customMetadata: { attachmentId: id, actionId }
    });

    try {
      await db.prepare(`INSERT INTO attachments
        (id, action_id, file_name, mime_type, file_size, r2_key)
        VALUES (?,?,?,?,?,?)`).bind(id, actionId, file.name, type, Number(file.size), key).run();
    } catch (error) {
      await bucket.delete(key);
      throw error;
    }

    return json({ id, name: file.name, type, size: Number(file.size), r2Key: key }, 201);
  } catch (error) {
    console.error('POST /api/files failed', error);
    return json({ error: error.message || 'File upload failed.' }, 500);
  }
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  const bucket = context.env.FILES;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);
  if (!bucket) return json({ error: 'R2 binding FILES is not configured.' }, 500);

  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare('SELECT * FROM attachments WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'File not found.' }, 404);

    const object = await bucket.get(row.r2_key);
    if (!object) return json({ error: 'Stored object not found.' }, 404);

    const headers = new Headers();
    headers.set('Content-Type', row.mime_type || object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', disposition(row.file_name));
    headers.set('Cache-Control', 'private, no-store');
    if (row.file_size) headers.set('Content-Length', String(row.file_size));
    if (object.httpEtag) headers.set('ETag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('GET /api/files failed', error);
    return json({ error: 'File download failed.' }, 500);
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  const bucket = context.env.FILES;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);
  if (!bucket) return json({ error: 'R2 binding FILES is not configured.' }, 500);

  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare('SELECT r2_key FROM attachments WHERE id = ?').bind(id).first();
    if (!row) return json({ ok: true });

    await bucket.delete(row.r2_key);
    await db.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/files failed', error);
    return json({ error: 'File delete failed.' }, 500);
  }
}
