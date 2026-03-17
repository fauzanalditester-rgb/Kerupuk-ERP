import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Filter, Search, CheckCircle, X, Eye, ArrowUpDown, Package, ShoppingBag, Tag, Edit2, Save, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { SalesOrder } from '../lib/types';
import { cn } from '../lib/utils';

export default function Sales() {
  const {
    salesOrders,
    createSalesOrder,
    completeSalesOrder,
    inventory,
    updateInventoryItem,
    customers,
    addCustomer
  } = useERP();
  const [activeTab, setActiveTab] = useState<'orders' | 'pricelist'>('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);

  // Pricelist Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // New SO State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [soItems, setSoItems] = useState<{ productId: string; productName: string; quantity: number; price: number; unit: string }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debt'>('Cash');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [autoComplete, setAutoComplete] = useState(true);

  // Current item being added
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQty, setCurrentQty] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);

  const SALES_TEMPLATES = [
    {
      id: 'template-pempek-lengkap',
      name: 'Paket Pempek Lengkap',
      items: [
        { productId: 'PEM-LENGKAP', name: 'Pempek Campur', quantity: 20, price: 5000 },
        { productId: 'CUKO-BKS', name: 'Cuko Bungkus', quantity: 2, price: 10000 }
      ]
    },
    {
      id: 'template-kerupuk-warung',
      name: 'Paket Kerupuk Warung',
      items: [
        { productId: 'KRP-PANGGANG', name: 'Kerupuk Panggang', quantity: 10, price: 15000 },
        { productId: 'KRP-IKAN', name: 'Kerupuk Ikan', quantity: 10, price: 12000 }
      ]
    }
  ];

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
          unit: item.unit
        }]);
        setCurrentItemId('');
        setCurrentQty(0);
        setCurrentPrice(0);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
          unit: item.unit
        });
      }
    }

    if (customerName && finalItemsForSO.length > 0) {
      const subtotal = finalItemsForSO.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = Math.round((subtotal * discount) / 100);
      const finalTotal = Math.round(subtotal - discountAmount);

      const getNowWithTime = () => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return soDate.includes(' ') ? soDate : `${soDate} ${timeStr}`;
      };

      const newSO: SalesOrder = {
        id: `SO-${Date.now()}`,
        customerName,
        date: getNowWithTime(),
        items: finalItemsForSO.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: Math.round(item.price)
        })),
        totalAmount: finalTotal,
        discount: discount,
        paymentMethod: paymentMethod,
        status: 'Processing',
        dueDate: paymentMethod === 'Debt' ? dueDate : undefined,
        isPaid: paymentMethod === 'Cash'
      };

      createSalesOrder(newSO);

      // Auto-add new customer if they don't exist in CRM
      const customerExists = customers.some(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (!customerExists) {
        addCustomer({
          id: `CUST-${Date.now()}`,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
          totalOrders: 1,
          totalSpent: finalTotal
        });
      }

      if (autoComplete) {
        completeSalesOrder(newSO.id, newSO);
      }
      setIsModalOpen(false);

      // Reset all states
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerAddress('');
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
    } else if (finalItemsForSO.length === 0) {
      alert('Mohon pilih setidaknya satu produk (klik tanda + atau isi jumlah barang).');
    }
  };

  const handlePrintInvoice = (so: SalesOrder) => {
    setSelectedSO(so);
    setTimeout(() => {
      window.print();
    }, 500);
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

  const getProductUnit = (productId: string) => {
    const item = inventory.find(i => i.id === productId);
    return item?.unit || '';
  };

  const handleStartEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setTempPrice(currentPrice);
  };

  const handleSavePrice = (id: string) => {
    updateInventoryItem(id, { price: tempPrice });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Penjualan</h1>
          <p className="text-slate-500 mt-1">Kelola pesanan penjualan dan faktur.</p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
          >
            <Plus size={18} />
            Pesanan Penjualan Baru
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
                  className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${filterStatus !== 'all'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Filter size={18} />
                  Filter
                  {filterStatus !== 'all' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Status</p>
                    {[
                      { value: 'all', label: 'Semua Status' },
                      { value: 'Processing', label: '🟡 Diproses' },
                      { value: 'Shipped', label: '🔵 Dikirim' },
                      { value: 'Completed', label: '🟢 Selesai' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setFilterStatus(opt.value); setIsFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterStatus === opt.value
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
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
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
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
                        <td className="px-6 py-4 text-slate-500">{item.unit === 'kg' ? 'per pcs' : item.unit}</td>
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
      >
        {selectedSO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pelanggan</p>
                <p className="font-semibold text-slate-900">{selectedSO.customerName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                <p className="font-semibold text-slate-900">{selectedSO.date}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${selectedSO.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  selectedSO.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                  {getStatusLabel(selectedSO.status)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Tagihan</p>
                <p className="font-bold text-emerald-600 text-lg">Rp {selectedSO.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pembayaran</p>
                <span className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase",
                  selectedSO.paymentMethod === 'Cash' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                )}>
                  {selectedSO.paymentMethod === 'Cash' ? 'Cash' : 'Utang'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Daftar Barang</p>
              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Produk</th>
                      <th className="px-4 py-2 text-left">Jumlah</th>
                      <th className="px-4 py-2 text-left">Harga/Unit</th>
                      <th className="px-4 py-2 text-left">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSO.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{getProductName(item.productId)}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quantity} pcs</td>
                        <td className="px-4 py-3 text-slate-600">Rp {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">Rp {(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    {selectedSO.discount && selectedSO.discount > 0 && (
                      <tr className="border-t border-slate-100 bg-emerald-50/30">
                        <td colSpan={3} className="px-4 py-2 text-right text-emerald-700 font-medium text-xs uppercase tracking-wider">Diskon {selectedSO.discount}%</td>
                        <td className="px-4 py-2 font-bold text-emerald-700">- Rp {((selectedSO.items.reduce((sum, i) => sum + (i.quantity * i.price), 0) * selectedSO.discount) / 100).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Pesanan Penjualan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={customerName}
                onChange={e => {
                  const val = e.target.value;
                  setCustomerName(val);

                  // Auto-fill existing customer info if found
                  const existingCustomer = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                  if (existingCustomer) {
                    setCustomerEmail(existingCustomer.email || '');
                    setCustomerPhone(existingCustomer.phone || '');
                    setCustomerAddress(existingCustomer.address || '');
                  }
                }}
                placeholder="misal: Warung Makan Padang"
                list="customer-history"
              />
              <datalist id="customer-history">
                {Array.from(new Set(customers.map(c => c.name))).map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={soDate}
                onChange={e => setSoDate(e.target.value)}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Pelanggan</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">No. Telepon / WA</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="0812xxxx"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="Jl. Contoh No. 123..."
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Barang</label>
            </div>
            <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] text-slate-500 mb-1 font-bold">PRODUK</label>
                <select
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none"
                  value={currentItemId}
                  onChange={e => {
                    const id = e.target.value;
                    setCurrentItemId(id);
                    const item = inventory.find(i => i.id === id);
                    if (item) setCurrentPrice(item.price);
                  }}
                >
                  <option value="">Pilih Produk...</option>
                  {finishedGoods.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="block text-[10px] text-slate-500 mb-1 font-bold">QTY</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none"
                  value={currentQty || ''}
                  onChange={e => setCurrentQty(Number(e.target.value))}
                />
              </div>
              <div className="w-24">
                <label className="block text-[10px] text-slate-500 mb-1 font-bold">HARGA</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none font-bold"
                  value={currentPrice || ''}
                  onChange={e => setCurrentPrice(Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="p-1.5 bg-slate-800 text-white rounded hover:bg-slate-900"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {soItems.length > 0 && (
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="px-3 py-2 text-left">Barang</th>
                    <th className="px-3 py-2 text-center">Jumlah</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {soItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">Rp {item.price.toLocaleString()}</p>
                      </td>
                      <td className="px-3 py-2 text-center">{item.quantity} {item.unit === 'kg' ? 'pcs' : item.unit}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                        Rp {Math.round(item.quantity * item.price).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-100">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-slate-400">TOTAL:</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      Rp {Math.round(soItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diskon (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value))}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              {(() => {
                const subtotalFromList = soItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const currentItemSubtotal = (currentQty > 0) ? (currentPrice || 0) * currentQty : 0;
                const subtotal = subtotalFromList + currentItemSubtotal;

                const discountAmount = Math.round((subtotal * (discount || 0)) / 100);
                const finalTotal = subtotal - discountAmount;
                if (discount > 0 && subtotal > 0) {
                  return (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* LABEL HASIL POTONGAN */}
                      <div className="p-3 bg-white border-2 border-dashed border-emerald-200 rounded-xl flex justify-between items-center shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hasil Potongan ({discount}%):</span>
                          <span className="text-lg font-black text-emerald-600 leading-none">
                            Rp {discountAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-slate-100 mx-2" />
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Harga Akhir:</span>
                          <span className="text-lg font-black text-slate-900 leading-none tracking-tighter">
                            Rp {finalTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-tighter">
                        * Nilai di atas otomatis dihitung dari {discount}% subtotal
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={cn(
                    "py-2 rounded-lg border text-xs font-bold transition-all",
                    paymentMethod === 'Cash' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}
                >
                  CASH
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Debt')}
                  className={cn(
                    "py-2 rounded-lg border text-xs font-bold transition-all",
                    paymentMethod === 'Debt' ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}
                >
                  UTANG
                </button>
              </div>
              {paymentMethod === 'Debt' && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">
                    Tanggal Jatuh Tempo (UTANG)
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/30 text-xs font-bold"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                  <p className="text-[9px] text-rose-400 mt-1 italic">* Pesanan akan muncul di peringatan Finance jika belum lunas.</p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Order Summary */}
          {(() => {
            const subtotalFromList = soItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const currentItemSubtotal = (currentQty > 0) ? (currentPrice || 0) * currentQty : 0;
            const subtotal = subtotalFromList + currentItemSubtotal;

            const discountAmount = Math.round((subtotal * (discount || 0)) / 100);
            const finalTotal = subtotal - discountAmount;

            if (subtotal > 0) {
              return (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 shadow-inner animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
                    <span>Ringkasan Biaya</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Total Harga (Subtotal)</span>
                      <span>Rp {subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-orange-400 font-medium italic">
                          <span>Potongan Diskon ({discount}%)</span>
                          <span>- Rp {discountAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-emerald-300 font-bold border-t border-slate-800 pt-1 mt-1">
                          <span>Harga Setelah Diskon</span>
                          <span>Rp {finalTotal.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="pt-3 border-t-2 border-emerald-500/30 flex justify-between items-center text-white">
                    <div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter block leading-none mb-1">Total yang Harus Dibayar</span>
                      <span className="text-sm font-bold">TOTAL TAGIHAN:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                        Rp {finalTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex items-center gap-2 py-2 bg-emerald-50/50 px-3 rounded-lg border border-emerald-100">
            <input
              type="checkbox"
              id="autoComplete"
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              checked={autoComplete}
              onChange={e => setAutoComplete(e.target.checked)}
            />
            <label htmlFor="autoComplete" className="text-sm font-medium text-emerald-800">
              Langsung selesaikan pesanan (Potong Stok Otomatis)
            </label>
          </div>

          <div className="pt-4 flex gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors"
            >
              Simpan Pesanan
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE INVOICE AREA (Hidden normally, visible in print) */}
      <div id="invoice-print" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-sans text-slate-900">
        {selectedSO && (() => {
          const customerInfo = customers.find(c => c.name === selectedSO.customerName);
          return (
            <div className="w-full border-2 border-slate-200 p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-3 no-break">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600 text-white p-2 rounded-lg">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">INVOICE</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] mt-1">Sistem ERP Kedai Kurupuk & Pempek</p>
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
                  <p className="font-black text-sm text-slate-900 leading-tight">Kedai Kurupuk & Pempek</p>
                  <p className="text-slate-600 leading-tight">Jl. Contoh No. 123, Kawasan Lagoi Bay</p>
                  <p className="text-slate-600 font-medium">WhatsApp: 0812-3456-7890</p>
                </div>
                <div className="space-y-1 border-r border-slate-100 pr-4">
                  <p className="font-bold text-emerald-600 uppercase text-[9px] mb-1">Data Pelanggan (CRM Terhubung)</p>
                  <p className="font-black text-sm text-slate-900 leading-tight">{selectedSO.customerName}</p>
                  <p className="text-slate-600 leading-tight italic">
                    {customerInfo?.address || 'Alamat tidak ditemukan di CRM'}
                  </p>
                  <p className="text-slate-600 font-medium text-[10px]">
                    Telp: {customerInfo?.phone || 'No. Telp tidak tersedia'}
                  </p>
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
                          {item.quantity} {getProductUnit(item.productId)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 italic">Rp {item.price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 bg-emerald-50/30">
                          Rp {(item.quantity * item.price).toLocaleString()}
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
                      <span className="font-bold">Rp {selectedSO.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
                    </div>
                    {selectedSO.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 px-2 bg-emerald-50 py-1 rounded text-[10px]">
                        <span className="font-black italic text-[9px]">Diskon Khusus ({selectedSO.discount}%):</span>
                        <span className="font-black">- Rp {((selectedSO.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) * selectedSO.discount) / 100).toLocaleString()}</span>
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
