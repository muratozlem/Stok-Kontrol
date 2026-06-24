import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Kimlik doğrulama gerekli' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { requestId, targetUserId, newPassword } = await req.json()

    if (!requestId || !targetUserId || !newPassword || String(newPassword).length < 6) {
      return new Response(JSON.stringify({ error: 'Geçersiz istek parametreleri' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: resetRequest } = await adminClient
      .from('password_reset_requests')
      .select('email')
      .eq('id', requestId)
      .single()

    if (!resetRequest) {
      return new Response(JSON.stringify({ error: 'Sıfırlama talebi bulunamadı' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .eq('email', resetRequest.email)
      .single()

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Hedef kullanıcı bulunamadı' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { password: String(newPassword) },
    )

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Şifre güncellenemedi: ' + updateError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await adminClient
      .from('password_reset_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin-reset-password]', e)
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
