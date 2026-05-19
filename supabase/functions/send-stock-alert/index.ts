import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ALERT_TO_EMAIL = 'murat.krgzz35@gmail.com';

interface AlertPayload {
  productName: string;
  unit: string;
  totalStock: number;
  criticalLevel: number;
}

function buildEmailHtml(p: AlertPayload): string {
  const unit = p.unit ? ` ${p.unit}` : '';
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7fb;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#1A1D2E,#2d3f56);padding:24px;color:#fff;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:4px;">Stok Kontrol</div>
      <div style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.9;margin-bottom:8px;">Kritik Stok Uyarısı</div>
      <div style="font-size:22px;font-weight:700;">${p.productName}</div>
    </div>
    <div style="padding:24px;color:#222;">
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Bu ürün kritik stok seviyesinin altına düştü. Lütfen en kısa sürede stok takviyesi yapınız.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kalan Stok</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#D32F2F;font-size:18px;">${p.totalStock}${unit}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kritik Seviye</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:15px;">${p.criticalLevel}${unit}</td>
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
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY secret tanımlı değil' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: AlertPayload = await req.json();
    const { productName, unit, totalStock, criticalLevel } = body;

    if (!productName) {
      return new Response(JSON.stringify({ error: 'productName zorunlu' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subject = `Kritik Stok: ${productName} (${totalStock}${unit ? ' ' + unit : ''} kaldı)`;
    const html = buildEmailHtml({ productName, unit: unit ?? '', totalStock, criticalLevel });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stok Kontrol <onboarding@resend.dev>',
        to: [ALERT_TO_EMAIL],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[send-stock-alert] Resend hatası:', res.status, JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Resend gönderim hatası', detail: data }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    console.log('[send-stock-alert] Mail gönderildi ->', ALERT_TO_EMAIL, 'id:', data.id);
    return new Response(JSON.stringify({ ok: true, id: data.id, sentTo: ALERT_TO_EMAIL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    console.error('[send-stock-alert] Exception:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
