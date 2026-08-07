PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL,
  client TEXT NOT NULL,
  other_party TEXT DEFAULT '',
  client_role TEXT DEFAULT '',
  label1 TEXT DEFAULT '',
  label2 TEXT DEFAULT '',
  court TEXT DEFAULT '',
  court_type TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  case_type TEXT NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  prosecution_type TEXT DEFAULT '',
  prosecution_number TEXT DEFAULT '',
  public_prosecutor TEXT DEFAULT '',
  phase TEXT DEFAULT '',
  criminal_role TEXT DEFAULT '',
  court_appointed INTEGER NOT NULL DEFAULT 0,
  sentence_band INTEGER,
  offense_name TEXT DEFAULT '',
  non_assessable INTEGER NOT NULL DEFAULT 0,
  non_assessable_index INTEGER,
  dispute_value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  action_date TEXT NOT NULL,
  action_time TEXT DEFAULT '',
  courtroom TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  action_type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deadlines (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  decision_date TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  case_number TEXT DEFAULT '',
  client TEXT DEFAULT '',
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  decision_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  entry_date TEXT DEFAULT '',
  paid_date TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_actions_case_id ON actions(case_id);
CREATE INDEX IF NOT EXISTS idx_actions_date ON actions(action_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_claims_case_id ON claims(case_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_attachments_action_id ON attachments(action_id);
