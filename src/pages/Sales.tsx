import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Filter, Search, CheckCircle, X, Eye, ArrowUpDown, Package, ShoppingBag, Tag, Edit2, Save, Printer } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { SalesOrder } from '../lib/types';
import { cn } from '../lib/utils';

export default function Sales() {
  const { salesOrders, createSalesOrder, completeSalesOrder, inventory, updateInventoryItem } = useERP();
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
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debt'>('Cash');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);

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
    if (customerName && selectedProductId && quantity > 0 && price > 0) {
      const subtotal = price * quantity;
      const discountAmount = (subtotal * discount) / 100;
      const finalTotal = subtotal - discountAmount;

      const getNowWithTime = () => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return soDate.includes(' ') ? soDate : `${soDate} ${timeStr}`;
      };

      const newSO: SalesOrder = {
        id: `SO-${Date.now()}`,
        customerName,
        date: getNowWithTime(),
        items: [{ productId: selectedProductId, quantity, price }], // Store raw PCS quantity
        totalAmount: finalTotal,
        discount: discount,
        paymentMethod: paymentMethod,
        status: 'Processing'
      };
      createSalesOrder(newSO);
      setIsModalOpen(false);
      setCustomerName('');
      setSelectedProductId('');
      setQuantity(0);
      setPrice(0);
      setDiscount(0);
      setPaymentMethod('Cash');
      setSoDate(new Date().toISOString().split('T')[0]);
    }
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

      {/* Create SO Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Pesanan Penjualan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggan</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="misal: Warung Makan Padang"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Transaksi</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={soDate}
              onChange={e => setSoDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produk</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(e.target.value);
                const item = finishedGoods.find(i => i.id === e.target.value);
                if (item) {
                  setPrice(item.price);
                }
              }}
            >
              <option value="">Pilih Produk</option>
              {finishedGoods.map(item => {
                const isKg = item.unit === 'kg';
                const stockInPcs = isKg ? Math.round(item.stock * 78) : item.stock;
                const displayUnit = isKg ? 'pcs' : item.unit;
                return (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stok: {stockInPcs} {displayUnit})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
              <input
                type="number"
                required
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={quantity || ''}
                onChange={e => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Harga per Unit (Rp)</label>
              <input
                type="number"
                required
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={price || ''}
                onChange={e => setPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Discount Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Diskon (%)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={discount || ''}
                onChange={e => setDiscount(Number(e.target.value))}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={cn(
                  "py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                  paymentMethod === 'Cash'
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-100 bg-slate-50 text-slate-500 opacity-60"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  paymentMethod === 'Cash' ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                )}>
                  {paymentMethod === 'Cash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="font-bold text-xs">CASH</span>
                <span className="text-[9px] opacity-70">Lunas</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Debt')}
                className={cn(
                  "py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                  paymentMethod === 'Debt'
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-slate-100 bg-slate-50 text-slate-500 opacity-60"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  paymentMethod === 'Debt' ? "border-red-600 bg-red-600" : "border-slate-300"
                )}>
                  {paymentMethod === 'Debt' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="font-bold text-xs">UTANG</span>
                <span className="text-[9px] opacity-70">Piutang</span>
              </button>
            </div>
          </div>

          {/* Preview total */}
          {quantity > 0 && price > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 border border-slate-800 shadow-xl">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Subtotal:</span>
                <span>Rp {(quantity * price).toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 text-sm font-medium">
                  <span>Diskon {discount}%:</span>
                  <span>- Rp {((quantity * price * discount) / 100).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-lg">Total Akhir:</span>
                <span className="font-bold text-2xl text-emerald-500">
                  Rp {((quantity * price) - ((quantity * price * discount) / 100)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200"
            >
              Buat Pesanan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
