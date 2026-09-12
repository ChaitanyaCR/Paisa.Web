import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteTransactionRoute } from '../app/api/transactions/[id]/route';
import { POST as createTransactionRoute } from '../app/api/transactions/route';
import { GET as getSettingsRoute } from '../app/api/settings/route';
import { closeDb } from '../lib/db/client';
import { listCategories } from '../lib/db/categories';
import { hashSessionToken } from '../lib/db/sessions';
import { createTransaction } from '../lib/db/transactions';
import { createUser } from '../lib/db/users';
import { migrate } from '../scripts/migrate.mjs';

let directory: string;
let databasePath: string;
let setupDb: Database.Database;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'paisa-api-'));
  databasePath = join(directory, 'test.db');
  process.env.DATABASE_PATH = databasePath;
  setupDb = new Database(databasePath);
  migrate(setupDb);
});

afterEach(() => {
  closeDb();
  setupDb.close();
  delete process.env.DATABASE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

function authenticatedUser(id: string, token: string) {
  createUser(setupDb, {
    id,
    name: id,
    email: `${id}@example.com`,
    passwordHash: 'pending-phase-3',
  });
  setupDb
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+1 day'))",
    )
    .run(`session-${id}`, id, hashSessionToken(token));
}

describe('Phase 2 routes', () => {
  it('returns 401 without a session', async () => {
    const response = getSettingsRoute(
      new Request('http://localhost/api/settings'),
    );
    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid input and creates valid transactions', async () => {
    authenticatedUser('u1', 'token-1');
    const headers = {
      cookie: 'session=token-1',
      'content-type': 'application/json',
    };
    const invalid = await createTransactionRoute(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }),
    );
    expect(invalid.status).toBe(422);

    const category = listCategories(setupDb, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    const valid = await createTransactionRoute(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'expense',
          amount: 12300,
          date: '2026-09-12',
          category: category.id,
          notes: 'Lunch',
        }),
      }),
    );
    expect(valid.status).toBe(201);
    expect(await valid.json()).toMatchObject({
      amount: 12300,
      category: category.id,
    });
  });

  it('returns 403 when a user addresses another user transaction', async () => {
    authenticatedUser('u1', 'token-1');
    authenticatedUser('u2', 'token-2');
    const category = listCategories(setupDb, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    const item = createTransaction(setupDb, 'u1', {
      type: 'expense',
      amount: 100,
      date: '2026-09-12',
      category: category.id,
      notes: '',
    });
    const response = await deleteTransactionRoute(
      new Request(`http://localhost/api/transactions/${item.id}`, {
        method: 'DELETE',
        headers: { cookie: 'session=token-2' },
      }),
      { params: { id: item.id } },
    );
    expect(response.status).toBe(403);
  });
});
