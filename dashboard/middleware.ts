import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)

  const cookiesToSet: Array<{ name: string; value: string; options: any }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(incoming) {
          incoming.forEach((c) => cookiesToSet.push(c))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, location_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role) || profile.status !== 'approved') {
    await supabase.auth.signOut()
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  requestHeaders.set('x-caller-id', user.id)
  requestHeaders.set('x-caller-role', profile.role)
  requestHeaders.set('x-caller-location-id', profile.location_id ?? '')

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
