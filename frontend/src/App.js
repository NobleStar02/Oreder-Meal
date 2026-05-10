import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { CartProvider } from "./lib/cart";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCatalog from "./pages/admin/AdminCatalog";
import PrintReceipt from "./pages/PrintReceipt";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#5C5855]">Yükleniyor…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/menu" element={<ProtectedRoute roles={["company", "admin"]}><MenuPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute roles={["company", "admin"]}><OrdersPage /></ProtectedRoute>} />
            <Route path="/print/:orderId" element={<ProtectedRoute roles={["admin", "company"]}><PrintReceipt /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="catalog" element={<AdminCatalog />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors offset="64px" />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
