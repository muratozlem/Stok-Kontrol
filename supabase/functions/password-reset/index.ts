import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_RE = /^[a-zA-Z0-9.!#$&*+/=?^_{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function strictEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.includes('%') || e.length > 254) return null;
  return e;
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

      // Email enumeration önleme: kayıtlı olup olmadığına bakılmaksızın 200 dön
      if (!profiles?.length) {
        return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
      }

      const { data: existing } = await adminClient
        .from('password_reset_tokens')
        .select('created_at')
        .eq('email', email)
        .maybeSingle();

      if (existing?.created_at) {
        const ageSeconds = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
        if (ageSeconds < COOLDOWN_SECONDS) {
          const waitSeconds = Math.ceil(COOLDOWN_SECONDS - ageSeconds);
          return new Response(
            JSON.stringify({ ok: false, error: `Lütfen ${waitSeconds} saniye bekleyin.` }),
            { status: 429, headers: resHeaders },
          );
        }
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await hashCode(resetCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const createdAt = new Date().toISOString();

      // OTP hash olarak saklanıyor — plaintext kod asla DB'ye yazılmıyor
      await adminClient.from('password_reset_tokens').upsert(
        { email, code: hashedCode, expires_at: expiresAt, attempts: 0, created_at: createdAt },
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
  <p style="color:#666;font-size:14px;margin:0 0 28px;">Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu uygulamaya girin. Kod <strong>10 dakika</strong> geçerlidir. <strong>En fazla 5 deneme hakkınız vardır.</strong></p>
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

      if (new Date(token.expires_at) < new Date()) {
        await adminClient.from('password_reset_tokens').delete().eq('email', email);
        return new Response(JSON.stringify({ ok: false, error: 'Kodun süresi dolmuş. Lütfen yeni kod isteyin.' }), {
          status: 400, headers: resHeaders,
        });
      }

      const currentAttempts = token.attempts ?? 0;
      if (currentAttempts >= MAX_ATTEMPTS) {
        await adminClient.from('password_reset_tokens').delete().eq('email', email);
        return new Response(JSON.stringify({ ok: false, error: 'Çok fazla hatalı deneme. Lütfen yeni kod isteyin.' }), {
          status: 429, headers: resHeaders,
        });
      }

      // Gönderilen kodu hash'leyip saklanan hash ile karşılaştır
      const submittedHash = await hashCode(String(code));
      if (token.code !== submittedHash) {
        const newAttempts = currentAttempts + 1;
        const remaining = MAX_ATTEMPTS - newAttempts;

        if (remaining <= 0) {
          await adminClient.from('password_reset_tokens').delete().eq('email', email);
          return new Response(JSON.stringify({ ok: false, error: 'Kod geçersiz. Deneme hakkınız doldu, yeni kod isteyin.' }), {
            status: 429, headers: resHeaders,
          });
        }

        await adminClient.from('password_reset_tokens')
          .update({ attempts: newAttempts })
          .eq('email', email);

        return new Response(JSON.stringify({ ok: false, error: `Hatalı kod. ${remaining} deneme hakkınız kaldı.` }), {
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
        console.error('[password-reset] updateUser:', updateError.message);
        return new Response(JSON.stringify({ ok: false, error: 'Şifre güncellenemedi' }), {
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
