import React, { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Filter, Search, CheckCircle, X, Package, ArrowUpDown, Eye, Trash2, ListChecks } from 'lucide-react';
import { cn } from '../lib/utils';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { PurchaseOrder, Unit, InventoryItem } from '../lib/types';

const PURCHASE_TEMPLATES = [
  {
    id: 'tpl-pempek',
    name: 'Paket Pempek (Ikan + Sagu + Garam)',
    description: 'Komposisi standar untuk produksi pempek',
    items: [
      { materialName: 'Ikan Giling', quantity: 10, unit: 'kg' as Unit },
      { materialName: 'Tepung Sagu', quantity: 15, unit: 'kg' as Unit },
      { materialName: 'Garam', quantity: 2, unit: 'kg' as Unit }
    ]
  },
  {
    id: 'tpl-kerupuk',
    name: 'Paket Kerupuk (Tapioka + Minyak)',
    description: 'Bahan utama untuk pembuatan kerupuk',
    items: [
      { materialName: 'Tepung Tapioka', quantity: 25, unit: 'kg' as Unit },
      { materialName: 'Minyak Goreng', quantity: 10, unit: 'L' as Unit },
      { materialName: 'Penyedap', quantity: 1, unit: 'kg' as Unit }
    ]
  }
];

export default function Purchasing() {
  const { purchaseOrders, createPurchaseOrder, receivePurchaseOrder, inventory, addInventoryItem, updateInventoryItem } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [receiveConfirmId, setReceiveConfirmId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // New PO State
  const [supplierName, setSupplierName] = useState('');
  const [poItems, setPoItems] = useState<{ materialId: string; materialName: string; quantity: number; cost: number; unit: string; isNew?: boolean }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Debt'>('Cash');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default 2 weeks for suppliers
    return d.toISOString().split('T')[0];
  });

  // Temporary Item state for adder
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(0);
  const [itemCost, setItemCost] = useState(0);
  const [isNewMaterial, setIsNewMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState<Unit>('kg');

  const rawMaterials = inventory.filter(item => item.type === 'raw');

  // Apply search, filter, and sort
  const filteredOrders = useMemo(() => {
    let orders = [...purchaseOrders];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(po =>
        po.id.toLowerCase().includes(query) ||
        po.supplierName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      orders = orders.filter(po => po.status === filterStatus);
    }

    if (filterDate) {
      orders = orders.filter(po => po.date.startsWith(filterDate));
    }

    // Sort
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
  }, [purchaseOrders, searchQuery, filterStatus, filterDate, sortBy, sortAsc]);

  // Stats
  const totalPO = purchaseOrders.length;
  const totalSpent = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const pendingCount = purchaseOrders.filter(po => po.status !== 'Received').length;
  const receivedCount = purchaseOrders.filter(po => po.status === 'Received').length;

  const handleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleAddItem = () => {
    if (isNewMaterial && newMaterialName && itemQuantity > 0) {
      setPoItems([...poItems, {
        materialId: `TEMP-${Date.now()}`,
        materialName: newMaterialName,
        quantity: itemQuantity,
        cost: itemCost,
        unit: newMaterialUnit,
        isNew: true
      }]);
      setNewMaterialName('');
      setItemQuantity(0);
      setItemCost(0);
    } else if (selectedMaterialId && itemQuantity > 0) {
      const mat = inventory.find(i => i.id === selectedMaterialId);
      setPoItems([...poItems, {
        materialId: selectedMaterialId,
        materialName: mat?.name || '',
        quantity: itemQuantity,
        cost: itemCost,
        unit: mat?.unit || 'kg'
      }]);
      setSelectedMaterialId('');
      setItemQuantity(0);
      setItemCost(0);
    }
  };

  const handleApplyTemplate = (tplId: string) => {
    const tpl = PURCHASE_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;

    const newItems = tpl.items.map(item => {
      const existingMat = inventory.find(i => i.name.toLowerCase() === item.materialName.toLowerCase());
      return {
        materialId: existingMat?.id || `TEMP-${Math.random().toString(36).substr(2, 9)}`,
        materialName: item.materialName,
        quantity: item.quantity,
        cost: existingMat?.price || 0,
        unit: item.unit,
        isNew: !existingMat
      };
    });
    setPoItems([...poItems, ...newItems]);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierName && poItems.length > 0) {
      const finalItems = poItems.map(item => {
        let actualId = item.materialId;
        const roundedCost = Math.round(item.cost);
        if (item.isNew) {
          actualId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          addInventoryItem({
            id: actualId,
            name: item.materialName,
            category: 'Bahan Baku',
            stock: 0,
            unit: item.unit as Unit,
            minStock: 10,
            price: roundedCost,
            type: 'raw',
            createdAt: poDate
          });
        } else {
          updateInventoryItem(actualId, { price: roundedCost });
        }
        return { materialId: actualId, quantity: item.quantity, cost: roundedCost };
      });

      const totalAmount = Math.round(finalItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0));

      const getNowWithTime = () => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return poDate.includes(' ') ? poDate : `${poDate} ${timeStr}`;
      };

      const newPO: PurchaseOrder = {
        id: `PO-${Date.now()}`,
        supplierName,
        date: getNowWithTime(),
        items: finalItems,
        totalAmount: totalAmount,
        status: 'Ordered',
        paymentMethod: paymentMethod,
        dueDate: paymentMethod === 'Debt' ? dueDate : undefined,
        isPaid: paymentMethod === 'Cash'
      };

      createPurchaseOrder(newPO);
      setIsModalOpen(false);

      // Reset form
      setSupplierName('');
      setPoItems([]);
      setPaymentMethod('Cash');
      setPoDate(new Date().toISOString().split('T')[0]);
      setDueDate(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Ordered': return 'Dipesan';
      case 'Received': return 'Diterima';
      case 'Pending': return 'Tertunda';
      default: return status;
    }
  };

  const getMaterialName = (materialId: string) => {
    const item = inventory.find(i => i.id === materialId);
    return item?.name || materialId;
  };

  const getMaterialUnit = (materialId: string) => {
    const item = inventory.find(i => i.id === materialId);
    return item?.unit || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembelian</h1>
          <p className="text-slate-500 mt-1">Kelola pesanan pembelian dan pemasok.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus size={18} />
          Pesanan Pembelian Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total PO</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalPO}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Belanja</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">Rp {(totalSpent / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShoppingCart size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Menunggu</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Diterima</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{receivedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nomor PO atau pemasok..."
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
                  { value: 'Ordered', label: '🔵 Dipesan' },
                  { value: 'Pending', label: '🟡 Tertunda' },
                  { value: 'Received', label: '🟢 Diterima' },
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
                <th className="px-6 py-4">Nomor PO</th>
                <th className="px-6 py-4">Pemasok</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-slate-700">
                    Tanggal
                    <ArrowUpDown size={14} className={sortBy === 'date' ? 'text-emerald-600' : 'opacity-30'} />
                  </button>
                </th>
                <th className="px-6 py-4">Barang</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-slate-700">
                    Total Biaya
                    <ArrowUpDown size={14} className={sortBy === 'amount' ? 'text-emerald-600' : 'opacity-30'} />
                  </button>
                </th>
                <th className="px-6 py-4 text-center">Metode</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">
                      {searchQuery || filterStatus !== 'all'
                        ? 'Tidak ditemukan pesanan yang cocok.'
                        : 'Tidak ada pesanan pembelian. Buat satu untuk memulai.'}
                    </p>
                    <p className="text-sm mt-1">
                      {searchQuery ? 'Coba kata kunci lain.' : filterStatus !== 'all' ? 'Coba filter lain.' : ''}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{po.id}</td>
                    <td className="px-6 py-4 text-slate-600">{po.supplierName}</td>
                    <td className="px-6 py-4 text-slate-500">{po.date}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {po.items.map(item => getMaterialName(item.materialId)).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">Rp {po.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${po.paymentMethod === 'Cash'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                        }`}>
                        {po.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${po.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        po.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                        {getStatusLabel(po.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedPO(po); setIsDetailModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                        {po.status !== 'Received' && (
                          <button
                            onClick={() => setReceiveConfirmId(po.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[10px] font-bold shadow-sm shadow-emerald-100 uppercase transition-all whitespace-nowrap flex items-center gap-1.5"
                            title="Tandai Diterima"
                          >
                            <CheckCircle size={12} />
                            Terima Barang
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
            <span>Menampilkan {filteredOrders.length} dari {purchaseOrders.length} pesanan</span>
            <span>Total: <strong className="text-slate-700">Rp {filteredOrders.reduce((s, po) => s + po.totalAmount, 0).toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedPO(null); }}
        title={`Detail Pesanan: ${selectedPO?.id}`}
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pemasok</p>
                <p className="font-semibold text-slate-900">{selectedPO.supplierName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                <p className="font-semibold text-slate-900">{selectedPO.date}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${selectedPO.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  selectedPO.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                  {getStatusLabel(selectedPO.status)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Biaya</p>
                <p className="font-bold text-emerald-600 text-lg">Rp {selectedPO.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Metode Pembayaran</p>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${selectedPO.paymentMethod === 'Cash'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
                  }`}>
                  {selectedPO.paymentMethod}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Daftar Barang</p>
              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Bahan</th>
                      <th className="px-4 py-2 text-left">Jumlah</th>
                      <th className="px-4 py-2 text-left">Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{getMaterialName(item.materialId)}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quantity} {getMaterialUnit(item.materialId)}</td>
                        <td className="px-4 py-3 text-slate-600">Rp {item.cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              {selectedPO.status !== 'Received' && (
                <button
                  onClick={() => {
                    receivePurchaseOrder(selectedPO.id);
                    setIsDetailModalOpen(false);
                    setSelectedPO(null);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Tandai Diterima
                </button>
              )}
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedPO(null); }}
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
        title="Buat Pesanan Pembelian"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pemasok</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="misal: PT. Tepung Sejahtera"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Pesanan</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={poDate}
                onChange={e => setPoDate(e.target.value)}
              />
            </div>
          </div>



          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800">Tambah Detail Barang</h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewMaterial(!isNewMaterial);
                  setSelectedMaterialId('');
                  setItemCost(0);
                }}
                className="text-xs text-emerald-600 font-medium hover:text-emerald-700"
              >
                {isNewMaterial ? 'Pilih dari Stok' : '+ Buat Bahan Baru'}
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {isNewMaterial ? (
                  <div className="flex gap-2 col-span-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Nama Bahan Baru..."
                      value={newMaterialName}
                      onChange={e => setNewMaterialName(e.target.value)}
                    />
                    <select
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      value={newMaterialUnit}
                      onChange={e => setNewMaterialUnit(e.target.value as Unit)}
                    >
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                ) : (
                  <select
                    className="col-span-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    value={selectedMaterialId}
                    onChange={e => {
                      setSelectedMaterialId(e.target.value);
                      const item = rawMaterials.find(i => i.id === e.target.value);
                      if (item) setItemCost(item.price);
                    }}
                  >
                    <option value="">-- Pilih Bahan Baku --</option>
                    {rawMaterials.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Jumlah"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={itemQuantity || ''}
                  onChange={e => setItemQuantity(Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Harga"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={itemCost || ''}
                  onChange={e => setItemCost(Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Daftar Barang Belanja</p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Barang</th>
                      <th className="px-3 py-2 text-center">Jumlah</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {poItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="font-bold text-slate-700">{item.materialName}</p>
                          {item.isNew && <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded uppercase">Baru</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          Rp {Math.round(item.quantity * item.cost).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Total Estimasi:</td>
                      <td className="px-3 py-2 text-right font-extrabold text-emerald-600 text-sm">
                        Rp {Math.round(poItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0)).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${paymentMethod === 'Cash'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Cash (Tunai)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Debt')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${paymentMethod === 'Debt'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                Debt (Utang)
              </button>
            </div>
            {paymentMethod === 'Debt' && (
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Jatuh Tempo Pembayaran</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30 text-xs font-bold"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            )}
          </div>

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
              disabled={poItems.length === 0}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium shadow-sm transition-all",
                poItems.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
              )}
            >
              Buat Pesanan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modern Receipt Confirmation Modal */}
      <Modal
        isOpen={!!receiveConfirmId}
        onClose={() => setReceiveConfirmId(null)}
        title="Konfirmasi Penerimaan Barang"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce-subtle">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Barang Sudah Sampai?</h3>
          <p className="text-slate-500 leading-relaxed max-w-xs">
            Pastikan jumlah dan kualitas bahan baku sudah sesuai. Stok gudang akan otomatis bertambah setelah konfirmasi.
          </p>

          <div className="w-full mt-8 flex flex-col gap-3">
            <button
              onClick={() => {
                if (receiveConfirmId) {
                  receivePurchaseOrder(receiveConfirmId);
                  setReceiveConfirmId(null);
                }
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              Ya, Tambah ke Stok
            </button>
            <button
              onClick={() => setReceiveConfirmId(null)}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all"
            >
              Belum / Batal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
