import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { endpoints } from '../config/api';

export const useServicesStore = create((set, get) => ({
  services: [],
  savedServices: [],
  loading: false,
  error: null,
  offlineData: null,

  fetchServices: async (lat, lng, category = null, radius = 5000) => {
    set({ loading: true, error: null });
    try {
      const params = { lat, lng, radius };
      if (category) params.category = category;

      const response = await api.get(endpoints.services, { params });
      set({ services: response.data.services, loading: false });
      return { success: true, data: response.data.services };
    } catch (error) {
      // Try to load from offline cache
      const offline = await get().loadOfflineData();
      if (offline) {
        return { success: true, data: offline, offline: true };
      }

      set({
        error: error.message,
        loading: false,
        services: []
      });
      return { success: false, error: error.message };
    }
  },

  fetchServiceDetail: async (id) => {
    try {
      const response = await api.get(endpoints.serviceDetail(id));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  downloadOfflineBundle: async (lat, lng, radius = 10000) => {
    try {
      const response = await api.get(endpoints.offlineBundle, {
        params: { lat, lng, radius }
      });

      await AsyncStorage.setItem(
        'offline_services',
        JSON.stringify(response.data)
      );

      set({ offlineData: response.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  loadOfflineData: async () => {
    try {
      const data = await AsyncStorage.getItem('offline_services');
      if (data) {
        const parsed = JSON.parse(data);
        set({ offlineData: parsed, services: parsed.services });
        return parsed.services;
      }
      return null;
    } catch (error) {
      console.error('Error loading offline data:', error);
      return null;
    }
  },

  saveService: async (serviceId) => {
    const saved = get().savedServices;
    if (!saved.includes(serviceId)) {
      const updated = [...saved, serviceId];
      set({ savedServices: updated });
      await AsyncStorage.setItem('saved_services', JSON.stringify(updated));
    }
  },

  unsaveService: async (serviceId) => {
    const saved = get().savedServices;
    const updated = saved.filter(id => id !== serviceId);
    set({ savedServices: updated });
    await AsyncStorage.setItem('saved_services', JSON.stringify(updated));
  },

  loadSavedServices: async () => {
    try {
      const data = await AsyncStorage.getItem('saved_services');
      if (data) {
        set({ savedServices: JSON.parse(data) });
      }
    } catch (error) {
      console.error('Error loading saved services:', error);
    }
  },
}));
