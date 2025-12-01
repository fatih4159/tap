import { useEffect, useState } from 'react';
import { useSuperAdminStore } from '../../stores/superAdminStore';
import { superAdminApi } from '../../services/api';
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Activity,
  Clock,
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subValue, trend, color }) => (
  <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-xl bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {subValue && (
        <p className="text-xs text-slate-500 mt-2">{subValue}</p>
      )}
    </div>
  </div>
);

const RecentActivity = ({ logs }) => (
  <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
    <div className="flex items-center gap-2 mb-6">
      <Activity className="w-5 h-5 text-emerald-400" />
      <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
    </div>
    <div className="space-y-4">
      {logs.length === 0 ? (
        <p className="text-slate-500 text-sm">No recent activity</p>
      ) : (
        logs.map((log, index) => (
          <div key={index} className="flex items-start gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300">
                <span className="font-medium text-emerald-400">{log.super_admin_email}</span>
                {' '}
                <span className="text-slate-400">{formatAction(log.action)}</span>
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{formatTime(log.created_at)}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const formatAction = (action) => {
  const actions = {
    'login': 'logged in',
    'list_tenants': 'viewed tenants list',
    'view_tenant': 'viewed a tenant',
    'update_tenant': 'updated a tenant',
    'deactivate_tenant': 'deactivated a tenant',
    'list_users': 'viewed users list',
    'view_user': 'viewed a user',
    'create_user': 'created a user',
    'update_user': 'updated a user',
    'deactivate_user': 'deactivated a user',
    'create_super_admin': 'created a super admin',
    'update_super_admin': 'updated a super admin',
    'setup': 'completed initial setup',
  };
  return actions[action] || action.replace(/_/g, ' ');
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
};

export default function SuperAdminDashboardPage() {
  const { stats, fetchStats, superAdmin } = useSuperAdminStore();
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchStats();
      try {
        const logsRes = await superAdminApi.getAuditLog({ limit: 10 });
        setRecentLogs(logsRes.logs || []);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">
          Welcome back, {superAdmin?.firstName || 'Admin'}. Here's your platform overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Total Tenants"
          value={stats?.tenants?.total || 0}
          subValue={`${stats?.tenants?.active || 0} active • ${stats?.tenants?.newThisMonth || 0} new this month`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.users?.total || 0}
          subValue={`${stats?.users?.active || 0} active across all tenants`}
          color="purple"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats?.orders?.total || 0}
          subValue={`${stats?.orders?.thisMonth || 0} this month • ${stats?.orders?.thisWeek || 0} this week`}
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats?.revenue?.total || 0)}
          subValue={`${formatCurrency(stats?.revenue?.thisMonth || 0)} this month`}
          color="emerald"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Active Tenants</p>
              <p className="text-2xl font-bold text-white">{stats?.tenants?.active || 0}</p>
              <p className="text-xs text-emerald-400 mt-1">
                {Math.round((stats?.tenants?.active / stats?.tenants?.total) * 100) || 0}% of total
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Active Users</p>
              <p className="text-2xl font-bold text-white">{stats?.users?.active || 0}</p>
              <p className="text-xs text-emerald-400 mt-1">
                {Math.round((stats?.users?.active / stats?.users?.total) * 100) || 0}% of total
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Orders This Week</p>
              <p className="text-2xl font-bold text-white">{stats?.orders?.thisWeek || 0}</p>
              <p className="text-xs text-slate-400 mt-1">
                Avg per day: {Math.round((stats?.orders?.thisWeek || 0) / 7)}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 rounded-xl border border-emerald-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300">Platform Health</p>
                <p className="text-xs text-slate-400 mt-1">All systems operational</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity logs={recentLogs} />
      </div>
    </div>
  );
}
