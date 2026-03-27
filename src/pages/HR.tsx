import React, { useState, useMemo } from 'react';
import { UserCog, Plus, Search, Filter, X, Eye, Phone, Mail, MapPin, Building2, Wallet } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import Modal from '../components/Modal';
import { Employee } from '../lib/types';

export default function HR() {
  const { employees, addEmployee } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // New Employee State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState(0);
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Terminated'>('Active');

  const filteredEmployees = useMemo(() => {
    let list = [...employees];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query)
      );
    }

    if (filterDepartment !== 'all') {
      list = list.filter(e => e.department === filterDepartment);
    }

    return list;
  }, [employees, searchQuery, filterDepartment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && role && department && salary > 0) {
      const newEmployee: Employee = {
        id: `EMP-${Date.now()}`,
        name,
        role,
        department,
        status,
        joinDate: new Date().toISOString().split('T')[0],
        salary
      };
      addEmployee(newEmployee);
      setIsModalOpen(false);

      // Reset form
      setName('');
      setRole('');
      setDepartment('');
      setSalary(0);
      setStatus('Active');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Active': return 'Aktif';
      case 'On Leave': return 'Cuti';
      case 'Terminated': return 'Diberhentikan';
      default: return status;
    }
  };

  const getDepartmentLabel = (dept: string) => {
    switch (dept) {
      case 'Production': return 'Produksi';
      case 'Sales': return 'Penjualan';
      case 'Inventory': return 'Inventaris';
      case 'Finance': return 'Keuangan';
      case 'HR': return 'HR';
      default: return dept;
    }
  };

  // Stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const totalSalaryExpense = employees.filter(e => e.status === 'Active').reduce((sum, e) => sum + e.salary, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SDM & Penggajian</h1>
          <p className="text-slate-500 mt-1">Kelola data karyawan dan estimasi beban gaji.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus size={18} />
          Tambah Karyawan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <UserCog size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Karyawan</p>
            <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCog size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Karyawan Aktif</p>
            <p className="text-2xl font-bold text-slate-900">{activeEmployees}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Estimasi Beban Gaji/Bulan</p>
            <p className="text-2xl font-bold text-slate-900">Rp {(totalSalaryExpense / 1000000).toFixed(1)}M</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau jabatan..."
              className="pl-10 pr-9 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors text-sm ${filterDepartment !== 'all'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Filter size={18} />
              Filter Divisi
              {filterDepartment !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Pilih Divisi</p>
                {[
                  { value: 'all', label: 'Semua Divisi' },
                  { value: 'Production', label: 'Produksi' },
                  { value: 'Sales', label: 'Penjualan' },
                  { value: 'Inventory', label: 'Inventaris' },
                  { value: 'Finance', label: 'Keuangan' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterDepartment(opt.value); setIsFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterDepartment === opt.value
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
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Departemen</th>
                <th className="px-6 py-4">Gaji (Pokok)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <UserCog size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">
                      {searchQuery || filterDepartment !== 'all' ? 'Tidak ditemukan karyawan yang cocok.' : 'Belum ada data karyawan.'}
                    </p>
                    <p className="text-sm mt-1">Klik "Tambah Karyawan" untuk mendata pegawai baru.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{employee.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{employee.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{employee.role}</td>
                    <td className="px-6 py-4 text-slate-500">{getDepartmentLabel(employee.department)}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium">Rp {employee.salary.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          employee.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'Active' ? 'bg-emerald-500' :
                            employee.status === 'On Leave' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                        {getStatusLabel(employee.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setSelectedEmployee(employee); setIsDetailModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all mx-auto"
                        title="Lihat Profil Lengkap"
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
      </div>

      {/* Click outside filter to close */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedEmployee(null); }}
        title="Profil Karyawan"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-2xl border border-slate-200">
                {selectedEmployee.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h3>
                <p className="text-sm text-emerald-600 font-medium">{selectedEmployee.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Departemen</p>
                </div>
                <p className="font-medium text-slate-900 ml-6">{getDepartmentLabel(selectedEmployee.department)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <UserCog size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status Pekerjaan</p>
                </div>
                <p className="font-medium text-slate-900 ml-6">{getStatusLabel(selectedEmployee.status)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Gaji Pokok</p>
                </div>
                <p className="font-bold text-emerald-600 ml-6">Rp {selectedEmployee.salary.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-400 text-lg leading-none ml-1 -mt-1">📅</span>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tgl. Bergabung</p>
                </div>
                <p className="font-medium text-slate-900 ml-6">{selectedEmployee.joinDate}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedEmployee(null); }}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Tambah Karyawan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Karyawan Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="misal: Budi Santoso"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Departemen</label>
              <select
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                <option value="">Pilih Departemen</option>
                <option value="Production">Produksi</option>
                <option value="Sales">Penjualan</option>
                <option value="Inventory">Inventaris</option>
                <option value="Finance">Keuangan</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="misal: Manajer Produksi"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Gaji Pokok (Rp)</label>
            <input
              type="number"
              required
              min="0"
              step="500000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={salary || ''}
              onChange={e => setSalary(Number(e.target.value))}
              placeholder="3000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status Karyawan</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
            >
              <option value="Active">🟢 Aktif</option>
              <option value="On Leave">🟡 Sedang Cuti</option>
              <option value="Terminated">🔴 Diberhentikan</option>
            </select>
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200 transition-colors"
            >
              Simpan Data Karyawan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
