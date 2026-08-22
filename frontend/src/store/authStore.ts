import { create } from 'zustand';
import { User, Shop } from '../types/index.js';
import { apiClient } from '../services/api.js';

interface AuthState {
  user: User | null;
  shop: Shop | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  quickSwitchPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  shop: null,
  token: localStorage.getItem('bismi_token'),
  isAuthenticated: !!localStorage.getItem('bismi_token'),
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('bismi_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.success) {
        set({
          user: res.data.data.user,
          shop: res.data.data.shop,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        get().logout();
      }
    } catch (_) {
      // Offline mode: load from stored session cache
      const cachedUser = localStorage.getItem('bismi_user');
      const cachedShop = localStorage.getItem('bismi_shop');
      if (cachedUser && cachedShop) {
        set({
          user: JSON.parse(cachedUser),
          shop: JSON.parse(cachedShop),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    }
  },

  login: async (username: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      if (res.data?.success) {
        const { token, user, shop } = res.data.data;
        localStorage.setItem('bismi_token', token);
        localStorage.setItem('bismi_user', JSON.stringify(user));
        localStorage.setItem('bismi_shop', JSON.stringify(shop));

        set({
          token,
          user,
          shop,
          isAuthenticated: true,
        });
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || e.message || 'Login failed.' };
    }
  },

  quickSwitchPin: async (pin: string) => {
    const { shop } = get();
    if (!shop) return { success: false, message: 'Shop context missing.' };

    try {
      const res = await apiClient.post('/auth/verify-pin', {
        shopId: shop.id,
        pin,
      });

      if (res.data?.success) {
        const { token, user } = res.data.data;
        localStorage.setItem('bismi_token', token);
        localStorage.setItem('bismi_user', JSON.stringify(user));

        set({
          token,
          user,
          isAuthenticated: true,
        });
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Invalid PIN.' };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Invalid PIN.' };
    }
  },

  logout: () => {
    localStorage.removeItem('bismi_token');
    localStorage.removeItem('bismi_user');
    localStorage.removeItem('bismi_shop');
    set({
      user: null,
      shop: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
