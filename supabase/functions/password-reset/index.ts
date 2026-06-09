import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function hashPassword(password: string): string {
  const input = password + '_stokapp_salt_2024';
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  let result = '';
  const seed = Math.abs(hash);
  let h1 = seed, h2 = seed ^ 0x6b8b4567, h3 = seed ^ 0x327b23c6, h4 = seed ^ 0x643c9869;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = (h1 ^ c) * 0x01000193;
    h2 = (h2 ^ c) * 0x01000193;
    h3 = (h3 ^ c) * 0x01000193;
    h4 = (h4 ^ c) * 0x01000193;
  }
  for (const p of [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]) {
    result += p.toString(16).padStart(8, '0');
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const resHeaders = { 'Content-Type': 'application/json', ...CORS };

  try {
    const { action, email, code, newPassword } = await req.json();
    const cleanEmail = (email ?? '').toLowerCase().trim();

    if (action === 'request') {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=id`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const profiles = await profileRes.json();
      if (!profiles?.length) {
        return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
      }

      await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ email: cleanEmail, code: resetCode, expires_at: expiresAt }),
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Stok Kontrol <onboarding@resend.dev>',
          to: [cleanEmail],
          subject: 'Şifre Sıfırlama Kodu — Stok Kontrol',
          html: `
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:#1A1D2E;border-radius:16px;padding:12px 20px;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:0.5px;">Stok Kontrol</span>
    </div>
  </div>
  <h2 style="color:#1A1D2E;font-size:22px;font-weight:700;margin:0 0 8px 0;">Şifre Sıfırlama</h2>
  <p style="color:#666;font-size:14px;margin:0 0 28px 0;">Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu uygulamaya girin. Kod <strong>15 dakika</strong> geçerlidir.</p>
  <div style="background:#F6F8FB;border-radius:14px;padding:24px;text-align:center;border:2px solid #E8ECF0;margin-bottom:28px;">
    <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#1A1D2E;font-family:monospace;">${resetCode}</span>
  </div>
  <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
</div>
          `,
        }),
      });

      return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
    }

    if (action === 'confirm') {
      const tokenRes = await fetch(
        `${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(cleanEmail)}&select=*`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const tokens = await tokenRes.json();

      if (!tokens?.length) {
        return new Response(JSON.stringify({ ok: false, error: 'Geçersiz veya süresi dolmuş kod' }), { headers: resHeaders, status: 400 });
      }
      const token = tokens[0];
      if (token.code !== code) {
        return new Response(JSON.stringify({ ok: false, error: 'Hatalı kod. Lütfen tekrar deneyin.' }), { headers: resHeaders, status: 400 });
      }
      if (new Date(token.expires_at) < new Date()) {
        return new Response(JSON.stringify({ ok: false, error: 'Kodun süresi dolmuş. Lütfen yeni kod isteyin.' }), { headers: resHeaders, status: 400 });
      }

      const passwordHash = hashPassword(newPassword);
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password_hash: passwordHash }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });

      return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Geçersiz işlem' }), { headers: resHeaders, status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { headers: resHeaders, status: 500 });
  }
});
