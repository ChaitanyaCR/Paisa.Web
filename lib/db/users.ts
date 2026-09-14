import type { Database } from 'better-sqlite3';
import { initialCategories } from '@/lib/sample-data';

export type NewUser = {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  consent?: boolean;
};

export type UserRole = 'user' | 'admin';
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export function createUser(db: Database, input: NewUser) {
  const id = input.id ?? crypto.randomUUID();
  db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, consented_at, privacy_version) VALUES (?, ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') END, CASE WHEN ? THEN '2026-09-v1' END)",
    ).run(
      id,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.passwordHash,
      input.role ?? 'user',
      Number(input.consent ?? false),
      Number(input.consent ?? false),
    );
    const insert = db.prepare(
      'INSERT INTO categories (id, user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const category of initialCategories)
      insert.run(
        crypto.randomUUID(),
        id,
        category.name,
        category.type,
        category.color,
        category.icon,
      );
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);
  })();
  return {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
  };
}

export function updateUserName(
  db: Database,
  userId: string,
  name: string,
): boolean {
  return (
    db
      .prepare(
        "UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(name.trim(), userId).changes > 0
  );
}

export function deleteUser(db: Database, userId: string): boolean {
  return db.prepare('DELETE FROM users WHERE id = ?').run(userId).changes > 0;
}

export function findUserByEmail(
  db: Database,
  email: string,
): (User & { passwordHash: string }) | undefined {
  const row = db
    .prepare(
      'SELECT id, name, email, role, must_change_password mustChangePassword, password_hash passwordHash FROM users WHERE email = ?',
    )
    .get(email.trim().toLowerCase()) as
    | (Omit<User, 'mustChangePassword'> & {
        mustChangePassword: number;
        passwordHash: string;
      })
    | undefined;
  return row && { ...row, mustChangePassword: Boolean(row.mustChangePassword) };
}

export function listUsers(db: Database): User[] {
  const rows = db
    .prepare(
      'SELECT id, name, email, role, must_change_password mustChangePassword FROM users ORDER BY lower(name)',
    )
    .all() as Array<
    Omit<User, 'mustChangePassword'> & { mustChangePassword: number }
  >;
  return rows.map((row) => ({
    ...row,
    mustChangePassword: Boolean(row.mustChangePassword),
  }));
}

export function updatePassword(
  db: Database,
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean,
): void {
  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(passwordHash, Number(mustChangePassword), userId);
}
