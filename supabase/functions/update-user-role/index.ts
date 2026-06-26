import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://stokkontrol.replit.app',
  'https://stokkontrol.tr',
  'http://localhost:5000',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

type Role = 'super_admin' | 'admin' | 'chef' | 'staff'
type Status = 'pending' | 'approved' | 'rejected'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Yetkilendirme başlığı eksik' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId, newRole, newLocationId, newStatus } = await req.json()

    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ error: 'targetUserId ve newRole zorunlu' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const validRoles: Role[] = ['super_admin', 'admin', 'chef', 'staff']
    if (!validRoles.includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Geçersiz rol' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Oturum doğrulanamadı' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('profiles')
      .select('id, role, location_id, status')
      .eq('id', user.id)
      .single()

    if (callerErr || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Çağıran profil bulunamadı' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const callerRole: Role = callerProfile.role
    const callerLocationId: string | null = callerProfile.location_id

    if (!['super_admin', 'admin', 'chef'].includes(callerRole)) {
      return new Response(JSON.stringify({ error: 'Bu işlem için yetkiniz yok' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Admin, super_admin rolü atayamaz
    if (callerRole === 'admin' && newRole === 'super_admin') {
      return new Response(JSON.stringify({ error: 'Bu işlem için yetkiniz yok' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, role, location_id, status')
      .eq('id', targetUserId)
      .single()

    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Hedef kullanıcı bulunamadı' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (callerRole === 'admin') {
      if (!['chef', 'staff'].includes(newRole)) {
        return new Response(JSON.stringify({ error: 'Admin yalnızca şef veya personel atayabilir' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      if (!callerLocationId) {
        return new Response(JSON.stringify({ error: 'Lokasyonunuz tanımlı değil' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      // Hedef kullanıcının lokasyonu admin'inkinden farklıysa reddet
      const effectiveLoc = newLocationId || targetProfile.location_id
      if (effectiveLoc && effectiveLoc !== callerLocationId) {
        return new Response(JSON.stringify({ error: 'Yalnızca kendi lokasyonunuzdaki kullanıcıları yönetebilirsiniz' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    }

    if (callerRole === 'chef') {
      if (newRole !== 'staff') {
        return new Response(JSON.stringify({ error: 'Şef yalnızca personel rolü atayabilir' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const targetLoc = newLocationId || targetProfile.location_id
      if (targetLoc && callerLocationId && targetLoc !== callerLocationId) {
        return new Response(JSON.stringify({ error: 'Yalnızca kendi lokasyonunuzdaki kullanıcıları yönetebilirsiniz' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    }

    const updateData: Record<string, unknown> = { role: newRole }

    if (callerRole === 'admin' && callerLocationId) {
      const resolvedLoc = newLocationId !== undefined ? (newLocationId || null) : (targetProfile.location_id || callerLocationId)
      updateData.location_id = resolvedLoc ?? callerLocationId
    } else if (newLocationId !== undefined) {
      updateData.location_id = newLocationId || null
    }

    if (newStatus) {
      const validStatuses: Status[] = ['pending', 'approved', 'rejected']
      if (validStatuses.includes(newStatus)) updateData.status = newStatus
    }

    const { error: updateErr } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Güncelleme başarısız' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[update-user-role]', e instanceof Error ? e.message : String(e))
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
