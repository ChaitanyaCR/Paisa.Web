-- Core application schema. Monetary values are integer paise; calendar values
-- are timezone-free ISO text.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email         TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE INDEX sessions_token_hash ON sessions(token_hash);

CREATE TABLE password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX password_resets_user_id ON password_resets(user_id);

CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color      TEXT NOT NULL CHECK (color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  archived   INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, id),
  UNIQUE (user_id, id, type)
);

CREATE UNIQUE INDEX categories_user_type_name
  ON categories(user_id, type, lower(name));

CREATE TABLE transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  date         TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id, category_id, type)
    REFERENCES categories(user_id, id, type) ON DELETE RESTRICT
);

CREATE INDEX transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX transactions_user_category ON transactions(user_id, category_id);

CREATE TABLE budgets (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month        TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  category_id  TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, month, category_id),
  FOREIGN KEY (user_id, category_id)
    REFERENCES categories(user_id, id) ON DELETE RESTRICT
);

CREATE INDEX budgets_user_month ON budgets(user_id, month);

CREATE TABLE user_settings (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budgeting_enabled  INTEGER NOT NULL DEFAULT 0 CHECK (budgeting_enabled IN (0, 1)),
  appearance         TEXT NOT NULL DEFAULT 'system' CHECK (appearance IN ('light', 'dark', 'system')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

UPDATE schema_meta SET value = '0002' WHERE key = 'schema_version';
