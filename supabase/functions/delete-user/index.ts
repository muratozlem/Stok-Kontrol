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

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Kimlik doğrulama gerekli' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Geçersiz oturum' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId } = await req.json()

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Kullanıcı ID gerekli' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'Kendi hesabınızı silemezsiniz' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (targetProfile.role === 'super_admin') {
      return new Response(JSON.stringify({ error: 'Süper admin silinemez' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (callerProfile.role === 'admin' && targetProfile.role === 'admin') {
      return new Response(JSON.stringify({ error: 'Admin, başka bir admini silemez' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
      console.error('[delete-user]', deleteError.message)
      return new Response(JSON.stringify({ error: 'Kullanıcı silinemedi' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[delete-user]', e instanceof Error ? e.message : String(e))
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
