import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabase()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'undefined'

  const [loc, war, pro, inv, usr] = await Promise.all([
    supabase.from('locations').select('name'),
    supabase.from('warehouses').select('name'),
    supabase.from('products').select('name'),
    supabase.from('inventory').select('quantity'),
    supabase.from('profiles').select('email'),
  ])

  return NextResponse.json({
    supabase_url: url,
    counts: {
      locations: loc.data?.length ?? 'error',
      warehouses: war.data?.length ?? 'error',
      products: pro.data?.length ?? 'error',
      inventory: inv.data?.length ?? 'error',
      profiles: usr.data?.length ?? 'error',
    },
    locations: loc.data,
    profiles: usr.data,
    errors: {
      loc: loc.error?.message,
      war: war.error?.message,
    }
  })
}
