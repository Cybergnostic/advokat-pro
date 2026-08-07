import { audit, errorResponse, resolveUser } from '../_lib/auth.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function extension(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function safeName(name) {
  return String(name || 'document').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'document';
}

function disposition(name, inline) {
  const original = safeName(name);
  const ascii = original
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '_') || 'document';
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(original)}`;
}

function startsWith(bytes, signature) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) if (bytes[i] !== signature[i]) return false;
  return true;
}

function signatureMatches(ext, bytes) {
  if (ext === 'pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (ext === 'png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === 'jpg' || ext === 'jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (ext === 'doc') return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (ext === 'docx') {
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
  }
  return false;
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

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const currentUser = await resolveUser(context, true);
    const form = await context.request.formData();
    const actionId = String(form.get('actionId') || '');
    const file = form.get('file');

    if (!actionId) return json({ error: 'Missing actionId.' }, 400);
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Missing file.' }, 400);

    const action = await db.prepare(`SELECT a.id, a.case_id, a.name, c.case_number
      FROM actions a JOIN cases c ON c.id = a.case_id
      WHERE a.id = ? AND a.deleted_at IS NULL AND c.deleted_at IS NULL`).bind(actionId).first();
    if (!action) return json({ error: 'Action not found.' }, 404);

    const ext = extension(file.name);
    const type = MIME_BY_EXTENSION[ext];
    if (!type) return json({ error: 'Unsupported file type.' }, 400);
    if (!file.size || file.size > MAX_FILE_SIZE) return json({ error: 'File is empty or larger than 10 MB.' }, 400);

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!signatureMatches(ext, bytes)) {
      return json({ error: 'Sadržaj datoteke ne odgovara njenoj ekstenziji.' }, 400);
    }

    const name = safeName(file.name);
    const uploaded = await drivePost(context, {
      op: 'upload', name, type, data: toBase64(buffer)
    });

    const id = crypto.randomUUID();
    try {
      await db.prepare(`INSERT INTO attachments
        (id, action_id, file_name, mime_type, file_size, r2_key, created_by)
        VALUES (?,?,?,?,?,?,?)`).bind(
          id, actionId, name, type, Number(file.size), uploaded.id, currentUser.id
        ).run();
    } catch (error) {
      try { await drivePost(context, { op: 'delete', id: uploaded.id }); } catch (_) {}
      throw error;
    }

    try {
      await audit(db, currentUser, 'create', 'attachment', id, {
        caseId: action.case_id, caseNumber: action.case_number, actionId, fileName: name, size: Number(file.size)
      });
    } catch (auditError) { console.error('Attachment audit failed', auditError); }

    return json({ id, name, type, size: Number(file.size), r2Key: uploaded.id }, 201);
  } catch (error) {
    console.error('POST /api/files failed', error);
    return errorResponse(error, 'File upload failed.');
  }
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    await resolveUser(context, true);
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare(`SELECT f.* FROM attachments f
      JOIN actions a ON a.id = f.action_id
      JOIN cases c ON c.id = a.case_id
      WHERE f.id = ? AND f.deleted_at IS NULL AND a.deleted_at IS NULL AND c.deleted_at IS NULL`)
      .bind(id).first();
    if (!row) return json({ error: 'File not found.' }, 404);

    const stored = await drivePost(context, { op: 'download', id: row.r2_key });
    const bytes = fromBase64(stored.data || '');
    const ext = extension(row.file_name);
    const type = MIME_BY_EXTENSION[ext] || 'application/octet-stream';
    const inline = type === 'application/pdf' || type.startsWith('image/');

    const headers = new Headers();
    headers.set('Content-Type', type);
    headers.set('Content-Disposition', disposition(row.file_name || stored.name, inline));
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Length', String(bytes.byteLength));
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");

    return new Response(bytes, { headers });
  } catch (error) {
    console.error('GET /api/files failed', error);
    return errorResponse(error, 'File download failed.');
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const currentUser = await resolveUser(context, true);
    const id = new URL(context.request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing file id.' }, 400);

    const row = await db.prepare(`SELECT f.*, a.case_id, c.case_number FROM attachments f
      JOIN actions a ON a.id = f.action_id
      JOIN cases c ON c.id = a.case_id
      WHERE f.id = ? AND f.deleted_at IS NULL`).bind(id).first();
    if (!row) return json({ ok: true });

    await db.prepare(`UPDATE attachments SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ? AND deleted_at IS NULL`).bind(currentUser.id, id).run();
    try {
      await audit(db, currentUser, 'delete', 'attachment', id, {
        caseId: row.case_id, caseNumber: row.case_number, fileName: row.file_name
      });
    } catch (auditError) { console.error('Attachment audit failed', auditError); }
    return json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/files failed', error);
    return errorResponse(error, 'File delete failed.');
  }
}
