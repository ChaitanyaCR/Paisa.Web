import type { Database } from 'better-sqlite3';
import type { BudgetInput } from '@/lib/validation';

export type Budget = {
  month: string;
  category: string;
  amount: number;
  spent: number;
};

export function listBudgets(
  db: Database,
  userId: string,
  month: string,
): Budget[] {
  return db
    .prepare(
      "SELECT ? month, c.id category, coalesce(b.amount_paise, 0) amount, coalesce(sum(t.amount_paise), 0) spent FROM categories c LEFT JOIN budgets b ON b.user_id = c.user_id AND b.category_id = c.id AND b.month = ? LEFT JOIN transactions t ON t.user_id = c.user_id AND t.category_id = c.id AND t.type = 'expense' AND t.date >= ? || '-01' AND t.date < date(? || '-01', '+1 month') WHERE c.user_id = ? AND c.type = 'expense' GROUP BY c.id, b.amount_paise ORDER BY c.id",
    )
    .all(month, month, month, month, userId) as Budget[];
}

export function saveBudget(
  db: Database,
  userId: string,
  input: BudgetInput,
): Budget | undefined {
  if (input.amount === 0) {
    db.prepare(
      'DELETE FROM budgets WHERE user_id = ? AND month = ? AND category_id = ?',
    ).run(userId, input.month, input.category);
    return undefined;
  }
  const category = db
    .prepare(
      "SELECT 1 FROM categories WHERE id = ? AND user_id = ? AND type = 'expense'",
    )
    .get(input.category, userId);
  if (!category) throw new Error('CATEGORY_NOT_FOUND');
  db.prepare(
    "INSERT INTO budgets (user_id, month, category_id, amount_paise) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, month, category_id) DO UPDATE SET amount_paise = excluded.amount_paise, updated_at = datetime('now')",
  ).run(userId, input.month, input.category, input.amount);
  return { ...input, spent: 0 };
}

export function copyPreviousMonthBudgets(
  db: Database,
  userId: string,
  month: string,
): number {
  const result = db
    .prepare(
      "INSERT INTO budgets (user_id, month, category_id, amount_paise) SELECT user_id, ?, category_id, amount_paise FROM budgets WHERE user_id = ? AND month = strftime('%Y-%m', date(? || '-01', '-1 month')) ON CONFLICT(user_id, month, category_id) DO UPDATE SET amount_paise = excluded.amount_paise, updated_at = datetime('now')",
    )
    .run(month, userId, month);
  return result.changes;
}
