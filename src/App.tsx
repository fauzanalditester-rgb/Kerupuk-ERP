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

  if (!user && !authLoading && !erpLoading) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RootElement() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: erpLoading } = useERP();

  // Loading states removed as per user request

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
