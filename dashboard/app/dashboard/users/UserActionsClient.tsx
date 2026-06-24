'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ChevronDown } from 'lucide-react'

interface Props {
  userId: string
  status: string
  locations: { id: string; name: string }[]
  currentLocationId: string | null
  currentRole: string
}

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'chef', label: 'Şef' },
  { value: 'staff', label: 'Personel' },
]

async function callUserAction(body: object) {
  const res = await fetch('/api/admin/user-actions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'İşlem başarısız')
  }
  return res.json()
}

export default function UserActionsClient({ userId, status, currentRole }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  if (currentRole === 'super_admin') return null

  async function approve() {
    setLoading(true); setError('')
    try {
      await callUserAction({ action: 'approve', userId })
      router.refresh()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function reject() {
    setLoading(true); setError('')
    try {
      await callUserAction({ action: 'reject', userId })
      router.refresh()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function changeRole(role: string) {
    setLoading(true); setError('')
    try {
      await callUserAction({ action: 'change_role', userId, role })
      setOpen(false)
      router.refresh()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {status !== 'approved' && (
          <button onClick={approve} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium disabled:opacity-50">
            <CheckCircle className="w-3 h-3" /> Onayla
          </button>
        )}
        {status === 'approved' && (
          <button onClick={reject} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium disabled:opacity-50">
            <XCircle className="w-3 h-3" /> Askıya Al
          </button>
        )}
        <div className="relative">
          <button onClick={() => setOpen(o => !o)} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-xs disabled:opacity-50">
            Rol <ChevronDown className="w-3 h-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-32 glass border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl">
              {roles.filter(r => r.value !== currentRole).map(r => (
                <button key={r.value} onClick={() => changeRole(r.value)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors">
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
