import { createHash, randomBytes } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export const hashSessionToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function findSessionUser(
  db: Database,
  token: string,
): SessionUser | undefined {
  const row = db
    .prepare(
      "SELECT u.id, u.name, u.email, u.role, u.must_change_password mustChangePassword FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND s.last_seen_at > datetime('now', '-14 days')",
    )
    .get(hashSessionToken(token)) as
    | (Omit<SessionUser, 'mustChangePassword'> & { mustChangePassword: number })
    | undefined;
  if (!row) return undefined;
  db.prepare(
    "UPDATE sessions SET last_seen_at = datetime('now') WHERE token_hash = ?",
  ).run(hashSessionToken(token));
  return { ...row, mustChangePassword: Boolean(row.mustChangePassword) };
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
};

export function createSession(db: Database, userId: string): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))",
  ).run(crypto.randomUUID(), userId, hashSessionToken(token));
  return token;
}

export function deleteSession(db: Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
    hashSessionToken(token),
  );
}

export function deleteUserSessions(db: Database, userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
