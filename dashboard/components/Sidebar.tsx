'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { BarChart3, MapPin, Warehouse, Package, Users, FileText, LogOut, ChevronRight, ArrowLeftRight } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Genel Bakış', icon: BarChart3 },
  { href: '/dashboard/locations', label: 'Lokasyonlar', icon: MapPin },
  { href: '/dashboard/warehouses', label: 'Depolar', icon: Warehouse },
  { href: '/dashboard/products', label: 'Ürünler & Stok', icon: Package },
  { href: '/dashboard/transactions', label: 'Stok İşlemleri', icon: ArrowLeftRight },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: Users },
  { href: '/dashboard/reports', label: 'Raporlar', icon: FileText },
]

const roleLabels: Record<string, string> = {
  super_admin: 'Süper Admin',
  admin: 'İdari İşler',
  chef: 'Şef',
  staff: 'Personel',
}

export default function Sidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="w-60 flex-shrink-0 h-screen flex flex-col bg-slate-950 border-r border-white/5">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Stok Kontrol</p>
            <p className="text-xs text-slate-500">Yönetim Paneli</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-slate-300 truncate">{email}</p>
          <p className="text-xs text-slate-500">{roleLabels[role] ?? role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}
