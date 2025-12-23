/**
 * Custom storage adapter for Supabase Auth
 * Uses HttpOnly cookies in production, localStorage in development
 */

const IS_SERVER_SIDE = typeof window === 'undefined';


/**
 * LocalStorage wrapper with security warnings
 */
const SecureLocalStorage = {
  getItem: (key: string): string | null => {
    if (IS_SERVER_SIDE) return null;
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage access failed:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (IS_SERVER_SIDE) return;
    
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('LocalStorage write failed:', error);
    }
  },

  removeItem: (key: string): void => {
    if (IS_SERVER_SIDE) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage remove failed:', error);
    }
  }
};

/**
 * Smart storage adapter that chooses the best storage method
 *
 * Production: Cookies (more secure, HttpOnly possible with server setup)
 * Development: localStorage (easier to debug, no HTTPS requirement)
 *
 * IMPORTANT: For PKCE flow to work properly, ALL Supabase auth keys must be in localStorage.
 * Custom storage adapters can break PKCE if not handled correctly.
 */
export const authStorage = {
  getItem: (key: string): string | null => {
    // ALL Supabase auth keys must be in localStorage for PKCE to work properly
    // The custom cookie/localStorage hybrid approach breaks PKCE flow
    return SecureLocalStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    // ALL Supabase auth keys must be in localStorage for PKCE to work properly
    SecureLocalStorage.setItem(key, value);
  },

  removeItem: (key: string): void => {
    // ALL Supabase auth keys must be removed from localStorage
    SecureLocalStorage.removeItem(key);
  }
};

/**
 * Get the auth storage adapter
 * Now uses localStorage for all keys to ensure PKCE flow works correctly
 */
export const getAuthStorage = () => {
  return authStorage;
};

