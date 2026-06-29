'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Warehouse, MapPin, Package, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { createWarehouse, updateWarehouse, deleteWarehouse } from '../actions'

interface Wh { id: string; name: string; description?: string; location_id?: string | null; created_at?: string }
interface Loc { id: string; name: string }
interface Props {
  warehouses: Wh[]
  locations: Loc[]
  stockByWh: Record<string, number>
  isSuperAdmin: boolean
  isAdmin: boolean
}

export default function WarehousesClient({ warehouses, locations, stockByWh, isSuperAdmin, isAdmin }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Wh | null>(null)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canManage = isAdmin || isSuperAdmin

  const locMap: Record<string, string> = {}
  for (const l of locations) locMap[l.id] = l.name

  function openAdd() { setEditing(null); setMode('add'); setError('') }
  function openEdit(wh: Wh) { setEditing(wh); setMode('edit'); setError('') }
  function closeModal() { setMode(null); setEditing(null); setError('') }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (mode === 'add') await createWarehouse(fd)
        else if (editing) await updateWarehouse(editing.id, fd)
        closeModal(); router.refresh()
      } catch (err: any) { setError(err.message) }
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id); setConfirmDel(null)
    try { await deleteWarehouse(id); router.refresh() }
    catch (err: any) { alert(err.message) }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Depolar</h1>
          <p className="text-sm text-slate-500 mt-1">{warehouses.length} depo</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Yeni Depo
          </button>
        )}
      </div>

      {warehouses.length === 0 ? (
        <div className="glass p-16 text-center">
          <Warehouse className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz depo eklenmemiş</p>
          {canManage && <p className="text-xs text-slate-600 mt-1">Yukarıdaki butonu kullanarak ekleyebilirsiniz</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map(wh => (
            <div key={wh.id} className="glass p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{wh.name}</p>
                    {wh.location_id && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-500 truncate">{locMap[wh.location_id] ?? 'Bilinmiyor'}</p>
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(wh)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    {confirmDel === wh.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(wh.id)} disabled={deleting === wh.id} className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/15 hover:bg-red-500/25 transition-all">
                          {deleting === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sil'}
                        </button>
                        <button onClick={() => setConfirmDel(null)} className="px-2 py-1 rounded-lg text-[10px] text-slate-500 bg-white/5 hover:bg-white/10 transition-all">Hayır</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(wh.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">Toplam Stok:</span>
                <span className="text-sm font-bold text-amber-400">{(stockByWh[wh.id] ?? 0).toLocaleString('tr-TR')}</span>
              </div>
              {wh.description && <p className="text-xs text-slate-500">{wh.description}</p>}
            </div>
          ))}
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="glass w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{mode === 'add' ? 'Yeni Depo' : 'Depoyu Düzenle'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Depo Adı *</label>
                <input name="name" defaultValue={editing?.name} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors" placeholder="Kuzey Depo" />
              </div>
              {isSuperAdmin && locations.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Lokasyon *</label>
                  <select name="location_id" defaultValue={editing?.location_id ?? ''} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-emerald-500 transition-colors">
                    <option value="">Seçin…</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Açıklama</label>
                <textarea name="description" defaultValue={editing?.description ?? ''} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder="İsteğe bağlı açıklama" />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all">İptal</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
