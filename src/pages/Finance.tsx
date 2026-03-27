import React, { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Search, Filter, X,
  ArrowUpDown, FileText, Eye, Calendar, AlertCircle, CheckCircle2,
  ArrowRight, Landmark, Receipt, Users, PieChart, BarChart3, Briefcase
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Transaction, SalesOrder, PurchaseOrder } from '../lib/types';
import { cn } from '../lib/utils';

type FinanceTab = 'transactions' | 'receivables' | 'payables' | 'reports';

export default function Finance() {
  const {
    transactions, addTransaction, totalRevenue, totalExpenses, netProfit,
    salesOrders, purchaseOrders, totalReceivables, totalPayables,
    collectPayment, payDebt, inventory, employees
  } = useERP();

  const [activeTab, setActiveTab] = useState<FinanceTab>('transactions');
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
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    list.sort((a, b) => {
      let cmp = sortBy === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [transactions, searchQuery, filterType, sortBy, sortAsc]);

  const debtItems = useMemo(() => {
    const receivables = salesOrders
      .filter(so => so.paymentMethod === 'Debt' && !so.isPaid)
      .map(so => ({ ...so, type: 'receivable' as const }));

    const payables = purchaseOrders
      .filter(po => po.paymentMethod === 'Debt' && !po.isPaid)
      .map(po => ({ ...po, type: 'payable' as const }));

    return [...receivables, ...payables].sort((a, b) =>
      (a.dueDate || '').localeCompare(b.dueDate || '')
    );
  }, [salesOrders, purchaseOrders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category && amount > 0 && date) {
      addTransaction({
        id: `TRX-${Date.now()}`,
        type, category, amount, date,
        referenceId: referenceId || undefined,
        isDebtPayment: false
      });
      setIsModalOpen(false);
      setType('Expense'); setCategory(''); setAmount(0); setReferenceId('');
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      'Sales': 'Penjualan', 'Investment': 'Investasi', 'Raw Materials': 'Bahan Baku',
      'Hutang Usaha': 'Hutang Usaha', 'Piutang Usaha': 'Piutang Usaha',
      'Utilities': 'Utilitas', 'Rent': 'Sewa', 'Salaries': 'Gaji',
      'Maintenance': 'Pemeliharaan', 'Other': 'Lainnya',
      'Pelunasan Hutang': 'Pelunasan Hutang', 'Pelunasan Piutang': 'Pelunasan Piutang'
    };
    return labels[cat] || cat;
  };

  // Balance Sheet Data (Simple)
  const balanceSheet = useMemo(() => {
    const inventoryValue = inventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
    const cashBalance = transactions.reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0);
    const totalAssets = cashBalance + inventoryValue + totalReceivables;
    const totalLiabilities = totalPayables;
    const equity = totalAssets - totalLiabilities;

    return { cashBalance, inventoryValue, totalReceivables, totalPayables, totalAssets, totalLiabilities, equity };
  }, [inventory, transactions, totalReceivables, totalPayables]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Finance</h1>
          <p className="text-slate-500 text-sm font-medium">Laporan konsolidasian, hutang-piutang, dan arus kas.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-black flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span className="text-sm font-bold">Entry Baru</span>
          </button>
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Saldo Kas"
          value={balanceSheet.cashBalance}
          icon={<Wallet size={20} />}
          color="blue"
        />
        <SummaryCard
          label="Piutang (Arus Masuk)"
          value={totalReceivables}
          icon={<TrendingUp size={20} />}
          color="emerald"
        />
        <SummaryCard
          label="Hutang (Arus Keluar)"
          value={totalPayables}
          icon={<TrendingDown size={20} />}
          color="orange"
        />
        <SummaryCard
          label="Laba Bersih"
          value={netProfit}
          icon={<BarChart3 size={20} />}
          color={netProfit >= 0 ? "indigo" : "red"}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit">
        {[
          { id: 'transactions', label: 'Arus Kas', icon: <DollarSign size={16} /> },
          { id: 'receivables', label: 'Piutang', icon: <Users size={16} /> },
          { id: 'payables', label: 'Hutang', icon: <Landmark size={16} /> },
          { id: 'reports', label: 'Lap. Neraca', icon: <PieChart size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FinanceTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'transactions' && (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/30">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="text-xs font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none"
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
              >
                <option value="all">Semua Tipe</option>
                <option value="Income">Pendapatan</option>
                <option value="Expense">Pengeluaran</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Transaksi</th>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4 text-right">Jumlah</th>
                    <th className="px-6 py-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{t.id}</span>
                          <span className="text-[10px] text-slate-400 font-mono italic">{t.referenceId || 'No Ref'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                          t.type === 'Income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {getCategoryLabel(t.category)}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black text-right",
                        t.type === 'Income' ? "text-emerald-600" : "text-slate-900"
                      )}>
                        {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { setSelectedTransaction(t); setIsDetailModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'receivables' && (
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Pelanggan / SO</th>
                  <th className="px-6 py-4">Jatuh Tempo</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tagihan</th>
                  <th className="px-6 py-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid).map(so => {
                  const isOverdue = so.dueDate && new Date(so.dueDate) < new Date();
                  return (
                    <tr key={so.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{so.customerName}</span>
                          <span className="text-[10px] text-blue-600 font-bold uppercase">{so.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar size={12} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                          <span className={cn(isOverdue && "text-rose-600 font-bold")}>{so.dueDate || 'Belum diatur'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <div className="flex items-center gap-1 text-rose-600 animate-pulse">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-black uppercase">Terlambat</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Calendar size={14} />
                            <span className="text-[10px] font-black uppercase">Menunggu</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900 text-right">
                        Rp {so.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => collectPayment(so.id, so.totalAmount)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm shadow-emerald-100"
                        >
                          Klik Pelunasan
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payables' && (
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Supplier / PO</th>
                  <th className="px-6 py-4">Jatuh Tempo</th>
                  <th className="px-6 py-4">Urgensi</th>
                  <th className="px-6 py-4 text-right">Hutang</th>
                  <th className="px-6 py-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid).map(po => {
                  const isOverdue = po.dueDate && new Date(po.dueDate) < new Date();
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{po.supplierName}</span>
                          <span className="text-[10px] text-orange-600 font-bold uppercase">{po.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {po.dueDate || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "px-2 py-1 rounded w-fit text-[9px] font-black uppercase",
                          isOverdue ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {isOverdue ? "Sangat Penting" : "Normal"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-rose-600 text-right">
                        Rp {po.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => payDebt(po.id, po.totalAmount)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all"
                        >
                          Bayar Lunas
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-8 max-w-2xl mx-auto space-y-10">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Laporan Neraca Konsolidasi</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="space-y-6">
              {/* Assets Section */}
              <section>
                <div className="bg-slate-50 px-4 py-2 rounded-lg flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">AKTIVA (ASSETS)</h3>
                </div>
                <div className="space-y-2 px-4 italic text-sm">
                  <ReportLine label="Kas dan Setara Kas" value={balanceSheet.cashBalance} />
                  <ReportLine label="Persediaan Barang (Stok)" value={balanceSheet.inventoryValue} />
                  <ReportLine label="Piutang Usaha" value={balanceSheet.totalReceivables} />
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 not-italic">
                    <span>Total Aktiva</span>
                    <span>Rp {balanceSheet.totalAssets.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Liabilities & Equity Section */}
              <section>
                <div className="bg-slate-50 px-4 py-2 rounded-lg flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">PASSIVA (LIABILITIES & EQUITY)</h3>
                </div>
                <div className="space-y-2 px-4 italic text-sm">
                  <ReportLine label="Hutang Usaha" value={balanceSheet.totalPayables} color="text-rose-600" />
                  <ReportLine label="Modal Disetor / Ekuitas" value={balanceSheet.equity} />
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 not-italic">
                    <span>Total Passiva</span>
                    <span>Rp {(balanceSheet.totalLiabilities + balanceSheet.equity).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Laba Rugi Section */}
              <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Laporan Laba Rugi</h3>
                  <div className="h-px bg-slate-800 w-full mt-2" />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mb-2">Pemasukan Operasional</p>
                    <div className="space-y-1 px-2 border-l border-emerald-500/30">
                      <ReportLine label="Penjualan Produk" value={transactions.filter(t => t.category === 'Penjualan' || t.category === 'Sales').reduce((s, t) => s + t.amount, 0)} isDark />
                      <ReportLine label="Pelunasan Piutang" value={transactions.filter(t => t.category === 'Pelunasan Piutang').reduce((s, t) => s + t.amount, 0)} isDark />
                      <ReportLine label="Investasi & Lainnya" value={transactions.filter(t => t.type === 'Income' && !['Penjualan', 'Sales', 'Pelunasan Piutang'].includes(t.category)).reduce((s, t) => s + t.amount, 0)} isDark />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-tighter mb-2">Beban Operasional</p>
                    <div className="space-y-1 px-2 border-l border-rose-500/30">
                      <ReportLine label="Pembelian Bahan Baku" value={transactions.filter(t => ['Bahan Baku', 'Raw Materials', 'Pembelian'].includes(t.category)).reduce((s, t) => s + t.amount, 0)} isDark />
                      <ReportLine label="Gaji Karyawan" value={transactions.filter(t => t.category === 'Salaries' || t.category === 'Gaji').reduce((s, t) => s + t.amount, 0)} isDark />
                      <ReportLine label="Utilitas & Sewa" value={transactions.filter(t => ['Utilities', 'Rent', 'Utilitas', 'Sewa'].includes(t.category)).reduce((s, t) => s + t.amount, 0)} isDark />
                      <ReportLine label="Beban Lain-lain" value={transactions.filter(t => t.type === 'Expense' && !['Bahan Baku', 'Raw Materials', 'Pembelian', 'Salaries', 'Gaji', 'Utilities', 'Rent', 'Utilitas', 'Sewa'].includes(t.category)).reduce((s, t) => s + t.amount, 0)} isDark />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-black uppercase">Net Profit / Loss</span>
                    <span className={cn("text-lg font-black", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      Rp {netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </section>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase">Kesehatan Keuangan</p>
                    <p className="text-xs font-bold text-emerald-800">Status: SANGAT BAIK</p>
                  </div>
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Pencatatan Keuangan Manual">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setType('Income'); setCategory(''); }}
              className={cn(
                "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                type === 'Income' ? "border-emerald-500 bg-emerald-50" : "border-slate-100 text-slate-400"
              )}
            >
              <TrendingUp />
              <span className="text-xs font-black uppercase">Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('Expense'); setCategory(''); }}
              className={cn(
                "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                type === 'Expense' ? "border-rose-500 bg-rose-50" : "border-slate-100 text-slate-400"
              )}
            >
              <TrendingDown />
              <span className="text-xs font-black uppercase">Pengeluaran</span>
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
            <select
              required
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Pilih Kategori...</option>
              {type === 'Income' ? (
                <>
                  <option value="Sales">Penjualan Produk</option>
                  <option value="Investment">Modal Pemilik / Investor</option>
                  <option value="Other">Pendapatan Lainnya</option>
                </>
              ) : (
                <>
                  <option value="Raw Materials">Pembelian Bahan Baku</option>
                  <option value="Salaries">Gaji Karyawan</option>
                  <option value="Utilities">Listrik, Air & WiFi</option>
                  <option value="Maintenance">Biaya Perbaikan</option>
                  <option value="Rent">Sewa Gedung/Lahan</option>
                  <option value="Other">Biaya Operasional Lainnya</option>
                </>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Nominal (Rp)</label>
              <input
                type="number"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
              <input
                type="date"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all">
              Simpan Transaksi
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedTransaction(null); }}
        title="Detail Transaksi Keuangan"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className={cn(
              "p-6 rounded-2xl text-center border",
              selectedTransaction.type === 'Income' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
            )}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                {selectedTransaction.type === 'Income' ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCategoryLabel(selectedTransaction.category)}</p>
              <h4 className={cn(
                "text-3xl font-black mt-1",
                selectedTransaction.type === 'Income' ? "text-emerald-600" : "text-rose-600"
              )}>
                {selectedTransaction.type === 'Income' ? '+' : '-'} Rp {selectedTransaction.amount.toLocaleString()}
              </h4>
            </div>

            <div className="space-y-3">
              <DetailRow label="ID Transaksi" value={selectedTransaction.id} />
              <DetailRow label="Tanggal" value={new Date(selectedTransaction.date).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
              <DetailRow label="Referensi" value={selectedTransaction.referenceId || '-'} mono />
              <DetailRow label="Sifat" value={selectedTransaction.isDebtPayment ? 'Penyelesaian Hutang/Piutang' : 'Operasional Langsung'} />
            </div>

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Tutup
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-50",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-50",
    red: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50"
  };

  return (
    <div className={cn("p-4 rounded-2xl border flex items-center gap-4 transition-transform hover:scale-[1.02] shadow-sm", colorMap[color])}>
      <div className="p-3 bg-white/80 rounded-xl shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-black opacity-60 tracking-wider leading-none mb-1">{label}</p>
        <p className="text-base font-black tracking-tight leading-none">Rp {value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function ReportLine({ label, value, color, isDark }: { label: string, value: number, color?: string, isDark?: boolean }) {
  return (
    <div className="flex justify-between items-center group">
      <span className={cn("uppercase text-[10px] font-bold tracking-tight", isDark ? "text-slate-400" : "text-slate-500")}>{label}</span>
      <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900", color)}>Rp {value.toLocaleString()}</span>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string, value: string, mono?: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={cn("text-xs font-bold text-slate-900", mono && "font-mono")}>{value}</span>
    </div>
  );
}
