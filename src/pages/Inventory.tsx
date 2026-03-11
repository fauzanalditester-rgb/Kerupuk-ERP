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
  const [activeTab, setActiveTab] = useState<'raw' | 'finished'>('raw');
  const { inventory, addInventoryItem, stockMovements, updateInventoryStock } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<'category' | 'name' | 'stock' | 'price' | 'value' | 'id'>('id');
  const [sortAsc, setSortAsc] = useState(false);

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    category: 'Bahan Baku',
    unit: 'kg',
    type: 'raw'
  });

  const rawMaterials = useMemo(() => inventory.filter(item => item.type === 'raw' || !item.type), [inventory]);
  const finishedGoods = useMemo(() => inventory.filter(item => item.type === 'finished'), [inventory]);
  const baseItems = useMemo(() => activeTab === 'raw' ? rawMaterials : finishedGoods, [activeTab, rawMaterials, finishedGoods]);

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

  const handleSort = (field: 'category' | 'name' | 'stock' | 'price' | 'value') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.price !== undefined) {
      addInventoryItem({
        id: Date.now().toString(),
        name: newItem.name,
        category: newItem.category as Category,
        stock: 0,
        unit: newItem.unit as Unit,
        minStock: Number(newItem.minStock || 0),
        price: Number(newItem.price),
        type: activeTab,
        createdAt: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      setNewItem({ category: 'Bahan Baku', unit: 'kg', type: activeTab });
    }
  };

  const handleExportCSV = () => {
    const headers = activeTab === 'raw'
      ? ['Kategori', 'Nama Barang', 'Stok Kg', 'Harga Satuan', 'Total Nilai', 'Status', 'Tanggal Input']
      : ['Kategori', 'Nama Barang', 'Stok Kg', 'Stok Unit (32 pcs/kg)', 'Status', 'Tanggal Input'];

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
          item.unit === 'kg' ? Math.round(item.stock * 32) : item.stock,
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
          <p className="text-slate-500 mt-1">Pantau stok bahan baku dan barang jadi.</p>
        </div>
        <div className="flex gap-2">
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
                    <th className="px-6 py-4">
                      <span className="flex items-center gap-1">Stok Unit</span>
                    </th>
                    <th className="px-6 py-4">Status</th>
                  </>
                )}
                <th className="px-6 py-4 text-center">Riwayat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'raw' ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
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
                          <td className="px-6 py-4 text-slate-600 font-semibold text-center">
                            {item.unit === 'kg' ? (
                              <span>{Math.round(item.stock * 32).toLocaleString()} pcs</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">
                                {item.stock} {item.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium border",
                              !isLowStock
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-red-50 text-red-700 border-red-100"
                            )}>
                              {isLowStock ? 'Stok Rendah' : 'Baik'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                          title="Lihat Riwayat Pergerakan"
                        >
                          <History size={18} />
                        </button>
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

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

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
                      {movement.type === 'In' ? '+' : '-'}{Number(movement.amount.toFixed(3))} {selectedItem?.unit}
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
        title={`Tambah ${activeTab === 'raw' ? 'Bahan Baku' : 'Barang Jadi'}`}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value as Category })}
              >
                <option value="Bahan Baku">Bahan Baku</option>
                <option value="Bumbu">Bumbu</option>
                <option value="Kerupuk">Kerupuk</option>
                <option value="Pempek">Pempek</option>
                <option value="Packaging">Packaging</option>
              </select>
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
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeTab === 'raw' ? 'Estimasi Harga (Rp)' : 'Harga Jual (Rp)'}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Batas Stok Rendah</label>
              <input
                type="number"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={newItem.minStock || ''}
                onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
              />
            </div>
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

    </div>
  );
}