'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Warehouse, Users, Package, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { createLocation, updateLocation, deleteLocation } from '../actions'

interface Loc { id: string; name: string; city?: string; description?: string; created_at: string }
interface Props {
  locations: Loc[]
  whByLoc: Record<string, number>
  userByLoc: Record<string, number>
  stockByLoc: Record<string, number>
  isSuperAdmin: boolean
}

export default function LocationsClient({ locations, whByLoc, userByLoc, stockByLoc, isSuperAdmin }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Loc | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openAdd() { setEditing(null); setMode('add'); setError('') }
  function openEdit(loc: Loc) { setEditing(loc); setMode('edit'); setError('') }
  function closeModal() { setMode(null); setEditing(null); setError('') }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (mode === 'add') await createLocation(fd)
        else if (editing) await updateLocation(editing.id, fd)
        closeModal(); router.refresh()
      } catch (err: any) { setError(err.message) }
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id); setConfirmDel(null)
    try { await deleteLocation(id); router.refresh() }
    catch (err: any) { alert(err.message) }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lokasyonlar</h1>
          <p className="text-sm text-slate-500 mt-1">{locations.length} şube / lokasyon</p>
        </div>
        {isSuperAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium px-4 py-2 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Yeni Lokasyon
          </button>
        )}
      </div>

      {locations.length === 0 ? (
        <div className="glass p-16 text-center">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz lokasyon eklenmemiş</p>
          {isSuperAdmin && <p className="text-xs text-slate-600 mt-1">Yukarıdaki butonu kullanarak ekleyebilirsiniz</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="glass p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{loc.name}</p>
                    {loc.city && <p className="text-xs text-slate-500 truncate">{loc.city}</p>}
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(loc)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all" title="Düzenle"><Pencil className="w-3.5 h-3.5" /></button>
                    {confirmDel === loc.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(loc.id)} disabled={deleting === loc.id} className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-500/15 hover:bg-red-500/25 transition-all">
                          {deleting === loc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sil'}
                        </button>
                        <button onClick={() => setConfirmDel(null)} className="px-2 py-1 rounded-lg text-[10px] text-slate-500 bg-white/5 hover:bg-white/10 transition-all">Hayır</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(loc.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-1"><Warehouse className="w-3.5 h-3.5 text-emerald-400" /></div>
                  <p className="text-lg font-bold text-emerald-400">{whByLoc[loc.id] ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Depo</p>
                </div>
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-1"><Users className="w-3.5 h-3.5 text-purple-400" /></div>
                  <p className="text-lg font-bold text-purple-400">{userByLoc[loc.id] ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Personel</p>
                </div>
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-1"><Package className="w-3.5 h-3.5 text-amber-400" /></div>
                  <p className="text-lg font-bold text-amber-400">{(stockByLoc[loc.id] ?? 0).toLocaleString('tr-TR')}</p>
                  <p className="text-[10px] text-slate-500">Stok</p>
                </div>
              </div>
              {loc.description && <p className="text-xs text-slate-500 border-t border-white/5 pt-3">{loc.description}</p>}
              <p className="text-[10px] text-slate-700">{new Date(loc.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
          ))}
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="glass w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{mode === 'add' ? 'Yeni Lokasyon' : 'Lokasyonu Düzenle'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Lokasyon Adı *</label>
                <input name="name" defaultValue={editing?.name} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="İstanbul Merkez" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Şehir</label>
                <input name="city" defaultValue={editing?.city ?? ''} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" placeholder="İstanbul" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Açıklama</label>
                <textarea name="description" defaultValue={editing?.description ?? ''} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors resize-none" placeholder="İsteğe bağlı açıklama" />
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
