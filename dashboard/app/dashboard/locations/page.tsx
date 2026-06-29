export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import LocationsClient from './LocationsClient'

export default async function LocationsPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const sa = isSuperAdmin(caller)
  const locationId = caller.locationId ?? ''

  const [locRes, whRes, profRes, invRes] = await Promise.all([
    sa
      ? supabase.from('locations').select('*').order('name')
      : supabase.from('locations').select('*').eq('id', locationId).order('name'),

    sa
      ? supabase.from('warehouses').select('id, location_id')
      : supabase.from('warehouses').select('id, location_id').eq('location_id', locationId),

    sa
      ? supabase.from('profiles').select('id, location_id').not('location_id', 'is', null)
      : supabase.from('profiles').select('id, location_id').eq('location_id', locationId),

    sa
      ? supabase.from('inventory').select('quantity, warehouses!inner(location_id)')
      : supabase.from('inventory').select('quantity, warehouses!inner(location_id)').eq('warehouses.location_id', locationId),
  ])

  const locations = locRes.data ?? []
  const warehouses = whRes.data ?? []
  const profiles = profRes.data ?? []
  const inventory = invRes.data ?? []

  const whByLoc: Record<string, number> = {}
  for (const w of warehouses) if (w.location_id) whByLoc[w.location_id] = (whByLoc[w.location_id] ?? 0) + 1

  const userByLoc: Record<string, number> = {}
  for (const p of profiles) if (p.location_id) userByLoc[p.location_id] = (userByLoc[p.location_id] ?? 0) + 1

  const stockByLoc: Record<string, number> = {}
  for (const inv of inventory) {
    const lid = (inv.warehouses as any)?.location_id
    if (lid) stockByLoc[lid] = (stockByLoc[lid] ?? 0) + (inv.quantity ?? 0)
  }

  return (
    <LocationsClient
      locations={locations as any[]}
      whByLoc={whByLoc}
      userByLoc={userByLoc}
      stockByLoc={stockByLoc}
      isSuperAdmin={sa}
    />
  )
}
