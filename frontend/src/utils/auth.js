/**
 * Centralized auth token management.
 * All token access goes through this module for security audit trail.
 * Migrating to httpOnly cookies requires server-side changes (Set-Cookie headers).
 * For now this centralizes localStorage usage to a single module.
 */

const TOKEN_KEY = 'token';

export const auth = {
  getToken: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove auth token:', error);
    }
  },

  getAuthHeaders: () => {
    const token = auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  isAuthenticated: () => {
    return !!auth.getToken();
  }
};

export default auth;
