export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createServerSupabase()

  const { data: txns } = await supabase
    .from('transactions')
    .select('id, type, quantity, note, created_at, products!inner(name), warehouses!inner(name, locations!inner(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  const transactions = (txns ?? []) as any[]
  const totalIn = transactions.filter(t => t.type === 'IN').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0)
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0)

  return <ReportsClient transactions={transactions} totalIn={totalIn} totalOut={totalOut} />
}
