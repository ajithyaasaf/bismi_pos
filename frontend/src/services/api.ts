import axios from 'axios';
import { offlineDb } from './offlineDb.js';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bismi_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle auth expiration & transparent offline caching
apiClient.interceptors.response.use(
  (response) => {
    // If fetching products, cache locally in IndexedDB
    if (response.config.url === '/products' && response.data?.success && Array.isArray(response.data.data)) {
      offlineDb.products.clear().then(() => {
        offlineDb.products.bulkPut(response.data.data);
      });
    }

    // If fetching customers, cache locally
    if (response.config.url?.startsWith('/customers') && response.data?.success && Array.isArray(response.data.data)) {
      offlineDb.customers.bulkPut(response.data.data);
    }

    return response;
  },
  async (error) => {
    // If network error (offline), attempt offline fallback
    if (!error.response && error.config) {
      if (error.config.url === '/products') {
        const cachedProducts = await offlineDb.products.toArray();
        if (cachedProducts.length > 0) {
          return { data: { success: true, data: cachedProducts, isOfflineCache: true } };
        }
      }
    }

    if (error.response?.status === 401) {
      // Clear token if invalid
      if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
        localStorage.removeItem('bismi_token');
        localStorage.removeItem('bismi_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
