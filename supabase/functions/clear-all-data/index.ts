import { createClient } from 'npm:@supabase/supabase-js@2';
import postgres from 'npm:postgres';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const resHeaders = { 'Content-Type': 'application/json', ...CORS };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Yetkilendirme başlığı eksik' }), { status: 401, headers: resHeaders });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Geçersiz oturum' }), { status: 401, headers: resHeaders });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status !== 'approved' || profile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Bu işlem yalnızca süper admin tarafından yapılabilir' }), {
        status: 403, headers: resHeaders,
      });
    }

    // TRUNCATE: trigger'ları bypass eder, FK bağımlılıklarını CASCADE ile temizler
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: 'Veritabanı bağlantı bilgisi bulunamadı' }), {
        status: 500, headers: resHeaders,
      });
    }

    const sql = postgres(dbUrl, { max: 1, idle_timeout: 20, connect_timeout: 10 });
    try {
      await sql`TRUNCATE TABLE public.transactions, public.inventory, public.products, public.warehouses RESTART IDENTITY CASCADE`;
      console.log('[clear-all-data] TRUNCATE tamamlandı');
    } finally {
      await sql.end();
    }

    return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[clear-all-data] Hata:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: resHeaders });
  }
});
