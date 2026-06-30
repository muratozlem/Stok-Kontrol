import { createClient } from 'npm:@supabase/supabase-js@2';

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: 'Bu işlem yalnızca süper admin tarafından yapılabilir' }), { status: 403, headers: resHeaders });
    }

    // Sırayla sil: önce bağımlı tablolar
    const tables = ['transactions', 'inventory', 'products', 'warehouses'];
    const errors: string[] = [];

    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error(`[clear-all-data] ${table} silme hatası:`, error.message);
        errors.push(`${table}: ${error.message}`);
      } else {
        console.log(`[clear-all-data] ${table} silindi`);
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ ok: false, errors }), { status: 500, headers: resHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[clear-all-data] Hata:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: resHeaders });
  }
});
