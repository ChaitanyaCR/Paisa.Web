import { sessionToken } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/http';
import { getDb } from '@/lib/db/client';
import { deleteSession } from '@/lib/db/sessions';

export function POST(request: Request) {
  const token = sessionToken(request);
  if (token) deleteSession(getDb(), token);
  return new Response(null, {
    status: 204,
    headers: { 'set-cookie': clearSessionCookie() },
  });
}
