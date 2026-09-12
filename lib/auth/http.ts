import type { SessionUser } from '@/lib/db/sessions';

export const SESSION_COOKIE = 'session';

const securityAttributes = () =>
  `HttpOnly; ${process.env.NODE_ENV === 'development' ? '' : 'Secure; '}SameSite=Lax`;

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; ${securityAttributes()}; Max-Age=2592000`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; ${securityAttributes()}; Max-Age=0`;
}

export function authResponse(
  user: SessionUser,
  token: string,
  status = 200,
): Response {
  return Response.json(
    { user },
    { status, headers: { 'set-cookie': sessionCookie(token) } },
  );
}

export function requestIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  );
}
