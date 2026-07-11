import React, { useState } from 'react';
import { User, Lock, Save, CheckCircle2, AlertCircle, Shield, Database, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useERP } from '../context/ERPContext';
import { motion } from 'framer-motion';
import { exportToExcelFormatted } from '../lib/export';
import * as XLSX from 'xlsx';

export default function Settings() {
    const { user, updateCredentials } = useAuth();
    const { 
        inventory, 
        salesOrders, 
        purchaseOrders, 
        transactions, 
        customers, 
        employees, 
        stockMovements,
        workOrders,
        recipes,
        clearAllData
    } = useERP();
    
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleResetData = async () => {
        const confirmFirst = window.confirm("⚠️ PERINGATAN KERAS:\nTindakan ini akan MENGHAPUS SEMUA DATA transaksi, stok, pelanggan, resep, dan karyawan di database Anda.\n\nSistem akan kembali kosong seperti baru instalasi.\n\nApakah Anda benar-benar yakin ingin melanjutkan?");
        if (!confirmFirst) return;

        const confirmSecond = window.confirm("🔒 KONFIRMASI TERAKHIR:\nData yang terhapus TIDAK BISA DIKEMBALIKAN dengan cara apa pun.\n\nKlik OK untuk menghapus permanen sekarang.");
        if (!confirmSecond) return;

        setResetLoading(true);
        try {
            await clearAllData();
            setStatus({ type: 'success', message: 'Seluruh data database berhasil dibersihkan! Memuat ulang sistem...' });
            setTimeout(() => {
                window.location.reload();
            }, 2500);
        } catch (error) {
            setStatus({ type: 'error', message: 'Gagal mereset database. Silakan coba lagi.' });
        } finally {
            setResetLoading(false);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: null, message: '' });

        if (password && password !== confirmPassword) {
            setStatus({ type: 'error', message: 'Konfirmasi kata sandi tidak cocok!' });
            return;
        }

        setLoading(true);
        // If password is empty, we send null/empty to tell AuthContext to keep existing password
        const success = await updateCredentials(username, password || undefined);

        if (success) {
            setStatus({ type: 'success', message: 'Pengaturan berhasil diperbarui!' });
            setPassword('');
            setConfirmPassword('');
        } else {
            setStatus({ type: 'error', message: 'Gagal memperbarui pengaturan.' });
        }
        setLoading(false);
    };



    const handleDownloadBackup = () => {
        const fullData = {
            inventory,
            salesOrders,
            purchaseOrders,
            transactions,
            customers,
            employees,
            stockMovements,
            workOrders,
            recipes,
            backupDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_full_kito_nian_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const handleExportAllToExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            // 1. Inventaris
            const invData = inventory.map(item => ({
                'ID Barang': item.id,
                'Nama': item.name,
                'Kategori': item.category,
                'Tipe': item.type === 'raw' ? 'Bahan Baku' : 'Barang Jadi',
                'Stok': item.stock,
                'Satuan': item.unit,
                'Harga Jual': item.price || 0,
                'Minimum Stok': item.minStock || 0
            }));
            const ws_inventory = XLSX.utils.json_to_sheet(invData);
            XLSX.utils.book_append_sheet(wb, ws_inventory, "Inventaris");

            // 2. Penjualan
            const salesData = salesOrders.map(so => ({
                'ID Nota': so.id,
                'Nama Pelanggan': so.customerName,
                'Tanggal': so.date,
                'Status': so.status === 'Completed' ? 'Selesai' : 'Pending',
                'Metode Pembayaran': so.paymentMethod === 'Cash' ? 'Tunai' : (so.paymentMethod === 'Transfer' ? 'Transfer' : 'Hutang/Tempo'),
                'Total Penjualan': so.totalAmount,
                'Total Bayar': so.paidAmount,
                'Sales': so.salesName || '-'
            }));
            const ws_sales = XLSX.utils.json_to_sheet(salesData);
            XLSX.utils.book_append_sheet(wb, ws_sales, "Penjualan");

            // 3. Pembelian
            const purchaseData = purchaseOrders.map(po => ({
                'ID PO': po.id,
                'Nama Bahan': po.itemName,
                'Qty': po.quantity,
                'Harga Satuan': po.pricePerUnit,
                'Total Biaya': po.totalPrice,
                'Supplier': po.supplierName,
                'Tanggal Order': po.orderDate,
                'Tanggal Terima': po.receivedDate || '-',
                'Status': po.status === 'Received' ? 'Diterima' : 'Dipesan'
            }));
            const ws_purchasing = XLSX.utils.json_to_sheet(purchaseData);
            XLSX.utils.book_append_sheet(wb, ws_purchasing, "Pembelian");

            // 4. Keuangan
            const trxData = transactions.map(trx => ({
                'ID Transaksi': trx.id,
                'Tipe': trx.type === 'Income' ? 'Pemasukan' : 'Pengeluaran',
                'Kategori': trx.category,
                'Jumlah': trx.amount,
                'Tanggal': trx.date,
                'Keterangan': trx.reason || '-',
                'ID Ref': trx.referenceId || '-'
            }));
            const ws_finance = XLSX.utils.json_to_sheet(trxData);
            XLSX.utils.book_append_sheet(wb, ws_finance, "Keuangan");

            // 5. CRM Pelanggan
            const customerData = customers.map(cust => ({
                'ID Pelanggan': cust.id,
                'Nama': cust.name,
                'Email': cust.email || '-',
                'Telepon': cust.phone || '-',
                'Alamat': cust.address || '-',
                'Total Transaksi': cust.totalOrders || 0,
                'Total Belanja': cust.totalSpent || 0,
                'Transaksi Terakhir': cust.lastOrderDate || '-',
                'Sales Penanggungjawab': cust.salesName || '-'
            }));
            const ws_customers = XLSX.utils.json_to_sheet(customerData);
            XLSX.utils.book_append_sheet(wb, ws_customers, "Pelanggan (CRM)");

            // 6. HR Karyawan
            const employeeData = employees.map(emp => ({
                'ID Karyawan': emp.id,
                'Nama': emp.name,
                'Jabatan': emp.position,
                'Departemen': emp.department,
                'Gaji Bulanan': emp.salary,
                'Tanggal Masuk': emp.joinDate,
                'Status': emp.status === 'Active' ? 'Aktif' : 'Non-Aktif',
                'Rekening Bank': emp.bankAccount || '-'
            }));
            const ws_employees = XLSX.utils.json_to_sheet(employeeData);
            XLSX.utils.book_append_sheet(wb, ws_employees, "Karyawan (HR)");

            // 7. Produksi
            const woData = workOrders.map(wo => ({
                'ID Perintah Kerja': wo.id,
                'ID Produk': wo.productId,
                'Nama Produk': inventory.find(i => i.id === wo.productId)?.name || 'Unknown',
                'Jumlah Target': wo.quantity,
                'Hasil Batch': (wo.batchCount || 1) * (wo.yieldPerBatch || 0),
                'Status': wo.status === 'Completed' ? 'Selesai' : 'Pending',
                'Tanggal Mulai': wo.startDate,
                'Tenggat Waktu': wo.dueDate,
                'Tanggal Selesai': wo.completedDate || '-'
            }));
            const ws_production = XLSX.utils.json_to_sheet(woData);
            XLSX.utils.book_append_sheet(wb, ws_production, "Produksi");

            // 8. Resep
            const recipeData: any[] = [];
            recipes.forEach(r => {
                const prodName = inventory.find(i => i.id === r.productId)?.name || 'Unknown';
                r.ingredients.forEach(ing => {
                    const matName = inventory.find(i => i.id === ing.materialId)?.name || 'Unknown';
                    recipeData.push({
                        'Nama Produk': prodName,
                        'ID Produk': r.productId,
                        'Target Yield Resep': `${r.yieldPerBatch} ${r.yieldUnit}`,
                        'Bahan Baku': matName,
                        'Jumlah Kebutuhan': ing.amount,
                        'Satuan Bahan': ing.displayUnit || 'kg'
                    });
                });
            });
            const ws_recipes = XLSX.utils.json_to_sheet(recipeData);
            XLSX.utils.book_append_sheet(wb, ws_recipes, "Resep");

            // 9. Mutasi Stok
            const movementData = stockMovements.map(m => ({
                'ID Mutasi': m.id,
                'ID Barang': m.itemId,
                'Nama Barang': m.itemName,
                'Tipe': m.type === 'In' ? 'Masuk' : (m.type === 'Out' ? 'Keluar' : 'Penyesuaian'),
                'Jumlah': m.amount,
                'Alasan': m.reason,
                'ID Referensi': m.referenceId || '-',
                'Tanggal': m.date
            }));
            const ws_movements = XLSX.utils.json_to_sheet(movementData);
            XLSX.utils.book_append_sheet(wb, ws_movements, "Mutasi Stok");

            XLSX.writeFile(wb, `backup_excel_kito_nian_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Gagal mengekspor data ke Excel:', error);
            alert('Gagal mengekspor data ke Excel. Silakan coba lagi.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan & Pemeliharaan</h1>
                <p className="text-slate-500 text-sm font-medium">Kelola keamanan akun dan database sistem Anda.</p>
            </div>

            {/* Backup & Export Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-emerald-50/30">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Database size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Pencadangan & Ekspor Data</h3>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Simpan cadangan data Anda secara berkala untuk menghindari kehilangan data. Anda bisa mendownload seluruh database atau mengekspor tabel tertentu ke Excel.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={handleDownloadBackup}
                            className="p-4 border-2 border-slate-100 rounded-2xl flex flex-col items-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                        >
                            <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-emerald-600 rounded-xl transition-colors">
                                <Download size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-800">Download Full Backup</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Format: JSON (Sangat Aman)</p>
                            </div>
                        </button>

                        <button 
                            onClick={handleExportAllToExcel}
                            className="p-4 border-2 border-slate-100 rounded-2xl flex flex-col items-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                        >
                            <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-emerald-600 rounded-xl transition-colors">
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-800">Ekspor Semua ke Excel</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Format: XLSX (Multi-Tab Lengkap)</p>
                            </div>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Reset Database Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-red-100 flex items-center gap-3 bg-red-50/50">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse">
                        <Trash2 size={20} />
                    </div>
                    <h3 className="text-sm font-black text-red-800 uppercase tracking-wider">Reset Database (Hapus Semua Data)</h3>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Peringatan Penting</h4>
                            <p className="text-xs text-amber-700 leading-relaxed mt-1">
                                Tindakan ini akan mengosongkan seluruh data transaksi, stok bahan baku, resep, data pelanggan, data karyawan, dan riwayat arus kas. Gunakan opsi ini jika Anda ingin memulai lembaran baru dengan data riil yang baru.
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                        Sistem database utama dan semua konfigurasi sistem akan tetap aman dan tidak terganggu. Hanya data transaksi dan entri saja yang akan dihapus total.
                    </p>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="button"
                            onClick={handleResetData}
                            disabled={resetLoading}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Trash2 size={18} />
                            {resetLoading ? 'Mereset...' : 'Mulai Lembaran Baru (Reset Data)'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Login Credentials Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Keamanan Akun</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {status.type && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {status.message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Username Baru</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Username baru..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kata Sandi Baru</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="password" 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Konfirmasi</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="password" 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Menyimpan...' : 'Update Login'}
                        </button>
                    </div>
                </form>
            </motion.div>


        </div>
    );
}

function AlertTriangle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
