import type { Database } from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { listBudgets, saveBudget } from '../lib/db/budgets';
import { createCategory, listCategories } from '../lib/db/categories';
import { getSettings, updateSettings } from '../lib/db/settings';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
} from '../lib/db/transactions';
import { createUser } from '../lib/db/users';
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
    expect(listBudgets(db, 'u1', '2026-09')).toHaveLength(1);
    saveBudget(db, 'u1', {
      month: '2026-09',
      category: category.id,
      amount: 0,
    });
    expect(listBudgets(db, 'u1', '2026-09')).toHaveLength(0);

    expect(
      updateSettings(db, 'u1', { appearance: 'dark', budgetingEnabled: true }),
    ).toEqual({ appearance: 'dark', budgetingEnabled: true });
  });
});
