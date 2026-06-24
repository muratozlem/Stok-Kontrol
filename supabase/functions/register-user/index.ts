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
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'E-posta ve şifre gerekli' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanEmail = String(email).trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || /[%_\\]/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Geçersiz e-posta adresi' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: 'Şifre en az 6 karakter olmalı' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kayıtlı' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const isFirst = !count || count === 0
    const role: 'super_admin' | 'staff' = isFirst ? 'super_admin' : 'staff'
    const status: 'pending' | 'approved' = isFirst ? 'approved' : 'pending'

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
    })

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Kayıt oluşturulamadı'
      if (msg.includes('already registered') || msg.includes('duplicate')) {
        return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kayıtlı' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = authData.user.id
    const username = cleanEmail.split('@')[0] ?? cleanEmail

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      email: cleanEmail,
      username,
      role,
      status,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: 'Profil oluşturulamadı: ' + profileError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, isFirst, status, userId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[register-user]', e)
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
