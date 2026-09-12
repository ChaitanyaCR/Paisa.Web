import { isResponse, requireUser } from '@/lib/api';

export function GET(request: Request) {
  const user = requireUser(request, { allowPasswordChangeRequired: true });
  return isResponse(user) ? user : Response.json({ user });
}
