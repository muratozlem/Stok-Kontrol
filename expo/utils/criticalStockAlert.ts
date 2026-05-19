import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface CriticalProductInfo {
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
    if (error) return null;
    return data?.last_sent_at ?? null;
  } catch {
    return null;
  }
}

async function upsertAlertTimestamp(productId: string): Promise<void> {
  try {
    await supabase
      .from('stock_alerts')
      .upsert(
        { product_id: productId, last_sent_at: new Date().toISOString() },
        { onConflict: 'product_id' }
      );
  } catch {
    // silent
  }
}

function buildEmailHtml(info: CriticalProductInfo): string {
  const unit = info.unit ? ` ${info.unit}` : '';
  return `
<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7fb;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#1A1D2E,#2d3f56);padding:24px;color:#fff;">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;margin-bottom:6px;">Stok Kontrol</div>
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Kritik Stok Uyarısı</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;">${info.productName}</div>
    </div>
    <div style="padding:24px;color:#222;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Bu ürün kritik stok seviyesinin altına düştü. Lütfen en kısa sürede stok takviyesi yapınız.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kalan Stok</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#D32F2F;font-size:16px;">${info.totalStock}${unit}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kritik Seviye</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:15px;">${info.criticalLevel}${unit}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#666;font-size:13px;">Tarih</td>
          <td style="padding:10px 0;text-align:right;font-size:14px;color:#444;">${new Date().toLocaleString('tr-TR')}</td>
        </tr>
      </table>
    </div>
    <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:12px;">
      Bu bildirim Stok Kontrol uygulaması tarafından otomatik olarak gönderilmiştir.
      Aynı ürün için 24 saat içinde tekrar e-posta gönderilmez.
    </div>
  </div>
</body>
</html>`.trim();
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  if (!apiKey) {
    console.log('[CriticalAlert] EXPO_PUBLIC_RESEND_API_KEY tanımlı değil');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stok Kontrol <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.log('[CriticalAlert] Resend hata:', res.status, text.substring(0, 200));
      return false;
    }
    console.log('[CriticalAlert] E-posta gönderildi ->', to);
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Resend network error:', (e as Error).message);
    return false;
  }
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (info.totalStock > info.criticalLevel) return;

  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('[CriticalAlert] EXPO_PUBLIC_ADMIN_EMAIL tanımlı değil');
    return;
  }

  const lastSent = await getLastAlertSentAt(info.productId);
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < ALERT_COOLDOWN_MS) {
      const remainingHours = Math.ceil((ALERT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      console.log('[CriticalAlert] 24 saat dolmadı, atlanıyor:', info.productName, 'kalan:', remainingHours, 'saat');
      return;
    }
  }

  const subject = `Kritik Stok: ${info.productName} (${info.totalStock}${info.unit ? ' ' + info.unit : ''} kaldı)`;
  const html = buildEmailHtml(info);
  const ok = await sendViaResend(adminEmail, subject, html);
  if (ok) await upsertAlertTimestamp(info.productId);
}

export async function forceSendCriticalStockAlert(info: CriticalProductInfo): Promise<{ ok: boolean; reason?: string }> {
  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) return { ok: false, reason: 'EXPO_PUBLIC_ADMIN_EMAIL tanımlı değil' };
  const subject = `[TEST] Kritik Stok: ${info.productName}`;
  const html = buildEmailHtml(info);
  const ok = await sendViaResend(adminEmail, subject, html);
  if (ok) {
    await upsertAlertTimestamp(info.productId);
    return { ok: true };
  }
  return { ok: false, reason: 'Resend gönderim hatası (loglara bakın)' };
}
