import { calculateActionFee, loadDomain } from '../_lib/domain.js';

function rowsToState(cases, actions, deadlines, claims, attachments, domain) {
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

  const caseById = new Map(cases.map((x) => [x.id, x]));

  const p = cases.map((x) => ({
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
    plac: Number(x.paid_amount || 0),
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
  }));

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
  };
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    if (!db) {
      return Response.json({ error: 'D1 binding DB is not configured.' }, { status: 500 });
    }

    const [cases, actions, deadlines, claims, attachments, domain] = await Promise.all([
      db.prepare('SELECT * FROM cases ORDER BY created_at ASC').all(),
      db.prepare('SELECT * FROM actions ORDER BY action_date ASC, action_time ASC, created_at ASC').all(),
      db.prepare('SELECT * FROM deadlines ORDER BY due_date ASC, created_at ASC').all(),
      db.prepare('SELECT * FROM claims ORDER BY created_at ASC').all(),
      db.prepare('SELECT * FROM attachments ORDER BY created_at ASC').all(),
      loadDomain(db),
    ]);

    return Response.json(
      rowsToState(
        cases.results || [],
        actions.results || [],
        deadlines.results || [],
        claims.results || [],
        attachments.results || [],
        domain
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/state failed', error);
    return Response.json({ error: 'Database request failed.' }, { status: 500 });
  }
}
