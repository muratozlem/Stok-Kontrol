import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function buildEmailHtml(info: {
  productName: string; unit: string; totalStock: number; criticalLevel: number;
}): string {
  const unit = info.unit ? ` ${info.unit}` : '';
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7fb;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#1A1D2E,#2d3f56);padding:24px;color:#fff;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:4px;">Stok Kontrol</div>
      <div style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;margin-bottom:8px;">Kritik Stok Uyarısı</div>
      <div style="font-size:22px;font-weight:700;">${info.productName}</div>
    </div>
    <div style="padding:24px;color:#222;">
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Bu ürün kritik stok seviyesinin altına düştü. Lütfen en kısa sürede stok takviyesi yapınız.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kalan Stok</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#D32F2F;font-size:18px;">${info.totalStock}${unit}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kritik Seviye</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:15px;">${info.criticalLevel}${unit}</td>
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
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { productId, productName, unit, totalStock, criticalLevel } = body;

    if (!productId || !productName) {
      return new Response(JSON.stringify({ error: 'productId ve productName zorunludur' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .in('role', ['super_admin', 'admin'])
      .eq('status', 'approved');

    if (profilesError) {
      console.error('[send-critical-stock-alert] Profil sorgu hatası:', profilesError.message);
      return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
    }

    const recipients: string[] = (adminProfiles ?? [])
      .map((p: { email: string }) => p.email)
      .filter(Boolean);

    if (recipients.length === 0) {
      console.log('[send-critical-stock-alert] Alıcı bulunamadı (super_admin/admin yok)');
      return new Response(JSON.stringify({ ok: true, recipientCount: 0, message: 'Alıcı bulunamadı' }));
    }

    const htmlContent = buildEmailHtml({
      productName, unit: unit ?? '', totalStock: totalStock ?? 0, criticalLevel: criticalLevel ?? 0,
    });

    const emailPayload = {
      from: 'Stok Kontrol <onboarding@resend.dev>',
      to: recipients,
      subject: `⚠️ Kritik Stok: ${productName}`,
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
      return new Response(JSON.stringify({ error: 'Email gönderilemedi', details: resendData }), { status: 500 });
    }

    console.log('[send-critical-stock-alert] Mail gönderildi ->', recipients.length, 'alıcı:', recipients.join(', '));
    return new Response(JSON.stringify({
      ok: true,
      id: (resendData as { id?: string }).id,
      recipientCount: recipients.length,
    }));

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[send-critical-stock-alert] Hata:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
