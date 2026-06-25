import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'MISSING'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'MISSING'

  const results: any = {
    env: {
      supabase_url: url,
      anon_key_prefix: anonKey !== 'MISSING' ? anonKey.slice(0, 40) + '...' : 'MISSING',
      service_key_prefix: serviceKey !== 'MISSING' ? serviceKey.slice(0, 40) + '...' : 'MISSING',
    },
    queries: {}
  }

  if (url !== 'MISSING' && serviceKey !== 'MISSING') {
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
    const [loc, inv, prof] = await Promise.all([
      supabase.from('locations').select('id, name'),
      supabase.from('inventory').select('product_id, quantity'),
      supabase.from('profiles').select('email, role'),
    ])
    results.queries = {
      locations: { data: loc.data, error: loc.error?.message },
      inventory: { data: inv.data, error: inv.error?.message },
      profiles: { data: prof.data, error: prof.error?.message },
    }
  }

  return NextResponse.json(results)
}
