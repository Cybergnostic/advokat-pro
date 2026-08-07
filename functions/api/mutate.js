function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function requireFields(obj, fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) throw new Error(`Missing field: ${field}`);
  }
}

const VAPID_PUBLIC_KEY = 'BC8zQ_raNZBn5HL1-pd9l_ClLL0t7VNlAVrxgJBr2v7XDLNmJTcxRjIddbacBXi0sZqY7TraT-RMMmMuGVaDgb8';
const VAPID_SUBJECT = 'https://advokat-pro.pages.dev/';

function b64urlBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlText(value) {
  return b64urlBytes(new TextEncoder().encode(value));
}

function decodeB64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function vapidAuthorization(endpoint, privateD) {
  if (!privateD) throw new Error('VAPID_PRIVATE_KEY is not configured.');

  const pub = decodeB64url(VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('Invalid VAPID public key.');
  const x = b64urlBytes(pub.slice(1, 33));
  const y = b64urlBytes(pub.slice(33, 65));

  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', x, y, d: privateD,
    ext: true, key_ops: ['sign']
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const header = b64urlText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64urlText(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT
  }));
  const input = `${header}.${payload}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input)
  ));
  const jwt = `${input}.${b64urlBytes(signature)}`;
  return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;
}

async function sendCasePushes(context) {
  const privateD = context.env.VAPID_PRIVATE_KEY;
  if (!privateD) {
    console.warn('Web Push skipped: VAPID_PRIVATE_KEY is not configured.');
    return;
  }

  const rows = await context.env.DB.prepare('SELECT endpoint FROM push_subscriptions').all();
  const subscriptions = rows.results || [];
  await Promise.allSettled(subscriptions.map(async row => {
    try {
      const authorization = await vapidAuthorization(row.endpoint, privateD);
      const res = await fetch(row.endpoint, {
        method: 'POST',
        headers: {
          TTL: '60',
          Urgency: 'high',
          Authorization: authorization
        }
      });
      if (res.status === 404 || res.status === 410) {
        await context.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
      } else if (!res.ok) {
        console.warn('Push service returned', res.status, row.endpoint);
      }
    } catch (error) {
      console.warn('Push send failed', error);
    }
  }));
}

async function driveDelete(context, driveFileId) {
  if (!driveFileId) return;
  const url = context.env.GDRIVE_URL;
  const secret = context.env.GDRIVE_SECRET;
  if (!url || !secret) throw new Error('Google Drive storage is not configured.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'delete', id: driveFileId, secret }),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Google Drive bridge returned HTTP ${res.status}.`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Google Drive delete failed.');
}

async function deleteDriveFiles(context, rows) {
  if (!rows || !rows.length) return;
  for (const row of rows) {
    if (row.r2_key) await driveDelete(context, row.r2_key);
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const body = await context.request.json();
    const { entity, action, record, id, fields } = body || {};

    if (entity === 'case' && action === 'create') {
      requireFields(record, ['id', 'br', 'tuz', 'vrsta']);
      await db.prepare(`INSERT INTO cases (
        id, case_number, client, other_party, client_role, label1, label2, court, court_type, phone,
        case_type, paid_amount, notes, prosecution_type, prosecution_number, public_prosecutor, phase,
        criminal_role, court_appointed, sentence_band, offense_name, non_assessable,
        non_assessable_index, dispute_value
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        record.id, record.br, record.tuz, record.tuz2 || '', record.klijentUloga || '', record.lbl1 || '', record.lbl2 || '',
        record.sud || '', record.tipSuda || '', record.tel || '', record.vrsta, Number(record.plac || 0), record.bel || '',
        record.tipTuzilastva || '', record.ktn || '', record.jtuz || '', record.faza || '', record.uloga || '',
        record.sld ? 1 : 0, record.kazna ?? null, record.kdNaziv || '', record.neprocenjiv ? 1 : 0,
        record.nproIdx ?? null, Number(record.vred || 0)
      ).run();
      try { await sendCasePushes(context); } catch (pushError) { console.warn('Case push notification failed', pushError); }
      return json({ ok: true });
    }

    if (entity === 'case' && action === 'delete') {
      requireFields({ id }, ['id']);
      const files = await db.prepare(`SELECT a.r2_key FROM attachments a
        JOIN actions r ON r.id = a.action_id WHERE r.case_id = ?`).bind(id).all();
      await deleteDriveFiles(context, files.results || []);
      await db.prepare('DELETE FROM cases WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    if (entity === 'case' && action === 'update') {
      requireFields({ id }, ['id']);
      if (fields && fields.plac !== undefined) {
        await db.prepare('UPDATE cases SET paid_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(Number(fields.plac || 0), id).run();
        return json({ ok: true });
      }
    }

    if (entity === 'action' && action === 'create') {
      requireFields(record, ['id', 'pid', 'dat', 'tip', 'naziv']);
      await db.prepare(`INSERT INTO actions
        (id, case_id, action_date, action_time, courtroom, notes, action_type, name, status)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(
        record.id, record.pid, record.dat, record.vr || '', record.sala || '', record.nap || '',
        record.tip, record.naziv, record.status || 'done'
      ).run();
      return json({ ok: true });
    }

    if (entity === 'action' && action === 'delete') {
      requireFields({ id }, ['id']);
      const files = await db.prepare('SELECT r2_key FROM attachments WHERE action_id = ?').bind(id).all();
      await deleteDriveFiles(context, files.results || []);
      await db.prepare('DELETE FROM actions WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    if (entity === 'action' && action === 'update') {
      requireFields({ id }, ['id']);
      if (fields && fields.status !== undefined) {
        await db.prepare('UPDATE actions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(fields.status, id).run();
        return json({ ok: true });
      }
    }

    if (entity === 'deadline' && action === 'create') {
      requireFields(record, ['id', 'pid', 'dat', 'tr', 'krajIso']);
      await db.prepare(`INSERT INTO deadlines
        (id, case_id, decision_date, duration_days, due_date, notes)
        VALUES (?,?,?,?,?,?)`).bind(
        record.id, record.pid, record.dat, Number(record.tr), record.krajIso, record.nap || ''
      ).run();
      return json({ ok: true });
    }

    if (entity === 'deadline' && action === 'delete') {
      requireFields({ id }, ['id']);
      await db.prepare('DELETE FROM deadlines WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    if (entity === 'claim' && action === 'create') {
      requireFields(record, ['id', 'iznos', 'status']);
      await db.prepare(`INSERT INTO claims
        (id, case_id, case_number, client, amount, status, decision_date, notes, entry_date, paid_date)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
        record.id, record.pid || null, record.br || '', record.klijent || '', Number(record.iznos), record.status,
        record.dat || '', record.nap || '', record.datUnos || '', record.datPlacanja || ''
      ).run();
      return json({ ok: true });
    }

    if (entity === 'claim' && action === 'delete') {
      requireFields({ id }, ['id']);
      await db.prepare('DELETE FROM claims WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }

    if (entity === 'claim' && action === 'update') {
      requireFields({ id }, ['id']);
      if (fields && fields.status !== undefined) {
        if (fields.datPlacanja !== undefined) {
          await db.prepare('UPDATE claims SET status = ?, paid_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(fields.status, fields.datPlacanja || '', id).run();
        } else {
          await db.prepare('UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(fields.status, id).run();
        }
        return json({ ok: true });
      }
    }

    return json({ error: 'Unsupported mutation.' }, 400);
  } catch (error) {
    console.error('POST /api/mutate failed', error);
    return json({ error: error.message || 'Database mutation failed.' }, 500);
  }
}
