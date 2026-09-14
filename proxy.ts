import { NextResponse, type NextRequest } from 'next/server';
import { findSessionUser } from '@/lib/db/sessions';
import { getDb } from '@/lib/db/client';

const publicPaths = new Set(['/signin', '/signup', '/reset', '/privacy']);

function securityHeaders(response: NextResponse) {
  response.headers.set(
    'content-security-policy',
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'",
  );
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'permissions-policy',
    'camera=(), microphone=(), geolocation=()',
  );
  if (process.env.NODE_ENV === 'production')
    response.headers.set(
      'strict-transport-security',
      'max-age=31536000; includeSubDomains',
    );
  return response;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/'))
    return securityHeaders(NextResponse.next());
  const token = request.cookies.get('session')?.value;
  const user = token ? findSessionUser(getDb(), token) : undefined;
  const pathname = request.nextUrl.pathname;
  if (publicPaths.has(pathname)) {
    if (user)
      return securityHeaders(
        NextResponse.redirect(
          new URL(
            user.mustChangePassword ? '/change-password' : '/overview',
            request.url,
          ),
        ),
      );
    return securityHeaders(NextResponse.next());
  }
  if (!user)
    return securityHeaders(
      NextResponse.redirect(new URL('/signin', request.url)),
    );
  if (user.mustChangePassword && pathname !== '/change-password')
    return securityHeaders(
      NextResponse.redirect(new URL('/change-password', request.url)),
    );
  if (pathname.startsWith('/admin') && user.role !== 'admin')
    return securityHeaders(
      NextResponse.redirect(new URL('/overview', request.url)),
    );
  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/api/:path*',
    '/overview/:path*',
    '/transactions/:path*',
    '/analytics/:path*',
    '/budgets/:path*',
    '/categories/:path*',
    '/settings/:path*',
    '/change-password/:path*',
    '/admin/:path*',
    '/signin',
    '/signup',
    '/reset',
    '/privacy',
  ],
};
