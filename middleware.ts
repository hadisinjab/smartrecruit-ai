import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';
import { updateSession } from './src/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Only the public apply flow should be WITHOUT locale in the URL:
  // `/apply/[jobId]` should NOT redirect to `/${defaultLocale}/apply/...`.
  const pathname = request.nextUrl.pathname;
  if (pathname === '/apply' || pathname.startsWith('/apply/')) {
    const res = NextResponse.next({ request })
    return await updateSession(request, res)
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
