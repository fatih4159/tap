import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTablesStore } from '../stores/tablesStore';
import { useMenuStore } from '../stores/menuStore';
import {
  Grid3X3,
  UtensilsCrossed,
  ClipboardList,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const { tables, fetchTables } = useTablesStore();
  const { menu, fetchMenu } = useMenuStore();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    avgOrderTime: 0,
  });

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, []);

  // Calculate table stats
  const tableStats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
  };

  // Calculate menu stats
  const menuStats = {
    categories: menu.length,
    items: menu.reduce((acc, cat) => acc + (cat.items?.length || 0), 0),
    unavailable: menu.reduce(
      (acc, cat) => acc + (cat.items?.filter((i) => !i.isAvailable).length || 0),
      0
    ),
  };

  const quickActions = [
    { label: 'New Order', icon: ClipboardList, href: '/orders', color: 'primary' },
    { label: 'View Tables', icon: Grid3X3, href: '/tables', color: 'blue' },
    { label: 'Edit Menu', icon: UtensilsCrossed, href: '/menu', color: 'green' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-100">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-surface-400 mt-1">
            Here&apos;s what&apos;s happening at {tenant?.name || 'your restaurant'} today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-surface-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-primary-400" />
            </div>
            <span className="badge-primary">{tableStats.occupied} active</span>
          </div>
          <p className="text-2xl font-bold text-surface-100">{tableStats.total}</p>
          <p className="text-sm text-surface-500">Total Tables</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="badge-success">+12%</span>
          </div>
          <p className="text-2xl font-bold text-surface-100">€{stats.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-surface-500">Today&apos;s Revenue</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{stats.activeOrders}</p>
          <p className="text-sm text-surface-500">Active Orders</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
            </div>
            <span className="badge-warning">{menuStats.unavailable} sold out</span>
          </div>
          <p className="text-2xl font-bold text-surface-100">{menuStats.items}</p>
          <p className="text-sm text-surface-500">Menu Items</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={clsx(
                'card-interactive flex items-center justify-between p-5',
                'group hover:border-primary-500/50'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    action.color === 'primary' && 'bg-primary-500/20 text-primary-400',
                    action.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                    action.color === 'green' && 'bg-green-500/20 text-green-400'
                  )}
                >
                  <action.icon className="w-6 h-6" />
                </div>
                <span className="font-medium text-surface-100">{action.label}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-surface-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Table overview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-surface-100 mb-4">Table Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-surface-300">Available</span>
              </div>
              <span className="font-medium text-surface-100">{tableStats.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-surface-300">Occupied</span>
              </div>
              <span className="font-medium text-surface-100">{tableStats.occupied}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-surface-300">Reserved</span>
              </div>
              <span className="font-medium text-surface-100">{tableStats.reserved}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-surface-100 mb-4">Menu Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-surface-300">Categories</span>
              <span className="font-medium text-surface-100">{menuStats.categories}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-300">Total Items</span>
              <span className="font-medium text-surface-100">{menuStats.items}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-300">Currently Unavailable</span>
              <span className="font-medium text-amber-400">{menuStats.unavailable}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
