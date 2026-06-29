export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import OverviewClient from './OverviewClient'

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const superAdmin = isSuperAdmin(caller)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const locationId = caller.locationId ?? ''

  const [txnRes, invRes, locRes, whRes, prodRes, pendingRes] = await Promise.all([
    superAdmin
      ? supabase
          .from('transactions')
          .select('id, type, quantity, created_at, products!inner(id, name), warehouses!inner(id, name, locations!inner(id, name))')
          .gte('created_at', ninetyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(2000)
      : supabase
          .from('transactions')
          .select('id, type, quantity, created_at, products!inner(id, name), warehouses!inner(id, name, locations!inner(id, name))')
          .eq('warehouses.location_id', locationId)
          .gte('created_at', ninetyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(2000),

    superAdmin
      ? supabase
          .from('inventory')
          .select('quantity, products!inner(id, name, unit, critical_stock_level), warehouses!inner(id, name, locations!inner(id, name))')
      : supabase
          .from('inventory')
          .select('quantity, products!inner(id, name, unit, critical_stock_level), warehouses!inner(id, name, locations!inner(id, name))')
          .eq('warehouses.location_id', locationId),

    superAdmin
      ? supabase.from('locations').select('id, name').order('name')
      : supabase.from('locations').select('id, name').eq('id', locationId).order('name'),

    superAdmin
      ? supabase.from('warehouses').select('id, name, location_id').order('name')
      : supabase.from('warehouses').select('id, name, location_id').eq('location_id', locationId).order('name'),

    superAdmin
      ? supabase.from('products').select('id, name').order('name')
      : Promise.resolve({ data: null }),

    superAdmin
      ? supabase.from('profiles').select('id').eq('status', 'pending').neq('role', 'super_admin')
      : supabase.from('profiles').select('id').eq('status', 'pending').eq('location_id', locationId).neq('role', 'super_admin'),
  ])

  // Non-admin: derive product list from their location's inventory (only products
  // that actually exist in their warehouses), instead of querying the global
  // products table (which has no location_id column).
  const invData = (invRes.data ?? []) as any[]
  const products: { id: string; name: string }[] = superAdmin
    ? (prodRes.data ?? [])
    : Array.from(
        new Map(
          invData
            .filter((i: any) => i.products?.id)
            .map((i: any) => [i.products.id, { id: i.products.id, name: i.products.name }])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name, 'tr'))

  return (
    <OverviewClient
      transactions={(txnRes.data ?? []) as any[]}
      inventory={invData}
      locations={locRes.data ?? []}
      warehouses={whRes.data ?? []}
      products={products}
      pendingUsers={pendingRes.data?.length ?? 0}
    />
  )
}
