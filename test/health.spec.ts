import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { checkDatabase } from '../lib/db/health';
import { listMigrations } from '../scripts/migrate.mjs';
import { freshDb } from './helpers';

// Derived, not hard-coded: a new migration must bump `schema_meta` to match its
// own number, and this fails if it forgets to — rather than failing simply
// because a migration was added.
const migrations = listMigrations();
const latest = migrations.at(-1);
if (!latest) throw new Error('No migrations found');
const expectedSchemaVersion = latest.name.slice(0, 4);

let db: Database;

afterEach(() => db?.close());

describe('checkDatabase', () => {
  it('reaches the database and reports the applied schema version', () => {
    db = freshDb();

    expect(checkDatabase(db)).toStrictEqual({
      ok: true,
      schemaVersion: expectedSchemaVersion,
    });
  });

  it('fails loudly when the schema is missing', () => {
    db = freshDb();
    db.exec('DROP TABLE schema_meta');

    expect(() => checkDatabase(db)).toThrow();
  });
});
