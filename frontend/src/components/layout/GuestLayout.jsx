import { UtensilsCrossed } from 'lucide-react';

/**
 * Guest Layout
 * Used for QR code ordering pages - minimal chrome
 */
export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-950">
      {/* Minimal header */}
      <header className="bg-surface-900 border-b border-surface-800 px-4 py-3 safe-top">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-surface-100">tap</span>
        </div>
      </header>

      {/* Content */}
      <main className="safe-bottom">
        {children}
      </main>
    </div>
  );
}
