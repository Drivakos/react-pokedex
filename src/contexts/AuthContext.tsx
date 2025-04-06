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
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        console.error('Sign in error:', response.error);
        toast.error(response.error.message || 'Failed to sign in');
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    // Use the default Supabase redirect handling for Google OAuth
    // This will use the redirect URL configured in Supabase dashboard
    // which should match what's in Google Cloud Console
    const response = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Let Supabase handle the redirect URL
        // This will use what's configured in the Supabase dashboard
      },
    });
    
    return response;
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/reset-password/confirm`,
      });
      
      return { error };
    } catch (err) {
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`,
        },
      });
      
      if (error) {
        toast.error(error.message || 'Failed to send magic link');
      } else {
        toast.success('Check your email for the magic link');
      }
      
      return { error };
    } catch (err) {
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
