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

const isBrowser = typeof window !== 'undefined';
const currentHostname = isBrowser ? window.location.hostname : '';
const isLocalHostname = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

const isLocalUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(url);

const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

const resolveWebUrl = () => {
  const fallback = baseUrlFromEnv || (isBrowser ? window.location.origin : '');
  const candidate = webUrl || fallback;

  if (isBrowser && !isLocalHostname && isLocalUrl(candidate) && baseUrlFromEnv) {
    return baseUrlFromEnv;
  }

  return candidate;
};

const resolvedWebUrl = normalizeUrl(resolveWebUrl());

const _API_URL =
  Platform.OS === 'android'
    ? androidUrl || nativeUrl || DEFAULT_ANDROID_URL || baseUrlFromEnv
    : Platform.OS === 'ios'
      ? iosUrl || nativeUrl || DEFAULT_IOS_URL || baseUrlFromEnv
      : resolvedWebUrl || 'http://localhost:8000';

export const API_URL = normalizeUrl(_API_URL);

// Base URL pour les appels API : éviter double /api si l'URL se termine déjà par /api
const apiBaseURL = API_URL.toLowerCase().endsWith('/api') ? API_URL : `${API_URL}/api`;

const api = axios.create({
  baseURL: apiBaseURL,
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
    admin_id?: string;
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
    casier_judiciaire?: string;
    profile_photo?: string;
    password: string;
    admin_id?: string;
  }) => api.post('/auth/register/driver', data),
  
  login: (phone_or_email: string, password: string, user_type: string) => 
    api.post('/auth/login', { phone_or_email, password, user_type }),

  passwordResetRequest: (data: { identifier: string; channel: 'phone' | 'email'; user_type: string }) =>
    api.post('/auth/password-reset/request', data),
  passwordResetConfirm: (data: { identifier: string; channel: 'phone' | 'email'; user_type: string; code: string; new_password: string }) =>
    api.post('/auth/password-reset/confirm', data),
  
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
  remindMissingDocs: (data?: { driver_id?: string; status?: string; message?: string }) =>
    api.post('/drivers/remind-missing-docs', data || {}),
  createTestRideAdmin: (data?: {
    driver_id?: string;
    admin_id?: string | null;
    vehicle_type?: 'moto' | 'car';
    city?: string;
    pickup_lat?: number;
    pickup_lng?: number;
    pickup_address?: string;
    destination_lat?: number;
    destination_lng?: number;
    destination_address?: string;
  }) => api.post('/rides/test', data || {}),
  getActiveTestRides: (params?: { admin_id?: string | null; vehicle_type?: 'moto' | 'car' }) =>
    api.get('/rides/test/active', { params }),
  createTestRideAuto: () => api.post('/rides/test/auto'),
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

// Wallet & retraits (chauffeur)
export const walletAPI = {
  get: () => api.get<{
    wallet: { balance: number; balance_en_attente: number; total_gagne: number; total_retire: number };
    retrait_possible: boolean;
    raison?: string;
    prochain_retrait_ts?: number;
    type_retrait: string;
    message: string;
    regles: { montant_minimum: number; seuil_automatique: number; delai_entre_retraits_heures: number; frais_retrait: number };
  }>('/wallet'),
  getTransactions: (limit?: number) => api.get<{ transactions: any[] }>('/wallet/transactions', { params: { limit } }),
  withdraw: (montant: number, methode: 'moncash' | 'natcash' | 'bank') =>
    api.post('/wallet/withdraw', { montant, methode }),
};

// Admin / Superadmin: retraits
export const retraitsAPI = {
  list: (params?: { statut?: string; methode?: string; min_montant?: number }) =>
    api.get<{ retraits: any[]; stats: { en_attente_count: number; en_attente_total: number; traites_aujourdhui_count: number; traites_aujourdhui_total: number } }>('/admin/retraits', { params }),
  traiter: (retraitId: string) => api.post(`/admin/retraits/${retraitId}/traiter`),
  annuler: (retraitId: string) => api.post(`/admin/retraits/${retraitId}/annuler`),
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

// Landing page API (SuperAdmin gère tout)
export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterData = {
  brand_title: string;
  brand_text: string;
  copyright: string;
  play_store_url?: string;
  app_store_url?: string;
  direct_apk_url?: string;
  whitelabel_confirm_subject?: string;
  whitelabel_confirm_body?: string;
  support_sant_ed_content?: string;
  support_kontak_content?: string;
  support_politik_content?: string;
  support_video_url?: string;
  image_ride_url?: string;
  image_moto_url?: string;
  image_auto_url?: string;
  columns: FooterColumn[];
};

export type WhiteLabelRequest = {
  id: string;
  company: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  message?: string;
  website?: string;
  drivers_estimate?: number;
  status: 'pending' | 'processed' | 'archived' | 'cancelled' | 'rejected';
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
};

export const landingAPI = {
  get: () => api.get<{ content: Record<string, string>; footer: FooterData }>('/landing'),
  update: (content: Record<string, string | null>, footer?: FooterData | null) =>
    api.put('/landing', { content, footer }),
  reset: () => api.delete('/landing'),
  whitelabelRequests: (status?: string) =>
    api.get<{ requests: WhiteLabelRequest[] }>('/landing/whitelabel-requests', status ? { params: { status } } : {}),
  processWhitelabelRequest: (id: string, status: string, admin_notes?: string) =>
    api.patch(`/landing/whitelabel-requests/${id}`, { status, admin_notes }),
  deleteWhitelabelRequest: (id: string) => api.delete(`/landing/whitelabel-requests/${id}`),
  sendWhitelabelEmail: (id: string, subject: string, message: string) =>
    api.post(`/landing/whitelabel-requests/${id}/send-email`, { subject, message }),
};

export type SupportMessage = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'pending' | 'read' | 'replied' | 'archived';
  admin_notes?: string;
  source?: string;
  created_at: string;
  updated_at?: string;
};

export const supportMessagesAPI = {
  submit: (data: { name: string; phone: string; email: string; message: string }) =>
    fetch(`${API_URL}/api/landing/support-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  list: (status?: string) =>
    api.get<{ messages: SupportMessage[] }>('/support-messages', status ? { params: { status } } : {}),
  update: (id: string, data: { status?: string; admin_notes?: string }) =>
    api.patch(`/support-messages/${id}`, data),
  sendEmail: (id: string, subject: string, message: string) =>
    api.post(`/support-messages/${id}/send-email`, { subject, message }),
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
    cities?: string[];
    vehicle_type?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_color?: string;
    plate_number?: string;
    vehicle_photo?: string;
    license_photo?: string;
    vehicle_papers?: string;
    casier_judiciaire?: string;
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

// Véhicules du chauffeur (plusieurs: machin + moto)
export const driverVehiclesAPI = {
  getAll: () => api.get<{ vehicles: Array<{ id: string; is_primary: boolean; vehicle_type: string; vehicle_brand: string; vehicle_model: string; plate_number: string; vehicle_color?: string; created_at?: string }> }>('/drivers/me/vehicles'),
  add: (data: { vehicle_type: string; vehicle_brand: string; vehicle_model: string; plate_number: string; vehicle_color?: string }) =>
    api.post('/drivers/me/vehicles', data),
  update: (vehicleId: string, data: { vehicle_type?: string; vehicle_brand?: string; vehicle_model?: string; plate_number?: string; vehicle_color?: string }) =>
    api.put(`/drivers/me/vehicles/${vehicleId}`, data),
  delete: (vehicleId: string) => api.delete(`/drivers/me/vehicles/${vehicleId}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.post('/notifications/mark-read'),
};

export const pricingAPI = {
  get: (scope: 'direct' | 'admin') => api.get('/pricing', { params: { scope } }),
  update: (
    scope: 'direct' | 'admin',
    data: {
      base_fare?: number;
      price_per_km?: number;
      price_per_min?: number;
      base_fare_moto?: number;
      base_fare_car?: number;
      price_per_km_moto?: number;
      price_per_km_car?: number;
      price_per_min_moto?: number;
      price_per_min_car?: number;
      commission_rate?: number;
    }
  ) => api.put('/pricing', data, { params: { scope } }),
};

export const adminPricingAPI = {
  get: () => api.get('/admin/pricing'),
  update: (data: {
    base_fare?: number;
    price_per_km?: number;
    price_per_min?: number;
    base_fare_moto?: number;
    base_fare_car?: number;
    price_per_km_moto?: number;
    price_per_km_car?: number;
    price_per_min_moto?: number;
    price_per_min_car?: number;
    surge_multiplier: number;
    commission_rate: number;
  }) => api.put('/admin/pricing', data),
};

// Build APIs (SuperAdmin)
export const buildAPI = {
  generateBuild: (data: {
    brand_id: string;
    company_name: string;
    logo: string;
    primary_color: string;
    secondary_color: string;
    tertiary_color: string;
    local_only?: boolean;
    build_mode?: 'local' | 'cloud';
  }) => api.post('/superadmin/builds/generate', data),

  getBuildStatus: (buildId: string) =>
    api.get(`/superadmin/builds/status/${buildId}`),

  listBuilds: (brandId?: string) =>
    api.get('/superadmin/builds', { params: { brand_id: brandId } }),

  downloadBuild: (buildId: string) =>
    api.get(`/superadmin/builds/download/${buildId}`, {
      responseType: 'blob',
    }),

  clearBuildCache: () => api.post('/superadmin/builds/cache/clear'),
  cancelBuild: (buildId: string) => api.post(`/superadmin/builds/${buildId}/cancel`),
  clearFailedBuilds: (brandId?: string) =>
    api.delete('/superadmin/builds/failed', { params: brandId ? { brand_id: brandId } : {} }),

  submitToPlayStore: (buildId: string, track: 'internal' | 'alpha' | 'beta' | 'production' = 'internal') =>
    api.post('/superadmin/builds/submit', { build_id: buildId, track }),
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
