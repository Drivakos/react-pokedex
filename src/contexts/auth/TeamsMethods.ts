import { User, Session } from '@supabase/supabase-js';
import { supabase, Team, TeamMember } from '../../lib/supabase';
import toast from 'react-hot-toast';

type RefreshResult = { success: boolean; session: Session | null };

type TeamsMethodsProps = {
  user: User | null;
  refreshSession: () => Promise<RefreshResult>;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
};

export interface TeamsMethodsInterface {
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: number, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  addPokemonToTeam: (teamId: number, pokemonId: number, position: number) => Promise<void>;
  removePokemonFromTeam: (teamId: number, position: number) => Promise<void>;
  getTeamMembers: (teamId: number) => Promise<TeamMember[]>;
  updateTeamMemberBuild: (teamId: number, position: number, buildData: Partial<TeamMember>) => Promise<void>;
}

export const TeamsMethods = ({
  user,
  refreshSession,
  teams,
  setTeams
}: TeamsMethodsProps): TeamsMethodsInterface => {

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

      await fetchTeams();
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

      await fetchTeams();
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

      setTeams(teams.filter(team => team.id !== teamId));
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

      await fetchTeams();
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

      await fetchTeams();
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
        console.error('Team not found or permission denied:', teamError);
        return [];
      }

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Failed to fetch team members:', error);
        return [];
      }

      return data as TeamMember[];
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      return [];
    }
  };

  const updateTeamMemberBuild = async (teamId: number, position: number, buildData: Partial<TeamMember>): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to update team member builds');
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

      // Prepare the update data
      const updateData: Partial<TeamMember> & { updated_at: string } = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that are provided and not undefined
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
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          toast.error('You don\'t have permission to update this team member. Please sign in again.');
        } else {
          toast.error('Failed to update team member build');
        }
        return;
      }

      toast.success('Team member build updated successfully!');
    } catch (err) {
      console.error('Failed to update team member build:', err);
      toast.error('Failed to update team member build');
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
    updateTeamMemberBuild
  };
};
