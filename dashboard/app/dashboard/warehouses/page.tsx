import { createServerSupabase } from '@/lib/supabase-server'
import { Warehouse, MapPin } from 'lucide-react'

export default async function WarehousesPage() {
  const supabase = createServerSupabase()
  const [warehousesRes, invRes] = await Promise.all([
    supabase.from('warehouses').select('id, name, locations!inner(name)').order('name'),
    supabase.from('inventory').select('warehouse_id, quantity'),
  ])
  const warehouses = warehousesRes.data ?? []
  const inv = invRes.data ?? []
  const stockByWarehouse: Record<string, number> = {}
  for (const r of inv) {
    stockByWarehouse[r.warehouse_id] = (stockByWarehouse[r.warehouse_id] ?? 0) + (r.quantity ?? 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Depolar</h1>
        <p className="text-slate-500 text-sm mt-1">{warehouses.length} depo</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map(w => (
          <div key={w.id} className="glass p-5 space-y-3 hover:bg-white/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Warehouse className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 truncate">{w.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {w.locations?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-slate-500">Toplam stok</span>
              <span className="text-lg font-bold text-sky-400">{(stockByWarehouse[w.id] ?? 0).toLocaleString('tr-TR')}</span>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Depo bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
