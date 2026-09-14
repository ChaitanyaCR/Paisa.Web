import type { Database } from 'better-sqlite3';

export type DatabaseHealth = {
  ok: true;
  schemaVersion: string | null;
};

/**
 * Verifies the database file is reachable and migrated. Throws on any failure so
 * callers decide what to expose — the health route deliberately does not pass the
 * detail on to the client.
 */
export function checkDatabase(db: Database): DatabaseHealth {
  const probe = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
  if (probe?.ok !== 1) {
    throw new Error('SQLite connectivity probe returned an unexpected result');
  }

  const row = db
    .prepare('SELECT value FROM schema_meta WHERE key = ?')
    .get('schema_version') as { value: string } | undefined;

  return { ok: true, schemaVersion: row?.value ?? null };
}
