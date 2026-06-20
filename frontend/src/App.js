import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import { LanguageProvider } from "./lib/language";
import { api } from "./lib/api";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import MaintenancePage from "./pages/MaintenancePage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCatalog from "./pages/admin/AdminCatalog";
import AdminManualOrder from "./pages/admin/AdminManualOrder";
import AdminCompanies from "./pages/admin/AdminCompanies";
import PrintReceipt from "./pages/PrintReceipt";
import Boundary from "./components/ErrorBoundary";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#5C5855]">Yükleniyor…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check maintenance status
    api.get("/system/maintenance")
      .then((r) => {
        setMaintenance(r.data.maintenance_mode);
      })
      .catch(() => setMaintenance(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking || authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-[#5C5855] bg-[#F9F6F0]">Yükleniyor…</div>;
  }

  const isMaintenanceActive = maintenance && user?.role !== "admin";

  return (
    <BrowserRouter>
      <Routes>
        {isMaintenanceActive ? (
          <>
            <Route path="/maintenance" element={<MaintenancePage />} />
            {/* Allow admin login bypassing even under maintenance */}
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/maintenance" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/menu" element={<ProtectedRoute roles={["company", "admin"]}><MenuPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute roles={["company", "admin"]}><OrdersPage /></ProtectedRoute>} />
            <Route path="/print/:orderId" element={<ProtectedRoute roles={["admin", "company"]}><PrintReceipt /></ProtectedRoute>} />
            <Route path="/maintenance" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="catalog" element={<AdminCatalog />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="manual-order" element={<AdminManualOrder />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="companies" element={<AdminCompanies />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <Toaster position="top-right" richColors offset="64px" />
    </BrowserRouter>
  );
}

function App() {
  return (
    <Boundary>
      <AuthProvider>
        <LanguageProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </Boundary>
  );
}

export default App;
