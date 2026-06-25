'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Sidebar from '@/components/Sidebar'

const WATCHED_TABLES = ['inventory', 'transactions', 'products', 'locations', 'warehouses']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userData, setUserData] = useState<{ email: string; role: string } | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
        await supabase.auth.signOut()
        router.replace('/')
        return
      }
      setUserData({ email: user.email ?? '', role: profile.role })
      setReady(true)

      const channel = supabase.channel('dashboard-realtime')
      WATCHED_TABLES.forEach((table) => {
        channel.on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table },
          () => { router.refresh() },
        )
      })
      channel.subscribe()
      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current)
      }
    }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar userEmail={userData!.email} userRole={userData!.role} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
