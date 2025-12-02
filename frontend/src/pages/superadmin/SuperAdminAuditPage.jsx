import { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import {
  FileText,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building2,
  UserPlus,
  Edit,
  Ban,
  LogIn,
  Eye,
  Shield,
} from 'lucide-react';

const actionIcons = {
  login: LogIn,
  setup: Shield,
  list_tenants: Eye,
  view_tenant: Eye,
  update_tenant: Edit,
  deactivate_tenant: Ban,
  list_users: Eye,
  view_user: Eye,
  create_user: UserPlus,
  update_user: Edit,
  deactivate_user: Ban,
  create_super_admin: Shield,
  update_super_admin: Edit,
};

const actionColors = {
  login: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  setup: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  list_tenants: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  view_tenant: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  update_tenant: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  deactivate_tenant: 'bg-red-500/10 text-red-400 border-red-500/30',
  list_users: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  view_user: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  create_user: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  update_user: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  deactivate_user: 'bg-red-500/10 text-red-400 border-red-500/30',
  create_super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  update_super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const formatAction = (action) => {
  const actions = {
    'login': 'Logged In',
    'setup': 'Initial Setup',
    'list_tenants': 'Viewed Tenants',
    'view_tenant': 'Viewed Tenant',
    'update_tenant': 'Updated Tenant',
    'deactivate_tenant': 'Deactivated Tenant',
    'list_users': 'Viewed Users',
    'view_user': 'Viewed User',
    'create_user': 'Created User',
    'update_user': 'Updated User',
    'deactivate_user': 'Deactivated User',
    'create_super_admin': 'Created Super Admin',
    'update_super_admin': 'Updated Super Admin',
  };
  return actions[action] || action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    relative: getRelativeTime(date),
  };
};

const getRelativeTime = (date) => {
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return date.toLocaleDateString();
};

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 20;

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getAuditLog({
        limit,
        offset: page * limit,
      });
      setLogs(res.logs || []);
    } catch (error) {
      console.error('Failed to load audit log:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const filteredLogs = actionFilter 
    ? logs.filter(log => log.action === actionFilter)
    : logs;

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-slate-400">Track all super admin activities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{formatAction(action)}</option>
          ))}
        </select>
      </div>

      {/* Logs */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800/50">
              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No audit logs found
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = actionIcons[log.action] || FileText;
                  const time = formatTime(log.created_at);
                  const colorClass = actionColors[log.action] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl border ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{formatAction(log.action)}</span>
                            <span className="text-slate-500">by</span>
                            <span className="text-emerald-400">{log.super_admin_email}</span>
                          </div>
                          
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-sm text-slate-400">
                              {log.entity_type && (
                                <span className="inline-flex items-center gap-1 mr-4">
                                  {log.entity_type === 'tenant' && <Building2 className="w-3 h-3" />}
                                  {log.entity_type === 'user' && <User className="w-3 h-3" />}
                                  {log.entity_type === 'super_admin' && <Shield className="w-3 h-3" />}
                                  <span className="capitalize">{log.entity_type}</span>
                                  {log.entity_id && (
                                    <span className="text-slate-500 font-mono text-xs">
                                      {log.entity_id.slice(0, 8)}...
                                    </span>
                                  )}
                                </span>
                              )}
                              {log.details.changes && (
                                <span className="text-slate-500">
                                  Modified: {Object.keys(log.details.changes).filter(k => k !== 'password').join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {time.relative}
                            </span>
                            <span>{time.date} {time.time}</span>
                            {log.ip_address && (
                              <span className="font-mono">{log.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Showing {filteredLogs.length} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-300">
                  Page {page + 1}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={logs.length < limit}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
