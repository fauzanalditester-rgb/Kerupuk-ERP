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
import { WorkOrder } from '../lib/types';

import { useNavigate } from 'react-router-dom';

export default function Production() {
  const { workOrders, completeWorkOrder, createWorkOrder, deleteWorkOrder, inventory, recipes } = useERP();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  // New WO State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [yieldPerBatch, setYieldPerBatch] = useState(2.3);
  const [yieldUnit, setYieldUnit] = useState<'kg' | 'pcs'>('kg');
  const [batchCount, setBatchCount] = useState(1);

  // Accurate total in the product's primary unit (PCS or KG) for recipe calculation
  const totalInProductUnit = useMemo(() => {
    const totalRaw = batchCount * yieldPerBatch;
    const product = inventory.find(i => i.id === selectedProductId);
    if (!product) return totalRaw;

    const pUnit = product.unit.toLowerCase();
    const yUnit = yieldUnit.toLowerCase();

    if (pUnit === yUnit) return totalRaw;

    // Specialized Logic: Kerupuk has NO ratio (1:1 kg)
    if (product.category === 'Kerupuk') {
      return totalRaw;
    }

    // Pempek Logic (UNDISTURBED)
    if (pUnit === 'kg' && (yUnit === 'pcs' || yUnit === 'bks')) return totalRaw / 32;
    if ((pUnit === 'pcs' || pUnit === 'bks') && yUnit === 'kg') return totalRaw * 32;
    return totalRaw;
  }, [batchCount, yieldPerBatch, yieldUnit, inventory, selectedProductId]);

  const quantity = useMemo(() => {
    return totalInProductUnit;
  }, [totalInProductUnit]);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Materials for WO
  const [materialsList, setMaterialsList] = useState<{
    materialId: string;
    amount: number;
    isTemplate?: boolean;
    displayAmount?: number;
    displayUnit?: 'kg' | 'pcs' | 'bks';
  }[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState('');
  const [currentMaterialQty, setCurrentMaterialQty] = useState(0);
  const [currentMaterialInputUnit, setCurrentMaterialInputUnit] = useState<'kg' | 'pcs'>('kg');

  // Products that have recipes defined in Master Resep
  const finishedGoods = useMemo(() => {
    return inventory.filter(item =>
      item.type === 'finished' &&
      recipes.some(r => r.productId === item.id)
    );
  }, [inventory, recipes]);

  const hasRecipe = useMemo(() => {
    return recipes.some(r => r.productId === selectedProductId);
  }, [recipes, selectedProductId]);

  const allPossibleIngredients = useMemo(() => inventory.filter(item =>
    item.type === 'raw' ||
    item.type === 'finished' ||
    ['Bahan Baku', 'Bumbu', 'Pempek', 'Kerupuk'].includes(item.category)
  ), [inventory]);

  const rawMaterials = useMemo(() => inventory.filter(item => item.type === 'raw'), [inventory]);

  // 1. Auto-fill settings only when product changes or modal opens
  React.useEffect(() => {
    if (!isModalOpen || !selectedProductId) return;

    const product = inventory.find(i => i.id === selectedProductId);
    const category = product?.category;
    const recipe = recipes.find(r => r.productId === selectedProductId);

    if (recipe) {
      // Set values from recipe
      setBatchCount(recipe.batchCount || 1);
      setYieldPerBatch(recipe.yieldPerBatch || (category === 'Kerupuk' ? 1 : 2.3));
      setYieldUnit(recipe.yieldUnit || 'kg');
    } else {
      // Fallback defaults if recipe is weirdly missing (though shouldn't happen based on finishedGoods filter)
      if (category === 'Kerupuk') {
        setYieldPerBatch(1);
        setYieldUnit('kg');
      } else {
        setYieldPerBatch(2.3);
        setYieldUnit('kg');
      }
    }
  }, [selectedProductId, isModalOpen, inventory, recipes]);

  // 2. Separate logic for calculating ingredients based on batch/yield
  React.useEffect(() => {
    if (!isModalOpen || !selectedProductId) return;

    const recipe = recipes.find(r => r.productId === selectedProductId);
    if (recipe) {
      const defaultMaterials = recipe.ingredients.map(ing => {
        const item = inventory.find(i => i.id === ing.materialId);
        const baseAmount = Number((ing.amount * totalInProductUnit).toFixed(5));

        let dUnit = ing.displayUnit || item?.unit || 'kg';
        let dAmount = baseAmount;

        if (item?.category !== 'Kerupuk') {
          // Convert baseAmount (which is the actual amount in item's unit) to display unit if needed
          if (dUnit === 'pcs' && item?.unit === 'kg') {
            dAmount = Number((baseAmount * 32).toFixed(2));
          } else if (dUnit === 'kg' && (item?.unit === 'pcs' || item?.unit === 'bks')) {
            dAmount = Number((baseAmount / 32).toFixed(5));
          }
        }

        return {
          materialId: ing.materialId,
          amount: baseAmount,
          displayAmount: dAmount,
          displayUnit: dUnit,
          isTemplate: true
        };
      });

      setMaterialsList(prev => {
        const manualItems = prev.filter(p => !p.isTemplate);
        return [...defaultMaterials, ...manualItems];
      });
    } else {
      setMaterialsList(prev => prev.filter(p => !p.isTemplate));
    }
  }, [totalInProductUnit, selectedProductId, isModalOpen, recipes]);


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
      const isPcsItem = item?.unit === 'pcs' || item?.unit === 'bks';

      let finalAmount = currentMaterialQty;
      if (item?.category !== 'Kerupuk') {
        if (isKgItem && currentMaterialInputUnit === 'pcs') {
          finalAmount = Number((currentMaterialQty / 32).toFixed(5));
        } else if (isPcsItem && currentMaterialInputUnit === 'kg') {
          finalAmount = Number((currentMaterialQty * 32).toFixed(5));
        }
      }

      setMaterialsList([...materialsList, {
        materialId: currentMaterialId,
        amount: finalAmount,
        displayAmount: currentMaterialQty,
        displayUnit: currentMaterialInputUnit,
        isTemplate: false
      }]);
      setCurrentMaterialId('');
      setCurrentMaterialQty(0);
      setCurrentMaterialInputUnit('kg');
    }
  };

  const handleRemoveMaterial = (index: number) => {
    const newList = [...materialsList];
    newList.splice(index, 1);
    setMaterialsList(newList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0 && startDate && dueDate && selectedProductId) {
      const productName = finishedGoods.find(i => i.id === selectedProductId)?.name || 'Unknown Product';

      const finalMaterialsList = [...materialsList];
      if (currentMaterialId && currentMaterialQty > 0) {
        const item = inventory.find(i => i.id === currentMaterialId);
        const isKgItem = item?.unit === 'kg';
        const isPcsItem = item?.unit === 'pcs' || item?.unit === 'bks';
        let finalAmount = currentMaterialQty;
        if (item?.category !== 'Kerupuk') {
          if (isKgItem && currentMaterialInputUnit === 'pcs') {
            finalAmount = Number((currentMaterialQty / 32).toFixed(5));
          } else if (isPcsItem && currentMaterialInputUnit === 'kg') {
            finalAmount = Number((currentMaterialQty * 32).toFixed(5));
          }
        }
        finalMaterialsList.push({ materialId: currentMaterialId, amount: finalAmount });
      }

      // 4. Create Work Order based on Recipe/BOM snapshot
      const getNowWithTime = (d: string) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return d.includes(' ') ? d : `${d} ${timeStr}`;
      };

      const newWO: WorkOrder = {
        id: `WO-${Date.now()}`,
        productId: selectedProductId,
        productName,
        quantity,
        status: 'Pending',
        startDate: getNowWithTime(startDate),
        dueDate: getNowWithTime(dueDate),
        progress: 0,
        materialsUsed: finalMaterialsList.map(m => ({
          materialId: m.materialId,
          amount: m.amount,
          displayAmount: (m as any).displayAmount,
          displayUnit: (m as any).displayUnit
        })),
        batchCount,
        yieldPerBatch,
        yieldUnit
      };
      createWorkOrder(newWO);
      completeWorkOrder(newWO.id, newWO);
      setIsModalOpen(false);
      // Reset form
      setSelectedProductId('');
      setBatchCount(1);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date().toISOString().split('T')[0]);
      setMaterialsList([]);
      setCurrentMaterialQty(0);
      setCurrentMaterialInputUnit('kg');
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
          Buat Perintah Kerja Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Factory size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total WO</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalWO}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Dalam Proses</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{inProgressCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Selesai</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Produksi</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalProduced.toLocaleString()} kg/pcs</p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari perintah kerja..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
                  isFilterOpen || filterStatus !== 'all' || filterDate
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Filter size={18} />
                <span className="text-sm font-medium">Filter</span>
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['all', 'Pending', 'In Progress', 'Completed'].map((status) => (
                          <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                              filterStatus === status
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {status === 'all' ? 'Semua' : getStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tanggal</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setFilterStatus('all');
                        setFilterDate('');
                        setIsFilterOpen(false);
                      }}
                      className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredWorkOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center">
                <Factory size={48} className="mx-auto mb-4 text-slate-300 opacity-20" />
                <p className="font-medium text-slate-500">Tidak ada perintah kerja yang ditemukan.</p>
                <button
                  onClick={handleOpenModal}
                  className="mt-4 text-emerald-600 font-bold hover:text-emerald-700 underline text-sm"
                >
                  Buat Perintah Kerja Baru
                </button>
              </div>
            ) : (
              filteredWorkOrders.map((wo) => (
                <div key={wo.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                          {wo.id}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          wo.status === 'In Progress' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            wo.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              "bg-amber-50 text-amber-700 border-amber-100"
                        )}>
                          {getStatusLabel(wo.status)}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {wo.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Package size={16} className="text-slate-400" />
                          <span>{wo.quantity} {wo.yieldUnit || 'kg'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar size={16} className="text-slate-400" />
                          <span>Sampai: {wo.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 self-end">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 shadow-sm",
                            wo.status === 'Completed' ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${wo.status === 'Completed' ? 100 : wo.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          wo.status === 'Completed' ? "bg-emerald-500" : "bg-blue-500"
                        )} />
                        <span className="text-xs font-bold text-slate-700">
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

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle size={20} className="text-slate-400" />
            Daftar Kebutuhan Bahan (BoM)
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Resep Standar</h3>
                <button
                  onClick={() => navigate('/recipes')}
                  className="text-xs text-emerald-600 font-medium hover:text-emerald-700"
                >
                  Lihat Semua Resep
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="p-4 hover:bg-slate-50 transition-colors">
                  {(() => {
                    const targetProduct = inventory.find(i => i.id === recipe.productId);
                    const bCount = recipe.batchCount || 1;
                    const yPerBatch = recipe.yieldPerBatch || 2.3;
                    const yUnit = (recipe.yieldUnit || 'kg').toLowerCase();
                    const pUnit = (targetProduct?.unit || (yUnit === 'kg' ? 'kg' : 'pcs')).toLowerCase();

                    let totalYieldMultiplier = bCount * yPerBatch;
                    if (pUnit === 'kg' && (yUnit === 'pcs' || yUnit === 'bks')) totalYieldMultiplier /= 32;
                    else if ((pUnit === 'pcs' || pUnit === 'bks') && yUnit === 'kg') totalYieldMultiplier *= 32;

                    return (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-emerald-700">{recipe.productName}</h4>
                          <span className="text-[10px] font-bold text-slate-400">UNTUK {bCount * yPerBatch} {yUnit}</span>
                        </div>
                        <ul className="space-y-1">
                          {recipe.ingredients.map((ing) => {
                            const mat = inventory.find(m => m.id === ing.materialId);
                            const totalAmt = ing.amount * totalYieldMultiplier;

                            let displayAmt = totalAmt;
                            let displayUn = ing.displayUnit || mat?.unit || 'kg';

                            if (mat?.category !== 'Kerupuk') {
                              if (displayUn === 'pcs' && mat?.unit === 'kg') {
                                displayAmt = Number((totalAmt * 32).toFixed(2));
                              } else if (displayUn === 'kg' && (mat?.unit === 'pcs' || mat?.unit === 'bks')) {
                                displayAmt = Number((totalAmt / 32).toFixed(5));
                              }
                            }

                            return (
                              <li key={ing.materialId} className="flex justify-between text-xs text-slate-600">
                                <span>{mat?.name}</span>
                                <span className="font-medium text-slate-900">{Number(displayAmt.toFixed(4))} {displayUn}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

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
                Bahan di atas sudah mendekati/melewati stok minimum.
              </p>
            </div>
          )}
        </div>
      </div>

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
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-[10px] uppercase font-bold tracking-wider", selectedWO.status === 'Completed' ? "text-emerald-800" : "text-blue-800")}>Total Hasil</p>
                  <div className={cn("text-lg font-bold leading-tight", selectedWO.status === 'Completed' ? "text-emerald-600" : "text-blue-600")}>
                    {(() => {
                      const product = inventory.find(p => p.id === selectedWO.productId);
                      const baseUnit = (product?.unit || 'kg').toLowerCase();
                      const yieldUnit = (selectedWO.yieldUnit || 'kg').toLowerCase();
                      const totalYield = (selectedWO.batchCount || 1) * (selectedWO.yieldPerBatch || 0);

                      if (baseUnit !== yieldUnit) {
                        return (
                          <div className="flex flex-col items-end">
                            <span>{Number(selectedWO.quantity.toFixed(4))} {baseUnit}</span>
                            <span className="text-[10px] opacity-70 font-medium">≈ {totalYield} {yieldUnit}</span>
                          </div>
                        );
                      }
                      return <span>{Number(selectedWO.quantity.toFixed(4))} {baseUnit}</span>;
                    })()}
                  </div>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Perintah Kerja"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700 font-bold uppercase tracking-tight">Pilih Produk</label>
              <button
                type="button"
                onClick={() => navigate('/recipes')}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase"
              >
                + Register di Master Resep
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <select
                required
                className="flex-1 px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 shadow-sm"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Pilih Produk Ready Produksi --</option>
                {finishedGoods.length === 0 ? (
                  <option value="" disabled>Belum ada produk di Master Resep</option>
                ) : (
                  finishedGoods.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {finishedGoods.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-2 italic font-medium">
                ⚠️ Belum ada resep yang terdaftar. Silakan buat resep di menu Master Resep terlebih dahulu.
              </p>
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
                    onClick={() => !hasRecipe && setYieldUnit('kg')}
                    disabled={hasRecipe || inventory.find(i => i.id === selectedProductId)?.category === 'Kerupuk'}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                      yieldUnit === 'kg' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600",
                      (hasRecipe || inventory.find(i => i.id === selectedProductId)?.category === 'Kerupuk') && "cursor-not-allowed opacity-70"
                    )}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => !hasRecipe && setYieldUnit('pcs')}
                    disabled={hasRecipe || inventory.find(i => i.id === selectedProductId)?.category === 'Kerupuk'}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                      yieldUnit === 'pcs' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600",
                      (hasRecipe || inventory.find(i => i.id === selectedProductId)?.category === 'Kerupuk') && "cursor-not-allowed opacity-70"
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
                  readOnly={hasRecipe}
                  className={cn(
                    "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                    hasRecipe && "bg-slate-50 text-slate-500 font-semibold"
                  )}
                  value={yieldPerBatch === 0 ? '' : yieldPerBatch}
                  onChange={e => setYieldPerBatch(Number(e.target.value))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                  {yieldUnit}
                </span>
                {inventory.find(i => i.id === selectedProductId)?.category === 'Kerupuk' && (
                  <div className="absolute -top-6 right-0 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase ring-1 ring-emerald-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    Modul Khusus Kerupuk: 1 Batch = 1 KG
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center text-sm shadow-sm">
                <span className="font-semibold text-emerald-800">Total Produksi (Masuk Gudang):</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-emerald-600 mr-2">
                    {quantity} {inventory.find(i => i.id === selectedProductId)?.unit || yieldUnit}
                  </span>
                  {inventory.find(i => i.id === selectedProductId)?.category !== 'Kerupuk' && (
                    <>
                      {yieldUnit === 'kg' ? (
                        <span className="text-sm font-medium text-emerald-500">({Math.round(batchCount * yieldPerBatch * 32)} pcs)</span>
                      ) : (
                        <span className="text-sm font-medium text-emerald-500">({(batchCount * yieldPerBatch / 32).toFixed(2)} kg)</span>
                      )}
                    </>
                  )}
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
                    <option value="">Tambah Bahan Lainnya...</option>
                    <optgroup label="📦 BAHAN BAKU / BUMBU">
                      {allPossibleIngredients
                        .filter(item => item.type !== 'finished')
                        .map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>
                        ))}
                    </optgroup>
                    <optgroup label="🍱 BARANG JADI (Sub-Resep)">
                      {allPossibleIngredients
                        .filter(item => item.type === 'finished')
                        .map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>
                        ))}
                    </optgroup>
                  </select>
                </div>
                <div className="w-24">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      className="w-full pl-3 pr-7 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white shadow-sm"
                      value={currentMaterialQty || ''}
                      onChange={e => setCurrentMaterialQty(Number(e.target.value))}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                      {currentMaterialInputUnit}
                    </span>
                  </div>
                </div>
                <div className="flex bg-white/50 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentMaterialInputUnit('kg')}
                    disabled={inventory.find(i => i.id === currentMaterialId)?.category === 'Kerupuk'}
                    className={cn("px-2 py-1 text-[9px] font-bold rounded", currentMaterialInputUnit === 'kg' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400", inventory.find(i => i.id === currentMaterialId)?.category === 'Kerupuk' && "cursor-not-allowed opacity-50")}
                  >KG</button>
                  <button
                    type="button"
                    onClick={() => setCurrentMaterialInputUnit('pcs')}
                    disabled={inventory.find(i => i.id === currentMaterialId)?.category === 'Kerupuk'}
                    className={cn("px-2 py-1 text-[9px] font-bold rounded", currentMaterialInputUnit === 'pcs' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400", inventory.find(i => i.id === currentMaterialId)?.category === 'Kerupuk' && "cursor-not-allowed opacity-50")}
                  >PCS</button>
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {materialsList.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-white/50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-xs">Belum ada bahan baku yang ditambahkan.</p>
                  </div>
                ) : (
                  materialsList.map((m, idx) => {
                    const item = inventory.find(i => i.id === m.materialId);
                    return (
                      <div key={idx} className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                        m.isTemplate ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100"
                      )}>
                        <div className="flex items-center gap-2">
                          {m.isTemplate && <CheckCircle size={12} className="text-emerald-500" />}
                          <span className="text-sm font-medium text-slate-700">{item?.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">
                            {m.displayAmount || m.amount} {m.displayUnit || item?.unit}
                          </span>
                          {!m.isTemplate && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>



          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]"
            >
              Buat Perintah Kerja
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
