import { calculateActionFee, loadDomain } from '../_lib/domain.js';
import { errorResponse, resolveUser } from '../_lib/auth.js';

function parseDetails(value) {
  try { return JSON.parse(value || '{}'); } catch (_) { return {}; }
}

function rowsToState(cases, actions, deadlines, claims, attachments, payments, users, activity, domain, revision) {
  const userById = new Map(users.map((x) => [x.id, x]));
  const filesByAction = new Map();
  for (const f of attachments) {
    if (!filesByAction.has(f.action_id)) filesByAction.set(f.action_id, []);
    filesByAction.get(f.action_id).push({
      id: f.id,
      name: f.file_name,
      type: f.mime_type,
      size: f.file_size,
      r2Key: f.r2_key,
    });
  }

  const paymentsByCase = new Map();
  for (const pay of payments) {
    if (!paymentsByCase.has(pay.case_id)) paymentsByCase.set(pay.case_id, []);
    const creator = pay.created_by ? userById.get(pay.created_by) : null;
    paymentsByCase.get(pay.case_id).push({
      id: pay.id,
      amount: Number(pay.amount || 0),
      date: pay.payment_date,
      notes: pay.notes || '',
      createdBy: pay.created_by || '',
      createdByName: creator ? creator.display_name : '',
      createdAt: pay.created_at,
    });
  }

  const caseById = new Map(cases.map((x) => [x.id, x]));

  const p = cases.map((x) => {
    const assignee = x.assigned_user_id ? userById.get(x.assigned_user_id) : null;
    const uplate = paymentsByCase.get(x.id) || [];
    return {
      id: x.id,
      br: x.case_number,
      tuz: x.client,
      tuz2: x.other_party || '',
      klijentUloga: x.client_role || '',
      lbl1: x.label1 || '',
      lbl2: x.label2 || '',
      sud: x.court || '',
      tipSuda: x.court_type || '',
      tel: x.phone || '',
      vrsta: x.case_type,
      plac: uplate.reduce((sum, pay) => sum + Number(pay.amount || 0), 0),
      uplate,
      bel: x.notes || '',
      tipTuzilastva: x.prosecution_type || '',
      ktn: x.prosecution_number || '',
      jtuz: x.public_prosecutor || '',
      faza: x.phase || '',
      uloga: x.criminal_role || '',
      sld: Boolean(x.court_appointed),
      kazna: x.sentence_band == null ? null : Number(x.sentence_band),
      kdNaziv: x.offense_name || '',
      neprocenjiv: Boolean(x.non_assessable),
      nproIdx: x.non_assessable_index == null ? null : Number(x.non_assessable_index),
      vred: Number(x.dispute_value || 0),
      assignedUserId: x.assigned_user_id || '',
      assignedUserName: assignee ? assignee.display_name : '',
    };
  });

  const ra = actions.map((x) => ({
    id: x.id,
    pid: x.case_id,
    dat: x.action_date,
    vr: x.action_time || '',
    sala: x.courtroom || '',
    nap: x.notes || '',
    tip: x.action_type,
    naziv: x.name,
    status: x.status,
    iznos: calculateActionFee(domain, x, caseById.get(x.case_id)),
    files: filesByAction.get(x.id) || [],
  }));

  const k = deadlines.map((x) => ({
    id: x.id,
    pid: x.case_id,
    dat: x.decision_date,
    tr: Number(x.duration_days),
    krajIso: x.due_date,
    nap: x.notes || '',
  }));

  const mappedClaims = claims.map((x) => ({
    id: x.id,
    pid: x.case_id || '',
    br: x.case_number || '',
    klijent: x.client || '',
    iznos: Number(x.amount || 0),
    status: x.status,
    dat: x.decision_date || '',
    nap: x.notes || '',
    datUnos: x.entry_date || '',
    datPlacanja: x.paid_date || '',
  }));

  return {
    p,
    ra,
    k,
    pot: mappedClaims.filter((x) => x.status !== 'placeno'),
    arh: mappedClaims.filter((x) => x.status === 'placeno'),
    activity: activity.map((x) => ({
      id: Number(x.id),
      userId: x.user_id || '',
      userName: x.display_name || 'Sistem',
      action: x.action,
      entity: x.entity,
      entityId: x.entity_id || '',
      details: parseDetails(x.details),
      createdAt: x.created_at,
    })),
    revision: Number(revision || 0),
  };
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) return Response.json({ error: 'D1 binding DB is not configured.' }, { status: 500 });
    await resolveUser(context, true);

    const [cases, actions, deadlines, claims, attachments, payments, users, activity, revisionRow, domain] = await Promise.all([
      db.prepare('SELECT * FROM cases WHERE deleted_at IS NULL ORDER BY created_at ASC').all(),
      db.prepare('SELECT * FROM actions WHERE deleted_at IS NULL ORDER BY action_date ASC, action_time ASC, created_at ASC').all(),
      db.prepare('SELECT * FROM deadlines WHERE deleted_at IS NULL ORDER BY due_date ASC, created_at ASC').all(),
      db.prepare('SELECT * FROM claims WHERE deleted_at IS NULL ORDER BY created_at ASC').all(),
      db.prepare('SELECT * FROM attachments WHERE deleted_at IS NULL ORDER BY created_at ASC').all(),
      db.prepare('SELECT * FROM payments WHERE deleted_at IS NULL ORDER BY payment_date ASC, created_at ASC').all(),
      db.prepare('SELECT id, display_name, role FROM users WHERE active = 1').all(),
      db.prepare(`SELECT a.id, a.user_id, a.action, a.entity, a.entity_id, a.details, a.created_at, u.display_name
        FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.id DESC LIMIT 30`).all(),
      db.prepare('SELECT COALESCE(MAX(id), 0) AS revision FROM audit_log').first(),
      loadDomain(db),
    ]);

    return Response.json(
      rowsToState(
        cases.results || [], actions.results || [], deadlines.results || [], claims.results || [],
        attachments.results || [], payments.results || [], users.results || [], activity.results || [],
        domain, revisionRow && revisionRow.revision
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/state failed', error);
    return errorResponse(error, 'Database request failed.');
  }
}
