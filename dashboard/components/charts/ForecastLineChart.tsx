'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props { data: { date: string; actual?: number; forecast?: number }[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'actual' ? 'Gerçek' : 'Tahmin'}: <span className="font-bold">{p.value?.toFixed(0)}</span>
        </p>
      ))}
    </div>
  )
}

export default function ForecastLineChart({ data }: Props) {
  const todayIdx = data.findIndex(d => d.forecast !== undefined && d.actual === undefined)
  const todayLabel = todayIdx >= 0 ? data[todayIdx]?.date : undefined
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {todayLabel && <ReferenceLine x={todayLabel} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'Bugün', fill: '#64748b', fontSize: 10 }} />}
        <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
