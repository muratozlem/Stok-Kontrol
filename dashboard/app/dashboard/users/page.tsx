export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import UserActionsClient from './UserActionsClient'
import { Users, CheckCircle, Clock, MapPin } from 'lucide-react'

export default async function UsersPage() {
  const supabase = createServerSupabase()

  const [profilesRes, locationsRes] = await Promise.all([
    supabase.from('profiles').select('id, username, email, role, status, location_id').order('status').order('username'),
    supabase.from('locations').select('id, name'),
  ])

  const profiles = profilesRes.data ?? []
  const locations = locationsRes.data ?? []
  const locMap: Record<string, string> = {}
  for (const l of locations) locMap[l.id] = l.name

  const roleLabel: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Admin', chef: 'Şef', staff: 'Personel'
  }
  const roleColor: Record<string, string> = {
    super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    admin: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    chef: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    staff: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  const pending = profiles.filter(p => p.status === 'pending' && p.role !== 'super_admin')
  const active = profiles.filter(p => p.status !== 'pending' || p.role === 'super_admin')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kullanıcı Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1">{profiles.length} kullanıcı</p>
        </div>
        <div className="flex gap-3">
          <div className="glass px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">{pending.length} onay bekliyor</span>
          </div>
          <div className="glass px-4 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">{active.length} aktif</span>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Onay Bekleyenler
          </h2>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="glass p-4 flex items-center gap-4 border-amber-500/10">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                  {(p.username ?? p.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{p.username ?? '—'}</p>
                  <p className="text-xs text-slate-500 truncate">{p.email}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3 h-3" />
                  {p.location_id ? locMap[p.location_id] ?? '?' : 'Şube yok'}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${roleColor[p.role] ?? roleColor.staff}`}>
                  {roleLabel[p.role] ?? p.role}
                </span>
                <UserActionsClient userId={p.id} status={p.status} locations={locations} currentLocationId={p.location_id} currentRole={p.role} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Tüm Kullanıcılar
        </h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Şube</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Durum</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {active.map(p => (
                <tr key={p.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs flex-shrink-0">
                        {(p.username ?? p.email ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium truncate">{p.username ?? '—'}</p>
                        <p className="text-xs text-slate-500 truncate">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${roleColor[p.role] ?? roleColor.staff}`}>
                      {roleLabel[p.role] ?? p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.location_id ? locMap[p.location_id] ?? '?' : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      p.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {p.status === 'approved' ? 'Aktif' : p.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActionsClient userId={p.id} status={p.status} locations={locations} currentLocationId={p.location_id} currentRole={p.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
