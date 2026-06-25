import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function getCallerUser(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await anonClient.auth.getUser()
  if (error || !user) return null
  return user
}

export async function PATCH(request: NextRequest) {
  const user = await getCallerUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadı veya süresi doldu' }, { status: 401 })
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  const { action, userId, role } = body

  if (!userId || !action) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }

  if (targetProfile.role === 'super_admin') {
    return NextResponse.json({ error: 'Süper admin değiştirilemez' }, { status: 403 })
  }

  if (action === 'approve') {
    const { error } = await adminClient.from('profiles').update({ status: 'approved' }).eq('id', userId)
    if (error) return NextResponse.json({ error: 'Güncelleme başarısız: ' + error.message }, { status: 500 })
  } else if (action === 'reject') {
    const { error } = await adminClient.from('profiles').update({ status: 'rejected' }).eq('id', userId)
    if (error) return NextResponse.json({ error: 'Güncelleme başarısız: ' + error.message }, { status: 500 })
  } else if (action === 'change_role') {
    if (!role) return NextResponse.json({ error: 'Rol belirtilmedi' }, { status: 400 })
    if (role === 'super_admin') {
      return NextResponse.json({ error: 'Süper admin rolü atanamaz' }, { status: 403 })
    }
    if (callerProfile.role === 'admin' && role === 'admin') {
      return NextResponse.json({ error: 'Admin rolü atayamazsınız' }, { status: 403 })
    }
    const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId)
    if (error) return NextResponse.json({ error: 'Güncelleme başarısız: ' + error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  }

  revalidatePath('/dashboard/users')
  return NextResponse.json({ success: true })
}
