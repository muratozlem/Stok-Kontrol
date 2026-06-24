'use client'
import { useState } from 'react'
import { Download, Sheet, FileSpreadsheet, Copy, CheckCheck } from 'lucide-react'

interface Props {
  inventory: any[]
  transactions: any[]
  products: any[]
  warehouses: any[]
}

export default function ReportsClient({ inventory, transactions, products, warehouses }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function downloadExcel(type: 'inventory' | 'transactions') {
    setLoading(type)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Stok Kontrol Dashboard'
      wb.created = new Date()

      if (type === 'inventory') {
        const ws = wb.addWorksheet('Envanter')
        ws.columns = [
          { header: 'Ürün Adı', key: 'product', width: 30 },
          { header: 'SKU', key: 'sku', width: 15 },
          { header: 'Depo', key: 'warehouse', width: 25 },
          { header: 'Şube', key: 'location', width: 20 },
          { header: 'Miktar', key: 'quantity', width: 12 },
          { header: 'Min. Stok', key: 'min_quantity', width: 12 },
          { header: 'Durum', key: 'status', width: 15 },
        ]
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
        for (const r of inventory) {
          const qty = r.quantity ?? 0
          const min = r.products?.min_quantity ?? 0
          ws.addRow({
            product: r.products?.name,
            sku: r.products?.sku,
            warehouse: r.warehouses?.name,
            location: r.warehouses?.locations?.name,
            quantity: qty,
            min_quantity: min,
            status: qty === 0 ? 'Tükendi' : qty <= min ? 'Kritik' : 'Normal',
          })
        }
        ws.autoFilter = { from: 'A1', to: 'G1' }
        const buf = await wb.xlsx.writeBuffer()
        downloadBuffer(buf, 'envanter.xlsx')
      } else {
        const ws = wb.addWorksheet('İşlemler')
        ws.columns = [
          { header: 'Tarih', key: 'date', width: 20 },
          { header: 'Tür', key: 'type', width: 10 },
          { header: 'Ürün', key: 'product', width: 30 },
          { header: 'Miktar', key: 'quantity', width: 12 },
          { header: 'Depo', key: 'warehouse', width: 25 },
          { header: 'Personel', key: 'staff', width: 25 },
          { header: 'Notlar', key: 'notes', width: 35 },
        ]
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
        for (const t of transactions) {
          ws.addRow({
            date: new Date(t.created_at).toLocaleString('tr-TR'),
            type: t.type === 'IN' ? 'Giriş' : 'Çıkış',
            product: t.products?.name,
            quantity: t.quantity,
            warehouse: t.warehouses?.name,
            staff: t.profiles?.username,
            notes: t.notes ?? '',
          })
        }
        ws.autoFilter = { from: 'A1', to: 'G1' }
        const buf = await wb.xlsx.writeBuffer()
        downloadBuffer(buf, 'islemler.xlsx')
      }
    } finally {
      setLoading(null)
    }
  }

  function downloadBuffer(buf: ArrayBuffer, filename: string) {
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function copyForSheets() {
    const rows = inventory.map(r => [
      r.products?.name ?? '',
      r.products?.sku ?? '',
      r.warehouses?.name ?? '',
      r.warehouses?.locations?.name ?? '',
      r.quantity ?? 0,
      r.products?.min_quantity ?? 0,
      (r.quantity ?? 0) === 0 ? 'Tükendi' : (r.quantity ?? 0) <= (r.products?.min_quantity ?? 0) ? 'Kritik' : 'Normal',
    ].join('\t')).join('\n')
    const header = 'Ürün Adı\tSKU\tDepo\tŞube\tMiktar\tMin. Stok\tDurum\n'
    await navigator.clipboard.writeText(header + rows)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const cards = [
    { title: 'Envanter Raporu', desc: `${inventory.length} ürün satırı`, type: 'inventory' as const, color: 'sky' },
    { title: 'İşlem Geçmişi', desc: `Son ${transactions.length} işlem`, type: 'transactions' as const, color: 'emerald' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(c => (
          <div key={c.type} className="glass p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-200">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
              </div>
              <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            </div>
            <button
              onClick={() => downloadExcel(c.type)}
              disabled={!!loading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full justify-center
                ${c.color === 'sky'
                  ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}
                disabled:opacity-50`}
            >
              {loading === c.type ? (
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : <Download className="w-4 h-4" />}
              Excel İndir (.xlsx)
            </button>
          </div>
        ))}
      </div>

      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Sheet className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-slate-200">Google Sheets ile Canlı İzle</h3>
            <p className="text-xs text-slate-500 mt-0.5">Envanter verisini panoya kopyalayın, Google Sheets'e yapıştırın</p>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 text-xs text-slate-500 space-y-2">
          <p className="font-medium text-slate-400">Adımlar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Aşağıdaki butona tıklayarak veriyi panoya kopyalayın</li>
            <li>Google Sheets'te yeni bir sayfa açın</li>
            <li>A1 hücresine tıklayın ve Ctrl+V ile yapıştırın</li>
          </ol>
        </div>
        <button
          onClick={copyForSheets}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
        >
          {copied ? <><CheckCheck className="w-4 h-4" /> Kopyalandı!</> : <><Copy className="w-4 h-4" /> Envanter Verisini Kopyala</>}
        </button>
      </div>

      <div className="glass p-6">
        <h3 className="font-semibold text-slate-200 mb-4">Kritik Stok Özeti</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium">Ürün</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium">Depo</th>
                <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Mevcut</th>
                <th className="text-right py-2 px-3 text-xs text-slate-500 font-medium">Min.</th>
                <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inventory
                .filter(r => (r.quantity ?? 0) <= (r.products?.min_quantity ?? 0))
                .sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0))
                .slice(0, 20)
                .map((r, i) => (
                  <tr key={i} className="hover:bg-white/2">
                    <td className="py-2.5 px-3 text-slate-300">{r.products?.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{r.warehouses?.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-red-400">{r.quantity ?? 0}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-500">{r.products?.min_quantity ?? 0}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(r.quantity ?? 0) === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {(r.quantity ?? 0) === 0 ? 'Tükendi' : 'Kritik'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {inventory.filter(r => (r.quantity ?? 0) <= (r.products?.min_quantity ?? 0)).length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">Kritik stok yok 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}
