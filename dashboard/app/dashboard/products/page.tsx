export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import ProductsClient from './ProductsClient'

export default async function ProductsPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const sa = isSuperAdmin(caller)
  const locationId = caller.locationId ?? ''
  const canManage = ['super_admin', 'admin'].includes(caller.role)

  const [prodRes, invRes] = await Promise.all([
    supabase.from('products').select('id, name, barcode, unit, critical_stock_level, image_url, description').order('name'),

    sa
      ? supabase.from('inventory').select('product_id, warehouse_id, quantity, warehouses!inner(id, name)')
      : supabase.from('inventory').select('product_id, warehouse_id, quantity, warehouses!inner(id, name, location_id)').eq('warehouses.location_id', locationId),
  ])

  const allProducts = (prodRes.data ?? []) as any[]
  const inventory = (invRes.data ?? []) as any[]

  // For non-admin: filter products to only those that have inventory in their location
  const products = sa
    ? allProducts
    : (() => {
        const ids = new Set(inventory.map((r: any) => r.product_id))
        return allProducts.filter((p: any) => ids.has(p.id))
      })()

  return (
    <ProductsClient
      products={products}
      inventory={inventory}
      canManage={canManage}
    />
  )
}
