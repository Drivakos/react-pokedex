import React, { useState, useEffect, useCallback } from 'react';
import { useTeams } from '../../hooks/useTeams';
import TeamDisplay from './TeamDisplay';
import TeamForm from './TeamForm';
import PokemonSearch from './search/PokemonSearch';
import PokemonDetailView from './PokemonDetailView';
import { toast } from 'react-hot-toast';
import { Team } from '../../lib/supabase';
import { PokemonDetails } from '../../types/pokemon';
import { TeamWithPokemon } from '../../types/teams';
import { adaptToPokemonDetails, createPokemonTeamMember } from '../../utils/pokemonAdapters';

/**
 * TeamBuilder component - provides a UI for creating and managing Pokemon teams
 */
const TeamBuilder: React.FC = () => {
  const {
    teams,
    teamPokemon,
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

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(null);
  const [favoritesPokemon, setFavoritesPokemon] = useState<PokemonDetails[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activePosition, setActivePosition] = useState<number | null>(null);

  useEffect(() => {
    if (selectedTeam && (!teamPokemon[selectedTeam.id] || Object.keys(teamPokemon[selectedTeam.id] || {}).length === 0)) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam, loadTeamMembers, teamPokemon]);

  const loadDirectPokemon = useCallback(async () => {
    try {
      console.log('🚀 TeamBuilder - Loading Pokemon directly from API...');
      const pokemonIds = [1, 4, 7, 25, 150, 133, 6, 9];
      const results: PokemonDetails[] = [];
      
      for (const id of pokemonIds) {
        try {
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          const data = await response.json();
          
          const pokemonDetails: PokemonDetails = adaptToPokemonDetails(data);
          results.push(pokemonDetails);
        } catch (err) {
          console.error(`🔴 TeamBuilder - Error loading Pokemon ${id}:`, err);
        }
      }
      
      setFavoritesPokemon(results);
      setIsLoadingFavorites(false);
    } catch (error) {
      console.error('🔴 TeamBuilder - Failed to load Pokemon directly:', error);
      setIsLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoadingFavorites && favoritesPokemon.length === 0) {
      console.log('🚀 TeamBuilder - Loading favorite pool on mount...');
      setIsLoadingFavorites(true);
      
      loadFavoritePool()
        .then(pokemonPool => {
          const formattedPool = pokemonPool.map((pokemon: any) => adaptToPokemonDetails(pokemon));
          
          if (formattedPool.length > 0) {
            setFavoritesPokemon(formattedPool);
            setIsLoadingFavorites(false);
          } else {
            loadDirectPokemon().then(r => {
              setIsLoadingFavorites(false);
              return r;
            });
          }
        })
        .catch(error => {
          console.error('🔴 TeamBuilder - Error loading favorites:', error);
          loadDirectPokemon().then(r => {
            setIsLoadingFavorites(false);
            return r;
          });
        });
    }
  }, [isLoading, loadFavoritePool, loadDirectPokemon, favoritesPokemon.length, isLoadingFavorites]);

  useEffect(() => {
    if (teams) {
      console.log(`🚀 TeamBuilder - Teams data updated, ${teams.length} teams available:`, 
        teams.map(t => `${t.id}: ${t.name}`));
    } else {
      console.log('🚀 TeamBuilder - No teams data available');
    }
  }, [teams]);

  useEffect(() => {
    console.log('🚀 TeamBuilder - teamPokemon data updated:', 
      Object.keys(teamPokemon).map(teamId => 
        `Team ${teamId}: ${Object.keys(teamPokemon[Number(teamId)] || {}).length} pokemon`
      ));
  }, [teamPokemon]);

  useEffect(() => {
    if (error) {
      console.error('🔴 TeamBuilder - Error from useTeams:', error);
      toast.error(error);
    }
  }, [error]);

  const handleTeamSelect = useCallback((team: any) => {
    console.log(`🚀 TeamBuilder - handleTeamSelect called for team ${team.id}`);
    if (!selectedTeam || selectedTeam.id !== team.id) {
      console.log(`🚀 TeamBuilder - Setting selectedTeam to ${team.id}: ${team.name}`); 
      setSelectedTeam(team);
      setActivePosition(null);
      
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
    if (selectedTeam && activePosition !== null && pokemon && pokemon.id) {
      handleAddPokemon(selectedTeam.id, pokemon.id, activePosition);
    } else {
      toast.error('Please select a team and an empty slot first!');
    }
  }, [selectedTeam, activePosition, handleAddPokemon]);

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
              initialPool={favoritesPokemon}
              onPokemonSelect={handlePokemonSelect}
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
              pokemon={selectedPokemon}
              onClose={() => setSelectedPokemon(null)}
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
