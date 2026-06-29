'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownCircle, ArrowUpCircle, Plus, Loader2, X, ClipboardList } from 'lucide-react'
import { createTransaction } from '../actions'

interface Product { id: string; name: string; unit?: string }
interface Warehouse { id: string; name: string; location_id?: string | null }
interface Txn {
  id: string; type: string; quantity: number; note?: string; created_at: string
  products: { name: string; unit?: string } | null
  warehouses: { name: string; locations?: { name: string } | null } | null
}
interface Props {
  products: Product[]
  warehouses: Warehouse[]
  transactions: Txn[]
  canCreate: boolean
}

export default function TransactionsClient({ products, warehouses, transactions, canCreate }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')

  const visible = filter === 'ALL' ? transactions : transactions.filter(t => t.type === filter)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('type', txType)
    startTransition(async () => {
      try {
        await createTransaction(fd)
        setShowForm(false);
        (e.target as HTMLFormElement).reset()
        router.refresh()
      } catch (err: any) { setError(err.message) }
    })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Stok İşlemleri</h1>
          <p className="text-sm text-slate-500 mt-1">{transactions.length} kayıt</p>
        </div>
        {canCreate && (
          <button onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium px-4 py-2 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Yeni İşlem
          </button>
        )}
      </div>

      {/* Quick-entry form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="glass w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Stok İşlemi Kaydet</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTxType('IN')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${txType === 'IN' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                <ArrowDownCircle className="w-4 h-4" /> Stok Girişi
              </button>
              <button type="button" onClick={() => setTxType('OUT')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${txType === 'OUT' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                <ArrowUpCircle className="w-4 h-4" /> Stok Çıkışı
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Ürün *</label>
                <select name="product_id" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors">
                  <option value="">Seçin…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit ?? 'adet'})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Depo *</label>
                <select name="warehouse_id" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors">
                  <option value="">Seçin…</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Miktar *</label>
                <input name="quantity" type="number" min="1" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Not</label>
                <input name="note" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="İsteğe bağlı not" />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all">İptal</button>
                <button type="submit" disabled={isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${txType === 'IN' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-red-700 hover:bg-red-600'}`}>
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {txType === 'IN' ? 'Giriş Kaydet' : 'Çıkış Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'IN', 'OUT'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === f
              ? f === 'IN' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : f === 'OUT' ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
            {f === 'ALL' ? 'Tümü' : f === 'IN' ? '▼ Giriş' : '▲ Çıkış'}
          </button>
        ))}
        <span className="text-xs text-slate-600 ml-auto">{visible.length} kayıt</span>
      </div>

      {visible.length === 0 ? (
        <div className="glass p-16 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz işlem kaydı yok</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tip</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Depo</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Miktar</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Not</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(t => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    {t.type === 'IN' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 font-medium">
                        <ArrowDownCircle className="w-3 h-3" /> Giriş
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2.5 py-1 font-medium">
                        <ArrowUpCircle className="w-3 h-3" /> Çıkış
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{t.products?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{t.products?.unit ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-slate-300">{t.warehouses?.name ?? '—'}</p>
                    {t.warehouses?.locations?.name && <p className="text-xs text-slate-500">{t.warehouses.locations.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-base ${t.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'IN' ? '+' : '-'}{t.quantity.toLocaleString('tr-TR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[180px] truncate">{t.note || '—'}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('tr-TR')}<br />
                    <span className="text-slate-700">{new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
