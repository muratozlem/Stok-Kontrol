import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_RE = /^[a-zA-Z0-9.!#$&*+/=?^_{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const IP_WINDOW_MINUTES = 10;
const IP_MAX_REQUESTS = 5;

function strictEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.includes('%') || e.length > 254) return null;
  return e;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const resHeaders = { 'Content-Type': 'application/json', ...CORS };

  try {
    const body = await req.json().catch(() => ({}));
    const email = strictEmail(body.email ?? '');

    if (!email) {
      return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
    }

    const ip = getClientIp(req);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const windowStart = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from('password_reset_ip_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('requested_at', windowStart);

    if ((count ?? 0) >= IP_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Çok fazla istek. Lütfen 10 dakika sonra tekrar deneyin.' }),
        { status: 429, headers: resHeaders },
      );
    }

    await adminClient
      .from('password_reset_ip_log')
      .insert({ ip, requested_at: new Date().toISOString() });

    await adminClient
      .from('password_reset_ip_log')
      .delete()
      .lt('requested_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
  } catch (_e) {
    return new Response(JSON.stringify({ ok: true }), { headers: resHeaders });
  }
});
