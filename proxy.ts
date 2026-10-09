import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/**
 * Beskytter alt unntatt innlogging, manifest, ikoner og statiske filer (se matcher).
 * API-kall uten gyldig økt får 401 JSON, sider sendes til /login.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/login') {
    return loggedIn ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }
  if (loggedIn) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'unauthorized', message: 'Du må logge inn på nytt.' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icons/|apple-icon|icon|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)',
  ],
};
