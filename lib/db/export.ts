import type { Database } from 'better-sqlite3';

/** The complete portable record for the signed-in account, never written to logs. */
export function exportAccountData(db: Database, userId: string) {
  return {
    exportedAt: new Date().toISOString(),
    account: db
      .prepare(
        'SELECT name, email, created_at createdAt, consented_at consentedAt, privacy_version privacyVersion FROM users WHERE id = ?',
      )
      .get(userId),
    settings: db
      .prepare(
        'SELECT budgeting_enabled budgetingEnabled, appearance FROM user_settings WHERE user_id = ?',
      )
      .get(userId),
    categories: db
      .prepare(
        'SELECT id, name, type, color, icon, archived, created_at createdAt FROM categories WHERE user_id = ? ORDER BY lower(name)',
      )
      .all(userId),
    transactions: db
      .prepare(
        'SELECT id, type, amount_paise amountPaise, date, category_id categoryId, notes, created_at createdAt FROM transactions WHERE user_id = ? ORDER BY date, created_at',
      )
      .all(userId),
    budgets: db
      .prepare(
        'SELECT month, category_id categoryId, amount_paise amountPaise, updated_at updatedAt FROM budgets WHERE user_id = ? ORDER BY month, category_id',
      )
      .all(userId),
  };
}
