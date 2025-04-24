import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, Favorite, Team } from '../../lib/supabase';
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
  teams: Team[];
  favorites: Favorite[];
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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const { refreshSession } = useSessionRefresher();

  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setTeams([]);
    setLoading(false);
  };

  const authMethods = useMemo(() => AuthMethods({ 
    setSession, 
    setUser, 
    resetAuthState 
  }), [setSession, setUser, resetAuthState]);

  const profileMethods = useMemo(() => ProfileMethods({ 
    user, 
    refreshSession, 
    setProfile 
  }), [user, refreshSession, setProfile]);
  
  const favoritesMethods = useMemo(() => FavoritesMethods({ 
    user, 
    refreshSession, 
    favorites, 
    setFavorites 
  }), [user, refreshSession, favorites, setFavorites]);
  
  const teamsMethods = useMemo(() => TeamsMethods({ 
    user, 
    refreshSession, 
    teams, 
    setTeams 
  }), [user, refreshSession, teams, setTeams]);

  const { fetchTeams, getTeamMembers } = teamsMethods;
  const { fetchFavorites, addFavorite, removeFavorite } = favoritesMethods;

  const initProfile = async (userId: string) => {
    try {
      await profileMethods.createProfile(userId);
      await profileMethods.refreshProfile(userId);
      await fetchFavorites();
      await teamsMethods.fetchTeams();
    } catch (error) {
      console.error("Profile initialization error:", error);
    }
  };

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
                  await profileMethods.refreshProfile(session.user.id);
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

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    teams,
    favorites,
    fetchTeams,
    createTeam: async (name: string, description?: string): Promise<Team | null> => {
      const result = await teamsMethods.createTeam(name, description);
      if (result && user?.id) { // Check if result is truthy (team created)
        await fetchTeams(); // Call without args 
      }
      return result;
    },
    updateTeam: async (teamId: number, name: string, description?: string): Promise<void> => {
      await teamsMethods.updateTeam(teamId, name, description);
      if (user?.id) { 
        await fetchTeams(); // Call without args
      }
    },
    deleteTeam: async (teamId: number): Promise<void> => {
      await teamsMethods.deleteTeam(teamId);
      if (user?.id) { 
        await fetchTeams(); // Call without args 
      }
    },
    addPokemonToTeam: async (teamId: number, pokemonId: number, position: number): Promise<void> => {
      await teamsMethods.addPokemonToTeam(teamId, pokemonId, position);
      if (user?.id) { 
        await fetchTeams(); // Call without args
      }
    },
    removePokemonFromTeam: async (teamId: number, position: number): Promise<void> => {
      await teamsMethods.removePokemonFromTeam(teamId, position);
      if (user?.id) { 
        await fetchTeams(); // Call without args 
      }
    },
    movePokemonPosition: async (teamId: number, sourcePosition: number, destPosition: number): Promise<void> => {
      await teamsMethods.movePokemonPosition(teamId, sourcePosition, destPosition);
      if (user?.id) { 
        await fetchTeams(); // Call without args
      }
    },
    getTeamMembers,
    fetchFavorites, 
    addFavorite, 
    removeFavorite, 
    isFavorite: (pokemonId: number): boolean => {
      return favorites.some(fav => fav.pokemon_id === pokemonId);
    },
    ...authMethods,
    ...profileMethods,
  }), [
    session, user, profile, loading, teams, favorites, 
    fetchTeams, teamsMethods, authMethods, profileMethods, favoritesMethods, 
    getTeamMembers, fetchFavorites, addFavorite, removeFavorite
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
