'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Users, Plus, Trash2, Shield, CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'İdari İşler (Admin)' },
  { value: 'chef', label: 'Şef' },
  { value: 'staff', label: 'Personel' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Süper Admin',
  admin: 'İdari İşler',
  chef: 'Şef',
  staff: 'Personel',
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Onaylı',
  pending: 'Bekliyor',
  rejected: 'Reddedildi',
}

interface Profile {
  id: string
  email: string
  username?: string
  role: string
  status: string
  location_id?: string
  created_at: string
}

interface Location {
  id: string
  name: string
}

export default function UsersClient({ initialProfiles, locations }: { initialProfiles: Profile[]; locations: Location[] }) {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('staff')
  const [newLocation, setNewLocation] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  async function refresh() {
    router.refresh()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Oturum bulunamadı')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole, location_id: newLocation || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Kullanıcı eklenemedi')

      setNewEmail(''); setNewPassword(''); setNewRole('staff'); setNewLocation('')
      setShowAdd(false)
      refresh()
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(userId: string) {
    setLoading(userId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Oturum bulunamadı')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Silinemedi') }
      setDeleteConfirm(null)
      refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleApprove(userId: string, currentRole: string, currentLocationId: string | null) {
    setLoading(userId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Oturum bulunamadı')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          targetUserId: userId,
          newRole: currentRole,
          newLocationId: currentLocationId ?? null,
          newStatus: 'approved',
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Onaylanamadı') }
      refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleRoleChange(userId: string, role: string, locationId: string) {
    setLoading(userId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Oturum bulunamadı')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: userId, newRole: role, newLocationId: locationId || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Güncellenemedi') }
      refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  const locMap: Record<string, string> = {}
  for (const l of locations) locMap[l.id] = l.name

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kullanıcılar</h1>
          <p className="text-sm text-slate-500 mt-1">{profiles.length} kullanıcı</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Kullanıcı Ekle
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="glass p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Yeni Kullanıcı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">E-Posta</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                placeholder="kullanici@sirket.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Şifre</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                placeholder="En az 6 karakter" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Rol</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Lokasyon (opsiyonel)</label>
              <select value={newLocation} onChange={e => setNewLocation(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors">
                <option value="">— Seçiniz —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          {addError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={adding}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              {adding && <Loader2 className="w-3 h-3 animate-spin" />}
              {adding ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors">
              İptal
            </button>
          </div>
        </form>
      )}

      {profiles.length === 0 ? (
        <div className="glass p-16 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Henüz kullanıcı yok</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Kullanıcı</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Lokasyon</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Durum</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{p.email}</p>
                    {p.username && <p className="text-xs text-slate-500">{p.username}</p>}
                    <p className="text-xs text-slate-600">{new Date(p.created_at).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.role === 'super_admin' ? (
                      <span className="flex items-center gap-1 text-xs text-sky-400">
                        <Shield className="w-3 h-3" /> Süper Admin
                      </span>
                    ) : (
                      <select
                        defaultValue={p.role}
                        disabled={!!loading}
                        onChange={e => handleRoleChange(p.id, e.target.value, p.location_id ?? '')}
                        className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-sky-500 disabled:opacity-50"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {p.location_id ? locMap[p.location_id] ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs rounded-full px-2 py-0.5 border ${
                      p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : p.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(p.id, p.role, p.location_id ?? null)}
                          disabled={!!loading}
                          className="flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Onayla
                        </button>
                      )}
                      {p.role !== 'super_admin' && (
                        deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(p.id)} disabled={!!loading}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                              {loading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Evet, sil'}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            disabled={!!loading}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
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
