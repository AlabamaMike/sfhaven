import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.sfhaven.org/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_id');
    }
    return Promise.reject(error);
  }
);

export default api;

export const endpoints = {
  // Auth
  anonymousAuth: '/auth/anonymous',
  register: '/auth/register',
  login: '/auth/login',

  // Services
  services: '/services',
  serviceDetail: (id) => `/services/${id}`,
  offlineBundle: '/services/offline-bundle',

  // Parking
  parkingZones: '/parking/zones',
  parkingCheck: '/parking/check',
  parkingReport: '/parking/report',
  parkingAlerts: '/parking/alerts',

  // Emergency
  emergencyNearest: '/emergency/nearest',
  emergencyHotlines: '/emergency/hotlines',

  // Housing
  housingApplications: '/housing/applications',
  housingResources: '/housing/resources',
};
