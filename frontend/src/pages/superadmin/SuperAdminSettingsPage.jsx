import { useState } from 'react';
import { useSuperAdminStore } from '../../stores/superAdminStore';
import { superAdminApi } from '../../services/api';
import {
  Settings,
  Lock,
  User,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
} from 'lucide-react';

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

export default function SuperAdminSettingsPage() {
  const { superAdmin } = useSuperAdminStore();
  const [toast, setToast] = useState(null);
  
  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 12) {
      setPasswordError('Password must be at least 12 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await superAdminApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      showToast('Password changed successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.message || 'Failed to change password');
    }
    setIsChangingPassword(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your super admin account</p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-2xl font-bold text-white">
              {superAdmin?.firstName?.[0]?.toUpperCase() || superAdmin?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {superAdmin?.fullName || superAdmin?.email}
              </h3>
              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <Mail className="w-4 h-4" />
                <span>{superAdmin?.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          {passwordError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Minimum 12 characters"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
              minLength={12}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
              minLength={12}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Security Info */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Security Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Last Login</span>
            <span className="text-white">
              {superAdmin?.lastLogin ? new Date(superAdmin.lastLogin).toLocaleString() : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Permissions</span>
            <span className="text-emerald-400">Full Access</span>
          </div>
          <div className="p-4 bg-amber-900/20 border border-amber-700/30 rounded-xl">
            <p className="text-sm text-amber-300">
              <strong>Security Tip:</strong> As a super admin, you have access to all tenants and user data. 
              Make sure to use a strong, unique password and never share your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
