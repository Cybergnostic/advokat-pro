import { sendPushToUser } from '../_lib/webpush.js';
import { calculateActionFee, loadDomain } from '../_lib/domain.js';
import { audit, errorResponse, resolveUser } from '../_lib/auth.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function requireFields(obj, fields) {
  if (!obj || typeof obj !== 'object') throw new Error('Missing record.');
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      const error = new Error(`Missing field: ${field}`);
      error.status = 400;
      throw error;
    }
  }
}

function requireIsoDate(value, label = 'datum') {
  const v = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const error = new Error(`Neispravan ${label}.`);
    error.status = 400;
    throw error;
  }
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    const error = new Error(`Neispravan ${label}.`);
    error.status = 400;
    throw error;
  }
  return v;
}

function addCalendarDaysIso(start, days) {
  requireIsoDate(start, 'datum početka roka');
  const n = Number(days);
  if (!Number.isInteger(n) || n < 1 || n > 3650) {
    const error = new Error('Neispravno trajanje roka.');
    error.status = 400;
    throw error;
  }
  const [y, m, d] = start.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function belgradeToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const out = {};
  for (const part of parts) if (part.type !== 'literal') out[part.type] = part.value;
  return `${out.year}-${out.month}-${out.day}`;
}

function cleanText(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

async function safeAudit(db, user, action, entity, entityId, details) {
  try { await audit(db, user, action, entity, entityId, details); }
  catch (error) { console.error('Audit write failed', error); }
}

async function validateAssignedUser(db, id) {
  const user = await db.prepare('SELECT id, display_name FROM users WHERE id = ? AND active = 1').bind(id).first();
  if (!user) {
    const error = new Error('Izabrani zaduženi korisnik ne postoji.');
    error.status = 400;
    throw error;
  }
  return user;
}

async function validateCaseDomain(db, record) {
  const type = await db.prepare('SELECT code, default_role, is_criminal FROM case_types WHERE code = ? AND active = 1')
    .bind(record.vrsta).first();
  if (!type) {
    const error = new Error('Nepoznata vrsta postupka.');
    error.status = 400;
    throw error;
  }

  if (record.klijentUloga) {
    const role = await db.prepare('SELECT code FROM case_roles WHERE case_type = ? AND code = ?')
      .bind(record.vrsta, record.klijentUloga).first();
    if (!role) {
      const error = new Error('Nepoznata uloga klijenta za izabrani postupak.');
      error.status = 400;
      throw error;
    }
  }

  if (record.tipSuda && !['osnovni', 'visi', 'privredni'].includes(record.tipSuda)) {
    const error = new Error('Nepoznata vrsta suda.');
    error.status = 400;
    throw error;
  }
  return type;
}

async function activeCase(db, id) {
  const row = await db.prepare('SELECT * FROM cases WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!row) {
    const error = new Error('Predmet ne postoji ili je obrisan.');
    error.status = 404;
    throw error;
  }
  return row;
}

async function validateActionDefinition(db, caseRow, record) {
  if (!['podnesak', 'rociste'].includes(record.tip)) {
    const error = new Error('Nepoznat tip radnje.');
    error.status = 400;
    throw error;
  }
  const role = caseRow.criminal_role || caseRow.client_role || 'default';
  const row = await db.prepare(`SELECT id FROM action_types
    WHERE case_type = ? AND action_kind = ? AND name = ? AND active = 1
      AND client_role IN (?, 'default')
    ORDER BY CASE WHEN client_role = ? THEN 0 ELSE 1 END LIMIT 1`)
    .bind(caseRow.case_type, record.tip, record.naziv, role, role).first();
  if (!row) {
    const error = new Error('Izabrana procesna radnja nije dozvoljena za ovaj predmet.');
    error.status = 400;
    throw error;
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
    const currentUser = await resolveUser(context, true);
    const body = await context.request.json();
    const { entity, action, record, id, fields } = body || {};

    if (entity === 'case' && action === 'create') {
      requireFields(record, ['id', 'br', 'tuz', 'vrsta']);
      await validateCaseDomain(db, record);
      const assignedId = cleanText(record.assignedUserId || currentUser.id, 100);
      const assigned = await validateAssignedUser(db, assignedId);
      const initialPayment = Number(record.plac || 0);
      if (!Number.isFinite(initialPayment) || initialPayment < 0) {
        const error = new Error('Neispravan iznos uplate.'); error.status = 400; throw error;
      }

      const caseInsert = db.prepare(`INSERT INTO cases (
        id, case_number, client, other_party, client_role, label1, label2, court, court_type, phone,
        case_type, paid_amount, notes, prosecution_type, prosecution_number, public_prosecutor, phase,
        criminal_role, court_appointed, sentence_band, offense_name, non_assessable,
        non_assessable_index, dispute_value, assigned_user_id, created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        record.id, cleanText(record.br, 120), cleanText(record.tuz, 200), cleanText(record.tuz2, 200),
        cleanText(record.klijentUloga, 80), cleanText(record.lbl1, 100), cleanText(record.lbl2, 100),
        cleanText(record.sud, 200), cleanText(record.tipSuda, 40), cleanText(record.tel, 60),
        record.vrsta, 0, cleanText(record.bel, 1000), cleanText(record.tipTuzilastva, 80),
        cleanText(record.ktn, 120), cleanText(record.jtuz, 200), cleanText(record.faza, 80),
        cleanText(record.uloga, 80), record.sld ? 1 : 0, record.kazna ?? null, cleanText(record.kdNaziv, 300),
        record.neprocenjiv ? 1 : 0, record.nproIdx ?? null, Number(record.vred || 0), assignedId,
        currentUser.id, currentUser.id
      );

      const batch = [caseInsert];
      let initialPaymentRow = null;
      if (initialPayment > 0) {
        initialPaymentRow = {
          id: crypto.randomUUID(), amount: initialPayment, date: belgradeToday(), notes: 'Početno evidentirano plaćanje'
        };
        batch.push(db.prepare(`INSERT INTO payments
          (id, case_id, amount, payment_date, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?)`).bind(
            initialPaymentRow.id, record.id, initialPayment, initialPaymentRow.date,
            initialPaymentRow.notes, currentUser.id
          ));
      }
      await db.batch(batch);
      await safeAudit(db, currentUser, 'create', 'case', record.id, {
        caseNumber: cleanText(record.br, 120), client: cleanText(record.tuz, 200), assignedUser: assigned.display_name
      });
      if (initialPaymentRow) {
        await safeAudit(db, currentUser, 'create', 'payment', initialPaymentRow.id, {
          caseId: record.id, caseNumber: cleanText(record.br, 120), amount: initialPayment
        });
      }

      try {
        await sendPushToUser(context.env, assignedId, {
          title: 'Advokat Pro',
          body: `Novi predmet ${cleanText(record.br, 120)} je dodeljen korisniku ${assigned.display_name}.`,
          tag: `advokat-pro-case-${record.id}`,
          url: './'
        });
      } catch (pushError) { console.warn('Case push notification failed', pushError); }

      return json({ ok: true, initial_payment: initialPaymentRow });
    }

    if (entity === 'case' && action === 'delete') {
      requireFields({ id }, ['id']);
      const row = await activeCase(db, id);
      await db.prepare(`UPDATE cases SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_by = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`)
        .bind(currentUser.id, currentUser.id, id).run();
      await safeAudit(db, currentUser, 'delete', 'case', id, { caseNumber: row.case_number, client: row.client });
      return json({ ok: true });
    }

    if (entity === 'case' && action === 'update') {
      requireFields({ id }, ['id']);
      const row = await activeCase(db, id);
      if (fields && fields.assignedUserId !== undefined) {
        const assigned = await validateAssignedUser(db, cleanText(fields.assignedUserId, 100));
        await db.prepare(`UPDATE cases SET assigned_user_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND deleted_at IS NULL`).bind(assigned.id, currentUser.id, id).run();
        await safeAudit(db, currentUser, 'update', 'case', id, {
          caseNumber: row.case_number, field: 'assignedUser', assignedUser: assigned.display_name
        });
        return json({ ok: true });
      }
    }

    if (entity === 'action' && action === 'create') {
      requireFields(record, ['id', 'pid', 'dat', 'tip', 'naziv']);
      requireIsoDate(record.dat, 'datum radnje');
      const caseRow = await activeCase(db, record.pid);
      await validateActionDefinition(db, caseRow, record);
      const status = record.tip === 'rociste' ? cleanText(record.status || 'buduci', 20) : 'done';
      if (record.tip === 'rociste' && !['odrzano', 'odlozeno', 'buduci'].includes(status)) {
        const error = new Error('Nepoznat status ročišta.'); error.status = 400; throw error;
      }

      const actionRow = {
        id: record.id, case_id: record.pid, action_date: record.dat,
        action_time: cleanText(record.vr, 10), courtroom: cleanText(record.sala, 200),
        notes: cleanText(record.nap, 1000), action_type: record.tip,
        name: cleanText(record.naziv, 300), status
      };
      const feeAmount = await actionFeeFor(db, actionRow, caseRow);

      await db.prepare(`INSERT INTO actions
        (id, case_id, action_date, action_time, courtroom, notes, action_type, name, status, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(
        actionRow.id, actionRow.case_id, actionRow.action_date, actionRow.action_time, actionRow.courtroom,
        actionRow.notes, actionRow.action_type, actionRow.name, actionRow.status, currentUser.id, currentUser.id
      ).run();
      await safeAudit(db, currentUser, 'create', 'action', record.id, {
        caseId: caseRow.id, caseNumber: caseRow.case_number, name: actionRow.name, date: actionRow.action_date
      });
      return json({ ok: true, fee_amount: feeAmount });
    }

    if (entity === 'action' && action === 'delete') {
      requireFields({ id }, ['id']);
      const row = await db.prepare(`SELECT a.*, c.case_number FROM actions a
        JOIN cases c ON c.id = a.case_id WHERE a.id = ? AND a.deleted_at IS NULL`).bind(id).first();
      if (!row) return json({ ok: true });
      await db.prepare(`UPDATE actions SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_by = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`)
        .bind(currentUser.id, currentUser.id, id).run();
      await safeAudit(db, currentUser, 'delete', 'action', id, { caseNumber: row.case_number, name: row.name });
      return json({ ok: true });
    }

    if (entity === 'action' && action === 'update') {
      requireFields({ id }, ['id']);
      if (fields && fields.status !== undefined) {
        const status = cleanText(fields.status, 20);
        if (!['odrzano', 'odlozeno', 'buduci'].includes(status)) {
          const error = new Error('Nepoznat status ročišta.'); error.status = 400; throw error;
        }
        const before = await db.prepare(`SELECT a.*, c.case_number FROM actions a
          JOIN cases c ON c.id = a.case_id WHERE a.id = ? AND a.deleted_at IS NULL`).bind(id).first();
        if (!before) { const error = new Error('Radnja ne postoji.'); error.status = 404; throw error; }
        await db.prepare(`UPDATE actions SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND deleted_at IS NULL`).bind(status, currentUser.id, id).run();
        const actionRow = await db.prepare('SELECT * FROM actions WHERE id = ? AND deleted_at IS NULL').bind(id).first();
        const caseRow = actionRow ? await activeCase(db, actionRow.case_id) : null;
        const feeAmount = await actionFeeFor(db, actionRow, caseRow);
        await safeAudit(db, currentUser, 'update', 'action', id, {
          caseNumber: before.case_number, name: before.name, field: 'status', from: before.status, to: status
        });
        return json({ ok: true, fee_amount: feeAmount });
      }
    }

    if (entity === 'deadline' && action === 'create') {
      requireFields(record, ['id', 'pid', 'dat', 'tr']);
      const caseRow = await activeCase(db, record.pid);
      const dueDate = addCalendarDaysIso(record.dat, Number(record.tr));
      await db.prepare(`INSERT INTO deadlines
        (id, case_id, decision_date, duration_days, due_date, notes, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?)`).bind(
        record.id, record.pid, record.dat, Number(record.tr), dueDate, cleanText(record.nap, 1000),
        currentUser.id, currentUser.id
      ).run();
      await safeAudit(db, currentUser, 'create', 'deadline', record.id, {
        caseNumber: caseRow.case_number, dueDate, durationDays: Number(record.tr)
      });
      return json({ ok: true, due_date: dueDate });
    }

    if (entity === 'deadline' && action === 'delete') {
      requireFields({ id }, ['id']);
      const row = await db.prepare(`SELECT d.*, c.case_number FROM deadlines d
        JOIN cases c ON c.id = d.case_id WHERE d.id = ? AND d.deleted_at IS NULL`).bind(id).first();
      if (!row) return json({ ok: true });
      await db.prepare(`UPDATE deadlines SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_by = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`)
        .bind(currentUser.id, currentUser.id, id).run();
      await safeAudit(db, currentUser, 'delete', 'deadline', id, { caseNumber: row.case_number, dueDate: row.due_date });
      return json({ ok: true });
    }

    const validClaimStatuses = ['pravnosnazno', 'zalbeno', 'izvrsno', 'delimicno', 'placeno'];
    if (entity === 'claim' && action === 'create') {
      requireFields(record, ['id', 'iznos', 'status']);
      const amount = Number(record.iznos);
      if (!Number.isFinite(amount) || amount <= 0) { const error = new Error('Neispravan iznos potraživanja.'); error.status = 400; throw error; }
      if (!validClaimStatuses.includes(record.status)) { const error = new Error('Nepoznat status potraživanja.'); error.status = 400; throw error; }
      if (record.pid) await activeCase(db, record.pid);
      if (record.dat) requireIsoDate(record.dat, 'datum odluke');
      await db.prepare(`INSERT INTO claims
        (id, case_id, case_number, client, amount, status, decision_date, notes, entry_date, paid_date, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        record.id, record.pid || null, cleanText(record.br, 120), cleanText(record.klijent, 200), amount, record.status,
        record.dat || '', cleanText(record.nap, 1000), record.datUnos || belgradeToday(), record.datPlacanja || '',
        currentUser.id, currentUser.id
      ).run();
      await safeAudit(db, currentUser, 'create', 'claim', record.id, { caseNumber: cleanText(record.br, 120), amount });
      return json({ ok: true });
    }

    if (entity === 'claim' && action === 'delete') {
      requireFields({ id }, ['id']);
      const row = await db.prepare('SELECT * FROM claims WHERE id = ? AND deleted_at IS NULL').bind(id).first();
      if (!row) return json({ ok: true });
      await db.prepare(`UPDATE claims SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_by = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`)
        .bind(currentUser.id, currentUser.id, id).run();
      await safeAudit(db, currentUser, 'delete', 'claim', id, { caseNumber: row.case_number, amount: Number(row.amount || 0) });
      return json({ ok: true });
    }

    if (entity === 'claim' && action === 'update') {
      requireFields({ id }, ['id']);
      if (fields && fields.status !== undefined) {
        const status = cleanText(fields.status, 20);
        if (!validClaimStatuses.includes(status)) { const error = new Error('Nepoznat status potraživanja.'); error.status = 400; throw error; }
        const row = await db.prepare('SELECT * FROM claims WHERE id = ? AND deleted_at IS NULL').bind(id).first();
        if (!row) { const error = new Error('Potraživanje ne postoji.'); error.status = 404; throw error; }
        if (fields.datPlacanja !== undefined) {
          if (fields.datPlacanja) requireIsoDate(fields.datPlacanja, 'datum plaćanja');
          await db.prepare(`UPDATE claims SET status = ?, paid_date = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL`).bind(status, fields.datPlacanja || '', currentUser.id, id).run();
        } else {
          await db.prepare(`UPDATE claims SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL`).bind(status, currentUser.id, id).run();
        }
        await safeAudit(db, currentUser, 'update', 'claim', id, {
          caseNumber: row.case_number, field: 'status', from: row.status, to: status
        });
        return json({ ok: true });
      }
    }

    if (entity === 'payment' && action === 'create') {
      requireFields(record, ['pid', 'amount']);
      const caseRow = await activeCase(db, record.pid);
      const amount = Number(record.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        const error = new Error('Iznos uplate mora biti veći od nule.'); error.status = 400; throw error;
      }
      const paymentDate = record.date ? requireIsoDate(record.date, 'datum uplate') : belgradeToday();
      const paymentId = crypto.randomUUID();
      const notes = cleanText(record.notes, 500);
      await db.prepare(`INSERT INTO payments (id, case_id, amount, payment_date, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(paymentId, caseRow.id, amount, paymentDate, notes, currentUser.id).run();
      await safeAudit(db, currentUser, 'create', 'payment', paymentId, {
        caseId: caseRow.id, caseNumber: caseRow.case_number, amount, paymentDate
      });
      return json({ ok: true, payment: {
        id: paymentId, amount, date: paymentDate, notes, createdBy: currentUser.id,
        createdByName: currentUser.display_name
      }});
    }

    if (entity === 'payment' && action === 'delete') {
      requireFields({ id }, ['id']);
      const row = await db.prepare(`SELECT p.*, c.case_number FROM payments p
        JOIN cases c ON c.id = p.case_id WHERE p.id = ? AND p.deleted_at IS NULL`).bind(id).first();
      if (!row) return json({ ok: true });
      await db.prepare(`UPDATE payments SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
        WHERE id = ? AND deleted_at IS NULL`).bind(currentUser.id, id).run();
      await safeAudit(db, currentUser, 'delete', 'payment', id, {
        caseId: row.case_id, caseNumber: row.case_number, amount: Number(row.amount || 0)
      });
      return json({ ok: true });
    }

    return json({ error: 'Unsupported mutation.' }, 400);
  } catch (error) {
    console.error('POST /api/mutate failed', error);
    return errorResponse(error, 'Database mutation failed.');
  }
}
