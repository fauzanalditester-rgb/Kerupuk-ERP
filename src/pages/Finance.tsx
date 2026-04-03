import React, { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Search, X,
  Calendar, AlertCircle, CheckCircle2, Clock, FileSpreadsheet, FileText as FilePdf,
  ArrowRight, Landmark, Receipt, Users, PieChart, BarChart3, Eye, AlertTriangle
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Transaction } from '../lib/types';
import { cn } from '../lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type FinanceTab = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'reports';

// Helper: diff in days
const diffDays = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000*60*60*24));
};

const fmtRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

export default function Finance() {
  const {
    transactions, addTransaction, totalRevenue, totalExpenses, netProfit,
    salesOrders, purchaseOrders, totalReceivables, totalPayables,
    collectPayment, payDebt, inventory, employees
  } = useERP();

  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Income' | 'Expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // New Transaction State
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceId, setReferenceId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [incomeCategories, setIncomeCategories] = useState(() => JSON.parse(localStorage.getItem('erp_income_cats') || '["Sales", "Investment", "Other"]'));
  const [expenseCategories, setExpenseCategories] = useState(() => JSON.parse(localStorage.getItem('erp_expense_cats') || '["Raw Materials", "Salaries", "Utilities", "Maintenance", "Rent", "Other"]'));
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; type: 'pay' | 'collect'; id: string; name: string; remainingAmount: number }>({ isOpen: false, type: 'pay', id: '', name: '', remainingAmount: 0 });
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  const getRemainingPayable = (poId: string, totalAmount: number) => {
    const paid = transactions.filter(t => t.referenceId === poId && t.type === 'Expense' && t.isDebtPayment).reduce((s, t) => s + t.amount, 0);
    return Math.max(0, totalAmount - paid);
  };

  const getRemainingReceivable = (soId: string, totalAmount: number) => {
    const paid = transactions.filter(t => t.referenceId === soId && t.type === 'Income' && t.isDebtPayment).reduce((s, t) => s + t.amount, 0);
    return Math.max(0, totalAmount - paid);
  };

  // === DERIVED DATA ===
  const balanceSheet = useMemo(() => {
    const inventoryValue = inventory.reduce((s, i) => s + (i.stock * i.price), 0);
    const cashBalance = transactions.reduce((s, t) => s + (t.type === 'Income' ? t.amount : -t.amount), 0);
    const totalAssets = cashBalance + inventoryValue + totalReceivables;
    const equity = totalAssets - totalPayables;
    return { cashBalance, inventoryValue, totalReceivables, totalPayables, totalAssets, totalLiabilities: totalPayables, equity };
  }, [inventory, transactions, totalReceivables, totalPayables]);

  // Overdue items
  const overdueReceivables = useMemo(() =>
    salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid && so.dueDate && diffDays(so.dueDate) < 0)
  , [salesOrders]);

  const overduePayables = useMemo(() =>
    purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid && po.dueDate && diffDays(po.dueDate) < 0)
  , [purchaseOrders]);

  // Near due (H-7)
  const nearDueItems = useMemo(() => {
    const recs = salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid && so.dueDate && diffDays(so.dueDate) >= 0 && diffDays(so.dueDate) <= 7)
      .map(so => ({ name: so.customerName, amount: so.totalAmount, dueDate: so.dueDate!, type: 'Piutang' as const, id: so.id }));
    const pays = purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid && po.dueDate && diffDays(po.dueDate) >= 0 && diffDays(po.dueDate) <= 7)
      .map(po => ({ name: po.supplierName, amount: po.totalAmount, dueDate: po.dueDate!, type: 'Hutang' as const, id: po.id }));
    return [...recs, ...pays].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  }, [salesOrders, purchaseOrders]);

  // Monthly cash flow data for chart
  const cashFlowData = useMemo(() => {
    const months: Record<string, {month: string, masuk: number, keluar: number}> = {};
    transactions.forEach(t => {
      const m = t.date.substring(0, 7); // YYYY-MM
      if (!months[m]) months[m] = { month: m, masuk: 0, keluar: 0 };
      if (t.type === 'Income') months[m].masuk += t.amount;
      else months[m].keluar += t.amount;
    });
    return Object.values(months).sort((a,b) => a.month.localeCompare(b.month)).slice(-6).map(d => ({
      ...d,
      month: new Date(d.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    }));
  }, [transactions]);

  // Monthly P&L data
  const plData = useMemo(() => {
    const months: Record<string, {month: string, pendapatan: number, beban: number, laba: number}> = {};
    transactions.filter(t => !t.isDebtPayment).forEach(t => {
      const m = t.date.substring(0, 7);
      if (!months[m]) months[m] = { month: m, pendapatan: 0, beban: 0, laba: 0 };
      if (t.type === 'Income') months[m].pendapatan += t.amount;
      else months[m].beban += t.amount;
    });
    return Object.values(months).sort((a,b) => a.month.localeCompare(b.month)).slice(-6).map(d => ({
      ...d,
      laba: d.pendapatan - d.beban,
      month: new Date(d.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    }));
  }, [transactions]);

  // Aging report
  const agingReport = useMemo(() => {
    const calc = (items: {dueDate?: string, totalAmount: number}[]) => {
      let d07 = 0, d830 = 0, d30 = 0;
      items.forEach(i => {
        if (!i.dueDate) return;
        const age = -diffDays(i.dueDate);
        if (age <= 7) d07 += i.totalAmount;
        else if (age <= 30) d830 += i.totalAmount;
        else d30 += i.totalAmount;
      });
      return { d07, d830, d30, total: d07 + d830 + d30 };
    };
    const unpaidSO = salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid).map(so => ({ ...so, type: 'so' as const, totalAmount: getRemainingReceivable(so.id, so.totalAmount) }));
    const unpaidPO = purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid).map(po => ({ ...po, type: 'po' as const, totalAmount: getRemainingPayable(po.id, po.totalAmount) }));
    return { piutang: calc(unpaidSO), hutang: calc(unpaidPO) };
  }, [salesOrders, purchaseOrders]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => (t.id?.toLowerCase()||'').includes(q) || (t.referenceId?.toLowerCase()||'').includes(q) || (t.category?.toLowerCase()||'').includes(q));
    }
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (dateFrom) list = list.filter(t => t.date >= dateFrom);
    if (dateTo) list = list.filter(t => t.date <= dateTo);
    list.sort((a,b) => b.date.localeCompare(a.date));
    return list;
  }, [transactions, searchQuery, filterType, dateFrom, dateTo]);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      'Sales': 'Penjualan', 'Investment': 'Investasi', 'Raw Materials': 'Bahan Baku',
      'Hutang Usaha': 'Hutang Usaha', 'Piutang Usaha': 'Piutang Usaha',
      'Utilities': 'Utilitas', 'Rent': 'Sewa', 'Salaries': 'Gaji',
      'Maintenance': 'Pemeliharaan', 'Other': 'Lainnya', 'Pembelian': 'Pembelian',
      'Pelunasan Hutang': 'Pelunasan Hutang', 'Pelunasan Piutang': 'Pelunasan Piutang',
      'Penjualan': 'Penjualan'
    };
    return labels[cat] || cat;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category && amount > 0 && date) {
      addTransaction({ 
        id: `TRX-${Date.now()}`, 
        type, 
        category, 
        amount, 
        date: date.includes(' ') ? date : `${date} ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`, 
        referenceId: referenceId || undefined, 
        isDebtPayment: false, 
        description: description || undefined 
      });
      setIsModalOpen(false);
      setType('Expense'); setCategory(''); setAmount(0); setReferenceId(''); setDescription(''); setSelectedEmployeeId('');
      setIsNewCategory(false); setNewCatName('');
    }
  };

  // Export helpers
  const exportCSV = () => {
    const rows = [['ID','Tanggal','Tipe','Kategori','Keterangan','Jumlah','Referensi']];
    filteredTransactions.forEach(t => rows.push([t.id, t.date, t.type, t.category, `"${t.description || ''}"`, t.amount.toString(), t.referenceId||'']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan_keuangan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const reportDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodStr = `${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`;
    const totInc = transactions.filter(t => t.type === 'Income').reduce((s,t) => s + t.amount, 0);
    const totExp = transactions.filter(t => t.type === 'Expense').reduce((s,t) => s + t.amount, 0);
    
    const html = `
      <html>
        <head>
          <title>Laporan Keuangan - ERP</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 30px; color: #334155; margin: 0; background: #fff; }
            .header-info { display: flex; justify-content: space-between; border-bottom: 4px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .report-name h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; }
            .report-name p { margin: 2px 0 0; font-size: 12px; font-weight: 600; color: #64748b; }
            
            .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; background: #f8fafc; }
            .summary-table th, .summary-table td { border: 1px solid #cbd5e1; padding: 12px 20px; text-align: left; }
            .summary-table th { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; width: 30%; }
            .summary-table td { font-size: 16px; font-weight: 700; color: #0f172a; }

            .ledger-table { width: 100%; border-collapse: collapse; }
            .ledger-table th { background: #1e293b; color: #fff; text-transform: uppercase; font-size: 10px; font-weight: 800; padding: 12px; text-align: left; border: 1px solid #0f172a; }
            .ledger-table td { border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 11px; }
            .ledger-table tr:nth-child(even) { background-color: #f1f5f9; }
            
            .income-cell { color: #15803d; font-weight: 700; }
            .expense-cell { color: #b91c1c; font-weight: 700; }
            .badge { padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .badge-in { background: #dcfce7; color: #166534; }
            .badge-out { background: #fee2e2; color: #991b1b; }
            
            .footer-section { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-start; }
            .signature-box { border-top: 2px solid #334155; width: 220px; text-align: center; margin-top: 80px; padding-top: 10px; font-weight: 700; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div class="report-name">
              <h1>KERUPUK BU AKKNA</h1>
              <p>PEMPEK & KERUPUK - LAPORAN KEUANGAN SISTEM ERP</p>
            </div>
            <div style="text-align: right">
              <h2 style="margin:0; font-weight: 900; font-size: 18px;">RINGKASAN PERIODE</h2>
              <p style="margin:5px 0; font-size: 12px; font-weight: 600;">${periodStr}</p>
            </div>
          </div>

          <table class="summary-table">
            <tr>
              <th>TOTAL PEMASUKAN</th>
              <td class="income-cell" style="font-size: 20px;">${fmtRp(totInc)}</td>
            </tr>
            <tr>
              <th>TOTAL PENGELUARAN</th>
              <td class="expense-cell" style="font-size: 20px;">${fmtRp(totExp)}</td>
            </tr>
            <tr>
              <th>LABA / RUGI BERSIH</th>
              <td style="font-size: 24px; color: ${netProfit >= 0 ? '#15803d' : '#b91c1c'};"><b>${fmtRp(netProfit)}</b></td>
            </tr>
          </table>

          <h3 style="font-size: 12px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; border-left: 5px solid #1e293b; padding-left: 10px;">Daftar Transaksi Detail</h3>
          <table class="ledger-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th style="text-align: right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td style="font-family: monospace; font-weight: bold; color: #64748b;">#${t.id.split('-').pop()}</td>
                  <td>${t.date.split(' ')[0]}</td>
                  <td style="text-align: center;"><span class="badge ${t.type === 'Income' ? 'badge-in' : 'badge-out'}">${t.type === 'Income' ? 'Masuk' : 'Keluar'}</span></td>
                  <td style="font-weight: 700;">${getCategoryLabel(t.category)}</td>
                  <td style="font-size: 10px; color: #475569;">${t.description || '-'}</td>
                  <td style="text-align: right;" class="${t.type === 'Income' ? 'income-cell' : 'expense-cell'}">${t.type === 'Income' ? '+' : '-'}${fmtRp(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-section">
            <div style="font-size: 10px; font-style: italic; color: #64748b; margin-top: 100px;">
              Dicetak otomatis oleh Sistem ERP pada ${reportDate} pukul ${new Date().toLocaleTimeString()}
            </div>
            <div class="signature-box">
              PENANGGUNG JAWAB KEUANGAN
            </div>
          </div>

          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
  };

  // Receivable/Payable count for due items
  const piutangJatuhTempo = salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid && so.dueDate && diffDays(so.dueDate) <= 7);
  const hutangJatuhTempo = purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid && po.dueDate && diffDays(po.dueDate) <= 7);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Finance</h1>
          <p className="text-slate-500 text-sm font-medium">Laporan konsolidasian, hutang-piutang, dan arus kas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-bold transition-all">
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button onClick={exportPDF} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 text-xs font-bold transition-all">
            <FilePdf size={14} /> Export PDF
          </button>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-black flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95">
            <Plus size={18} /><span className="text-sm font-bold">Entry Baru</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-500">Periode:</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20" />
        <span className="text-xs text-slate-400">s/d</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20" />
        {(dateFrom || dateTo) && <button onClick={()=>{setDateFrom('');setDateTo('')}} className="text-xs text-rose-500 font-bold flex items-center gap-1"><X size={12}/>Reset</button>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Saldo Kas" value={balanceSheet.cashBalance} icon={<Wallet size={20}/>} color="blue" />
        <SummaryCard label="Piutang Jatuh Tempo" value={piutangJatuhTempo.reduce((s,so)=>s+so.totalAmount,0)} icon={<TrendingUp size={20}/>} color="emerald" sub={`${piutangJatuhTempo.length} Customer`} />
        <SummaryCard label="Hutang Jatuh Tempo" value={hutangJatuhTempo.reduce((s,po)=>s+po.totalAmount,0)} icon={<TrendingDown size={20}/>} color="orange" sub={`${hutangJatuhTempo.length} Supplier`} />
        <SummaryCard label="Laba Bulan Ini" value={netProfit} icon={<BarChart3 size={20}/>} color={netProfit >= 0 ? "indigo" : "red"} />
      </div>

      {/* Overdue & Near Due Alerts */}
      {(overdueReceivables.length > 0 || overduePayables.length > 0 || nearDueItems.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(overdueReceivables.length > 0 || overduePayables.length > 0) && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3"><AlertCircle size={16} className="text-rose-600"/><span className="text-xs font-black text-rose-700 uppercase">Overdue (Lewat Jatuh Tempo)</span></div>
              <div className="space-y-2">
                {overdueReceivables.map(so => (
                  <div key={so.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{so.customerName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{fmtRp(getRemainingReceivable(so.id, so.totalAmount))}</span>
                      <button onClick={()=>{setPaymentModal({isOpen:true, type:'collect', id:so.id, name:so.customerName, remainingAmount:getRemainingReceivable(so.id, so.totalAmount)});setPaymentAmount(getRemainingReceivable(so.id, so.totalAmount));}} className="px-2 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold hover:bg-emerald-600">Tagih</button>
                    </div>
                  </div>
                ))}
                {overduePayables.map(po => (
                  <div key={po.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{po.supplierName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{fmtRp(getRemainingPayable(po.id, po.totalAmount))}</span>
                      <button onClick={()=>{setPaymentModal({isOpen:true, type:'pay', id:po.id, name:po.supplierName, remainingAmount:getRemainingPayable(po.id, po.totalAmount)});setPaymentAmount(getRemainingPayable(po.id, po.totalAmount));}} className="px-2 py-1 bg-rose-500 text-white rounded-md text-[10px] font-bold hover:bg-rose-600">Bayar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {nearDueItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-600"/><span className="text-xs font-black text-amber-700 uppercase">Jatuh Tempo Dekat (≤7 Hari)</span></div>
              <div className="space-y-2">
                {nearDueItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">{fmtRp(item.type === 'Piutang' ? getRemainingReceivable(item.id, item.amount) : getRemainingPayable(item.id, item.amount))}</span>
                      <span className="text-[10px] text-slate-500">{item.dueDate}</span>
                      <span className={cn("text-[10px] font-black uppercase", item.type === 'Piutang' ? 'text-blue-600' : 'text-orange-600')}>{item.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit flex-wrap">
        {([
          { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16}/> },
          { id: 'transactions', label: 'Arus Kas', icon: <DollarSign size={16}/> },
          { id: 'receivables', label: 'Piutang', icon: <Users size={16}/> },
          { id: 'payables', label: 'Hutang', icon: <Landmark size={16}/> },
          { id: 'reports', label: 'Lap. Neraca', icon: <PieChart size={16}/> },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">

        {/* === DASHBOARD TAB === */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-sm font-black text-slate-800 mb-4">Kas Masuk & Kas Keluar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="month" tick={{fontSize:10}} stroke="#94a3b8"/>
                    <YAxis tick={{fontSize:10}} stroke="#94a3b8" tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                    <Tooltip formatter={(v:number)=>fmtRp(v)} labelStyle={{fontWeight:'bold'}}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Line type="monotone" dataKey="masuk" name="Kas Masuk" stroke="#10b981" strokeWidth={2} dot={{r:4}}/>
                    <Line type="monotone" dataKey="keluar" name="Kas Keluar" stroke="#ef4444" strokeWidth={2} dot={{r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-sm font-black text-slate-800 mb-4">Laba Rugi Bulanan</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={plData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="month" tick={{fontSize:10}} stroke="#94a3b8"/>
                    <YAxis tick={{fontSize:10}} stroke="#94a3b8" tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                    <Tooltip formatter={(v:number)=>fmtRp(v)}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="pendapatan" name="Pendapatan" fill="#3b82f6" radius={[4,4,0,0]}/>
                    <Bar dataKey="beban" name="Beban" fill="#f97316" radius={[4,4,0,0]}/>
                    <Bar dataKey="laba" name="Laba" fill="#10b981" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Laba Rugi & Posisi Keuangan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-sm font-black text-slate-800 mb-4">Rugi Laba Bulan Ini</h3>
                <div className="space-y-2 text-sm">
                  <PLRow label="Pendapatan" value={totalRevenue} />
                  <PLRow label="HPP (Bahan Baku)" value={transactions.filter(t=>['Pembelian','Raw Materials','Bahan Baku'].includes(t.category)&&!t.isDebtPayment).reduce((s,t)=>s+t.amount,0)} />
                  <PLRow label="Laba Kotor" value={totalRevenue - transactions.filter(t=>['Pembelian','Raw Materials','Bahan Baku'].includes(t.category)&&!t.isDebtPayment).reduce((s,t)=>s+t.amount,0)} bold />
                  <PLRow label="Biaya Operasional" value={totalExpenses - transactions.filter(t=>['Pembelian','Raw Materials','Bahan Baku'].includes(t.category)&&!t.isDebtPayment).reduce((s,t)=>s+t.amount,0)} />
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                    <span className={netProfit>=0?'text-emerald-600':'text-rose-600'}>Laba Bersih</span>
                    <span className={netProfit>=0?'text-emerald-600':'text-rose-600'}>{fmtRp(netProfit)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5">
                <h3 className="text-sm font-black text-slate-800 mb-4">Posisi Keuangan</h3>
                <div className="space-y-2 text-sm">
                  <PLRow label="Aset:" value={balanceSheet.totalAssets} bold />
                  <PLRow label="   Piutang" value={totalReceivables} />
                  <PLRow label="Liabilitas:" value={totalPayables} bold />
                  <PLRow label="Ekuitas: Modal & Laba" value={balanceSheet.equity} bold />
                </div>
              </div>
            </div>

            {/* Aging Report */}
            <div className="bg-slate-50 rounded-2xl p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">Aging Piutang & Hutang</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-blue-600 mb-2">Piutang: {fmtRp(agingReport.piutang.total)}</p>
                  <div className="space-y-1.5 text-xs">
                    <AgingRow label="0 - 7 Hari" value={agingReport.piutang.d07} />
                    <AgingRow label="8 - 30 Hari" value={agingReport.piutang.d830} />
                    <AgingRow label="> 30 Hari" value={agingReport.piutang.d30} danger />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-600 mb-2">Hutang: {fmtRp(agingReport.hutang.total)}</p>
                  <div className="space-y-1.5 text-xs">
                    <AgingRow label="0 - 7 Hari" value={agingReport.hutang.d07} />
                    <AgingRow label="8 - 30 Hari" value={agingReport.hutang.d830} />
                    <AgingRow label="> 30 Hari" value={agingReport.hutang.d30} danger />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-slate-50 rounded-2xl p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">Transaksi Terbaru</h3>
              <div className="space-y-2">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500 w-16">{t.date.substring(5)}</span>
                      <span className="font-bold text-slate-800">{getCategoryLabel(t.category)}</span>
                    </div>
                    <span className={cn("font-black", t.type==='Income'?'text-emerald-600':'text-rose-600')}>
                      {t.type==='Income'?'+':'-'} {fmtRp(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === TRANSACTIONS TAB === */}
        {activeTab === 'transactions' && (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/30 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" placeholder="Cari transaksi..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
              </div>
              <select className="text-xs font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none" value={filterType} onChange={e=>setFilterType(e.target.value as any)}>
                <option value="all">Semua Tipe</option>
                <option value="Income">Pendapatan</option>
                <option value="Expense">Pengeluaran</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr><th className="px-6 py-4">Transaksi</th><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Kategori</th><th className="px-6 py-4">Keterangan</th><th className="px-6 py-4 text-right">Jumlah</th><th className="px-6 py-4 text-center w-20">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4"><div className="flex flex-col"><span className="text-xs font-bold text-slate-900">{t.id}</span><span className="text-[10px] text-slate-400 font-mono italic">{t.referenceId||'No Ref'}</span></div></td>
                      <td className="px-6 py-4 text-xs text-slate-500">{t.date}</td>
                      <td className="px-6 py-4"><span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter", t.type==='Income'?"bg-emerald-50 text-emerald-600":"bg-rose-50 text-rose-600")}>{getCategoryLabel(t.category)}</span></td>
                      <td className="px-6 py-4 text-xs text-slate-600 truncate max-w-[150px]">{t.description || '-'}</td>
                      <td className={cn("px-6 py-4 text-sm font-black text-right", t.type==='Income'?"text-emerald-600":"text-slate-900")}>{t.type==='Income'?'+':'-'} {fmtRp(t.amount)}</td>
                      <td className="px-6 py-4 text-center"><button onClick={()=>{setSelectedTransaction(t);setIsDetailModalOpen(true)}} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* === RECEIVABLES TAB === */}
        {activeTab === 'receivables' && (
          <div className="overflow-x-auto">
            <div className="p-4 border-b border-slate-100"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Cari pelanggan..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div></div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr><th className="px-6 py-4">Pelanggan / SO</th><th className="px-6 py-4">Jatuh Tempo</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Tagihan</th><th className="px-6 py-4 text-center">Tindakan</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesOrders.filter(so=>so.paymentMethod==='Debt'&&!so.isPaid && (!searchQuery || so.customerName.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b)=>{
                  const aO=a.dueDate&&diffDays(a.dueDate)<0?0:1;
                  const bO=b.dueDate&&diffDays(b.dueDate)<0?0:1;
                  if(aO!==bO)return aO-bO;
                  return (a.dueDate||'').localeCompare(b.dueDate||'');
                }).map(so=>{
                  const isOverdue=so.dueDate&&diffDays(so.dueDate)<0;
                  const isNear=so.dueDate&&diffDays(so.dueDate)>=0&&diffDays(so.dueDate)<=7;
                  return(
                    <tr key={so.id} className={cn("hover:bg-slate-50/50 transition-colors", isOverdue&&"bg-rose-50/30")}>
                      <td className="px-6 py-4"><div className="flex flex-col"><span className="text-xs font-bold text-slate-900">{so.customerName}</span><span className="text-[10px] text-blue-600 font-bold uppercase">{so.id}</span></div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs"><Calendar size={12} className={isOverdue?"text-rose-500":isNear?"text-amber-500":"text-slate-400"}/><span className={cn(isOverdue&&"text-rose-600 font-bold",isNear&&"text-amber-600 font-bold")}>{so.dueDate||'Belum diatur'}</span></div></td>
                      <td className="px-6 py-4">{isOverdue?(<div className="flex items-center gap-1 text-rose-600"><AlertCircle size={14}/><span className="text-[10px] font-black uppercase">Terlambat</span></div>):isNear?(<div className="flex items-center gap-1 text-amber-600"><Clock size={14}/><span className="text-[10px] font-black uppercase">H-{diffDays(so.dueDate!)}</span></div>):(<div className="flex items-center gap-1 text-emerald-500"><CheckCircle2 size={14}/><span className="text-[10px] font-black uppercase">Aman</span></div>)}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900 text-right">{fmtRp(getRemainingReceivable(so.id, so.totalAmount))}</td>
                      <td className="px-6 py-4 text-center"><button onClick={()=>{setPaymentModal({isOpen:true, type:'collect', id:so.id, name:so.customerName, remainingAmount:getRemainingReceivable(so.id, so.totalAmount)});setPaymentAmount(getRemainingReceivable(so.id, so.totalAmount));}} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm shadow-emerald-100">Bayar Cicilan/Lunas</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* === PAYABLES TAB === */}
        {activeTab === 'payables' && (
          <div className="overflow-x-auto">
            <div className="p-4 border-b border-slate-100"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Cari supplier..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div></div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr><th className="px-6 py-4">Supplier / PO</th><th className="px-6 py-4">Jatuh Tempo</th><th className="px-6 py-4">Urgensi</th><th className="px-6 py-4 text-right">Hutang</th><th className="px-6 py-4 text-center">Tindakan</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchaseOrders.filter(po=>po.paymentMethod==='Debt'&&!po.isPaid && (!searchQuery || po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b)=>{
                  const aO=a.dueDate&&diffDays(a.dueDate)<0?0:1;
                  const bO=b.dueDate&&diffDays(b.dueDate)<0?0:1;
                  if(aO!==bO)return aO-bO;
                  return (a.dueDate||'').localeCompare(b.dueDate||'');
                }).map(po=>{
                  const isOverdue=po.dueDate&&diffDays(po.dueDate)<0;
                  const isNear=po.dueDate&&diffDays(po.dueDate)>=0&&diffDays(po.dueDate)<=7;
                  return (
                    <tr key={po.id} className={cn("hover:bg-slate-50/50 transition-colors", isOverdue&&"bg-rose-50/30")}>
                      <td className="px-6 py-4"><div className="flex flex-col"><span className="text-xs font-bold text-slate-900">{po.supplierName}</span><span className="text-[10px] text-orange-600 font-bold uppercase">{po.id}</span></div></td>
                      <td className="px-6 py-4 text-xs font-medium">{po.dueDate||'N/A'}</td>
                      <td className="px-6 py-4">{isOverdue?(<div className={cn("px-2 py-1 rounded w-fit text-[9px] font-black uppercase bg-rose-100 text-rose-700")}>Sangat Penting</div>):isNear?(<div className="px-2 py-1 rounded w-fit text-[9px] font-black uppercase bg-amber-100 text-amber-700">Segera Bayar</div>):(<div className="px-2 py-1 rounded w-fit text-[9px] font-black uppercase bg-slate-100 text-slate-600">Normal</div>)}</td>
                      <td className="px-6 py-4 text-sm font-black text-rose-600 text-right">{fmtRp(getRemainingPayable(po.id, po.totalAmount))}</td>
                      <td className="px-6 py-4 text-center"><button onClick={()=>{setPaymentModal({isOpen:true, type:'pay', id:po.id, name:po.supplierName, remainingAmount:getRemainingPayable(po.id, po.totalAmount)});setPaymentAmount(getRemainingPayable(po.id, po.totalAmount));}} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">Bayar Cicilan/Lunas</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
      <Modal isOpen={paymentModal.isOpen} onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))} title={paymentModal.type === 'pay' ? 'Bayar Hutang' : 'Terima Pembayaran Piutang'}>
        <form onSubmit={e => {
          e.preventDefault();
          const amt = Number(paymentAmount);
          if (amt > 0 && amt <= paymentModal.remainingAmount) {
            if (paymentModal.type === 'pay') {
              payDebt(paymentModal.id, amt);
            } else {
              collectPayment(paymentModal.id, amt);
            }
            setPaymentModal(prev => ({ ...prev, isOpen: false }));
            setPaymentAmount('');
          }
        }} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">{paymentModal.type === 'pay' ? 'Supplier / PO' : 'Pelanggan / SO'}</p>
            <p className="text-sm font-black text-slate-900">{paymentModal.name} <span className="text-xs font-bold text-blue-600">({paymentModal.id})</span></p>
            <div className="mt-3 flex justify-between items-center border-t border-slate-200 pt-3">
              <span className="text-xs font-bold text-slate-600">Sisa Tagihan:</span>
              <span className="text-sm font-black text-rose-600">{fmtRp(paymentModal.remainingAmount)}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Pembayaran</label>
            <input type="number" required max={paymentModal.remainingAmount} min={1} value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Masukkan nominal..." />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Batal</button>
            <button type="submit" disabled={!paymentAmount || paymentAmount <= 0 || paymentAmount > paymentModal.remainingAmount} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-50">Proses</button>
          </div>
        </form>
      </Modal>

        {/* === REPORTS/BALANCE SHEET TAB === */}
        {activeTab === 'reports' && (
          <div className="p-8 max-w-2xl mx-auto space-y-10">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Laporan Neraca Konsolidasi</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="space-y-6">
              <section>
                <div className="bg-slate-50 px-4 py-2 rounded-lg flex justify-between items-center mb-4"><h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">AKTIVA (ASSETS)</h3></div>
                <div className="space-y-2 px-4 italic text-sm">
                  <ReportLine label="Kas dan Setara Kas" value={balanceSheet.cashBalance}/>
                  <ReportLine label="Persediaan Barang (Stok)" value={balanceSheet.inventoryValue}/>
                  <ReportLine label="Piutang Usaha" value={balanceSheet.totalReceivables}/>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 not-italic"><span>Total Aktiva</span><span>{fmtRp(balanceSheet.totalAssets)}</span></div>
                </div>
              </section>
              <section>
                <div className="bg-slate-50 px-4 py-2 rounded-lg flex justify-between items-center mb-4"><h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">PASSIVA (LIABILITIES & EQUITY)</h3></div>
                <div className="space-y-2 px-4 italic text-sm">
                  <ReportLine label="Hutang Usaha" value={balanceSheet.totalPayables} color="text-rose-600"/>
                  <ReportLine label="Modal Disetor / Ekuitas" value={balanceSheet.equity}/>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 not-italic"><span>Total Passiva</span><span>{fmtRp(balanceSheet.totalLiabilities + balanceSheet.equity)}</span></div>
                </div>
              </section>
              <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-center mb-6"><h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Laporan Laba Rugi</h3><div className="h-px bg-slate-800 w-full mt-2"/></div>
                <div className="space-y-4">
                  <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter mb-2">Pemasukan Operasional</p><div className="space-y-1 px-2 border-l border-emerald-500/30"><ReportLine label="Penjualan Produk" value={transactions.filter(t=>['Penjualan','Sales'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/><ReportLine label="Pelunasan Piutang" value={transactions.filter(t=>t.category==='Pelunasan Piutang').reduce((s,t)=>s+t.amount,0)} isDark/><ReportLine label="Investasi & Lainnya" value={transactions.filter(t=>t.type==='Income'&&!['Penjualan','Sales','Pelunasan Piutang'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/></div></div>
                  <div><p className="text-[10px] font-black text-rose-400 uppercase tracking-tighter mb-2">Beban Operasional</p><div className="space-y-1 px-2 border-l border-rose-500/30"><ReportLine label="Pembelian Bahan Baku" value={transactions.filter(t=>['Bahan Baku','Raw Materials','Pembelian'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/><ReportLine label="Gaji Karyawan" value={transactions.filter(t=>['Salaries','Gaji'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/><ReportLine label="Utilitas & Sewa" value={transactions.filter(t=>['Utilities','Rent','Utilitas','Sewa'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/><ReportLine label="Beban Lain-lain" value={transactions.filter(t=>t.type==='Expense'&&!['Bahan Baku','Raw Materials','Pembelian','Salaries','Gaji','Utilities','Rent','Utilitas','Sewa'].includes(t.category)).reduce((s,t)=>s+t.amount,0)} isDark/></div></div>
                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center"><span className="text-xs font-black uppercase">Net Profit / Loss</span><span className={cn("text-lg font-black", netProfit>=0?"text-emerald-400":"text-rose-400")}>{fmtRp(netProfit)}</span></div>
                </div>
              </section>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl"><div className="flex justify-between items-center"><div><p className="text-[10px] font-black text-emerald-600 uppercase">Kesehatan Keuangan</p><p className="text-xs font-bold text-emerald-800">Status: {netProfit>=0?'SANGAT BAIK':'PERLU PERHATIAN'}</p></div>{netProfit>=0?<CheckCircle2 size={24} className="text-emerald-500"/>:<AlertCircle size={24} className="text-rose-500"/>}</div></div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title="Pencatatan Keuangan Manual">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={()=>{setType('Income');setCategory('')}} className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all", type==='Income'?"border-emerald-500 bg-emerald-50":"border-slate-100 text-slate-400")}><TrendingUp/><span className="text-xs font-black uppercase">Pemasukan</span></button>
            <button type="button" onClick={()=>{setType('Expense');setCategory('')}} className={cn("p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all", type==='Expense'?"border-rose-500 bg-rose-50":"border-slate-100 text-slate-400")}><TrendingDown/><span className="text-xs font-black uppercase">Pengeluaran</span></button>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
            <div className="space-y-2">
              <select required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={isNewCategory ? 'ADD_NEW' : category} onChange={e=>{
                const val = e.target.value;
                if (val === 'ADD_NEW') {
                  setIsNewCategory(true);
                  setCategory('');
                } else {
                  setIsNewCategory(false);
                  setCategory(val);
                }
                setSelectedEmployeeId('');
              }}>
                <option value="">Pilih Kategori...</option>
                {(type === 'Income' ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
                <option value="ADD_NEW" className="text-blue-600 font-bold">+ Tambah Kategori Baru...</option>
              </select>

              {isNewCategory && (
                <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Nama kategori baru..." 
                    className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm outline-none font-bold" 
                    value={newCatName} 
                    onChange={e => setNewCatName(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (newCatName.trim()) {
                        const updated = type === 'Income' ? [...incomeCategories, newCatName.trim()] : [...expenseCategories, newCatName.trim()];
                        if (type === 'Income') {
                          setIncomeCategories(updated);
                          localStorage.setItem('erp_income_cats', JSON.stringify(updated));
                        } else {
                          setExpenseCategories(updated);
                          localStorage.setItem('erp_expense_cats', JSON.stringify(updated));
                        }
                        setCategory(newCatName.trim());
                        setNewCatName('');
                        setIsNewCategory(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
                  >
                    Tambah
                  </button>
                  <button type="button" onClick={() => setIsNewCategory(false)} className="px-3 py-2 text-slate-400">Batal</button>
                </div>
              )}
            </div>
          </div>
          {category === 'Salaries' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-emerald-600 uppercase">Pilih Karyawan</label>
              <select 
                required 
                className="w-full mt-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold outline-none" 
                value={selectedEmployeeId} 
                onChange={e => {
                  const empId = e.target.value;
                  setSelectedEmployeeId(empId);
                  const emp = employees.find(emp => emp.id === empId);
                  if (emp) {
                    setAmount(emp.salary);
                    setDescription(`Gaji bulan ini untuk ${emp.name}`);
                  }
                }}
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase">Nominal (Rp)</label><input type="number" required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={amount||''} onChange={e=>setAmount(Number(e.target.value))}/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label><input type="date" required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={date} onChange={e=>setDate(e.target.value)}/></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Keterangan (Opsional)</label><textarea className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none h-20" placeholder="Tambahkan catatan atau deskripsi transaksi..." value={description} onChange={e=>setDescription(e.target.value)}></textarea></div>
          <div className="pt-4"><button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all">Simpan Transaksi</button></div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={()=>{setIsDetailModalOpen(false);setSelectedTransaction(null)}} title="Detail Transaksi Keuangan">
        {selectedTransaction && (
          <div className="space-y-6">
            <div className={cn("p-6 rounded-2xl text-center border", selectedTransaction.type==='Income'?"bg-emerald-50 border-emerald-100":"bg-rose-50 border-rose-100")}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">{selectedTransaction.type==='Income'?<TrendingUp className="text-emerald-500"/>:<TrendingDown className="text-rose-500"/>}</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCategoryLabel(selectedTransaction.category)}</p>
              <h4 className={cn("text-3xl font-black mt-1", selectedTransaction.type==='Income'?"text-emerald-600":"text-rose-600")}>{selectedTransaction.type==='Income'?'+':'-'} {fmtRp(selectedTransaction.amount)}</h4>
            </div>
            <div className="space-y-3">
              <DetailRow label="ID Transaksi" value={selectedTransaction.id}/>
              <DetailRow label="Tanggal" value={new Date(selectedTransaction.date).toLocaleDateString('id-ID',{dateStyle:'long'})}/>
              {selectedTransaction.description && <DetailRow label="Keterangan" value={selectedTransaction.description}/>}
              <DetailRow label="Referensi" value={selectedTransaction.referenceId||'-'} mono/>
              <DetailRow label="Sifat" value={selectedTransaction.isDebtPayment?'Penyelesaian Hutang/Piutang':'Operasional Langsung'}/>
            </div>
            <button onClick={()=>setIsDetailModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all">Tutup</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// === SUB COMPONENTS ===

function SummaryCard({ label, value, icon, color, sub }: { label: string, value: number, icon: React.ReactNode, color: string, sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    red: "bg-rose-50 text-rose-600 border-rose-100"
  };
  return (
    <div className={cn("p-4 rounded-2xl border flex items-center gap-4 transition-transform hover:scale-[1.02] shadow-sm", colorMap[color])}>
      <div className="p-3 bg-white/80 rounded-xl shadow-sm">{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-black opacity-60 tracking-wider leading-none mb-1">{label}</p>
        <p className="text-base font-black tracking-tight leading-none">{fmtRp(value)}</p>
        {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ReportLine({ label, value, color, isDark }: { label: string, value: number, color?: string, isDark?: boolean }) {
  return (
    <div className="flex justify-between items-center group">
      <span className={cn("uppercase text-[10px] font-bold tracking-tight", isDark ? "text-slate-400" : "text-slate-500")}>{label}</span>
      <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900", color)}>{fmtRp(value)}</span>
    </div>
  );
}

function PLRow({ label, value, bold }: { label: string, value: number, bold?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center py-1", bold && "border-t border-slate-200 pt-2")}>
      <span className={cn("text-xs text-slate-600", bold && "font-black")}>{label}</span>
      <span className={cn("text-xs text-slate-800", bold && "font-black")}>{fmtRp(value)}</span>
    </div>
  );
}

function AgingRow({ label, value, danger }: { label: string, value: number, danger?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
      <span className={cn("font-bold", danger ? "text-rose-600" : "text-slate-600")}>{label}</span>
      <span className={cn("font-bold", danger ? "text-rose-600" : "text-slate-800")}>{fmtRp(value)}</span>
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
