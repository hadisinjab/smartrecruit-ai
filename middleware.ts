import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';
import { updateSession } from './src/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Convenience redirect: allow /admin/* without locale prefix.
  // Our app routes are under /[locale]/admin/*, so redirect to default locale.
  const pathname = request.nextUrl.pathname;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);
  return await updateSession(request, response);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
