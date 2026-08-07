-- Rebuild push_subscriptions into the canonical encrypted-push shape.
-- This is deliberately used instead of ALTER TABLE ADD COLUMN because some
-- production databases already received p256dh/auth manually while the D1
-- migration ledger still reports this migration as pending.
--
-- Only columns guaranteed to exist since 0002 are copied. Encryption keys are
-- reset and will be re-saved when each device next opens the app.

ALTER TABLE push_subscriptions RENAME TO push_subscriptions_before_0003;

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT,
  auth TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO push_subscriptions (endpoint, created_at, updated_at)
SELECT endpoint, created_at, updated_at
FROM push_subscriptions_before_0003;

DROP TABLE push_subscriptions_before_0003;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
  ON push_subscriptions(updated_at);

CREATE TABLE IF NOT EXISTS push_reminder_log (
  event_key TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
