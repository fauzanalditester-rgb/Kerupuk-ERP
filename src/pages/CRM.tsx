import React, { useState, useMemo } from 'react';
import { Users, Plus, Filter, Search, Phone, Mail, MapPin, X, Eye, Pencil, ShoppingBag, TrendingUp, UserCheck, Trash2 } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Customer } from '../lib/types';

export default function CRM() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, salesOrders, inventory } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // New Customer State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Edit Customer State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Compute real stats from salesOrders
  const customerStats = useMemo(() => {
    const stats: Record<string, { orders: number; spent: number; lastDate: string }> = {};
    salesOrders.forEach(so => {
      const key = so.customerName;
      if (!stats[key]) {
        stats[key] = { orders: 0, spent: 0, lastDate: '' };
      }
      stats[key].orders += 1;
      stats[key].spent += so.totalAmount;
      if (!stats[key].lastDate || so.date > stats[key].lastDate) {
        stats[key].lastDate = so.date;
      }
    });
    return stats;
  }, [salesOrders]);

  // Apply search and filter
  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.address.toLowerCase().includes(query)
      );
    }

    if (filterType === 'active') {
      list = list.filter(c => {
        const stat = customerStats[c.name];
        return stat && stat.orders > 0;
      });
    } else if (filterType === 'inactive') {
      list = list.filter(c => {
        const stat = customerStats[c.name];
        return !stat || stat.orders === 0;
      });
    }

    return list;
  }, [customers, searchQuery, filterType, customerStats]);

  // Stats
  const totalCustomers = customers.length;
  const totalOrders = salesOrders.length;
  const totalRevenue = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
  const activeCustomers = customers.filter(c => customerStats[c.name]?.orders > 0).length;

  const getCustomerOrders = (customerName: string) => {
    return salesOrders.filter(so => so.customerName === customerName);
  };

  const getProductName = (id: string) => inventory.find(i => i.id === id)?.name || id;
  const getProductUnit = (id: string) => inventory.find(i => i.id === id)?.unit || 'pcs';

  const handlePrintInvoice = (so: any) => {
    setSelectedSO(so);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && phone && address) {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        name,
        email,
        phone,
        address,
        totalOrders: 0,
        totalSpent: 0
      };
      addCustomer(newCustomer);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditName(customer.name);
    setEditEmail(customer.email);
    setEditPhone(customer.phone);
    setEditAddress(customer.address);
    setIsEditModalOpen(true);
  };

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-slate-500 mt-1">Kelola data pelanggan (Otomatis ditambahkan dari transaksi Penjualan).</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus size={18} />
          Tambah Pelanggan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Pelanggan</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Pelanggan Aktif</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeCustomers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Pesanan</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Pendapatan</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">Rp {(totalRevenue / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari pelanggan..."
            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${filterType !== 'all'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Filter size={18} />
            Filter
            {filterType !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Status</p>
              {[
                { value: 'all', label: 'Semua Pelanggan' },
                { value: 'active', label: '🟢 Pelanggan Aktif' },
                { value: 'inactive', label: '⚪ Belum Bertransaksi' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterType(opt.value); setIsFilterOpen(false); }}
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

      {/* Customer Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Users size={48} className="mx-auto mb-3 text-slate-200" />
          <p className="font-medium text-slate-500">
            {searchQuery || filterType !== 'all'
              ? 'Tidak ditemukan pelanggan yang cocok.'
              : 'Belum ada pelanggan terdaftar.'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {searchQuery ? 'Coba kata kunci lain.' : 'Klik "Tambah Pelanggan" untuk menambahkan.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">Menampilkan {filteredCustomers.length} dari {customers.length} pelanggan</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => {
              const stats = customerStats[customer.name];
              const orderCount = stats?.orders || 0;
              const totalSpent = stats?.spent || 0;
              return (
                <div key={customer.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{customer.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{customer.id}</p>
                      </div>
                    </div>
                    {orderCount > 0 && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-medium">
                        Aktif
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{customer.address}</span>
                    </div>
                  </div>

                  {/* Order Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-lg font-bold text-slate-900">{orderCount}</p>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">Pesanan</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-lg font-bold text-emerald-600">Rp {(totalSpent / 1000).toFixed(0)}K</p>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">Belanja</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openDetailModal(customer)}
                      className="flex-1 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      Lihat Profil
                    </button>
                    <button
                      onClick={() => openEditModal(customer)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus pelanggan ${customer.name}?`)) {
                          deleteCustomer(customer.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedCustomer(null); }}
        title={`Profil Pelanggan`}
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-slate-400 font-mono">{selectedCustomer.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Telepon</p>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <p className="font-medium text-slate-900">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <p className="font-medium text-slate-900 text-sm truncate">{selectedCustomer.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Alamat</p>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-slate-400 mt-0.5" />
                <p className="font-medium text-slate-900">{selectedCustomer.address}</p>
              </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                <p className="text-2xl font-bold text-emerald-700">{customerStats[selectedCustomer.name]?.orders || 0}</p>
                <p className="text-xs text-emerald-600 font-medium">Total Pesanan</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-2xl font-bold text-blue-700">Rp {((customerStats[selectedCustomer.name]?.spent || 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-blue-600 font-medium">Total Belanja</p>
              </div>
            </div>

            {/* Order History */}
            {(() => {
              const orders = getCustomerOrders(selectedCustomer.name);
              if (orders.length > 0) {
                return (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Riwayat Pesanan</p>
                    <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-500">
                          <tr>
                            <th className="px-4 py-2 text-left">No. SO</th>
                            <th className="px-4 py-2 text-left">Tanggal</th>
                            <th className="px-4 py-2 text-left">Total</th>
                            <th className="px-4 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(so => (
                            <tr key={so.id} className="border-t border-slate-100 group">
                              <td className="px-4 py-2.5 font-mono text-slate-700">{so.id}</td>
                              <td className="px-4 py-2.5 text-slate-600">{so.date}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-900">Rp {so.totalAmount.toLocaleString()}</td>
                              <td className="px-4 py-2.5 flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${so.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  so.status === 'Processing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                  {so.status === 'Completed' ? 'Selesai' : so.status === 'Processing' ? 'Proses' : 'Kirim'}
                                </span>
                                <button
                                  onClick={() => handlePrintInvoice(so)}
                                  className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                  title="Cetak Invoice"
                                >
                                  <ShoppingBag size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              return (
                <div className="text-center py-4 bg-slate-50 rounded-lg text-slate-400 text-sm">
                  Belum ada riwayat pesanan untuk pelanggan ini.
                </div>
              );
            })()}

            <div className="pt-2">
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedCustomer(null); }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedCustomer(null); }}
        title="Edit Pelanggan"
      >
        {selectedCustomer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedCustomer) {
                updateCustomer(selectedCustomer.id, {
                  name: editName,
                  email: editEmail,
                  phone: editPhone,
                  address: editAddress
                });
              }
              setIsEditModalOpen(false);
              setSelectedCustomer(null);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
              <input
                type="tel"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
              <textarea
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={editAddress}
                onChange={e => setEditAddress(e.target.value)}
                rows={3}
              />
            </div>
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setSelectedCustomer(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Pelanggan Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggan</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="misal: Warung Makan Padang"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="misal: email@contoh.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
            <input
              type="tel"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="misal: 08123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
            <textarea
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="misal: Jl. Merdeka No. 10"
              rows={3}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200"
            >
              Tambah Pelanggan
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE INVOICE AREA (Hidden normally, visible in print) */}
      <div id="invoice-print" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-sans text-slate-900">
        {selectedSO && (() => {
          const customerInfo = customers.find(c => c.name === selectedSO.customerName);
          return (
            <div className="w-full border-2 border-slate-200 p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-3 no-break">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600 text-white p-2 rounded-lg">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">INVOICE</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] mt-1">Sistem ERP Kedai Kurupuk & Pempek</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-slate-900 uppercase">Nota No: {selectedSO.id}</p>
                  <p className="text-slate-500 font-medium tracking-wide">Tanggal: {selectedSO.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 no-break py-2">
                <div className="space-y-1 border-r border-slate-100 pr-4">
                  <p className="font-bold text-emerald-600 uppercase text-[9px] mb-1">Status Toko</p>
                  <p className="font-black text-sm text-slate-900 leading-tight">Kedai Kurupuk & Pempek</p>
                  <p className="text-slate-600 leading-tight">Jl. Contoh No. 123, Kawasan Lagoi Bay</p>
                  <p className="text-slate-600 font-medium">WhatsApp: 0812-3456-7890</p>
                </div>
                <div className="space-y-1 border-r border-slate-100 pr-4">
                  <p className="font-bold text-emerald-600 uppercase text-[9px] mb-1">Data Pelanggan (CRM Terhubung)</p>
                  <p className="font-black text-sm text-slate-900 leading-tight">{selectedSO.customerName}</p>
                  <p className="text-slate-600 leading-tight italic">
                    {customerInfo?.address || 'Alamat tidak ditemukan di CRM'}
                  </p>
                  <p className="text-slate-600 font-medium text-[10px]">
                    Telp: {customerInfo?.phone || 'No. Telp tidak tersedia'}
                  </p>
                </div>
                <div className="space-y-1 flex flex-col justify-center items-end">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right w-full">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Metode Pembayaran</p>
                    <p className="text-lg font-black text-emerald-600 uppercase italic">
                      {selectedSO.paymentMethod === 'Cash' ? '✓ Lunas (Tunai)' : '⚠ Piutang (Utang)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-emerald-600 text-white border-y border-emerald-700">
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Deskripsi Produk</th>
                      <th className="px-3 py-2 font-bold text-center w-24 uppercase tracking-wider">Jumlah</th>
                      <th className="px-3 py-2 font-bold text-right w-32 uppercase tracking-wider">Harga</th>
                      <th className="px-3 py-2 font-bold text-right w-32 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSO.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-bold text-slate-800">{getProductName(item.productId)}</td>
                        <td className="px-3 py-2 text-center text-slate-600 bg-slate-50/50">
                          {item.quantity} {getProductUnit(item.productId)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 italic">Rp {item.price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 bg-emerald-50/30">
                          Rp {(item.quantity * item.price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 no-break">
                <div className="grid grid-cols-2 text-center text-[10px] items-end pb-2">
                  <div className="space-y-14">
                    <p className="font-bold border-b border-slate-200 pb-1 uppercase italic">Hormat Kami,</p>
                    <p className="font-black text-slate-900">( Admin Toko )</p>
                  </div>
                  <div className="space-y-14">
                    <p className="font-bold border-b border-slate-200 pb-1 uppercase italic">Penerima,</p>
                    <p className="font-black text-slate-900 uppercase italic">( {selectedSO.customerName} )</p>
                  </div>
                </div>
                <div className="flex justify-end pr-2">
                  <div className="w-72 space-y-1 border-t-2 border-slate-100 pt-2">
                    <div className="flex justify-between items-center text-slate-500 px-2 text-[10px]">
                      <span>Tagihan Barang:</span>
                      <span className="font-bold">Rp {selectedSO.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
                    </div>
                    {selectedSO.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 px-2 bg-emerald-50 py-1 rounded text-[10px]">
                        <span className="font-black italic text-[9px]">Diskon Khusus ({selectedSO.discount}%):</span>
                        <span className="font-black">- Rp {((selectedSO.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) * selectedSO.discount) / 100).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg shadow-inner mt-2">
                      <span className="text-xs font-black tracking-widest uppercase">Total Dibayar:</span>
                      <span className="text-xl font-black text-emerald-400">Rp {selectedSO.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center pt-2 border-t border-dashed border-slate-200 no-break">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">
                  *** Invoice ini sah dan terhubung dengan database CRM ERP System ***
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: 100%;
            padding: 0;
            background: white;
          }
          .no-break { break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
