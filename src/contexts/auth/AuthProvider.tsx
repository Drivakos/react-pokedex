import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '../../lib/supabase';
import { AuthMethods } from './AuthMethods';
import { ProfileMethods } from './ProfileMethods';
import { FavoritesMethods } from './FavoritesMethods';
import { TeamsMethods } from './TeamsMethods';
import { useSessionRefresher } from './useSessionRefresher';

// AuthContext type
export interface AuthContextType extends
  AuthMethods,
  ProfileMethods,
  FavoritesMethods,
  TeamsMethods {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Base state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Session refresher hook
  const { refreshSession } = useSessionRefresher();

  // Initialize auth state
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
            await initProfile(data.session.user.id);
          }
        } else {
          resetAuthState();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        resetAuthState();
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Auth state change subscription
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
                
                await initProfile(session.user.id);
                
                if (!previousUser) {
                  const username = session.user.user_metadata?.full_name || 
                              session.user.user_metadata?.name ||
                              session.user.email?.split('@')[0] ||
                              'User';
                              
                  if (username) {
                    window.setTimeout(() => {
                      toast.success(`Welcome, ${username}!`);
                    }, 500);
                  }
                }
                
                setLoading(false);
              }
              break;
              
            case 'SIGNED_OUT':
              resetAuthState();
              toast.success('You have been signed out');
              break;
              
            case 'TOKEN_REFRESHED':
              if (session) {
                setSession(session);
                setUser(session.user);
              }
              break;
              
            case 'USER_UPDATED':
              if (session) {
                setSession(session);
                setUser(session.user);
                if (session.user) {
                  await refreshProfile(session.user.id);
                }
              }
              break;
              
            default:
              break;
          }
        } catch (err) {
          console.error(`Error handling auth state change '${event}':`, err);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // Reset auth state helper
  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setTeams([]);
  };
  
  // Initialize profile helper
  const initProfile = async (userId: string) => {
    try {
      await createProfile(userId);
      await refreshProfile(userId);
      await fetchFavorites();
      await fetchTeams();
    } catch (error) {
      console.error("Profile initialization error:", error);
    }
  };
  
  // Import method implementations
  const authMethods = AuthMethods({ 
    setSession, 
    setUser, 
    resetAuthState,
    createProfile,
    refreshProfile,
    fetchFavorites,
    fetchTeams
  });
  
  const profileMethods = ProfileMethods({
    user,
    refreshSession,
    setProfile
  });
  
  const [favorites, setFavorites] = useState([]);
  const favoritesMethods = FavoritesMethods({
    user,
    refreshSession,
    favorites,
    setFavorites
  });
  
  const [teams, setTeams] = useState([]);
  const teamsMethods = TeamsMethods({
    user,
    refreshSession,
    teams,
    setTeams
  });
  
  // Combine all context values
  const value = {
    session,
    user,
    profile,
    loading,
    ...authMethods,
    ...profileMethods,
    ...favoritesMethods,
    ...teamsMethods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Import toast
import toast from 'react-hot-toast';
