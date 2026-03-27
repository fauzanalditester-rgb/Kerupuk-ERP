import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Factory,
  TrendingUp,
  Users,
  Wallet,
  UserCog,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  CookingPot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Pembelian', icon: ShoppingCart, path: '/purchasing' },
  { name: 'Stok', icon: Package, path: '/inventory' },
  { name: 'Produksi', icon: Factory, path: '/production' },
  { name: 'Master Resep', icon: CookingPot, path: '/recipes' },
  { name: 'Penjualan', icon: TrendingUp, path: '/sales' },
  { name: 'CRM', icon: Users, path: '/crm' },
  { name: 'Keuangan', icon: Wallet, path: '/finance' },
  { name: 'SDM & Penggajian', icon: UserCog, path: '/hr' },
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close sidebar on mobile when route changes
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800",
          !isSidebarOpen && "lg:w-20 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50">
          <div className={cn("flex items-center gap-3 font-bold text-xl overflow-hidden whitespace-nowrap transition-all", !isSidebarOpen && "lg:hidden")}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <span className="text-white text-xl font-black">K</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white tracking-tight">Kerupuk<span className="text-emerald-500">ERP</span></span>
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium">Business System</span>
            </div>
          </div>
          {/* Logo for collapsed state */}
          {!isSidebarOpen && (
            <div className="hidden lg:flex w-full items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <span className="text-white text-xl font-black">K</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-hide select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group active:scale-[0.98]",
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold"
                  : "text-slate-500 hover:bg-slate-800/80 hover:text-white font-medium"
              )}
            >
              <item.icon size={22} className={cn("shrink-0 transition-transform group-hover:scale-110")} />
              <span className={cn("text-sm whitespace-nowrap transition-opacity duration-200 tracking-tight", !isSidebarOpen && "lg:hidden")}>
                {item.name}
              </span>

              {/* Active Indicator bar */}
              <div className={cn(
                "absolute left-0 w-1 h-6 bg-white rounded-r-full transition-all duration-300 scale-y-0 opacity-0",
                location.pathname === item.path && "scale-y-100 opacity-100"
              )} />

              {/* Tooltip for collapsed state */}
              {!isSidebarOpen && (
                <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-600 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-inner">
              {user?.name.charAt(0)}
            </div>
            <div className={cn("overflow-hidden transition-all", !isSidebarOpen && "lg:hidden")}>
              <p className="text-sm font-bold text-white truncate leading-tight uppercase tracking-tight">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-wider">Online</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 group active:scale-[0.98]",
              !isSidebarOpen && "lg:justify-center lg:px-0"
            )}
            title="Keluar"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.1em] transition-all", !isSidebarOpen && "lg:hidden")}>Keluar Sistem</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
              {sidebarItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari..."
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-emerald-500 w-64 transition-all"
              />
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
