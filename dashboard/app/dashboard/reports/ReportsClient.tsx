'use client'
import React, { useState, useMemo } from 'react'
import {
  Package, Warehouse, AlertTriangle, CheckCircle2,
  FileSpreadsheet, Download, ChevronDown, SlidersHorizontal, X,
} from 'lucide-react'

interface InvRow {
  quantity: number
  products: { id: string; name: string; unit: string; critical_stock_level: number } | null
  warehouses: { id: string; name: string; location_id: string | null; locations: { id: string; name: string } | null } | null
}
interface Location { id: string; name: string }
interface Warehouse { id: string; name: string; location_id: string | null }

interface Props {
  inventoryRows: InvRow[]
  locations: Location[]
  warehouses: Warehouse[]
}

interface ProductStock {
  id: string
  name: string
  unit: string
  criticalLevel: number
  isCritical: boolean
  warehouses: { warehouseId: string; warehouseName: string; locationId: string | null; locationName: string; qty: number; isCritical: boolean }[]
}

function SelectFilter({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 pr-8 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer">
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      </div>
    </div>
  )
}

export default function ReportsClient({ inventoryRows, locations, warehouses }: Props) {
  const [locationId, setLocationId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'NORMAL'>('ALL')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  const availableWarehouses = useMemo(
    () => locationId ? warehouses.filter(w => w.location_id === locationId) : warehouses,
    [locationId, warehouses]
  )

  const productMap = useMemo<Record<string, ProductStock>>(() => {
    const map: Record<string, ProductStock> = {}
    for (const row of inventoryRows) {
      if (!row.products || !row.warehouses) continue
      const p = row.products
      const w = row.warehouses

      if (!map[p.id]) {
        map[p.id] = {
          id: p.id, name: p.name, unit: p.unit || 'adet',
          criticalLevel: p.critical_stock_level ?? 0,
          isCritical: false, warehouses: [],
        }
      }
      const whIsCritical = (p.critical_stock_level ?? 0) > 0 && row.quantity <= (p.critical_stock_level ?? 0)
      map[p.id].warehouses.push({
        warehouseId: w.id,
        warehouseName: w.name,
        locationId: w.location_id,
        locationName: w.locations?.name ?? '—',
        qty: row.quantity,
        isCritical: whIsCritical,
      })
    }
    for (const ps of Object.values(map)) {
      ps.isCritical = ps.warehouses.some(w => w.isCritical)
    }
    return map
  }, [inventoryRows])

  const filtered = useMemo(() => {
    return Object.values(productMap).filter(ps => {
      if (statusFilter === 'CRITICAL' && !ps.isCritical) return false
      if (statusFilter === 'NORMAL' && ps.isCritical) return false

      if (locationId || warehouseId) {
        const hasMatch = ps.warehouses.some(w =>
          (!locationId || w.locationId === locationId) &&
          (!warehouseId || w.warehouseId === warehouseId)
        )
        if (!hasMatch) return false
      }
      return true
    }).map(ps => {
      if (!locationId && !warehouseId) return ps
      const filteredWhs = ps.warehouses.filter(w =>
        (!locationId || w.locationId === locationId) &&
        (!warehouseId || w.warehouseId === warehouseId)
      )
      const filteredIsCritical = filteredWhs.some(w => w.isCritical)
      return { ...ps, warehouses: filteredWhs, isCritical: filteredIsCritical }
    }).sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1
      if (!a.isCritical && b.isCritical) return 1
      return a.name.localeCompare(b.name, 'tr')
    })
  }, [productMap, locationId, warehouseId, statusFilter])

  const totalProducts = filtered.length
  const totalStock = filtered.reduce((s, p) => s + p.warehouses.reduce((ws, w) => ws + w.qty, 0), 0)
  const criticalCount = useMemo(
    () => filtered.reduce((s, p) => s + p.warehouses.filter(w => w.isCritical).length, 0),
    [filtered]
  )
  const activeWarehouseCount = useMemo(() => {
    const ids = new Set<string>()
    for (const row of inventoryRows) if (row.warehouses) ids.add(row.warehouses.id)
    return ids.size
  }, [inventoryRows])

  const hasActiveFilter = locationId || warehouseId || statusFilter !== 'ALL'

  function resetFilters() {
    setLocationId(''); setWarehouseId(''); setStatusFilter('ALL')
  }

  async function exportExcel() {
    setExporting('excel')
    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Stok Kontrol'
      wb.created = new Date()

      const ws = wb.addWorksheet('Stok Durumu')
      ws.columns = [
        { header: 'Ürün', key: 'urun', width: 28 },
        { header: 'Birim', key: 'birim', width: 10 },
        { header: 'Depo', key: 'depo', width: 22 },
        { header: 'Lokasyon', key: 'lokasyon', width: 20 },
        { header: 'Depo Stoğu', key: 'depo_stok', width: 14 },
        { header: 'Kritik Seviye', key: 'kritik_seviye', width: 14 },
        { header: 'Durum', key: 'durum', width: 12 },
      ]
      ws.getRow(1).font = { bold: true }

      for (const ps of filtered) {
        if (ps.warehouses.length === 0) {
          ws.addRow({
            urun: ps.name, birim: ps.unit,
            depo: '—', lokasyon: '—', depo_stok: 0,
            kritik_seviye: ps.criticalLevel || '—',
            durum: ps.isCritical ? 'KRİTİK' : 'Normal',
          })
        } else {
          for (const w of ps.warehouses) {
            ws.addRow({
              urun: ps.name, birim: ps.unit,
              depo: w.warehouseName, lokasyon: w.locationName, depo_stok: w.qty,
              kritik_seviye: ps.criticalLevel || '—',
              durum: w.isCritical ? 'KRİTİK' : 'Normal',
            })
          }
        }
      }

      ws.eachRow((row, i) => {
        if (i === 1) return
        const durum = row.getCell('durum').value
        if (durum === 'KRİTİK') {
          row.getCell('durum').font = { color: { argb: 'FFF87171' }, bold: true }
          row.getCell('depo_stok').font = { color: { argb: 'FFF87171' }, bold: true }
        }
      })

      const ws2 = wb.addWorksheet('Özet')
      ws2.addRows([
        ['Toplam Ürün Çeşidi', totalProducts],
        ['Toplam Stok Miktarı', totalStock],
        ['Kritik Stok Sayısı', criticalCount],
        ['Aktif Depo Sayısı', activeWarehouseCount],
        ['Rapor Tarihi', new Date().toLocaleString('tr-TR')],
      ])

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stok-rapor-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
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
      doc.text('Stok Kontrol - Depo Raporu', 14, 16)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`, 14, 23)
      doc.text(
        `Ürün: ${totalProducts}  |  Toplam Envanter: ${totalStock.toLocaleString('tr-TR')}  |  Kritik: ${criticalCount}  |  Depo: ${activeWarehouseCount}`,
        14, 28,
      )

      autoTable(doc, {
        startY: 34,
        head: [['Ürün', 'Birim', 'Depo', 'Lokasyon', 'Depo Stoğu', 'Kritik Seviye', 'Durum']],
        body: filtered.flatMap(ps =>
          ps.warehouses.length === 0
            ? [[ps.name, ps.unit, '—', '—', '0', ps.criticalLevel || '—', ps.isCritical ? 'KRİTİK' : 'Normal']]
            : ps.warehouses.map(w => [
                ps.name, ps.unit,
                w.warehouseName, w.locationName, w.qty.toLocaleString('tr-TR'),
                ps.criticalLevel || '—',
                w.isCritical ? 'KRİTİK' : 'Normal',
              ])
        ),
        headStyles: { fillColor: [15, 23, 42], textColor: [148, 163, 184], fontStyle: 'bold', fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [226, 232, 240] },
        alternateRowStyles: { fillColor: [15, 23, 42] },
        styles: { fillColor: [30, 41, 59], lineColor: [51, 65, 85], lineWidth: 0.1 },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'KRİTİK') {
              data.cell.styles.textColor = [248, 113, 113]
              data.cell.styles.fontStyle = 'bold'
            }
          }
          if (data.section === 'body' && data.column.index === 4) {
            const flatRows = filtered.flatMap(ps =>
              ps.warehouses.length === 0 ? [{ isCritical: ps.isCritical }] : ps.warehouses.map(w => ({ isCritical: w.isCritical }))
            )
            if (flatRows[data.row.index]?.isCritical) data.cell.styles.textColor = [248, 113, 113]
          }
        },
        columnStyles: {
          0: { cellWidth: 45 }, 1: { cellWidth: 13 }, 2: { cellWidth: 40 },
          3: { cellWidth: 35 }, 4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      })

      const pages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(`Sayfa ${i} / ${pages}`, doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 6, { align: 'center' })
      }

      doc.save(`stok-rapor-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Stok Raporu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Güncel depo ve stok durumu</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {/* Filters */}
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
            {locations.length > 0 && (
              <SelectFilter label="Lokasyon" value={locationId} onChange={v => { setLocationId(v); setWarehouseId('') }}>
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
            <SelectFilter label="Stok Durumu" value={statusFilter} onChange={v => setStatusFilter(v as any)}>
              <option value="ALL">Tümü</option>
              <option value="CRITICAL">Yalnızca Kritik</option>
              <option value="NORMAL">Yalnızca Normal</option>
            </SelectFilter>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Ürün Çeşidi</p>
            <p className="text-2xl font-bold text-sky-400">{totalProducts.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Envanter</p>
            <p className="text-2xl font-bold text-emerald-400">{totalStock.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${criticalCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-500/10 border border-slate-500/20'}`}>
            <AlertTriangle className={`w-5 h-5 ${criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Kritik Stok</p>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{criticalCount}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Aktif Depo</p>
            <p className="text-2xl font-bold text-purple-400">{activeWarehouseCount}</p>
          </div>
        </div>
      </div>

      {/* Critical stock banner */}
      {criticalCount > 0 && statusFilter !== 'NORMAL' && (
        <div className="glass border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Kritik Stok Uyarısı — {criticalCount} depo-ürün eşiğin altında</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filtered.filter(p => p.isCritical).flatMap(p =>
              p.warehouses.filter(w => w.isCritical).map(w => (
                <span key={`${p.id}-${w.warehouseId}`} className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-red-500/60">·</span>
                  <span className="text-red-400/80">{w.warehouseName}</span>
                  <span className="text-red-500/60">·</span>
                  <span>{w.qty} / min {p.criticalLevel} {p.unit}</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Product stock table */}
      {filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Bu filtrelere uyan ürün bulunamadı</p>
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
              {filtered.length} ürün çeşidi
              {hasActiveFilter && <span className="ml-1 text-sky-500">· filtre uygulandı</span>}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ürün</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Birim</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Kritik Seviye</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Durum</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Depo Stokları</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ps => (
                  <React.Fragment key={ps.id}>
                    <tr
                      onClick={() => setExpandedProduct(expandedProduct === ps.id ? null : ps.id)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${ps.isCritical ? 'hover:bg-red-500/5 bg-red-500/3' : 'hover:bg-white/2'}`}
                    >
                      <td className="px-4 py-3">
                        <p className={`font-medium ${ps.isCritical ? 'text-red-300' : 'text-slate-200'}`}>{ps.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{ps.unit}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {ps.criticalLevel > 0 ? ps.criticalLevel.toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ps.isCritical ? (
                          <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400">
                            <AlertTriangle className="w-3 h-3" /> Kritik
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ps.warehouses.slice(0, 3).map(w => (
                            <span key={w.warehouseId} className={`text-xs rounded-lg px-2 py-0.5 border ${w.isCritical ? 'text-red-300 bg-red-500/10 border-red-500/25' : 'text-slate-400 bg-white/5 border-white/10'}`}>
                              {w.warehouseName} <span className={w.isCritical ? 'text-red-500/50' : 'text-slate-600'}>·</span> <span className={`font-medium ${w.isCritical ? 'text-red-400' : 'text-slate-300'}`}>{w.qty.toLocaleString('tr-TR')}</span>
                            </span>
                          ))}
                          {ps.warehouses.length > 3 && (
                            <span className="text-xs text-slate-500">+{ps.warehouses.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedProduct === ps.id && ps.warehouses.length > 0 && (
                      <tr className="border-b border-white/5 bg-white/2">
                        <td colSpan={5} className="px-6 py-3">
                          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Depo Bazlı Dağılım</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {ps.warehouses.map(w => (
                              <div key={w.warehouseId} className={`border rounded-xl px-3 py-2 ${w.isCritical ? 'bg-red-500/5 border-red-500/20' : 'bg-white/3 border-white/8'}`}>
                                <p className={`text-xs font-medium flex items-center gap-1 ${w.isCritical ? 'text-red-300' : 'text-slate-300'}`}>
                                  {w.isCritical && <AlertTriangle className="w-3 h-3" />}
                                  {w.warehouseName}
                                </p>
                                <p className="text-xs text-slate-500">{w.locationName}</p>
                                <p className={`text-base font-bold mt-1 ${w.isCritical ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {w.qty.toLocaleString('tr-TR')} <span className="text-xs font-normal text-slate-500">{ps.unit}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
