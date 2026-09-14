import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteTransactionRoute } from '../app/api/transactions/[id]/route';
import { POST as createTransactionRoute } from '../app/api/transactions/route';
import { GET as getSettingsRoute } from '../app/api/settings/route';
import { POST as signinRoute } from '../app/api/auth/signin/route';
import { POST as signupRoute } from '../app/api/auth/signup/route';
import { GET as exportAccountRoute } from '../app/api/account/export/route';
import { POST as signoutRoute } from '../app/api/auth/signout/route';
import { PUT as saveBudgetRoute } from '../app/api/budgets/route';
import { GET as analyticsRoute } from '../app/api/analytics/route';
import { POST as adminResetRoute } from '../app/api/admin/users/[id]/reset-password/route';
import { clearRateLimits } from '../lib/auth/rate-limit';
import { hashPassword } from '../lib/auth/password';
import { closeDb } from '../lib/db/client';
import { listCategories } from '../lib/db/categories';
import { hashSessionToken } from '../lib/db/sessions';
import { createTransaction } from '../lib/db/transactions';
import { createUser } from '../lib/db/users';
import { findUserByEmail } from '../lib/db/users';
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
  clearRateLimits();
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

  it('signs up and signs in with an opaque secure cookie', async () => {
    const signup = await signupRoute(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Asha',
          email: 'ASHA@example.com',
          password: 'a-secure-password',
          consent: true,
        }),
      }),
    );
    expect(signup.status).toBe(201);
    expect(signup.headers.get('set-cookie')).toContain(
      'HttpOnly; Secure; SameSite=Lax',
    );
    const signin = await signinRoute(
      new Request('http://localhost/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'asha@example.com',
          password: 'a-secure-password',
        }),
      }),
    );
    expect(signin.status).toBe(200);
  });

  it('rejects authenticated cross-origin writes and exports only the signed-in account', async () => {
    authenticatedUser('u1', 'token-1');
    const category = listCategories(setupDb, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    const blocked = await createTransactionRoute(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: {
          cookie: 'session=token-1',
          origin: 'https://attacker.example',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'expense',
          amount: 500,
          date: '2026-09-12',
          category: category.id,
          notes: '',
        }),
      }),
    );
    expect(blocked.status).toBe(403);

    const exported = exportAccountRoute(
      new Request('http://localhost/api/account/export', {
        headers: { cookie: 'session=token-1' },
      }),
    );
    expect(exported.status).toBe(200);
    expect(exported.headers.get('content-disposition')).toContain('attachment');
    expect(await exported.json()).toMatchObject({
      account: { email: 'u1@example.com' },
    });
  });

  it('runs the local happy path from signup through analytics and signout', async () => {
    const signup = await signupRoute(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Mira',
          email: 'mira@example.com',
          password: 'a-secure-password',
          consent: true,
        }),
      }),
    );
    const token = /session=([^;]+)/.exec(
      signup.headers.get('set-cookie') ?? '',
    )?.[1];
    expect(token).toBeTruthy();
    const headers = {
      cookie: `session=${token}`,
      'content-type': 'application/json',
    };
    const user = findUserByEmail(setupDb, 'mira@example.com')!;
    const category = listCategories(setupDb, user.id).find(
      ({ type }) => type === 'expense',
    )!;
    expect(
      (
        await createTransactionRoute(
          new Request('http://localhost/api/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              type: 'expense',
              amount: 12500,
              date: '2026-09-12',
              category: category.id,
              notes: 'Lunch',
            }),
          }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await saveBudgetRoute(
          new Request('http://localhost/api/budgets', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              month: '2026-09',
              category: category.id,
              amount: 50000,
            }),
          }),
        )
      ).status,
    ).toBe(200);
    const analytics = analyticsRoute(
      new Request(
        'http://localhost/api/analytics?period=month&month=2026-09&from=2026-09-01&to=2026-09-30',
        { headers },
      ),
    );
    expect((await analytics.json()).expense).toBe(12500);
    expect(
      signoutRoute(
        new Request('http://localhost/api/auth/signout', {
          method: 'POST',
          headers,
        }),
      ).status,
    ).toBe(204);
  });

  it('allows only admins to reset a password and invalidates target sessions', async () => {
    createUser(setupDb, {
      id: 'admin',
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: await hashPassword('admin-password'),
      role: 'admin',
    });
    authenticatedUser('target', 'target-token');
    setupDb
      .prepare(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ('admin-session', 'admin', ?, datetime('now', '+1 day'))",
      )
      .run(hashSessionToken('admin-token'));
    const response = await adminResetRoute(
      new Request('http://localhost/api/admin/users/target/reset-password', {
        method: 'POST',
        headers: {
          cookie: 'session=admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ temporaryPassword: 'temporary-password' }),
      }),
      { params: { id: 'target' } },
    );
    expect(response.status).toBe(204);
    expect(
      (
        setupDb
          .prepare('SELECT must_change_password value FROM users WHERE id = ?')
          .get('target') as { value: number }
      ).value,
    ).toBe(1);
    expect(
      (
        setupDb
          .prepare('SELECT count(*) count FROM sessions WHERE user_id = ?')
          .get('target') as { count: number }
      ).count,
    ).toBe(0);
    expect(
      (
        setupDb
          .prepare(
            'SELECT count(*) count FROM admin_audit_log WHERE target_user_id = ?',
          )
          .get('target') as { count: number }
      ).count,
    ).toBe(1);
  });
});
