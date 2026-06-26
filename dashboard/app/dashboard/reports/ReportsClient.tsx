'use client'
import { useState, useMemo } from 'react'
import {
  FileText, TrendingUp, TrendingDown, FileSpreadsheet,
  Download, ChevronDown, X, SlidersHorizontal, ExternalLink,
} from 'lucide-react'

interface Transaction {
  id: string
  type: string
  quantity: number
  note: string | null
  created_at: string
  products: { name: string } | null
  warehouses: { name: string; locations: { name: string } | null } | null
}
interface Location { id: string; name: string }
interface Warehouse { id: string; name: string; location_id: string | null }
interface Product { id: string; name: string }

interface Props {
  transactions: Transaction[]
  locations: Location[]
  warehouses: Warehouse[]
  products: Product[]
}

const EMPTY = ''

function SelectFilter({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 pr-8 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      </div>
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 [color-scheme:dark]"
      />
    </div>
  )
}

export default function ReportsClient({ transactions, locations, warehouses, products }: Props) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [locationId, setLocationId] = useState(EMPTY)
  const [warehouseId, setWarehouseId] = useState(EMPTY)
  const [productId, setProductId] = useState(EMPTY)
  const [dateFrom, setDateFrom] = useState(EMPTY)
  const [dateTo, setDateTo] = useState(EMPTY)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [showFilters, setShowFilters] = useState(true)

  const availableWarehouses = useMemo(
    () => locationId ? warehouses.filter(w => w.location_id === locationId) : warehouses,
    [locationId, warehouses]
  )

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false
      if (locationId && t.warehouses?.locations?.name !== locations.find(l => l.id === locationId)?.name) return false
      if (warehouseId && t.warehouses?.name !== warehouses.find(w => w.id === warehouseId)?.name) return false
      if (productId && t.products?.name !== products.find(p => p.id === productId)?.name) return false
      if (dateFrom) {
        const d = new Date(t.created_at)
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (d < from) return false
      }
      if (dateTo) {
        const d = new Date(t.created_at)
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (d > to) return false
      }
      return true
    })
  }, [transactions, typeFilter, locationId, warehouseId, productId, dateFrom, dateTo, locations, warehouses, products])

  const filteredIn = filtered.filter(t => t.type === 'IN').reduce((s, t) => s + (t.quantity ?? 0), 0)
  const filteredOut = filtered.filter(t => t.type === 'OUT').reduce((s, t) => s + (t.quantity ?? 0), 0)
  const net = filteredIn - filteredOut

  const hasActiveFilter = typeFilter !== 'ALL' || locationId || warehouseId || productId || dateFrom || dateTo

  function resetFilters() {
    setTypeFilter('ALL')
    setLocationId(EMPTY)
    setWarehouseId(EMPTY)
    setProductId(EMPTY)
    setDateFrom(EMPTY)
    setDateTo(EMPTY)
  }

  function filterSummaryText() {
    const parts: string[] = []
    if (typeFilter !== 'ALL') parts.push(typeFilter === 'IN' ? 'Giriş' : 'Çıkış')
    if (locationId) parts.push(`Lokasyon: ${locations.find(l => l.id === locationId)?.name}`)
    if (warehouseId) parts.push(`Depo: ${warehouses.find(w => w.id === warehouseId)?.name}`)
    if (productId) parts.push(`Ürün: ${products.find(p => p.id === productId)?.name}`)
    if (dateFrom) parts.push(`Başlangıç: ${new Date(dateFrom).toLocaleDateString('tr-TR')}`)
    if (dateTo) parts.push(`Bitiş: ${new Date(dateTo).toLocaleDateString('tr-TR')}`)
    return parts.length ? parts.join(' | ') : 'Tümü'
  }

  async function exportExcel() {
    setExporting('excel')
    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Stok Kontrol'
      wb.created = new Date()

      const ws = wb.addWorksheet('İşlemler')
      ws.columns = [
        { header: 'Tarih', key: 'tarih', width: 22 },
        { header: 'Tür', key: 'tur', width: 10 },
        { header: 'Ürün', key: 'urun', width: 24 },
        { header: 'Depo', key: 'depo', width: 20 },
        { header: 'Lokasyon', key: 'lokasyon', width: 20 },
        { header: 'Miktar', key: 'miktar', width: 12 },
        { header: 'Not', key: 'not', width: 32 },
      ]
      ws.getRow(1).font = { bold: true }

      filtered.forEach(t => {
        ws.addRow({
          tarih: new Date(t.created_at).toLocaleString('tr-TR'),
          tur: t.type === 'IN' ? 'Giriş' : 'Çıkış',
          urun: t.products?.name ?? '',
          depo: t.warehouses?.name ?? '',
          lokasyon: t.warehouses?.locations?.name ?? '',
          miktar: t.type === 'IN' ? t.quantity : -t.quantity,
          not: t.note ?? '',
        })
      })

      const ws2 = wb.addWorksheet('Özet')
      ws2.addRows([
        ['Toplam Giriş', filteredIn],
        ['Toplam Çıkış', filteredOut],
        ['Net', net],
        ['Filtreler', filterSummaryText()],
        ['Oluşturulma', new Date().toLocaleString('tr-TR')],
      ])

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const tarih = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      a.href = url
      a.download = `stok-rapor-${tarih}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  async function exportPDF() {
    setExporting('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(14, 165, 233)
      doc.text('Stok Kontrol - Rapor', 14, 16)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, 14, 23)
      doc.text(`Filtreler: ${filterSummaryText()}`, 14, 28)
      doc.text(
        `Toplam Giriş: ${filteredIn.toLocaleString('tr-TR')}   |   Toplam Çıkış: ${filteredOut.toLocaleString('tr-TR')}   |   Net: ${net >= 0 ? '+' : ''}${net.toLocaleString('tr-TR')}`,
        14, 33
      )

      autoTable(doc, {
        startY: 38,
        head: [['Tarih', 'Tür', 'Ürün', 'Depo', 'Lokasyon', 'Miktar', 'Not']],
        body: filtered.map(t => [
          new Date(t.created_at).toLocaleString('tr-TR'),
          t.type === 'IN' ? 'Giriş' : 'Çıkış',
          t.products?.name ?? '',
          t.warehouses?.name ?? '',
          t.warehouses?.locations?.name ?? '',
          (t.type === 'IN' ? '+' : '-') + (t.quantity ?? 0).toLocaleString('tr-TR'),
          t.note ?? '',
        ]),
        headStyles: { fillColor: [15, 23, 42], textColor: [148, 163, 184], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [226, 232, 240] },
        alternateRowStyles: { fillColor: [15, 23, 42] },
        styles: { fillColor: [30, 41, 59], lineColor: [51, 65, 85], lineWidth: 0.1 },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 1) {
            const val = data.cell.raw as string
            data.cell.styles.textColor = val === 'Giriş' ? [52, 211, 153] : [248, 113, 113]
          }
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw as string
            data.cell.styles.textColor = val.startsWith('+') ? [52, 211, 153] : [248, 113, 113]
            data.cell.styles.fontStyle = 'bold'
          }
        },
        columnStyles: {
          0: { cellWidth: 35 }, 1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 40 }, 3: { cellWidth: 35 }, 4: { cellWidth: 30 },
          5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      })

      const pages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(`Sayfa ${i} / ${pages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
      }

      const tarih = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      doc.save(`stok-rapor-${tarih}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  async function exportGoogleSheets() {
    setExporting('sheets')
    try {
      const headers = ['Tarih', 'Tür', 'Ürün', 'Depo', 'Lokasyon', 'Miktar', 'Not']
      const rows = filtered.map(t => [
        new Date(t.created_at).toLocaleString('tr-TR'),
        t.type === 'IN' ? 'Giriş' : 'Çıkış',
        t.products?.name ?? '',
        t.warehouses?.name ?? '',
        t.warehouses?.locations?.name ?? '',
        (t.type === 'IN' ? 1 : -1) * (t.quantity ?? 0),
        t.note ?? '',
      ])
      const csv = [headers, ...rows]
        .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stok-rapor-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setTimeout(() => window.open('https://sheets.new', '_blank'), 400)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Raporlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Son 500 işlem · {filtered.length} sonuç gösteriliyor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-all ${showFilters ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtreler
            {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-sky-400" />}
          </button>
          <button
            onClick={exportExcel}
            disabled={exporting !== null || filtered.length === 0}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'İndiriliyor...' : 'Excel'}
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting !== null || filtered.length === 0}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            {exporting === 'pdf' ? 'İndiriliyor...' : 'PDF'}
          </button>
          <button
            onClick={exportGoogleSheets}
            disabled={exporting !== null || filtered.length === 0}
            title="CSV indirir ve Google Sheets açar — Dosya > İçe Aktar ile yükleyin"
            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-blue-400 text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            {exporting === 'sheets' ? 'Hazırlanıyor...' : 'Google Sheets'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Filtrele</p>
            {hasActiveFilter && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3 h-3" /> Temizle
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <DateInput label="Başlangıç Tarihi" value={dateFrom} onChange={v => setDateFrom(v)} />
            <DateInput label="Bitiş Tarihi" value={dateTo} onChange={v => setDateTo(v)} />

            {locations.length > 0 && (
              <SelectFilter label="Lokasyon" value={locationId} onChange={v => { setLocationId(v); setWarehouseId(EMPTY) }}>
                <option value="">Tüm Lokasyonlar</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </SelectFilter>
            )}

            {warehouses.length > 0 && (
              <SelectFilter label="Depo" value={warehouseId} onChange={setWarehouseId}>
                <option value="">Tüm Depolar</option>
                {availableWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </SelectFilter>
            )}

            {products.length > 0 && (
              <SelectFilter label="Ürün" value={productId} onChange={setProductId}>
                <option value="">Tüm Ürünler</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectFilter>
            )}

            <SelectFilter label="İşlem Türü" value={typeFilter} onChange={v => setTypeFilter(v as 'ALL' | 'IN' | 'OUT')}>
              <option value="ALL">Giriş & Çıkış</option>
              <option value="IN">Sadece Giriş</option>
              <option value="OUT">Sadece Çıkış</option>
            </SelectFilter>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Giriş</p>
            <p className="text-2xl font-bold text-emerald-400">{filteredIn.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Çıkış</p>
            <p className="text-2xl font-bold text-red-400">{filteredOut.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Net</p>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
              {net >= 0 ? '+' : ''}{net.toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Bu filtrelere uyan işlem bulunamadı</p>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="mt-3 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs text-slate-500">
              {filtered.length} işlem
              {hasActiveFilter && <span className="ml-1 text-sky-500">· filtre uygulandı</span>}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Tarih</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Tür</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Depo / Lokasyon</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Miktar</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Not</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${t.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {t.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {t.type === 'IN' ? 'Giriş' : 'Çıkış'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{t.products?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300">{t.warehouses?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{t.warehouses?.locations?.name ?? ''}</p>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'IN' ? '+' : '-'}{(t.quantity ?? 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
