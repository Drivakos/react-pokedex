import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  Session, 
  User, 
  AuthError, 
  AuthResponse,
  OAuthResponse
} from '@supabase/supabase-js';
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
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
          await fetchFavorites(data.session.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const previousUser = user;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
          await fetchFavorites(session.user.id);
          
          if (event === 'SIGNED_IN' && !previousUser) {
            const username = session.user.user_metadata?.full_name || 
                           session.user.email?.split('@')[0] || 
                           'Trainer';
            toast.success(`Welcome, ${username}!`);
          }
        } else if (previousUser && event === 'SIGNED_OUT') {
          toast.success('You have been signed out');
          setProfile(null);
          setFavorites([]);
        }
        
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [user]);

  const createProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const newProfile = {
        id: userId,
        username: userData.user.email?.split('@')[0] || `user_${Date.now().toString().slice(-6)}`,
        avatar_url: userData.user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();
        
      if (error) throw error;
      if (data) setProfile(data as Profile);
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
          emailRedirectTo: redirectUrl
        }
      });
      
      if (response.error) {
        toast.error(response.error.message || 'Failed to sign up');
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
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        if (response.error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (response.error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email before logging in');
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
      } else if (response.data.url) {
        window.location.href = response.data.url;
      }
      
      return response;
    } catch (err) {
      toast.error('An unexpected error occurred');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      const response = await supabase.auth.signOut();
      
      if (response.error) {
        toast.error(response.error.message || 'Failed to sign out');
      }
      
      return response;
    } catch (err) {
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
      });
      
      if (error) {
        toast.error(error.message || 'Failed to send reset password email');
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
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
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

  const fetchFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching favorites:', error);
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
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, pokemon_id: pokemonId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('This Pokémon is already in your favorites');
        } else {
          toast.error('Failed to add to favorites');
          console.error('Error adding favorite:', error);
        }
        return;
      }

      await fetchFavorites(user.id);
      toast.success('Added to favorites!');
    } catch (err) {
      console.error('Error in addFavorite:', err);
      toast.error('Failed to add to favorites');
    }
  };

  const removeFavorite = async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_id', pokemonId);

      if (error) {
        toast.error('Failed to remove from favorites');
        console.error('Error removing favorite:', error);
        return;
      }

      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      toast.success('Removed from favorites');
    } catch (err) {
      console.error('Error in removeFavorite:', err);
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
