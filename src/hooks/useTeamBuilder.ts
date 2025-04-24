import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { DropResult } from '@hello-pangea/dnd';
import { usePokemon } from '../hooks/usePokemon';
import type { PokemonDetails } from '../types/pokemon';

interface UseTeamBuilderParams {
  externalPokemon?: PokemonDetails;
}

const useTeamBuilder = ({ externalPokemon }: UseTeamBuilderParams) => {
  const { 
    teams, 
    favorites, 
    user, 
    fetchTeams, 
    createTeam, 
    removePokemonFromTeam, 
    addPokemonToTeam, 
    movePokemonPosition, 
    deleteTeam: removeTeam, 
    loading: authLoading
  } = useAuth();
  const { filters, handleFilterChange, getPokemonDetails } = usePokemon();

  const [teamMembers, setTeamMembers] = useState<Record<number, number[]>>({});
  const [teamPokemon, setTeamPokemon] = useState<Record<number, Record<number, number>>>({});
  const [pokemonCache, setPokemonCache] = useState<PokemonDetails[]>([]);
  const [teamCoverage, setTeamCoverage] = useState<Record<number, { types: string[]; missing: string[] }>>({});
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPoolPokemon, setSelectedPoolPokemon] = useState<PokemonDetails | null>(null);
  const isLoading = authLoading || !teams || !user; 


  useEffect(() => {
    if (!authLoading && user && user.id) { 
      fetchTeams(user.id);
    }
  }, [user, authLoading, fetchTeams]);

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

  // Load Pokemon details and cache them
  const ensurePokemonLoaded = useCallback(async (pokemonId: number): Promise<PokemonDetails | null> => {
    // Check if already in cache
    const existing = pokemonCache.find(p => p.id === pokemonId);
    if (existing) {
      return existing;
    }
    
    try {
      const details = await getPokemonDetails(pokemonId);
      setPokemonCache(prev => [...prev, details]);
      return details;
    } catch (e) {
      console.error('useTeamBuilder: failed to load Pokemon details', pokemonId, e);
      return null;
    }
  }, [pokemonCache, getPokemonDetails]);
  
  useEffect(() => {
    const loadPool = async () => {
      if (!Array.isArray(favorites)) {
        return;
      }
      const ids = favorites.map(f => f.pokemon_id);
      if (externalPokemon && !ids.includes(externalPokemon.id)) ids.unshift(externalPokemon.id);
      
      // Load Pokemon details in parallel
      const promises = ids.map(id => ensurePokemonLoaded(id));
      await Promise.all(promises);
    };
    loadPool();
  }, [favorites, externalPokemon, ensurePokemonLoaded]);

  const fetchCoverage = useCallback(async () => {
    const coverageMap: Record<number, { types: string[]; missing: string[] }> = {};
    for (const [teamIdStr, posMap] of Object.entries(teamPokemon)) {
      const typesSet = new Set<string>();
      const teamId = parseInt(teamIdStr, 10);
      
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
          }
        }
      }
      
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
      const timer = setTimeout(() => {
        fetchCoverage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [teams, teamPokemon, fetchCoverage]);

  const selectPoolPokemon = useCallback((p: PokemonDetails) => {
    setSelectedPoolPokemon(p);
  }, []);

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName) return;
    try {
      await createTeam(newTeamName);
      setNewTeamName('');
      setIsCreatingTeam(false);
    } catch (e) {
      console.error('useTeamBuilder: create team error', e);
    }
  }, [createTeam, newTeamName]);

  const handleDragEndAll = useCallback((result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination || 
        (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }
    
    if (source.droppableId === destination.droppableId && source.droppableId.startsWith('team-')) {
      const teamId = parseInt(source.droppableId.replace('team-', ''), 10);
      
      try {
        const sourceIdMatch = result.draggableId.match(/team-\d+-pos-(\d+)/);
        if (!sourceIdMatch || !sourceIdMatch[1]) {
          throw new Error(`Invalid draggable ID format: ${result.draggableId}`);
        }
        const sourcePos = parseInt(sourceIdMatch[1], 10);
        
        const visiblePositions = [...(teamMembers[teamId] || [])].sort((a, b) => a - b);
        
        if (destination.index >= visiblePositions.length) {
          throw new Error(`Destination index ${destination.index} is out of bounds for team ${teamId}`);
        }
        
        const destPos = visiblePositions[destination.index];
        
        if (!destPos || sourcePos === destPos) {
          return;
        }
        
        const pokemonId = teamPokemon[teamId]?.[sourcePos];
        if (!pokemonId) {
          throw new Error(`No Pokémon found at position ${sourcePos} in team ${teamId}`);
        }
        
        console.log(`Moving Pokémon ${pokemonId} from position ${sourcePos} to ${destPos} in team ${teamId}`);
        
        setTeamPokemon(prev => {
          if (!prev[teamId]) return prev;
          
          const updatedTeam = { ...prev[teamId] };
          
          delete updatedTeam[sourcePos];
          updatedTeam[destPos] = pokemonId;
          
          return { ...prev, [teamId]: updatedTeam };
        });
        
        movePokemonPosition(teamId, sourcePos, destPos).catch(error => {
          console.error('Error updating database:', error);
        });
        
      } catch (error) {
        console.error('Drag and drop error:', error);
      }
    }
  }, [teamMembers, teamPokemon, movePokemonPosition]);

  const addToTeam = useCallback(async (teamId: number) => {
    const target = selectedPoolPokemon || externalPokemon;
    if (!target) return;
    
    const emptyPos = [1,2,3,4,5,6].find(pos => !(teamMembers[teamId]?.includes(pos)));
    if (!emptyPos) return;
    
    try {
      // Ensure we have the full Pokemon details before adding
      if (!pokemonCache.some(p => p.id === target.id)) {
        await ensurePokemonLoaded(target.id);
      }
      
      await addPokemonToTeam(teamId, target.id, emptyPos);
      
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
    } catch (e) {
      console.error('useTeamBuilder: add to team error', e);
    }
  }, [addPokemonToTeam, selectedPoolPokemon, externalPokemon, teamMembers]);

  const removeFromTeam = useCallback(async (teamId: number, position: number) => {
    try {
      await removePokemonFromTeam(teamId, position);
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

  const handleDeleteTeam = useCallback(async (teamId: number) => {
    await removeTeam(teamId);
  }, [removeTeam]);

  return {
    isLoading,
    user,
    pool: pokemonCache,
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
    ensurePokemonLoaded,
  };
};

export default useTeamBuilder;
