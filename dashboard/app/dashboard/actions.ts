'use server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import { revalidatePath } from 'next/cache'

function uid() { return crypto.randomUUID() }

async function requireManager() {
  const caller = await getCallerContext()
  if (!['super_admin', 'admin'].includes(caller.role)) throw new Error('Yetkisiz erişim')
  return { caller, sa: isSuperAdmin(caller), db: createServerSupabase() }
}

async function requireStaff() {
  const caller = await getCallerContext()
  if (!['super_admin', 'admin', 'chef'].includes(caller.role)) throw new Error('Yetkisiz erişim')
  return { caller, sa: isSuperAdmin(caller), db: createServerSupabase() }
}

// ─── LOCATIONS (super_admin only) ─────────────────────────────────────────────

export async function createLocation(fd: FormData) {
  const { sa, db } = await requireManager()
  if (!sa) throw new Error('Sadece süper admin lokasyon ekleyebilir')
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Lokasyon adı zorunlu')
  const { error } = await db.from('locations').insert({
    name,
    city: String(fd.get('city') ?? '').trim(),
    description: String(fd.get('description') ?? '').trim(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/locations')
}

export async function updateLocation(id: string, fd: FormData) {
  const { sa, db } = await requireManager()
  if (!sa) throw new Error('Sadece süper admin lokasyon düzenleyebilir')
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Lokasyon adı zorunlu')
  const { error } = await db.from('locations').update({
    name,
    city: String(fd.get('city') ?? '').trim(),
    description: String(fd.get('description') ?? '').trim(),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/locations')
}

export async function deleteLocation(id: string) {
  const { sa, db } = await requireManager()
  if (!sa) throw new Error('Sadece süper admin lokasyon silebilir')
  const { error } = await db.from('locations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/locations')
}

// ─── WAREHOUSES ───────────────────────────────────────────────────────────────

export async function createWarehouse(fd: FormData) {
  const { caller, sa, db } = await requireManager()
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Depo adı zorunlu')
  const locationId = sa
    ? String(fd.get('location_id') ?? '').trim()
    : (caller.locationId ?? '')
  if (!locationId) throw new Error('Lokasyon seçimi zorunlu')
  const { error } = await db.from('warehouses').insert({
    id: uid(),
    name,
    description: String(fd.get('description') ?? '').trim(),
    location_id: locationId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/warehouses')
}

export async function updateWarehouse(id: string, fd: FormData) {
  const { caller, sa, db } = await requireManager()
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Depo adı zorunlu')
  const update: Record<string, unknown> = {
    name,
    description: String(fd.get('description') ?? '').trim(),
  }
  if (sa) {
    const lid = String(fd.get('location_id') ?? '').trim()
    if (lid) update.location_id = lid
  }
  const { error } = await db.from('warehouses').update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/warehouses')
}

export async function deleteWarehouse(id: string) {
  const { db } = await requireManager()
  const { error } = await db.from('warehouses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/warehouses')
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function createProduct(fd: FormData) {
  const { db } = await requireManager()
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Ürün adı zorunlu')
  const { error } = await db.from('products').insert({
    id: uid(),
    name,
    barcode: String(fd.get('barcode') ?? '').trim(),
    unit: String(fd.get('unit') ?? 'adet'),
    critical_stock_level: Math.max(0, parseInt(String(fd.get('critical_stock_level') ?? '0'), 10) || 0),
    image_url: String(fd.get('image_url') ?? '').trim(),
    description: String(fd.get('description') ?? '').trim(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function updateProduct(id: string, fd: FormData) {
  const { db } = await requireManager()
  const name = String(fd.get('name') ?? '').trim()
  if (!name) throw new Error('Ürün adı zorunlu')
  const { error } = await db.from('products').update({
    name,
    barcode: String(fd.get('barcode') ?? '').trim(),
    unit: String(fd.get('unit') ?? 'adet'),
    critical_stock_level: Math.max(0, parseInt(String(fd.get('critical_stock_level') ?? '0'), 10) || 0),
    image_url: String(fd.get('image_url') ?? '').trim(),
    description: String(fd.get('description') ?? '').trim(),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function deleteProduct(id: string) {
  const { db } = await requireManager()
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function createTransaction(fd: FormData) {
  const { db } = await requireStaff()
  const product_id = String(fd.get('product_id') ?? '').trim()
  const warehouse_id = String(fd.get('warehouse_id') ?? '').trim()
  const quantity = parseInt(String(fd.get('quantity') ?? '0'), 10)
  const type = String(fd.get('type') ?? '')
  if (!product_id || !warehouse_id) throw new Error('Ürün ve depo seçimi zorunlu')
  if (!['IN', 'OUT'].includes(type)) throw new Error('İşlem tipi geçersiz')
  if (!quantity || quantity <= 0) throw new Error('Miktar 0\'dan büyük olmalı')
  const { error } = await db.from('transactions').insert({
    id: uid(),
    product_id,
    warehouse_id,
    quantity,
    type,
    note: String(fd.get('note') ?? '').trim(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/products')
}
