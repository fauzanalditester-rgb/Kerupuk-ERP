import React, { useState, useMemo } from 'react';
import {
  Factory,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Calendar,
  Trash2,
  Search,
  Filter,
  X,
  Eye,
  AlertTriangle,
  Package,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { WorkOrder, Category } from '../lib/types';

import { useNavigate } from 'react-router-dom';

export default function Production() {
  const { workOrders, completeWorkOrder, createWorkOrder, deleteWorkOrder, inventory, recipes, addInventoryItem, deleteInventoryItem, addRecipe, updateRecipe } = useERP();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [autoComplete, setAutoComplete] = useState(true);

  // New WO State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [yieldPerBatch, setYieldPerBatch] = useState(2.3);
  const [yieldUnit, setYieldUnit] = useState<'kg' | 'pcs'>('kg');
  const [batchCount, setBatchCount] = useState(1);

  const quantity = useMemo(() => {
    const rawValue = batchCount * yieldPerBatch;
    // Standard: 1 kg = 32 pcs.
    return yieldUnit === 'kg' ? Number(rawValue.toFixed(2)) : Number((rawValue / 32).toFixed(5));
  }, [batchCount, yieldPerBatch, yieldUnit]);

  // Accurate total in the product's primary unit (PCS or KG) for recipe calculation
  const totalInProductUnit = useMemo(() => {
    const totalRaw = batchCount * yieldPerBatch;
    const product = inventory.find(i => i.id === selectedProductId);
    if (!product) return totalRaw;

    const pUnit = product.unit.toLowerCase();
    const yUnit = yieldUnit.toLowerCase();

    if (pUnit === yUnit) return totalRaw;
    if (pUnit === 'kg' && yUnit === 'pcs') return totalRaw / 32;
    if (pUnit === 'pcs' && yUnit === 'kg') return totalRaw * 32;
    return totalRaw;
  }, [batchCount, yieldPerBatch, yieldUnit, inventory, selectedProductId]);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // New Product State
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<Category>('Pempek');

  // Materials for WO
  const [materialsList, setMaterialsList] = useState<{ materialId: string; amount: number; isTemplate?: boolean }[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState('');
  const [currentMaterialQty, setCurrentMaterialQty] = useState(0);
  const [currentMaterialInputUnit, setCurrentMaterialInputUnit] = useState<'kg' | 'pcs'>('kg');

  const finishedGoods = useMemo(() => inventory.filter(item => item.type === 'finished'), [inventory]);
  const rawMaterials = useMemo(() => inventory.filter(item => item.type === 'raw'), [inventory]);

  // Auto-fill template default berdasarkan resep dinamis
  React.useEffect(() => {
    if (!isModalOpen) {
      setMaterialsList([]); // Bersihkan list ketika modal ditutup
      return;
    }

    if (isNewProduct) {
      // Jika produk baru, bahan dibutuhkan harus kosong
      setMaterialsList(prev => prev.filter(p => !p.isTemplate));
      return;
    }

    if (batchCount > 0 && selectedProductId) {
      const selProduct = finishedGoods.find(fg => fg.id === selectedProductId);
      let recipe = recipes.find(r => r.productId === selectedProductId);

      if (!recipe && selProduct) {
        recipe = recipes.find(r => r.productName === selProduct.name);
      }

      if (recipe) {
        const defaultMaterials = recipe.ingredients.map(ing => {
          let actualMaterialId = ing.materialId;

          // Kompatibilitas mundur khusus ID '5' sbg Lenjer bawaan pabrik (agar resep manual buatan user tdk tertimpa)
          if (selProduct?.id === '5' && (ing.amount === 0.75 || ing.amount === 5)) {
            if (ing.amount === 0.75) {
              const tepung = rawMaterials.find(m => m.name.toLowerCase().includes('tepung'));
              if (tepung) actualMaterialId = tepung.id;
            }
            if (ing.amount === 5) {
              const ikan = rawMaterials.find(m => m.name.toLowerCase().includes('ikan'));
              if (ikan) actualMaterialId = ikan.id;
            }
          }

          return {
            materialId: actualMaterialId,
            amount: Number((ing.amount * totalInProductUnit).toFixed(2)),
            isTemplate: true
          };
        });

        setMaterialsList(prev => {
          const manualItems = prev.filter(p => !p.isTemplate);
          return [...defaultMaterials, ...manualItems];
        });
      } else {
        // Fallback default khusus untuk pempek lenjer bawaan Pabrik (ID: 5)
        if (selProduct?.id === '5') {
          const tepung = rawMaterials.find(m => m.name.toLowerCase().includes('tepung'));
          const ikan = rawMaterials.find(m => m.name.toLowerCase().includes('ikan'));
          const fallbackDefaults: { materialId: string; amount: number; isTemplate?: boolean }[] = [];
          if (tepung) fallbackDefaults.push({ materialId: tepung.id, amount: Number((0.2 * totalInProductUnit).toFixed(2)), isTemplate: true });
          if (ikan) fallbackDefaults.push({ materialId: ikan.id, amount: Number((0.15 * totalInProductUnit).toFixed(2)), isTemplate: true });

          setMaterialsList(prev => {
            const manualItems = prev.filter(p => !p.isTemplate);
            return [...fallbackDefaults, ...manualItems];
          });
        } else {
          // Bersihkan template list karena tidak ada resep untuk produk yang dipilih
          setMaterialsList(prev => prev.filter(p => !p.isTemplate));
        }
      }
    }
  }, [totalInProductUnit, rawMaterials, selectedProductId, isModalOpen, isNewProduct, recipes, finishedGoods]);


  // Filtered work orders
  const filteredWorkOrders = useMemo(() => {
    let orders = [...workOrders];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(wo =>
        wo.id.toLowerCase().includes(query) ||
        wo.productName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      orders = orders.filter(wo => wo.status === filterStatus);
    }

    // Filter by date
    if (filterDate) {
      orders = orders.filter(wo =>
        wo.startDate === filterDate ||
        wo.dueDate === filterDate
      );
    }

    return orders;
  }, [workOrders, searchQuery, filterStatus, filterDate]);

  // Stats
  const totalWO = workOrders.length;
  const pendingCount = workOrders.filter(wo => wo.status === 'Pending').length;
  const inProgressCount = workOrders.filter(wo => wo.status === 'In Progress').length;
  const completedCount = workOrders.filter(wo => wo.status === 'Completed').length;
  const totalProduced = Number(workOrders
    .filter(wo => wo.status === 'Completed')
    .reduce((sum, wo) => sum + wo.quantity, 0).toFixed(2));

  // Low stock alerts for raw materials used in recipes
  const lowStockAlerts = useMemo(() => {
    return rawMaterials.filter(m => m.stock <= m.minStock);
  }, [rawMaterials]);

  const handleAddMaterial = () => {
    if (currentMaterialId && currentMaterialQty > 0) {
      const item = inventory.find(i => i.id === currentMaterialId);
      const isKgItem = item?.unit === 'kg';

      // Convert to base unit (kg) if user entered in PCS for a KG-tracked item
      const finalAmount = (isKgItem && currentMaterialInputUnit === 'pcs')
        ? Number((currentMaterialQty / 32).toFixed(5))
        : currentMaterialQty;

      setMaterialsList([...materialsList, { materialId: currentMaterialId, amount: finalAmount }]);
      setCurrentMaterialId('');
      setCurrentMaterialQty(0);
      setCurrentMaterialInputUnit('kg'); // Reset to default
    }
  };

  const handleRemoveMaterial = (index: number) => {
    const newList = [...materialsList];
    newList.splice(index, 1);
    setMaterialsList(newList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0 && startDate && dueDate) {
      let productId = selectedProductId;
      let productName = finishedGoods.find(i => i.id === selectedProductId)?.name || 'Unknown Product';

      if (isNewProduct && newProductName) {
        productId = `INV-${Date.now()}`;
        productName = newProductName;
        addInventoryItem({
          id: productId,
          name: newProductName,
          category: newProductCategory,
          stock: 0,
          unit: newProductCategory === 'Kerupuk' ? 'bks' : 'kg',
          minStock: 10,
          price: 0,
          type: 'finished'
        });
      } else if (!selectedProductId) {
        return;
      }

      const finalMaterialsList = [...materialsList];
      if (currentMaterialId && currentMaterialQty > 0) {
        const item = inventory.find(i => i.id === currentMaterialId);
        const isKgItem = item?.unit === 'kg';
        const finalAmount = (isKgItem && currentMaterialInputUnit === 'pcs')
          ? Number((currentMaterialQty / 32).toFixed(5))
          : currentMaterialQty;
        finalMaterialsList.push({ materialId: currentMaterialId, amount: finalAmount });
      }

      // OTOMATIS: Update atau Buat Master Resep (BOM) setiap kali input produksi
      if (finalMaterialsList.length > 0) {
        const existingRecipe = recipes.find(r => r.productId === productId);
        const recipeData = {
          productId: productId,
          productName: productName,
          ingredients: finalMaterialsList.map(item => ({
            materialId: item.materialId,
            amount: Number((item.amount / totalInProductUnit).toPrecision(6)) // Presisi lebih tinggi untuk normalisasi per unit
          }))
        };

        if (existingRecipe) {
          // Update resep yang sudah ada
          updateRecipe(existingRecipe.id, { ...existingRecipe, ...recipeData });
        } else {
          // Buat resep baru jika belum ada
          addRecipe({
            id: `RCP-${Date.now()}`,
            ...recipeData
          });
        }
      }

      // 4. Create Work Order based on Recipe/BOM snapshot
      const getNowWithTime = (d: string) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return d.includes(' ') ? d : `${d} ${timeStr}`;
      };

      const newWO: WorkOrder = {
        id: `WO-${Date.now()}`,
        productId,
        productName,
        quantity,
        status: 'Pending',
        startDate: getNowWithTime(startDate),
        dueDate: getNowWithTime(dueDate),
        progress: 0,
        materialsUsed: finalMaterialsList,
        batchCount,
        yieldPerBatch,
        yieldUnit
      };
      createWorkOrder(newWO);
      if (autoComplete) {
        completeWorkOrder(newWO.id, newWO);
      }
      setIsModalOpen(false);
      // Reset form
      setSelectedProductId('');
      setYieldPerBatch(2.3);
      setBatchCount(1);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date().toISOString().split('T')[0]);
      setMaterialsList([]);
      setCurrentMaterialQty(0);
      setCurrentMaterialInputUnit('kg'); // Reset unit
      setIsNewProduct(false);
      setNewProductName('');
      setNewProductCategory('Pempek');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'In Progress': return 'Sedang Berjalan';
      case 'Completed': return 'Selesai';
      case 'Pending': return 'Tertunda';
      default: return status;
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedProductId(''); // Ensure it starts empty
    setIsNewProduct(false); // Reset toggle
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Produksi</h1>
          <p className="text-slate-500 mt-1">Kelola perintah kerja dan jadwal produksi berbasis Resep (BOM).</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus size={18} />
          Perintah Kerja Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Factory size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total WO</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalWO}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Tertunda</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
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
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Diproduksi</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalProduced} unit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Orders List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari perintah kerja..."
                className="pl-10 pr-10 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                title="Filter Tanggal Produksi"
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
                className={cn(
                  "px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors text-sm",
                  filterStatus !== 'all'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <Filter size={16} />
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
                    { value: 'Pending', label: '⏳ Tertunda' },
                    { value: 'In Progress', label: '🔄 Sedang Berjalan' },
                    { value: 'Completed', label: '✅ Selesai' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilterStatus(opt.value); setIsFilterOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        filterStatus === opt.value
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Factory size={20} className="text-slate-400" />
            Perintah Kerja ({filteredWorkOrders.length})
          </h2>

          <div className="grid gap-4">
            {filteredWorkOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                <Factory size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-slate-500">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Tidak ditemukan perintah kerja yang cocok.'
                    : 'Tidak ada perintah kerja aktif.'}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Coba kata kunci lain.' : 'Klik "Perintah Kerja Baru" untuk memulai produksi.'}
                </p>
              </div>
            ) : (
              filteredWorkOrders.map((wo) => (
                <div key={wo.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    wo.status === 'Completed' ? "bg-emerald-500" :
                      wo.status === 'In Progress' ? "bg-blue-500" :
                        "bg-amber-400"
                  )} />

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900">{wo.productName}</h3>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          wo.status === 'In Progress' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            wo.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {getStatusLabel(wo.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-mono flex items-center gap-2">
                        {wo.id}
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-normal text-slate-400">Mulai: {wo.startDate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Jumlah</p>
                      <p className="font-medium text-slate-900">{wo.quantity} unit</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Tanggal Mulai</p>
                      <div className="flex items-center gap-1.5 text-slate-900">
                        <Calendar size={14} className="text-slate-400" />
                        {wo.startDate}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Tenggat Waktu</p>
                      <div className="flex items-center gap-1.5 text-slate-900">
                        <Calendar size={14} className="text-slate-400" />
                        {wo.dueDate}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Kemajuan</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              wo.status === 'Completed' ? "bg-emerald-500" : "bg-blue-500"
                            )}
                            style={{ width: `${wo.status === 'Completed' ? 100 : wo.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {wo.status === 'Completed' ? '100' : wo.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => { setSelectedWO(wo); setIsDetailModalOpen(true); }}
                      className="text-sm text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Eye size={15} />
                      Lihat Detail
                    </button>
                    {wo.status !== 'Completed' && (
                      <button
                        onClick={() => completeWorkOrder(wo.id)}
                        className="text-sm text-white bg-slate-900 hover:bg-slate-800 font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle size={15} />
                        Selesaikan Pesanan
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menghapus perintah kerja ini? Jika status pesanan Selesai, maka stok barang akan otomatis dikembalikan (bahan baku masuk kembali, produk jadi berkurang).')) {
                          deleteWorkOrder(wo.id);
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={15} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: BoM & Alerts */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle size={20} className="text-slate-400" />
            Daftar Kebutuhan Bahan (BoM)
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">Resep Standar</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <h4 className="font-medium text-emerald-700 mb-2">{recipe.productName}</h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ing) => {
                      const mat = inventory.find(m => m.id === ing.materialId);
                      return (
                        <li key={ing.materialId} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {mat?.name} ({ing.amount} {mat?.unit})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {recipes.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada resep standar.
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                onClick={() => navigate('/recipes')}
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
              >
                Lihat Semua Resep
              </button>
            </div>
          </div>

          {/* Dynamic Alerts */}
          {lowStockAlerts.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={18} />
                <h3 className="font-semibold text-amber-900 text-sm">Peringatan Stok Bahan Baku</h3>
              </div>
              {lowStockAlerts.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white/60 rounded-lg p-2.5 text-sm">
                  <span className="text-amber-800 font-medium">{item.name}</span>
                  <span className="text-amber-600 font-bold">{item.stock} {item.unit}</span>
                </div>
              ))}
              <p className="text-xs text-amber-700 italic">
                Bahan di atas sudah mendekati/melewati stok minimum. Pertimbangkan pembelian ulang.
              </p>
            </div>
          )}


        </div>
      </div>

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedWO(null); }}
        title={`Detail Perintah Kerja: ${selectedWO?.id}`}
      >
        {selectedWO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Produk</p>
                <p className="font-semibold text-slate-900">{selectedWO.productName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Jumlah</p>
                <p className="font-semibold text-slate-900">{selectedWO.quantity} unit</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border",
                  selectedWO.status === 'In Progress' ? "bg-blue-50 text-blue-700 border-blue-100" :
                    selectedWO.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      "bg-amber-50 text-amber-700 border-amber-100"
                )}>
                  {getStatusLabel(selectedWO.status)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Kemajuan</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        selectedWO.status === 'Completed' ? "bg-emerald-500" : "bg-blue-500"
                      )}
                      style={{ width: `${selectedWO.status === 'Completed' ? 100 : selectedWO.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {selectedWO.status === 'Completed' ? '100' : selectedWO.progress}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tanggal Mulai</p>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <p className="font-medium text-slate-900">{selectedWO.startDate}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tenggat Waktu</p>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <p className="font-medium text-slate-900">{selectedWO.dueDate}</p>
                </div>
              </div>
            </div>

            {selectedWO.batchCount !== undefined && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">Informasi Batch</p>
                  <p className="text-sm text-emerald-700 font-medium">
                    {selectedWO.batchCount} Batch x {selectedWO.yieldPerBatch} {selectedWO.yieldUnit}
                    {selectedWO.yieldUnit === 'kg' && (
                      <span className="text-[10px] text-emerald-500 ml-1">
                        (≈{Math.round(selectedWO.quantity * 32)} pcs)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">Total Hasil</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {selectedWO.quantity} {selectedWO.yieldUnit === 'kg' ? 'kg' : 'pcs'}
                  </p>
                </div>
              </div>
            )}

            {/* Materials Used */}
            {selectedWO.materialsUsed && selectedWO.materialsUsed.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Bahan yang Digunakan</p>
                <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Bahan</th>
                        <th className="px-4 py-2 text-left">Jumlah</th>
                        <th className="px-4 py-2 text-left">Stok Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWO.materialsUsed.map((mat, idx) => {
                        const item = inventory.find(i => i.id === mat.materialId);
                        const isFinished = item?.type === 'finished';
                        // Display units consistently with the input form
                        const displayUnit = (item?.unit === 'kg' && !isFinished) ? 'kg' : (item?.unit === 'kg' && isFinished ? 'pcs' : item?.unit || '');

                        return (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">{item?.name || mat.materialId}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-medium">{isFinished ? 'Produk Jadi (Rakitan)' : 'Bahan Baku'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700">
                                {mat.amount.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{displayUnit}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "font-medium text-xs px-2 py-1 rounded bg-slate-100",
                                item && item.stock <= item.minStock ? "text-red-600 bg-red-50" : "text-slate-600"
                              )}>
                                {item?.stock} {item?.unit}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              {selectedWO.status !== 'Completed' && (
                <button
                  onClick={() => {
                    completeWorkOrder(selectedWO.id);
                    setIsDetailModalOpen(false);
                    setSelectedWO(null);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Selesaikan Pesanan
                </button>
              )}
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedWO(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create WO Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Perintah Kerja"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">Produk (Mengikuti Resep/BOM)</label>
              <button
                type="button"
                onClick={() => {
                  setIsNewProduct(!isNewProduct);
                  setSelectedProductId('');
                }}
                className="text-xs text-emerald-600 font-medium hover:text-emerald-700"
              >
                {isNewProduct ? 'Kembali Pilih dari Stok' : '+ Buat Produk Baru'}
              </button>
            </div>

            {isNewProduct ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ketik Nama Produk Baru..."
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                />
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newProductCategory}
                  onChange={e => setNewProductCategory(e.target.value as Category)}
                >
                  <option value="Pempek">Pempek</option>
                  <option value="Kerupuk">Kerupuk</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <select
                  required
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Pilih Produk</option>
                  {finishedGoods.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {selectedProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Yakin ingin menghapus produk ini secara permanen dari daftar?')) {
                        deleteInventoryItem(selectedProductId);
                        setSelectedProductId('');
                      }
                    }}
                    className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg shrink-0 transition-colors"
                    title="Hapus Produk dari Daftar"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Batch (Sbg Pengali Resep)</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={batchCount || ''}
                onChange={e => setBatchCount(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Target Hasil per 1 Batch</label>
                <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setYieldUnit('kg')}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                      yieldUnit === 'kg' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => setYieldUnit('pcs')}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                      yieldUnit === 'pcs' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    PCS
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={yieldPerBatch === 0 ? '' : yieldPerBatch}
                  onChange={e => setYieldPerBatch(Number(e.target.value))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                  {yieldUnit}
                </span>
              </div>
            </div>
            <div className="col-span-2">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center text-sm shadow-sm">
                <span className="font-semibold text-emerald-800">Total Produksi (Masuk Gudang):</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-emerald-600 mr-2">{quantity} kg</span>
                  <span className="text-sm font-medium text-emerald-500">({Math.round(quantity * 32)} pcs)</span>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tenggat Waktu</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>


          </div>

          <div className="border-t border-slate-200 mt-6 pt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Package size={16} className="text-emerald-500" />
              Komposisi & Bahan Baku
            </h3>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3 shadow-inner">
              <div className="flex gap-3">
                <div className="flex-1">
                  <select
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white shadow-sm"
                    value={currentMaterialId}
                    onChange={e => {
                      const id = e.target.value;
                      setCurrentMaterialId(id);
                      const item = inventory.find(i => i.id === id);
                      if (item?.type === 'finished') {
                        setCurrentMaterialInputUnit('pcs');
                      } else {
                        setCurrentMaterialInputUnit(item?.unit === 'kg' ? 'kg' : (item?.unit as any) || 'kg');
                      }
                    }}
                  >
                    <option value="">-- Pilih Bahan --</option>
                    <optgroup label="Bahan Baku & Bumbu">
                      {inventory.filter(i => i.type === 'raw').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Produk Jadi (Bahan Rakitan)">
                      {inventory.filter(i => i.type === 'finished').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  {inventory.find(m => m.id === currentMaterialId)?.unit === 'kg' && (
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm self-center">
                      <button
                        type="button"
                        onClick={() => setCurrentMaterialInputUnit('kg')}
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold rounded transition-all",
                          currentMaterialInputUnit === 'kg' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        KG
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentMaterialInputUnit('pcs')}
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold rounded transition-all",
                          currentMaterialInputUnit === 'pcs' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        PCS
                      </button>
                    </div>
                  )}

                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Jumlah"
                      className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white shadow-sm font-bold"
                      value={currentMaterialQty || ''}
                      onChange={e => setCurrentMaterialQty(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400">
                      {currentMaterialInputUnit}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  disabled={!currentMaterialId || currentMaterialQty <= 0}
                  className={cn(
                    "px-4 py-2 text-white rounded-lg transition-all flex items-center justify-center shadow-sm",
                    (!currentMaterialId || currentMaterialQty <= 0)
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                  )}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {
              materialsList.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Daftar Bahan Terpilih</p>
                  <div className="grid grid-cols-1 gap-2">
                    {materialsList.map((mat, idx) => {
                      const item = inventory.find(r => r.id === mat.materialId);
                      const matName = item?.name || 'Bahan Tidak Dikenal';
                      const isFinished = item?.type === 'finished';
                      const matUnit = item?.unit === 'kg' ? 'pcs' : item?.unit || '';

                      return (
                        <div key={idx} className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all animate-in fade-in slide-in-from-left-2",
                          isFinished ? "bg-blue-50/50 border-blue-100" : "bg-white border-slate-200"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isFinished ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                              {isFinished ? <Factory size={14} /> : <div className="w-3.5 h-3.5 border-2 border-current rounded-full" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 leading-none mb-1">{matName}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-medium">{isFinished ? 'Produk Jadi (Rakitan)' : 'Bahan Baku'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                              {mat.amount.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{matUnit}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                  <Package size={32} className="opacity-20 mb-2" />
                  <p className="text-xs font-medium italic text-center">Belum ada bahan yang ditambahkan. <br />Silakan pilih bahan di atas.</p>
                </div>
              )
            }
          </div >

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
        </form >
      </Modal >
    </div >
  );
}
