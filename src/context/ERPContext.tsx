import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, WorkOrder, SalesOrder, PurchaseOrder, Transaction, Customer, Employee, StockMovement, Recipe } from '../lib/types';
import { supabase } from '../lib/supabase';

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
  deleteWorkOrder: (id: string) => void;
  payDebt: (poId: string, amount: number) => void;
  collectPayment: (soId: string, amount: number) => void;

  // Stats
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalReceivables: number;
  totalPayables: number;
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
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadState('erp_v6_inventory', initialInventory));
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => loadState('erp_v6_workOrders', initialWorkOrders));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => loadState('erp_v6_salesOrders', initialSalesOrders));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => loadState('erp_v6_purchaseOrders', initialPurchaseOrders));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('erp_v6_transactions', initialTransactions));
  const [customers, setCustomers] = useState<Customer[]>(() => loadState('erp_v6_customers', initialCustomers));
  const [employees, setEmployees] = useState<Employee[]>(() => loadState('erp_v6_employees', initialEmployees));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadState('erp_v6_stockMovements', initialStockMovements));
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadState('erp_v6_recipes', initialRecipes));

  // Persist to localStorage and Supabase whenever state changes
  useEffect(() => { 
    localStorage.setItem('erp_v6_inventory', JSON.stringify(inventory)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_inventory', value: inventory }).then(({error}) => { if (error) console.error(error) });
  }, [inventory]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_workOrders', JSON.stringify(workOrders)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_workOrders', value: workOrders }).then(({error}) => { if (error) console.error(error) });
  }, [workOrders]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_salesOrders', JSON.stringify(salesOrders)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_salesOrders', value: salesOrders }).then(({error}) => { if (error) console.error(error) });
  }, [salesOrders]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_purchaseOrders', JSON.stringify(purchaseOrders)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_purchaseOrders', value: purchaseOrders }).then(({error}) => { if (error) console.error(error) });
  }, [purchaseOrders]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_transactions', JSON.stringify(transactions)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_transactions', value: transactions }).then(({error}) => { if (error) console.error(error) });
  }, [transactions]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_customers', JSON.stringify(customers)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_customers', value: customers }).then(({error}) => { if (error) console.error(error) });
  }, [customers]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_employees', JSON.stringify(employees)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_employees', value: employees }).then(({error}) => { if (error) console.error(error) });
  }, [employees]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_stockMovements', JSON.stringify(stockMovements)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_stockMovements', value: stockMovements }).then(({error}) => { if (error) console.error(error) });
  }, [stockMovements]);
  useEffect(() => { 
    localStorage.setItem('erp_v6_recipes', JSON.stringify(recipes)); 
    supabase.from('erp_state').upsert({ key: 'erp_v6_recipes', value: recipes }).then(({error}) => { if (error) console.error(error) });
  }, [recipes]);

  // Load from Supabase on mount
  useEffect(() => {
    const fetchFromSupabase = async () => {
      try {
        const { data, error } = await supabase.from('erp_state').select('*');
        if (error) throw error;
        
        // Map cloud data
        const cloudData: Record<string, any> = {};
        if (data && data.length > 0) {
          data.forEach((row) => {
            cloudData[row.key] = row.value;
          });
        }

        // Per-key Sync Logic:
        // Jika Cloud memiliki data (> 0), tarik datanya untuk menggantikan Local.
        // Jika Cloud kosong, tapi Local punya data (> 0), jangan hapus data Local! Unggah ke Cloud.

        if (cloudData['erp_v6_inventory'] && cloudData['erp_v6_inventory'].length > 0) {
          setInventory(cloudData['erp_v6_inventory']);
        } else if (inventory.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_inventory', value: inventory }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_workOrders'] && cloudData['erp_v6_workOrders'].length > 0) {
          setWorkOrders(cloudData['erp_v6_workOrders']);
        } else if (workOrders.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_workOrders', value: workOrders }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_salesOrders'] && cloudData['erp_v6_salesOrders'].length > 0) {
          setSalesOrders(cloudData['erp_v6_salesOrders']);
        } else if (salesOrders.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_salesOrders', value: salesOrders }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_purchaseOrders'] && cloudData['erp_v6_purchaseOrders'].length > 0) {
          setPurchaseOrders(cloudData['erp_v6_purchaseOrders']);
        } else if (purchaseOrders.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_purchaseOrders', value: purchaseOrders }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_transactions'] && cloudData['erp_v6_transactions'].length > 0) {
          setTransactions(cloudData['erp_v6_transactions']);
        } else if (transactions.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_transactions', value: transactions }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_customers'] && cloudData['erp_v6_customers'].length > 0) {
          setCustomers(cloudData['erp_v6_customers']);
        } else if (customers.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_customers', value: customers }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_employees'] && cloudData['erp_v6_employees'].length > 0) {
          setEmployees(cloudData['erp_v6_employees']);
        } else if (employees.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_employees', value: employees }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_stockMovements'] && cloudData['erp_v6_stockMovements'].length > 0) {
          setStockMovements(cloudData['erp_v6_stockMovements']);
        } else if (stockMovements.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_stockMovements', value: stockMovements }).then(({error})=> {if(error)console.error(error)});
        }

        if (cloudData['erp_v6_recipes'] && cloudData['erp_v6_recipes'].length > 0) {
          setRecipes(cloudData['erp_v6_recipes']);
        } else if (recipes.length > 0) {
          supabase.from('erp_state').upsert({ key: 'erp_v6_recipes', value: recipes }).then(({error})=> {if(error)console.error(error)});
        }

      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    };
    fetchFromSupabase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived Stats
  const totalRevenue = useMemo(() => transactions.filter(t => t.type === 'Income' && !t.isDebtPayment).reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'Expense' && !t.isDebtPayment).reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const netProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  const totalReceivables = useMemo(() => {
    return salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid).reduce((acc, so) => {
      const paid = transactions.filter(t => t.referenceId === so.id && t.isDebtPayment && t.type === 'Income').reduce((s, t) => s + t.amount, 0);
      return acc + (so.totalAmount - paid);
    }, 0);
  }, [salesOrders, transactions]);

  const totalPayables = useMemo(() => {
    return purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid).reduce((acc, po) => {
      const paid = transactions.filter(t => t.referenceId === po.id && t.isDebtPayment && t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
      return acc + (po.totalAmount - paid);
    }, 0);
  }, [purchaseOrders, transactions]);

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
    setStockMovements(prev => prev.filter(m => m.itemId !== id));
  }, []);

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const updateInventoryStock = useCallback((
    id: string,
    amount: number,
    type: StockMovement['type'] = 'Adjustment',
    reason: string = 'Pembaruan Manual',
    refId?: string,
    customDate?: string,
    displayAmount?: number,
    displayUnit?: string
  ) => {
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
        displayAmount: displayAmount,
        displayUnit: displayUnit,
        reason,
        referenceId: refId,
        date: finalDate
      };

      // Use a robust duplicate check: check referenceId + type + itemId
      // If refId is not provided (manual), check for identical movement within the same minute
      setTimeout(() => {
        setStockMovements(prevMovements => {
          const isDuplicate = refId
            ? prevMovements.some(m => m.referenceId === refId && m.type === type && m.itemId === id)
            : prevMovements.some(m =>
              m.itemId === id &&
              m.type === type &&
              m.reason === reason &&
              m.date === finalDate &&
              Math.abs(m.amount - Math.abs(amount)) < 0.00001
            );

          if (isDuplicate) {
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
      updateInventoryStock(
        mat.materialId,
        -mat.amount,
        'Out',
        `Produksi ${wo.productName}`,
        wo.id,
        completionDate,
        mat.displayAmount,
        mat.displayUnit
      );
    });
    updateInventoryStock(
      wo.productId,
      wo.quantity,
      'In',
      `Hasil Produksi ${wo.id}`,
      wo.id,
      completionDate,
      (wo.batchCount || 1) * (wo.yieldPerBatch || 0),
      wo.yieldUnit
    );

    // 2. Automatically ensure the product exists in Inventory with correct type if for some reason it's missing (failsafe)
    // and potentially trigger a StockMovement if not handled by updateInventoryStock

    // 3. Update WO Status
    setWorkOrders(prev => prev.map(w =>
      w.id === id ? { ...w, status: 'Completed', progress: 100, dueDate: completionDate } : w
    ));
  }, [workOrders, updateInventoryStock]);

  const deleteWorkOrder = useCallback((id: string) => {
    const wo = workOrders.find(w => w.id === id);
    if (!wo) return;

    // If order was completed, revert the stock changes and CLEAN UP history
    if (wo.status === 'Completed') {
      // 1. Revert Inventory Stock (Deduct Product, Restore Materials)
      setInventory(prevInv => {
        let updatedInv = [...prevInv];
        // Deduct finished goods
        updatedInv = updatedInv.map(i => i.id === wo.productId ? { ...i, stock: i.stock - wo.quantity } : i);
        // Restore materials
        wo.materialsUsed.forEach(mat => {
          updatedInv = updatedInv.map(i => i.id === mat.materialId ? { ...i, stock: i.stock + mat.amount } : i);
        });
        return updatedInv;
      });

      // 2. Remove associated movements from history
      setStockMovements(prev => prev.filter(m => m.referenceId !== id));
    }

    setWorkOrders(prev => prev.filter(w => w.id !== id));
  }, [workOrders]);

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
      const finalDeductionAmount = (isKg && inventoryItem?.category !== 'Kerupuk')
        ? Number((item.quantity / 32).toFixed(5))
        : item.quantity;
      updateInventoryStock(item.productId, -finalDeductionAmount, 'Out', `Penjualan ${so.id}`, so.id, so.date);
    });

    // 2. Add transaction using the sales order date
    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      type: 'Income',
      category: so.paymentMethod === 'Debt' ? 'Piutang Usaha' : 'Penjualan',
      amount: so.totalAmount,
      date: so.date,
      referenceId: so.id,
      isDebtPayment: false
    };
    setTransactions(prev => [transaction, ...prev]);

    // 3. Update SO Status
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, status: 'Completed', isPaid: so.paymentMethod === 'Cash' } : s));
  }, [inventory, salesOrders, updateInventoryStock]);

  const createPurchaseOrder = useCallback((po: PurchaseOrder) => {
    setPurchaseOrders(prev => [{ ...po, isPaid: po.paymentMethod === 'Cash' }, ...prev]);
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
      referenceId: po.id,
      isDebtPayment: false
    };
    setTransactions(prev => [transaction, ...prev]);

    // 3. Update PO Status
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received', isPaid: po.paymentMethod === 'Cash' } : p));
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

  const payDebt = useCallback((poId: string, amount: number) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      type: 'Expense',
      category: 'Pelunasan Hutang',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      referenceId: poId,
      isDebtPayment: true
    };
    
    // Calculate total paid including this new amount
    const previouslyPaid = transactions
      .filter(t => t.referenceId === poId && t.isDebtPayment && t.type === 'Expense')
      .reduce((s, t) => s + t.amount, 0);
    const totalPaid = previouslyPaid + amount;
    const isNowPaid = totalPaid >= po.totalAmount;

    setTransactions(prev => [transaction, ...prev]);
    if (isNowPaid) {
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, isPaid: true } : p));
    }
  }, [purchaseOrders, transactions]);

  const collectPayment = useCallback((soId: string, amount: number) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;

    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      type: 'Income',
      category: 'Pelunasan Piutang',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      referenceId: soId,
      isDebtPayment: true
    };

    // Calculate total paid including this new amount
    const previouslyPaid = transactions
      .filter(t => t.referenceId === soId && t.isDebtPayment && t.type === 'Income')
      .reduce((s, t) => s + t.amount, 0);
    const totalPaid = previouslyPaid + amount;
    const isNowPaid = totalPaid >= so.totalAmount;

    setTransactions(prev => [transaction, ...prev]);
    if (isNowPaid) {
      setSalesOrders(prev => prev.map(s => s.id === soId ? { ...s, isPaid: true } : s));
    }
  }, [salesOrders, transactions]);

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
    deleteWorkOrder,
    payDebt,
    collectPayment,
    totalRevenue,
    totalExpenses,
    netProfit,
    totalReceivables,
    totalPayables,
    lowStockItems
  }), [
    inventory, workOrders, salesOrders, purchaseOrders, transactions,
    customers, employees, stockMovements, recipes,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, updateInventoryStock,
    adjustStock, createWorkOrder, completeWorkOrder, createSalesOrder,
    completeSalesOrder, createPurchaseOrder, receivePurchaseOrder,
    addCustomer, updateCustomer, addEmployee, addTransaction, addRecipe,
    updateRecipe, deleteRecipe, deleteWorkOrder, payDebt, collectPayment,
    totalRevenue, totalExpenses, netProfit, totalReceivables, totalPayables, lowStockItems
  ]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
};
