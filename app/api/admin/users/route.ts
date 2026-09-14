import { apiError, isResponse, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db/client';
import { listUsers } from '@/lib/db/users';

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  if (user.role !== 'admin')
    return apiError(403, 'FORBIDDEN', 'Administrator access required');
  return Response.json({ users: listUsers(getDb()) });
}
