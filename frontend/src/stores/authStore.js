import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

/**
 * Auth Store
 * Manages authentication state and user session
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { token, user, tenant } = response;

          localStorage.setItem('token', token);
          localStorage.setItem('tenantId', tenant.id);

          // Connect socket with new token
          connectSocket(token);

          set({
            user,
            tenant,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      pinLogin: async (pin) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.pinLogin(pin);
          const { token, user } = response;
          const currentTenant = get().tenant;

          localStorage.setItem('token', token);

          // Reconnect socket
          connectSocket(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('tenantId');
        disconnectSocket();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.me();
          set({
            user: response.user,
            tenant: response.tenant,
            isAuthenticated: true,
          });

          // Ensure socket is connected
          connectSocket(token);
        } catch (error) {
          // Token invalid, logout
          get().logout();
        }
      },

      clearError: () => set({ error: null }),

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        if (typeof roles === 'string') return user.role === roles;
        return roles.includes(user.role);
      },

      isAdmin: () => get().hasRole('admin'),
      isManager: () => get().hasRole(['admin', 'manager']),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        tenant: state.tenant,
        // Don't persist user/token - refresh on load
      }),
    }
  )
);

export default useAuthStore;
