export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import TransactionsClient from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const sa = isSuperAdmin(caller)
  const locationId = caller.locationId ?? ''
  const canCreate = ['super_admin', 'admin', 'chef'].includes(caller.role)

  const [prodRes, whRes, txnRes] = await Promise.all([
    supabase.from('products').select('id, name, unit').order('name'),

    sa
      ? supabase.from('warehouses').select('id, name, location_id').order('name')
      : supabase.from('warehouses').select('id, name, location_id').eq('location_id', locationId).order('name'),

    sa
      ? supabase
          .from('transactions')
          .select('id, type, quantity, note, created_at, products!inner(name, unit), warehouses!inner(name, locations(name))')
          .order('created_at', { ascending: false })
          .limit(200)
      : supabase
          .from('transactions')
          .select('id, type, quantity, note, created_at, products!inner(name, unit), warehouses!inner(name, locations(name))')
          .eq('warehouses.location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(200),
  ])

  return (
    <TransactionsClient
      products={(prodRes.data ?? []) as any[]}
      warehouses={(whRes.data ?? []) as any[]}
      transactions={(txnRes.data ?? []) as any[]}
      canCreate={canCreate}
    />
  )
}
