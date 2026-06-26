'use client'
import { useState } from 'react'
import { FileText, TrendingUp, TrendingDown, FileSpreadsheet, Download, Filter, ChevronDown } from 'lucide-react'

interface Transaction {
  id: string
  type: string
  quantity: number
  note: string | null
  created_at: string
  products: { name: string } | null
  warehouses: { name: string; locations: { name: string } | null } | null
}

interface Props {
  transactions: Transaction[]
  totalIn: number
  totalOut: number
}

export default function ReportsClient({ transactions, totalIn, totalOut }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.type === filter)

  async function exportExcel() {
    setExporting('excel')
    try {
      const XLSX = await import('xlsx')
      const rows = filtered.map(t => ({
        'Tarih': new Date(t.created_at).toLocaleString('tr-TR'),
        'Tür': t.type === 'IN' ? 'Giriş' : 'Çıkış',
        'Ürün': t.products?.name ?? '',
        'Depo': t.warehouses?.name ?? '',
        'Lokasyon': t.warehouses?.locations?.name ?? '',
        'Miktar': t.type === 'IN' ? t.quantity : -t.quantity,
        'Not': t.note ?? '',
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)

      ws['!cols'] = [
        { wch: 20 }, { wch: 8 }, { wch: 22 }, { wch: 18 },
        { wch: 18 }, { wch: 10 }, { wch: 30 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'İşlemler')

      const summary = XLSX.utils.aoa_to_sheet([
        ['Özet'],
        ['Toplam Giriş', totalIn],
        ['Toplam Çıkış', totalOut],
        ['Net', totalIn - totalOut],
        ['Filtre', filter === 'ALL' ? 'Tümü' : filter === 'IN' ? 'Sadece Giriş' : 'Sadece Çıkış'],
        ['Oluşturulma', new Date().toLocaleString('tr-TR')],
      ])
      XLSX.utils.book_append_sheet(wb, summary, 'Özet')

      const tarih = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      XLSX.writeFile(wb, `stok-rapor-${tarih}.xlsx`)
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
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, 14, 23)
      doc.text(
        `Filtre: ${filter === 'ALL' ? 'Tümü' : filter === 'IN' ? 'Sadece Giriş' : 'Sadece Çıkış'}   |   Toplam Giriş: ${totalIn.toLocaleString('tr-TR')}   |   Toplam Çıkış: ${totalOut.toLocaleString('tr-TR')}   |   Net: ${(totalIn - totalOut).toLocaleString('tr-TR')}`,
        14, 29
      )

      autoTable(doc, {
        startY: 34,
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
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [148, 163, 184],
          fontStyle: 'bold',
          fontSize: 8,
        },
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
          0: { cellWidth: 35 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 40 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      })

      const pages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(
          `Sayfa ${i} / ${pages}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        )
      }

      const tarih = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      doc.save(`stok-rapor-${tarih}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Raporlar</h1>
          <p className="text-sm text-slate-500 mt-1">Son 100 işlem</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as 'ALL' | 'IN' | 'OUT')}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">Tümü</option>
              <option value="IN">Sadece Giriş</option>
              <option value="OUT">Sadece Çıkış</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Giriş</p>
            <p className="text-2xl font-bold text-emerald-400">{totalIn.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Toplam Çıkış</p>
            <p className="text-2xl font-bold text-red-400">{totalOut.toLocaleString('tr-TR')}</p>
          </div>
        </div>
        <div className="glass p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Net</p>
            <p className={`text-2xl font-bold ${totalIn - totalOut >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
              {(totalIn - totalOut >= 0 ? '+' : '')}{(totalIn - totalOut).toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Gösterilecek işlem yok</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} işlem gösteriliyor</p>
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
