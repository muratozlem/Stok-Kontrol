import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface CriticalProductInfo {
  productId: string;
  productName: string;
  unit: string;
  totalStock: number;
  criticalLevel: number;
}

async function getAdminEmails(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .eq('status', 'approved');

    if (error) {
      console.log('[CriticalAlert] Admin email fetch error:', error.message);
      return [];
    }
    return (data ?? [])
      .map((r) => String(r.email ?? ''))
      .filter((e) => e.length > 0);
  } catch (e) {
    console.log('[CriticalAlert] Admin email error:', (e as Error).message);
    return [];
  }
}

async function getLastAlertSentAt(productId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('last_sent_at')
      .eq('product_id', productId)
      .maybeSingle();
    if (error) {
      console.log('[CriticalAlert] last_sent_at fetch error:', error.message);
      return null;
    }
    return data?.last_sent_at ?? null;
  } catch (e) {
    console.log('[CriticalAlert] last_sent_at error:', (e as Error).message);
    return null;
  }
}

async function upsertAlertTimestamp(productId: string): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('stock_alerts')
      .upsert(
        { product_id: productId, last_sent_at: nowIso },
        { onConflict: 'product_id' }
      );
    if (error) console.log('[CriticalAlert] upsert error:', error.message);
  } catch (e) {
    console.log('[CriticalAlert] upsert error:', (e as Error).message);
  }
}

async function sendViaResendDirect(to: string[], subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  if (!apiKey) {
    console.log('[CriticalAlert] EXPO_PUBLIC_RESEND_API_KEY tanimli degil');
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
        from: 'Stok Uyari <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.log('[CriticalAlert] Resend hata:', res.status, text.substring(0, 300));
      return false;
    }
    console.log('[CriticalAlert] E-posta gonderildi (direct):', to.join(','), '-', subject);
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Resend network error:', (e as Error).message);
    return false;
  }
}

async function sendViaEdgeFunction(to: string[], subject: string, html: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase.functions.invoke('send-critical-alert', {
      body: { to, subject, html },
    });
    if (error) {
      console.log('[CriticalAlert] Edge function error:', error.message);
      return false;
    }
    if (!data?.ok) {
      console.log('[CriticalAlert] Edge function returned not ok:', JSON.stringify(data).substring(0, 300));
      return false;
    }
    console.log('[CriticalAlert] E-posta gonderildi (edge):', to.join(','), '-', subject);
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Edge function invoke error:', (e as Error).message);
    return false;
  }
}

async function sendResendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  const direct = await sendViaResendDirect(to, subject, html);
  if (direct) return true;
  console.log('[CriticalAlert] Direct gonderim basarisiz, edge function deneniyor...');
  return await sendViaEdgeFunction(to, subject, html);
}

function buildEmailHtml(info: CriticalProductInfo): string {
  const unit = info.unit ? ` ${info.unit}` : '';
  return `
<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7fb;padding:24px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#F5A05A,#C4610D);padding:24px;color:#fff;">
      <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Kritik Stok Uyarisi</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;">${info.productName}</div>
    </div>
    <div style="padding:24px;color:#222;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Bu urun kritik stok seviyesinin altina dustu. Lutfen en kisa surede stok takviyesi yapiniz.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kalan Stok</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#D32F2F;font-size:16px;">
            ${info.totalStock}${unit}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;">Kritik Seviye</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:15px;">
            ${info.criticalLevel}${unit}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#666;font-size:13px;">Tarih</td>
          <td style="padding:10px 0;text-align:right;font-size:14px;color:#444;">
            ${new Date().toLocaleString('tr-TR')}
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:12px;">
      Bu bildirim Torbali Gf Stok Kontrol uygulamasi tarafindan otomatik olarak gonderilmistir.
      Ayni urun icin 24 saat icinde tekrar e-posta gonderilmez.
    </div>
  </div>
</body>
</html>`.trim();
}

export async function forceSendCriticalStockAlert(info: CriticalProductInfo): Promise<{ ok: boolean; reason?: string; sentTo?: string[] }> {
  try {
    if (!isSupabaseConfigured) return { ok: false, reason: 'Supabase yapilandirilmamis' };

    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) return { ok: false, reason: 'Onayli admin e-postasi bulunamadi' };

    const subject = `[TEST] Kritik Stok: ${info.productName} (${info.totalStock}${info.unit ? ' ' + info.unit : ''} kaldi)`;
    const html = buildEmailHtml(info);
    const ok = await sendResendEmail(adminEmails, subject, html);
    if (ok) {
      await upsertAlertTimestamp(info.productId);
      return { ok: true, sentTo: adminEmails };
    }
    return { ok: false, reason: 'Resend gonderim hatasi (loglara bakin)' };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  try {
    if (!isSupabaseConfigured) return;
    if (info.totalStock > info.criticalLevel) {
      console.log('[CriticalAlert] Stok kritik degil, atlaniyor:', info.productName);
      return;
    }

    const lastSent = await getLastAlertSentAt(info.productId);
    if (lastSent) {
      const elapsed = Date.now() - new Date(lastSent).getTime();
      if (elapsed < ALERT_COOLDOWN_MS) {
        const remainingHours = Math.ceil((ALERT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        console.log(
          '[CriticalAlert] 24 saat dolmadi, atlaniyor:',
          info.productName,
          'kalan saat:',
          remainingHours
        );
        return;
      }
    }

    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.log('[CriticalAlert] Admin e-postasi bulunamadi');
      return;
    }

    const subject = `Kritik Stok: ${info.productName} (${info.totalStock}${info.unit ? ' ' + info.unit : ''} kaldi)`;
    const html = buildEmailHtml(info);

    const ok = await sendResendEmail(adminEmails, subject, html);
    if (ok) {
      await upsertAlertTimestamp(info.productId);
    }
  } catch (e) {
    console.log('[CriticalAlert] beklenmeyen hata:', (e as Error).message);
  }
}
