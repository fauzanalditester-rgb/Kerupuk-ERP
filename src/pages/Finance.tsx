import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Search, Filter, X, ArrowUpDown, FileText, Eye } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Transaction } from '../lib/types';

export default function Finance() {
  const { transactions, addTransaction, totalRevenue, totalExpenses, netProfit } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Income' | 'Expense'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // New Transaction State
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceId, setReferenceId] = useState('');

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.id?.toLowerCase() || '').includes(query) ||
        (t.referenceId?.toLowerCase() || '').includes(query) ||
        (getCategoryLabel(t.category)?.toLowerCase() || '').includes(query)
      );
    }

    if (filterType !== 'all') {
      list = list.filter(t => t.type === filterType);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else {
        cmp = a.amount - b.amount;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [transactions, searchQuery, filterType, sortBy, sortAsc]);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category && amount > 0 && date) {
      const newTransaction: Transaction = {
        id: `TRX-${Date.now()}`,
        type,
        category,
        amount,
        date,
        referenceId: referenceId || undefined
      };
      addTransaction(newTransaction);
      setIsModalOpen(false);
      // Reset form
      setType('Expense');
      setCategory('');
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setReferenceId('');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Income': return 'Pendapatan';
      case 'Expense': return 'Pengeluaran';
      default: return type;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Sales': return 'Penjualan';
      case 'Investment': return 'Investasi';
      case 'Raw Materials': return 'Bahan Baku';
      case 'Hutang Usaha': return 'Hutang Usaha (Debt)';
      case 'Utilities': return 'Utilitas';
      case 'Rent': return 'Sewa';
      case 'Salaries': return 'Gaji';
      case 'Maintenance': return 'Pemeliharaan';
      case 'Other': return 'Lainnya';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keuangan</h1>
          <p className="text-slate-500 mt-1">Pantau pendapatan, pengeluaran, dan kesehatan finansial.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus size={18} />
          Tambah Transaksi
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Pendapatan</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">Rp {totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <TrendingDown size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Total Pengeluaran</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">Rp {totalExpenses.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <DollarSign size={20} />
              </div>
              <span className="text-sm font-medium text-slate-500">Laba Bersih</span>
            </div>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Rp {netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari ID transaksi, referensi, atau kategori..."
              className="pl-10 pr-9 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
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
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors text-sm ${filterType !== 'all'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Filter size={16} />
              Filter
              {filterType !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Tipe Transaksi</p>
                {[
                  { value: 'all', label: 'Semua Tipe' },
                  { value: 'Income', label: '📈 Pendapatan' },
                  { value: 'Expense', label: '📉 Pengeluaran' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterType(opt.value as any); setIsFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterType === opt.value
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
                <th className="px-6 py-4">ID Transaksi</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-slate-700">
                    Tanggal
                    <ArrowUpDown size={14} className={sortBy === 'date' ? 'text-emerald-600' : 'opacity-30'} />
                  </button>
                </th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-slate-700">
                    Jumlah
                    <ArrowUpDown size={14} className={sortBy === 'amount' ? 'text-emerald-600' : 'opacity-30'} />
                  </button>
                </th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-3 opacity-20" />
                      <p className="font-medium text-slate-500">
                        {searchQuery || filterType !== 'all'
                          ? 'Tidak ditemukan transaksi yang cocok.'
                          : 'Tidak ada transaksi yang tercatat.'}
                      </p>
                      <p className="text-sm mt-1">
                        {searchQuery || filterType !== 'all'
                          ? 'Coba sesuaikan pencarian atau filter Anda.'
                          : 'Klik "Tambah Transaksi" untuk memulai.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{transaction.id}</div>
                      {transaction.referenceId && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5" title="Referensi dokumen">
                          Ref: {transaction.referenceId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{transaction.date}</td>
                    <td className="px-6 py-4 text-slate-600">{getCategoryLabel(transaction.category)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${transaction.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-bold ${transaction.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {transaction.type === 'Income' ? '+' : '-'} Rp {transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setSelectedTransaction(transaction); setIsDetailModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all mx-auto"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredTransactions.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
            <span>Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi</span>
            <div className="flex gap-4">
              <span>Pemasukan: <strong className="text-emerald-600">Rp {filteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0).toLocaleString()}</strong></span>
              <span>Pengeluaran: <strong className="text-red-600">Rp {filteredTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}</strong></span>
            </div>
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
        onClose={() => { setIsDetailModalOpen(false); setSelectedTransaction(null); }}
        title="Detail Transaksi"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border text-center ${selectedTransaction.type === 'Income' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
              <p className={`text-sm font-medium ${selectedTransaction.type === 'Income' ? 'text-emerald-700' : 'text-red-700'}`}>
                {getTypeLabel(selectedTransaction.type)}
              </p>
              <p className={`text-3xl font-bold mt-1 ${selectedTransaction.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {selectedTransaction.type === 'Income' ? '+' : '-'} Rp {selectedTransaction.amount.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ID Transaksi</p>
                <p className="font-mono font-medium text-slate-900">{selectedTransaction.id}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                <p className="font-medium text-slate-900">{selectedTransaction.date}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Kategori</p>
                <p className="font-medium text-slate-900">{getCategoryLabel(selectedTransaction.category)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Referensi Dokumen</p>
                {selectedTransaction.referenceId ? (
                  <p className="font-mono font-medium text-blue-600 hover:underline cursor-pointer">{selectedTransaction.referenceId}</p>
                ) : (
                  <p className="italic text-slate-400">- Tidak ada referensi -</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedTransaction(null); }}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Transaksi Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipe Transaksi</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${type === 'Income' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="type"
                  value="Income"
                  checked={type === 'Income'}
                  onChange={() => {
                    setType('Income');
                    setCategory('');
                  }}
                  className="sr-only"
                />
                <TrendingUp size={24} className="mb-1" />
                <span className="font-medium text-sm">Pendapatan</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${type === 'Expense' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="type"
                  value="Expense"
                  checked={type === 'Expense'}
                  onChange={() => {
                    setType('Expense');
                    setCategory('');
                  }}
                  className="sr-only"
                />
                <TrendingDown size={24} className="mb-1" />
                <span className="font-medium text-sm">Pengeluaran</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">-- Pilih Kategori --</option>
              {type === 'Income' ? (
                <>
                  <option value="Sales">Penjualan (Sales)</option>
                  <option value="Investment">Investasi Modal</option>
                  <option value="Other">Pendapatan Lainnya</option>
                </>
              ) : (
                <>
                  <option value="Raw Materials">Pembelian Bahan Baku</option>
                  <option value="Utilities">Tagihan Listrik / Air (Utilities)</option>
                  <option value="Rent">Biaya Sewa Tempat</option>
                  <option value="Salaries">Gaji Karyawan</option>
                  <option value="Maintenance">Pemeliharaan & Perbaikan</option>
                  <option value="Other">Pengeluaran Lainnya</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Referensi (Opsional)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm font-mono placeholder-slate-300"
                value={referenceId}
                onChange={e => setReferenceId(e.target.value)}
                placeholder="Contoh: SO-1234, PO-5678"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${type === 'Income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
