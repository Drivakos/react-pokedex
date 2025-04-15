import { AuthResponse, OAuthResponse, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

type AuthMethodsProps = {
  setSession: (session: any) => void;
  setUser: (user: any) => void;
  resetAuthState: () => void;
  createProfile: (userId: string) => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchTeams: () => Promise<void>;
};

export interface AuthMethods {
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

export const AuthMethods = ({
  setSession,
  setUser,
  resetAuthState,
  createProfile,
  refreshProfile,
  fetchFavorites,
  fetchTeams
}: AuthMethodsProps): AuthMethods => {
  
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (response.error) {
        toast.error(response.error.message);
      } else if (response.data.user) {
        toast.success('Check your email to confirm your account!');
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      localStorage.removeItem('supabase.auth.token');
      
      const response = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (response.error) {
        toast.error(response.error.message);
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signInWithGoogle = async (): Promise<OAuthResponse> => {
    try {
      await supabase.auth.refreshSession();
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'
        }
      });
      
      if (response.error) {
        toast.error(response.error.message);
      } else {
        localStorage.removeItem('supabase.auth.token');
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
      } else {
        resetAuthState();
        
        const authItems = [
          'supabase.auth.token',
          'access_token',
          'refresh_token',
          'expires_at',
          'expires_in',
          'provider_token',
          'provider_refresh_token'
        ];
        
        authItems.forEach(item => localStorage.removeItem(item));
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/confirm`
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for password reset instructions');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for the magic link');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  return {
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword
  };
};
