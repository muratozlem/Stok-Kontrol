import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ALERT_TO_EMAIL = 'murat.krgzz35@gmail.com';

export interface CriticalProductInfo {
  productId: string;
  productName: string;
  unit: string;
  totalStock: number;
  criticalLevel: number;
}

async function getLastAlertSentAt(productId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('last_sent_at')
      .eq('product_id', productId)
      .maybeSingle();
    if (error) {
      console.log('[CriticalAlert] stock_alerts sorgu hatası:', error.message);
      return null;
    }
    return data?.last_sent_at ?? null;
  } catch (e) {
    console.log('[CriticalAlert] getLastAlertSentAt error:', (e as Error).message);
    return null;
  }
}

async function upsertAlertTimestamp(productId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_alerts')
      .upsert(
        { product_id: productId, last_sent_at: new Date().toISOString() },
        { onConflict: 'product_id' }
      );
    if (error) console.log('[CriticalAlert] stock_alerts upsert hatası:', error.message);
  } catch (e) {
    console.log('[CriticalAlert] upsertAlertTimestamp error:', (e as Error).message);
  }
}

function buildEmailHtml(info: CriticalProductInfo): string {
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

async function sendViaResend(info: CriticalProductInfo): Promise<boolean> {
  const apiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  if (!apiKey) {
    console.log('[CriticalAlert] EXPO_PUBLIC_RESEND_API_KEY tanımlı değil');
    return false;
  }

  const unit = info.unit ? ` ${info.unit}` : '';
  const subject = `Kritik Stok: ${info.productName} (${info.totalStock}${unit} kaldı)`;
  const html = buildEmailHtml(info);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stok Kontrol <onboarding@resend.dev>',
        to: [ALERT_TO_EMAIL],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log('[CriticalAlert] Resend hatası:', res.status, JSON.stringify(data));
      return false;
    }

    console.log('[CriticalAlert] Mail gönderildi → ' + ALERT_TO_EMAIL + ' | id:', (data as { id?: string }).id ?? '-');
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Resend network error:', (e as Error).message);
    return false;
  }
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (info.totalStock > info.criticalLevel) return;

  console.log('[CriticalAlert] Kritik stok:', info.productName, '| Stok:', info.totalStock, '| Kritik:', info.criticalLevel);

  const lastSent = await getLastAlertSentAt(info.productId);
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < ALERT_COOLDOWN_MS) {
      const remaining = Math.ceil((ALERT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      console.log('[CriticalAlert] 24 saat dolmadı, atlanıyor. Kalan:', remaining, 'saat');
      return;
    }
  }

  const ok = await sendViaResend(info);
  if (ok) await upsertAlertTimestamp(info.productId);
}

export async function forceSendCriticalStockAlert(
  info: CriticalProductInfo
): Promise<{ ok: boolean; reason?: string; sentTo?: string }> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'Supabase yapılandırılmamış' };

  const ok = await sendViaResend(info);
  if (ok) {
    await upsertAlertTimestamp(info.productId);
    return { ok: true, sentTo: ALERT_TO_EMAIL };
  }
  return { ok: false, reason: 'Resend gönderim hatası — loglara bakın' };
}
