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
      setLoading(true);
      console.log('Initializing authentication...');
      
      try {
        // Let Supabase handle session retrieval - this is the recommended approach
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        console.log('Server session check result:', data.session ? 'Active session' : 'No session');
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // Fetch profile and favorites data
          await fetchProfile(data.session.user.id);
          await fetchFavorites(data.session.user.id);
        } else {
          // No active session
          setSession(null);
          setUser(null);
          setProfile(null);
          setFavorites([]);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Reset state on error
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
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        const previousUser = user;
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in event detected');
            if (session) {
              setSession(session);
              setUser(session.user);
              
              // Ensure profile exists and fetch user data
              await createProfile(session.user.id);
              await fetchProfile(session.user.id);
              await fetchFavorites(session.user.id);
              
              // Welcome message if this is a new login (not a refresh)
              if (!previousUser) {
                const username = session.user.user_metadata?.full_name || 
                               session.user.user_metadata?.name ||
                               session.user.email?.split('@')[0] || 
                               'Trainer';
                toast.success(`Welcome, ${username}!`);
              }
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('User signed out event detected');
            // Clear all states
            setSession(null);
            setUser(null);
            setProfile(null);
            setFavorites([]);
            
            // Only show toast if there was a previous user (not on initial load)
            if (previousUser) {
              toast.success('You have been signed out');
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed event detected');
            if (session) {
              setSession(session);
              setUser(session.user);
            }
            break;
            
          case 'USER_UPDATED':
            console.log('User updated event detected');
            if (session) {
              setUser(session.user);
              await fetchProfile(session.user.id);
            }
            break;
        }
        
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const createProfile = async (userId: string) => {
    try {
      // First check if profile already exists to avoid duplicates
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If profile exists, set it and return early
      if (existingProfile && !fetchError) {
        console.log('Profile already exists for user:', userId);
        setProfile(existingProfile as Profile);
        return;
      }
      
      // If error is not 'no rows returned', handle it
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing profile:', fetchError);
        return;
      }

      console.log('Creating new profile for user:', userId);
      
      // Get current user data
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('No user found when creating profile');
        return;
      }
      
      // Create new profile with all available user metadata
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
        console.error('Error creating profile:', error);
        throw error;
      }
      
      if (data) {
        console.log('Profile created successfully:', data);
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
      // First refresh the session to prevent stale state issues
      await supabase.auth.refreshSession();
      
      // Use dynamic redirect URL based on environment
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Google OAuth redirect URL:', redirectUrl);
      
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // Proper scopes for Google OAuth
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          queryParams: {
            // Request offline access to get refresh token
            access_type: 'offline',
            // Force consent screen to ensure refresh token
            prompt: 'consent',
          }
        },
      });
      
      if (response.error) {
        console.error('Google OAuth error:', response.error);
        toast.error(response.error.message || 'Failed to sign in with Google');
      } else if (response.data?.url) {
        // Clear any old auth data before redirecting
        localStorage.removeItem('supabase.auth.token');
        
        // Redirect to the OAuth provider
        console.log('Redirecting to Google OAuth URL...');
        window.location.href = response.data.url;
      } else {
        console.error('No URL returned from OAuth provider');
        toast.error('Failed to initialize Google login');
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error during Google OAuth:', err);
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
