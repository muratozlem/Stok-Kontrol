import { supabase, isSupabaseConfigured } from '@/utils/supabase';

interface CriticalProductInfo {
  productId: string;
  productName: string;
  unit: string;
  totalStock: number;
  criticalLevel: number;
}

export async function maybeSendCriticalStockAlert(info: CriticalProductInfo): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (info.totalStock > info.criticalLevel) return;

  try {
    const { error } = await supabase.functions.invoke('send-critical-stock-alert', {
      body: { product_id: info.productId },
    });
    if (error) {
      console.log('[CriticalAlert] Edge function hatası:', error.message);
    } else {
      console.log('[CriticalAlert] Kritik stok uyarısı gönderildi:', info.productName);
    }
  } catch (e) {
    console.log('[CriticalAlert] Beklenmeyen hata:', (e as Error).message);
  }
}

export async function forceSendCriticalStockAlert(info: CriticalProductInfo): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'Supabase yapılandırılmamış' };
  try {
    const { data, error } = await supabase.functions.invoke('send-critical-stock-alert', {
      body: { product_id: info.productId },
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
