import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Filter, Search, CheckCircle, X, Eye, ArrowUpDown, Package, ShoppingBag, Tag, Edit2, Save, Printer, MapPin, AlertCircle, Trash2 } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { SalesOrder, InventoryItem } from '../lib/types';
import { cn } from '../lib/utils';
import { exportToExcelFormatted } from '../lib/export';

export default function Sales() {
  const {
    salesOrders,
    createSalesOrder,
    completeSalesOrder,
    deleteSalesOrder,
    updateSalesOrder,
    inventory,
    updateInventoryItem,
    customers,
    addCustomer,
    updateCustomer,
    employees
  } = useERP();
  const [activeTab, setActiveTab] = useState<'orders' | 'pricelist'>('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  // Pricelist Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterSales, setFilterSales] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New SO State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [salesName, setSalesName] = useState('');
  const [soItems, setSoItems] = useState<{ productId: string; productName: string; quantity: number; price: number; discount: number; unit: string }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debt'>('Cash');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [autoComplete, setAutoComplete] = useState(true);

  // Get all unique sales names for datalist autocomplete
  const availableSalesNames = useMemo(() => {
    const names = new Set<string>();
    if (employees) {
      employees
        .filter(emp => emp.status === 'Active')
        .forEach(emp => {
          names.add(emp.name);
        });
    }
    if (salesOrders) {
      salesOrders.forEach(so => {
        if (so.salesName) {
          names.add(so.salesName);
        }
      });
    }
    return Array.from(names);
  }, [employees, salesOrders]);

  // Current item being added
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQty, setCurrentQty] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentDiscount, setCurrentDiscount] = useState(0);

  const SALES_TEMPLATES: any[] = [];

  const handleApplyTemplate = (templateId: string) => {
    const template = SALES_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newItems = template.items.map(tItem => {
      const invItem = inventory.find(i => i.id === tItem.productId || i.name === tItem.name);
      return {
        productId: invItem?.id || tItem.productId,
        productName: invItem?.name || tItem.name,
        quantity: tItem.quantity,
        price: invItem?.price || tItem.price,
        discount: tItem.discount || 0,
        unit: invItem?.unit || 'pcs'
      };
    });

    setSoItems([...soItems, ...newItems]);
  };

  const handleAddItem = () => {
    if (currentItemId && currentQty > 0) {
      const item = inventory.find(i => i.id === currentItemId);
      if (item) {
        setSoItems([...soItems, {
          productId: item.id,
          productName: item.name,
          quantity: currentQty,
          price: currentPrice || item.price,
          discount: currentDiscount || 0,
          unit: item.unit
        }]);
        setCurrentItemId('');
        setCurrentQty(0);
        setCurrentPrice(0);
        setCurrentDiscount(0);
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setSoItems(prev => prev.filter((_, i) => i !== index));
  };

  const finishedGoods = inventory.filter(item => item.type === 'finished');

  // Apply search, filter, and sort
  const filteredOrders = useMemo(() => {
    let orders = [...salesOrders];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(so =>
        so.id.toLowerCase().includes(query) ||
        so.customerName.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      orders = orders.filter(so => so.status === filterStatus);
    }

    if (filterDate) {
      orders = orders.filter(so => so.date.startsWith(filterDate));
    }

    if (filterSales !== 'all') {
      orders = orders.filter(so => so.salesName === filterSales);
    }

    orders.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else {
        cmp = a.totalAmount - b.totalAmount;
      }
      return sortAsc ? cmp : -cmp;
    });

    return orders;
  }, [salesOrders, searchQuery, filterStatus, filterDate, sortBy, sortAsc]);

  // Stats
  const totalSO = salesOrders.length;
  const totalRevenue = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
  const processingCount = salesOrders.filter(so => so.status === 'Processing').length;
  const completedCount = salesOrders.filter(so => so.status === 'Completed').length;

  const handleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {

    let finalItemsForSO = [...soItems];
    // Auto-add current item if fields are filled but "+" was not clicked
    if (currentItemId && currentQty > 0) {
      const item = inventory.find(i => i.id === currentItemId);
      if (item) {
        finalItemsForSO.push({
          productId: item.id,
          productName: item.name,
          quantity: currentQty,
          price: currentPrice || item.price,
          discount: currentDiscount || 0,
          unit: item.unit
        });
      }
    }

    if (customerName && finalItemsForSO.length > 0) {
      const subtotalBeforeGlobalDiscount = finalItemsForSO.reduce((sum, item) => {
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
        return sum + (itemSubtotal - itemDiscount);
      }, 0);
      
      const discountAmount = Math.round((subtotalBeforeGlobalDiscount * discount) / 100);
      const finalTotal = Math.round(subtotalBeforeGlobalDiscount - discountAmount);

      const getNowWithTime = () => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return soDate.includes(' ') ? soDate : `${soDate} ${timeStr}`;
      };

      if (editingSO) {
        updateSalesOrder(editingSO.id, {
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          salesName,
          date: getNowWithTime(),
          items: finalItemsForSO.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: Math.round(item.price),
            discount: item.discount
          })),
          totalAmount: finalTotal,
          paymentMethod: paymentMethod,
          dueDate: paymentMethod === 'Debt' ? dueDate : undefined,
        });

        // Sync CRM data on edit
        const existingCustomer = customers.find(c =>
          c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
        );
        if (existingCustomer) {
          updateCustomer(existingCustomer.id, {
            email: customerEmail || existingCustomer.email,
            phone: customerPhone || existingCustomer.phone,
            address: customerAddress || existingCustomer.address,
            salesName: salesName || existingCustomer.salesName
          });
        }
      } else {
        const newSO: SalesOrder = {
          id: `SO-${Date.now()}`,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          salesName,
          date: getNowWithTime(),
          items: finalItemsForSO.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: Math.round(item.price),
            discount: item.discount
          })),
          totalAmount: finalTotal,
          discount: 0,
          paymentMethod: paymentMethod,
          status: 'Processing',
          dueDate: paymentMethod === 'Debt' ? dueDate : undefined,
          isPaid: paymentMethod === 'Cash'
        };

        createSalesOrder(newSO);

        if (autoComplete) {
          completeSalesOrder(newSO.id, newSO);
        }
      }
      setIsModalOpen(false);
      setEditingSO(null);

      // Reset all states
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSalesName('');
      setSoItems([]);
      setDiscount(0);
      setPaymentMethod('Cash');
      setSoDate(new Date().toISOString().split('T')[0]);
      setDueDate(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      });
      setCurrentItemId('');
      setCurrentQty(0);
      setCurrentPrice(0);
      setCurrentDiscount(0);
    } else if (finalItemsForSO.length === 0) {
      alert('Mohon pilih setidaknya satu produk (klik tanda + atau isi jumlah barang).');
    }
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handlePrintInvoice = (so: SalesOrder) => {
    // Force a fresh state set and slightly longer delay for browser rendering
    setSelectedSO(null);
    setTimeout(() => {
      setSelectedSO({ ...so });
      setTimeout(() => {
        window.print();
      }, 800);
    }, 50);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return 'Selesai';
      case 'Processing': return 'Diproses';
      case 'Shipped': return 'Dikirim';
      default: return status;
    }
  };

  const getProductName = (productId: string) => {
    const item = inventory.find(i => i.id === productId);
    return item?.name || productId;
  };

  const getSalesUnit = (productId: string) => {
    const item = inventory.find(i => i.id === productId);
    if (!item) return '';
    // Logic: Pempek is sold in PCS (1kg = 32pcs) while Kerupuk is sold in KG
    if (item.category === 'Pempek' && item.unit === 'kg') return 'pcs';
    return item.unit;
  };

  const handleStartEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setTempPrice(currentPrice);
  };

  const handleSavePrice = (id: string) => {
    updateInventoryItem(id, { price: tempPrice });
    setEditingId(null);
  };

  const handleExport = () => {
    const dataToExport = filteredOrders.map(so => ({
      'ID Pesanan': so.id,
      'Pelanggan': so.customerName,
      'Sales': so.salesName || '-',
      'Tanggal': so.date,
      'Total Tagihan': so.totalAmount,
      'Metode': so.paymentMethod,
      'Status': getStatusLabel(so.status),
      'Alamat': so.customerAddress || '-',
      'Item': so.items.map(item => `${getProductName(item.productId)} (${item.quantity})`).join('; ')
    }));
    exportToExcelFormatted(
      `Penjualan_KITO_NIAN_${new Date().toISOString().split('T')[0]}.xls`, 
      'LAPORAN PENJUALAN KITO NIAN',
      dataToExport,
      '#10b981'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Management Penjualan</h1>
          <p className="text-slate-500 text-sm font-medium">Kelola pesanan, pelanggan, dan pengiriman barang.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition-all text-sm font-bold shadow-sm"
          >
            <Tag size={18} className="text-emerald-600" />
            Download Excel
          </button>
          {activeTab === 'pricelist' && (
            <button
              className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors text-sm font-medium"
              onClick={() => window.print()}
            >
              <Printer size={18} />
              Cetak
            </button>
          )}
          <button
            onClick={() => {
              setEditingSO(null);
              setCustomerName('');
              setCustomerEmail('');
              setCustomerPhone('');
              setCustomerAddress('');
              setSalesName('');
              setSoItems([]);
              setPaymentMethod('Cash');
              setSoDate(new Date().toISOString().split('T')[0]);
              setIsModalOpen(true);
            }}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold"
          >
            <Plus size={20} />
            Buat Pesanan
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'orders' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Daftar Pesanan
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button
          onClick={() => { setActiveTab('pricelist'); setSearchQuery(''); }}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'pricelist' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Daftar Harga (Pricelist)
          {activeTab === 'pricelist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-sm font-medium text-slate-500">Total SO</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalSO}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <span className="text-sm font-medium text-slate-500">Total Pendapatan</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">Rp {(totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Package size={20} />
                </div>
                <span className="text-sm font-medium text-slate-500">Diproses</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{processingCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle size={20} />
                </div>
                <span className="text-sm font-medium text-slate-500">Selesai</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nomor SO atau pelanggan..."
                  className="pl-10 pr-10 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="relative w-44">
                <input
                  type="date"
                  className="px-3 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-slate-600"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  title="Filter Berdasarkan Tanggal"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${(filterStatus !== 'all' || filterSales !== 'all')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Filter size={18} />
                  Filter
                  {(filterStatus !== 'all' || filterSales !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-3 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-100">Status</p>
                      <div className="mt-1 space-y-0.5">
                        {[
                          { value: 'all', label: 'Semua Status' },
                          { value: 'Processing', label: '🟡 Diproses' },
                          { value: 'Shipped', label: '🔵 Dikirim' },
                          { value: 'Completed', label: '🟢 Selesai' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setFilterStatus(opt.value); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${filterStatus === opt.value
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-100">Sales</p>
                      <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => { setFilterSales('all'); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${filterSales === 'all'
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          Semua Sales
                        </button>
                        {Array.from(new Set(salesOrders.map(so => so.salesName).filter(Boolean))).map(salesNameOpt => (
                          <button
                            key={salesNameOpt}
                            type="button"
                            onClick={() => { setFilterSales(salesNameOpt!); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${filterSales === salesNameOpt
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            👤 {salesNameOpt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Nomor SO</th>
                    <th className="px-6 py-4">Pelanggan</th>
                    <th className="px-6 py-4">Sales</th>
                    <th className="px-6 py-4">
                      <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-slate-700">
                        Tanggal
                        <ArrowUpDown size={14} className={sortBy === 'date' ? 'text-emerald-600' : 'opacity-30'} />
                      </button>
                    </th>
                    <th className="px-6 py-4">Barang</th>
                    <th className="px-6 py-4">Pembayaran</th>
                    <th className="px-6 py-4">
                      <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-slate-700">
                        Total Tagihan
                        <ArrowUpDown size={14} className={sortBy === 'amount' ? 'text-emerald-600' : 'opacity-30'} />
                      </button>
                    </th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-slate-500">
                          {searchQuery || filterStatus !== 'all'
                            ? 'Tidak ditemukan pesanan yang cocok.'
                            : 'Tidak ada pesanan penjualan. Buat satu untuk memulai.'}
                        </p>
                        <p className="text-sm mt-1">
                          {searchQuery ? 'Coba kata kunci lain.' : filterStatus !== 'all' ? 'Coba filter lain.' : ''}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((so) => (
                      <tr key={so.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{so.id}</td>
                        <td className="px-6 py-4 text-slate-600">{so.customerName}</td>
                        <td className="px-6 py-4 text-slate-600">{so.salesName || '-'}</td>
                        <td className="px-6 py-4 text-slate-500">{so.date}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {so.items.map(item => getProductName(item.productId)).join(', ')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                            so.paymentMethod === 'Cash' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                          )}>
                            {so.paymentMethod === 'Cash' ? 'Cash' : 'Utang'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-medium">Rp {so.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${so.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            so.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            {getStatusLabel(so.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedSO(so); setIsDetailModalOpen(true); }}
                              className="px-2 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg flex items-center gap-1.5 transition-all text-[10px] font-bold"
                              title="Lihat Detail"
                            >
                              <Eye size={14} /> Lihat
                            </button>
                            <button
                              onClick={() => handlePrintInvoice(so)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Cetak Invoice"
                            >
                              <Printer size={16} />
                            </button>
                            {so.status !== 'Completed' && (
                              <button
                                onClick={() => completeSalesOrder(so.id)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Tandai Selesai"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingSO(so);
                                setCustomerName(so.customerName);
                                setCustomerEmail(so.customerEmail || '');
                                setCustomerPhone(so.customerPhone || '');
                                setCustomerAddress(so.customerAddress || '');
                                setSalesName(so.salesName || '');
                                setSoItems(so.items.map(item => ({
                                  productId: item.productId,
                                  productName: getProductName(item.productId),
                                  quantity: item.quantity,
                                  price: item.price,
                                  discount: item.discount || 0,
                                  unit: inventory.find(i => i.id === item.productId)?.unit || 'pcs'
                                })));
                                setPaymentMethod(so.paymentMethod);
                                setSoDate(so.date.split(' ')[0]);
                                setDueDate(so.dueDate || '');
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit Pesanan"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Apakah Anda yakin ingin menghapus pesanan ini? Jika sudah selesai, stok akan dikembalikan.')) {
                                  deleteSalesOrder(so.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus Pesanan"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            {filteredOrders.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                <span>Menampilkan {filteredOrders.length} dari {salesOrders.length} pesanan</span>
                <span>Total: <strong className="text-slate-700">Rp {filteredOrders.reduce((s, so) => s + so.totalAmount, 0).toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari produk atau kategori..."
                className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Satuan</th>
                  <th className="px-6 py-4 text-right">Harga Jual per PCS</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finishedGoods.filter(i =>
                  i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  i.category.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Tag size={48} className="mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-slate-500">Tidak ada produk ditemukan.</p>
                    </td>
                  </tr>
                ) : (
                  finishedGoods
                    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            item.category === 'Pempek' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                              item.category === 'Kerupuk' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                "bg-slate-100 text-slate-600"
                          )}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-slate-500">{item.category === 'Pempek' && item.unit === 'kg' ? 'per pcs' : item.unit}</td>
                        <td className="px-6 py-4 text-right">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-end gap-2 text-sm">
                              <span className="text-slate-400">Rp</span>
                              <input
                                type="number"
                                className="w-24 px-2 py-1 border border-emerald-500 rounded focus:outline-none text-right font-bold text-slate-900"
                                value={tempPrice}
                                onChange={e => setTempPrice(Number(e.target.value))}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSavePrice(item.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900">Rp {item.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleSavePrice(item.id)} className="p-1 px-2 bg-emerald-600 text-white rounded text-xs">Simpan</button>
                              <button onClick={() => setEditingId(null)} className="p-1 px-2 bg-slate-200 text-slate-600 rounded text-xs">Batal</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item.id, item.price)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Ubah Harga"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedSO(null); }}
        title={`Detail Pesanan: ${selectedSO?.id}`}
        size="lg"
      >
        {selectedSO && (() => {
          const customerInfo = customers.find(c => 
            c.name.toLowerCase().trim() === selectedSO.customerName.toLowerCase().trim()
          );
          return (
            <div className="space-y-6">
              {/* Invoice Header Simulation */}
              <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-100">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">INVOICE</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">KITO NIAN</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900 mb-0.5">{selectedSO.id}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedSO.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Details Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-50 pb-1">Detail Pelanggan</h4>
                    <p className="text-lg font-black text-slate-900 mb-1">{selectedSO.customerName}</p>
                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      {(selectedSO.customerPhone || customerInfo?.phone) && (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="font-bold">Contact:</span> {selectedSO.customerPhone || customerInfo?.phone}
                        </p>
                      )}
                      {selectedSO.salesName && (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="font-bold">Sales:</span> {selectedSO.salesName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 italic max-w-xs leading-relaxed flex items-start gap-1.5">
                        <MapPin size={12} className="mt-0.5 text-slate-400 shrink-0" />
                        {selectedSO.customerAddress || customerInfo?.address || 'Alamat tidak tersedia'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Details Section */}
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Pesanan</p>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider flex items-center gap-1.5 w-fit ${
                        selectedSO.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        selectedSO.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {selectedSO.status === 'Completed' ? <CheckCircle size={12} /> : null}
                        {getStatusLabel(selectedSO.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tight">Status Bayar</p>
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider flex items-center gap-1.5 w-fit",
                        selectedSO.paymentMethod === 'Cash' || selectedSO.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      )}>
                        {(selectedSO.paymentMethod === 'Cash' || selectedSO.isPaid) ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {(selectedSO.paymentMethod === 'Cash' || selectedSO.isPaid) ? 'LUNAS' : 'BELUM LUNAS'}
                      </span>
                    </div>
                    {/* Add Payment Method indicator separately */}
                    <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Metode Pembayaran:</span>
                      <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", selectedSO.paymentMethod === 'Cash' ? "text-blue-600 bg-blue-50" : "text-rose-600 bg-rose-50")}>
                        {selectedSO.paymentMethod}
                      </span>
                    </div>
                    {selectedSO.dueDate && selectedSO.paymentMethod === 'Debt' && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Jatuh Tempo</p>
                        <p className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 w-fit">
                          📅 {selectedSO.dueDate}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-md border border-slate-100 w-fit">
                Rincian Barang Pesanan
              </h4>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left font-black uppercase text-[10px] tracking-wider">Produk</th>
                      <th className="px-5 py-3 text-center font-black uppercase text-[10px] tracking-wider">Jumlah</th>
                      <th className="px-5 py-3 text-right font-black uppercase text-[10px] tracking-wider">Harga</th>
                      <th className="px-5 py-3 text-right font-black uppercase text-[10px] tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSO.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900">{getProductName(item.productId)}</td>
                        <td className="px-5 py-4 text-center font-black text-slate-700 bg-slate-50/50">{item.quantity} {getSalesUnit(item.productId)}</td>
                        <td className="px-5 py-4 text-right text-slate-500 italic">
                          Rp {item.price.toLocaleString()}
                          {item.discount > 0 && (
                            <span className="block text-[9px] text-orange-500">Disc {item.discount}%</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-slate-900">
                          Rp {Math.round((item.quantity * item.price) * (1 - (item.discount || 0) / 100)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black divide-y divide-slate-800">
                    {selectedSO.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Diskon {selectedSO.discount}%:</td>
                        <td className="px-5 py-2 text-right text-orange-400 text-xs italic">
                          - Rp {((selectedSO.items.reduce((sum, i) => sum + (i.quantity * i.price * (1 - (i.discount || 0) / 100)), 0) * selectedSO.discount) / 100).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest text-emerald-500">Total Tagihan Final:</td>
                      <td className="px-5 py-4 text-right text-emerald-400 text-xl tracking-tighter">
                        Rp {selectedSO.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between items-center px-4 pt-2">
                <div className="text-[10px] text-slate-400 italic font-medium">
                  * Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.<br/>
                  * Terima kasih atas kepercayaan Anda!
                </div>
                <div className="text-center pt-2">
                  <div className="h-10 w-24 border-b border-slate-200 mb-1 mx-auto" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Admin Sales</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              {selectedSO.status !== 'Completed' && (
                <button
                  onClick={() => {
                    completeSalesOrder(selectedSO.id);
                    setIsDetailModalOpen(false);
                    setSelectedSO(null);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Tandai Selesai
                </button>
              )}
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedSO(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        );
      })()}
    </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingSO(null);
        }} 
        title={editingSO ? `Edit Pesanan: ${editingSO.id}` : "Buat Pesanan Penjualan Baru"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 min-h-[600px] max-h-[85vh] overflow-hidden">
          {/* LEFT SIDE: Product Grid */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                  filterCategory === 'all' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}
              >
                Semua
              </button>
              {Array.from(new Set(finishedGoods.map(i => i.category))).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                    filterCategory === cat ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {finishedGoods
                .filter(item => filterCategory === 'all' || item.category === filterCategory)
                .map(item => {
                  const inCart = soItems.find(i => i.productId === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const existing = soItems.find(i => i.productId === item.id);
                        if (existing) {
                          setSoItems(soItems.map(i => i.productId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                        } else {
                          setSoItems([...soItems, {
                            productId: item.id,
                            productName: item.name,
                            quantity: 1,
                            price: item.price,
                            discount: 0,
                            unit: item.unit
                          }]);
                        }
                      }}
                      className={cn(
                        "relative flex flex-col p-3 rounded-2xl border-2 text-left transition-all active:scale-95 group",
                        inCart ? "border-emerald-500 bg-emerald-50/30 shadow-md shadow-emerald-100" : "border-slate-100 hover:border-slate-200 bg-white"
                      )}
                    >
                      {inCart && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in duration-300">
                          {inCart.quantity}
                        </div>
                      )}
                      <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                        <Package className={cn("transition-colors", inCart ? "text-emerald-500" : "text-slate-300")} size={32} />
                      </div>
                      <div className="min-h-[40px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{item.category}</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{item.name}</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-emerald-600">Rp {item.price.toLocaleString()}</p>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* RIGHT SIDE: Cart & Details */}
          <div className="w-full lg:w-96 flex flex-col bg-slate-50 rounded-2xl border border-slate-100 p-4 min-h-0">
            {/* Customer Picker */}
            <div className="mb-4 space-y-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data Pelanggan</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Pelanggan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  value={customerName}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomerName(val);
                    const existing = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                    if (existing) {
                      setCustomerPhone(existing.phone || '');
                      setCustomerAddress(existing.address || '');
                      if (existing.salesName) {
                        setSalesName(existing.salesName);
                      }
                    }
                  }}
                  list="customer-pos-list"
                />
                <datalist id="customer-pos-list">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
                
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="No. WA"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email (Opsional)"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="mt-2">
                  <textarea
                    rows={1}
                    placeholder="Alamat Lengkap Pengiriman..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none resize-none"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                  />
                </div>
                <div className="mt-2">
                  <input
                    type="date"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                    value={soDate}
                    onChange={e => setSoDate(e.target.value)}
                  />
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Pilih/Ketik Nama Sales..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none"
                    value={salesName}
                    onChange={e => setSalesName(e.target.value)}
                    list="sales-name-list"
                  />
                  <datalist id="sales-name-list">
                    {availableSalesNames.map(name => <option key={name} value={name} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1 custom-scrollbar">
              {soItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50">
                  <ShoppingBag size={48} strokeWidth={1.5} />
                  <p className="text-xs font-bold uppercase tracking-widest text-center">Keranjang Masih Kosong<br/><span className="font-normal lowercase">klik menu di kiri untuk menambah</span></p>
                </div>
              ) : (
                soItems.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-3 group transition-all hover:border-emerald-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">{item.productName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Unit: {item.unit}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Qty Controls */}
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              setSoItems(soItems.map((si, i) => i === idx ? { ...si, quantity: Number((si.quantity - 1).toFixed(2)) } : si));
                            } else {
                              handleRemoveItem(idx);
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-rose-50"
                        >
                          <Plus size={10} className="rotate-45" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          className="text-xs font-black w-10 text-center bg-transparent border-none focus:ring-0 outline-none p-0"
                          value={item.quantity}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setSoItems(soItems.map((si, i) => i === idx ? { ...si, quantity: val } : si));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSoItems(soItems.map((si, i) => i === idx ? { ...si, quantity: Number((si.quantity + 1).toFixed(2)) } : si));
                          }}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-emerald-50"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      {/* Price & Discount Inputs */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400">Rp</span>
                          <input
                            type="number"
                            step="any"
                            className="w-full pl-5 pr-1 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold focus:ring-1 focus:ring-emerald-500/20 outline-none"
                            value={item.price}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setSoItems(soItems.map((si, i) => i === idx ? { ...si, price: val } : si));
                            }}
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-orange-500">%</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="Disc"
                            className="w-full pl-2 pr-4 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-orange-600 focus:ring-1 focus:ring-orange-500/20 outline-none"
                            value={item.discount || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setSoItems(soItems.map((si, i) => i === idx ? { ...si, discount: val } : si));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Subtotal</span>
                      <span className="text-[11px] font-black text-slate-800">
                        Rp {Math.round((item.quantity * item.price) * (1 - (item.discount || 0) / 100)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total & Action */}
            <div className="mt-auto space-y-3 pt-3 border-t border-slate-200">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Belanja</p>
                  <p className="text-2xl font-black text-slate-900 leading-none">
                    Rp {Math.round(soItems.reduce((sum, i) => sum + (i.price * i.quantity * (1 - (i.discount || 0) / 100)), 0)).toLocaleString()}
                  </p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", paymentMethod === 'Cash' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500")}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Debt')}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", paymentMethod === 'Debt' ? "bg-rose-600 text-white shadow-sm" : "text-slate-500")}
                  >
                    Utang
                  </button>
                </div>
              </div>

              {paymentMethod === 'Debt' && (
                <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-700">Tgl Jatuh Tempo:</span>
                  <input type="date" className="bg-transparent text-[10px] font-black text-rose-700 focus:outline-none" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
                </div>
              )}

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="posAutoComplete"
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  checked={autoComplete}
                  onChange={e => setAutoComplete(e.target.checked)}
                />
                <label htmlFor="posAutoComplete" className="text-[10px] font-bold text-slate-600">Selesaikan Pesanan & Potong Stok</label>
              </div>

              <button
                type="submit"
                disabled={soItems.length === 0 || !customerName || isSubmitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    MEMPROSES...
                  </>
                ) : (
                  'PROSES TRANSAKSI'
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE INVOICE AREA (Off-screen on UI, visible on print) */}
      <div 
        id="invoice-print" 
        className="fixed -left-[9999px] top-0 print:static print:left-0 bg-white w-full p-8 font-sans text-slate-900 z-[-1] print:z-[9999]"
      >
        {selectedSO && (() => {
          const sName = selectedSO.customerName?.toLowerCase().trim() || "";
          const customerInfo = customers.find(c => 
            c.name?.toLowerCase().trim() === sName
          );
          return (
            <div className="w-full border-2 border-slate-200 p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-3 no-break">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600 text-white p-2 rounded-lg">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">INVOICE</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] mt-1">Sistem ERP KITO NIAN</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-slate-900 uppercase">Nota No: {selectedSO.id}</p>
                  <p className="text-slate-500 font-medium tracking-wide">Tanggal: {selectedSO.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 no-break py-2">
                <div className="space-y-1 border-r border-slate-100 pr-4">
                  <p className="font-bold text-emerald-600 uppercase text-[9px] mb-1">Status Toko</p>
                  <p className="font-black text-sm text-slate-900 leading-tight">KITO NIAN</p>
                  <p className="text-slate-600 leading-tight">Palembang, Sumatera Selatan</p>
                  <p className="text-slate-600 font-medium">WhatsApp: 0812-3456-7890</p>
                </div>
                <div className="space-y-1 border-r border-slate-100 pr-4">
                  <p className="font-bold text-emerald-600 uppercase text-[9px] mb-1 italic tracking-widest border-b border-emerald-100 pb-0.5">Tujuan Pengiriman</p>
                  <p className="font-black text-sm text-slate-900 leading-tight uppercase">{selectedSO.customerName}</p>
                  <p className="text-slate-700 leading-tight font-bold text-[10px]">
                    {selectedSO.customerAddress || customerInfo?.address || 'Alamat tidak diatur'}
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    {(selectedSO.customerPhone || customerInfo?.phone) && (
                      <p className="text-slate-600 font-black text-[9px] flex items-center gap-1 bg-slate-50 p-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        TELP/WA: {selectedSO.customerPhone || customerInfo?.phone}
                      </p>
                    )}
                    {(selectedSO.customerEmail || customerInfo?.email) && (
                      <p className="text-slate-600 font-black text-[9px] flex items-center gap-1 bg-slate-50 p-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        EMAIL: {selectedSO.customerEmail || customerInfo?.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1 flex flex-col justify-center items-end">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right w-full">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Metode Pembayaran</p>
                    <p className="text-lg font-black text-emerald-600 uppercase italic">
                      {selectedSO.paymentMethod === 'Cash' ? '✓ Lunas (Tunai)' : '⚠ Piutang (Utang)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-emerald-600 text-white border-y border-emerald-700">
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Deskripsi Produk</th>
                      <th className="px-3 py-2 font-bold text-center w-24 uppercase tracking-wider">Jumlah</th>
                      <th className="px-3 py-2 font-bold text-right w-32 uppercase tracking-wider">Harga Satuan</th>
                      <th className="px-3 py-2 font-bold text-right w-32 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSO.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-bold text-slate-800">{getProductName(item.productId)}</td>
                        <td className="px-3 py-2 text-center text-slate-600 bg-slate-50/50">
                          {item.quantity} {getSalesUnit(item.productId)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 italic">
                          Rp {item.price.toLocaleString()}
                          {item.discount > 0 && (
                            <span className="block text-[8px] text-orange-500 font-bold">Disc {item.discount}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 bg-emerald-50/30">
                          Rp {Math.round((item.quantity * item.price) * (1 - (item.discount || 0) / 100)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 no-break">
                <div className="grid grid-cols-2 text-center text-[10px] items-end pb-2">
                  <div className="space-y-14">
                    <p className="font-bold border-b border-slate-200 pb-1 uppercase italic">Hormat Kami,</p>
                    <p className="font-black text-slate-900">( Admin Toko )</p>
                  </div>
                  <div className="space-y-14">
                    <p className="font-bold border-b border-slate-200 pb-1 uppercase italic">Penerima,</p>
                    <p className="font-black text-slate-900 uppercase italic">( {selectedSO.customerName} )</p>
                  </div>
                </div>
                <div className="flex justify-end pr-2">
                  <div className="w-72 space-y-1 border-t-2 border-slate-100 pt-2">
                    <div className="flex justify-between items-center text-slate-500 px-2 text-[10px]">
                      <span>Tagihan Barang:</span>
                      <span className="font-bold">Rp {selectedSO.items.reduce((sum, item) => sum + (item.quantity * item.price * (1 - (item.discount || 0) / 100)), 0).toLocaleString()}</span>
                    </div>
                    {selectedSO.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 px-2 bg-emerald-50 py-1 rounded text-[10px]">
                        <span className="font-black italic text-[9px]">Diskon Khusus ({selectedSO.discount}%):</span>
                        <span className="font-black">- Rp {((selectedSO.items.reduce((sum, item) => sum + (item.quantity * item.price * (1 - (item.discount || 0) / 100)), 0) * selectedSO.discount) / 100).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg shadow-inner mt-2">
                      <span className="text-xs font-black tracking-widest uppercase">Total Dibayar:</span>
                      <span className="text-xl font-black text-emerald-400">Rp {selectedSO.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center pt-2 border-t border-dashed border-slate-200 no-break">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">
                  *** Invoice ini sah dan terhubung dengan database CRM ERP System ***
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: 100%;
            padding: 0;
            background: white;
          }
          .no-break { break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
