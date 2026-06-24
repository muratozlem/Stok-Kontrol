import React, { useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Product, Warehouse, InventoryItem, Transaction, TransactionType, Location } from '@/types';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { maybeSendCriticalStockAlert } from '@/utils/criticalStockAlert';
import { useAuth } from '@/providers/AuthProvider';

async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  console.log('[Data] Fetching products from Supabase...');
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.log('[Data] Products fetch error:', error.message); return []; }

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? '',
      description: p.description ?? '',
      unit: p.unit ?? '',
      imageUrl: p.image_url ?? '',
      criticalStockLevel: p.critical_stock_level ?? 0,
      createdAt: p.created_at,
    }));
  } catch (e) {
    console.log('[Data] Products network error:', (e as Error).message);
    return [];
  }
}

async function fetchLocations(): Promise<Location[]> {
  if (!isSupabaseConfigured) return [];
  console.log('[Data] Fetching locations from Supabase...');
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.log('[Data] Locations fetch error:', error.message); return []; }

    return (data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      city: l.city ?? '',
      description: l.description ?? '',
      createdAt: l.created_at,
    }));
  } catch (e) {
    console.log('[Data] Locations network error:', (e as Error).message);
    return [];
  }
}

async function fetchWarehouses(): Promise<Warehouse[]> {
  if (!isSupabaseConfigured) return [];
  console.log('[Data] Fetching warehouses from Supabase...');
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.log('[Data] Warehouses fetch error:', error.message); return []; }

    return (data ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      location: w.location ?? '',
      locationId: w.location_id ?? null,
      description: w.description ?? '',
      createdAt: w.created_at,
    }));
  } catch (e) {
    console.log('[Data] Warehouses network error:', (e as Error).message);
    return [];
  }
}

async function fetchInventory(): Promise<InventoryItem[]> {
  if (!isSupabaseConfigured) return [];
  console.log('[Data] Fetching inventory from Supabase...');
  try {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) { console.log('[Data] Inventory fetch error:', error.message); return []; }
    return (data ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      warehouseId: i.warehouse_id,
      quantity: i.quantity ?? 0,
    }));
  } catch (e) {
    console.log('[Data] Inventory network error:', (e as Error).message);
    return [];
  }
}

async function fetchTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return [];
  console.log('[Data] Fetching transactions from Supabase...');
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.log('[Data] Transactions fetch error:', error.message); return []; }

    return (data ?? []).map((t) => ({
      id: t.id,
      productId: t.product_id,
      warehouseId: t.warehouse_id,
      quantity: t.quantity,
      type: t.type as TransactionType,
      note: t.note ?? '',
      createdAt: t.created_at,
    }));
  } catch (e) {
    console.log('[Data] Transactions network error:', (e as Error).message);
    return [];
  }
}

export const [DataProvider, useData] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { currentUser, isSuperAdmin } = useAuth();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        queryClient.invalidateQueries({ queryKey: ['warehouses'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    if (!isSupabaseConfigured) return () => { sub.remove(); };

    console.log('[Data] Setting up realtime subscriptions...');

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('public-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => {
          queryClient.invalidateQueries({ queryKey: ['warehouses'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        })
        .subscribe((status) => {
          console.log('[Realtime] subscription status:', status);
        });
    } catch (e) {
      console.log('[Realtime] subscribe error (ignored):', (e as Error)?.message ?? e);
    }

    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }, 8000);

    return () => {
      if (channel) { try { supabase.removeChannel(channel); } catch {} }
      sub.remove();
      clearInterval(pollInterval);
    };
  }, [queryClient]);

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const allLocations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);
  const allWarehouses = useMemo(() => warehousesQuery.data ?? [], [warehousesQuery.data]);
  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const allTransactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);

  const userLocationId = currentUser?.locationId ?? null;

  const warehouses = useMemo(() => {
    if (isSuperAdmin || !userLocationId) return allWarehouses;
    return allWarehouses.filter(w => !w.locationId || w.locationId === userLocationId);
  }, [allWarehouses, isSuperAdmin, userLocationId]);

  const warehouseIds = useMemo(() => new Set(warehouses.map(w => w.id)), [warehouses]);

  const transactions = useMemo(() => {
    if (isSuperAdmin || !userLocationId) return allTransactions;
    return allTransactions.filter(t => warehouseIds.has(t.warehouseId));
  }, [allTransactions, isSuperAdmin, userLocationId, warehouseIds]);

  const isLoading = productsQuery.isLoading || warehousesQuery.isLoading || inventoryQuery.isLoading || transactionsQuery.isLoading;

  const addProductMutation = useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          barcode: product.barcode,
          description: product.description,
          unit: product.unit,
          image_url: product.imageUrl,
          critical_stock_level: product.criticalStockLevel,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('[Data] Product added:', data.name);
      return {
        id: data.id, name: data.name, barcode: data.barcode ?? '',
        description: data.description ?? '', unit: data.unit ?? '',
        imageUrl: data.image_url ?? '', criticalStockLevel: data.critical_stock_level ?? 0,
        createdAt: data.created_at,
      } as Product;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Product> }) => {
      const dbData: Record<string, unknown> = {};
      if (updateData.name !== undefined) dbData.name = updateData.name;
      if (updateData.barcode !== undefined) dbData.barcode = updateData.barcode;
      if (updateData.description !== undefined) dbData.description = updateData.description;
      if (updateData.unit !== undefined) dbData.unit = updateData.unit;
      if (updateData.imageUrl !== undefined) dbData.image_url = updateData.imageUrl;
      if (updateData.criticalStockLevel !== undefined) dbData.critical_stock_level = updateData.criticalStockLevel;
      const { error } = await supabase.from('products').update(dbData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('transactions').delete().eq('product_id', id);
      await supabase.from('inventory').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async (loc: Omit<Location, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({ name: loc.name, city: loc.city, description: loc.description })
        .select()
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, city: data.city ?? '', description: data.description ?? '', createdAt: data.created_at } as Location;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Partial<Location> }) => {
      const dbData: Record<string, unknown> = {};
      if (d.name !== undefined) dbData.name = d.name;
      if (d.city !== undefined) dbData.city = d.city;
      if (d.description !== undefined) dbData.description = d.description;
      const { error } = await supabase.from('locations').update(dbData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const addWarehouseMutation = useMutation({
    mutationFn: async (warehouse: Omit<Warehouse, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          name: warehouse.name,
          location: warehouse.location,
          location_id: warehouse.locationId ?? null,
          description: warehouse.description,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id, name: data.name, location: data.location ?? '',
        locationId: data.location_id ?? null, description: data.description ?? '',
        createdAt: data.created_at,
      } as Warehouse;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses'] }); },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Warehouse> }) => {
      const dbData: Record<string, unknown> = {};
      if (updateData.name !== undefined) dbData.name = updateData.name;
      if (updateData.location !== undefined) dbData.location = updateData.location;
      if (updateData.locationId !== undefined) dbData.location_id = updateData.locationId;
      if (updateData.description !== undefined) dbData.description = updateData.description;
      const { error } = await supabase.from('warehouses').update(dbData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses'] }); },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('inventory').delete().eq('warehouse_id', id);
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const addStockTransactionMutation = useMutation({
    mutationFn: async ({
      productId, warehouseId, quantity, type, note,
    }: { productId: string; warehouseId: string; quantity: number; type: TransactionType; note: string; }) => {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({ product_id: productId, warehouse_id: warehouseId, quantity, type, note })
        .select()
        .single();

      if (txError) throw txError;

      const { data: existing } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (existing) {
        const newQty = type === 'IN'
          ? existing.quantity + quantity
          : Math.max(0, existing.quantity - quantity);
        await supabase.from('inventory').update({ quantity: newQty }).eq('id', existing.id);
      } else {
        await supabase.from('inventory').insert({
          product_id: productId, warehouse_id: warehouseId,
          quantity: type === 'IN' ? quantity : 0,
        });
      }

      try {
        const { data: invRows } = await supabase.from('inventory').select('quantity').eq('product_id', productId);
        const totalStock = (invRows ?? []).reduce((sum: number, r: { quantity: number }) => sum + (r.quantity ?? 0), 0);
        const [{ data: prod }, { data: whRow }] = await Promise.all([
          supabase.from('products').select('name, unit, critical_stock_level').eq('id', productId).maybeSingle(),
          supabase.from('warehouses').select('location_id').eq('id', warehouseId).maybeSingle(),
        ]);
        if (prod) {
          const criticalLevel = prod.critical_stock_level ?? 0;
          if (totalStock <= criticalLevel && criticalLevel > 0) {
            maybeSendCriticalStockAlert({
              productId,
              productName: String(prod.name ?? ''),
              unit: String(prod.unit ?? ''),
              totalStock,
              criticalLevel,
              locationId: (whRow as { location_id?: string | null } | null)?.location_id ?? null,
            }).catch((e) => console.log('[Data] alert error:', (e as Error).message));
          }
        }
      } catch (e) {
        console.log('[Data] Kritik stok kontrol hatası:', (e as Error).message);
      }

      return {
        id: txData.id, productId: txData.product_id, warehouseId: txData.warehouse_id,
        quantity: txData.quantity, type: txData.type as TransactionType,
        note: txData.note ?? '', createdAt: txData.created_at,
      } as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const clearAllDataMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('warehouses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addProduct = useCallback((product: Omit<Product, 'id' | 'createdAt'>) => addProductMutation.mutateAsync(product), [addProductMutation]);
  const updateProduct = useCallback((id: string, data: Partial<Product>) => updateProductMutation.mutate({ id, data }), [updateProductMutation]);
  const deleteProduct = useCallback((id: string) => deleteProductMutation.mutate(id), [deleteProductMutation]);
  const addLocation = useCallback((loc: Omit<Location, 'id' | 'createdAt'>) => addLocationMutation.mutateAsync(loc), [addLocationMutation]);
  const updateLocation = useCallback((id: string, data: Partial<Location>) => updateLocationMutation.mutate({ id, data }), [updateLocationMutation]);
  const deleteLocation = useCallback((id: string) => deleteLocationMutation.mutate(id), [deleteLocationMutation]);
  const addWarehouse = useCallback((warehouse: Omit<Warehouse, 'id' | 'createdAt'>) => addWarehouseMutation.mutateAsync(warehouse), [addWarehouseMutation]);
  const updateWarehouse = useCallback((id: string, data: Partial<Warehouse>) => updateWarehouseMutation.mutate({ id, data }), [updateWarehouseMutation]);
  const deleteWarehouse = useCallback((id: string) => deleteWarehouseMutation.mutate(id), [deleteWarehouseMutation]);

  const getStockForProduct = useCallback((productId: string): number => {
    return inventory.filter(i => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
  }, [inventory]);

  const getStockForProductInWarehouse = useCallback((productId: string, warehouseId: string): number => {
    return inventory.find(i => i.productId === productId && i.warehouseId === warehouseId)?.quantity ?? 0;
  }, [inventory]);

  const getInventoryForWarehouse = useCallback((warehouseId: string): InventoryItem[] => {
    return inventory.filter(i => i.warehouseId === warehouseId);
  }, [inventory]);

  const addStockTransaction = useCallback((
    productId: string, warehouseId: string, quantity: number, type: TransactionType, note: string = ''
  ) => addStockTransactionMutation.mutateAsync({ productId, warehouseId, quantity, type, note }), [addStockTransactionMutation]);

  const getTransactionsForProduct = useCallback((productId: string): Transaction[] => {
    return transactions.filter(t => t.productId === productId);
  }, [transactions]);

  const getLowStockProducts = useCallback((): Product[] => {
    return products.filter(p => getStockForProduct(p.id) <= p.criticalStockLevel);
  }, [products, getStockForProduct]);

  const getTodayTransactionCount = useCallback((): number => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(t => t.createdAt.startsWith(today!)).length;
  }, [transactions]);

  const getProductByBarcode = useCallback((barcode: string): Product | undefined => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const clearAllData = useCallback(async () => { await clearAllDataMutation.mutateAsync(); }, [clearAllDataMutation]);

  return {
    products,
    locations: allLocations,
    warehouses,
    allWarehouses,
    inventory,
    transactions,
    isLoading,
    addProduct, updateProduct, deleteProduct,
    addLocation, updateLocation, deleteLocation,
    addWarehouse, updateWarehouse, deleteWarehouse,
    getStockForProduct, getStockForProductInWarehouse, getInventoryForWarehouse,
    addStockTransaction, getTransactionsForProduct,
    getLowStockProducts, getTodayTransactionCount, getProductByBarcode,
    clearAllData,
  };
});
