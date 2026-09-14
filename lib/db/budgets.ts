import type { Database } from 'better-sqlite3';
import type { BudgetInput } from '@/lib/validation';

export type Budget = { month: string; category: string; amount: number };

export function listBudgets(
  db: Database,
  userId: string,
  month: string,
): Budget[] {
  return db
    .prepare(
      'SELECT month, category_id category, amount_paise amount FROM budgets WHERE user_id = ? AND month = ? ORDER BY category_id',
    )
    .all(userId, month) as Budget[];
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
  return input;
}
