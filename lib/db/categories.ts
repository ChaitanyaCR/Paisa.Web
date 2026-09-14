import type { Database } from 'better-sqlite3';
import type { Category } from '@/lib/types';
import type { CategoryInput } from '@/lib/validation';

type CategoryRow = {
  id: string;
  name: string;
  type: Category['type'];
  color: string;
  archived: number;
};
const mapCategory = (row: CategoryRow): Category => ({
  ...row,
  archived: Boolean(row.archived),
});

export function listCategories(db: Database, userId: string): Category[] {
  return (
    db
      .prepare(
        'SELECT id, name, type, color, archived FROM categories WHERE user_id = ? ORDER BY archived, type DESC, lower(name)',
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
      'SELECT id, name, type, color, archived FROM categories WHERE user_id = ? AND id = ?',
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
    'INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, input.name, input.type, input.color);
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
    "UPDATE categories SET name = ?, type = ?, color = ?, updated_at = datetime('now') WHERE user_id = ? AND id = ?",
  ).run(
    input.name ?? current.name,
    input.type ?? current.type,
    input.color ?? current.color,
    userId,
    id,
  );
  return getCategory(db, userId, id);
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
