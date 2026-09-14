import { NextResponse, type NextRequest } from 'next/server';
import { findSessionUser } from '@/lib/db/sessions';
import { getDb } from '@/lib/db/client';

const authPaths = new Set(['/signin', '/signup', '/reset']);

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const user = token ? findSessionUser(getDb(), token) : undefined;
  const pathname = request.nextUrl.pathname;
  if (authPaths.has(pathname)) {
    if (user)
      return NextResponse.redirect(
        new URL(
          user.mustChangePassword ? '/change-password' : '/overview',
          request.url,
        ),
      );
    return NextResponse.next();
  }
  if (!user) return NextResponse.redirect(new URL('/signin', request.url));
  if (user.mustChangePassword && pathname !== '/change-password')
    return NextResponse.redirect(new URL('/change-password', request.url));
  if (pathname.startsWith('/admin') && user.role !== 'admin')
    return NextResponse.redirect(new URL('/overview', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
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
  ],
};
