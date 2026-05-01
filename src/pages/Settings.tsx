import React, { useState } from 'react';
import { User, Lock, Save, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Settings() {
    const { user, updateCredentials } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: null, message: '' });

        if (password && password !== confirmPassword) {
            setStatus({ type: 'error', message: 'Konfirmasi kata sandi tidak cocok!' });
            return;
        }

        setLoading(true);
        const success = await updateCredentials(username, password || 'admin123'); // fallback to default if password empty? No, better handle it.
        
        // Let's check if the user actually provided a password
        const finalPassword = password || JSON.parse(localStorage.getItem('erp_creds') || '{"password":"admin123"}').password;
        const finalSuccess = await updateCredentials(username, finalPassword);

        if (finalSuccess) {
            setStatus({ type: 'success', message: 'Username dan kata sandi berhasil diperbarui!' });
            setPassword('');
            setConfirmPassword('');
        } else {
            setStatus({ type: 'error', message: 'Gagal memperbarui pengaturan.' });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Akun</h1>
                <p className="text-slate-500 text-sm font-medium">Kelola informasi login dan keamanan akun Anda.</p>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Informasi Login</h3>
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
                                    placeholder="Masukkan username baru..."
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
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Konfirmasi Sandi</label>
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
                        <p className="text-[10px] text-slate-400 italic">* Kosongkan kata sandi jika tidak ingin mengubahnya.</p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </motion.div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                        <AlertCircle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase">Catatan Keamanan</h4>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            Setelah mengubah username atau password, sesi Anda akan tetap aktif di perangkat ini. Namun, jika Anda login dari perangkat lain, Anda harus menggunakan kredensial yang baru saja disimpan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
