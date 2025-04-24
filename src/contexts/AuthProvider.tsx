import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { Profile, Favorite } from '../lib/supabase';
import authService, { withAuthSession } from '../services/auth.service';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  favorites: Favorite[];
  teams: any[];
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
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
  fetchTeams: (userId: string) => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<any>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  movePokemonPosition: (teamId: number, sourcePosition: number, destPosition: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<{ data: any[] | null; error: any | null }>;
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
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async (userId: string) => {
    if (!userId) {
      console.error('User ID is required to fetch teams');
      return;
    }
  
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  
    if (error) {
      console.error('Error fetching teams:', error);
      return;
    }
    setTeams(data || []);
  }, []);

  const fetchFavorites = useCallback(async (userId: string) => {
    const result = await withAuthSession(async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);
  
      if (error || !Array.isArray(data)) {
        return [];
      }
  
      return data as Favorite[] || [];
    });
  
    setFavorites(result);
  }, []);

  const signUp = async (email: string, password: string) => {
    return await authService.signUp(email, password);
  };

  const signIn = async (email: string, password: string) => {
    return await authService.signInWithEmail(email, password);
  };

  const signInWithGoogle = async () => {
    return await authService.signInWithGoogle();
  };

  const signInWithMagicLink = async (email: string) => {
    return await authService.signInWithMagicLink(email);
  };

  const signOut = async () => {
    return await authService.signOut();
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email);
  };

  const updatePassword = async (password: string) => {
    return await authService.updatePassword(password);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
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
  };

  const addFavorite = async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to add favorites');
      return;
    }

    // First check if the Pokemon is already in favorites
    if (isFavorite(pokemonId)) {
      console.log(`Pokemon #${pokemonId} already in favorites, skipping add`);
      toast.success('Already in favorites');
      return;
    }

    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, pokemon_id: pokemonId }]);

      if (error) {
        console.error('Error adding favorite:', error);
        // Check if this is a duplicate entry error
        if (error.code === '23505' || error.message?.includes('duplicate') || error.status === 409) {
          console.log('This Pokemon is already in favorites');
          return true; // Still consider this a success
        }
        return false;
      }

      return true;
    });

    if (result.data) {
      // Optimistically update the local state immediately before fetching from server
      setFavorites(prev => {
        // Check if this Pokemon is already in favorites to avoid duplicates
        if (!prev.some(fav => fav.pokemon_id === pokemonId)) {
          return [...prev, { user_id: user.id, pokemon_id: pokemonId }];
        }
        return prev;
      });
      
      // Then refresh from server to ensure consistency
      await fetchFavorites(user.id);
      toast.success('Added to favorites!');
    }
  };

  const removeFavorite = async (pokemonId: number) => {
    if (!user) {
      toast.error('You must be logged in to remove favorites');
      return;
    }
  
    if (!Array.isArray(favorites)) {
      toast.error('Favorites data is not in the correct format');
      return;
    }
  
    const result = await withAuthSession(async () => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('pokemon_id', pokemonId);
  
      if (error) {
        toast.error('Failed to remove from favorites');
        return false;
      }
  
      return true;
    });
  
    if (result.data) {
      // Optimistically update the state before fetching from server
      setFavorites(favorites.filter(fav => fav.pokemon_id !== pokemonId));
      
      // Then fetch from server for consistency
      await fetchFavorites(user.id);
      toast.success('Removed from favorites');
    }
  };

  const isFavorite = (pokemonId: number): boolean => {
    return Array.isArray(favorites) && favorites.some(fav => fav.pokemon_id === pokemonId);
  };

  const createTeam = async (name: string, description?: string) => {
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
        toast.error('Failed to create team: ' + error.message);
        return null;
      }

      return data;
    });

    if (result.data) {
      await fetchTeams(user.id);
      toast.success('Team created successfully!');
      return result.data;
    }

    return null;
  };

  const updateTeam = async (teamId: number, name: string, description?: string) => {
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
      await fetchTeams(user.id);
      toast.success('Team updated successfully!');
    }
  };

  const deleteTeam = async (teamId: number) => {
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
      await fetchTeams(user.id);
      toast.success('Team deleted successfully!');
    }
  };

  const addPokemonToTeam = async (teamId: number, pokemonId: number, position: number) => {
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
      await fetchTeams(user.id);
      toast.success('Pokémon added to team!');
    }
  };

  const removePokemonFromTeam = async (teamId: number, position: number) => {
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
      await fetchTeams(user.id);
      toast.success('Pokémon removed from team!');
    }
  };

  const movePokemonPosition = async (teamId: number, sourcePosition: number, destPosition: number) => {
    if (!user) {
      toast.error('You must be logged in to rearrange Pokémon');
      return;
    }

    const { data: membersData, error: membersError } = await getTeamMembers(teamId);

    if (membersError) {
      toast.error(`Failed to fetch team members: ${membersError.message}`);
      return;
    }

    if (!membersData) {
      toast.error('No team members data received.');
      return;
    }

    const sourceMember = membersData.find((m: { position: number }) => m.position === sourcePosition);
    const destMember = membersData.find((m: { position: number }) => m.position === destPosition);

    if (!sourceMember) {
      toast.error('No Pokémon found at the source position');
      return;
    }

    const sourcePokemonId = sourceMember.pokemon_id;
    const destPokemonId = destMember?.pokemon_id;

    try {
      const result = await withAuthSession(async () => {
        const { error: deleteSourceError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('position', sourcePosition);

        if (deleteSourceError) {
          throw deleteSourceError;
        }

        if (destMember) {
          const { error: deleteDestError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('position', destPosition);

          if (deleteDestError) {
            throw deleteDestError;
          }
        }

        const { error: insertSourceError } = await supabase
          .from('team_members')
          .insert([{ team_id: teamId, pokemon_id: sourcePokemonId, position: destPosition }]);

        if (insertSourceError) {
          throw insertSourceError;
        }

        if (destPokemonId) {
          const { error: insertDestError } = await supabase
            .from('team_members')
            .insert([{ team_id: teamId, pokemon_id: destPokemonId, position: sourcePosition }]);

          if (insertDestError) {
            throw insertDestError;
          }
        }

        return true;
      });

      if (result.data) {
        await fetchTeams(user.id);
        console.log(`Successfully swapped Pokémon between positions ${sourcePosition} and ${destPosition}`);
      }
    } catch (err: any) {
      console.error('Error swapping Pokémon positions:', err);
      toast.error('Failed to rearrange Pokémon. Please try again.');
    }
  };

  const getTeamMembers = async (
    teamId: number
  ): Promise<{ data: any[] | null; error: any | null }> => {
    if (!user) {
      return { data: [], error: null };
    }

    try {
      const result = await withAuthSession(async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);

        if (error) {
          return { data: null, error };
        }

        return { data, error: null };
      });

      if (result?.error) {
        throw result.error;
      }

      return result?.data || { data: null, error: new Error('Unexpected result structure from withAuthSession') };
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      return { data: null, error: err };
    }
  };

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
            setProfile(userProfile);
            await fetchFavorites(session.user.id); // Ensure user.id is available
            await fetchTeams(session.user.id); // Ensure user.id is available
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
  
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session);
        setUser(session.user);
        const userProfile = await authService.fetchProfile(session.user.id);
        setProfile(userProfile || null);
        await fetchFavorites(session.user.id);
        await fetchTeams(session.user.id);
      } else if (['SIGNED_OUT'].includes(event)) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setFavorites([]);
        setTeams([]);
      }
    });
  
    return () => subscription.unsubscribe();
  }, [fetchFavorites, fetchTeams]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    favorites,
    teams,
    loading,
    refreshSession: authService.refreshSession.bind(authService),
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
    isFavorite,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    movePokemonPosition,
    getTeamMembers
  }), [session, user, profile, favorites, teams, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
