export interface Product {
  id: string;
  name: string;
  barcode: string;
  description: string;
  unit: string;
  imageUrl: string;
  criticalStockLevel: number;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
}

export type TransactionType = 'IN' | 'OUT';

export interface Transaction {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  type: TransactionType;
  note: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalWarehouses: number;
  todayTransactions: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}
