import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulasi pengiriman email reset password
        await new Promise(resolve => setTimeout(resolve, 1500));

        setLoading(false);
        setIsSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4 transform -rotate-6">
                        <Mail className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Lupa Kata Sandi?</h1>
                    <p className="text-slate-500 mt-2">
                        Jangan khawatir! Masukkan email Anda dan kami akan mengirimkan tautan reset.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Terdaftar</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                                        placeholder="admin@kerupuk.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Kirim Tautan Reset
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Email Terkirim!</h2>
                            <p className="text-slate-500 mb-8 text-sm">
                                Kami telah mengirimkan instruksi pemulihan kata sandi ke <strong>{email}</strong>.
                                Silakan periksa kotak masuk atau folder spam Anda.
                            </p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="text-emerald-600 font-bold hover:underline text-sm"
                            >
                                Tidak menerima email? Kirim ulang
                            </button>
                        </motion.div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Kembali ke Halaman Masuk
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
