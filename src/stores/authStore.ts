import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppNotification, User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notifications: AppNotification[];

  setUser: (user: User | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: AppNotification) => void;
  markNotificationRead: (id: string) => void;
  loginAsDemo: (role: 'admin' | 'sales' | 'staff') => void;
}

const DEMO_USERS: Record<string, User> = {
  admin: {
    id: '1',
    name: '中山社長',
    role: 'admin',
    email: 'nakayama@example.com',
    status: 'active',
  },
  staff: {
    id: '2',
    name: '事務太郎',
    role: 'office',
    email: 'jimu@example.com',
    status: 'active',
  },
  sales: {
    id: '3',
    name: '山田太郎',
    role: 'sales',
    email: 'yamada@example.com',
    status: 'active',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      notifications: [],

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        set({ user: null, isAuthenticated: false, notifications: [] });
      },

      setLoading: (isLoading) => set({ isLoading }),

      loginAsDemo: (role) => {
        const user = DEMO_USERS[role];
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', 'demo_token_' + role);
        }
        set({ user, isAuthenticated: true });
      },

      addNotification: (notification) =>
        set((state) => ({ notifications: [notification, ...state.notifications] })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
    }),
    {
      name: 'lapin-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
