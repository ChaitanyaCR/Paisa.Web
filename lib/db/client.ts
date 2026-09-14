import Database from 'better-sqlite3';

/**
 * The SQLite file lives on the application server. `DATABASE_PATH` overrides the
 * location; tests point it at a throwaway file, and the production deploy points
 * it at a path on the India-hosted volume that is backed up.
 */
const DEFAULT_PATH = 'data/budget.db';

let instance: Database.Database | undefined;

export function getDb(): Database.Database {
  if (instance) return instance;

  const db = new Database(process.env.DATABASE_PATH ?? DEFAULT_PATH);

  // WAL lets reads proceed during a write, which matters because the whole app
  // shares one file. `foreign_keys` is off by default in SQLite and has to be
  // enabled per connection or the Phase 2 constraints are decorative.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Wait rather than throwing immediately if another request holds the write lock.
  db.pragma('busy_timeout = 5000');

  instance = db;
  return db;
}

/** Closes the singleton. Tests use this between files; production never calls it. */
export function closeDb(): void {
  instance?.close();
  instance = undefined;
}
