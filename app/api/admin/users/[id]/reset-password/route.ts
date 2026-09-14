import { apiError, isResponse, parseJson, requireUser } from '@/lib/api';
import { requestIp } from '@/lib/auth/http';
import { hashPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { adminResetPassword } from '@/lib/db/admin';
import { getDb } from '@/lib/db/client';
import { adminResetPasswordSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, context: Context) {
  const admin = requireUser(request);
  if (isResponse(admin)) return admin;
  if (admin.role !== 'admin')
    return apiError(403, 'FORBIDDEN', 'Administrator access required');
  if (!checkRateLimit(`admin-reset:${admin.id}:${requestIp(request)}`, 10))
    return apiError(429, 'RATE_LIMITED', 'Please try again later');
  const input = await parseJson(request, adminResetPasswordSchema);
  if (isResponse(input)) return input;
  const { id } = await Promise.resolve(context.params);
  const reset = adminResetPassword(
    getDb(),
    admin.id,
    id,
    await hashPassword(input.temporaryPassword),
  );
  return reset
    ? new Response(null, { status: 204 })
    : apiError(404, 'NOT_FOUND', 'User not found');
}
