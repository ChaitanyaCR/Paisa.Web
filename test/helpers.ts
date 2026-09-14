import Database from 'better-sqlite3';
import { migrate } from '../scripts/migrate.mjs';

/**
 * A migrated, throwaway in-memory database. Every test gets its own, so tests
 * neither share state nor touch the developer's `data/budget.db`.
 */
export function freshDb(): Database.Database {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}
