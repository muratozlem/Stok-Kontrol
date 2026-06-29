export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const superAdmin = isSuperAdmin(caller)
  const locationId = caller.locationId ?? ''

  const [{ data: invRows }, { data: locs }, { data: whs }] = await Promise.all([
    superAdmin
      ? supabase
          .from('inventory')
          .select('quantity, products(id, name, unit, critical_stock_level), warehouses(id, name, location_id, locations(id, name))')
      : supabase
          .from('inventory')
          .select('quantity, products(id, name, unit, critical_stock_level), warehouses(id, name, location_id, locations(id, name))')
          .eq('warehouses.location_id', locationId),

    superAdmin
      ? supabase.from('locations').select('id, name').order('name')
      : supabase.from('locations').select('id, name').eq('id', locationId).order('name'),

    superAdmin
      ? supabase.from('warehouses').select('id, name, location_id').order('name')
      : supabase.from('warehouses').select('id, name, location_id').eq('location_id', locationId).order('name'),
  ])

  return (
    <ReportsClient
      inventoryRows={(invRows ?? []) as any[]}
      locations={locs ?? []}
      warehouses={whs ?? []}
    />
  )
}
