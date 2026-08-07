ALTER TABLE push_subscriptions ADD COLUMN p256dh TEXT;
ALTER TABLE push_subscriptions ADD COLUMN auth TEXT;

CREATE TABLE IF NOT EXISTS push_reminder_log (
  event_key TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
