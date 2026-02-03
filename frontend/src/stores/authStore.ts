import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { login as loginApi, logout as logoutApi } from '@/services/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      initializeAuth: () => {
        const token = get().token;
        if (token && !localStorage.getItem('token')) {
          // 如果 zustand 中有 token 但 localStorage 中没有，同步到 localStorage
          localStorage.setItem('token', token);
        }
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await loginApi({ username, password });
          const { access_token, user } = response.data || response;

          // 同时存储到 localStorage，供 axios 拦截器使用
          localStorage.setItem('token', access_token);

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await logoutApi();
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          // 清除 localStorage 中的 token
          localStorage.removeItem('token');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token: string | null) => {
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
        set({ token, isAuthenticated: !!token });
      },

      clearAuth: () => {
        // 清除 localStorage 中的 token
        localStorage.removeItem('token');

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
