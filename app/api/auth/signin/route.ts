import { apiError, isResponse, parseJson } from '@/lib/api';
import { authResponse, requestIp } from '@/lib/auth/http';
import { hashPassword, needsRehash, verifyPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { getDb } from '@/lib/db/client';
import { createSession, findSessionUser } from '@/lib/db/sessions';
import { findUserByEmail, updatePassword } from '@/lib/db/users';
import { signinSchema } from '@/lib/validation';

const dummyHash = hashPassword('not-a-real-user-password');

export async function POST(request: Request) {
  const input = await parseJson(request, signinSchema);
  if (isResponse(input)) return input;
  const ip = requestIp(request);
  if (
    !checkRateLimit(`signin:ip:${ip}`) ||
    !checkRateLimit(`signin:account:${input.email}`, 5)
  )
    return apiError(429, 'RATE_LIMITED', 'Please try again later');
  const db = getDb();
  const user = findUserByEmail(db, input.email);
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !valid)
    return apiError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
  if (needsRehash(user.passwordHash))
    updatePassword(
      db,
      user.id,
      await hashPassword(input.password),
      user.mustChangePassword,
    );
  const token = createSession(db, user.id);
  return authResponse(findSessionUser(db, token)!, token);
}
