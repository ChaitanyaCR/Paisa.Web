import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { listMigrations, migrate } from '../scripts/migrate.mjs';

let db: Database.Database;

afterEach(() => db?.close());

describe('migrate', () => {
  it('applies every migration once and is a no-op on a second run', () => {
    db = new Database(':memory:');

    expect(migrate(db)).toStrictEqual(listMigrations().map((m) => m.name));
    expect(migrate(db)).toStrictEqual([]);
  });

  it('refuses to run when an already-applied migration has been edited', () => {
    db = new Database(':memory:');
    migrate(db);

    // Simulate someone editing a migration after it shipped.
    db.prepare('UPDATE _migrations SET checksum = ? WHERE name = ?').run(
      'tampered',
      listMigrations()[0].name,
    );

    expect(() => migrate(db)).toThrow(/changed after it was applied/);
  });
});
