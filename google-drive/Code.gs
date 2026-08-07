const MAX_FILE_SIZE = 10 * 1024 * 1024;

function props_() {
  const p = PropertiesService.getScriptProperties();
  const secret = p.getProperty('API_SECRET');
  const folderId = p.getProperty('FOLDER_ID');
  if (!secret || !folderId) throw new Error('Missing API_SECRET or FOLDER_ID script property.');
  return { secret, folderId };
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function auth_(value) {
  const cfg = props_();
  if (!value || value !== cfg.secret) throw new Error('Forbidden');
  return cfg;
}

function managedFile_(id, cfg) {
  const file = DriveApp.getFileById(id);
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === cfg.folderId) return file;
  }
  throw new Error('File is outside the configured Advokat Pro folder.');
}

function download_(id, cfg) {
  if (!id) throw new Error('Missing file id.');
  const file = managedFile_(id, cfg);
  const blob = file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > MAX_FILE_SIZE) throw new Error('File is larger than 10 MB.');
  return {
    ok: true,
    id,
    name: file.getName(),
    type: blob.getContentType() || 'application/octet-stream',
    size: bytes.length,
    data: Utilities.base64Encode(bytes)
  };
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const cfg = auth_(body.secret);
    const op = String(body.op || '');

    if (op === 'upload') {
      const name = String(body.name || 'document');
      const type = String(body.type || 'application/octet-stream');
      const encoded = String(body.data || '');
      if (!encoded) throw new Error('Missing file data.');

      const bytes = Utilities.base64Decode(encoded);
      if (!bytes.length || bytes.length > MAX_FILE_SIZE) throw new Error('File is empty or larger than 10 MB.');

      const folder = DriveApp.getFolderById(cfg.folderId);
      const blob = Utilities.newBlob(bytes, type, name);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);

      return out_({ ok: true, id: file.getId(), name: file.getName(), type, size: bytes.length });
    }

    if (op === 'download') {
      return out_(download_(String(body.id || ''), cfg));
    }

    if (op === 'delete') {
      const id = String(body.id || '');
      if (!id) throw new Error('Missing file id.');
      managedFile_(id, cfg).setTrashed(true);
      return out_({ ok: true });
    }

    throw new Error('Unsupported operation.');
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Downloads intentionally no longer accept the shared secret in a query string.
function doGet() {
  return out_({ ok: false, error: 'Use POST.' });
}
