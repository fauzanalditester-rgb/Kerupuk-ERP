const fs = require('fs');
let content = fs.readFileSync('src/pages/Finance.tsx', 'utf8');

// 1. Add state and helpers
content = content.replace(
  `  const [referenceId, setReferenceId] = useState('');`,
  `  const [referenceId, setReferenceId] = useState('');\n\n  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; type: 'pay' | 'collect'; id: string; name: string; remainingAmount: number }>({ isOpen: false, type: 'pay', id: '', name: '', remainingAmount: 0 });\n  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');\n\n  const getRemainingPayable = (poId: string, totalAmount: number) => {\n    const paid = transactions.filter(t => t.referenceId === poId && t.type === 'Expense' && t.isDebtPayment).reduce((s, t) => s + t.amount, 0);\n    return Math.max(0, totalAmount - paid);\n  };\n\n  const getRemainingReceivable = (soId: string, totalAmount: number) => {\n    const paid = transactions.filter(t => t.referenceId === soId && t.type === 'Income' && t.isDebtPayment).reduce((s, t) => s + t.amount, 0);\n    return Math.max(0, totalAmount - paid);\n  };`
);

// 2. Update alerts to use getRemaining
content = content.replace(
  `span className="font-bold text-slate-700">{fmtRp(so.totalAmount)}</span>`,
  `span className="font-bold text-slate-700">{fmtRp(getRemainingReceivable(so.id, so.totalAmount))}</span>`
);
content = content.replace(
  `<button onClick={()=>collectPayment(so.id, so.totalAmount)} className="px-2 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold hover:bg-emerald-600">Tagih</button>`,
  `<button onClick={()=>{setPaymentModal({isOpen:true, type:'collect', id:so.id, name:so.customerName, remainingAmount:getRemainingReceivable(so.id, so.totalAmount)});setPaymentAmount(getRemainingReceivable(so.id, so.totalAmount));}} className="px-2 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-bold hover:bg-emerald-600">Tagih</button>`
);
content = content.replace(
  `span className="font-bold text-slate-700">{fmtRp(po.totalAmount)}</span>`,
  `span className="font-bold text-slate-700">{fmtRp(getRemainingPayable(po.id, po.totalAmount))}</span>`
);
content = content.replace(
  `<button onClick={()=>payDebt(po.id, po.totalAmount)} className="px-2 py-1 bg-rose-500 text-white rounded-md text-[10px] font-bold hover:bg-rose-600">Bayar</button>`,
  `<button onClick={()=>{setPaymentModal({isOpen:true, type:'pay', id:po.id, name:po.supplierName, remainingAmount:getRemainingPayable(po.id, po.totalAmount)});setPaymentAmount(getRemainingPayable(po.id, po.totalAmount));}} className="px-2 py-1 bg-rose-500 text-white rounded-md text-[10px] font-bold hover:bg-rose-600">Bayar</button>`
);

// 3. Update Near Due Items formatting
content = content.replace(
  `span className="font-bold text-slate-700">{fmtRp(item.amount)}</span>`,
  `span className="font-bold text-slate-700">{fmtRp(item.type === 'Piutang' ? getRemainingReceivable(item.id, item.amount) : getRemainingPayable(item.id, item.amount))}</span>`
);

// 4. Update Receivables Tab display and button
content = content.replace(
  `{salesOrders.filter(so=>so.paymentMethod==='Debt'&&!so.isPaid).sort((a,b)=>{`,
  `{salesOrders.filter(so=>so.paymentMethod==='Debt'&&!so.isPaid && (!searchQuery || so.customerName.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b)=>{`
);
content = content.replace(
  `<td className="px-6 py-4 text-sm font-black text-slate-900 text-right">{fmtRp(so.totalAmount)}</td>`,
  `<td className="px-6 py-4 text-sm font-black text-slate-900 text-right">{fmtRp(getRemainingReceivable(so.id, so.totalAmount))}</td>`
);
content = content.replace(
  `<td className="px-6 py-4 text-center"><button onClick={()=>collectPayment(so.id, so.totalAmount)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm shadow-emerald-100">Klik Pelunasan</button></td>`,
  `<td className="px-6 py-4 text-center"><button onClick={()=>{setPaymentModal({isOpen:true, type:'collect', id:so.id, name:so.customerName, remainingAmount:getRemainingReceivable(so.id, so.totalAmount)});setPaymentAmount(getRemainingReceivable(so.id, so.totalAmount));}} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm shadow-emerald-100">Bayar Cicilan/Lunas</button></td>`
);

// Add search to Receivables
content = content.replace(
  `<table className="w-full text-left">`,
  `<div className="p-4 border-b border-slate-100"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Cari pelanggan..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div></div><table className="w-full text-left">`
);

// 5. Update Payables Tab display and button
content = content.replace(
  `{purchaseOrders.filter(po=>po.paymentMethod==='Debt'&&!po.isPaid).sort((a,b)=>{`,
  `{purchaseOrders.filter(po=>po.paymentMethod==='Debt'&&!po.isPaid && (!searchQuery || po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))).sort((a,b)=>{`
);
content = content.replace(
  `<td className="px-6 py-4 text-sm font-black text-rose-600 text-right">{fmtRp(po.totalAmount)}</td>`,
  `<td className="px-6 py-4 text-sm font-black text-rose-600 text-right">{fmtRp(getRemainingPayable(po.id, po.totalAmount))}</td>`
);
content = content.replace(
  `<td className="px-6 py-4 text-center"><button onClick={()=>payDebt(po.id, po.totalAmount)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">Bayar Lunas</button></td>`,
  `<td className="px-6 py-4 text-center"><button onClick={()=>{setPaymentModal({isOpen:true, type:'pay', id:po.id, name:po.supplierName, remainingAmount:getRemainingPayable(po.id, po.totalAmount)});setPaymentAmount(getRemainingPayable(po.id, po.totalAmount));}} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">Bayar Cicilan/Lunas</button></td>`
);

// Add search to Payables
content = content.replace(
  `<table className="w-full text-left">`,
  `<div className="p-4 border-b border-slate-100"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Cari supplier..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div></div><table className="w-full text-left">`
);


// 6. Update agingReport calculation
content = content.replace(
  `      return { d07, d830, d30, total: d07 + d830 + d30 };
    };
    const unpaidSO = salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid);
    const unpaidPO = purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid);
    return { piutang: calc(unpaidSO), hutang: calc(unpaidPO) };`,
  `      return { d07, d830, d30, total: d07 + d830 + d30 };
    };
    const unpaidSO = salesOrders.filter(so => so.paymentMethod === 'Debt' && !so.isPaid).map(so => ({ ...so, type: 'so' as const, totalAmount: getRemainingReceivable(so.id, so.totalAmount) }));
    const unpaidPO = purchaseOrders.filter(po => po.paymentMethod === 'Debt' && !po.isPaid).map(po => ({ ...po, type: 'po' as const, totalAmount: getRemainingPayable(po.id, po.totalAmount) }));
    return { piutang: calc(unpaidSO), hutang: calc(unpaidPO) };`
);

// 7. Inject Payment Modal JSX at the end before final export
const paymentModalJsx = `
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
`;

content = content.replace(
  `{/* === REPORTS/BALANCE SHEET TAB === */}`,
  paymentModalJsx + `\n        {/* === REPORTS/BALANCE SHEET TAB === */}`
);

fs.writeFileSync('src/pages/Finance.tsx', content);
console.log('Finance.tsx updated successfully');
