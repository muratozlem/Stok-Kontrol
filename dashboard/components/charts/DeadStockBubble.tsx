'use client'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props { data: { x: number; y: number; z: number; name: string }[] }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="glass p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-200">{d?.name}</p>
      <p className="text-slate-400">Son işlem: <span className="text-amber-400">{d?.x} gün önce</span></p>
      <p className="text-slate-400">Stok: <span className="text-sky-400">{d?.y}</span></p>
    </div>
  )
}

export default function DeadStockBubble({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Ölü stok yok</div>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis type="number" dataKey="x" name="Gün" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Son işlemden bu yana (gün)', fill: '#475569', fontSize: 10, position: 'insideBottom', offset: -5 }} />
        <YAxis type="number" dataKey="y" name="Stok" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <ZAxis type="number" dataKey="z" range={[40, 400]} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
        <Scatter data={data} fill="#f59e0b" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
