export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { Package, AlertTriangle, TrendingDown } from 'lucide-react'

export default async function ProductsPage() {
  const supabase = createServerSupabase()
  const { data: inventory } = await supabase
    .from('inventory')
    .select('quantity, products!inner(id, name, barcode, critical_stock_level, unit), warehouses!inner(name, locations!inner(name))')
    .order('quantity')

  const items = inventory ?? []
  const critical = items.filter(r => (r.quantity ?? 0) <= (r.products?.critical_stock_level ?? 0) && (r.quantity ?? 0) > 0)
  const empty = items.filter(r => (r.quantity ?? 0) === 0)
  const normal = items.filter(r => (r.quantity ?? 0) > (r.products?.critical_stock_level ?? 0))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ürünler & Stok</h1>
        <p className="text-slate-500 text-sm mt-1">{items.length} envanter satırı</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="glass px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-slate-300">{normal.length} Normal</span>
        </div>
        <div className="glass px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm text-slate-300">{critical.length} Kritik</span>
        </div>
        <div className="glass px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-sm text-slate-300">{empty.length} Tükendi</span>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Ürün</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">SKU</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Depo</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Şube</th>
              <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Miktar</th>
              <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Min.</th>
              <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((r, i) => {
              const qty = r.quantity ?? 0
              const min = r.products?.critical_stock_level ?? 0
              const isEmpty = qty === 0
              const isCritical = !isEmpty && qty <= min
              return (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isEmpty ? 'bg-red-400' : isCritical ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="text-slate-200 font-medium">{r.products?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.products?.barcode ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{r.warehouses?.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.warehouses?.locations?.name}</td>
                  <td className={`px-4 py-3 text-right font-bold font-mono ${isEmpty ? 'text-red-400' : isCritical ? 'text-amber-400' : 'text-emerald-400'}`}>{qty}</td>
                  <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">{min}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isEmpty ? 'bg-red-500/20 text-red-400' : isCritical ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isEmpty ? 'Tükendi' : isCritical ? 'Kritik' : 'Normal'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Envanter verisi bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
