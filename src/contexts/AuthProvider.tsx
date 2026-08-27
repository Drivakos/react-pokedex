import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Session, User, AuthError, AuthResponse, OAuthResponse } from '@supabase/supabase-js';
import { Profile, Favorite, Team, TeamMember, TeamWithJoinedMembers } from '../lib/supabase';
import authService, { withAuthSession } from '../services/auth.service';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import {
  addTeamMemberToCollection,
  removeTeamMemberFromCollection,
  reorderTeamMembersInCollection,
  updateTeamMemberInCollection,
} from '../utils/team-collection';
import { pickTeamMemberBuild } from '../utils/team-builder';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
  teams: TeamWithJoinedMembers[];
  teamsLoaded: boolean;
  teamsError: string | null;
  loading: boolean;

  // Auth methods
  refreshSession: () => Promise<Session | null>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<OAuthResponse>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (profile: Partial<Profile>) => Promise<{
    data: Profile | null;
    error: Error | null;
  }>;

  // Favorites methods
  addFavorite: (pokemonId: number) => Promise<void>;
  removeFavorite: (pokemonId: number) => Promise<void>;
  isFavorite: (pokemonId: number) => boolean;

  // Team methods
  fetchTeams: () => Promise<boolean>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<boolean>;
  deleteTeam: (teamId: number) => Promise<boolean>;
  addPokemonToTeam: (
    teamId: number,
    pokemonId: number,
    position: number,
    buildData?: Partial<TeamMember>,
  ) => Promise<TeamMember | null>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<boolean>;
  getTeamMembers: (teamId: number) => Promise<TeamMember[]>;
  updateTeamMemberBuild: (teamId: number, position: number, buildData: Partial<TeamMember>) => Promise<TeamMember | null>;
  reorderTeamMembers: (teamId: number, memberIds: number[]) => Promise<boolean>;
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
  const [teams, setTeams] = useState<TeamWithJoinedMembers[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const signUp = useCallback(async (email: string, password: string) => {
    return await authService.signUp(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return await authService.signInWithEmail(email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return await authService.signInWithGoogle();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    return await authService.signInWithMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    return await authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return await authService.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    return await authService.updatePassword(password);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return { data: null, error: new Error('Not authenticated') };
    }

    const updatedProfile = await authService.updateProfile({
      ...updates,
      id: user.id
    });

    if (updatedProfile) {
      setProfile(updatedProfile);
      return { data: updatedProfile, error: null };
    }

    return { data: null, error: new Error('Failed to update profile') };
  }, [user]);

  const fetchFavorites = useCallback(async (userId: string) => {
    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return [];
      }

      return data as Favorite[];
    });

    if (result.data) {
      setFavorites(result.data);
    }
  }, []);

  const addFavorite = useCallback(async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to add favorites');
      return;
    }

    const result = await withAuthSession(async () => {
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
        return false;
      }

      return true;
    });

    if (result.data) {
      await fetchFavorites(user.id);
      toast.success('Added to favorites!');
    }
  }, [user, fetchFavorites]);

  const removeFavorite = useCallback(async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    const result = await withAuthSession(async () => {
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
        return false;
      }

      return true;
    });

    if (result.data) {
      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      toast.success('Removed from favorites');
    }
  }, [user, favorites]);

  const isFavorite = useCallback((pokemonId: number): boolean => {
    return favorites.some(fav => fav.pokemon_id === pokemonId);
  }, [favorites]);

  const fetchTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setTeamsLoaded(false);
      setTeamsError(null);
      return false;
    }

    setTeamsError(null);

    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    });

    if (result.data) {
      setTeams(result.data);
    } else {
      setTeamsError('Could not load your teams. Check your connection and try again.');
    }
    setTeamsLoaded(true);
    return result.data !== null;
  }, [user]);

  // Fetch teams when user becomes available and teams aren't loaded yet
  useEffect(() => {
    if (user && !teamsLoaded) {
      fetchTeams();
    }
  }, [user, teamsLoaded, fetchTeams]);

  const createTeam = useCallback(async (name: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to create a team');
      return null;
    }

    const result = await withAuthSession(async () => {
      const newTeam = {
        user_id: user.id,
        name,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('teams')
        .insert([newTeam])
        .select()
        .single();

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('Permission denied: Your user account does not have access to create teams.');
        } else if (error.code === '23505') {
          toast.error('Team name already exists');
        } else {
          toast.error('Failed to create team: ' + error.message);
        }
        return null;
      }

      if (!data) {
        toast.error('Failed to create team: No data returned');
        return null;
      }

      return data;
    });

    if (result.data) {
      const createdTeam = result.data as TeamWithJoinedMembers;
      setTeams(current => [{ ...createdTeam, team_members: [] }, ...current]);
      toast.success('Team created successfully!');
      return createdTeam;
    }

    return null;
  }, [user]);

  const updateTeam = useCallback(async (teamId: number, name: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to update a team');
      return false;
    }

    const result = await withAuthSession(async () => {
      const updates = {
        name,
        description,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        toast.error('Failed to update team');
        return null;
      }

      return data;
    });

    if (result.data) {
      const updatedTeam = result.data;
      setTeams(current => current.map(team => team.id === teamId
        ? { ...team, ...updatedTeam, team_members: team.team_members }
        : team));
      toast.success('Team updated successfully!');
      return true;
    }
    return false;
  }, [user]);

  const deleteTeam = useCallback(async (teamId: number) => {
    if (!user) {
      toast.error('You must be logged in to delete a team');
      return false;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to delete team');
        return false;
      }

      return true;
    });

    if (result.data) {
      setTeams(current => current.filter(team => team.id !== teamId));
      toast.success('Team deleted successfully!');
      return true;
    }
    return false;
  }, [user]);

  const addPokemonToTeam = useCallback(async (
    teamId: number,
    pokemonId: number,
    position: number,
    buildData?: Partial<TeamMember>,
  ) => {
    if (!user) {
      toast.error('You must be logged in to add Pokémon to a team');
      return null;
    }

    if (!Number.isInteger(position) || position < 1 || position > 6) {
      toast.error('Team positions must be between 1 and 6');
      return null;
    }

    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamId,
          pokemon_id: pokemonId,
          position,
          ...pickTeamMemberBuild(buildData),
        }])
        .select()
        .single();

      if (error) {
        toast.error(error.code === '23505'
          ? 'That team position is already occupied'
          : 'Failed to add Pokémon to team');
        return null;
      }
      return data as TeamMember;
    });

    if (result.data) {
      setTeams(current => addTeamMemberToCollection(current, result.data as TeamMember));
      toast.success('Pokémon added to team!');
      return result.data as TeamMember;
    }
    return null;
  }, [user]);

  const removePokemonFromTeam = useCallback(async (teamId: number, position: number) => {
    if (!user) {
      toast.error('You must be logged in to remove Pokémon from a team');
      return false;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('position', position);

      if (error) {
        toast.error('Failed to remove Pokémon from team');
        return false;
      }

      return true;
    });

    if (result.data) {
      setTeams(current => removeTeamMemberFromCollection(current, teamId, position));
      toast.success('Pokémon removed from team!');
      return true;
    }
    return false;
  }, [user]);

  const getTeamMembers = useCallback(async (teamId: number) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        throw error;
      }

      return (data || []).sort((left, right) => left.position - right.position);
    });

    if (result.error) throw result.error;
    return result.data || [];
  }, [user]);

  const updateTeamMemberBuild = useCallback(async (teamId: number, position: number, buildData: Partial<TeamMember>) => {
    if (!user) {
      toast.error('You must be logged in to update team member builds');
      return null;
    }

    const result = await withAuthSession(async () => {
      const updateData: Partial<TeamMember> & { updated_at: string } = {
        ...pickTeamMemberBuild(buildData),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('team_id', teamId)
        .eq('position', position)
        .select()
        .single();

      if (error) {
        toast.error('Failed to update team member build');
        return null;
      }

      return data as TeamMember;
    });

    if (result.data) {
      setTeams(current => updateTeamMemberInCollection(current, result.data as TeamMember));
      toast.success('Build saved successfully!');
      return result.data as TeamMember;
    }
    return null;
  }, [user]);

  const reorderTeamMembers = useCallback(async (teamId: number, memberIds: number[]) => {
    if (!user) {
      toast.error('You must be logged in to reorder a team');
      return false;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase.rpc('reorder_team_members', {
        p_team_id: teamId,
        p_member_ids: memberIds,
      });

      if (error) {
        console.error('Failed to reorder team members:', error);
        toast.error('Failed to change Pokémon positions');
        return false;
      }

      return true;
    });

    if (result.data) {
      setTeams(current => reorderTeamMembersInCollection(current, teamId, memberIds));
      toast.success('Pokémon positions updated');
      return true;
    }
    return false;
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const session = await authService.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);

          if (session.user) {
            const userProfile = await authService.fetchProfile(session.user.id);
            if (userProfile) {
              setProfile(userProfile);
            }

            await fetchFavorites(session.user.id);
            // Teams will be fetched by separate useEffect when user state is available
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setFavorites([]);
          setTeams([]);
          setTeamsError(null);
        }
      } catch (err) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setFavorites([]);
        setTeams([]);
        setTeamsError(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        try {
          switch (event) {
            case 'SIGNED_IN':
              if (session) {
                setSession(session);
                setUser(session.user);

                if (session.user) {
                  const userProfile = await authService.fetchProfile(session.user.id);
                  if (userProfile) {
                    setProfile(userProfile);
                  } else {
                    await authService.ensureProfile(session.user.id, session.user.email);
                    const newProfile = await authService.fetchProfile(session.user.id);
                    setProfile(newProfile);
                  }

                  await fetchFavorites(session.user.id);
                  // Teams will be fetched by separate useEffect when user state is available
                }
              }
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
              }
              break;

            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setProfile(null);
              setFavorites([]);
              setTeams([]);
              setTeamsLoaded(false);
              setTeamsError(null);
              break;
          }
        } catch (err) {
          return;
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchFavorites]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    favorites,
    teams,
    teamsLoaded,
    teamsError,
    loading,
    // Auth methods
    refreshSession: authService.refreshSession.bind(authService),
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    // Favorites methods
    addFavorite,
    removeFavorite,
    isFavorite,
    // Team methods
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    updateTeamMemberBuild,
    reorderTeamMembers
  }), [
    session, user, profile, favorites, teams, teamsLoaded, teamsError, loading,
    signUp, signIn, signInWithGoogle, signInWithMagicLink, signOut, 
    resetPassword, updatePassword, updateProfile,
    addFavorite, removeFavorite, isFavorite,
    fetchTeams, createTeam, updateTeam, deleteTeam, 
    addPokemonToTeam, removePokemonFromTeam, getTeamMembers, updateTeamMemberBuild,
    reorderTeamMembers
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
