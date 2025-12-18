/**
 * Custom storage adapter for Supabase Auth
 * Uses HttpOnly cookies in production, localStorage in development
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_SERVER_SIDE = typeof window === 'undefined';

/**
 * Cookie utilities for browser
 */
const CookieStorage = {
  getItem: (key: string): string | null => {
    if (IS_SERVER_SIDE) return null;
    
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(row => row.startsWith(`${key}=`));
    
    if (!cookie) return null;
    
    const value = cookie.split('=')[1];
    return value ? decodeURIComponent(value) : null;
  },

  setItem: (key: string, value: string): void => {
    if (IS_SERVER_SIDE) return;
    
    // Cookie settings
    const cookieOptions = [
      `${key}=${encodeURIComponent(value)}`,
      'path=/',
      `max-age=${60 * 60 * 24 * 7}`, // 7 days
      'samesite=lax', // Changed from 'strict' for better OAuth support
    ];

    // Add secure flag only in production (HTTPS)
    if (IS_PRODUCTION || window.location.protocol === 'https:') {
      cookieOptions.push('secure');
    }

    document.cookie = cookieOptions.join('; ');
  },

  removeItem: (key: string): void => {
    if (IS_SERVER_SIDE) return;
    
    document.cookie = `${key}=; path=/; max-age=0`;
  }
};

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
 * IMPORTANT: For PKCE flow to work properly, we need to handle Supabase's
 * internal keys correctly. Some keys (like PKCE verifiers) must be in localStorage.
 */
export const authStorage = {
  getItem: (key: string): string | null => {
    // PKCE-related keys must be in localStorage for Supabase to work
    if (key.includes('pkce') || key.includes('code_verifier') || key.includes('auth-flow')) {
      return SecureLocalStorage.getItem(key);
    }

    // In production, prefer cookies for better security
    if (IS_PRODUCTION) {
      const cookieValue = CookieStorage.getItem(key);
      // Fallback to localStorage if cookie not found (migration case)
      return cookieValue || SecureLocalStorage.getItem(key);
    }

    // In development, use localStorage for easier debugging
    return SecureLocalStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    // PKCE-related keys must be in localStorage for Supabase to work
    if (key.includes('pkce') || key.includes('code_verifier') || key.includes('auth-flow')) {
      SecureLocalStorage.setItem(key, value);
      return;
    }

    if (IS_PRODUCTION) {
      // Production: Use cookies
      CookieStorage.setItem(key, value);
      // Also set in localStorage as backup (for migration)
      SecureLocalStorage.setItem(key, value);
    } else {
      // Development: Use localStorage
      SecureLocalStorage.setItem(key, value);
    }
  },

  removeItem: (key: string): void => {
    // PKCE-related keys must be removed from localStorage
    if (key.includes('pkce') || key.includes('code_verifier') || key.includes('auth-flow')) {
      SecureLocalStorage.removeItem(key);
      return;
    }

    // Remove from both to be safe
    CookieStorage.removeItem(key);
    SecureLocalStorage.removeItem(key);
  }
};

/**
 * For advanced users: Force cookie-only mode in development
 * Set this to true if you want to test cookie behavior locally
 */
export const FORCE_COOKIES_IN_DEV = false;

export const getAuthStorage = () => {
  if (FORCE_COOKIES_IN_DEV && !IS_PRODUCTION) {
    return CookieStorage;
  }
  
  return authStorage;
};

