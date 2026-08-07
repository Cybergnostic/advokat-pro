PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'lawyer',
  access_email TEXT UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, display_name, role) VALUES
  ('aleksa-biskup', 'Aleksa Biškup', 'lawyer'),
  ('zvanija', 'Zvanija', 'lawyer'),
  ('gruja', 'Gruja', 'lawyer'),
  ('jovan-dev', 'Jovan', 'dev');

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE cases ADD COLUMN assigned_user_id TEXT;
ALTER TABLE cases ADD COLUMN created_by TEXT;
ALTER TABLE cases ADD COLUMN updated_by TEXT;
ALTER TABLE cases ADD COLUMN deleted_at TEXT;
ALTER TABLE cases ADD COLUMN deleted_by TEXT;

ALTER TABLE actions ADD COLUMN created_by TEXT;
ALTER TABLE actions ADD COLUMN updated_by TEXT;
ALTER TABLE actions ADD COLUMN deleted_at TEXT;
ALTER TABLE actions ADD COLUMN deleted_by TEXT;

ALTER TABLE deadlines ADD COLUMN created_by TEXT;
ALTER TABLE deadlines ADD COLUMN updated_by TEXT;
ALTER TABLE deadlines ADD COLUMN deleted_at TEXT;
ALTER TABLE deadlines ADD COLUMN deleted_by TEXT;

ALTER TABLE claims ADD COLUMN created_by TEXT;
ALTER TABLE claims ADD COLUMN updated_by TEXT;
ALTER TABLE claims ADD COLUMN deleted_at TEXT;
ALTER TABLE claims ADD COLUMN deleted_by TEXT;

ALTER TABLE attachments ADD COLUMN created_by TEXT;
ALTER TABLE attachments ADD COLUMN deleted_at TEXT;
ALTER TABLE attachments ADD COLUMN deleted_by TEXT;

ALTER TABLE push_subscriptions ADD COLUMN user_id TEXT;

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Preserve any legacy paid total as one historical payment. New code uses the
-- payments table as the source of truth, so concurrent payments cannot overwrite
-- one another.
INSERT INTO payments (id, case_id, amount, payment_date, notes)
SELECT 'legacy-' || id,
       id,
       paid_amount,
       COALESCE(NULLIF(substr(updated_at, 1, 10), ''), NULLIF(substr(created_at, 1, 10), ''), date('now')),
       'Migrirano iz prethodnog ukupnog iznosa'
FROM cases
WHERE paid_amount > 0;

-- IDs are rendered into DOM event handlers by the legacy front end. Normal app
-- IDs are timestamps or UUIDs; reject crafted identifiers containing punctuation
-- that could break out of those handler strings.
CREATE TRIGGER validate_case_id_before_insert
BEFORE INSERT ON cases
WHEN NEW.id = '' OR length(NEW.id) > 128 OR NEW.id GLOB '*[^0-9A-Za-z_-]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid case id');
END;

CREATE TRIGGER validate_action_id_before_insert
BEFORE INSERT ON actions
WHEN NEW.id = '' OR length(NEW.id) > 128 OR NEW.id GLOB '*[^0-9A-Za-z_-]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid action id');
END;

CREATE TRIGGER validate_deadline_id_before_insert
BEFORE INSERT ON deadlines
WHEN NEW.id = '' OR length(NEW.id) > 128 OR NEW.id GLOB '*[^0-9A-Za-z_-]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid deadline id');
END;

CREATE TRIGGER validate_claim_id_before_insert
BEFORE INSERT ON claims
WHEN NEW.id = '' OR length(NEW.id) > 128 OR NEW.id GLOB '*[^0-9A-Za-z_-]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid claim id');
END;

CREATE INDEX idx_cases_deleted_at ON cases(deleted_at);
CREATE INDEX idx_cases_assigned_user ON cases(assigned_user_id);
CREATE INDEX idx_actions_deleted_at ON actions(deleted_at);
CREATE INDEX idx_deadlines_deleted_at ON deadlines(deleted_at);
CREATE INDEX idx_claims_deleted_at ON claims(deleted_at);
CREATE INDEX idx_attachments_deleted_at ON attachments(deleted_at);
CREATE INDEX idx_payments_case_id ON payments(case_id);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
