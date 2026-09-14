-- Bootstrap migration.
--
-- Deliberately minimal: it exists to prove the migration pipeline runs end to
-- end (Phase 0.2) and to give the health check something real to read. The
-- application schema — users, sessions, categories, transactions, budgets,
-- settings — lands in Phase 2.1.

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO schema_meta (key, value) VALUES ('schema_version', '0001')
  ON CONFLICT(key) DO UPDATE SET value = excluded.value;
