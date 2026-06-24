'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props { data: { name: string; value: number }[] }

const COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass p-3 text-xs">
      <p className="font-semibold text-slate-200">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{payload[0].value} işlem</p>
    </div>
  )
}

export default function StaffDonutChart({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Veri yok</div>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="45%" innerRadius="55%" outerRadius="75%" dataKey="value" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}
