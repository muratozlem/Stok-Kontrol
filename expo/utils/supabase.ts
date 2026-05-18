import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isValidJwt = supabaseAnonKey.startsWith('eyJ');
const isValidUrl = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co');

console.log('[Supabase] URL:', isValidUrl ? 'VALID' : 'INVALID', supabaseUrl ? supabaseUrl.substring(0, 40) : 'MISSING');
console.log('[Supabase] Anon key:', isValidJwt ? 'VALID JWT' : 'INVALID FORMAT', supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'MISSING');

if (!isValidJwt && supabaseAnonKey) {
  console.warn('[Supabase] UYARI: Anon key JWT formatında değil! Supabase Dashboard > Settings > API > anon public key kullanın.');
  console.warn('[Supabase] Beklenen format: eyJhbGciOiJIUzI1NiIs... (uzun JWT token)');
  console.warn('[Supabase] Mevcut değer:', supabaseAnonKey.substring(0, 20) + '...');
}

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && isValidUrl && !supabaseUrl.includes('placeholder'));

let _supabase: SupabaseClient;

try {
  _supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (url, options) => {
          try {
            return await fetch(url, options);
          } catch (err) {
            console.log('[Supabase] Network fetch error:', (err as Error).message, 'URL:', String(url).substring(0, 60));
            throw err;
          }
        },
      },
    }
  );
  console.log('[Supabase] Client created, configured:', isSupabaseConfigured);
} catch (e) {
  console.log('[Supabase] Client creation error:', e);
  _supabase = createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', {
    auth: { storage: AsyncStorage, persistSession: false, detectSessionInUrl: false },
  });
}

export const supabase = _supabase;
