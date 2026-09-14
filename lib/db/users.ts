import type { Database } from 'better-sqlite3';
import { initialCategories } from '@/lib/sample-data';

export type NewUser = {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
};

export function createUser(db: Database, input: NewUser) {
  const id = input.id ?? crypto.randomUUID();
  db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    ).run(
      id,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.passwordHash,
    );
    const insert = db.prepare(
      'INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, ?, ?)',
    );
    for (const category of initialCategories)
      insert.run(
        crypto.randomUUID(),
        id,
        category.name,
        category.type,
        category.color,
      );
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);
  })();
  return {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
  };
}
