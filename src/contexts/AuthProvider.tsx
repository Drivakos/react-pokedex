import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Session, User, AuthError, AuthResponse, OAuthResponse } from '@supabase/supabase-js';
import { Profile, Favorite, Team, TeamMember, TeamWithJoinedMembers } from '../lib/supabase';
import authService, { withAuthSession } from '../services/auth.service';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
  teams: TeamWithJoinedMembers[];
  teamsLoaded: boolean;
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
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<TeamMember[]>;
  updateTeamMemberBuild: (teamId: number, position: number, buildData: Partial<TeamMember>) => Promise<void>;
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
      return;
    }

    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data;
    });

    if (result.data) {
      setTeams(result.data);
      setTeamsLoaded(true);
    }
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
      await fetchTeams();
      toast.success('Team created successfully!');
      return result.data;
    }

    return null;
  }, [user, fetchTeams]);

  const updateTeam = useCallback(async (teamId: number, name: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to update a team');
      return;
    }

    const result = await withAuthSession(async () => {
      const updates = {
        name,
        description,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to update team');
        return false;
      }

      return true;
    });

    if (result.data) {
      await fetchTeams();
      toast.success('Team updated successfully!');
    }
  }, [user, fetchTeams]);

  const deleteTeam = useCallback(async (teamId: number) => {
    if (!user) {
      toast.error('You must be logged in to delete a team');
      return;
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
      await fetchTeams();
      toast.success('Team deleted successfully!');
    }
  }, [user, fetchTeams]);

  const addPokemonToTeam = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    if (!user) {
      toast.error('You must be logged in to add Pokémon to a team');
      return;
    }

    const result = await withAuthSession(async () => {
      const { data: existingData, error: existingError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('position', position);

      if (existingError) {
        toast.error('Failed to check existing team members');
        return false;
      }

      if (existingData && existingData.length > 0) {
        const { error } = await supabase
          .from('team_members')
          .update({ pokemon_id: pokemonId })
          .eq('team_id', teamId)
          .eq('position', position);

        if (error) {
          toast.error('Failed to update Pokémon in team');
          return false;
        }
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert([{ team_id: teamId, pokemon_id: pokemonId, position }]);

        if (error) {
          toast.error('Failed to add Pokémon to team');
          return false;
        }
      }

      return true;
    });

    if (result.data) {
      await fetchTeams();
      toast.success('Pokémon added to team!');
    }
  }, [user, fetchTeams]);

  const removePokemonFromTeam = useCallback(async (teamId: number, position: number) => {
    if (!user) {
      toast.error('You must be logged in to remove Pokémon from a team');
      return;
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
      await fetchTeams();
      toast.success('Pokémon removed from team!');
    }
  }, [user, fetchTeams]);

  const getTeamMembers = useCallback(async (teamId: number) => {
    if (!user) {
      return [];
    }

    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        return [];
      }

      return data || [];
    });

    return result.data || [];
  }, [user]);

  const updateTeamMemberBuild = useCallback(async (teamId: number, position: number, buildData: Partial<TeamMember>) => {
    if (!user) {
      toast.error('You must be logged in to update team member builds');
      return;
    }

    const result = await withAuthSession(async () => {
      const updateData: Partial<TeamMember> & { updated_at: string } = {
        updated_at: new Date().toISOString()
      };

      if (buildData.moves !== undefined) updateData.moves = buildData.moves;
      if (buildData.item !== undefined) updateData.item = buildData.item;
      if (buildData.ability !== undefined) updateData.ability = buildData.ability;
      if (buildData.nature !== undefined) updateData.nature = buildData.nature;
      if (buildData.evs !== undefined) updateData.evs = buildData.evs;
      if (buildData.ivs !== undefined) updateData.ivs = buildData.ivs;
      if (buildData.level !== undefined) updateData.level = buildData.level;
      if (buildData.gender !== undefined) updateData.gender = buildData.gender;
      if (buildData.tera_type !== undefined) updateData.tera_type = buildData.tera_type;
      if (buildData.nickname !== undefined) updateData.nickname = buildData.nickname;
      if (buildData.is_shiny !== undefined) updateData.is_shiny = buildData.is_shiny;

      const { error } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('team_id', teamId)
        .eq('position', position);

      if (error) {
        toast.error('Failed to update team member build');
        return false;
      }

      return true;
    });

    if (result.data) {
      toast.success('Build saved successfully!');
    }
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
        }
      } catch (err) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setFavorites([]);
        setTeams([]);
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
    updateTeamMemberBuild
  }), [
    session, user, profile, favorites, teams, teamsLoaded, loading,
    signUp, signIn, signInWithGoogle, signInWithMagicLink, signOut, 
    resetPassword, updatePassword, updateProfile,
    addFavorite, removeFavorite, isFavorite,
    fetchTeams, createTeam, updateTeam, deleteTeam, 
    addPokemonToTeam, removePokemonFromTeam, getTeamMembers, updateTeamMemberBuild
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
