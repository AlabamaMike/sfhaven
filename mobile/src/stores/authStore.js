import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { endpoints } from '../config/api';

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  isAnonymous: false,
  userId: null,
  loading: true,

  initializeAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const isAnonymous = await AsyncStorage.getItem('is_anonymous');

      if (token && userId) {
        set({
          isAuthenticated: true,
          userId,
          isAnonymous: isAnonymous === 'true',
          loading: false,
        });
      } else {
        // Create anonymous user
        await get().loginAnonymous();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  loginAnonymous: async () => {
    try {
      const response = await api.post(endpoints.anonymousAuth);
      const { anonymous_id, access_token } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user_id', anonymous_id);
      await AsyncStorage.setItem('is_anonymous', 'true');

      set({
        isAuthenticated: true,
        isAnonymous: true,
        userId: anonymous_id,
        loading: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Anonymous login error:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  register: async (phoneNumber, pin) => {
    try {
      const response = await api.post(endpoints.register, {
        phone_number: phoneNumber,
        pin,
      });

      const { user_id, access_token } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user_id', user_id);
      await AsyncStorage.setItem('is_anonymous', 'false');

      set({
        isAuthenticated: true,
        isAnonymous: false,
        userId: user_id,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  login: async (phoneNumber, pin) => {
    try {
      const response = await api.post(endpoints.login, {
        phone_number: phoneNumber,
        pin,
      });

      const { user_id, access_token } = response.data;

      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user_id', user_id);
      await AsyncStorage.setItem('is_anonymous', 'false');

      set({
        isAuthenticated: true,
        isAnonymous: false,
        userId: user_id,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_id');
    await AsyncStorage.removeItem('is_anonymous');

    set({
      isAuthenticated: false,
      isAnonymous: false,
      userId: null,
    });

    // Create new anonymous user
    await get().loginAnonymous();
  },
}));
