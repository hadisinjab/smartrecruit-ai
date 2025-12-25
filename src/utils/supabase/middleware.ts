
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse = response || NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          
          // We don't want to create a new response here because it would overwrite 
          // the response from next-intl middleware passed as argument.
          // supabaseResponse = NextResponse.next({
          //   request,
          // })
          
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const normalizedPath = decodeURIComponent(request.nextUrl.pathname).toLowerCase()
  const pathSegments = normalizedPath.split('/').filter(Boolean)
  const locale =
    pathSegments[0] && routing.locales.includes(pathSegments[0] as (typeof routing)['locales'][number])
      ? pathSegments[0]
      : routing.defaultLocale

  const adminBase = `/${locale}/admin`
  const isAdminRoute = normalizedPath.includes('/admin')
  const isAdminAuthRoute =
    normalizedPath.startsWith(`${adminBase}/login`) ||
    normalizedPath.startsWith('/admin/login') ||
    normalizedPath.startsWith(`${adminBase}/log in`) ||
    normalizedPath.startsWith('/admin/log in')

  // If it's NOT an admin route, allow access without auth
  if (!isAdminRoute) {
    return supabaseResponse
  }
  
  const allowedAdminRoles = new Set(['admin', 'super-admin', 'reviewer'])

  const redirectToLogin = () => {
    const loginUrl = new URL(`${adminBase}/login`, request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // Allow access to login pages
  if (isAdminAuthRoute) {
    return supabaseResponse
  }

  // Check authentication for all other routes
  if (!user) {
    return redirectToLogin()
  }

  // Check role in database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[Middleware] User:', user.id, 'Role:', userData?.role, 'Error:', userError?.message);

  // If user is not found in database, or has no role, or role is not allowed
  if (userError || !userData || !userData.role || !allowedAdminRoles.has(userData.role)) {
    console.log('[Middleware] Access Denied. Redirecting to login.');
    await supabase.auth.signOut()
    return redirectToLogin()
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  return supabaseResponse
}
