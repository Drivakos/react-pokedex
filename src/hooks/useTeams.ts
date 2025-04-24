import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
  height?: number;
  weight?: number;
  abilities?: {
    ability: {
      name: string;
      url: string;
    };
    is_hidden: boolean;
    slot: number;
  }[];
  stats?: {
    base_stat: number;
    effort: number;
    stat: {
      name: string;
      url: string;
    };
  }[];
  moves?: {
    move: {
      name: string;
      url: string;
    };
  }[];
}

// We'll use the type directly from the response instead of a separate interface

interface TeamState {
  teamPokemon: Record<number, Record<number, Pokemon | null>>;
  isLoading: boolean;
  error: string | null;
  teamsLoaded: boolean;
}

/**
 * Custom hook for managing team data and operations
 */
export const useTeams = () => {
  const { 
    teams, 
    fetchTeams, 
    createTeam, 
    updateTeam, 
    deleteTeam, 
    addPokemonToTeam: authAddPokemonToTeam, 
    removePokemonFromTeam, 
    getTeamMembers,
    favorites
  } = useAuth();
  
  const [state, setState] = useState<TeamState>({
    teamPokemon: {},
    isLoading: false,
    error: null,
    teamsLoaded: false
  });
  
  /**
   * Fetch Pokemon data by ID with error handling and caching
   */
  // Track pending requests at the top level to avoid dependency issues
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [pokemonCache, setPokemonCache] = useState<Record<number, Pokemon>>({});
  
  const fetchPokemonById = useCallback(async (pokemonId: number): Promise<Pokemon | null> => {
    // Check cache first
    if (pokemonCache[pokemonId]) {
      return pokemonCache[pokemonId];
    }
    
    // Deduplicate in-flight requests
    const requestKey = `pokemon-${pokemonId}`;
    if (pendingRequests.has(requestKey)) {
      console.log(`Request for Pokemon ${pokemonId} already in progress, waiting...`);
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkCache = () => {
          if (pokemonCache[pokemonId]) {
            resolve(pokemonCache[pokemonId]);
          } else if (!pendingRequests.has(requestKey)) {
            // Request failed or was cancelled
            resolve(null);
          } else {
            // Check again after a short delay
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }
    
    try {
      // Mark request as pending
      setPendingRequests(prev => new Set(prev).add(requestKey));
      
      console.log(`Fetching Pokemon ${pokemonId} from API...`);
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch Pokemon ${pokemonId}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully loaded Pokemon ${data.name} (ID: ${pokemonId})`);
      
      // Update cache
      setPokemonCache(prev => ({
        ...prev,
        [pokemonId]: data
      }));
      
      // Remove from pending requests
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching Pokemon ${pokemonId}:`, error);
      
      // Remove from pending requests
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
      
      return null;
    }
  }, [pokemonCache, pendingRequests]);

  /**
   * Load initial team data
   */
  // Forward declaration to avoid the "used before defined" error
  const loadTeamMembersRef = React.useRef<(teamId: number) => Promise<void>>();
  
  const loadTeams = useCallback(async () => {
    console.log('🚀 Loading teams...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!fetchTeams) {
        throw new Error('fetchTeams function is not available');
      }
      
      // Force teams fetch first to get latest data
      console.log('🚀 Forcing teams fetch from API...');
      await fetchTeams();
      
      // Team data should now be available in the teams array from context
      console.log('🚀 Teams data after fetch:', teams);
      
      if (!teams || teams.length === 0) {
        console.warn('🔴 No teams found after fetching');
      } else {
        console.log(`🚀 Found ${teams.length} teams, processing...`);
        console.log('🚀 Team IDs:', teams.map(t => t.id).join(', '));
        
        // Process teams immediately to prevent race conditions
        for (const team of teams) {
          console.log(`🚀 Loading team members for team ${team.id} (${team.name})...`);
          if (loadTeamMembersRef.current) {
            await loadTeamMembersRef.current(team.id);
          }
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        teamsLoaded: true 
      }));
    } catch (error) {
      console.error('🔴 Error loading teams:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load teams' 
      }));
      toast.error('Failed to load teams');
    }
  }, [fetchTeams, teams]);

  /**
   * Load team members for a specific team
   * @returns void - this function doesn't return any meaningful data
   */
  const loadTeamMembers = useCallback(async (teamId: number): Promise<void> => {
    console.log(`🚀 useTeams - loadTeamMembers called for team ${teamId}`);
    if (!teams) {
      console.log('🚀 useTeams - Cannot load team members - teams not loaded yet');
      return;
    }
    
    // Check if team exists in our list
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      console.log(`🚀 useTeams - Team ${teamId} not found in loaded teams`);
      return;
    }
    
    if (!getTeamMembers) {
      console.error(`🔴 Team member functionality unavailable for team ${teamId}`);
      return;
    }
    
    // Create a request key to prevent duplicate loading
    const requestKey = `team-${teamId}`;
    if (pendingRequests.has(requestKey)) {
      console.log(`🚀 Team ${teamId} already being loaded, waiting for completion...`);
      // Wait for existing request instead of skipping
      return new Promise((resolve) => {
        const checkComplete = () => {
          if (!pendingRequests.has(requestKey)) {
            resolve(undefined);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }
    
    try {
      // Mark team as being loaded
      setPendingRequests(prev => new Set(prev).add(requestKey));
      
      console.log(`🚀 Fetching team members for team ${teamId}...`);
      const members = await getTeamMembers(teamId);
      console.log(`🚀 Found ${members?.data?.length || 0} members for team ${teamId}. Member data:`, members);
      
      // Initialize with null for all 6 positions
      const teamMembersByPosition: Record<number, Pokemon | null> = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
      
      // Create a detailed array with position and Pokemon data
      if (members?.data && members.data.length > 0) {
        console.log(`🚀 Loading ${members.data.length} Pokemon details for team ${teamId}...`);
        
        // Use Promise.all for parallel fetching
        const detailed = await Promise.all(
          members.data.map(async (row: { pokemon_id: number; position: number }) => {
            const pokemon = await fetchPokemonById(row.pokemon_id);
            return { position: row.position, pokemon };
          })
        );
        
        // Fill in the positions we have Pokemon for
        detailed.forEach(({ position, pokemon }: { position: number; pokemon: Pokemon | null }) => {
          if (pokemon) {
            console.log(`🚀 Successfully loaded Pokemon ${pokemon.name} for position ${position}`);
            teamMembersByPosition[position] = pokemon;
          } else {
            console.error(`🔴 Failed to load Pokemon for position ${position}`);
          }
        });
      } else {
        console.log(`🚀 No team members found for team ${teamId} - this is OK for new teams`);
      }
      
      if (members?.data && members.data.length > 0) {
        console.log(`🚀 Successfully loaded Pokémon for team ${teamId}`);
        console.log(`🚀 Updating state with team ${teamId} Pokemon data at positions:`, 
          Object.keys(teamMembersByPosition).map(Number));
      }
      
      // Update state with new team Pokémon data
      setState(prev => {
        console.log(`🚀 Before update: Teams in state:`, 
          Object.keys(prev.teamPokemon).map(Number));
        const newState = {
          ...prev,
          teamPokemon: {
            ...prev.teamPokemon,
            [teamId]: teamMembersByPosition
          }
        };
        console.log(`🚀 After update: Teams in state:`, 
          Object.keys(newState.teamPokemon).map(Number));
        return newState;
      });
      
      // Remove from pending requests
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
    } catch (error) {
      console.error(`🔴 Error loading team members for team ${teamId}:`, error);
      toast.error(`Failed to load Pokémon for team ${teamId}`);
      
      // Remove pending request status
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
    }
  }, [getTeamMembers, fetchPokemonById, state.teamPokemon, pendingRequests]);

  /**
   * Add a Pokemon to a team
   */
  const addPokemonToTeam = useCallback(async (
    teamId: number, 
    pokemonId: number, 
    position: number
  ): Promise<boolean> => {
    if (typeof authAddPokemonToTeam !== 'function') {
      toast.error('Failed to add Pokémon to team: Feature unavailable');
      return false;
    }
    
    try {
      await authAddPokemonToTeam(teamId, pokemonId, position);
      
      // Fetch the Pokemon data to update UI immediately
      const pokemon = await fetchPokemonById(pokemonId);
      
      if (pokemon) {
        // Update local state
        setState(prev => ({
          ...prev,
          teamPokemon: {
            ...prev.teamPokemon,
            [teamId]: {
              ...(prev.teamPokemon[teamId] || {}),
              [position]: pokemon
            }
          }
        }));
      }
      
      toast.success('Pokémon added to team!');
      return true;
    } catch (error) {
      console.error(`Failed to add Pokemon ${pokemonId} to team ${teamId}:`, error);
      toast.error('Failed to add Pokémon to team');
      return false;
    }
  }, [authAddPokemonToTeam, fetchPokemonById]);

  /**
   * Remove a Pokemon from a team
   */
  const removeFromTeam = useCallback(async (
    teamId: number, 
    position: number
  ): Promise<boolean> => {
    if (typeof removePokemonFromTeam !== 'function') {
      toast.error('Failed to remove Pokémon from team: Feature unavailable');
      return false;
    }
    
    try {
      await removePokemonFromTeam(teamId, position);
      
      // Update local state
      setState(prev => {
        const newTeamPokemon = { ...prev.teamPokemon };
        if (newTeamPokemon[teamId]) {
          const teamPositions = { ...newTeamPokemon[teamId] };
          delete teamPositions[position];
          newTeamPokemon[teamId] = teamPositions;
        }
        return {
          ...prev,
          teamPokemon: newTeamPokemon
        };
      });
      
      toast.success('Pokémon removed from team');
      return true;
    } catch (error) {
      console.error(`Failed to remove Pokemon from team ${teamId} position ${position}:`, error);
      toast.error('Failed to remove Pokémon from team');
      return false;
    }
  }, [removePokemonFromTeam]);

  /**
   * Create a new team
   */
  const createNewTeam = useCallback(async (
    name: string, 
    description: string
  ): Promise<boolean> => {
    if (typeof createTeam !== 'function') {
      toast.error('Team creation unavailable');
      return false;
    }
    
    try {
      await createTeam(name, description);
      await loadTeams();
      toast.success('Team created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      return false;
    }
  }, [createTeam, loadTeams]);

  /**
   * Update an existing team
   */
  const updateExistingTeam = useCallback(async (
    teamId: number, 
    name: string, 
    description: string
  ): Promise<boolean> => {
    if (typeof updateTeam !== 'function') {
      toast.error('Team update feature unavailable');
      return false;
    }
    
    try {
      await updateTeam(teamId, name, description);
      await loadTeams();
      toast.success('Team updated successfully!');
      return true;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      toast.error('Failed to update team');
      return false;
    }
  }, [updateTeam, loadTeams]);

  /**
   * Delete a team
   */
  const deleteExistingTeam = useCallback(async (teamId: number): Promise<boolean> => {
    if (typeof deleteTeam !== 'function') {
      return false;
    }
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
    
    try {
      const result = await deleteTeam(teamId);
      const success = result === undefined ? true : !!result;
      
      if (success) {
        setState(prev => {
          const updatedTeamPokemon = { ...prev.teamPokemon };
          delete updatedTeamPokemon[teamId];
          
          return {
            ...prev,
            isLoading: false,
            teamPokemon: updatedTeamPokemon
          };
        });
        
        return true;
      } else {
        console.log(`🚀 useTeams - Failed to delete team ${teamId}`);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to delete team'
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Error deleting team: ${error}`
      }));
      
      console.error(`Error deleting team ${teamId}:`, error);
      toast.error('Failed to delete team');
      return false;
    }
  }, [deleteTeam]);

  /**
   * Load favorite Pokemon pool
   */
  const loadFavoritePool = useCallback(async (): Promise<Pokemon[]> => {
    console.log('🚀 useTeams - Loading favorite Pokémon pool...');
    
    const requestKey = 'favorites-pool';
    if (pendingRequests.has(requestKey)) {
      console.log('🚀 useTeams - Favorites already being loaded, returning cached data...');
      const cachedPokemon = Object.values(pokemonCache).filter(pokemon => 
        favorites?.some(fav => fav.pokemon_id === pokemon.id)
      );
      return cachedPokemon;
    }
    
    if (!favorites || !Array.isArray(favorites)) {
      console.log('🚀 useTeams - No favorites data available');
      return [];
    }
    
    try {
      setPendingRequests(prev => new Set(prev).add(requestKey));
      const pokemonToFetch = favorites.filter(fav => !pokemonCache[fav.pokemon_id]);
      const pokemonPool = Object.values(pokemonCache).filter(pokemon => 
        favorites.some(fav => fav.pokemon_id === pokemon.id)
      );
      console.log(`🚀 useTeams - Starting with ${pokemonPool.length} cached favorite Pokémon`);
      
      if (pokemonToFetch.length > 0) {
        const uniqueIds = new Set<number>();
        const CHUNK_SIZE = 2; // Reduced to 2 for better performance
        for (let i = 0; i < pokemonToFetch.length; i += CHUNK_SIZE) {
          const chunk = pokemonToFetch.slice(i, i + CHUNK_SIZE);
          
          const pokemonPromises = chunk.map(async (fav) => {
            if (uniqueIds.has(fav.pokemon_id) || pokemonCache[fav.pokemon_id]) {
              return null; // Skip duplicates or already cached
            }
            
            uniqueIds.add(fav.pokemon_id);
            return await fetchPokemonById(fav.pokemon_id);
          });
          
          const results = await Promise.all(pokemonPromises);
          const validResults = results.filter(Boolean) as Pokemon[];
          pokemonPool.push(...validResults);
          console.log(`🚀 useTeams - Added ${validResults.length} more Pokémon to favorites pool`);
          
          if (i + CHUNK_SIZE < pokemonToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
      
      console.log(`🚀 useTeams - Successfully loaded ${pokemonPool.length} favorite Pokémon in total`);
      return pokemonPool;
    } catch (error) {
      console.error('🔴 useTeams - Error loading favorite Pokemon:', error);
      toast.error('Failed to load favorite Pokémon');
      
      setPendingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestKey);
        return updated;
      });
      
      return [];
    }
  }, [favorites, fetchPokemonById, pokemonCache, pendingRequests]);

  useEffect(() => {
    console.log('🚀 useTeams - Setting loadTeamMembersRef.current');
    loadTeamMembersRef.current = loadTeamMembers;
  }, [loadTeamMembers]);

  useEffect(() => {
    console.log('🚀 useTeams - Teams updated from context:', teams?.length || 0);
    if (teams && teams.length > 0) {
      console.log('🚀 useTeams - First team name:', teams[0].name);
    }
  }, [teams]);

  useEffect(() => {
    console.log('🚀 useTeams - Initial mount effect running');
    const timer = setTimeout(() => {
      console.log('🚀 useTeams - Initial teams loading triggered');
      loadTeams();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return {
    teams,
    teamPokemon: state.teamPokemon,
    isLoading: state.isLoading,
    error: state.error,
    loadTeams,
    loadTeamMembers,
    addPokemonToTeam,
    removeFromTeam,
    createNewTeam,
    updateExistingTeam,
    deleteExistingTeam,
    loadFavoritePool,
    fetchPokemonById,
    pokemonCache
  };
};
