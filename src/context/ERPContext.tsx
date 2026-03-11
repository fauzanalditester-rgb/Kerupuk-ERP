import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, WorkOrder, SalesOrder, PurchaseOrder, Transaction, Customer, Employee, StockMovement, Recipe } from '../lib/types';

// Helper for consistent date-time formatting
const formatDateWithTime = (dateStr?: string) => {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  if (!dateStr) return `${now.toISOString().split('T')[0]} ${timeStr}`;
  if (dateStr.includes(' ')) return dateStr;
  return `${dateStr} ${timeStr}`;
};

interface ERPContextType {
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  transactions: Transaction[];
  customers: Customer[];
  employees: Employee[];
  stockMovements: StockMovement[];
  recipes: Recipe[];

  // Actions
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  updateInventoryStock: (id: string, amount: number, type?: StockMovement['type'], reason?: string, refId?: string) => void;
  adjustStock: (itemId: string, amount: number, reason: string) => void;
  createWorkOrder: (wo: WorkOrder) => void;
  completeWorkOrder: (id: string, woObj?: WorkOrder) => void;
  createSalesOrder: (so: SalesOrder) => void;
  completeSalesOrder: (id: string) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  receivePurchaseOrder: (id: string, poObj?: PurchaseOrder) => void;
  addCustomer: (customer: Customer) => void;
  addEmployee: (employee: Employee) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addTransaction: (transaction: Transaction) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updatedRecipe: Recipe) => void;
  deleteRecipe: (id: string) => void;

  // Stats
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  lowStockItems: InventoryItem[];
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};

// Initial Data for Production Start
const initialInventory: InventoryItem[] = [];

const initialPurchaseOrders: PurchaseOrder[] = [];

const initialWorkOrders: WorkOrder[] = [];

const initialSalesOrders: SalesOrder[] = [];

const initialTransactions: Transaction[] = [];

const initialStockMovements: StockMovement[] = [];

const initialCustomers: Customer[] = [];

const initialEmployees: Employee[] = [];

const initialRecipes: Recipe[] = [];

// Helper to load from localStorage
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage`, e);
    return fallback;
  }
};

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadState('erp_v5_inventory', initialInventory));
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => loadState('erp_v5_workOrders', initialWorkOrders));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => loadState('erp_v5_salesOrders', initialSalesOrders));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => loadState('erp_v5_purchaseOrders', initialPurchaseOrders));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('erp_v5_transactions', initialTransactions));
  const [customers, setCustomers] = useState<Customer[]>(() => loadState('erp_v5_customers', initialCustomers));
  const [employees, setEmployees] = useState<Employee[]>(() => loadState('erp_v5_employees', initialEmployees));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadState('erp_v5_stockMovements', initialStockMovements));
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadState('erp_v5_recipes', initialRecipes));

  // Persist to localStorage whenever state changes
  useEffect(() => { localStorage.setItem('erp_v5_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('erp_v5_workOrders', JSON.stringify(workOrders)); }, [workOrders]);
  useEffect(() => { localStorage.setItem('erp_v5_salesOrders', JSON.stringify(salesOrders)); }, [salesOrders]);
  useEffect(() => { localStorage.setItem('erp_v5_purchaseOrders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem('erp_v5_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('erp_v5_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('erp_v5_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('erp_v5_stockMovements', JSON.stringify(stockMovements)); }, [stockMovements]);
  useEffect(() => { localStorage.setItem('erp_v5_recipes', JSON.stringify(recipes)); }, [recipes]);

  // Derived Stats
  const totalRevenue = useMemo(() => transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const netProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);
  const lowStockItems = useMemo(() => inventory.filter(item => item.stock <= item.minStock), [inventory]);

  // Actions
  const addInventoryItem = useCallback((item: InventoryItem) => {
    const itemWithDate = {
      ...item,
      createdAt: formatDateWithTime(item.createdAt)
    };
    setInventory(prev => [itemWithDate, ...prev]);
    if (itemWithDate.stock > 0) {
      const movement: StockMovement = {
        id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        itemId: itemWithDate.id,
        itemName: itemWithDate.name,
        type: 'In',
        amount: itemWithDate.stock,
        reason: 'Stok Awal',
        date: itemWithDate.createdAt
      };
      setStockMovements(prev => [movement, ...prev]);
    }
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    setRecipes(prev => prev.filter(rec => rec.productId !== id));
  }, []);

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const updateInventoryStock = useCallback((id: string, amount: number, type: StockMovement['type'] = 'Adjustment', reason: string = 'Pembaruan Manual', refId?: string, customDate?: string) => {
    setInventory(prevInventory => {
      const item = prevInventory.find(i => i.id === id);
      if (!item) {
        console.warn(`Update stok gagal: Item dengan ID ${id} tidak ditemukan.`);
        return prevInventory;
      }

      const finalDate = formatDateWithTime(customDate);

      const movement: StockMovement = {
        id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        itemId: id,
        itemName: item.name,
        type,
        amount: Math.abs(amount),
        reason,
        referenceId: refId,
        date: finalDate
      };

      // Use a robust duplicate check: check referenceId + type + itemId
      setTimeout(() => {
        setStockMovements(prevMovements => {
          if (refId && prevMovements.some(m => m.referenceId === refId && m.type === type && m.itemId === id)) {
            return prevMovements;
          }
          return [movement, ...prevMovements];
        });
      }, 0);

      return prevInventory.map(i => i.id === id ? { ...i, stock: i.stock + amount } : i);
    });
  }, []);

  const adjustStock = useCallback((itemId: string, amount: number, reason: string) => {
    updateInventoryStock(itemId, amount, 'Adjustment', reason);
  }, [updateInventoryStock]);

  const createWorkOrder = useCallback((wo: WorkOrder) => {
    setWorkOrders(prev => [wo, ...prev]);

    // Automatically deduct materials (Reserved) or immediate deduction if using "Complete" flow
    // In current flow, it is handled in completeWorkOrder or through the UI
  }, []);

  const completeWorkOrder = useCallback((id: string, woObj?: WorkOrder) => {
    const wo = woObj || workOrders.find(w => w.id === id);
    if (!wo || wo.status === 'Completed') return;

    const completionDate = formatDateWithTime(wo.dueDate);

    // 1. Deduct materials and Add finished goods using the order's date
    wo.materialsUsed.forEach(mat => {
      updateInventoryStock(mat.materialId, -mat.amount, 'Out', `Produksi ${wo.productName}`, wo.id, completionDate);
    });
    updateInventoryStock(wo.productId, wo.quantity, 'In', `Hasil Produksi ${wo.id}`, wo.id, completionDate);

    // 2. Automatically ensure the product exists in Inventory with correct type if for some reason it's missing (failsafe)
    // and potentially trigger a StockMovement if not handled by updateInventoryStock

    // 3. Update WO Status
    setWorkOrders(prev => prev.map(w =>
      w.id === id ? { ...w, status: 'Completed', progress: 100, dueDate: completionDate } : w
    ));
  }, [workOrders, updateInventoryStock]);

  const createSalesOrder = useCallback((so: SalesOrder) => {
    setSalesOrders(prev => [so, ...prev]);

    // Auto-add customer to CRM if not exists
    setCustomers(prev => {
      if (prev.some(c => c.name.toLowerCase() === so.customerName.toLowerCase())) {
        return prev;
      }
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        name: so.customerName,
        email: '-',
        phone: '-',
        address: '-',
        totalOrders: 0,
        totalSpent: 0
      };
      return [...prev, newCustomer];
    });
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const completeSalesOrder = useCallback((id: string, soObj?: SalesOrder) => {
    const so = soObj || salesOrders.find(s => s.id === id);
    if (!so || so.status === 'Completed') return;

    // 1. Deduct goods using the sales order date
    so.items.forEach(item => {
      const inventoryItem = inventory.find(i => i.id === item.productId);
      const isKg = inventoryItem?.unit === 'kg';
      const finalDeductionAmount = isKg ? Number((item.quantity / 32).toFixed(5)) : item.quantity;
      updateInventoryStock(item.productId, -finalDeductionAmount, 'Out', `Penjualan ${so.id}`, so.id, so.date);
    });

    // 2. Add transaction using the sales order date
    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      type: 'Income',
      category: so.paymentMethod === 'Debt' ? 'Piutang Usaha' : 'Penjualan',
      amount: so.totalAmount,
      date: so.date,
      referenceId: so.id
    };
    setTransactions(prev => [transaction, ...prev]);

    // 3. Update SO Status
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, status: 'Completed' } : s));
  }, [inventory, salesOrders, updateInventoryStock]);

  const createPurchaseOrder = useCallback((po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev]);
  }, []);

  const receivePurchaseOrder = useCallback((id: string, poObj?: PurchaseOrder) => {
    const po = poObj || purchaseOrders.find(p => p.id === id);
    if (!po || po.status === 'Received') return;

    // 1. Add stocks using PO date
    po.items.forEach(item => {
      updateInventoryStock(item.materialId, item.quantity, 'In', `Pembelian ${po.id}`, po.id, po.date);
    });

    // 2. Add transaction using PO date
    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      type: 'Expense',
      category: po.paymentMethod === 'Debt' ? 'Hutang Usaha' : 'Pembelian',
      amount: po.totalAmount,
      date: po.date,
      referenceId: po.id
    };
    setTransactions(prev => [transaction, ...prev]);

    // 3. Update PO Status
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received' } : p));
  }, [purchaseOrders, updateInventoryStock]);

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  }, []);

  const addEmployee = useCallback((employee: Employee) => {
    setEmployees(prev => [...prev, employee]);
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  const addRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prev => [...prev, recipe]);
  }, []);

  const updateRecipe = useCallback((id: string, updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === id ? updatedRecipe : r));
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    inventory,
    workOrders,
    salesOrders,
    purchaseOrders,
    transactions,
    customers,
    employees,
    stockMovements,
    recipes,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    updateInventoryStock,
    adjustStock,
    createWorkOrder,
    completeWorkOrder,
    createSalesOrder,
    completeSalesOrder,
    createPurchaseOrder,
    receivePurchaseOrder,
    addCustomer,
    updateCustomer,
    addEmployee,
    addTransaction,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    totalRevenue,
    totalExpenses,
    netProfit,
    lowStockItems
  }), [
    inventory, workOrders, salesOrders, purchaseOrders, transactions,
    customers, employees, stockMovements, recipes,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, updateInventoryStock,
    adjustStock, createWorkOrder, completeWorkOrder, createSalesOrder,
    completeSalesOrder, createPurchaseOrder, receivePurchaseOrder,
    addCustomer, updateCustomer, addEmployee, addTransaction, addRecipe,
    updateRecipe, deleteRecipe, totalRevenue, totalExpenses,
    netProfit, lowStockItems
  ]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
};
