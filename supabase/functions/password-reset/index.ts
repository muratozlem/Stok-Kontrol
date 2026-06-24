import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_RE = /^[a-zA-Z0-9.!#$&*+/=?^_{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function strictEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.includes('%') || e.includes('_') || e.length > 254) return null;
  return e;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const resHeaders = { 'Content-Type': 'application/json', ...CORS };

  try {
    const body = await req.json();
    const { action, email: rawEmail, code, newPassword } = body;

    const email = strictEmail(rawEmail ?? '');
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Geçersiz e-posta adresi' }), {
        status: 400, headers: resHeaders,
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'request') {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (!profiles?.length) {
        return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await adminClient.from('password_reset_tokens').upsert(
        { email, code: resetCode, expires_at: expiresAt },
        { onConflict: 'email' },
      );

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Stok Kontrol <onboarding@resend.dev>',
          to: [email],
          subject: 'Şifre Sıfırlama Kodu — Stok Kontrol',
          html: `
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:#1A1D2E;border-radius:16px;padding:12px 20px;">
      <span style="color:#fff;font-size:20px;font-weight:800;">Stok Kontrol</span>
    </div>
  </div>
  <h2 style="color:#1A1D2E;font-size:22px;font-weight:700;margin:0 0 8px;">Şifre Sıfırlama</h2>
  <p style="color:#666;font-size:14px;margin:0 0 28px;">Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu uygulamaya girin. Kod <strong>15 dakika</strong> geçerlidir.</p>
  <div style="background:#F6F8FB;border-radius:14px;padding:24px;text-align:center;border:2px solid #E8ECF0;margin-bottom:28px;">
    <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#1A1D2E;font-family:monospace;">${resetCode}</span>
  </div>
  <p style="color:#aaa;font-size:12px;text-align:center;">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
</div>`,
        }),
      });

      return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
    }

    if (action === 'confirm') {
      if (!code || !newPassword || String(newPassword).length < 6) {
        return new Response(JSON.stringify({ ok: false, error: 'Geçersiz parametreler' }), {
          status: 400, headers: resHeaders,
        });
      }

      const { data: tokens } = await adminClient
        .from('password_reset_tokens')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (!tokens?.length) {
        return new Response(JSON.stringify({ ok: false, error: 'Geçersiz veya süresi dolmuş kod' }), {
          status: 400, headers: resHeaders,
        });
      }

      const token = tokens[0];
      if (token.code !== String(code)) {
        return new Response(JSON.stringify({ ok: false, error: 'Hatalı kod. Lütfen tekrar deneyin.' }), {
          status: 400, headers: resHeaders,
        });
      }
      if (new Date(token.expires_at) < new Date()) {
        return new Response(JSON.stringify({ ok: false, error: 'Kodun süresi dolmuş. Lütfen yeni kod isteyin.' }), {
          status: 400, headers: resHeaders,
        });
      }

      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ ok: false, error: 'Kullanıcı bulunamadı' }), {
          status: 404, headers: resHeaders,
        });
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        profile.id,
        { password: String(newPassword) },
      );

      if (updateError) {
        return new Response(JSON.stringify({ ok: false, error: 'Şifre güncellenemedi: ' + updateError.message }), {
          status: 500, headers: resHeaders,
        });
      }

      await adminClient.from('password_reset_tokens').delete().eq('email', email);

      return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Geçersiz işlem' }), {
      status: 400, headers: resHeaders,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[password-reset]', msg);
    return new Response(JSON.stringify({ ok: false, error: 'Sunucu hatası' }), {
      status: 500, headers: resHeaders,
    });
  }
});
