'use client'
import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Package, AlertTriangle, Users, TrendingUp, TrendingDown,
  SlidersHorizontal, X, ChevronDown, Activity, BarChart3,
} from 'lucide-react'

interface Transaction {
  id: string; type: string; quantity: number; created_at: string
  products: { name: string } | null
  warehouses: { name: string; locations: { name: string } | null } | null
}
interface InventoryItem {
  quantity: number
  products: { id: string; name: string; unit: string | null; critical_stock_level: number | null } | null
  warehouses: { id: string; name: string; locations: { id: string; name: string } | null } | null
}
interface Location { id: string; name: string }
interface Warehouse { id: string; name: string; location_id: string | null }
interface Product { id: string; name: string }

interface Props {
  transactions: Transaction[]
  inventory: InventoryItem[]
  locations: Location[]
  warehouses: Warehouse[]
  products: Product[]
  pendingUsers: number
}

const IN_COLOR = '#34d399'
const OUT_COLOR = '#f87171'
const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#facc15', '#60a5fa', '#4ade80']

const axisStyle = { fill: '#64748b', fontSize: 10 }

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 40px rgba(0,0,0,.5)' }}>
      {label && <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill ?? '#e2e8f0', fontSize: 12, fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('tr-TR') : p.value}
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ text = 'Bu filtreler için veri yok' }: { text?: string }) {
  return <div className="h-48 flex items-center justify-center text-sm text-slate-600">{text}</div>
}

function KPICard({ title, value, icon: Icon, color, sub }: { title: string; value: any; icon: any; color: string; sub: string }) {
  const cls: Record<string, string> = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  }
  const c = cls[color] ?? cls.sky
  const [textCls] = c.split(' ')
  return (
    <div className="glass p-4 flex flex-col gap-2.5">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${c}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold mt-0.5 ${textCls}`}>{value}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 pr-7 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer">
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      </div>
    </div>
  )
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 [color-scheme:dark]" />
    </div>
  )
}

export default function OverviewClient({ transactions, inventory, locations, warehouses, products, pendingUsers }: Props) {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [locationId, setLocationId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [showFilters, setShowFilters] = useState(true)

  const availableWarehouses = useMemo(
    () => locationId ? warehouses.filter(w => w.location_id === locationId) : warehouses,
    [locationId, warehouses]
  )

  const { fromDate, toDate } = useMemo(() => {
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
    let from: Date
    if (dateFrom) {
      from = new Date(dateFrom + 'T00:00:00')
    } else {
      from = new Date()
      from.setDate(from.getDate() - parseInt(period))
      from.setHours(0, 0, 0, 0)
    }
    return { fromDate: from, toDate: to }
  }, [period, dateFrom, dateTo])

  const locName = useMemo(() => locations.find(l => l.id === locationId)?.name, [locationId, locations])
  const whName = useMemo(() => warehouses.find(w => w.id === warehouseId)?.name, [warehouseId, warehouses])
  const pName = useMemo(() => products.find(p => p.id === productId)?.name, [productId, products])

  const filteredTxns = useMemo(() => transactions.filter(t => {
    const d = new Date(t.created_at)
    if (d < fromDate || d > toDate) return false
    if (locName && t.warehouses?.locations?.name !== locName) return false
    if (whName && t.warehouses?.name !== whName) return false
    if (pName && t.products?.name !== pName) return false
    return true
  }), [transactions, fromDate, toDate, locName, whName, pName])

  const filteredInv = useMemo(() => inventory.filter(i => {
    if (locName && i.warehouses?.locations?.name !== locName) return false
    if (whName && i.warehouses?.name !== whName) return false
    if (pName && i.products?.name !== pName) return false
    return true
  }), [inventory, locName, whName, pName])

  const totalStock = useMemo(() => filteredInv.reduce((s, i) => s + (i.quantity ?? 0), 0), [filteredInv])
  const criticalItems = useMemo(() => filteredInv.filter(i => {
    const c = i.products?.critical_stock_level ?? 0
    return c > 0 && (i.quantity ?? 0) <= c
  }).length, [filteredInv])
  const periodIn = useMemo(() => filteredTxns.filter(t => t.type === 'IN').reduce((s, t) => s + (t.quantity ?? 0), 0), [filteredTxns])
  const periodOut = useMemo(() => filteredTxns.filter(t => t.type === 'OUT').reduce((s, t) => s + (t.quantity ?? 0), 0), [filteredTxns])
  const net = periodIn - periodOut

  const lineData = useMemo(() => {
    const map: Record<string, { date: string; Giriş: number; Çıkış: number }> = {}
    const sorted = [...filteredTxns].reverse()
    sorted.forEach(t => {
      const day = new Date(t.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      if (!map[day]) map[day] = { date: day, Giriş: 0, Çıkış: 0 }
      if (t.type === 'IN') map[day].Giriş += t.quantity ?? 0
      else map[day].Çıkış += t.quantity ?? 0
    })
    return Object.values(map)
  }, [filteredTxns])

  const warehousePie = useMemo(() => {
    const map: Record<string, number> = {}
    filteredInv.forEach(i => { const n = i.warehouses?.name ?? 'Bilinmiyor'; map[n] = (map[n] ?? 0) + (i.quantity ?? 0) })
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredInv])

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; Giriş: number; Çıkış: number; toplam: number }> = {}
    filteredTxns.forEach(t => {
      const n = t.products?.name ?? 'Bilinmiyor'
      if (!map[n]) map[n] = { name: n, Giriş: 0, Çıkış: 0, toplam: 0 }
      if (t.type === 'IN') map[n].Giriş += t.quantity ?? 0
      else map[n].Çıkış += t.quantity ?? 0
      map[n].toplam += t.quantity ?? 0
    })
    return Object.values(map).sort((a, b) => b.toplam - a.toplam).slice(0, 8)
  }, [filteredTxns])

  const locationBar = useMemo(() => {
    const map: Record<string, { location: string; Giriş: number; Çıkış: number }> = {}
    filteredTxns.forEach(t => {
      const loc = t.warehouses?.locations?.name ?? 'Bilinmiyor'
      if (!map[loc]) map[loc] = { location: loc, Giriş: 0, Çıkış: 0 }
      if (t.type === 'IN') map[loc].Giriş += t.quantity ?? 0
      else map[loc].Çıkış += t.quantity ?? 0
    })
    return Object.values(map)
  }, [filteredTxns])

  const stockLevels = useMemo(() => {
    const map: Record<string, { name: string; Stok: number; Kritik: number }> = {}
    filteredInv.forEach(i => {
      const key = `${i.products?.id ?? ''}__${i.warehouses?.id ?? ''}`
      const label = `${i.products?.name ?? 'Bilinmiyor'} · ${i.warehouses?.name ?? '—'}`
      if (!map[key]) map[key] = { name: label, Stok: 0, Kritik: i.products?.critical_stock_level ?? 0 }
      map[key].Stok += i.quantity ?? 0
    })
    return Object.values(map)
      .sort((a, b) => {
        const aCrit = a.Kritik > 0 && a.Stok <= a.Kritik
        const bCrit = b.Kritik > 0 && b.Stok <= b.Kritik
        if (aCrit && !bCrit) return -1
        if (!aCrit && bCrit) return 1
        return a.Stok - b.Stok
      })
      .slice(0, 12)
  }, [filteredInv])

  const lowStock = useMemo(() => {
    const map: Record<string, { name: string; stok: number; kritik: number; depo: string }> = {}
    filteredInv.forEach(i => {
      const c = i.products?.critical_stock_level ?? 0
      if (c <= 0) return
      const key = `${i.products?.name}||${i.warehouses?.name}`
      if (!map[key]) map[key] = { name: i.products?.name ?? '', stok: 0, kritik: c, depo: `${i.warehouses?.name ?? ''} / ${i.warehouses?.locations?.name ?? ''}` }
      map[key].stok += i.quantity ?? 0
    })
    return Object.values(map).filter(x => x.stok <= x.kritik).sort((a, b) => (a.stok / a.kritik) - (b.stok / b.kritik))
  }, [filteredInv])

  const abcAnalysis = useMemo(() => {
    const map: Record<string, { name: string; toplam: number; islem: number }> = {}
    filteredTxns.forEach(t => {
      const n = t.products?.name ?? 'Bilinmiyor'
      if (!map[n]) map[n] = { name: n, toplam: 0, islem: 0 }
      map[n].toplam += t.quantity ?? 0
      map[n].islem++
    })
    const sorted = Object.values(map).sort((a, b) => b.toplam - a.toplam)
    const grand = sorted.reduce((s, p) => s + p.toplam, 0)
    let cum = 0
    return sorted.map(p => {
      cum += p.toplam
      const pct = grand > 0 ? (cum / grand) * 100 : 0
      return { ...p, sinif: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C', pay: grand > 0 ? (p.toplam / grand * 100).toFixed(1) : '0' }
    }).slice(0, 15)
  }, [filteredTxns])

  const hasFilter = !!(locationId || warehouseId || productId || dateFrom || dateTo)

  function resetFilters() {
    setLocationId(''); setWarehouseId(''); setProductId(''); setDateFrom(''); setDateTo('')
  }

  const inCount = filteredTxns.filter(t => t.type === 'IN').length
  const outCount = filteredTxns.filter(t => t.type === 'OUT').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Genel Bakış</h1>
          <p className="text-sm text-slate-500 mt-0.5">Stok analiz & veri paneli</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['7', '30', '90'] as const).map(d => (
            <button key={d} onClick={() => { setPeriod(d); setDateFrom(''); setDateTo('') }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${period === d && !dateFrom && !dateTo ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
              Son {d}G
            </button>
          ))}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${showFilters ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtreler
            {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Özel Filtreler</p>
            {hasFilter && (
              <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                <X className="w-3 h-3" /> Temizle
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterDate label="Başlangıç" value={dateFrom} onChange={setDateFrom} />
            <FilterDate label="Bitiş" value={dateTo} onChange={setDateTo} />
            {locations.length > 0 && (
              <FilterSelect label="Lokasyon" value={locationId} onChange={v => { setLocationId(v); setWarehouseId('') }}>
                <option value="">Tüm Lokasyonlar</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </FilterSelect>
            )}
            {warehouses.length > 0 && (
              <FilterSelect label="Depo" value={warehouseId} onChange={setWarehouseId}>
                <option value="">Tüm Depolar</option>
                {availableWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </FilterSelect>
            )}
            {products.length > 0 && (
              <FilterSelect label="Ürün" value={productId} onChange={setProductId}>
                <option value="">Tüm Ürünler</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </FilterSelect>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard title="Toplam Stok" value={totalStock.toLocaleString('tr-TR')} icon={Package} color="sky" sub="mevcut adet" />
        <KPICard title="Kritik Ürün" value={criticalItems} icon={AlertTriangle} color="red" sub="düşük stok" />
        <KPICard title="Dönem Girişi" value={periodIn.toLocaleString('tr-TR')} icon={TrendingUp} color="emerald" sub={`${inCount} işlem`} />
        <KPICard title="Dönem Çıkışı" value={periodOut.toLocaleString('tr-TR')} icon={TrendingDown} color="orange" sub={`${outCount} işlem`} />
        <KPICard title="Net Değişim" value={(net >= 0 ? '+' : '') + net.toLocaleString('tr-TR')} icon={Activity} color={net >= 0 ? 'green' : 'rose'} sub="dönem net" />
        <KPICard title="Onay Bekleyen" value={pendingUsers} icon={Users} color="amber" sub="personel" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Stok Hareketi (Günlük)</h3>
          {lineData.length === 0 ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={lineData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={IN_COLOR} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={IN_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={OUT_COLOR} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={OUT_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="Giriş" stroke={IN_COLOR} strokeWidth={2} fill="url(#gIn)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Çıkış" stroke={OUT_COLOR} strokeWidth={2} fill="url(#gOut)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-4 h-0.5 bg-emerald-400 inline-block rounded" />Giriş</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-4 h-0.5 bg-red-400 inline-block rounded" />Çıkış</span>
              </div>
            </>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Depo Dağılımı</h3>
          {warehousePie.length === 0 ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={warehousePie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {warehousePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {warehousePie.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-400 truncate">{item.name}</span>
                    </div>
                    <span className="text-slate-300 font-medium ml-2 flex-shrink-0">{item.value.toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">En Çok Hareket Eden Ürünler</h3>
          {topProducts.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={axisStyle} />
                <YAxis type="category" dataKey="name" tick={{ ...axisStyle, width: 100 }} width={110} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="Giriş" fill={IN_COLOR} radius={[0, 4, 4, 0]} barSize={9} />
                <Bar dataKey="Çıkış" fill={OUT_COLOR} radius={[0, 4, 4, 0]} barSize={9} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Lokasyon Karşılaştırma</h3>
          {locationBar.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationBar} margin={{ top: 0, right: 10, bottom: 24, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="location" tick={axisStyle} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="Giriş" fill={IN_COLOR} radius={[4, 4, 0, 0]} barSize={22} />
                <Bar dataKey="Çıkış" fill={OUT_COLOR} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {stockLevels.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Mevcut Stok Seviyeleri</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockLevels} margin={{ top: 5, right: 10, bottom: 28, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={axisStyle} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="Stok" radius={[4, 4, 0, 0]}>
                {stockLevels.map((entry, i) => (
                  <Cell key={i} fill={entry.Kritik > 0 && entry.Stok <= entry.Kritik ? OUT_COLOR : COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-600 mt-1">Kırmızı: kritik seviyenin altında</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-300">Düşük Stok Alarmları</h3>
            {lowStock.length > 0 && (
              <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">{lowStock.length}</span>
            )}
          </div>
          {lowStock.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <p className="text-2xl">✓</p>
              <p className="text-sm text-slate-600">Kritik stok seviyesinin altında ürün yok</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {lowStock.map((item, i) => {
                const pct = Math.round((item.stok / item.kritik) * 100)
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 truncate">{item.depo}</p>
                      <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-red-400">{item.stok}</p>
                      <p className="text-xs text-slate-500">/ {item.kritik}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-300">ABC Analizi</h3>
            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">dönem bazlı</span>
          </div>
          {abcAnalysis.length === 0 ? (
            <EmptyChart text="Bu dönemde işlem kaydı yok" />
          ) : (
            <>
              <div className="flex gap-3 mb-3 text-[10px]">
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold inline-flex items-center justify-center">A</span><span className="text-slate-400">İlk %80 hareket</span></span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 font-bold inline-flex items-center justify-center">B</span><span className="text-slate-400">%80–95</span></span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-500/20 text-slate-400 font-bold inline-flex items-center justify-center">C</span><span className="text-slate-400">Kalan %5</span></span>
              </div>
              <div className="overflow-auto max-h-60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-slate-500 uppercase tracking-wider pb-2">Sınıf</th>
                      <th className="text-left text-slate-500 uppercase tracking-wider pb-2">Ürün</th>
                      <th className="text-right text-slate-500 uppercase tracking-wider pb-2">Hareket</th>
                      <th className="text-right text-slate-500 uppercase tracking-wider pb-2">İşlem</th>
                      <th className="text-right text-slate-500 uppercase tracking-wider pb-2">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcAnalysis.map((item, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                        <td className="py-1.5">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${item.sinif === 'A' ? 'bg-emerald-500/20 text-emerald-400' : item.sinif === 'B' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>{item.sinif}</span>
                        </td>
                        <td className="py-1.5 text-slate-300 max-w-[130px] truncate">{item.name}</td>
                        <td className="py-1.5 text-right text-slate-300">{item.toplam.toLocaleString('tr-TR')}</td>
                        <td className="py-1.5 text-right text-slate-500">{item.islem}</td>
                        <td className="py-1.5 text-right text-slate-500">{item.pay}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
