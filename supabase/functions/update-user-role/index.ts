import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Role = 'super_admin' | 'admin' | 'chef' | 'staff'
type Status = 'pending' | 'approved' | 'rejected'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Yetkilendirme başlığı eksik' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId, newRole, newLocationId, newStatus } = await req.json()

    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ error: 'targetUserId ve newRole zorunlu' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validRoles: Role[] = ['super_admin', 'admin', 'chef', 'staff']
    if (!validRoles.includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Geçersiz rol' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerRole: Role = callerProfile.role
    const callerLocationId: string | null = callerProfile.location_id

    if (!['super_admin', 'admin', 'chef'].includes(callerRole)) {
      return new Response(JSON.stringify({ error: 'Bu işlem için yetkiniz yok' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, role, location_id, status')
      .eq('id', targetUserId)
      .single()

    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Hedef kullanıcı bulunamadı' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (callerRole === 'admin') {
      if (!['chef', 'staff'].includes(newRole)) {
        return new Response(JSON.stringify({ error: 'Admin yalnızca şef veya personel atayabilir' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const targetLoc = newLocationId || targetProfile.location_id
      if (targetLoc && callerLocationId && targetLoc !== callerLocationId) {
        return new Response(JSON.stringify({ error: 'Yalnızca kendi lokasyonunuzdaki kullanıcıları yönetebilirsiniz' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (callerRole === 'chef') {
      if (newRole !== 'staff') {
        return new Response(JSON.stringify({ error: 'Şef yalnızca personel rolü atayabilir' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const targetLoc = newLocationId || targetProfile.location_id
      if (targetLoc && callerLocationId && targetLoc !== callerLocationId) {
        return new Response(JSON.stringify({ error: 'Yalnızca kendi lokasyonunuzdaki kullanıcıları yönetebilirsiniz' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const updateData: Record<string, unknown> = { role: newRole }
    if (newLocationId !== undefined) updateData.location_id = newLocationId || null
    if (newStatus) {
      const validStatuses: Status[] = ['pending', 'approved', 'rejected']
      if (validStatuses.includes(newStatus)) updateData.status = newStatus
    }

    const { error: updateErr } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Güncelleme başarısız: ' + updateErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[update-user-role]', e)
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
