import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Package,
  AlertTriangle,
  History,
  ArrowDownRight,
  Download,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { InventoryItem, Category, Unit, StockMovement } from '../lib/types';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'raw' | 'finished' | 'supply'>('raw');
  const { inventory, addInventoryItem, stockMovements, updateInventoryStock, addTransaction } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [usageAmount, setUsageAmount] = useState<number | string>('');
  const [usageReason, setUsageReason] = useState<string>('Pemakaian Operasional');
  const [selectedUsageItemId, setSelectedUsageItemId] = useState<string>('');
  const [usageUnit, setUsageUnit] = useState<Unit>('kg');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<'category' | 'name' | 'stock' | 'price' | 'value' | 'id'>('id');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'raw' | 'finished'>('all');

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    category: 'Bahan Baku',
    unit: 'kg',
    type: 'raw'
  });

  const rawMaterials = useMemo(() => inventory.filter(item => item.type === 'raw' || !item.type), [inventory]);
  const finishedGoods = useMemo(() => inventory.filter(item => item.type === 'finished'), [inventory]);
  const supplyItems = useMemo(() => inventory.filter(item => item.type === 'supply'), [inventory]);

  const baseItems = useMemo(() => {
    if (activeTab === 'raw') return rawMaterials;
    if (activeTab === 'finished') return finishedGoods;
    return [...rawMaterials, ...finishedGoods];
  }, [activeTab, rawMaterials, finishedGoods]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(baseItems.map(i => i.category))];
    return cats;
  }, [baseItems]);

  // Apply search, filter, and sort
  const currentItems = useMemo(() => {
    let items = [...baseItems];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      items = items.filter(item => item.category === filterCategory);
    }

    // Filter by date
    if (filterDate) {
      items = items.filter(item => {
        const isCreatedToday = item.createdAt.startsWith(filterDate);
        const hasMovementToday = stockMovements.some(m => m.itemId === item.id && m.date.startsWith(filterDate));
        return isCreatedToday || hasMovementToday;
      });
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'stock': cmp = a.stock - b.stock; break;
        case 'price': cmp = a.price - b.price; break;
        case 'value': cmp = (a.stock * a.price) - (b.stock * b.price); break;
        case 'id': cmp = a.id.localeCompare(b.id); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return items;
  }, [baseItems, searchQuery, filterCategory, filterDate, sortBy, sortAsc, stockMovements]);

  const totalValue = useMemo(() => currentItems.reduce((acc, item) => acc + (item.stock * item.price), 0), [currentItems]);
  const lowStockCount = useMemo(() => currentItems.filter(i => i.stock <= i.minStock).length, [currentItems]);

  const filteredMovements = useMemo(() => {
    return stockMovements
      .filter(m => {
        const item = inventory.find(i => i.id === m.itemId);
        const isTargetType = item && (item.type === 'raw' || item.type === 'finished');
        if (!isTargetType) return false;

        // Filter by specific type if not 'all'
        if (filterType !== 'all' && item.type !== filterType) return false;

        const matchesSearch = m.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.reason.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDate = !filterDate || m.date.startsWith(filterDate);

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [stockMovements, inventory, searchQuery, filterDate, filterType]);

  const handleSort = (field: 'category' | 'name' | 'stock' | 'price' | 'value') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleSubmitUsage = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = selectedItem?.id || selectedUsageItemId;
    const item = inventory.find(i => i.id === itemId);
    const amountInput = Number(usageAmount);

    if (itemId && item && amountInput > 0) {
      let finalAmount = amountInput;
      const baseUnit = item.unit.toLowerCase();
      const inputUnit = usageUnit.toLowerCase();

      // Handle conversions
      if (item.category !== 'Kerupuk') {
        if (baseUnit === 'kg' && (inputUnit === 'pcs' || inputUnit === 'bks')) {
          finalAmount = Number((amountInput / 32).toFixed(5));
        } else if ((baseUnit === 'pcs' || baseUnit === 'bks') && inputUnit === 'kg') {
          finalAmount = Number((amountInput * 32).toFixed(5));
        }
      }

      updateInventoryStock(
        itemId,
        -Math.abs(finalAmount),
        'Out',
        usageReason,
        undefined,
        undefined,
        amountInput,
        usageUnit
      );

      setIsUsageModalOpen(false);
      setUsageAmount('');
      setUsageReason('Pemakaian Operasional');
      setSelectedUsageItemId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.price !== undefined) {
      addInventoryItem({
        id: Date.now().toString(),
        name: newItem.name,
        category: newItem.category as Category,
        stock: Number(newItem.stock || 0),
        unit: newItem.unit as Unit,
        minStock: Number(newItem.minStock || 0),
        price: Number(newItem.price),
        type: activeTab,
        createdAt: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      setNewItem({
        category: activeTab === 'raw' ? 'Bahan Baku' : activeTab === 'finished' ? 'Barang Jadi' : 'Operasional',
        unit: activeTab === 'supply' ? 'tabung' : 'kg',
        type: activeTab
      });
    }
  };

  const handleExportCSV = () => {
    const headers = activeTab === 'raw'
      ? ['Kategori', 'Nama Barang', 'Stok Kg', 'Harga Satuan', 'Total Nilai', 'Status', 'Tanggal Input']
      : ['Kategori', 'Nama Barang', 'Stok Kg', 'Stok Unit (PCS/BKS)', 'Status', 'Tanggal Input'];

    const rows = currentItems.map(item => {
      if (activeTab === 'raw') {
        return [
          item.category,
          item.name,
          `${item.stock} ${item.unit}`,
          item.price,
          item.stock * item.price,
          item.stock <= item.minStock ? 'Stok Rendah' : 'Baik',
          item.createdAt
        ];
      } else {
        return [
          item.category,
          item.name,
          item.stock,
          (item.unit === 'kg' && item.category !== 'Kerupuk') ? Math.round(item.stock * 32) : item.stock,
          item.stock <= item.minStock ? 'Stok Rendah' : 'Baik',
          item.createdAt
        ];
      }
    });

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventaris_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Inventaris</h1>
          <p className="text-slate-500 mt-1">Pantau stok bahan baku, barang jadi, dan alat operasional .</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'supply' && (
            <button
              onClick={() => {
                setSelectedItem(null);
                setUsageAmount('');
                setUsageUnit('kg');
                setUsageReason('');
                setIsUsageModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg flex items-center gap-2 hover:bg-amber-600 transition-colors shadow-sm font-bold"
            >
              <ArrowDownRight size={18} />
              Catat Pengeluaran
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors",
                filterCategory !== 'all'
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <Filter size={18} />
              Filter
              {filterCategory !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Kategori</p>
                <button
                  onClick={() => { setFilterCategory('all'); setIsFilterOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    filterCategory === 'all' ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Semua Kategori
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setFilterCategory(cat); setIsFilterOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      filterCategory === cat ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => { setActiveTab('raw'); setSearchQuery(''); setFilterCategory('all'); setFilterDate(''); }}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === 'raw' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Bahan Baku
            {activeTab === 'raw' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('finished'); setSearchQuery(''); setFilterCategory('all'); setFilterDate(''); }}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === 'finished' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Barang Jadi
            {activeTab === 'finished' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('supply'); setSearchQuery(''); setFilterCategory('all'); setFilterDate(''); }}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === 'supply' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Pengeluaran Stok
            {activeTab === 'supply' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Barang</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {currentItems.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpDown size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Nilai</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            Rp {(totalValue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Stok Rendah</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Table */}
      {activeTab !== 'supply' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nama barang..."
                  className="pl-10 pr-10 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
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
                  className="px-3 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-slate-600"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  title="Filter Berdasarkan Tanggal Input"
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
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
              title="Export CSV"
            >
              <Download size={18} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">
                    <button onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-slate-700">
                      Kategori
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-700">
                      Nama Barang
                      <ArrowUpDown size={14} className={sortBy === 'name' ? 'text-emerald-600' : 'opacity-30'} />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button onClick={() => handleSort('stock')} className="flex items-center gap-1 hover:text-slate-700">
                      {activeTab === 'raw' ? 'Stok (Kg/Unit)' : 'Stok (Kg)'}
                      <ArrowUpDown size={14} className={sortBy === 'stock' ? 'text-emerald-600' : 'opacity-30'} />
                    </button>
                  </th>
                  {activeTab === 'raw' && (
                    <>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('price')} className="flex items-center gap-1 hover:text-slate-700">
                          Harga Satuan
                          <ArrowUpDown size={14} className={sortBy === 'price' ? 'text-emerald-600' : 'opacity-30'} />
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('value')} className="flex items-center gap-1 hover:text-slate-700">
                          Total Nilai
                          <ArrowUpDown size={14} className={sortBy === 'value' ? 'text-emerald-600' : 'opacity-30'} />
                        </button>
                      </th>
                    </>
                  )}
                  {activeTab === 'finished' && (
                    <>
                      <th className="px-6 py-4 text-center">
                        <span className="flex items-center justify-center gap-1">Ekuivalen Unit (PCS)</span>
                      </th>
                    </>
                  )}
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Riwayat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'raw' ? 7 : activeTab === 'finished' ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                      <Package size={48} className="mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-slate-500">
                        {searchQuery || filterDate ? `Tidak ditemukan hasil pencarian` : 'Belum ada barang di kategori ini.'}
                      </p>
                      <p className="text-sm mt-1">
                        {searchQuery || filterDate ? 'Coba ubah kata kunci atau tanggal filter.' : 'Klik "Tambah Barang" untuk mulai.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => {
                    const isLowStock = item.stock <= item.minStock;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-500">{item.category}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {item.name}
                          <div className="text-[10px] text-slate-400 font-normal">Input: {item.createdAt}</div>
                        </td>
                        <td
                          className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => {
                            setSelectedItem(item);
                            setIsHistoryModalOpen(true);
                          }}
                          title="Klik untuk lihat riwayat stok"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {activeTab === 'finished'
                                ? Number(item.stock.toFixed(3))
                                : item.stock} {item.unit}
                            </span>
                            {isLowStock && activeTab === 'finished' && (
                              <AlertTriangle size={14} className="text-amber-500" />
                            )}
                          </div>
                        </td>
                        {activeTab === 'raw' && (
                          <>
                            <td className="px-6 py-4 text-slate-600">Rp {item.price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-600">Rp {(item.stock * item.price).toLocaleString()}</td>
                          </>
                        )}
                        {activeTab === 'finished' && (
                          <>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                {item.category === 'Kerupuk' ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                      Modul KG (1:1)
                                    </span>
                                    <span className="text-[9px] text-slate-300 mt-0.5 font-medium italic">Tanpa Konversi PCS</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-black text-emerald-600 text-lg">
                                      {item.unit === 'kg' ? Math.round(item.stock * 32).toLocaleString() : item.stock.toLocaleString()}
                                      <span className="text-[10px] ml-1 font-bold">PCS</span>
                                    </span>
                                    {item.unit === 'kg' && (
                                      <span className="text-[10px] text-slate-400 font-normal italic">
                                        Setara {Number(item.stock.toFixed(4))} {item.unit}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                            !isLowStock
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}>
                            {isLowStock ? 'Stok Rendah' : 'Baik'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setIsHistoryModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Lihat Riwayat"
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Table Footer */}
          {currentItems.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>Menampilkan {currentItems.length} dari {baseItems.length} barang</span>
              <span>Total Nilai: <strong className="text-slate-700">Rp {totalValue.toLocaleString()}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* History Table - Only visible on 'supply' tab */}
      {activeTab === 'supply' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <History size={20} />
              </div>
              <h2 className="font-bold text-slate-800 text-lg whitespace-nowrap">Histori Pengeluaran</h2>

              <div className="relative flex-1 max-w-sm ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari barang atau alasan..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative w-44">
                <input
                  type="date"
                  className="px-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-600"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
              </div>

              {/* Filter Tipe: Bahan Baku & Barang Jadi */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterType === 'all'
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-600"
                  )}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterType('raw')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterType === 'raw'
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-600"
                  )}
                >
                  Bahan Baku
                </button>
                <button
                  onClick={() => setFilterType('finished')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterType === 'finished'
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-600"
                  )}
                >
                  Barang Jadi
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Nama Barang</th>
                  <th className="px-6 py-4 text-center">Tipe</th>
                  <th className="px-6 py-4 text-center">Jumlah</th>
                  <th className="px-6 py-4">Keperluan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <History size={48} className="mx-auto mb-3 opacity-10" />
                      <p className="font-medium text-slate-500">Data pengeluaran tidak ditemukan.</p>
                      <p className="text-xs mt-1">Gunakan tombol "Catat Pengeluaran Baru" untuk membuat entri.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const item = inventory.find(i => i.id === m.itemId);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                          {m.date}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 uppercase">{m.itemName}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black uppercase",
                            item?.type === 'raw' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                          )}>
                            {item?.type === 'raw' ? 'Bahan Baku' : 'Barang Jadi'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-red-600 text-base">
                          -{m.displayAmount !== undefined ? `${m.displayAmount} ${m.displayUnit}` : `${m.amount} ${item?.unit}`}
                        </td>
                        <td className="px-6 py-4 text-slate-600 italic text-sm">
                          {m.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredMovements.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-right">
              Menampilkan {filteredMovements.length} catatan pengeluaran
            </div>
          )}
        </div>
      )}

      {/* Click outside filter to close */}
      {
        isFilterOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
        )
      }

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Riwayat Pergerakan: ${selectedItem?.name}`}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {selectedItem && stockMovements.filter(m => m.itemId === selectedItem.id).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History size={48} className="mx-auto mb-4 opacity-10" />
              <p>Belum ada riwayat pergerakan untuk barang ini.</p>
            </div>
          ) : (
            stockMovements
              .filter(m => m.itemId === selectedItem?.id)
              .sort((a, b) => b.id.localeCompare(a.id))
              .map((movement) => (
                <div key={movement.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      movement.type === 'In' ? "bg-emerald-100 text-emerald-600" :
                        movement.type === 'Out' ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-600"
                    )}>
                      {movement.type === 'In' ? <Plus size={18} /> :
                        movement.type === 'Out' ? <ArrowDownRight size={18} /> :
                          <History size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{movement.reason}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{movement.date} • {movement.referenceId || 'Manual'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      movement.type === 'In' ? "text-emerald-600" :
                        movement.type === 'Out' ? "text-red-600" :
                          "text-amber-600"
                    )}>
                      {movement.type === 'In' ? '+' : '-'}
                      {(() => {
                        const baseAmt = movement.amount;
                        const baseUnit = (selectedItem?.unit || 'kg').toLowerCase();

                        const isDisplay = movement.displayAmount !== undefined;
                        const displayAmt = isDisplay ? movement.displayAmount! : movement.amount;
                        const displayUnit = (movement.displayUnit || baseUnit).toLowerCase();

                        // Priority: Display what the user actually input (e.g. 10 pcs)
                        let primaryText = `${Number(displayAmt.toFixed(3))} ${displayUnit}`;
                        let secondaryText = "";

                        if (isDisplay && displayUnit !== baseUnit) {
                          // Show the internal KG/Base conversion in brackets
                          secondaryText = ` (${Number(baseAmt.toFixed(4))} ${baseUnit})`;
                        } else if (!isDisplay && baseUnit === 'kg' && selectedItem?.category !== 'Kerupuk') {
                          // Legacy fallback for old records
                          secondaryText = ` (${(baseAmt * 32).toLocaleString()} pcs)`;
                        } else if (!isDisplay && (baseUnit === 'pcs' || baseUnit === 'bks') && selectedItem?.category !== 'Kerupuk') {
                          secondaryText = ` (${(baseAmt / 32).toFixed(3)} kg)`;
                        }

                        return `${primaryText}${secondaryText}`;
                      })()}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </Modal>

      {/* Create Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Tambah ${activeTab === 'raw' ? 'Bahan Baku' : activeTab === 'finished' ? 'Barang Jadi' : 'Pengeluaran (Operasional)'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Barang</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="Contoh: Tepung Terigu"
              value={newItem.name || ''}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Barang</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={activeTab}
                onChange={e => {
                  const val = e.target.value as any;
                  setActiveTab(val);
                  setNewItem({
                    ...newItem,
                    type: val,
                    category: val === 'raw' ? 'Bahan Baku' : val === 'finished' ? 'Barang Jadi' : 'Operasional',
                    unit: val === 'supply' ? 'tabung' : 'kg'
                  });
                }}
              >
                <option value="raw">Bahan Baku</option>
                <option value="finished">Barang Jadi</option>
                <option value="supply">Pengeluaran (Operasional)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value as Category })}
              >
                {activeTab === 'raw' ? (
                  <>
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Bumbu">Bumbu</option>
                    <option value="Packaging">Packaging</option>
                  </>
                ) : activeTab === 'finished' ? (
                  <>
                    <option value="Kerupuk">Kerupuk</option>
                    <option value="Pempek">Pempek</option>
                  </>
                ) : (
                  <option value="Operasional">Operasional</option>
                )}
                <option value="Other">Lainnya</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Satuan</label>
            <select
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={newItem.unit}
              onChange={e => setNewItem({ ...newItem, unit: e.target.value as Unit })}
            >
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
              <option value="bks">bks</option>
              <option value="unit">unit</option>
              <option value="tabung">tabung</option>
              <option value="liter">liter</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeTab === 'finished' ? 'Harga Jual (Rp)' : 'Harga Beli (Rp)'}
              </label>
              <input
                type="number"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={newItem.price || ''}
                onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stok Awal</label>
              <input
                type="number"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Jumlah stok saat ini"
                value={newItem.stock || ''}
                onChange={e => setNewItem({ ...newItem, stock: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batas Stok Rendah</label>
            <input
              type="number"
              required
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={newItem.minStock || ''}
              onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              Simpan Barang
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        title={selectedItem ? `Catat Pemakaian: ${selectedItem.name}` : 'Catat Pengeluaran Baru'}
      >
        <form onSubmit={handleSubmitUsage} className="space-y-4">
          {!selectedItem && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Barang</label>
              <select
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                value={selectedUsageItemId}
                onChange={e => setSelectedUsageItemId(e.target.value)}
              >
                <option value="">-- Pilih Barang --</option>
                <optgroup label="Bahan Baku">
                  {rawMaterials.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Stok: {item.stock} {item.unit})</option>
                  ))}
                </optgroup>
                <optgroup label="Barang Jadi">
                  {finishedGoods.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (Stok: {Number(item.stock.toFixed(3))} {item.unit})</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {selectedItem ? (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-4">
              <p className="text-xs text-amber-700 font-medium">
                Stok saat ini: <span className="font-bold">{selectedItem.stock} {selectedItem.unit}</span>
              </p>
            </div>
          ) : selectedUsageItemId && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-4">
              <p className="text-xs text-amber-700 font-medium">
                Stok saat ini: <span className="font-bold">
                  {inventory.find(i => i.id === selectedUsageItemId)?.stock} {inventory.find(i => i.id === selectedUsageItemId)?.unit}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah yang Digunakan</label>
            <div className="flex gap-3">
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold"
                value={usageAmount}
                onChange={e => setUsageAmount(e.target.value)}
              />
              <select
                className="px-3 py-3 bg-slate-900 text-white border border-slate-900 rounded-xl text-sm font-black min-w-[80px] text-center shadow-sm focus:outline-none"
                value={usageUnit}
                onChange={e => setUsageUnit(e.target.value as Unit)}
              >
                <option value="kg">kg</option>
                <option value="pcs">pcs</option>
                <option value="unit">unit</option>
                <option value="tabung">tabung</option>
                <option value="liter">liter</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keperluan / Alasan</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="Contoh: Masak Kerupuk Kloter 1"
              value={usageReason}
              onChange={e => setUsageReason(e.target.value)}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsUsageModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold shadow-lg shadow-amber-100"
            >
              Catat Pengeluaran
            </button>
          </div>
        </form>
      </Modal>

    </div >
  );
}