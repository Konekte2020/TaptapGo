import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
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
};

// Driver APIs
export const driverAPI = {
  getAll: (params?: { status?: string; city?: string }) => api.get('/drivers', { params }),
  approve: (id: string) => api.put(`/drivers/${id}/approve`),
  reject: (id: string, reason?: string) => api.put(`/drivers/${id}/reject?reason=${reason || ''}`),
  updateOnlineStatus: (id: string, is_online: boolean) => api.put(`/drivers/${id}/status?is_online=${is_online}`),
  updateLocation: (id: string, lat: number, lng: number) => api.put(`/drivers/${id}/location`, { lat, lng }),
};

// Passenger APIs
export const passengerAPI = {
  getAll: (params?: { city?: string }) => api.get('/passengers', { params }),
};

// Ride APIs
export const rideAPI = {
  getNearbyDrivers: (lat: number, lng: number, vehicle_type: string, city: string) =>
    api.get('/rides/nearby-drivers', { params: { lat, lng, vehicle_type, city } }),
  estimate: (data: any) => api.post('/rides/estimate', data),
  create: (data: any) => api.post('/rides', data),
  getAll: (status?: string) => api.get('/rides', { params: { status } }),
  accept: (id: string) => api.put(`/rides/${id}/accept`),
  updateStatus: (id: string, status: string) => api.put(`/rides/${id}/status`, { status }),
  rate: (id: string, rating: number, comment?: string) => api.post(`/rides/${id}/rate`, { rating, comment }),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  createAdmin: (data: any) => api.post('/superadmin/admins', data),
  getAllAdmins: () => api.get('/superadmin/admins'),
};

// SuperAdmin APIs
export const superAdminAPI = {
  getStats: () => api.get('/superadmin/stats'),
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profile'),
};

export default api;
