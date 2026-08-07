-- Repair migration for production databases where 0003 was recorded as applied
-- but push_subscriptions still has the old 0002 shape.
--
-- Rebuild the table into the canonical schema instead of using ADD COLUMN so
-- this migration is safe whether p256dh/auth are currently present or absent.
-- Existing endpoints/timestamps are retained, but encryption keys are reset;
-- devices must reopen the app so their push subscription is saved again.

ALTER TABLE push_subscriptions RENAME TO push_subscriptions_before_repair;

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT,
  auth TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO push_subscriptions (endpoint, created_at, updated_at)
SELECT endpoint, created_at, updated_at
FROM push_subscriptions_before_repair;

DROP TABLE push_subscriptions_before_repair;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
  ON push_subscriptions(updated_at);

CREATE TABLE IF NOT EXISTS push_reminder_log (
  event_key TEXT PRIMARY KEY,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
