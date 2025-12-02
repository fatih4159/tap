import { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  Users,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Edit,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const statusColors = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const subscriptionColors = {
  trial: 'bg-blue-500/10 text-blue-400',
  active: 'bg-emerald-500/10 text-emerald-400',
  past_due: 'bg-yellow-500/10 text-yellow-400',
  suspended: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-slate-500/10 text-slate-400',
};

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up ${
    type === 'success' ? 'bg-emerald-900/90 border border-emerald-700' : 'bg-red-900/90 border border-red-700'
  }`}>
    {type === 'success' ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-400" />
    )}
    <span className="text-white text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">
      <X className="w-4 h-4" />
    </button>
  </div>
);

const CreateTenantModal = ({ onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscriptionPlan: 'starter',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await superAdminApi.createTenant(formData);
      showToast('Tenant created successfully', 'success');
      onSave();
    } catch (error) {
      setError(error.message || 'Failed to create tenant');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Create New Tenant</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Restaurant Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mario's Italian Kitchen"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@restaurant.com"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, City, Country"
              rows={2}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Subscription Plan</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Tenant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantModal = ({ tenant, onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    status: tenant?.status || 'active',
    subscriptionStatus: tenant?.subscriptionStatus || 'trial',
    subscriptionPlan: tenant?.subscriptionPlan || 'starter',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await superAdminApi.updateTenant(tenant.id, formData);
      showToast('Tenant updated successfully', 'success');
      onSave();
    } catch (error) {
      setError(error.message || 'Failed to update tenant');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Edit Tenant</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Subscription</label>
              <select
                value={formData.subscriptionStatus}
                onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Plan</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantDetailModal = ({ tenant, onClose }) => {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const res = await superAdminApi.getTenant(tenant.id);
        setDetails(res);
      } catch (error) {
        console.error('Failed to load tenant details:', error);
      }
      setIsLoading(false);
    };
    loadDetails();
  }, [tenant.id]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Tenant Details</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-2xl font-bold text-white">
                  {details?.tenant?.name?.[0]?.toUpperCase() || 'T'}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">{details?.tenant?.name}</h4>
                  <p className="text-slate-400">{details?.tenant?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[details?.tenant?.status]}`}>
                      {details?.tenant?.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscriptionColors[details?.tenant?.subscriptionStatus]}`}>
                      {details?.tenant?.subscriptionStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-white">{details?.stats?.users?.total || 0}</p>
                  <p className="text-xs text-emerald-400">{details?.stats?.users?.active || 0} active</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{details?.stats?.orders?.total || 0}</p>
                  <p className="text-xs text-emerald-400">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(details?.stats?.orders?.revenue || 0)} revenue
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Slug</span>
                  <span className="text-white font-mono">{details?.tenant?.slug}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white">{details?.tenant?.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Plan</span>
                  <span className="text-white capitalize">{details?.tenant?.subscriptionPlan}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">
                    {new Date(details?.tenant?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewTenant, setViewTenant] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const limit = 10;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getTenants({
        limit,
        offset: page * limit,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setTenants(res.tenants || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      showToast('Failed to load tenants', 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTenants();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeactivate = async (tenantId) => {
    if (!confirm('Are you sure you want to deactivate this tenant?')) return;
    try {
      await superAdminApi.deleteTenant(tenantId);
      showToast('Tenant deactivated successfully', 'success');
      loadTenants();
    } catch (error) {
      showToast('Failed to deactivate tenant', 'error');
    }
  };

  const handleReactivate = async (tenantId) => {
    try {
      await superAdminApi.reactivateTenant(tenantId);
      showToast('Tenant reactivated successfully', 'success');
      loadTenants();
    } catch (error) {
      showToast('Failed to reactivate tenant', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-slate-400">Manage all restaurant tenants on the platform</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No tenants found</h3>
            <p className="text-slate-400 text-sm mb-4">
              {search || statusFilter ? 'Try adjusting your search or filters' : 'Get started by creating your first tenant'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Tenant
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Tenant</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Subscription</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Users</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Orders</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Created</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-semibold">
                            {tenant.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{tenant.name}</p>
                            <p className="text-sm text-slate-500">{tenant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[tenant.status]}`}>
                          {tenant.status === 'active' && <CheckCircle className="w-3 h-3" />}
                          {tenant.status === 'inactive' && <XCircle className="w-3 h-3" />}
                          {tenant.status === 'suspended' && <Ban className="w-3 h-3" />}
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${subscriptionColors[tenant.subscriptionStatus]}`}>
                          {tenant.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>{tenant.activeUsers}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <ShoppingCart className="w-4 h-4 text-slate-500" />
                          <span>{tenant.totalOrders}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenu === tenant.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-1">
                                <button
                                  onClick={() => { setViewTenant(tenant); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { setSelectedTenant(tenant); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                {tenant.status === 'active' ? (
                                  <button
                                    onClick={() => { handleDeactivate(tenant.id); setOpenMenu(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { handleReactivate(tenant.id); setOpenMenu(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-400 hover:bg-slate-700"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    Reactivate
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
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
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); loadTenants(); }}
          showToast={showToast}
        />
      )}
      {selectedTenant && (
        <TenantModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onSave={() => { setSelectedTenant(null); loadTenants(); }}
          showToast={showToast}
        />
      )}
      {viewTenant && (
        <TenantDetailModal
          tenant={viewTenant}
          onClose={() => setViewTenant(null)}
        />
      )}
    </div>
  );
}
