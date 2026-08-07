function num(v) {
  return Number(v || 0);
}

function bool(v) {
  return !!Number(v || 0);
}

export async function loadDomain(db) {
  const [caseTypes, roles, actions, civil, nonAssessable, criminal, offenses] = await db.batch([
    db.prepare('SELECT * FROM case_types WHERE active = 1 ORDER BY sort_order, code'),
    db.prepare('SELECT * FROM case_roles ORDER BY case_type, sort_order, code'),
    db.prepare('SELECT * FROM action_types WHERE active = 1 ORDER BY case_type, client_role, action_kind, sort_order, id'),
    db.prepare('SELECT * FROM tariff_civil_bands ORDER BY id'),
    db.prepare('SELECT * FROM tariff_non_assessable ORDER BY id'),
    db.prepare('SELECT * FROM tariff_criminal_bands ORDER BY id'),
    db.prepare('SELECT * FROM criminal_offenses ORDER BY name COLLATE NOCASE')
  ]);

  const out = {
    caseTypes: caseTypes.results || [],
    roles: roles.results || [],
    actions: actions.results || [],
    civil: civil.results || [],
    nonAssessable: nonAssessable.results || [],
    criminal: criminal.results || [],
    offenses: offenses.results || []
  };

  out.caseTypeByCode = new Map(out.caseTypes.map((x) => [x.code, x]));
  out.nonAssessableById = new Map(out.nonAssessable.map((x) => [Number(x.id), x]));
  out.criminalById = new Map(out.criminal.map((x) => [Number(x.id), x]));
  return out;
}

export function civilTariff(domain, value) {
  const v = num(value);
  if (v <= 0) return null;

  for (const row of domain.civil) {
    if (v <= num(row.max_value)) {
      return {
        pod: num(row.submission),
        roc: num(row.hearing),
        neo: num(row.nonheld),
        zal: num(row.appeal)
      };
    }
  }

  if (v <= 135000000) {
    const extra = Math.ceil((v - 33350000) / 500000) * 50;
    const pod = 75000 + extra;
    return { pod, roc: pod + 5000, neo: Math.round(pod / 2) + 5000, zal: pod * 2 };
  }
  if (v <= 335000000) {
    const extra = Math.ceil((v - 135000000) / 1500000) * 50;
    const pod = 85200 + extra;
    return { pod, roc: pod + 5000, neo: Math.round(pod / 2) + 5000, zal: pod * 2 };
  }

  const extra = Math.ceil((v - 335000000) / 7500000) * 50;
  const pod = Math.min(91900 + extra, 141900);
  return { pod, roc: pod + 5000, neo: Math.round(pod / 2) + 5000, zal: pod * 2 };
}

export function enforcementTariff(domain, value) {
  const t = civilTariff(domain, value);
  if (!t) return null;
  return {
    pod: Math.round(t.pod * 0.75),
    roc: Math.round(t.roc * 0.75),
    neo: Math.round(t.neo * 0.75),
    zal: Math.round(t.zal * 0.75)
  };
}

export function nonAssessableTariff(domain, index) {
  const row = domain.nonAssessableById.get(Number(index));
  if (!row) return null;
  return {
    label: row.label,
    pod: num(row.submission),
    roc: num(row.hearing),
    neo: num(row.nonheld),
    zal: num(row.appeal)
  };
}

export function criminalTariff(domain, index, clientRole, courtAppointed) {
  const row = domain.criminalById.get(Number(index));
  if (!row) return null;

  let t = {
    od: num(row.defense),
    zo: num(row.injured_or_nonheld),
    zal: num(row.appeal),
    ini: num(row.initial_act),
    ost: num(row.other_submission)
  };

  if (clientRole === 'osteceni') {
    t = { od: t.zo, zo: t.zo, zal: t.zal, ini: t.ost, ost: t.ost };
  }
  if (courtAppointed && clientRole !== 'osteceni') {
    for (const key of Object.keys(t)) t[key] = Math.round(t[key] * 0.5);
  }
  return t;
}

export function courtFee(value, courtType) {
  const v = num(value);
  if (v <= 0) return null;
  let t;

  if (courtType === 'privredni') {
    if (v <= 100000) t = 4700;
    else if (v <= 500000) t = Math.round(4700 + (v - 100000) * 0.03);
    else if (v <= 1000000) t = Math.round(16700 + (v - 500000) * 0.025);
    else if (v <= 5000000) t = Math.round(29200 + (v - 1000000) * 0.015);
    else t = Math.min(Math.round(89200 + (v - 5000000) * 0.005), 195000);
  } else {
    if (v <= 10000) t = 1900;
    else if (v <= 100000) t = Math.round(1900 + (v - 10000) * 0.04);
    else if (v <= 500000) t = Math.round(9800 + (v - 100000) * 0.02);
    else if (v <= 1000000) t = Math.round(29300 + (v - 500000) * 0.01);
    else t = Math.min(Math.round(48800 + (v - 1000000) * 0.005), 97500);
    if (courtType === 'visi') t = Math.round(t * 1.3);
  }

  return { tuzba: t, presuda: t, zalba: Math.round(t * 0.5) };
}

function actionDefinition(domain, caseType, clientRole, kind, name) {
  const exact = domain.actions.find((x) =>
    x.case_type === caseType &&
    x.client_role === clientRole &&
    x.action_kind === kind &&
    x.name === name
  );
  if (exact) return exact;
  return domain.actions.find((x) =>
    x.case_type === caseType &&
    x.client_role === 'default' &&
    x.action_kind === kind &&
    x.name === name
  ) || null;
}

function caseTariff(domain, caseRow) {
  const type = domain.caseTypeByCode.get(caseRow.case_type);
  if (!type) return null;
  if (type.tariff_family === 'civil') {
    if (bool(caseRow.non_assessable)) return nonAssessableTariff(domain, caseRow.non_assessable_index);
    return civilTariff(domain, caseRow.dispute_value);
  }
  if (type.tariff_family === 'enforcement') return enforcementTariff(domain, caseRow.dispute_value);
  return null;
}

export function calculateActionFee(domain, actionRow, caseRow) {
  if (!actionRow || !caseRow) return 0;
  if (actionRow.action_type === 'rociste' && actionRow.status === 'buduci') return 0;

  const def = actionDefinition(
    domain,
    caseRow.case_type,
    caseRow.criminal_role || caseRow.client_role || 'default',
    actionRow.action_type,
    actionRow.name
  );
  if (!def) return 0;

  if (def.price_mode === 'fixed') {
    if (actionRow.action_type === 'rociste' && actionRow.status === 'odlozeno') {
      return def.postponed_fixed_amount == null ? 0 : num(def.postponed_fixed_amount);
    }
    return def.fixed_amount == null ? 0 : num(def.fixed_amount);
  }

  if (def.price_mode === 'criminal') {
    const tariff = criminalTariff(
      domain,
      caseRow.sentence_band,
      caseRow.criminal_role || '',
      bool(caseRow.court_appointed)
    );
    if (!tariff) return 0;
    const key = actionRow.action_type === 'rociste' && actionRow.status === 'odlozeno'
      ? def.postponed_price_key
      : def.price_key;
    return key ? num(tariff[key]) : 0;
  }

  if (def.price_mode === 'tariff') {
    const tariff = caseTariff(domain, caseRow);
    if (!tariff) return 0;
    const key = actionRow.action_type === 'rociste' && actionRow.status === 'odlozeno'
      ? def.postponed_price_key
      : def.price_key;
    return key ? num(tariff[key]) : 0;
  }

  return 0;
}

function limitationYears(maxYears, lifeSentence) {
  const m = num(maxYears);
  if (lifeSentence || m >= 40) return { regular: 20, absolute: 40 };
  if (m > 15) return { regular: 20, absolute: 25 };
  if (m > 10) return { regular: 15, absolute: 20 };
  if (m > 5) return { regular: 10, absolute: 15 };
  if (m > 3) return { regular: 5, absolute: 10 };
  return { regular: 3, absolute: 6 };
}

function penaltyText(row) {
  if (bool(row.life_sentence)) return '40 god./doživotni';
  const min = num(row.min_years);
  const max = num(row.max_years);
  return `${min > 0 ? min + ' – ' : ''}${max} god.`;
}

export function clientConfig(domain) {
  const rolesByType = new Map();
  for (const r of domain.roles) {
    if (!rolesByType.has(r.case_type)) rolesByType.set(r.case_type, []);
    rolesByType.get(r.case_type).push({ code: r.code, label: r.label });
  }

  const caseTypes = domain.caseTypes.map((x) => ({
    code: x.code,
    name: x.name,
    shortName: x.short_name,
    party1Label: x.party1_label,
    party2Label: x.party2_label,
    defaultRole: x.default_role,
    isCriminal: bool(x.is_criminal),
    isProsecution: bool(x.is_prosecution),
    tariffFamily: x.tariff_family,
    roles: rolesByType.get(x.code) || []
  }));

  const actions = domain.actions.map((x) => ({
    caseType: x.case_type,
    clientRole: x.client_role,
    kind: x.action_kind,
    name: x.name
  }));

  const nonAssessable = domain.nonAssessable.map((x) => ({ id: Number(x.id), label: x.label }));
  const criminalBands = domain.criminal.map((x) => ({ id: Number(x.id), label: x.label }));
  const offenses = domain.offenses.map((x) => {
    const limits = limitationYears(x.max_years, bool(x.life_sentence));
    const band = domain.criminalById.get(Number(x.tariff_band));
    return {
      name: x.name,
      article: x.article,
      tariffBand: Number(x.tariff_band),
      tariffLabel: band ? band.label : '',
      penaltyText: penaltyText(x),
      regularYears: limits.regular,
      absoluteYears: limits.absolute
    };
  });

  return {
    caseTypes,
    actions,
    nonAssessable,
    criminalBands,
    offenses,
    tariff: {
      title: 'Kalkulator tarife 2025',
      subtitle: 'Sl. glasnik RS 56/2025 · od 5. jula 2025.'
    }
  };
}

export function tariffPreview(domain, input) {
  const type = domain.caseTypeByCode.get(input.caseType);
  if (!type) return null;

  if (type.tariff_family === 'civil') {
    if (input.nonAssessable) {
      const t = nonAssessableTariff(domain, input.nonAssessableIndex);
      return t ? { title: `Neprocenjivi · ${t.label}`, tariff: t } : null;
    }
    const t = civilTariff(domain, input.disputeValue);
    return t ? { title: 'Vrednost spora', tariff: t } : null;
  }

  if (type.tariff_family === 'enforcement') {
    const t = enforcementTariff(domain, input.disputeValue);
    return t ? { title: 'Vrednost spora', tariff: t } : null;
  }

  return null;
}

export function tariffCalculator(domain, input) {
  const mode = input.mode;
  const value = num(input.value);

  if (mode === 'krivicni') {
    const bands = domain.criminal.map((row) => {
      const t = criminalTariff(domain, row.id, input.clientRole || 'okrivljeni', !!input.courtAppointed);
      return {
        id: Number(row.id),
        label: row.label,
        od: t.od,
        zo: t.zo,
        ini: t.ini,
        ost: t.ost,
        zal: t.zal
      };
    });
    return { mode, bands, courtFee: null };
  }

  if (mode === 'nepro') {
    const t = nonAssessableTariff(domain, input.nonAssessableIndex);
    return { mode, tariff: t, courtFee: null };
  }

  if (mode === 'parnicni') {
    return { mode, tariff: civilTariff(domain, value), courtFee: courtFee(value, input.courtType) };
  }

  if (mode === 'izvrsni') {
    return { mode, tariff: enforcementTariff(domain, value), courtFee: courtFee(value, input.courtType) };
  }

  return { mode, tariff: null, courtFee: null };
}
