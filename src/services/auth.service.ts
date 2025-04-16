import { Session, User, AuthResponse, OAuthResponse, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/supabase';
import toast from 'react-hot-toast';

/**
 * AuthService provides a clean abstraction over Supabase authentication.
 * This service handles all authentication-related operations and ensures
 * proper session management.
 */
export class AuthService {
  /**
   * Get the current session
   * @returns Promise with the current session or null
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get the current user
   * @returns Promise with the current user or null
   */
  async getUser(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Set the session with access_token and refresh_token
   * @param session Session object containing access_token and refresh_token
   * @returns AuthResponse with the session
   */
  async setSession(session: { access_token: string, refresh_token: string }): Promise<AuthResponse> {
    return await supabase.auth.setSession(session);
  }

  /**
   * Exchange code from OAuth for a session
   * @param code The authorization code from OAuth provider
   * @returns AuthResponse with the session
   */
  async exchangeCodeForSession(code: string): Promise<AuthResponse> {
    return await supabase.auth.exchangeCodeForSession(code);
  }

  /**
   * Get the current session
   * This is a lightweight method that just returns the current session
   * instead of refreshing it, since Supabase handles refreshing automatically
   * 
   * @returns The current session or null if not authenticated
   */
  async refreshSession(): Promise<Session | null> {
    try {
      // Simply get the current session without refreshing
      // This avoids rate limits while maintaining compatibility with existing code
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Sign in with email and password
   * @param email User's email
   * @param password User's password
   * @returns Auth response with session and user data
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    const response = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (response.error) {
      toast.error(response.error.message || 'Failed to sign in');
    } else if (response.data.session) {
      toast.success(`Welcome back!`);
      // Ensure we have a fresh session token
      await this.refreshSession();
    }
    
    return response;
  }

  /**
   * Sign up with email and password
   * @param email User's email
   * @param password User's password
   * @returns Auth response with session and user data
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const response = await supabase.auth.signUp({
      email,
      password
    });
    
    if (response.error) {
      toast.error(response.error.message || 'Failed to sign up');
    } else if (response.data.user) {
      toast.success('Check your email to confirm your account!');
    }
    
    return response;
  }

  /**
   * Sign in with Google OAuth
   * @returns OAuth response
   */
  async signInWithGoogle(): Promise<OAuthResponse> {
    const redirectUrl = window.location.origin + '/auth/callback';
    
    const response = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      }
    });
    
    if (response.error) {
      toast.error(response.error.message || 'Failed to sign in with Google');
    }
    
    return response;
  }

  /**
   * Sign in with Magic Link (passwordless)
   * @param email User's email
   * @returns Auth response
   */
  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    const response = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (response.error) {
      toast.error(response.error.message || 'Failed to send magic link');
    } else {
      toast.success('Check your email for the magic link!');
    }
    
    return response;
  }

  /**
   * Sign out the current user
   * @returns Object containing any error that occurred
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message || 'Failed to sign out');
        return { error };
      }
      
      toast.success('You have been signed out');
      return { error: null };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  }

  /**
   * Reset password
   * @param email User's email
   * @returns Object containing any error that occurred
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      });
      
      if (error) {
        toast.error(error.message || 'Failed to send password reset email');
        return { error };
      }
      
      toast.success('Check your email for password reset instructions');
      return { error: null };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  }

  /**
   * Update password
   * @param password New password
   * @returns Object containing any error that occurred
   */
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) {
        toast.error(error.message || 'Failed to update password');
        return { error };
      }
      
      toast.success('Password updated successfully');
      return { error: null };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  }

  /**
   * Setup an auth state change listener
   * @param callback Function to call when auth state changes
   * @returns Subscription that can be used to unsubscribe
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange((event, session) => {
      // Let Supabase handle auth state changes
      // We just pass the events to the caller
      
      // Call the provided callback
      callback(event, session);
    });
  }

  /**
   * Fetch a user's profile from the database
   * @param userId The user ID to fetch the profile for
   * @returns The user profile or null
   */
  async fetchProfile(userId: string): Promise<Profile | null> {
    // Ensure we have a fresh session before database operations
    await this.refreshSession();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Create or update a user's profile
   * @param profile The profile data to create or update
   * @returns The created/updated profile or null
   */
  async updateProfile(profile: Partial<Profile>): Promise<Profile | null> {
    // Ensure we have a fresh session
    await this.refreshSession();
    
    try {
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      
      const updates = {
        ...profile,
        id: profile.id || userData.user.id,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(updates)
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      return data as Profile;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return null;
    }
  }

  /**
   * Ensure a profile exists for a user
   * @param userId The user ID to ensure a profile for
   * @param email Optional email for the profile
   * @returns void
   */
  async ensureProfile(userId: string, email?: string): Promise<void> {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Failed to ensure profile:', error);
    }
  }


}

// Create a singleton instance of the auth service
export const authService = new AuthService();

/**
 * Wrapper for database operations that checks for an active session
 * @param operation Function that performs a database operation
 * @returns The result of the operation or an error
 */
export async function withAuthSession<T>(operation: () => Promise<T>): Promise<{ data: T | null, error: any | null }> {
  // Just get the current session without refreshing since Supabase handles this automatically
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return { data: null, error: new Error('Authentication required') };
  }
  
  try {
    const result = await operation();
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export default authService;
