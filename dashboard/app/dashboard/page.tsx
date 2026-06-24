import { createServerSupabase } from '@/lib/supabase-server'
import StatCard from '@/components/StatCard'
import LocationBarChart from '@/components/charts/LocationBarChart'
import ForecastLineChart from '@/components/charts/ForecastLineChart'
import StaffDonutChart from '@/components/charts/StaffDonutChart'
import BranchRadarChart from '@/components/charts/BranchRadarChart'
import DeadStockBubble from '@/components/charts/DeadStockBubble'
import { Package, AlertTriangle, Users, MapPin } from 'lucide-react'

async function getStats(supabase: any) {
  const [inventoryRes, profilesRes, locationsRes, criticalRes] = await Promise.all([
    supabase.from('inventory').select('quantity'),
    supabase.from('profiles').select('id, approved').eq('approved', false).neq('role', 'super_admin'),
    supabase.from('locations').select('id'),
    supabase.from('inventory').select('quantity, products!inner(min_quantity)').lt('quantity', 1),
  ])
  const totalStock = (inventoryRes.data ?? []).reduce((s: number, r: any) => s + (r.quantity ?? 0), 0)
  const pendingUsers = profilesRes.data?.length ?? 0
  const totalLocations = locationsRes.data?.length ?? 0
  const criticalCount = criticalRes.data?.length ?? 0
  return { totalStock, pendingUsers, totalLocations, criticalCount }
}

async function getLocationBarData(supabase: any) {
  const { data } = await supabase
    .from('transactions')
    .select('type, quantity, warehouses!inner(locations!inner(name))')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  if (!data?.length) return []
  const map: Record<string, { giris: number; cikis: number }> = {}
  for (const t of data) {
    const loc = t.warehouses?.locations?.name ?? 'Bilinmiyor'
    if (!map[loc]) map[loc] = { giris: 0, cikis: 0 }
    if (t.type === 'IN') map[loc].giris += t.quantity ?? 0
    else map[loc].cikis += t.quantity ?? 0
  }
  return Object.entries(map).map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.giris + b.cikis) - (a.giris + a.cikis))
    .slice(0, 10)
}

async function getForecastData(supabase: any) {
  const { data } = await supabase
    .from('transactions')
    .select('quantity, created_at, type')
    .eq('type', 'OUT')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('created_at')
  const dayMap: Record<string, number> = {}
  for (const t of data ?? []) {
    const d = t.created_at.slice(0, 10)
    dayMap[d] = (dayMap[d] ?? 0) + (t.quantity ?? 0)
  }
  const today = new Date()
  const result = []
  let totalOut = 0; let count = 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const v = dayMap[key] ?? 0
    totalOut += v; count++
    result.push({ date: key.slice(5), actual: v, forecast: undefined })
  }
  const avgDaily = count > 0 ? totalOut / count : 0
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    result.push({ date: d.toISOString().slice(5, 10), actual: undefined, forecast: avgDaily })
  }
  return result
}

async function getStaffData(supabase: any) {
  const { data } = await supabase
    .from('transactions')
    .select('user_id, profiles!inner(full_name)')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  if (!data?.length) return []
  const map: Record<string, { name: string; count: number }> = {}
  for (const t of data) {
    const id = t.user_id
    if (!map[id]) map[id] = { name: t.profiles?.full_name ?? 'Bilinmiyor', count: 0 }
    map[id].count++
  }
  return Object.values(map).map(v => ({ name: v.name, value: v.count }))
    .sort((a, b) => b.value - a.value).slice(0, 6)
}

async function getDeadStockData(supabase: any) {
  const { data: inv } = await supabase.from('inventory').select('product_id, quantity, products!inner(name)')
  const { data: txns } = await supabase.from('transactions').select('product_id, created_at').order('created_at', { ascending: false })
  if (!inv?.length) return []
  const lastTxn: Record<string, Date> = {}
  for (const t of txns ?? []) {
    if (!lastTxn[t.product_id]) lastTxn[t.product_id] = new Date(t.created_at)
  }
  const now = Date.now()
  return inv
    .map((r: any) => {
      const last = lastTxn[r.product_id]
      const days = last ? Math.floor((now - last.getTime()) / 86400000) : 999
      return { x: days, y: r.quantity ?? 0, z: r.quantity ?? 1, name: r.products?.name ?? '?' }
    })
    .filter((r: any) => r.x >= 30 && r.y > 0)
    .sort((a: any, b: any) => b.x - a.x)
    .slice(0, 30)
}

async function getBranchRadarData(supabase: any) {
  const { data: locs } = await supabase.from('locations').select('id, name')
  if (!locs?.length) return { data: [], branches: [] }
  const { data: txns } = await supabase
    .from('transactions')
    .select('type, quantity, warehouses!inner(location_id)')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  const metrics = ['Giriş', 'Çıkış', 'İşlem Hacmi']
  const locMap: Record<string, { in: number; out: number; total: number }> = {}
  for (const l of locs) locMap[l.id] = { in: 0, out: 0, total: 0 }
  for (const t of txns ?? []) {
    const lid = t.warehouses?.location_id
    if (!locMap[lid]) continue
    locMap[lid].total++
    if (t.type === 'IN') locMap[lid].in += t.quantity ?? 0
    else locMap[lid].out += t.quantity ?? 0
  }
  const maxes = { in: 1, out: 1, total: 1 }
  for (const v of Object.values(locMap)) {
    maxes.in = Math.max(maxes.in, v.in)
    maxes.out = Math.max(maxes.out, v.out)
    maxes.total = Math.max(maxes.total, v.total)
  }
  const branches = locs.slice(0, 4).map((l: any) => l.name)
  const radarData = metrics.map(m => {
    const row: any = { subject: m }
    for (const l of locs.slice(0, 4)) {
      const v = locMap[l.id]
      if (m === 'Giriş') row[l.name] = Math.round((v.in / maxes.in) * 100)
      else if (m === 'Çıkış') row[l.name] = Math.round((v.out / maxes.out) * 100)
      else row[l.name] = Math.round((v.total / maxes.total) * 100)
    }
    return row
  })
  return { data: radarData, branches }
}

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const [stats, barData, forecastData, staffData, deadData, radarResult] = await Promise.all([
    getStats(supabase),
    getLocationBarData(supabase),
    getForecastData(supabase),
    getStaffData(supabase),
    getDeadStockData(supabase),
    getBranchRadarData(supabase),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Genel Bakış</h1>
        <p className="text-slate-500 text-sm mt-1">Son 30 günlük özet</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Toplam Stok" value={stats.totalStock.toLocaleString('tr-TR')} icon={Package} color="blue" subtitle="tüm ürünler" />
        <StatCard title="Kritik Ürün" value={stats.criticalCount} icon={AlertTriangle} color="red" subtitle="stok sıfır" />
        <StatCard title="Onay Bekleyen" value={stats.pendingUsers} icon={Users} color="yellow" subtitle="personel" />
        <StatCard title="Toplam Şube" value={stats.totalLocations} icon={MapPin} color="green" subtitle="lokasyon" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Lokasyon Analitiği</h2>
          <p className="text-xs text-slate-500 mb-4">Son 30 gün — giriş/çıkış miktarları</p>
          <div className="h-64">
            <LocationBarChart data={barData} />
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Tükenme Tahmini</h2>
          <p className="text-xs text-slate-500 mb-4">Geçmiş tüketim hızına göre 14 günlük projeksiyon</p>
          <div className="h-64">
            <ForecastLineChart data={forecastData} />
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Personel Performansı</h2>
          <p className="text-xs text-slate-500 mb-4">Son 30 gün — işlem dağılımı</p>
          <div className="h-64">
            <StaffDonutChart data={staffData} />
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Şube Verimlilik Matrisi</h2>
          <p className="text-xs text-slate-500 mb-4">Lokasyonlar arası karşılaştırma</p>
          <div className="h-64">
            <BranchRadarChart data={radarResult.data} branches={radarResult.branches} />
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-1">Ölü Stok Tespiti</h2>
        <p className="text-xs text-slate-500 mb-4">30+ gündür işlem görmeyen ürünler — X: bekleyen gün, Y: mevcut stok</p>
        <div className="h-72">
          <DeadStockBubble data={deadData} />
        </div>
      </div>
    </div>
  )
}
