import { createHash } from 'node:crypto';
import type { Database } from 'better-sqlite3';

export const hashSessionToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function findSessionUser(
  db: Database,
  token: string,
): { id: string; name: string; email: string } | undefined {
  return db
    .prepare(
      "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')",
    )
    .get(hashSessionToken(token)) as
    | { id: string; name: string; email: string }
    | undefined;
}
