import { supabase } from './supabase';
import toast from 'react-hot-toast';

/**
 * Utility function to check if there's a valid session
 * Following Supabase's official patterns to check authentication state
 * 
 * @returns True if there's a valid session, false otherwise
 */
export async function checkSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error checking session:', error);
      return false;
    }
    return !!data.session;
  } catch (error) {
    console.error('Unexpected error checking session:', error);
    return false;
  }
}

/**
 * Wrapper for database operations that checks for an active session
 * This follows Supabase's patterns for authenticated operations
 */
export const withSession = async <T>(operation: () => Promise<T>) => {
  try {
    // Check if we have a valid session first
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      toast.error('Authentication required');
      return { data: null, error: new Error('Authentication required') };
    }
    
    // Proceed with the operation if we have a session
    const result = await operation();
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in withSession:', error);
    return { data: null, error };
  }
};
