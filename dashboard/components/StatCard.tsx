import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'red'
  subtitle?: string
}

const colorMap = {
  blue: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', glow: 'shadow-[0_0_30px_rgba(56,189,248,0.15)]' },
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
  yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={`glass p-6 flex items-start gap-4 ${c.glow} hover:scale-[1.02] transition-transform duration-200`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
