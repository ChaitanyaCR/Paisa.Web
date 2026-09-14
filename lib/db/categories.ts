import type { Database } from 'better-sqlite3';
import type { Category } from '@/lib/types';
import type { CategoryInput } from '@/lib/validation';

/**
 * The unique index behind the "duplicate category" error. `mapDbError` matches
 * SQLite's message against this name, so it lives here rather than as a literal
 * at the HTTP edge; `test/data-layer.spec.ts` asserts the schema still defines it.
 */
export const CATEGORY_NAME_INDEX = 'categories_user_type_name';

type CategoryRow = {
  id: string;
  name: string;
  type: Category['type'];
  color: string;
  icon: string;
  archived: number;
  transactionCount?: number;
};
const mapCategory = (row: CategoryRow): Category => ({
  ...row,
  archived: Boolean(row.archived),
});

export function listCategories(db: Database, userId: string): Category[] {
  return (
    db
      .prepare(
        'SELECT c.id, c.name, c.type, c.color, c.icon, c.archived, count(t.id) transactionCount FROM categories c LEFT JOIN transactions t ON t.user_id = c.user_id AND t.category_id = c.id WHERE c.user_id = ? GROUP BY c.id, c.name, c.type, c.color, c.icon, c.archived ORDER BY c.archived, c.type DESC, lower(c.name)',
      )
      .all(userId) as CategoryRow[]
  ).map(mapCategory);
}

export function getCategory(
  db: Database,
  userId: string,
  id: string,
): Category | undefined {
  const row = db
    .prepare(
      'SELECT id, name, type, color, icon, archived FROM categories WHERE user_id = ? AND id = ?',
    )
    .get(userId, id) as CategoryRow | undefined;
  return row ? mapCategory(row) : undefined;
}

export function categoryOwner(db: Database, id: string): string | undefined {
  return (
    db.prepare('SELECT user_id FROM categories WHERE id = ?').get(id) as
      | { user_id: string }
      | undefined
  )?.user_id;
}

export function createCategory(
  db: Database,
  userId: string,
  input: CategoryInput,
): Category {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO categories (id, user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, userId, input.name, input.type, input.color, input.icon ?? 'tags');
  return getCategory(db, userId, id)!;
}

export function updateCategory(
  db: Database,
  userId: string,
  id: string,
  input: Partial<CategoryInput>,
): Category | undefined {
  const current = getCategory(db, userId, id);
  if (!current) return undefined;
  db.prepare(
    "UPDATE categories SET name = ?, type = ?, color = ?, icon = ?, updated_at = datetime('now') WHERE user_id = ? AND id = ?",
  ).run(
    input.name ?? current.name,
    input.type ?? current.type,
    input.color ?? current.color,
    input.icon ?? current.icon,
    userId,
    id,
  );
  return getCategory(db, userId, id);
}

export function deleteCategory(
  db: Database,
  userId: string,
  id: string,
): boolean {
  const references = db
    .prepare(
      'SELECT (SELECT count(*) FROM transactions WHERE user_id = ? AND category_id = ?) + (SELECT count(*) FROM budgets WHERE user_id = ? AND category_id = ?) count',
    )
    .get(userId, id, userId, id) as { count: number };
  if (references.count > 0) throw new Error('CATEGORY_IN_USE');
  return (
    db
      .prepare('DELETE FROM categories WHERE user_id = ? AND id = ?')
      .run(userId, id).changes > 0
  );
}

export function setCategoryArchived(
  db: Database,
  userId: string,
  id: string,
  archived: boolean,
): Category | undefined {
  db.prepare(
    "UPDATE categories SET archived = ?, updated_at = datetime('now') WHERE user_id = ? AND id = ?",
  ).run(Number(archived), userId, id);
  return getCategory(db, userId, id);
}
