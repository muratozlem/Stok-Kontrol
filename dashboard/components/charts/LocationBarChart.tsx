'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props { data: { name: string; giris: number; cikis: number }[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name === 'giris' ? '↑ Giriş' : '↓ Çıkış'}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function LocationBarChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Veri yok</div>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend formatter={(v) => <span className="text-xs text-slate-400">{v === 'giris' ? 'Giriş' : 'Çıkış'}</span>} />
        <Bar dataKey="giris" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="cikis" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
