import { loadDomain, tariffCalculator, tariffPreview } from '../_lib/domain.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 500);

  try {
    const body = await context.request.json();
    const domain = await loadDomain(db);

    if (body && body.op === 'preview') {
      return json({ result: tariffPreview(domain, body) });
    }
    if (body && body.op === 'calculator') {
      return json({ result: tariffCalculator(domain, body) });
    }

    return json({ error: 'Unsupported tariff operation.' }, 400);
  } catch (error) {
    console.error('POST /api/tariff failed', error);
    return json({ error: error.message || 'Tariff calculation failed.' }, 500);
  }
}
