import { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { useSuperAdminStore } from '../../stores/superAdminStore';
import {
  Shield,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  UserX,
  Plus,
  X,
  Clock,
} from 'lucide-react';

const SuperAdminModal = ({ admin, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: admin?.email || '',
    password: '',
    firstName: admin?.firstName || '',
    lastName: admin?.lastName || '',
    isActive: admin?.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = !!admin?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEdit) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await superAdminApi.updateSuperAdmin(admin.id, updateData);
      } else {
        await superAdminApi.createSuperAdmin(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save super admin:', error);
      alert(error.message || 'Failed to save super admin');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit Super Admin' : 'Create Super Admin'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
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
              placeholder={isEdit ? "••••••••" : "Min 12 characters"}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              minLength={isEdit ? 0 : 12}
              required={!isEdit}
            />
            {!isEdit && (
              <p className="text-xs text-slate-500 mt-1.5">Password must be at least 12 characters</p>
            )}
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

          {isEdit && (
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
          )}

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
              {isEdit ? 'Save Changes' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const { superAdmin: currentAdmin } = useSuperAdminStore();

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getSuperAdmins();
      setAdmins(res.superAdmins || []);
    } catch (error) {
      console.error('Failed to load super admins:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Super Admins</h1>
          <p className="text-slate-400">Manage platform administrators</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Super Admin
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-300 font-medium">Super Admin Access</p>
            <p className="text-xs text-slate-400 mt-1">
              Super admins have full access to all tenants, users, and platform settings.
              Create additional super admins carefully and ensure strong passwords.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Admin</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Last Login</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Created</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-semibold">
                          {admin.firstName?.[0]?.toUpperCase() || admin.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{admin.fullName || admin.email}</p>
                            {admin.id === currentAdmin?.id && (
                              <span className="px-1.5 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {admin.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === admin.id ? null : admin.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenu === admin.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-1">
                              <button
                                onClick={() => { setSelectedAdmin(admin); setOpenMenu(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
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
        )}
      </div>

      {/* Modals */}
      {(selectedAdmin || showCreateModal) && (
        <SuperAdminModal
          admin={selectedAdmin}
          onClose={() => { setSelectedAdmin(null); setShowCreateModal(false); }}
          onSave={() => { setSelectedAdmin(null); setShowCreateModal(false); loadAdmins(); }}
        />
      )}
    </div>
  );
}
