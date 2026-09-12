import type { Database } from 'better-sqlite3';
import { deleteUserSessions } from '@/lib/db/sessions';
import { updatePassword } from '@/lib/db/users';

export function adminResetPassword(
  db: Database,
  adminUserId: string,
  targetUserId: string,
  passwordHash: string,
): boolean {
  return db.transaction(() => {
    const target = db
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .get(targetUserId);
    if (!target) return false;
    updatePassword(db, targetUserId, passwordHash, true);
    deleteUserSessions(db, targetUserId);
    db.prepare(
      "INSERT INTO admin_audit_log (id, admin_user_id, target_user_id, action) VALUES (?, ?, ?, 'password_reset')",
    ).run(crypto.randomUUID(), adminUserId, targetUserId);
    return true;
  })();
}
