export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { Package, AlertTriangle, Users, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerSupabase()

  const [invRes, locRes, profRes, critRes, txnRes] = await Promise.all([
    supabase.from('inventory').select('quantity'),
    supabase.from('locations').select('id, name'),
    supabase.from('profiles').select('id, status, role').eq('status', 'pending').neq('role', 'super_admin'),
    supabase.from('inventory').select('quantity, products!inner(critical_stock_level)'),
    supabase.from('transactions').select('type, quantity, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const totalStock = (invRes.data ?? []).reduce((s, r: any) => s + (r.quantity ?? 0), 0)
  const totalLocations = locRes.data?.length ?? 0
  const pendingUsers = profRes.data?.length ?? 0
  const criticalCount = (critRes.data ?? []).filter((r: any) => (r.quantity ?? 0) <= (r.products?.critical_stock_level ?? 0) && (r.products?.critical_stock_level ?? 0) > 0).length

  const recentTxns = txnRes.data ?? []

  const stats = [
    { title: 'Toplam Stok', value: totalStock.toLocaleString('tr-TR'), icon: Package, color: 'sky', sub: 'toplam adet' },
    { title: 'Kritik Ürün', value: criticalCount, icon: AlertTriangle, color: 'red', sub: 'düşük stok' },
    { title: 'Onay Bekleyen', value: pendingUsers, icon: Users, color: 'amber', sub: 'personel' },
    { title: 'Toplam Şube', value: totalLocations, icon: MapPin, color: 'emerald', sub: 'lokasyon' },
  ]

  const colors: Record<string, string> = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Genel Bakış</h1>
        <p className="text-sm text-slate-500 mt-1">Stok kontrol yönetim paneli</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon, color, sub }) => (
          <div key={title} className="glass p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
              <p className={`text-3xl font-bold mt-0.5 ${colors[color].split(' ')[0]}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Son İşlemler</h2>
          {recentTxns.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Henüz işlem yok</p>
          ) : (
            <div className="space-y-2">
              {recentTxns.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    {t.type === 'IN'
                      ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                      : <TrendingDown className="w-4 h-4 text-red-400" />}
                    <span className="text-xs text-slate-400">{t.type === 'IN' ? 'Giriş' : 'Çıkış'}</span>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'IN' ? '+' : '-'}{t.quantity}
                  </span>
                  <span className="text-xs text-slate-600">{new Date(t.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Lokasyonlar</h2>
          {(locRes.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Lokasyon bulunamadı</p>
          ) : (
            <div className="space-y-2">
              {(locRes.data ?? []).map((loc: any) => (
                <div key={loc.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{loc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
