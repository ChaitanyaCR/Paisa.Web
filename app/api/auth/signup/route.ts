import { apiError, isResponse, parseJson } from '@/lib/api';
import { authResponse, requestIp } from '@/lib/auth/http';
import { hashPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { getDb } from '@/lib/db/client';
import { createSession, findSessionUser } from '@/lib/db/sessions';
import { createUser, findUserByEmail } from '@/lib/db/users';
import { signupSchema } from '@/lib/validation';

export async function POST(request: Request) {
  if (!checkRateLimit(`signup:ip:${requestIp(request)}`, 5))
    return apiError(429, 'RATE_LIMITED', 'Please try again later');
  const input = await parseJson(request, signupSchema);
  if (isResponse(input)) return input;
  const db = getDb();
  if (findUserByEmail(db, input.email))
    return apiError(
      409,
      'ACCOUNT_UNAVAILABLE',
      'An account could not be created with these details',
    );
  try {
    const created = createUser(db, {
      ...input,
      passwordHash: await hashPassword(input.password),
    });
    const token = createSession(db, created.id);
    return authResponse(findSessionUser(db, token)!, token, 201);
  } catch (error) {
    console.error('signup failed', error);
    return apiError(
      409,
      'ACCOUNT_UNAVAILABLE',
      'An account could not be created with these details',
    );
  }
}
