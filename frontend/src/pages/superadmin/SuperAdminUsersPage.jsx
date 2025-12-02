import { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Edit,
  UserX,
  ChevronLeft,
  ChevronRight,
  X,
  UserPlus,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
} from 'lucide-react';

const roleColors = {
  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  manager: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  server: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  kitchen: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  cashier: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
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

const UserDetailModal = ({ userId, onClose }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await superAdminApi.getUser(userId);
        setUser(res.user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
      setIsLoading(false);
    };
    loadUser();
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">User Details</h3>
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
        ) : user ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-2xl font-bold text-white">
                {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white">{user.fullName || user.email}</h4>
                <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-medium">{user.tenant?.name}</span>
              </div>
              <p className="text-xs text-slate-500">Tenant: {user.tenant?.slug}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">First Name</span>
                <span className="text-white">{user.firstName || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Last Name</span>
                <span className="text-white">{user.lastName || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Last Login</span>
                <span className="text-white">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Created</span>
                <span className="text-white">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">User not found</div>
        )}
      </div>
    </div>
  );
};

const UserModal = ({ user, tenants, onClose, onSave, showToast }) => {
  const [formData, setFormData] = useState({
    tenantId: user?.tenant?.id || '',
    email: user?.email || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || 'server',
    isActive: user?.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!user?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      if (isEdit) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        delete updateData.tenantId;
        await superAdminApi.updateUser(user.id, updateData);
        showToast('User updated successfully', 'success');
      } else {
        await superAdminApi.createUser(formData);
        showToast('User created successfully', 'success');
      }
      onSave();
    } catch (error) {
      setError(error.message || 'Failed to save user');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit User' : 'Create User'}
          </h3>
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

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tenant *</label>
              <select
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                required
              >
                <option value="">Select a tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {isEdit && (
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Building2 className="w-4 h-4" />
                <span>Tenant: <span className="text-white">{user.tenant?.name}</span></span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Password {isEdit && <span className="text-slate-500">(leave empty to keep current)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEdit ? "••••••••" : "Min 8 characters"}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              minLength={isEdit ? 0 : 8}
              required={!isEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="server">Server</option>
                <option value="kitchen">Kitchen</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
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
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewUserId, setViewUserId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const limit = 10;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getUsers({
        limit,
        offset: page * limit,
        role: roleFilter || undefined,
        tenantId: tenantFilter || undefined,
        active: activeFilter || undefined,
        search: search || undefined,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
      showToast('Failed to load users', 'error');
    }
    setIsLoading(false);
  };

  const loadTenants = async () => {
    try {
      const res = await superAdminApi.getTenants({ limit: 100 });
      setTenants(res.tenants || []);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, tenantFilter, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeactivate = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await superAdminApi.deleteUser(userId);
      showToast('User deactivated successfully', 'success');
      loadUsers();
    } catch (error) {
      showToast('Failed to deactivate user', 'error');
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await superAdminApi.reactivateUser(userId);
      showToast('User reactivated successfully', 'success');
      loadUsers();
    } catch (error) {
      showToast('Failed to reactivate user', 'error');
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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400">Manage all users across all tenants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setPage(0); }}
            className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="server">Server</option>
            <option value="kitchen">Kitchen</option>
            <option value="cashier">Cashier</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(0); }}
            className="px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No users found</h3>
            <p className="text-slate-400 text-sm mb-4">
              {search || roleFilter || tenantFilter || activeFilter 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first user'}
            </p>
            {!search && !roleFilter && !tenantFilter && !activeFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create User
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">User</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Tenant</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Last Login</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-semibold">
                            {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.fullName || user.email}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{user.tenant?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-400">
                          <Clock className="w-4 h-4" />
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenu === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-1">
                                <button
                                  onClick={() => { setViewUserId(user.id); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { setSelectedUser(user); setOpenMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                {user.isActive ? (
                                  <button
                                    onClick={() => { handleDeactivate(user.id); setOpenMenu(null); }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                                  >
                                    <UserX className="w-4 h-4" />
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { handleReactivate(user.id); setOpenMenu(null); }}
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
      {(selectedUser || showCreateModal) && (
        <UserModal
          user={selectedUser}
          tenants={tenants}
          onClose={() => { setSelectedUser(null); setShowCreateModal(false); }}
          onSave={() => { setSelectedUser(null); setShowCreateModal(false); loadUsers(); }}
          showToast={showToast}
        />
      )}
      {viewUserId && (
        <UserDetailModal
          userId={viewUserId}
          onClose={() => setViewUserId(null)}
        />
      )}
    </div>
  );
}
