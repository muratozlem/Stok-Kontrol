import { createServerSupabase } from '@/lib/supabase-server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createServerSupabase()

  const [inventoryRes, txnRes, productsRes, warehousesRes] = await Promise.all([
    supabase.from('inventory').select('quantity, products!inner(name, sku, min_quantity), warehouses!inner(name, locations!inner(name))'),
    supabase.from('transactions').select('type, quantity, created_at, notes, products!inner(name), warehouses!inner(name), profiles!inner(username)').order('created_at', { ascending: false }).limit(500),
    supabase.from('products').select('*'),
    supabase.from('warehouses').select('*, locations!inner(name)'),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Raporlar</h1>
        <p className="text-slate-500 text-sm mt-1">Envanter ve işlem raporlarını indirin</p>
      </div>
      <ReportsClient
        inventory={inventoryRes.data ?? []}
        transactions={txnRes.data ?? []}
        products={productsRes.data ?? []}
        warehouses={warehousesRes.data ?? []}
      />
    </div>
  )
}
