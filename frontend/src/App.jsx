import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSuperAdminStore } from './stores/superAdminStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import GuestLayout from './components/layout/GuestLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Dashboard Pages
import DashboardPage from './pages/DashboardPage';
import TablesPage from './pages/TablesPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import KitchenPage from './pages/KitchenPage';
import SettingsPage from './pages/SettingsPage';

// Guest Pages
import GuestOrderPage from './pages/GuestOrderPage';

// Super Admin Pages
import SuperAdminLoginPage from './pages/superadmin/SuperAdminLoginPage';
import SuperAdminDashboardPage from './pages/superadmin/SuperAdminDashboardPage';
import SuperAdminTenantsPage from './pages/superadmin/SuperAdminTenantsPage';
import SuperAdminUsersPage from './pages/superadmin/SuperAdminUsersPage';
import SuperAdminAdminsPage from './pages/superadmin/SuperAdminAdminsPage';
import SuperAdminAuditPage from './pages/superadmin/SuperAdminAuditPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Super Admin Protected Route
const SuperAdminRoute = ({ children }) => {
  const { isAuthenticated, refreshSession } = useSuperAdminStore();

  useEffect(() => {
    if (!isAuthenticated) {
      refreshSession();
    }
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return children;
};

function App() {
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    // Try to restore session on app load
    refreshUser();
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Guest Ordering (via QR code) */}
      <Route path="/order/:token" element={
        <GuestLayout>
          <GuestOrderPage />
        </GuestLayout>
      } />

      {/* Super Admin Routes */}
      <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
      <Route path="/superadmin" element={
        <SuperAdminRoute>
          <SuperAdminLayout />
        </SuperAdminRoute>
      }>
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="tenants" element={<SuperAdminTenantsPage />} />
        <Route path="users" element={<SuperAdminUsersPage />} />
        <Route path="admins" element={<SuperAdminAdminsPage />} />
        <Route path="audit" element={<SuperAdminAuditPage />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="kitchen" element={
          <ProtectedRoute roles={['admin', 'manager', 'kitchen']}>
            <KitchenPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute roles={['admin', 'manager']}>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
