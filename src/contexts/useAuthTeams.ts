import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { supabase, type TeamMember, type TeamWithJoinedMembers } from '../lib/supabase';
import { withAuthSession } from '../services/auth.service';
import { addTeamMemberToCollection, removeTeamMemberFromCollection, reorderTeamMembersInCollection, updateTeamMemberInCollection } from '../utils/team-collection';
import { pickTeamMemberBuild } from '../utils/team-builder';

export function useAuthTeams(user: User | null) {
  const [teams, setTeams] = useState<TeamWithJoinedMembers[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const resetTeams = useCallback(() => {
    setTeams([]);
    setTeamsLoaded(false);
    setTeamsError(null);
  }, []);

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

  useEffect(() => {
    if (!user) {
      resetTeams();
      return;
    }

    if (!teamsLoaded) {
      void fetchTeams();
    }
  }, [user, teamsLoaded, fetchTeams, resetTeams]);

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

  return {
    teams,
    teamsLoaded,
    teamsError,
    resetTeams,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addPokemonToTeam,
    removePokemonFromTeam,
    getTeamMembers,
    updateTeamMemberBuild,
    reorderTeamMembers,
  };
}
