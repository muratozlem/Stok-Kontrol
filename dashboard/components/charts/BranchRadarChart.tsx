'use client'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Props { data: { subject: string; [key: string]: any }[]; branches: string[] }

const COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function BranchRadarChart({ data, branches }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
        {branches.map((b, i) => (
          <Radar key={b} name={b} dataKey={b} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  )
}
