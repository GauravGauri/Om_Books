import { create } from 'zustand';
import apiClient from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('hb_user') || 'null'),
  token: localStorage.getItem('hb_token') || null,
  currentOutlet: JSON.parse(localStorage.getItem('hb_outlet') || 'null'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data;
      const outlet = user.outlets?.[0] || null;

      localStorage.setItem('hb_token', token);
      localStorage.setItem('hb_user', JSON.stringify(user));
      if (outlet) {
        localStorage.setItem('hb_outlet', JSON.stringify(outlet));
      }

      set({
        user,
        token,
        currentOutlet: outlet,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('hb_token');
      localStorage.removeItem('hb_user');
      localStorage.removeItem('hb_outlet');
      set({ user: null, token: null, currentOutlet: null });
      window.location.href = '/login';
    }
  },

  setCurrentOutlet: (outlet) => {
    localStorage.setItem('hb_outlet', JSON.stringify(outlet));
    set({ currentOutlet: outlet });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('hb_token');
    if (!token) return;
    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      let outlet = get().currentOutlet || JSON.parse(localStorage.getItem('hb_outlet') || 'null');
      if (!outlet && user.outlets && user.outlets.length > 0) {
        outlet = user.outlets[0];
        localStorage.setItem('hb_outlet', JSON.stringify(outlet));
      }
      set({ user, currentOutlet: outlet });
      localStorage.setItem('hb_user', JSON.stringify(user));
    } catch (err) {
      get().logout();
    }
  },
}));
