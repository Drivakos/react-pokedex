import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { DropResult } from '@hello-pangea/dnd';
import { usePokemon } from '../hooks/usePokemon';
import type { PokemonDetails } from '../types/pokemon';

// Removed DropResult import due to bundler resolution issues

interface UseTeamBuilderParams {
  externalPokemon?: PokemonDetails;
}

const useTeamBuilder = ({ externalPokemon }: UseTeamBuilderParams) => {
  const { teams, favorites, user, fetchTeams, createTeam, removePokemonFromTeam, addPokemonToTeam, movePokemonPosition, deleteTeam: removeTeam } = useAuth();
  const { filters, handleFilterChange, getPokemonDetails } = usePokemon();

  const [teamMembers, setTeamMembers] = useState<Record<number, number[]>>({});
  const [teamPokemon, setTeamPokemon] = useState<Record<number, Record<number, number>>>({});
  const [favoriteDetails, setFavoriteDetails] = useState<PokemonDetails[]>([]);
  const [teamCoverage, setTeamCoverage] = useState<Record<number, { types: string[]; missing: string[] }>>({});
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPoolPokemon, setSelectedPoolPokemon] = useState<PokemonDetails | null>(null);

  const isLoading = !teams || !user;

  // Fetch teams on user load
  useEffect(() => {
    if (user) fetchTeams();
  }, [user, fetchTeams]);

  // Process team members mapping
  useEffect(() => {
    if (user && teams?.length) {
      const membersMap: Record<number, number[]> = {};
      const pokemonMap: Record<number, Record<number, number>> = {};
      teams.forEach(team => {
        if (Array.isArray(team.team_members)) {
          membersMap[team.id] = team.team_members.map((m: { position: number }) => m.position);
          pokemonMap[team.id] = Object.fromEntries(
            team.team_members.map((m: { position: number; pokemon_id: number }) => [m.position, m.pokemon_id])
          );
        } else {
          membersMap[team.id] = [];
          pokemonMap[team.id] = {};
        }
      });
      setTeamMembers(membersMap);
      setTeamPokemon(pokemonMap);
    }
  }, [user, teams]);

  // Load pool details
  useEffect(() => {
    const loadPool = async () => {
      const ids = favorites.map(f => f.pokemon_id);
      if (externalPokemon && !ids.includes(externalPokemon.id)) ids.unshift(externalPokemon.id);
      const details: PokemonDetails[] = [];
      for (const id of ids) {
        try {
          details.push(await getPokemonDetails(id));
        } catch (e) {
          console.error('useTeamBuilder: failed load pool', id, e);
        }
      }
      setFavoriteDetails(details);
    };
    loadPool();
  }, [favorites, externalPokemon, getPokemonDetails]);

  // Fetch coverage types
  const fetchCoverage = useCallback(async () => {
    const coverageMap: Record<number, { types: string[]; missing: string[] }> = {};
    for (const [teamIdStr, posMap] of Object.entries(teamPokemon)) {
      const typesSet = new Set<string>();
      const teamId = parseInt(teamIdStr, 10);
      
      // Skip if this team has no positions yet
      if (Object.keys(posMap).length === 0) {
        coverageMap[teamId] = { types: [], missing: [] };
        continue;
      }
      
      let hasValidData = false;
      for (const id of Object.values(posMap)) {
        if (id) {
          try {
            const data = await getPokemonDetails(id);
            if (data && data.types) {
              data.types.forEach(t => typesSet.add(t));
              hasValidData = true;
            }
          } catch (e) {
            console.error(`useTeamBuilder: coverage error for ID ${id}`, e);
            // Continue with other Pokémon even if one fails
          }
        }
      }
      
      // Use cached data if we couldn't fetch new data
      if (!hasValidData && teamCoverage[teamId]) {
        coverageMap[teamId] = { ...teamCoverage[teamId] };
      } else {
        coverageMap[teamId] = { types: Array.from(typesSet), missing: [] };
      }
    }
    setTeamCoverage(coverageMap);
  }, [teamPokemon, getPokemonDetails]);

  useEffect(() => {
    if (teams?.length && Object.keys(teamPokemon).length > 0) {
      // Add debouncing to prevent too many calls
      const timer = setTimeout(() => {
        fetchCoverage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [teams, teamPokemon, fetchCoverage]);

  // Select pool pokemon
  const selectPoolPokemon = useCallback((p: PokemonDetails) => {
    setSelectedPoolPokemon(p);
  }, []);

  // Create new team
  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName) return;
    try {
      await createTeam(newTeamName);
      setNewTeamName('');
      setIsCreatingTeam(false);
      fetchTeams();
    } catch (e) {
      console.error('useTeamBuilder: create team error', e);
    }
  }, [createTeam, fetchTeams, newTeamName]);

  // Drag and drop handler - completely rewritten for reliable position mapping
  const handleDragEndAll = useCallback((result: DropResult) => {
    const { source, destination } = result;
    
    // Return if no destination or same position
    if (!destination || 
        (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }
    
    // Only handle reordering within the same team
    if (source.droppableId === destination.droppableId && source.droppableId.startsWith('team-')) {
      // Extract team ID from the droppableId
      const teamId = parseInt(source.droppableId.replace('team-', ''), 10);
      
      try {
        // Parse the source position directly from the draggableId (most reliable method)
        // Format: "team-{teamId}-pos-{position}"
        const sourceIdMatch = result.draggableId.match(/team-\d+-pos-(\d+)/);
        if (!sourceIdMatch || !sourceIdMatch[1]) {
          throw new Error(`Invalid draggable ID format: ${result.draggableId}`);
        }
        const sourcePos = parseInt(sourceIdMatch[1], 10);
        
        // Create a map of visible index to position
        const visiblePositions = [...(teamMembers[teamId] || [])].sort((a, b) => a - b);
        
        // Get destination position from the index
        if (destination.index >= visiblePositions.length) {
          throw new Error(`Destination index ${destination.index} is out of bounds for team ${teamId}`);
        }
        
        const destPos = visiblePositions[destination.index];
        
        // Skip if invalid positions or same position
        if (!destPos || sourcePos === destPos) {
          return;
        }
        
        // Get the Pokémon ID at the source position
        const pokemonId = teamPokemon[teamId]?.[sourcePos];
        if (!pokemonId) {
          throw new Error(`No Pokémon found at position ${sourcePos} in team ${teamId}`);
        }
        
        console.log(`Moving Pokémon ${pokemonId} from position ${sourcePos} to ${destPos} in team ${teamId}`);
        
        // Optimistically update the UI
        setTeamPokemon(prev => {
          if (!prev[teamId]) return prev;
          
          const updatedTeam = { ...prev[teamId] };
          
          // Move Pokémon from source to destination
          delete updatedTeam[sourcePos];
          updatedTeam[destPos] = pokemonId;
          
          return { ...prev, [teamId]: updatedTeam };
        });
        
        // Update the database
        movePokemonPosition(teamId, sourcePos, destPos).catch(error => {
          console.error('Error updating database:', error);
          // On failure, revert by refreshing data
          fetchTeams();
        });
        
      } catch (error) {
        console.error('Drag and drop error:', error);
        // Refresh teams to ensure consistency
        fetchTeams();
      }
    }
  }, [teamMembers, teamPokemon, movePokemonPosition, fetchTeams]);

  // Add pokemon to team
  const addToTeam = useCallback(async (teamId: number) => {
    // Prioritize the selected Pokemon from the pool over the external Pokemon
    const target = selectedPoolPokemon || externalPokemon;
    if (!target) return;
    
    const emptyPos = [1,2,3,4,5,6].find(pos => !(teamMembers[teamId]?.includes(pos)));
    if (!emptyPos) return;
    
    try {
      await addPokemonToTeam(teamId, target.id, emptyPos);
      
      // Update local state for immediate feedback
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: [...(prev[teamId] || []), emptyPos]
      }));
      
      setTeamPokemon(prev => ({
        ...prev,
        [teamId]: {
          ...(prev[teamId] || {}),
          [emptyPos]: target.id
        }
      }));
      
      // Refresh data from server
      fetchTeams();
    } catch (e) {
      console.error('useTeamBuilder: add to team error', e);
    }
  }, [addPokemonToTeam, selectedPoolPokemon, externalPokemon, teamMembers, fetchTeams]);

  // Remove pokemon from team
  const removeFromTeam = useCallback(async (teamId: number, position: number) => {
    try {
      await removePokemonFromTeam(teamId, position);
      // Update local members and pokemon state
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: prev[teamId]?.filter(p => p !== position) || []
      }));
      setTeamPokemon(prev => {
        const newMap = { ...prev };
        if (newMap[teamId]) {
          const { [position]: _, ...rest } = newMap[teamId];
          newMap[teamId] = rest;
        }
        return newMap;
      });
    } catch (e) {
      console.error('useTeamBuilder: remove pokemon error', e);
    }
  }, [removePokemonFromTeam]);

  // Delete team
  const handleDeleteTeam = useCallback(async (teamId: number) => {
    await removeTeam(teamId);
    fetchTeams();
  }, [removeTeam, fetchTeams]);

  return {
    isLoading,
    user,
    pool: favoriteDetails,
    selectedPoolPokemon,
    selectPoolPokemon,
    teams,
    filters,
    handleFilterChange,
    teamMembers,
    teamPokemon,
    teamCoverage,
    isCreatingTeam,
    setIsCreatingTeam,
    newTeamName,
    setNewTeamName,
    handleCreateTeam,
    handleDragEndAll,
    addToTeam,
    removeFromTeam,
    deleteTeam: handleDeleteTeam,
  };
};

export default useTeamBuilder;
