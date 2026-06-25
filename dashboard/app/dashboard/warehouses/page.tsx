export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { Warehouse, MapPin, Package } from 'lucide-react'

export default async function WarehousesPage() {
  const supabase = createServerSupabase()

  const [whRes, locRes, invRes] = await Promise.all([
    supabase.from('warehouses').select('*').order('name'),
    supabase.from('locations').select('id, name'),
    supabase.from('inventory').select('warehouse_id, quantity'),
  ])

  const warehouses = whRes.data ?? []
  const locations = locRes.data ?? []
  const inventory = invRes.data ?? []

  const locMap: Record<string, string> = {}
  for (const l of locations) locMap[l.id] = l.name

  const stockByWh: Record<string, number> = {}
  for (const inv of inventory) {
    if (inv.warehouse_id) stockByWh[inv.warehouse_id] = (stockByWh[inv.warehouse_id] ?? 0) + (inv.quantity ?? 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Depolar</h1>
        <p className="text-sm text-slate-500 mt-1">{warehouses.length} depo</p>
      </div>

      {warehouses.length === 0 ? (
        <div className="glass p-16 text-center">
          <Warehouse className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz depo eklenmemiş</p>
          <p className="text-xs text-slate-600 mt-1">Mobil uygulamadan depo ekleyebilirsiniz</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map((wh: any) => (
            <div key={wh.id} className="glass p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{wh.name}</p>
                  {wh.location_id && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <p className="text-xs text-slate-500">{locMap[wh.location_id] ?? 'Bilinmiyor'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">Toplam Stok:</span>
                <span className="text-sm font-bold text-amber-400">{(stockByWh[wh.id] ?? 0).toLocaleString('tr-TR')}</span>
              </div>

              {wh.description && (
                <p className="text-xs text-slate-500">{wh.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
