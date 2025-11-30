import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { onTableStatus, onNewOrder, onOrderReady, onWaiterCalled } from '../../services/socket';
import { useTablesStore } from '../../stores/tablesStore';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ClipboardList,
  ChefHat,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tables', icon: Grid3X3, label: 'Tables' },
  { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/orders', icon: ClipboardList, label: 'Orders' },
  { path: '/kitchen', icon: ChefHat, label: 'Kitchen', roles: ['admin', 'manager', 'kitchen'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager'] },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, tenant, logout, hasRole } = useAuthStore();
  const { handleTableStatusUpdate } = useTablesStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter nav items by role
  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.some((role) => hasRole(role))
  );

  // Subscribe to real-time events
  useEffect(() => {
    const unsubTable = onTableStatus(handleTableStatusUpdate);
    
    const unsubNewOrder = onNewOrder((data) => {
      addNotification({
        type: 'order',
        title: 'New Order',
        message: `Order #${data.order?.orderNumber} received`,
      });
    });

    const unsubOrderReady = onOrderReady((data) => {
      addNotification({
        type: 'ready',
        title: 'Order Ready',
        message: `Order ready for table ${data.tableId}`,
      });
    });

    const unsubWaiterCalled = onWaiterCalled((data) => {
      addNotification({
        type: 'waiter',
        title: 'Waiter Called',
        message: `Table ${data.tableNumber} needs assistance`,
      });
    });

    return () => {
      unsubTable();
      unsubNewOrder();
      unsubOrderReady();
      unsubWaiterCalled();
    };
  }, []);

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { ...notification, id }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-surface-800',
          'transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-surface-100">tap</h1>
              <p className="text-xs text-surface-500">{tenant?.name || 'Restaurant'}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-surface-400 hover:text-surface-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
              <User className="w-5 h-5 text-surface-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-100 truncate">
                {user?.fullName || user?.email}
              </p>
              <p className="text-xs text-surface-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full btn-ghost text-surface-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-surface-400 hover:text-surface-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-display font-semibold text-lg text-surface-100">
              {visibleNavItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications indicator */}
            <button className="relative p-2 text-surface-400 hover:text-surface-100">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Notification toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={clsx(
              'animate-slide-in p-4 rounded-xl shadow-lg max-w-sm',
              notification.type === 'order' && 'bg-primary-600',
              notification.type === 'ready' && 'bg-green-600',
              notification.type === 'waiter' && 'bg-amber-600',
              !['order', 'ready', 'waiter'].includes(notification.type) && 'bg-surface-800'
            )}
          >
            <p className="font-medium text-white">{notification.title}</p>
            <p className="text-sm text-white/80">{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
