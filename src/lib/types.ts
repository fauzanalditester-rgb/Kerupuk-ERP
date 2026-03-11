export type Category = 'Bahan Baku' | 'Bumbu' | 'Kerupuk' | 'Pempek' | 'Packaging' | 'Operasional';
export type Unit = 'kg' | 'L' | 'pcs' | 'bks' | 'unit' | 'tabung' | 'liter';
export type Status = 'Good' | 'Low' | 'Critical';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  stock: number;
  unit: Unit;
  minStock: number;
  price: number; // Cost price for raw, Selling price for finished
  type: 'raw' | 'finished' | 'supply';
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  productId: string; // Links to InventoryItem (finished good)
  productName: string;
  quantity: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate: string;
  dueDate: string;
  progress: number;
  materialsUsed: { materialId: string; amount: number }[]; // Recipe snapshot
  batchCount?: number;
  yieldPerBatch?: number;
  yieldUnit?: 'kg' | 'pcs';
}

export interface SalesOrder {
  id: string;
  customerName: string;
  date: string;
  items: { productId: string; quantity: number; price: number }[];
  totalAmount: number;
  discount?: number; // In percentage
  paymentMethod: PaymentMethod;
  status: 'Processing' | 'Shipped' | 'Completed';
}

export type PaymentMethod = 'Cash' | 'Debt';

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  date: string;
  items: { materialId: string; quantity: number; cost: number }[];
  totalAmount: number;
  status: 'Ordered' | 'Pending' | 'Received';
  paymentMethod: PaymentMethod;
}

export interface Transaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  date: string;
  referenceId?: string; // Link to SO or PO
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  joinDate: string;
  salary: number;
}
export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'In' | 'Out' | 'Adjustment';
  amount: number;
  reason: string;
  referenceId?: string;
  date: string;
}

export interface Recipe {
  id: string;
  productId: string;
  productName: string;
  ingredients: { materialId: string; amount: number }[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'staff';
}
