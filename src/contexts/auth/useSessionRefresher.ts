import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Custom hook for refreshing the Supabase session
 * Provides a consistent way to refresh sessions before performing authenticated operations
 */
export const useSessionRefresher = () => {
  const [refreshing, setRefreshing] = useState(false);
  
  const refreshSession = useCallback(async () => {
    if (refreshing) return { success: false, session: null };
    
    try {
      setRefreshing(true);
      
      // Try to get the current session first
      const { data: currentData } = await supabase.auth.getSession();
      
      // If there's no active session, return early
      if (!currentData.session) {
        console.log('No active session to refresh');
        return { success: false, session: null };
      }
      
      // Check if session needs refresh (if expires in less than 10 mins)
      const expiresAt = currentData.session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = expiresAt - now;
      
      // Only refresh if needed (< 10 mins to expiry)
      if (timeToExpiry > 600) {
        console.log('Session still valid, no refresh needed');
        return { success: true, session: currentData.session };
      }
      
      console.log('Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error.message);
        toast.error('Your session has expired. Please sign in again.');
        return { success: false, session: null };
      }
      
      // Persist the refreshed session to localStorage
      if (data.session) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      }
      
      return { success: true, session: data.session, error: null };
    } catch (err) {
      console.error('Unexpected error during session refresh:', err);
      toast.error('An unexpected error occurred. Please try again.');
      return { success: false, session: null, error: err };
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);
  
  const clearSession = useCallback(() => {
    // Clear any stored session data
    localStorage.removeItem('supabase.auth.token');
    // Also clear other potential auth items
    const authItemsToRemove = [
      'access_token',
      'refresh_token',
      'expires_at',
      'expires_in',
      'provider_token',
      'provider_refresh_token',
      'user'
    ];
    
    authItemsToRemove.forEach(item => {
      if (localStorage.getItem(item)) {
        localStorage.removeItem(item);
      }
    });
  }, []);
  
  return {
    refreshSession,
    clearSession,
    refreshing
  };
};
