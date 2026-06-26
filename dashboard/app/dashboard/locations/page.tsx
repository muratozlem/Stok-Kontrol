export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import { MapPin, Warehouse, Users, Package } from 'lucide-react'

export default async function LocationsPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const superAdmin = isSuperAdmin(caller)

  const locationId = caller.locationId ?? ''

  const [locRes, whRes, profRes, invRes] = await Promise.all([
    superAdmin
      ? supabase.from('locations').select('*').order('name')
      : supabase.from('locations').select('*').eq('id', locationId).order('name'),

    superAdmin
      ? supabase.from('warehouses').select('id, location_id')
      : supabase.from('warehouses').select('id, location_id').eq('location_id', locationId),

    superAdmin
      ? supabase.from('profiles').select('id, location_id').not('location_id', 'is', null)
      : supabase.from('profiles').select('id, location_id').eq('location_id', locationId),

    superAdmin
      ? supabase.from('inventory').select('quantity, warehouses!inner(location_id)')
      : supabase
          .from('inventory')
          .select('quantity, warehouses!inner(location_id)')
          .eq('warehouses.location_id', locationId),
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lokasyonlar</h1>
          <p className="text-sm text-slate-500 mt-1">{locations.length} şube / lokasyon</p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="glass p-16 text-center">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz lokasyon eklenmemiş</p>
          <p className="text-xs text-slate-600 mt-1">Mobil uygulamadan lokasyon ekleyebilirsiniz</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((loc: any) => (
            <div key={loc.id} className="glass p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{loc.name}</p>
                  {loc.city && <p className="text-xs text-slate-500">{loc.city}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-1">
                    <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{whByLoc[loc.id] ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Depo</p>
                </div>
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold text-purple-400">{userByLoc[loc.id] ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Personel</p>
                </div>
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-1">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-amber-400">{(stockByLoc[loc.id] ?? 0).toLocaleString('tr-TR')}</p>
                  <p className="text-[10px] text-slate-500">Stok</p>
                </div>
              </div>

              {loc.description && (
                <p className="text-xs text-slate-500 border-t border-white/5 pt-3">{loc.description}</p>
              )}
              <p className="text-[10px] text-slate-700">
                {new Date(loc.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
