const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function drivePost(context, payload) {
  const url = context.env.GDRIVE_URL;
  const secret = context.env.GDRIVE_SECRET;
  if (!url || !secret) throw new Error('Google Drive storage is not configured.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret }),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Google Drive bridge returned HTTP ${res.status}.`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Google Drive operation failed.');
  return data;
}

async function driveGet(context, params) {
  const base = context.env.GDRIVE_URL;
  const secret = context.env.GDRIVE_SECRET;
  if (!base || !secret) throw new Error('Google Drive storage is not configured.');

  const url = new URL(base);
  for (const [key, value] of Object.entries({ ...params, secret })) url.searchParams.set(key, value);
  const res = await fetch(url.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error(`Google Drive bridge returned HTTP ${res.status}.`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Google Drive operation failed.');
  return data;
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const form = await context.request.formData();
    const actionId = String(form.get('actionId') || '');
    const file = form.get('file');

    if (!actionId) return json({ error: 'Missing actionId.' }, 400);
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Missing file.' }, 400);

    const action = await db.prepare('SELECT id FROM actions WHERE id = ?').bind(actionId).first();
    if (!action) return json({ error: 'Action not found.' }, 404);

    const ext = extension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) return json({ error: 'Unsupported file type.' }, 400);
    if (!file.size || file.size > MAX_FILE_SIZE) return json({ error: 'File is empty or larger than 10 MB.' }, 400);

    const type = file.type || 'application/octet-stream';
    const buffer = await file.arrayBuffer();
    const uploaded = await drivePost(context, {
      op: 'upload',
      name: file.name,
      type,
      data: toBase64(buffer)
    });

    const id = crypto.randomUUID();
    try {
      await db.prepare(`INSERT INTO attachments
        (id, action_id, file_name, mime_type, file_size, r2_key)
        VALUES (?,?,?,?,?,?)`).bind(id, actionId, file.name, type, Number(file.size), uploaded.id).run();
    } catch (error) {
      try { await drivePost(context, { op: 'delete', id: uploaded.id }); } catch (_) {}
      throw error;
    }

    return json({ id, name: file.name, type, size: Number(file.size), r2Key: uploaded.id }, 201);
  } catch (error) {
    console.error('POST /api/files failed', error);
    return json({ error: error.message || 'File upload failed.' }, 500);
  }
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare('SELECT * FROM attachments WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'File not found.' }, 404);

    const stored = await driveGet(context, { op: 'download', id: row.r2_key });
    const bytes = fromBase64(stored.data || '');

    const headers = new Headers();
    headers.set('Content-Type', row.mime_type || stored.type || 'application/octet-stream');
    headers.set('Content-Disposition', disposition(row.file_name || stored.name));
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Length', String(bytes.byteLength));

    return new Response(bytes, { headers });
  } catch (error) {
    console.error('GET /api/files failed', error);
    return json({ error: error.message || 'File download failed.' }, 500);
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare('SELECT r2_key FROM attachments WHERE id = ?').bind(id).first();
    if (!row) return json({ ok: true });

    await drivePost(context, { op: 'delete', id: row.r2_key });
    await db.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/files failed', error);
    return json({ error: error.message || 'File delete failed.' }, 500);
  }
}
