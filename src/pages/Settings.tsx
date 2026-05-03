import React, { useState } from 'react';
import { User, Lock, Save, CheckCircle2, AlertCircle, Shield, Trash2, RefreshCcw, Database, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useERP } from '../context/ERPContext';
import { motion } from 'framer-motion';
import { exportToExcelFormatted } from '../lib/export';

export default function Settings() {
    const { user, updateCredentials } = useAuth();
    const { 
        clearAllData, 
        inventory, 
        salesOrders, 
        purchaseOrders, 
        transactions, 
        customers, 
        employees, 
        stockMovements 
    } = useERP();
    
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: null, message: '' });

        if (password && password !== confirmPassword) {
            setStatus({ type: 'error', message: 'Konfirmasi kata sandi tidak cocok!' });
            return;
        }

        setLoading(true);
        const finalPassword = password || JSON.parse(localStorage.getItem('erp_creds') || '{"password":"admin123"}').password;
        const success = await updateCredentials(username, finalPassword);

        if (success) {
            setStatus({ type: 'success', message: 'Username dan kata sandi berhasil diperbarui!' });
            setPassword('');
            setConfirmPassword('');
        } else {
            setStatus({ type: 'error', message: 'Gagal memperbarui pengaturan.' });
        }
        setLoading(false);
    };

    const handleClearData = async () => {
        if (window.confirm('PERINGATAN: Ini akan menghapus SELURUH data ERP Anda (Stok, Penjualan, Keuangan, dll) secara permanen baik di perangkat ini maupun di cloud. Tindakan ini tidak dapat dibatalkan. Lanjutkan?')) {
            setClearing(true);
            await clearAllData();
            setClearing(false);
            alert('Semua data telah dibersihkan. Halaman akan dimuat ulang.');
            window.location.reload();
        }
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
        // Since we can only download one file at a time easily without a zip lib,
        // we'll prioritize Sales and Inventory as requested.
        const salesData = salesOrders.map(so => ({
            'ID': so.id,
            'Pelanggan': so.customerName,
            'Tanggal': so.date,
            'Total': so.totalAmount,
            'Status': so.status
        }));
        exportToExcelFormatted(
            `Penjualan_KITO_NIAN_${new Date().toISOString().split('T')[0]}.xls`, 
            'LAPORAN PENJUALAN KITO NIAN',
            salesData,
            '#10b981'
        );
        
        setTimeout(() => {
            const invData = inventory.map(item => ({
                'ID': item.id,
                'Nama': item.name,
                'Kategori': item.category,
                'Stok': item.stock,
                'Unit': item.unit,
                'Harga': item.price
            }));
            exportToExcelFormatted(
                `Inventaris_KITO_NIAN_${new Date().toISOString().split('T')[0]}.xls`,
                'LAPORAN INVENTARIS KITO NIAN',
                invData,
                '#3b82f6'
            );
        }, 500);
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
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Format: CSV (Bisa dibuka Excel)</p>
                            </div>
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

            {/* Maintenance Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-rose-50/50">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <RefreshCcw size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Pemeliharaan Data</h3>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-4">
                        <div className="shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <AlertTriangle className="text-rose-500" size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-rose-900 uppercase">Zona Bahaya: Reset Database</h4>
                            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                                Fitur ini akan menghapus <strong>SELURUH</strong> data operasional Anda secara permanen. Gunakan hanya jika Anda ingin memulai sistem dari nol (Hard Reset).
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Bersihkan Semua Cache & Data Cloud</p>
                            <p className="text-[10px] text-slate-500 font-medium">Sinkronisasi akan dihentikan dan data di Supabase akan dihapus.</p>
                        </div>
                        <button 
                            onClick={handleClearData}
                            disabled={clearing}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            {clearing ? 'Membersihkan...' : 'Hapus Data'}
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                        <AlertCircle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase">Sinkronisasi Cloud</h4>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed font-medium">
                            Sistem ini menggunakan Supabase untuk sinkronisasi antar perangkat. Jika Anda mengalami masalah "cache nyangkut", pastikan Anda menggunakan tombol <strong>Hapus Data</strong> di atas untuk memastikan cloud juga bersih.
                        </p>
                    </div>
                </div>
            </div>
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
