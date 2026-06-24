'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard, Package, Users, FileText,
  ChevronLeft, ChevronRight, BarChart3, LogOut, Warehouse, MapPin
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
  { href: '/dashboard/products', label: 'Ürünler & Stok', icon: Package, roles: ['super_admin', 'admin'] },
  { href: '/dashboard/warehouses', label: 'Depolar', icon: Warehouse, roles: ['super_admin', 'admin'] },
  { href: '/dashboard/locations', label: 'Lokasyonlar', icon: MapPin, roles: ['super_admin'] },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: Users, roles: ['super_admin', 'admin'] },
  { href: '/dashboard/reports', label: 'Raporlar', icon: FileText, roles: ['super_admin', 'admin'] },
]

export default function Sidebar({ userEmail, userRole }: { userEmail: string; userRole: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className={`relative flex flex-col bg-slate-900/80 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-sky-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Stok Kontrol</p>
            <p className="text-[10px] text-slate-500 truncate">Yönetim Paneli</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.filter(item => item.roles.includes(userRole)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
                ${active
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}
                ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-400' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={`px-2 py-4 border-t border-white/5 space-y-1`}>
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-slate-100 truncate">{userEmail}</p>
            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${userRole === 'super_admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>
              {userRole === 'super_admin' ? 'Süper Admin' : 'Admin'}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Çıkış Yap'}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronLeft className="w-3 h-3 text-slate-400" />}
      </button>
    </aside>
  )
}
