import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { checkDatabase } from '../lib/db/health';
import { freshDb } from './helpers';

let db: Database;

afterEach(() => db?.close());

describe('checkDatabase', () => {
  it('reaches the database and reports the applied schema version', () => {
    db = freshDb();

    expect(checkDatabase(db)).toStrictEqual({
      ok: true,
      schemaVersion: '0004',
    });
  });

  it('fails loudly when the schema is missing', () => {
    db = freshDb();
    db.exec('DROP TABLE schema_meta');

    expect(() => checkDatabase(db)).toThrow();
  });
});
