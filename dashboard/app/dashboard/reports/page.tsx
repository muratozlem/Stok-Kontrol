export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createServerSupabase()

  const [{ data: txns }, { data: locs }, { data: whs }, { data: prods }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, quantity, note, created_at, products!inner(name), warehouses!inner(name, locations!inner(name))')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('locations').select('id, name').order('name'),
    supabase.from('warehouses').select('id, name, location_id').order('name'),
    supabase.from('products').select('id, name').order('name'),
  ])

  return (
    <ReportsClient
      transactions={(txns ?? []) as any[]}
      locations={locs ?? []}
      warehouses={whs ?? []}
      products={prods ?? []}
    />
  )
}
