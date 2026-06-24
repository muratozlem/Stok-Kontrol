import { createServerSupabase } from '@/lib/supabase-server'
import { MapPin, Warehouse, Users, Building2 } from 'lucide-react'

export default async function LocationsPage() {
  const supabase = createServerSupabase()

  const [locationsRes, warehousesRes, profilesRes] = await Promise.all([
    supabase.from('locations').select('id, name, city, description, created_at').order('name'),
    supabase.from('warehouses').select('id, location_id'),
    supabase.from('profiles').select('id, location_id').not('location_id', 'is', null),
  ])

  const locations = locationsRes.data ?? []
  const warehouses = warehousesRes.data ?? []
  const profiles = profilesRes.data ?? []

  const warehousesByLoc: Record<string, number> = {}
  for (const w of warehouses) {
    if (w.location_id) warehousesByLoc[w.location_id] = (warehousesByLoc[w.location_id] ?? 0) + 1
  }

  const usersByLoc: Record<string, number> = {}
  for (const p of profiles) {
    if (p.location_id) usersByLoc[p.location_id] = (usersByLoc[p.location_id] ?? 0) + 1
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lokasyonlar</h1>
          <p className="text-slate-500 text-sm mt-1">{locations.length} şube / lokasyon</p>
        </div>
        <div className="glass px-4 py-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="text-sm text-sky-400 font-medium">{locations.length} toplam</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {locations.map(loc => {
          const wCount = warehousesByLoc[loc.id] ?? 0
          const uCount = usersByLoc[loc.id] ?? 0
          return (
            <div key={loc.id} className="glass p-5 space-y-4 hover:bg-white/10 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-200 truncate">{loc.name}</p>
                  {loc.city && (
                    <p className="text-xs text-slate-500 mt-0.5">{loc.city}</p>
                  )}
                </div>
              </div>

              {loc.description && (
                <p className="text-xs text-slate-500 leading-relaxed border-t border-white/5 pt-3">
                  {loc.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{wCount}</p>
                    <p className="text-[10px] text-slate-500">Depo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-400">{uCount}</p>
                    <p className="text-[10px] text-slate-500">Personel</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-600">
                Oluşturuldu: {new Date(loc.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )
        })}

        {locations.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Lokasyon bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
