import { AuthResponse, OAuthResponse, AuthError, Provider } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

type AuthMethodsProps = {
  setSession: (session: any) => void;
  setUser: (user: any) => void;
  resetAuthState: () => void;
  createProfile?: (userId: string) => Promise<void>;
  refreshProfile?: (userId: string) => Promise<void>;
  fetchFavorites?: () => Promise<void>;
  fetchTeams?: () => Promise<void>;
};

export interface AuthMethodsInterface {
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signInWithMagicLink: (email: string, createUser?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: (scope?: 'global' | 'local' | 'others') => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

export const AuthMethods = ({
  setSession,
  setUser,
  resetAuthState
}: AuthMethodsProps): AuthMethodsInterface => {
  
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      localStorage.removeItem('supabase.auth.token');
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
        if (response.data.session) {
          toast.success('Account created successfully! Welcome!');
          setSession(response.data.session);
          setUser(response.data.user);
          localStorage.setItem('supabase.auth.token', JSON.stringify(response.data.session));

          // Navigate to intended destination or profile
          setTimeout(() => {
            const intendedPath = localStorage.getItem('auth_redirect') || '/profile';
            localStorage.removeItem('auth_redirect');
            window.location.href = window.location.origin + intendedPath;
          }, 100);
        } else {
          // Email confirmation is enabled - user needs to check email
          toast.success('Check your email to confirm your account!');
        }
      }

      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { data: { user: null, session: null }, error: err as AuthError };
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
      } else if (response.data.session) {
        setSession(response.data.session);
        setUser(response.data.user);
        localStorage.setItem('supabase.auth.token', JSON.stringify(response.data.session));
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      return { data: { user: null, session: null }, error: err as AuthError };
    }
  };

  const signInWithGoogle = async (): Promise<OAuthResponse> => {
    try {
      localStorage.removeItem('supabase.auth.token');
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to sign in with Google');
      } else if (response.data?.url) {
        // Use location.replace for OAuth redirects to avoid CSP issues
        window.location.replace(response.data.url);
      } else {
        toast.error('Failed to initialize Google login');
      }

      return response;
    } catch (err) {
      toast.error('An unexpected error occurred during Google login');
      return { data: { url: null, provider: null as unknown as Provider }, error: err as AuthError };
    }
  };

  const signOut = async (scope: 'global' | 'local' | 'others' = 'global'): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut({ scope });
      
      if (error) {
        toast.error(error.message || 'Error signing out');
      } else {
        setSession(null);
        setUser(null);
        resetAuthState();
        
        const authItems = [
          'supabase.auth.token',
          'access_token',
          'refresh_token',
          'expires_at',
          'expires_in',
          'provider_token',
          'provider_refresh_token',
          'sb-' + window.location.host.split('.')[0] + '-auth-token'
        ];

        authItems.forEach(item => localStorage.removeItem(item));
        toast.success('You have been signed out');
      }
      
      return { error };
    } catch (err) {
      localStorage.removeItem('supabase.auth.token');
      resetAuthState();
      toast.error('An unexpected error occurred during sign out');
      return { error: err as AuthError };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });
      
      if (error) {
        toast.error(error.message || 'Failed to send password reset email');
      } else {
        toast.success('Check your email for password reset instructions');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred while sending the reset email');
      return { error: err as AuthError };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    try {
      if (password.length < 8) {
        return { error: { message: 'Password must be at least 8 characters long', status: 400 } as AuthError };
      }
      
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast.error(error.message || 'Failed to update password');
      } else {
        toast.success('Password updated successfully. Please sign in with your new password.');
        await signOut('global');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred while updating your password');
      return { error: err as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string, createUser = true): Promise<{ error: AuthError | null }> => {
    try {
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: createUser,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        toast.error(error.message || 'Failed to send magic link');
      } else {
        toast.success('Check your email for the magic link');
      }
      
      return { error };
    } catch (err) {
      toast.error('An unexpected error occurred while sending the magic link');
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
