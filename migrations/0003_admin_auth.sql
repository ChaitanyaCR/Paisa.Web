-- Admin-assisted password resets for the no-external-services V1.

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0
  CHECK (must_change_password IN (0, 1));

CREATE TABLE admin_audit_log (
  id             TEXT PRIMARY KEY,
  admin_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action         TEXT NOT NULL CHECK (action IN ('password_reset')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX admin_audit_target ON admin_audit_log(target_user_id, created_at DESC);

UPDATE schema_meta SET value = '0003' WHERE key = 'schema_version';
