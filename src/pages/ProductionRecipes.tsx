import React, { useState, useMemo, useEffect } from 'react';
import { CookingPot, Plus, Search, CheckCircle2, Factory, FileEdit, Trash2, X, PlusCircle, MinusCircle, Package, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Recipe, Category } from '../lib/types';

export default function ProductionRecipes() {
    const { recipes, inventory, addRecipe, updateRecipe, deleteRecipe, addInventoryItem } = useERP();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Form State (Aligned with Production.tsx)
    const [productId, setProductId] = useState('');
    const [batchCount, setBatchCount] = useState(1);
    const [yieldPerBatch, setYieldPerBatch] = useState(2.3);
    const [yieldUnit, setYieldUnit] = useState<'kg' | 'pcs'>('kg');

    const [materialsList, setMaterialsList] = useState<{ materialId: string; amount: number }[]>([]);
    const [currentMaterialId, setCurrentMaterialId] = useState('');
    const [currentMaterialQty, setCurrentMaterialQty] = useState(0);
    const [currentMaterialInputUnit, setCurrentMaterialInputUnit] = useState<'kg' | 'pcs'>('kg');


    // Get only finished goods for recipe creation target
    const finishedGoods = inventory.filter(item => item.type === 'finished' || item.category === 'Pempek' || item.category === 'Kerupuk');
    // Get all materials for ingredients (Raw Materials + Finished Goods for semi-finished recipes)
    const allPossibleIngredients = inventory.filter(item =>
        item.type === 'raw' ||
        item.type === 'finished' ||
        ['Bahan Baku', 'Bumbu', 'Pempek', 'Kerupuk'].includes(item.category)
    );

    // New Product Form State
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductCategory, setNewProductCategory] = useState<Category>('Pempek');
    const [newProductUnit, setNewProductUnit] = useState<'kg' | 'pcs' | 'bks'>('kg');

    // Auto-update yield based on category for Kerupuk specialized module
    useEffect(() => {
        if (editingRecipe) return;

        let currentCategory: Category | undefined;
        if (isNewProduct) {
            currentCategory = newProductCategory;
        } else {
            const product = inventory.find(i => i.id === productId);
            currentCategory = product?.category;
        }

        if (currentCategory === 'Kerupuk') {
            setYieldPerBatch(1.25);
            setYieldUnit('kg');
        } else if (currentCategory === 'Pempek') {
            // Keep Pempek at its standard 2.3kg/batch
            setYieldPerBatch(2.3);
            setYieldUnit('kg');
        }
    }, [productId, newProductCategory, isNewProduct, inventory, editingRecipe]);


    const totalInProductUnit = useMemo(() => {
        const totalRaw = batchCount * yieldPerBatch;
        const targetId = isNewProduct ? 'TEMP' : productId;
        const product = inventory.find(i => i.id === targetId);
        const category = isNewProduct ? newProductCategory : product?.category;

        // For new product, guess unit based on category if not selected
        const pUnit = product ? product.unit.toLowerCase() : (newProductCategory === 'Kerupuk' ? 'kg' : 'kg');
        const yUnit = yieldUnit.toLowerCase();

        if (pUnit === yUnit) return totalRaw;

        // Logic specialized: Kerupuk has NO ratio (1:1 kg)
        if (category === 'Kerupuk') {
            return totalRaw; // No conversion for Kerupuk
        }

        // Logic Pempek: 1kg = 32pcs/bks (UNDISTURBED)
        if (pUnit === 'kg' && (yUnit === 'pcs' || yUnit === 'bks')) return totalRaw / 32;
        if ((pUnit === 'pcs' || pUnit === 'bks') && yUnit === 'kg') return totalRaw * 32;
        return totalRaw;
    }, [batchCount, yieldPerBatch, yieldUnit, inventory, productId, isNewProduct, newProductCategory]);

    const filteredRecipes = useMemo(() => {
        let list = [...recipes];
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(r =>
                r.productName.toLowerCase().includes(query) ||
                r.id.toLowerCase().includes(query)
            );
        }
        return list;
    }, [recipes, searchQuery]);

    // Open Modal for New Recipe
    const handleAddNew = () => {
        setEditingRecipe(null);
        setProductId('');
        setBatchCount(1);
        setYieldPerBatch(2.3);
        setYieldUnit('kg');
        setIsNewProduct(false);
        setNewProductName('');
        setNewProductCategory('Pempek');
        setMaterialsList([]);
        setIsModalOpen(true);
    };

    // Open Modal for Editing existing recipe
    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setProductId(recipe.productId);

        // Load default batch and yield from recipe if available
        const bCount = recipe.batchCount || 1;
        const yPerBatch = recipe.yieldPerBatch || 2.3;
        const yUnit = recipe.yieldUnit || 'kg';

        setBatchCount(bCount);
        setYieldPerBatch(yPerBatch);
        setYieldUnit(yUnit);

        // Calculate total yield in the product's base unit to de-normalize ingredients
        const product = inventory.find(i => i.id === recipe.productId);
        const pUnit = product?.unit?.toLowerCase() || (yUnit === 'kg' ? 'kg' : 'pcs');
        const category = product?.category;
        let totalYieldInBase = bCount * yPerBatch;

        if (category !== 'Kerupuk') {
            if (pUnit === 'kg' && (yUnit === 'pcs' || yUnit === 'bks')) totalYieldInBase /= 32;
            else if ((pUnit === 'pcs' || pUnit === 'bks') && yUnit === 'kg') totalYieldInBase *= 32;
        }

        setMaterialsList(recipe.ingredients.map(ing => {
            const item = inventory.find(i => i.id === ing.materialId);
            const baseAmount = ing.amount * totalYieldInBase;

            let dUnit = ing.displayUnit || item?.unit || 'kg';
            let dAmount = baseAmount;

            if (item?.category !== 'Kerupuk') {
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
                displayUnit: dUnit
            } as any;
        }));

        setIsNewProduct(false);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus resep produksi ini? Peringatan: Anda tidak bisa memproduksi barang ini lagi hingga resep barunya dibuat.')) {
            deleteRecipe(id);
        }
    };

    const toggleMaterialUnit = (newUnit: 'kg' | 'pcs') => {
        if (newUnit === currentMaterialInputUnit) return;

        let newQty = currentMaterialQty;
        if (newUnit === 'pcs' && currentMaterialInputUnit === 'kg') {
            newQty = Number((currentMaterialQty * 32).toFixed(2));
        } else if (newUnit === 'kg' && currentMaterialInputUnit === 'pcs') {
            newQty = Number((currentMaterialQty / 32).toFixed(5));
        }

        setCurrentMaterialInputUnit(newUnit);
        setCurrentMaterialQty(newQty);
    };

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
                displayUnit: currentMaterialInputUnit
            } as any]);
            setCurrentMaterialId('');
            setCurrentMaterialQty(0);
        }
    };

    const removeMaterial = (index: number) => {
        const newList = [...materialsList];
        newList.splice(index, 1);
        setMaterialsList(newList);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNewProduct && !productId) {
            alert('Pilih produk yang akan dibuat.');
            return;
        }

        const finalMaterials = [...materialsList];
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
            finalMaterials.push({
                materialId: currentMaterialId,
                amount: finalAmount,
                displayAmount: currentMaterialQty,
                displayUnit: currentMaterialInputUnit
            } as any);
        }

        if (finalMaterials.length === 0) {
            alert('Resep harus memiliki setidaknya satu bahan baku.');
            return;
        }

        let finalProductId = productId;
        let finalProductName = '';

        if (isNewProduct) {
            const newId = `FG-${Date.now()}`;
            const newItem = {
                id: newId,
                name: newProductName,
                category: newProductCategory,
                stock: 0,
                unit: 'kg', // Default normalized to KG for both, but definitely Kerupuk is strictly kg now
                minStock: 10,
                price: 0,
                type: 'finished' as const,
                createdAt: new Date().toISOString()
            };
            addInventoryItem(newItem);
            finalProductId = newId;
            finalProductName = newProductName;
        } else {
            const selectedProduct = inventory.find(i => i.id === productId);
            if (!selectedProduct) return;
            finalProductName = selectedProduct.name;
        }

        // Normalize ingredients to "Per 1 Unit"
        const normalizedIngredients = finalMaterials.map(m => ({
            materialId: m.materialId,
            amount: Number((m.amount / totalInProductUnit).toFixed(6)),
            displayUnit: (m as any).displayUnit
        }));

        if (editingRecipe) {
            updateRecipe(editingRecipe.id, {
                ...editingRecipe,
                productId: finalProductId,
                productName: finalProductName,
                ingredients: normalizedIngredients,
                batchCount,
                yieldPerBatch,
                yieldUnit
            });
        } else {
            addRecipe({
                id: `RCP-${Date.now()}`,
                productId: finalProductId,
                productName: finalProductName,
                ingredients: normalizedIngredients,
                batchCount,
                yieldPerBatch,
                yieldUnit
            });
        }

        setIsModalOpen(false);
    };

    const calculateCostPerRecipe = (recipe: Recipe) => {
        return recipe.ingredients.reduce((total, ing) => {
            const material = inventory.find(i => i.id === ing.materialId);
            if (material) {
                return total + Math.round(material.price * ing.amount);
            }
            return total;
        }, 0);
    };

    const getMaterialDetails = (id: string) => {
        return inventory.find(i => i.id === id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Resep Produksi</h1>
                    <p className="text-slate-500 mt-1">Kelola formula Bill of Materials (BOM) untuk mengubah bahan baku menjadi barang jadi.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
                >
                    <Plus size={18} />
                    Buat Resep Baru
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="p-4 flex items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari ID resep atau nama produk..."
                            className="pl-10 pr-9 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {filteredRecipes.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 flex flex-col items-center justify-center text-slate-400">
                    <CookingPot size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-slate-500">Belum ada resep, atau pencarian tidak cocok.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRecipes.map((recipe) => {
                        const estimatedCost = calculateCostPerRecipe(recipe);
                        const targetProduct = getMaterialDetails(recipe.productId);

                        return (
                            <div key={recipe.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full group">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/30 group-hover:bg-emerald-50/30 transition-colors">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg mb-0.5">{recipe.productName}</h3>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">ID: {recipe.id}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => handleEdit(recipe)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <FileEdit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(recipe.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex-1">
                                    {(() => {
                                        const bCount = recipe.batchCount || 1;
                                        const yPerBatch = recipe.yieldPerBatch || 2.3;
                                        const yUnit = recipe.yieldUnit || 'kg';

                                        const pUnit = targetProduct?.unit?.toLowerCase() || (yUnit === 'kg' ? 'kg' : 'pcs');
                                        const category = targetProduct?.category;
                                        let totalYieldBase = bCount * yPerBatch;

                                        if (category !== 'Kerupuk') {
                                            if (pUnit === 'kg' && (yUnit === 'pcs' || yUnit === 'bks')) totalYieldBase /= 32;
                                            else if ((pUnit === 'pcs' || pUnit === 'bks') && yUnit === 'kg') totalYieldBase *= 32;
                                        }

                                        return (
                                            <>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                                    <span>KOMPOSISI BAHAN Baku</span>
                                                    <span>UNTUK {bCount * yPerBatch} {yUnit}</span>
                                                </div>

                                                <ul className="space-y-1.5">
                                                    {recipe.ingredients.map((ing, idx) => {
                                                        const mat = getMaterialDetails(ing.materialId);
                                                        const totalAmt = ing.amount * totalYieldBase;

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
                                                            <li key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-50/50 border border-transparent hover:border-slate-100 transition-colors">
                                                                <span className="text-slate-700 font-medium">{mat ? mat.name : 'Bahan dihapus'}</span>
                                                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-100 text-xs">
                                                                    {Number(displayAmt.toFixed(4))} {displayUn}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                                    <span className="text-xs text-slate-500 font-medium italic">Estimasi Biaya Bahan:</span>
                                    <span className="font-black text-emerald-600 text-base">Rp {estimatedCost.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRecipe ? "Ubah Resep (BOM)" : "Buat Resep Baru (BOM)"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-700 font-bold uppercase tracking-tight">Pilih Produk</label>
                            {!editingRecipe && (
                                <button
                                    type="button"
                                    onClick={() => { setIsNewProduct(!isNewProduct); setProductId(''); }}
                                    className="text-xs text-emerald-600 font-medium hover:text-emerald-700"
                                >
                                    {isNewProduct ? 'Kembali Pilih dari Stok' : '+ Buat Produk Baru'}
                                </button>
                            )}
                        </div>

                        {isNewProduct && !editingRecipe ? (
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
                            <select
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                                disabled={!!editingRecipe}
                            >
                                <option value="">Pilih Produk</option>
                                {finishedGoods.map(goods => (
                                    <option key={goods.id} value={goods.id}>{goods.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dibuat untuk Berapa Batch?</label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="any"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={batchCount || ''}
                                onChange={e => setBatchCount(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">Hasil Jadi per 1 Batch</label>
                                <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setYieldUnit('kg')}
                                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded", yieldUnit === 'kg' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                                    >KG</button>
                                    <button
                                        type="button"
                                        onClick={() => setYieldUnit('pcs')}
                                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded", yieldUnit === 'pcs' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                                    >PCS</button>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="any"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={yieldPerBatch || ''}
                                    onChange={e => setYieldPerBatch(Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">{yieldUnit}</span>
                                {(isNewProduct ? newProductCategory : inventory.find(i => i.id === productId)?.category) === 'Kerupuk' && (
                                    <div className="absolute -top-6 right-0 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase ring-1 ring-emerald-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                        Modul Khusus Kerupuk: 1 Batch = 1.25 KG
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                <span className="font-semibold text-emerald-800">Total Produksi yang Didefinisikan:</span>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-emerald-600 mr-2">{(batchCount * yieldPerBatch).toFixed(2)} {yieldUnit}</span>
                                    {(isNewProduct ? newProductCategory : inventory.find(i => i.id === productId)?.category) !== 'Kerupuk' && (
                                        <>
                                            {yieldUnit === 'kg' ? (
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">({Math.round(batchCount * yieldPerBatch * 32)} pcs)</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">({(batchCount * yieldPerBatch / 32).toFixed(2)} kg)</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">* Sistem akan otomatis menghitung rasio bahan baku "Per Unit" dari data di atas.</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 mt-4 pt-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-emerald-500" />
                            Racik Komposisi Bahan Baku
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
                                            setCurrentMaterialInputUnit(item?.unit === 'kg' ? 'kg' : 'pcs');
                                        }}
                                    >
                                        <option value="">Tambah Bahan...</option>
                                        <optgroup label="📦 BAHAN BAKU / BUMBU">
                                            {allPossibleIngredients
                                                .filter(item => item.type !== 'finished')
                                                .map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} ({item.stock} {item.unit})
                                                    </option>
                                                ))
                                            }
                                        </optgroup>
                                        <optgroup label="🍱 BARANG JADI (Sub-Resep)">
                                            {allPossibleIngredients
                                                .filter(item => item.type === 'finished')
                                                .map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} ({item.stock} {item.unit})
                                                    </option>
                                                ))
                                            }
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
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">{currentMaterialInputUnit}</span>
                                    </div>
                                </div>
                                <div className="flex bg-white/50 p-0.5 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => toggleMaterialUnit('kg')}
                                        className={cn("px-2 py-1 text-[9px] font-bold rounded", currentMaterialInputUnit === 'kg' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400")}
                                    >KG</button>
                                    <button
                                        type="button"
                                        onClick={() => toggleMaterialUnit('pcs')}
                                        className={cn("px-2 py-1 text-[9px] font-bold rounded", currentMaterialInputUnit === 'pcs' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400")}
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

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {materialsList.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 bg-white/50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-xs">Belum ada bahan baku yang ditambahkan.</p>
                                    </div>
                                ) : (
                                    materialsList.map((m, idx) => {
                                        const item = inventory.find(i => i.id === m.materialId);
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-white border-slate-100 transition-all">
                                                <span className="text-sm font-medium text-slate-700">{item?.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {(m as any).displayAmount || m.amount} {(m as any).displayUnit || item?.unit}
                                                    </span>
                                                    <button type="button" onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium">Batal</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-100">
                            {editingRecipe ? 'Simpan Perubahan' : 'Simpan Resep Baru'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
