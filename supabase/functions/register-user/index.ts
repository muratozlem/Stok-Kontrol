import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://stokkontrol.replit.app',
  'https://stokkontrol.tr',
  'http://localhost:5000',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) {
    // Still iterate to avoid timing leak on length difference alone
    let dummy = 0;
    for (let i = 0; i < ab.length; i++) dummy |= ab[i] ^ (bb[i % bb.length] ?? 0);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const clientIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      'unknown';

    const body = await req.json();
    const { email, password, bootstrap_token } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'E-posta ve şifre gerekli' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || /[%_\\]/.test(cleanEmail) || cleanEmail.length > 254) {
      return new Response(JSON.stringify({ error: 'Geçersiz e-posta adresi' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: 'Şifre en az 6 karakter olmalı' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // IP tabanlı rate limiting: son 1 saatte bu IP'den max 5 kayıt
    if (clientIP !== 'unknown') {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { count: recentCount, error: rateErr } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('registered_from_ip', clientIP)
        .gte('created_at', windowStart);

      if (rateErr) {
        // Fail closed: if the rate-limit query fails (e.g. schema drift), block the request
        console.error('[register-user] rate-limit query error:', rateErr.message);
        return new Response(JSON.stringify({ error: 'Kayıt şu anda yapılamıyor. Lütfen daha sonra tekrar deneyin.' }), {
          status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
        return new Response(JSON.stringify({ error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.' }), {
          status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const isFirst = !count || count === 0;

    if (isFirst) {
      // Bootstrap protection: first super_admin requires a server-side secret
      const bootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET');
      if (!bootstrapSecret) {
        return new Response(JSON.stringify({
          error: 'Sistem kurulumu henüz tamamlanmamış. Lütfen yöneticiyle iletişime geçin.',
        }), {
          status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (!bootstrap_token || !timingSafeEqual(String(bootstrap_token), bootstrapSecret)) {
        return new Response(JSON.stringify({
          error: 'Kurulum tokeni hatalı veya eksik.',
          bootstrap_required: true,
        }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    const role = isFirst ? 'super_admin' : 'staff';
    const status = isFirst ? 'approved' : 'pending';

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? '';
      // Email enumeration önleme: kayıtlı e-posta için aynı başarı yanıtını dön
      if (msg.includes('already registered') || msg.includes('duplicate')) {
        return new Response(JSON.stringify({ success: true, status: 'pending' }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Kayıt oluşturulamadı' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;
    const username = cleanEmail.split('@')[0] ?? cleanEmail;

    const profileRow: Record<string, unknown> = {
      id: userId,
      email: cleanEmail,
      username,
      role,
      status,
    };
    if (clientIP !== 'unknown') {
      profileRow.registered_from_ip = clientIP;
    }

    const { error: profileError } = await adminClient.from('profiles').insert(profileRow);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Profil oluşturulamadı' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, isFirst, status, userId }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[register-user]', e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
