import React from 'react';
import { supabase, Team, TeamMember } from '../../lib/supabase';
import toast from 'react-hot-toast';

type TeamsMethodsProps = {
  user: any;
  refreshSession: () => Promise<any>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
};

export interface TeamsMethods {
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<TeamMember[]>;
  movePokemonPosition: (teamId: number, sourcePosition: number, destPosition: number) => Promise<void>;
}

export const TeamsMethods = ({
  user,
  refreshSession,
  teams, // Note: 'teams' prop is not directly used in local state updates below, but retained for potential future use or other methods.
  setTeams
}: TeamsMethodsProps): TeamsMethods => {
  
  const fetchTeams = async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }
      
      if (data) setTeams(data as Team[]);
    } catch (err) {
      console.error('Teams fetch error:', err);
    }
  };

  const createTeam = async (name: string, description?: string): Promise<Team | null> => {
    if (!user) {
      toast.error('You must be logged in to create a team');
      return null;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return null;
      }

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
          toast.error('You don\'t have permission to create teams. Please sign in again.');
        } else {
          toast.error('Failed to create team');
        }
        return null;
      }

      // Update local state directly
      setTeams((currentTeams: Team[]) => [...currentTeams, data as Team]); 
      toast.success('Team created successfully!');
      return data as Team;
    } catch (err) {
      toast.error('Failed to create team');
      return null;
    }
  };

  const updateTeam = async (teamId: number, name: string, description?: string): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to update a team');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

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
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to update this team. Please sign in again.');
        } else {
          toast.error('Failed to update team');
        }
        return;
      }

      // Update local state directly
      setTeams((currentTeams: Team[]) => currentTeams.map((t: Team) => 
        t.id === teamId ? { ...t, name, description, updated_at: updates.updated_at } : t
      )); 
      toast.success('Team updated successfully!');
    } catch (err) {
      toast.error('Failed to update team');
    }
  };

  const deleteTeam = async (teamId: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to delete a team');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', user.id);

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to delete this team. Please sign in again.');
        } else {
          toast.error('Failed to delete team');
        }
        return;
      }

      // Update local state directly
      setTeams((currentTeams: Team[]) => currentTeams.filter((t: Team) => t.id !== teamId)); 
      toast.success('Team deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete team');
    }
  };

  const addPokemonToTeam = async (teamId: number, pokemonId: number, position: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to add Pokémon to a team');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      // First check if the team belongs to the user
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamData) {
        toast.error('Team not found or you don\'t have permission to modify it');
        return;
      }

      // Check if there's already a Pokémon at this position
      const { data: existingData, error: existingError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('position', position);

      if (existingError) {
        toast.error('Failed to check existing team members');
        return;
      }

      // If there's a Pokémon at this position, update it
      if (existingData && existingData.length > 0) {
        const { error } = await supabase
          .from('team_members')
          .update({ pokemon_id: pokemonId })
          .eq('team_id', teamId)
          .eq('position', position);

        if (error) {
          toast.error('Failed to update Pokémon in team');
          return;
        }
      } else {
        // Otherwise, insert a new team member
        const { error } = await supabase
          .from('team_members')
          .insert([{ team_id: teamId, pokemon_id: pokemonId, position }]);

        if (error) {
          if (error.code === '23505') {
            toast.error('This position is already taken in the team');
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            toast.error('You don\'t have permission to modify this team. Please sign in again.');
          } else {
            toast.error('Failed to add Pokémon to team');
          }
          return;
        }
      }

      toast.success('Pokémon added to team!');
    } catch (err) {
      toast.error('Failed to add Pokémon to team');
    }
  };

  const removePokemonFromTeam = async (teamId: number, position: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to remove Pokémon from a team');
      return;
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return;
      }

      // First check if the team belongs to the user
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamData) {
        toast.error('Team not found or you don\'t have permission to modify it');
        return;
      }

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('position', position);

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to modify this team. Please sign in again.');
        } else {
          toast.error('Failed to remove Pokémon from team');
        }
        return;
      }

      toast.success('Pokémon removed from team!');
    } catch (err) {
      toast.error('Failed to remove Pokémon from team');
    }
  };

  const getTeamMembers = async (teamId: number): Promise<TeamMember[]> => {
    if (!user) {
      toast.error('You must be logged in to view team members');
      return [];
    }

    try {
      const { success, session } = await refreshSession();
      
      if (!success || !session) {
        return [];
      }

      // First check if the team belongs to the user
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamData) {
        toast.error('Team not found or you don\'t have permission to view it');
        return [];
      }

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('position', { ascending: true });

      if (error) {
        toast.error('Failed to fetch team members');
        return [];
      }

      return data as TeamMember[];
    } catch (err) {
      toast.error('Failed to fetch team members');
      return [];
    }
  };

  const movePokemonPosition = async (teamId: number, sourcePosition: number, destPosition: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to modify team positions');
      return;
    }

    if (sourcePosition === destPosition) {
      console.log('Source and destination positions are the same, no action needed.');
      return; // No need to proceed if positions are identical
    }

    try {
      const { success, session } = await refreshSession();
      if (!success || !session) return;

      // Verify team ownership
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamData) {
        toast.error('Team not found or you don\'t have permission.');
        return;
      }

      // Use an RPC function for atomicity (assuming 'swap_team_member_positions' exists)
      const { error: rpcError } = await supabase.rpc('swap_team_member_positions', {
        p_team_id: teamId,
        p_position1: sourcePosition,
        p_position2: destPosition
      });

      if (rpcError) {
          // Basic fallback if RPC doesn't exist or fails for other reasons
          console.warn('RPC swap_team_member_positions failed or does not exist, attempting manual swap:', rpcError);
          toast.error(`Failed to move Pokémon: ${rpcError.message}`);
          // NOTE: Manual swap logic here would be complex and prone to race conditions.
          // It's highly recommended to implement the RPC function in Supabase.
          // Example placeholder for manual (less safe) swap:
          // 1. Fetch both members
          // 2. Update member at source to a temporary position (e.g., -1)
          // 3. Update member at dest to source position
          // 4. Update member at temp position to dest position
          // This requires careful error handling.
          return;
      }

      console.log(`Successfully swapped positions ${sourcePosition} and ${destPosition} for team ${teamId}`);
      toast.success('Pokémon positions swapped!');

      // Optionally, refetch teams or team members if the local state needs update
      // Consider if the UI consuming this needs immediate reflection of the swap.

    } catch (err: any) {
      console.error('Error moving Pokémon position:', err);
      toast.error(`An unexpected error occurred: ${err.message}`);
    }
  };

  return {
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    movePokemonPosition
  };
};
