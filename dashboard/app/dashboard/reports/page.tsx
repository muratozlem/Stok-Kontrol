export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { FileText, TrendingUp, TrendingDown } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = createServerSupabase()

  const { data: txns } = await supabase
    .from('transactions')
    .select('id, type, quantity, note, created_at, products!inner(name), warehouses!inner(name, locations!inner(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  const transactions = txns ?? []
  const totalIn = transactions.filter(t => t.type === 'IN').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0)
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Raporlar</h1>
        <p className="text-sm text-slate-500 mt-1">Son 100 işlem</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Giriş</p>
            <p className="text-2xl font-bold text-emerald-400">{totalIn.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Çıkış</p>
            <p className="text-2xl font-bold text-red-400">{totalOut.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="glass p-16 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz işlem kaydı yok</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tarih</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tür</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Depo</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Miktar</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Not</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: any) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${t.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {t.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {t.type === 'IN' ? 'Giriş' : 'Çıkış'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.products?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-300">{t.warehouses?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{t.warehouses?.locations?.name ?? ''}</p>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${t.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'IN' ? '+' : '-'}{(t.quantity ?? 0).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
