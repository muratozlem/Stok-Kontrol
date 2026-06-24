import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="glass p-12 text-center max-w-md space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">403</h1>
          <p className="text-slate-300 font-medium mt-1">Erişim Reddedildi</p>
          <p className="text-slate-500 text-sm mt-3">Bu panele erişim yetkiniz yok.</p>
        </div>
        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all text-sm font-medium">
          Giriş Sayfasına Dön
        </Link>
      </div>
    </div>
  )
}
