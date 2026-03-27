import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Factory,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const {
    totalRevenue,
    netProfit,
    lowStockItems,
    salesOrders,
    workOrders,
    transactions
  } = useERP();

  // 1. Calculate Active Orders & Productions
  const activeSales = salesOrders.filter(so => so.status !== 'Completed').length;
  const activeProductions = workOrders.filter(wo => wo.status !== 'Completed').length;

  // 2. Generate Real Chart Data dynamically from Transactions
  const chartData = useMemo(() => {
    // Group transactions by date
    const groupedData = transactions.reduce((acc, curr) => {
      // simplify date string to just MM-DD for cleaner X-Axis (e.g. "2024-03-01" -> "03-01")
      const dateKey = curr.date.substring(5, 10);

      if (!acc[dateKey]) {
        acc[dateKey] = { name: dateKey, sales: 0, production: 0, sortDate: curr.date };
      }

      if (curr.type === 'Income') {
        acc[dateKey].sales += curr.amount; // Income translates to Sales/Pemasukan
      } else {
        acc[dateKey].production += curr.amount; // Expense translates to Produksi/Pengeluaran
      }
      return acc;
    }, {} as Record<string, { name: string, sales: number, production: number, sortDate: string }>);

    // Convert object to array, sort chronologically, and take the last 7 active days
    const sortedArray = Object.values(groupedData).sort((a: any, b: any) => a.sortDate.localeCompare(b.sortDate));
    return sortedArray.slice(-7);
  }, [transactions]);

  const kpiData = [
    {
      title: 'Total Pendapatan',
      value: `Rp ${(totalRevenue / 1000000).toFixed(1)}M`,
      change: 'Dari seluruh penjualan',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-emerald-500'
    },
    {
      title: 'Total Laba Bersih',
      value: `Rp ${(netProfit / 1000000).toFixed(1)}M`,
      change: netProfit >= 0 ? 'Profit' : 'Rugi',
      trend: netProfit >= 0 ? 'up' : 'down',
      icon: Wallet,
      color: netProfit >= 0 ? 'bg-blue-500' : 'bg-red-500'
    },
    {
      title: 'Menunggu Pengiriman',
      value: activeSales.toString(),
      change: 'Pesanan Aktif',
      trend: 'up',
      icon: ShoppingCart,
      color: 'bg-indigo-500'
    },
    {
      title: 'Produksi Berjalan',
      value: activeProductions.toString(),
      change: 'Work Orders',
      trend: 'up',
      icon: Factory,
      color: 'bg-orange-500'
    },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return 'Selesai';
      case 'Shipped': return 'Dikirim';
      case 'Pending': return 'Tertunda';
      case 'Processing': return 'Diproses';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-slate-800"
        >
          Selamat Datang Kembali, {user?.name}! 👋
        </motion.h2>
        <p className="text-slate-500 mt-1">Berikut adalah ringkasan live performa bisnis Kerupuk & Pempek Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-4 -mt-4 opacity-10 ${kpi.color}`} />
            <div className="flex items-center justify-between mb-4 relative">
              <div className={`p-3 rounded-xl ${kpi.color.replace('bg-', 'bg-').replace('500', '100')} text-${kpi.color.split('-')[1]}-600`}>
                <kpi.icon size={24} className={`text-${kpi.color.replace('bg-', 'text-')}`} />
              </div>
              <span className={`flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {kpi.change}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium relative">{kpi.title}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1 relative">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"
        >
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Arus Kas: Pemasukan vs Modal</h3>
              <p className="text-xs text-slate-500 mt-1">Grafik batang aktivitas keuangan harian</p>
            </div>
          </div>
          <div className="h-80 relative">
            {chartData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <BarChart size={48} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">Belum ada data transaksi keuangan tercatat.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(value) => `Rp${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value: number) => [`Rp ${value.toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} name="Pemasukan (Sales)" maxBarSize={40} />
                  <Bar dataKey="production" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pengeluaran (Modal)" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"
        >
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Tren Pertumbuhan Pendapatan</h3>
              <p className="text-xs text-slate-500 mt-1">Garis performa penjualan per hari</p>
            </div>
          </div>
          <div className="h-80 relative">
            {chartData.filter(d => d.sales > 0).length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <TrendingUp size={48} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">Belum ada pendapatan terekam untuk dianalisis.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(value) => `Rp${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`Rp ${value.toLocaleString()}`, 'Penjualan']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} name="Total Pendapatan" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Pesanan Pelanggan Terbaru</h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Update Real-time</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Pesanan</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Total Tagihan</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      <Package size={32} className="mx-auto mb-2 opacity-20" />
                      Tidak ada pesanan terbaru.
                    </td>
                  </tr>
                ) : (
                  salesOrders.slice(-5).reverse().map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{order.id}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{order.customerName}</td>
                      <td className="px-4 py-3 text-slate-500">{order.date}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold">Rp {order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            order.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'Completed' ? 'bg-emerald-500' :
                            order.status === 'Shipped' ? 'bg-blue-500' :
                              order.status === 'Processing' ? 'bg-amber-500' : 'bg-slate-500'
                            }`} />
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className={lowStockItems.length > 0 ? "text-orange-500" : "text-emerald-500"} size={20} />
            Peringatan Stok Menipis
          </h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-500 bg-emerald-50 rounded-lg border border-dashed border-emerald-200">
                <span className="text-3xl mb-2">✨</span>
                <p className="font-medium text-emerald-800">Semua level stok aman!</p>
                <p className="text-xs text-emerald-600 mt-1">Tidak ada bahan baku yang di bawah batas minimum.</p>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-1 p-3 rounded-lg bg-orange-50 border border-orange-100 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                  <div className="pl-2">
                    <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-orange-700 font-medium tracking-wide">
                        SISA: <span className="text-base font-black">{item.stock}</span> {item.unit}
                      </p>
                      <p className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-500 font-mono border border-orange-100 shadow-sm">
                        Min: {item.minStock} {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
