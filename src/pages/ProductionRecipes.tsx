import React, { useState, useMemo } from 'react';
import { CookingPot, Plus, Search, CheckCircle2, Factory, FileEdit, Trash2, X, PlusCircle, MinusCircle } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Recipe } from '../lib/types';

export default function ProductionRecipes() {
    const { recipes, inventory, addRecipe, updateRecipe, deleteRecipe } = useERP();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [productId, setProductId] = useState('');
    const [ingredients, setIngredients] = useState<{ materialId: string; amount: number }[]>([]);

    // Get only finished goods for recipe creation target (Or anything not raw)
    const finishedGoods = inventory.filter(item => item.type === 'finished' || item.category === 'Pempek' || item.category === 'Kerupuk');
    // Get raw materials for ingredients
    const rawMaterials = inventory.filter(item => item.type === 'raw' || item.category === 'Bahan Baku' || item.category === 'Bumbu');

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
        setIngredients([{ materialId: '', amount: 0 }]); // Start with 1 empty ingredient
        setIsModalOpen(true);
    };

    // Open Modal for Editing existing recipe
    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setProductId(recipe.productId);
        // clone ingredients array so we don't accidentally mutate state directly
        setIngredients(recipe.ingredients.map(ing => ({ ...ing })));
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus resep produksi ini? Peringatan: Anda tidak bisa memproduksi barang ini lagi hingga resep barunya dibuat.')) {
            deleteRecipe(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi
        if (!productId) {
            alert('Pilih produk yang akan dibuat.');
            return;
        }

        const validIngredients = ingredients.filter(ing => ing.materialId && ing.amount > 0);
        if (validIngredients.length === 0) {
            alert('Resep harus memiliki setidaknya satu bahan baku yang valid (> 0)');
            return;
        }

        const selectedProduct = inventory.find(i => i.id === productId);
        if (!selectedProduct) return;

        if (editingRecipe) {
            // UPDATE
            const newRecipeData: Recipe = {
                ...editingRecipe,
                productId,
                productName: selectedProduct.name,
                ingredients: validIngredients
            };
            updateRecipe(editingRecipe.id, newRecipeData);
        } else {
            // CREATE
            const newRecipeData: Recipe = {
                id: `RCP-${Date.now()}`,
                productId,
                productName: selectedProduct.name,
                ingredients: validIngredients
            };
            addRecipe(newRecipeData);
        }

        setIsModalOpen(false);
    };

    const addIngredientRow = () => {
        setIngredients([...ingredients, { materialId: '', amount: 0 }]);
    };

    const removeIngredientRow = (index: number) => {
        const newIngredients = [...ingredients];
        newIngredients.splice(index, 1);
        setIngredients(newIngredients);
    };

    const updateIngredientRow = (index: number, field: 'materialId' | 'amount', value: any) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setIngredients(newIngredients);
    };

    // Hitung total HPP (Harga Pokok Penjualan) alias biaya modal bahan baku per pcs/resep
    const calculateCostPerRecipe = (recipe: Recipe) => {
        return recipe.ingredients.reduce((total, ing) => {
            const material = inventory.find(i => i.id === ing.materialId);
            if (material) {
                return total + Math.round(material.price * ing.amount); // harga per unit * jumlah unit dipakai, dibulatkan ke Rupiah terdekat
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
                    <div className="text-sm text-slate-500 font-medium">
                        Total: {filteredRecipes.length} Resep
                    </div>
                </div>
            </div>

            {filteredRecipes.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 flex flex-col items-center justify-center text-slate-400">
                    <CookingPot size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-slate-500">Belum ada resep, atau pencarian tidak cocok.</p>
                    <p className="text-sm mt-1">Buat resep baru agar Anda bisa memulai proses Produksi.</p>
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
                                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 uppercase tracking-wider">
                                            ID: {recipe.id}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => handleEdit(recipe)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Resep">
                                            <FileEdit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(recipe.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Resep">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                        <span>KOMPOSISI BAHAN</span>
                                        <span title="Bahan yang dibutuhkan untuk membuat 1 unit produk">PER {targetProduct?.unit || 'UNIT'}</span>
                                    </div>

                                    <ul className="space-y-1.5">
                                        {recipe.ingredients.map((ing, idx) => {
                                            const mat = getMaterialDetails(ing.materialId);
                                            return (
                                                <li key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-50/50 border border-transparent hover:border-slate-100 transition-colors">
                                                    <span className="text-slate-700 font-medium">
                                                        {mat ? mat.name : <span className="text-red-500 italic">Bahan dihapus</span>}
                                                    </span>
                                                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm text-xs">
                                                        {ing.amount} {mat?.unit}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
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

            {/* Modal Buat/Edit Resep */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRecipe ? "Ubah Resep (BOM)" : "Buat Resep Baru (BOM)"}
            >
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Step 1: Pilih Produk yg mau diproduksi */}
                    <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-lg">
                        <label className="block text-sm font-semibold text-emerald-800 mb-2">1. Pilih Produk (Hasil Produksi)</label>
                        <select
                            required
                            className="w-full px-3 py-2 border border-emerald-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                        >
                            <option value="">-- Pilih Barang Jadi --</option>
                            {finishedGoods.map(goods => (
                                <option key={goods.id} value={goods.id}>
                                    {goods.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="border-t border-slate-200 my-4" />

                    {/* Step 2: Racik Komposisi */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-semibold text-slate-800">2. Tentukan Komposisi Bahan Baku</label>
                            <button
                                type="button"
                                onClick={addIngredientRow}
                                className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                                <PlusCircle size={14} /> Tambah Bahan
                            </button>
                        </div>

                        <div className="space-y-3">
                            {ingredients.map((ing, index) => (
                                <div key={index} className="flex gap-2 items-start relative group">
                                    <div className="flex-1">
                                        <select
                                            required
                                            className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            value={ing.materialId}
                                            onChange={e => updateIngredientRow(index, 'materialId', e.target.value)}
                                        >
                                            <option value="">Pilih Komposisi Bahan...</option>
                                            {rawMaterials.map(raw => (
                                                <option key={raw.id} value={raw.id} disabled={ingredients.some((i, idx) => i.materialId === raw.id && idx !== index)}>
                                                    {raw.name} (Tersedia: {raw.stock} {raw.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-1/3 min-w-[100px]">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01" // allow decimals like 0.1kg
                                                className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                value={ing.amount || ''}
                                                onChange={e => updateIngredientRow(index, 'amount', Number(e.target.value))}
                                                placeholder="Jumlah"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                                                {ing.materialId ? getMaterialDetails(ing.materialId)?.unit : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeIngredientRow(index)}
                                        disabled={ingredients.length === 1}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                                        title="Hapus Bahan ini"
                                    >
                                        <MinusCircle size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 transition-colors flex justify-center items-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            {editingRecipe ? 'Simpan Perubahan Resep' : 'Simpan Resep Baru'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
