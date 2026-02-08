import axios from 'axios/dist/browser/axios.cjs';
import type { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const DEFAULT_ANDROID_URL = 'http://10.0.2.2:8000';
const DEFAULT_IOS_URL = 'http://localhost:8000';

const baseUrlFromEnv = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const androidUrl = process.env.EXPO_PUBLIC_BACKEND_URL_ANDROID || '';
const iosUrl = process.env.EXPO_PUBLIC_BACKEND_URL_IOS || '';
const nativeUrl = process.env.EXPO_PUBLIC_BACKEND_URL_NATIVE || '';
const webUrl = process.env.EXPO_PUBLIC_BACKEND_URL_WEB || '';

const API_URL =
  Platform.OS === 'android'
    ? androidUrl || nativeUrl || DEFAULT_ANDROID_URL || baseUrlFromEnv
    : Platform.OS === 'ios'
      ? iosUrl || nativeUrl || DEFAULT_IOS_URL || baseUrlFromEnv
      : webUrl || baseUrlFromEnv;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  sendOTP: (phone: string) => api.post('/otp/send', { phone }),
  verifyOTP: (phone: string, code: string) => api.post('/otp/verify', { phone, code }),
  
  registerPassenger: (data: {
    full_name: string;
    phone: string;
    email: string;
    city: string;
    password: string;
    profile_photo?: string;
  }) => api.post('/auth/register/passenger', data),
  
  registerDriver: (data: {
    full_name: string;
    email: string;
    phone: string;
    city: string;
    vehicle_type: string;
    vehicle_brand: string;
    vehicle_model: string;
    plate_number: string;
    vehicle_photo?: string;
    license_photo?: string;
    vehicle_papers?: string;
    profile_photo?: string;
    password: string;
  }) => api.post('/auth/register/driver', data),
  
  login: (phone_or_email: string, password: string, user_type: string) => 
    api.post('/auth/login', { phone_or_email, password, user_type }),
  
  createSuperAdmin: (data: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }) => api.post('/superadmin/create', data),
};

// Vehicle APIs
export const vehicleAPI = {
  getBrands: (vehicle_type: string) => api.get(`/vehicles/brands?vehicle_type=${vehicle_type}`),
  getModels: (brand: string, vehicle_type: string) => api.get(`/vehicles/models/${brand}?vehicle_type=${vehicle_type}`),
};

// City APIs
export const cityAPI = {
  getAll: () => api.get('/cities'),
  create: (data: any) => api.post('/cities', data),
  update: (id: string, data: any) => api.put(`/cities/${id}`, data),
  delete: (id: string) => api.delete(`/cities/${id}`),
};

// Driver APIs
export const driverAPI = {
  getAll: (params?: { status?: string; city?: string }) => api.get('/drivers', { params }),
  approve: (id: string) => api.put(`/drivers/${id}/approve`),
  reject: (id: string, reason?: string) =>
    api.put(`/drivers/${id}/reject`, null, { params: { reason: reason || '' } }),
  updateOnlineStatus: (id: string, is_online: boolean) => api.put(`/drivers/${id}/status?is_online=${is_online}`),
  updateLocation: (id: string, lat: number, lng: number) => api.put(`/drivers/${id}/location`, { lat, lng }),
  getVerifications: (id: string) => api.get(`/drivers/${id}/verifications`),
  createByAdmin: (data: any) => api.post('/admin/drivers', data),
};

// Passenger APIs
export const passengerAPI = {
  getAll: (params?: { city?: string }) => api.get('/passengers', { params }),
  setStatus: (id: string, is_active: boolean) =>
    api.put(`/passengers/${id}/status`, null, { params: { is_active } }),
  delete: (id: string) => api.delete(`/passengers/${id}`),
  warn: (id: string, message: string) => api.post(`/passengers/${id}/warn`, { message }),
};

// Ride APIs
export const rideAPI = {
  getNearbyDrivers: (lat: number, lng: number, vehicle_type: string, city: string) =>
    api.get('/rides/nearby-drivers', { params: { lat, lng, vehicle_type, city } }),
  estimate: (data: any) => api.post('/rides/estimate', data),
  create: (data: any) => api.post('/rides', data),
  getAll: (status?: string) => api.get('/rides', { params: { status } }),
  accept: (id: string) => api.put(`/rides/${id}/accept`),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.put(`/rides/${id}/status`, { status, reason }),
  rate: (id: string, rating: number, comment?: string) => api.post(`/rides/${id}/rate`, { rating, comment }),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  createAdmin: (data: any) => api.post('/superadmin/admins', data),
  getAllAdmins: () => api.get('/superadmin/admins'),
  updateAdmin: (id: string, data: any) => api.put(`/superadmin/admins/${id}`, data),
  setAdminStatus: (id: string, is_active: boolean) =>
    api.put(`/superadmin/admins/${id}/status`, null, { params: { is_active } }),
  deleteAdmin: (id: string) => api.delete(`/superadmin/admins/${id}`),
};

export const subadminAPI = {
  getAll: () => api.get('/admin/subadmins'),
  create: (data: any) => api.post('/admin/subadmins', data),
  setStatus: (id: string, is_active: boolean) =>
    api.put(`/admin/subadmins/${id}/status`, null, { params: { is_active } }),
  delete: (id: string) => api.delete(`/admin/subadmins/${id}`),
};

// SuperAdmin APIs
export const superAdminAPI = {
  getStats: () => api.get('/superadmin/stats'),
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profile'),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/profile/password', { current_password, new_password }),
  update: (data: {
    full_name?: string;
    email?: string;
    phone?: string;
    city?: string;
    profile_photo?: string;
    brand_name?: string;
    logo?: string;
    primary_color?: string;
    secondary_color?: string;
    tertiary_color?: string;
    vehicle_type?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_color?: string;
    plate_number?: string;
    vehicle_photo?: string;
    license_photo?: string;
    vehicle_papers?: string;
    moncash_enabled?: boolean;
    moncash_phone?: string;
    natcash_enabled?: boolean;
    natcash_phone?: string;
    bank_enabled?: boolean;
    bank_name?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    default_method?: string;
  }) =>
    api.put('/profile', data),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
};

export const pricingAPI = {
  get: (scope: 'direct' | 'admin') => api.get('/pricing', { params: { scope } }),
  update: (
    scope: 'direct' | 'admin',
    data: { base_fare: number; price_per_km: number; price_per_min: number; commission_rate?: number }
  ) => api.put('/pricing', data, { params: { scope } }),
};

export const adminPricingAPI = {
  get: () => api.get('/admin/pricing'),
  update: (data: {
    base_fare: number;
    price_per_km: number;
    price_per_min: number;
    surge_multiplier: number;
    commission_rate: number;
  }) => api.put('/admin/pricing', data),
};

export const adminPaymentAPI = {
  get: () => api.get('/admin/payment-methods'),
  update: (data: {
    moncash_enabled: boolean;
    moncash_phone?: string;
    natcash_enabled: boolean;
    natcash_phone?: string;
    bank_enabled: boolean;
    bank_name?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    default_method?: 'moncash' | 'natcash' | 'bank' | null;
  }) => api.put('/admin/payment-methods', data),
};

export const complaintsAPI = {
  getAll: () => api.get('/complaints'),
  create: (data: { target_user_type: 'driver' | 'passenger'; target_user_id: string; message: string; ride_id?: string }) =>
    api.post('/complaints', data),
  resolve: (id: string, message?: string) => api.put(`/complaints/${id}/resolve`, { message }),
};

export const ridesAPI = {
  cancel: (id: string, reason?: string) =>
    api.put(`/rides/${id}/status`, { status: 'cancelled', reason }),
};

export default api;
