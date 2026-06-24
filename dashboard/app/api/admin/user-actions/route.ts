import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

function getCallerSupabase(request: NextRequest) {
  const cookies: Record<string, string> = {}
  request.cookies.getAll().forEach(({ name, value }) => { cookies[name] = value })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function PATCH(request: NextRequest) {
  const callerSupabase = getCallerSupabase(request)
  const { data: { user } } = await callerSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }

  const body = await request.json()
  const { action, userId, role } = body

  if (!userId || !action) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }

  if (targetProfile.role === 'super_admin') {
    return NextResponse.json({ error: 'Süper admin değiştirilemez' }, { status: 403 })
  }

  if (action === 'approve') {
    await adminClient.from('profiles').update({ approved: true }).eq('id', userId)
  } else if (action === 'reject') {
    await adminClient.from('profiles').update({ approved: false }).eq('id', userId)
  } else if (action === 'change_role') {
    if (!role) return NextResponse.json({ error: 'Rol belirtilmedi' }, { status: 400 })
    if (role === 'super_admin') {
      return NextResponse.json({ error: 'Süper admin rolü atanamaz' }, { status: 403 })
    }
    if (callerProfile.role === 'admin' && role === 'admin' && callerProfile.role !== 'super_admin') {
    }
    await adminClient.from('profiles').update({ role }).eq('id', userId)
  } else {
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
