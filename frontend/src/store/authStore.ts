import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  user_type: 'passenger' | 'driver' | 'admin' | 'subadmin' | 'superadmin';
  profile_photo?: string;
  status?: string;
  vehicle_type?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  plate_number?: string;
  vehicle_photo?: string;
  license_photo?: string;
  vehicle_papers?: string;
  is_online?: boolean;
  rating?: number;
  total_rides?: number;
  wallet_balance?: number;
  moncash_enabled?: boolean;
  moncash_phone?: string;
  natcash_enabled?: boolean;
  natcash_phone?: string;
  bank_enabled?: boolean;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  default_method?: string;
  // Admin fields
  cities?: string[];
  brand_name?: string;
  logo?: string;
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (user, token) => {
    try {
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Login storage error:', error);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout storage error:', error);
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('auth_user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load auth error:', error);
      set({ isLoading: false });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...updates };
      set({ user: updated });
      AsyncStorage.setItem('auth_user', JSON.stringify(updated));
    }
  },
}));
