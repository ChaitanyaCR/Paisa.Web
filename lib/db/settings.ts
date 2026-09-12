import type { Database } from 'better-sqlite3';
import type { SettingsInput } from '@/lib/validation';

export type UserSettings = {
  budgetingEnabled: boolean;
  appearance: 'light' | 'dark' | 'system';
};

export function getSettings(
  db: Database,
  userId: string,
): UserSettings | undefined {
  const row = db
    .prepare(
      'SELECT budgeting_enabled budgetingEnabled, appearance FROM user_settings WHERE user_id = ?',
    )
    .get(userId) as
    | { budgetingEnabled: number; appearance: UserSettings['appearance'] }
    | undefined;
  return (
    row && {
      budgetingEnabled: Boolean(row.budgetingEnabled),
      appearance: row.appearance,
    }
  );
}

export function updateSettings(
  db: Database,
  userId: string,
  input: SettingsInput,
): UserSettings | undefined {
  const current = getSettings(db, userId);
  if (!current) return undefined;
  db.prepare(
    "UPDATE user_settings SET budgeting_enabled = ?, appearance = ?, updated_at = datetime('now') WHERE user_id = ?",
  ).run(
    Number(input.budgetingEnabled ?? current.budgetingEnabled),
    input.appearance ?? current.appearance,
    userId,
  );
  return getSettings(db, userId);
}
