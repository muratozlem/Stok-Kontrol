export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import OverviewClient from './OverviewClient'

export default async function DashboardPage() {
  const supabase = createServerSupabase()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [txnRes, invRes, locRes, whRes, prodRes, pendingRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, quantity, created_at, products!inner(id, name), warehouses!inner(id, name, locations!inner(id, name))')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('inventory')
      .select('quantity, products!inner(id, name, unit, critical_stock_level), warehouses!inner(id, name, locations!inner(id, name))'),
    supabase.from('locations').select('id, name').order('name'),
    supabase.from('warehouses').select('id, name, location_id').order('name'),
    supabase.from('products').select('id, name').order('name'),
    supabase.from('profiles').select('id').eq('status', 'pending').neq('role', 'super_admin'),
  ])

  return (
    <OverviewClient
      transactions={(txnRes.data ?? []) as any[]}
      inventory={(invRes.data ?? []) as any[]}
      locations={locRes.data ?? []}
      warehouses={whRes.data ?? []}
      products={prodRes.data ?? []}
      pendingUsers={pendingRes.data?.length ?? 0}
    />
  )
}
