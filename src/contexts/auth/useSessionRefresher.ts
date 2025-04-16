import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import authService from '../../services/auth.service';

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
      const currentSession = await authService.getSession();
      
      // If there's no active session, return early
      if (!currentSession) {
        console.log('No active session to refresh');
        return { success: false, session: null };
      }
      
      // Check if session needs refresh (if expires in less than 10 mins)
      const expiresAt = currentSession.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = expiresAt - now;
      
      // Only refresh if needed (< 10 mins to expiry)
      if (timeToExpiry > 600) {
        console.log('Session still valid, no refresh needed');
        return { success: true, session: currentSession };
      }
      
      console.log('Refreshing session...');
      const refreshedSession = await authService.refreshSession();
      
      if (!refreshedSession) {
        console.error('Session refresh failed');
        toast.error('Your session has expired. Please sign in again.');
        return { success: false, session: null };
      }
      
      return { success: true, session: refreshedSession, error: null };
    } catch (err) {
      console.error('Unexpected error during session refresh:', err);
      toast.error('An unexpected error occurred. Please try again.');
      return { success: false, session: null, error: err };
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);
  
  const clearSession = useCallback(async () => {
    // Use the auth service to sign out, which properly cleans up the session
    await authService.signOut();
  }, []);
  
  return {
    refreshSession,
    clearSession,
    refreshing
  };
};
