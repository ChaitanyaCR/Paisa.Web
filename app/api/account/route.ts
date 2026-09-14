import { apiError, isResponse, parseJson, requireUser } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/http';
import { verifyPassword } from '@/lib/auth/password';
import { getDb } from '@/lib/db/client';
import { deleteUser, findUserByEmail, updateUserName } from '@/lib/db/users';
import { accountDeleteSchema, accountUpdateSchema } from '@/lib/validation';

export async function PATCH(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, accountUpdateSchema);
  if (isResponse(input)) return input;
  updateUserName(getDb(), user.id, input.name);
  return Response.json({ user: { ...user, name: input.name } });
}

export async function DELETE(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, accountDeleteSchema);
  if (isResponse(input)) return input;
  const db = getDb();
  const stored = findUserByEmail(db, user.email)!;
  if (!(await verifyPassword(input.password, stored.passwordHash)))
    return apiError(401, 'INVALID_CREDENTIALS', 'Password is incorrect');
  deleteUser(db, user.id);
  return new Response(null, {
    status: 204,
    headers: { 'set-cookie': clearSessionCookie() },
  });
}
