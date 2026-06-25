import { BarChart3 } from 'lucide-react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="glass p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto">
            <BarChart3 className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Stok Kontrol</h1>
          <p className="text-sm text-slate-500">Yönetim Paneli</p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-slate-600">Sadece Süper Admin ve Admin girişi yapabilir</p>
      </div>
    </div>
  )
}
