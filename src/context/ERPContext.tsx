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
  incomeCategories: string[];
  expenseCategories: string[];
  setIncomeCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setExpenseCategories: React.Dispatch<React.SetStateAction<string[]>>;

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
  deleteCustomer: (id: string) => void;
  payDebt: (poId: string, amount: number) => void;
  collectPayment: (soId: string, amount: number) => void;
  deleteSalesOrder: (id: string) => void;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;

  // Stats
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalReceivables: number;
  totalPayables: number;
  lowStockItems: InventoryItem[];
  clearAllData: () => Promise<void>;
  isLoading: boolean;
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
const initialRecipes: Recipe[] = [];

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(["Sales", "Investment", "Other"]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(["Raw Materials", "Salaries", "Utilities", "Maintenance", "Rent", "Other"]);
  const [isLoading, setIsLoading] = useState(true);

  const isRemoteUpdate = React.useRef<Record<string, boolean>>({});

  // 1. Persist to Supabase whenever state changes (Cloud Only)
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_inventory']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_inventory', value: inventory }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_inventory'] = false;
  }, [inventory, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_workOrders']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_workOrders', value: workOrders }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_workOrders'] = false;
  }, [workOrders, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_salesOrders']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_salesOrders', value: salesOrders }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_salesOrders'] = false;
  }, [salesOrders, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_purchaseOrders']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_purchaseOrders', value: purchaseOrders }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_purchaseOrders'] = false;
  }, [purchaseOrders, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_transactions']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_transactions', value: transactions }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_transactions'] = false;
  }, [transactions, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_customers']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_customers', value: customers }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_customers'] = false;
  }, [customers, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_employees']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_employees', value: employees }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_employees'] = false;
  }, [employees, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_stockMovements']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_stockMovements', value: stockMovements }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_stockMovements'] = false;
  }, [stockMovements, isLoading]);
  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_recipes']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_recipes', value: recipes }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_recipes'] = false;
  }, [recipes, isLoading]);

  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_income_cats']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_income_cats', value: incomeCategories }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_income_cats'] = false;
  }, [incomeCategories, isLoading]);

  useEffect(() => { 
    if (!isLoading && !isRemoteUpdate.current['erp_v7_expense_cats']) {
      supabase.from('erp_state').upsert({ key: 'erp_v7_expense_cats', value: expenseCategories }).then(({error}) => { if (error) console.error(error) });
    }
    isRemoteUpdate.current['erp_v7_expense_cats'] = false;
  }, [expenseCategories, isLoading]);

  // 2. Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('erp_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_state' }, (payload) => {
        const { key, value } = payload.new as { key: string, value: any };
        if (!key || !value) return;

        isRemoteUpdate.current[key] = true;
        
        switch (key) {
          case 'erp_v7_inventory': setInventory(value); break;
          case 'erp_v7_workOrders': setWorkOrders(value); break;
          case 'erp_v7_salesOrders': setSalesOrders(value); break;
          case 'erp_v7_purchaseOrders': setPurchaseOrders(value); break;
          case 'erp_v7_transactions': setTransactions(value); break;
          case 'erp_v7_customers': setCustomers(value); break;
          case 'erp_v7_employees': setEmployees(value); break;
          case 'erp_v7_stockMovements': setStockMovements(value); break;
          case 'erp_v7_recipes': setRecipes(value); break;
          case 'erp_v7_income_cats': setIncomeCategories(value); break;
          case 'erp_v7_expense_cats': setExpenseCategories(value); break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Load from Supabase on mount
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

        // Set state from Cloud only
        if (cloudData['erp_v7_inventory']) {
          isRemoteUpdate.current['erp_v7_inventory'] = true;
          setInventory(cloudData['erp_v7_inventory']);
        }
        if (cloudData['erp_v7_workOrders']) {
          isRemoteUpdate.current['erp_v7_workOrders'] = true;
          setWorkOrders(cloudData['erp_v7_workOrders']);
        }
        if (cloudData['erp_v7_salesOrders']) {
          isRemoteUpdate.current['erp_v7_salesOrders'] = true;
          setSalesOrders(cloudData['erp_v7_salesOrders']);
        }
        if (cloudData['erp_v7_purchaseOrders']) {
          isRemoteUpdate.current['erp_v7_purchaseOrders'] = true;
          setPurchaseOrders(cloudData['erp_v7_purchaseOrders']);
        }
        if (cloudData['erp_v7_transactions']) {
          isRemoteUpdate.current['erp_v7_transactions'] = true;
          setTransactions(cloudData['erp_v7_transactions']);
        }
        if (cloudData['erp_v7_customers']) {
          isRemoteUpdate.current['erp_v7_customers'] = true;
          setCustomers(cloudData['erp_v7_customers']);
        }
        if (cloudData['erp_v7_employees']) {
          isRemoteUpdate.current['erp_v7_employees'] = true;
          setEmployees(cloudData['erp_v7_employees']);
        }
        if (cloudData['erp_v7_stockMovements']) {
          isRemoteUpdate.current['erp_v7_stockMovements'] = true;
          setStockMovements(cloudData['erp_v7_stockMovements']);
        }
        if (cloudData['erp_v7_recipes']) {
          isRemoteUpdate.current['erp_v7_recipes'] = true;
          setRecipes(cloudData['erp_v7_recipes']);
        }
        if (cloudData['erp_v7_income_cats']) {
          isRemoteUpdate.current['erp_v7_income_cats'] = true;
          setIncomeCategories(cloudData['erp_v7_income_cats']);
        }
        if (cloudData['erp_v7_expense_cats']) {
          isRemoteUpdate.current['erp_v7_expense_cats'] = true;
          setExpenseCategories(cloudData['erp_v7_expense_cats']);
        }

      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      } finally {
        setIsLoading(false);
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

    // Robust CRM Sync: Update existing or add new customer
    setCustomers(prev => {
      const existingIdx = prev.findIndex(c => c.name.toLowerCase().trim() === so.customerName.toLowerCase().trim());
      
      if (existingIdx !== -1) {
        // Update existing customer
        const updatedCustomers = [...prev];
        const existing = updatedCustomers[existingIdx];
        updatedCustomers[existingIdx] = {
          ...existing,
          email: so.customerEmail || existing.email,
          phone: so.customerPhone || existing.phone,
          address: so.customerAddress || existing.address,
          totalOrders: (existing.totalOrders || 0) + 1,
          totalSpent: (existing.totalSpent || 0) + so.totalAmount,
          lastOrderDate: so.date.split(' ')[0],
          salesName: so.salesName || existing.salesName
        };
        return updatedCustomers;
      } else {
        // Add new customer
        const newCustomer: Customer = {
          id: `CUST-${Date.now()}`,
          name: so.customerName,
          email: so.customerEmail || '-',
          phone: so.customerPhone || '-',
          address: so.customerAddress || '-',
          totalOrders: 1,
          totalSpent: so.totalAmount,
          lastOrderDate: so.date.split(' ')[0],
          salesName: so.salesName
        };
        return [...prev, newCustomer];
      }
    });
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
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
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, status: 'Completed', isPaid: so.paymentMethod !== 'Debt' } : s));
  }, [inventory, salesOrders, updateInventoryStock]);

  const createPurchaseOrder = useCallback((po: PurchaseOrder) => {
    setPurchaseOrders(prev => [{ ...po, isPaid: po.paymentMethod !== 'Debt' }, ...prev]);
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
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received', isPaid: po.paymentMethod !== 'Debt' } : p));
  }, [purchaseOrders, updateInventoryStock]);

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.name.toLowerCase().trim() === customer.name.toLowerCase().trim());
      if (exists) return prev;
      return [...prev, customer];
    });
  }, []);

  const addEmployee = useCallback((employee: Employee) => {
    setEmployees(prev => {
      const exists = prev.find(e => e.name.toLowerCase().trim() === employee.name.toLowerCase().trim());
      if (exists) return prev;
      return [...prev, employee];
    });
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prev => {
      const exists = prev.find(t => t.id === transaction.id);
      if (exists) return prev;
      return [transaction, ...prev];
    });
  }, []);

  const addRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prev => {
      const exists = prev.find(r => r.id === recipe.id || r.productName?.toLowerCase().trim() === recipe.productName?.toLowerCase().trim());
      if (exists) return prev;
      return [...prev, recipe];
    });
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

  const deleteSalesOrder = useCallback((id: string) => {
    const so = salesOrders.find(s => s.id === id);
    if (!so) return;

    // 1. Revert stock if completed
    if (so.status === 'Completed') {
      so.items.forEach(item => {
        const inventoryItem = inventory.find(i => i.id === item.productId);
        const isKg = inventoryItem?.unit === 'kg';
        const finalRestorationAmount = (isKg && inventoryItem?.category !== 'Kerupuk')
          ? Number((item.quantity / 32).toFixed(5))
          : item.quantity;
        updateInventoryStock(item.productId, finalRestorationAmount, 'In', `Pembatalan ${so.id}`, so.id);
      });

      // 2. Remove associated transaction
      setTransactions(prev => prev.filter(t => t.referenceId !== id));
      
      // 3. Remove stock movements
      setStockMovements(prev => prev.filter(m => m.referenceId !== id));
    }

    setSalesOrders(prev => prev.filter(s => s.id !== id));
  }, [salesOrders, inventory, updateInventoryStock]);

  const updateSalesOrder = useCallback((id: string, updates: Partial<SalesOrder>) => {
    setSalesOrders(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      // 1. Reset Local State
      setInventory([]);
      setWorkOrders([]);
      setSalesOrders([]);
      setPurchaseOrders([]);
      setTransactions([]);
      setCustomers([]);
      setEmployees([]);
      setStockMovements([]);
      setRecipes([]);

      // 2. Clear LocalStorage
      const keys = [
        'erp_v7_inventory', 'erp_v7_workOrders', 'erp_v7_salesOrders', 
        'erp_v7_purchaseOrders', 'erp_v7_transactions', 'erp_v7_customers', 
        'erp_v7_employees', 'erp_v7_stockMovements', 'erp_v7_recipes'
      ];
      keys.forEach(k => localStorage.removeItem(k));

      // 3. Clear Supabase by setting keys to empty arrays
      const keysToClear = [
        'erp_v7_inventory', 'erp_v7_workOrders', 'erp_v7_salesOrders', 
        'erp_v7_purchaseOrders', 'erp_v7_transactions', 'erp_v7_customers', 
        'erp_v7_employees', 'erp_v7_stockMovements', 'erp_v7_recipes'
      ];
      
      await Promise.all(keysToClear.map(key => 
        supabase.from('erp_state').upsert({ key, value: [] })
      ));

      console.log('Semua data berhasil dibersihkan dari lokal dan cloud.');
    } catch (err) {
      console.error('Gagal membersihkan data:', err);
      alert('Gagal membersihkan data. Silakan coba lagi.');
    }
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
    incomeCategories,
    expenseCategories,
    setIncomeCategories,
    setExpenseCategories,
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
    deleteCustomer,
    payDebt,
    collectPayment,
    deleteSalesOrder,
    updateSalesOrder,
    totalRevenue,
    totalExpenses,
    netProfit,
    totalReceivables,
    totalPayables,
    lowStockItems,
    clearAllData,
    isLoading
  }), [
    inventory, workOrders, salesOrders, purchaseOrders, transactions,
    customers, employees, stockMovements, recipes,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, updateInventoryStock,
    adjustStock, createWorkOrder, completeWorkOrder, createSalesOrder,
    completeSalesOrder, createPurchaseOrder, receivePurchaseOrder,
    addCustomer, updateCustomer, addEmployee, addTransaction, addRecipe,
    updateRecipe, deleteRecipe, deleteWorkOrder, deleteCustomer, payDebt, collectPayment,
    deleteSalesOrder, updateSalesOrder,
    totalRevenue, totalExpenses, netProfit, totalReceivables, totalPayables, lowStockItems,
    clearAllData, isLoading
  ]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
};
