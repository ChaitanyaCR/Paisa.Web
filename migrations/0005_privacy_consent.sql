ALTER TABLE users ADD COLUMN consented_at TEXT;
ALTER TABLE users ADD COLUMN privacy_version TEXT;

UPDATE schema_meta SET value = '0005' WHERE key = 'schema_version';
