import { timingSafeEqual } from 'node:crypto';
import { apiError, isResponse, parseJson } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { getDb } from '@/lib/db/client';
import { createUser } from '@/lib/db/users';
import { signupSchema } from '@/lib/validation';

function equalSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  const supplied = request.headers.get('x-admin-setup-token') ?? '';
  if (!expected || !equalSecret(supplied, expected))
    return apiError(404, 'NOT_FOUND', 'Not found');
  const db = getDb();
  const adminExists = db
    .prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")
    .get();
  if (adminExists)
    return apiError(409, 'ADMIN_EXISTS', 'An administrator already exists');
  const input = await parseJson(request, signupSchema);
  if (isResponse(input)) return input;
  try {
    const user = createUser(db, {
      ...input,
      passwordHash: await hashPassword(input.password),
      role: 'admin',
    });
    return Response.json({ user }, { status: 201 });
  } catch {
    return apiError(
      409,
      'ACCOUNT_UNAVAILABLE',
      'An administrator could not be created',
    );
  }
}
