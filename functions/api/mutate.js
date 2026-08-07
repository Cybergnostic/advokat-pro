import { sendPushToAll } from '../_lib/webpush.js';
import { calculateActionFee, loadDomain } from '../_lib/domain.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function requireFields(obj, fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) throw new Error(`Missing field: ${field}`);
  }
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

async function validateCaseDomain(db, record) {
  const type = await db.prepare('SELECT code, default_role FROM case_types WHERE code = ? AND active = 1')
    .bind(record.vrsta).first();
  if (!type) throw new Error('Nepoznata vrsta postupka.');

  if (record.klijentUloga) {
    const role = await db.prepare('SELECT code FROM case_roles WHERE case_type = ? AND code = ?')
      .bind(record.vrsta, record.klijentUloga).first();
    if (!role) throw new Error('Nepoznata uloga klijenta za izabrani postupak.');
  }
}

async function actionFeeFor(db, actionRow, caseRow) {
  if (!actionRow || !caseRow) return 0;
  const domain = await loadDomain(db);
  return calculateActionFee(domain, actionRow, caseRow);
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const body = await context.request.json();
    const { entity, action, record, id, fields } = body || {};

    if (entity === 'case' && action === 'create') {
      requireFields(record, ['id', 'br', 'tuz', 'vrsta']);
      await validateCaseDomain(db, record);
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
      try {
        await sendPushToAll(context.env, {
          title: 'Advokat Pro',
          body: `Novi predmet ${record.br} je dodat u zajedničku bazu.`,
          tag: `advokat-pro-case-${record.id}`,
          url: './'
        });
      } catch (pushError) { console.warn('Case push notification failed', pushError); }
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
      const caseRow = await db.prepare('SELECT * FROM cases WHERE id = ?').bind(record.pid).first();
      if (!caseRow) throw new Error('Predmet ne postoji.');

      const actionRow = {
        id: record.id,
        case_id: record.pid,
        action_date: record.dat,
        action_time: record.vr || '',
        courtroom: record.sala || '',
        notes: record.nap || '',
        action_type: record.tip,
        name: record.naziv,
        status: record.status || 'done'
      };
      const feeAmount = await actionFeeFor(db, actionRow, caseRow);

      await db.prepare(`INSERT INTO actions
        (id, case_id, action_date, action_time, courtroom, notes, action_type, name, status)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(
        actionRow.id, actionRow.case_id, actionRow.action_date, actionRow.action_time, actionRow.courtroom,
        actionRow.notes, actionRow.action_type, actionRow.name, actionRow.status
      ).run();
      return json({ ok: true, fee_amount: feeAmount });
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
        const actionRow = await db.prepare('SELECT * FROM actions WHERE id = ?').bind(id).first();
        const caseRow = actionRow ? await db.prepare('SELECT * FROM cases WHERE id = ?').bind(actionRow.case_id).first() : null;
        const feeAmount = await actionFeeFor(db, actionRow, caseRow);
        return json({ ok: true, fee_amount: feeAmount });
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
