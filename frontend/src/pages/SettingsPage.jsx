import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  Building2,
  Users,
  CreditCard,
  Bell,
  Palette,
  Shield,
  ChevronRight,
  Check,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

const settingsSections = [
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: Building2,
    description: 'Business information and branding',
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: Users,
    description: 'Manage staff accounts',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    description: 'Subscription and payment',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Alert preferences',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    description: 'Theme and display',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password and access',
  },
];

export default function SettingsPage() {
  const { tenant, user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('restaurant');

  const RestaurantSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
          Restaurant Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Restaurant Name</label>
            <input
              type="text"
              defaultValue={tenant?.name}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              defaultValue={tenant?.email}
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              defaultValue={tenant?.phone || ''}
              className="input"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              defaultValue={tenant?.address || ''}
              className="input"
              rows={3}
            />
          </div>
        </div>
      </div>
      <button className="btn-primary">Save Changes</button>
    </div>
  );

  const BillingSettings = () => (
    <div className="space-y-6">
      <div className="card bg-gradient-to-r from-primary-600 to-primary-800 border-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-100 text-sm">Current Plan</p>
            <p className="text-2xl font-bold text-white capitalize">
              {tenant?.subscriptionPlan || 'Starter'}
            </p>
          </div>
          <span className="badge bg-white/20 text-white capitalize">
            {tenant?.subscriptionStatus || 'Active'}
          </span>
        </div>
        <button className="btn bg-white/20 text-white hover:bg-white/30 w-full">
          <ExternalLink className="w-4 h-4" />
          Manage Subscription
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
          Available Plans
        </h3>
        <div className="space-y-3">
          {['starter', 'professional', 'enterprise'].map((plan) => (
            <div
              key={plan}
              className={clsx(
                'card-interactive flex items-center justify-between',
                tenant?.subscriptionPlan === plan && 'ring-2 ring-primary-500'
              )}
            >
              <div>
                <p className="font-medium text-surface-100 capitalize">{plan}</p>
                <p className="text-sm text-surface-400">
                  {plan === 'starter' && 'Up to 500 orders/month'}
                  {plan === 'professional' && 'Up to 2000 orders/month'}
                  {plan === 'enterprise' && 'Unlimited orders'}
                </p>
              </div>
              {tenant?.subscriptionPlan === plan ? (
                <Check className="w-5 h-5 text-primary-400" />
              ) : (
                <button className="btn-sm btn-secondary">Upgrade</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-surface-100 mb-4">
        Notification Preferences
      </h3>
      <div className="space-y-4">
        {[
          { id: 'newOrders', label: 'New Orders', desc: 'Get notified when new orders arrive' },
          { id: 'orderReady', label: 'Order Ready', desc: 'When kitchen marks orders as ready' },
          { id: 'waiterCall', label: 'Waiter Calls', desc: 'When guests request assistance' },
          { id: 'lowStock', label: 'Low Stock', desc: 'When menu items are running low' },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-surface-100">{item.label}</p>
              <p className="text-sm text-surface-400">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'restaurant':
        return <RestaurantSettings />;
      case 'billing':
        return <BillingSettings />;
      case 'notifications':
        return <NotificationSettings />;
      default:
        return (
          <div className="text-center py-12 text-surface-400">
            <p>Settings section coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-surface-100">Settings</h1>
        <p className="text-surface-400">Manage your restaurant and account</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-64 space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                activeSection === section.id
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
              )}
            >
              <section.icon className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{section.label}</p>
                <p className="text-xs opacity-60 truncate">{section.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 card">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
