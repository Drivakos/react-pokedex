import React, { useState, useEffect, useCallback } from 'react';
import { useTeams } from '../../hooks/useTeams';
import TeamDisplay from './TeamDisplay';
import TeamForm from './TeamForm';
import PokemonSearch from './search/PokemonSearch';
import PokemonDetailView from './PokemonDetailView';
import { toast } from 'react-hot-toast';
import { Team } from '../../lib/supabase';

// No need to import TeamMember if we're not using it directly

// This is our UI representation of a Pokemon in a team slot
interface PokemonTeamMember {
  id: number;
  name: string;
  types: {
    type: {
      name: string;
    };
  }[];
}

// Define TeamWithPokemon for the team display component
interface TeamWithPokemon {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  created_at?: string;
  members: Record<number, PokemonTeamMember | null>;
}

// Define Pokemon interface for search and detail views
interface PokemonDetails {
  id: number;
  name: string;
  sprites: any; // Using any for flexibility
  types: {
    type: {
      name: string;
    };
  }[];
  moves: {
    move: {
      name: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
    };
  }[];
}

// Helper functions to format Pokémon data types for UI display

// Helper functions to format Pokémon data
const formatType = (typeObj: any): { type: { name: string } } => {
  if (typeof typeObj === 'string') {
    return { type: { name: typeObj } };
  } else if (typeObj && typeObj.type && typeObj.type.name) {
    return { type: { name: typeObj.type.name } };
  } else {
    return { type: { name: 'unknown' } };
  }
};

const formatMove = (moveObj: any): { move: { name: string } } => {
  if (typeof moveObj === 'string') {
    return { move: { name: moveObj } };
  } else if (moveObj && moveObj.move && moveObj.move.name) {
    return { move: { name: moveObj.move.name } };
  } else if (moveObj && moveObj.name) {
    return { move: { name: moveObj.name } };
  } else {
    return { move: { name: 'unknown' } };
  }
};

const formatAbility = (abilityObj: any): { ability: { name: string } } => {
  if (typeof abilityObj === 'string') {
    return { ability: { name: abilityObj } };
  } else if (abilityObj && abilityObj.ability && abilityObj.ability.name) {
    return { ability: { name: abilityObj.ability.name } };
  } else if (abilityObj && abilityObj.name) {
    return { ability: { name: abilityObj.name } };
  } else {
    return { ability: { name: 'unknown' } };
  }
};

// Adapts Pokemon data from the search format to the internal PokemonDetails format
const adaptFromSearchPokemon = (searchPokemon: any): PokemonDetails => {
  if (!searchPokemon) return {
    id: 0,
    name: 'Unknown',
    types: [],
    moves: [],
    abilities: [],
    sprites: {}
  };
  
  return {
    id: searchPokemon.id,
    name: searchPokemon.name,
    types: Array.isArray(searchPokemon.types) ? searchPokemon.types.map(formatType) : [],
    sprites: searchPokemon.sprites || {},
    abilities: Array.isArray(searchPokemon.abilities) ? searchPokemon.abilities.map(formatAbility) : [],
    moves: Array.isArray(searchPokemon.moves) ? searchPokemon.moves.map(formatMove) : []
  };
};

// Create a PokemonTeamMember object from a PokemonDetails - used in multiple places
const createPokemonTeamMember = (pokemon: PokemonDetails): PokemonTeamMember => {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types
  };
};



/**
 * TeamBuilder component - provides a UI for creating and managing Pokemon teams
 */
const TeamBuilder: React.FC = () => {
  // State from custom hook
  const {
    teams,
    teamPokemon, // This is the teamPokemon from the hook
    isLoading,
    error,
    loadTeamMembers,
    addPokemonToTeam,
    removeFromTeam,
    createNewTeam,
    updateExistingTeam,
    deleteExistingTeam,
    loadFavoritePool
  } = useTeams();

  // Local UI state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(null);
  const [favoritesPokemon, setFavoritesPokemon] = useState<PokemonDetails[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activePosition, setActivePosition] = useState<number | null>(null);
  // We're using teamPokemon from the hook, so we don't need to declare it here

  // Load team members when a team is selected - only when needed
  useEffect(() => {
    if (selectedTeam && (!teamPokemon[selectedTeam.id] || Object.keys(teamPokemon[selectedTeam.id] || {}).length === 0)) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam, loadTeamMembers, teamPokemon]);

  // Function to directly load Pokemon from PokeAPI as a fallback
  const loadDirectPokemon = useCallback(async () => {
    try {
      console.log('🚀 TeamBuilder - Loading Pokemon directly from API...');
      const pokemonIds = [1, 4, 7, 25, 150, 133, 6, 9];
      const results: PokemonDetails[] = [];
      
      for (const id of pokemonIds) {
        try {
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          const data = await response.json();
          
          // Convert to PokemonDetails format
          const pokemonDetails: PokemonDetails = adaptFromSearchPokemon(data);
          results.push(pokemonDetails);
          console.log(`🚀 TeamBuilder - Loaded Pokemon ${data.name}`);
        } catch (err) {
          console.error(`🔴 TeamBuilder - Error loading Pokemon ${id}:`, err);
        }
      }
      
      console.log(`🚀 TeamBuilder - Loaded ${results.length} Pokemon directly`);
      setFavoritesPokemon(results);
      setIsLoadingFavorites(false);
    } catch (error) {
      console.error('🔴 TeamBuilder - Failed to load Pokemon directly:', error);
      setIsLoadingFavorites(false);
    }
  }, []);

  // Load favorites pool - only once on mount
  useEffect(() => {
    if (!isLoading && !isLoadingFavorites && favoritesPokemon.length === 0) {
      console.log('🚀 TeamBuilder - Loading favorite pool on mount...');
      setIsLoadingFavorites(true);
      
      loadFavoritePool()
        .then(pokemonPool => {
          console.log(`🚀 TeamBuilder - Loaded ${pokemonPool.length} favorites`);
          
          // Convert each Pokemon to PokemonDetails format
          const formattedPool = pokemonPool.map((pokemon: any) => adaptFromSearchPokemon(pokemon));
          
          if (formattedPool.length > 0) {
            setFavoritesPokemon(formattedPool);
            setIsLoadingFavorites(false);
          } else {
            // If no favorites, load directly from API as a fallback
            loadDirectPokemon();
          }
        })
        .catch(error => {
          console.error('🔴 TeamBuilder - Error loading favorites:', error);
          // Fallback to direct loading
          loadDirectPokemon();
        });
    }
  }, [isLoading, loadFavoritePool, loadDirectPokemon, favoritesPokemon.length, isLoadingFavorites]);

  // Debug teams data
  useEffect(() => {
    if (teams) {
      console.log(`🚀 TeamBuilder - Teams data updated, ${teams.length} teams available:`, 
        teams.map(t => `${t.id}: ${t.name}`));
    } else {
      console.log('🚀 TeamBuilder - No teams data available');
    }
  }, [teams]);

  // Debug teamPokemon data
  useEffect(() => {
    console.log('🚀 TeamBuilder - teamPokemon data updated:', 
      Object.keys(teamPokemon).map(teamId => 
        `Team ${teamId}: ${Object.keys(teamPokemon[Number(teamId)] || {}).length} pokemon`
      ));
  }, [teamPokemon]);

  // Error feedback
  useEffect(() => {
    if (error) {
      console.error('🔴 TeamBuilder - Error from useTeams:', error);
      toast.error(error);
    }
  }, [error]);

  const handleTeamSelect = useCallback((team: any) => {
    console.log(`🚀 TeamBuilder - handleTeamSelect called for team ${team.id}`);
    // Check if same team is already selected to avoid unnecessary re-renders
    if (!selectedTeam || selectedTeam.id !== team.id) {
      console.log(`🚀 TeamBuilder - Setting selectedTeam to ${team.id}: ${team.name}`); 
      setSelectedTeam(team);
      setActivePosition(null);
      
      // Force load team members if not already loaded
      if (teamPokemon[team.id] === undefined && loadTeamMembers) {
        console.log(`🚀 TeamBuilder - Forcing loadTeamMembers for team ${team.id}`);
        loadTeamMembers(team.id);
      } else {
        console.log(`🚀 TeamBuilder - Team ${team.id} data already loaded:`, 
          Object.keys(teamPokemon[team.id] || {}).length, 'Pokémon');
      }
    }
  }, [selectedTeam, teamPokemon, loadTeamMembers]);

  const handleCreateTeam = useCallback(async (name: string, description: string) => {
    const success = await createNewTeam(name, description);
    if (success) {
      setIsFormOpen(false);
    }
  }, [createNewTeam]);

  const handleUpdateTeam = useCallback(async (teamId: number, name: string, description: string) => {
    const success = await updateExistingTeam(teamId, name, description);
    if (success) {
      setIsFormOpen(false);
      setEditingTeam(null);
    }
  }, [updateExistingTeam]);

  const handleDeleteTeam = useCallback(async (teamId: number) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this team?')) {
      return;
    }
    
    const success = await deleteExistingTeam(teamId);
    if (success && selectedTeam?.id === teamId) {
      setSelectedTeam(null);
    }
  }, [deleteExistingTeam, selectedTeam]);

  const handleAddPokemon = useCallback(async (teamId: number, pokemonId: number, position: number) => {
    await addPokemonToTeam(teamId, pokemonId, position);
  }, [addPokemonToTeam]);

  const handleRemovePokemon = useCallback(async (teamId: number, position: number) => {
    await removeFromTeam(teamId, position);
  }, [removeFromTeam]);

  const handlePokemonSelect = useCallback((pokemon: PokemonDetails) => {
    console.log('🚀 TeamBuilder - Selected Pokemon:', pokemon);
    setSelectedPokemon(pokemon);
  }, []);

  const handleAddCurrentPokemon = useCallback(async () => {
    if (!selectedTeam || !selectedPokemon || activePosition === null) {
      console.log('🚀 TeamBuilder - Cannot add Pokemon, missing data', {
        hasTeam: !!selectedTeam,
        hasPokemon: !!selectedPokemon,
        position: activePosition
      });
      return;
    }
    
    try {
      // Create the team member data for display
      const pokemonTeamMember = createPokemonTeamMember(selectedPokemon);
      
      console.log(`🚀 TeamBuilder - Adding Pokemon ${pokemonTeamMember.name} to team ${selectedTeam.id} at position ${activePosition}`);
      
      // Send to backend API
      await addPokemonToTeam(selectedTeam.id, selectedPokemon.id, activePosition);
      
      toast.success(`${pokemonTeamMember.name} added to team ${selectedTeam.name}!`);
      
      // Reset selection
      setActivePosition(null);
    } catch (error) {
      console.error('🔴 TeamBuilder - Error adding Pokemon to team:', error);
      toast.error('Failed to add Pokémon to team');
    }
  }, [selectedTeam, selectedPokemon, activePosition, addPokemonToTeam]);

  // Effect to automatically add the selected Pokemon to the team when both a Pokemon and position are selected
  useEffect(() => {
    if (selectedPokemon && activePosition !== null) {
      // Add a small delay to make the UI interaction feel better
      const timeoutId = setTimeout(() => {
        console.log('🚀 TeamBuilder - Auto-adding Pokemon to selected position', { 
          pokemon: selectedPokemon.name, 
          position: activePosition 
        });
        handleAddCurrentPokemon();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedPokemon, activePosition, handleAddCurrentPokemon]);

  return (
    <div className="flex flex-col lg:flex-row w-full gap-4 p-4 max-h-screen">
      <div className="w-full lg:w-1/3 flex flex-col gap-4 max-h-screen overflow-auto">
        {/* Team management section */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Teams</h2>
            <button
              onClick={() => {
                setIsFormOpen(true);
                setEditingTeam(null);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              New Team
            </button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">You don't have any teams yet.</p>
              <button
                onClick={() => {
                  setIsFormOpen(true);
                  setEditingTeam(null);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map(team => (
                <div 
                  key={team.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedTeam?.id === team.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{team.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeam(team);
                          setIsFormOpen(true);
                        }}
                        className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeam(team.id);
                        }}
                        className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{team.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {selectedTeam && (
            <TeamDisplay 
              team={{
                ...selectedTeam,
                members: teamPokemon[selectedTeam.id] || {}
              } as TeamWithPokemon}
              onEditTeam={() => {
                setEditingTeam(selectedTeam);
                setIsFormOpen(true);
              }}
              onDeleteTeam={handleDeleteTeam}
              onSelectSlot={(_, position) => setActivePosition(position)}
              onRemovePokemon={(teamId, position) => handleRemovePokemon(teamId, position)}
              selectedPosition={activePosition}
            />
          )}
        </div>
      </div>
      
      <div className="w-full lg:w-2/3 flex flex-col gap-4 max-h-screen overflow-hidden">
        {/* Search section */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col justify-between mt-4 gap-4">
            <PokemonSearch
              initialPool={favoritesPokemon as any}
              selectedPokemon={selectedPokemon as any}
              onPokemonSelect={(pokemon: any) => handlePokemonSelect(pokemon)}
              isLoadingInitialPool={isLoadingFavorites}
            />
          </div>
        </div>
        
        {isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading Pokémon data...</p>
          </div>
        )}
        {!isLoadingFavorites && favoritesPokemon.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No Pokémon data available. Try refreshing the page.</p>
            <button
              className="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onClick={() => {
                console.log('🚀 TeamBuilder - Manually triggering Pokemon reload');
                setIsLoadingFavorites(true);
              }}
            >
              Reload Pokémon
            </button>
          </div>
        )}
        
        {/* Pokemon details section */}
        {selectedPokemon && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-grow overflow-auto" style={{ maxHeight: '80vh' }}>
            <PokemonDetailView
              pokemon={selectedPokemon as any}
              onClose={() => setSelectedPokemon(null)}
              onAdd={selectedTeam && activePosition !== null ? handleAddCurrentPokemon : undefined}
              canAddToTeam={!!selectedTeam && activePosition !== null}
            />
          </div>
        )}
      </div>
      
      {/* Team form modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingTeam(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TeamForm
              onSubmit={(name: string, description: string) => {
                if (editingTeam) {
                  handleUpdateTeam(editingTeam.id, name, description);
                } else {
                  handleCreateTeam(name, description);
                }
                setIsFormOpen(false);
                setEditingTeam(null);
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTeam(null);
              }}
              initialName={editingTeam?.name || ''}
              initialDescription={editingTeam?.description || ''}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
