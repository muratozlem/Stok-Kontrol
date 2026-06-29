export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import WarehousesClient from './WarehousesClient'

export default async function WarehousesPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const sa = isSuperAdmin(caller)
  const locationId = caller.locationId ?? ''
  const isAdmin = ['super_admin', 'admin'].includes(caller.role)

  const [whRes, locRes, invRes] = await Promise.all([
    sa
      ? supabase.from('warehouses').select('*').order('name')
      : supabase.from('warehouses').select('*').eq('location_id', locationId).order('name'),

    sa
      ? supabase.from('locations').select('id, name').order('name')
      : supabase.from('locations').select('id, name').eq('id', locationId),

    sa
      ? supabase.from('inventory').select('warehouse_id, quantity')
      : supabase.from('inventory').select('warehouse_id, quantity, warehouses!inner(location_id)').eq('warehouses.location_id', locationId),
  ])

  const warehouses = whRes.data ?? []
  const locations = locRes.data ?? []
  const inventory = invRes.data ?? []

  const stockByWh: Record<string, number> = {}
  for (const inv of inventory) {
    if (inv.warehouse_id) stockByWh[inv.warehouse_id] = (stockByWh[inv.warehouse_id] ?? 0) + (inv.quantity ?? 0)
  }

  return (
    <WarehousesClient
      warehouses={warehouses as any[]}
      locations={locations}
      stockByWh={stockByWh}
      isSuperAdmin={sa}
      isAdmin={isAdmin}
    />
  )
}
