'use client'
import React, { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, AlertTriangle, Plus, Pencil, Trash2, X, Loader2,
  ChevronDown, ChevronUp, Image as ImageIcon,
} from 'lucide-react'
import { createProduct, updateProduct, deleteProduct } from '../actions'

const UNITS = ['adet', 'koli', 'paket', 'kg', 'lt', 'g', 'm', 'ton']

interface Product { id: string; name: string; barcode?: string; unit?: string; critical_stock_level?: number; image_url?: string; description?: string }
interface InvRow { product_id: string; warehouse_id: string; quantity: number; warehouses: { id: string; name: string } | null }
interface Props {
  products: Product[]
  inventory: InvRow[]
  canManage: boolean
}

export default function ProductsClient({ products, inventory, canManage }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const stockByProduct = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of inventory) m[r.product_id] = (m[r.product_id] ?? 0) + r.quantity
    return m
  }, [inventory])

  const whsByProduct = useMemo(() => {
    const m: Record<string, { id: string; name: string; qty: number }[]> = {}
    for (const r of inventory) {
      if (!m[r.product_id]) m[r.product_id] = []
      const ex = m[r.product_id].find(x => x.id === r.warehouse_id)
      if (ex) ex.qty += r.quantity
      else if (r.warehouses) m[r.product_id].push({ id: r.warehouse_id, name: r.warehouses.name, qty: r.quantity })
    }
    return m
  }, [inventory])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q))
  }, [products, search])

  const critical = products.filter(p => {
    const min = p.critical_stock_level ?? 0
    return min > 0 && (stockByProduct[p.id] ?? 0) <= min
  })

  function openAdd() { setEditing(null); setMode('add'); setError('') }
  function openEdit(p: Product) { setEditing(p); setMode('edit'); setError('') }
  function closeModal() { setMode(null); setEditing(null); setError('') }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (mode === 'add') await createProduct(fd)
        else if (editing) await updateProduct(editing.id, fd)
        closeModal(); router.refresh()
      } catch (err: any) { setError(err.message) }
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id); setConfirmDel(null)
    try { await deleteProduct(id); router.refresh() }
    catch (err: any) { alert(err.message) }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Ürünler & Stok</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} ürün{critical.length > 0 && ` • ${critical.length} kritik`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün veya barkod ara…"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors w-52" />
          {canManage && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium px-4 py-2 rounded-xl transition-all whitespace-nowrap">
              <Plus className="w-4 h-4" /> Yeni Ürün
            </button>
          )}
        </div>
      </div>

      {critical.length > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400 font-medium">{critical.length} ürün kritik stok seviyesinin altında</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">{search ? 'Arama sonucu bulunamadı' : 'Henüz ürün eklenmemiş'}</p>
          {canManage && !search && <p className="text-xs text-slate-600 mt-1">Yukarıdaki "Yeni Ürün" butonu ile ekleyebilirsiniz</p>}
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-8"></th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Barkod</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Stok</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Min.</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Durum</th>
                {canManage && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const stock = stockByProduct[p.id] ?? 0
                const minStock = p.critical_stock_level ?? 0
                const isCrit = minStock > 0 && stock <= minStock
                const whs = whsByProduct[p.id] ?? []
                const isExp = expanded === p.id
                return (
                  <React.Fragment key={p.id}>
                    <tr className={`border-b border-white/5 ${isCrit ? 'bg-red-500/5' : 'hover:bg-white/2'} transition-colors`}>
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-white/5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.unit ?? 'adet'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs hidden sm:table-cell">{p.barcode || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-bold ${isCrit ? 'text-red-400' : 'text-slate-200'}`}>{stock.toLocaleString('tr-TR')}</span>
                          {whs.length > 0 && (
                            <button onClick={() => setExpanded(isExp ? null : p.id)} className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
                              {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">{minStock || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isCrit ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5"><AlertTriangle className="w-3 h-3" />Kritik</span>
                        ) : (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Normal</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                            {confirmDel === p.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="px-2 py-1 rounded text-[10px] font-bold text-red-400 bg-red-500/15 hover:bg-red-500/25">
                                  {deleting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sil'}
                                </button>
                                <button onClick={() => setConfirmDel(null)} className="px-2 py-1 rounded text-[10px] text-slate-500 bg-white/5">Hayır</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDel(p.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExp && whs.length > 0 && (
                      <tr className="border-b border-white/5 bg-white/2">
                        <td colSpan={canManage ? 7 : 6} className="px-6 py-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">Depo Bazlı Dağılım</p>
                          <div className="flex flex-wrap gap-2">
                            {whs.map(w => (
                              <div key={w.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-slate-400 truncate max-w-[120px]">{w.name}</span>
                                <span className="text-xs font-bold text-slate-200">{w.qty.toLocaleString('tr-TR')}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="glass w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{mode === 'add' ? 'Yeni Ürün' : 'Ürünü Düzenle'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Ürün Adı *</label>
                  <input name="name" defaultValue={editing?.name} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="Ürün adını girin" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Barkod</label>
                  <input name="barcode" defaultValue={editing?.barcode ?? ''} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="1234567890" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Birim *</label>
                  <select name="unit" defaultValue={editing?.unit ?? 'adet'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-500 transition-colors">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Kritik Stok Seviyesi</label>
                  <input name="critical_stock_level" type="number" min="0" defaultValue={editing?.critical_stock_level ?? 0} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Görsel URL</label>
                  <input name="image_url" defaultValue={editing?.image_url ?? ''} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="https://…" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Açıklama</label>
                  <textarea name="description" defaultValue={editing?.description ?? ''} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors resize-none" placeholder="İsteğe bağlı açıklama" />
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all">İptal</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {mode === 'add' ? 'Ekle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
