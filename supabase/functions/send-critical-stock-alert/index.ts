import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function esc(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(info: {
  productName: string; unit: string; totalStock: number; criticalLevel: number; locationName?: string;
}): string {
  const unit = info.unit ? ` ${esc(info.unit)}` : '';
  const locationLine = info.locationName
    ? `<tr><td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Lokasyon</td><td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:14px;">${esc(info.locationName)}</td></tr>`
    : '';
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7fb;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#1A1D2E,#2d3f56);padding:24px;color:#fff;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:4px;">Stok Kontrol</div>
      <div style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;margin-bottom:8px;">Kritik Stok Uyarısı</div>
      <div style="font-size:22px;font-weight:700;">${esc(info.productName)}</div>
    </div>
    <div style="padding:24px;color:#222;">
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Bu ürün kritik stok seviyesinin altına düştü. Lütfen en kısa sürede stok takviyesi yapınız.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${locationLine}
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kalan Stok</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#D32F2F;font-size:18px;">${esc(info.totalStock)}${unit}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kritik Seviye</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:15px;">${esc(info.criticalLevel)}${unit}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#666;font-size:13px;">Tarih</td>
          <td style="padding:12px 0;text-align:right;font-size:14px;color:#444;">${new Date().toLocaleString('tr-TR')}</td>
        </tr>
      </table>
    </div>
    <div style="padding:16px 24px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      Bu bildirim Stok Kontrol uygulaması tarafından otomatik gönderilmiştir. Aynı ürün için 24 saat içinde tekrar bildirim gönderilmez.
    </div>
  </div>
</body>
</html>`.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Yetkilendirme başlığı eksik' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Geçersiz oturum' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, status, location_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.status !== 'approved' || !['super_admin', 'admin', 'chef'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Bu işlem için yetkiniz yok' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { productId, totalStock, locationId: bodyLocationId } = body;

    if (!productId) {
      return new Response(JSON.stringify({ error: 'productId zorunludur' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (typeof totalStock !== 'number') {
      return new Response(JSON.stringify({ error: 'totalStock sayısal bir değer olmalıdır' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabase = adminClient;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, unit, critical_stock_level, location_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Ürün bulunamadı' }), {
        status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Depo bazlı: body'den gelen locationId (deponun lokasyonu) önceliklidir,
    // fallback olarak ürünün kendi lokasyonu kullanılır.
    const effectiveLocationId: string | null = (bodyLocationId as string | null | undefined) ?? product.location_id ?? null;

    if (callerProfile.role !== 'super_admin') {
      if (effectiveLocationId !== callerProfile.location_id) {
        return new Response(JSON.stringify({ error: 'Bu ürün için yetkiniz yok' }), {
          status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
    }

    let locationName: string | undefined;
    if (effectiveLocationId) {
      const { data: locRow } = await supabase
        .from('locations')
        .select('name')
        .eq('id', effectiveLocationId)
        .maybeSingle();
      locationName = (locRow as { name?: string } | null)?.name;
    }

    let profileQuery = supabase
      .from('profiles')
      .select('email')
      .eq('status', 'approved');

    if (effectiveLocationId) {
      profileQuery = profileQuery.or(`role.eq.super_admin,and(role.eq.admin,location_id.eq.${effectiveLocationId})`);
    } else {
      profileQuery = profileQuery.in('role', ['super_admin', 'admin']);
    }

    const { data: adminProfiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error('[send-critical-stock-alert] Profil sorgu hatası:', profilesError.message);
      return new Response(JSON.stringify({ error: profilesError.message }), { status: 500, headers: getCorsHeaders(req) });
    }

    const recipients: string[] = (adminProfiles ?? [])
      .map((p: { email: string }) => p.email)
      .filter(Boolean);

    if (recipients.length === 0) {
      console.log('[send-critical-stock-alert] Alıcı yok | lokasyon:', effectiveLocationId ?? '(yok)');
      return new Response(JSON.stringify({ ok: true, recipientCount: 0, message: 'Alıcı bulunamadı' }), { headers: getCorsHeaders(req) });
    }

    const htmlContent = buildEmailHtml({
      productName: product.name,
      unit: product.unit ?? '',
      totalStock,
      criticalLevel: product.critical_stock_level ?? 0,
      locationName,
    });

    const locationLabel = locationName ? ` [${esc(locationName)}]` : '';
    const emailPayload = {
      from: 'Stok Kontrol <kritik@stokkontrol.tr>',
      to: recipients,
      subject: `⚠️ Kritik Stok${locationLabel}: ${product.name}`,
      html: htmlContent,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      console.error('[send-critical-stock-alert] Resend hatası:', resendRes.status, JSON.stringify(resendData));
      return new Response(JSON.stringify({ error: 'Email gönderilemedi', details: resendData }), { status: 500, headers: getCorsHeaders(req) });
    }

    console.log(
      '[send-critical-stock-alert] Mail ->', recipients.length, 'alıcı:',
      recipients.join(', '), '| lokasyon:', locationName ?? '(yok)',
    );

    return new Response(JSON.stringify({
      ok: true,
      id: (resendData as { id?: string }).id,
      recipientCount: recipients.length,
    }), { headers: getCorsHeaders(req) });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[send-critical-stock-alert] Hata:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: getCorsHeaders(req) });
  }
});
