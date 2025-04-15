import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, Favorite } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { AuthMethods } from './AuthMethods';
import { ProfileMethods } from './ProfileMethods';
import { FavoritesMethods } from './FavoritesMethods';
import { TeamsMethods } from './TeamsMethods';
import { useSessionRefresher } from './useSessionRefresher';

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
  const [loading, setLoading] = useState(true);
  const { refreshSession } = useSessionRefresher();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  
  const profileMethods = ProfileMethods({
    user,
    refreshSession,
    setProfile
  });
  
  const { createProfile, refreshProfile } = profileMethods;
  
  const favoritesMethods = FavoritesMethods({
    user,
    refreshSession,
    favorites,
    setFavorites
  });
  
  const { fetchFavorites } = favoritesMethods;
  
  const teamsMethods = TeamsMethods({
    user,
    refreshSession,
    teams,
    setTeams
  });
  
  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setTeams([]);
  };
  
  const initProfile = async (userId: string) => {
    try {
      await createProfile(userId);
      await refreshProfile(userId);
      await fetchFavorites();
      await teamsMethods.fetchTeams();
    } catch (error) {
      console.error("Profile initialization error:", error);
    }
  };
  
  const authMethods = AuthMethods({ 
    setSession, 
    setUser, 
    resetAuthState,
    createProfile,
    refreshProfile,
    fetchFavorites,
    fetchTeams: teamsMethods.fetchTeams
  });

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
          setSession(data.session);
          setUser(data.session.user);

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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        const previousUser = user;
        
        try {
          if (session) {
            localStorage.setItem('supabase.auth.token', JSON.stringify(session));
          } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('supabase.auth.token');
          }
          
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
  
  const value = {
    session,
    user,
    profile,
    loading,
    teams,
    fetchTeams: teamsMethods.fetchTeams,
    createTeam: teamsMethods.createTeam,
    updateTeam: teamsMethods.updateTeam,
    deleteTeam: teamsMethods.deleteTeam,
    addPokemonToTeam: teamsMethods.addPokemonToTeam,
    removePokemonFromTeam: teamsMethods.removePokemonFromTeam,
    getTeamMembers: teamsMethods.getTeamMembers,
    ...authMethods,
    ...profileMethods,
    ...favoritesMethods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

