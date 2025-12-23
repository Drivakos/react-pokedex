import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
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
  FavoritesMethods {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
  loading: boolean;

  // Team methods
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<any>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<any[]>;
  updateTeamMemberBuild: (teamId: number, position: number, buildData: Partial<any>) => Promise<void>;
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


  
  // Memoize all methods for stable references
  const profileMethods = useMemo(() => ProfileMethods({
    user,
    refreshSession,
    setProfile
  }), [user, refreshSession, setProfile]);

  const { createProfile, refreshProfile } = profileMethods;

  const favoritesMethods = useMemo(() => FavoritesMethods({
    user,
    refreshSession,
    favorites,
    setFavorites
  }), [user, refreshSession, favorites, setFavorites]);

  const { fetchFavorites } = favoritesMethods;
  
  // Memoize methods to ensure stable references (React best practice)
  const teamsMethods = useMemo(() => TeamsMethods({
    user,
    refreshSession,
    teams,
    setTeams
  }), [user, refreshSession]); // Removed teams and setTeams from deps to avoid unnecessary recreation

  // Use direct references to maintain proper typing
  const addPokemonToTeam = teamsMethods?.addPokemonToTeam;
  const removePokemonFromTeam = teamsMethods?.removePokemonFromTeam;
  const getTeamMembers = teamsMethods?.getTeamMembers;
  const updateTeamMemberBuild = teamsMethods?.updateTeamMemberBuild;
  const fetchTeams = teamsMethods?.fetchTeams;
  const createTeam = teamsMethods?.createTeam;
  const updateTeam = teamsMethods?.updateTeam;
  const deleteTeam = teamsMethods?.deleteTeam;


  
  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setTeams([]);
  };
  
  const initProfile = useCallback(async (userId: string) => {
    try {
      await createProfile(userId);
      await refreshProfile(userId);

      // Fetch favorites directly
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (!favoritesError && favoritesData) {
        setFavorites(favoritesData);
      }

      // Fetch teams directly
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!teamsError && teamsData) {
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Profile initialization error:", error);
    }
  }, [createProfile, refreshProfile]);
  
  const authMethods = useMemo(() => AuthMethods({
    setSession,
    setUser,
    resetAuthState,
    createProfile,
    refreshProfile,
    fetchFavorites,
    fetchTeams: teamsMethods.fetchTeams
  }), [
    setSession,
    setUser,
    resetAuthState,
    createProfile,
    refreshProfile,
    fetchFavorites,
    teamsMethods.fetchTeams
  ]);

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
        if (event === 'SIGNED_IN' && session) {
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
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // Simple context value - no complex memoization needed
  const value = {
    session,
    user,
    profile,
    loading,
    favorites,
    teams,
    // Use locally bound function references
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    updateTeamMemberBuild,
    ...authMethods,
    ...profileMethods,
    ...favoritesMethods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
