import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { ERPProvider } from './context/ERPContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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

  // Prevent flashing landing page (Home) while verifying auth session on refresh
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
