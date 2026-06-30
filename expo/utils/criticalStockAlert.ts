import { supabase, isSupabaseConfigured } from '@/utils/supabase';

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface CriticalProductInfo {
  productId: string;
  productName: string;
  unit: string;
  totalStock: number;
  criticalLevel: number;
  warehouseId: string;
  locationId?: string | null;
}

async function getLastAlertSentAt(productId: string, locationId: string | null | undefined): Promise<string | null> {
  try {
    let query = supabase
      .from('stock_alerts')
      .select('last_sent_at')
      .eq('product_id', productId);

    if (locationId) {
      query = query.eq('location_id', locationId);
    } else {
      query = query.is('location_id', null);
    }

    const { data, error } = await query.maybeSingle();
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

async function upsertAlertTimestamp(productId: string, locationId: string | null | undefined): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_alerts')
      .upsert(
        {
          product_id: productId,
          location_id: locationId ?? null,
          last_sent_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,location_id' }
      );
    if (error) console.log('[CriticalAlert] stock_alerts upsert hatası:', error.message);
  } catch (e) {
    console.log('[CriticalAlert] upsertAlertTimestamp error:', (e as Error).message);
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-critical-stock-alert`;

async function sendViaEdgeFunction(info: CriticalProductInfo): Promise<boolean> {
  if (!SUPABASE_URL) {
    console.log('[CriticalAlert] SUPABASE_URL tanımlı değil');
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      console.log('[CriticalAlert] Oturum bulunamadı, mail atlaması yapılıyor');
      return false;
    }

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        productId: info.productId,
        totalStock: info.totalStock,
        warehouseId: info.warehouseId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log('[CriticalAlert] Edge Function hatası:', res.status, JSON.stringify(data));
      return false;
    }

    const recipientCount = (data as { recipientCount?: number }).recipientCount ?? 0;
    console.log('[CriticalAlert] Mail gönderildi →', recipientCount, 'alıcı');
    return true;
  } catch (e) {
    console.log('[CriticalAlert] Edge Function network error:', (e as Error).message);
    return false;
  }
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (info.totalStock > info.criticalLevel) return;

  const locationLabel = info.locationId ? ` (lokasyon: ${info.locationId})` : '';
  console.log('[CriticalAlert] Kritik stok:', info.productName, '| Stok:', info.totalStock, '| Kritik:', info.criticalLevel, locationLabel);

  const lastSent = await getLastAlertSentAt(info.productId, info.locationId);
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < ALERT_COOLDOWN_MS) {
      const remaining = Math.ceil((ALERT_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      console.log('[CriticalAlert] 24 saat dolmadı, atlanıyor. Kalan:', remaining, 'saat');
      return;
    }
  }

  const ok = await sendViaEdgeFunction(info);
  if (ok) await upsertAlertTimestamp(info.productId, info.locationId);
}
