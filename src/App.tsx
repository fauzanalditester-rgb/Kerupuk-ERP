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
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import { ERPProvider } from './context/ERPContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <ERPProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ERPProvider>
    </AuthProvider>
  );
}

export default App;
