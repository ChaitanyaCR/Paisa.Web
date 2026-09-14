import { apiError, isResponse, parseJson, requireUser } from '@/lib/api';
import { authResponse, requestIp } from '@/lib/auth/http';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { getDb } from '@/lib/db/client';
import {
  createSession,
  deleteUserSessions,
  findSessionUser,
} from '@/lib/db/sessions';
import { findUserByEmail, updatePassword } from '@/lib/db/users';
import { changePasswordSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const sessionUser = requireUser(request, {
    allowPasswordChangeRequired: true,
  });
  if (isResponse(sessionUser)) return sessionUser;
  if (
    !checkRateLimit(
      `change-password:${sessionUser.id}:${requestIp(request)}`,
      5,
    )
  )
    return apiError(429, 'RATE_LIMITED', 'Please try again later');
  const input = await parseJson(request, changePasswordSchema);
  if (isResponse(input)) return input;
  const db = getDb();
  const user = findUserByEmail(db, sessionUser.email)!;
  if (!(await verifyPassword(input.currentPassword, user.passwordHash)))
    return apiError(
      401,
      'INVALID_CREDENTIALS',
      'Current password is incorrect',
    );
  updatePassword(db, user.id, await hashPassword(input.newPassword), false);
  deleteUserSessions(db, user.id);
  const token = createSession(db, user.id);
  return authResponse(findSessionUser(db, token)!, token);
}
