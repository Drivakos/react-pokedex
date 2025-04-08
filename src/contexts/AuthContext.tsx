import React, { createContext, useState, useEffect } from 'react';
import { 
  Session, 
  User, 
  AuthError, 
  AuthResponse,
  OAuthResponse
} from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import toast from 'react-hot-toast';

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (profile: Partial<Profile>) => Promise<{
    data: Profile | null;
    error: any | null;
  }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching session:', error);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    }).catch(err => {
      console.error('Unexpected error during session fetch:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const previousUser = user;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
          
          // Show toast notifications based on auth events
          if (event === 'SIGNED_IN' && !previousUser) {
            const username = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Trainer';
            toast.success(`Welcome, ${username}!`, {
              duration: 4000,
              icon: '👋',
              style: {
                borderRadius: '10px',
                background: '#22c55e',
                color: '#fff',
              },
            });
          } else if (event === 'USER_UPDATED') {
            toast.success('Your profile has been updated!', {
              duration: 3000,
              icon: '✅',
            });
          }
        } else {
          if (previousUser && event === 'SIGNED_OUT') {
            toast.success('You have been signed out', {
              duration: 3000,
              icon: '👋',
              style: {
                borderRadius: '10px',
                background: '#3b82f6',
                color: '#fff',
              },
            });
          }
          setProfile(null);
        }
        
        setLoading(false);
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`
        }
      });
      
      if (response.error) {
        console.error('Sign up error:', response.error);
        toast.error(response.error.message || 'Failed to sign up');
      } else if (response.data.user?.identities?.length === 0) {
        toast.error('This email is already registered');
      } else {
        toast.success('Check your email to confirm your account!');
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Try to refresh session first to clear any stale session state
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        console.log('Session refresh before login:', refreshErr);
      }
      
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        console.error('Sign in error:', response.error);
        
        if (response.error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password', {
            duration: 5000,
            style: {
              borderRadius: '10px',
              background: '#ef4444',
              color: '#fff',
            },
          });
        } else if (response.error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email before logging in', {
            duration: 5000,
            style: {
              borderRadius: '10px',
              background: '#f97316',
              color: '#fff',
            },
          });
        } else {
          toast.error(response.error.message || 'Failed to sign in');
        }
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Use the exact production URL for Google OAuth redirects
      // This must match what's configured in your Supabase dashboard and Google OAuth settings
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.VITE_SITE_URL ? `${import.meta.env.VITE_SITE_URL}/auth/callback` : `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      });
      
      if (response.error) {
        console.error('Google sign in error:', response.error);
        toast.error(response.error.message || 'Failed to sign in with Google');
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during Google sign in:', err);
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      const response = await supabase.auth.signOut();
      
      if (response.error) {
        console.error('Sign out error:', response.error);
        toast.error(response.error.message || 'Failed to sign out');
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      if (data) {
        setProfile(data as Profile);
        return { data: data as Profile, error: null };
      } else {
        return { data: null, error: new Error('No data returned from profile update') };
      }
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = import.meta.env.VITE_SITE_URL ? 
        `${import.meta.env.VITE_SITE_URL}/reset-password/confirm` : 
        `${window.location.origin}/reset-password/confirm`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error('Reset password error:', error);
        toast.error(error.message || 'Failed to send reset password email');
      } else {
        toast.success('Check your email for password reset instructions', {
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: '#22c55e',
            color: '#fff',
          },
        });
      }
      
      return { error };
    } catch (err) {
      console.error('Unexpected error during password reset:', err);
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const redirectUrl = import.meta.env.VITE_SITE_URL ? 
        `${import.meta.env.VITE_SITE_URL}/auth/callback` : 
        `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        console.error('Magic link error:', error);
        toast.error(error.message || 'Failed to send magic link');
      } else {
        toast.success('Check your email for the magic link', {
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: '#22c55e',
            color: '#fff',
          },
        });
      }
      
      return { error };
    } catch (err) {
      console.error('Unexpected error during magic link login:', err);
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
