// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// Auth API functions
export const authApi = {
  login: (credentials: LoginRequest) => 
    api.post('/api/auth/login/', credentials),
  
  logout: () => 
    api.post('/api/auth/logout/'),
  
  getProfile: () => 
    api.get('/api/auth/user/'),
  
  register: (userData: any) => 
    api.post('/api/auth/register/', userData),
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh/logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;