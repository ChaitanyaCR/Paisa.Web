import type { Database } from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyPreviousMonthBudgets,
  listBudgets,
  saveBudget,
} from '../lib/db/budgets';
import {
  CATEGORY_NAME_INDEX,
  createCategory,
  deleteCategory,
  listCategories,
} from '../lib/db/categories';
import { getSettings, updateSettings } from '../lib/db/settings';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
} from '../lib/db/transactions';
import { createUser } from '../lib/db/users';
import { createSession, findSessionUser } from '../lib/db/sessions';
import { getAnalytics } from '../lib/db/analytics';
import { freshDb } from './helpers';

let db: Database;
afterEach(() => db?.close());

function user(id: string) {
  return createUser(db, {
    id,
    name: id,
    email: `${id}@example.com`,
    passwordHash: 'pending-phase-3',
  });
}

describe('application schema', () => {
  it('enforces database constraints and cascades user data', () => {
    db = freshDb();
    user('u1');
    const category = listCategories(db, 'u1')[0];

    expect(() =>
      createCategory(db, 'u1', {
        name: category.name.toUpperCase(),
        type: category.type,
        color: '#123456',
      }),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          "INSERT INTO transactions (id,user_id,category_id,type,amount_paise,date) VALUES ('bad','u1',?,'expense',0,'2026-09-01')",
        )
        .run(category.id),
    ).toThrow();

    db.prepare('DELETE FROM users WHERE id = ?').run('u1');
    expect(listCategories(db, 'u1')).toHaveLength(0);
  });

  it('uses the planned transaction and budget indexes', () => {
    db = freshDb();
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all() as { name: string }[];
    expect(indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'transactions_user_date',
        'transactions_user_category',
        'budgets_user_month',
      ]),
    );
    const plan = db
      .prepare(
        'EXPLAIN QUERY PLAN SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC',
      )
      .all('u1') as { detail: string }[];
    expect(
      plan.some(({ detail }) => detail.includes('transactions_user_date')),
    ).toBe(true);
  });
});

describe('repositories', () => {
  it('seeds categories/settings but no fabricated transactions', () => {
    db = freshDb();
    user('u1');
    expect(listCategories(db, 'u1')).toHaveLength(7);
    expect(listTransactions(db, 'u1', { page: 1, pageSize: 25 })).toMatchObject(
      { items: [], total: 0 },
    );
    expect(getSettings(db, 'u1')).toEqual({
      budgetingEnabled: false,
      appearance: 'system',
    });
  });

  it('keeps every operation scoped to its user', () => {
    db = freshDb();
    user('u1');
    user('u2');
    const category = listCategories(db, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    const transaction = createTransaction(db, 'u1', {
      type: 'expense',
      amount: 12500,
      date: '2026-09-12',
      category: category.id,
      notes: 'Lunch',
    });

    expect(
      listTransactions(db, 'u2', { page: 1, pageSize: 25 }).items,
    ).toHaveLength(0);
    expect(deleteTransaction(db, 'u2', transaction.id)).toBe(false);
    expect(() =>
      saveBudget(db, 'u2', {
        month: '2026-09',
        category: category.id,
        amount: 10000,
      }),
    ).toThrow('CATEGORY_NOT_FOUND');
  });

  it('filters/paginates transactions, returns full totals, and deletes zero budgets', () => {
    db = freshDb();
    user('u1');
    const category = listCategories(db, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    createTransaction(db, 'u1', {
      type: 'expense',
      amount: 10000,
      date: '2026-09-10',
      category: category.id,
      notes: 'One',
    });
    createTransaction(db, 'u1', {
      type: 'expense',
      amount: 20000,
      date: '2026-09-11',
      category: category.id,
      notes: 'Two',
    });
    const page = listTransactions(db, 'u1', {
      page: 1,
      pageSize: 1,
      type: 'expense',
    });
    expect(page).toMatchObject({
      total: 2,
      totals: { income: 0, expense: 30000 },
    });
    expect(page.items).toHaveLength(1);

    saveBudget(db, 'u1', {
      month: '2026-09',
      category: category.id,
      amount: 50000,
    });
    expect(
      listBudgets(db, 'u1', '2026-09').find(
        (budget) => budget.category === category.id,
      ),
    ).toMatchObject({ amount: 50000, spent: 30000 });
    saveBudget(db, 'u1', {
      month: '2026-09',
      category: category.id,
      amount: 0,
    });
    expect(
      listBudgets(db, 'u1', '2026-09').find(
        (budget) => budget.category === category.id,
      )?.amount,
    ).toBe(0);

    expect(
      updateSettings(db, 'u1', { appearance: 'dark', budgetingEnabled: true }),
    ).toEqual({ appearance: 'dark', budgetingEnabled: true });
  });

  it('aggregates analytics from grouped SQL results', () => {
    db = freshDb();
    user('u1');
    const category = listCategories(db, 'u1').find(
      ({ type }) => type === 'expense',
    )!;
    createTransaction(db, 'u1', {
      type: 'expense',
      amount: 10000,
      date: '2026-09-10',
      category: category.id,
      notes: 'One',
    });
    createTransaction(db, 'u1', {
      type: 'expense',
      amount: 20000,
      date: '2026-09-11',
      category: category.id,
      notes: 'Two',
    });
    const result = getAnalytics(
      db,
      'u1',
      { page: 1, pageSize: 25, from: '2026-09-01', to: '2026-09-30' },
      'month',
      '2026-09',
      '2026-09-01',
      '2026-09-30',
    );
    expect(result).toMatchObject({ count: 2, income: 0, expense: 30000 });
    expect(result.report[0]).toMatchObject({
      id: category.id,
      count: 2,
      total: 30000,
    });
    expect(result.chart.reduce((sum, bar) => sum + bar.expense, 0)).toBe(30000);
  });

  it('stores icons, blocks deletion while referenced, and copies budgets', () => {
    db = freshDb();
    user('u1');
    const category = createCategory(db, 'u1', {
      name: 'Subscriptions',
      type: 'expense',
      color: '#123456',
      icon: 'shopping',
    });
    expect(category.icon).toBe('shopping');
    saveBudget(db, 'u1', {
      month: '2026-08',
      category: category.id,
      amount: 25000,
    });
    expect(() => deleteCategory(db, 'u1', category.id)).toThrow(
      'CATEGORY_IN_USE',
    );
    expect(copyPreviousMonthBudgets(db, 'u1', '2026-09')).toBe(1);
    expect(
      listBudgets(db, 'u1', '2026-09').find(
        ({ category: id }) => id === category.id,
      )?.amount,
    ).toBe(25000);
    saveBudget(db, 'u1', {
      month: '2026-08',
      category: category.id,
      amount: 0,
    });
    saveBudget(db, 'u1', {
      month: '2026-09',
      category: category.id,
      amount: 0,
    });
    expect(deleteCategory(db, 'u1', category.id)).toBe(true);
  });
});

describe('schema contract', () => {
  // `mapDbError` turns a violation of this index into a 422 DUPLICATE_CATEGORY by
  // matching SQLite's message. Renaming it in a migration would silently degrade
  // that to a generic error, so the name is pinned here.
  it('defines the unique index mapDbError matches on', () => {
    db = freshDb();
    expect(
      db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        )
        .get(CATEGORY_NAME_INDEX),
    ).toBeTruthy();
  });
});

describe('session activity tracking', () => {
  const lastSeen = () =>
    (
      db.prepare('SELECT last_seen_at FROM sessions').get() as {
        last_seen_at: string;
      }
    ).last_seen_at;

  const setLastSeen = (value: string) =>
    db.prepare('UPDATE sessions SET last_seen_at = ?').run(value);
  const sqlTime = (offset: string) =>
    (
      db.prepare("SELECT datetime('now', ?) v").get(offset) as { v: string }
    ).v;

  it('does not write while last_seen_at is inside the throttle window', () => {
    db = freshDb();
    user('u1');
    const token = createSession(db, 'u1');
    // A distinct, recent sentinel: still fresh, so the row must be left alone.
    const recent = sqlTime('-1 minute');
    setLastSeen(recent);

    expect(findSessionUser(db, token)?.id).toBe('u1');
    expect(lastSeen()).toBe(recent);
  });

  it('refreshes last_seen_at once it is stale', () => {
    db = freshDb();
    user('u1');
    const token = createSession(db, 'u1');
    // Past the 5-minute throttle but well inside the 14-day idle window.
    const stale = sqlTime('-1 hour');
    setLastSeen(stale);

    expect(findSessionUser(db, token)?.id).toBe('u1');
    expect(lastSeen()).not.toBe(stale);
  });

  it('still expires a session idle beyond the 14-day window', () => {
    db = freshDb();
    user('u1');
    const token = createSession(db, 'u1');
    setLastSeen(sqlTime('-15 days'));

    expect(findSessionUser(db, token)).toBeUndefined();
  });
});
