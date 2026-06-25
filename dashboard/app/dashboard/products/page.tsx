export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { Package, AlertTriangle, Search } from 'lucide-react'

export default async function ProductsPage() {
  const supabase = createServerSupabase()

  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, quantity, product_id, warehouse_id, products!inner(id, name, barcode, unit, critical_stock_level), warehouses!inner(name, locations!inner(name))')
    .order('quantity', { ascending: true })

  const items = inventory ?? []
  const critical = items.filter((r: any) => {
    const min = r.products?.critical_stock_level ?? 0
    return min > 0 && (r.quantity ?? 0) <= min
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ürünler & Stok</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} kayıt{critical.length > 0 && ` • ${critical.length} kritik`}</p>
        </div>
        {critical.length > 0 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">{critical.length} kritik ürün</span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="glass p-16 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz ürün veya stok kaydı yok</p>
          <p className="text-xs text-slate-600 mt-1">Mobil uygulamadan ürün ve stok ekleyebilirsiniz</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Barkod</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Depo / Lokasyon</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Stok</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Min. Stok</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any) => {
                const isCritical = (r.products?.critical_stock_level ?? 0) > 0 && (r.quantity ?? 0) <= (r.products?.critical_stock_level ?? 0)
                return (
                  <tr key={r.id} className={`border-b border-white/5 last:border-0 ${isCritical ? 'bg-red-500/5' : 'hover:bg-white/2'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{r.products?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{r.products?.unit ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.products?.barcode ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300">{r.warehouses?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{r.warehouses?.locations?.name ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-200">{(r.quantity ?? 0).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{r.products?.critical_stock_level ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> Kritik
                        </span>
                      ) : (
                        <span className="inline-block text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Normal</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
