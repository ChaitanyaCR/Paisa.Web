#!/usr/bin/env node
// Migration runner.
//
// Applies every `migrations/NNNN_*.sql` file that has not run yet, in filename
// order, each inside a transaction. Applied migrations are recorded in
// `_migrations` so re-running is a no-op.
//
//   node scripts/migrate.mjs [apply|status|create <name>] [--database <path>]
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATIONS_DIR = resolve(PROJECT_ROOT, 'migrations');
export const DEFAULT_DATABASE_PATH = resolve(PROJECT_ROOT, 'data/budget.db');

export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
}

/**
 * Brings `db` up to date. Returns the migrations applied by this call.
 * Exported so tests can migrate a throwaway database without shelling out.
 */
export function migrate(db) {
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Map(
    db.prepare('SELECT name, checksum FROM _migrations').all().map((r) => [r.name, r.checksum]),
  );
  const record = db.prepare('INSERT INTO _migrations (name, checksum) VALUES (?, ?)');
  const run = [];

  for (const migration of listMigrations()) {
    const previous = applied.get(migration.name);

    if (previous !== undefined) {
      // An edited migration means the database and the repo disagree about what
      // the schema is. Refuse rather than silently diverge.
      if (previous !== migration.checksum) {
        throw new Error(
          `Migration ${migration.name} changed after it was applied. ` +
            'Add a new migration instead of editing an applied one.',
        );
      }
      continue;
    }

    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.name, migration.checksum);
    })();
    run.push(migration.name);
  }

  return run;
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv.find((a) => !a.startsWith('--')) ?? 'apply';
  const dbFlag = argv.indexOf('--database');
  const databasePath =
    dbFlag !== -1 ? resolve(argv[dbFlag + 1]) : (process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);

  if (command === 'create') {
    const name = argv.filter((a) => !a.startsWith('--'))[1];
    if (!name) {
      console.error('\n  Usage: npm run db:create -- <name>\n');
      process.exit(1);
    }
    const next = String(listMigrations().length + 1).padStart(4, '0');
    const file = join(MIGRATIONS_DIR, `${next}_${name}.sql`);
    writeFileSync(file, `-- ${next}_${name}\n\n`);
    console.log(`\n  created ${file}\n`);
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);

  if (command === 'status') {
    db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime(\'now\')))');
    const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
    console.log(`\n  ${databasePath}\n`);
    for (const { name } of listMigrations()) {
      console.log(`  ${applied.has(name) ? '✅' : '⬜'} ${name}`);
    }
    console.log();
    db.close();
    return;
  }

  const run = migrate(db);
  console.log(`\n  ${databasePath}`);
  console.log(run.length ? `  applied: ${run.join(', ')}\n` : '  already up to date\n');
  db.close();
}

if (import.meta.url === `file://${process.argv[1]}`) main();
