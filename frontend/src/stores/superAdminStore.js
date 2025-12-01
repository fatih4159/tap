import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { superAdminApi } from '../services/api';

/**
 * Super Admin Store
 * Manages super admin authentication and platform-wide state
 */
export const useSuperAdminStore = create(
  persist(
    (set, get) => ({
      superAdmin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      setupRequired: null,
      
      // Stats cache
      stats: null,

      checkSetup: async () => {
        try {
          const response = await superAdminApi.checkSetup();
          set({ setupRequired: response.setupRequired });
          return response.setupRequired;
        } catch (error) {
          console.error('Check setup error:', error);
          return null;
        }
      },

      setup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await superAdminApi.setup(data);
          const { token, superAdmin } = response;

          localStorage.setItem('superAdminToken', token);
          localStorage.setItem('token', token); // For API requests

          set({
            superAdmin,
            token,
            isAuthenticated: true,
            isLoading: false,
            setupRequired: false,
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await superAdminApi.login(email, password);
          const { token, superAdmin } = response;

          localStorage.setItem('superAdminToken', token);
          localStorage.setItem('token', token); // For API requests

          set({
            superAdmin,
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
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('token');

        set({
          superAdmin: null,
          token: null,
          isAuthenticated: false,
          error: null,
          stats: null,
        });
      },

      refreshSession: async () => {
        const token = localStorage.getItem('superAdminToken');
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        // Set token for API requests
        localStorage.setItem('token', token);

        try {
          const response = await superAdminApi.me();
          set({
            superAdmin: response.superAdmin,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          // Token invalid, logout
          get().logout();
          return false;
        }
      },

      fetchStats: async () => {
        try {
          const response = await superAdminApi.getStats();
          set({ stats: response.stats });
          return response.stats;
        } catch (error) {
          console.error('Fetch stats error:', error);
          return null;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'superadmin-storage',
      partialize: (state) => ({
        // Don't persist sensitive data
        setupRequired: state.setupRequired,
      }),
    }
  )
);

export default useSuperAdminStore;
