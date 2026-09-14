import type { Database } from 'better-sqlite3';
import type { Transaction } from '@/lib/types';
import type { TransactionFilters, TransactionInput } from '@/lib/validation';

type TransactionRow = {
  id: string;
  type: Transaction['type'];
  amount: number;
  date: string;
  category: string;
  notes: string;
};

export function transactionWhere(userId: string, filters: TransactionFilters) {
  const clauses = ['t.user_id = ?'];
  const values: Array<string | number> = [userId];
  if (filters.type) {
    clauses.push('t.type = ?');
    values.push(filters.type);
  }
  if (filters.category) {
    clauses.push('t.category_id = ?');
    values.push(filters.category);
  }
  if (filters.from) {
    clauses.push('t.date >= ?');
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push('t.date <= ?');
    values.push(filters.to);
  }
  if (filters.query) {
    clauses.push("(t.notes LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')");
    const q = `%${filters.query.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    values.push(q, q);
  }
  return { sql: clauses.join(' AND '), values };
}

export function listTransactions(
  db: Database,
  userId: string,
  filters: TransactionFilters,
) {
  const condition = transactionWhere(userId, filters);
  const from = `FROM transactions t JOIN categories c ON c.id = t.category_id WHERE ${condition.sql}`;
  const total = (
    db.prepare(`SELECT count(*) count ${from}`).get(...condition.values) as {
      count: number;
    }
  ).count;
  const totals = db
    .prepare(
      `SELECT coalesce(sum(CASE WHEN t.type = 'income' THEN t.amount_paise ELSE 0 END), 0) income, coalesce(sum(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END), 0) expense, sum(t.type = 'income') incomeCount, sum(t.type = 'expense') expenseCount ${from}`,
    )
    .get(...condition.values) as {
    income: number;
    expense: number;
    incomeCount: number;
    expenseCount: number;
  };
  const items = db
    .prepare(
      `SELECT t.id, t.type, t.amount_paise amount, t.date, t.category_id category, t.notes ${from} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(
      ...condition.values,
      filters.pageSize,
      (filters.page - 1) * filters.pageSize,
    ) as TransactionRow[];
  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totals,
  };
}

export function getTransaction(
  db: Database,
  userId: string,
  id: string,
): Transaction | undefined {
  return db
    .prepare(
      'SELECT id, type, amount_paise amount, date, category_id category, notes FROM transactions WHERE user_id = ? AND id = ?',
    )
    .get(userId, id) as Transaction | undefined;
}

export function transactionOwner(db: Database, id: string): string | undefined {
  return (
    db.prepare('SELECT user_id FROM transactions WHERE id = ?').get(id) as
      | { user_id: string }
      | undefined
  )?.user_id;
}

export function createTransaction(
  db: Database,
  userId: string,
  input: TransactionInput,
): Transaction {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO transactions (id, user_id, category_id, type, amount_paise, date, notes) SELECT ?, ?, id, ?, ?, ?, ? FROM categories WHERE id = ? AND user_id = ?',
  ).run(
    id,
    userId,
    input.type,
    input.amount,
    input.date,
    input.notes,
    input.category,
    userId,
  );
  const item = getTransaction(db, userId, id);
  if (!item) throw new Error('CATEGORY_NOT_FOUND');
  return item;
}

export function updateTransaction(
  db: Database,
  userId: string,
  id: string,
  input: TransactionInput,
): Transaction | undefined {
  const categoryExists = db
    .prepare('SELECT 1 FROM categories WHERE id = ? AND user_id = ?')
    .get(input.category, userId);
  if (!categoryExists) throw new Error('CATEGORY_NOT_FOUND');
  db.prepare(
    "UPDATE transactions SET category_id = ?, type = ?, amount_paise = ?, date = ?, notes = ?, updated_at = datetime('now') WHERE user_id = ? AND id = ?",
  ).run(
    input.category,
    input.type,
    input.amount,
    input.date,
    input.notes,
    userId,
    id,
  );
  return getTransaction(db, userId, id);
}

export function deleteTransaction(
  db: Database,
  userId: string,
  id: string,
): boolean {
  return (
    db
      .prepare('DELETE FROM transactions WHERE user_id = ? AND id = ?')
      .run(userId, id).changes === 1
  );
}
