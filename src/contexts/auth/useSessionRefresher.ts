import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Custom hook for refreshing the Supabase session
 * Provides a consistent way to refresh sessions before performing authenticated operations
 */
export const useSessionRefresher = () => {
  const [refreshing, setRefreshing] = useState(false);

  const refreshSession = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        toast.error('Your session has expired. Please sign in again.');
        return { success: false, session: null, error };
      }
      
      if (!data.session) {
        toast.error('Authentication error. Please sign in again.');
        return { success: false, session: null, error: new Error('No session found') };
      }
      
      return { success: true, session: data.session, error: null };
    } catch (err) {
      console.error('Unexpected error during session refresh:', err);
      toast.error('An unexpected error occurred. Please try again.');
      return { success: false, session: null, error: err };
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshSession,
    refreshing
  };
};
