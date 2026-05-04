import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Purchasing from './pages/Purchasing';
import Production from './pages/Production';
import ProductionRecipes from './pages/ProductionRecipes';
import Sales from './pages/Sales';
import CRM from './pages/CRM';
import Finance from './pages/Finance';
import HR from './pages/HR';
import Settings from './pages/Settings';
import Home from './pages/Home';
import Login from './pages/Login';
import { ERPProvider, useERP } from './context/ERPContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: erpLoading } = useERP();
  const location = useLocation();

  if (authLoading || erpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Menghubungkan ke Cloud...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RootElement() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: erpLoading } = useERP();

  if (authLoading || erpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0a00]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d4a843]/20 border-t-[#d4a843] rounded-full animate-spin" />
          <p className="text-[#d4a843] font-bold text-xs uppercase tracking-widest animate-pulse">Memuat Keajaiban...</p>
        </div>
      </div>
    );
  }

  return user ? <Layout /> : <Home />;
}

function App() {
  return (
    <AuthProvider>
      <ERPProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/wp-admin" element={<Login />} />


            <Route
              path="/"
              element={<RootElement />}
            >
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="purchasing" element={<Purchasing />} />
              <Route path="production" element={<Production />} />
              <Route path="recipes" element={<ProductionRecipes />} />
              <Route path="sales" element={<Sales />} />
              <Route path="crm" element={<CRM />} />
              <Route path="finance" element={<Finance />} />
              <Route path="hr" element={<HR />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ERPProvider>
    </AuthProvider>
  );
}

export default App;
