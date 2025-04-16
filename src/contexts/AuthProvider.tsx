import React, { createContext, useState, useEffect, useContext } from 'react';
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
  
  // Auth methods
  refreshSession: () => Promise<Session | null>;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  
  // Profile methods
  updateProfile: (profile: Partial<Profile>) => Promise<{
    data: Profile | null;
    error: any | null;
  }>;
  
  // Favorites methods
  addFavorite: (pokemonId: number) => Promise<void>;
  removeFavorite: (pokemonId: number) => Promise<void>;
  isFavorite: (pokemonId: number) => boolean;
  
  // Team methods
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<any>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<any[]>;
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
            await fetchTeams();
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
                  await fetchTeams();
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

  const fetchFavorites = async (userId: string) => {
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
  };

  const addFavorite = async (pokemonId: number) => {
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
  };

  const removeFavorite = async (pokemonId: number) => {
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
  };

  const isFavorite = (pokemonId: number): boolean => {
    return favorites.some(fav => fav.pokemon_id === pokemonId);
  };

  const fetchTeams = async () => {
    if (!user) {
      setTeams([]);
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
    }
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
      await fetchTeams();
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
      await fetchTeams();
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
      await fetchTeams();
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
      await fetchTeams();
      toast.success('Pokémon removed from team!');
    }
  };

  const getTeamMembers = async (teamId: number) => {
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
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const value = {
    session,
    user,
    profile,
    favorites,
    teams,
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
    getTeamMembers
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
