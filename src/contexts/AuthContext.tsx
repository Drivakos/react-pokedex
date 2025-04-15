import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User, AuthError, AuthResponse, OAuthResponse } from '@supabase/supabase-js';
import { supabase, Profile, Favorite } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
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
  addFavorite: (pokemonId: number) => Promise<void>;
  removeFavorite: (pokemonId: number) => Promise<void>;
  isFavorite: (pokemonId: number) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
          const expiresAt = data.session.expires_at || 0;
          const now = Math.floor(Date.now() / 1000);
          const timeToExpiry = expiresAt - now;
          
          if (timeToExpiry < 600) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;
            
            setSession(refreshData.session);
            setUser(refreshData.session?.user ?? null);
          } else {
            setSession(data.session);
            setUser(data.session.user);
          }
          

          if (data.session.user) {
            await fetchProfile(data.session.user.id);
            await fetchFavorites(data.session.user.id);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setFavorites([]);
        }
      } catch (err) {
      
        setSession(null);
        setUser(null);
        setProfile(null);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const previousUser = user;
        
        try {
          switch (event) {
            case 'SIGNED_IN':
              if (session) {
                setSession(session);
                setUser(session.user);
                setLoading(true);
                
                try {
                  await Promise.all([
                    createProfile(session.user.id),
                    fetchProfile(session.user.id),
                    fetchFavorites(session.user.id)
                  ]);
                  
                  if (!previousUser) {
                    const username = session.user.user_metadata?.full_name || 
                                  session.user.user_metadata?.name ||
                                  session.user.email?.split('@')[0] || 
                                  'Trainer';
                    toast.success(`Welcome, ${username}!`);
                  }
                } catch (error) {
                  toast.error('Signed in, but error loading profile data');
                } finally {
                  setLoading(false);
                }
              }
              break;
              
            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setProfile(null);
              setFavorites([]);
              
              if (previousUser) {
                toast.success('You have been signed out');
              }
              break;
              
            case 'TOKEN_REFRESHED':
              if (session) {
                setSession(session);
                setUser(session.user);
                
                const expiresAt = session.expires_at || 0;
              }
              break;
              
            case 'USER_UPDATED':
              if (session) {
                setUser(session.user);
                await fetchProfile(session.user.id);
              }
              break;
              
            case 'PASSWORD_RECOVERY':
              toast.success('Please follow the instructions to reset your password');
              break;
          }
        } catch (err) {
          return;
        } finally {
          setLoading(false);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const createProfile = async (userId: string) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();


      if (existingProfile && !fetchError) {

        setProfile(existingProfile as Profile);
        return;
      }
      

      if (fetchError && fetchError.code !== 'PGRST116') {

        return;
      }


      

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {

        return;
      }
      

      const newProfile = {
        id: userId,
        email: userData.user.email,
        full_name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name,
        username: userData.user.email?.split('@')[0] || `user_${Date.now().toString().slice(-6)}`,
        avatar_url: userData.user.user_metadata?.avatar_url || userData.user.user_metadata?.picture,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();
        
      if (error) {

        throw error;
      }
      
      if (data) {

        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Profile creation error:', err);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          await createProfile(userId);
        }
        return;
      }
      
      if (data) setProfile(data as Profile);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const response = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            signed_up_at: new Date().toISOString()
          }
        }
      });
      
      if (response.error) {
        if (response.error.message.includes('password')) {
          toast.error('Password must be at least 6 characters');
        } else if (response.error.message.includes('email')) {
          toast.error('Please provide a valid email address');
        } else {
          toast.error(response.error.message || 'Failed to sign up');
        }
      } else if (response.data.user?.identities?.length === 0) {
        toast.error('This email is already registered');
      } else {
        toast.success('Check your email to confirm your account!');
      }
      
      return response;
    } catch (err) {

      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      localStorage.removeItem('supabase.auth.token');
      
      const response = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (response.error) {
        if (response.error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (response.error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email before logging in');
        } else if (response.error.message.includes('rate limit')) {
          toast.error('Too many login attempts. Please try again later.');
        } else {
          toast.error(response.error.message || 'Failed to sign in');
        }
      }
      
      return response;
    } catch (err) {

      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      // First refresh the session to prevent stale state issues
      await supabase.auth.refreshSession();
      
      // Use dynamic redirect URL based on environment
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Google OAuth redirect URL:', redirectUrl);
      
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
        localStorage.removeItem('supabase.auth.token');
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to initialize Google login');
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred during login');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase (this will clear the session)      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign out:', error);
        toast.error(error.message || 'Failed to sign out');
        return { error };
      }
      
      // Clear all state
      setSession(null);
      setUser(null);
      setProfile(null);
      setFavorites([]);
      
      // Clear any legacy or custom localStorage items that might be causing issues
      const authItemsToRemove = [
        // Standard Supabase items
        'supabase.auth.token',
        // Custom stored items
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
      
      toast.success('You have been signed out');
      
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
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

      if (error) return { data: null, error };
      if (data) {
        setProfile(data as Profile);
        return { data: data as Profile, error: null };
      }
      return { data: null, error: new Error('No data returned from profile update') };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password/confirm`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        captchaToken: undefined
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many reset attempts. Please try again later.');
        } else {
          toast.success('If your email is registered, you will receive reset instructions shortly');
        }
      } else {
        toast.success('Check your email for password reset instructions');
      }
      
      return { error };
    } catch (err) {

      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) toast.success('Password updated successfully');
      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      localStorage.removeItem('supabase.auth.token');
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
          data: {
            last_magic_link_request: new Date().toISOString()
          }
        },
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('You have requested too many magic links. Please try again later.');
        } else if (error.message.includes('not found')) {
          toast.success('If your email is registered, you will receive a magic link shortly');
        } else {
          toast.error(error.message || 'Failed to send magic link');
        }
      } else {
        toast.success('Check your email for the magic link');
      }
      
      return { error };
    } catch (err) {

      toast.error('An unexpected error occurred');
      return { error: err as AuthError };
    }
  };

  const fetchFavorites = async (userId: string) => {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session when fetching favorites:', refreshError);
        return;
      }
      
      if (!refreshData.session) {
        console.error('No active session found when fetching favorites');
        return;
      }


      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) {

        return;
      }
      
      if (data) setFavorites(data as Favorite[]);
    } catch (err) {
      console.error('Favorites fetch error:', err);
    }
  };

  const addFavorite = async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to add favorites');
      return;
    }

    try {

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
            toast.error('Session expired. Please sign in again.');
        return;
      }
      
      if (!refreshData.session) {
            toast.error('Authentication error. Please sign in again.');
        return;
      }
      
      

      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, pokemon_id: pokemonId }]);

      if (error) {

        if (error.code === '23505') {
          toast.error('This Pokémon is already in your favorites');
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to add favorites. Please sign in again.');
        } else {
          toast.error('Failed to add to favorites');
        }
        return;
      }

      await fetchFavorites(user.id);
      toast.success('Added to favorites!');
    } catch (err) {
      toast.error('Failed to add to favorites');
    }
  };

  const removeFavorite = async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    try {

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
            toast.error('Session expired. Please sign in again.');
        return;
      }
      
      if (!refreshData.session) {
            toast.error('Authentication error. Please sign in again.');
        return;
      }
      
      

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_id', pokemonId);

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to remove favorites. Please sign in again.');
        } else {
          toast.error('Failed to remove from favorites');
        }
        return;
      }

      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      toast.success('Removed from favorites');
    } catch (err) {
      toast.error('Failed to remove from favorites');
    }
  };

  const isFavorite = (pokemonId: number): boolean => {
    return favorites.some(fav => fav.pokemon_id === pokemonId);
  };

  const value = {
    session,
    user,
    profile,
    favorites,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    addFavorite,
    removeFavorite,
    isFavorite
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
