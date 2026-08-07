import { sendPushToAll } from '../functions/_lib/webpush.js';

const TZ = 'Europe/Belgrade';

function localParts(ms) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(ms));
  const out = {};
  for (const p of parts) if (p.type !== 'literal') out[p.type] = p.value;
  return {
    date: `${out.year}-${out.month}-${out.day}`,
    time: `${out.hour}:${out.minute}`
  };
}

function fmtDate(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}.` : iso;
}

async function alreadySent(db, key) {
  return !!(await db.prepare('SELECT event_key FROM push_reminder_log WHERE event_key = ?').bind(key).first());
}

async function markSent(db, key) {
  await db.prepare('INSERT OR IGNORE INTO push_reminder_log (event_key) VALUES (?)').bind(key).run();
}

async function dispatchOnce(env, key, payload) {
  if (await alreadySent(env.DB, key)) return;
  await sendPushToAll(env, payload);
  await markSent(env.DB, key);
}

async function sendOneHourHearingReminders(env, scheduledMs) {
  const target = localParts(scheduledMs + 60 * 60 * 1000);
  const rows = await env.DB.prepare(`SELECT a.id, a.action_date, a.action_time, a.name, a.courtroom, c.case_number
    FROM actions a JOIN cases c ON c.id = a.case_id
    WHERE a.action_type = 'rociste' AND a.status = 'buduci'
      AND a.action_date = ? AND substr(a.action_time,1,5) = ?`)
    .bind(target.date, target.time).all();

  for (const r of rows.results || []) {
    await dispatchOnce(env, `hearing-1h:${r.id}:${r.action_date}:${target.time}`, {
      title: '⚖ Ročište za 1 sat',
      body: `${r.case_number} — ${r.name} u ${String(r.action_time).slice(0,5)}${r.courtroom ? ', ' + r.courtroom : ''}`,
      tag: `hearing-1h-${r.id}`,
      url: './'
    });
  }
}

async function sendEightAmReminders(env, scheduledMs) {
  const now = localParts(scheduledMs);
  if (now.time !== '08:00') return;
  const tomorrow = localParts(scheduledMs + 24 * 60 * 60 * 1000).date;

  const hearings = await env.DB.prepare(`SELECT a.id, a.action_time, a.name, a.courtroom, c.case_number
    FROM actions a JOIN cases c ON c.id = a.case_id
    WHERE a.action_type = 'rociste' AND a.status = 'buduci' AND a.action_date = ?`)
    .bind(now.date).all();
  for (const r of hearings.results || []) {
    await dispatchOnce(env, `hearing-day:${r.id}:${now.date}`, {
      title: '📅 Ročište danas',
      body: `${r.case_number} — ${r.name}${r.action_time ? ' u ' + String(r.action_time).slice(0,5) : ''}${r.courtroom ? ', ' + r.courtroom : ''}`,
      tag: `hearing-day-${r.id}`,
      url: './'
    });
  }

  const dueToday = await env.DB.prepare(`SELECT d.id, d.due_date, d.notes, c.case_number
    FROM deadlines d JOIN cases c ON c.id = d.case_id WHERE d.due_date = ?`)
    .bind(now.date).all();
  for (const r of dueToday.results || []) {
    await dispatchOnce(env, `deadline-day:${r.id}:${now.date}`, {
      title: '🔴 DANAS ističe rok!',
      body: `${r.case_number} — Poslednji dan je DANAS${r.notes ? ' · ' + r.notes : ''}`,
      tag: `deadline-day-${r.id}`,
      url: './'
    });
  }

  const dueTomorrow = await env.DB.prepare(`SELECT d.id, d.due_date, d.notes, c.case_number
    FROM deadlines d JOIN cases c ON c.id = d.case_id WHERE d.due_date = ?`)
    .bind(tomorrow).all();
  for (const r of dueTomorrow.results || []) {
    await dispatchOnce(env, `deadline-tomorrow:${r.id}:${tomorrow}`, {
      title: '⏰ Sutra ističe rok!',
      body: `${r.case_number} — Poslednji dan: ${fmtDate(r.due_date)}${r.notes ? ' · ' + r.notes : ''}`,
      tag: `deadline-tomorrow-${r.id}`,
      url: './'
    });
  }
}

async function runReminders(env, scheduledMs) {
  await sendOneHourHearingReminders(env, scheduledMs);
  await sendEightAmReminders(env, scheduledMs);
  const now = localParts(scheduledMs);
  if (now.time === '03:00') {
    await env.DB.prepare("DELETE FROM push_reminder_log WHERE sent_at < datetime('now','-90 days')").run();
  }
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runReminders(env, controller.scheduledTime));
  },
  async fetch() {
    return Response.json({ ok: true, service: 'advokat-pro-reminders' });
  }
};
