import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

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

async function callEdgeFunction(info: CriticalProductInfo): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[CriticalAlert] Supabase URL veya Anon Key eksik');
    return false;
  }

  const url = `${SUPABASE_URL}/functions/v1/send-stock-alert`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        productName: info.productName,
        unit: info.unit,
        totalStock: info.totalStock,
        criticalLevel: info.criticalLevel,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log('[CriticalAlert] Edge Function hatası:', res.status, JSON.stringify(data));
      return false;
    }

    console.log('[CriticalAlert] Mail gönderildi ->', data.sentTo ?? 'bilinmiyor');
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Edge Function network error:', (e as Error).message);
    return false;
  }
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (info.totalStock > info.criticalLevel) return;

  console.log('[CriticalAlert] Kritik stok:', info.productName, '| Stok:', info.totalStock, '| Kritik seviye:', info.criticalLevel);

  const lastSent = await getLastAlertSentAt(info.productId);
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < ALERT_COOLDOWN_MS) {
      const remaining = Math.ceil((ALERT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      console.log('[CriticalAlert] 24 saat dolmadı, atlanıyor. Kalan:', remaining, 'saat');
      return;
    }
  }

  const ok = await callEdgeFunction(info);
  if (ok) await upsertAlertTimestamp(info.productId);
}

export async function forceSendCriticalStockAlert(
  info: CriticalProductInfo
): Promise<{ ok: boolean; reason?: string; sentTo?: string }> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'Supabase yapılandırılmamış' };

  const ok = await callEdgeFunction(info);
  if (ok) {
    await upsertAlertTimestamp(info.productId);
    return { ok: true, sentTo: 'murat.krgzz35@gmail.com' };
  }
  return { ok: false, reason: 'Edge Function hatası — loglara bakın' };
}
